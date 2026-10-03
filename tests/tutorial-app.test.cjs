'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
function setup(initial){
 const observed=[],life=[];let options,active=false,paused=false;
 const Tutorial={create(o){options=o;return{
  start(){active=true;paused=false;life.push('start');o.prepareStep(0);},
  stop(){active=false;life.push('stop');},
  setPaused(value){paused=value;life.push(value?'pause':'resume');},
  observe(event){if(active&&!paused)observed.push({...event});}
 };}};
 const app=boot({Tutorial,initial});
 return Object.assign(app,{observed,life,prepare(index){options.prepareStep(index);},complete(){options.saveCompleted();options.finish();},isPaused:()=>paused});
}
const storeFixture={
 'glassfall-v1':JSON.stringify({sound:false,bgm:false,sfx:true,haptics:true,effects:'light',touchSensitivity10:7,unknownPreference:{keep:9},endlessV1:{normal:{best:12345,plays:12,last:{score:999}}},desertSurvival:{bestScore:12345,bestTime:345,maxLevel:2}}),
 'glassfall-adaptive-v1':JSON.stringify({options:{mode:'adaptive',style:'calm'},profile:require('../dist/adaptive-director.js').newProfile(),history:[{version:'adaptive-v1.0',id:'retained-history',mode:'adaptive',style:'calm',outcome:'menu',placements:12,score:987}]}),
 'unrelated-app':'keep-this-value'
};
function tap(a,x=60){a.dispatch('pointerdown',{x});a.advance(80);a.dispatch('pointerup',{x});}
function swipe(a,dx,dy=0){a.dispatch('pointerdown');a.advance(30);a.dispatch('pointermove',{x:60+dx,y:200+dy});a.dispatch('pointerup',{x:60+dx,y:200+dy});}

test('practice actions, pause, menu and restart leave existing records/settings/Adaptive storage unchanged',()=>{
 const a=setup(storeFixture),before=JSON.stringify(a.store);a.q.start(false,true);
 assert.equal(a.q.training,true);assert.equal(a.q.items.practice,true);assert.equal(a.q.items.enabled,false);
 tap(a);a.q.action('rotate');a.q.action('hold');a.q.action('drop');a.advance(3000,100);
 assert.ok(a.q.run.score>0);a.q.pause();a.q.resume();a.q.menu();
 assert.equal(JSON.stringify(a.store),before,'tutorial score/history must not persist');
 a.q.start(false,true);assert.equal(a.q.run.score,0);assert.equal(a.q.run.lines,0);a.q.action('drop');a.q.start(true,true);assert.equal(a.q.run.score,0);
 a.q.finish('tutorial-test');a.q.menu();assert.equal(JSON.stringify(a.store),before,'practice terminal/restart must not add plays or Adaptive history');
});

test('real CONTROL23 tap, stationary repeat and rotation results are observed without owning input',()=>{
 const a=setup();a.q.start(false,true);const startX=a.q.run.active.x;
 tap(a);assert.equal(a.q.run.active.x,startX-1);assert.deepEqual(a.observed.map(e=>[e.action,e.success,e.source,e.gesture,e.inputState,e.dx]),[['move',true,'board','tap','PENDING',-1]]);
 a.prepare(2);a.observed.length=0;a.dispatch('pointerdown',{x:220});a.advance(310);a.dispatch('pointerup',{x:220});
 assert.equal(a.observed.length,3);assert.ok(a.observed.every(e=>e.action==='move'&&e.success&&e.inputState==='REPEATING'&&e.source==='board'));
 a.prepare(3);a.observed.length=0;const cells=JSON.stringify(a.q.run.active.cells.map(c=>[c.x,c.y]));swipe(a,60);
 assert.notEqual(JSON.stringify(a.q.run.active.cells.map(c=>[c.x,c.y])),cells);assert.deepEqual(a.observed.map(e=>[e.action,e.success,e.source,e.gesture]),[['rotate',true,'board','rotate']]);
 a.advance(400);assert.equal(a.observed.length,1,'a swipe cannot also become movement');
});

test('real upward HOLD, downward DROP and actual drop button have distinct observed sources',()=>{
 const a=setup();a.q.start(false,true);a.prepare(4);const original=a.q.run.active;
 swipe(a,0,-60);assert.notEqual(a.q.run.active,original);assert.equal(a.q.run.holdUsed,true);
 assert.deepEqual(a.observed.map(e=>[e.action,e.success,e.source,e.gesture]),[['hold',true,'board','hold']]);
 assert.equal(a.q.action('hold'),false);assert.equal(a.observed.length,1,'rejected HOLD is not a success');
 a.prepare(5);a.observed.length=0;swipe(a,0,60);assert.deepEqual(a.observed.map(e=>[e.action,e.success,e.source,e.gesture]),[['drop',true,'board','drop']]);
 a.prepare(6);a.observed.length=0;a.dispatch('pointerdown',{target:'drop',id:2});a.dispatch('click',{target:'drop',id:2});
 assert.deepEqual(a.observed.map(e=>[e.action,e.success,e.source]),[['drop',true,'dropButton']]);
});

