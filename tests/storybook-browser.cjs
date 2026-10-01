'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/qa/storybook');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{try{const f=path.join(root,'dist',req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.STORYBOOK_CHROMIUM||undefined,args:['--no-sandbox','--disable-gpu']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],results={layouts:[],goals:[]};page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/?qa=1`);await page.evaluate(()=>localStorage.setItem('glassfall-v1',JSON.stringify({tutorialCompleted:true,sound:false,qaSentinel:'keep'})));await page.reload();await page.waitForTimeout(1100);
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932]]){
  await page.setViewportSize({width,height});const start=await page.locator('.cb-start').boundingBox();assert.ok(start.y>=0&&start.y+start.height<=height);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.match(await page.locator('.cb-storybook').innerText(),/0\/8/);await page.screenshot({path:path.join(out,`home-${width}.png`)});results.layouts.push({width,height,start});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-menu=start]').tap();await page.waitForFunction(()=>__GLASSFALL_QA__.state==='playing');await page.waitForSelector('#storybook-goal-toast.show');assert.equal(await page.locator('#storybook-goal-toast').evaluate(e=>getComputedStyle(e).pointerEvents),'none');await page.waitForTimeout(250);await page.screenshot({path:path.join(out,'goal.png')});
 // Normal touch-button play: no board/counter rewriting, engine ends the run.
 for(let i=0;i<12;i++){
  await page.keyboard.press('ArrowLeft');for(let j=0;j<10;j++)await page.keyboard.press('ArrowLeft');for(let j=0;j<(i%3)*3;j++)await page.keyboard.press('ArrowRight');await page.locator('#drop').tap();await page.waitForTimeout(140);
 }
 assert.ok(await page.evaluate(()=>__GLASSFALL_QA__.run.pieces>=12));assert.equal(await page.locator('#storybook-goal-toast').evaluate(e=>e.classList.contains('show')),false);assert.equal(await page.evaluate(()=>CrayonStorybook.read().completed),0);await page.screenshot({path:path.join(out,'play.png')});
 for(let i=0;i<70&&await page.evaluate(()=>__GLASSFALL_QA__.state==='playing');i++){await page.locator('#board').focus();await page.keyboard.press('Space');await page.waitForTimeout(140);}
 assert.equal(await page.evaluate(()=>__GLASSFALL_QA__.state),'over');assert.equal(await page.evaluate(()=>CrayonStorybook.read().completed),1);assert.match(await page.locator('.storybook-result').innerText(),/씨앗 그림을 완성/);await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'success.png')});results.actualPlay=await page.evaluate(()=>({pieces:__GLASSFALL_QA__.run.pieces,lines:__GLASSFALL_QA__.run.lines,completed:CrayonStorybook.read().completed}));
 await page.evaluate(()=>__GLASSFALL_QA__.finish('duplicate'));assert.equal(await page.evaluate(()=>CrayonStorybook.read().completed),1);await page.reload();assert.match(await page.locator('.cb-storybook').innerText(),/1\/8/);await page.evaluate(()=>__GLASSFALL_QA__.start(false,false));await page.locator('#drop').tap();await page.waitForTimeout(150);await page.locator('#pause').tap();await page.locator('[data-menu=resume]').tap();assert.equal(await page.evaluate(()=>__GLASSFALL_QA__.state),'playing');
 // Deterministic browser fixtures check every threshold, separately from actual play above.
 for(let stage=0;stage<8;stage++){
  for(const success of [false,true]){
   const result=await page.evaluate(({stage,success})=>{const s=CrayonStorybook; s.write({completed:stage});const q=__GLASSFALL_QA__;q.start(false,false);const goal=s.PAGE.stages[stage];q.run[goal.metric]=goal.target-(success?0:1);q.hud();const hud=document.getElementById('notice').textContent;q.finish('qa-fixture');q.finish('duplicate');return{completed:s.read().completed,hud,html:document.querySelector('.storybook-result').innerText};},{stage,success});assert.equal(result.completed,stage+(success?1:0));assert.match(result.html,success?/완성/:/이번에는 여기까지/);results.goals.push({stage,success,...result});
  }
 }
 await page.evaluate(()=>__GLASSFALL_QA__.menu());await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'complete.png')});await page.reload();assert.match(await page.locator('.cb-storybook').innerText(),/8\/8/);
 for(const excluded of ['practice','guest','tutorial']){assert.equal(await page.evaluate(excluded=>{CrayonStorybook.write({completed:0});const q=__GLASSFALL_QA__;q.start(false,excluded==='tutorial');q.run.pieces=999;if(excluded==='guest')q.adaptive.session.config.guest=true;if(excluded==='practice')q.items.practice=true;q.finish('excluded');return CrayonStorybook.read().completed;},excluded),0);}
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('glassfall-v1')).qaSentinel),'keep');assert.deepEqual(errors,[]);results.errors=errors;results.checks=['toast does not intercept input and hides after 1.8s','natural gameplay to gameover unlocks exactly one','all eight threshold success/failure fixtures','duplicate finish guard','reload persistence 1/8 and 8/8','practice/guest/tutorial exclusion','pause/resume','existing save fields preserved'];fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');console.log('Storybook browser QA PASS');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
