// Bot d'équilibrage : joue le jeu en accéléré (appelé via Playwright, voir tools/balance.js)
// Il choisit chaque achat au meilleur retour sur investissement estimé.
window.runBot = function(hours, opt){
  const unlockedB = unlocked;
  opt = opt || {};
  const log = [], lines = [];
  let t = 0, buyT = [], mileT = [], mile = 0, mileFrom = 0, lastRun = G.run, rebootAt = 0, labBuilt = false, lastBuild = -999;
  const MULT = {}; for(const k in DEFS) if(DEFS[k].mult) MULT[k]=DEFS[k].mult; MULT.boost=1.5;
  const spdM = (g) => (1+0.1*(g?g.spd:G.glob.spd))*(1+0.05*G.pu.spd)*(1+0.04*G.tech.tspd);
  const revM = (g) => (1+0.25*(g?g.rev:G.glob.rev))*qpMult(G.qpTotal)*(1+0.02*achCount())*(1+0.1*G.pu.rev)*(1+0.08*G.tech.trev);
  const critM = (g) => 1 + 4*(0.03*(g?g.crit:G.glob.crit)+0.02*G.tech.tcrit);
  // revenu/s d'une ligne décrite par [{type, level}]
  function inc(spec, g){
    const sm = spdM(g); let thr = 1e9, val = 1;
    for(const s of spec){
      const d = DEFS[s.type]; thr = Math.min(thr, (s.level>=9?1.25:1)*(1+0.3*s.level)*lvlMult(s.level)*sm/d.t);
      if(d.val) val = d.val*(1+0.2*(g?g.seed:G.glob.seed))*(1+0.08*G.tech.tseed);
      else if(MULT[s.type]) val *= MULT[s.type];
    }
    return thr*val*revM(g)*critM(g);
  }
  const specOf = l => l.nodes.map(n=>({type:n.type, level:n.level}));
  function newTypes(kind){
    const ty = [unlockedB('mega')&&kind!=='lab' ? 'mega':'source','compress'];
    for(const x of ['boost','encrypt','ai','quantum','sing','neural','dim','omega']) if(unlockedB(x)) ty.push(x);
    ty.push(kind==='lab' ? 'lab' : 'upload'); return ty;
  }
  function lineCost(types){ let c=0; const cnt={}; for(const ty of types){ c+=Math.ceil(infl()*CS*DEFS[ty].cost*Math.pow(BG,(G.bought[ty]||0)+(cnt[ty]||0))*(1-0.05*G.pu.disc)*(1-0.02*G.tech.tcost)); cnt[ty]=(cnt[ty]||0)+1; } return c; }
  function make(types){
    const nodes=[]; let prev=null;
    for(const ty of types){ const n=addNode(ty,0,0); if(prev) connect(prev.id,0,n.id,0); nodes.push(n); prev=n; }
    lines.push({nodes});
  }
  function resetBoard(){ lines.length=0; labBuilt=false; if(G.nodes.length>=2){ connect(G.nodes[0].id,0,G.nodes[1].id,0); lines.push({nodes:[G.nodes[0],G.nodes[1]]}); } }
  function doReboot(){
    const g=qpGain(); G.qp+=g; G.qpTotal+=g; G.resets++; blankRun(G);
    addNode('source',0,0,true); addNode('upload',0,0,true); resetBoard();
    for(let k=0;k<60;k++){ const d=PU.filter(x=>G.pu[x.id]<x.max && puCost(x)<=G.qp).sort((a,b)=>puCost(a)-puCost(b))[0]; if(!d) break; G.qp-=puCost(d); G.pu[d.id]++; }
    if(G.pu.start) G.money = startCash(G.pu.start);
  }
  const mileStats = (from)=>{ const a=mileT.filter(x=>x>=from); const g=[]; for(let i=1;i<a.length;i++) g.push(a[i]-a[i-1]); if(!g.length) return {n:a.length}; g.sort((x,y)=>x-y); return {n:a.length, med:Math.round(g[g.length>>1]), p90:Math.round(g[Math.floor(g.length*0.9)]), max:Math.round(g[g.length-1])}; };
  const gapStats = (from)=>{ const a=buyT.filter(x=>x>=from); const g=[]; for(let i=1;i<a.length;i++) g.push(a[i]-a[i-1]); if(!g.length) return {buys:a.length}; g.sort((x,y)=>x-y); return {buys:a.length, med:Math.round(g[g.length>>1]), p90:Math.round(g[Math.floor(g.length*0.9)]), max:Math.round(g[g.length-1])}; };
  resetBoard();
  const dt=0.1, per=50, total=Math.floor(hours*3600/dt);
  let acc=0;
  for(let i=0;i<total;i++){
    step(dt); t+=dt; acc++;
    if(acc<per) continue;
    acc=0;
    G.lastRate=(G.run-lastRun)/(per*dt); lastRun=G.run;
    checkObj(); checkAch(); lastRun=G.run;
    const gn=qpGain();
    if(gn>=Math.max(1,Math.ceil(G.qpTotal*(opt.rebootRatio||1))) && t-rebootAt>(opt.minRun||600)){
      log.push({t:Math.round(t/60),ev:'reboot',gaps:mileStats(rebootAt),rev:+revMult().toFixed(1),tech:Object.values(G.tech).join(','),pu:Object.values(G.pu).join(','),glob:Object.values(G.glob).join(','),types:G.nodes.map(n=>n.type[0]+n.type[1]+n.level).join(' ').slice(0,260),run:fmt(G.run),gain:gn,qpTotal:G.qpTotal+gn,nodes:G.nodes.length,rate:fmt(G.lastRate)});
      doReboot(); rebootAt=t; mile=0; continue;
    }
    if(unlockedB('lab') && !labBuilt){ const ty=newTypes('lab'), lc=lineCost(ty); if(G.money>=lc*(opt.labMoney||1.5)){ G.money-=lc; make(ty); lines[lines.length-1].lab=true; labBuilt=true; lastBuild=t; } }
    for(let k=0;k<10;k++){
      const total0 = lines.reduce((s,l)=>s+inc(specOf(l)),0);
      const c=[];
      for(const l of lines){ const sp=specOf(l), base=inc(sp);
        l.nodes.forEach((n,idx)=>{ const s2=sp.map((x,j)=>j===idx?{type:x.type,level:x.level+1}:x); const gain=inc(s2)-base; if(gain>0) c.push({lb:'up '+n.type+n.level,cost:upCost(n),gain,f:()=>{G.money-=upCost(n); n.level++; if(n.level>=9) n.spec='spd';}}); });
      }
      // extension d'une ligne existante : insertion d'un palier ou remplacement de la Source par une Super Source
      for(const l of lines){ if(l.lab) continue;
        const sp=specOf(l), base=inc(sp), have=new Set(sp.map(x=>x.type));
        for(const ty of ['boost','encrypt','ai','quantum','sing','neural','dim','omega']){
          if(!unlockedB(ty) || have.has(ty)) continue;
          const cst=lineCost([ty]); const sp2=sp.slice(0,-1).concat([{type:ty,level:0}],sp.slice(-1));
          const gain=inc(sp2)-base; if(gain>0) c.push({lb:'ext '+ty,cost:cst,gain,f:()=>{
            G.money-=cst; const up=l.nodes[l.nodes.length-1], prev=l.nodes[l.nodes.length-2];
            const n=addNode(ty,0,0); connect(prev.id,0,n.id,0); connect(n.id,0,up.id,0); l.nodes.splice(l.nodes.length-1,0,n); }});
        }
        if(sp[0].type==='source' && unlockedB('mega')){
          const cst=lineCost(['mega']); const sp2=[{type:'mega',level:0}].concat(sp.slice(1));
          const gain=inc(sp2)-base; if(gain>0) c.push({lb:'swap mega',cost:cst,gain,f:()=>{
            G.money-=cst; const old=l.nodes[0], nx=l.nodes[1]; const n=addNode('mega',0,0); removeNode(old); connect(n.id,0,nx.id,0); l.nodes[0]=n; }});
        }
      }
      for(const gl of GLOBALS){ if(G.glob[gl.id]>=gl.max) continue;
        const g2=Object.assign({},G.glob); g2[gl.id]++;
        const gain = gl.id==='buf' ? 0 : lines.reduce((s,l)=>s+inc(specOf(l),g2),0)-total0;
        if(gain>0) c.push({lb:'glob '+gl.id+G.glob[gl.id],cost:gUpCost(gl),gain,f:()=>{G.money-=gUpCost(gl); G.glob[gl.id]++;}});
      }
      if(lines.length<(opt.maxLines||12) && t-lastBuild>(opt.bd||10)){
        const full=newTypes();
        for(const head of (unlockedB('mega')?['source','mega']:['source'])) for(let k=2;k<full.length;k++){ const ty=[head].concat(full.slice(1,k),['upload']), lc=lineCost(ty); const gain=inc(ty.map(x=>({type:x,level:0}))); c.push({lb:'line '+ty.map(x=>x.slice(0,2)).join('>'),cost:lc,gain,f:()=>{G.money-=lc; make(ty); lastBuild=t;}}); }
      }
      if(unlockedB('lab') && !labBuilt && t-lastBuild>(opt.bd||10)){ const ty=newTypes('lab'), lc=lineCost(ty); c.push({cost:lc,gain:(opt.labW||0.4)*inc(ty.slice(0,-1).concat(['upload']).map(x=>({type:x,level:0}))),f:()=>{G.money-=lc; make(ty); lines[lines.length-1].lab=true; labBuilt=true; lastBuild=t;}}); }
      c.sort((a,b)=>a.cost/a.gain-b.cost/b.gain);
      if(opt.dump && Math.abs(t-opt.dump)<0.06 && k===0) log.push({dump:c.slice(0,8).map(x=>x.lb+' c='+fmt(x.cost)+' pb='+(x.cost/x.gain).toFixed(0)+'s'),money:fmt(G.money),rate:fmt(total0)});
      const best=c[0]; if(!best) break;
      if(G.money<best.cost){
        const wait=(best.cost-G.money)/Math.max(total0*1.0,1);
        // on achète en attendant tout ce qui se rembourse avant que le meilleur achat soit abordable
        const aff=c.find(x=>x.cost<=G.money && (x.cost/x.gain<wait*(opt.fill||1) || wait>=(opt.patience||900)));
        if(!aff) break; aff.f(); buyT.push(t); continue;
      }
      if(opt.trace && t>=opt.trace[0] && t<=opt.trace[1]) log.push({t:Math.round(t),lb:best.lb,money:fmt(G.money),run:fmt(G.run),buy:fmt(best.cost),pb:Math.round(best.cost/best.gain),rate:fmt(G.lastRate)});
      best.f(); buyT.push(t);
    }
    { const cur = lines.reduce((a,l)=>a+inc(specOf(l)),0); if(cur>=mile*1.1 || mile===0){ mileT.push(t); mile = cur; } }
    for(let k=0;k<50;k++){ const d=TECH.filter(x=>G.tech[x.id]<x.max && techCost(x)<=G.rp).sort((a,b)=>techCost(a)-techCost(b))[0]; if(!d) break; G.rp-=techCost(d); G.tech[d.id]++; }
    if(opt.mark && opt.mark.includes(Math.round(t/60)) && Math.abs(t%60)<5) log.push({t:Math.round(t/60),run:fmt(G.run),life:fmt(G.lifetime),rate:fmt(G.lastRate),nodes:G.nodes.length,qpT:G.qpTotal,rp:fmt(G.rpTotal),obj:G.obj});
  }
  log.push({end:true,gaps:mileStats(rebootAt),t:Math.round(t/60),run:fmt(G.run),life:fmt(G.lifetime),rate:fmt(G.lastRate),qpT:G.qpTotal,resets:G.resets,rp:fmt(G.rpTotal),obj:G.obj,nodes:G.nodes.length});
  return log;
};
