// Donnees des noeuds : dimensions, types, couleurs, paliers de niveau et specialisations.
export const NW = 160, NH = 70;
export const DEFS = {
  source:  {name:'Source',        icon:'SRC', ins:0, outs:1, cost:15,    t:1.0,  val:1,    unlock:0,   desc:'Génère un fichier de valeur 1.'},
  upload:  {name:'Upload',        icon:'UP', ins:3, outs:0, cost:20,    t:0.6,  unlock:0,           desc:'Envoie les fichiers vers le cloud et rapporte des crédits. 3 entrées.'},
  compress:{name:'Compresseur',   icon:'CMP', ins:1, outs:1, cost:40,    t:0.8,  mult:2,   unlock:0, desc:'Double la valeur d\'un fichier.'},
  split:   {name:'Diviseur',      icon:'DIV', ins:1, outs:2, cost:60,    t:0.2,  unlock:20,          desc:'Répartit les fichiers sur deux sorties, en alternance.'},
  merge:   {name:'Fusion',        icon:'FUS', ins:2, outs:1, cost:140,   t:1.0,  unlock:100,         desc:'Fusionne 2 fichiers : (a + b) × 1,3.'},
  encrypt: {name:'Chiffreur',     icon:'ENC', ins:1, outs:1, cost:300,   t:3.0,  mult:3,   unlock:200, desc:'Triple la valeur d\'un fichier.'},
  boost:   {name:'Amplificateur',  icon:'AMP', ins:1, outs:1, cost:500,   t:0.4,  mult:1.5, unlock:400, desc:'Valeur x1,5, très rapide. Idéal en fin de chaîne.'},
  clone:   {name:'Clonage',       icon:'CLN', ins:1, outs:2, cost:900,   t:1.2,  unlock:600,         desc:'Duplique un fichier sur les deux sorties.'},
  sorter:  {name:'Trieur',        icon:'TRI', ins:1, outs:2, cost:1200,  t:0.15, unlock:800,         desc:'Envoie les gros fichiers (valeur au-dessus du seuil) vers la sortie du haut, les autres vers le bas.'},
  ai:      {name:'Analyseur IA',  icon:'IA', ins:1, outs:1, cost:2000,  t:6.0,  mult:5,   unlock:1500, desc:'Valeur ×5. Lent mais puissant.'},
  lab:     {name:'Laboratoire',   icon:'LAB', ins:3, outs:0, cost:2500,  t:1.5,  unlock:2000, desc:'Absorbe les fichiers et produit des points de recherche. 3 entrées.'},
  mega:    {name:'Super Source',  icon:'SRC+', ins:0, outs:1, cost:6000,  t:3.0,  val:10,   unlock:4000, desc:'Génère des fichiers de valeur 10.'},
  quantum: {name:'Quantique',     icon:'QNT', ins:1, outs:1, cost:40000, t:12.0, mult:10,  unlock:25000, desc:'Valeur ×10. Très lent, très puissant.'},
  sing:    {name:'Singularité',   icon:'SNG', ins:1, outs:1, cost:2e6,   t:30.0, mult:22,  unlock:1e6, needRs:3, desc:'Valeur ×22. Réservé aux joueurs ayant fait 3 Reboots.'},
  neural:  {name:'Réseau neuronal',icon:'NET', ins:1, outs:1, cost:1e8,   t:70.0, mult:21,  unlock:4e7, needRs:5, desc:'Valeur ×21. Réservé aux joueurs ayant fait 5 Reboots.'},
  dim:     {name:'Dimension',     icon:'DIM', ins:1, outs:1, cost:6e9,   t:160.0,mult:20,  unlock:2e9, needRs:8, desc:'Valeur ×20. Réservé aux joueurs ayant fait 8 Reboots.'},
  omega:   {name:'Oméga',         icon:'OMG', ins:1, outs:1, cost:3.5e11,t:360.0,mult:20,  unlock:1e11, needRs:11, desc:'Valeur ×20. Le sommet, après 11 Reboots.'},
};
export const ORDER = Object.keys(DEFS);
export const COLORS = {source:'#4fd1c5',upload:'#f6c453',split:'#9f7aea',compress:'#63b3ed',merge:'#f687b3',encrypt:'#68d391',clone:'#f6ad55',sorter:'#a3e635',boost:'#ecc94b',ai:'#fc8181',mega:'#38b2ac',lab:'#76e4f7',quantum:'#b794f4',sing:'#ffffff',neural:'#f56565',dim:'#ed64a6',omega:'#faf089'};
export const SPECS = {spd:{name:'Turbo',desc:'Vitesse ×1,25'}, val:{name:'Rendement',desc:'Valeur ×1,25 (sources, Upload)'}, eco:{name:'Économe',desc:'Améliorations de ce nœud -30 %'}};
export const TIERS = [['Brut','#8794b3'],['Bronze','#d69e6b'],['Argent','#cbd5e0'],['Or','#f6c453'],['Platine','#76e4f7'],['Diamant','#b794f4'],['Mythique','#f687b3'],['Légende','#ffffff']];
