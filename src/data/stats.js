// Statistiques : valeur initiale et ordre d'application des modificateurs (pli de gauche a droite).
// L'ordre historique est fige : il reproduit au bit pres les formules d'avant la phase 3.
// Les groupes '@node', '@upgrade', '@temporary' sont les emplacements des modificateurs ajoutes plus tard :
// une nouvelle source se place dans son groupe sans modifier ce fichier (voir docs/AJOUTER-UN-NOEUD.md).
// 'BASE' et 'GROWTH' (courbes de cout) : prix de base, puis croissance grow^n.
import { pct, flat, flatAdd } from './mods.js';

// node : la statistique se calcule pour un noeud (conditions 'type:' et 'spec:' permises)
export const STATS = {
  speed:          {init:1, node:true, order:['spec.spd','level','tier','mastery','@node','glob.spd','pu.spd','overclock','tech.tspd','@upgrade','event.surge','@temporary']},
  value:          {init:1, node:true, order:['spec.val','@node','@upgrade','@temporary']},
  revenue:        {init:1, order:['glob.rev','quantum','ach','pu.rev','tech.trev','@upgrade','event.traffic','@temporary']},
  seed:           {init:'val', order:['glob.seed','tech.tseed','@upgrade','@temporary']},
  crit:           {init:0, order:['glob.crit','tech.tcrit','@upgrade','@temporary']},
  buffer:         {init:3, order:['glob.buf','@upgrade']},
  research:       {init:'0.5 v^0.3', order:['tech.tlab','@upgrade','@temporary']},
  ocEnd:          {init:'temps de jeu', order:['ocBase','tech.toc','@upgrade']},
  ocCooldown:     {init:0, min:30, order:['ocCool','tech.toc','@upgrade']},
  offline:        {init:0.4, order:['pu.off','@upgrade']},
  'cost.node':    {init:1, node:true, order:['event.sale','inflation','scale','BASE','GROWTH','pu.disc','tech.tcost','@node','@upgrade','@temporary']},
  'cost.upgrade': {init:1, node:true, order:['event.sale','inflation','scale','BASE','upgradeScale','GROWTH','tech.tup','spec.eco','@node','@upgrade','@temporary','upgradeFee']},
  'cost.global':  {init:1, order:['event.sale','inflation','scale','BASE','GROWTH','@upgrade','@temporary']},
  'cost.quantum': {init:1, order:['BASE','GROWTH']},
  'cost.tech':    {init:1, order:['BASE','GROWTH']},
};
export const GROUPS = ['node','upgrade','temporary'];

// croissance du prix : par exemplaire deja achete (noeuds) et par niveau (ameliorations d'un noeud)
export const NODE_GROW = 1.28, UPGRADE_GROW = 1.6;
// palier : x1,5 de vitesse tous les 10 niveaux
export const tierMult = lv => Math.pow(1.5, Math.floor(lv/10));

// Sources systeme. lvl : niveau de la source ('level' niveau du noeud, 'rank' rang de maitrise, 'ach' nombre de succes,
// 'qpMult' bonus des points quantiques, 'inflation' facteur d'inflation, 'one' toujours 1).
export const SYSTEM_MODS = [
  {id:'level',        stat:'speed', lvl:'level', by:pct(30)},
  {id:'tier',         stat:'speed', lvl:'level', by:{op:'mul', f:tierMult}},
  {id:'mastery',      stat:'speed', lvl:'rank', by:pct(4)},
  {id:'overclock',    stat:'speed', when:'overclock', by:flat(2)},
  {id:'quantum',      stat:'revenue', lvl:'qpMult', by:{op:'mul', f:l=>l}},
  {id:'ach',          stat:'revenue', lvl:'ach', by:pct(2)},
  {id:'ocBase',       stat:'ocEnd', by:flatAdd(15)},
  {id:'ocCool',       stat:'ocCooldown', by:flatAdd(90)},
  ...['cost.node','cost.upgrade','cost.global'].flatMap(stat=>[
    {id:'inflation', stat, lvl:'inflation', by:{op:'mul', f:l=>l}},
    {id:'scale',     stat, by:flat(1.5)},     // echelle globale des prix (equilibrage)
  ]),
  {id:'upgradeScale', stat:'cost.upgrade', by:flat(0.8)},
  {id:'upgradeFee',   stat:'cost.upgrade', by:flatAdd(10)},
];
