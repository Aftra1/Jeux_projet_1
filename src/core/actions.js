// Actions du joueur sur la partie : vendre, annuler, ameliorer, poser et enregistrer des schemas.
import { emit } from './bus.js';
import { G, addNode, connect, nodeById, removeNode } from './state.js';
import { bpCost, bpUnlocked, buyCost, gUpCost, puCost, sellVal, techCost, unlocked, upCost } from './economy.js';
import { NH, NW } from '../data/nodes.js';

// Pose un schema pres du point ctr (coordonnees monde) ; renvoie les noeuds poses, ou null si impossible
export function placeBlueprint(b, ctr){
  if(!bpUnlocked(b)) return null;
  const c = bpCost(b);
  if(G.money<c){ emit('toast', 'Pas assez de crédits'); return null; }
  const SX = NW+60, SY = NH+40, cols = Math.max(...b.nodes.map(n=>n[1]))+1, rows = Math.max(...b.nodes.map(n=>n[2]))+1;
  const bw = (cols-1)*SX+NW, bh = (rows-1)*SY+NH, gap = 24;
  const free = (px,py)=>!G.nodes.some(m=>px<m.x+NW+gap && px+bw+gap>m.x && py<m.y+NH+gap && py+bh+gap>m.y);
  let ox = Math.round((ctr.x-bw/2)/10)*10, oy = Math.round((ctr.y-bh/2)/10)*10, found = free(ox,oy);
  for(let r=1;r<60 && !found;r++) for(let i=0;i<r*8 && !found;i++){
    const a = i/(r*8)*Math.PI*2, px = Math.round((ctr.x-bw/2+Math.cos(a)*r*(bw+gap)*0.5)/10)*10, py = Math.round((ctr.y-bh/2+Math.sin(a)*r*(bh+gap)*0.5)/10)*10;
    if(free(px,py)){ ox=px; oy=py; found=true; }
  }
  G.money -= c;
  const made = b.nodes.map(([t,cx_,cy_,th_])=>{ const m = addNode(t, ox+cx_*SX, oy+Math.round(cy_*SY/10)*10); if(th_) m.thr = th_; return m; });
  for(const [a,ao,z,zi] of b.links) connect(made[a].id,ao,made[z].id,zi);
  return made;
}
// Schema (types, positions relatives en cases, liens internes) d'un groupe de noeuds
export function blueprintOf(ns){
  const SX = NW+60, SY = NH+40, mx = Math.min(...ns.map(n=>n.x)), my = Math.min(...ns.map(n=>n.y));
  const idx = new Map(ns.map((n,i)=>[n.id,i]));
  const links = G.links.filter(l=>idx.has(l.a) && idx.has(l.b)).map(l=>[idx.get(l.a),l.ao,idx.get(l.b),l.bi]);
  return {nodes:ns.map(n=>{ const r=[n.type, Math.round((n.x-mx)/SX*100)/100, Math.round((n.y-my)/SY*100)/100]; if(n.type==='sorter' && n.thr) r.push(n.thr); return r; }), links};
}
// Enregistre un groupe de noeuds comme schema personnel
export function saveBlueprint(ns){
  if(ns.length<2){ emit('toast', 'Sélectionne au moins 2 nœuds'); return; }
  if((G.mine||[]).length>=20){ emit('toast', '20 schémas personnels maximum'); return; }
  const b = blueprintOf(ns);
  const k = (G.mine.length?Math.max(...G.mine.map(b=>b.k||0)):0)+1;
  G.mine.push({k, mine:true, name:'Mon schéma '+k, desc:'Schéma personnel : '+ns.length+' nœuds, '+b.links.length+' liens.', nodes:b.nodes, links:b.links});
  emit('toast', 'Schéma enregistré : Mon schéma '+k+' (onglet Schémas)'); emit('blip', 700,0.1,0.06); emit('renderTab');
}
const undoStack = [];
export function pushUndo(u){ undoStack.push(u); if(undoStack.length>20) undoStack.shift(); }
export function sell(n){
  const refund = Math.floor(buyCost(n.type)*0.4);
  pushUndo({node:n, links:G.links.filter(l=>l.a===n.id||l.b===n.id), refund});
  G.money += refund;
  removeNode(n); emit('clearSel');
}
// Vend un groupe de noeuds (annulable) ; renvoie le remboursement
export function sellNodes(ns){
  const ids = new Set(ns.map(n=>n.id));
  const refund = ns.reduce((s,n)=>s+sellVal(n),0);
  pushUndo({multi:ns.map(n=>({node:n})), links:G.links.filter(l=>ids.has(l.a)||ids.has(l.b)), refund});
  G.money += refund;
  G.links = G.links.filter(l=>!ids.has(l.a) && !ids.has(l.b));
  G.nodes = G.nodes.filter(n=>!ids.has(n.id));
  return refund;
}
export function dropLink(l){ pushUndo({links:[l]}); G.links = G.links.filter(x=>x!==l); }
export function undo(){
  const u = undoStack.pop();
  if(!u){ emit('toast', 'Rien à annuler'); return; }
  if(u.move){ for(const o of u.move){ o.n.x=o.x; o.n.y=o.y; } emit('blip', 500,0.08,0.05,'triangle'); emit('toast', 'Déplacement annulé'); return; }
  if(u.node || u.multi){
    if(G.money<u.refund){ undoStack.push(u); emit('toast', 'Pas assez de crédits pour annuler'); return; }
    G.money -= u.refund;
    if(u.node) G.nodes.push(u.node); else for(const m of u.multi) G.nodes.push(m.node);
  }
  for(const l of u.links){
    if(!nodeById(l.a) || !nodeById(l.b)) continue;
    G.links = G.links.filter(x=>!(x.a===l.a&&x.ao===l.ao) && !(x.b===l.b&&x.bi===l.bi));
    G.links.push({a:l.a,ao:l.ao,b:l.b,bi:l.bi,packets:[]});
  }
  emit('blip', 500,0.08,0.05,'triangle'); emit('toast', 'Action annulée');
}
// Achete des ameliorations, toujours la moins chere du groupe, tant que les credits suffisent ; renvoie leur nombre
export function upgradeCheapest(ns){
  let k=0;
  for(let i=0;i<500;i++){ const n=ns.reduce((a,b)=>!a||upCost(b)<upCost(a)?b:a,null); if(!n||G.money<upCost(n)) break; G.money-=upCost(n); n.level++; k++; }
  return k;
}
export function upgradeNode(n,count){
  let done=0;
  while(done<count){
    const c = upCost(n); if(G.money<c) break;
    G.money -= c; n.level++; done++;
  }
  if(done){ emit('blip', 780,0.1,0.06,'triangle'); emit('showSel'); }
}

// Achats (communs a l'interface et au bot d'equilibrage) : renvoient vrai si l'achat a eu lieu
export function buyGlobal(g){ const c = gUpCost(g); if(G.money>=c && G.glob[g.id]<g.max){ G.money-=c; G.glob[g.id]++; return true; } return false; }
export function buyQuantum(d){ const c = puCost(d); if(G.qp>=c && G.pu[d.id]<d.max){ G.qp-=c; G.pu[d.id]++; return true; } return false; }
export function buyTech(d){ const c = techCost(d); if(G.rp>=c && G.tech[d.id]<d.max){ G.rp-=c; G.tech[d.id]++; return true; } return false; }
// Achete un noeud et le pose en (x, y) ; renvoie le noeud, ou null (verrouille ou credits insuffisants)
export function buyNode(type, x, y){ if(!unlocked(type)) return null; const c = buyCost(type); if(G.money<c) return null; G.money -= c; return addNode(type, x, y); }
// Specialisation : gratuite la premiere fois, puis 4 fois le prix d'une amelioration
export const specCost = n => n.spec ? upCost(n)*4 : 0;
export function chooseSpec(n, k){ if(n.spec===k) return false; const c = specCost(n); if(G.money<c) return false; G.money -= c; n.spec = k; return true; }
