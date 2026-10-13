// Evenements reseau : bonus temporaires aleatoires.
import { emit } from './bus.js';
import { G } from './state.js';
import { fmt } from './format.js';
import { EVT } from '../data/events.js';

export const evActive = id => !!G.ev && G.ev.id===id && G.playtime<G.ev.until;
// Contrats : "gagne X credits avant la fin du temps", recompense proportionnelle au revenu, serie de reussites
export function evTick(){
  if(G.obj>=3 && G.lastRate>0){
    if(!G.evNext) G.evNext = G.playtime + 200;
    else if(G.playtime>=G.evNext && !evActive((G.ev||{}).id)){
      const e = EVT[Math.floor(Math.random()*EVT.length)];
      G.evNext = G.playtime + 220 + Math.random()*140; G.evDone++;
      if(e.dur){ G.ev = {id:e.id, until:G.playtime+e.dur}; emit('toast', 'Événement : '+e.name+' ('+e.desc+', '+e.dur+' s)'); }
      else { const r = Math.max(200, G.lastRate*40); G.money+=r; G.run+=r; G.lifetime+=r; emit('toast', 'Événement : '+e.name+' +'+fmt(r)+' crédits'); }
      emit('blip', 660,0.2,0.07,'triangle');
    }
  }
}
