// Donnees des ameliorations : globales (credits), quantiques (prestige) et recherche.
// Texte d'effet : celui de l'assistant du premier modificateur (pct, less...), sauf eff explicite : eff(niveau, {fmt, startCash}).
import { addPct, less, pct, plus } from './mods.js';

export const GLOBALS = [
  {id:'rev',  name:'Marketing',          desc:'+25 % de revenus par upload',          base:100, grow:2.1, max:60, mods:[{stat:'revenue', by:pct(25)}]},
  {id:'spd',  name:'Fibre optique',      desc:'+10 % de vitesse partout',             base:250, grow:2.4, max:45, mods:[{stat:'speed', by:pct(10)}]},
  {id:'seed', name:'Meilleurs capteurs', desc:'+20 % de valeur des fichiers produits par les Sources',      base:500, grow:2.8, max:30, mods:[{stat:'seed', by:pct(20)}]},
  {id:'buf',  name:'Mémoire tampon',     desc:'+1 capacité des files d\'attente',     base:400, grow:2.4, max:6, mods:[{stat:'buffer', by:plus(1)}]},
  {id:'crit', name:'Upload chanceux',    desc:'+3 % de chance d\'upload ×5',          base:1500,grow:2.6, max:20, mods:[{stat:'crit', by:addPct(3)}]},
];
export const PU = [
  {id:'start', name:'Capital de départ',     desc:'Démarre chaque run avec plus de crédits (proportionnel à la hausse des prix)', base:1, grow:2, max:8, eff:(l,h)=>'Crédits de départ : '+h.fmt(h.startCash(l))},
  {id:'spd',   name:'Surcadençage',          desc:'+5 % de vitesse permanente',             base:1, grow:2, max:16, mods:[{stat:'speed', by:pct(5)}]},
  {id:'disc',  name:'Négociation',           desc:'-5 % sur le prix des nœuds par niveau', base:2, grow:2, max:6,  mods:[{stat:'cost.node', by:less(5)}]},
  {id:'off',   name:'Serveurs de nuit',      desc:'+8 % de gains hors-ligne (base 40 %, 3 h max)',   base:2, grow:2, max:5,  eff:l=>(40+l*8)+' %', mods:[{stat:'offline', by:addPct(8)}]},
  {id:'rev',   name:'Amplificateur quantique', desc:'+10 % de revenus permanents', base:3, grow:2, max:16, mods:[{stat:'revenue', by:pct(10)}]},
  {id:'auto',  name:'Ingénieur automatique', desc:'Améliore automatiquement tes nœuds',      base:10,grow:1, max:1,  eff:l=>l?'Actif':'—'},
];
export const TECH = [
  {id:'trev', name:'Algorithmes de revenu',   desc:'+8 % de revenus par niveau',                base:20, grow:1.9, max:24, mods:[{stat:'revenue', by:pct(8)}]},
  {id:'tspd', name:'Architecture parallèle',  desc:'+4 % de vitesse par niveau',                base:25, grow:1.9, max:24, mods:[{stat:'speed', by:pct(4)}]},
  {id:'tseed',name:'Formats optimisés',       desc:'+8 % de valeur des fichiers des Sources par niveau', base:35, grow:1.8, max:24, mods:[{stat:'seed', by:pct(8)}]},
  {id:'tcost',name:'Économies d\'échelle',    desc:'-2 % sur le prix des nœuds par niveau',     base:40, grow:2.0, max:10, mods:[{stat:'cost.node', by:less(2)}]},
  {id:'tup',  name:'Maintenance prédictive',  desc:'-3 % sur le prix des améliorations',        base:50, grow:2.1, max:10, mods:[{stat:'cost.upgrade', by:less(3)}]},
  {id:'tcrit',name:'Compression adaptative',  desc:'+2 % de chance d\'upload critique',         base:60, grow:2.0, max:10, mods:[{stat:'crit', by:addPct(2)}]},
  {id:'toc',  name:'Refroidissement liquide', desc:'Overclock +1 s de durée et -6 s de recharge', base:80, grow:1.8, max:10, eff:l=>'+'+l+' s / -'+l*6+' s', mods:[{stat:'ocEnd', by:plus(1)}, {stat:'ocCooldown', by:plus(-6)}]},
  {id:'tlab', name:'Instruments de mesure',   desc:'+20 % de points de recherche par niveau',   base:30, grow:1.8, max:10, mods:[{stat:'research', by:pct(20)}]},
];
