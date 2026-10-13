// Sauvegarde : format versionne, migrations, validation, copie de secours, chargement (gain hors ligne, bonus quotidien).
import { emit } from './bus.js';
import { G, setG } from './state.js';
import { fmt } from './format.js';
import { RKC } from './economy.js';
import { ZMAX, ZMIN } from './geometry.js';
import { DEFS, SPECS } from '../data/nodes.js';
import { TECH } from '../data/upgrades.js';

// Format : JSON dans localStorage. `ver` = version du schema (SAVE_VERSION). Pour changer le format :
// incrementer SAVE_VERSION et ajouter MIGRATIONS[nouvelle version] = d => d' (transforme une sauvegarde de la version precedente).
const SAVE_VERSION = 1;
export const KEY = 'uploadlab2', KEY_BAK = KEY+'.bak', KEY_BAD = KEY+'.unreadable';
const MIGRATIONS = {
  1: d => d,   // v0 (sans champ ver) -> v1 : structure identique, hydrate() complete les champs manquants
};
export const lsGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const lsSet = (k,v) => { try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } };
export const lsDel = k => { try{ localStorage.removeItem(k); }catch(e){} };
const SAVE_NUMS = ['money','run','rp','rpTotal','lifetime','files','qp','qpTotal','resets','golds','playtime','lastRate','bestRate','obj','nextId','cStreak','cDone','cNext','evNext','evDone','runStart','savedAt'];
export const isNum = v => typeof v==='number' && isFinite(v);
// premier champ numerique invalide de l'etat (null si tout va bien)
const badField = g => SAVE_NUMS.find(k => g[k]!==undefined && (!isNum(g[k]) || g[k]<0)) || null;

