'use strict';
// ═════════════════════════ Définitions ═════════════════════════
const NW = 160, NH = 70;
const DEFS = {
  source:  {name:'Source',        icon:'📁', ins:0, outs:1, cost:15,    t:2.0,  val:1,    unlock:0,   desc:'Génère un fichier de valeur 1.'},
  upload:  {name:'Upload',        icon:'☁️', ins:1, outs:0, cost:20,    t:0.6,  unlock:0,           desc:'Envoie les fichiers vers le cloud et rapporte des crédits.'},
  compress:{name:'Compresseur',   icon:'🗜️', ins:1, outs:1, cost:40,    t:1.5,  mult:2,   unlock:0, desc:'Double la valeur d\'un fichier.'},
  split:   {name:'Diviseur',      icon:'🔀', ins:1, outs:2, cost:60,    t:0.2,  unlock:20,          desc:'Répartit les fichiers sur deux sorties, en alternance.'},
  merge:   {name:'Fusion',        icon:'🧩', ins:2, outs:1, cost:140,   t:1.0,  unlock:100,         desc:'Fusionne 2 fichiers : (a + b) × 1,3.'},
  encrypt: {name:'Chiffreur',     icon:'🔒', ins:1, outs:1, cost:300,   t:3.0,  mult:3,   unlock:200, desc:'Triple la valeur d\'un fichier.'},
  clone:   {name:'Clonage',       icon:'🧬', ins:1, outs:2, cost:900,   t:1.2,  unlock:600,         desc:'Duplique un fichier sur les deux sorties.'},
  ai:      {name:'Analyseur IA',  icon:'🧠', ins:1, outs:1, cost:2000,  t:7.0,  mult:8,   unlock:1500, desc:'Valeur ×8. Lent mais puissant.'},
  mega:    {name:'Super Source',  icon:'🗄️', ins:0, outs:1, cost:6000,  t:3.0,  val:25,   unlock:4000, desc:'Génère des fichiers de valeur 25.'},
  quantum: {name:'Quantique',     icon:'⚛️', ins:1, outs:1, cost:40000, t:14.0, mult:40,  unlock:25000, desc:'Valeur ×40. Très lent, très puissant.'},
  sing:    {name:'Singularité',   icon:'🕳️', ins:1, outs:1, cost:3e6,   t:40.0, mult:1000, unlock:2e6, needQp:1, desc:'Valeur ×1000. Réservé aux joueurs ayant fait un Reboot.'},
};
const ORDER = Object.keys(DEFS);
const COLORS = {source:'#4fd1c5',upload:'#f6c453',split:'#9f7aea',compress:'#63b3ed',merge:'#f687b3',encrypt:'#68d391',clone:'#f6ad55',ai:'#fc8181',mega:'#38b2ac',quantum:'#b794f4',sing:'#ffffff'};

const GLOBALS = [
  {id:'rev',  name:'Marketing',          desc:'+25 % de revenus par upload',          base:100, grow:2.1, max:60},
  {id:'spd',  name:'Fibre optique',      desc:'+10 % de vitesse partout',             base:250, grow:2.4, max:40},
  {id:'seed', name:'Meilleurs capteurs', desc:'+1 valeur de départ des Sources',      base:500, grow:2.8, max:40},
  {id:'buf',  name:'Mémoire tampon',     desc:'+1 capacité des files d\'attente',     base:400, grow:2.4, max:6},
  {id:'crit', name:'Upload chanceux',    desc:'+3 % de chance d\'upload ×5',          base:1500,grow:2.6, max:15},
];
const PU = [
  {id:'start', name:'Capital de départ',     desc:'Démarre chaque run avec plus de crédits', base:1, grow:2, max:8, eff:l=>'Crédits de départ : '+fmt(startCash(l))},
  {id:'spd',   name:'Surcadençage',          desc:'+10 % de vitesse permanente',             base:1, grow:2, max:10, eff:l=>'+'+l*10+' %'},
  {id:'disc',  name:'Négociation',           desc:'−5 % sur le prix des nœuds',              base:2, grow:2, max:6,  eff:l=>'−'+l*5+' %'},
  {id:'off',   name:'Serveurs de nuit',      desc:'+10 % de gains hors-ligne (base 50 %)',   base:2, grow:2, max:5,  eff:l=>(50+l*10)+' %'},
  {id:'auto',  name:'Ingénieur automatique', desc:'Améliore automatiquement tes nœuds',      base:10,grow:1, max:1,  eff:l=>l?'Actif':'—'},
];
const startCash = l => l ? 500 * Math.pow(4, l-1) : 60;

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
  {id:'a17',name:'Ingénieur',        desc:'Un nœud au niveau 20',        t:()=>G.nodes.some(n=>n.level>=19)},
];

