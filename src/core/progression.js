// Progression : succes (ACH) et objectifs (OBJ).
import { emit } from './bus.js';
import { G } from './state.js';
import { fmt } from './format.js';
import { rankOf } from './economy.js';

   // suit l'inflation des prix

export const ACH = [
  {id:'a1', name:'Premier upload',   desc:'Uploade 1 fichier',           t:()=>G.files>=1},
  {id:'a2', name:'Débutant',         desc:'Uploade 100 fichiers',        t:()=>G.files>=100},
  {id:'a3', name:'Pro du cloud',     desc:'Uploade 5 000 fichiers',      t:()=>G.files>=5000},
  {id:'a4', name:'Datacenter',       desc:'Uploade 100 000 fichiers',    t:()=>G.files>=1e5},
  {id:'a5', name:'Premier millier',  desc:'Gagne 1 000 crédits au total',t:()=>G.lifetime>=1e3},
  {id:'a6', name:'Millionnaire',     desc:'Gagne 1 M de crédits',        t:()=>G.lifetime>=1e6},
  {id:'a7', name:'Milliardaire',     desc:'Gagne 1 Md de crédits',       t:()=>G.lifetime>=1e9},
  {id:'a8', name:'Tycoon',           desc:'Gagne 1 T de crédits',        t:()=>G.lifetime>=1e12},
  {id:'a9', name:'Architecte',       desc:'Pose 10 nœuds en même temps',t:()=>G.nodes.length>=10},
  {id:'a10',name:'Usine',            desc:'Pose 25 nœuds en même temps',t:()=>G.nodes.length>=25},
  {id:'a11',name:'Collectionneur',   desc:'Utilise 8 types de nœuds différents', t:()=>new Set(G.nodes.map(n=>n.type)).size>=8},
  {id:'a12',name:'Rapide',           desc:'Atteins 100 crédits/s',       t:()=>G.lastRate>=100},
  {id:'a13',name:'Turbo',            desc:'Atteins 10 000 crédits/s',    t:()=>G.lastRate>=1e4},
  {id:'a14',name:'Renaissance',      desc:'Fais un Reboot quantique',    t:()=>G.resets>=1},
  {id:'a15',name:'Habitué',          desc:'Fais 5 Reboots',              t:()=>G.resets>=5},
  {id:'a16',name:'Chanceux',         desc:'Attrape un fichier doré',     t:()=>G.golds>=1},
  {id:'a18',name:'Chercheur',        desc:'Produis 500 points de recherche', t:()=>G.rpTotal>=500},
  {id:'a19',name:'Millions de fichiers', desc:'Uploade 1 000 000 de fichiers', t:()=>G.files>=1e6},
  {id:'a20',name:'Centaine',         desc:'Pose 50 nœuds en même temps', t:()=>G.nodes.length>=50},
  {id:'a21',name:'Vétéran',          desc:'Fais 15 Reboots',             t:()=>G.resets>=15},
  {id:'a22',name:'Maître ingénieur', desc:'Un nœud au niveau 50',        t:()=>G.nodes.some(n=>n.level>=49)},
  {id:'a23',name:'Légende',          desc:'Gagne 1 Qa de crédits',       t:()=>G.lifetime>=1e15},
  {id:'a24',name:'Sous contrat',     desc:'Remplis 5 contrats',          t:()=>G.cDone>=5},
  {id:'a25',name:'Entrepreneur',     desc:'Remplis 25 contrats',         t:()=>G.cDone>=25},
  {id:'a26',name:'Sans faute',       desc:'Série de 5 contrats',         t:()=>G.cStreak>=5},
  {id:'a27',name:'Apprenti',         desc:'Un nœud au rang de maîtrise 3', t:()=>Object.keys(G.mast).some(t=>rankOf(t)>=3)},
  {id:'a28',name:'Grand maître',     desc:'Un nœud au rang de maîtrise 8', t:()=>Object.keys(G.mast).some(t=>rankOf(t)>=8)},
  {id:'a29',name:'Polyvalent',       desc:'4 types de nœuds au rang 2 ou plus', t:()=>Object.keys(G.mast).filter(t=>rankOf(t)>=2).length>=4},
  {id:'a30',name:'Opportuniste',     desc:'Profite de 5 événements réseau', t:()=>G.evDone>=5},
  {id:'a31',name:'Chasseur d\'or',   desc:'Attrape 20 fichiers dorés',   t:()=>G.golds>=20},
  {id:'a32',name:'Marathon',         desc:'Joue 10 heures',              t:()=>G.playtime>=36000},
  {id:'a33',name:'Hyperdébit',       desc:'Atteins 1 M de crédits/s',    t:()=>G.lastRate>=1e6},
  {id:'a34',name:'Chaîne de montage',desc:'Série de 15 contrats',        t:()=>G.cStreak>=15},
  {id:'a17',name:'Ingénieur',        desc:'Un nœud au niveau 20',        t:()=>G.nodes.some(n=>n.level>=19)},
];

