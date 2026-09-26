'use strict';
// Adapter contract tests: fake DOM and game port. Not a full-game/mobile test.
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../dist/adaptive-director.js'),Bridge=require('../dist/adaptive-bridge.js');
const blank=()=>Array.from({length:20},()=>Array(10).fill(null));
function setup(options={},broken=false){
 const data={'glassfall-v1':'{"unrelated":"preserved"}'},calls=[],events={};
 const g={kind:'normal',state:'playing',run:{board:blank(),score:0,combo:0,gravity:1000,active:{}},
  seed:'test',elapsed:0,desert:{level:2,nextRise:38000,delay:0},baseInterval:38000,interval:38000,practice:false,overlayView:'dev'};
 if(Object.keys(options).length)data[Bridge.KEY]=JSON.stringify({options});
 let scans=0;
 const p={get:()=>g,curses:()=>{scans++;return 0;},storage:{getItem:k=>{if(broken)throw Error('blocked');return data[k]||null;},setItem:(k,v)=>{if(broken)throw Error('blocked');data[k]=v;}},
  panel:{addEventListener:(n,f)=>events[n]=f},show:(html,view)=>{calls.push({html,view});},pauseForPanel:()=>{g.state='paused';},back:view=>calls.push({back:view}),download:(name,text)=>calls.push({name,text})};
 const b=Bridge.create(p);b.begin();
 const click=(adaptive,v)=>events.click({target:{closest:()=>({dataset:{adaptive,v},disabled:false})}});
 const step=n=>{for(let t=0;t<n;t+=100){g.elapsed+=Math.min(100,n-t);b.tick(Math.min(100,n-t));}};
 return {b,g,data,calls,click,step,get scans(){return scans;}};
}
function lock(a,{hard=true,item=false}={}){
 a.step(2000);a.b.input(hard?'drop':'left',true);a.b.beforeLock();
 a.g.run.board[19]=Array(10).fill({});a.b.locked();a.g.run.board=blank();a.g.run.combo=1;
 a.b.resolved({rows:[19]}, {scoringRows:[19],events:item?[{status:'activated',type:'oasis'}]:[],extraRemoved:item?4:0});
}
test('bridge measures actual lock, not next previews or button spam',()=>{const a=setup();a.b.input('drop',false);assert.equal(a.b.info().placements,0);lock(a);assert.equal(a.b.info().placements,1);assert.equal(a.b.info().hardDrops,1);});
test('observer leaves already scheduled deadline and base interval unchanged',()=>{const a=setup();for(let i=0;i<40;i++)lock(a);const before=a.g.desert.nextRise;assert.equal(a.b.interval(38000),38000);assert.equal(a.g.desert.nextRise,before);assert.equal(a.b.info().proposed,.95);});
test('active mode alters only returned future interval, not board or current deadline',()=>{const a=setup({mode:'adaptive'});for(let i=0;i<40;i++)lock(a);const before=JSON.stringify(a.g);assert.equal(a.b.interval(38000),36100);assert.equal(JSON.stringify(a.g),before);});
test('configuration change is next-game-only',()=>{const a=setup();a.click('mode','adaptive');a.click('style','calm');assert.equal(a.b.info().mode,'observe');assert.equal(a.b.recordKey(),'normal');a.b.end('restart');a.b.begin();assert.equal(a.b.info().mode,'adaptive');assert.equal(a.b.recordKey(),'normal-adaptive-v1-calm');});
test('menu and clear animation frames are excluded',()=>{const a=setup();a.step(1000);a.g.state='paused';a.step(8000);a.g.state='clearing';a.step(2000);a.g.state='playing';a.b.input('left',true);a.b.beforeLock();a.b.locked();a.b.resolved(null,null);assert.equal(a.b.session.lastPlacement.ms,1000);});
test('system-only removal not credited as natural lines',()=>{const a=setup();a.b.system('item');a.step(1000);a.b.input('left',true);a.b.beforeLock();a.b.locked();a.b.resolved(null,{scoringRows:[],events:[],extraRemoved:0});assert.equal(a.b.session.lastPlacement.lines,0);assert.equal(a.b.session.lastPlacement.assisted,true);});
test('no board or curse scan in per-frame clock ticks',()=>{const a=setup();a.step(10000);assert.equal(a.scans,0);lock(a);assert.equal(a.scans,1);});
test('normal completed session records bounded diagnostics separately',()=>{const a=setup();for(let i=0;i<40;i++)lock(a);a.b.end('gameover');const s=JSON.parse(a.data[Bridge.KEY]);assert.equal(s.history.length,1);assert.equal(s.profile.completed,1);assert.equal(a.data['glassfall-v1'],'{"unrelated":"preserved"}');});
test('end callback cannot double-save/learn a completed session',()=>{const a=setup();for(let i=0;i<40;i++)lock(a);a.b.end('gameover');a.b.end('gameover');assert.equal(JSON.parse(a.data[Bridge.KEY]).profile.completed,1);});
test('temporary session keeps diagnosis in memory but does not persist',()=>{const a=setup({mode:'adaptive',guest:true});const before=a.data[Bridge.KEY];a.click('guest'); // guest setting is intentionally not persisted/reused after load
 a.b.end('restart');a.b.begin();assert.equal(a.b.guest,true);lock(a);a.b.end('gameover');assert.equal(a.data[Bridge.KEY],before);});
