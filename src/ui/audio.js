// Sons (Web Audio) et vibrations.
import { touchMode } from './state.js';
import { G } from '../core/state.js';

let AC = null, lastBlip = 0;
export function audio(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
let lastVib = 0;
export function blip(freq, dur=0.08, vol=0.05, type='sine'){
  if(touchMode && navigator.vibrate && Date.now()-lastVib>90){ lastVib = Date.now(); try{ navigator.vibrate(8); }catch(e){} }
  if(G.mute) return; const a = audio(); if(!a) return;
  try{
    const o=a.createOscillator(), g=a.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime+dur);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+dur);
  }catch(e){}
}
const PENTA = [0,2,4,7,9];
export function upSound(big){
  const now = performance.now(); if(now-lastBlip<70) return; lastBlip = now;
  const k = PENTA[Math.floor(Math.random()*5)] + (big?12:0);
  blip(440*Math.pow(2,k/12), 0.1, big?0.07:0.035);
}
export function vib(ms){ if(touchMode && navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} } }
