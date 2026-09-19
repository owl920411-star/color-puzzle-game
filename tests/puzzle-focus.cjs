const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const {createStaticServer}=require('./static-server.cjs');
(async()=>{
 const server=createStaticServer(path.join(__dirname,'..'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const checks=[],errors=[],requests=[];const check=(name,result)=>{assert.equal(result,true,name);checks.push(name);};
 const legacyKey='flower-bloom.garden.v1',key='farm-friends.puzzle-progress.v1';
 try{
  const page=await browser.newPage({viewport:{width:320,height:568}});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const open=async()=>{await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');};
  await open();
  check('fresh player starts first stage with no garden UI or functions',await page.evaluate(()=>si===0&&!document.querySelector('#gardenView,[data-open-garden],#gardenReward')&&typeof openGarden==='undefined'));
  check('all fifteen stages have no festival mode or developer entry',await page.evaluate(()=>ST.length===15&&ST.every(s=>s.type!=='festival')&&typeof FestivalShow==='undefined'&&!document.querySelector('#devFestival,#festivalCanvas,.festival-atmosphere')));
  check('no festival resources are downloaded',requests.every(url=>!/festival/i.test(url)));
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,nextStage:3})),key);await open();
  check('saved fourth-stage progress resumes a regular total-goal puzzle',await page.evaluate(()=>si===3&&T.type==='normal'&&T.totalGoal===25&&time===45&&$('app').dataset.scene==='normal'&&$('sStage').textContent==='STAGE 4'));
  check('ordinary break facets retain their animation after stylesheet removal',await page.evaluate(()=>{begin();stopClocks();particles(board[0].el,'purple');const shards=document.querySelectorAll('.fx-shard');return shards.length===8&&getComputedStyle(shards[0]).animationName==='puzzleShatter';}));
  const legacy=JSON.stringify({version:2,nextStage:7,flowers:{purple:33},sun:150,plots:['purple']});
  await page.evaluate(({legacyKey,legacy,key})=>{localStorage.clear();localStorage.setItem(legacyKey,legacy);},{legacyKey,legacy,key});await open();
  check('existing stage carries forward without rewriting previous save',await page.evaluate(({legacyKey,legacy})=>si===7&&localStorage.getItem(legacyKey)===legacy,{legacyKey,legacy}));
  await page.evaluate(()=>{begin();stopClocks();goals={...T.g};maxCombo=T.comboGoal||0;stageClear();});
  check('clear writes only puzzle progress',await page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));return s.nextStage===8&&Object.keys(s).sort().join(',')==='nextStage,version';},key));
  await open();check('reload resumes new progress ahead of the legacy stage',await page.evaluate(()=>si===8));
  await page.evaluate(()=>{openMenu();});check('menu has no management actions',!(await page.locator('#menu').innerText()).match(/텃밭|나의 농장|보관함|햇살|사진 저장/));
  await page.evaluate(()=>{closeMenu();begin();stopClocks();finish();});check('result is solely score, goals and combo',!(await page.locator('#end').innerText()).match(/텃밭|농장 보관함|햇살|나의 농장/));
  await page.evaluate(()=>{prepareStage(14);begin();stopClocks();goals={...T.g};maxCombo=T.comboGoal;stageClear();});await open();check('final stage cycles and persists first stage',await page.evaluate(()=>si===0));
  await page.evaluate(({key})=>localStorage.setItem(key,JSON.stringify({version:1,nextStage:999})),{key});await open();check('out-of-range progress falls back safely',await page.evaluate(()=>si===0));
  await page.evaluate(key=>localStorage.setItem(key,'{"version":99,"nextStage":5}'),key);await open();await page.evaluate(()=>savePuzzleStage(4));check('future progress version stays untouched',await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).version===99,key));
  const blocked=await browser.newPage();await blocked.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw new Error('blocked');};});await blocked.goto('http://127.0.0.1:'+server.address().port);await blocked.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');check('puzzle works when storage is unavailable',await blocked.evaluate(()=>{begin();stopClocks();return run&&board.length===36;}));
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,checks,runtimeErrors:errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
