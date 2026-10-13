// Simulation : production, transport des fichiers sur les liens, uploads, debit, paliers, maitrise.
import { emit } from './bus.js';
import { G, linkFrom, nodeById } from './state.js';
import { fmt } from './format.js';
import { MASTTH, RKC, bufCap, rankOf, tierOf, timeOf } from './economy.js';
import { KINDS, OUTS } from './kinds.js';
import { beginStep, endStep } from './stats.js';
import { DEFS, NW, TIERS } from '../data/nodes.js';

   // cache des rangs
export function mastTick(n){
  const t = n.type, r = rankOf(t), c = G.mast[t] = (G.mast[t]||0)+1;
  if(c===MASTTH[r]){ RKC[t] = r+1; emit('toast', 'Maîtrise : '+DEFS[t].name+' rang '+(r+1)+' (+4 % de vitesse)'); emit('blip', 900,0.2,0.07,'triangle'); }
}

let income = [];
export function resetIncome(){ income = []; }
// debit : credits gagnes sur les 10 dernieres secondes
export function updateRate(now){ income = income.filter(e=>now-e.t<10000); G.lastRate = income.reduce((s,e)=>s+e.v,0)/10; }
export function earn(v, n, crit){
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
      if(q.o<0 && d.outs===2) n.rr = o+1;
      return;
    }
  }
  if(q.o>=0 && OUTS[d.out||'next'].fallback==='other' && !linkFrom(n.id,q.o) && linkFrom(n.id,1-q.o)){ q.o = 1-q.o; return; }   // sortie imposee absente : l'autre (Trieur)
  if(q.o>=0 && !linkFrom(n.id,q.o)) n.outq.shift();   // sinon le fichier impose sur une sortie non branchee est perdu (Clonage)
}

function updateNode(n,dt){
  const def = DEFS[n.type];
  KINDS[def.kind].tick(n, def, dt, timeOf(n));
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
  beginStep();
  let done = false;
  try{
    G.playtime += dt;
    updateLinks(dt);
    for(const n of G.nodes){
      updateNode(n,dt);
      const tr = tierOf(n.level);
      if(n.tr===undefined) n.tr = tr;
      else if(tr!==n.tr){ if(tr>n.tr) tierUp(n,tr); n.tr = tr; }
    }
    done = true;
  } finally{ endStep(done); }
}
function tierUp(n,tr){
  const col = TIERS[tr][1];
  emit('tierFx', n, col);
  emit('float', n.x+NW/2, n.y-6, 'Palier '+TIERS[tr][0], col, 15);
  emit('blip', 660,0.12,0.06,'triangle'); setTimeout(()=>emit('blip', 990,0.16,0.06,'triangle'),90);
  if(tr===1) emit('toast', 'Palier atteint : vitesse x1,5. Au niveau 10, un nœud peut se spécialiser (sélectionne-le).');
}
