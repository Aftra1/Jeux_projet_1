'use strict';
// Définitions 
const NW = 160, NH = 70;
const DEFS = {
  source:  {name:'Source',        icon:'SRC', ins:0, outs:1, cost:15,    t:1.0,  val:1,    unlock:0,   desc:'Génère un fichier de valeur 1.'},
  upload:  {name:'Upload',        icon:'UP', ins:1, outs:0, cost:20,    t:0.6,  unlock:0,           desc:'Envoie les fichiers vers le cloud et rapporte des crédits.'},
  compress:{name:'Compresseur',   icon:'CMP', ins:1, outs:1, cost:40,    t:0.8,  mult:2,   unlock:0, desc:'Double la valeur d\'un fichier.'},
  split:   {name:'Diviseur',      icon:'DIV', ins:1, outs:2, cost:60,    t:0.2,  unlock:20,          desc:'Répartit les fichiers sur deux sorties, en alternance.'},
  merge:   {name:'Fusion',        icon:'FUS', ins:2, outs:1, cost:140,   t:1.0,  unlock:100,         desc:'Fusionne 2 fichiers : (a + b) × 1,3.'},
  encrypt: {name:'Chiffreur',     icon:'ENC', ins:1, outs:1, cost:300,   t:3.0,  mult:3,   unlock:200, desc:'Triple la valeur d\'un fichier.'},
  boost:   {name:'Amplificateur',  icon:'AMP', ins:1, outs:1, cost:500,   t:0.4,  mult:1.5, unlock:400, desc:'Valeur x1,5, très rapide. Idéal en fin de chaîne.'},
  clone:   {name:'Clonage',       icon:'CLN', ins:1, outs:2, cost:900,   t:1.2,  unlock:600,         desc:'Duplique un fichier sur les deux sorties.'},
  ai:      {name:'Analyseur IA',  icon:'IA', ins:1, outs:1, cost:2000,  t:6.0,  mult:5,   unlock:1500, desc:'Valeur ×5. Lent mais puissant.'},
  lab:     {name:'Laboratoire',   icon:'LAB', ins:1, outs:0, cost:2500,  t:1.5,  unlock:2000, desc:'Absorbe les fichiers et produit des points de recherche.'},
  mega:    {name:'Super Source',  icon:'SRC+', ins:0, outs:1, cost:6000,  t:3.0,  val:10,   unlock:4000, desc:'Génère des fichiers de valeur 10.'},
  quantum: {name:'Quantique',     icon:'QNT', ins:1, outs:1, cost:40000, t:12.0, mult:10,  unlock:25000, desc:'Valeur ×10. Très lent, très puissant.'},
  sing:    {name:'Singularité',   icon:'SNG', ins:1, outs:1, cost:2e6,   t:30.0, mult:22,  unlock:1e6, needRs:3, desc:'Valeur ×22. Réservé aux joueurs ayant fait 3 Reboots.'},
  neural:  {name:'Réseau neuronal',icon:'NET', ins:1, outs:1, cost:1e8,   t:70.0, mult:21,  unlock:4e7, needRs:5, desc:'Valeur ×21. Réservé aux joueurs ayant fait 5 Reboots.'},
  dim:     {name:'Dimension',     icon:'DIM', ins:1, outs:1, cost:6e9,   t:160.0,mult:20,  unlock:2e9, needRs:8, desc:'Valeur ×20. Réservé aux joueurs ayant fait 8 Reboots.'},
  omega:   {name:'Oméga',         icon:'OMG', ins:1, outs:1, cost:3.5e11,t:360.0,mult:20,  unlock:1e11, needRs:11, desc:'Valeur ×20. Le sommet, après 11 Reboots.'},
};
const ORDER = Object.keys(DEFS);
const COLORS = {source:'#4fd1c5',upload:'#f6c453',split:'#9f7aea',compress:'#63b3ed',merge:'#f687b3',encrypt:'#68d391',clone:'#f6ad55',boost:'#ecc94b',ai:'#fc8181',mega:'#38b2ac',lab:'#76e4f7',quantum:'#b794f4',sing:'#ffffff',neural:'#f56565',dim:'#ed64a6',omega:'#faf089'};

const GLOBALS = [
  {id:'rev',  name:'Marketing',          desc:'+25 % de revenus par upload',          base:100, grow:2.1, max:40},
  {id:'spd',  name:'Fibre optique',      desc:'+10 % de vitesse partout',             base:250, grow:2.4, max:30},
  {id:'seed', name:'Meilleurs capteurs', desc:'+20 % de valeur des fichiers produits par les Sources',      base:500, grow:2.8, max:20},
  {id:'buf',  name:'Mémoire tampon',     desc:'+1 capacité des files d\'attente',     base:400, grow:2.4, max:6},
  {id:'crit', name:'Upload chanceux',    desc:'+3 % de chance d\'upload ×5',          base:1500,grow:2.6, max:15},
];
const PU = [
  {id:'start', name:'Capital de départ',     desc:'Démarre chaque run avec plus de crédits (proportionnel à la hausse des prix)', base:1, grow:2, max:8, eff:l=>'Crédits de départ : '+fmt(startCash(l))},
  {id:'spd',   name:'Surcadençage',          desc:'+5 % de vitesse permanente',             base:1, grow:2, max:10, eff:l=>'+'+l*5+' %'},
  {id:'disc',  name:'Négociation',           desc:'5 % sur le prix des nœuds',              base:2, grow:2, max:6,  eff:l=>''+l*5+' %'},
  {id:'off',   name:'Serveurs de nuit',      desc:'+8 % de gains hors-ligne (base 40 %, 3 h max)',   base:2, grow:2, max:5,  eff:l=>(40+l*8)+' %'},
  {id:'rev',   name:'Amplificateur quantique', desc:'+10 % de revenus permanents', base:3, grow:2, max:10, eff:l=>'+'+l*10+' %'},
  {id:'auto',  name:'Ingénieur automatique', desc:'Améliore automatiquement tes nœuds',      base:10,grow:1, max:1,  eff:l=>l?'Actif':'—'},
];
const TECH = [
  {id:'trev', name:'Algorithmes de revenu',   desc:'+8 % de revenus par niveau',                base:20, grow:1.9, max:15, eff:l=>'+'+l*8+' %'},
  {id:'tspd', name:'Architecture parallèle',  desc:'+4 % de vitesse par niveau',                base:25, grow:1.9, max:15, eff:l=>'+'+l*4+' %'},
  {id:'tseed',name:'Formats optimisés',       desc:'+8 % de valeur des fichiers des Sources par niveau', base:35, grow:1.8, max:15, eff:l=>'+'+l*8+' %'},
  {id:'tcost',name:'Économies d\'échelle',    desc:'-2 % sur le prix des nœuds par niveau',     base:40, grow:2.0, max:10, eff:l=>'-'+l*2+' %'},
  {id:'tup',  name:'Maintenance prédictive',  desc:'-3 % sur le prix des améliorations',        base:50, grow:2.1, max:10, eff:l=>'-'+l*3+' %'},
  {id:'tcrit',name:'Compression adaptative',  desc:'+2 % de chance d\'upload critique',         base:60, grow:2.0, max:10, eff:l=>'+'+l*2+' %'},
  {id:'toc',  name:'Refroidissement liquide', desc:'Overclock +1 s de durée et -6 s de recharge', base:80, grow:1.8, max:10, eff:l=>'+'+l+' s / -'+l*6+' s'},
  {id:'tlab', name:'Instruments de mesure',   desc:'+20 % de points de recherche par niveau',   base:30, grow:1.8, max:10, eff:l=>'+'+l*20+' %'},
];
const techCost = d => Math.ceil(d.base * Math.pow(d.grow, G.tech[d.id]));
const startCash = l => Math.floor((100 + 150 * l * l) * (G ? infl() : 1));   // suit l'inflation des prix

const ACH = [
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
  {id:'a17',name:'Ingénieur',        desc:'Un nœud au niveau 20',        t:()=>G.nodes.some(n=>n.level>=19)},
];

