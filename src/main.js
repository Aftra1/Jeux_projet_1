'use strict';
import { on } from './core/bus.js';
import { G, addNode, connect, newGame, nodeById, setG } from './core/state.js';
import { esc, fmt } from './core/format.js';
import { FREEQ, MASTTH, achCount, bpCost, bpIsLab, bpLocked, bpUnlocked, bufCap, bulkCost, buyCost, gUpCost, infl, maxAffordable, puCost, qpGain, qpMult, qpNeed, rankOf, revMult, seedV, sellVal, specsFor, speedOf, techCost, tierOf, timeOf, unlocked, upCost } from './core/economy.js';
import { ZMAX, ZMIN, bez, ctrl, freeSpot, inPort, linkPts, ortho, outPort } from './core/geometry.js';
import { resetIncome, step, updateRate } from './core/sim.js';
import { evTick } from './core/events.js';
import { contractTick } from './core/contracts.js';
import { ACH, OBJ, checkAch, checkObj, objReward } from './core/progression.js';
import { doReboot, ocActive, useOverclock } from './core/prestige.js';
import { blueprintOf, dropLink, placeBlueprint, pushUndo, saveBlueprint, sell, sellNodes, undo, upgradeCheapest, upgradeNode } from './core/actions.js';
import { KEY, KEY_BAD, KEY_BAK, backupNow, isNum, load, lsDel, lsGet, parseSave, readSave, save, serializeText } from './core/save.js';
import { COLORS, DEFS, NH, NW, ORDER, SPECS, TIERS } from './data/nodes.js';
import { GLOBALS, PU, TECH } from './data/upgrades.js';
import { BPS } from './data/blueprints.js';
import { EVT } from './data/events.js';
function polyPath(p){ const q=ortho(p); cx.beginPath(); cx.moveTo(q[0].x,q[0].y); for(let i=1;i<q.length;i++) cx.lineTo(q[i].x,q[i].y); }

// Effets (sons, textes) 
let AC = null, lastBlip = 0;
function audio(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
let lastVib = 0, touchMode = false;
function blip(freq, dur=0.08, vol=0.05, type='sine'){
  if(touchMode && navigator.vibrate && Date.now()-lastVib>90){ lastVib = Date.now(); try{ navigator.vibrate(8); }catch(e){} }
  if(G.mute) return; const a = audio(); if(!a) return;
  try{
    const o=a.createOscillator(), g=a.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime+dur);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+dur);
  }catch(e){}
}
const PENTA = [0,2,4,7,9];
function upSound(big){
  const now = performance.now(); if(now-lastBlip<70) return; lastBlip = now;
  const k = PENTA[Math.floor(Math.random()*5)] + (big?12:0);
  blip(440*Math.pow(2,k/12), 0.1, big?0.07:0.035);
}
const floats = [], parts = [];
function floatText(x,y,text,col='#f6c453',size=15){ if(floats.length<60) floats.push({x,y,text,col,size,life:1}); }

// Prestige 
function reboot(){
  const g = qpGain(); if(g<1) return;
  ask(`Reboot quantique ? Tu gagnes ${g} point(s) quantique(s) (revenus x${qpMult(G.qpTotal+g).toFixed(2)} au lieu de x${qpMult(G.qpTotal).toFixed(2)}). Tes nœuds, crédits et améliorations de run sont remis à zéro.`, doReboot);
}

// Rendu 
const cv = document.getElementById('c'), cx = cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){ W=innerWidth; DPR=Math.min(window.devicePixelRatio||1, W<=700?2:3); H=innerHeight; cv.width=W*DPR; cv.height=H*DPR; }
addEventListener('resize',resize); resize();
const toWorld = (sx,sy)=>({x:(sx-W/2-G.view.x)/G.view.k, y:(sy-H/2-G.view.y)/G.view.k});
const fitTxt = (t,maxW)=>{ if(cx.measureText(t).width<=maxW) return t; while(t.length>2 && cx.measureText(t+'…').width>maxW) t=t.slice(0,-1); return t+'…'; };
const rrect = (x,y,w,h,r)=>{ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); };
function packetColor(v){
  return v<10?'#4fd1c5': v<100?'#63b3ed': v<1e3?'#f6c453': v<1e4?'#f6ad55': v<1e5?'#f687b3': v<1e6?'#b794f4':'#ffffff';
}

