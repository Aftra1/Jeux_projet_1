// Moteur de statistiques : chaque statistique est un pli de gauche a droite sur une liste ordonnee de modificateurs,
// a partir d'une valeur initiale (acc = acc * v pour 'mul', acc = acc + v pour 'add'). Pas de regroupement ni de cache
// de produit partiel : l'ordre des operations est exactement celui des formules d'origine (resultat identique au bit pres).
import { G } from './state.js';
import { achCount, infl, qpMult, rankOf, specsFor, startCash } from './economy.js';
import { fmt } from './format.js';
import { GROUPS, STATS, SYSTEM_MODS } from '../data/stats.js';
import { GLOBALS, PU, TECH } from '../data/upgrades.js';
import { EVT } from '../data/events.js';
import { DEFS, SPECS } from '../data/nodes.js';

const MODS = [];          // modificateurs enregistres (forme compilee)
export const LISTS = {};  // statistique -> liste ordonnee (recalculee par compileStats)
const BASE = {base:1}, GROWTH = {growth:1};
const fail = msg => { throw new Error('Donnees invalides : '+msg); };

// niveau d'une source : nom, ou [stockage, id] pour une amelioration (G.glob.spd...)
const LEVELS = {
  level: (n,x)=>x, rank: n=>rankOf(n.type), ach: ()=>achCount(), qpMult: ()=>qpMult(G.qpTotal), inflation: ()=>infl(), one: ()=>1,
};
// Cache d'un pas de simulation : pendant step(), les niveaux d'ameliorations, le nombre de succes, les points quantiques,
// l'Overclock et l'evenement en cours ne changent pas (ils ne changent qu'entre deux pas). La valeur d'un modificateur
// qui ne depend que d'eux est donc calculee une fois par pas (meme nombre, meme ordre du pli).
let EPOCH = 0, IN_STEP = false;
export function beginStep(){ EPOCH++; IN_STEP = true; }
export function endStep(){ EPOCH++; IN_STEP = false; }
const GLOBAL_LEVELS = ['ach','qpMult','inflation','one'];
function cached(v){
  let ep = -1, val;
  return (n,x)=>{ if(ep===EPOCH) return val; const r = v(n,x); if(IN_STEP){ ep = EPOCH; val = r; } return r; };
}
// Fonction valeur d'un modificateur, specialisee pour les cas courants (un seul appel par modificateur dans le pli) ;
// meme arithmetique que by.f(niveau). Renvoie undefined quand la condition est fausse (modificateur ignore).
function valueFn(by, lv, conds, global){ const v = valueFn0(by, lv, conds); return global && (Array.isArray(lv) || GLOBAL_LEVELS.includes(lv)) ? cached(v) : v; }
function valueFn0(by, lv, conds){
  const K = by.K, f = by.f, st = Array.isArray(lv), o = st && lv[0], k = st && lv[1];
  let v;
  if(by.kind==='flat') v = ()=>K;
  else if(st && by.kind==='pct') v = ()=>1 + K*G[o][k];
  else if(st && by.kind==='less') v = ()=>1 - K*G[o][k];
  else if(st && by.kind==='per') v = ()=>K*G[o][k];
  else if(lv==='level' && by.kind==='pct') v = (n,x)=>1 + K*x;
  else if(lv==='rank' && by.kind==='pct') v = n=>1 + K*rankOf(n.type);
  else if(lv==='one') v = ()=>f(1);
  else { const g = st ? ()=>G[o][k] : typeof lv==='function' ? lv : LEVELS[lv]; v = (n,x)=>f(g(n,x)); }
  if(conds.length===0) return v;
  if(conds.length===1){ const c = conds[0]; if(by.kind==='flat') return (n,x)=>c(n,x) ? K : undefined; return (n,x)=>c(n,x) ? v(n,x) : undefined; }
  return (n,x)=>conds.every(c=>c(n,x)) ? v(n,x) : undefined;
}
// conditions nommees : 'overclock', 'event:<id>', 'spec:<id>', 'type:<id>'
function condition(w, st, where){
  if(w==='overclock') return ()=>G.playtime < G.oc.until;   // ocActive()
  const i = w.indexOf(':'), k = w.slice(0,i), a = w.slice(i+1);
  if(k==='event'){ if(!EVT.some(e=>e.id===a)) fail(`evenement inconnu dans la condition "${w}" (${where})`); return ()=>!!G.ev && G.ev.id===a && G.playtime<G.ev.until; }   // evActive(a)
  if(k==='spec' || k==='type'){
    if(!STATS[st].node) fail(`condition "${w}" sur la statistique "${st}", qui ne concerne pas un noeud (${where})`);
    if(k==='spec'){ if(!SPECS[a]) fail(`specialisation inconnue dans la condition "${w}" (${where})`); return n=>n.spec===a && specsFor(n).includes(a); }
    if(!DEFS[a]) fail(`type de noeud inconnu dans la condition "${w}" (${where})`); return n=>n.type===a;
  }
  fail(`condition inconnue "${w}" (${where})`);
}

