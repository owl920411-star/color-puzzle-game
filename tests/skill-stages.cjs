// Run with Playwright available: node tests/skill-stages.cjs
// Optional: CHROME_PATH=/path/to/chrome; TEST_SCREENSHOTS=/output/directory
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
for(const filename of ['game.js','assets/farm-assets.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),{filename});
const {createStaticServer}=require('./static-server.cjs');
const server=createStaticServer(path.join(__dirname,'..'));
const checks=[];
function check(name,value){assert.equal(value,true,name);checks.push(name);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.clock.install({time:new Date('2026-09-19T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-19T00:00:01Z'));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  await page.evaluate(()=>{
   window.setupSkill=(index=6)=>{prepareStage(index);begin();stopClocks();};
   window.setAllRed=()=>{board.forEach(cell=>{cell.k='red';paintBud(cell.bud,'red');});busy.clear();};
   window.skillPair=(name='purple',a=0,b=1)=>{
    busy.delete(a);busy.delete(b);
    [a,b].forEach((index,j)=>{board[index].k=F[name].need[j];paintBud(board[index].bud,board[index].k);});
    merge(a,b);
   };
   window.pairCount=()=>Object.values(adjacentFlowerCounts()).reduce((a,b)=>a+b,0);
  });
  check('fifteen stages preserve all six previous stage goals, types, times and weights',await page.evaluate(()=>{
   const before=[
    {type:'normal',goalType:'flowers',g:{purple:8},t:60,a:.28},
    {type:'normal',goalType:'flowers',g:{orange:10},t:60,a:.25},
    {type:'normal',goalType:'flowers',g:{green:12},t:60,a:.23},
    {type:'normal',goalType:'total',g:{},t:45,a:.23},
    {type:'normal',goalType:'flowers',g:{purple:8,green:6},t:55,a:.20},
    {type:'normal',goalType:'flowers',g:{purple:7,orange:7,green:7},t:55,a:.16}
   ];
   return ST.length===15&&JSON.stringify(ST.slice(0,6).map(({type,goalType,g,t,a})=>({type,goalType,g,t,a})))===JSON.stringify(before)&&ST[3].totalGoal===25;
  }));
  check('stage metadata and all six random profiles are explicit',await page.evaluate(()=>
   ST.every(s=>['EASY','NORMAL','HARD','EXPERT'].includes(s.difficulty)&&typeof s.randomProfile==='string'&&DIFFICULTY_PROFILES[s.randomProfile]&&s.butterflyEnabled===true)&&
   ['EASY','NORMAL','HARD','EXPERT','PRESSURE','COMBO'].every(name=>DIFFICULTY_PROFILES[name])
  ));
  check('late stages contain asymmetric goals, a relief stage, rush and combo challenge',await page.evaluate(()=>{
   const expected=[
    [6,'HARD',52,{purple:15,green:4},0],
    [7,'HARD',52,{purple:10,orange:5},5],
    [8,'HARD',50,{purple:8,orange:7,green:6},0],
    [9,'HARD',38,{purple:9,orange:9,green:6},0],
    [10,'NORMAL',55,{purple:8,green:8},0],
    [11,'HARD',48,{orange:14,purple:5,green:3},6],
    [12,'EXPERT',50,{purple:8,orange:8,green:8},6],
    [13,'EXPERT',42,{},7],
    [14,'EXPERT',50,{purple:10,orange:10,green:10},7]
   ];
   return expected.every(([index,difficulty,t,g,comboGoal])=>{
    const s=ST[index];return s.difficulty===difficulty&&s.t===t&&(s.comboGoal||0)===comboGoal&&
     Object.keys(g).length===Object.keys(s.g).length&&Object.entries(g).every(([name,amount])=>s.g[name]===amount);
   })&&ST[9].type==='pressure'&&ST[13].type==='challenge'&&ST[13].goalType==='combo';
  }));
  check('first six stages use normal random balance',await page.evaluate(()=>{
   let ok=true;
   for(let i=0;i<6;i++){
    setupSkill(i);const balance=randomBalance();
    ok&&=balance.goalRate===.20&&balance.chainRate===.10;
   }
   return ok&&COMBO_TIME_BONUS===.2&&COMBO_TIME_CAP===8&&BLOOM_TRIGGER===8&&BLOOM_DURATION===5&&BLOOM_SCORE_MULTIPLIER===1.5;
  }));
  check('expert keeps controlled support while pressure and challenge offer more opportunity',await page.evaluate(()=>{
   const balance=index=>{setupSkill(index);return randomBalance();};
   const normal=balance(5),hard=balance(6),expert=balance(14),rush=balance(9),challenge=balance(13);
   return hard.goalRate+hard.chainRate<=normal.goalRate+normal.chainRate&&
    expert.goalRate+expert.chainRate<=hard.goalRate+hard.chainRate&&expert.goalRate>0&&expert.chainRate>0&&
    rush.goalRate+rush.chainRate>hard.goalRate+hard.chainRate&&challenge.chainRate>expert.chainRate;
  }));
  check('all profiles keep every primary color possible in a seeded sample',await page.evaluate(()=>{
   const random=Math.random;let seed=911733,ok=true;
   Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
   try{
    for(const profile of ['EASY','NORMAL','HARD','EXPERT','PRESSURE','COMBO']){
     setupSkill(14);const saved=T.randomProfile;T.randomProfile=profile;
     try{
      setAllRed();lastFlower='purple';combo=4;
      const draws={red:0,blue:0,yellow:0};
      for(let i=0;i<1200;i++)draws[spawn(0)]++;
      ok&&=P.every(color=>draws[color]>100);
     }finally{T.randomProfile=saved;}
    }
   }finally{Math.random=random;}
   return ok;
  }));
  check('combo mission starts incomplete and remains separate from current combo display',await page.evaluate(()=>{
   setupSkill(7);return !done()&&!flowerGoalDone()&&!$('comboGoal').classList.contains('hide')&&
    $('comboGoal').textContent.includes('5')&&$('combo').textContent.includes('0');
  }));
  check('a reached combo goal remains complete after switching flower and after a failed swipe',await page.evaluate(()=>{
   setupSkill(7);for(let i=0;i<5;i++)skillPair('purple');
   skillPair('green',2,3);const afterSwitch=maxCombo===5&&combo===1&&!done();
   board[4].k=board[5].k='red';merge(4,5);ui();
   return afterSwitch&&maxCombo===5&&combo===0&&!done()&&/5\s*\/\s*5/.test($('comboGoal').textContent);
  }));
  check('flower counts alone cannot clear a stage with an unfinished combo goal',await page.evaluate(()=>{
   setupSkill(7);goals.purple=10;goals.orange=5;maxCombo=4;ui();
   return flowerGoalDone()&&!done()&&run&&!clearing;
  }));
  check('combo alone cannot clear a combined mission',await page.evaluate(()=>{
   setupSkill(7);maxCombo=5;ui();return !flowerGoalDone()&&!done()&&run;
  }));
  check('last required combo clears combined goals immediately without waiting for timer',await page.evaluate(()=>{
   setupSkill(7);goals.purple=10;goals.orange=5;combo=maxCombo=4;lastFlower='purple';
   const before=time;skillPair('purple');const count=total;merge(2,3);
   return done()&&maxCombo===5&&clearing&&!run&&time>=before&&total===count;
  }));
  await page.clock.runFor(851);
  check('combined mission advances to the next stage with clean goals',await page.evaluate(()=>
   si===8&&!run&&!clearing&&combo===0&&maxCombo===0&&total===0&&!butterfly&&!$('start').classList.contains('hide')
  ));
  check('last required flower clears after previously completing combo',await page.evaluate(()=>{
   setupSkill(7);goals.purple=9;goals.orange=5;maxCombo=5;combo=0;
   skillPair('purple');return done()&&clearing&&!run&&maxCombo===5&&goals.purple===10;
  }));
  check('combo challenge does not auto-clear from its empty flower goal list',await page.evaluate(()=>{
   setupSkill(13);skillPair('purple');skillPair('green');
   return T.goalType==='combo'&&total===2&&maxCombo===1&&!done()&&run&&!clearing;
  }));
  check('combo challenge requires one continuous same-flower chain',await page.evaluate(()=>{
   setupSkill(13);for(let i=0;i<6;i++)skillPair('orange');const almost=run&&!done()&&maxCombo===6;
   skillPair('orange');return almost&&done()&&maxCombo===7&&total===7&&clearing&&!run;
  }));
  await page.clock.runFor(851);
  check('challenge advances to final expert; retry resets its achieved combo',await page.evaluate(()=>{
   const next=si===14&&!run&&!done();begin();stopClocks();maxCombo=7;combo=6;begin();stopClocks();
   return next&&si===14&&maxCombo===0&&combo===0&&total===0&&!done()&&run;
  }));
  check('normal stages hide combo mission; stage four counts all flowers',await page.evaluate(()=>{
   setupSkill(0);const normal=$('comboGoal').classList.contains('hide');
   setupSkill(3);['purple','orange','green'].forEach(name=>skillPair(name));
   return normal&&$('comboGoal').classList.contains('hide')&&total===3&&!done()&&$('progress').textContent.includes('3 / 25');
  }));
  check('rush is a multi-flower mission with 38 seconds and no mandatory butterfly',await page.evaluate(()=>{
   setupSkill(9);const before=time===38&&entries().length===3&&!done();
   goals={purple:9,orange:9,green:5};skillPair('green');
   return before&&done()&&clearing&&!run;
  }));
  check('expert PERFECT + combo + BLOOM + butterfly use original point order and only combo time bonus',await page.evaluate(()=>{
   setupSkill(14);setAllRed();board[1].k='blue';paintBud(board[1].bud,'blue');
   const random=Math.random;Math.random=()=>0;try{spawnButterfly();}finally{Math.random=random;}
   combo=maxCombo=7;lastFlower='purple';time=35;beatAt=Date.now();merge(1,0);
   return score===1020&&combo===8&&maxCombo===8&&bloomActive()&&!butterfly&&time===35.2&&total===1&&!done();
  }));
  check('stage butterfly switch disables arrivals without changing the flower rules',await page.evaluate(()=>{
   setupSkill(14);const stage=T,enabled=stage.butterflyEnabled;stage.butterflyEnabled=false;
   try{
    begin();stopClocks();const disabled=!butterflyNextAt&&!spawnButterfly();skillPair('green');
    return disabled&&!butterfly&&total===1&&goals.green===1&&combo===1;
   }finally{stage.butterflyEnabled=enabled;}
  }));
  check('BLOOM and achieved combo survive a switch; no same-chain repeated trigger',await page.evaluate(()=>{
   setupSkill(14);for(let i=0;i<8;i++)skillPair('purple');const until=bloomUntil;
   skillPair('purple');const unchanged=bloomUntil===until;skillPair('orange');
   return unchanged&&combo===1&&maxCombo===9&&bloomActive()&&bloomUntil===until&&!done();
  }));
  check('dead board repair changes exactly one bud and preserves all earned progress',await page.evaluate(()=>{
   setupSkill(14);setAllRed();combo=5;maxCombo=7;lastFlower='purple';score=1234;time=31.2;total=8;goals={purple:5,orange:2,green:1};
   const before=JSON.stringify({combo,maxCombo,lastFlower,score,time,total,goals});
   const empty=pairCount()===0;recoverDeadBoard();
   return empty&&board.filter(cell=>cell.k!=='red').length===1&&pairCount()>0&&
    board.every(cell=>cell.bud.dataset.color===cell.k)&&before===JSON.stringify({combo,maxCombo,lastFlower,score,time,total,goals});
  }));
  check('recovery is idempotent on a playable board',await page.evaluate(()=>{
   const before=board.map(cell=>cell.k).join();recoverDeadBoard();recoverDeadBoard();return board.map(cell=>cell.k).join()===before;
  }));
  for(const [name,block] of [
   ['paused','menuPaused=true'],['not running','run=false'],['clearing','clearing=true'],
   ['refill busy','busy.add(0)'],['pointer held','startPointer={index:0}'],['refill incomplete','board[35].k=null']
  ]){
   check('dead board repair waits while '+name,await page.evaluate(block=>{
    setupSkill(14);setAllRed();window.eval(block);const before=board.map(cell=>cell.k).join();
    recoverDeadBoard();return board.map(cell=>cell.k).join()===before;
   },block));
  }
  check('dead board repair keeps or cleans butterfly according to the repaired cell',await page.evaluate(()=>{
   setupSkill(14);setAllRed();board[1].k='blue';paintBud(board[1].bud,'blue');
   const random=Math.random;Math.random=()=>0;try{spawnButterfly();}finally{Math.random=random;}
   const attached=butterfly,at=attached.index;board[1].k='red';paintBud(board[1].bud,'red');
   recoverDeadBoard();const changed=board.findIndex(cell=>cell.k!=='red');
   return pairCount()>0&&(changed===at?!butterfly&&!document.querySelector('.butterfly-mark'):
    butterfly===attached&&butterfly.mark.isConnected&&document.querySelectorAll('.butterfly-mark').length===1);
  }));
  check('a recovered pair is immediately swipeable and continues the same flower combo',await page.evaluate(()=>{
   setupSkill(14);setAllRed();recoverDeadBoard();
   const a=board.findIndex((cell,i)=>neighbors(i).some(j=>M[[cell.k,board[j].k].sort().join(',')]));
   const b=neighbors(a).find(j=>M[[board[a].k,board[j].k].sort().join(',')]);
   const name=M[[board[a].k,board[b].k].sort().join(',')];combo=maxCombo=3;lastFlower=name;
   merge(a,b);return combo===4&&maxCombo===4&&total===1&&goals[name]===1;
  }));
  await page.evaluate(()=>{setupSkill(14);begin();setAllRed();});
  await page.clock.runFor(101);
  check('live game loop repairs an actual dead board without player input',await page.evaluate(()=>pairCount()>0&&combo===0&&total===0&&run));
  check('remaining goal text identifies a missing flower and earned max combo',await page.evaluate(()=>{
   setupSkill(14);goals={purple:9,orange:10,green:10};combo=0;maxCombo=7;
   const missing=remainingGoalText(),progress=goalText();
   return missing.includes('포도')&&missing.includes('1')&&progress.includes('9/10')&&/7\s*\/\s*7/.test(progress);
  }));
  check('near miss result explains one flower short and shows max combo achievement',await page.evaluate(()=>{
   finish();const text=$('end').textContent;
   return !$('end').classList.contains('hide')&&text.includes('1개')&&text.includes('9/10')&&/7\s*\/\s*7/.test(text)&&!run;
  }));
  check('near miss combo result distinguishes six reached from seven required',await page.evaluate(()=>{
   setupSkill(13);combo=0;maxCombo=6;finish();const text=$('end').textContent;
   return /6\s*\/\s*7/.test(text)&&/콤보|COMBO/i.test(text)&&!$('end').classList.contains('hide')&&!done();
  }));
  await page.evaluate(()=>{
   prepareStage(14);begin();goals={purple:9,orange:10,green:10};maxCombo=7;time=.05;spawnButterfly();
  });
  await page.clock.runFor(101);
  check('expert real timeout cleans butterfly and exposes unfinished goals for retry',await page.evaluate(()=>
   !run&&!butterfly&&!butterflyNextAt&&!$('end').classList.contains('hide')&&$('end').textContent.includes('9/10')&&
   /7\s*\/\s*7/.test($('end').textContent)&&!$('retry').classList.contains('hide')
  ));
  check('developer direct jump selects the requested stage and opens its goal screen',await page.evaluate(()=>{
   $('devStageInput').value='12';$('devStageGo').click();
   return si===11&&!run&&!$('start').classList.contains('hide')&&$('sGoal').textContent.includes('14')&&/6\s*COMBO|COMBO\s*6/i.test($('start').textContent);
  }));
  for(const [button,expect] of [['devHard','HARD'],['devExpert','EXPERT'],['devRush','pressure'],['devChallenge','challenge']]){
   check('developer shortcut '+button,await page.evaluate(({button,expect})=>{
    $(button).click();return !run&&(T.difficulty===expect||T.type===expect)&&!$('start').classList.contains('hide');
   },{button,expect}));
  }
  check('developer status exposes profile and actual adjacent pair counts',await page.evaluate(()=>{
   setupSkill(14);devInfo();const text=$('devInfo').textContent;
   return text.includes(T.randomProfile)&&text.includes('인접')&&Object.values(adjacentFlowerCounts()).every(value=>text.includes(String(value)));
  }));
  // Exercise Chrome's Android touch -> pointer path with a combo mission active.
  await page.evaluate(()=>{
   setupSkill(14);setAllRed();board[1].k='blue';paintBud(board[1].bud,'blue');combo=maxCombo=4;lastFlower='purple';
  });
  const touch=await context.newCDPSession(page),cell=await page.locator('.cell').nth(0).boundingBox();
  const sx=cell.x+cell.width/2,sy=cell.y+cell.height/2;
  async function swipe(dx,dy){
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+dx,y:sy+dy}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await swipe(0,0);await swipe(17,4);
  check('short taps preserve current and maximum combo on expert stages',await page.evaluate(()=>combo===4&&maxCombo===4&&total===0));
  await swipe(22,0);
  check('valid Android swipe increments current combo and combo mission progress',await page.evaluate(()=>combo===5&&maxCombo===5&&total===1&&!done()));
  await page.evaluate(()=>{busy.clear();board[0].k=board[1].k='red';paintBud(board[0].bud,'red');paintBud(board[1].bud,'red');});
  await swipe(22,0);
  check('wrong actual swipe resets only current combo, retaining achieved max',await page.evaluate(()=>combo===0&&maxCombo===5&&total===1));
  if(process.env.TEST_SCREENSHOTS)fs.mkdirSync(process.env.TEST_SCREENSHOTS,{recursive:true});
  for(const size of [{width:320,height:568},{width:360,height:740},{width:412,height:915}]){
   await page.setViewportSize(size);
   await page.evaluate(()=>{prepareStage(0);fitBoard();prepareStage(14);});
   check('stage navigation refits taller combo HUD without a viewport resize '+size.width,await page.evaluate(()=>{
    const footer=document.querySelector('.footer').getBoundingClientRect(),signature=document.querySelector('.signature').getBoundingClientRect();
    return footer.bottom<=innerHeight&&signature.bottom<=innerHeight;
   }));
   check('expert start goals and button fit '+size.width,await page.evaluate(()=>{
    const modal=$('start').querySelector('.modal-card').getBoundingClientRect(),button=$('startBtn').getBoundingClientRect();
    return modal.left>=0&&modal.right<=innerWidth&&button.top>=0&&button.bottom<=innerHeight&&
     $('sGoal').scrollWidth<=$('sGoal').clientWidth&&$('start').textContent.includes('50');
   }));
   if(process.env.TEST_SCREENSHOTS)await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'expert-start-'+size.width+'.png')});
   await page.evaluate(()=>{
    setupSkill(14);setAllRed();board[1].k='blue';paintBud(board[1].bud,'blue');
    const random=Math.random;Math.random=()=>0;try{spawnButterfly();}finally{Math.random=random;}
    combo=maxCombo=7;lastFlower='purple';merge(1,0);fitBoard();
   });
   await page.clock.runFor(100);
   check('expert three goals + combo mission + BLOOM + butterfly fit '+size.width,await page.evaluate(()=>{
    const mission=$('mission').getBoundingClientRect(),goal=$('comboGoal').getBoundingClientRect(),grid=$('grid').getBoundingClientRect();
    const badge=$('bloomBadge').getBoundingClientRect(),hint=$('butterflyHint').getBoundingClientRect();
    return goal.height>0&&goal.top>=mission.top&&goal.bottom<=mission.bottom+1&&mission.bottom<grid.top&&
     badge.top>grid.bottom&&hint.top>badge.bottom&&$('mission').scrollWidth<=$('mission').clientWidth&&
     $('comboGoal').scrollWidth<=$('comboGoal').clientWidth&&hint.left>=0&&hint.right<=innerWidth;
   }));
   if(process.env.TEST_SCREENSHOTS)await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'expert-play-'+size.width+'.png')});
  }
  check('retry and final-stage clear preserve lifecycle safety',await page.evaluate(()=>{
   begin();stopClocks();const reset=combo===0&&maxCombo===0&&total===0&&!butterfly&&!done();
   goals={purple:10,orange:10,green:9};maxCombo=7;skillPair('green');
   return reset&&done()&&clearing&&!run&&!butterfly;
  }));
  await page.clock.runFor(851);
  check('final clear wraps to first stage with clean state',await page.evaluate(()=>si===0&&maxCombo===0&&combo===0&&total===0&&!run&&!butterfly&&!$('start').classList.contains('hide')));
  const quiet=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'});
  quiet.on('pageerror',e=>errors.push(e.message));await quiet.goto('http://127.0.0.1:'+server.address().port);
  check('reduced-motion expert preserves mission visibility without animated waves',await quiet.evaluate(()=>{
   prepareStage(14);begin();stopClocks();combo=7;lastFlower='purple';let vibrations=0;navigator.vibrate=()=>vibrations++;
   board[0].k='red';board[1].k='blue';merge(0,1);
   return maxCombo===8&&bloomActive()&&!$('comboGoal').classList.contains('hide')&&!document.querySelector('.board-wave')&&vibrations===0;
  }));
  assert.deepEqual(errors,[],'runtime/console errors');
  console.log(JSON.stringify({passed:checks.length,checks,runtimeErrors:errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
