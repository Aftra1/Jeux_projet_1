// Raccourcis clavier.
import { msel, sel, selMode, setSel, setSelMode, tab } from '../ui/state.js';
import { blip } from '../ui/audio.js';
import { togglePause } from '../ui/hud.js';
import { dupSel, sellMany, showSel, upgradeAll } from '../ui/selection.js';
import { openTab } from '../ui/tabs.js';
import { $, toast } from '../ui/dom.js';
import { fitView } from '../render/view.js';
import { G, addNode, nodeById } from '../core/state.js';
import { buyCost, unlocked } from '../core/economy.js';
import { useOverclock } from '../core/prestige.js';
import { DEFS, NH } from '../data/nodes.js';
import { sell, undo, upgradeNode } from '../core/actions.js';

addEventListener('keydown', e=>{
  if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT') return;
  if((e.ctrlKey||e.metaKey) && (e.key==='z'||e.key==='Z')){ e.preventDefault(); undo(); return; }
  if(e.key==='Escape'){ if(tab) openTab(tab); setSel(null); msel.clear(); setSelMode(false); $('bSel').classList.remove('glow'); showSel(); }
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
      G.money-=c; const m=addNode(n.type, n.x+30, n.y+NH+30); setSel(m.id); showSel(); blip(600,0.08,0.05,'triangle');
    } else if(n) toast('Pas assez de crédits pour dupliquer');
  }
  if((e.key==='Delete'||e.key==='Backspace') && msel.size){ sellMany(); return; }
  if((e.ctrlKey||e.metaKey) && (e.key==='a'||e.key==='A')){ e.preventDefault(); for(const n of G.nodes) msel.add(n.id); setSel(null); showSel(); return; }
  if((e.key==='Delete'||e.key==='Backspace') && sel){ const n=nodeById(sel); if(n) sell(n); }
});
