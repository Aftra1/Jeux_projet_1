// Donnees des evenements reseau.
// Evenements reseau : bonus temporaires aleatoires (leurs modificateurs ne s'appliquent que pendant l'evenement)
import { addPct, flat } from './mods.js';

// weight : frequence relative (1 par defaut). L'intervalle entre deux evenements est EVT_GAP divise par la somme des poids :
// ajouter un evenement ne change pas la frequence par heure des autres.
// need (facultatif) : mesure (core/progression.js) qui doit etre positive pour que l'evenement puisse etre tire
// (ex. 'count:lab' : au moins un Laboratoire pose) ; sinon il est ignore, sans changer la frequence des autres.
export const EVT_GAP = [880, 560];   // 880 s + 0 a 560 s : avec 4 evenements de poids 1, 220 s + 0 a 140 s comme avant

export const EVT = [
  {id:'traffic', name:'Pic de trafic', desc:'Revenus x2',       dur:30, mods:[{stat:'revenue', by:flat(2)}]},
  {id:'surge',   name:'Surtension',    desc:'Vitesse x1,5',     dur:30, mods:[{stat:'speed', by:flat(1.5)}]},
  {id:'sale',    name:'Soldes',        desc:'Prix -30 %',       dur:45, mods:['cost.node','cost.upgrade','cost.global'].map(stat=>({stat, by:flat(0.7)}))},
  {id:'gift',    name:'Don de données',desc:'Crédits offerts',  dur:0},
  {id:'maint',   name:'Maintenance programmée', desc:'Vitesse x0,7, améliorations de nœuds -50 %', dur:30, mods:[{stat:'speed', by:flat(0.7)}, {stat:'cost.upgrade', by:flat(0.5)}]},
  {id:'lucky',   name:'Serveurs chanceux', desc:'+15 % de chance d\'upload critique', dur:30, mods:[{stat:'crit', by:addPct(15)}]},
  {id:'conf',    name:'Conférence scientifique', desc:'Points de recherche x3', dur:45, need:'count:lab', mods:[{stat:'research', by:flat(3)}]},
];
