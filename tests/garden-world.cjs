// node tests/garden-world.cjs; requires Playwright. Optional CHROME_PATH, TEST_SCREENSHOTS.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const s of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
const checks=[];function check(name,value){assert.equal(value,true,name);checks.push(name);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}: {})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port;
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  await page.evaluate(()=>{
   window.freshWorld=()=>{closeGarden();garden=freshGarden();gardenAnnouncements=[];gardenTab='decorate';gardenTool='purple';gardenMoveFrom=null;gardenReadOnly=false;gardenSaveError='';prepareStage(1);begin();stopClocks();};
   window.worldPair=(name='purple')=>{busy.clear();board[0].k=F[name].need[0];board[1].k=F[name].need[1];merge(0,1);};
   window.worldFestival=()=>{closeGarden();prepareStage(3);begin();stopClocks();for(let i=0;i<25;i++)worldPair(GARDEN_FLOWERS[i%3]);};
  });
  check('new saves are v2 and start with no invented achievements',await page.evaluate(()=>garden.version===2&&garden.specialUnlocked.length===0&&garden.visitors.length===0&&garden.festival.clears===0&&!garden.homeCompleted));
  await page.locator('#start [data-open-garden]').click();await page.locator('[data-garden-tab="decorate"]').focus();await page.keyboard.press('ArrowRight');
  check('garden tabs support keyboard navigation and one active tab stop',await page.evaluate(()=>gardenTab==='album'&&document.activeElement===$('gardenTab-album')&&$('gardenTab-decorate').tabIndex===-1));
  await page.evaluate(()=>{freshWorld();for(let i=0;i<8;i++)worldPair('purple');});
  check('real merges record first stage, best same-flower combo and lifetime totals',await page.evaluate(()=>garden.records.purple.firstStage===2&&garden.records.purple.bestCombo===8&&garden.earned.purple===8&&garden.records.purple.festival===0));
  check('8 combo grants exactly one starlight flower',await page.evaluate(()=>garden.specialUnlocked.includes('starlight')&&garden.rare.starlight===1));
  await page.evaluate(()=>{updateGardenMilestones();updateGardenMilestones();openGarden();});
  check('repeated achievement checks cannot duplicate a special flower',await page.evaluate(()=>garden.rare.starlight===1&&garden.specialUnlocked.length===1));
  await page.evaluate(()=>{document.querySelector('#gardenRareSeeds').closest('details').open=true;});
  await page.locator('[data-seed="starlight"]').click();await page.locator('[data-plot="0"]').click();
  check('special flowers have a plantable unique appearance and consume their stock',await page.evaluate(()=>garden.plots[0]==='starlight'&&garden.rare.starlight===0&&!!document.querySelector('[data-plot="0"] .rare-mark')));
  await page.locator('#gardenRemove').click();await page.locator('[data-plot="0"]').click();
  check('special flowers can be returned without duplicating or losing the unique item',await page.evaluate(()=>garden.rare.starlight===1&&garden.plots[0]===null));
  check('selecting controls does not replay animations on unchanged flowers',await page.evaluate(()=>{gardenTool='purple';editGardenPlot(1);const placed=document.querySelector('[data-plot="1"]').classList.contains('just-planted');renderGarden();return placed&&!document.querySelector('[data-plot="1"]').classList.contains('just-planted');}));
  await page.evaluate(()=>{closeGarden();for(let i=0;i<22;i++)worldPair('purple');openGarden();selectGardenTab('album');});
  check('flower album reaches its 30-bloom rank and awards the nameplate once',await page.evaluate(()=>$('gardenAlbum').textContent.includes('성장')&&garden.earned.purple===30&&garden.trophies.filter(x=>x==='albumLabel').length===1));
  check('failed stages preserve album and tree progress',await page.evaluate(()=>{closeGarden();const xp=gardenTree().xp;finish();return xp===30&&gardenTree().xp===30&&garden.records.purple.bestCombo===30;}));
  await page.evaluate(()=>{freshWorld();worldFestival();});
  check('festival merges update per-color records and successful festival stats',await page.evaluate(()=>garden.records.purple.festival===9&&garden.records.orange.festival===8&&garden.records.green.festival===8&&garden.festival.clears===1&&garden.festival.maxBlooms===25));
  check('first festival clear awards sunburst and festival flag',await page.evaluate(()=>garden.rare.sunburst===1&&garden.trophies.includes('festivalFlag')&&!garden.trophies.includes('festivalCrown')));
  await page.evaluate(()=>{stageClear();rewardGardenClear();});
  check('a duplicate clear cannot add a festival completion or additional reward',await page.evaluate(()=>garden.festival.clears===1&&garden.sun===20&&garden.rare.sunburst===1));
  await page.evaluate(()=>{worldFestival();worldFestival();});
  check('three completed festivals unlock the crown without duplicating special flowers',await page.evaluate(()=>garden.festival.clears===3&&garden.trophies.includes('festivalCrown')&&garden.rare.sunburst===1&&garden.sun===40));
  await page.evaluate(()=>{prepareStage(14);begin();stopClocks();goals={purple:10,orange:10,green:9};maxCombo=7;worldPair('green');});
  check('an expert stage clear grants the jade crown flower',await page.evaluate(()=>garden.cleared.includes(14)&&garden.rare.jade===1&&garden.specialUnlocked.includes('jade')));
  await page.evaluate(()=>{freshWorld();openGarden();selectGardenTheme('moonlight');});
  check('locked themes reject direct selection',await page.evaluate(()=>garden.theme==='spring'&&document.querySelector('[data-theme="moonlight"]').disabled));
  await page.evaluate(()=>{garden.cleared=[0,1,2];renderGarden();selectGardenTheme('sunset');});
  check('three distinct stage clears unlock the sunset theme',await page.evaluate(()=>garden.theme==='sunset'&&$('gardenView').dataset.theme==='sunset'));
  await page.evaluate(()=>{garden.cleared=[0,1,2,3,4,5];selectGardenTheme('moonlight');});
  check('six distinct stage clears unlock the moonlight theme',await page.evaluate(()=>garden.theme==='moonlight'&&$('gardenView').dataset.theme==='moonlight'));
  const themeSave=await page.evaluate(()=>JSON.stringify(garden));
  check('theme survives save validation without changing the arrangement',await page.evaluate(raw=>{const state=normalizeGarden(JSON.parse(raw));return state.theme==='moonlight'&&JSON.stringify(state.plots)===JSON.stringify(garden.plots);},themeSave));
  await page.evaluate(()=>{freshWorld();garden.flowers.purple=3;openGarden();editGardenPlot(0);editGardenPlot(1);editGardenPlot(2);});
  check('three planted purple flowers discover the violet visitor',await page.evaluate(()=>garden.visitors.includes('violet')&&garden.favoriteVisitor==='violet'));
  await page.evaluate(()=>{gardenTool='remove';editGardenPlot(0);editGardenPlot(1);editGardenPlot(2);});
  check('visitor discovery is permanent after its attraction is removed',await page.evaluate(()=>garden.visitors.includes('violet')&&!$('gardenButterflies').classList.contains('hide')));
  await page.evaluate(()=>{garden.plots=['orange','orange','orange',null,...Array(8).fill(null)];updateGardenMilestones();});
  check('amber visitor requires both orange flowers and a festival completion',await page.evaluate(()=>!garden.visitors.includes('amber')));
  await page.evaluate(()=>{garden.festival.clears=1;updateGardenMilestones();garden.plots=['green','green','green',null,...Array(8).fill(null)];garden.decor=['fountain'];updateGardenMilestones();});
  check('amber is discovered, but jade visitor requires a displayed fountain',await page.evaluate(()=>garden.visitors.includes('amber')&&!garden.visitors.includes('jade')));
  await page.evaluate(()=>{garden.visibleDecor=['fountain'];updateGardenMilestones();garden.plots=['purple','orange','green',null,...Array(8).fill(null)];garden.earned.purple=10;updateGardenMilestones();renderGarden();selectGardenTab('album');});
  check('displayed fountain and varied blooms unlock jade and rainbow visitors',await page.evaluate(()=>garden.visitors.length===4));
  await page.locator('[data-visitor="rainbow"]').click();
  check('a collected visitor can be invited independently of current flowers',await page.evaluate(()=>garden.favoriteVisitor==='rainbow'&&$('gardenButterflies').dataset.visitor==='rainbow'));
  await page.evaluate(()=>{freshWorld();for(let i=0;i<2;i++)for(const name of GARDEN_FLOWERS)worldPair(name);openGarden();selectGardenTab('progress');});
  check('tricolor request progresses only from new successful blooms',await page.evaluate(()=>gardenRequestState().done&&gardenRequestState().value===6&&garden.sun===0));
  await page.locator('#gardenRequestClaim').click();
  check('claiming a request awards 8 sunlight and the first-completion fence',await page.evaluate(()=>garden.sun===8&&garden.request.completed===1&&garden.trophies.includes('requestFence')&&garden.request.index===1));
  await page.evaluate(()=>claimGardenRequest());
  check('request claim is idempotent and new requests do not reuse old progress',await page.evaluate(()=>garden.sun===8&&garden.request.completed===1&&gardenRequestState().value===0));
  await page.evaluate(()=>{closeGarden();worldPair('green');openGarden();selectGardenTab('progress');});
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#gardenRequestSkip').click();
  check('cancelling a request switch keeps progress',await page.evaluate(()=>garden.request.index===1&&gardenRequestState().value===1));
  const flowersBefore=await page.evaluate(()=>JSON.stringify(garden.flowers));
  page.once('dialog',dialog=>dialog.accept());await page.locator('#gardenRequestSkip').click();
  check('switching requests resets only request progress, preserving all flowers',await page.evaluate(before=>garden.request.index===2&&gardenRequestState().value===0&&JSON.stringify(garden.flowers)===before,flowersBefore));
  await page.evaluate(()=>{closeGarden();for(let i=0;i<5;i++)worldPair('purple');openGarden();});
  check('combo request observes the actual combo event',await page.evaluate(()=>gardenRequestState().done));
  await page.evaluate(()=>{claimGardenRequest();closeGarden();for(let i=0;i<12;i++)worldPair(i%2?'purple':'green');openGarden();});
  check('total request counts new blooms across colors',await page.evaluate(()=>gardenRequestState().done&&gardenRequestState().value===12));
  await page.evaluate(()=>{claimGardenRequest();claimGardenRequest();});
  check('three request claims award exactly 24 sunlight and one fence',await page.evaluate(()=>garden.request.completed===3&&garden.sun===24&&garden.trophies.filter(x=>x==='requestFence').length===1));
  check('tree stages follow all six lifetime-bloom thresholds',await page.evaluate(()=>{
   const original={...garden.earned};let ok=true;for(const [xp,level] of [[0,0],[9,0],[10,1],[30,2],[60,3],[120,4],[240,5]]){garden.earned={purple:xp,orange:0,green:0};ok&&=gardenTree().level===level;}garden.earned=original;return ok;
  }));
  await page.evaluate(()=>{freshWorld();openGarden();selectGardenTab('progress');});
  check('tree colors remain locked before 60 blooms',await page.evaluate(()=>document.querySelector('[data-tree-style="rose"]').disabled));
  await page.evaluate(()=>{garden.earned.purple=60;renderGarden();});await page.locator('[data-tree-style="rose"]').click();
  check('tree appearance can be changed at the earned milestone',await page.evaluate(()=>garden.treeStyle==='rose'&&$('gardenTreeArt').innerHTML.includes('#d69cad')));
  await page.evaluate(()=>{freshWorld();worldPair('purple');openGarden();selectGardenPattern('rainbow');});
  check('pattern preview shows missing arrangement without auto-spending flowers',await page.evaluate(()=>garden.pattern==='rainbow'&&garden.plots.every(x=>x===null)&&garden.flowers.purple===2&&$('gardenPatternPreview').children.length===4));
  await page.evaluate(()=>{gardenTool='purple';editGardenPlot(0);gardenTool='orange';editGardenPlot(1);gardenTool='green';editGardenPlot(2);gardenTool='purple';editGardenPlot(3);});
  check('matching the four-plot pattern permanently unlocks its photo frame and medal',await page.evaluate(()=>garden.patterns.includes('rainbow')&&garden.trophies.includes('patternFrame')&&gardenPatternDone('rainbow')));
  await page.evaluate(()=>{gardenTool='remove';editGardenPlot(0);});
  check('pattern rewards persist after free rearrangement',await page.evaluate(()=>garden.patterns.includes('rainbow')&&!gardenPatternDone('rainbow')&&garden.flowers.purple===1));
  await page.evaluate(()=>{garden.capacity=8;garden.plots=GARDEN_PATTERNS.checker.slots.concat(Array(4).fill(null));updateGardenMilestones();garden.capacity=12;garden.plots=[...GARDEN_PATTERNS.heart.slots];updateGardenMilestones();renderGarden();});
  check('checker and heart patterns grant their own unique frames',await page.evaluate(()=>garden.patterns.length===3&&garden.patterns.includes('heart')&&garden.trophies.filter(x=>x==='patternFrame').length===1));
  check('heart pattern requires its designated empty corners',await page.evaluate(()=>{garden.plots[8]='green';const ok=!gardenPatternDone('heart');garden.plots[8]=null;return ok;}));
  await page.evaluate(()=>{freshWorld();openGarden();selectGardenRoom('pond');});
  check('new rooms remain locked until the first 12-plot garden is full',await page.evaluate(()=>garden.activeRoom==='home'&&!garden.homeCompleted&&document.querySelector('[data-room="pond"]').disabled));
  await page.evaluate(()=>{garden.capacity=12;garden.plots=Array(11).fill('purple').concat(null);garden.flowers.orange=1;gardenTool='orange';renderGarden();editGardenPlot(11);});
  check('planting the final main-garden plot unlocks both extra rooms',await page.evaluate(()=>garden.homeCompleted&&!document.querySelector('[data-room="greenhouse"]').disabled&&!document.querySelector('[data-room="pond"]').disabled));
  await page.locator('#gardenRemove').click();await page.locator('[data-plot="11"]').click();await page.locator('[data-room="greenhouse"]').click();await page.locator('[data-seed="orange"]').click();await page.locator('[data-plot="0"]').click();
  check('flowers transfer through shared inventory while the main garden is preserved',await page.evaluate(()=>garden.rooms.greenhouse[0]==='orange'&&garden.plots[0]==='purple'&&garden.plots[11]===null&&garden.flowers.orange===0&&garden.homeCompleted));
  await page.locator('#gardenMove').click();await page.locator('[data-plot="0"]').click();await page.locator('[data-room="pond"]').click();
  check('switching rooms clears a pending move and prevents cross-room swaps',await page.evaluate(()=>gardenMoveFrom===null&&garden.rooms.pond.every(x=>x===null)&&garden.rooms.greenhouse[0]==='orange'&&gardenCapacity()===6));
  await page.evaluate(()=>{const before=garden.sun;expandGarden();return garden.sun===before;});
  check('extra rooms have independent six-plot layouts and no main-garden expansion charge',await page.evaluate(()=>garden.capacity===12&&$('gardenExpand').classList.contains('hide')));
  await page.evaluate(()=>{garden.records.purple.bestCombo=8;garden.cleared=[0,1,2,3,4,5,14];garden.festival.clears=3;garden.earned={purple:120,orange:80,green:40};garden.patterns=['rainbow','checker','heart'];garden.rooms.pond=['purple','orange','green',null,null,null];garden.theme='moonlight';garden.visibleDecor=['fountain'];garden.decor=['fountain'];garden.photo.frame='heart';updateGardenMilestones();saveGarden();renderGarden();});
  const serialized=await page.evaluate(()=>JSON.stringify(garden));
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  check('all v2 achievements, room layouts, theme and visitor choice survive reload',await page.evaluate(before=>{const expected=normalizeGarden(JSON.parse(before));return JSON.stringify(garden)===JSON.stringify(expected);},serialized));
  await page.locator('#start [data-open-garden]').click();await page.locator('[data-garden-tab="photo"]').click();
  await page.locator('#gardenPhotoName').fill('<img src=x> 나의 연못');await page.locator('#gardenPhotoStats').uncheck();await page.locator('#gardenPhotoFrames').selectOption('heart');
  check('photo still mode pauses visual motion and prevents accidental planting',await page.evaluate(()=>{const before=JSON.stringify(gardenPlots());editGardenPlot(0);return $('gardenView').classList.contains('photo-still')&&getComputedStyle(document.querySelector('.garden-butterflies i')).animationName==='none'&&JSON.stringify(gardenPlots())===before;}));
  await page.locator('#gardenPhotoMake').click();await page.waitForFunction(()=>!gardenPhotoBusy);
  check('photo rendering creates a real 1000×1280 PNG preview without injecting name HTML',await page.evaluate(async()=>{const img=$('gardenPhotoPreview');await img.decode();return img.naturalWidth===1000&&img.naturalHeight===1280&&gardenPhotoURL?.startsWith('blob:')&&!document.querySelector('img[src="x"]')&&!garden.photo.showStats;}));
  const downloadPromise=page.waitForEvent('download');await page.locator('#gardenPhotoDownload').click();const download=await downloadPromise;const bytes=fs.readFileSync(await download.path());
  check('photo download is a valid PNG with the expected filename',download.suggestedFilename()==='flower-bloom-garden.png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  if(process.env.TEST_SCREENSHOTS){fs.mkdirSync(process.env.TEST_SCREENSHOTS,{recursive:true});await download.saveAs(path.join(process.env.TEST_SCREENSHOTS,'garden-world-photo.png'));}
  for(const viewport of [{width:320,height:568},{width:360,height:740},{width:412,height:915},{width:844,height:390}]){
   await page.setViewportSize(viewport);
   for(const tab of ['decorate','album','progress','photo']){
    await page.evaluate(id=>selectGardenTab(id),tab);
    check('world '+tab+' fits '+viewport.width+'×'+viewport.height,await page.evaluate(()=>{
     const view=$('gardenView');view.scrollTop=view.scrollHeight;const returnButton=$('gardenPlay').getBoundingClientRect(),bounds=view.getBoundingClientRect();
     return view.scrollWidth<=view.clientWidth+1&&returnButton.right<=bounds.right+1&&returnButton.left>=bounds.left&&returnButton.bottom<=bounds.bottom+1;
    }));
   }
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>selectGardenTab('decorate'));
  if(process.env.TEST_SCREENSHOTS){await page.clock.runFor(600);await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,'garden-world-pond.png')});}
  await page.evaluate(()=>selectGardenTab('photo'));await page.locator('#gardenClose').focus();await page.keyboard.press('Shift+Tab');
  check('focus trap includes photo form fields and the download link',await page.evaluate(()=>document.activeElement===$('gardenPlay')));
  await page.keyboard.press('Escape');check('escape still restores the original start dialog',await page.evaluate(()=>!gardenOpen&&!menuPaused&&!$('start').inert));
  // Migrate a real v1-shaped save, retaining its exact original as a backup.
  const legacy={version:1,flowers:{purple:9,orange:7,green:5},earned:{purple:22,orange:10,green:12},sun:73,capacity:8,plots:['purple','orange',null,'green',null,null,null,null,null,null,null,null],decor:['bench'],visibleDecor:['bench'],cleared:[0,1,2,3,12],nextStage:13};
  await page.evaluate(value=>localStorage.setItem(GARDEN_KEY,JSON.stringify(value)),legacy);await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.assetsReady==='true');
  check('v1 migration preserves every owned flower, sunlight, layout, decor and checkpoint',await page.evaluate(old=>garden.version===2&&garden.sun===old.sun&&JSON.stringify(garden.flowers)===JSON.stringify(old.flowers)&&JSON.stringify(garden.earned)===JSON.stringify(old.earned)&&JSON.stringify(garden.plots)===JSON.stringify(old.plots)&&garden.visibleDecor.includes('bench')&&si===13,legacy));
  check('v1 migration stores an exact backup before writing the v2 save',await page.evaluate(old=>localStorage.getItem(GARDEN_KEY+'.backup-v1')===JSON.stringify(old)&&JSON.parse(localStorage.getItem(GARDEN_KEY)).version===2,legacy));
  check('migration honors known festival and expert clears without inventing combo or first-stage history',await page.evaluate(()=>garden.rare.sunburst===1&&garden.rare.jade===1&&garden.rare.starlight===0&&garden.records.purple.firstStage===null&&garden.records.purple.bestCombo===0&&gardenRequestState().value===0));
  const firstMigration=await page.evaluate(()=>JSON.stringify(garden));await page.reload();
  check('migration and retroactive collectible grants are repeat-safe',await page.evaluate(before=>JSON.stringify(garden)===JSON.stringify(normalizeGarden(JSON.parse(before))),firstMigration));
  await page.evaluate(()=>{localStorage.setItem(GARDEN_KEY,'{"version":99,"sun":123}');});await page.reload();
  check('unknown future versions remain protected by the original read-only policy',await page.evaluate(()=>{collectGardenFlower('purple');return gardenReadOnly&&localStorage.getItem(GARDEN_KEY)==='{"version":99,"sun":123}';}));
  check('v2 sanitization repairs duplicate rare flowers and rejects unsafe settings',await page.evaluate(()=>{
   const value={...freshGarden(),capacity:12,homeCompleted:true,plots:['starlight','starlight',...Array(10).fill(null)],rooms:{greenhouse:['starlight'],pond:['<img>']},rare:{starlight:999},theme:'__proto__',activeRoom:'__proto__',photo:{name:'\u0000<img src=x>',frame:'bad'},request:{index:-4,baseline:{purple:999}}};
   const clean=normalizeGarden(value);return clean.plots[0]==='starlight'&&clean.plots[1]===null&&clean.rooms.greenhouse[0]===null&&clean.rooms.pond[0]===null&&clean.rare.starlight===0&&clean.specialUnlocked.includes('starlight')&&clean.theme==='spring'&&clean.activeRoom==='home'&&clean.photo.name==='<img src=x>'&&clean.photo.frame==='plain'&&clean.request.index===0&&clean.request.baseline.purple===0;
  }));
  check('save normalization is idempotent for canonical v2 state',await page.evaluate(()=>{const state=normalizeGarden(freshGarden());return JSON.stringify(normalizeGarden(state))===JSON.stringify(state);}));
  await context.close();
  const denied=await browser.newContext();await denied.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.endsWith('.backup-v1'))throw new DOMException('Quota','QuotaExceededError');return original.call(this,key,value);};});
  const guarded=await denied.newPage();await guarded.goto(url);await guarded.evaluate(old=>localStorage.setItem('flower-bloom.garden.v1',JSON.stringify(old)),legacy);await guarded.reload();
  check('backup failure does not overwrite the only legacy save',await guarded.evaluate(()=>garden.version===2&&JSON.parse(localStorage.getItem(GARDEN_KEY)).version===1&&gardenSaveError.length>0));
  await denied.close();
  const quietContext=await browser.newContext({reducedMotion:'reduce'}),quiet=await quietContext.newPage();await quiet.goto(url);await quiet.evaluate(()=>{openGarden();garden.plots[0]='purple';renderGarden();});
  check('reduced-motion support still covers the expanded garden',await quiet.evaluate(()=>getComputedStyle(document.querySelector('.garden-plot img')).animationName==='none'&&getComputedStyle(document.querySelector('.garden-butterflies i')).animationName==='none'));
  await quietContext.close();check('no browser runtime errors in the world scenario',errors.length===0);
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
