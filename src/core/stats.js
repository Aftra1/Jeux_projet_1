// Moteur de statistiques : chaque statistique est un pli de gauche a droite sur une liste ordonnee de modificateurs,
// a partir d'une valeur initiale (acc = acc * v pour 'mul', acc = acc + v pour 'add'). Pas de regroupement ni de cache
// de produit partiel : l'ordre des operations est exactement celui des formules d'origine (resultat identique au bit pres).
import { G } from './state.js';
import { achCount, infl, qpMult, rankOf, specsFor } from './economy.js';
import { evActive } from './events.js';
import { ocActive } from './prestige.js';
import { GROUPS, STATS, SYSTEM_MODS } from '../data/stats.js';
import { GLOBALS, PU, TECH } from '../data/upgrades.js';
import { EVT } from '../data/events.js';
import { DEFS, SPECS } from '../data/nodes.js';

const MODS = [];          // modificateurs enregistres (forme compilee)
export const LISTS = {};  // statistique -> liste ordonnee (recalculee par compileStats)
const BASE = {base:1}, GROWTH = {growth:1};
const fail = msg => { throw new Error('Donnees invalides : '+msg); };

// niveau d'une source
const LEVELS = {
  level: (n,x)=>x, rank: n=>rankOf(n.type), ach: ()=>achCount(), qpMult: ()=>qpMult(G.qpTotal), inflation: ()=>infl(), one: ()=>1,
};
// conditions nommees : 'overclock', 'event:<id>', 'spec:<id>', 'type:<id>'
function condition(w, st, where){
  if(w==='overclock') return ()=>ocActive();
  const i = w.indexOf(':'), k = w.slice(0,i), a = w.slice(i+1);
  if(k==='event'){ if(!EVT.some(e=>e.id===a)) fail(`evenement inconnu dans la condition "${w}" (${where})`); return ()=>evActive(a); }
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
    const lvl = typeof lv==='function' ? lv : LEVELS[lv]; if(!lvl) fail(`niveau inconnu "${lv}" (${where})`);
    const group = m.group || owner.group;
    if(group!==undefined && !GROUPS.includes(group)) fail(`groupe inconnu "${group}" (${where}) ; groupes : ${GROUPS.join(', ')}`);
    const ws = [owner.when, m.when].filter(Boolean).map(w=>condition(w, m.stat, where));
    const cond = ws.length===0 ? null : ws.length===1 ? ws[0] : (n,x)=>ws.every(c=>c(n,x));
    if(MODS.some(o=>o.key===key && o.stat===m.stat) || made.some(o=>o.key===key && o.stat===m.stat)) fail(`modificateur en double "${key}" sur la statistique ${m.stat}`);
    made.push({key, stat:m.stat, add:op==='add', f:m.by.f, text:m.by.text, lvl, cond, group});
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
    lists[st] = list;
  }
  if(mods) MODS.push(...mods);
  for(const st in lists) LISTS[st] = lists[st];
}

// Valeur d'une statistique. n : noeud (ou {type}) pour les conditions ; x : argument de niveau (niveau du noeud) ; acc : valeur initiale
export function stat(name, n, x, acc){
  const L = LISTS[name];
  if(acc===undefined) acc = STATS[name].init;
  for(let i=0;i<L.length;i++){
    const m = L[i];
    if(m.cond!==null && !m.cond(n,x)) continue;
    const v = m.f(m.lvl(n,x));
    acc = m.add ? acc + v : acc * v;
  }
  const mn = STATS[name].min;
  return mn===undefined ? acc : Math.max(mn, acc);
}
// Prix : pli de la courbe ; 'BASE' multiplie par base, 'GROWTH' par grow^k ; arrondi superieur
export function price(name, base, grow, k, n){
  const L = LISTS[name];
  let acc = 1;
  for(let i=0;i<L.length;i++){
    const m = L[i];
    if(m===BASE){ acc = acc * base; continue; }
    if(m===GROWTH){ acc = acc * Math.pow(grow, k); continue; }
    if(m.cond!==null && !m.cond(n,k)) continue;
    const v = m.f(m.lvl(n,k));
    acc = m.add ? acc + v : acc * v;
  }
  return Math.ceil(acc);
}
// Detail d'une statistique : [source, valeur] de chaque modificateur actif (pour un futur affichage)
export function statDetail(name, n, x){
  return LISTS[name].filter(m=>m.key && (m.cond===null || m.cond(n,x))).map(m=>[m.key, m.f(m.lvl(n,x))]);
}

// Sources du jeu : systeme, ameliorations globales, quantiques, recherche, evenements, specialisations
const store = (o, k) => (n,x)=>G[o][k];
export function sourceMods(){
  return [
    ...addMods(SYSTEM_MODS, {}),
    ...GLOBALS.flatMap(d=>addMods(d.mods, {key:'glob.'+d.id, lvl:store('glob',d.id), group:'upgrade'})),
    ...PU.flatMap(d=>addMods(d.mods, {key:'pu.'+d.id, lvl:store('pu',d.id), group:'upgrade'})),
    ...TECH.flatMap(d=>addMods(d.mods, {key:'tech.'+d.id, lvl:store('tech',d.id), group:'upgrade'})),
    ...EVT.flatMap(e=>addMods(e.mods, {key:'event.'+e.id, when:'event:'+e.id, group:'temporary'})),
    ...Object.keys(SPECS).flatMap(k=>addMods(SPECS[k].mods, {key:'spec.'+k, when:'spec:'+k, group:'node'})),
  ];
}
compileStats(sourceMods());
