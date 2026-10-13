// Donnees des evenements reseau.
// Evenements reseau : bonus temporaires aleatoires (leurs modificateurs ne s'appliquent que pendant l'evenement)
import { flat } from './mods.js';

export const EVT = [
  {id:'traffic', name:'Pic de trafic', desc:'Revenus x2',       dur:30, mods:[{stat:'revenue', by:flat(2)}]},
  {id:'surge',   name:'Surtension',    desc:'Vitesse x1,5',     dur:30, mods:[{stat:'speed', by:flat(1.5)}]},
  {id:'sale',    name:'Soldes',        desc:'Prix -30 %',       dur:45, mods:['cost.node','cost.upgrade','cost.global'].map(stat=>({stat, by:flat(0.7)}))},
  {id:'gift',    name:'Don de données',desc:'Crédits offerts',  dur:0},
];
