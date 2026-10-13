// Usage : NODE_PATH=$(npm root -g) node tools/balance.cjs [heures] [options JSON]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async()=>{
  const hours = parseFloat(process.argv[2]||'3'), opt = JSON.parse(process.argv[3]||'{}');
  const b = await chromium.launch({executablePath: process.env.CHROMIUM||'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
  const p = await b.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(process.env.GAMEDIR||path.resolve(__dirname,'..'),'dist','index.html'));
  await p.evaluate(()=>{ localStorage.clear(); });
  await p.reload(); await p.waitForTimeout(300);
  await p.addScriptTag({content: fs.readFileSync(path.resolve(__dirname,'bot.js'),'utf8')});
  const log = await p.evaluate(([h,o])=>runBot(h,o),[hours,opt]);
  for(const l of log) console.log(JSON.stringify(l));
  if(errs.length) console.log('errors',errs);
  await b.close();
})();
