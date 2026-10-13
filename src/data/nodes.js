// Donnees des noeuds : dimensions, registre des types, paliers de niveau et specialisations.
// Un type = une entree. Comportement : genre (kind) defini dans core/kinds.js, avec ses parametres :
//   producer {val}            produit des fichiers de valeur val (sans entree)
//   transform {mult, out}     un fichier en entree, valeur x mult ; out : 'next' (alternance), 'copy' (une copie par sortie), 'threshold' (seuil thr)
//   combine {f}               attend un fichier sur chaque entree, valeur f(a, b, ...)
//   sink {reward}             consomme les fichiers : 'credits' (Upload) ou 'research' (Laboratoire)
// Champs communs : name, label (texte court), color, desc, ins, outs, t (s), cost, unlock (credits du run), needRs (Reboots),
// icon (trace SVG facultatif, sinon icone dessinee de render/icons.js ou pastille texte), params (reglages par noeud).
// Verification au chargement (core/registry.js) : genre, champ ou parametre inconnu = erreur explicite.
import { flat } from './mods.js';

export const NW = 160, NH = 70;
export const DEFS = {
  source:  {name:'Source',        label:'SRC', color:'#4fd1c5', kind:'producer', val:1,   ins:0, outs:1, cost:15,    t:1.0,  unlock:0,   desc:'Génère un fichier de valeur 1.'},
  upload:  {name:'Upload',        label:'UP',  color:'#f6c453', kind:'sink', reward:'credits', ins:3, outs:0, cost:20,    t:0.6,  unlock:0,           desc:'Envoie les fichiers vers le cloud et rapporte des crédits. 3 entrées.'},
  compress:{name:'Compresseur',   label:'CMP', color:'#63b3ed', kind:'transform', mult:2,   ins:1, outs:1, cost:40,    t:0.8,  unlock:0, desc:'Double la valeur d\'un fichier.'},
  split:   {name:'Diviseur',      label:'DIV', color:'#9f7aea', kind:'transform',           ins:1, outs:2, cost:60,    t:0.2,  unlock:20,          desc:'Répartit les fichiers sur deux sorties, en alternance.'},
  merge:   {name:'Fusion',        label:'FUS', color:'#f687b3', kind:'combine', f:(a,b)=>(a+b)*1.3, ins:2, outs:1, cost:140,   t:1.0,  unlock:100,         desc:'Fusionne 2 fichiers : (a + b) × 1,3.'},
  encrypt: {name:'Chiffreur',     label:'ENC', color:'#68d391', kind:'transform', mult:3,   ins:1, outs:1, cost:300,   t:3.0,  unlock:200, desc:'Triple la valeur d\'un fichier.'},
  boost:   {name:'Amplificateur',  label:'AMP', color:'#ecc94b', kind:'transform', mult:1.5, ins:1, outs:1, cost:500,   t:0.4,  unlock:400, desc:'Valeur x1,5, très rapide. Idéal en fin de chaîne.'},
  clone:   {name:'Clonage',       label:'CLN', color:'#f6ad55', kind:'transform', out:'copy', ins:1, outs:2, cost:900,   t:1.2,  unlock:600,         desc:'Duplique un fichier sur les deux sorties.'},
  sorter:  {name:'Trieur',        label:'TRI', color:'#a3e635', kind:'transform', out:'threshold', params:{thr:{def:10, min:1, label:'Seuil'}}, ins:1, outs:2, cost:1200,  t:0.15, unlock:800, desc:'Envoie les gros fichiers (valeur au-dessus du seuil) vers la sortie du haut, les autres vers le bas.'},
  ai:      {name:'Analyseur IA',  label:'IA',  color:'#fc8181', kind:'transform', mult:5,   ins:1, outs:1, cost:2000,  t:6.0,  unlock:1500, desc:'Valeur ×5. Lent mais puissant.'},
  lab:     {name:'Laboratoire',   label:'LAB', color:'#76e4f7', kind:'sink', reward:'research', ins:3, outs:0, cost:2500,  t:1.5,  unlock:2000, desc:'Absorbe les fichiers et produit des points de recherche. 3 entrées.'},
  hub:     {name:'Concentrateur', label:'CON', color:'#fda4af', kind:'combine', f:(a,b,c)=>(a+b+c)*1.4, ins:3, outs:1, cost:4000,  t:1.5,  unlock:3000, desc:'Fusionne 3 fichiers : (a + b + c) × 1,4.',
            icon:'M-9 -7 L0 0 M-9 0 L0 0 M-9 7 L0 0 L9 0 M5 -4 L9 0 L5 4'},
  mega:    {name:'Super Source',  label:'SRC+', color:'#38b2ac', kind:'producer', val:10,  ins:0, outs:1, cost:6000,  t:3.0,  unlock:4000, desc:'Génère des fichiers de valeur 10.'},
  quantum: {name:'Quantique',     label:'QNT', color:'#b794f4', kind:'transform', mult:10,  ins:1, outs:1, cost:40000, t:12.0, unlock:25000, desc:'Valeur ×10. Très lent, très puissant.'},
  cloud:   {name:'Serveur cloud', label:'CLD', color:'#90cdf4', kind:'sink', reward:'credits', ins:5, outs:0, cost:2e5, t:0.3, unlock:150000, needRs:1, desc:'Envoie les fichiers vers le cloud, deux fois plus vite que l\'Upload. 5 entrées. Réservé aux joueurs ayant fait 1 Reboot.',
            icon:'M-8 6 L7 6 A4 4 0 0 0 7 -2 A6 6 0 0 0 -4 -4 A5 5 0 0 0 -8 6 Z'},
  sing:    {name:'Singularité',   label:'SNG', color:'#ffffff', kind:'transform', mult:22,  ins:1, outs:1, cost:2e6,   t:30.0, unlock:1e6, needRs:3, desc:'Valeur ×22. Réservé aux joueurs ayant fait 3 Reboots.'},
  neural:  {name:'Réseau neuronal',label:'NET', color:'#f56565', kind:'transform', mult:21,  ins:1, outs:1, cost:1e8,   t:70.0, unlock:4e7, needRs:5, desc:'Valeur ×21. Réservé aux joueurs ayant fait 5 Reboots.'},
  dim:     {name:'Dimension',     label:'DIM', color:'#ed64a6', kind:'transform', mult:20,  ins:1, outs:1, cost:6e9,   t:160.0, unlock:2e9, needRs:8, desc:'Valeur ×20. Réservé aux joueurs ayant fait 8 Reboots.'},
  omega:   {name:'Oméga',         label:'OMG', color:'#faf089', kind:'transform', mult:20,  ins:1, outs:1, cost:3.5e11, t:360.0, unlock:1e11, needRs:11, desc:'Valeur ×20. Le sommet, après 11 Reboots.'},
};
// derives du registre (completes par registerNode pour un type ajoute a l'execution)
export const ORDER = Object.keys(DEFS);
export const COLORS = Object.fromEntries(ORDER.map(t=>[t, DEFS[t].color]));
export const SPECS = {
  spd:{name:'Turbo', desc:'Vitesse ×1,25', mods:[{stat:'speed', by:flat(1.25)}]},
  val:{name:'Rendement', desc:'Valeur ×1,25 (sources, Upload, Serveur cloud)', mods:[{stat:'value', by:flat(1.25)}]},
  eco:{name:'Économe', desc:'Améliorations de ce nœud -30 %', mods:[{stat:'cost.upgrade', by:flat(0.7)}]},
};
export const TIERS = [['Brut','#8794b3'],['Bronze','#d69e6b'],['Argent','#cbd5e0'],['Or','#f6c453'],['Platine','#76e4f7'],['Diamant','#b794f4'],['Mythique','#f687b3'],['Légende','#ffffff']];
