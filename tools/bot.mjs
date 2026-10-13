// Bot d'equilibrage : joue le jeu en accelere dans Node, avec le vrai coeur du jeu (src/core), sans navigateur.
// Il choisit chaque achat au meilleur retour sur investissement estime.
// Les formules (vitesses, valeurs, revenus, couts, reboot, achats) sont celles du jeu : aucune copie.
// Ce qui reste propre au bot : sa strategie (lignes Source -> paliers -> Upload, ordre des achats) et son estimation
// du revenu d'une ligne (debit du noeud le plus lent x valeur du fichier en bout de ligne).
import { G, addNode, connect, newGame, removeNode } from '../src/core/state.js';
import { step } from '../src/core/sim.js';
import { speedOf, revMult, critChance, seedV, vmult, buyCost, upCost, gUpCost, puCost, techCost, qpGain, unlocked } from '../src/core/economy.js';
import { doReboot } from '../src/core/prestige.js';
import { checkObj, checkAch } from '../src/core/progression.js';
import { evTick } from '../src/core/events.js';
import { upgradeNode, buyGlobal, buyQuantum, buyTech, chooseSpec } from '../src/core/actions.js';
import { fmt } from '../src/core/format.js';
import { DEFS } from '../src/data/nodes.js';
import { GLOBALS, PU, TECH } from '../src/data/upgrades.js';

const TIERS_LINE = ['boost','encrypt','ai','quantum','sing','neural','dim','omega'];
// puits de credits autres que l'Upload (remplacent l'Upload en bout de ligne si le gain estime le justifie)
const SINKS = Object.keys(DEFS).filter(t=>DEFS[t].kind==='sink' && DEFS[t].reward==='credits' && t!=='upload');