let sel = null, drag = null, hoverPort = null;
const msel = new Set(); let selMode = false;
let zoomT = null, zoomVel = 0, lastDraw = performance.now(), zoomShow = 0, lodPrev = 0, lodFlash = 0;
const sstep = (a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
function zoomAt(sx,sy,k){ zoomT = {k:Math.max(ZMIN,Math.min(ZMAX,k)), sx, sy}; zoomShow = 1.6; }
function stepZoom(dt){
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
// Icones vectorielles (dessinees dans un carre de -10 a 10)
const ICONS = {
  source:  c=>{ c.beginPath(); for(let i=0;i<6;i++){ const a=i*Math.PI/3-Math.PI/6; c.lineTo(Math.cos(a)*9,Math.sin(a)*9); } c.closePath(); c.stroke(); c.beginPath(); c.arc(0,0,3,0,7); c.fill(); },
  upload:  c=>{ c.beginPath(); c.moveTo(-8,5); c.bezierCurveTo(-11,5,-11,-1,-6,-1); c.bezierCurveTo(-6,-7,3,-8,4,-2); c.bezierCurveTo(10,-3,11,5,6,5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(0,8); c.lineTo(0,0); c.moveTo(-3,3); c.lineTo(0,0); c.lineTo(3,3); c.stroke(); },
  compress:c=>{ c.beginPath(); c.moveTo(-9,-4); c.lineTo(-3,0); c.lineTo(-9,4); c.moveTo(9,-4); c.lineTo(3,0); c.lineTo(9,4); c.moveTo(0,-8); c.lineTo(0,8); c.stroke(); },
  split:   c=>{ c.beginPath(); c.moveTo(-9,0); c.lineTo(-2,0); c.bezierCurveTo(2,0,2,-6,6,-6); c.lineTo(9,-6); c.moveTo(-2,0); c.bezierCurveTo(2,0,2,6,6,6); c.lineTo(9,6); c.stroke(); c.beginPath(); c.arc(9,-6,1.6,0,7); c.arc(9,6,1.6,0,7); c.fill(); },
  merge:   c=>{ c.beginPath(); c.moveTo(-9,-6); c.lineTo(-6,-6); c.bezierCurveTo(-2,-6,-2,0,2,0); c.lineTo(9,0); c.moveTo(-9,6); c.lineTo(-6,6); c.bezierCurveTo(-2,6,-2,0,2,0); c.stroke(); c.beginPath(); c.arc(-9,-6,1.6,0,7); c.arc(-9,6,1.6,0,7); c.fill(); },
  encrypt: c=>{ c.beginPath(); c.rect(-6,-1,12,9); c.stroke(); c.beginPath(); c.moveTo(-3.5,-1); c.lineTo(-3.5,-4); c.arc(0,-4,3.5,Math.PI,0); c.lineTo(3.5,-1); c.stroke(); c.beginPath(); c.arc(0,3.5,1.5,0,7); c.fill(); },
  boost:   c=>{ c.beginPath(); c.moveTo(3,-10); c.lineTo(-6,2); c.lineTo(-0.5,2); c.lineTo(-3,10); c.lineTo(6,-2); c.lineTo(0.5,-2); c.closePath(); c.fill(); },
  clone:   c=>{ c.beginPath(); c.rect(-9,-9,11,11); c.stroke(); c.beginPath(); c.rect(-2,-2,11,11); c.stroke(); },
  sorter:  c=>{ c.beginPath(); c.moveTo(-9,-8); c.lineTo(9,-8); c.lineTo(2,0); c.lineTo(2,8); c.lineTo(-2,6); c.lineTo(-2,0); c.closePath(); c.stroke(); },
  ai:      c=>{ c.beginPath(); c.rect(-5,-5,10,10); c.stroke(); for(const p of [-3,3]){ c.beginPath(); c.moveTo(p,-5); c.lineTo(p,-9); c.moveTo(p,5); c.lineTo(p,9); c.moveTo(-5,p); c.lineTo(-9,p); c.moveTo(5,p); c.lineTo(9,p); c.stroke(); } c.beginPath(); c.arc(0,0,2,0,7); c.fill(); },
  lab:     c=>{ c.beginPath(); c.moveTo(-3,-9); c.lineTo(3,-9); c.moveTo(-2,-9); c.lineTo(-2,-2); c.lineTo(-8,8); c.lineTo(8,8); c.lineTo(2,-2); c.lineTo(2,-9); c.stroke(); c.beginPath(); c.moveTo(-5,3); c.lineTo(5,3); c.stroke(); },
  mega:    c=>{ c.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, r=i%2?4:10; c.lineTo(Math.cos(a)*r,Math.sin(a)*r); } c.closePath(); c.fill(); },
  quantum: c=>{ for(let i=0;i<3;i++){ c.save(); c.rotate(i*Math.PI/3); c.beginPath(); c.ellipse(0,0,10,3.8,0,0,7); c.stroke(); c.restore(); } c.beginPath(); c.arc(0,0,2,0,7); c.fill(); },
  sing:    c=>{ c.beginPath(); for(let i=0;i<40;i++){ const a=i*0.5, r=0.5+i*0.23; c.lineTo(Math.cos(a)*r,Math.sin(a)*r); } c.stroke(); },
  neural:  c=>{ const P=[[-8,-6],[-8,0],[-8,6],[0,-4],[0,4],[8,0]]; c.beginPath(); for(const a of P.slice(0,3)) for(const b of P.slice(3,5)){ c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); } for(const b of P.slice(3,5)){ c.moveTo(b[0],b[1]); c.lineTo(8,0); } c.stroke(); c.beginPath(); for(const p of P){ c.moveTo(p[0]+2,p[1]); c.arc(p[0],p[1],2,0,7); } c.fill(); },
  dim:     c=>{ c.beginPath(); c.moveTo(0,-9); c.lineTo(8,-4.5); c.lineTo(8,4.5); c.lineTo(0,9); c.lineTo(-8,4.5); c.lineTo(-8,-4.5); c.closePath(); c.moveTo(-8,-4.5); c.lineTo(0,0); c.lineTo(8,-4.5); c.moveTo(0,0); c.lineTo(0,9); c.stroke(); },
  omega:   c=>{ c.beginPath(); c.moveTo(-9,8); c.lineTo(-4,8); c.bezierCurveTo(-8,4,-8,-9,0,-9); c.bezierCurveTo(8,-9,8,4,4,8); c.lineTo(9,8); c.stroke(); }
};
function drawIcon(c, type, x, y, s, col){
  const f = ICONS[type]; if(!f) return;
  c.save(); c.translate(x,y); c.scale(s/10,s/10);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.7*(10/s>1.4?1.4:1); c.lineCap = 'round'; c.lineJoin = 'round';
  f(c); c.restore();
}
const iconURL = {};
function iconImg(type, col){
  if(iconURL[type]) return iconURL[type];
  const o = document.createElement('canvas'); o.width = o.height = 48; const c = o.getContext('2d');
  drawIcon(c, type, 24, 24, 20, col); return iconURL[type] = o.toDataURL();
}

// Mise en page : les elements d'interface ne se superposent jamais
let lastPanel = '', zoomLX = 0, zoomLY = 0;
const lay = {};
function setSt(el, k, v){ const key = el.id+k; if(lay[key]!==v){ lay[key]=v; el.style[k]=v; } }
const shown = el => el.style.display!=='none' && getComputedStyle(el).display!=='none';
function layoutUI(){
  const mob = W<=700, top = $('top'), side = $('side'), selB = $('sel'), shop = $('shop');
  const pt = Math.round(top.getBoundingClientRect().bottom) + 2;
  const shopTop = Math.round(shop.getBoundingClientRect().top) + 26;
  let sideOn = shown(side), selOn = shown(selB);
  if(mob && sideOn && selOn){
    if(lastPanel==='side'){ selB.style.display = 'none'; selOn = false; }
    else { tab = null; side.style.display = 'none'; sideOn = false; }
  }
  const room = mob ? 60 : 10;          // sur mobile, une ligne libre au-dessus de la boutique pour les messages
  const maxH = Math.max(120, shopTop - pt - room);
  setSt(side,'top',pt+'px'); setSt(side,'maxHeight',maxH+'px');
  if(sideOn) setSt($('tabBody'),'maxHeight',Math.max(80, maxH-$('tabs').offsetHeight-($('subs').offsetHeight||0)-34)+'px');
  if(mob){ setSt(selB,'top','auto'); setSt(selB,'bottom',(H-shopTop+room-2)+'px'); setSt(selB,'maxHeight',Math.max(120,Math.round(H*0.42))+'px'); }
  else { setSt(selB,'top',pt+'px'); setSt(selB,'bottom','auto'); setSt(selB,'maxHeight',maxH+'px'); }
  setSt(selB,'overflowY','auto');
  const tl = $('tools'), toolsOn = mob && !sideOn && !selOn;
  setSt(tl,'visibility',toolsOn?'visible':'hidden'); setSt(tl,'top',(pt+8)+'px');
  const L = (!mob && sideOn) ? side.offsetWidth+20 : 10, R = (!mob && selOn) ? W-selB.offsetWidth-20 : (toolsOn ? W-62 : W-10);
  const cxm = Math.round((L+R)/2), fw = R-L;
  const hideInfo = fw<250 || (mob && sideOn);
  let y = pt+4;
  for(const id of ['obj','hint']){
    const el = $(id); setSt(el,'left',cxm+'px'); setSt(el,'width',Math.min(id==='obj'?420:560,fw)+'px'); setSt(el,'maxWidth',fw+'px');
    if(shown(el)){ setSt(el,'visibility',hideInfo?'hidden':'visible'); setSt(el,'top',y+'px'); if(!hideInfo) y += el.offsetHeight+8; }
  }
  let base = H-shopTop+8;
  if(mob && selOn) base = H - Math.round(selB.getBoundingClientRect().top) + 8;
  const ctr = $('ctr'); setSt(ctr,'left',cxm+'px'); setSt(ctr,'width',Math.min(340,fw)+'px');
  if(shown(ctr)){ setSt(ctr,'visibility',hideInfo?'hidden':'visible'); setSt(ctr,'bottom',base+'px'); if(!hideInfo) base += ctr.offsetHeight+8; }
  const tt = $('toast'); setSt(tt,'left',cxm+'px'); setSt(tt,'maxWidth',Math.max(200,fw)+'px'); setSt(tt,'bottom',base+'px');
  base += tt.offsetHeight+8;
  zoomLX = cxm; zoomLY = H-base-34;
}
function draw(){
  layoutUI();
  const now = performance.now(), dt = Math.min(0.1,(now-lastDraw)/1000); lastDraw = now;
  stepZoom(dt);
  const v = G.view, tm = now/1000;
  // niveau de détail : 0 = vue lointaine, 1 = vue détaillée
  const det = sstep(0.28,0.52,v.k), far = 1-det;
  const lod = v.k<0.28 ? 0 : v.k<0.52 ? 1 : 2;
  if(lod!==lodPrev){ lodFlash = 1; lodPrev = lod; }
  lodFlash = Math.max(0, lodFlash - dt*2.2);
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

// Interactions 
function findPort(w){
  const r = 14*hitR()/G.view.k;
  for(const n of G.nodes){
    const d = DEFS[n.type];
    for(let i=0;i<d.outs;i++){ const p=outPort(n,i); if(Math.hypot(p.x-w.x,p.y-w.y)<r) return {in:false,n:n.id,i}; }
    for(let i=0;i<d.ins;i++){ const p=inPort(n,i);  if(Math.hypot(p.x-w.x,p.y-w.y)<r) return {in:true, n:n.id,i}; }
  }
  return null;
}
function findNode(w){
  for(let i=G.nodes.length-1;i>=0;i--){ const n=G.nodes[i]; if(w.x>=n.x && w.x<=n.x+NW && w.y>=n.y && w.y<=n.y+NH) return n; }
  return null;
}
function findLink(w){
  const r = 10*hitR()/G.view.k;
  for(const l of G.links){ const p=linkPts(l); for(let t=0;t<=1;t+=0.04){ const q=bez(p,t); if(Math.hypot(q.x-w.x,q.y-w.y)<r) return l; } }
  return null;
}
function buildBp(b,quiet){
  if(!bpUnlocked(b)) return;
  const made = placeBlueprint(b, toWorld(W/2, H/2-40));
  if(!made) return;
  if(!quiet){ sel = null; showSel(); blip(520,0.1,0.06); toast('Schéma posé : '+b.name); }
  if(tab) renderTab();
}
function selBp(){
  const b = blueprintOf(G.nodes.filter(n=>msel.has(n.id)));
  return {name:'Copie', nodes:b.nodes, links:b.links};
}
function dupSel(){
  if(msel.size<1) return;
  const b = selBp(), c = bpCost(b);
  if(!bpUnlocked(b)){ toast('Pas encore débloqué : '+bpLocked(b)); return; }
  if(G.money<c){ toast('Pas assez de crédits (copie : '+fmt(c)+')'); return; }
  const before = new Set(G.nodes.map(n=>n.id));
  buildBp(b,true);
  const added = G.nodes.filter(n=>!before.has(n.id));
  if(!added.length) return;
  msel.clear(); for(const n of added) msel.add(n.id); showSel(); blip(520,0.1,0.06); toast('Copie posée ('+added.length+' nœuds)');
}
function saveBp(){ saveBlueprint(G.nodes.filter(n=>msel.has(n.id))); }

let lastTap = {t:0,x:0,y:0}, lpTimer = 0;
const hitR = () => touchMode ? 1.7 : 1;    // zones de toucher agrandies au doigt
const v_badge = (n,w) => G.view.k>=0.52 && G.money>=upCost(n) && Math.hypot(w.x-(n.x+NW-2), w.y-(n.y+2))<=14*hitR();
function vib(ms){ if(touchMode && navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} } }
function doubleTap(x,y){
  const w = toWorld(x,y), nd = findNode(w);
  if(nd){ msel.clear(); for(const m of G.nodes) if(m.type===nd.type) msel.add(m.id); sel=null; showSel(); toast(msel.size+' nœud(s) du même type'); vib(20); }
  else { const l = findLink(w); if(l) dropLink(l); else fitView(); }
}
function longPress(x,y){
  const w = toWorld(x,y), nd = findNode(w);
  drag = null; vib(35);
  if(nd){ selMode = true; $('bSel').classList.add('glow'); msel.add(nd.id); sel = null; showSel(); toast('Mode sélection : touche des nœuds pour les ajouter'); return; }
  const l = findLink(w); if(l){ dropLink(l); toast('Liaison supprimée'); }
}
let rcDown = null;
const pointers = new Map(); let pinch = null;
cv.addEventListener('pointerdown', e=>{
  audio(); cv.setPointerCapture(e.pointerId);
  touchMode = e.pointerType==='touch';
  clearTimeout(lpTimer);
  if(touchMode && pointers.size===0){
    const now = performance.now();
    if(now-lastTap.t<320 && Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<28){ lastTap.t = 0; pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); doubleTap(e.clientX,e.clientY); return; }
    lastTap = {t:now,x:e.clientX,y:e.clientY};
    lpTimer = setTimeout(()=>{ if(pointers.size===1 && (!drag || drag.kind==='pan' && Math.hypot(drag.vx-G.view.x,drag.vy-G.view.y)<6) && !findNode(toWorld(e.clientX,e.clientY))) longPress(e.clientX,e.clientY); }, 520);
  }
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    const [a,b]=[...pointers.values()];
    pinch={d:Math.hypot(a.x-b.x,a.y-b.y), k:G.view.k}; zoomT=null; drag=null; return;
  }
  if(e.button===1){
    e.preventDefault(); zoomT=null;
    drag={kind:'pan',sx:e.clientX,sy:e.clientY,vx:G.view.x,vy:G.view.y}; return;
  }
  const w = toWorld(e.clientX,e.clientY);
  const mouse = e.pointerType==='mouse';
  if(mouse && e.button!==0 && e.button!==2) return;
  if(mouse && e.button===0 && !e.shiftKey && !selMode){
    // clic gauche : relier (depuis un port de sortie ou n'importe où sur un nœud) ; sur une entrée reliée : détache
    const pt = findPort(w), n = pt ? null : findNode(w);
    if(pt && !pt.in){ drag={kind:'link',n:pt.n,o:pt.i,pos:w,rc:true}; }
    else if(pt && pt.in){ const l = G.links.find(l=>l.b===pt.n && l.bi===pt.i); if(l){ G.links = G.links.filter(x=>x!==l); drag={kind:'link',n:l.a,o:l.ao,pos:w,rc:true}; } }
    else if(n && v_badge(n,w)){ upgradeNode(n,1); sel = n.id; showSel(); }
    else if(n && DEFS[n.type].outs){ drag={kind:'link',n:n.id,o:0,pos:w,rc:true}; }
    return;
  }
  rcDown = {x:e.clientX,y:e.clientY};
  if(msel.size && !e.shiftKey){
    const gh = findNode(w);
    if(gh && msel.has(gh.id)){
      drag = {kind:'group', a:w, moved:false, tap:selMode?gh.id:null, orig:G.nodes.filter(n=>msel.has(n.id)).map(n=>({n,x:n.x,y:n.y}))};
      return;
    }
  }
  if(e.shiftKey || selMode){
    const hit = findNode(w);
    if(hit){ if(msel.has(hit.id)) msel.delete(hit.id); else msel.add(hit.id); sel=null; showSel(); return; }
    drag = {kind:'box', a:w, b:w, add:e.shiftKey}; return;
  }
  if(msel.size){ msel.clear(); showSel(); }
  const pt = mouse ? null : findPort(w);
  if(pt && !pt.in){ drag={kind:'link',n:pt.n,o:pt.i,pos:w}; return; }
  if(pt && pt.in){
    const l = G.links.find(l=>l.b===pt.n && l.bi===pt.i);
    if(l){ G.links = G.links.filter(x=>x!==l); drag={kind:'link',n:l.a,o:l.ao,pos:w}; return; }
  }
  const n = findNode(w);
  if(n && v_badge(n,w)){ upgradeNode(n,1); sel = n.id; showSel(); return; }
  if(n){
    sel = n.id; G.nodes.splice(G.nodes.indexOf(n),1); G.nodes.push(n);
    drag={kind:'node',n:n.id,dx:w.x-n.x,dy:w.y-n.y,x0:n.x,y0:n.y,moved:false}; showSel();
    if(touchMode){
      // au doigt : glisser deplace la vue ; un appui prolonge souleve la case (menu masque) pour la deplacer
      const d0 = drag; d0.kind = 'nodeWait'; d0.sx = e.clientX; d0.sy = e.clientY; d0.vx = G.view.x; d0.vy = G.view.y;
      lpTimer = setTimeout(()=>{ if(drag===d0 && d0.kind==='nodeWait'){ d0.kind = 'node'; sel = null; showSel(); vib(40); toast('Déplace la case'); } }, 420);
    }
    return;
  }
  sel=null; showSel();
  if(e.pointerType==='mouse'){ drag={kind:'box',a:w,b:w,add:e.shiftKey}; return; }
  drag={kind:'pan',sx:e.clientX,sy:e.clientY,vx:G.view.x,vy:G.view.y};
});
cv.addEventListener('pointermove', e=>{
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch && pointers.size===2){
    const [a,b]=[...pointers.values()], mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    const w = toWorld(mx,my), v=G.view;
    v.k = Math.max(ZMIN, Math.min(ZMAX, pinch.k*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d)); zoomShow = 1.2;
    v.x = mx - W/2 - w.x*v.k; v.y = my - H/2 - w.y*v.k; return;
  }
  const w = toWorld(e.clientX,e.clientY);
  hoverPort = findPort(w);
  if(!drag && e.pointerType==='mouse'){ const hn = hoverPort ? null : findNode(w); const c = hoverPort ? 'crosshair' : hn ? (v_badge(hn,w)?'pointer':'grab') : 'default'; if(cv.style.cursor!==c) cv.style.cursor = c; }
  if(drag && e.pointerType==='mouse' && drag.kind==='node'){ if(cv.style.cursor!=='grabbing') cv.style.cursor='grabbing'; }
  if(!drag) return;
  if(drag.kind==='link') drag.pos = w;
  else if(drag.kind==='node'){ const n=nodeById(drag.n); n.x=Math.round((w.x-drag.dx)/10)*10; n.y=Math.round((w.y-drag.dy)/10)*10; if(n.x!==drag.x0||n.y!==drag.y0) drag.moved=true; }
  else if(drag.kind==='nodeWait'){ if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>9){ clearTimeout(lpTimer); drag.kind='pan'; } }
  else if(drag.kind==='box') drag.b = w;
  else if(drag.kind==='group'){
    const dx = Math.round((w.x-drag.a.x)/10)*10, dy = Math.round((w.y-drag.a.y)/10)*10;
    if(dx||dy) drag.moved = true;
    for(const o of drag.orig){ o.n.x = o.x+dx; o.n.y = o.y+dy; }
  }
  else if(drag.kind==='pan'){ G.view.x=drag.vx+e.clientX-drag.sx; G.view.y=drag.vy+e.clientY-drag.sy; }
});
function endPointer(e){
  clearTimeout(lpTimer);
  pointers.delete(e.pointerId); if(pointers.size<2) pinch=null;
  if(drag && drag.kind==='link'){
    const w = toWorld(e.clientX,e.clientY);
    let pt = findPort(w);
    if(!pt || !pt.in){
      const n = findNode(w);
      if(n){
        const c = DEFS[n.type].ins; let i = 0;
        for(; i<c; i++) if(!G.links.some(l=>l.b===n.id&&l.bi===i)) break;
        if(c) pt = {in:true,n:n.id,i:Math.min(i,c-1)};
      }
    }
    if(pt && pt.in) connect(drag.n,drag.o,pt.n,pt.i);
  }
  const clash = (a,b,g)=>a.x<b.x+NW+g && a.x+NW+g>b.x && a.y<b.y+NH+g && a.y+NH+g>b.y;
  if(drag && drag.kind==='group' && drag.moved){
    const mv = new Set(drag.orig.map(o=>o.n));
    if(drag.orig.some(o=>G.nodes.some(m=>!mv.has(m) && clash(o.n,m,6)))){ for(const o of drag.orig){ o.n.x=o.x; o.n.y=o.y; } toast('Emplacement occupé'); }
    else pushUndo({move:drag.orig});
  }
  if(drag && drag.kind==='node' && drag.moved){
    const n = nodeById(drag.n);
    if(G.nodes.some(m=>m!==n && clash(n,m,6))){ const sp = freeSpot(n.x,n.y,new Set([n])); n.x=sp.x; n.y=sp.y; }
    pushUndo({move:[{n,x:drag.x0,y:drag.y0}]});
  }
  if(drag && drag.kind==='group' && !drag.moved && drag.tap){ msel.delete(drag.tap); showSel(); }
  if(drag && drag.kind==='box'){
    const x0=Math.min(drag.a.x,drag.b.x), x1=Math.max(drag.a.x,drag.b.x), y0=Math.min(drag.a.y,drag.b.y), y1=Math.max(drag.a.y,drag.b.y);
    if(!drag.add) msel.clear();
    for(const n of G.nodes) if(n.x<x1 && n.x+NW>x0 && n.y<y1 && n.y+NH>y0) msel.add(n.id);
    sel = null; showSel();
  }
  drag=null;
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('dblclick', e=>{ const l=findLink(toWorld(e.clientX,e.clientY)); if(l) dropLink(l); });
cv.addEventListener('auxclick', e=>{ if(e.button===1) e.preventDefault(); });
cv.addEventListener('contextmenu', e=>{ e.preventDefault(); if(rcDown && Math.hypot(e.clientX-rcDown.x,e.clientY-rcDown.y)>4) return; const l=findLink(toWorld(e.clientX,e.clientY)); if(l) dropLink(l); });
cv.addEventListener('wheel', e=>{
  e.preventDefault();
  const base = zoomT ? zoomT.k : G.view.k;
  const step = Math.exp(-Math.max(-300,Math.min(300,e.deltaY))*0.0022);
  zoomAt(e.clientX, e.clientY, base*step);
},{passive:false});
const shopEl = document.getElementById('shop');
shopEl.addEventListener('wheel', e=>{
  if(shopEl.scrollWidth<=shopEl.clientWidth) return;
  const d = Math.abs(e.deltaX)>Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  e.preventDefault();
  shopEl.scrollLeft += e.deltaMode===1 ? d*32 : d;
},{passive:false});
addEventListener('keydown', e=>{
  if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT') return;
  if((e.ctrlKey||e.metaKey) && (e.key==='z'||e.key==='Z')){ e.preventDefault(); undo(); return; }
  if(e.key==='Escape'){ if(tab) openTab(tab); sel=null; msel.clear(); selMode=false; $('bSel').classList.remove('glow'); showSel(); }
  if(e.key===' '){ e.preventDefault(); togglePause(); return; }
  if(e.key==='m'||e.key==='M') $('bMenu').click();
  if(e.key==='b'||e.key==='B') $('bBp').click();
  if(e.key==='o'||e.key==='O') useOverclock();
  if((e.key==='a'||e.key==='A') && !e.ctrlKey && !e.metaKey) upgradeAll();
  if(e.key==='f'||e.key==='F') fitView();
  if((e.key==='u'||e.key==='U') && sel){ const n=nodeById(sel); if(n) upgradeNode(n, e.shiftKey?1000:1); }
  if((e.key==='d'||e.key==='D') && msel.size && !e.ctrlKey && !e.metaKey){ dupSel(); return; }
  if((e.key==='d'||e.key==='D') && sel){
    const n=nodeById(sel), c=n&&buyCost(n.type);
    if(n && !DEFS[n.type].unique && unlocked(n.type) && G.money>=c){
      G.money-=c; const m=addNode(n.type, n.x+30, n.y+NH+30); sel=m.id; showSel(); blip(600,0.08,0.05,'triangle');
    } else if(n) toast('Pas assez de crédits pour dupliquer');
  }
  if((e.key==='Delete'||e.key==='Backspace') && msel.size){ sellMany(); return; }
  if((e.ctrlKey||e.metaKey) && (e.key==='a'||e.key==='A')){ e.preventDefault(); for(const n of G.nodes) msel.add(n.id); sel=null; showSel(); return; }
  if((e.key==='Delete'||e.key==='Backspace') && sel){ const n=nodeById(sel); if(n) sell(n); }
});

// UI 
const $ = id => document.getElementById(id);
function ask(msg, yes){
  const d=$('dlg'); $('dlgMsg').textContent=msg; d.style.display='flex';
  $('dlgYes').onclick=()=>{ d.style.display='none'; yes(); };
  $('dlgNo').onclick=()=>{ d.style.display='none'; };
}
function toast(msg,ms=2600){ const t=$('toast'); t.textContent=msg; t.style.opacity=1; clearTimeout(toast.h); toast.h=setTimeout(()=>t.style.opacity=0,ms); }

function buildShop(){
  $('shop').innerHTML = '';
  for(const type of ORDER){
    const d = DEFS[type], b = document.createElement('button');
    b.dataset.type = type; b.title = d.desc; b.style.setProperty('--c', COLORS[type]);
    b.onclick = ()=>{
      if(!unlocked(type)) return;
      const c = buyCost(type);
      if(G.money<c){ toast('Pas assez de crédits'); return; }
      G.money -= c;
      const w = toWorld(W/2, H/2 - 40);
      const sp = freeSpot(w.x-NW/2, w.y-NH/2);
      const n = addNode(type, sp.x, sp.y);
      sel = n.id; showSel(); blip(520,0.08,0.05);
    };
    $('shop').appendChild(b);
  }
}
function refreshShop(){
  let shownLock = false;
  for(const b of $('shop').children){
    const type=b.dataset.type, d=DEFS[type];
    if(unlocked(type)){
      b.style.display = '';
      const h = `<img src="${iconImg(type,COLORS[type])}" alt=""><b>${d.name}</b><span class="c">${fmt(buyCost(type))}</span>`;
      if(b._h!==h){ b.innerHTML = h; b._h = h; }
      b.disabled = G.money < buyCost(type);
    } else if(!shownLock){
      shownLock = true; b.style.display = '';
      const need = d.needRs && G.resets<d.needRs ? d.needRs+' Reboots' : fmt(d.unlock)+' gagnés';
      const h = `<b>???</b><small>${need}</small>`;
      if(b._h!==h){ b.innerHTML = h; b._h = h; }
      b.disabled = true;
    } else b.style.display = 'none';
  }
}
function sellMany(){
  const ns = G.nodes.filter(n=>msel.has(n.id));
  if(!ns.length) return;
  const refund = sellNodes(ns);
  msel.clear(); showSel(); blip(300,0.12,0.06,'triangle');
  toast(ns.length+' nœuds vendus (+'+fmt(refund)+'). Ctrl+Z pour annuler.');
}
function upgradeAll(){
  const k = upgradeCheapest(G.nodes);
  if(k){ toast(k+' amélioration(s) achetée(s)'); blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
  else toast('Pas assez de crédits');
}
function upgradeSel(){
  const k = upgradeCheapest(G.nodes.filter(n=>msel.has(n.id)));
  if(k){ toast(k+' amélioration(s) sur la sélection'); blip(780,0.1,0.06,'triangle'); showSel(); }
  else toast('Pas assez de crédits');
}
let paused = false;
function togglePause(){
  paused = !paused;
  let p = document.getElementById('pauseB');
  if(!p){ p = document.createElement('div'); p.id='pauseB'; p.textContent='PAUSE  (Espace pour reprendre)'; p.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--glass);border:1px solid var(--acc);border-radius:12px;padding:12px 22px;font-size:18px;letter-spacing:1px;pointer-events:none;z-index:6;display:none'; document.body.appendChild(p); }
  p.style.display = paused ? 'block' : 'none';
}

function showMulti(){
  const box = $('sel'), ns = G.nodes.filter(n=>msel.has(n.id));
  const total = ns.reduce((s,n)=>s+sellVal(n),0);
  box.innerHTML = `<h3>${ns.length} nœud${ns.length>1?'s':''} sélectionné${ns.length>1?'s':''}</h3>
    <p>${selMode ? 'Mode sélection : trace un cadre ou touche des nœuds. Glisse un nœud sélectionné pour déplacer le groupe.' : 'Glisse un nœud sélectionné pour déplacer tout le groupe. Maj + glisser trace un cadre, Maj + clic ajoute ou retire un nœud.'}</p>
    <div class="row"><button id="mAll">Tout</button><button id="mType">Même type</button><button id="mNone">Aucun</button></div>
    <div class="row"><button id="mDup" ${ns.length?'':'disabled'}>Dupliquer</button><button id="mSave" ${ns.length>1?'':'disabled'}>Enregistrer schéma</button></div>
    <div class="row"><button id="mUp" ${ns.length?'':'disabled'}>Améliorer la sélection</button></div>
    <div class="row"><button id="mSell" ${ns.length?'':'disabled'}>Vendre tout${ns.length?' +'+fmt(total):''}</button></div>`;
  $('mSave').onclick = saveBp; $('mDup').onclick = dupSel; $('mUp').onclick = upgradeSel;
  box.style.display = 'block'; lastPanel = 'sel';
  $('mAll').onclick = ()=>{ for(const n of G.nodes) msel.add(n.id); showSel(); };
  $('mNone').onclick = ()=>{ msel.clear(); showSel(); };
  $('mType').onclick = ()=>{ const ty = new Set(ns.map(n=>n.type)); for(const n of G.nodes) if(ty.has(n.type)) msel.add(n.id); showSel(); };
  $('mSell').onclick = sellMany;
}
function showSel(){
  if(msel.size || selMode){ showMulti(); return; }
  const box = $('sel'), n = sel ? nodeById(sel) : null;
  if(!n){ box.style.display='none'; return; }
  const d = DEFS[n.type], t = timeOf(n);
  let extra;
  if(d.val) extra = `1 fichier de valeur ${seedV(d)} toutes les ${t.toFixed(2)} s.`;
  else if(n.type==='upload') extra = `1 fichier toutes les ${t.toFixed(2)} s (revenus ×${revMult().toFixed(2)}).`;
  else if(n.type==='sorter') extra = `Seuil : valeur ≥ ${fmt(n.thr||10)} vers le haut, le reste vers le bas.`;
  else extra = `${t.toFixed(2)} s par fichier.`;
  const nm = (Math.floor(n.level/10)+1)*10, tr = tierOf(n.level), tcol = TIERS[tr][1];
  { const rk = rankOf(n.type); extra += ` Maîtrise : rang ${rk}/${MASTTH.length}`+(rk<MASTTH.length?` (${fmt(G.mast[n.type]||0)} / ${fmt(MASTTH[rk])} fichiers).`:' (maximum).'); }
  const s0 = 1/t, s1 = speedOf(n,n.level+1)/DEFS[n.type].t, gain = Math.round((s1/s0-1)*100);
  const prev = `<div class="up-prev"><span>Vitesse</span><b>${s0.toFixed(2)}/s</b><i>&rarr;</i><b class="g">${s1.toFixed(2)}/s</b><em>+${gain} %</em></div>
    <div class="up-tier"><span style="color:${tcol}">${TIERS[tr][0]}</span><u><s style="width:${(n.level%10)*10}%;background:${tcol}"></s></u><span>Palier ×1,5 dans ${nm-n.level}</span></div>`;
  let spec = '';
  if(n.level>=9){
    spec = `<div class="up-spec"><small>Spécialisation${n.spec?' (changer : '+fmt(upCost(n)*4)+')':' (gratuite, une fois)'}</small><div class="row">`+
      specsFor(n).map(k=>`<button data-spec="${k}" class="${n.spec===k?'on':''}" title="${SPECS[k].desc}">${SPECS[k].name}<br><small>${SPECS[k].desc}</small></button>`).join('')+`</div></div>`;
  } else spec = `<p class="up-hint">Niveau 10 : spécialisation (Turbo ou Économe ; Rendement pour les sources et l'Upload).</p>`;
  box.innerHTML = `<h3>${d.name} — niveau ${n.level+1}</h3><p>${d.desc}</p><p>${extra}</p>${prev}
    <div class="row"><button id="bu1"></button><button id="bu10"></button><button id="buP"></button><button id="buM"></button></div>
    ${spec}
    <div class="row"><button id="bDis">Déconnecter</button><button id="bDup">Dupliquer</button><button id="bSell">Vendre +${fmt(Math.floor(buyCost(n.type)*0.4))}</button></div>
    ${n.type==='sorter'?'<div class="row"><button id="bThrD">Seuil ÷2</button><button id="bThrU">Seuil ×2</button></div>':''}`;
  box.style.display='block'; lastPanel='sel'; box._sig = n.id+':'+n.level+':'+n.spec;
  refreshSelButtons();
  $('bu1').onclick = ()=>upgradeNode(n,1);
  $('bu10').onclick = ()=>upgradeNode(n,10);
  $('buP').onclick = ()=>upgradeNode(n,nm-n.level);
  $('buM').onclick = ()=>upgradeNode(n,maxAffordable(n));
  for(const bt of box.querySelectorAll('[data-spec]')) bt.onclick = ()=>{
    const k = bt.dataset.spec; if(n.spec===k) return;
    const c = n.spec ? upCost(n)*4 : 0;
    if(G.money<c){ toast('Pas assez de crédits'); return; }
    G.money -= c; n.spec = k; blip(700,0.12,0.06,'triangle'); toast('Spécialisation : '+SPECS[k].name); showSel();
  };
  $('bDis').onclick = ()=>{ G.links = G.links.filter(l=>l.a!==n.id && l.b!==n.id); };
  $('bSell').onclick = ()=>sell(n);
  if(n.type==='sorter'){
    $('bThrD').onclick = ()=>{ n.thr = Math.max(1,(n.thr||10)/2); showSel(); };
    $('bThrU').onclick = ()=>{ n.thr = (n.thr||10)*2; showSel(); };
  }
  $('bDup').onclick = ()=>{
    const c = buyCost(n.type);
    if(!unlocked(n.type)) return;
    if(G.money<c){ toast('Pas assez de crédits'); return; }
    G.money -= c; const sp = freeSpot(n.x, n.y+NH+30); const m = addNode(n.type, sp.x, sp.y); m.level = Math.max(0,n.level-2);
    sel = m.id; showSel(); blip(520,0.08,0.05);
  };
}
function refreshSelButtons(){
  const n = sel ? nodeById(sel) : null; if(!n || !$('bu1')) return;
  if($('sel')._sig!==n.id+':'+n.level+':'+n.spec && !msel.size){ showSel(); return; }
  const c1=upCost(n), c10=bulkCost(n,10), m=maxAffordable(n);
  $('bu1').innerHTML = `×1<br>${fmt(c1)}`;  $('bu1').disabled = G.money<c1;
  $('bu10').innerHTML = `×10<br>${fmt(c10)}`; $('bu10').disabled = G.money<c10;
  const toT = (Math.floor(n.level/10)+1)*10-n.level, cT = bulkCost(n,toT);
  $('buP').innerHTML = `Palier (${toT})<br>${fmt(cT)}`; $('buP').disabled = G.money<cT;
  $('buM').innerHTML = `Max (${m})<br>${fmt(bulkCost(n,m))}`; $('buM').disabled = m<1;
}

// panneau latéral à onglets
let tab = null, tabSig = '', devSpeed = 1;
function parseAmt(s){
  const m = String(s).trim().replace(',','.').match(/^([0-9.]+(?:e[0-9]+)?)\s*(k|m|md|b|t|qa|qi)?$/i);
  if(!m) return NaN;
  const mul = {k:1e3,m:1e6,md:1e9,b:1e9,t:1e12,qa:1e15,qi:1e18}[(m[2]||'').toLowerCase()] || 1;
  return parseFloat(m[1])*mul;
}
const TOP = [['bp','Schémas'],['up','Amélio.'],['qp','Quantique'],['ach','Succès'],['more','Plus']];
const SUBS = {bp:[['bp','Crédits'],['bpr','Recherche']], up:[['up','Crédits'],['res','Recherche']], more:[['stat','Stats'],['opt','Options'],['dev','Dév.']]};
const groupOf = t => t==='bpr' ? 'bp' : t==='res' ? 'up' : (t==='stat'||t==='opt'||t==='dev') ? 'more' : t;
const lastSub = {bp:'bp', up:'up', more:'stat'};
const hist = [];
const bar = (v,m,col)=>`<span class="bar"><u style="width:${Math.min(100,v/m*100)}%;background:${col||'var(--acc)'}"></u></span>`;
function affordCount(){ return GLOBALS.filter(g=>G.glob[g.id]<g.max && G.money>=gUpCost(g)).length + TECH.filter(d=>G.tech[d.id]<d.max && G.rp>=techCost(d)).length; }
function openTab(t){
  if(t==='more'||t==='up'||t==='bp') t = lastSub[t];
  if(tab===t){ tab=null; $('side').style.display='none'; return; }
  tab=t; lastPanel='side'; $('side').style.display='flex'; renderTab();
}
function bakInfo(){
  let h = '';
  const bak = lsGet(KEY_BAK);
  if(bak){ let t = ''; try{ const d = parseSave(bak); if(isNum(d.savedAt)) t = new Date(d.savedAt).toLocaleString('fr-FR'); }catch(e){} h += `<div class="item"><div><b>Copie de secours</b><p>${t?'Enregistrée le '+esc(t):'Disponible'}</p></div><button id="oBak">Restaurer</button></div>`; }
  if(lsGet(KEY_BAD)) h += `<div class="item"><div><b>Sauvegarde illisible conservée</b><p>${esc(lsGet(KEY_BAD+'.why')||'')}. Affiche-la dans la zone de texte pour la récupérer.</p></div><button id="oBad">Afficher</button></div>`;
  return h;
}
function renderTab(){
  if(!tab) return;
  const grp = groupOf(tab);
  if(lastSub[grp]!==undefined) lastSub[grp] = tab;
  const badge = {up:affordCount(), qp:qpGain()>=1?'+'+qpGain():0};
  $('tabs').innerHTML = TOP.map(([id,l])=>`<button data-t="${id}" class="${id===grp?'on':''}">${l}${badge[id]?` <i class="bd">${badge[id]}</i>`:''}</button>`).join('');
  $('tabs').querySelectorAll('button[data-t]').forEach(b=>b.onclick=()=>{ const id=b.dataset.t; tab = lastSub[id]||id; renderTab(); });
  const subs = SUBS[grp];
  $('subs').style.display = subs ? 'flex' : 'none';
  $('subs').innerHTML = subs ? subs.map(([id,l])=>`<button data-s="${id}" class="${id===tab?'on':''}">${l}</button>`).join('') : '';
  $('subs').querySelectorAll('button').forEach(b=>b.onclick=()=>{ tab=b.dataset.s; renderTab(); });
  const body = $('tabBody');
  if(tab==='dev'){
    const amts = [['1 K',1e3],['1 M',1e6],['1 Md',1e9],['1 T',1e12],['1 Qa',1e15],['1 Qi',1e18]];
    body.innerHTML = `<p>Menu développeur : outils de test. Les crédits donnés ne comptent pas dans les gains du run ni dans les objectifs.</p>
      <div class="item"><div><b>Crédits</b><p>Ajouter au solde</p></div></div>
      <div class="row" style="flex-wrap:wrap">${amts.map(([l,v])=>`<button data-dm="${v}">+${l}</button>`).join('')}</div>
      <div class="row"><button id="dX10">Solde ×10</button><button id="dX1k">Solde ×1000</button></div>
      <div class="row"><input id="dAmt" placeholder="ex. 5M, 2.5e12" style="flex:1;min-width:0;background:#0a0e16;color:var(--txt);border:1px solid var(--line);border-radius:999px;padding:7px 12px;font:inherit;font-size:13px"><button id="dGive">Ajouter</button></div>
      <div class="item"><div><b>Autres ressources</b></div></div>
      <div class="row"><button id="dRp">+1000 recherche</button><button id="dQp">+10 points quantiques</button></div>
      <div class="item"><div><b>Vitesse du temps</b><p>Actuelle : ×${devSpeed}</p></div></div>
      <div class="row">${[1,5,20,100].map(s=>`<button data-ds="${s}" class="${s===devSpeed?'glow':''}">×${s}</button>`).join('')}</div>
      <div class="item"><div><b>Progression</b><p>Débloque tous les nœuds (crédits du run et Reboots comptés au minimum nécessaire).</p></div></div>
      <div class="row"><button id="dUnl">Tout débloquer</button></div>`;
    body.querySelectorAll('button[data-dm]').forEach(b=>b.onclick=()=>{ G.money += +b.dataset.dm; toast('+'+fmt(+b.dataset.dm)+' crédits'); });
    body.querySelectorAll('button[data-ds]').forEach(b=>b.onclick=()=>{ devSpeed = +b.dataset.ds; renderTab(); });
    $('dX10').onclick = ()=>{ G.money *= 10; };
    $('dX1k').onclick = ()=>{ G.money *= 1000; };
    $('dGive').onclick = ()=>{ const v = parseAmt($('dAmt').value); if(!(v>0)){ toast('Montant invalide'); return; } G.money += v; toast('+'+fmt(v)+' crédits'); };
    $('dRp').onclick = ()=>{ G.rp += 1000; G.rpTotal += 1000; };
    $('dQp').onclick = ()=>{ G.qp += 10; G.qpTotal += 10; };
    $('dUnl').onclick = ()=>{ G.run = Math.max(G.run, 1e12); G.resets = Math.max(G.resets, 11); buildShop(); toast('Tout est débloqué'); };
  } else if(tab==='bp' || tab==='bpr'){
    body.innerHTML = `<p>${tab==='bpr' ? 'Schémas qui produisent des points de recherche (Laboratoire).' : 'Schémas qui produisent des crédits (Upload).'} Un clic pose et relie tous les nœuds au centre de l\'écran.</p>` + [[tab==='bpr','']].map(([isLab,title])=>
      BPS.concat(G.mine||[]).filter(b=>bpIsLab(b)===isLab).map(b=>[b,bpCost(b)]).sort((x,y)=>(!!x[0].mine-!!y[0].mine)||x[1]-y[1]).map(([b,c])=>{
        const lock = !bpUnlocked(b), i = BPS.indexOf(b), mi = (G.mine||[]).indexOf(b);
        return `<div class="item${lock?' lock':!(G.money<c)?' can':''}"><div><b>${esc(b.name)}</b> <small>(${b.nodes.length} nœuds)</small><p>${lock?'Nécessite : '+bpLocked(b):esc(b.desc)}</p></div>
          ${mi>=0?`<button data-bpd="${mi}" title="Supprimer" style="min-width:0;padding:6px 10px;color:var(--bad)">&times;</button>`:''}<button ${mi>=0?`data-bpm="${mi}"`:`data-bp="${i}"`} ${lock||G.money<c?'disabled':''}>${fmt(c)}</button></div>`;
      }).join('')).join('') + (tab==='bp'?'<p>Astuce : sélectionne des nœuds (bouton Sélection) puis « Enregistrer schéma » pour créer ton propre schéma.</p>':'');
    body.querySelectorAll('button[data-bpm]').forEach(b=>b.onclick=()=>buildBp(G.mine[+b.dataset.bpm]));
    body.querySelectorAll('button[data-bpd]').forEach(b=>b.onclick=()=>{ G.mine.splice(+b.dataset.bpd,1); renderTab(); });
    body.querySelectorAll('button[data-bp]').forEach(b=>b.onclick=()=>buildBp(BPS[+b.dataset.bp]));
  } else if(tab==='up'){
    body.innerHTML = `<div class="item"><div><b>Tout améliorer</b><p>Améliore tous les nœuds, du moins cher au plus cher, tant que tu as les crédits.</p></div><button id="upAll" ${G.nodes.length&&G.money>=Math.min(...G.nodes.map(n=>upCost(n)))?'':'disabled'}>Go</button></div>` + GLOBALS.map(g=>{
      const lv=G.glob[g.id], max=lv>=g.max, c=gUpCost(g);
      return `<div class="item${!max&&G.money>=c?' can':''}"><div><b>${g.name}</b> <small>${lv}/${g.max}</small><p>${g.desc}</p>${bar(lv,g.max)}</div>
        <button data-g="${g.id}" ${max||G.money<c?'disabled':''}>${max?'MAX':fmt(c)}</button></div>`;
    }).join('');
    $('upAll').onclick = upgradeAll;
    body.querySelectorAll('button[data-g]').forEach(b=>b.onclick=()=>{
      const g=GLOBALS.find(x=>x.id===b.dataset.g), c=gUpCost(g);
      if(G.money>=c && G.glob[g.id]<g.max){ G.money-=c; G.glob[g.id]++; blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
    });
  } else if(tab==='qp'){
    const gain=qpGain();
    body.innerHTML = `<p>Un <b class="qp">Reboot quantique</b> remet ta progression à zéro, mais te donne des <b class="qp">points quantiques</b>. Ils donnent un bonus de revenus permanent (×(1 + points)<sup>0,6</sup>) et se dépensent aussi en bonus permanents.</p>
      <div class="item"><div><b class="qp">${G.qp} point(s)</b> disponible(s)<p>Total : ${G.qpTotal} · Reboots : ${G.resets} · Bonus : ×${qpMult(G.qpTotal).toFixed(2)}</p></div></div>
      <div class="item"><div>Run en cours : ${Math.floor((G.playtime-G.runStart)/60)} min<p>Rendement actuel : ${((G.playtime-G.runStart)>60?gain/((G.playtime-G.runStart)/60):0).toFixed(1)} PQ / min</p></div></div>
      <button id="bReboot" class="${gain>=1?'glow':''}" style="width:100%" ${gain<1?'disabled':''}>Reboot : +${gain} point(s)</button>
      <p>${gain<1?'Il faut gagner '+fmt(qpNeed(1))+' crédits dans ce run pour obtenir le premier point.':'Prochain point à '+fmt(qpNeed(gain+1))+' crédits gagnés dans ce run (actuel : '+fmt(G.run)+').'} Les points deviennent de plus en plus difficiles à obtenir, et au-delà de ${FREEQ} points les prix des nœuds suivent en partie le bonus (inflation actuelle : ×${infl().toFixed(2)}).</p>` +
      PU.map(d=>{
        const lv=G.pu[d.id], max=lv>=d.max, c=puCost(d);
        return `<div class="item${!max&&G.qp>=c?' can':''}"><div><b>${d.name}</b> <small>${lv}/${d.max}</small><p>${d.desc}<br><span class="qp">${lv?d.eff(lv):""}</span></p>${bar(lv,d.max,'var(--qp)')}</div>
          <button data-p="${d.id}" ${max||G.qp<c?'disabled':''}>${max?'MAX':c+' PQ'}</button></div>`;
      }).join('');
    $('bReboot').onclick = reboot;
    body.querySelectorAll('button[data-p]').forEach(b=>b.onclick=()=>{
      const d=PU.find(x=>x.id===b.dataset.p), c=puCost(d);
      if(G.qp>=c && G.pu[d.id]<d.max){ G.qp-=c; G.pu[d.id]++; renderTab(); }
    });
  } else if(tab==='res'){
    body.innerHTML = `<p>Les points de recherche (RP) sont produits par les <b>Laboratoires</b> à partir des fichiers qu'ils reçoivent. Les technologies sont <b>permanentes</b>, même après un Reboot.</p>
      <div class="item"><div><b style="color:#76e4f7">${fmt(G.rp)} RP</b><p>Total produit : ${fmt(G.rpTotal)}</p></div></div>` +
      TECH.map(d=>{
        const lv=G.tech[d.id], max=lv>=d.max, c=techCost(d);
        return `<div class="item${!max&&G.rp>=c?' can':''}"><div><b>${d.name}</b> <small>${lv}/${d.max}</small><p>${d.desc}<br><span style="color:#76e4f7">${lv?d.eff(lv):""}</span></p>${bar(lv,d.max,'#76e4f7')}</div>
          <button data-r="${d.id}" ${max||G.rp<c?'disabled':''}>${max?'MAX':fmt(c)+' RP'}</button></div>`;
      }).join('');
    body.querySelectorAll('button[data-r]').forEach(b=>b.onclick=()=>{
      const d=TECH.find(x=>x.id===b.dataset.r), c=techCost(d);
      if(G.rp>=c && G.tech[d.id]<d.max){ G.rp-=c; G.tech[d.id]++; blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
    });
  } else if(tab==='stat'){
    body.innerHTML = `<p>Crédits par seconde sur les dernières minutes :</p><canvas id="spark" width="600" height="220" style="position:static;width:100%;height:110px;background:#0a0e16;border-radius:8px"></canvas>
      <div class="item"><div>Crédits gagnés au total<p>${fmt(G.lifetime)}</p></div></div>
      <div class="item"><div>Crédits gagnés dans ce run<p>${fmt(G.run)}</p></div></div>
      <div class="item"><div>Fichiers uploadés<p>${fmt(G.files)}</p></div></div>
      <div class="item"><div>Multiplicateur de revenus<p>x${revMult().toFixed(2)}</p></div></div>
      <div class="item"><div>Meilleur débit<p>${fmt(G.bestRate)} / s</p></div></div>
      <div class="item"><div>Contrats remplis · événements<p>${G.cDone} · ${G.evDone}</p></div></div>
      <div class="item"><div>Nœuds posés<p>${G.nodes.length}</p></div></div>
      <div class="item"><div>Temps de jeu<p>${Math.floor(G.playtime/3600)} h ${Math.floor(G.playtime/60)%60} min</p></div></div>
      <h3 class="sec">Derniers reboots</h3>${(G.hist||[]).length?[...G.hist].reverse().map(h=>`<div class="item"><div>+${h.g} PQ en ${Math.floor(h.t/60)} min<p>${fmt(h.run)} crédits dans le run</p></div></div>`).join(''):'<p>Aucun reboot pour le moment.</p>'}
      <h3 class="sec">Maîtrise des nœuds (permanente)</h3>` + ORDER.filter(t=>G.mast[t]).map(t=>{ const rk=rankOf(t), c=G.mast[t], nx=MASTTH[rk];
        return `<div class="item"><div><b>${DEFS[t].name}</b> <small>rang ${rk}/${MASTTH.length}</small><p>${fmt(c)} fichiers traités${nx?' · prochain rang à '+fmt(nx):''}</p>${bar(nx?c-(MASTTH[rk-1]||0):1, nx?nx-(MASTTH[rk-1]||0):1, COLORS[t])}</div></div>`; }).join('');
    drawSpark();
  } else if(tab==='ach'){
    body.innerHTML = `<p>${achCount()}/${ACH.length} succès · chaque succès donne +2 % de revenus (actuellement +${achCount()*2} %).</p>` +
      [...ACH].sort((x,y)=>(!!G.ach[y.id])-(!!G.ach[x.id])).map(a=>`<div class="item ${G.ach[a.id]?'done':'lock'}"><div><b>${a.name}</b><p>${a.desc}</p></div><span class="chip">${G.ach[a.id]?'Obtenu':'À faire'}</span></div>`).join('');
  } else if(tab==='opt'){
    body.innerHTML = `<div class="item"><div><b>Son</b></div><button id="oMute">${G.mute?'Désactivé':'Activé'}</button></div>
      <div class="item"><div><b>Format des nombres</b><p>${G.sci?'Scientifique (1.23e6)':'Abrégé (1,23M)'}</p></div><button id="oSci">Changer</button></div>
      <div class="item"><div><b>Sauvegarde</b><p>Exporter / importer ta partie (texte). Une copie de secours est faite toutes les 5 minutes et avant chaque reboot.</p></div></div>
      ${bakInfo()}
      <textarea id="oTxt" placeholder="Code de sauvegarde…"></textarea>
      <div class="row"><button id="oExp">Exporter</button><button id="oImp">Importer</button></div>
      <div class="row"><button id="oReset" style="color:var(--bad)">Tout effacer</button></div>
      <p>Temps de jeu : ${Math.floor(G.playtime/3600)} h ${Math.floor(G.playtime/60)%60} min · Crédits gagnés au total : ${fmt(G.lifetime)}</p>
      <div class="item"><div><b>Raccourcis</b></div></div>
      <div class="kb">${[['Molette','Zoom'],['F','Centrer la vue'],['O','Overclock'],['M','Menu'],['B','Schémas'],['D','Dupliquer nœud ou sélection'],['U','Améliorer (Maj : au max)'],['A','Tout améliorer'],['Suppr','Vendre'],['Espace','Pause'],['Double-clic nœud','Sélectionner le même type'],['Ctrl+Z','Annuler (vente, lien, déplacement)'],['Ctrl+A','Tout sélectionner'],['Clic gauche glissé','Relier des nœuds'],['Clic droit','Sélectionner / déplacer / zone'],['Clic molette glissé','Déplacer la vue'],['Maj+glisser','Sélection en zone'],['Echap','Fermer / désélectionner']].map(([k,t])=>`<kbd>${k}</kbd><span>${t}</span>`).join('')}</div>
      <p>Double-clic ou clic droit sur un lien pour le supprimer.</p>`;
    const keep = fn=>{ const y=body.scrollTop; fn(); renderTab(); body.scrollTop=y; };
    $('oMute').onclick = ()=>keep(()=>{ G.mute=!G.mute; });
    $('oSci').onclick = ()=>keep(()=>{ G.sci=!G.sci; refreshShop(); if(sel) showSel(); });
    if($('oBak')) $('oBak').onclick = ()=>ask('Restaurer la copie de secours ? La partie actuelle devient elle-même la copie de secours.', ()=>{
      const bak = lsGet(KEY_BAK); let r; try{ r = readSave(bak); }catch(e){ toast('Copie de secours illisible : '+e.message, 4500); return; }
      save(); adoptGame(r.g); toast('Copie de secours restaurée'); renderTab(); });
    if($('oBad')) $('oBad').onclick = ()=>{ $('oTxt').value = lsGet(KEY_BAD)||''; $('oTxt').select(); };
    $('oExp').onclick = ()=>{ save(); $('oTxt').value = btoa(unescape(encodeURIComponent(serializeText()))); $('oTxt').select(); };
    $('oImp').onclick = ()=>{
      let r;
      let txt; try{ txt = decodeURIComponent(escape(atob($('oTxt').value.trim()))); }catch(e){ toast('Code invalide : texte illisible', 4500); return; }
      try{ r = readSave(txt); }catch(e){ toast('Code invalide : '+e.message, 4500); return; }
      save(); adoptGame(r.g); toast('Sauvegarde importée (l\'ancienne partie est dans la copie de secours)', 4500); renderTab();
    };
    $('oReset').onclick = ()=>ask('Tout effacer, y compris les points quantiques, la copie de secours et les sauvegardes conservées ?', ()=>{ for(const k of [KEY,KEY_BAK,KEY_BAD,KEY_BAD+'.why',KEY+'.v0']) lsDel(k); newGame(); if(W<=700) fitView(); resetIncome(); sel=null; showSel(); buildShop(); renderTab(); });
  }
}
$('bMenu').onclick = ()=>openTab(tab?tab:'up');
$('bBp').onclick = ()=>openTab('bp');
$('sideX').onclick = ()=>{ if(tab) openTab(tab); };
$('tZin').onclick = ()=>zoomAt(W/2,H/2,(zoomT?zoomT.k:G.view.k)*1.4);
$('tZout').onclick = ()=>zoomAt(W/2,H/2,(zoomT?zoomT.k:G.view.k)/1.4);
$('tFit').onclick = fitView;
$('tUndo').onclick = undo;
$('tPause').onclick = ()=>{ togglePause(); $('tPause').classList.toggle('on',paused); };
$('bSel').onclick = ()=>{ selMode=!selMode; if(!selMode) msel.clear(); sel=null; $('bSel').classList.toggle('glow',selMode); showSel(); };

// fichier doré
let goldTimer = 0, goldNext = 60 + Math.random()*60, goldLife = 0;
function updateGold(dt){
  const g=$('gold');
  if(goldLife>0){ goldLife-=dt; if(goldLife<=0) g.style.display='none'; return; }
  goldTimer += dt;
  if(goldTimer>=goldNext){
    goldTimer=0; goldNext = 70 + Math.random()*80; goldLife = 12;
    g.style.left = (40+Math.random()*(W-120))+'px'; g.style.top = (110+Math.random()*(H-300))+'px'; g.style.display='block';
  }
}
$('gold').onclick = ()=>{
  const r = Math.max(100, G.lastRate*15);
  G.money += r; G.run += r; G.lifetime += r; G.golds++;
  $('gold').style.display='none'; goldLife=0;
  blip(880,0.2,0.08,'triangle'); toast('Fichier doré ! +'+fmt(r)+' crédits');
};
function updateObjHud(){
  const o = OBJ[G.obj], el = $('obj');
  if(!o){ el.style.display='none'; return; }
  const [c,t] = o.p(), f = Math.max(0,Math.min(1,c/t));
  el.style.display='block';
  el.innerHTML = `<small>Objectif ${G.obj+1}/${OBJ.length}  -  récompense ${fmt(objReward(o))}</small><div>${o.d}  <span>${fmt(Math.min(c,t))} / ${fmt(t)}</span></div><i style="width:${f*100}%"></i>`;
}

function drawSpark(){
  const c=$('spark'); if(!c) return; const x=c.getContext('2d'), w=c.width, h=c.height;
  x.clearRect(0,0,w,h);
  if(hist.length<2){ x.fillStyle='#8794b3'; x.font='20px system-ui'; x.fillText('Collecte des données...',20,h/2); return; }
  const mx=Math.max(...hist,1);
  x.strokeStyle='#1f2a42'; x.lineWidth=1; for(let i=1;i<4;i++){ x.beginPath(); x.moveTo(0,h*i/4); x.lineTo(w,h*i/4); x.stroke(); }
  x.beginPath(); hist.forEach((v,i)=>{ const px=i/(hist.length-1)*w, py=h-8-(v/mx)*(h-24); i?x.lineTo(px,py):x.moveTo(px,py); });
  x.strokeStyle='#4fd1c5'; x.lineWidth=3; x.stroke();
  x.lineTo(w,h); x.lineTo(0,h); x.closePath(); x.fillStyle='#4fd1c533'; x.fill();
  x.fillStyle='#8794b3'; x.font='18px system-ui'; x.fillText('max '+fmt(mx)+' / s',8,18);
}
setInterval(()=>{ if(!G) return; hist.push(G.lastRate); if(hist.length>150) hist.shift(); if(tab==='stat') drawSpark(); }, 2000);
function fitView(){
  if(!G.nodes.length) return;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const n of G.nodes){ x0=Math.min(x0,n.x); y0=Math.min(y0,n.y); x1=Math.max(x1,n.x+NW); y1=Math.max(y1,n.y+NH); }
  const mm = W<=700 ? 30 : 120, k = Math.max(ZMIN,Math.min(1.5, Math.min((W-mm)/(x1-x0), (H-300)/(y1-y0)))); zoomT = null;
  G.view.k = k; G.view.x = -((x0+x1)/2)*k; G.view.y = -((y0+y1)/2)*k - 20;
}
const mini = $('mini'), mx = mini.getContext('2d');
let miniB = null;
function drawMini(){
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
$('bOc').onclick = useOverclock;
cv.addEventListener('dblclick', e=>{ const nd=findNode(toWorld(e.clientX,e.clientY)); if(nd){ msel.clear(); for(const m of G.nodes) if(m.type===nd.type) msel.add(m.id); sel=null; showSel(); toast(msel.size+' nœud(s) du même type'); } });
cv.addEventListener('dblclick', e=>{ if(!findNode(toWorld(e.clientX,e.clientY)) && !findLink(toWorld(e.clientX,e.clientY))) fitView(); });
function adoptGame(g){ backupNow(); setG(g); msel.clear(); sel = null; buildShop(); showSel(); save(); }
setInterval(save, 5000);
addEventListener('beforeunload', save);

// Boucle 
// L'interface ecoute le coeur du jeu
on('toast', toast);
on('blip', blip);
on('upSound', upSound);
on('float', floatText);
on('showSel', ()=>showSel());
on('renderTab', ()=>renderTab());
on('clearSel', ()=>{ sel = null; showSel(); });
on('achievement', ()=>{ if(tab==='ach') renderTab(); });
on('rebootStart', ()=>msel.clear());
on('rebooted', g=>{ sel = null; showSel(); renderTab(); buildShop(); toast(`Reboot ! +${g} point(s) quantique(s)`); });
on('earnFx', (n,crit)=>{ for(let i=0;i<(crit?10:4);i++) if(parts.length<250) parts.push({x:n.x+NW/2,y:n.y+NH/2,vx:(Math.random()-.5)*160,vy:-40-Math.random()*120,life:1,col:crit?'#ff9f43':'#f6c453'}); });
on('tierFx', (n,col)=>{ for(let i=0;i<24;i++) if(parts.length<250){ const a=Math.random()*6.283, sp=60+Math.random()*140; parts.push({x:n.x+NW/2,y:n.y+NH/2,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,col}); } });

if(!load()){ newGame(); if(W<=700) fitView(); }
buildShop();
let last = performance.now(), uiT = 0, autoT = 0;
function hintText(){ const h = hintText0(); return touchMode ? h.replace(/Clique/g,'Touche').replace('Glisse depuis','Glisse le doigt depuis') : h; }
function hintText0(){
  if(G.obj>=2) return '';
  if(G.files>=30 && G.resets===0 && G.lifetime>=100) return '';
  if(!G.links.length) return 'Glisse depuis le port rond de sortie d\'un nœud vers l\'entrée d\'un autre pour les relier. Relie la Source à l\'Upload !';
  if(!(G.bought.compress)) return 'Bien ! Achète un Compresseur (en bas) et place-le entre la Source et l\'Upload : ses fichiers valent le double.';
  if(G.lifetime<100) return 'Clique sur un nœud pour l\'améliorer. Plus de nœuds + plus de niveaux = plus de crédits !';
  return 'Astuce : plusieurs Sources, des Diviseurs et des Fusions te permettent de paralléliser. De nouveaux nœuds se débloquent en gagnant des crédits.';
}
function updateEventHud(){
  const el = $('evS'), on = G.ev && G.playtime<G.ev.until;
  el.style.display = on ? 'block' : 'none';
  if(on){ const e = EVT.find(x=>x.id===G.ev.id); $('evB').textContent = e.name; $('evT').textContent = e.desc+' · '+Math.ceil(G.ev.until-G.playtime)+' s'; }
}
function updateContractHud(){
  if(G.obj<3) return;
  const el = $('ctr'), c = G.contract;
  if(!c){ el.style.display='none'; return; }
  const got = Math.max(0,G.run-c.start), f = Math.min(1,got/c.need);
  el.style.display='block';
  el.innerHTML = `<small>Contrat  -  récompense ${fmt(c.reward)}${G.cStreak?'  -  série '+G.cStreak:''}</small><div>${fmt(Math.min(got,c.need))} / ${fmt(c.need)}<span>${Math.max(0,Math.ceil(c.until-G.playtime))} s</span></div><i style="width:${f*100}%"></i>`;
}
function loop(now){
  const dt = Math.min(0.25,(now-last)/1000)*devSpeed; last = now;
  const n = Math.max(1,Math.ceil(dt/0.05));
  if(!paused) for(let i=0;i<n;i++) step(dt/n);
  for(let i=floats.length-1;i>=0;i--){ floats[i].life -= dt*0.9; if(floats[i].life<=0) floats.splice(i,1); }
  for(let i=parts.length-1;i>=0;i--){ const q=parts[i]; q.life-=dt*1.6; q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=300*dt; if(q.life<=0) parts.splice(i,1); }
  updateGold(dt);
  draw();
  autoT += dt;
  if(G.pu.auto && autoT>6){
    autoT=0;
    let best=null; for(const nd of G.nodes) if(!best || nd.level<best.level) best=nd;
    if(best && G.money >= upCost(best)*3){ G.money-=upCost(best); best.level++; }
  }
  uiT += dt;
  if(uiT>0.2){
    uiT=0;
    updateRate(now);
    $('money').textContent = fmt(G.money);
    $('rate').textContent = fmt(G.lastRate);

    const qg = qpGain();
    $('bMenu').classList.toggle('glow', qg>=1);
    $('bMenu').textContent = qg>=1 ? (innerWidth<=700 ? `Menu +${qg}` : `Menu  (+${qg} PQ)`) : "Menu";
    if(G.lastRate>G.bestRate) G.bestRate=G.lastRate;
    evTick(); updateEventHud(); contractTick(); updateContractHud(); refreshShop(); refreshSelButtons(); checkAch(); checkObj(); updateObjHud();
    const oc=$('bOc'), sm=innerWidth<=700;
    if(ocActive()) oc.textContent=(sm?'OC actif ':'Overclock actif : ')+Math.ceil(G.oc.until-G.playtime)+' s';
    else if(G.playtime<G.oc.ready) oc.textContent=(sm?'OC ':'Overclock : ')+Math.ceil(G.oc.ready-G.playtime)+' s';
    else oc.textContent=sm?'OC':'Overclock';
    oc.disabled = !ocActive() && G.playtime<G.oc.ready; oc.classList.toggle('glow', !oc.disabled && !ocActive());
    if(tab==='up' || tab==='qp' || tab==='res' || tab==='bp' || tab==='bpr'){
      const sig = tab+affordCount()+(qpGain()>=1?'q':'')+BPS.concat(G.mine||[]).map(b=>bpUnlocked(b)&&G.money>=bpCost(b)).join()+GLOBALS.map(g=>G.money>=gUpCost(g)).join()+PU.map(d=>G.qp>=puCost(d)).join()+qpGain()+TECH.map(d=>G.rp>=techCost(d)).join();
      if(sig!==tabSig){ tabSig=sig; renderTab(); }
    }
    const h=hintText(); $('hint').style.display=h?'block':'none'; $('hint').textContent=h;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__game = {get G(){return G;}, connect, step, addNode, qpGain, reboot, fmt};
