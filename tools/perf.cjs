// Mesure du cout de step(), draw() et de la serialisation de la sauvegarde.
//   node tools/perf.cjs [--runs=3] [--json]
// Rendu logiciel dans un navigateur sans interface : les valeurs absolues sont approximatives,
// les comparaisons avant/apres et la croissance avec le nombre de noeuds sont fiables.
// "mobile 4x" = viewport 390x844, DPR 2, CPU ralenti 4 fois.
const fs = require('fs'), path = require('path'), cp = require('child_process');
function pw(){ try{ return require('playwright'); }catch(e){ return require(path.join(cp.execSync('npm root -g').toString().trim(),'playwright')); } }
const { chromium } = pw();
const RUNS = +((process.argv.find(a=>a.startsWith('--runs='))||'--runs=3').split('=')[1]);
const chromePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const CONFIGS = [['bureau', 1280, 800, 1, 1], ['mobile 4x', 390, 844, 2, 4]];
const SIZES = [100, 300, 600];

(async()=>{
  const browser = await chromium.launch({executablePath: chromePath});
  const rows = [];
  for(const [label, w, h, dpr, thr] of CONFIGS){
    const ctx = await browser.newContext({viewport:{width:w,height:h}, deviceScaleFactor:dpr});
    const page = await ctx.newPage();
    const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', {rate:thr});
    await page.goto('file://'+path.join(__dirname,'..','dist','index.html'));
    await page.waitForFunction(()=>typeof G!=='undefined' && G && G.nodes);
    for(const N of SIZES){
      const r = await page.evaluate(([N, RUNS])=>{
        paused = true;
        G.nodes.length = 0; G.links.length = 0; G.money = 1e30;
        const cols = Math.ceil(Math.sqrt(N)), ids = [];
        for(let i=0;i<N;i++){ const t = i%cols===0 ? 'source' : (i%cols===cols-1 ? 'upload' : 'compress'); ids.push(addNode(t,(i%cols)*200,Math.floor(i/cols)*100,true).id); }
        for(let i=0;i<N-1;i++) if(i%cols!==cols-1) connect(ids[i],0,ids[i+1],0);
        for(let i=0;i<100;i++) step(0.05);
        const best = (f,k)=>{ f(); let m = 1e9; for(let r=0;r<RUNS;r++){ const t = performance.now(); for(let i=0;i<k;i++) f(); m = Math.min(m,(performance.now()-t)/k); } return +m.toFixed(2); };
        const out = {nodes:G.nodes.length};
        zoomT = null; G.view.k = 0.6; G.view.x = 0; G.view.y = 0;          // quelques noeuds a l'ecran sur une grande carte
        out.step = best(()=>step(0.05), 40);
        out.drawLocal = best(()=>draw(), 40);
        G.view.k = 0.6; G.view.x = -(cols*100)*0.6; G.view.y = -(cols*50)*0.6;   // centre de la carte
        out.drawCentre = best(()=>draw(), 40);
        fitView(); zoomT = null; out.drawTout = best(()=>draw(), 40);    // toute la carte (vue lointaine)
        out.save = best(()=>serializeText(), 20);
        return out;
      }, [N, RUNS]);
      rows.push({cfg:label, ...r});
    }
    // reseau mixte de 600 noeuds : tous les genres, ameliorations, specialisations, Overclock et evenement actifs (pire cas de step)
    const m = await page.evaluate(RUNS=>{
      newGame(); paused = true; G.nodes.length = 0; G.links.length = 0; G.money = 1e30; G.ev = {id:'surge', until:1e9}; G.oc.until = 1e9;
      Object.assign(G.glob,{rev:10,spd:10,seed:5,buf:2,crit:5}); for(const t in G.tech) G.tech[t] = 3;
      const mids = ['compress','split','encrypt','boost','clone','sorter','ai','quantum','merge'];
      for(let row=0; G.nodes.length<600; row++){
        const y = row*100, s = addNode(row%2?'mega':'source',0,y,true), md = addNode(mids[row%mids.length],200,y,true), m2 = addNode('compress',400,y,true);
        const e1 = addNode(row%3?'upload':'lab',600,y,true), e2 = addNode('upload',800,y,true);
        for(const n of [s,md,m2,e1,e2]){ n.level = (row*7)%40; n.spec = ['spd','eco',undefined][row%3]; }
        connect(s.id,0,md.id,0); if(md.type==='merge') connect(addNode('source',0,y+50,true).id,0,md.id,1);
        connect(md.id,0,m2.id,0); connect(m2.id,0,e1.id,0); if(DEFS[md.type].outs>1) connect(md.id,1,e2.id,0);
      }
      for(let i=0;i<200;i++) step(0.05);
      let best = 1e9; for(let r=0;r<RUNS;r++){ const t = performance.now(); for(let i=0;i<40;i++) step(0.05); best = Math.min(best,(performance.now()-t)/40); }
      const out = {nodes:'mixte '+G.nodes.length, step:+best.toFixed(2)}; G.ev = null; G.oc.until = 0; return out;
    }, RUNS);
    rows.push({cfg:label, ...m, drawLocal:'-', drawCentre:'-', drawTout:'-', save:'-'});
    await ctx.close();
  }
  await browser.close();
  if(process.argv.includes('--json')) return console.log(JSON.stringify(rows));
  const pad = (s,n)=>String(s).padEnd(n);
  console.log(pad('config',11)+pad('noeuds',11)+pad('step',8)+pad('draw local',12)+pad('draw centre',13)+pad('draw tout',11)+'sauvegarde (ms)');
  for(const r of rows) console.log(pad(r.cfg,11)+pad(r.nodes,11)+pad(r.step,8)+pad(r.drawLocal,12)+pad(r.drawCentre,13)+pad(r.drawTout,11)+r.save);
})();
