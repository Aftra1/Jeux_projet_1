// Souris et tactile sur le canvas : selection, glisser, liens, pincement, appui long, double tape, molette.
import { drag, hoverPort, msel, sel, selMode, setDrag, setHoverPort, setSel, setSelMode, setTouchMode, touchMode } from '../ui/state.js';
import { audio, vib } from '../ui/audio.js';
import { showSel } from '../ui/selection.js';
import { findLink, findNode, findPort, v_badge } from './hit.js';
import { $, toast } from '../ui/dom.js';
import { H, W, cv, toWorld } from '../render/canvas.js';
import { fitView, setZoomShow, setZoomT, zoomAt, zoomT } from '../render/view.js';
import { G, connect, nodeById } from '../core/state.js';
import { dropLink, pushUndo, upgradeNode } from '../core/actions.js';
import { DEFS, NH, NW } from '../data/nodes.js';
import { ZMAX, ZMIN, freeSpot } from '../core/geometry.js';

let lastTap = {t:0,x:0,y:0}, lpTimer = 0;
function doubleTap(x,y){
  const w = toWorld(x,y), nd = findNode(w);
  if(nd){ msel.clear(); for(const m of G.nodes) if(m.type===nd.type) msel.add(m.id); setSel(null); showSel(); toast(msel.size+' nœud(s) du même type'); vib(20); }
  else { const l = findLink(w); if(l) dropLink(l); else fitView(); }
}
function longPress(x,y){
  const w = toWorld(x,y), nd = findNode(w);
  setDrag(null); vib(35);
  if(nd){ setSelMode(true); $('bSel').classList.add('glow'); msel.add(nd.id); setSel(null); showSel(); toast('Mode sélection : touche des nœuds pour les ajouter'); return; }
  const l = findLink(w); if(l){ dropLink(l); toast('Liaison supprimée'); }
}
let rcDown = null;
const pointers = new Map(); let pinch = null;
cv.addEventListener('pointerdown', e=>{
  audio(); cv.setPointerCapture(e.pointerId);
  setTouchMode(e.pointerType==='touch');
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
    pinch={d:Math.hypot(a.x-b.x,a.y-b.y), k:G.view.k}; setZoomT(null); setDrag(null); return;
  }
  if(e.button===1){
    e.preventDefault(); setZoomT(null);
    setDrag({kind:'pan',sx:e.clientX,sy:e.clientY,vx:G.view.x,vy:G.view.y}); return;
  }
  const w = toWorld(e.clientX,e.clientY);
  const mouse = e.pointerType==='mouse';
  if(mouse && e.button!==0 && e.button!==2) return;
  if(mouse && e.button===0 && !e.shiftKey && !selMode){
    // clic gauche : relier (depuis un port de sortie ou n'importe où sur un nœud) ; sur une entrée reliée : détache
    const pt = findPort(w), n = pt ? null : findNode(w);
    if(pt && !pt.in){ setDrag({kind:'link',n:pt.n,o:pt.i,pos:w,rc:true}); }
    else if(pt && pt.in){ const l = G.links.find(l=>l.b===pt.n && l.bi===pt.i); if(l){ G.links = G.links.filter(x=>x!==l); setDrag({kind:'link',n:l.a,o:l.ao,pos:w,rc:true}); } }
    else if(n && v_badge(n,w)){ upgradeNode(n,1); setSel(n.id); showSel(); }
    else if(n && DEFS[n.type].outs){ setDrag({kind:'link',n:n.id,o:0,pos:w,rc:true}); }
    return;
  }
  rcDown = {x:e.clientX,y:e.clientY};
  if(msel.size && !e.shiftKey){
    const gh = findNode(w);
    if(gh && msel.has(gh.id)){
      setDrag({kind:'group', a:w, moved:false, tap:selMode?gh.id:null, orig:G.nodes.filter(n=>msel.has(n.id)).map(n=>({n,x:n.x,y:n.y}))});
      return;
    }
  }
  if(e.shiftKey || selMode){
    const hit = findNode(w);
    if(hit){ if(msel.has(hit.id)) msel.delete(hit.id); else msel.add(hit.id); setSel(null); showSel(); return; }
    setDrag({kind:'box', a:w, b:w, add:e.shiftKey}); return;
  }
  if(msel.size){ msel.clear(); showSel(); }
  const pt = mouse ? null : findPort(w);
  if(pt && !pt.in){ setDrag({kind:'link',n:pt.n,o:pt.i,pos:w}); return; }
  if(pt && pt.in){
    const l = G.links.find(l=>l.b===pt.n && l.bi===pt.i);
    if(l){ G.links = G.links.filter(x=>x!==l); setDrag({kind:'link',n:l.a,o:l.ao,pos:w}); return; }
  }
  const n = findNode(w);
  if(n && v_badge(n,w)){ upgradeNode(n,1); setSel(n.id); showSel(); return; }
  if(n){
    setSel(n.id); G.nodes.splice(G.nodes.indexOf(n),1); G.nodes.push(n);
    setDrag({kind:'node',n:n.id,dx:w.x-n.x,dy:w.y-n.y,x0:n.x,y0:n.y,moved:false}); showSel();
    if(touchMode){
      // au doigt : glisser deplace la vue ; un appui prolonge souleve la case (menu masque) pour la deplacer
      const d0 = drag; d0.kind = 'nodeWait'; d0.sx = e.clientX; d0.sy = e.clientY; d0.vx = G.view.x; d0.vy = G.view.y;
      lpTimer = setTimeout(()=>{ if(drag===d0 && d0.kind==='nodeWait'){ d0.kind = 'node'; setSel(null); showSel(); vib(40); toast('Déplace la case'); } }, 420);
    }
    return;
  }
  setSel(null); showSel();
  if(e.pointerType==='mouse'){ setDrag({kind:'box',a:w,b:w,add:e.shiftKey}); return; }
  setDrag({kind:'pan',sx:e.clientX,sy:e.clientY,vx:G.view.x,vy:G.view.y});
});
cv.addEventListener('pointermove', e=>{
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch && pointers.size===2){
    const [a,b]=[...pointers.values()], mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    const w = toWorld(mx,my), v=G.view;
    v.k = Math.max(ZMIN, Math.min(ZMAX, pinch.k*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d)); setZoomShow(1.2);
    v.x = mx - W/2 - w.x*v.k; v.y = my - H/2 - w.y*v.k; return;
  }
  const w = toWorld(e.clientX,e.clientY);
  setHoverPort(findPort(w));
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
    setSel(null); showSel();
  }
  setDrag(null);
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
cv.addEventListener('dblclick', e=>{ const nd=findNode(toWorld(e.clientX,e.clientY)); if(nd){ msel.clear(); for(const m of G.nodes) if(m.type===nd.type) msel.add(m.id); setSel(null); showSel(); toast(msel.size+' nœud(s) du même type'); } });
cv.addEventListener('dblclick', e=>{ if(!findNode(toWorld(e.clientX,e.clientY)) && !findLink(toWorld(e.clientX,e.clientY))) fitView(); });
