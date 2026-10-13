// Tests de caracterisation : executent le vrai jeu dans Chromium (Playwright) avec un generateur aleatoire seede,
// et comparent des instantanes (tests/snapshots.json) au comportement actuel.
//   node tests/run.js            verifie
//   node tests/run.js --update   regenere les instantanes (a ne faire que pour un changement voulu)
const fs = require('fs'), path = require('path'), cp = require('child_process');
function pw(){ try{ return require('playwright'); }catch(e){ return require(path.join(cp.execSync('npm root -g').toString().trim(),'playwright')); } }
const { chromium } = pw();
const ROOT = path.join(__dirname,'..'), SNAP = path.join(__dirname,'snapshots.json');
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
    return out;
  },

  // une chaine source(s) -> type -> upload(s) par type de noeud, 60 s de jeu
  chains(){
    const r = x => typeof x==='number' ? +x.toPrecision(10) : x;
    const out = {};
    for(const t of ORDER){
      if(t==='source' || t==='upload') continue;
      newGame(); G.nodes.length = 0; G.links.length = 0; G.nextId = 1;
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
    G.obj = 3; G.money = 1e9;
    const snaps = []; let lastRun = 0;
    for(let i=1;i<=24000;i++){
      tick();
      if(i%40===0){ G.lastRate = (G.run-lastRun)/2; lastRun = G.run; }   // la boucle de jeu le calcule sur 10 s de revenus ; ici une estimation deterministe
      if(i%4===0){ evTick(); contractTick(); checkAch(); checkObj(); }
      if(i%1500===0){ upgradeNode(s,1); upgradeNode(c,1); upgradeNode(u,1); }
      if(i%3000===0) snaps.push({i, money:r(G.money), run:r(G.run), files:G.files, ev:G.ev?G.ev.id:null, evDone:G.evDone, contract:G.contract?{need:r(G.contract.need),reward:r(G.contract.reward)}:null, cDone:G.cDone, cStreak:G.cStreak, cNext:r(G.cNext), evNext:r(G.evNext), ach:Object.keys(G.ach).sort(), obj:G.obj, lv:G.nodes.map(n=>n.level)});
    }
    G.run = 3e7; const gain = qpGain(); doReboot();
    return {snaps, gain, after:{qp:G.qp, qpTotal:G.qpTotal, resets:G.resets, nodes:G.nodes.length, money:r(G.money), run:G.run, hist:G.hist}};
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
  await page.goto('file://'+path.join(ROOT,'index.html'));
  await page.waitForFunction(()=>typeof G!=='undefined' && G && G.nodes);
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','legacy-v0.json'),'utf8'));
  const got = {};
  for(const name of Object.keys(SCENARIOS)){
    const fn = 'function '+SCENARIOS[name].toString();
    // l'horloge est figee pendant un scenario (upSound limite ses sons avec performance.now : sinon le flux aleatoire depend du temps reel)
    got[name] = await page.evaluate(`(function(){ const real = performance.now; let T = 1e6; performance.now = ()=>T; window.tick = ()=>{ T += 50; step(0.05); };
      try{ return (${fn})(${name==='legacyFixture'?JSON.stringify(fixture):''}); } finally{ performance.now = real; } })()`);
  }
  await browser.close();

  const want = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP,'utf8')) : {};
  let fail = 0;
  const assert = (ok,msg)=>{ if(!ok){ fail++; console.log('  FAIL', msg); } };
  // invariants (independants des instantanes)
  assert(got.saveRoundtrip.same && got.saveRoundtrip.packetsReset, 'sauvegarde : aller-retour fidele');
  assert(got.smoke.errs.length===0, 'rendu/panneaux sans exception : '+got.smoke.errs.join(' | '));
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