// Enregistre les modificateurs d'une source. owner : {key, lvl, when, group} fixes par le type de source.
export function addMods(mods, owner){
  const made = [];
  for(const m of mods||[]){
    const key = m.id || owner.key, where = `modificateur ${key}`;
    if(!STATS[m.stat]) fail(`statistique inconnue "${m.stat}" (${where})`);
    if(!m.by || typeof m.by.f!=='function') fail(`valeur absente : "by" doit venir d'un assistant (pct, less, plus...) (${where})`);
    const op = m.op || m.by.op;
    if(op!=='mul' && op!=='add') fail(`operation inconnue "${op}" (${where}, statistique ${m.stat})`);
    const lv = m.lvl || owner.lvl || 'one';
    if(!Array.isArray(lv) && typeof lv!=='function' && !LEVELS[lv]) fail(`niveau inconnu "${lv}" (${where})`);
    const group = m.group || owner.group;
    if(group!==undefined && !GROUPS.includes(group)) fail(`groupe inconnu "${group}" (${where}) ; groupes : ${GROUPS.join(', ')}`);
    const wn = [owner.when, m.when].filter(Boolean), ws = wn.map(w=>condition(w, m.stat, where));
    const global = wn.every(w=>w==='overclock' || w.startsWith('event:'));   // ne depend pas du noeud
    if(MODS.some(o=>o.key===key && o.stat===m.stat) || made.some(o=>o.key===key && o.stat===m.stat)) fail(`modificateur en double "${key}" sur la statistique ${m.stat}`);
    made.push({key, stat:m.stat, add:op==='add', v:valueFn(m.by, lv, ws, global), text:m.by.text, group});
  }
  return made;
}
// Construit la liste ordonnee de chaque statistique : emplacements historiques, puis groupes dans l'ordre d'enregistrement
export function compileStats(mods){
  const all = MODS.concat(mods||[]), lists = {};
  for(const st in STATS){
    const order = STATS[st].order, list = [];
    for(const slot of order){
      if(slot==='BASE'){ list.push(BASE); continue; }
      if(slot==='GROWTH'){ list.push(GROWTH); continue; }
      if(slot[0]==='@'){ const g = slot.slice(1); for(const m of all) if(m.stat===st && !order.includes(m.key) && m.group===g) list.push(m); continue; }
      const m = all.find(o=>o.stat===st && o.key===slot);
      if(!m) fail(`emplacement "${slot}" de la statistique ${st} sans modificateur`);
      list.push(m);
    }
    for(const m of all) if(m.stat===st && !order.includes(m.key) && !(m.group && order.includes('@'+m.group)))
      fail(`modificateur "${m.key}" sans place dans la statistique ${st} : indiquer un groupe (${order.filter(s=>s[0]==='@').join(', ')})`);
    lists[st] = {list, init:STATS[st].init, min:STATS[st].min};
  }
  if(mods) MODS.push(...mods);
  for(const st in lists) LISTS[st] = lists[st];
}

// Valeur d'une statistique. n : noeud (ou {type}) pour les conditions ; x : argument de niveau (niveau du noeud) ; acc : valeur initiale
export function stat(name, n, x, acc){
  const S = LISTS[name], L = S.list;
  if(acc===undefined) acc = S.init;
  for(let i=0;i<L.length;i++){
    const m = L[i], v = m.v(n,x);
    if(v===undefined) continue;
    acc = m.add ? acc + v : acc * v;
  }
  return S.min===undefined ? acc : Math.max(S.min, acc);
}
// Prix : pli de la courbe ; 'BASE' multiplie par base, 'GROWTH' par grow^k ; arrondi superieur
export function price(name, base, grow, k, n){
  const L = LISTS[name].list;
  let acc = 1;
  for(let i=0;i<L.length;i++){
    const m = L[i];
    if(m===BASE){ acc = acc * base; continue; }
    if(m===GROWTH){ acc = acc * Math.pow(grow, k); continue; }
    const v = m.v(n,k);
    if(v===undefined) continue;
    acc = m.add ? acc + v : acc * v;
  }
  return Math.ceil(acc);
}
// Detail d'une statistique : [source, valeur] de chaque modificateur actif (pour un futur affichage)
export function statDetail(name, n, x){
  return LISTS[name].list.filter(m=>m.key && m.v(n,x)!==undefined).map(m=>[m.key, m.v(n,x)]);
}

// Texte d'effet d'une amelioration au niveau l : eff explicite, sinon texte de l'assistant du premier modificateur
export const effText = (d, l) => d.eff ? d.eff(l, {fmt, startCash}) : d.mods && d.mods.length ? d.mods[0].by.text(l) : '';

// Sources du jeu : systeme, ameliorations globales, quantiques, recherche, evenements, specialisations
export function sourceMods(){
  return [
    ...addMods(SYSTEM_MODS, {}),
    ...GLOBALS.flatMap(d=>addMods(d.mods, {key:'glob.'+d.id, lvl:['glob',d.id], group:'upgrade'})),
    ...PU.flatMap(d=>addMods(d.mods, {key:'pu.'+d.id, lvl:['pu',d.id], group:'upgrade'})),
    ...TECH.flatMap(d=>addMods(d.mods, {key:'tech.'+d.id, lvl:['tech',d.id], group:'upgrade'})),
    ...EVT.flatMap(e=>addMods(e.mods, {key:'event.'+e.id, when:'event:'+e.id, group:'temporary'})),
    ...Object.keys(SPECS).flatMap(k=>addMods(SPECS[k].mods, {key:'spec.'+k, when:'spec:'+k, group:'node'})),
  ];
}
compileStats(sourceMods());
