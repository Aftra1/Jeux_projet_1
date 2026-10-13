'use strict';
import { devSpeed, msel, paused, sel, setSel, setTabSig, tab, tabSig } from './ui/state.js';
import { blip, upSound } from './ui/audio.js';
import { hintText, updateContractHud, updateEventHud, updateObjHud } from './ui/hud.js';
import { buildShop, refreshShop } from './ui/shop.js';
import { refreshSelButtons, showSel } from './ui/selection.js';
import { affordCount, reboot, renderTab } from './ui/tabs.js';
import { updateGold } from './ui/gold.js';
import { load, save } from './core/save.js';
import { $, toast } from './ui/dom.js';
import { on } from './core/bus.js';
import { floatText, floats, parts } from './render/effects.js';
import { NH, NW } from './data/nodes.js';
import { W } from './render/canvas.js';
import { fitView } from './render/view.js';
import { G, addNode, connect, newGame } from './core/state.js';
import { draw } from './render/draw.js';
import { bpCost, bpUnlocked, gUpCost, puCost, qpGain, techCost, upCost } from './core/economy.js';
import { ocActive } from './core/prestige.js';
import { fmt } from './core/format.js';
import { GLOBALS, PU, TECH } from './data/upgrades.js';
import { step, updateRate } from './core/sim.js';
import { checkAch, checkObj } from './core/progression.js';
import { BPS } from './data/blueprints.js';
import { evTick } from './core/events.js';
import { contractTick } from './core/contracts.js';
import './input/hit.js';
import './input/pointer.js';
import './input/keyboard.js';
setInterval(save, 5000);
addEventListener('beforeunload', save);

// Branchements
// L'interface ecoute le coeur du jeu
on('toast', toast);
on('blip', blip);
on('upSound', upSound);
on('float', floatText);
on('showSel', ()=>showSel());
on('renderTab', ()=>renderTab());
on('clearSel', ()=>{ setSel(null); showSel(); });
on('achievement', ()=>{ if(tab==='ach') renderTab(); });
on('rebootStart', ()=>msel.clear());
on('rebooted', g=>{ setSel(null); showSel(); renderTab(); buildShop(); toast(`Reboot ! +${g} point(s) quantique(s)`); });
on('earnFx', (n,crit)=>{ for(let i=0;i<(crit?10:4);i++) if(parts.length<250) parts.push({x:n.x+NW/2,y:n.y+NH/2,vx:(Math.random()-.5)*160,vy:-40-Math.random()*120,life:1,col:crit?'#ff9f43':'#f6c453'}); });
on('tierFx', (n,col)=>{ for(let i=0;i<24;i++) if(parts.length<250){ const a=Math.random()*6.283, sp=60+Math.random()*140; parts.push({x:n.x+NW/2,y:n.y+NH/2,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,col}); } });

if(!load()){ newGame(); if(W<=700) fitView(); }
buildShop();
let last = performance.now(), uiT = 0, autoT = 0;
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
      if(sig!==tabSig){ setTabSig(sig); renderTab(); }
    }
    const h=hintText(); $('hint').style.display=h?'block':'none'; $('hint').textContent=h;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__game = {get G(){return G;}, connect, step, addNode, qpGain, reboot, fmt};
