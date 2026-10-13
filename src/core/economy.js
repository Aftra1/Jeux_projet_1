// Couts, multiplicateurs et formules d'economie (prix, vitesses, revenus, points quantiques, maitrise, schemas).
import { G } from './state.js';
import { evActive } from './events.js';
import { ocActive } from './prestige.js';
import { DEFS, TIERS } from '../data/nodes.js';

export const techCost = d => Math.ceil(d.base * Math.pow(d.grow, G.tech[d.id]));
export const startCash = l => Math.floor((100 + 150 * l * l) * (G ? infl() : 1));
export const achCount = () => Object.keys(G.ach).length;
export const qpMult = q => Math.pow(1 + q, 0.6);   // bonus de revenus des points quantiques (sous-linéaire)
const BG = 1.28;   // croissance du prix par exemplaire déjà acheté
const CS = 1.5;   // échelle globale des prix (équilibrage)
export const INFL = 0.9, FREEQ = 2;   // inflation : part du bonus quantique (au-delà des FREEQ premiers points) répercutée sur les prix
export const infl = () => Math.pow(qpMult(Math.max(0, G.qpTotal - FREEQ)), INFL);
const saleMult = () => evActive('sale') ? 0.7 : 1;
export const buyCost = (type,extra=0) => Math.ceil(saleMult() * infl() * CS * DEFS[type].cost * Math.pow(BG, (G.bought[type]||0)+extra) * (1 - 0.05*G.pu.disc) * (1 - 0.02*G.tech.tcost));
export const specsFor = n => ('val' in DEFS[n.type] || n.type==='upload') ? ['spd','val','eco'] : ['spd','eco'];
export const tierOf = lv => Math.min(TIERS.length-1, Math.floor(lv/10));
export const vmult = n => n.spec==='val' && ('val' in DEFS[n.type] || n.type==='upload') ? 1.25 : 1;
export const upCost = (n, lvl) => Math.ceil(saleMult() * infl() * CS * DEFS[n.type].cost * 0.8 * Math.pow(1.6, lvl===undefined?n.level:lvl) * (1 - 0.03*G.tech.tup) * (n.spec==='eco'?0.7:1) + 10);
export const gUpCost = d => Math.ceil(saleMult() * infl() * CS * d.base * Math.pow(d.grow, G.glob[d.id]));
export const puCost = d => Math.ceil(d.base * Math.pow(d.grow, G.pu[d.id]) * (d.grow===1?1:1));
// Maitrise : chaque type de noeud gagne des rangs avec le nombre de fichiers traites (permanent, +4 % de vitesse par rang)
export const MASTTH = [200,1200,7200,43000,260000,1.5e6,9.3e6,5.6e7];
const mastRank = type => { const c = G.mast[type]||0; let r=0; while(r<MASTTH.length && c>=MASTTH[r]) r++; return r; };
export const RKC = {};
export const rankOf = t => RKC[t]===undefined ? (RKC[t]=mastRank(t)) : RKC[t];
const lvlMult = lv => Math.pow(1.5, Math.floor(lv/10));   // palier : x1,5 de vitesse tous les 10 niveaux
export const speedOf = (n,lv=n.level) => (n.spec==='spd'?1.25:1) * (1 + 0.3*lv) * lvlMult(lv) * (1 + 0.04*rankOf(n.type)) * (1 + 0.1*G.glob.spd) * (1 + 0.05*G.pu.spd) * (ocActive()?2:1) * (1 + 0.04*G.tech.tspd) * (evActive('surge')?1.5:1);
export const timeOf = n => DEFS[n.type].t / speedOf(n);
export const bufCap = () => 3 + G.glob.buf;
export const revMult = () => (1 + 0.25*G.glob.rev) * qpMult(G.qpTotal) * (1 + 0.02*achCount()) * (1 + 0.1*G.pu.rev) * (1 + 0.08*G.tech.trev) * (evActive('traffic')?2:1);
export const critChance = () => 0.03*G.glob.crit + 0.02*G.tech.tcrit;
export const seedV = def => def.val * (1 + 0.2*G.glob.seed) * (1 + 0.08*G.tech.tseed);
export const rpOf = v => 0.5*Math.pow(v,0.3)*(1+0.2*G.tech.tlab);
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
