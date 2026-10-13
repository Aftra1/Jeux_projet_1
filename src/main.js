'use strict';
import { $, ask, toast } from './ui/dom.js';
import { H, W, cv, toWorld } from './render/canvas.js';
import { fitView, setZoomShow, setZoomT, zoomAt, zoomShow, zoomT } from './render/view.js';
import { iconImg } from './render/icons.js';
import { floatText, floats, parts } from './render/effects.js';
import { draw } from './render/draw.js';
import { G, addNode, connect, newGame, nodeById, setG } from './core/state.js';
import { FREEQ, MASTTH, achCount, bpCost, bpIsLab, bpLocked, bpUnlocked, bulkCost, buyCost, gUpCost, infl, maxAffordable, puCost, qpGain, qpMult, qpNeed, rankOf, revMult, seedV, sellVal, specsFor, speedOf, techCost, tierOf, timeOf, unlocked, upCost } from './core/economy.js';
import { doReboot, ocActive, useOverclock } from './core/prestige.js';
import { ZMAX, ZMIN, bez, freeSpot, inPort, linkPts, outPort } from './core/geometry.js';
import { COLORS, DEFS, NH, NW, ORDER, SPECS, TIERS } from './data/nodes.js';
import { blueprintOf, dropLink, placeBlueprint, pushUndo, saveBlueprint, sell, sellNodes, undo, upgradeCheapest, upgradeNode } from './core/actions.js';
import { esc, fmt } from './core/format.js';
import { GLOBALS, PU, TECH } from './data/upgrades.js';
import { KEY, KEY_BAD, KEY_BAK, backupNow, isNum, load, lsDel, lsGet, parseSave, readSave, save, serializeText } from './core/save.js';
import { resetIncome, step, updateRate } from './core/sim.js';
import { ACH, OBJ, checkAch, checkObj, objReward } from './core/progression.js';
import { BPS } from './data/blueprints.js';
import { on } from './core/bus.js';
import { EVT } from './data/events.js';
import { evTick } from './core/events.js';
import { contractTick } from './core/contracts.js';
import './render/minimap.js';
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

// Prestige 
function reboot(){
  const g = qpGain(); if(g<1) return;
  ask(`Reboot quantique ? Tu gagnes ${g} point(s) quantique(s) (revenus x${qpMult(G.qpTotal+g).toFixed(2)} au lieu de x${qpMult(G.qpTotal).toFixed(2)}). Tes nœuds, crédits et améliorations de run sont remis à zéro.`, doReboot);
}

export let sel = null, drag = null, hoverPort = null;
export const msel = new Set(); let selMode = false;

// Mise en page : les elements d'interface ne se superposent jamais
export let lastPanel = '', zoomLX = 0, zoomLY = 0;
const lay = {};
function setSt(el, k, v){ const key = el.id+k; if(lay[key]!==v){ lay[key]=v; el.style[k]=v; } }
const shown = el => el.style.display!=='none' && getComputedStyle(el).display!=='none';
export function layoutUI(){
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
    pinch={d:Math.hypot(a.x-b.x,a.y-b.y), k:G.view.k}; setZoomT(null); drag=null; return;
  }
  if(e.button===1){
    e.preventDefault(); setZoomT(null);
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
    v.k = Math.max(ZMIN, Math.min(ZMAX, pinch.k*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d)); setZoomShow(1.2);
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