// ═════════════════════════ État ═════════════════════════
let G = null;
function blankRun(g){
  g.money = startCash(g.pu.start); g.run = 0; g.nextId = 1;
  g.nodes = []; g.links = []; g.bought = {};
  g.glob = {rev:0,spd:0,seed:0,buf:0,crit:0};
  g.view = {x:0,y:0,k:1};
}
function newGame(){
  G = {lifetime:0, files:0, qp:0, qpTotal:0, resets:0, golds:0, playtime:0, lastRate:0, ach:{}, pu:{start:0,spd:0,disc:0,off:0,auto:0}, mute:false, savedAt:Date.now()};
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
const buyCost = type => Math.ceil(DEFS[type].cost * Math.pow(1.18, G.bought[type]||0) * (1 - 0.05*G.pu.disc));
const upCost = (n, lvl) => Math.ceil(DEFS[n.type].cost * 0.8 * Math.pow(1.6, lvl===undefined?n.level:lvl) + 10);
const gUpCost = d => Math.ceil(d.base * Math.pow(d.grow, G.glob[d.id]));
const puCost = d => Math.ceil(d.base * Math.pow(d.grow, G.pu[d.id]) * (d.grow===1?1:1));
const speedOf = n => (1 + 0.3*n.level) * (1 + 0.1*G.glob.spd) * (1 + 0.1*G.pu.spd);
const timeOf = n => DEFS[n.type].t / speedOf(n);
const bufCap = () => 3 + G.glob.buf;
const revMult = () => (1 + 0.25*G.glob.rev) * (1 + 0.1*G.qpTotal) * (1 + 0.02*achCount());
const critChance = () => 0.03*G.glob.crit;
const qpGain = () => Math.floor(Math.sqrt(G.run/1e6));

// ═════════════════════════ Géométrie ═════════════════════════
const inPort  = (n,i) => ({x:n.x,    y:n.y + NH*(i+1)/(DEFS[n.type].ins+1)});
const outPort = (n,i) => ({x:n.x+NW, y:n.y + NH*(i+1)/(DEFS[n.type].outs+1)});
function ctrl(a,b){ const d=Math.max(60,Math.abs(b.x-a.x)/2); return [a,{x:a.x+d,y:a.y},{x:b.x-d,y:b.y},b]; }
function bez(p,t){ const u=1-t; return {
  x:u*u*u*p[0].x+3*u*u*t*p[1].x+3*u*t*t*p[2].x+t*t*t*p[3].x,
  y:u*u*u*p[0].y+3*u*u*t*p[1].y+3*u*t*t*p[2].y+t*t*t*p[3].y}; }
const linkPts = l => ctrl(outPort(nodeById(l.a),l.ao), inPort(nodeById(l.b),l.bi));
const linkFrom = (id,o) => G.links.find(l=>l.a===id && l.ao===o);

// ═════════════════════════ Effets (sons, textes) ═════════════════════════
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
const floats = [];
function floatText(x,y,text,col='#f6c453',size=15){ if(floats.length<60) floats.push({x,y,text,col,size,life:1}); }

// ═════════════════════════ Simulation ═════════════════════════
let income = [];
function earn(v, n, crit){
  G.money += v; G.run += v; G.lifetime += v;
  income.push({t:performance.now(), v});
  if(n) floatText(n.x+NW/2, n.y-4, '+'+fmt(v), crit?'#ff9f43':'#f6c453', crit?20:15);
  upSound(crit);
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
      if(n.timer>=t){ n.timer=0; n.outq.push({v:def.val + G.glob.seed*(def.val>1?5:1), o:-1}); }
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

// ═════════════════════════ Prestige ═════════════════════════
function reboot(){
  const g = qpGain(); if(g<1) return;
  if(!confirm(`Reboot quantique ?\nTu gagnes ${g} point(s) quantique(s) (+${g*10} % de revenus permanents).\nTes nœuds, crédits et améliorations de run sont remis à zéro.`)) return;
  G.qp += g; G.qpTotal += g; G.resets++;
  blankRun(G);
  addNode('source', -280, -40, true);
  addNode('upload', 180, -40, true);
  income = []; sel = null; showSel(); renderTab(); buildShop();
  toast(`⚛ Reboot ! +${g} point(s) quantique(s)`);
  save();
}

// ═════════════════════════ Rendu ═════════════════════════
const cv = document.getElementById('c'), cx = cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){ DPR=window.devicePixelRatio||1; W=innerWidth; H=innerHeight; cv.width=W*DPR; cv.height=H*DPR; }
addEventListener('resize',resize); resize();
const toWorld = (sx,sy)=>({x:(sx-W/2-G.view.x)/G.view.k, y:(sy-H/2-G.view.y)/G.view.k});

const SUF = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
function fmt(v){
  if(!isFinite(v)) return '∞';
  if(v<1000) return v<10 ? (Math.round(v*10)/10).toString() : Math.floor(v).toString();
  let i=0; while(v>=1000 && i<SUF.length-1){ v/=1000; i++; }
  return v.toFixed(v<10?2:v<100?1:0)+SUF[i];
}
const rrect = (x,y,w,h,r)=>{ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); };
function packetColor(v){
  return v<10?'#4fd1c5': v<100?'#63b3ed': v<1e3?'#f6c453': v<1e4?'#f6ad55': v<1e5?'#f687b3': v<1e6?'#b794f4':'#ffffff';
}

