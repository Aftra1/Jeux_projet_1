// Contrats : gagner un montant avant la fin du temps, serie de reussites.
import { emit } from './bus.js';
import { G } from './state.js';
import { fmt } from './format.js';

export function contractTick(){
  if(G.obj<3) return;
  let c = G.contract;
  if(c){
    const got = G.run - c.start, left = c.until - G.playtime;
    if(got>=c.need){
      G.money += c.reward; G.cStreak++; G.cDone++; G.cNext = G.playtime + 100; G.contract = null;
      emit('toast', 'Contrat rempli : +'+fmt(c.reward)+' crédits (série '+G.cStreak+')'); emit('blip', 760,0.25,0.07,'triangle');
    } else if(left<=0){
      G.cStreak = 0; G.cNext = G.playtime + 60; G.contract = null; emit('toast', 'Contrat échoué : série remise à zéro');
    }
  } else if(G.playtime>=G.cNext && G.lastRate>0){
    const T = 90, need = Math.ceil(Math.max(100, G.lastRate*T*1.25));
    G.contract = {start:G.run, need, until:G.playtime+T, T, reward:Math.floor(need*0.5*(1+0.1*Math.min(5,G.cStreak)))};
    emit('toast', 'Nouveau contrat : gagne '+fmt(need)+' crédits en '+T+' s');
  }
}
