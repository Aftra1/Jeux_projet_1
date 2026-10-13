// Dessin de la partie : liens, paquets, noeuds (vue detaillee et lointaine), effets de zoom, ports.
import { DPR, H, W, cx } from './canvas.js';
import { lastDraw, lodFlash, lodPrev, setLastDraw, setLodFlash, setLodPrev, sstep, stepZoom, zoomShow, zoomVel } from './view.js';
import { drawIcon } from './icons.js';
import { floats, parts } from './effects.js';
import { drawMini } from './minimap.js';
import { drag, hoverPort, msel, sel } from '../ui/state.js';
import { layoutUI, zoomLX, zoomLY } from '../ui/hud.js';
import { bez, ctrl, inPort, linkPts, ortho, outPort } from '../core/geometry.js';
import { G, nodeById } from '../core/state.js';
import { bufCap, tierOf, timeOf, upCost } from '../core/economy.js';
import { COLORS, DEFS, NH, NW, TIERS } from '../data/nodes.js';

function polyPath(p){ const q=ortho(p); cx.beginPath(); cx.moveTo(q[0].x,q[0].y); for(let i=1;i<q.length;i++) cx.lineTo(q[i].x,q[i].y); }
const fitTxt = (t,maxW)=>{ if(cx.measureText(t).width<=maxW) return t; while(t.length>2 && cx.measureText(t+'…').width>maxW) t=t.slice(0,-1); return t+'…'; };
const rrect = (x,y,w,h,r)=>{ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); };
function packetColor(v){
  return v<10?'#4fd1c5': v<100?'#63b3ed': v<1e3?'#f6c453': v<1e4?'#f6ad55': v<1e5?'#f687b3': v<1e6?'#b794f4':'#ffffff';
}
export function draw(){
  layoutUI();
  const now = performance.now(), dt = Math.min(0.1,(now-lastDraw)/1000); setLastDraw(now);
  stepZoom(dt);
  const v = G.view, tm = now/1000;
  // niveau de détail : 0 = vue lointaine, 1 = vue détaillée
  const det = sstep(0.28,0.52,v.k), far = 1-det;
  const lod = v.k<0.28 ? 0 : v.k<0.52 ? 1 : 2;
  if(lod!==lodPrev){ setLodFlash(1); setLodPrev(lod); }
  setLodFlash(Math.max(0, lodFlash - dt*2.2));
  cx.setTransform(DPR,0,0,DPR,0,0);
  cx.clearRect(0,0,W,H);
  cx.fillStyle = '#212a3e'; cx.fillRect(0,0,W,H);

  cx.save();
  cx.translate(W/2+v.x, H/2+v.y); cx.scale(v.k,v.k);
  // zone visible en coordonnees monde (marge pour les ombres, ports, bulles et traits)
  const vm = 40/v.k + 24, vx0 = (-W/2-v.x)/v.k - vm, vx1 = (W/2-v.x)/v.k + vm, vy0 = (-H/2-v.y)/v.k - vm, vy1 = (H/2-v.y)/v.k + vm;

  const inSet = new Set(), outSet = new Set();   // ports relies (une passe sur les liens au lieu d'une recherche par port)
  for(const l of G.links){ inSet.add(l.b*64+l.bi); outSet.add(l.a*64+l.ao); }
  for(const l of G.links){
    const na = nodeById(l.a), nb = nodeById(l.b);
    // un lien est hors ecran si la boite de ses deux extremites (elargie des detours possibles) l'est
    if(Math.max(na.x,nb.x)+NW+20 < vx0 || Math.min(na.x,nb.x) > vx1 || Math.max(na.y,nb.y)+NH*1.9 < vy0 || Math.min(na.y,nb.y) > vy1) continue;
    const p = linkPts(l);
    const ca = COLORS[na.type], cb = COLORS[nb.type];
    const ml = Math.max(1, 1.6/v.k);
    cx.lineCap = 'butt'; cx.lineJoin = 'round';
    cx.lineWidth = Math.max(2, ml); cx.strokeStyle = ca+'cc'; polyPath(p); cx.stroke();
    for(const k of l.packets){
      const q = bez(p,k.t), c = packetColor(k.v), r = Math.max(4, 2/v.k);
      cx.fillStyle = c; cx.fillRect(q.x-r,q.y-r,r*2,r*2);
    }
  }
  if(drag && drag.kind==='link'){
    const a = outPort(nodeById(drag.n), drag.o), p = ctrl(a,drag.pos);
    cx.strokeStyle='#4fd1c5'; cx.setLineDash([6,4]); cx.lineWidth=3;
    polyPath(p); cx.stroke(); cx.setLineDash([]);
  }

  for(const n of G.nodes){
    if(n.x+NW < vx0 || n.x > vx1 || n.y+NH < vy0 || n.y > vy1) continue;   // hors ecran
    const d = DEFS[n.type], col = COLORS[n.type];
    const busy = !!n.work || (d.val && n.timer>0);
    if(far>0.02) drawNodeFar(n,d,col,busy,far,tm);
    if(det<0.02) continue;
    cx.globalAlpha = det;
    cx.fillStyle = 'rgba(4,7,14,0.38)'; rrect(n.x,n.y+4,NW,NH,6); cx.fill();
    cx.fillStyle = '#141a2a'; rrect(n.x,n.y,NW,NH,5); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.045)'; cx.fillRect(n.x+5,n.y+1,NW-10,1);
    cx.fillStyle = col; cx.fillRect(n.x,n.y+6,3,NH-12);
    const lift = drag && drag.kind==='node' && drag.n===n.id; cx.strokeStyle = (sel===n.id||lift) ? '#fff' : (busy ? col+'cc' : '#3a4560'); cx.lineWidth = (sel===n.id||lift)?2:1; rrect(n.x,n.y,NW,NH,5); cx.stroke();
    if(msel.has(n.id)){
      cx.fillStyle = '#f6c45322'; rrect(n.x,n.y,NW,NH,5); cx.fill();
      cx.strokeStyle = '#f6c453'; cx.lineWidth = 2; cx.setLineDash([8,6]); rrect(n.x-4,n.y-4,NW+8,NH+8,7); cx.stroke(); cx.setLineDash([]);
    }
    // progression
    let pr = 0;
    if(n.work) pr = 1 - n.work.rem/timeOf(n); else if(d.val) pr = n.timer/timeOf(n);
    cx.fillStyle = '#00000055'; rrect(n.x+10,n.y+NH-12,NW-20,4,2); cx.fill();
    const pw = Math.max(5,(NW-20)*Math.max(0,Math.min(1,pr)));
    if(pr>0){
      cx.fillStyle = col; rrect(n.x+10,n.y+NH-12,pw,4,2); cx.fill();
    }
    cx.textAlign='left'; cx.textBaseline='middle';
        drawIcon(cx,n.type,n.x+24,n.y+24,10.5,col);
    cx.font='600 13px system-ui'; cx.fillStyle='#e6ecf8'; cx.fillText(fitTxt(d.name,NW-48), n.x+42, n.y+18);
    cx.font='11px system-ui'; cx.fillStyle='#8794b3';
    const buf = n.inb.reduce((s,q)=>s+q.length,0);
    cx.fillStyle = TIERS[tierOf(n.level)][1]; cx.fillText(fitTxt('Niv. '+(n.level+1)+(n.spec?' · '+({spd:'Turbo',val:'Rend.',eco:'Éco'})[n.spec]:'')+(d.ins?' · '+buf+'/'+bufCap():' · '+(1/timeOf(n)).toFixed(2)+'/s'), NW-48), n.x+42, n.y+35);
    { const tr = tierOf(n.level), lv10 = n.level%10; cx.fillStyle = '#2a3550'; for(let i=0;i<10;i++) cx.fillRect(n.x+NW-8-(10-i)*7,n.y+NH-21,5,2); cx.fillStyle = TIERS[tr][1]; for(let i=0;i<lv10;i++) cx.fillRect(n.x+NW-8-(10-i)*7,n.y+NH-21,5,2); }
    if(G.money>=upCost(n)){
      const bx = n.x+NW-2, by = n.y+2, pu = 1+0.08*Math.sin(tm*4+n.id);
      cx.fillStyle = '#68d391';
      cx.beginPath(); cx.arc(bx,by,10*pu,0,Math.PI*2); cx.fill();
      cx.strokeStyle = '#0a0e16'; cx.lineWidth = 2.2; cx.beginPath(); cx.moveTo(bx-4,by); cx.lineTo(bx+4,by); cx.moveTo(bx,by-4); cx.lineTo(bx,by+4); cx.stroke();
    }
    for(let i=0;i<d.ins;i++) port(inPort(n,i), hoverPort&&hoverPort.in&&hoverPort.n===n.id&&hoverPort.i===i, false, col, inSet.has(n.id*64+i));
    for(let i=0;i<d.outs;i++) port(outPort(n,i), hoverPort&&!hoverPort.in&&hoverPort.n===n.id&&hoverPort.i===i, true, col, outSet.has(n.id*64+i));
    cx.globalAlpha = 1;
  }
  if(drag && drag.kind==='box'){
    const bx=Math.min(drag.a.x,drag.b.x), by=Math.min(drag.a.y,drag.b.y), bw=Math.abs(drag.a.x-drag.b.x), bh=Math.abs(drag.a.y-drag.b.y);
    cx.fillStyle='#f6c4531a'; cx.fillRect(bx,by,bw,bh); cx.strokeStyle='#f6c453'; cx.lineWidth=Math.max(1.5,1.5/v.k); cx.strokeRect(bx,by,bw,bh);
  }
  for(const f of floats){
    cx.globalAlpha = Math.max(0,f.life); cx.fillStyle=f.col; cx.font=`700 ${f.size}px system-ui`; cx.textAlign='center';
    cx.fillText(f.text, f.x, f.y - (1-f.life)*40);
  }
  for(const q of parts){ cx.globalAlpha=Math.max(0,q.life); cx.fillStyle=q.col; cx.beginPath(); cx.arc(q.x,q.y,2.5,0,Math.PI*2); cx.fill(); }
  cx.globalAlpha = 1;
  cx.restore();
  cx.setTransform(DPR,0,0,DPR,0,0);
  drawZoomFx(det);
  drawMini();
}
// Vue lointaine : blocs colorés lumineux, icône à taille d'écran constante
function drawNodeFar(n,d,col,busy,a,tm){
  const k = G.view.k, cxn = n.x+NW/2, cyn = n.y+NH/2;
  cx.globalAlpha = a;
  const R = Math.max(NW*0.62, 20/k);
  const bw = Math.max(NW, 26/k), bh = Math.max(NH, 18/k);
  cx.fillStyle = '#141a2a'; cx.globalAlpha = a;
  rrect(cxn-bw/2,cyn-bh/2,bw,bh,Math.min(12,bh*0.3)); cx.fill();
  cx.globalAlpha = a; cx.strokeStyle = sel===n.id ? '#fff' : col; cx.lineWidth = Math.max(2,1.5/k);
  rrect(cxn-bw/2,cyn-bh/2,bw,bh,Math.min(12,bh*0.3)); cx.stroke();
  if(k>0.09){
    drawIcon(cx,n.type,cxn,cyn,Math.min(bw,bh)*0.36,col);
  }
  cx.globalAlpha = 1;
}
// Effets de zoom : stries radiales, vignette de vitesse, anneau de changement de niveau, indicateur
function drawZoomFx(det){
  cx.setTransform(DPR,0,0,DPR,0,0);
  const sp = Math.min(1, Math.abs(zoomVel)/3.2), mxr = Math.hypot(W,H)/2;
  if(sp>0.03){
    const out = zoomVel<0;   // dézoom : les stries convergent vers le centre
    cx.strokeStyle = 'rgba(160,230,255,'+(0.5*sp)+')'; cx.lineWidth = 1.5; cx.beginPath();
    const t = performance.now()/1000;
    for(let i=0;i<46;i++){
      const ang = i*2.399+Math.floor(i/7)*0.3, ph = (i*0.37+t*(out?-1:1)*2.2)%1, f = ph<0?ph+1:ph;
      const r0 = mxr*(0.25+0.65*f), r1 = r0 + mxr*0.18*sp;
      cx.moveTo(W/2+Math.cos(ang)*r0, H/2+Math.sin(ang)*r0);
      cx.lineTo(W/2+Math.cos(ang)*r1, H/2+Math.sin(ang)*r1);
    }
    cx.stroke();
  }
  if(lodFlash>0){
    const r = mxr*(1-lodFlash)*1.1;
    cx.strokeStyle = 'rgba(255,255,255,'+(0.35*lodFlash)+')'; cx.lineWidth = 3+10*lodFlash;
    cx.beginPath(); cx.arc(W/2,H/2,r,0,Math.PI*2); cx.stroke();
  }
  if(zoomShow>0){
    const a = Math.min(1,zoomShow), lab = G.view.k<0.28?'Vue globale':G.view.k<0.52?'Vue réseau':'Vue détaillée';
    cx.globalAlpha = a; cx.textAlign='center'; cx.textBaseline='middle';
    cx.fillStyle='#0a0e16cc'; rrect(zoomLX-90,zoomLY,180,34,10); cx.fill();
    cx.fillStyle='#e6ecf8'; cx.font='700 13px system-ui'; cx.fillText(Math.round(G.view.k*100)+' %  -  '+lab, zoomLX, zoomLY+17);
    cx.globalAlpha = 1; cx.textAlign='left';
  }
}
function port(p,hot,out,col,linked){
  const r = hot?8:5.5;
  cx.beginPath(); cx.arc(p.x,p.y,r,0,Math.PI*2);
  cx.fillStyle = (out||linked) ? col : '#141a2a'; cx.fill();
  cx.strokeStyle = hot ? '#fff' : (out||linked ? '#0a0e16' : col+'bb'); cx.lineWidth=2; cx.stroke();
}
