// Evenements reseau : bonus temporaires aleatoires.
import { emit } from './bus.js';
import { G } from './state.js';
import { fmt } from './format.js';
import { EVT, EVT_GAP } from '../data/events.js';

const weight = e => e.weight===undefined ? 1 : e.weight;
// tirage pondere (poids 1 partout : meme resultat que le tirage uniforme)
function pick(){
  let r = Math.random()*EVT.reduce((s,e)=>s+weight(e),0);
  for(const e of EVT){ r -= weight(e); if(r<0) return e; }
  return EVT[EVT.length-1];
}
export const evActive = id => !!G.ev && G.ev.id===id && G.playtime<G.ev.until;
// Contrats : "gagne X credits avant la fin du temps", recompense proportionnelle au revenu, serie de reussites
export function evTick(){
  if(G.obj>=3 && G.lastRate>0){
    if(!G.evNext) G.evNext = G.playtime + 200;
    else if(G.playtime>=G.evNext && !evActive((G.ev||{}).id)){
      const e = pick();
      G.evNext = G.playtime + (EVT_GAP[0] + Math.random()*EVT_GAP[1])/EVT.reduce((s,x)=>s+weight(x),0); G.evDone++;
      if(e.dur){ G.ev = {id:e.id, until:G.playtime+e.dur}; emit('toast', 'Événement : '+e.name+' ('+e.desc+', '+e.dur+' s)'); }
      else { const r = Math.max(200, G.lastRate*40); G.money+=r; G.run+=r; G.lifetime+=r; emit('toast', 'Événement : '+e.name+' +'+fmt(r)+' crédits'); }
      emit('blip', 660,0.2,0.07,'triangle');
    }
  }
}