// État 
let G = null;
function blankRun(g){
  g.money = startCash(g.pu.start); g.run = 0; g.nextId = 1;
  g.nodes = []; g.links = []; g.bought = {};
  g.glob = {rev:0,spd:0,seed:0,buf:0,crit:0};
  g.view = {x:0,y:0,k:1};
}
function newGame(){
  G = {rp:0, rpTotal:0, tech:{}, lifetime:0, files:0, qp:0, qpTotal:0, resets:0, golds:0, playtime:0, lastRate:0, ach:{}, pu:{start:0,spd:0,disc:0,off:0,auto:0,rev:0}, obj:0, daily:'', oc:{until:0,ready:0}, mute:false, savedAt:Date.now()};
  for(const t of TECH) G.tech[t.id]=0;
  blankRun(G);
  addNode('source', -280, -40, true);
  addNode('upload', 180, -40, true);
}
function addNode(type,x,y,free){
  const n = {id:G.nextId++, type, x, y, level:0, inb:[], work:null, outq:[], rr:0, timer:0};
  for(let i=0;i<DEFS[type].ins;i++) n.inb.push([]);
  G.nodes.push(n);
  if(!free) G.bought[type] = (G.bought[type]||0)+1;
  return n;
}
const nodeById = id => G.nodes.find(n=>n.id===id);
const achCount = () => Object.keys(G.ach).length;
const qpMult = q => Math.pow(1 + q, 0.6);   // bonus de revenus des points quantiques (sous-linéaire)
const BG = 1.25;   // croissance du prix par exemplaire déjà acheté
const CS = 1.5;   // échelle globale des prix (équilibrage)
const INFL = 0.9, FREEQ = 2;   // inflation : part du bonus quantique (au-delà des FREEQ premiers points) répercutée sur les prix
const infl = () => Math.pow(qpMult(Math.max(0, G.qpTotal - FREEQ)), INFL);
const buyCost = type => Math.ceil(infl() * CS * DEFS[type].cost * Math.pow(BG, G.bought[type]||0) * (1 - 0.05*G.pu.disc) * (1 - 0.02*G.tech.tcost));
const upCost = (n, lvl) => Math.ceil(infl() * CS * DEFS[n.type].cost * 0.8 * Math.pow(1.55, lvl===undefined?n.level:lvl) * (1 - 0.03*G.tech.tup) + 10);
const gUpCost = d => Math.ceil(infl() * CS * d.base * Math.pow(d.grow, G.glob[d.id]));
const puCost = d => Math.ceil(d.base * Math.pow(d.grow, G.pu[d.id]) * (d.grow===1?1:1));
const speedOf = n => (1 + 0.3*n.level) * (1 + 0.1*G.glob.spd) * (1 + 0.05*G.pu.spd) * (ocActive()?2:1) * (1 + 0.04*G.tech.tspd);
const timeOf = n => DEFS[n.type].t / speedOf(n);
const ocActive = () => G.playtime < G.oc.until;
const bufCap = () => 3 + G.glob.buf;
const revMult = () => (1 + 0.25*G.glob.rev) * qpMult(G.qpTotal) * (1 + 0.02*achCount()) * (1 + 0.1*G.pu.rev) * (1 + 0.08*G.tech.trev);
const critChance = () => 0.03*G.glob.crit + 0.02*G.tech.tcrit;
const seedV = def => def.val * (1 + 0.2*G.glob.seed) * (1 + 0.08*G.tech.tseed);
const rpOf = v => 0.5*Math.pow(v,0.3)*(1+0.2*G.tech.tlab);
// Crédits à gagner dans un run pour obtenir g points quantiques : de plus en plus durs à obtenir
const QPB = 0.1;
const qpNeed = g => 3e4*g*g*g*Math.exp(QPB*Math.min(48, Math.pow(Math.log(1+g),2)));
const qpGain = () => { let lo=0, hi=1e7; while(hi-lo>1){ const m=Math.floor((lo+hi)/2); if(qpNeed(m)<=G.run) lo=m; else hi=m; } return lo; };

// Géométrie 
const inPort  = (n,i) => ({x:n.x,    y:n.y + NH*(i+1)/(DEFS[n.type].ins+1)});
const outPort = (n,i) => ({x:n.x+NW, y:n.y + NH*(i+1)/(DEFS[n.type].outs+1)});
function ctrl(a,b){ const d=Math.max(60,Math.abs(b.x-a.x)/2); return [a,{x:a.x+d,y:a.y},{x:b.x-d,y:b.y},b]; }
function bez(p,t){ const u=1-t; return {
  x:u*u*u*p[0].x+3*u*u*t*p[1].x+3*u*t*t*p[2].x+t*t*t*p[3].x,
  y:u*u*u*p[0].y+3*u*u*t*p[1].y+3*u*t*t*p[2].y+t*t*t*p[3].y}; }
const linkPts = l => ctrl(outPort(nodeById(l.a),l.ao), inPort(nodeById(l.b),l.bi));
const linkFrom = (id,o) => G.links.find(l=>l.a===id && l.ao===o);

// Effets (sons, textes) 
let AC = null, lastBlip = 0;
function audio(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function blip(freq, dur=0.08, vol=0.05, type='sine'){
  if(G.mute) return; const a = audio(); if(!a) return;
  try{
    const o=a.createOscillator(), g=a.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime+dur);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+dur);
  }catch(e){}
}
const PENTA = [0,2,4,7,9];
function upSound(big){
  const now = performance.now(); if(now-lastBlip<70) return; lastBlip = now;
  const k = PENTA[Math.floor(Math.random()*5)] + (big?12:0);
  blip(440*Math.pow(2,k/12), 0.1, big?0.07:0.035);
}
const floats = [], parts = [];
function floatText(x,y,text,col='#f6c453',size=15){ if(floats.length<60) floats.push({x,y,text,col,size,life:1}); }

// Simulation 
let income = [];
function earn(v, n, crit){
  G.money += v; G.run += v; G.lifetime += v;
  income.push({t:performance.now(), v});
  if(n) floatText(n.x+NW/2, n.y-4, '+'+fmt(v), crit?'#ff9f43':'#f6c453', crit?20:15);
  upSound(crit);
  if(n) for(let i=0;i<(crit?10:4);i++) if(parts.length<250) parts.push({x:n.x+NW/2,y:n.y+NH/2,vx:(Math.random()-.5)*160,vy:-40-Math.random()*120,life:1,col:crit?'#ff9f43':'#f6c453'});
}

function trySend(n){
  const q = n.outq[0]; if(!q) return;
  const d = DEFS[n.type];
  const order = q.o>=0 ? [q.o] : (d.outs===2 ? [n.rr%2,(n.rr+1)%2] : [0]);
  for(const o of order){
    const l = linkFrom(n.id,o);
    if(!l) continue;
    const last = l.packets[l.packets.length-1];
    if(!last || last.t > 0.18){
      l.packets.push({v:q.v,t:0}); n.outq.shift();
      if(q.o<0 && d.outs===2) n.rr = o+1;
      return;
    }
  }
  if(q.o>=0 && !linkFrom(n.id,q.o)) n.outq.shift();   // sortie non branchée du clonage : le fichier est perdu
}