test('tutorial preparation and finish invalidate the old piece gesture and restore normal gravity',()=>{
 const a=setup(storeFixture);a.q.start(false,true);a.dispatch('pointerdown');a.advance(180);assert.equal(a.q.drag.state,'REPEATING');
 a.prepare(3);const prepared=a.q.run.active,preparedX=prepared.x;assert.equal(a.q.drag,null);assert.equal(a.timers.size,0);
 a.advance(400);a.dispatch('pointerup');assert.equal(a.q.run.active,prepared);assert.equal(prepared.x,preparedX);
 a.dispatch('pointerdown');a.advance(70);a.complete();const normal=a.q.run,normalX=normal.active.x,normalY=normal.active.y;
 assert.equal(a.q.training,false);assert.equal(a.q.items.practice,false);assert.equal(a.q.items.enabled,true);assert.equal(normal.score,0);assert.equal(normal.lines,0);assert.ok(Number.isFinite(normal.gravity));assert.ok(Number.isFinite(normal.lockDelay));assert.equal(a.q.drag,null);
 a.dispatch('pointermove',{x:130});a.dispatch('pointerup',{x:130});a.advance(350);assert.equal(normal.active.x,normalX);
 a.advance(normal.gravity+100,100);assert.ok(normal.active.y>normalY,'real game resumes natural gravity');
 const saved=JSON.parse(a.store['glassfall-v1']);assert.equal(saved.tutorialCompleted,true);assert.equal(saved.endlessV1.normal.best,12345);assert.equal(saved.touchSensitivity10,7);assert.deepEqual(saved.unknownPreference,{keep:9});
});

test('training cannot fall or autolock; failed moves are observable without a penalty or record',()=>{
 const a=setup();a.q.start(false,true);const p=a.q.run.active,y=p.y;a.advance(60000,100);assert.equal(a.q.run.active,p);assert.equal(p.y,y);assert.equal(a.q.run.score,0);
 while(a.q.run.move(-1)){}a.observed.length=0;tap(a);assert.equal(a.observed.length,1);assert.equal(a.observed[0].success,false);assert.equal(a.q.run.over,false);assert.equal(a.q.run.score,0);
 const drop=a.q.run.dropDistance();a.q.run.move(0,drop);a.advance(20000,100);assert.equal(a.q.run.active,p,'grounded practice piece never auto-locks');
});

test('prepared line uses real move, drop, line-plan and clear score then discards all practice state',()=>{
 const a=setup(storeFixture);a.q.start(false,true);a.prepare(7);tap(a,220);a.observed.length=0;swipe(a,0,60);
 assert.equal(a.q.state,'clearing');assert.equal(a.observed.find(e=>e.action==='drop')?.lines,1);
 a.advance(500,20);assert.equal(a.q.run.lines,1);assert.ok(a.observed.some(e=>e.action==='clear'&&e.success&&e.lines===1));
 a.q.start(false,false);assert.equal(a.q.run.lines,0);assert.equal(a.q.run.score,0);assert.equal(a.q.run.board.flat().filter(Boolean).length,0);
 assert.equal(JSON.parse(a.store['glassfall-v1']).endlessV1.normal.best,12345);
});

test('pause hides observation and resume clears old inputs while CONTROL FINAL hashes remain frozen',()=>{
 const a=setup();a.q.start(false,true);a.dispatch('pointerdown');a.advance(100);a.q.pause();assert.equal(a.isPaused(),true);a.advance(500);assert.equal(a.observed.length,0);
 a.q.resume();a.dispatch('pointerup');assert.equal(a.isPaused(),false);assert.equal(a.observed.length,0);tap(a,220);assert.equal(a.observed.length,1);
 const source=fs.readFileSync(require.resolve('../dist/endless-app.js'),'utf8');
 for(const span of require('./helpers/control23-freeze.json')){const from=source.indexOf(span.start),to=source.indexOf(span.end,from);assert.ok(from>=0&&to>from);assert.equal(crypto.createHash('sha256').update(source.slice(from,to)).digest('hex'),span.sha256,span.name);}
});

test('stale practice wrappers cannot report into another tutorial or a completed normal game',()=>{
 const a=setup();a.q.start(false,true);const stale=a.q.run;a.q.start(false,true);const current=a.q.run;
 a.observed.length=0;stale.move(-1);stale.rotateDir(1);stale.hold();assert.equal(a.observed.length,0);assert.equal(a.q.run,current);
 tap(a);assert.equal(a.observed.length,1);a.complete();a.observed.length=0;current.move(1);current.rotateDir(1);a.q.action('left');a.q.action('hold');assert.equal(a.observed.length,0);
});
