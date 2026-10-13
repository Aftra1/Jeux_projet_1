// Boutique de noeuds (barre du bas).
import { sel, setSel } from './state.js';
import { blip } from './audio.js';
import { showSel } from './selection.js';
import { $, toast } from './dom.js';
import { H, W, toWorld } from '../render/canvas.js';
import { G, addNode } from '../core/state.js';
import { buyCost, unlocked } from '../core/economy.js';
import { freeSpot } from '../core/geometry.js';
import { COLORS, DEFS, NH, NW, ORDER } from '../data/nodes.js';
import { iconImg } from '../render/icons.js';
import { fmt } from '../core/format.js';

const shopEl = document.getElementById('shop');
shopEl.addEventListener('wheel', e=>{
  if(shopEl.scrollWidth<=shopEl.clientWidth) return;
  const d = Math.abs(e.deltaX)>Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  e.preventDefault();
  shopEl.scrollLeft += e.deltaMode===1 ? d*32 : d;
},{passive:false});

export function buildShop(){
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
      setSel(n.id); showSel(); blip(520,0.08,0.05);
    };
    $('shop').appendChild(b);
  }
}
export function refreshShop(){
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