let sel = null, drag = null, hoverPort = null;
function draw(){
  const v = G.view, tm = performance.now()/1000;
  cx.setTransform(DPR,0,0,DPR,0,0);
  cx.clearRect(0,0,W,H);
  const gs = 40*v.k;
  cx.strokeStyle='#121a2a'; cx.lineWidth=1; cx.beginPath();
  const ox = ((W/2+v.x)%gs+gs)%gs, oy = ((H/2+v.y)%gs+gs)%gs;
  for(let x=ox;x<W;x+=gs){ cx.moveTo(x,0); cx.lineTo(x,H); }
  for(let y=oy;y<H;y+=gs){ cx.moveTo(0,y); cx.lineTo(W,y); }
  cx.stroke();

  cx.save();
  cx.translate(W/2+v.x, H/2+v.y); cx.scale(v.k,v.k);

  for(const l of G.links){
    const p = linkPts(l);
    cx.lineWidth = 5; cx.strokeStyle = '#1f2a42';
    cx.beginPath(); cx.moveTo(p[0].x,p[0].y); cx.bezierCurveTo(p[1].x,p[1].y,p[2].x,p[2].y,p[3].x,p[3].y); cx.stroke();
    cx.lineWidth = 2; cx.strokeStyle = '#3a4d78'; cx.setLineDash([8,10]); cx.lineDashOffset = -tm*30;
    cx.stroke(); cx.setLineDash([]);
    for(const k of l.packets){
      const q = bez(p,k.t), c = packetColor(k.v);
      cx.shadowColor=c; cx.shadowBlur=10; cx.fillStyle=c;
      rrect(q.x-6,q.y-6,12,12,3); cx.fill();
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
    cx.font='22px system-ui'; cx.fillStyle='#fff'; cx.fillText(d.icon, n.x+12, n.y+24);
    cx.font='600 13px system-ui'; cx.fillStyle='#e6ecf8'; cx.fillText(d.name, n.x+42, n.y+18);
    cx.font='11px system-ui'; cx.fillStyle='#8794b3';
    const buf = n.inb.reduce((s,q)=>s+q.length,0);
    cx.fillText('Niv. '+(n.level+1)+(d.ins?'  ·  file '+buf+'/'+bufCap():'  ·  '+(1/timeOf(n)).toFixed(2)+'/s'), n.x+42, n.y+35);
    for(let i=0;i<d.ins;i++) port(inPort(n,i), hoverPort&&hoverPort.in&&hoverPort.n===n.id&&hoverPort.i===i, false, col, G.links.some(l=>l.b===n.id&&l.bi===i));
    for(let i=0;i<d.outs;i++) port(outPort(n,i), hoverPort&&!hoverPort.in&&hoverPort.n===n.id&&hoverPort.i===i, true, col, !!linkFrom(n.id,i));
  }
  for(const f of floats){
    cx.globalAlpha = Math.max(0,f.life); cx.fillStyle=f.col; cx.font=`700 ${f.size}px system-ui`; cx.textAlign='center';
    cx.fillText(f.text, f.x, f.y - (1-f.life)*40);
  }
  cx.globalAlpha = 1;
  cx.restore();
}
function port(p,hot,out,col,linked){
  cx.beginPath(); cx.arc(p.x,p.y,hot?10:7,0,Math.PI*2);
  cx.fillStyle = out ? col : (linked ? col : '#0a0e16'); cx.fill();
  cx.strokeStyle = hot ? '#fff' : (out ? '#0a0e16' : '#8794b3'); cx.lineWidth=2; cx.stroke();
}

// ═════════════════════════ Interactions ═════════════════════════
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
    pinch={d:Math.hypot(a.x-b.x,a.y-b.y), k:G.view.k}; drag=null; return;
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
    v.k = Math.max(0.3, Math.min(2.5, pinch.k*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d));
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
  const v=G.view, w=toWorld(e.clientX,e.clientY);
  v.k = Math.max(0.3, Math.min(2.5, v.k*(e.deltaY<0?1.1:1/1.1)));
  v.x = e.clientX - W/2 - w.x*v.k; v.y = e.clientY - H/2 - w.y*v.k;
},{passive:false});
addEventListener('keydown', e=>{
  if(e.target.tagName==='TEXTAREA') return;
  if((e.key==='Delete'||e.key==='Backspace') && sel){ const n=nodeById(sel); if(n) sell(n); }
});

