// Tests de caracterisation : executent le vrai jeu dans Chromium (Playwright) avec un generateur aleatoire seede,
// et comparent des instantanes (tests/snapshots.json) au comportement actuel.
//   node tests/run.cjs            verifie
//   node tests/run.cjs --update   regenere les instantanes (a ne faire que pour un changement voulu)
const fs = require('fs'), path = require('path'), cp = require('child_process');
function pw(){ try{ return require('playwright'); }catch(e){ return require(path.join(cp.execSync('npm root -g').toString().trim(),'playwright')); } }
const { chromium } = pw();
const argRoot = (process.argv.find(a=>a.startsWith('--root='))||'').slice(7);
const ROOT = argRoot ? path.resolve(argRoot) : path.join(__dirname,'..');
const RENDER = process.argv.includes('--render');   // empreintes de pixels du canvas : propres a la machine (polices), donc hors du `npm test` par defaut
const SNAP = path.join(__dirname, RENDER ? 'render.json' : 'snapshots.json');
const UPDATE = process.argv.includes('--update');
const chromePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// ---- scenarios executes dans la page (une seule evaluation synchrone : pas de boucle de jeu entre deux pas) ----
const SCENARIOS = {

  formulas(){
    const r = x => typeof x==='number' ? +x.toPrecision(10) : x;
    const out = {};
    out.fmt = [0,0.5,9.99,10,999,1000,12345,1e6,5.5e9,1e15,1e33,1e39,1e45,Infinity].map(v=>fmt(v));
    G.sci = true; out.fmtSci = [1000,12345,1e6,1e33].map(v=>fmt(v)); G.sci = false;
    out.tier = [0,9,10,19,25,70,79,200].map(l=>tierOf(l));
    out.lvlMult = [0,9,10,25,50].map(l=>r(lvlMult(l)));
    newGame(); G.qpTotal = 0;
    out.cost0 = ORDER.map(t=>r(buyCost(t)));
    const n = G.nodes[0];
    out.upCost = [0,1,5,10,30].map(l=>r(upCost(n,l)));
    out.speed = [0,1,9,10,29].map(l=>r(speedOf(n,l)));
    out.time = r(timeOf(n));
    G.qpTotal = 12; G.glob.rev = 3; G.glob.spd = 2; G.pu.rev = 2; G.pu.spd = 1; G.tech.trev = 2; G.tech.tspd = 1; G.pu.disc = 2; G.tech.tcost = 3; G.tech.tup = 2;
    out.mods = {rev:r(revMult()), buy:r(buyCost('compress')), up:r(upCost(n,5)), speed:r(speedOf(n,5)), infl:r(infl()), crit:r(critChance()), buf:bufCap(), seed:r(seedV(DEFS.source)), rp:r(rpOf(100))};
    n.spec='eco'; out.eco = r(upCost(n,5)); n.spec='spd'; out.spd = r(speedOf(n,5)); n.spec='val'; out.vm = r(vmult(n));
    out.need = [1,2,5,10,50].map(g=>r(qpNeed(g)));
    G.run = 3e7; out.gain = qpGain();
    out.qpMult = [0,1,10,100].map(q=>r(qpMult(q)));
    out.mast = [0,199,200,1200,1e6].map(c=>{ G.mast.source = c; delete RKC.source; return mastRank('source'); });
    G.mast.source = 2000; delete RKC.source; out.rank2 = rankOf('source'); out.speedRank = r(speedOf(n,5)); G.mast = {}; delete RKC.source;
    newGame(); out.spots = [[0,0],[-280,-40],[170,-40],[-270,-35],[500,500]].map(([x,y])=>freeSpot(x,y)).concat([freeSpot(-280,-40,new Set([G.nodes[0]]))]);
    return out;
  },

  // une chaine source(s) -> type -> upload(s) par type de noeud, 60 s de jeu
  chains(){
    const r = x => typeof x==='number' ? +x.toPrecision(10) : x;
    const out = {};
    for(const t of ORDER){
      if(t==='source' || t==='upload') continue;
      newGame(); G.nodes.length = 0; G.links.length = 0; G.nextId = 1; G.glob.crit = 3;
      Math.__seed(1234);
      const d = DEFS[t];
      const tgt = addNode(t, 0, 0, true); tgt.level = 4;
      for(let i=0;i<d.ins;i++){ const s = addNode('source', -300, i*100, true); s.level = 2; connect(s.id,0,tgt.id,i); }
      const ups = [];
      for(let j=0;j<d.outs;j++){ const u = addNode('upload', 300, j*100, true); u.level = 2; connect(tgt.id,j,u.id,0); ups.push(u); }
      for(let i=0;i<1200;i++) tick();
      out[t] = {money:r(G.money), run:r(G.run), files:G.files, rp:r(G.rp), playtime:r(G.playtime),
        work:G.nodes.map(n=>n.work?r(n.work.v):null), inb:G.nodes.map(n=>n.inb.map(q=>q.length)), outq:G.nodes.map(n=>n.outq.length), pk:G.links.map(l=>l.packets.length), mast:r(G.mast[t]||0)};
    }
    return out;
  },

  // evenements, contrats, succes, objectifs, reboot sur une partie scriptee
  meta(){
    const r = x => typeof x==='number' ? +x.toPrecision(10) : x;
    newGame(); Math.__seed(777);
    const s = G.nodes[0], u = G.nodes[1];
    const c = addNode('compress', -60, -40, true), m = addNode('compress', 60, -40, true);
    G.links.length = 0; connect(s.id,0,c.id,0); connect(c.id,0,m.id,0); connect(m.id,0,u.id,0);
    G.obj = 3; G.money = 1e9; G.glob.crit = 2;
    const snaps = []; let lastRun = 0;
    for(let i=1;i<=24800;i++){
      tick();
      if(i%40===0){ G.lastRate = (G.run-lastRun)/2; lastRun = G.run; }   // la boucle de jeu le calcule sur 10 s de revenus ; ici une estimation deterministe
      if(i%4===0){ evTick(); contractTick(); checkAch(); checkObj(); }
      if(i%600===0){ upgradeNode(s,1); upgradeNode(c,1); upgradeNode(u,1); }
      if(i%3100===0) snaps.push({i, money:r(G.money), run:r(G.run), files:G.files, ev:G.ev?G.ev.id:null, evDone:G.evDone, contract:G.contract?{need:r(G.contract.need),reward:r(G.contract.reward)}:null, cDone:G.cDone, cStreak:G.cStreak, cNext:r(G.cNext), evNext:r(G.evNext), ach:Object.keys(G.ach).sort(), obj:G.obj, lv:G.nodes.map(n=>n.level)});
    }
    G.run = 3e7; const gain = qpGain(); doReboot();
    return {snaps, gain, after:{qp:G.qp, qpTotal:G.qpTotal, resets:G.resets, nodes:G.nodes.length, money:r(G.money), run:G.run, hist:G.hist}};
  },

  // formules et simulations a la precision complete (aucun arrondi) : le moindre ecart de virgule flottante est detecte
  exact(){
    const out = {formulas:[], sims:{}, oc:[]};
    const setups = [
      {glob:{rev:0,spd:0,seed:0,buf:0,crit:0}, pu:{spd:0,disc:0,rev:0,off:0}, tech:{trev:0,tspd:0,tseed:0,tcost:0,tup:0,tcrit:0,toc:0,tlab:0}, qp:0, mast:0, ach:0},
      {glob:{rev:3,spd:2,seed:1,buf:2,crit:3}, pu:{spd:1,disc:2,rev:2,off:1}, tech:{trev:2,tspd:1,tseed:3,tcost:3,tup:2,tcrit:1,toc:2,tlab:3}, qp:12, mast:1500, ach:7},
      {glob:{rev:41,spd:27,seed:19,buf:6,crit:17}, pu:{spd:13,disc:6,rev:11,off:5}, tech:{trev:23,tspd:19,tseed:22,tcost:10,tup:9,tcrit:10,toc:10,tlab:10}, qp:4321, mast:9e6, ach:33},
    ];
    for(const S of setups){
      newGame();
      Object.assign(G.glob, S.glob); Object.assign(G.pu, S.pu); Object.assign(G.tech, S.tech); G.qpTotal = S.qp;
      for(const t of ORDER){ G.mast[t] = S.mast; G.bought[t] = (t.length*3)%11; } for(const k in RKC) delete RKC[k];
      for(let i=0;i<S.ach;i++) G.ach['x'+i] = true;
      const n = G.nodes[0], u = G.nodes[1], c = addNode('compress',0,300,true), l = addNode('lab',0,600,true);
      for(const spec of [undefined,'spd','val','eco']) for(const oc of [0,1]) for(const ev of [null,'surge','traffic','sale']){
        for(const m of [n,u,c,l]) m.spec = spec;
        G.oc.until = oc ? G.playtime+10 : 0; G.ev = ev ? {id:ev, until:G.playtime+10} : null;
        out.formulas.push([
          [n,u,c,l].map(m=>[0,7,13,44].map(lv=>speedOf(m,lv))), [n,u,c,l].map(m=>[timeOf(m), vmult(m), upCost(m), upCost(m,5), upCost(m,23), bulkCost(m,10), sellVal(m)]),
          revMult(), critChance(), bufCap(), seedV(DEFS.source), seedV(DEFS.mega), [1,37.5,1e6].map(rpOf), infl(),
          ORDER.map(t=>[buyCost(t), buyCost(t,3)]), GLOBALS.map(gUpCost), PU.map(puCost), TECH.map(techCost), [0,1,2,5,8].map(startCash),
          spec===undefined && oc===0 ? BPS.map(bpCost) : 0,
        ]);
      }
      G.ev = null; G.oc = {until:0, ready:0}; G.playtime = 1234.567; useOverclock(); out.oc.push([G.oc.until, G.oc.ready]);
    }
    // simulations : chaque type de noeud entre des sources et des uploads, avec ameliorations, Overclock et evenements
    for(const t of ORDER){
      if(t==='source' || t==='upload') continue;
      newGame(); G.nodes.length = 0; G.links.length = 0; G.nextId = 1;
      Object.assign(G.glob, setups[1].glob); Object.assign(G.tech, setups[1].tech); G.pu.rev = 2; G.pu.spd = 1; G.qpTotal = 12;
      Math.__seed(4321);
      const d = DEFS[t], tgt = addNode(t, 0, 0, true); tgt.level = 13; tgt.spec = 'spd'; tgt.thr = 7;
      for(let i=0;i<d.ins;i++){ const s = addNode(i%2?'mega':'source', -300, i*100, true); s.level = 11; s.spec = 'val'; connect(s.id,0,tgt.id,i); }
      for(let j=0;j<d.outs;j++){ const v = addNode(j%2?'lab':'upload', 300, j*100, true); v.level = 12; v.spec = j%2?'eco':'val'; connect(tgt.id,j,v.id,0); }
      for(let i=0;i<900;i++){
        if(i===200) G.oc.until = G.playtime+15;
        if(i===400) G.ev = {id:'surge', until:G.playtime+20};
        if(i===600) G.ev = {id:'traffic', until:G.playtime+20};
        if(i===450) tgt.thr = 1.5;
        if(i===700 && d.outs>1) G.links = G.links.filter(k=>!(k.a===tgt.id && k.ao===0));   // sortie debranchee : bascule ou perte
        tick();
      }
      out.sims[t] = [G.money, G.run, G.lifetime, G.files, G.rp, G.rpTotal, G.playtime, G.mast[t]||0, G.nodes.map(m=>[m.work?m.work.v:null, m.work?m.work.rem:null, m.timer, m.inb, m.outq, m.rr]), G.links.map(k=>k.packets)];
    }
    newGame();
    return out;
  },

  // pose de noeuds et ameliorations
  upgrades(){
    const r = x => typeof x==='number' ? +x.toPrecision(10) : x;
    newGame(); G.money = 1e12; const n = G.nodes[0]; const out = [];
    for(const k of [1,1,5,10,25]){ const before = G.money; upgradeNode(n,k); out.push({k, level:n.level, spent:r(before-G.money)}); }
    out.push({bought:{...G.bought}});
    return out;
  },

  // sauvegarde : aller-retour et sauvegarde ancienne (fixture)
  saveRoundtrip(){
    const r = x => typeof x==='number' ? +x.toPrecision(10) : x;
    newGame(); Math.__seed(5);
    const s = G.nodes[0], u = G.nodes[1]; G.links.length = 0; connect(s.id,0,u.id,0); G.money = 5e4;
    for(let i=0;i<400;i++) tick();
    G.nodes[0].spec = 'spd'; G.mine = G.mine||[];
    const txt = JSON.stringify(serialize());
    const g2 = hydrate(JSON.parse(txt));
    const keys = ['money','run','lifetime','files','qp','qpTotal','resets','playtime','obj','nextId'];
    const same = keys.every(k=>g2[k]===G[k]);
    return {same, nodes:g2.nodes.length, links:g2.links.length, packetsReset:g2.links.every(l=>l.packets.length===0), spec:g2.nodes[0].spec, inb:g2.nodes.map(n=>n.inb.length)};
  },

  legacyFixture(fx){
    const r = x => typeof x==='number' ? +x.toPrecision(10) : x;
    G = hydrate(JSON.parse(JSON.stringify(fx))); Math.__seed(9);
    for(let i=0;i<600;i++) tick();
    return {nodes:G.nodes.length, links:G.links.length, money:r(G.money), run:r(G.run), files:G.files, qpTotal:G.qpTotal, ach:Object.keys(G.ach).length};
  },

  // les index id -> noeud et noeud -> lien restent exacts apres chaque type de modification
  indexes(){
    const errs = [];
    const check = label=>{
      for(const n of G.nodes) if(nodeById(n.id)!==n) errs.push(label+' : nodeById('+n.id+')');
      if(nodeById(987654)!==undefined) errs.push(label+' : id inconnu');
      for(const n of G.nodes) for(let o=0;o<2;o++) if(linkFrom(n.id,o)!==G.links.find(l=>l.a===n.id&&l.ao===o)) errs.push(label+' : linkFrom('+n.id+','+o+')');
    };
    newGame(); G.money = 1e12; check('depart');
    const a = addNode('split',0,200), b = addNode('compress',300,200), c = addNode('upload',600,200); check('ajout');
    connect(G.nodes[0].id,0,a.id,0); connect(a.id,0,b.id,0); connect(a.id,1,c.id,0); check('liens');
    G.nodes.splice(G.nodes.indexOf(a),1); G.nodes.push(a); check('premier plan');
    connect(a.id,0,c.id,1); check('remplacement de lien');
    dropLink(G.links[0]); check('suppression de lien');
    sell(b); check('vente'); undo(); check('annulation de la vente');
    msel.add(a.id); msel.add(c.id); sellMany(); check('vente multiple'); undo(); check('annulation multiple'); msel.clear();
    G.nodes.length = 0; G.links.length = 0; for(let i=0;i<3;i++) addNode('source',i*50,0,true); check('vidage puis ajout');
    const g = JSON.parse(serializeText()); G = hydrate(g); check('hydrate');
    newGame(); check('newGame'); G.run = 3e7; doReboot(); check('reboot');
    return {errs};
  },

  // sauvegarde : version, migration, copie de secours, import hostile, echappement
  saveSafety(fx){
    const R = {}; const ls = localStorage; const wipe = ()=>{ for(const k of Object.keys(ls)) if(k.startsWith(KEY)) ls.removeItem(k); };
    const fxText = JSON.stringify(fx);
    const tryRead = t=>{ try{ readSave(t); return 'ok'; }catch(e){ return e.message; } };
    // 1. ecriture versionnee
    wipe(); newGame(); save();
    R.written = JSON.parse(ls.getItem(KEY)).ver;
    // 2. ancienne sauvegarde (sans ver) : migree, ancienne version conservee
    wipe(); ls.setItem(KEY, fxText); const okLoad = load();
    R.legacy = {loaded:okLoad, ver:G.ver, kept:ls.getItem(KEY+'.v0')===fxText, nodes:G.nodes.length};
    // 3. texte illisible sans copie de secours : conserve, partie neuve
    wipe(); ls.setItem(KEY, '{pas du json'); R.corrupt = {loaded:load(), kept:ls.getItem(KEY_BAD)==='{pas du json', why:ls.getItem(KEY_BAD+'.why')};
    // 4. principale illisible + copie de secours valide : restauration
    wipe(); ls.setItem(KEY_BAK, fxText); ls.setItem(KEY, '{"nodes":"x"}'); R.fallback = {loaded:load(), nodes:G.nodes.length, kept:ls.getItem(KEY_BAD)==='{"nodes":"x"}'};
    // 5. rejets : version future, valeurs invalides, structure
    const base = ()=>JSON.parse(fxText);
    const mut = f=>{ const d = base(); f(d); return JSON.stringify(d); };
    R.reject = {
      future: tryRead(mut(d=>{ d.ver = 99; })),
      moneyNull: tryRead(mut(d=>{ d.money = null; })),
      moneyNeg: tryRead(mut(d=>{ d.money = -5; })),
      noNodes: tryRead(mut(d=>{ delete d.nodes; })),
      badLevel: tryRead(mut(d=>{ d.nodes[0].level = 1e9; })),
      dupId: tryRead(mut(d=>{ d.nodes[1].id = d.nodes[0].id; })),
      badPos: tryRead(mut(d=>{ d.nodes[0].x = 'a'; })),
      badLink: tryRead(mut(d=>{ d.links[0].a = 'x'; })),
      badPu: tryRead(mut(d=>{ d.pu.rev = 'x'; })),
      array: tryRead('[1,2]'), nul: tryRead('null'), junk: tryRead('abc'),
      ok: tryRead(fxText),
    };
    // 6. nettoyage doux : specialisation inconnue, vue absurde, schemas mal formes
    const g6 = readSave(mut(d=>{ d.nodes[0].spec = 'hack'; d.view = {x:'a',y:0,k:99}; d.mine = [{name:'<b>ok</b>',desc:'d',nodes:[['source',0,0]],links:[]},{name:'x',nodes:[['inconnu',0,0]],links:[]},{name:'y',nodes:[['source',0,0]],links:[[0,0,5,0]]}]; })).g;
    R.clean = {spec:g6.nodes[0].spec===undefined, view:g6.view, mine:g6.mine.length, name:g6.mine[0].name};
    // 7. cles dangereuses ignorees
    const g7 = readSave(mut(d=>{})) ; const evil = fxText.replace('{', '{"__proto__":{"polluted":1},"constructor":{"x":1},');
    const g8 = readSave(evil).g; R.proto = {polluted: ({}).polluted===undefined && g8.polluted===undefined, ctor: Object.prototype.hasOwnProperty.call(g8,'constructor')};
    // 8. echappement dans le DOM (nom de schema hostile)
    newGame(); G.mine = [{k:1, mine:true, name:'<img src=x onerror="window.__pwn=1">', desc:'<script>window.__pwn=2<\/script>', nodes:[['source',0,0]], links:[]}]; G.run = 1e9; G.obj = 3;
    tab = 'bp'; $('side').style.display = 'flex'; renderTab();
    const bd = $('tabBody'); R.xss = {img:bd.querySelectorAll('img').length, script:bd.querySelectorAll('script').length, pwn:window.__pwn===undefined, text:bd.textContent.includes('<img src=x')};
    tab = null; $('side').style.display = 'none';
    // 9. un etat invalide n'ecrase pas la sauvegarde
    wipe(); newGame(); save(); const before = ls.getItem(KEY); G.money = Infinity; save(); R.guard = ls.getItem(KEY)===before; G.money = 5; saveWarn = '';
    // 10. copie de secours : la sauvegarde precedente est conservee a la premiere ecriture, puis au plus toutes les 5 min
    wipe(); newGame(); save(); const first = ls.getItem(KEY); lastBak = 0; G.money += 123; save();
    R.backup = {has:!!ls.getItem(KEY_BAK), sameAsPrev:ls.getItem(KEY_BAK)===first};
    const bakBefore = ls.getItem(KEY_BAK); G.money += 1; save(); R.backup.throttled = ls.getItem(KEY_BAK)===bakBefore;
    // 11. aller-retour d'un export (base64) avec import
    wipe(); newGame(); G.money = 777; const code = btoa(unescape(encodeURIComponent(serializeText()))); const back = readSave(decodeURIComponent(escape(atob(code)))).g; R.export = back.money;
    // 12. sauvegarde minimale : les champs absents recoivent une valeur par defaut
    const mn = readSave('{"nodes":[{"id":4,"type":"source","x":0,"y":0,"level":0}]}').g; R.minimal = {view:mn.view, nextId:mn.nextId, money:mn.money, bought:mn.bought, inb:mn.nodes[0].inb.length};
    wipe(); newGame(); lastBak = 0;
    return R;
  },

  // empreintes de pixels du canvas (option --render) : verifie qu'une optimisation de rendu ne change pas l'image
  render(){
    newGame(); G.money = 1e9; G.obj = 3; Math.__seed(31);
    G.nodes.length = 0; G.links.length = 0; G.nextId = 1;
    const ids = [];
    // liste figee des 17 types d'origine : un type ajoute plus tard ne change pas la scene
    const TYPES = ['source','upload','compress','split','merge','encrypt','boost','clone','sorter','ai','lab','mega','quantum','sing','neural','dim','omega'];
    for(let i=0;i<48;i++){ const n = addNode(TYPES[i%TYPES.length], (i%8)*230-900, Math.floor(i/8)*140-420, true); n.level = (i*7)%45; ids.push(n); if(i%5===0) n.spec = 'spd'; }
    for(let i=0;i<47;i++) if(i%8!==7) connect(ids[i].id,0,ids[i+1].id,0);
    connect(ids[7].id,0,ids[8].id,0); connect(ids[15].id,0,ids[0].id,0); connect(ids[40].id,0,ids[3].id,1);
    for(let i=0;i<500;i++) tick();
    const hash = ()=>{ const d = cx.getImageData(0,0,cv.width,cv.height).data; let h = 2166136261; for(let i=0;i<d.length;i+=3){ h = Math.imul(h ^ d[i], 16777619); } return (h>>>0).toString(16); };
    const out = {};
    sel = ids[10].id; msel.add(ids[12].id); msel.add(ids[13].id); hoverPort = null;
    for(const [k,x,y] of [[0.05,0,0],[0.1,-100,60],[0.25,300,-80],[0.4,-500,200],[0.6,-1000,300],[0.6,1200,-100],[1,-300,-100],[1.5,600,300],[2.5,-900,500],[3,0,0]]){
      G.view.k = k; G.view.x = x; G.view.y = y; zoomT = null; lastDraw = performance.now(); lodPrev = k<0.28?0:k<0.52?1:2; lodFlash = 0;
      draw(); out['k'+k+'_'+x+'_'+y] = hash();
    }
    drag = {kind:'link', n:ids[0].id, o:0, pos:{x:-400,y:-300}}; G.view.k = 0.7; G.view.x = 0; G.view.y = 0; draw(); out.dragLink = hash(); drag = null;
    drag = {kind:'box', a:{x:-300,y:-200}, b:{x:200,y:150}}; draw(); out.box = hash(); drag = null;
    return out;
  },

  // achats par l'interface (clics reels sur les boutons) : boutique, ameliorations globales, quantiques, recherche, specialisations
  uiClicks(){
    newGame(); G.money = 1e7; G.qp = 50; G.rp = 5000; G.run = 1e6; G.obj = 999; buildShop(); refreshShop();
    const snap = extra=>JSON.stringify({m:Math.round(G.money), qp:G.qp, rp:G.rp, glob:G.glob, pu:G.pu, tech:G.tech, n:G.nodes.map(n=>[n.type,n.x,n.y,n.level,n.spec||'']), b:G.bought, sel})+(extra||'');
    const click = q=>{ const el = document.querySelector(q); if(!el) return 'absent:'+q; el.click(); return snap(); };
    const out = [];
    for(const t of ['compress','compress','split','boost']) out.push(click('#shop button[data-type="'+t+'"]'));
    tab = 'up'; $('side').style.display = 'flex'; renderTab();
    for(const g of ['rev','spd','rev']) out.push(click('button[data-g="'+g+'"]'));
    tab = 'qp'; renderTab();
    for(const d of ['spd','rev','start']) out.push(click('button[data-p="'+d+'"]'));
    tab = 'res'; renderTab();
    for(const d of [...document.querySelectorAll('button[data-r]')].slice(0,3).map(b=>b.dataset.r)) out.push(click('button[data-r="'+d+'"]'));
    tab = null; $('side').style.display = 'none';
    const n = G.nodes[2]; n.level = 12; sel = n.id; showSel();
    out.push(click('[data-spec="spd"]')); showSel(); out.push(click('[data-spec="eco"]'));
    G.money = 5; showSel(); out.push(click('[data-spec="spd"]')+$('toast').textContent);
    G.money = 1; out.push(click('#shop button[data-type="compress"]')+$('toast').textContent);
    sel = null; showSel(); newGame();
    return out;
  },

  // une vraie sauvegarde de la version 46 (format v1) se recharge sans perte par le chemin du joueur (localStorage + load)
  save46(fx){
    const r = x => typeof x==='number' ? +x.toPrecision(10) : x;
    const ls = localStorage; for(const k of Object.keys(ls)) if(k.startsWith(KEY)) ls.removeItem(k);
    const d = JSON.parse(JSON.stringify(fx)); d.savedAt = Date.now(); d.daily = new Date().toISOString().slice(0,10);   // ni gain hors ligne ni bonus quotidien
    const text = JSON.stringify(d); ls.setItem(KEY, text);
    const loaded = load();
    const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.savedAt; for(const l of c.links||[]) l.packets = []; return JSON.stringify(c); };
    const A = JSON.parse(strip(JSON.parse(serializeText()))), B = JSON.parse(strip(d)), diffs = [];
    const walk = (x,y,p)=>{ if(JSON.stringify(x)===JSON.stringify(y)) return; if(x && y && typeof x==='object' && typeof y==='object'){ for(const k of new Set([...Object.keys(x),...Object.keys(y)])) walk(x[k],y[k],p+'.'+k); } else diffs.push(p); };
    walk(B, A, ''); const same = diffs.length===0;
    const out = {loaded, same, diffs, ver:G.ver, nodes:G.nodes.length, links:G.links.length, mine:G.mine.map(b=>b.name), sci:G.sci, view:G.view};
    Math.__seed(46); for(let i=0;i<600;i++) tick();
    Object.assign(out, {money:r(G.money), run:r(G.run), files:G.files, rp:r(G.rp), lv:G.nodes.map(n=>n.level)});
    for(const k of Object.keys(ls)) if(k.startsWith(KEY)) ls.removeItem(k);
    newGame();
    return out;
  },

  // une sauvegarde de la version 47 (tous les types, Trieur regle, schema personnel avec seuil) : rechargement, schema, panneau du Trieur
  save47(fx){
    const ls = localStorage; for(const k of Object.keys(ls)) if(k.startsWith(KEY)) ls.removeItem(k);
    const d = JSON.parse(JSON.stringify(fx)); d.savedAt = Date.now(); d.daily = new Date().toISOString().slice(0,10);
    ls.setItem(KEY, JSON.stringify(d));
    const loaded = load();
    const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.savedAt; for(const l of c.links||[]) l.packets = []; return JSON.stringify(c); };
    const A = JSON.parse(strip(JSON.parse(serializeText()))), B = JSON.parse(strip(d)), diffs = [];
    const walk = (x,y,p)=>{ if(JSON.stringify(x)===JSON.stringify(y)) return; if(x && y && typeof x==='object' && typeof y==='object'){ for(const k of new Set([...Object.keys(x),...Object.keys(y)])) walk(x[k],y[k],p+'.'+k); } else diffs.push(p); };
    walk(B, A, '');
    const out = {loaded, same:diffs.length===0, diffs, nodes:G.nodes.length, links:G.links.length};
    Math.__seed(47); for(let i=0;i<600;i++) tick();
    Object.assign(out, {money:G.money, run:G.run, files:G.files, rp:G.rp, mast:G.mast, lv:G.nodes.map(n=>n.level)});
    const before = G.nodes.length; buildBp(G.mine[0], true); const made = G.nodes.slice(before);
    out.bp = made.map(n=>[n.type, n.x, n.y, n.thr===undefined?null:n.thr]); out.bpLinks = G.links.length;
    const so = G.nodes.find(n=>n.type==='sorter'); sel = so.id; showSel(); out.panel = $('sel').innerHTML;
    $('bThrD').click(); $('bThrD').click(); $('bThrD').click(); out.thrD = so.thr; $('bThrU').click(); out.thrU = so.thr;
    out.rows = blueprintOf([so, made[0]]).nodes;
    sel = null; showSel();
    for(const k of Object.keys(ls)) if(k.startsWith(KEY)) ls.removeItem(k);
    newGame();
    return out;
  },

  // le rendu et les panneaux ne levent aucune exception
  smoke(){
    const errs = [];
    newGame(); G.money = 1e9; G.obj = 3;
    for(let i=0;i<30;i++) addNode(ORDER[i%ORDER.length], (i%6)*200-500, Math.floor(i/6)*110-300, true);
    for(let i=0;i<800;i++) tick();
    for(const k of [0.08,0.2,0.4,0.6,1,2.5]){ G.view.k = k; G.view.x = -40; G.view.y = 25; zoomT = null; try{ draw(); }catch(e){ errs.push('draw '+k+': '+e.message); } }
    const ids = new Set(TOP.map(x=>x[0]));
    for(const v of Object.values(SUBS)) for(const x of v) ids.add(x[0]);
    for(const id of ids){ try{ tab = id; $('side').style.display = 'flex'; renderTab(); }catch(e){ errs.push('tab '+id+': '+e.message); } }
    try{ sel = G.nodes[2].id; showSel(); sel = null; showSel(); }catch(e){ errs.push('sel: '+e.message); }
    tab = null; $('side').style.display = 'none';
    return {errs, tabs:[...ids].sort()};
  },

  // Validation des donnees : chaque faute de frappe donne une erreur explicite, et une donnee refusee ne laisse aucune trace
  validation(){
    const errs = [], msgs = {};
    const expect = (label, fn, part)=>{ try{ fn(); errs.push(label+' : aucune erreur'); }catch(e){ msgs[label] = e.message; if(!e.message.includes(part)) errs.push(label+' : message inattendu '+e.message); } };
    const tech = (mods, extra)=>registerUpgrade('tech', Object.assign({id:'tx', name:'Test', desc:'d', base:1, grow:2, max:3, mods}, extra||{}));
    const node = d=>{ const x = Object.assign({name:'X', label:'X', color:'#fff', desc:'d', kind:'transform', mult:2, ins:1, outs:1, t:1, cost:10, unlock:0}, d); for(const k in x) if(x[k]===undefined) delete x[k]; return registerNode('nx', x); };
    newGame(); const n = G.nodes[0], speed0 = speedOf(n), nTech = TECH.length, nTypes = ORDER.length;
    expect('condition', ()=>tech([{stat:'speed', by:pct(5), when:'type:filtre'}]), 'type de noeud inconnu dans la condition "type:filtre"');
    expect('statistique', ()=>tech([{stat:'vitesse', by:pct(5)}]), 'statistique inconnue "vitesse"');
    expect('operation', ()=>tech([{stat:'speed', by:pct(5), op:'pow'}]), 'operation inconnue "pow"');
    expect('groupe', ()=>tech([{stat:'speed', by:pct(5), group:'bonus'}]), 'groupe inconnu "bonus"');
    expect('condition sans noeud', ()=>tech([{stat:'revenue', by:pct(5), when:'type:source'}]), 'ne concerne pas un noeud');
    expect('evenement', ()=>tech([{stat:'speed', by:pct(5), when:'event:soldes'}]), 'evenement inconnu');
    expect('champ amelioration', ()=>tech([], {cout:5}), 'champ inconnu "cout"');
    expect('genre', ()=>node({kind:'transfrom'}), 'genre inconnu "transfrom"');
    expect('champ noeud', ()=>node({mutl:2}), 'champ inconnu "mutl"');
    expect('sortie', ()=>node({out:'copie', outs:2}), 'sortie inconnue "copie"');
    expect('recompense', ()=>node({kind:'sink', mult:undefined, reward:'gold', ins:1, outs:0}), 'recompense inconnue "gold"');
    expect('ports', ()=>node({ins:2}), 'le genre transform en demande 1 a 1');
    expect('mesure', ()=>measure('filez', 'test'), 'mesure inconnue "filez"');
    expect('mesure type', ()=>measure('count:filtre', 'test'), 'type de noeud inconnu dans la mesure "count:filtre"');
    for(const [k, v, part] of [['poids', 0, 'poids invalide'], ['champ', 1, 'champ inconnu "poid"']]){
      EVT.push(k==='poids' ? {id:'ex', name:'X', desc:'d', dur:1, weight:v} : {id:'ex', name:'X', desc:'d', dur:1, poid:v});
      try{ expect('evenement '+k, ()=>validateAll(), part); } finally{ EVT.pop(); }
    }
    // invariant du cache par pas (version de test) : un niveau qui change pendant step() donne une erreur explicite
    newGame(); const s0 = G.nodes[0]; s0.level = 10; s0.tr = 0; const bump = ()=>{ G.glob.spd++; }; on('tierFx', bump);
    try{ step(0.05); errs.push('invariant du cache : aucune erreur'); }catch(e){ if(!e.message.includes('pendant un pas')) errs.push('invariant du cache : message inattendu '+e.message); }
    finally{ handlers.tierFx.splice(handlers.tierFx.indexOf(bump), 1); }
    newGame();
    if(TECH.length!==nTech || ORDER.length!==nTypes || DEFS.nx || speedOf(n)!==speed0) errs.push('une donnee refusee a laisse une trace');
    return {errs, msgs};
  },

  // Preuve : un noeud et une source de bonus ajoutes uniquement par des donnees, sans autre modification du code
  fictif(){
    const errs = [], out = {};
    const ok = (c, m)=>{ if(!c) errs.push(m); };
    registerNode('filter', {name:'Filtre', label:'FLT', color:'#7dd3fc', desc:'Valeur x1,4, très rapide.',
      kind:'transform', mult:1.4, ins:1, outs:1, t:0.3, cost:3000, unlock:2500, icon:'M-9 -7 L9 -7 L2 1 L2 8 L-2 8 L-2 1 Z'});
    registerUpgrade('tech', {id:'tflt', name:'Filtres fins', desc:'+5 % de vitesse des Filtres par niveau', base:45, grow:1.9, max:10,
      mods:[{stat:'speed', by:pct(5), when:'type:filter'}]});
    newGame(); Math.__seed(2026); G.money = 1e6; G.obj = 999; buildShop();
    // boutique : verrouille puis debloque a 2 500 credits gagnes
    const btn = ()=>document.querySelector('#shop button[data-type="filter"]');
    G.run = 100; refreshShop(); ok(!unlocked('filter'), 'verrouille au depart');
    G.run = 2500; refreshShop(); out.shop = btn().textContent; ok(btn().textContent.includes('Filtre') && !btn().disabled, 'bouton de boutique');
    out.price = buyCost('filter'); btn().click();
    const f = G.nodes.find(m=>m.type==='filter'); ok(f && G.bought.filter===1, 'achat par la boutique'); out.price2 = buyCost('filter');
    ok(out.price2 > out.price, 'le prix augmente avec les achats');
    // chaine Source -> Filtre -> Upload : valeur x1,4
    const s = G.nodes[0], u = G.nodes[1]; G.links.length = 0; f.x = 0; f.y = -40;
    connect(s.id,0,f.id,0); connect(f.id,0,u.id,0);
    let seen = null; for(let i=0;i<400;i++){ tick(); if(f.work && seen===null) seen = f.work.v; }
    out.workValue = seen; ok(seen===seedV(DEFS.source)*1.4, 'valeur x1,4');
    ok(G.files>0 && G.mast.filter>0, 'fichiers uploades et maitrise du Filtre');
    // ameliorations, palier, specialisations
    upgradeNode(f, 10); ok(f.level===10, 'ameliorations'); out.specs = specsFor(f).join(); ok(chooseSpec(f,'spd') && f.spec==='spd', 'specialisation Turbo');
    // bonus de recherche : +5 % par niveau sur les Filtres seulement
    const c = addNode('compress', 0, 300, true); c.level = 10; c.spec = 'spd';
    const sf = speedOf(f), sc = speedOf(c); G.rp = 1e6; ok(buyTech(TECH.find(d=>d.id==='tflt')), 'achat de la technologie');
    out.speedRatio = speedOf(f)/sf; ok(speedOf(f)===sf*1.05 && speedOf(c)===sc, 'bonus applique au Filtre seulement');
    tab = 'res'; $('side').style.display = 'flex'; renderTab(); out.techText = [...document.querySelectorAll('#tabBody .item')].map(e=>e.textContent).find(t=>t.includes('Filtres fins'));
    ok(out.techText && out.techText.includes('+5 %'), 'onglet Recherche'); tab = null; $('side').style.display = 'none';
    // panneau, rendu, icone
    sel = f.id; showSel(); out.panel = $('sel').querySelector('p:nth-of-type(2)').textContent; sel = null; showSel();
    G.view.k = 1; zoomT = null; lastDraw = performance.now(); lodPrev = 2; lodFlash = 0; draw(); ok(iconImg('filter', COLORS.filter).startsWith('data:image/png'), 'icone');
    // schema : copie de la chaine
    const bp = blueprintOf([s,f,u]); out.bp = bp.nodes.map(x=>x[0]); const before = G.nodes.length; buildBp({name:'c', nodes:bp.nodes, links:bp.links}, true);
    ok(G.nodes.slice(before).map(m=>m.type).join()==='source,filter,upload', 'schema');
    // sauvegarde puis rechargement
    save(); const lv = f.level, id = f.id; G = null; load(); const f2 = G.nodes.find(m=>m.id===id);
    ok(f2 && f2.type==='filter' && f2.level===lv && f2.spec==='spd' && G.tech.tflt===1 && G.bought.filter===2, 'sauvegarde et rechargement');
    ok(speedOf(f2)===sf*1.05, 'bonus apres rechargement');
    for(const k of Object.keys(localStorage)) if(k.startsWith(KEY)) localStorage.removeItem(k);
    newGame();
    return {errs, out};
  },
};