test('developer preset blocks real adaptation and training',()=>{const a=setup({mode:'adaptive'});for(let i=0;i<40;i++)lock(a);a.g.practice=true;a.b.exclude();assert.equal(a.b.interval(38000),38000);a.b.end('gameover');assert.equal(JSON.parse(a.data[Bridge.KEY]).profile.completed,0);});
test('pagehide checkpoint gets overwritten by final result, never treated as death',()=>{const a=setup();for(let i=0;i<40;i++)lock(a);a.b.end('interrupted',true);let s=JSON.parse(a.data[Bridge.KEY]);assert.equal(s.profile.completed,0);assert.equal(s.history[0].outcome,'interrupted');a.b.end('gameover');s=JSON.parse(a.data[Bridge.KEY]);assert.equal(s.history.length,1);assert.equal(s.history[0].outcome,'gameover');assert.equal(s.profile.completed,1);});
test('reset preserves game bests and excludes current run from training',()=>{const a=setup();lock(a);a.click('reset-question');assert.match(a.calls.at(-1).html,/취소/);a.click('reset-confirm');a.b.end('gameover');const s=JSON.parse(a.data[Bridge.KEY]);assert.equal(s.history.length,0);assert.equal(s.profile.completed,0);assert.equal(a.data['glassfall-v1'],'{"unrelated":"preserved"}');});
test('blocked storage still supports in-memory play and informs user',()=>{const a=setup({},true);lock(a);a.click('mode','adaptive');a.click('open');assert.match(a.calls.at(-1).html,/저장 실패/);assert.equal(a.b.info().placements,1);});
test('diagnostic export requires explicit click and includes ruleset',()=>{const a=setup();lock(a);assert.equal(a.calls.length,0);a.click('export');const r=JSON.parse(a.calls.at(-1).text);assert.equal(r.current.ruleset,D.RULESET);assert.equal(r.current.score,undefined);});
test('history storage retains at most twenty outcomes',()=>{const a=setup();for(let i=0;i<30;i++){lock(a);a.b.end('gameover');a.b.begin();}assert.equal(JSON.parse(a.data[Bridge.KEY]).history.length,20);});
test('sand mode not observed or modified',()=>{const a=setup();a.b.end('menu');a.g.kind='sand';a.b.begin();a.step(3000);assert.equal(a.b.info(),null);assert.equal(a.b.interval(38000),38000);assert.equal(a.b.button(),'');});
test('settings panel returns to the exact source overlay',()=>{const a=setup();a.g.overlayView='settings';a.click('open');a.click('return');assert.equal(a.calls.at(-1).back,'settings');});
test('no session alters gravity, score, NEXT, game over target or curse timers',()=>{const a=setup({mode:'adaptive'});a.g.run.score=123;a.g.run.queue=[{foo:2}];a.g.run.deadline=999;for(let i=0;i<40;i++)lock(a);a.b.interval(38000);assert.equal(a.g.run.score,123);assert.equal(a.g.run.gravity,1000);assert.deepEqual(a.g.run.queue,[{foo:2}]);assert.equal(a.g.run.deadline,999);});