// ═════════════════════════ UI ═════════════════════════
const $ = id => document.getElementById(id);
function toast(msg){ const t=$('toast'); t.textContent=msg; t.style.opacity=1; clearTimeout(toast.h); toast.h=setTimeout(()=>t.style.opacity=0,2600); }
const unlocked = type => G.lifetime >= DEFS[type].unlock && (!DEFS[type].needQp || G.qpTotal>=DEFS[type].needQp);

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
      b.innerHTML = `<b>${d.icon} ${d.name}</b><small>${d.desc}</small><span class="c">💰 ${fmt(buyCost(type))}</span>`;
      b.disabled = G.money < buyCost(type);
    } else {
      const need = d.needQp && G.qpTotal<d.needQp ? 'Nécessite un Reboot' : 'Débloqué à '+fmt(d.unlock)+' crédits gagnés';
      b.innerHTML = `<b>🔒 ???</b><small>${need}</small>`;
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
  if(d.val) extra = `1 fichier de valeur ${d.val + G.glob.seed*(d.val>1?5:1)} toutes les ${t.toFixed(2)} s.`;
  else if(n.type==='upload') extra = `1 fichier toutes les ${t.toFixed(2)} s (revenus ×${revMult().toFixed(2)}).`;
  else extra = `${t.toFixed(2)} s par fichier.`;
  box.innerHTML = `<h3>${d.icon} ${d.name} — niveau ${n.level+1}</h3><p>${d.desc}</p><p>${extra}</p>
    <div class="row"><button id="bu1"></button><button id="bu10"></button><button id="buM"></button></div>
    <div class="row"><button id="bDis">✂ Déconnecter</button><button id="bSell">🗑 Vendre +${fmt(Math.floor(buyCost(n.type)*0.4))}</button></div>`;
  box.style.display='block';
  refreshSelButtons();
  $('bu1').onclick = ()=>upgradeNode(n,1);
  $('bu10').onclick = ()=>upgradeNode(n,10);
  $('buM').onclick = ()=>upgradeNode(n,maxAffordable(n));
  $('bDis').onclick = ()=>{ G.links = G.links.filter(l=>l.a!==n.id && l.b!==n.id); };
  $('bSell').onclick = ()=>sell(n);
}
function refreshSelButtons(){
  const n = sel ? nodeById(sel) : null; if(!n || !$('bu1')) return;
  const c1=upCost(n), c10=bulkCost(n,10), m=maxAffordable(n);
  $('bu1').innerHTML = `⬆ ×1<br>💰 ${fmt(c1)}`;  $('bu1').disabled = G.money<c1;
  $('bu10').innerHTML = `⬆ ×10<br>💰 ${fmt(c10)}`; $('bu10').disabled = G.money<c10;
  $('buM').innerHTML = `⬆ Max (${m})<br>💰 ${fmt(bulkCost(n,m))}`; $('buM').disabled = m<1;
}

