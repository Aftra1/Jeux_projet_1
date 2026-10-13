// Registre : verifie toutes les donnees au chargement (erreur explicite au moindre nom inconnu)
// et permet d'ajouter un type de noeud ou une amelioration a l'execution (registerNode, registerUpgrade).
import { G } from './state.js';
import { KINDS, OUTS, REWARDS } from './kinds.js';
import { addMods, compileStats } from './stats.js';
import { measure } from './progression.js';
import { COLORS, DEFS, ORDER, SPECS } from '../data/nodes.js';
import { GLOBALS, PU, TECH } from '../data/upgrades.js';
import { EVT } from '../data/events.js';
import { ACH, OBJ } from '../data/progression.js';

const invalid = msg => { throw new Error('Donnees invalides : '+msg); };
const COMMON = {name:'string', label:'string', color:'string', desc:'string', kind:'kind', ins:'ports', outs:'ports', t:'number', cost:'number', unlock:'number', needRs:'int', icon:'string'};
const REQUIRED = ['name','label','color','desc','kind','ins','outs','t','cost','unlock'];
const isFin = v => typeof v==='number' && isFinite(v);

const SPECS_OF = {};   // type -> specialisations proposees
export const specsOfType = t => SPECS_OF[t];

// Verifie un type de noeud ; renvoie la liste des erreurs
export function checkNode(id, d){
  const e = [], where = `noeud "${id}"`;
  if(!d || typeof d!=='object') return [`${where} : entree absente`];
  const K = KINDS[d.kind];
  if(!K) return [`${where} : genre inconnu "${d.kind}" ; genres : ${Object.keys(KINDS).join(', ')}`];
  const fields = {...COMMON, ...K.fields};
  for(const k of Object.keys(d)) if(!fields[k]) e.push(`${where} : champ inconnu "${k}" (genre ${d.kind})`);
  for(const k of [...REQUIRED, ...K.required]) if(d[k]===undefined) e.push(`${where} : champ obligatoire "${k}" absent`);
  for(const [k,ty] of Object.entries(fields)){
    const v = d[k]; if(v===undefined) continue;
    if(ty==='string' && typeof v!=='string') e.push(`${where} : "${k}" doit etre un texte`);
    if(ty==='number' && !(isFin(v) && v>=0)) e.push(`${where} : "${k}" doit etre un nombre positif`);
    if(ty==='int' && !(Number.isInteger(v) && v>=0)) e.push(`${where} : "${k}" doit etre un entier positif`);
    if(ty==='ports' && !(Number.isInteger(v) && v>=0 && v<=8)) e.push(`${where} : "${k}" doit etre un entier de 0 a 8`);
    if(ty==='function' && typeof v!=='function') e.push(`${where} : "${k}" doit etre une fonction`);
    if(ty==='out' && !OUTS[v]) e.push(`${where} : sortie inconnue "${v}" ; sorties : ${Object.keys(OUTS).join(', ')}`);
    if(ty==='reward' && !REWARDS[v]) e.push(`${where} : recompense inconnue "${v}" ; recompenses : ${Object.keys(REWARDS).join(', ')}`);
    if(ty==='params') for(const [p,s] of Object.entries(v)) if(!s || !isFin(s.def) || !isFin(s.min) || typeof s.label!=='string') e.push(`${where} : parametre "${p}" incomplet (def, min, label)`);
  }
  if(!(d.t>0)) e.push(`${where} : "t" doit etre superieur a 0`);
  if(Number.isInteger(d.ins) && (d.ins<K.ins[0] || d.ins>K.ins[1])) e.push(`${where} : ${d.ins} entree(s) ; le genre ${d.kind} en demande ${K.ins.join(' a ')}`);
  if(Number.isInteger(d.outs) && (d.outs<K.outs[0] || d.outs>K.outs[1])) e.push(`${where} : ${d.outs} sortie(s) ; le genre ${d.kind} en demande ${K.outs.join(' a ')}`);
  if(d.out==='threshold' && (d.outs!==2 || !d.params || !d.params.thr)) e.push(`${where} : la sortie "threshold" demande 2 sorties et le parametre thr`);
  if(d.out==='copy' && d.outs<2) e.push(`${where} : la sortie "copy" demande au moins 2 sorties`);
  return e;
}
function addType(id, d){ if(!ORDER.includes(id)){ ORDER.push(id); DEFS[id] = d; } COLORS[id] = d.color; SPECS_OF[id] = KINDS[d.kind].specs(d); }

