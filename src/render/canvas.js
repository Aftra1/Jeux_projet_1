// Canvas principal : taille, densite de pixels, conversion ecran -> monde.
import { G } from '../core/state.js';

// Rendu 
export const cv = document.getElementById('c'), cx = cv.getContext('2d');
export let W=0,H=0,DPR=1;
function resize(){ W=innerWidth; DPR=Math.min(window.devicePixelRatio||1, W<=700?2:3); H=innerHeight; cv.width=W*DPR; cv.height=H*DPR; }
addEventListener('resize',resize); resize();
export const toWorld = (sx,sy)=>({x:(sx-W/2-G.view.x)/G.view.k, y:(sy-H/2-G.view.y)/G.view.k});
