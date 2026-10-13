// Simulation : production, transport des fichiers sur les liens, uploads, debit, paliers, maitrise.
import { emit } from './bus.js';
import { G, linkFrom, nodeById } from './state.js';
import { fmt } from './format.js';
import { MASTTH, RKC, bufCap, critChance, rankOf, revMult, rpOf, seedV, tierOf, timeOf, vmult } from './economy.js';
import { DEFS, NW, TIERS } from '../data/nodes.js';

   // cache des rangs
function mastTick(n){
  const t = n.type, r = rankOf(t), c = G.mast[t] = (G.mast[t]||0)+1;
  if(c===MASTTH[r]){ RKC[t] = r+1; emit('toast', 'Maîtrise : '+DEFS[t].name+' rang '+(r+1)+' (+4 % de vitesse)'); emit('blip', 900,0.2,0.07,'triangle'); }
}

let income = [];
export function resetIncome(){ income = []; }
// debit : credits gagnes sur les 10 dernieres secondes
export function updateRate(now){ income = income.filter(e=>now-e.t<10000); G.lastRate = income.reduce((s,e)=>s+e.v,0)/10; }
function earn(v, n, crit){
  G.money += v; G.run += v; G.lifetime += v;
  income.push({t:performance.now(), v});
  if(n) emit('float', n.x+NW/2, n.y-4, '+'+fmt(v), crit?'#ff9f43':'#f6c453', crit?20:15);
  emit('upSound', crit);
  if(n) emit('earnFx', n, crit);
}

function trySend(n){
  const q = n.outq[0]; if(!q) return;
  const d = DEFS[n.type];
  const order = q.o>=0 ? [q.o] : (d.outs===2 ? [n.rr%2,(n.rr+1)%2] : [0]);
  for(const o of order){
    const l = linkFrom(n.id,o);
    if(!l) continue;
    const last = l.packets[l.packets.length-1];
    if(!last || last.t > 0.18){
      l.packets.push({v:q.v,t:0}); n.outq.shift();
      if(q.o<0 && d.outs===2 && n.type!=='sorter') n.rr = o+1;
      return;
    }
  }
  if(q.o>=0 && n.type==='sorter' && !linkFrom(n.id,q.o) && linkFrom(n.id,1-q.o)){ q.o = 1-q.o; return; }   // le trieur se rabat sur l'autre sortie
  if(q.o>=0 && !linkFrom(n.id,q.o)) n.outq.shift();   // sortie non branchée du clonage : le fichier est perdu
}

function updateNode(n,dt){
  const def = DEFS[n.type], t = timeOf(n);
  if(def.val){                                   // sources
    if(n.outq.length<2){
      n.timer += dt;
      if(n.timer>=t){ n.timer=0; n.outq.push({v:seedV(def)*vmult(n), o:-1}); mastTick(n); }
    }
  } else if(n.type==='lab'){
    if(!n.work){
      for(let k=0;k<n.inb.length;k++){
        const i=(n.rr+k)%n.inb.length;
        if(n.inb[i].length){ n.work = {v:n.inb[i].shift(), rem:t}; n.rr=i+1; break; }
      }
    }
    if(n.work){
      n.work.rem -= dt;
      if(n.work.rem<=0){ const r=rpOf(n.work.v); G.rp+=r; G.rpTotal+=r; emit('float', n.x+NW/2, n.y-4, '+'+fmt(r)+' RP', '#76e4f7', 13); n.work=null; mastTick(n); }
    }
  } else if(n.type==='upload'){
    if(!n.work){
      for(let k=0;k<n.inb.length;k++){
        const i=(n.rr+k)%n.inb.length;
        if(n.inb[i].length){ n.work = {v:n.inb[i].shift(), rem:t}; n.rr=i+1; break; }
      }
    }
    if(n.work){
      n.work.rem -= dt;
      if(n.work.rem<=0){
        let v = n.work.v*revMult()*vmult(n), crit = Math.random()<critChance();
        if(crit) v*=5;
        earn(v,n,crit); G.files++; n.work=null; mastTick(n);
      }
    }
  } else {
    if(!n.work && n.outq.length===0){
      if(n.type==='merge'){
        if(n.inb[0].length && n.inb[1].length) n.work = {v:(n.inb[0].shift()+n.inb[1].shift())*1.3, rem:t};
      } else if(n.inb[0].length) n.work = {v:n.inb[0].shift()*(def.mult||1), rem:t};
    }
    if(n.work){
      n.work.rem -= dt;
      if(n.work.rem<=0){
        if(n.type==='clone') n.outq.push({v:n.work.v,o:0},{v:n.work.v,o:1});
        else if(n.type==='sorter') n.outq.push({v:n.work.v,o:n.work.v>=(n.thr||10)?0:1});
        else n.outq.push({v:n.work.v,o:-1});
        n.work=null; mastTick(n);
      }
    }
  }
  trySend(n);
}

function updateLinks(dt){
  for(const l of G.links){
    const b = nodeById(l.b);
    for(let i=0;i<l.packets.length;i++){
      const p = l.packets[i];
      const lim = i===0 ? 1 : l.packets[i-1].t - 0.12;
      p.t = Math.min(lim, p.t + dt/1.1);
    }
    const f = l.packets[0];
    if(f && f.t>=1 && b.inb[l.bi].length < bufCap()){ b.inb[l.bi].push(f.v); l.packets.shift(); }
  }
}
export function step(dt){
  G.playtime += dt;
  updateLinks(dt);
  for(const n of G.nodes){
    updateNode(n,dt);
    const tr = tierOf(n.level);
    if(n.tr===undefined) n.tr = tr;
    else if(tr!==n.tr){ if(tr>n.tr) tierUp(n,tr); n.tr = tr; }
  }
}
function tierUp(n,tr){
  const col = TIERS[tr][1];
  emit('tierFx', n, col);
  emit('float', n.x+NW/2, n.y-6, 'Palier '+TIERS[tr][0], col, 15);
  emit('blip', 660,0.12,0.06,'triangle'); setTimeout(()=>emit('blip', 990,0.16,0.06,'triangle'),90);
  if(tr===1) emit('toast', 'Palier atteint : vitesse x1,5. Au niveau 10, un nœud peut se spécialiser (sélectionne-le).');
}
