'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/qa/toy-main');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.join(root,'dist',decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.woff')?'font/woff':f.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end('missing');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.TOY_CHROMIUM,args:['--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/index.html?qa=1&play=1`);
  await page.waitForFunction(()=>window.__GLASSFALL_QA__?.toys?.game?.active?.toy);await page.evaluate(()=>document.fonts.load('700 30px "Gaegu Toys"'));await page.bringToFront();
  const cdp=await page.context().newCDPSession(page);
  for(const [age,dx,count] of [[280,65,0],[40,65,1],[40,-65,1]]){
   await page.evaluate(()=>{const q=__GLASSFALL_QA__;q.start(false,false);window.rotations=[];const fn=q.run.rotateDir.bind(q.run);q.run.rotateDir=d=>{rotations.push(d);return fn(d);};});
   const r=await page.locator('#board').boundingBox(),p={x:r.x+r.width*.4,y:r.y+r.height*.4,id:1};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await page.waitForTimeout(age);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,x:p.x+dx}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>rotations.length),count);
  }
  const types=['bouncy','fat','coward','doodle'],results=[];
  for(const kind of types){
   // Isolated integration fixture. Only this section prepares a specific toy.
   await page.evaluate(kind=>{const q=__GLASSFALL_QA__;q.start(false,false);q.run.active=q.toys.makePiece(kind);q.run.active.y=6;q.hud();q.draw();},kind);
   await page.screenshot({path:path.join(out,`${kind}-main.png`)});
   await page.locator('#hold').tap();assert.equal(await page.evaluate(()=>__GLASSFALL_QA__.run.held.toy.kind),kind);
   await page.locator('#drop').tap();await page.locator('#hold').tap();assert.equal(await page.evaluate(()=>__GLASSFALL_QA__.run.active.toy.kind),kind);
   await page.locator('#drop').tap();assert.ok(await page.evaluate(()=>__GLASSFALL_QA__.toys.busy));
   await page.locator('#pause').tap();const paused=await page.evaluate(()=>__GLASSFALL_QA__.toys.clock.elapsed);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__GLASSFALL_QA__.toys.clock.elapsed),paused);
   await page.locator('[data-menu="resume"]').tap();await page.waitForFunction(()=>!__GLASSFALL_QA__.toys.busy);
   results.push(await page.evaluate(kind=>({kind,pieces:__GLASSFALL_QA__.run.pieces,cells:__GLASSFALL_QA__.run.board.flat().filter(c=>c?.toy?.kind===kind).length,ink:__GLASSFALL_QA__.run.board.flat().filter(c=>c?.toyInk).length}),kind));
   assert.ok(results.at(-1).cells>=4);
  }
  for(const width of [320,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,checks:['real touch: hold then swipe no rotation; quick CW/CCW rotate','all four: hold/retrieve/drop/pause/resume/lock','320/390/430px no horizontal overflow']},null,2)+'\n');
  console.log('Production browser: four toys, hold/retrieve/drop/pause/resume, short swipe controls and mobile layout PASS');
  if(!process.argv.includes('--realtime'))return;
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>__GLASSFALL_QA__.start(false,false));
  const began=Date.now(),seen=new Set();let lastLog=-1;
  // Actual RAF/time/gravity/queue/board. The bot uses normal action() inputs;
  // it never advances the clock, rewrites a piece or clears the board.
  while(Date.now()-began<195000){
   const state=await page.evaluate(()=>{
    const q=__GLASSFALL_QA__,g=q.run;
    if(q.state==='playing'&&!q.toys.busy&&g.active){
     const a=g.active,key=a.cells[0].id;
     if(window.lastBotPiece!==key){
      window.lastBotPiece=key;let best=null,cells=a.cells.map(c=>({...c}));
      for(let rotation=0;rotation<4;rotation++){
       for(let x=-3;x<10;x++){
        const p={...a,cells,x,y:a.y};if(!g.fits(p))continue;while(g.fits(p,0,1))p.y++;
        const b=g.board.map(r=>r.map(Boolean));for(const c of cells)b[p.y+c.y][x+c.x]=true;
        if(a.toy?.kind==='fat')for(const c of cells)for(const dx of [-1,1]){const xx=x+c.x+dx;if(xx>=0&&xx<10)b[p.y+c.y][xx]=true;}
        const lines=b.filter(r=>r.every(Boolean)).length,rows=b.filter(r=>!r.every(Boolean));while(rows.length<20)rows.unshift(Array(10).fill(false));
        let holes=0,aggregate=0,max=0,bump=0,prev=0;
        for(let col=0;col<10;col++){let top=20;for(let y=0;y<20;y++){if(rows[y][col])top=Math.min(top,y);else if(top<20)holes++;}const h=20-top;aggregate+=h;max=Math.max(max,h);if(col)bump+=Math.abs(h-prev);prev=h;}
        const cost=holes*8+aggregate*.55+max*1.1+bump*.38-lines*12;
        if(!best||cost<best.cost)best={cost,x,rotation};
       }
       cells=cells.map(c=>({...c,x:a.size-1-c.y,y:c.x}));
      }
      if(best){for(let i=0;i<best.rotation;i++)q.action('rotate');for(let n=0;g.active&&g.active.x!==best.x&&n<15;n++)if(!q.action(g.active.x<best.x?'right':'left'))break;q.action('drop');}
     }
    }
    return{state:q.state,time:q.toys.clock.elapsed,events:q.toys.clock.events,active:g.active?.toy?.kind,busy:q.toys.busy,animation:q.toys.animation?.p.type,lines:g.lines,pieces:g.pieces};
   });
   assert.notEqual(state.state,'over','bot must stay in one uninterrupted real game');if(state.animation)seen.add(state.animation);
   const minute=Math.floor(state.time/60000);if(minute!==lastLog){lastLog=minute;console.log(JSON.stringify({minute,time:state.time,lines:state.lines,pieces:state.pieces,toys:[...seen]}));}
   if(state.events.filter(e=>e.event==='spawn').length>=4&&seen.size===4&&!state.busy){
    assert.deepEqual(state.events.filter(e=>e.event==='spawn').map(e=>e.reservedAt),[0,60000,120000,180000]);
    assert.ok(Math.abs(state.time-(Date.now()-began))<1000);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'real-time-results.json'),JSON.stringify({...state,wallMs:Date.now()-began,types:[...seen],errors},null,2)+'\n');console.log('Production real 3-minute game: initial bouncy, 60s fat, 120s coward, 180s doodle PASS');return;
   }
   await page.waitForTimeout(250);
  }
  throw Error('Timed out waiting for four real-time toy spawns');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
