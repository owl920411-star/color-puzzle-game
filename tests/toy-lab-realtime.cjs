/* Real clocks and requestAnimationFrame; no fake time, board clearing or physics overrides. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(root,'dist',decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff')?'font/woff':'text/html');res.end(fs.readFileSync(file));}catch(e){res.statusCode=404;res.end('missing');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const results=await Promise.all(['bouncy','fat','coward','doodle'].map(async kind=>{
   // Separate browser windows keep each document active; a background tab must pause.
   const browser=await chromium.launch({executablePath:process.env.TOY_CHROMIUM,args:['--no-sandbox','--disable-gpu']});
   try{
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    await page.goto(`http://127.0.0.1:${server.address().port}/qa/${kind}-block-lab.html?qa`);
    await page.locator('[data-mode="cycle"]').click();
    await page.evaluate(()=>{
     const g=__toyLab.game;window.realStart=performance.now();window.realTrace=[];let id=0;
     window.autoPlayer=setInterval(()=>{
      // Place new pieces using normal one-cell movement. Natural gravity and all
      // prank phases run unchanged. No forced drops, clearing, spawning or clocks.
      if(g.p.id!==id&&g.p.state==='fall'){
       id=g.p.id;const from=g.p.x;let best=from,deepest=-1;
       for(let col=0;col<10;col++)if(!g.hit(col,g.p.y)){g.p.x=col;const depth=g.landingY();if(depth>deepest){deepest=depth;best=col;}}
       g.p.x=from;for(let i=0;i<10&&g.p.x!==best;i++)if(!g.move(Math.sign(best-g.p.x)))break;
      }
      if(g.clock.elapsed>=59000&&realTrace.length===0)realTrace.push({wall:performance.now()-realStart,active:g.clock.elapsed,periodic:g.clock.events.filter(e=>e.event==='reserve').length});
     },30);
    });
    await page.waitForFunction(()=>__toyLab.game.clock.events.filter(e=>e.event==='spawn').length===2,{},{timeout:75000});
    const result=await page.evaluate(()=>{clearInterval(autoPlayer);return{kind:__toyLab.game.kind,wallMs:performance.now()-realStart,activeMs:__toyLab.game.clock.elapsed,events:__toyLab.game.clock.events,trace:realTrace,state:__toyLab.game.p.state,locks:__toyLab.game.locks,focus:document.hasFocus()};});
    assert.equal(result.events.filter(e=>e.event==='reserve').length,1);assert.equal(result.events.find(e=>e.event==='reserve').reservedAt,60000);assert.equal(result.trace[0].periodic,0);assert.ok(result.activeMs>=60000);assert.ok(Math.abs(result.wallMs-result.activeMs)<500);assert.ok(result.focus);console.log(JSON.stringify(result));return result;
   }finally{await browser.close();}
  }));
  fs.writeFileSync(path.join(root,'docs/qa/toy-v2/real-time-results.json'),JSON.stringify(results,null,2)+'\n');
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