// succès
export function checkAch(){
  for(const a of ACH) if(!G.ach[a.id] && a.t()){ G.ach[a.id]=true; emit('toast', 'Succès : '+a.name+' (+2 % de revenus)'); emit('blip', 990,0.25,0.07,'triangle'); emit('achievement', a); }
}

// Objectifs : r = récompense minimale, s = secondes de revenus actuels (la plus grande des deux est versée)
const cnt = t => G.nodes.filter(n=>n.type===t).length;
export const OBJ = [
  {d:'Uploade 10 fichiers',               p:()=>[G.files,10],           r:30},
  {d:'Achète un Compresseur',             p:()=>[G.bought.compress||0,1], r:40},
  {d:'Gagne 300 crédits au total',        p:()=>[G.lifetime,300],       r:100},
  {d:'Pose 6 nœuds',                      p:()=>[G.nodes.length,6],     r:150},
  {d:'Monte un nœud au niveau 5',         p:()=>[Math.max(...G.nodes.map(n=>n.level+1)),5], r:250},
  {d:'Atteins 10 crédits par seconde',    p:()=>[G.lastRate,10],        r:300, s:30},
  {d:'Utilise une Fusion',                p:()=>[cnt('merge'),1],       r:400, s:30},
  {d:'Gagne 5 000 crédits au total',      p:()=>[G.lifetime,5e3],       r:500, s:30},
  {d:'Active un Overclock',               p:()=>[G.oc.until>0?1:0,1],   r:600, s:30},
  {d:'Construis un Laboratoire',          p:()=>[cnt('lab'),1],         r:800, s:30},
  {d:'Achète une technologie',            p:()=>[Object.values(G.tech).reduce((a,b)=>a+b,0),1], r:1000, s:30},
  {d:'Atteins 200 crédits par seconde',   p:()=>[G.lastRate,200],       r:1500, s:45},
  {d:'Pose 15 nœuds',                     p:()=>[G.nodes.length,15],    r:2000, s:45},
  {d:'Fais ton premier Reboot quantique', p:()=>[G.resets,1],           r:2000, s:60},
  {d:'Atteins 5 points quantiques au total', p:()=>[G.qpTotal,5],       r:3000, s:60},
  {d:'Gagne 1 M de crédits au total',     p:()=>[G.lifetime,1e6],       r:3000, s:60},
  {d:'Construis une Singularité',         p:()=>[cnt('sing'),1],        r:5000, s:60},
  {d:'Atteins 100 000 crédits par seconde', p:()=>[G.lastRate,1e5],     r:1e5, s:60},
  {d:'Atteins 25 points quantiques au total', p:()=>[G.qpTotal,25],     r:1e5, s:75},
  {d:'Gagne 1 Md de crédits au total',    p:()=>[G.lifetime,1e9],       r:1e6, s:75},
  {d:'Construis un Réseau neuronal',      p:()=>[cnt('neural'),1],      r:1e6, s:75},
  {d:'Atteins 100 points quantiques au total', p:()=>[G.qpTotal,100],   r:1e6, s:90},
  {d:'Atteins 1 Md de crédits par seconde', p:()=>[G.lastRate,1e9],     r:1e9, s:90},
  {d:'Construis une Dimension',           p:()=>[cnt('dim'),1],         r:1e9, s:90},
  {d:'Atteins 500 points quantiques au total', p:()=>[G.qpTotal,500],   r:1e9, s:90},
  {d:'Gagne 1 T de crédits au total',     p:()=>[G.lifetime,1e12],      r:1e9, s:90},
  {d:'Construis un nœud Oméga',           p:()=>[cnt('omega'),1],       r:1e10, s:120},
  {d:'Atteins 2 000 points quantiques au total', p:()=>[G.qpTotal,2000], r:1e10, s:120},
  {d:'Gagne 1 Qa de crédits au total',    p:()=>[G.lifetime,1e15],      r:1e12, s:120},
  {d:'Atteins 10 000 points quantiques au total', p:()=>[G.qpTotal,1e4], r:1e12, s:150},
];
export const objReward = o => Math.max(o.r, (o.s||0)*G.lastRate);
export function checkObj(){
  const o = OBJ[G.obj]; if(!o) return;
  const [c,t] = o.p();
  if(c>=t){
    const r = objReward(o);
    G.money+=r; G.run+=r; G.lifetime+=r; G.obj++;
    emit('toast', 'Objectif accompli : '+o.d+' (+'+fmt(r)+' crédits)'); emit('blip', 700,0.2,0.07,'triangle');
  }
}
