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
   await page.evaluate(()=>{__toyLab.game.p.cells=[[0,0],[1,0],[0,1],[1,1]];__toyLab.game.p.original=[[0,0],[1,0],[0,1],[1,1]];__toyLab.game.p.colour=ToyLabKit.PALETTES[__toyLab.game.kind][0];__toyLab.game.p.y=4;__toyLab.draw();});
   await page.screenshot({path:path.join(root,`docs/qa/toy-v2/${kind}-mobile.png`),fullPage:true});
   await page.evaluate(()=>{__toyLab.reset();__toyLab.game.drop();});
   await page.waitForFunction(()=>__toyLab.game.locks===1);assert.equal(await page.evaluate(()=>__toyLab.game.lastLock.type),kind);
   await page.locator('[data-mode="cycle"]').click();assert.ok(await page.locator('#new').isDisabled());assert.equal(await page.evaluate(()=>__toyLab.game.clock.events.filter(e=>e.event==='spawn').length),1);
   await page.locator('#pause').click();const paused=await page.evaluate(()=>__toyLab.game.clock.elapsed);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__toyLab.game.clock.elapsed),paused);
   // Blur/focus use the real UI suspension listeners; no clock changes during absence.
   await page.evaluate(()=>{__toyLab.reset('cycle');window.dispatchEvent(new Event('blur'));});
   const blurTime=await page.evaluate(()=>__toyLab.game.clock.elapsed);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>__toyLab.game.clock.elapsed),blurTime);
   await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(60);assert.ok(await page.evaluate(t=>__toyLab.game.clock.elapsed>t,blurTime));
   // Browser touch cancellation and outside release cannot cause an action.
   await page.evaluate(()=>__toyLab.reset());await page.locator('#game').scrollIntoViewIfNeeded();
   const cdp=await page.context().newCDPSession(page),r=await page.locator('#game').boundingBox(),point={x:r.x+r.width/2,y:r.y+r.height/2,id:1};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   assert.equal(await page.evaluate(()=>__toyLab.game.p.state),'fall');assert.equal(await page.evaluate(()=>__toyLab.game.p.userMoves),0);
   await page.locator('#left').scrollIntoViewIfNeeded();const lb=await page.locator('#left').boundingBox(),bp={x:lb.x+lb.width/2,y:lb.y+lb.height/2,id:1};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[bp]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...bp,x:bp.x+lb.width+15}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>__toyLab.game.p.userMoves),0);
   await page.locator('#game').scrollIntoViewIfNeeded();const r2=await page.locator('#game').boundingBox(),sp={x:r2.x+r2.width*.45,y:r2.y+r2.height*.5,id:1};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[sp]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...sp,x:sp.x+40}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal(await page.evaluate(()=>__toyLab.game.p.userMoves),1);await page.locator('#left').tap();assert.equal(await page.evaluate(()=>__toyLab.game.p.userMoves),2);
   // A second finger on the canvas does not issue another action or leak to a new piece.
   await page.evaluate(()=>{__toyLab.reset();const g=__toyLab.game,drop=g.drop.bind(g),move=g.move.bind(g);window.inputCalls=[];g.drop=()=>{inputCalls.push('drop');return drop();};g.move=d=>{inputCalls.push('move');return move(d);};});
   await page.locator('#game').scrollIntoViewIfNeeded();const r3=await page.locator('#game').boundingBox(),one={x:r3.x+40,y:r3.y+120,id:1},two={x:r3.x+r3.width-40,y:r3.y+150,id:2};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[one]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[one,two]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[two]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>inputCalls.length),1);
   // Small phone and DPR variants load the same kind and retain a 1:2 canvas.
   for(const [width,height,dpr] of [[320,640,1],[430,932,3]]){
    const other=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,isMobile:true,hasTouch:true});await other.goto(`http://127.0.0.1:${server.address().port}/qa/${kind}-block-lab.html?qa`);const rect=await other.locator('#game').boundingBox();assert.ok(Math.abs(rect.height/rect.width-2)<.01);assert.ok(await other.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await other.evaluate(()=>document.getElementById('game').width),360*dpr);await other.close();
   }
   assert.deepEqual(errors,[]);console.log(`${kind}: browser load, DPR 1/2/3, 320/390/430px layout, drop/lock, cycle, pause/blur, touch cancel/outside/swipe/button/multitouch PASS`);await page.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