(async()=>{
  const browser = await chromium.launch({executablePath: chromePath});
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const consoleErrs = [];
  page.on('pageerror', e=>consoleErrs.push(e.message));
  await page.addInitScript(()=>{
    let a = 1; const mul = Math.imul;
    Math.__seed = s=>{ a = s>>>0; };
    Math.random = ()=>{ a = (a + 0x6D2B79F5)>>>0; let t = a; t = mul(t ^ (t>>>15), t|1); t ^= t + mul(t ^ (t>>>7), t|61); return ((t ^ (t>>>14))>>>0)/4294967296; };
    try{ localStorage.clear(); }catch(e){}
  });
  // version de test (avec le pont) ; une copie plus ancienne n'a que dist/index.html, qui contenait alors le pont
  const testPage = fs.existsSync(path.join(ROOT,'dist','test.html')) ? 'test.html' : 'index.html';
  await page.goto('file://'+path.join(ROOT,'dist',testPage));
  await page.waitForFunction(()=>typeof G!=='undefined' && G && G.nodes);
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','legacy-v0.json'),'utf8'));
  const fixture46 = JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','save-v46.json'),'utf8'));
  const fixture47 = JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','save-v47.json'),'utf8'));
  const got = {};
  for(const name of Object.keys(SCENARIOS)){
    if((name==='render') !== RENDER) continue;
    if(process.env.TEST_PAUSE) await page.waitForTimeout(+process.env.TEST_PAUSE);   // laisse tourner la boucle du jeu entre deux scenarios (verification de stabilite)
    const fn = 'function '+SCENARIOS[name].toString();
    // l'horloge est figee pendant un scenario (upSound limite ses sons avec performance.now : sinon le flux aleatoire depend du temps reel)
    // la boucle du jeu est en pause et les effets visuels remis a zero : sinon le nombre de particules laissees par la boucle
    // en temps reel entre deux scenarios change le nombre de tirages aleatoires consommes (test instable)
    got[name] = await page.evaluate(`(function(){ paused = true; parts.length = 0; floats.length = 0; lastBlip = 0; income.length = 0;
      const real = performance.now; let T = 1e6; performance.now = ()=>T; window.tick = ()=>{ T += 50; step(0.05); };
      try{ return (${fn})(${(name==='legacyFixture'||name==='saveSafety')?JSON.stringify(fixture):name==='save46'?JSON.stringify(fixture46):name==='save47'?JSON.stringify(fixture47):''}); } finally{ performance.now = real; lastDraw = real.call(performance); } })()`);   // draw() sous horloge figee : la boucle reprend avec la vraie horloge
  }
  await browser.close();

  const want = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP,'utf8')) : {};
  let fail = 0;
  const assert = (ok,msg)=>{ if(!ok){ fail++; console.log('  FAIL', msg); } };
  // invariants (independants des instantanes)
  if(!RENDER){ assert(got.save46.loaded && got.save46.same, 'sauvegarde v46 rechargee sans perte');
  assert(got.save47.loaded && got.save47.same, 'sauvegarde v47 rechargee sans perte');
  assert(got.validation.errs.length===0, 'validation des donnees : '+got.validation.errs.join(' | '));
  assert(got.fictif.errs.length===0, 'noeud fictif : '+got.fictif.errs.join(' | '));
  assert(got.saveRoundtrip.same && got.saveRoundtrip.packetsReset, 'sauvegarde : aller-retour fidele');
  assert(got.smoke.errs.length===0, 'rendu/panneaux sans exception : '+got.smoke.errs.join(' | ')); }
  assert(consoleErrs.length===0, 'aucune erreur de console : '+consoleErrs.join(' | '));
  if(UPDATE){
    fs.writeFileSync(SNAP, JSON.stringify(got,null,1)+'\n'); console.log('instantanes regeneres :', Object.keys(got).join(', '));
  } else {
    for(const name of Object.keys(got)){
      const a = JSON.stringify(got[name]), b = JSON.stringify(want[name]);
      const ok = a===b; console.log((ok?'ok   ':'FAIL ')+name);
      if(!ok){ fail++; if(want[name]===undefined) console.log('  instantane manquant (lancer avec --update)'); else { const A=JSON.stringify(got[name],null,1).split('\n'), B=JSON.stringify(want[name],null,1).split('\n'); for(let i=0;i<Math.max(A.length,B.length);i++) if(A[i]!==B[i]){ console.log('  premiere difference ligne',i+1,'\n   attendu:',B[i],'\n   obtenu :',A[i]); break; } } }
    }
  }
  console.log(fail ? `\n${fail} echec(s)` : '\ntous les tests passent');
  process.exit(fail?1:0);
})();
