// Geometrie du monde : limites de zoom, ports, trace orthogonal des liens, recherche d'un emplacement libre.
import { G, nodeById } from './state.js';
import { DEFS, NH, NW } from '../data/nodes.js';

// Géométrie 
export const inPort  = (n,i) => ({x:n.x,    y:n.y + NH*(i+1)/(DEFS[n.type].ins+1)});
export const outPort = (n,i) => ({x:n.x+NW, y:n.y + NH*(i+1)/(DEFS[n.type].outs+1)});
export function ctrl(a,b){ const d=Math.max(60,Math.abs(b.x-a.x)/2); return [a,{x:a.x+d,y:a.y},{x:b.x-d,y:b.y},b]; }
export function ortho(p){
  const a=p[0], b=p[3];
  if(b.x >= a.x+28){ const m=Math.round((a.x+b.x)/2); return [a,{x:m,y:a.y},{x:m,y:b.y},b]; }
  const ym = Math.abs(a.y-b.y)<NH ? Math.max(a.y,b.y)+NH*0.8 : (a.y+b.y)/2;
  return [a,{x:a.x+14,y:a.y},{x:a.x+14,y:ym},{x:b.x-14,y:ym},{x:b.x-14,y:b.y},b];
}
export function bez(p,t){
  const q=ortho(p); let L=0; const ls=[];
  for(let i=1;i<q.length;i++){ const d=Math.hypot(q[i].x-q[i-1].x,q[i].y-q[i-1].y); ls.push(d); L+=d; }
  let r=Math.max(0,Math.min(1,t))*L;
  for(let i=0;i<ls.length;i++){ if(r<=ls[i]||i===ls.length-1){ const f=ls[i]?Math.min(1,r/ls[i]):0; return {x:q[i].x+(q[i+1].x-q[i].x)*f, y:q[i].y+(q[i+1].y-q[i].y)*f}; } r-=ls[i]; }
}
export const linkPts = l => ctrl(outPort(nodeById(l.a),l.ao), inPort(nodeById(l.b),l.bi));   // selection multiple (vente en masse)
// Zoom : cible lissée, vitesse de zoom pour les effets, niveaux de détail
export const ZMIN = 0.05, ZMAX = 3;
export function freeSpot(x,y,skip){
  const gap = 24;
  const ok = (px,py)=>!G.nodes.some(m=>!(skip&&skip.has(m)) && px<m.x+NW+gap && px+NW+gap>m.x && py<m.y+NH+gap && py+NH+gap>m.y);
  x = Math.round(x/10)*10; y = Math.round(y/10)*10;
  if(ok(x,y)) return {x,y};
  for(let r=1;r<40;r++){
    for(let i=0;i<r*8;i++){
      const a = i/(r*8)*Math.PI*2, px = Math.round((x+Math.cos(a)*r*(NW+gap)*0.6)/10)*10, py = Math.round((y+Math.sin(a)*r*(NH+gap)*0.9)/10)*10;
      if(ok(px,py)) return {x:px,y:py};
    }
  }
  return {x,y};
}
