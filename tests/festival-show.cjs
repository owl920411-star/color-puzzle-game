const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {createStaticServer}=require('./static-server.cjs');
(async()=>{
 const server=createStaticServer(path.join(__dirname,'..'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const checks=[],errors=[],check=(n,v)=>{assert.equal(v,true,n);checks.push(n);};
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
 await page.clock.install();await page.clock.pauseAt(Date.now()+100);
 check('normal stage has no show or particles',await page.evaluate(()=>{begin();stopClocks();return !FestivalShow.inspect().active&&!FestivalShow.inspect().scheduled&&FestivalShow.inspect().particles===0;}));
 await page.evaluate(()=>{prepareStage(3);begin();stopClocks();});
 check('festival start has fireworks, confetti and welcome banner',await page.evaluate(()=>FestivalShow.inspect().active&&FestivalShow.inspect().particles>60&&document.querySelector('.festival-banner').textContent.includes('FESTIVAL TIME')));
 await page.clock.runFor(2000);
 check('welcome clears while background fireworks continue',await page.evaluate(()=>!document.querySelector('.festival-banner')&&FestivalShow.inspect().scheduled));
 check('effects never capture pointer input',await page.evaluate(()=>getComputedStyle($('festivalCanvas')).pointerEvents==='none'&&getComputedStyle(document.querySelector('.festival-atmosphere')).pointerEvents==='none'));
 check('every merge creates a substantial explosion',await page.evaluate(()=>{const n=FestivalShow.inspect().particles;FestivalShow.burst(board[0].el,1,false);return FestivalShow.inspect().particles>=Math.min(n+55,FestivalShow.inspect().cap);}));
 await page.clock.runFor(400);
 check('high combo schedules layered echoes',await page.evaluate(()=>{FestivalShow.burst(board[0].el,8,true);return FestivalShow.inspect().pending>=4;}));
 check('show never consumes gameplay randomness',await page.evaluate(()=>{const old=Math.random;Math.random=()=>{throw new Error('gameplay RNG consumed');};try{FestivalShow.burst(board[0].el,5,true);FestivalShow.fever();return true;}finally{Math.random=old;}}));
 check('fever gets a separate celebration',await page.evaluate(()=>document.querySelector('.festival-banner').textContent.includes('MEGA FEVER')));
 check('particle count stays bounded under repeated celebrations',await page.evaluate(()=>{for(let i=0;i<100;i++)FestivalShow.fever();return FestivalShow.inspect().particles<=FestivalShow.inspect().cap&&FestivalShow.inspect().pending<=FestivalShow.inspect().queueCap;}));
 check('festival break has eight facets with a small DOM budget',await page.evaluate(()=>{$('effects').replaceChildren();combo=8;particles(board[0].el,'purple',true);return $('effects').querySelectorAll('.fx-shard').length===8&&$('effects').childElementCount<=16;}));
 check('canvas budget is reduced for mobile',await page.evaluate(()=>FestivalShow.inspect().cap===360&&$('festivalCanvas').width<=Math.ceil($('app').getBoundingClientRect().width*1.25)));
 await page.evaluate(()=>openMenu());const paused=await page.evaluate(()=>FestivalShow.inspect());await page.clock.runFor(3000);
 check('menu pauses show and particle lifetime',await page.evaluate(n=>FestivalShow.inspect().paused&&!FestivalShow.inspect().scheduled&&FestivalShow.inspect().particles===n,paused.particles));
 await page.evaluate(()=>closeMenu());check('resume restarts show',await page.evaluate(()=>FestivalShow.inspect().scheduled&&!FestivalShow.inspect().paused));
 for(const width of [320,390]){
 await page.setViewportSize({width,height:width===320?568:844});await page.evaluate(()=>{prepareStage(3);begin();stopClocks();});await page.clock.runFor(450);
 check('intro does not cover HUD or puzzle '+width,await page.evaluate(()=>document.querySelector('.festival-banner').getBoundingClientRect().bottom<document.querySelector('.status').getBoundingClientRect().top));
 if(process.env.TEST_SCREENSHOTS){require('fs').mkdirSync(process.env.TEST_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'festival-show-'+width+'.png')});}
 }
 await page.evaluate(()=>{total=T.totalGoal;stageClear();});check('clear triggers visible foreground finale',await page.evaluate(()=>FestivalShow.inspect().finale&&Number(getComputedStyle($('festivalCanvas')).zIndex)>Number(getComputedStyle(document.querySelector('.stageClear')).zIndex)));await page.clock.runFor(1000);
 check('next stage removes all show effects and animation work',await page.evaluate(()=>si===4&&!FestivalShow.inspect().active&&!FestivalShow.inspect().scheduled&&FestivalShow.inspect().particles===0&&FestivalShow.inspect().pending===0&&!document.querySelector('.festival-banner')));
 await page.evaluate(()=>{prepareStage(3);begin();stopClocks();finish();});check('timeout also stops the show',await page.evaluate(()=>!FestivalShow.inspect().active&&!FestivalShow.inspect().scheduled));
 const quiet=await browser.newPage({reducedMotion:'reduce'});await quiet.goto('http://127.0.0.1:'+server.address().port);await quiet.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
 check('reduced motion retains static festival without running particles',await quiet.evaluate(()=>{prepareStage(3);begin();stopClocks();triggerBloom();return !FestivalShow.inspect().active&&!FestivalShow.inspect().scheduled&&getComputedStyle($('festivalCanvas')).display==='none'&&$('app').dataset.scene==='festival';}));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,checks,runtimeErrors:errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
