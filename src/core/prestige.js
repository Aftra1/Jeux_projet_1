// Prestige : Overclock et Reboot quantique.
import { emit } from './bus.js';
import { G, addNode, blankRun } from './state.js';
import { qpGain } from './economy.js';
import { resetIncome } from './sim.js';
import { backupNow, save } from './save.js';

export const ocActive = () => G.playtime < G.oc.until;
export function doReboot(){ save(); backupNow(); emit('rebootStart'); G.contract = null; G.ev = null; G.cNext = G.playtime + 60;
  const g = qpGain(); if(g<1) return;
  G.hist = (G.hist||[]).concat([{t:G.playtime-G.runStart, g, run:G.run}]).slice(-6); G.runStart = G.playtime;
  G.qp += g; G.qpTotal += g; G.resets++;
  blankRun(G);
  addNode('source', -280, -40, true);
  addNode('upload', 180, -40, true);
  resetIncome(); emit('rebooted', g);
  save();
}

// Overclock, vue, minimap
export function useOverclock(){
  if(G.playtime < G.oc.ready) { emit('toast', 'Overclock en recharge'); return; }
  G.oc.until = G.playtime + 15 + G.tech.toc; G.oc.ready = G.playtime + Math.max(30, 90 - 6*G.tech.toc);
  emit('blip', 300,0.4,0.08,'sawtooth'); emit('toast', 'Overclock : vitesse x2 pendant 15 s');
}
