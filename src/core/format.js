// Formatage des nombres et echappement HTML.
import { G } from './state.js';

const SUF = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
export function fmt(v){
  if(!isFinite(v)) return 'Inf';
  if(v>=1e39) return v.toExponential(2).replace('e+','e');
  if(v<1000) return v<10 ? (Math.round(v*10)/10).toString() : Math.floor(v).toString();
  if(G && G.sci){ const e=Math.floor(Math.log10(v)); return (v/Math.pow(10,e)).toFixed(2)+'e'+e; }
  let i=0; while(v>=1000 && i<SUF.length-1){ v/=1000; i++; }
  return v.toFixed(v<10?2:v<100?1:0)+SUF[i];
}
export const esc = x => String(x).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