function updateNode(n,dt){
  const def = DEFS[n.type], t = timeOf(n);
  if(def.val){                                   // sources
    if(n.outq.length<2){
      n.timer += dt;
      if(n.timer>=t){ n.timer=0; n.outq.push({v:seedV(def), o:-1}); }
    }
  } else if(n.type==='lab'){
    if(!n.work && n.inb[0].length) n.work = {v:n.inb[0].shift(), rem:t};
    if(n.work){
      n.work.rem -= dt;
      if(n.work.rem<=0){ const r=rpOf(n.work.v); G.rp+=r; G.rpTotal+=r; floatText(n.x+NW/2, n.y-4, '+'+fmt(r)+' RP', '#76e4f7', 13); n.work=null; }
    }
  } else if(n.type==='upload'){
    if(!n.work && n.inb[0].length) n.work = {v:n.inb[0].shift(), rem:t};
    if(n.work){
      n.work.rem -= dt;
      if(n.work.rem<=0){
        let v = n.work.v*revMult(), crit = Math.random()<critChance();
        if(crit) v*=5;
        earn(v,n,crit); G.files++; n.work=null;
      }
    }
  } else {
    if(!n.work && n.outq.length===0){
      if(n.type==='merge'){
        if(n.inb[0].length && n.inb[1].length) n.work = {v:(n.inb[0].shift()+n.inb[1].shift())*1.3, rem:t};
      } else if(n.inb[0].length) n.work = {v:n.inb[0].shift()*(def.mult||1), rem:t};
    }
    if(n.work){
      n.work.rem -= dt;
      if(n.work.rem<=0){
        if(n.type==='clone') n.outq.push({v:n.work.v,o:0},{v:n.work.v,o:1});
        else n.outq.push({v:n.work.v,o:-1});
        n.work=null;
      }
    }
  }
  trySend(n);
}

function updateLinks(dt){
  for(const l of G.links){
    const b = nodeById(l.b);
    for(let i=0;i<l.packets.length;i++){
      const p = l.packets[i];
      const lim = i===0 ? 1 : l.packets[i-1].t - 0.12;
      p.t = Math.min(lim, p.t + dt/1.1);
    }
    const f = l.packets[0];
    if(f && f.t>=1 && b.inb[l.bi].length < bufCap()){ b.inb[l.bi].push(f.v); l.packets.shift(); }
  }
}
function step(dt){
  G.playtime += dt;
  updateLinks(dt);
  for(const n of G.nodes) updateNode(n,dt);
}

// Prestige 
function reboot(){
  const g = qpGain(); if(g<1) return;
  ask(`Reboot quantique ? Tu gagnes ${g} point(s) quantique(s) (revenus x${qpMult(G.qpTotal+g).toFixed(2)} au lieu de x${qpMult(G.qpTotal).toFixed(2)}). Tes nœuds, crédits et améliorations de run sont remis à zéro.`, doReboot);
}
function doReboot(){
  const g = qpGain(); if(g<1) return;
  G.qp += g; G.qpTotal += g; G.resets++;
  blankRun(G);
  addNode('source', -280, -40, true);
  addNode('upload', 180, -40, true);
  income = []; sel = null; showSel(); renderTab(); buildShop();
  toast(`Reboot ! +${g} point(s) quantique(s)`);
  save();
}

// Rendu 
const cv = document.getElementById('c'), cx = cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){ DPR=window.devicePixelRatio||1; W=innerWidth; H=innerHeight; cv.width=W*DPR; cv.height=H*DPR; }
addEventListener('resize',resize); resize();
const toWorld = (sx,sy)=>({x:(sx-W/2-G.view.x)/G.view.k, y:(sy-H/2-G.view.y)/G.view.k});

const SUF = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
function fmt(v){
  if(!isFinite(v)) return 'Inf';
  if(v>=1e39) return v.toExponential(2).replace('e+','e');
  if(v<1000) return v<10 ? (Math.round(v*10)/10).toString() : Math.floor(v).toString();
  let i=0; while(v>=1000 && i<SUF.length-1){ v/=1000; i++; }
  return v.toFixed(v<10?2:v<100?1:0)+SUF[i];
}
const rrect = (x,y,w,h,r)=>{ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); };
function packetColor(v){
  return v<10?'#4fd1c5': v<100?'#63b3ed': v<1e3?'#f6c453': v<1e4?'#f6ad55': v<1e5?'#f687b3': v<1e6?'#b794f4':'#ffffff';
}

