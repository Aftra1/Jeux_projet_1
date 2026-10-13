// Serie « boite noire » : la version publiee (dist/index.html, sans pont) et la version de test (dist/test.html,
// avec pont) recoivent exactement les memes actions et doivent donner exactement les memes resultats.
// Les actions ne passent que par le DOM (clics reels), localStorage et window.__game : rien d'interne.
// Temps maitrise : horloge, requestAnimationFrame et Date.now remplaces avant le chargement, hasard seede.
//   node tests/blackbox.cjs
const fs = require('fs'), path = require('path'), cp = require('child_process');
function pw(){ try{ return require('playwright'); }catch(e){ return require(path.join(cp.execSync('npm root -g').toString().trim(),'playwright')); } }
const { chromium } = pw();
const DIST = path.join(__dirname, '..', 'dist');
const chromePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);
const fx46 = fs.readFileSync(path.join(__dirname,'fixtures','save-v46.json'),'utf8');
const fx47 = fs.readFileSync(path.join(__dirname,'fixtures','save-v47.json'),'utf8');

// installe avant le chargement du jeu : hasard seede, horloge et images pilotees, sauvegarde initiale eventuelle
function init({NOW, save}){
  let a = 12345; const mul = Math.imul;
  Math.random = ()=>{ a = (a + 0x6D2B79F5)>>>0; let t = a; t = mul(t ^ (t>>>15), t|1); t ^= t + mul(t ^ (t>>>7), t|61); return ((t ^ (t>>>14))>>>0)/4294967296; };
  let T = 1000; const raf = [];
  performance.now = ()=>T; Date.now = ()=>NOW;
  window.requestAnimationFrame = f=>{ raf.push(f); return raf.length; };
  window.__frames = n=>{ for(let i=0;i<n;i++){ T += 50; for(const f of raf.splice(0)) f(T); } };
  try{ localStorage.clear(); if(save){ const d = JSON.parse(save); d.savedAt = NOW; d.daily = new Date(NOW).toISOString().slice(0,10); localStorage.setItem('uploadlab2', JSON.stringify(d)); } }catch(e){}
}
// etat observable : partie (window.__game.G), textes du HUD, panneaux, boutique, pixels du canvas
const observe = ()=>{
  const c = document.getElementById('c'), d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let h = 2166136261; for(let i=0;i<d.length;i+=3) h = Math.imul(h ^ d[i], 16777619);
  const g = JSON.parse(JSON.stringify(window.__game.G)); delete g.savedAt;
  return {g, money:document.getElementById('money').textContent, rate:document.getElementById('rate').textContent,
    shop:[...document.querySelectorAll('#shop button')].map(b=>b.style.display+'|'+b.disabled+'|'+b.textContent),
    sel:document.getElementById('sel').style.display==='none' ? '' : document.getElementById('sel').innerHTML,
    side:document.getElementById('side').style.display==='none' ? '' : document.getElementById('tabBody').innerHTML, canvas:(h>>>0).toString(16)};
};

async function run(browser, file, save, actions){
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const errs = []; page.on('pageerror', e=>errs.push(e.message));
  await page.addInitScript(init, {NOW, save});
  await page.goto('file://'+path.join(DIST, file));
  await page.waitForFunction(()=>window.__game && window.__game.G);
  const bridge = await page.evaluate(()=>['G','step','serialize','DEFS','stat'].filter(n=>n in window));
  const out = await actions(page);
  await page.close();
  return {bridge, errs, out};
}
const frames = (page, n)=>page.evaluate(n=>window.__frames(n), n);
const click = async (page, sel)=>{ await page.click(sel, {timeout:5000}); await frames(page, 2); };

