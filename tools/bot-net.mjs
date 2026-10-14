// Bot d'equilibrage, strategie « reseau » (option strat:'reseau' de balance.mjs). Meme principe que tools/bot.mjs :
// le vrai coeur du jeu (src/core) joue en accelere dans Node, et chaque achat est choisi au meilleur retour sur
// investissement estime (cout / gain de revenu par seconde). En plus des lignes, il construit :
//   - des fusions : un groupe a 1 a 3 branches (Source ou Super Source -> Compresseur), reunies par une Fusion (2)
//     ou un Concentrateur (3), puis un tronc de paliers (Amplificateur, Chiffreur, ...) ;
//   - des puits partages : plusieurs groupes sur le meme Upload (3 entrees) ou Serveur cloud (5 entrees).
// Estimation (propre au bot) : debit d'une branche = noeud le plus lent ; combineur = la branche la plus lente ;
// puits = somme des debits, plafonnee par sa propre vitesse. Formules (vitesse, valeur, prix, revenus) : celles du jeu.
// Mesures : achats par type, minute du premier achat dans le run, part des revenus par puits (reelle, mesuree
// sur le genre sink du coeur) et par genre de groupe (revenu reel de chaque puits reparti selon l'estimation).
import { G, addNode, connect, newGame, removeNode } from '../src/core/state.js';
import { step } from '../src/core/sim.js';
import { KINDS } from '../src/core/kinds.js';
import { speedOf, revMult, critChance, seedV, vmult, buyCost, upCost, gUpCost, puCost, techCost, qpGain, unlocked, sellVal } from '../src/core/economy.js';
import { doReboot } from '../src/core/prestige.js';
import { checkObj, checkAch } from '../src/core/progression.js';
import { evTick } from '../src/core/events.js';
import { upgradeNode, buyGlobal, buyQuantum, buyTech, chooseSpec, sell } from '../src/core/actions.js';
import { fmt } from '../src/core/format.js';
import { DEFS } from '../src/data/nodes.js';
import { GLOBALS, PU, TECH } from '../src/data/upgrades.js';

const TIERS = ['boost','encrypt','ai','quantum','sing','neural','dim','omega'];
const SINKS = Object.keys(DEFS).filter(t=>DEFS[t].kind==='sink' && DEFS[t].reward==='credits');   // upload, cloud
const COMBS = [['merge',2],['hub',3]];

