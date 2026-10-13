// Lance le bot d'equilibrage (tools/bot.mjs) dans Node et ecrit une ligne JSON par evenement.
// Usage : node tools/balance.mjs [heures] [options JSON] | node tools/table.cjs
// Option "seed" (entier) : rend l'execution reproductible (generateur aleatoire seede).
import { runBot } from './bot.mjs';
const hours = parseFloat(process.argv[2]||'3'), opt = JSON.parse(process.argv[3]||'{}');
if(opt.seed!==undefined){ let a = opt.seed>>>0; Math.random = ()=>{ a = (a + 0x6D2B79F5)>>>0; let t = a; t = Math.imul(t ^ (t>>>15), t|1); t ^= t + Math.imul(t ^ (t>>>7), t|61); return ((t ^ (t>>>14))>>>0)/4294967296; }; }
for(const l of runBot(hours, opt)) console.log(JSON.stringify(l));