export function runBot(hours, opt = {}){
  newGame();
  const log = [], lines = [];
  let t = 0, buyT = [], mileT = [], mile = 0, lastRun = G.run, rebootAt = 0, labBuilt = false, lastBuild = -999;
  // noeud fictif pour interroger les formules du jeu ; le bot choisit Turbo des que la specialisation est possible
  const probe = s => ({type:s.type, level:s.level, spec: s.level>=9 ? 'spd' : undefined});
  // evalue f() avec des ameliorations globales hypothetiques
  const withGlob = (g, f) => { if(!g) return f(); const keep = G.glob; G.glob = g; try{ return f(); } finally{ G.glob = keep; } };
  // revenu/s estime d'une ligne decrite par [{type, level}]
  function inc(spec, g){
    return withGlob(g, () => {
      let thr = 1e9, val = 1;
      for(const s of spec){
        const d = DEFS[s.type], n = probe(s);
        thr = Math.min(thr, speedOf(n)/d.t);
        if(d.val) val = seedV(d)*vmult(n);
        else if(d.mult) val *= d.mult;
      }
      return thr*val*revMult()*(1 + 4*critChance());   // critique : x5 avec la probabilite critChance()
    });
  }
  const specOf = l => l.nodes.map(n=>({type:n.type, level:n.level}));
  function newTypes(kind){
    const ty = [unlocked('mega')&&kind!=='lab' ? 'mega':'source','compress'];
    for(const x of TIERS_LINE) if(unlocked(x)) ty.push(x);
    ty.push(kind==='lab' ? 'lab' : 'upload'); return ty;
  }
  // cout d'achat d'une suite de noeuds (prix du jeu, exemplaires de la meme ligne compris)
  function lineCost(types){ let c=0; const cnt={}; for(const ty of types){ c+=buyCost(ty, cnt[ty]||0); cnt[ty]=(cnt[ty]||0)+1; } return c; }
  function buyLine(types){
    const nodes=[]; let prev=null;
    for(const ty of types){ G.money -= buyCost(ty); const n=addNode(ty,0,0); if(prev) connect(prev.id,0,n.id,0); nodes.push(n); prev=n; }
    lines.push({nodes});
  }
  function resetBoard(){ lines.length=0; labBuilt=false; if(G.nodes.length>=2){ connect(G.nodes[0].id,0,G.nodes[1].id,0); lines.push({nodes:[G.nodes[0],G.nodes[1]]}); } }
  function reboot(){
    doReboot();   // reboot du jeu (points quantiques, remise a zero du run)
    resetBoard();
    for(let k=0;k<60;k++){ const d=PU.filter(x=>G.pu[x.id]<x.max && puCost(x)<=G.qp).sort((a,b)=>puCost(a)-puCost(b))[0]; if(!d || !buyQuantum(d)) break; }
  }
  const upgrade = n => { upgradeNode(n,1); if(n.level>=9 && !n.spec) chooseSpec(n,'spd'); };
  const stats = arr => (from)=>{ const a=arr.filter(x=>x>=from); const g=[]; for(let i=1;i<a.length;i++) g.push(a[i]-a[i-1]); if(!g.length) return {n:a.length}; g.sort((x,y)=>x-y); return {n:a.length, med:Math.round(g[g.length>>1]), p90:Math.round(g[Math.floor(g.length*0.9)]), max:Math.round(g[g.length-1])}; };
  const mileStats = stats(mileT);
  resetBoard();
  const dt=0.1, per=50, total=Math.floor(hours*3600/dt);
  let acc=0;
  for(let i=0;i<total;i++){
    step(dt); t+=dt; acc++;
    if(acc<per) continue;
    acc=0;
    G.lastRate=(G.run-lastRun)/(per*dt); lastRun=G.run;
    checkObj(); checkAch(); evTick(); lastRun=G.run;
    const gn=qpGain();
    if(gn>=Math.max(1,Math.ceil(G.qpTotal*(opt.rebootRatio||1))) && t-rebootAt>(opt.minRun||600)){
      log.push({t:Math.round(t/60),ev:'reboot',gaps:mileStats(rebootAt),rev:+revMult().toFixed(1),tech:Object.values(G.tech).join(','),pu:Object.values(G.pu).join(','),glob:Object.values(G.glob).join(','),run:fmt(G.run),gain:gn,qpTotal:G.qpTotal+gn,rate:fmt(G.lastRate)});
      reboot(); rebootAt=t; mile=0; continue;
    }
    if(unlocked('lab') && !labBuilt){ const ty=newTypes('lab'), lc=lineCost(ty); if(G.money>=lc*(opt.labMoney||1.5)){ buyLine(ty); lines[lines.length-1].lab=true; labBuilt=true; lastBuild=t; } }
    for(let k=0;k<10;k++){
      const total0 = lines.reduce((s,l)=>s+inc(specOf(l)),0);
      const c=[];
      for(const l of lines){ const sp=specOf(l), base=inc(sp);
        l.nodes.forEach((n,idx)=>{ const s2=sp.map((x,j)=>j===idx?{type:x.type,level:x.level+1}:x); const gain=inc(s2)-base; if(gain>0) c.push({lb:'up '+n.type+n.level,cost:upCost(n),gain,f:()=>upgrade(n)}); });
      }
      // extension d'une ligne existante : insertion d'un palier ou remplacement de la Source par une Super Source
      for(const l of lines){ if(l.lab) continue;
        const sp=specOf(l), base=inc(sp), have=new Set(sp.map(x=>x.type));
        for(const ty of TIERS_LINE){
          if(!unlocked(ty) || have.has(ty)) continue;
          const cst=lineCost([ty]); const sp2=sp.slice(0,-1).concat([{type:ty,level:0}],sp.slice(-1));
          const gain=inc(sp2)-base; if(gain>0) c.push({lb:'ext '+ty,cost:cst,gain,f:()=>{
            G.money-=buyCost(ty); const up=l.nodes[l.nodes.length-1], prev=l.nodes[l.nodes.length-2];
            const n=addNode(ty,0,0); connect(prev.id,0,n.id,0); connect(n.id,0,up.id,0); l.nodes.splice(l.nodes.length-1,0,n); }});
        }
        if(sp[0].type==='source' && unlocked('mega')){
          const cst=lineCost(['mega']); const sp2=[{type:'mega',level:0}].concat(sp.slice(1));
          const gain=inc(sp2)-base; if(gain>0) c.push({lb:'swap mega',cost:cst,gain,f:()=>{
            G.money-=buyCost('mega'); const old=l.nodes[0], nx=l.nodes[1]; const n=addNode('mega',0,0); removeNode(old); connect(n.id,0,nx.id,0); l.nodes[0]=n; }});
        }
        for(const sk of SINKS){ if(sp[sp.length-1].type!=='upload' || !unlocked(sk)) continue;
          const cst=lineCost([sk]); const sp2=sp.slice(0,-1).concat([{type:sk,level:0}]);
          const gain=inc(sp2)-base; if(gain>0) c.push({lb:'swap '+sk,cost:cst,gain,f:()=>{
            G.money-=buyCost(sk); const old=l.nodes[l.nodes.length-1], pv=l.nodes[l.nodes.length-2]; const n=addNode(sk,0,0); removeNode(old); connect(pv.id,0,n.id,0); l.nodes[l.nodes.length-1]=n; }});
        }
      }
      for(const gl of GLOBALS){ if(G.glob[gl.id]>=gl.max) continue;
        const g2=Object.assign({},G.glob); g2[gl.id]++;
        const gain = gl.id==='buf' ? 0 : lines.reduce((s,l)=>s+inc(specOf(l),g2),0)-total0;
        if(gain>0) c.push({lb:'glob '+gl.id+G.glob[gl.id],cost:gUpCost(gl),gain,f:()=>buyGlobal(gl)});
      }
      if(lines.length<(opt.maxLines||12) && t-lastBuild>(opt.bd||10)){
        const full=newTypes();
        for(const head of (unlocked('mega')?['source','mega']:['source'])) for(let k2=2;k2<full.length;k2++){ const ty=[head].concat(full.slice(1,k2),['upload']), lc=lineCost(ty); const gain=inc(ty.map(x=>({type:x,level:0}))); c.push({lb:'line '+ty.map(x=>x.slice(0,2)).join('>'),cost:lc,gain,f:()=>{ buyLine(ty); lastBuild=t; }}); }
      }
      if(unlocked('lab') && !labBuilt && t-lastBuild>(opt.bd||10)){ const ty=newTypes('lab'), lc=lineCost(ty); c.push({cost:lc,gain:(opt.labW||0.4)*inc(ty.slice(0,-1).concat(['upload']).map(x=>({type:x,level:0}))),f:()=>{ buyLine(ty); lines[lines.length-1].lab=true; labBuilt=true; lastBuild=t; }}); }
      c.sort((a,b)=>a.cost/a.gain-b.cost/b.gain);
      const best=c[0]; if(!best) break;
      if(G.money<best.cost){
        const wait=(best.cost-G.money)/Math.max(total0*1.0,1);
        // on achete en attendant tout ce qui se rembourse avant que le meilleur achat soit abordable
        const aff=c.find(x=>x.cost<=G.money && (x.cost/x.gain<wait*(opt.fill||1) || wait>=(opt.patience||900)));
        if(!aff) break; aff.f(); buyT.push(t); continue;
      }
      best.f(); buyT.push(t);
    }
    { const cur = lines.reduce((a,l)=>a+inc(specOf(l)),0); if(cur>=mile*1.1 || mile===0){ mileT.push(t); mile = cur; } }
    for(let k=0;k<50;k++){ const d=TECH.filter(x=>G.tech[x.id]<x.max && techCost(x)<=G.rp).sort((a,b)=>techCost(a)-techCost(b))[0]; if(!d || !buyTech(d)) break; }
  }
  log.push({end:true,gaps:mileStats(rebootAt),t:Math.round(t/60),run:fmt(G.run),life:fmt(G.lifetime),rate:fmt(G.lastRate),qpT:G.qpTotal,resets:G.resets,rp:fmt(G.rpTotal),obj:G.obj,nodes:G.nodes.length});
  return log;
}
