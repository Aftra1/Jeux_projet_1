// Mini-carte : dessin et navigation par clic.
import { $ } from '../ui/dom.js';
import { H, W, toWorld } from './canvas.js';
import { G } from '../core/state.js';
import { COLORS, NH, NW } from '../data/nodes.js';

const mini = $('mini'), mx = mini.getContext('2d');
let miniB = null;
export function drawMini(){
  if(getComputedStyle(mini).display==='none') return;
  const w=mini.width, h=mini.height;
  mx.clearRect(0,0,w,h); mx.fillStyle='#0a0e16cc'; mx.fillRect(0,0,w,h);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const n of G.nodes){ x0=Math.min(x0,n.x); y0=Math.min(y0,n.y); x1=Math.max(x1,n.x+NW); y1=Math.max(y1,n.y+NH); }
  const tl=toWorld(0,0), br=toWorld(W,H);
  x0=Math.min(x0,tl.x); y0=Math.min(y0,tl.y); x1=Math.max(x1,br.x); y1=Math.max(y1,br.y);
  const k=Math.min((w-8)/(x1-x0),(h-8)/(y1-y0)), ox=(w-(x1-x0)*k)/2, oy=(h-(y1-y0)*k)/2;
  miniB = {x0,y0,k,ox,oy};
  for(const n of G.nodes){ mx.fillStyle=COLORS[n.type]; mx.fillRect(ox+(n.x-x0)*k, oy+(n.y-y0)*k, Math.max(3,NW*k), Math.max(2,NH*k)); }
  mx.strokeStyle='#ffffff99'; mx.lineWidth=1; mx.strokeRect(ox+(tl.x-x0)*k, oy+(tl.y-y0)*k, (br.x-tl.x)*k, (br.y-tl.y)*k);
}
mini.addEventListener('pointerdown', e=>{
  if(!miniB) return;
  const r = mini.getBoundingClientRect(), b = miniB;
  const wx = b.x0 + ((e.clientX-r.left)*(mini.width/r.width) - b.ox)/b.k;
  const wy = b.y0 + ((e.clientY-r.top)*(mini.height/r.height) - b.oy)/b.k;
  G.view.x = -wx*G.view.k; G.view.y = -wy*G.view.k;
});