let sel = null, drag = null, hoverPort = null;
// Zoom : cible lissée, vitesse de zoom pour les effets, niveaux de détail
const ZMIN = 0.05, ZMAX = 3;
let zoomT = null, zoomVel = 0, lastDraw = performance.now(), zoomShow = 0, lodPrev = 0, lodFlash = 0;
const sstep = (a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
function zoomAt(sx,sy,k){ zoomT = {k:Math.max(ZMIN,Math.min(ZMAX,k)), sx, sy}; zoomShow = 1.6; }
function stepZoom(dt){
  const v = G.view, k0 = v.k;
  if(zoomT){
    const w = toWorld(zoomT.sx,zoomT.sy), e = Math.log(zoomT.k/v.k);
    if(Math.abs(e) < 0.002) v.k = zoomT.k; else v.k *= Math.exp(e*(1-Math.exp(-dt*11)));
    v.x = zoomT.sx - W/2 - w.x*v.k; v.y = zoomT.sy - H/2 - w.y*v.k;
    if(v.k === zoomT.k) zoomT = null;
  }
  const inst = dt>0 ? Math.log(v.k/k0)/dt : 0;
  zoomVel += (inst - zoomVel)*Math.min(1,dt*10);
  if(Math.abs(zoomVel) < 0.02) zoomVel = 0;
  zoomShow = Math.max(0, zoomShow - dt);
}
function draw(){
  const now = performance.now(), dt = Math.min(0.1,(now-lastDraw)/1000); lastDraw = now;
  stepZoom(dt);
  const v = G.view, tm = now/1000;
  // niveau de détail : 0 = vue lointaine, 1 = vue détaillée
  const det = sstep(0.28,0.52,v.k), far = 1-det;
  const lod = v.k<0.28 ? 0 : v.k<0.52 ? 1 : 2;
  if(lod!==lodPrev){ lodFlash = 1; lodPrev = lod; }
  lodFlash = Math.max(0, lodFlash - dt*2.2);
  cx.setTransform(DPR,0,0,DPR,0,0);
  cx.clearRect(0,0,W,H);
  // grille à deux échelles, la plus fine s'estompe en dézoomant
  let gs = 40*v.k, fine = 1;
  if(gs<22){ fine = 0; let m = 1; while(gs*m<22) m*=5; gs *= m; }
  const gridPass = (g,a)=>{
    cx.strokeStyle='rgba(30,44,72,'+a+')'; cx.lineWidth=1; cx.beginPath();
    const ox = ((W/2+v.x)%g+g)%g, oy = ((H/2+v.y)%g+g)%g;
    for(let x=ox;x<W;x+=g){ cx.moveTo(x,0); cx.lineTo(x,H); }
    for(let y=oy;y<H;y+=g){ cx.moveTo(0,y); cx.lineTo(W,y); }
    cx.stroke();
  };
  if(fine) gridPass(gs, 0.5*Math.min(1,gs/40));
  else { gridPass(gs, 0.55); gridPass(gs*5, 0.9); }

  cx.save();
  cx.translate(W/2+v.x, H/2+v.y); cx.scale(v.k,v.k);

  for(const l of G.links){
    const p = linkPts(l);
    const ml = Math.max(1, 2.2/v.k);   // épaisseur minimale visible à l'écran
    cx.lineWidth = Math.max(5, ml*1.6); cx.strokeStyle = '#1f2a42';
    cx.beginPath(); cx.moveTo(p[0].x,p[0].y); cx.bezierCurveTo(p[1].x,p[1].y,p[2].x,p[2].y,p[3].x,p[3].y); cx.stroke();
    if(det>0.05){
      cx.globalAlpha = det;
      cx.lineWidth = 2; cx.strokeStyle = '#3a4d78'; cx.setLineDash([8,10]); cx.lineDashOffset = -tm*30;
      cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1;
    }
    for(const k of l.packets){
      const q = bez(p,k.t), c = packetColor(k.v);
      if(v.k>0.4){ cx.shadowColor=c; cx.shadowBlur=10; }
      cx.fillStyle=c;
      const ps = Math.max(12, 3.5/v.k);
      if(ps>12) cx.fillRect(q.x-ps/2,q.y-ps/2,ps,ps); else rrect(q.x-6,q.y-6,12,12,3), cx.fill();
    }
    cx.shadowBlur=0;
  }
  if(drag && drag.kind==='link'){
    const a = outPort(nodeById(drag.n), drag.o), p = ctrl(a,drag.pos);
    cx.strokeStyle='#4fd1c5'; cx.setLineDash([6,4]); cx.lineWidth=3;
    cx.beginPath(); cx.moveTo(p[0].x,p[0].y); cx.bezierCurveTo(p[1].x,p[1].y,p[2].x,p[2].y,p[3].x,p[3].y); cx.stroke(); cx.setLineDash([]);
  }

  for(const n of G.nodes){
    const d = DEFS[n.type], col = COLORS[n.type];
    const busy = !!n.work || (d.val && n.timer>0);
    if(far>0.02) drawNodeFar(n,d,col,busy,far,tm);
    if(det<0.02) continue;
    cx.globalAlpha = det;
    cx.shadowColor = col; cx.shadowBlur = busy ? 14 : 4;
    const gr = cx.createLinearGradient(0,n.y,0,n.y+NH); gr.addColorStop(0,'#1e2942'); gr.addColorStop(1,'#131b2e');
    cx.fillStyle = gr; rrect(n.x,n.y,NW,NH,12); cx.fill();
    cx.shadowBlur = 0;
    cx.strokeStyle = sel===n.id ? '#fff' : col; cx.lineWidth = sel===n.id?3:2; rrect(n.x,n.y,NW,NH,12); cx.stroke();
    // progression
    let pr = 0;
    if(n.work) pr = 1 - n.work.rem/timeOf(n); else if(d.val) pr = n.timer/timeOf(n);
    cx.fillStyle = col+'33'; rrect(n.x+8,n.y+NH-11,NW-16,5,2.5); cx.fill();
    cx.fillStyle = col; rrect(n.x+8,n.y+NH-11,Math.max(5,(NW-16)*Math.max(0,Math.min(1,pr))),5,2.5); if(pr>0) cx.fill();
    cx.textAlign='left'; cx.textBaseline='middle';
    cx.fillStyle=col+'33'; rrect(n.x+8,n.y+8,30,30,8); cx.fill(); cx.fillStyle=col; cx.font='700 '+(d.icon.length>2?10:12)+'px system-ui'; cx.textAlign='center'; cx.fillText(d.icon, n.x+23, n.y+24); cx.textAlign='left';
    cx.font='600 13px system-ui'; cx.fillStyle='#e6ecf8'; cx.fillText(d.name, n.x+42, n.y+18);
    cx.font='11px system-ui'; cx.fillStyle='#8794b3';
    const buf = n.inb.reduce((s,q)=>s+q.length,0);
    cx.fillText('Niv. '+(n.level+1)+(d.ins?'  ·  file '+buf+'/'+bufCap():'  ·  '+(1/timeOf(n)).toFixed(2)+'/s'), n.x+42, n.y+35);
    for(let i=0;i<d.ins;i++) port(inPort(n,i), hoverPort&&hoverPort.in&&hoverPort.n===n.id&&hoverPort.i===i, false, col, G.links.some(l=>l.b===n.id&&l.bi===i));
    for(let i=0;i<d.outs;i++) port(outPort(n,i), hoverPort&&!hoverPort.in&&hoverPort.n===n.id&&hoverPort.i===i, true, col, !!linkFrom(n.id,i));
    cx.globalAlpha = 1;
  }
  for(const f of floats){
    cx.globalAlpha = Math.max(0,f.life); cx.fillStyle=f.col; cx.font=`700 ${f.size}px system-ui`; cx.textAlign='center';
    cx.fillText(f.text, f.x, f.y - (1-f.life)*40);
  }
  for(const q of parts){ cx.globalAlpha=Math.max(0,q.life); cx.fillStyle=q.col; cx.fillRect(q.x-2,q.y-2,4,4); }
  cx.globalAlpha = 1;
  cx.restore();
  drawZoomFx(det);
  drawMini();
}
// Vue lointaine : blocs colorés lumineux, icône à taille d'écran constante
function drawNodeFar(n,d,col,busy,a,tm){
  const k = G.view.k, cxn = n.x+NW/2, cyn = n.y+NH/2;
  const pulse = busy ? 0.75+0.25*Math.sin(tm*5+n.id) : 0.55;
  cx.globalAlpha = a;
  const R = Math.max(NW*0.62, 20/k);
  const g = cx.createRadialGradient(cxn,cyn,0,cxn,cyn,R*1.6);
  g.addColorStop(0,col+(busy?'88':'44')); g.addColorStop(1,col+'00');
  cx.fillStyle = g; cx.fillRect(cxn-R*1.6,cyn-R*1.6,R*3.2,R*3.2);
  const bw = Math.max(NW, 26/k), bh = Math.max(NH, 18/k);
  cx.fillStyle = col; cx.globalAlpha = a*pulse;
  rrect(cxn-bw/2,cyn-bh/2,bw,bh,Math.min(12,bh*0.3)); cx.fill();
  cx.globalAlpha = a; cx.strokeStyle = sel===n.id ? '#fff' : '#0a0e16'; cx.lineWidth = Math.max(2,1.5/k);
  rrect(cxn-bw/2,cyn-bh/2,bw,bh,Math.min(12,bh*0.3)); cx.stroke();
  if(k>0.09){
    cx.fillStyle = '#0a0e16'; cx.textAlign='center'; cx.textBaseline='middle';
    cx.font = '700 '+Math.round(12/k)+'px system-ui'; cx.fillText(d.icon, cxn, cyn+0.5/k);
    cx.textAlign='left';
  }
  cx.globalAlpha = 1;
}
// Effets de zoom : stries radiales, vignette de vitesse, anneau de changement de niveau, indicateur
function drawZoomFx(det){
  cx.setTransform(DPR,0,0,DPR,0,0);
  const sp = Math.min(1, Math.abs(zoomVel)/3.2), mxr = Math.hypot(W,H)/2;
  if(sp>0.03){
    const out = zoomVel<0;   // dézoom : les stries convergent vers le centre
    const g = cx.createRadialGradient(W/2,H/2,mxr*0.35,W/2,H/2,mxr);
    g.addColorStop(0,'rgba(79,209,197,0)'); g.addColorStop(1,'rgba(79,209,197,'+(0.22*sp)+')');
    cx.fillStyle = g; cx.fillRect(0,0,W,H);
    cx.strokeStyle = 'rgba(160,230,255,'+(0.5*sp)+')'; cx.lineWidth = 1.5; cx.beginPath();
    const t = performance.now()/1000;
    for(let i=0;i<46;i++){
      const ang = i*2.399+Math.floor(i/7)*0.3, ph = (i*0.37+t*(out?-1:1)*2.2)%1, f = ph<0?ph+1:ph;
      const r0 = mxr*(0.25+0.65*f), r1 = r0 + mxr*0.18*sp;
      cx.moveTo(W/2+Math.cos(ang)*r0, H/2+Math.sin(ang)*r0);
      cx.lineTo(W/2+Math.cos(ang)*r1, H/2+Math.sin(ang)*r1);
    }
    cx.stroke();
  }
  if(lodFlash>0){
    const r = mxr*(1-lodFlash)*1.1;
    cx.strokeStyle = 'rgba(255,255,255,'+(0.35*lodFlash)+')'; cx.lineWidth = 3+10*lodFlash;
    cx.beginPath(); cx.arc(W/2,H/2,r,0,Math.PI*2); cx.stroke();
  }
  if(zoomShow>0){
    const a = Math.min(1,zoomShow), lab = G.view.k<0.28?'Vue globale':G.view.k<0.52?'Vue réseau':'Vue détaillée';
    cx.globalAlpha = a; cx.textAlign='center'; cx.textBaseline='middle';
    cx.fillStyle='#0a0e16cc'; rrect(W/2-90,H-150,180,34,10); cx.fill();
    cx.fillStyle='#e6ecf8'; cx.font='700 13px system-ui'; cx.fillText(Math.round(G.view.k*100)+' %  -  '+lab, W/2, H-133);
    cx.globalAlpha = 1; cx.textAlign='left';
  }
}
function port(p,hot,out,col,linked){
  cx.beginPath(); cx.arc(p.x,p.y,hot?10:7,0,Math.PI*2);
  cx.fillStyle = out ? col : (linked ? col : '#0a0e16'); cx.fill();
  cx.strokeStyle = hot ? '#fff' : (out ? '#0a0e16' : '#8794b3'); cx.lineWidth=2; cx.stroke();
}

// Interactions 
function findPort(w){
  const r = 14/G.view.k;
  for(const n of G.nodes){
    const d = DEFS[n.type];
    for(let i=0;i<d.outs;i++){ const p=outPort(n,i); if(Math.hypot(p.x-w.x,p.y-w.y)<r) return {in:false,n:n.id,i}; }
    for(let i=0;i<d.ins;i++){ const p=inPort(n,i);  if(Math.hypot(p.x-w.x,p.y-w.y)<r) return {in:true, n:n.id,i}; }
  }
  return null;
}
function findNode(w){
  for(let i=G.nodes.length-1;i>=0;i--){ const n=G.nodes[i]; if(w.x>=n.x && w.x<=n.x+NW && w.y>=n.y && w.y<=n.y+NH) return n; }
  return null;
}
function findLink(w){
  const r = 10/G.view.k;
  for(const l of G.links){ const p=linkPts(l); for(let t=0;t<=1;t+=0.04){ const q=bez(p,t); if(Math.hypot(q.x-w.x,q.y-w.y)<r) return l; } }
  return null;
}
function connect(a,ao,b,bi){
  if(a===b) return;
  G.links = G.links.filter(l=>!(l.a===a&&l.ao===ao) && !(l.b===b&&l.bi===bi));
  G.links.push({a,ao,b,bi,packets:[]});
  blip(660,0.07,0.05);
}
function removeNode(n){ G.links = G.links.filter(l=>l.a!==n.id && l.b!==n.id); G.nodes = G.nodes.filter(x=>x!==n); }

const pointers = new Map(); let pinch = null;
cv.addEventListener('pointerdown', e=>{
  audio(); cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    const [a,b]=[...pointers.values()];
    pinch={d:Math.hypot(a.x-b.x,a.y-b.y), k:G.view.k}; zoomT=null; drag=null; return;
  }
  const w = toWorld(e.clientX,e.clientY);
  const pt = findPort(w);
  if(pt && !pt.in){ drag={kind:'link',n:pt.n,o:pt.i,pos:w}; return; }
  if(pt && pt.in){
    const l = G.links.find(l=>l.b===pt.n && l.bi===pt.i);
    if(l){ G.links = G.links.filter(x=>x!==l); drag={kind:'link',n:l.a,o:l.ao,pos:w}; return; }
  }
  const n = findNode(w);
  if(n){
    sel = n.id; G.nodes.splice(G.nodes.indexOf(n),1); G.nodes.push(n);
    drag={kind:'node',n:n.id,dx:w.x-n.x,dy:w.y-n.y}; showSel(); return;
  }
  sel=null; showSel();
  drag={kind:'pan',sx:e.clientX,sy:e.clientY,vx:G.view.x,vy:G.view.y};
});
cv.addEventListener('pointermove', e=>{
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch && pointers.size===2){
    const [a,b]=[...pointers.values()], mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    const w = toWorld(mx,my), v=G.view;
    v.k = Math.max(ZMIN, Math.min(ZMAX, pinch.k*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d)); zoomShow = 1.2;
    v.x = mx - W/2 - w.x*v.k; v.y = my - H/2 - w.y*v.k; return;
  }
  const w = toWorld(e.clientX,e.clientY);
  hoverPort = findPort(w);
  if(!drag) return;
  if(drag.kind==='link') drag.pos = w;
  else if(drag.kind==='node'){ const n=nodeById(drag.n); n.x=Math.round((w.x-drag.dx)/10)*10; n.y=Math.round((w.y-drag.dy)/10)*10; }
  else if(drag.kind==='pan'){ G.view.x=drag.vx+e.clientX-drag.sx; G.view.y=drag.vy+e.clientY-drag.sy; }
});
function endPointer(e){
  pointers.delete(e.pointerId); if(pointers.size<2) pinch=null;
  if(drag && drag.kind==='link'){
    const w = toWorld(e.clientX,e.clientY);
    let pt = findPort(w);
    if(!pt || !pt.in){
      const n = findNode(w);
      if(n){
        const c = DEFS[n.type].ins; let i = 0;
        for(; i<c; i++) if(!G.links.some(l=>l.b===n.id&&l.bi===i)) break;
        if(c) pt = {in:true,n:n.id,i:Math.min(i,c-1)};
      }
    }
    if(pt && pt.in) connect(drag.n,drag.o,pt.n,pt.i);
  }
  drag=null;
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('dblclick', e=>{ const l=findLink(toWorld(e.clientX,e.clientY)); if(l) G.links=G.links.filter(x=>x!==l); });
cv.addEventListener('contextmenu', e=>{ e.preventDefault(); const l=findLink(toWorld(e.clientX,e.clientY)); if(l) G.links=G.links.filter(x=>x!==l); });
cv.addEventListener('wheel', e=>{
  e.preventDefault();
  const base = zoomT ? zoomT.k : G.view.k;
  const step = Math.exp(-Math.max(-300,Math.min(300,e.deltaY))*0.0022);
  zoomAt(e.clientX, e.clientY, base*step);
},{passive:false});
addEventListener('keydown', e=>{
  if(e.target.tagName==='TEXTAREA') return;
  if(e.key==='o'||e.key==='O') useOverclock();
  if(e.key==='f'||e.key==='F') fitView();
  if((e.key==='Delete'||e.key==='Backspace') && sel){ const n=nodeById(sel); if(n) sell(n); }
});

// UI 
const $ = id => document.getElementById(id);
function ask(msg, yes){
  const d=$('dlg'); $('dlgMsg').textContent=msg; d.style.display='flex';
  $('dlgYes').onclick=()=>{ d.style.display='none'; yes(); };
  $('dlgNo').onclick=()=>{ d.style.display='none'; };
}
function toast(msg){ const t=$('toast'); t.textContent=msg; t.style.opacity=1; clearTimeout(toast.h); toast.h=setTimeout(()=>t.style.opacity=0,2600); }
const unlocked = type => G.run >= DEFS[type].unlock && (!DEFS[type].needRs || G.resets>=DEFS[type].needRs);

function buildShop(){
  $('shop').innerHTML = '';
  for(const type of ORDER){
    const d = DEFS[type], b = document.createElement('button');
    b.dataset.type = type; b.title = d.desc; b.style.setProperty('--c', COLORS[type]);
    b.onclick = ()=>{
      if(!unlocked(type)) return;
      const c = buyCost(type);
      if(G.money<c){ toast('Pas assez de crédits'); return; }
      G.money -= c;
      const w = toWorld(W/2 + (Math.random()-.5)*160, H/2 - 40 + (Math.random()-.5)*120);
      const n = addNode(type, Math.round((w.x-NW/2)/10)*10, Math.round((w.y-NH/2)/10)*10);
      sel = n.id; showSel(); blip(520,0.08,0.05);
    };
    $('shop').appendChild(b);
  }
}
function refreshShop(){
  for(const b of $('shop').children){
    const type=b.dataset.type, d=DEFS[type];
    if(unlocked(type)){
      b.innerHTML = `<b>${d.name}</b><small>${d.desc}</small><span class="c">Prix : ${fmt(buyCost(type))}</span>`;
      b.disabled = G.money < buyCost(type);
    } else {
      const need = d.needRs && G.resets<d.needRs ? 'Nécessite '+d.needRs+' Reboots' : 'Débloqué à '+fmt(d.unlock)+' crédits gagnés dans ce run';
      b.innerHTML = `<b>???</b><small>${need}</small>`;
      b.disabled = true;
    }
  }
}
function sell(n){
  G.money += Math.floor(buyCost(n.type)*0.4);
  removeNode(n); sel=null; showSel();
}
function upgradeNode(n,count){
  let done=0;
  while(done<count){
    const c = upCost(n); if(G.money<c) break;
    G.money -= c; n.level++; done++;
  }
  if(done){ blip(780,0.1,0.06,'triangle'); showSel(); }
}
function bulkCost(n,count){ let s=0; for(let i=0;i<count;i++) s+=upCost(n,n.level+i); return s; }
function maxAffordable(n){ let c=0,s=0; while(c<500){ const u=upCost(n,n.level+c); if(s+u>G.money) break; s+=u; c++; } return c; }

function showSel(){
  const box = $('sel'), n = sel ? nodeById(sel) : null;
  if(!n){ box.style.display='none'; return; }
  const d = DEFS[n.type], t = timeOf(n);
  let extra;
  if(d.val) extra = `1 fichier de valeur ${seedV(d)} toutes les ${t.toFixed(2)} s.`;
  else if(n.type==='upload') extra = `1 fichier toutes les ${t.toFixed(2)} s (revenus ×${revMult().toFixed(2)}).`;
  else extra = `${t.toFixed(2)} s par fichier.`;
  box.innerHTML = `<h3>${d.name} — niveau ${n.level+1}</h3><p>${d.desc}</p><p>${extra}</p>
    <div class="row"><button id="bu1"></button><button id="bu10"></button><button id="buM"></button></div>
    <div class="row"><button id="bDis">Déconnecter</button><button id="bDup">Dupliquer</button><button id="bSell">Vendre +${fmt(Math.floor(buyCost(n.type)*0.4))}</button></div>`;
  box.style.display='block';
  refreshSelButtons();
  $('bu1').onclick = ()=>upgradeNode(n,1);
  $('bu10').onclick = ()=>upgradeNode(n,10);
  $('buM').onclick = ()=>upgradeNode(n,maxAffordable(n));
  $('bDis').onclick = ()=>{ G.links = G.links.filter(l=>l.a!==n.id && l.b!==n.id); };
  $('bSell').onclick = ()=>sell(n);
  $('bDup').onclick = ()=>{
    const c = buyCost(n.type);
    if(!unlocked(n.type)) return;
    if(G.money<c){ toast('Pas assez de crédits'); return; }
    G.money -= c; const m = addNode(n.type, n.x+20, n.y+NH+20); m.level = Math.max(0,n.level-2);
    sel = m.id; showSel(); blip(520,0.08,0.05);
  };
}
function refreshSelButtons(){
  const n = sel ? nodeById(sel) : null; if(!n || !$('bu1')) return;
  const c1=upCost(n), c10=bulkCost(n,10), m=maxAffordable(n);
  $('bu1').innerHTML = `×1<br>${fmt(c1)}`;  $('bu1').disabled = G.money<c1;
  $('bu10').innerHTML = `×10<br>${fmt(c10)}`; $('bu10').disabled = G.money<c10;
  $('buM').innerHTML = `Max (${m})<br>${fmt(bulkCost(n,m))}`; $('buM').disabled = m<1;
}

// panneau latéral à onglets
let tab = null, tabSig = '';
const TABS = [['up','Amélio.'],['res','Recherche'],['qp','Quantique'],['ach','Succès'],['stat','Stats'],['opt','Options']];
const hist = [];
function openTab(t){
  if(tab===t){ tab=null; $('side').style.display='none'; return; }
  tab=t; $('side').style.display='flex'; renderTab();
}
function renderTab(){
  if(!tab) return;
  $('tabs').innerHTML = TABS.map(([id,l])=>`<button data-t="${id}" class="${id===tab?'on':''}">${l}</button>`).join('');
  $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{ tab=b.dataset.t; renderTab(); });
  const body = $('tabBody');
  if(tab==='up'){
    body.innerHTML = GLOBALS.map(g=>{
      const lv=G.glob[g.id], max=lv>=g.max, c=gUpCost(g);
      return `<div class="item"><div><b>${g.name}</b> <small>(${lv}/${g.max})</small><p>${g.desc}</p></div>
        <button data-g="${g.id}" ${max||G.money<c?'disabled':''}>${max?'MAX':'Coût : '+fmt(c)}</button></div>`;
    }).join('');
    body.querySelectorAll('button[data-g]').forEach(b=>b.onclick=()=>{
      const g=GLOBALS.find(x=>x.id===b.dataset.g), c=gUpCost(g);
      if(G.money>=c && G.glob[g.id]<g.max){ G.money-=c; G.glob[g.id]++; blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
    });
  } else if(tab==='qp'){
    const gain=qpGain();
    body.innerHTML = `<p>Un <b class="qp">Reboot quantique</b> remet ta progression à zéro, mais te donne des <b class="qp">points quantiques</b>. Ils donnent un bonus de revenus permanent (×(1 + points)<sup>0,6</sup>) et se dépensent aussi en bonus permanents.</p>
      <div class="item"><div><b class="qp">${G.qp} point(s)</b> disponible(s)<p>Total : ${G.qpTotal} · Reboots : ${G.resets} · Bonus : ×${qpMult(G.qpTotal).toFixed(2)}</p></div></div>
      <button id="bReboot" class="${gain>=1?'glow':''}" style="width:100%" ${gain<1?'disabled':''}>Reboot : +${gain} point(s)</button>
      <p>${gain<1?'Il faut gagner '+fmt(qpNeed(1))+' crédits dans ce run pour obtenir le premier point.':'Prochain point à '+fmt(qpNeed(gain+1))+' crédits gagnés dans ce run (actuel : '+fmt(G.run)+').'} Les points deviennent de plus en plus difficiles à obtenir, et au-delà de ${FREEQ} points les prix des nœuds suivent en partie le bonus (inflation actuelle : ×${infl().toFixed(2)}).</p>` +
      PU.map(d=>{
        const lv=G.pu[d.id], max=lv>=d.max, c=puCost(d);
        return `<div class="item"><div><b>${d.name}</b> <small>(${lv}/${d.max})</small><p>${d.desc}<br><span class="qp">${d.eff(lv)}</span></p></div>
          <button data-p="${d.id}" ${max||G.qp<c?'disabled':''}>${max?'MAX':''+c}</button></div>`;
      }).join('');
    $('bReboot').onclick = reboot;
    body.querySelectorAll('button[data-p]').forEach(b=>b.onclick=()=>{
      const d=PU.find(x=>x.id===b.dataset.p), c=puCost(d);
      if(G.qp>=c && G.pu[d.id]<d.max){ G.qp-=c; G.pu[d.id]++; renderTab(); }
    });
  } else if(tab==='res'){
    body.innerHTML = `<p>Les points de recherche (RP) sont produits par les <b>Laboratoires</b> à partir des fichiers qu'ils reçoivent. Les technologies sont <b>permanentes</b>, même après un Reboot.</p>
      <div class="item"><div><b style="color:#76e4f7">${fmt(G.rp)} RP</b><p>Total produit : ${fmt(G.rpTotal)}</p></div></div>` +
      TECH.map(d=>{
        const lv=G.tech[d.id], max=lv>=d.max, c=techCost(d);
        return `<div class="item"><div><b>${d.name}</b> <small>(${lv}/${d.max})</small><p>${d.desc}<br><span style="color:#76e4f7">${d.eff(lv)}</span></p></div>
          <button data-r="${d.id}" ${max||G.rp<c?'disabled':''}>${max?'MAX':fmt(c)+' RP'}</button></div>`;
      }).join('');
    body.querySelectorAll('button[data-r]').forEach(b=>b.onclick=()=>{
      const d=TECH.find(x=>x.id===b.dataset.r), c=techCost(d);
      if(G.rp>=c && G.tech[d.id]<d.max){ G.rp-=c; G.tech[d.id]++; blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
    });
  } else if(tab==='stat'){
    body.innerHTML = `<p>Crédits par seconde sur les dernières minutes :</p><canvas id="spark" width="600" height="220" style="position:static;width:100%;height:110px;background:#0a0e16;border-radius:8px"></canvas>
      <div class="item"><div>Crédits gagnés au total<p>${fmt(G.lifetime)}</p></div></div>
      <div class="item"><div>Crédits gagnés dans ce run<p>${fmt(G.run)}</p></div></div>
      <div class="item"><div>Fichiers uploadés<p>${fmt(G.files)}</p></div></div>
      <div class="item"><div>Multiplicateur de revenus<p>x${revMult().toFixed(2)}</p></div></div>
      <div class="item"><div>Nœuds posés<p>${G.nodes.length}</p></div></div>
      <div class="item"><div>Temps de jeu<p>${Math.floor(G.playtime/3600)} h ${Math.floor(G.playtime/60)%60} min</p></div></div>`;
    drawSpark();
  } else if(tab==='ach'){
    body.innerHTML = `<p>${achCount()}/${ACH.length} succès · chaque succès donne +2 % de revenus (actuellement +${achCount()*2} %).</p>` +
      ACH.map(a=>`<div class="item ${G.ach[a.id]?'done':'lock'}"><div><b>${G.ach[a.id]?'[OK]':'[ ]'} ${a.name}</b><p>${a.desc}</p></div></div>`).join('');
  } else if(tab==='opt'){
    body.innerHTML = `<div class="item"><div><b>Son</b></div><button id="oMute">${G.mute?'Désactivé':'Activé'}</button></div>
      <div class="item"><div><b>Sauvegarde</b><p>Exporter / importer ta partie (texte).</p></div></div>
      <textarea id="oTxt" placeholder="Code de sauvegarde…"></textarea>
      <div class="row"><button id="oExp">Exporter</button><button id="oImp">Importer</button></div>
      <div class="row"><button id="oReset" style="color:var(--bad)">Tout effacer</button></div>
      <p>Temps de jeu : ${Math.floor(G.playtime/3600)} h ${Math.floor(G.playtime/60)%60} min · Crédits gagnés au total : ${fmt(G.lifetime)}</p>
      <p>Astuces : double-clic / clic droit sur un lien pour le supprimer · molette ou pincement pour zoomer · Suppr pour vendre un nœud.</p>`;
    $('oMute').onclick = ()=>{ G.mute=!G.mute; renderTab(); };
    $('oExp').onclick = ()=>{ save(); $('oTxt').value = btoa(unescape(encodeURIComponent(JSON.stringify(serialize())))); $('oTxt').select(); };
    $('oImp').onclick = ()=>{
      try{
        const d = JSON.parse(decodeURIComponent(escape(atob($('oTxt').value.trim()))));
        G = hydrate(d); buildShop(); sel=null; showSel(); toast('Sauvegarde importée'); save();
      }catch(e){ toast('Code invalide'); }
    };
    $('oReset').onclick = ()=>ask('Tout effacer, y compris les points quantiques ?', ()=>{ try{ localStorage.removeItem(KEY); }catch(e){} newGame(); income=[]; sel=null; showSel(); buildShop(); renderTab(); });
  }
}
$('bUp').onclick = ()=>openTab('up');
$('bQp').onclick = ()=>openTab('qp');
$('bAch').onclick = ()=>openTab('ach');
$('bOpt').onclick = ()=>openTab('opt');

// fichier doré
let goldTimer = 0, goldNext = 60 + Math.random()*60, goldLife = 0;
function updateGold(dt){
  const g=$('gold');
  if(goldLife>0){ goldLife-=dt; if(goldLife<=0) g.style.display='none'; return; }
  goldTimer += dt;
  if(goldTimer>=goldNext){
    goldTimer=0; goldNext = 70 + Math.random()*80; goldLife = 12;
    g.style.left = (40+Math.random()*(W-120))+'px'; g.style.top = (110+Math.random()*(H-300))+'px'; g.style.display='block';
  }
}
$('gold').onclick = ()=>{
  const r = Math.max(100, G.lastRate*15);
  G.money += r; G.run += r; G.lifetime += r; G.golds++;
  $('gold').style.display='none'; goldLife=0;
  blip(880,0.2,0.08,'triangle'); toast('Fichier doré ! +'+fmt(r)+' crédits');
};

// succès
function checkAch(){
  for(const a of ACH) if(!G.ach[a.id] && a.t()){ G.ach[a.id]=true; toast('Succès : '+a.name+' (+2 % de revenus)'); blip(990,0.25,0.07,'triangle'); if(tab==='ach') renderTab(); }
}

// Objectifs : r = récompense minimale, s = secondes de revenus actuels (la plus grande des deux est versée)
const cnt = t => G.nodes.filter(n=>n.type===t).length;
const OBJ = [
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
const objReward = o => Math.max(o.r, (o.s||0)*G.lastRate);
function checkObj(){
  const o = OBJ[G.obj]; if(!o) return;
  const [c,t] = o.p();
  if(c>=t){
    const r = objReward(o);
    G.money+=r; G.run+=r; G.lifetime+=r; G.obj++;
    toast('Objectif accompli : '+o.d+' (+'+fmt(r)+' crédits)'); blip(700,0.2,0.07,'triangle');
  }
}
function updateObjHud(){
  const o = OBJ[G.obj], el = $('obj');
  if(!o){ el.style.display='none'; return; }
  const [c,t] = o.p(), f = Math.max(0,Math.min(1,c/t));
  el.style.display='block';
  el.innerHTML = `<small>Objectif ${G.obj+1}/${OBJ.length}  -  récompense ${fmt(objReward(o))}</small><div>${o.d}  <span>${fmt(Math.min(c,t))} / ${fmt(t)}</span></div><i style="width:${f*100}%"></i>`;
}

function drawSpark(){
  const c=$('spark'); if(!c) return; const x=c.getContext('2d'), w=c.width, h=c.height;
  x.clearRect(0,0,w,h);
  if(hist.length<2){ x.fillStyle='#8794b3'; x.font='20px system-ui'; x.fillText('Collecte des données...',20,h/2); return; }
  const mx=Math.max(...hist,1);
  x.strokeStyle='#1f2a42'; x.lineWidth=1; for(let i=1;i<4;i++){ x.beginPath(); x.moveTo(0,h*i/4); x.lineTo(w,h*i/4); x.stroke(); }
  x.beginPath(); hist.forEach((v,i)=>{ const px=i/(hist.length-1)*w, py=h-8-(v/mx)*(h-24); i?x.lineTo(px,py):x.moveTo(px,py); });
  x.strokeStyle='#4fd1c5'; x.lineWidth=3; x.stroke();
  x.lineTo(w,h); x.lineTo(0,h); x.closePath(); x.fillStyle='#4fd1c533'; x.fill();
  x.fillStyle='#8794b3'; x.font='18px system-ui'; x.fillText('max '+fmt(mx)+' / s',8,18);
}
setInterval(()=>{ if(!G) return; hist.push(G.lastRate); if(hist.length>150) hist.shift(); if(tab==='stat') drawSpark(); }, 2000);

// Overclock, vue, minimap
function useOverclock(){
  if(G.playtime < G.oc.ready) { toast('Overclock en recharge'); return; }
  G.oc.until = G.playtime + 15 + G.tech.toc; G.oc.ready = G.playtime + Math.max(30, 90 - 6*G.tech.toc);
  blip(300,0.4,0.08,'sawtooth'); toast('Overclock : vitesse x2 pendant 15 s');
}
function fitView(){
  if(!G.nodes.length) return;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const n of G.nodes){ x0=Math.min(x0,n.x); y0=Math.min(y0,n.y); x1=Math.max(x1,n.x+NW); y1=Math.max(y1,n.y+NH); }
  const k = Math.max(ZMIN,Math.min(1.5, Math.min((W-120)/(x1-x0), (H-300)/(y1-y0)))); zoomT = null;
  G.view.k = k; G.view.x = -((x0+x1)/2)*k; G.view.y = -((y0+y1)/2)*k - 20;
}
const mini = $('mini'), mx = mini.getContext('2d');
let miniB = null;
function drawMini(){
  if(getComputedStyle(mini).display==='none') return;
  const w=mini.width, h=mini.height;
  mx.clearRect(0,0,w,h); mx.fillStyle='#0a0e16cc'; mx.fillRect(0,0,w,h);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const n of G.nodes){ x0=Math.min(x0,n.x); y0=Math.min(y0,n.y); x1=Math.max(x1,n.x+NW); y1=Math.max(y1,n.y+NH); }
  const tl=toWorld(0,0), br=toWorld(W,H);
  x0=Math.min(x0,tl.x); y0=Math.min(y0,tl.y); x1=Math.max(x1,br.x); y1=Math.max(y1,br.y);
  const k=Math.min((w-8)/(x1-x0),(h-8)/(y1-y0)), ox=(w-(x1-x0)*k)/2, oy=(h-(y1-y0)*k)/2;
  miniB = {x0,y0,k,ox,oy};
  for(const n of G.nodes){ mx.fillStyle=COLORS[n.type]; mx.fillRect(ox+(n.x-x0)*k, oy+(n.y-y0)*k, Math.max(3,NW*k), Math.max(2,NH*k)); }
  mx.strokeStyle='#ffffff99'; mx.lineWidth=1; mx.strokeRect(ox+(tl.x-x0)*k, oy+(tl.y-y0)*k, (br.x-tl.x)*k, (br.y-tl.y)*k);
}
mini.addEventListener('pointerdown', e=>{
  if(!miniB) return;
  const r = mini.getBoundingClientRect(), b = miniB;
  const wx = b.x0 + ((e.clientX-r.left)*(mini.width/r.width) - b.ox)/b.k;
  const wy = b.y0 + ((e.clientY-r.top)*(mini.height/r.height) - b.oy)/b.k;
  G.view.x = -wx*G.view.k; G.view.y = -wy*G.view.k;
});
$('bOc').onclick = useOverclock;
$('bFit').onclick = fitView;

// Sauvegarde 
const KEY = 'uploadlab2';
function serialize(){ G.savedAt = Date.now(); return JSON.parse(JSON.stringify(G, (k,v)=> k==='packets' ? [] : v)); }
function hydrate(d){
  const g = Object.assign({rp:0,rpTotal:0,obj:0,daily:'',oc:{until:0,ready:0},lifetime:0,files:0,qp:0,qpTotal:0,resets:0,golds:0,playtime:0,lastRate:0,mute:false,savedAt:Date.now()}, d);
  g.ach = g.ach||{}; g.tech = g.tech||{};
  for(const t of TECH) g.tech[t.id] = g.tech[t.id]||0;
  g.pu = Object.assign({start:0,spd:0,disc:0,off:0,auto:0,rev:0}, g.pu);
  g.glob = Object.assign({rev:0,spd:0,seed:0,buf:0,crit:0}, g.glob);
  g.nodes = (g.nodes||[]).filter(n=>DEFS[n.type]);
  for(const n of g.nodes){
    n.inb = Array.from({length:DEFS[n.type].ins},(_,i)=>(n.inb&&n.inb[i])||[]);
    n.outq = (n.outq||[]).filter(q=>q && typeof q==='object');
    n.work = n.work && n.work.rem!==undefined ? n.work : null;
  }
  g.links = (g.links||[]).filter(l=>g.nodes.some(n=>n.id===l.a) && g.nodes.some(n=>n.id===l.b)).map(l=>Object.assign(l,{packets:[]}));
  return g;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(serialize())); }catch(e){} }
