// Run after tests/bloom-regression.cjs with the same Playwright/CHROME_PATH setup.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const {createStaticServer}=require('./static-server.cjs');
const server=createStaticServer(path.join(__dirname,'..'));
const passed=[];
function check(name,value){assert.equal(value,true,name);passed.push(name);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.clock.install({time:new Date('2026-09-19T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-19T00:00:01Z'));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  await page.evaluate(()=>{
   window.setup=(index=1)=>{prepareStage(index);begin();stopClocks();board.forEach(c=>{c.k='red';paintBud(c.bud,'red');});board[1].k='blue';paintBud(board[1].bud,'blue');};
   window.attach=()=>{const random=Math.random;Math.random=()=>0;try{return spawnButterfly();}finally{Math.random=random;}};
   window.pair=name=>{busy.clear();[0,1].forEach((i,j)=>{board[i].k=F[name].need[j];paintBud(board[i].bud,board[i].k);});merge(0,1);};
  });
  check('first arrival scheduled within 6–10 seconds, no initial attachment',await page.evaluate(()=>{
   setup();const delay=butterflyNextAt-performance.now();return !butterfly&&delay>=6000&&delay<=10000;
  }));
  await page.clock.runFor(10001);
  check('idle board waits for two blooms',await page.evaluate(()=>{updateButterfly();return !butterfly&&butterflyNextAt>performance.now();}));
  await page.evaluate(()=>{total=2;});await page.clock.runFor(1001);
  check('natural arrival selects a currently playable destination',await page.evaluate(()=>{
   updateButterfly();return butterfly&&neighbors(butterfly.index).some(j=>!busy.has(j)&&P.includes(board[j].k)&&board[j].k!==butterfly.color)&&document.querySelectorAll('.butterfly-mark').length===1;
  }));
  check('one butterfly maximum and seven-second lifespan',await page.evaluate(()=>{
   const first=butterfly;return !spawnButterfly()&&butterfly===first&&butterfly.until-performance.now()===7000;
  }));
  await page.clock.runFor(5501);
  check('subtle departure cue without countdown',await page.evaluate(()=>{
   updateButterfly();return butterfly.el.classList.contains('butterfly-leaving')&&!/\d.*초/.test($('butterflyHint').textContent);
  }));
  await page.clock.runFor(1500);
  check('expiry removes marker and schedules next visit in 8–14 seconds',await page.evaluate(()=>{
   updateButterfly();const delay=butterflyNextAt-performance.now();return !butterfly&&!document.querySelector('.butterfly-mark,.butterfly-target')&&delay>=8000&&delay<=14000;
  }));
  check('no candidate leaves board unchanged and retries later',await page.evaluate(()=>{
   setup();board.forEach(c=>c.k='red');const before=board.map(c=>c.k).join();
   return !spawnButterfly()&&!butterfly&&butterflyNextAt-performance.now()===1000&&before===board.map(c=>c.k).join();
  }));
  check('busy and held cells excluded from candidates',await page.evaluate(()=>{
   setup();busy.add(1);const none=!spawnButterfly();busy.clear();startPointer={index:0};attach();
   return none&&butterfly.index!==0;
  }));
  check('destination capture doubles score once and adds no time',await page.evaluate(()=>{
   setup();attach();beatAt=Date.now()-500;const initialTime=time;merge(1,0);
   return score===90&&total===1&&combo===1&&time===initialTime&&!butterfly&&!document.querySelector('.butterfly-mark')&&$('butterflyHint').textContent.includes('BONUS ×2');
  }));
  check('source consumes attachment with no bonus',await page.evaluate(()=>{
   setup();attach();beatAt=Date.now()-500;merge(0,1);
   return score===45&&total===1&&!butterfly&&butterflyNextAt>performance.now()&&!$('butterflyHint').textContent.includes('BONUS');
  }));
  check('PERFECT + 8 combo + BLOOM + butterfly use original rounding then ×2',await page.evaluate(()=>{
   setup();attach();combo=7;lastFlower='purple';beatAt=Date.now();time=40;merge(1,0);
   // Non-target: round(45*2*1.7 / 5)*5 = 155; round(155*1.5)=233; 233*2=466.
   return score===466&&combo===8&&bloomActive()&&time===40.2&&total===1&&!butterfly;
  }));
  check('wrong color preserves butterfly but resets combo',await page.evaluate(()=>{
   setup();attach();combo=4;lastFlower='purple';merge(6,0);
   return butterfly?.index===0&&combo===0&&score===0;
  }));
  check('expired destination cannot grant stale bonus before next timer tick',await page.evaluate(()=>{
   setup();attach();butterfly.until=performance.now();beatAt=Date.now()-500;merge(1,0);return score===45&&!butterfly;
  }));
  check('spawn and repaint invalidate attachment even for same color',await page.evaluate(()=>{
   setup();attach();spawn(0);const ok=!butterfly&&!document.querySelector('.butterfly-mark');
   attach();paintBud(board[0].bud,'red');return ok&&!butterfly&&!document.querySelector('.butterfly-target');
  }));
  check('generation mismatch invalidates stale state',await page.evaluate(()=>{
   setup();attach();generation++;updateButterfly();return !butterfly&&!document.querySelector('.butterfly-mark');
  }));
  await page.evaluate(()=>{setup();attach();openMenu();});
  const left=await page.evaluate(()=>butterfly.until-butterflyPausedAt);
  await page.clock.runFor(15000);
  check('menu preserves current butterfly and its remaining lifetime',await page.evaluate(expected=>{
   openMenu(true);closeMenu();updateButterfly();return butterfly.until-performance.now()===expected&&document.querySelectorAll('.butterfly-mark').length===1;
  },left));
  await page.evaluate(()=>{setup();openMenu();});
  const wait=await page.evaluate(()=>butterflyNextAt-butterflyPausedAt);
  await page.clock.runFor(15000);
  check('menu preserves pending arrival delay',await page.evaluate(expected=>{closeMenu();return butterflyNextAt-performance.now()===expected;},wait));
  for(const action of ['begin()','prepareStage(2)','finish()','cancelBoardWork()','build()']){
   check('attachment cleanup: '+action,await page.evaluate(action=>{
    setup();attach();window.eval(action);return !butterfly&&!document.querySelector('.butterfly-mark,.butterfly-target,.butterfly-flight')&&!$('app').classList.contains('has-butterfly-hint');
   },action));
  }
  check('clear cleans butterfly and blocks further input immediately',await page.evaluate(()=>{
   setup(0);attach();goals.purple=7;merge(1,0);const before=total;merge(2,3);
   return clearing&&!run&&!butterfly&&butterflyNextAt===0&&total===before;
  }));
  await page.clock.runFor(851);
  check('next normal stage has clean state and start overlay',await page.evaluate(()=>si===1&&!run&&!butterfly&&total===0&&!$('start').classList.contains('hide')));
  check('existing five normal stage goals and times preserved; festival is fourth',await page.evaluate(()=>{
   const normal=ST.slice(0,6).filter(s=>s.type==='normal');
   return JSON.stringify(normal.map(s=>({g:s.g,t:s.t,a:s.a})))===JSON.stringify([
    {g:{purple:8},t:60,a:.28},{g:{orange:10},t:60,a:.25},{g:{green:12},t:60,a:.23},{g:{purple:8,green:6},t:55,a:.20},{g:{purple:7,orange:7,green:7},t:55,a:.16}
   ])&&ST.length>=6&&ST[3].type==='festival';
  }));
  check('festival opens through developer button with clear total goal',await page.evaluate(()=>{
   $('devFestival').click();return si===3&&!run&&!done()&&$('sStage').textContent.includes('SPECIAL')&&$('startTitle').textContent==='농장 대축제'&&$('sGoal').textContent.includes('25개')&&time===45;
  }));
  check('mixed flowers count once each toward festival total',await page.evaluate(()=>{
   setup(3);['purple','orange','green'].forEach(pair);
   return total===3&&Object.values(goals).reduce((a,b)=>a+b,0)===3&&!done()&&$('progress').textContent==='수확 3 / 25';
  }));
  check('festival bloom retains 8 / 5 / 1.5 and same time bonus',await page.evaluate(()=>{
   setup(3);time=30;for(let i=0;i<8;i++)pair('purple');
   return combo===8&&bloomUntil-performance.now()===5000&&BLOOM_SCORE_MULTIPLIER===1.5&&Math.abs(time-31.4)<1e-8;
  }));
  check('festival butterfly stacks and advances total by one',await page.evaluate(()=>{
   setup(3);attach();combo=7;lastFlower='purple';beatAt=Date.now();merge(1,0);
   return score===1020&&total===1&&goals.purple===1&&bloomActive()&&!butterfly;
  }));
  check('festival reaches exactly 25 and clears immediately',await page.evaluate(()=>{
   setup(3);for(let i=0;i<24;i++)pair(['purple','orange','green'][i%3]);
   const before=run&&!done()&&total===24;pair('green');return before&&total===25&&done()&&clearing&&!run&&time>0;
  }));
  await page.clock.runFor(851);
  check('festival advances to original fourth normal stage',await page.evaluate(()=>si===4&&T.type==='normal'&&T.g.purple===8&&T.g.green===6&&total===0&&!butterfly));
  check('festival developer goal controls and near-goal shortcut work',await page.evaluate(()=>{
   setup(3);$('devGoalPlus').click();const plus=T.totalGoal===26;$('devGoalMinus').click();$('devComplete').click();
   const almost=total===24&&!done();pair('purple');return plus&&almost&&clearing&&T.totalGoal===25;
  }));
  check('normal spawn tuning unchanged; festival remains weighted, never guaranteed',await page.evaluate(()=>{
   setup(3);lastFlower='purple';combo=4;
   board.forEach(c=>c.k='yellow');board[1].k='red';
   let seed=923,call=0;const random=Math.random,counts={red:0,blue:0,yellow:0};
   try{
    Math.random=()=>{if(call++%2===0)return .3;seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<5000;i++)counts[spawn(0)]++;
   }finally{Math.random=random;}
   return RANDOM_BALANCE.goalRate===.2&&RANDOM_BALANCE.chainRate===.1&&FESTIVAL_SPAWN_TUNING.chainRate===.25&&Object.values(counts).every(n=>n>400);
  }));
  // Exercise Android's touch -> pointer event path with the butterfly present.
  await page.evaluate(()=>{setup();attach();combo=4;lastFlower='purple';});
  const touch=await context.newCDPSession(page),box=await page.locator('.cell').nth(0).boundingBox();
  const x=box.x+box.width/2,y=box.y+box.height/2;
  async function swipe(sx,sy,dx,dy){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+dx,y:sy+dy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  await swipe(x,y,0,0);await swipe(x,y,17,5);
  check('short touch preserves combo and butterfly',await page.evaluate(()=>combo===4&&butterfly?.index===0));
  const source=await page.locator('.cell').nth(1).boundingBox();
  await swipe(source.x+source.width/2,source.y+source.height/2,-22,0);
  check('real touch toward butterfly collects without blocking play',await page.evaluate(()=>total===1&&combo===5&&!butterfly&&run&&!menuPaused));
  await page.evaluate(()=>{setup(3);begin();total=2;});await page.clock.runFor(10001);
  check('real game interval creates butterfly during play',await page.evaluate(()=>Boolean(butterfly)));
  await page.evaluate(()=>time=.05);await page.clock.runFor(101);
  check('real timeout removes butterfly and opens results',await page.evaluate(()=>!run&&!butterfly&&butterflyNextAt===0&&!$('end').classList.contains('hide')));
  if(process.env.TEST_SCREENSHOTS)fs.mkdirSync(process.env.TEST_SCREENSHOTS,{recursive:true});
  for(const size of [{width:320,height:568},{width:360,height:740},{width:412,height:915}]){
   await page.setViewportSize(size);
   await page.evaluate(()=>{prepareStage(3);fitBoard();});
   if(process.env.TEST_SCREENSHOTS)await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'festival-start-'+size.width+'.png')});
   await page.evaluate(()=>{setup(3);attach();combo=7;lastFlower='purple';merge(1,0);fitBoard();});
   await page.clock.runFor(100);
   check('festival + butterfly + bloom layout '+size.width,await page.evaluate(()=>{
    const grid=$('grid').getBoundingClientRect(),hint=$('butterflyHint').getBoundingClientRect(),badge=$('bloomBadge').getBoundingClientRect(),fx=document.querySelector('.comboFx').getBoundingClientRect();
    return fx.bottom<grid.top&&badge.top>grid.bottom&&hint.top>badge.bottom&&hint.left>=0&&hint.right<=innerWidth&&$('butterflyHint').scrollWidth<=$('butterflyHint').clientWidth&&$('mission').scrollWidth<=$('mission').clientWidth;
   }));
   if(process.env.TEST_SCREENSHOTS)await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'festival-bonus-'+size.width+'.png')});
  }
  await page.evaluate(()=>{setup(3);attach();fitBoard();});
  if(process.env.TEST_SCREENSHOTS)await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'butterfly-target.png')});
  const quiet=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'});
  quiet.on('pageerror',e=>errors.push(e.message));await quiet.goto('http://127.0.0.1:'+server.address().port);
  check('reduced motion keeps marker and text, suppresses flight and haptic',await quiet.evaluate(()=>{
   prepareStage(3);begin();stopClocks();board.forEach(c=>c.k='red');board[1].k='blue';
   const random=Math.random;Math.random=()=>0;spawnButterfly();Math.random=random;
   const marker=!!document.querySelector('.butterfly-mark');let vibration=0;navigator.vibrate=()=>vibration++;
   merge(1,0);return marker&&!document.querySelector('.butterfly-flight')&&vibration===0&&$('butterflyHint').textContent.includes('BONUS');
  }));
  assert.deepEqual(errors,[],'runtime/console errors');
  console.log(JSON.stringify({passed:passed.length,checks:passed,runtimeErrors:errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