// Texte JSON -> objet, sans les cles dangereuses (__proto__, constructor, prototype)
export function parseSave(text){ return JSON.parse(text, (k,v)=> (k==='__proto__'||k==='constructor'||k==='prototype') ? undefined : v); }
// Applique les migrations dans l'ordre ; refuse une sauvegarde plus recente que le jeu
function migrateSave(d){
  const v0 = Number.isInteger(d.ver) ? d.ver : 0;
  if(v0 > SAVE_VERSION) throw new Error('sauvegarde d\'une version plus récente du jeu (v'+v0+')');
  for(let v=v0+1; v<=SAVE_VERSION; v++) d = MIGRATIONS[v](d);
  d.ver = SAVE_VERSION;
  return d;
}
// Verifie la structure et nettoie ce qui peut l'etre ; renvoie un message d'erreur ou null
function validateSave(d){
  if(!d || typeof d!=='object' || Array.isArray(d)) return 'format inattendu';
  const bf = badField(d); if(bf) return 'valeur invalide : '+bf;
  if(!Array.isArray(d.nodes)) return 'liste de nœuds absente';
  if(d.nodes.length>5000 || (d.links && d.links.length>10000)) return 'trop de nœuds ou de liens';
  const ids = new Set();
  for(const n of d.nodes){
    if(!n || typeof n!=='object') return 'nœud invalide';
    if(!Number.isInteger(n.id) || n.id<1 || ids.has(n.id)) return 'identifiant de nœud invalide';
    ids.add(n.id);
    if(!isNum(n.x) || !isNum(n.y) || Math.abs(n.x)>1e6 || Math.abs(n.y)>1e6) return 'position de nœud invalide';
    if(!Number.isInteger(n.level) || n.level<0 || n.level>10000) return 'niveau de nœud invalide';
    if(n.spec!==undefined && !SPECS[n.spec]) delete n.spec;
    if(n.timer!==undefined && !isNum(n.timer)) n.timer = 0;
    if(n.thr!==undefined && !isNum(n.thr)) delete n.thr;
  }
  if(d.links!==undefined){
    if(!Array.isArray(d.links)) return 'liste de liens invalide';
    for(const l of d.links) if(!l || !Number.isInteger(l.a) || !Number.isInteger(l.b) || !Number.isInteger(l.ao) || !Number.isInteger(l.bi) || l.ao<0 || l.bi<0) return 'lien invalide';
  }
  for(const k of ['pu','glob','tech','mast','bought']){
    if(d[k]===undefined) continue;
    if(!d[k] || typeof d[k]!=='object' || Array.isArray(d[k])) return 'section invalide : '+k;
    for(const x in d[k]) if(!isNum(d[k][x]) || d[k][x]<0) return 'valeur invalide : '+k+'.'+x;
  }
  if(d.ach!==undefined && (!d.ach || typeof d.ach!=='object' || Array.isArray(d.ach))) return 'section invalide : ach';
  if(d.view!==undefined){
    const v = d.view;
    if(!v || !isNum(v.x) || !isNum(v.y) || !isNum(v.k)) d.view = {x:0,y:0,k:1};
    else v.k = Math.max(ZMIN, Math.min(ZMAX, v.k));
  }
  // schemas personnels : on garde ceux qui sont bien formes, textes limites (ils sont echappes a l'affichage)
  if(d.mine!==undefined){
    const okN = n => Array.isArray(n) && typeof n[0]==='string' && DEFS[n[0]] && isNum(n[1]) && isNum(n[2]) && Math.abs(n[1])<1e3 && Math.abs(n[2])<1e3 && (n[3]===undefined || isNum(n[3]));
    d.mine = (Array.isArray(d.mine) ? d.mine : []).filter(b => b && Array.isArray(b.nodes) && b.nodes.length>0 && b.nodes.length<=60 && b.nodes.every(okN) &&
      Array.isArray(b.links) && b.links.every(l=>Array.isArray(l) && l.length===4 && l.every(Number.isInteger) && l[0]>=0 && l[2]>=0 && l[0]<b.nodes.length && l[2]<b.nodes.length)).slice(0,20)
      .map(b => ({k:Number.isInteger(b.k)?b.k:0, mine:true, name:String(b.name==null?'Schéma':b.name).slice(0,40), desc:String(b.desc==null?'':b.desc).slice(0,120), nodes:b.nodes, links:b.links}));
  }
  return null;
}
function hydrate(d){
  for(const k in RKC) delete RKC[k];
  const g = Object.assign({rp:0,rpTotal:0,obj:0,daily:'',oc:{until:0,ready:0},lifetime:0,files:0,qp:0,qpTotal:0,resets:0,golds:0,playtime:0,lastRate:0,mute:false,mast:{},contract:null,cStreak:0,cDone:0,cNext:0,ev:null,mine:[],hist:[],runStart:0,evNext:0,evDone:0,bestRate:0,sci:false,savedAt:Date.now()}, d);
  delete g.auto;   // ancien pilote automatique, retire
  g.mast = g.mast||{};
  g.view = g.view||{x:0,y:0,k:1}; g.bought = g.bought||{}; g.money = g.money||0; g.run = g.run||0;
  g.ach = g.ach||{}; g.tech = g.tech||{};
  for(const t of TECH) g.tech[t.id] = g.tech[t.id]||0;
  g.pu = Object.assign({start:0,spd:0,disc:0,off:0,auto:0,rev:0}, g.pu);
  g.glob = Object.assign({rev:0,spd:0,seed:0,buf:0,crit:0}, g.glob);
  g.nodes = (g.nodes||[]).filter(n=>DEFS[n.type]);
  for(const n of g.nodes){
    n.inb = Array.from({length:DEFS[n.type].ins},(_,i)=>(n.inb&&n.inb[i])||[]);
    n.outq = (n.outq||[]).filter(q=>q && typeof q==='object');
    n.work = n.work && n.work.rem!==undefined ? n.work : null;
  }
  g.nextId = Math.max(g.nextId||1, ...g.nodes.map(n=>n.id+1));
  g.links = (g.links||[]).filter(l=>g.nodes.some(n=>n.id===l.a) && g.nodes.some(n=>n.id===l.b)).map(l=>Object.assign(l,{packets:[]}));
  return g;
}
// Texte -> {g, from} : analyse, migration, verification, hydratation. Leve une Error au message lisible.
export function readSave(text){
  let d; try{ d = parseSave(text); }catch(e){ throw new Error('texte illisible'); }
  if(!d || typeof d!=='object' || Array.isArray(d)) throw new Error('format inattendu');
  const from = Number.isInteger(d.ver) ? d.ver : 0;
  d = migrateSave(d);
  const err = validateSave(d); if(err) throw new Error(err);
  return {g:hydrate(d), from};
}
// Une seule serialisation JSON (sans les paquets en transit), version et date comprises
export function serializeText(){ return JSON.stringify(Object.assign({}, G, {ver:SAVE_VERSION, savedAt:Date.now()}), (k,v)=> k==='packets' ? [] : v); }
function serialize(){ return JSON.parse(serializeText()); }
// Copie de secours : la sauvegarde actuellement stockee (si elle est lisible) devient la copie de secours
let lastBak = 0;
export function backupNow(){
  const cur = lsGet(KEY); if(!cur) return;
  try{ if(validateSave(migrateSave(parseSave(cur)))) return; }catch(e){ return; }
  if(lsSet(KEY_BAK, cur)) lastBak = Date.now();
}
let saveWarn = '';
export function save(){
  let text; try{ text = serializeText(); }catch(e){ return; }
  const bf = badField(G);
  if(bf){   // ne jamais ecraser une bonne sauvegarde par un etat corrompu
    if(saveWarn!==bf){ saveWarn = bf; console.error('sauvegarde suspendue : valeur invalide '+bf); emit('toast', 'Sauvegarde suspendue : valeur invalide ('+bf+')', 5000); }
    return;
  }
  if(Date.now()-lastBak > 300000) backupNow();   // au plus une copie de secours toutes les 5 minutes
  if(lsSet(KEY, text)){ saveWarn = ''; }
  else if(saveWarn!=='quota'){ saveWarn = 'quota'; emit('toast', 'Sauvegarde impossible (stockage plein ou bloqué)', 5000); }
}
// Sauvegarde illisible : on la garde pour pouvoir la recuperer, jamais ecrasee en silence
function keepUnreadable(raw, why){ if(lsGet(KEY_BAD)!==raw) lsSet(KEY_BAD, raw); lsSet(KEY_BAD+'.why', why); }
export function load(){
  const raw = lsGet(KEY); if(!raw) return false;
  let r = null, note = '';
  try{ r = readSave(raw); }
  catch(e){
    keepUnreadable(raw, e.message);
    const bak = lsGet(KEY_BAK);
    try{ r = bak ? readSave(bak) : null; }catch(e2){ r = null; }
    note = r ? 'Sauvegarde illisible ('+e.message+') : copie de secours restaurée.' : 'Sauvegarde illisible ('+e.message+') : copie conservée dans Options.';
    setTimeout(()=>emit('toast', note, 6000), 800);
    if(!r) return false;
  }
  if(r.from < SAVE_VERSION) lsSet(KEY+'.v'+r.from, raw);   // ancienne version conservee avant migration
  setG(r.g);
  if(!G.nodes.length) return false;
  const secs = Math.min((Date.now()-G.savedAt)/1000, 3*3600);
  if(secs>30 && G.lastRate>0){
    const gain = G.lastRate*secs*(0.4+0.08*G.pu.off);
    G.money+=gain; G.run+=gain; G.lifetime+=gain;
    setTimeout(()=>emit('toast', `Pendant ton absence (${Math.floor(secs/60)} min) : +${fmt(gain)} crédits`),600);
  }
  const today = new Date().toISOString().slice(0,10);
  if(G.daily!==today){
    G.daily = today;
    const r = Math.max(500, G.lastRate*600);
    G.money+=r; G.run+=r; G.lifetime+=r;
    setTimeout(()=>emit('toast', 'Bonus quotidien : +'+fmt(r)+' crédits'),3500);
  }
  return true;
}
