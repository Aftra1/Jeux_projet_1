// Etat de la partie (G), creation d'une partie, noeuds et liens, index id -> noeud et noeud -> lien.
import { emit } from './bus.js';
import { RKC, startCash } from './economy.js';
import { TECH } from '../data/upgrades.js';
import { DEFS } from '../data/nodes.js';

export let G = null;
export function blankRun(g){
  g.money = startCash(g.pu.start); g.run = 0; g.nextId = 1;
  g.nodes = []; g.links = []; g.bought = {};
  g.glob = {rev:0,spd:0,seed:0,buf:0,crit:0};
  g.view = {x:0,y:0,k:1};
}
export function newGame(){
  for(const k in RKC) delete RKC[k];
  G = {rp:0, rpTotal:0, tech:{}, lifetime:0, files:0, qp:0, qpTotal:0, resets:0, golds:0, playtime:0, lastRate:0, ach:{}, pu:{start:0,spd:0,disc:0,off:0,auto:0,rev:0}, obj:0, daily:'', oc:{until:0,ready:0}, mute:false, mast:{}, contract:null, cStreak:0, cDone:0, cNext:0, ev:null, mine:[], hist:[], runStart:0, evNext:0, evDone:0, bestRate:0, sci:false, savedAt:Date.now()};
  for(const t of TECH) G.tech[t.id]=0;
  blankRun(G);
  addNode('source', -280, -40, true);
  addNode('upload', 180, -40, true);
}
export function addNode(type,x,y,free){
  const n = {id:G.nextId++, type, x, y, level:0, inb:[], work:null, outq:[], rr:0, timer:0};
  for(let i=0;i<DEFS[type].ins;i++) n.inb.push([]);
  G.nodes.push(n);
  if(!free) G.bought[type] = (G.bought[type]||0)+1;
  return n;
}
// Index id -> noeud, reconstruit quand le tableau change (autre tableau, autre taille, autre premier ou dernier element).
// Les modifications en place qui gardent ces quatre criteres (ordre des noeuds, par exemple) ne changent pas l'ensemble des noeuds.
let nmArr = null, nmLen = -1, nmFirst = null, nmLast = null; const nm = new Map();
export function nodeById(id){
  const a = G.nodes, L = a.length;
  if(a!==nmArr || L!==nmLen || a[0]!==nmFirst || a[L-1]!==nmLast){ nm.clear(); for(const n of a) nm.set(n.id, n); nmArr = a; nmLen = L; nmFirst = a[0]; nmLast = a[L-1]; }
  return nm.get(id);
}
// Index (noeud, sortie) -> lien, meme principe d'invalidation que nodeById ; en cas de doublon le premier lien l'emporte
let lmArr = null, lmLen = -1, lmFirst = null, lmLast = null; const lm = new Map();
export function linkFrom(id,o){
  const a = G.links, L = a.length;
  if(a!==lmArr || L!==lmLen || a[0]!==lmFirst || a[L-1]!==lmLast){ lm.clear(); for(const l of a){ const k = l.a*64+l.ao; if(l.ao<64 && !lm.has(k)) lm.set(k, l); } lmArr = a; lmLen = L; lmFirst = a[0]; lmLast = a[L-1]; }
  return lm.get(id*64+o);
}
export function connect(a,ao,b,bi){
  if(a===b) return;
  G.links = G.links.filter(l=>!(l.a===a&&l.ao===ao) && !(l.b===b&&l.bi===bi));
  G.links.push({a,ao,b,bi,packets:[]});
  emit('blip', 660,0.07,0.05);
}
export function removeNode(n){ G.links = G.links.filter(l=>l.a!==n.id && l.b!==n.id); G.nodes = G.nodes.filter(x=>x!==n); }
export function setG(v){ return G = v; }
