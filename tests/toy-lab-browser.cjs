/* Usage: TOY_CHROMIUM=/path/to/chromium node tests/toy-lab-browser.cjs [kind] */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),types=process.argv[2]?[process.argv[2]]:['bouncy','fat','coward','doodle'];
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(root,'dist',decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff')?'font/woff':'text/html');res.end(fs.readFileSync(file));}catch(e){res.statusCode=404;res.end('missing');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.TOY_CHROMIUM,args:['--no-sandbox','--disable-gpu']});
 try{
  fs.mkdirSync(path.join(root,'docs/qa/toy-v2'),{recursive:true});
  for(const kind of types){
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/qa/${kind}-block-lab.html?qa`);await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>__toyLab.game.p.type),kind);assert.deepEqual(errors,[]);
   const bounds=await page.locator('#game').boundingBox();assert.ok(Math.abs(bounds.height/bounds.width-2)<.01);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.evaluate(()=>{__toyLab.pause();__toyLab.game.p.cells=[[0,0],[1,0],[0,1],[1,1]];__toyLab.game.p.original=[[0,0],[1,0],[0,1],[1,1]];__toyLab.game.p.y=4;__toyLab.draw();});
   await page.screenshot({path:path.join(root,`docs/qa/toy-v2/${kind}-mobile.png`),fullPage:true});
   await page.evaluate(()=>{__toyLab.reset();__toyLab.game.drop();});
   await page.waitForFunction(()=>__toyLab.game.locks===1);assert.equal(await page.evaluate(()=>__toyLab.game.lastLock.type),kind);
   await page.locator('[data-mode="cycle"]').click();assert.ok(await page.locator('#new').isDisabled());assert.equal(await page.evaluate(()=>__toyLab.game.clock.events.filter(e=>e.event==='spawn').length),1);
   await page.locator('#pause').click();const paused=await page.evaluate(()=>__toyLab.game.clock.elapsed);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__toyLab.game.clock.elapsed),paused);
   assert.deepEqual(errors,[]);console.log(`${kind}: browser load, 1:2 layout, screenshot, real drop/lock, cycle initial grant, manual pause PASS`);await page.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