// 1. partie neuve : achats par la boutique, ameliorations globales, quantiques, recherche, selection au clic droit, specialisations
async function fresh(page){
  const o = {};
  await frames(page, 20); o.start = await page.evaluate(observe);
  await page.evaluate(()=>{ const G = window.__game.G; G.money = 1e7; G.qp = 50; G.rp = 5000; G.run = 1e6; G.obj = 999; });
  await frames(page, 5);
  for(const t of ['compress','compress','split','boost']) await click(page, `#shop button[data-type="${t}"]`);
  await click(page, '#bMenu');
  for(const g of ['rev','spd','rev']) await click(page, `button[data-g="${g}"]`);
  await click(page, '#tabs button[data-t="qp"]');
  for(const d of ['spd','rev','start']) await click(page, `button[data-p="${d}"]`);
  await click(page, '#tabs button[data-t="up"]'); await click(page, '#subs button[data-s="res"]');
  for(let i=0;i<3;i++) await click(page, 'button[data-r]:not([disabled])');
  o.tabs = await page.evaluate(observe);
  if(await page.isVisible('#sideX')) await click(page, '#sideX');
  // clic droit sur le 3e noeud (selection), puis specialisations
  const p = await page.evaluate(()=>{ const G = window.__game.G, n = G.nodes[2]; n.level = 12; return {x:(n.x+80)*G.view.k+innerWidth/2+G.view.x, y:(n.y+35)*G.view.k+innerHeight/2+G.view.y}; });
  await page.mouse.click(p.x, p.y, {button:'right'}); await frames(page, 2);
  await click(page, '[data-spec="spd"]'); await click(page, '[data-spec="eco"]');
  // liaisons tracees a la souris (clic gauche glisse d'un noeud a l'autre) : Source -> Compresseur -> Compresseur -> Upload
  const at = i=>page.evaluate(i=>{ const G = window.__game.G, n = G.nodes[i]; return {x:(n.x+80)*G.view.k+innerWidth/2+G.view.x, y:(n.y+35)*G.view.k+innerHeight/2+G.view.y}; }, i);
  for(const [i,j] of [[0,2],[2,3],[3,1]]){
    const a = await at(i), b = await at(j);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x+b.x)/2, (a.y+b.y)/2, {steps:3}); await page.mouse.move(b.x, b.y, {steps:3}); await page.mouse.up(); await frames(page, 2);
  }
  o.links = await page.evaluate(()=>window.__game.G.links.map(l=>[l.a,l.ao,l.b,l.bi]));
  o.selected = await page.evaluate(observe);
  await frames(page, 200); o.after = await page.evaluate(observe);
  return o;
}
// 2. sauvegarde reelle rechargee par le chemin du joueur, puis 30 s de jeu
const loaded = fx => async page=>{
  const o = {};
  o.load = await page.evaluate(fx=>{
    const strip = x => { const c = JSON.parse(JSON.stringify(x)); delete c.savedAt; delete c.daily; for(const l of c.links||[]) l.packets = []; return c; };
    const A = strip(window.__game.G), B = strip(JSON.parse(fx)), diffs = [];
    const walk = (x,y,p)=>{ if(JSON.stringify(x)===JSON.stringify(y)) return; if(x && y && typeof x==='object' && typeof y==='object'){ for(const k of new Set([...Object.keys(x),...Object.keys(y)])) walk(x[k],y[k],p+'.'+k); } else diffs.push(p); };
    walk(B, A, ''); return diffs;
  }, fx);
  await frames(page, 600); o.after = await page.evaluate(observe);
  return o;
};

(async()=>{
  const browser = await chromium.launch({executablePath: chromePath});
  const cases = [['partie neuve', null, fresh], ['sauvegarde v46', fx46, loaded(fx46)], ['sauvegarde v47', fx47, loaded(fx47)]];
  let fail = 0;
  for(const [name, save, actions] of cases){
    const pub = await run(browser, 'index.html', save, actions), tst = await run(browser, 'test.html', save, actions);
    const problems = [];
    if(pub.bridge.length) problems.push('version publiee : noms internes exposes sur window : '+pub.bridge.join(', '));
    if(!tst.bridge.length) problems.push('version de test sans pont');
    for(const [v,r] of [['publiee',pub],['test',tst]]) if(r.errs.length) problems.push(v+' : erreur '+r.errs.join(' | '));
    if(pub.out.load && pub.out.load.length) problems.push('rechargement avec pertes : '+pub.out.load.join(', '));
    const a = JSON.stringify(pub.out), b = JSON.stringify(tst.out);
    if(a!==b){
      const A = JSON.stringify(pub.out,null,1).split('\n'), B = JSON.stringify(tst.out,null,1).split('\n');
      const i = A.findIndex((l,k)=>l!==B[k]); problems.push('ecart publiee / test ligne '+(i+1)+'\n   publiee : '+A[i]+'\n   test    : '+B[i]);
    }
    console.log((problems.length?'FAIL ':'ok   ')+'boite noire : '+name+(problems.length?'\n  '+problems.join('\n  '):''));
    if(problems.length) fail++;
  }
  await browser.close();
  console.log(fail ? `\n${fail} echec(s) (boite noire)` : '\nboite noire : version publiee identique a la version de test');
  process.exit(fail?1:0);
})();