// Verifie une amelioration (globale, quantique ou recherche) ; renvoie la liste des erreurs
const UPG = {id:'string', name:'string', desc:'string', base:'number', grow:'number', max:'number', mods:'array', eff:'function'};
function checkUpgrade(d, where){
  const e = [];
  for(const k of Object.keys(d)) if(!UPG[k]) e.push(`${where} : champ inconnu "${k}"`);
  for(const k of ['id','name','desc','base','grow','max']) if(d[k]===undefined) e.push(`${where} : champ obligatoire "${k}" absent`);
  if(d.mods!==undefined && !Array.isArray(d.mods)) e.push(`${where} : "mods" doit etre une liste`);
  return e;
}
const UPG_LISTS = {glob:GLOBALS, pu:PU, tech:TECH};

// Ajoute un type de noeud a l'execution (donnees seulement) ; erreur explicite si l'entree est invalide
export function registerNode(id, d){
  if(typeof id!=='string' || !/^[a-z][a-z0-9]*$/.test(id)) invalid(`identifiant de noeud invalide "${id}" (lettres minuscules et chiffres)`);
  if(DEFS[id]) invalid(`noeud "${id}" deja defini`);
  const e = checkNode(id, d); if(e.length) invalid(e.join(' ; '));
  addType(id, d);
  return d;
}
// Ajoute une amelioration a l'execution : store 'glob' (credits), 'pu' (quantique) ou 'tech' (recherche)
export function registerUpgrade(store, d){
  const list = UPG_LISTS[store]; if(!list) invalid(`categorie d'amelioration inconnue "${store}" (glob, pu, tech)`);
  const where = `amelioration ${store}.${d && d.id}`;
  const e = checkUpgrade(d, where); if(e.length) invalid(e.join(' ; '));
  if(list.some(x=>x.id===d.id)) invalid(`${where} deja definie`);
  const made = addMods(d.mods, {key:store+'.'+d.id, lvl:()=>G[store][d.id], group:'upgrade'});
  compileStats(made);   // ne modifie rien si une erreur est levee
  list.push(d);
  if(G && G[store][d.id]===undefined) G[store][d.id] = 0;
  return d;
}

// Verification de toutes les donnees du jeu au chargement
export function validateAll(){
  const e = [];
  for(const id of ORDER){ const x = checkNode(id, DEFS[id]); if(x.length) e.push(...x); else addType(id, DEFS[id]); }
  for(const [s,list] of Object.entries(UPG_LISTS)) for(const d of list) e.push(...checkUpgrade(d, `amelioration ${s}.${d.id}`));
  for(const ev of EVT) for(const k of Object.keys(ev)) if(!['id','name','desc','dur','mods'].includes(k)) e.push(`evenement ${ev.id} : champ inconnu "${k}"`);
  for(const k in SPECS) for(const f of Object.keys(SPECS[k])) if(!['name','desc','mods'].includes(f)) e.push(`specialisation ${k} : champ inconnu "${f}"`);
  const m = (spec, where, num, k) => { try{ measure(spec, where); }catch(x){ e.push(x.message.replace('Donnees invalides : ','')); } if(typeof num!=='number') e.push(`${where} : nombre "${k}" absent`); };
  for(const a of ACH) m(a.measure, 'succes '+a.id, a.gte, 'gte');
  for(const o of OBJ) m(o.measure, 'objectif "'+o.d+'"', o.target, 'target');
  if(e.length) invalid(e.join(' ; '));
}
validateAll();
