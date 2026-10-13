// Couts, multiplicateurs et formules d'economie (prix, vitesses, revenus, points quantiques, maitrise, schemas).
import { G } from './state.js';
import { DEFS, TIERS } from '../data/nodes.js';
import { price, stat } from './stats.js';
import { specsOfType } from './registry.js';
import { NODE_GROW, UPGRADE_GROW, tierMult } from '../data/stats.js';

export const techCost = d => price('cost.tech', d.base, d.grow, G.tech[d.id]);
export const startCash = l => Math.floor((100 + 150 * l * l) * (G ? infl() : 1));
export const achCount = () => Object.keys(G.ach).length;
export const qpMult = q => Math.pow(1 + q, 0.6);   // bonus de revenus des points quantiques (sous-linéaire)
export const INFL = 0.9, FREEQ = 2;   // inflation : part du bonus quantique (au-delà des FREEQ premiers points) répercutée sur les prix
export const infl = () => Math.pow(qpMult(Math.max(0, G.qpTotal - FREEQ)), INFL);
export const buyCost = (type,extra=0) => price('cost.node', DEFS[type].cost, NODE_GROW, (G.bought[type]||0)+extra, {type});
export const specsFor = n => specsOfType(n.type);
export const tierOf = lv => Math.min(TIERS.length-1, Math.floor(lv/10));
export const vmult = n => stat('value', n);
export const upCost = (n, lvl) => price('cost.upgrade', DEFS[n.type].cost, UPGRADE_GROW, lvl===undefined?n.level:lvl, n);
export const gUpCost = d => price('cost.global', d.base, d.grow, G.glob[d.id]);
export const puCost = d => price('cost.quantum', d.base, d.grow, G.pu[d.id]);
// Maitrise : chaque type de noeud gagne des rangs avec le nombre de fichiers traites (permanent, +4 % de vitesse par rang)
export const MASTTH = [200,1200,7200,43000,260000,1.5e6,9.3e6,5.6e7];
const mastRank = type => { const c = G.mast[type]||0; let r=0; while(r<MASTTH.length && c>=MASTTH[r]) r++; return r; };
export const RKC = {};
export const rankOf = t => RKC[t]===undefined ? (RKC[t]=mastRank(t)) : RKC[t];
const lvlMult = tierMult;
export const speedOf = (n,lv=n.level) => stat('speed', n, lv);
export const timeOf = n => DEFS[n.type].t / speedOf(n);
export const bufCap = () => stat('buffer');
export const revMult = () => stat('revenue');
export const critChance = () => stat('crit');
export const seedV = def => stat('seed', null, 0, def.val);
export const rpOf = v => stat('research', null, 0, 0.5*Math.pow(v,0.3));
// Crédits à gagner dans un run pour obtenir g points quantiques : de plus en plus durs à obtenir
const QPB = 0.1;
export const qpNeed = g => 1e5*Math.pow(g,2.8)*Math.exp(QPB*Math.min(48, Math.pow(Math.log(1+g),2)));
export const qpGain = () => { let lo=0, hi=1e7; while(hi-lo>1){ const m=Math.floor((lo+hi)/2); if(qpNeed(m)<=G.run) lo=m; else hi=m; } return lo; };
export const bpIsLab = b => b.nodes.some(n=>n[0]==='lab');
const bpTypes = b => [...new Set(b.nodes.map(n=>n[0]))];
export const bpUnlocked = b => bpTypes(b).every(unlocked);
export const bpLocked = b => bpTypes(b).filter(t=>!unlocked(t)).map(t=>DEFS[t].name).join(', ');
export function bpCost(b){ const cnt={}; let s=0; for(const [t] of b.nodes){ s+=buyCost(t,cnt[t]||0); cnt[t]=(cnt[t]||0)+1; } return s; }
export const unlocked = type => G.run >= DEFS[type].unlock && (!DEFS[type].needRs || G.resets>=DEFS[type].needRs);
export const sellVal = n => Math.floor(buyCost(n.type)*0.4);
export function bulkCost(n,count){ let s=0; for(let i=0;i<count;i++) s+=upCost(n,n.level+i); return s; }
export function maxAffordable(n){ let c=0,s=0; while(c<500){ const u=upCost(n,n.level+c); if(s+u>G.money) break; s+=u; c++; } return c; }
