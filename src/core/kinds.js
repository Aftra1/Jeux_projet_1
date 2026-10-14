// Genres de noeuds : comportement commun a plusieurs types (les types sont des donnees, data/nodes.js).
// Un genre fournit : tick (production, prise des entrees, fin du travail), specs (specialisations proposees),
// info (ligne du panneau de selection) et fields (parametres propres au genre, verifies au chargement).
// Un comportement vraiment nouveau = un genre de plus dans ce fichier.
import { emit } from './bus.js';
import { G } from './state.js';
import { fmt } from './format.js';
import { critChance, revMult, rpOf, seedV, vmult } from './economy.js';
import { earn, mastTick } from './sim.js';
import { NW } from '../data/nodes.js';

const ALL_SPECS = ['spd','val','eco'], BASE_SPECS = ['spd','eco'];
const perFile = t => `${t.toFixed(2)} s par fichier.`;

// Recompenses des puits (fin du traitement d'un fichier)
export const REWARDS = {
  credits: {valSpec:true, give(n){
    let v = n.work.v*revMult()*vmult(n), crit = Math.random()<critChance();
    if(crit) v*=5;
    earn(v,n,crit); G.files++;
  }, info:(n,d,t)=>`1 fichier toutes les ${t.toFixed(2)} s (revenus ×${revMult().toFixed(2)}).`},
  research: {valSpec:false, give(n){
    const r=rpOf(n.work.v); G.rp+=r; G.rpTotal+=r; emit('float', n.x+NW/2, n.y-4, '+'+fmt(r)+' RP', '#76e4f7', 13);
  }, info:(n,d,t)=>perFile(t)},
};
// Sorties d'un travail termine. fallback 'other' : si la sortie imposee n'est pas branchee, l'autre est utilisee ;
// sinon le fichier impose sur une sortie non branchee est perdu.
export const OUTS = {
  next: {push:(n,v)=>n.outq.push({v,o:-1})},                                    // alternance entre les sorties libres
  copy: {push:(n,v,d)=>{ for(let o=0;o<d.outs;o++) n.outq.push({v,o}); }},       // une copie sur chaque sortie
  threshold: {fallback:'other', push:(n,v,d)=>n.outq.push({v,o:v>=(n.thr||d.params.thr.def)?0:1}),   // gros fichiers en haut, les autres en bas
    info:(n,d)=>`Seuil : valeur ≥ ${fmt(n.thr||d.params.thr.def)} vers le haut, le reste vers le bas.`},
};

// reglages d'un noeud (seuil...) : valeur choisie ou valeur par defaut, bornee par max
export const paramsOf = (n,d) => Object.fromEntries(Object.entries(d.params||{}).map(([k,p])=>[k, Math.min(p.max===undefined ? Infinity : p.max, n[k]||p.def)]));
// prise d'une entree en tourniquet (puits)
function takeRR(n,t){
  for(let k=0;k<n.inb.length;k++){
    const i=(n.rr+k)%n.inb.length;
    if(n.inb[i].length){ n.work = {v:n.inb[i].shift(), rem:t}; n.rr=i+1; break; }
  }
}
// avancement du travail en cours ; a la fin, sortie selon d.out
function work(n,d,dt){
  if(n.work){
    n.work.rem -= dt;
    if(n.work.rem<=0){ OUTS[d.out||'next'].push(n, n.work.v, d); n.work=null; mastTick(n); }
  }
}

export const KINDS = {
  producer: {
    fields:{val:'number'}, required:['val'], ins:[0,0], outs:[1,8],
    specs:()=>ALL_SPECS,
    tick(n,d,dt,t){
      if(n.outq.length<2){
        n.timer += dt;
        if(n.timer>=t){ n.timer=0; n.outq.push({v:seedV(d)*vmult(n), o:-1}); mastTick(n); }
      }
    },
    info:(n,d,t)=>`1 fichier de valeur ${seedV(d)} toutes les ${t.toFixed(2)} s.`,
  },
  transform: {
    fields:{mult:'number', multOf:'function', out:'out', params:'params'}, required:[], ins:[1,1], outs:[1,8],
    specs:()=>BASE_SPECS,
    tick(n,d,dt,t){
      if(!n.work && n.outq.length===0 && n.inb[0].length){ const v = n.inb[0].shift(); n.work = {v: d.multOf ? v*d.multOf(v, paramsOf(n,d)) : v*(d.mult||1), rem:t}; }
      work(n,d,dt);
    },
    info:(n,d,t)=>OUTS[d.out||'next'].info ? OUTS[d.out||'next'].info(n,d) : Object.entries(paramsOf(n,d)).map(([k,v])=>`${d.params[k].label} : ${fmt(v)}. `).join('')+perFile(t),
  },
  combine: {
    fields:{f:'function', out:'out'}, required:['f'], ins:[2,8], outs:[1,8],
    specs:()=>BASE_SPECS,
    tick(n,d,dt,t){
      if(!n.work && n.outq.length===0 && n.inb.every(q=>q.length)) n.work = {v:d.f(...n.inb.map(q=>q.shift())), rem:t};
      work(n,d,dt);
    },
    info:(n,d,t)=>perFile(t),
  },
  sink: {
    fields:{reward:'reward'}, required:['reward'], ins:[1,8], outs:[0,0],
    specs:d=>REWARDS[d.reward].valSpec ? ALL_SPECS : BASE_SPECS,
    tick(n,d,dt,t){
      if(!n.work) takeRR(n,t);
      if(n.work){
        n.work.rem -= dt;
        if(n.work.rem<=0){ REWARDS[d.reward].give(n); n.work=null; mastTick(n); }
      }
    },
    info:(n,d,t)=>REWARDS[d.reward].info(n,d,t),
  },
};
