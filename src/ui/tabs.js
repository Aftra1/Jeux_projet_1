// Panneau lateral a onglets : schemas, ameliorations, quantique, succes, stats, options, menu developpeur.
import { devSpeed, msel, sel, setDevSpeed, setSel, setTab, tab } from './state.js';
import { blip } from './audio.js';
import { lastPanel, setLastPanel } from './hud.js';
import { buildShop, refreshShop } from './shop.js';
import { buildBp, showSel, upgradeAll } from './selection.js';
import { $, ask, toast } from './dom.js';
import { G, newGame, setG } from '../core/state.js';
import { FREEQ, MASTTH, achCount, bpCost, bpIsLab, bpLocked, bpUnlocked, gUpCost, infl, puCost, qpGain, qpMult, qpNeed, rankOf, revMult, techCost, upCost } from '../core/economy.js';
import { doReboot } from '../core/prestige.js';
import { GLOBALS, PU, TECH } from '../data/upgrades.js';
import { esc, fmt } from '../core/format.js';
import { KEY, KEY_BAD, KEY_BAK, backupNow, isNum, lsDel, lsGet, parseSave, readSave, save, serializeText } from '../core/save.js';
import { W } from '../render/canvas.js';
import { fitView } from '../render/view.js';
import { COLORS, DEFS, ORDER } from '../data/nodes.js';
import { resetIncome } from '../core/sim.js';
import { ACH } from '../core/progression.js';
import { BPS } from '../data/blueprints.js';
import { buyGlobal, buyQuantum, buyTech } from '../core/actions.js';

export function reboot(){
  const g = qpGain(); if(g<1) return;
  ask(`Reboot quantique ? Tu gagnes ${g} point(s) quantique(s) (revenus x${qpMult(G.qpTotal+g).toFixed(2)} au lieu de x${qpMult(G.qpTotal).toFixed(2)}). Tes nœuds, crédits et améliorations de run sont remis à zéro.`, doReboot);
}
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
export function affordCount(){ return GLOBALS.filter(g=>G.glob[g.id]<g.max && G.money>=gUpCost(g)).length + TECH.filter(d=>G.tech[d.id]<d.max && G.rp>=techCost(d)).length; }
export function openTab(t){
  if(t==='more'||t==='up'||t==='bp') t = lastSub[t];
  if(tab===t){ setTab(null); $('side').style.display='none'; return; }
  setTab(t); setLastPanel('side'); $('side').style.display='flex'; renderTab();
}
function bakInfo(){
  let h = '';
  const bak = lsGet(KEY_BAK);
  if(bak){ let t = ''; try{ const d = parseSave(bak); if(isNum(d.savedAt)) t = new Date(d.savedAt).toLocaleString('fr-FR'); }catch(e){} h += `<div class="item"><div><b>Copie de secours</b><p>${t?'Enregistrée le '+esc(t):'Disponible'}</p></div><button id="oBak">Restaurer</button></div>`; }
  if(lsGet(KEY_BAD)) h += `<div class="item"><div><b>Sauvegarde illisible conservée</b><p>${esc(lsGet(KEY_BAD+'.why')||'')}. Affiche-la dans la zone de texte pour la récupérer.</p></div><button id="oBad">Afficher</button></div>`;
  return h;
}
export function renderTab(){
  if(!tab) return;
  const grp = groupOf(tab);
  if(lastSub[grp]!==undefined) lastSub[grp] = tab;
  const badge = {up:affordCount(), qp:qpGain()>=1?'+'+qpGain():0};
  $('tabs').innerHTML = TOP.map(([id,l])=>`<button data-t="${id}" class="${id===grp?'on':''}">${l}${badge[id]?` <i class="bd">${badge[id]}</i>`:''}</button>`).join('');
  $('tabs').querySelectorAll('button[data-t]').forEach(b=>b.onclick=()=>{ const id=b.dataset.t; setTab(lastSub[id]||id); renderTab(); });
  const subs = SUBS[grp];
  $('subs').style.display = subs ? 'flex' : 'none';
  $('subs').innerHTML = subs ? subs.map(([id,l])=>`<button data-s="${id}" class="${id===tab?'on':''}">${l}</button>`).join('') : '';
  $('subs').querySelectorAll('button').forEach(b=>b.onclick=()=>{ setTab(b.dataset.s); renderTab(); });
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
    body.querySelectorAll('button[data-ds]').forEach(b=>b.onclick=()=>{ setDevSpeed(+b.dataset.ds); renderTab(); });
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
      const g=GLOBALS.find(x=>x.id===b.dataset.g);
      if(buyGlobal(g)){ blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
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
      const d=PU.find(x=>x.id===b.dataset.p);
      if(buyQuantum(d)) renderTab();
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
      const d=TECH.find(x=>x.id===b.dataset.r);
      if(buyTech(d)){ blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
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
    $('oReset').onclick = ()=>ask('Tout effacer, y compris les points quantiques, la copie de secours et les sauvegardes conservées ?', ()=>{ for(const k of [KEY,KEY_BAK,KEY_BAD,KEY_BAD+'.why',KEY+'.v0']) lsDel(k); newGame(); if(W<=700) fitView(); resetIncome(); setSel(null); showSel(); buildShop(); renderTab(); });
  }
}
$('bMenu').onclick = ()=>openTab(tab?tab:'up');
$('bBp').onclick = ()=>openTab('bp');
$('sideX').onclick = ()=>{ if(tab) openTab(tab); };

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
function adoptGame(g){ backupNow(); setG(g); msel.clear(); setSel(null); buildShop(); showSel(); save(); }
