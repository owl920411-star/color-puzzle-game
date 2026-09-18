// Run with Playwright available: node tests/bloom-regression.cjs
// Optional: CHROME_PATH=/path/to/chrome; TEST_SCREENSHOTS=/output/directory
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
const checks=[];
function check(label,value){assert.equal(value,true,label);checks.push(label);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-09-19T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-19T00:00:01Z'));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  await page.evaluate(()=>{
   // Keep a goal unfinished while testing non-target purple chains.
   window.testSetup=()=>{prepareStage(1);begin();stopClocks();};
   window.testPair=(name='purple',a=0,b=1)=>{
    busy.delete(a);busy.delete(b);
    [a,b].forEach((index,j)=>{board[index].k=F[name].need[j];paintBud(board[index].bud,board[index].k);});
    merge(a,b);
   };
   testSetup();
  });
  check('all six recipe orders and only orthogonal merges',await page.evaluate(()=>{
   let ok=true;
   for(const name of Object.keys(F))for(const reverse of [false,true]){
    testSetup();const colors=[...F[name].need];if(reverse)colors.reverse();
    board[0].k=colors[0];board[1].k=colors[1];merge(0,1);ok&&=lastFlower===name&&combo===1;
   }
   testSetup();merge(0,7);return ok&&total===0;
  }));
  check('8 combo triggers once; exact score multiplier; time bonus and cap retained',await page.evaluate(()=>{
   testSetup();time=40;beatAt=Date.now()-500;
   for(let i=0;i<7;i++)testPair();
   const pre=score;testPair();const deadline=bloomUntil;
   const ok=combo===8&&bloomActive()&&score-pre===Math.round(75*BLOOM_SCORE_MULTIPLIER)&&Math.abs(time-41.4)<1e-8;
   testPair();time=T.t+COMBO_TIME_CAP;testPair();
   return ok&&bloomUntil===deadline&&time===T.t+COMBO_TIME_CAP;
  }));
  check('failed / different flower ends chain but preserves active bloom',await page.evaluate(()=>{
   const deadline=bloomUntil;fail(0,1);
   const ok=combo===0&&!bloomTriggered&&bloomUntil===deadline;
   testPair('green');testPair('purple');return ok&&combo===1&&bloomUntil===deadline&&bloomActive();
  }));
  check('new chain can trigger again',await page.evaluate(()=>{
   bloomUntil=performance.now()+1000;
   for(let i=0;i<7;i++)testPair();return combo===8&&bloomUntil===performance.now()+5000;
  }));
  await page.evaluate(()=>openMenu());
  const remaining=await page.evaluate(()=>bloomPausedRemaining);
  await page.clock.runFor(6000);
  check('menu pause preserves bloom and repeated open does not reset pause',await page.evaluate(expected=>{
   openMenu(true);const ok=bloomPausedRemaining===expected;closeMenu();
   return ok&&bloomUntil-performance.now()===expected;
  },remaining));
  await page.clock.runFor(5001);
  check('expiry removes multiplier; same chain cannot retrigger after expiry',await page.evaluate(()=>{
   updateBloom();const ok=!bloomActive()&&!$('boardShell').classList.contains('bloom-mode');
   testPair();return ok&&!bloomActive()&&combo===9;
  }));
  check('PERFECT doubles baseline score before bloom multiplier',await page.evaluate(()=>{
   testSetup();beatAt=Date.now();testPair();return score===90;
  }));
  check('goal completion clears immediately even on bloom trigger',await page.evaluate(()=>{
   prepareStage(0);begin();stopClocks();for(let i=0;i<8;i++)testPair();
   return done()&&clearing&&!run&&!bloomActive()&&!!document.querySelector('.stageClear');
  }));
  check('reset cancels old callbacks and clears bloom',await page.evaluate(()=>{
   testSetup();triggerBloom();begin();stopClocks();return !bloomActive()&&!bloomTriggered&&pending.size===0&&busy.size===0&&combo===0;
  }));
  await page.clock.runFor(1000);
  check('reset board survives previous stage callbacks',await page.evaluate(()=>run&&!clearing&&total===0&&board.every(c=>P.includes(c.k))));
  // Pointer events use the same actual pointer capture path as Android touch.
  await page.evaluate(()=>{testSetup();combo=4;lastFlower='purple';board[0].k='red';board[1].k='red';});
  const rect=await page.locator('.cell').first().boundingBox();
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  const touch=await context.newCDPSession(page);
  async function swipe(dx,dy){
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await swipe(0,0);await swipe(17,12);
  check('tap and subthreshold drift preserve combo',await page.evaluate(()=>combo===4));
  await swipe(22,0);
  check('real wrong-color swipe resets combo',await page.evaluate(()=>combo===0));
  await page.evaluate(()=>{combo=4;lastFlower='purple';});await swipe(-22,0);
  check('outward edge swipe retains existing miss behavior',await page.evaluate(()=>combo===0));
  await page.evaluate(()=>{combo=4;lastFlower='purple';busy.add(1);});await swipe(22,0);
  check('busy destination ignored',await page.evaluate(()=>combo===4));
  check('pair helper excludes duplicates, diagonals, row wrapping, busy and empty cells',await page.evaluate(()=>{
   busy.clear();board.forEach(c=>c.k=null);board[0].k='red';board[1].k='blue';board[6].k='yellow';board[7].k='red';
   let p=adjacentFlowerCounts();let ok=p.purple===2&&p.orange===2&&p.green===0;
   busy.add(0);p=adjacentFlowerCounts();ok&&=p.purple===1&&p.orange===1;
   busy.clear();board.forEach(c=>c.k=null);board[5].k='red';board[6].k='blue';
   return ok&&Object.values(adjacentFlowerCounts()).every(n=>n===0);
  }));
  check('seeded spawn keeps all colors and weakly favors scarce adjacent goal pairs',await page.evaluate(()=>{
   testSetup();board.forEach(c=>c.k='yellow');board[1].k='red';lastFlower='purple';combo=3;
   const original=Math.random;let seed=2341;
   const sample=mode=>{
    const result={red:0,blue:0,yellow:0};let call=0;
    Math.random=()=>{if(call++%2===0)return mode;seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<6000;i++)result[spawn(0)]++;return result;
   };
   try{
    T={g:{purple:100},t:60,a:.25};const natural=sample(.8),goal=sample(.1),chain=sample(.25);
    return Object.values(natural).every(n=>n>1800&&n<2200)&&goal.blue>natural.blue&&chain.blue>natural.blue&&
     [goal,chain].every(c=>Object.values(c).every(n=>n>500));
   }finally{Math.random=original;T=ST[si];}
  }));
  check('time over cleans bloom and opens results',await page.evaluate(()=>{
   testSetup();triggerBloom();finish();return !run&&!bloomActive()&&!$('end').classList.contains('hide');
  }));
  await page.evaluate(()=>{testSetup();begin();devPaused=true;triggerBloom();});
  await page.clock.runFor(5001);
  check('real timer expires bloom even with developer timer pause',await page.evaluate(()=>!bloomActive()&&!$('boardShell').classList.contains('bloom-mode')&&time===T.t));
  await page.evaluate(()=>{begin();triggerBloom();openMenu();});
  await page.clock.runFor(6000);
  check('real timer and bloom both pause in menu',await page.evaluate(()=>time===T.t&&bloomActive()));
  await page.evaluate(()=>closeMenu());await page.clock.runFor(1000);
  check('real timer resumes and developer controls remain functional',await page.evaluate(()=>{
   const ok=time<T.t&&bloomActive();$('devTimePlus').click();$('devGoalPlus').click();$('devGoalMinus').click();
   $('devNext').click();return ok&&si===2&&!run&&!bloomActive()&&$('start').classList.contains('hide')===false;
  }));
  await page.evaluate(()=>{testSetup();for(let i=0;i<8;i++)testPair('purple',i*2,i*2+1);});
  await page.clock.runFor(120);
  for(const size of [{width:320,height:568},{width:360,height:740},{width:412,height:915}]){
   await page.setViewportSize(size);await page.evaluate(()=>fitBoard());
   check('mobile layout '+size.width+'x'+size.height,await page.evaluate(()=>{
    const grid=$('grid').getBoundingClientRect(),badge=$('bloomBadge').getBoundingClientRect();
    const comboFx=document.querySelector('.comboFx').getBoundingClientRect();
    const float=document.querySelector('.float').getBoundingClientRect();
    const footer=document.querySelector('.footer').getBoundingClientRect();
    return grid.left>=0&&grid.right<=innerWidth&&comboFx.bottom<grid.top&&badge.top>grid.bottom&&float.top>grid.bottom&&float.bottom<badge.top&&footer.bottom<=innerHeight;
   }));
   if(process.env.TEST_SCREENSHOTS){fs.mkdirSync(process.env.TEST_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'bloom-'+size.width+'.png')});}
  }
  await page.clock.runFor(1500);
  check('transient effects clean up',await page.evaluate(()=>$('effects').childElementCount===0&&busy.size===0));
  await context.close();
  const reduced=await browser.newContext({viewport:{width:360,height:740},reducedMotion:'reduce'});
  const quiet=await reduced.newPage();quiet.on('pageerror',e=>errors.push(e.message));
  await quiet.goto('http://127.0.0.1:'+server.address().port);
  check('reduced motion disables particles, pulses, vibration and bloom zoom',await quiet.evaluate(()=>{
   let vibration=0;navigator.vibrate=()=>{vibration++;};prepareStage(1);begin();stopClocks();
   combo=7;lastFlower='purple';board[0].k='red';board[1].k='blue';merge(0,1);
   return bloomActive()&&!document.querySelector('.petal,.spark,.board-wave')&&vibration===0&&
    getComputedStyle(board[1].bud).animationName==='none'&&getComputedStyle(document.querySelector('.board-aura')).animationName==='none';
  }));
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log(JSON.stringify({passed:checks.length,checks,runtimeErrors:errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
