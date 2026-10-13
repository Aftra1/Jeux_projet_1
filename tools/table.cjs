// Résume la sortie de balance.cjs : une ligne par reboot
const lines = require('fs').readFileSync(0,'utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch(e){return null}}).filter(Boolean);
let prev = 0;
for (const l of lines) {
  if (l.ev==='reboot') { console.log(`reboot t=${String(l.t).padStart(4)}min  +${String(l.t-prev).padStart(3)}  run=${String(l.run).padStart(7)} gain=${String(l.gain).padStart(6)} qpT=${String(l.qpTotal).padStart(6)} rate=${String(l.rate).padStart(7)} rev=${l.rev} gaps=${JSON.stringify(l.gaps||{})}`); prev=l.t; }
  else if (l.end) console.log('FIN', JSON.stringify(l));
  else if (l.run && l.t!==undefined && !l.ev) console.log(`  t=${String(l.t).padStart(4)}min run=${l.run} rate=${l.rate} nodes=${l.nodes}`);
}