// panneau latéral à onglets
let tab = null, tabSig = '';
const TABS = [['up','Améliorations'],['qp','Quantique'],['ach','Succès'],['opt','Options']];
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
        <button data-g="${g.id}" ${max||G.money<c?'disabled':''}>${max?'MAX':'💰 '+fmt(c)}</button></div>`;
    }).join('');
    body.querySelectorAll('button[data-g]').forEach(b=>b.onclick=()=>{
      const g=GLOBALS.find(x=>x.id===b.dataset.g), c=gUpCost(g);
      if(G.money>=c && G.glob[g.id]<g.max){ G.money-=c; G.glob[g.id]++; blip(780,0.1,0.06,'triangle'); renderTab(); showSel(); }
    });
  } else if(tab==='qp'){
    const gain=qpGain();
    body.innerHTML = `<p>Un <b class="qp">Reboot quantique</b> remet ta progression à zéro, mais te donne des <b class="qp">points quantiques</b> :
      +10 % de revenus permanents par point obtenu, et ils se dépensent en bonus permanents.</p>
      <div class="item"><div><b class="qp">⚛ ${G.qp} point(s)</b> disponible(s)<p>Total : ${G.qpTotal} · Reboots : ${G.resets} · Bonus : ×${(1+0.1*G.qpTotal).toFixed(1)}</p></div></div>
      <button id="bReboot" class="${gain>=1?'glow':''}" style="width:100%" ${gain<1?'disabled':''}>⚛ Reboot : +${gain} point(s)</button>
      <p>${gain<1?'Il faut gagner 1 M de crédits dans ce run pour obtenir le premier point. Le gain croît avec la racine carrée des crédits gagnés.':'Gagne plus de crédits avant de rebooter pour obtenir plus de points.'}</p>` +
      PU.map(d=>{
        const lv=G.pu[d.id], max=lv>=d.max, c=puCost(d);
        return `<div class="item"><div><b>${d.name}</b> <small>(${lv}/${d.max})</small><p>${d.desc}<br><span class="qp">${d.eff(lv)}</span></p></div>
          <button data-p="${d.id}" ${max||G.qp<c?'disabled':''}>${max?'MAX':'⚛ '+c}</button></div>`;
      }).join('');
    $('bReboot').onclick = reboot;
    body.querySelectorAll('button[data-p]').forEach(b=>b.onclick=()=>{
      const d=PU.find(x=>x.id===b.dataset.p), c=puCost(d);
      if(G.qp>=c && G.pu[d.id]<d.max){ G.qp-=c; G.pu[d.id]++; renderTab(); }
    });
  } else if(tab==='ach'){
    body.innerHTML = `<p>${achCount()}/${ACH.length} succès · chaque succès donne +2 % de revenus (actuellement +${achCount()*2} %).</p>` +
      ACH.map(a=>`<div class="item ${G.ach[a.id]?'done':'lock'}"><div><b>${G.ach[a.id]?'✅':'🔒'} ${a.name}</b><p>${a.desc}</p></div></div>`).join('');
  } else if(tab==='opt'){
    body.innerHTML = `<div class="item"><div><b>Son</b></div><button id="oMute">${G.mute?'🔇 Désactivé':'🔊 Activé'}</button></div>
      <div class="item"><div><b>Sauvegarde</b><p>Exporter / importer ta partie (texte).</p></div></div>
      <textarea id="oTxt" placeholder="Code de sauvegarde…"></textarea>
      <div class="row"><button id="oExp">Exporter</button><button id="oImp">Importer</button></div>
      <div class="row"><button id="oReset" style="color:var(--bad)">↺ Tout effacer</button></div>
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
    $('oReset').onclick = ()=>{ if(confirm('Tout effacer, y compris les points quantiques ?')){ localStorage.removeItem(KEY); newGame(); income=[]; sel=null; showSel(); buildShop(); renderTab(); } };
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
  const r = Math.max(100, G.lastRate*60);
  G.money += r; G.run += r; G.lifetime += r; G.golds++;
  $('gold').style.display='none'; goldLife=0;
  blip(880,0.2,0.08,'triangle'); toast('💎 Fichier doré ! +'+fmt(r)+' crédits');
};

