// Progression : mesures nommees, succes et objectifs (donnees dans data/progression.js).
import { emit } from './bus.js';
import { G } from './state.js';
import { fmt } from './format.js';
import { rankOf } from './economy.js';
import { ACH, OBJ } from '../data/progression.js';
import { DEFS } from '../data/nodes.js';

const cnt = t => G.nodes.filter(n=>n.type===t).length;
// mesure -> fonction (argument facultatif apres ':')
const MEASURES = {
  files: ()=>G.files, lifetime: ()=>G.lifetime, nodes: ()=>G.nodes.length, types: ()=>new Set(G.nodes.map(n=>n.type)).size,
  rate: ()=>G.lastRate, resets: ()=>G.resets, golds: ()=>G.golds, research: ()=>G.rpTotal, playtime: ()=>G.playtime,
  contracts: ()=>G.cDone, streak: ()=>G.cStreak, events: ()=>G.evDone, qpTotal: ()=>G.qpTotal,
  maxLevel: ()=>Math.max(...G.nodes.map(n=>n.level+1)),                              // niveau affiche du meilleur noeud
  overclocks: ()=>G.oc.until>0?1:0, techs: ()=>Object.values(G.tech).reduce((a,b)=>a+b,0),
  count: t=>cnt(t), bought: t=>G.bought[t]||0,
  typesAtRank: r=>Object.keys(G.mast).filter(t=>rankOf(t)>=r).length,
};
const ARGS = {count:'type', bought:'type', typesAtRank:'number'};
const compiled = new Map();
// Fonction d'une mesure ('files', 'count:merge'...) ; erreur explicite si elle est inconnue
export function measure(spec, where){
  if(compiled.has(spec)) return compiled.get(spec);
  const fail = msg => { throw new Error('Donnees invalides : '+msg+' ('+where+')'); };
  if(typeof spec!=='string') fail('mesure absente');
  const i = spec.indexOf(':'), k = i<0 ? spec : spec.slice(0,i), a = i<0 ? undefined : spec.slice(i+1), m = MEASURES[k];
  if(!m) fail(`mesure inconnue "${spec}" ; mesures : ${Object.keys(MEASURES).join(', ')}`);
  if((ARGS[k]!==undefined) !== (a!==undefined)) fail(`mesure "${spec}" : argument ${ARGS[k]?'attendu ('+ARGS[k]+')':'inattendu'}`);
  if(ARGS[k]==='type' && !DEFS[a]) fail(`type de noeud inconnu dans la mesure "${spec}"`);
  if(ARGS[k]==='number' && !(+a>=0)) fail(`nombre attendu dans la mesure "${spec}"`);
  const f = a===undefined ? m : (ARGS[k]==='number' ? ()=>m(+a) : ()=>m(a));
  compiled.set(spec, f); return f;
}
export function validateProgression(){
  for(const a of ACH){ measure(a.measure, 'succes '+a.id); if(typeof a.gte!=='number') throw new Error('Donnees invalides : seuil gte absent (succes '+a.id+')'); }
  for(const o of OBJ){ measure(o.measure, 'objectif "'+o.d+'"'); if(typeof o.target!=='number') throw new Error('Donnees invalides : cible target absente (objectif "'+o.d+'")'); }
}
validateProgression();

// succès
export function checkAch(){
  for(const a of ACH) if(!G.ach[a.id] && measure(a.measure)()>=a.gte){ G.ach[a.id]=true; emit('toast', 'Succès : '+a.name+' (+2 % de revenus)'); emit('blip', 990,0.25,0.07,'triangle'); emit('achievement', a); }
}

// Objectifs : progression [mesure, cible] ; r = récompense minimale, s = secondes de revenus actuels (la plus grande des deux est versée)
export const objProgress = o => [measure(o.measure)(), o.target];
export const objReward = o => Math.max(o.r, (o.s||0)*G.lastRate);
export function checkObj(){
  const o = OBJ[G.obj]; if(!o) return;
  const [c,t] = objProgress(o);
  if(c>=t){
    const r = objReward(o);
    G.money+=r; G.run+=r; G.lifetime+=r; G.obj++;
    emit('toast', 'Objectif accompli : '+o.d+' (+'+fmt(r)+' crédits)'); emit('blip', 700,0.2,0.07,'triangle');
  }
}
