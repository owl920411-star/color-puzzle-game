// node tests/garden.cjs (Playwright); optional CHROME_PATH and TEST_SCREENSHOTS.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
const checks=[];
function check(label,value){assert.equal(value,true,label);checks.push(label);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const url='http://127.0.0.1:'+server.address().port;
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  check('new garden offers three starter flowers and four usable plots',await page.evaluate(()=>garden.capacity===4&&garden.sun===0&&Object.values(garden.flowers).every(n=>n===1)));
  await page.locator('#start [data-open-garden]').click();
  check('garden opens before playing, pauses and isolates puzzle controls',await page.evaluate(()=>gardenOpen&&menuPaused&&!run&&$('start').inert&&document.activeElement===$('gardenClose')));
  await page.locator('[data-plot="0"]').click();
  check('planting consumes one flower',await page.evaluate(()=>garden.plots[0]==='purple'&&garden.flowers.purple===0));
  await page.locator('[data-plot="1"]').click();
  check('empty stock cannot plant another flower',await page.evaluate(()=>garden.plots[1]===null&&garden.flowers.purple===0));
  await page.locator('[data-seed="orange"]').click();await page.locator('[data-plot="1"]').click();
  await page.locator('[data-seed="green"]').click();await page.locator('[data-plot="2"]').click();
  check('three flower colors attract garden butterflies',await page.evaluate(()=>!$('gardenButterflies').classList.contains('hide')));
  await page.locator('#gardenMove').click();await page.locator('[data-plot="0"]').click();await page.locator('[data-plot="1"]').click();
  check('moving onto a flower swaps positions without changing stock',await page.evaluate(()=>garden.plots[0]==='orange'&&garden.plots[1]==='purple'&&Object.values(garden.flowers).every(n=>n===0)));
  await page.locator('[data-plot="1"]').click();await page.locator('[data-plot="3"]').click();
  check('moving onto an empty plot preserves the flower',await page.evaluate(()=>garden.plots[1]===null&&garden.plots[3]==='purple'));
  await page.locator('#gardenRemove').click();await page.locator('[data-plot="3"]').click();
  check('returning a flower refunds it and removes butterflies when a color is absent',await page.evaluate(()=>garden.flowers.purple===1&&garden.plots[3]===null&&$('gardenButterflies').classList.contains('hide')));
  await page.locator('[data-seed="purple"]').click();await page.locator('[data-plot="0"]').click();
  check('replacing a flower refunds the original',await page.evaluate(()=>garden.plots[0]==='purple'&&garden.flowers.orange===1&&garden.flowers.purple===0));
  check('locked expansion and unaffordable decorations spend nothing',await page.evaluate(()=>{expandGarden();decorateGarden('fountain');editGardenPlot(8);return garden.capacity===4&&garden.sun===0&&garden.decor.length===0&&garden.plots[8]===null;}));
  const saved=await page.evaluate(()=>JSON.stringify(garden));await page.reload();
  await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  check('garden layout and inventory survive reload',await page.evaluate(expected=>JSON.stringify(garden)===expected,saved));
  await page.evaluate(()=>{
   window.gardenPair=name=>{busy.clear();board[0].k=F[name].need[0];board[1].k=F[name].need[1];merge(0,1);};
   prepareStage(1);begin();stopClocks();
  });
  check('only successful merges collect flowers; score and combo still work',await page.evaluate(()=>{
   const before=garden.flowers.purple;board[0].k=board[1].k='red';merge(0,1);const invalid=garden.flowers.purple===before;
   gardenPair('purple');return invalid&&garden.flowers.purple===before+1&&garden.earned.purple===1&&score>0&&combo===1;
  }));
  await page.evaluate(()=>{finish();});
  check('failure retains earned flowers and shows the garden entry',await page.evaluate(()=>garden.earned.purple===1&&!$('end').classList.contains('hide')&&!!$('end').querySelector('[data-open-garden]')&&garden.sun===0));
  await page.evaluate(()=>{prepareStage(0);begin();stopClocks();for(let i=0;i<8;i++)gardenPair('purple');});
  check('real clear awards 20 sunlight, eight flowers, and next stage exactly once',await page.evaluate(()=>{
   stageClear();return clearing&&garden.sun===20&&garden.cleared.length===1&&garden.nextStage===1&&garden.earned.purple===9;
  }));
  await page.clock.runFor(851);
  check('automatic stage transition preserves garden reward announcement',await page.evaluate(()=>si===1&&!run&&$('gardenReward').textContent.includes('+20')));
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  check('reload resumes the unlocked next stage',await page.evaluate(()=>si===1&&garden.sun===20&&garden.earned.purple===9));
  await page.evaluate(()=>{prepareStage(0);begin();stopClocks();goals.purple=8;stageClear();stageClear();});
  check('repeat clear awards 10 sunlight without repeating first-clear bonus',await page.evaluate(()=>garden.sun===30&&garden.cleared.length===1));
  await page.clock.runFor(851);await page.locator('#start [data-open-garden]').click();
  await page.locator('#gardenExpand').click();
  check('first expansion spends exactly 30 sunlight for four more plots',await page.evaluate(()=>garden.capacity===8&&garden.sun===0&&garden.plots[0]==='purple'&&garden.plots[2]==='green'));
  await page.evaluate(()=>{garden.sun=135;saveGarden();renderGarden();});
  await page.locator('#gardenExpand').click();
  check('final expansion costs 60 and cannot exceed 12 plots',await page.evaluate(()=>{expandGarden();return garden.capacity===12&&garden.sun===75&&$('gardenExpand').disabled;}));
  await page.locator('[data-decor="bench"]').click();await page.locator('[data-decor="fountain"]').click();await page.locator('[data-decor="lantern"]').click();
  check('decorations cost 15, 25 and 35 sunlight and appear in the garden',await page.evaluate(()=>garden.sun===0&&garden.decor.length===3&&garden.visibleDecor.length===3&&!$('gardenFountain').classList.contains('hide')));
  await page.locator('[data-decor="bench"]').click();await page.locator('[data-decor="bench"]').click();
  check('owned decorations can be toggled without paying again',await page.evaluate(()=>garden.sun===0&&garden.decor.length===3&&garden.visibleDecor.includes('bench')));
  for(const viewport of [{width:320,height:568},{width:360,height:740},{width:412,height:915},{width:844,height:390}]){
   await page.setViewportSize(viewport);
   check('garden fits '+viewport.width+'×'+viewport.height+' and scrolls to its return button',await page.evaluate(()=>{
    const view=$('gardenView');view.scrollTop=view.scrollHeight;
    const r=$('gardenPlay').getBoundingClientRect(),v=view.getBoundingClientRect();
    return view.scrollWidth<=view.clientWidth+1&&r.left>=v.left&&r.right<=v.right+1&&r.bottom<=v.bottom+1;
   }));
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{$('gardenView').scrollTop=0;});
  await page.clock.runFor(600);
  if(process.env.TEST_SCREENSHOTS){fs.mkdirSync(process.env.TEST_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'garden-mobile.png')});}
  await page.locator('#gardenClose').click();
  check('closing from the start screen restores focus and stops the puzzle',await page.evaluate(()=>!gardenOpen&&!menuPaused&&!run&&!$('start').inert&&document.activeElement===$('start').querySelector('[data-open-garden]')));
  for(const viewport of [{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.evaluate(()=>prepareStage(14));
   check('start dialog stays inside screen and garden entry is scrollable at '+viewport.width,await page.evaluate(()=>{
    const card=$('start').querySelector('.modal-card');card.scrollTop=card.scrollHeight;
    const bounds=card.getBoundingClientRect(),button=card.querySelector('[data-open-garden]').getBoundingClientRect();
    return bounds.top>=0&&bounds.bottom<=innerHeight&&button.top>=bounds.top&&button.bottom<=bounds.bottom;
   }));
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{begin();time=30;triggerBloom();spawnButterfly();openMenu();});
  const pause=await page.evaluate(()=>({bloom:bloomPausedRemaining,butterfly:butterfly?butterfly.until-performance.now():null}));
  await page.locator('#menu [data-open-garden]').click();await page.clock.runFor(8000);
  check('garden freezes puzzle and bloom time',await page.evaluate(expected=>time===30&&bloomPausedRemaining===expected, pause.bloom));
  await page.keyboard.press('Escape');
  check('escape restores a previously paused menu without resuming play',await page.evaluate(()=>menuPaused&&!gardenOpen&&!$('menu').classList.contains('hide')));
  await page.locator('#resumeBtn').click();
  check('resuming preserves remaining bloom and butterfly lifetimes',await page.evaluate(expected=>
   !menuPaused&&Math.abs(bloomUntil-performance.now()-expected.bloom)<2&&
   (expected.butterfly===null||Math.abs(butterfly.until-performance.now()-expected.butterfly)<2),pause));
  await page.evaluate(()=>openGarden());await page.clock.runFor(2000);await page.locator('#gardenClose').click();
  check('opening directly from active play resumes with unchanged time',await page.evaluate(()=>run&&!menuPaused&&!gardenOpen&&time===30));
  await page.evaluate(()=>{openGarden();garden.flowers.orange=1;gardenTool='orange';Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};editGardenPlot(4);});
  check('storage failures preserve usable in-memory garden and show warning',await page.evaluate(()=>garden.plots[4]==='orange'&&$('gardenSave').classList.contains('error')&&gardenSaveError.length>0));
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  await page.evaluate(()=>localStorage.setItem(GARDEN_KEY,'{"broken":'));
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  check('corrupt save is preserved without crashing or overwriting original data',await page.evaluate(()=>{
   openGarden();editGardenPlot(0);return gardenReadOnly&&gardenSaveError.length>0&&localStorage.getItem(GARDEN_KEY)==='{"broken":';
  }));
  await page.evaluate(()=>localStorage.setItem(GARDEN_KEY,JSON.stringify({version:99,sun:900})));
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  check('future save versions are never overwritten',await page.evaluate(()=>{collectGardenFlower('purple');return gardenReadOnly&&JSON.parse(localStorage.getItem(GARDEN_KEY)).version===99;}));
  check('malformed known-version values are bounded and unknown plot names rejected',await page.evaluate(()=>{
   const value=normalizeGarden({version:1,sun:-1,capacity:999,flowers:{purple:-3,orange:'8',green:1e8},plots:['<img>',null,'purple'],decor:['evil','bench'],visibleDecor:['evil'],cleared:[-1,0,0,500],nextStage:500});
   return value.sun===0&&value.capacity===4&&value.flowers.purple===0&&value.flowers.orange===0&&value.flowers.green===1000000&&value.plots[0]===null&&value.decor.length===1&&value.visibleDecor.length===0&&value.cleared.length===1&&value.nextStage===0;
  }));
  await context.close();
  const reduced=await browser.newContext({reducedMotion:'reduce'}),quiet=await reduced.newPage();
  await quiet.goto(url);await quiet.evaluate(()=>{openGarden();editGardenPlot(0);});
  check('reduced motion disables garden planting and butterfly animation',await quiet.evaluate(()=>getComputedStyle(document.querySelector('.garden-plot img')).animationName==='none'&&getComputedStyle(document.querySelector('.garden-butterflies i')).animationName==='none'));
  await reduced.close();
  check('no browser runtime errors',errors.length===0);
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