// succès
function checkAch(){
  for(const a of ACH) if(!G.ach[a.id] && a.t()){ G.ach[a.id]=true; toast('🏆 Succès : '+a.name+' (+2 % de revenus)'); blip(990,0.25,0.07,'triangle'); if(tab==='ach') renderTab(); }
}

// ═════════════════════════ Sauvegarde ═════════════════════════
const KEY = 'uploadlab2';
function serialize(){ G.savedAt = Date.now(); return JSON.parse(JSON.stringify(G, (k,v)=> k==='packets' ? [] : v)); }
function hydrate(d){
  const g = Object.assign({lifetime:0,files:0,qp:0,qpTotal:0,resets:0,golds:0,playtime:0,lastRate:0,mute:false,savedAt:Date.now()}, d);
  g.ach = g.ach||{};
  g.pu = Object.assign({start:0,spd:0,disc:0,off:0,auto:0}, g.pu);
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
    const secs = Math.min((Date.now()-G.savedAt)/1000, 8*3600);
    if(secs>30 && G.lastRate>0){
      const gain = G.lastRate*secs*(0.5+0.1*G.pu.off);
      G.money+=gain; G.run+=gain; G.lifetime+=gain;
      setTimeout(()=>toast(`Pendant ton absence (${Math.floor(secs/60)} min) : +${fmt(gain)} crédits`),600);
    }
    return true;
  }catch(e){ return false; }
}
setInterval(save, 5000);
addEventListener('beforeunload', save);

// ═════════════════════════ Boucle ═════════════════════════
if(!load()) newGame();
buildShop();
let last = performance.now(), uiT = 0, autoT = 0;
function hintText(){
  if(G.files>=30 && G.resets===0 && G.lifetime>=100) return '';
  if(!G.links.length) return 'Glisse depuis le port ● de sortie d\'un nœud vers l\'entrée d\'un autre pour les relier. Relie la Source à l\'Upload !';
  if(!(G.bought.compress)) return 'Bien ! Achète un Compresseur (en bas) et place-le entre la Source et l\'Upload : ses fichiers valent le double.';
  if(G.lifetime<100) return 'Clique sur un nœud pour l\'améliorer. Plus de nœuds + plus de niveaux = plus de crédits !';
  return 'Astuce : plusieurs Sources, des Diviseurs et des Fusions te permettent de paralléliser. De nouveaux nœuds se débloquent en gagnant des crédits.';
}
function loop(now){
  const dt = Math.min(0.25,(now-last)/1000); last = now;
  const n = Math.max(1,Math.ceil(dt/0.05));
  for(let i=0;i<n;i++) step(dt/n);
  for(let i=floats.length-1;i>=0;i--){ floats[i].life -= dt*0.9; if(floats[i].life<=0) floats.splice(i,1); }
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
    $('bQp').textContent = qpGain()>=1 ? `⚛ Quantique (+${qpGain()})` : '⚛ Quantique';
    refreshShop(); refreshSelButtons(); checkAch();
    if(tab==='up' || tab==='qp'){
      const sig = tab+GLOBALS.map(g=>G.money>=gUpCost(g)).join()+PU.map(d=>G.qp>=puCost(d)).join()+qpGain();
      if(sig!==tabSig){ tabSig=sig; renderTab(); }
    }
    const h=hintText(); $('hint').style.display=h?'block':'none'; $('hint').textContent=h;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__game = {get G(){return G;}, connect, step, addNode, qpGain, reboot, fmt};
