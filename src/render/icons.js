// Icones vectorielles des noeuds (canvas et images pour la boutique).
import { DEFS } from '../data/nodes.js';
// Icones vectorielles (dessinees dans un carre de -10 a 10)
const ICONS = {
  source:  c=>{ c.beginPath(); for(let i=0;i<6;i++){ const a=i*Math.PI/3-Math.PI/6; c.lineTo(Math.cos(a)*9,Math.sin(a)*9); } c.closePath(); c.stroke(); c.beginPath(); c.arc(0,0,3,0,7); c.fill(); },
  upload:  c=>{ c.beginPath(); c.moveTo(-8,5); c.bezierCurveTo(-11,5,-11,-1,-6,-1); c.bezierCurveTo(-6,-7,3,-8,4,-2); c.bezierCurveTo(10,-3,11,5,6,5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(0,8); c.lineTo(0,0); c.moveTo(-3,3); c.lineTo(0,0); c.lineTo(3,3); c.stroke(); },
  compress:c=>{ c.beginPath(); c.moveTo(-9,-4); c.lineTo(-3,0); c.lineTo(-9,4); c.moveTo(9,-4); c.lineTo(3,0); c.lineTo(9,4); c.moveTo(0,-8); c.lineTo(0,8); c.stroke(); },
  split:   c=>{ c.beginPath(); c.moveTo(-9,0); c.lineTo(-2,0); c.bezierCurveTo(2,0,2,-6,6,-6); c.lineTo(9,-6); c.moveTo(-2,0); c.bezierCurveTo(2,0,2,6,6,6); c.lineTo(9,6); c.stroke(); c.beginPath(); c.arc(9,-6,1.6,0,7); c.arc(9,6,1.6,0,7); c.fill(); },
  merge:   c=>{ c.beginPath(); c.moveTo(-9,-6); c.lineTo(-6,-6); c.bezierCurveTo(-2,-6,-2,0,2,0); c.lineTo(9,0); c.moveTo(-9,6); c.lineTo(-6,6); c.bezierCurveTo(-2,6,-2,0,2,0); c.stroke(); c.beginPath(); c.arc(-9,-6,1.6,0,7); c.arc(-9,6,1.6,0,7); c.fill(); },
  encrypt: c=>{ c.beginPath(); c.rect(-6,-1,12,9); c.stroke(); c.beginPath(); c.moveTo(-3.5,-1); c.lineTo(-3.5,-4); c.arc(0,-4,3.5,Math.PI,0); c.lineTo(3.5,-1); c.stroke(); c.beginPath(); c.arc(0,3.5,1.5,0,7); c.fill(); },
  boost:   c=>{ c.beginPath(); c.moveTo(3,-10); c.lineTo(-6,2); c.lineTo(-0.5,2); c.lineTo(-3,10); c.lineTo(6,-2); c.lineTo(0.5,-2); c.closePath(); c.fill(); },
  clone:   c=>{ c.beginPath(); c.rect(-9,-9,11,11); c.stroke(); c.beginPath(); c.rect(-2,-2,11,11); c.stroke(); },
  sorter:  c=>{ c.beginPath(); c.moveTo(-9,-8); c.lineTo(9,-8); c.lineTo(2,0); c.lineTo(2,8); c.lineTo(-2,6); c.lineTo(-2,0); c.closePath(); c.stroke(); },
  ai:      c=>{ c.beginPath(); c.rect(-5,-5,10,10); c.stroke(); for(const p of [-3,3]){ c.beginPath(); c.moveTo(p,-5); c.lineTo(p,-9); c.moveTo(p,5); c.lineTo(p,9); c.moveTo(-5,p); c.lineTo(-9,p); c.moveTo(5,p); c.lineTo(9,p); c.stroke(); } c.beginPath(); c.arc(0,0,2,0,7); c.fill(); },
  lab:     c=>{ c.beginPath(); c.moveTo(-3,-9); c.lineTo(3,-9); c.moveTo(-2,-9); c.lineTo(-2,-2); c.lineTo(-8,8); c.lineTo(8,8); c.lineTo(2,-2); c.lineTo(2,-9); c.stroke(); c.beginPath(); c.moveTo(-5,3); c.lineTo(5,3); c.stroke(); },
  mega:    c=>{ c.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, r=i%2?4:10; c.lineTo(Math.cos(a)*r,Math.sin(a)*r); } c.closePath(); c.fill(); },
  quantum: c=>{ for(let i=0;i<3;i++){ c.save(); c.rotate(i*Math.PI/3); c.beginPath(); c.ellipse(0,0,10,3.8,0,0,7); c.stroke(); c.restore(); } c.beginPath(); c.arc(0,0,2,0,7); c.fill(); },
  sing:    c=>{ c.beginPath(); for(let i=0;i<40;i++){ const a=i*0.5, r=0.5+i*0.23; c.lineTo(Math.cos(a)*r,Math.sin(a)*r); } c.stroke(); },
  neural:  c=>{ const P=[[-8,-6],[-8,0],[-8,6],[0,-4],[0,4],[8,0]]; c.beginPath(); for(const a of P.slice(0,3)) for(const b of P.slice(3,5)){ c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); } for(const b of P.slice(3,5)){ c.moveTo(b[0],b[1]); c.lineTo(8,0); } c.stroke(); c.beginPath(); for(const p of P){ c.moveTo(p[0]+2,p[1]); c.arc(p[0],p[1],2,0,7); } c.fill(); },
  dim:     c=>{ c.beginPath(); c.moveTo(0,-9); c.lineTo(8,-4.5); c.lineTo(8,4.5); c.lineTo(0,9); c.lineTo(-8,4.5); c.lineTo(-8,-4.5); c.closePath(); c.moveTo(-8,-4.5); c.lineTo(0,0); c.lineTo(8,-4.5); c.moveTo(0,0); c.lineTo(0,9); c.stroke(); },
  omega:   c=>{ c.beginPath(); c.moveTo(-9,8); c.lineTo(-4,8); c.bezierCurveTo(-8,4,-8,-9,0,-9); c.bezierCurveTo(8,-9,8,4,4,8); c.lineTo(9,8); c.stroke(); }
};
// Type sans icone dessinee : trace SVG de l'entree (icon), sinon son texte court (label)
const FALLBACK = {};
function fallbackIcon(type){
  const d = DEFS[type]; if(!d) return null;
  if(d.icon){ const p = new Path2D(d.icon); return c=>c.stroke(p); }
  return c=>{ c.font = '700 7px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.label, 0, 0.5); };
}
export function drawIcon(c, type, x, y, s, col){
  const f = ICONS[type] || FALLBACK[type] || (FALLBACK[type] = fallbackIcon(type)); if(!f) return;
  c.save(); c.translate(x,y); c.scale(s/10,s/10);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.7*(10/s>1.4?1.4:1); c.lineCap = 'round'; c.lineJoin = 'round';
  f(c); c.restore();
}
const iconURL = {};
export function iconImg(type, col){
  if(iconURL[type]) return iconURL[type];
  const o = document.createElement('canvas'); o.width = o.height = 48; const c = o.getContext('2d');
  drawIcon(c, type, 24, 24, 20, col); return iconURL[type] = o.toDataURL();
}
