// Fichier dore (bonus a cliquer).
import { blip } from './audio.js';
import { $, toast } from './dom.js';
import { H, W } from '../render/canvas.js';
import { G } from '../core/state.js';
import { fmt } from '../core/format.js';

// fichier doré
let goldTimer = 0, goldNext = 60 + Math.random()*60, goldLife = 0;
export function updateGold(dt){
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
