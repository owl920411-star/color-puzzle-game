'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');

function setup({settleCancel=false}={}){
 const requests=[];let current=null,cancels=0;
 const Loading={create(options){return{
  run(){return new Promise(resolve=>{const request={resolve,result:null,cancelled:false};requests.push(request);current=request;options.show('<section>색칠 준비 중</section>');});},
  cancel(){if(!current)return;cancels++;const pending=current;current=null;pending.cancelled=true;if(settleCancel)pending.resolve({cancelled:true});}
 };}};
 const initial={'glassfall-v1':JSON.stringify({sound:false,bgm:true,sfx:false,haptics:true,effects:'light',touchSensitivity10:7,tutorialCompleted:true,unknownPreference:{keep:4},endlessV1:{normal:{best:12,plays:7}}}),'unrelated-key':'keep'};
 const app=boot({Loading,initial});
 return Object.assign(app,{requests,cancels:()=>cancels,resolve(index,result={cancelled:false}){requests[index].result=result;requests[index].resolve(result);if(current===requests[index])current=null;}});
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
const interruptions={menu:a=>a.q.menu(),blur:a=>a.dispatchWindow('blur'),visibility:a=>a.dispatchDocument('visibilitychange',{hidden:true}),pagehide:a=>a.dispatchWindow('pagehide')};

for(const [name,interrupt]of Object.entries(interruptions))test(`pending load ${name} cancellation never starts a late game or loses prior score/settings`,async()=>{
 const a=setup();a.q.start();a.q.action('drop');const earned=a.q.run.score,key=a.q.adaptive.recordKey();assert.equal(key,'normal-adaptive-v1-calm');assert.ok(earned>12);
 a.dispatch('pointerdown');a.advance(70);const pending=a.q.requestStart();assert.equal(a.q.state,'loading');assert.equal(a.q.drag,null);assert.equal(a.timers.size,0);
 assert.equal(JSON.parse(a.store['glassfall-v1']).endlessV1[key].best,earned);
 interrupt(a);assert.equal(a.q.state,'menu');assert.equal(a.cancels(),1);const preview=a.q.run;
 // Simulate an already-resolving preload that reports ready even after cancel.
 a.resolve(0,{cancelled:false,ready:true});await pending;a.advance(1500,100);assert.equal(a.q.state,'menu');assert.equal(a.q.run,preview);assert.equal(a.q.run.active,null);assert.equal(a.q.drag,null);
 const saved=JSON.parse(a.store['glassfall-v1']);assert.equal(saved.endlessV1[key].best,earned);assert.equal(saved.endlessV1.normal.best,12);assert.equal(saved.endlessV1.normal.plays,7);
 assert.equal(saved.sound,false);assert.equal(saved.bgm,true);assert.equal(saved.sfx,false);assert.equal(saved.haptics,true);assert.equal(saved.effects,'light');assert.equal(saved.touchSensitivity10,7);assert.equal(saved.tutorialCompleted,true);assert.deepEqual(saved.unknownPreference,{keep:4});assert.equal(a.store['unrelated-key'],'keep');
});

test('fresh load may finish while an older cancelled promise resolves last without replacing its game',async()=>{
 const a=setup();const old=a.q.requestStart();a.q.menu();const current=a.q.requestStart();assert.equal(a.requests.length,2);
 a.resolve(1,{cancelled:false,ready:true});await current;assert.equal(a.q.state,'playing');const game=a.q.run;a.q.action('left');const x=game.active.x;
 a.resolve(0,{cancelled:false,ready:true});await old;assert.equal(a.q.run,game);assert.equal(game.active.x,x);assert.equal(a.q.state,'playing');
});

test('old load cannot replace a newer pending load, duplicate start is ignored, and cancellation settles safely',async()=>{
 const a=setup();const old=a.q.requestStart();a.q.menu();const current=a.q.requestStart();const duplicate=a.q.requestStart();await duplicate;assert.equal(a.requests.length,2);
 a.resolve(0);await old;assert.equal(a.q.state,'loading');a.resolve(1);await current;assert.equal(a.q.state,'playing');
 const b=setup({settleCancel:true});const cancelled=b.q.requestStart();b.dispatchWindow('blur');await cancelled;assert.equal(b.q.state,'menu');assert.equal(b.requests[0].cancelled,true);
});

test('visible visibilitychange does not cancel an active load; returning from background needs a new start',async()=>{
 const a=setup();const ready=a.q.requestStart();a.dispatchDocument('visibilitychange',{hidden:false});assert.equal(a.q.state,'loading');assert.equal(a.cancels(),0);a.resolve(0);await ready;assert.equal(a.q.state,'playing');
 a.q.menu();const interrupted=a.q.requestStart();a.dispatchDocument('visibilitychange',{hidden:true});a.dispatchDocument('visibilitychange',{hidden:false});a.resolve(1);await interrupted;await settle();assert.equal(a.q.state,'menu');
 const userStart=a.q.requestStart();a.resolve(2);await userStart;assert.equal(a.q.state,'playing');assert.equal(a.q.run.score,0);
});
