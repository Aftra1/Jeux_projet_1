// Vue : zoom lisse, niveaux de detail, cadrage de toute la partie.
import { H, W, toWorld } from './canvas.js';
import { ZMAX, ZMIN } from '../core/geometry.js';
import { G } from '../core/state.js';
import { NH, NW } from '../data/nodes.js';

export let zoomT = null, zoomVel = 0, lastDraw = performance.now(), zoomShow = 0, lodPrev = 0, lodFlash = 0;
export const sstep = (a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
export function zoomAt(sx,sy,k){ zoomT = {k:Math.max(ZMIN,Math.min(ZMAX,k)), sx, sy}; zoomShow = 1.6; }
export function stepZoom(dt){
  const v = G.view, k0 = v.k;
  if(zoomT){
    const w = toWorld(zoomT.sx,zoomT.sy), e = Math.log(zoomT.k/v.k);
    if(Math.abs(e) < 0.002) v.k = zoomT.k; else v.k *= Math.exp(e*(1-Math.exp(-dt*11)));
    v.x = zoomT.sx - W/2 - w.x*v.k; v.y = zoomT.sy - H/2 - w.y*v.k;
    if(v.k === zoomT.k) zoomT = null;
  }
  const inst = dt>0 ? Math.log(v.k/k0)/dt : 0;
  zoomVel += (inst - zoomVel)*Math.min(1,dt*10);
  if(Math.abs(zoomVel) < 0.02) zoomVel = 0;
  zoomShow = Math.max(0, zoomShow - dt);
}
export function fitView(){
  if(!G.nodes.length) return;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const n of G.nodes){ x0=Math.min(x0,n.x); y0=Math.min(y0,n.y); x1=Math.max(x1,n.x+NW); y1=Math.max(y1,n.y+NH); }
  const mm = W<=700 ? 30 : 120, k = Math.max(ZMIN,Math.min(1.5, Math.min((W-mm)/(x1-x0), (H-300)/(y1-y0)))); zoomT = null;
  G.view.k = k; G.view.x = -((x0+x1)/2)*k; G.view.y = -((y0+y1)/2)*k - 20;
}
export function setZoomT(v){ return zoomT = v; }
export function setZoomShow(v){ return zoomShow = v; }
export function setLastDraw(v){ return lastDraw = v; }
export function setLodPrev(v){ return lodPrev = v; }
export function setLodFlash(v){ return lodFlash = v; }