function load(){
  try{
    const s = localStorage.getItem(KEY); if(!s) return false;
    const d = JSON.parse(s); if(!d.nodes || !d.nodes.length) return false;
    G = hydrate(d);
    const secs = Math.min((Date.now()-G.savedAt)/1000, 3*3600);
    if(secs>30 && G.lastRate>0){
      const gain = G.lastRate*secs*(0.4+0.08*G.pu.off);
      G.money+=gain; G.run+=gain; G.lifetime+=gain;
      setTimeout(()=>toast(`Pendant ton absence (${Math.floor(secs/60)} min) : +${fmt(gain)} crédits`),600);
    }
    const today = new Date().toISOString().slice(0,10);
    if(G.daily!==today){
      G.daily = today;
      const r = Math.max(500, G.lastRate*600);
      G.money+=r; G.run+=r; G.lifetime+=r;
      setTimeout(()=>toast('Bonus quotidien : +'+fmt(r)+' crédits'),3500);
    }
    return true;
  }catch(e){ return false; }
}
setInterval(save, 5000);
addEventListener('beforeunload', save);

// Boucle 
if(!load()) newGame();
buildShop();
let last = performance.now(), uiT = 0, autoT = 0;
function hintText(){
  if(G.obj>=2) return '';
  if(G.files>=30 && G.resets===0 && G.lifetime>=100) return '';
  if(!G.links.length) return 'Glisse depuis le port rond de sortie d\'un nœud vers l\'entrée d\'un autre pour les relier. Relie la Source à l\'Upload !';
  if(!(G.bought.compress)) return 'Bien ! Achète un Compresseur (en bas) et place-le entre la Source et l\'Upload : ses fichiers valent le double.';
  if(G.lifetime<100) return 'Clique sur un nœud pour l\'améliorer. Plus de nœuds + plus de niveaux = plus de crédits !';
  return 'Astuce : plusieurs Sources, des Diviseurs et des Fusions te permettent de paralléliser. De nouveaux nœuds se débloquent en gagnant des crédits.';
}
function loop(now){
  const dt = Math.min(0.25,(now-last)/1000); last = now;
  const n = Math.max(1,Math.ceil(dt/0.05));
  for(let i=0;i<n;i++) step(dt/n);
  for(let i=floats.length-1;i>=0;i--){ floats[i].life -= dt*0.9; if(floats[i].life<=0) floats.splice(i,1); }
  for(let i=parts.length-1;i>=0;i--){ const q=parts[i]; q.life-=dt*1.6; q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=300*dt; if(q.life<=0) parts.splice(i,1); }
  updateGold(dt);
  draw();
  autoT += dt;
  if(G.pu.auto && autoT>6){
    autoT=0;
    let best=null; for(const nd of G.nodes) if(!best || nd.level<best.level) best=nd;
    if(best && G.money >= upCost(best)*3){ G.money-=upCost(best); best.level++; }
  }
  uiT += dt;
  if(uiT>0.2){
    uiT=0;
    income = income.filter(e=>now-e.t<10000);
    G.lastRate = income.reduce((s,e)=>s+e.v,0)/10;
    $('money').textContent = fmt(G.money);
    $('rate').textContent = fmt(G.lastRate);
    $('files').textContent = fmt(G.files);
    $('mult').textContent = '×'+revMult().toFixed(2);
    $('bQp').classList.toggle('glow', qpGain()>=1);
    $('bQp').textContent = qpGain()>=1 ? `Quantique (+${qpGain()})` : 'Quantique';
    refreshShop(); refreshSelButtons(); checkAch(); checkObj(); updateObjHud();
    const oc=$('bOc');
    if(ocActive()) oc.textContent='Overclock actif : '+Math.ceil(G.oc.until-G.playtime)+' s';
    else if(G.playtime<G.oc.ready) oc.textContent='Overclock : '+Math.ceil(G.oc.ready-G.playtime)+' s';
    else oc.textContent='Overclock';
    oc.disabled = !ocActive() && G.playtime<G.oc.ready; oc.classList.toggle('glow', !oc.disabled && !ocActive());
    if(tab==='up' || tab==='qp' || tab==='res'){
      const sig = tab+GLOBALS.map(g=>G.money>=gUpCost(g)).join()+PU.map(d=>G.qp>=puCost(d)).join()+qpGain()+TECH.map(d=>G.rp>=techCost(d)).join();
      if(sig!==tabSig){ tabSig=sig; renderTab(); }
    }
    const h=hintText(); $('hint').style.display=h?'block':'none'; $('hint').textContent=h;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__game = {get G(){return G;}, connect, step, addNode, qpGain, reboot, fmt};
