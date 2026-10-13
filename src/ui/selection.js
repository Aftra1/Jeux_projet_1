// Panneau du noeud ou de la selection, et actions qui partent de la selection (schemas, vente, ameliorations).
import { msel, sel, selMode, setSel, tab } from './state.js';
import { blip } from './audio.js';
import { lastPanel, setLastPanel } from './hud.js';
import { renderTab } from './tabs.js';
import { $, toast } from './dom.js';
import { H, W, toWorld } from '../render/canvas.js';
import { MASTTH, bpCost, bpLocked, bpUnlocked, bulkCost, buyCost, maxAffordable, rankOf, revMult, seedV, sellVal, specsFor, speedOf, tierOf, timeOf, unlocked, upCost } from '../core/economy.js';
import { blueprintOf, chooseSpec, placeBlueprint, saveBlueprint, sell, sellNodes, upgradeCheapest, upgradeNode } from '../core/actions.js';
import { G, addNode, nodeById } from '../core/state.js';
import { fmt } from '../core/format.js';
import { freeSpot } from '../core/geometry.js';
import { DEFS, NH, SPECS, TIERS } from '../data/nodes.js';

export function buildBp(b,quiet){
  if(!bpUnlocked(b)) return;
  const made = placeBlueprint(b, toWorld(W/2, H/2-40));
  if(!made) return;
  if(!quiet){ setSel(null); showSel(); blip(520,0.1,0.06); toast('Schéma posé : '+b.name); }
  if(tab) renderTab();
}
function selBp(){
  const b = blueprintOf(G.nodes.filter(n=>msel.has(n.id)));
  return {name:'Copie', nodes:b.nodes, links:b.links};
}
export function dupSel(){
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
export function sellMany(){
  const ns = G.nodes.filter(n=>msel.has(n.id));
  if(!ns.length) return;
  const refund = sellNodes(ns);
  msel.clear(); showSel(); blip(300,0.12,0.06,'triangle');
  toast(ns.length+' nœuds vendus (+'+fmt(refund)+'). Ctrl+Z pour annuler.');
}
export function upgradeAll(){
  const k = upgradeCheapest(G.nodes);
  if(k){ toast(k+' amélioration(s) achetée(s)'); blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
  else toast('Pas assez de crédits');
}
function upgradeSel(){
  const k = upgradeCheapest(G.nodes.filter(n=>msel.has(n.id)));
  if(k){ toast(k+' amélioration(s) sur la sélection'); blip(780,0.1,0.06,'triangle'); showSel(); }
  else toast('Pas assez de crédits');
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
  box.style.display = 'block'; setLastPanel('sel');
  $('mAll').onclick = ()=>{ for(const n of G.nodes) msel.add(n.id); showSel(); };
  $('mNone').onclick = ()=>{ msel.clear(); showSel(); };
  $('mType').onclick = ()=>{ const ty = new Set(ns.map(n=>n.type)); for(const n of G.nodes) if(ty.has(n.type)) msel.add(n.id); showSel(); };
  $('mSell').onclick = sellMany;
}
export function showSel(){
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
  box.style.display='block'; setLastPanel('sel'); box._sig = n.id+':'+n.level+':'+n.spec;
  refreshSelButtons();
  $('bu1').onclick = ()=>upgradeNode(n,1);
  $('bu10').onclick = ()=>upgradeNode(n,10);
  $('buP').onclick = ()=>upgradeNode(n,nm-n.level);
  $('buM').onclick = ()=>upgradeNode(n,maxAffordable(n));
  for(const bt of box.querySelectorAll('[data-spec]')) bt.onclick = ()=>{
    const k = bt.dataset.spec; if(n.spec===k) return;
    if(!chooseSpec(n, k)){ toast('Pas assez de crédits'); return; }
    blip(700,0.12,0.06,'triangle'); toast('Spécialisation : '+SPECS[k].name); showSel();
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
    setSel(m.id); showSel(); blip(520,0.08,0.05);
  };
}
export function refreshSelButtons(){
  const n = sel ? nodeById(sel) : null; if(!n || !$('bu1')) return;
  if($('sel')._sig!==n.id+':'+n.level+':'+n.spec && !msel.size){ showSel(); return; }
  const c1=upCost(n), c10=bulkCost(n,10), m=maxAffordable(n);
  $('bu1').innerHTML = `×1<br>${fmt(c1)}`;  $('bu1').disabled = G.money<c1;
  $('bu10').innerHTML = `×10<br>${fmt(c10)}`; $('bu10').disabled = G.money<c10;
  const toT = (Math.floor(n.level/10)+1)*10-n.level, cT = bulkCost(n,toT);
  $('buP').innerHTML = `Palier (${toT})<br>${fmt(cT)}`; $('buP').disabled = G.money<cT;
  $('buM').innerHTML = `Max (${m})<br>${fmt(bulkCost(n,m))}`; $('buM').disabled = m<1;
}
