// Affichage tete haute : mise en page sans chevauchement, objectif, evenement, contrat, astuces, barre d'outils.
import { msel, paused, sel, selMode, setPaused, setSel, setSelMode, setTab, tab, touchMode } from './state.js';
import { showSel } from './selection.js';
import { $ } from './dom.js';
import { H, W } from '../render/canvas.js';
import { fitView, zoomAt, zoomT } from '../render/view.js';
import { G } from '../core/state.js';
import { undo } from '../core/actions.js';
import { fmt } from '../core/format.js';
import { objProgress, objReward } from '../core/progression.js';
import { OBJ } from '../data/progression.js';
import { useOverclock } from '../core/prestige.js';
import { EVT } from '../data/events.js';

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
    else { setTab(null); side.style.display = 'none'; sideOn = false; }
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
export function togglePause(){
  setPaused(!paused);
  let p = document.getElementById('pauseB');
  if(!p){ p = document.createElement('div'); p.id='pauseB'; p.textContent='PAUSE  (Espace pour reprendre)'; p.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--glass);border:1px solid var(--acc);border-radius:12px;padding:12px 22px;font-size:18px;letter-spacing:1px;pointer-events:none;z-index:6;display:none'; document.body.appendChild(p); }
  p.style.display = paused ? 'block' : 'none';
}
$('tZin').onclick = ()=>zoomAt(W/2,H/2,(zoomT?zoomT.k:G.view.k)*1.4);
$('tZout').onclick = ()=>zoomAt(W/2,H/2,(zoomT?zoomT.k:G.view.k)/1.4);
$('tFit').onclick = fitView;
$('tUndo').onclick = undo;
$('tPause').onclick = ()=>{ togglePause(); $('tPause').classList.toggle('on',paused); };
$('bSel').onclick = ()=>{ setSelMode(!selMode); if(!selMode) msel.clear(); setSel(null); $('bSel').classList.toggle('glow',selMode); showSel(); };
export function updateObjHud(){
  const o = OBJ[G.obj], el = $('obj');
  if(!o){ el.style.display='none'; return; }
  const [c,t] = objProgress(o), f = Math.max(0,Math.min(1,c/t));
  el.style.display='block';
  el.innerHTML = `<small>Objectif ${G.obj+1}/${OBJ.length}  -  récompense ${fmt(objReward(o))}</small><div>${o.d}  <span>${fmt(Math.min(c,t))} / ${fmt(t)}</span></div><i style="width:${f*100}%"></i>`;
}
$('bOc').onclick = useOverclock;
export function hintText(){ const h = hintText0(); return touchMode ? h.replace(/Clique/g,'Touche').replace('Glisse depuis','Glisse le doigt depuis') : h; }
function hintText0(){
  if(G.obj>=2) return '';
  if(G.files>=30 && G.resets===0 && G.lifetime>=100) return '';
  if(!G.links.length) return 'Glisse depuis le port rond de sortie d\'un nœud vers l\'entrée d\'un autre pour les relier. Relie la Source à l\'Upload !';
  if(!(G.bought.compress)) return 'Bien ! Achète un Compresseur (en bas) et place-le entre la Source et l\'Upload : ses fichiers valent le double.';
  if(G.lifetime<100) return 'Clique sur un nœud pour l\'améliorer. Plus de nœuds + plus de niveaux = plus de crédits !';
  return 'Astuce : plusieurs Sources, des Diviseurs et des Fusions te permettent de paralléliser. De nouveaux nœuds se débloquent en gagnant des crédits.';
}
export function updateEventHud(){
  const el = $('evS'), on = G.ev && G.playtime<G.ev.until;
  el.style.display = on ? 'block' : 'none';
  if(on){ const e = EVT.find(x=>x.id===G.ev.id); $('evB').textContent = e.name; $('evT').textContent = e.desc+' · '+Math.ceil(G.ev.until-G.playtime)+' s'; }
}
export function updateContractHud(){
  if(G.obj<3) return;
  const el = $('ctr'), c = G.contract;
  if(!c){ el.style.display='none'; return; }
  const got = Math.max(0,G.run-c.start), f = Math.min(1,got/c.need);
  el.style.display='block';
  el.innerHTML = `<small>Contrat  -  récompense ${fmt(c.reward)}${G.cStreak?'  -  série '+G.cStreak:''}</small><div>${fmt(Math.min(got,c.need))} / ${fmt(c.need)}<span>${Math.max(0,Math.ceil(c.until-G.playtime))} s</span></div><i style="width:${f*100}%"></i>`;
}
export function setLastPanel(v){ return lastPanel = v; }