export function runBotNet(hours, opt = {}){
  newGame();
  const log = [], groups = [], sinks = [];   // sinks : {node, groups, lab} ; groupe : {feeds:[[noeuds]], comb, trunk:[noeuds], sink, slot}
  let t = 0, mileT = [], mile = 0, lastRun = G.run, rebootAt = 0, labBuilt = false, lastBuild = -999;
  let bought = {}, first = {}, share = {};
  const avail = ty => unlocked(ty) && !(opt.exclude||[]).includes(ty);   // option exclude : types que le bot n'achete pas
  const probe = s => ({type:s.type, level:s.level, spec: s.level>=9 ? 'spd' : undefined});   // Turbo des que possible
  const cap = s => speedOf(probe(s))/DEFS[s.type].t;
  const lv0 = ty => ({type:ty, level:0});
  const withGlob = (g, f) => { if(!g) return f(); const keep = G.glob; G.glob = g; try{ return f(); } finally{ G.glob = keep; } };
  // [debit, valeur] d'un groupe a l'entree du puits
  function flow(g){
    let r = Infinity; const vs = [];
    for(const f of g.feeds){ let v = 1; for(const s of f){ const d = DEFS[s.type]; r = Math.min(r, cap(s)); if(d.val) v = seedV(d)*vmult(probe(s)); else if(d.mult) v *= d.mult; } vs.push(v); }
    let v = vs[0];
    if(g.comb){ r = Math.min(r, cap(g.comb)); v = DEFS[g.comb.type].f(...vs); }
    for(const s of g.trunk){ r = Math.min(r, cap(s)); v *= DEFS[s.type].mult || 1; }
    return [r, v];
  }
  function sinkRev(s, flows, lab){
    let rs = 0, rv = 0; for(const [r,v] of flows){ rs += r; rv += r*v; }
    const c = cap(s), k = rs>c ? c/rs : 1;
    return rv*k*vmult(probe(s))*revMult()*(1 + 4*critChance())*(lab ? (opt.labW||0.4) : 1);
  }
  const sinkInc = S => sinkRev(S.node, S.groups.map(flow), S.lab);
  const total = () => sinks.reduce((a,S)=>a+sinkInc(S), 0);
  const nodesOf = g => g.feeds.flat().concat(g.comb ? [g.comb] : [], g.trunk);
  const freeSlot = S => { for(let i=0;i<DEFS[S.node.type].ins;i++) if(!S.groups.some(g=>g.slot===i)) return i; return -1; };
  function lineCost(types){ let c=0; const cnt={}; for(const ty of types){ c+=buyCost(ty, cnt[ty]||0); cnt[ty]=(cnt[ty]||0)+1; } return c; }
  function buy(ty){ G.money -= buyCost(ty); bought[ty] = (bought[ty]||0)+1; if(first[ty]===undefined) first[ty] = Math.round((t-rebootAt)/60); return addNode(ty,0,0); }
  const chain = ns => { for(let i=1;i<ns.length;i++) connect(ns[i-1].id,0,ns[i].id,0); };
  const last = a => a[a.length-1];
  // (re)pose tous les liens d'un groupe : connect() remplace le lien deja present sur chaque port
  function rewire(g){
    g.feeds.forEach((f,i)=>{ chain(f); if(g.comb) connect(last(f).id,0,g.comb.id,i); });
    const spine = (g.comb ? [g.comb] : [last(g.feeds[0])]).concat(g.trunk); chain(spine);
    connect(last(spine).id, 0, g.sink.node.id, g.slot);
  }
  function newGroup(types, S, sk, lab){
    const f = types.slice(0, 2).map(buy), trunk = types.slice(2).map(buy);
    if(!S){ S = {node:buy(sk), groups:[], lab}; sinks.push(S); }
    const g = {feeds:[f], comb:null, trunk, sink:S, slot:freeSlot(S)}; S.groups.push(g); groups.push(g); rewire(g); lastBuild = t;
  }
  function extend(g, ty){ g.trunk.push(buy(ty)); rewire(g); }
  function swapHead(g, fi){ const n = buy('mega'); removeNode(g.feeds[fi][0]); g.feeds[fi][0] = n; rewire(g); }
  // ajoute des branches et (re)pose le combineur cb ; l'ancien combineur est vendu
  function fuse(g, cb){
    if(g.comb && g.comb.type!==cb){ sell(g.comb); g.comb = null; }
    const head = g.feeds[0][0].type, k = COMBS.find(x=>x[0]===cb)[1];
    while(g.feeds.length<k){ const f = [buy(head), buy('compress')]; chain(f); g.feeds.push(f); }
    if(!g.comb) g.comb = buy(cb);
    rewire(g);
  }
  function swapSink(S, sk){ sell(S.node); S.node = buy(sk); for(const g of S.groups) rewire(g); }
  function resetBoard(){
    groups.length = 0; sinks.length = 0; labBuilt = false;
    if(G.nodes.length>=2){ const S = {node:G.nodes[1], groups:[]}, g = {feeds:[[G.nodes[0]]], comb:null, trunk:[], sink:S, slot:0}; S.groups.push(g); sinks.push(S); groups.push(g); rewire(g); }
  }
  function reboot(){
    doReboot(); resetBoard();
    for(let k=0;k<60;k++){ const d=PU.filter(x=>G.pu[x.id]<x.max && puCost(x)<=G.qp).sort((a,b)=>puCost(a)-puCost(b))[0]; if(!d || !buyQuantum(d)) break; }
  }
  const upgrade = n => { upgradeNode(n,1); if(n.level>=9 && !n.spec) chooseSpec(n,'spd'); };
  const stats = arr => (from)=>{ const a=arr.filter(x=>x>=from); const g=[]; for(let i=1;i<a.length;i++) g.push(a[i]-a[i-1]); if(!g.length) return {n:a.length}; g.sort((x,y)=>x-y); return {n:a.length, med:Math.round(g[g.length>>1]), p90:Math.round(g[Math.floor(g.length*0.9)]), max:Math.round(g[g.length-1])}; };
  const mileStats = stats(mileT);
  // revenus reels par puits : mesures autour du genre sink du coeur (seul earn() y change G.money)
  const earned = new Map(), tick0 = KINDS.sink.tick;
  KINDS.sink.tick = function(n, d, dt, tt){ const m = G.money; tick0.call(this, n, d, dt, tt); if(G.money!==m) earned.set(n.id, (earned.get(n.id)||0) + G.money - m); };
  function account(){
    for(const S of sinks){ const e = earned.get(S.node.id); if(!e || S.lab) continue;
      const w = S.groups.map(g=>{ const [r,v] = flow(g); return r*v; }), tw = w.reduce((a,b)=>a+b,0) || 1;
      S.groups.forEach((g,i)=>{ const c = g.comb ? g.comb.type : 'ligne'; share[c] = (share[c]||0) + e*w[i]/tw; });
      share['puits '+S.node.type] = (share['puits '+S.node.type]||0) + e; share.total = (share.total||0) + e;
    }
    earned.clear();
  }
  const pct = () => { const o = {}; for(const k in share) if(k!=='total') o[k] = Math.round(100*share[k]/(share.total||1)); return o; };
  const snap = () => { const o = {buys:bought, first, share:pct(), types:{}}; for(const n of G.nodes) o.types[n.type] = (o.types[n.type]||0)+1; bought = {}; first = {}; share = {}; return o; };
  resetBoard();
  const dt=0.1, per=50, steps=Math.floor(hours*3600/dt);
  let acc=0;
  try{
  for(let i=0;i<steps;i++){
    step(dt); t+=dt; acc++;
    if(acc<per) continue;
    acc=0; account();
    G.lastRate=(G.run-lastRun)/(per*dt); lastRun=G.run;
    checkObj(); checkAch(); evTick(); lastRun=G.run;
    const gn=qpGain();
    if(gn>=Math.max(1,Math.ceil(G.qpTotal*(opt.rebootRatio||1))) && t-rebootAt>(opt.minRun||600)){
      log.push(Object.assign({t:Math.round(t/60),ev:'reboot',gaps:mileStats(rebootAt),rev:+revMult().toFixed(1),run:fmt(G.run),gain:gn,qpTotal:G.qpTotal+gn,rate:fmt(G.lastRate)}, snap()));
      reboot(); rebootAt=t; mile=0; continue;
    }
    const labTypes = () => ['source','compress'].concat(TIERS.filter(unlocked), ['lab']);
    if(avail('lab') && !labBuilt){ const ty=labTypes(); if(G.money>=lineCost(ty)*(opt.labMoney||1.5)){ newGroup(ty, null, 'lab', true); labBuilt=true; } }
    for(let k=0;k<10;k++){
      const c=[];
      for(const S of sinks){
        const fl = S.groups.map(flow), base = sinkRev(S.node, fl, S.lab);
        const withG = (i, g2) => sinkRev(S.node, fl.map((x,j)=>j===i ? flow(g2) : x), S.lab) - base;
        S.groups.forEach((g,i)=>{
          for(const n of nodesOf(g)){ n.level++; const gain = withG(i, g); n.level--; if(gain>0) c.push({cost:upCost(n),gain,f:()=>upgrade(n)}); }
          if(S.lab) return;
          const have = new Set(nodesOf(g).map(n=>n.type));
          for(const ty of TIERS){ if(!avail(ty) || have.has(ty)) continue;
            const gain = withG(i, Object.assign({}, g, {trunk:g.trunk.concat([lv0(ty)])})); if(gain>0) c.push({cost:lineCost([ty]),gain,f:()=>extend(g,ty)}); }
          g.feeds.forEach((f,fi)=>{ if(f[0].type!=='source' || !avail('mega')) return;
            const gain = withG(i, Object.assign({}, g, {feeds:g.feeds.map((x,j)=>j===fi ? [lv0('mega')].concat(x.slice(1)) : x)}));
            if(gain>0) c.push({cost:lineCost(['mega']),gain,f:()=>swapHead(g,fi)}); });
          for(const [cb,k2] of COMBS){
            if(!avail(cb) || g.feeds.length>=k2 || (g.comb && g.comb.type===cb)) continue;
            const head = g.feeds[0][0].type, add = []; for(let x=g.feeds.length;x<k2;x++) add.push([head,'compress']);
            const gain = withG(i, Object.assign({}, g, {feeds:g.feeds.concat(add.map(f=>f.map(lv0))), comb:lv0(cb)}));
            const cost = lineCost(add.flat().concat([cb])) - (g.comb ? sellVal(g.comb) : 0);
            if(gain>0) c.push({cost,gain,f:()=>fuse(g,cb)});
          }
        });
        if(S.lab) continue;
        S.node.level++; { const gain = sinkRev(S.node, fl) - base; S.node.level--; if(gain>0) c.push({cost:upCost(S.node),gain,f:()=>upgrade(S.node)}); }
        for(const sk of SINKS){ if(S.node.type!=='upload' || sk==='upload' || !avail(sk)) continue;
          const gain = sinkRev(lv0(sk), fl) - base; if(gain>0) c.push({cost:lineCost([sk])-sellVal(S.node),gain,f:()=>swapSink(S,sk)}); }
      }
      const total0 = total();
      for(const gl of GLOBALS){ if(G.glob[gl.id]>=gl.max || gl.id==='buf') continue;
        const g2=Object.assign({},G.glob); g2[gl.id]++;
        const gain = withGlob(g2, total) - total0; if(gain>0) c.push({cost:gUpCost(gl),gain,f:()=>buyGlobal(gl)});
      }
      if(groups.length<(opt.maxLines||12) && t-lastBuild>(opt.bd||10)){
        const tiers = TIERS.filter(unlocked);
        for(const head of (avail('mega')?['source','mega']:['source'])) for(let k2=0;k2<=tiers.length;k2++){
          const ty = [head,'compress'].concat(tiers.slice(0,k2)), fl = flow({feeds:[ty.slice(0,2).map(lv0)], comb:null, trunk:ty.slice(2).map(lv0)});
          for(const sk of SINKS) if(avail(sk)) c.push({cost:lineCost(ty.concat([sk])),gain:sinkRev(lv0(sk),[fl]),f:()=>newGroup(ty,null,sk)});
          for(const S of sinks){ if(S.lab || freeSlot(S)<0) continue;
            const gain = sinkRev(S.node, S.groups.map(flow).concat([fl])) - sinkInc(S); if(gain>0) c.push({cost:lineCost(ty),gain,f:()=>newGroup(ty,S)}); }
        }
      }
      if(avail('lab') && !labBuilt && t-lastBuild>(opt.bd||10)){ const ty=labTypes(); c.push({cost:lineCost(ty),gain:sinkRev(lv0('lab'),[flow({feeds:[ty.slice(0,2).map(lv0)],comb:null,trunk:ty.slice(2,-1).map(lv0)})],true),f:()=>{ newGroup(ty,null,'lab',true); labBuilt=true; }}); }
      c.sort((a,b)=>a.cost/a.gain-b.cost/b.gain);
      const best=c[0]; if(!best) break;
      if(G.money<best.cost){
        const wait=(best.cost-G.money)/Math.max(total0,1);
        const aff=c.find(x=>x.cost<=G.money && (x.cost/x.gain<wait*(opt.fill||1) || wait>=(opt.patience||900)));
        if(!aff) break; aff.f(); continue;
      }
      best.f();
    }
    { const cur = total(); if(cur>=mile*1.1 || mile===0){ mileT.push(t); mile = cur; } }
    for(let k=0;k<50;k++){ const d=TECH.filter(x=>G.tech[x.id]<x.max && techCost(x)<=G.rp).sort((a,b)=>techCost(a)-techCost(b))[0]; if(!d || !buyTech(d)) break; }
  }
  } finally { KINDS.sink.tick = tick0; }
  log.push(Object.assign({end:true,gaps:mileStats(rebootAt),t:Math.round(t/60),run:fmt(G.run),life:fmt(G.lifetime),rate:fmt(G.lastRate),qpT:G.qpTotal,resets:G.resets,rp:fmt(G.rpTotal),obj:G.obj,nodes:G.nodes.length}, snap()));
  return log;
}
