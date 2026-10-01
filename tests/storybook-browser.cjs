'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/qa/storybook-sketchbook');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{try{const f=path.join(root,'dist',req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.woff')?'font/woff':'text/html');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.STORYBOOK_CHROMIUM||undefined,args:['--no-sandbox','--disable-gpu']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],results={layouts:[],goals:[]};page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/?qa=1`);await page.evaluate(()=>localStorage.setItem('glassfall-v1',JSON.stringify({tutorialCompleted:true,sound:false,qaSentinel:'keep'})));await page.reload();await page.waitForTimeout(1100);
 const expected=[[],[0],[1],[2],[3],[3,4],[3,4,5],[3,4,5,6],[3,4,5,6,7]];
 await page.evaluate(async()=>{for(let i=0;i<8;i++){const img=new Image();img.src='assets/storybook-mask-'+i+'.svg';await img.decode();}const ground=new Image();ground.src='assets/storybook-ground.svg';await ground.decode();});
 for(let n=0;n<=8;n++){
  await page.evaluate(n=>{CrayonStorybook.write({completed:n});__GLASSFALL_QA__.menu();},n);
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(420);
   const start=await page.locator('.cb-start').boundingBox();const book=await page.locator('.cb-storybook').boundingBox();assert.ok(book.y>start.y+start.height,'sketchbook follows START');assert.equal(await page.locator('.storybook-binding i').count(),7);assert.ok(start.y>=0&&start.y+start.height<=height,`${width} stage ${n} start`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.match(await page.locator('.cb-storybook').innerText(),new RegExp(n+'/8'));
   for(const selector of ['.cb-logo','.cb-hero','.storybook-scene']){const r=await page.locator(selector).boundingBox();assert.ok(r.width>0&&r.height>0&&r.y+r.height<=height);}
   assert.deepEqual(await page.locator('.storybook-scene-piece').evaluateAll(es=>es.map(e=>Number(e.dataset.piece))),expected[n]);
   assert.equal(await page.locator('.storybook-pieces,.cb-storybook .is-locked').count(),0);
   await page.screenshot({path:path.join(out,`stage-${n}-${width}.png`)});if(width===390)await page.locator('.cb-storybook').screenshot({path:path.join(out,`scene-${n}.png`)});results.layouts.push({width,height,completed:n,start});
  }
 }
 // Existing saved 5/8 remains intact on reload, independent of presentation.
 await page.evaluate(()=>CrayonStorybook.write({completed:5}));await page.reload();assert.match(await page.locator('.cb-storybook').innerText(),/5\/8/);
 await page.evaluate(()=>{CrayonStorybook.write({completed:0});__GLASSFALL_QA__.menu();});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-menu=start]').tap();await page.waitForFunction(()=>__GLASSFALL_QA__.state==='playing');await page.waitForSelector('#storybook-goal-toast.show');assert.equal(await page.locator('#storybook-goal-toast').evaluate(e=>getComputedStyle(e).pointerEvents),'none');await page.waitForTimeout(250);await page.screenshot({path:path.join(out,'goal.png')});
 // Normal touch-button play: no board/counter rewriting, engine ends the run.
 for(let i=0;i<12;i++){
  await page.keyboard.press('ArrowLeft');for(let j=0;j<10;j++)await page.keyboard.press('ArrowLeft');for(let j=0;j<(i%3)*3;j++)await page.keyboard.press('ArrowRight');await page.locator('#drop').tap();await page.waitForTimeout(140);
 }
 assert.ok(await page.evaluate(()=>__GLASSFALL_QA__.run.pieces>=12));assert.equal(await page.locator('#storybook-goal-toast').evaluate(e=>e.classList.contains('show')),false);assert.equal(await page.evaluate(()=>CrayonStorybook.read().completed),0);await page.screenshot({path:path.join(out,'play.png')});
 for(let i=0;i<70&&await page.evaluate(()=>__GLASSFALL_QA__.state==='playing');i++){await page.locator('#board').focus();await page.keyboard.press('Space');await page.waitForTimeout(140);}
 assert.equal(await page.evaluate(()=>__GLASSFALL_QA__.state),'over');assert.equal(await page.evaluate(()=>CrayonStorybook.read().completed),1);assert.match(await page.locator('.storybook-result').innerText(),/씨앗을 심었어요!/);await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'success.png')});results.actualPlay=await page.evaluate(()=>({pieces:__GLASSFALL_QA__.run.pieces,lines:__GLASSFALL_QA__.run.lines,completed:CrayonStorybook.read().completed}));
 await page.evaluate(()=>__GLASSFALL_QA__.finish('duplicate'));assert.equal(await page.evaluate(()=>CrayonStorybook.read().completed),1);await page.locator('[data-menu=menu]').tap();assert.equal(await page.locator('.storybook-scene-piece.is-new').count(),1);assert.equal(await page.locator('.storybook-scene-piece.is-new').getAttribute('data-piece'),'0');assert.match(await page.locator('.cb-storybook').innerText(),/1\/8/);assert.deepEqual(await page.locator('.storybook-scene-piece').evaluateAll(es=>es.map(e=>Number(e.dataset.piece))),[0]);await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'actual-play-home-1.png')});await page.reload();assert.match(await page.locator('.cb-storybook').innerText(),/1\/8/);await page.evaluate(()=>__GLASSFALL_QA__.start(false,false));await page.locator('#drop').tap();await page.waitForTimeout(150);await page.locator('#pause').tap();await page.locator('[data-menu=resume]').tap();assert.equal(await page.evaluate(()=>__GLASSFALL_QA__.state),'playing');
 // Deterministic browser fixtures check every threshold, separately from actual play above.
 for(let stage=0;stage<8;stage++){
  for(const success of [false,true]){
   const result=await page.evaluate(({stage,success})=>{const s=CrayonStorybook; s.write({completed:stage});const q=__GLASSFALL_QA__;q.start(false,false);const goal=s.PAGE.stages[stage];q.run[goal.metric]=goal.target-(success?0:1);q.hud();const hud=document.getElementById('notice').textContent;q.finish('qa-fixture');q.finish('duplicate');return{completed:s.read().completed,hud,html:document.querySelector('.storybook-result').innerText};},{stage,success});assert.equal(result.completed,stage+(success?1:0));assert.match(result.html,success?/(심었어요|자랐어요|생겼어요|피었어요|풍성해졌어요|놀러왔어요|나타났어요)/:/이번에는 여기까지/);results.goals.push({stage,success,...result});
  }
 }
 await page.evaluate(()=>__GLASSFALL_QA__.menu());await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'complete.png')});await page.reload();assert.match(await page.locator('.cb-storybook').innerText(),/8\/8/);
 for(const excluded of ['practice','guest','tutorial']){assert.equal(await page.evaluate(excluded=>{CrayonStorybook.write({completed:0});const q=__GLASSFALL_QA__;q.start(false,excluded==='tutorial');q.run.pieces=999;if(excluded==='guest')q.adaptive.session.config.guest=true;if(excluded==='practice')q.items.practice=true;q.finish('excluded');return CrayonStorybook.read().completed;},excluded),0);}
 // Presentation fixtures: inspect one-shot reveal and motion-reduction behavior.
 for(const completed of [1,5,6,7,8]){
  await page.evaluate(n=>{CrayonStorybook.write({completed:n-1});__GLASSFALL_QA__.menu();CrayonStorybook.write({completed:n});__GLASSFALL_QA__.menu();},completed);
  assert.equal(await page.locator('.storybook-scene-piece.is-new').count(),1);
  assert.equal(await page.locator('.storybook-scene-piece.is-new').getAttribute('data-piece'),String(completed-1));
  const reveal=await page.locator('.storybook-scene-piece.is-new').evaluate(e=>({duration:e.getAnimations()[0].effect.getTiming().duration,frames:e.getAnimations()[0].effect.getKeyframes(),pointer:getComputedStyle(e).pointerEvents}));
  assert.equal(reveal.duration,350);assert.equal(reveal.pointer,'none');assert.equal(reveal.frames[0].opacity,'0');assert.equal(reveal.frames.at(-1).opacity,'1');
  await page.waitForTimeout(400);assert.equal(await page.locator('.storybook-scene-piece.is-new').evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.screenshot({path:path.join(out,`revealed-${completed}.png`)});
  await page.evaluate(()=>__GLASSFALL_QA__.menu());assert.equal(await page.locator('.storybook-scene-piece.is-new').count(),0);
 }
 await page.reload();assert.equal(await page.locator('.storybook-scene-piece.is-new').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{CrayonStorybook.write({completed:7});__GLASSFALL_QA__.menu();CrayonStorybook.write({completed:8});__GLASSFALL_QA__.menu();});
 assert.equal(await page.locator('.storybook-scene-piece.is-new').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await page.locator('.storybook-completion').evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
 await page.screenshot({path:path.join(out,'reduced-motion.png')});
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Tap START during the reveal rather than waiting for the animation to end.
 await page.evaluate(()=>{CrayonStorybook.write({completed:0});__GLASSFALL_QA__.menu();CrayonStorybook.write({completed:1});__GLASSFALL_QA__.menu();});
 await page.locator('[data-menu=start]').tap();await page.waitForFunction(()=>__GLASSFALL_QA__.state==='playing');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('glassfall-v1')).qaSentinel),'keep');assert.deepEqual(errors,[]);results.errors=errors;results.checks=['toast does not intercept input and hides after 1.8s','natural gameplay to gameover unlocks exactly one','all eight threshold success/failure fixtures','duplicate finish guard','reload persistence 1/8 and 8/8','practice/guest/tutorial exclusion','pause/resume','existing save fields preserved','only newest detail reveals once at 350ms','reload does not replay reveal','reduced motion disables detail and completion animation','START during reveal works'];fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');console.log('Storybook browser QA PASS');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
