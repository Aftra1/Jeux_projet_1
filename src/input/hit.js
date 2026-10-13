// Tests de toucher : noeud, port ou lien sous un point.
import { touchMode } from '../ui/state.js';
import { G } from '../core/state.js';
import { bez, inPort, linkPts, outPort } from '../core/geometry.js';
import { DEFS, NH, NW } from '../data/nodes.js';
import { upCost } from '../core/economy.js';

export function findPort(w){
  const r = 14*hitR()/G.view.k;
  for(const n of G.nodes){
    const d = DEFS[n.type];
    for(let i=0;i<d.outs;i++){ const p=outPort(n,i); if(Math.hypot(p.x-w.x,p.y-w.y)<r) return {in:false,n:n.id,i}; }
    for(let i=0;i<d.ins;i++){ const p=inPort(n,i);  if(Math.hypot(p.x-w.x,p.y-w.y)<r) return {in:true, n:n.id,i}; }
  }
  return null;
}
export function findNode(w){
  for(let i=G.nodes.length-1;i>=0;i--){ const n=G.nodes[i]; if(w.x>=n.x && w.x<=n.x+NW && w.y>=n.y && w.y<=n.y+NH) return n; }
  return null;
}
export function findLink(w){
  const r = 10*hitR()/G.view.k;
  for(const l of G.links){ const p=linkPts(l); for(let t=0;t<=1;t+=0.04){ const q=bez(p,t); if(Math.hypot(q.x-w.x,q.y-w.y)<r) return l; } }
  return null;
}
const hitR = () => touchMode ? 1.7 : 1;    // zones de toucher agrandies au doigt
export const v_badge = (n,w) => G.view.k>=0.52 && G.money>=upCost(n) && Math.hypot(w.x-(n.x+NW-2), w.y-(n.y+2))<=14*hitR();
