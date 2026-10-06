'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
const Bridge=require('../dist/adaptive-bridge.js');
const source=()=>fs.readFileSync('dist/native-ads.js','utf8');
function bridge({endThrows=false}={}){
 const calls=[],events={},overlay={inert:false},panel={dataset:{view:'over'}},scenes=[];
 const doc={hidden:false,getElementById:id=>id==='overlay'?overlay:panel};
 const env={document:doc,CrayonAndroid:{beginGame:x=>calls.push(['begin',x]),endGame:x=>{calls.push(['end',x]);if(endThrows)throw Error('bridge unavailable');}},BloomAudio:{scene:x=>scenes.push(x)},addEventListener:(k,f)=>events[k]=f};
 env.window=env;vm.runInNewContext(source(),env);return {api:env.CrayonNativeAds,calls,doc,events,overlay,panel,scenes};
}
async function withNative(run){
 const previous=globalThis.CrayonNativeAds,calls=[];
 globalThis.CrayonNativeAds={begin:eligible=>calls.push(['begin',eligible]),end:eligible=>calls.push(['end',eligible])};
 try{return await run(calls);}finally{if(previous===undefined)delete globalThis.CrayonNativeAds;else globalThis.CrayonNativeAds=previous;}
}
const microtasks=()=>Promise.resolve();
test('ordinary browser has no native ad API or side effects',()=>{
 const env={window:{}};vm.runInNewContext(source(),env);assert.equal(env.window.CrayonNativeAds,undefined);
});
test('result input and audio return after native skip, load failure or dismissal',()=>{
 const h=bridge();h.api.begin(true);h.api.end(true);
 assert.deepEqual(h.calls,[['begin',true],['end',true]]);assert.equal(h.overlay.inert,true);assert.equal(h.scenes.at(-1),'paused');
 h.api.setBusy(false);assert.equal(h.overlay.inert,false);assert.equal(h.scenes.at(-1),'over');
 h.panel.dataset.view='menu';h.api.setBusy(false);assert.equal(h.scenes.at(-1),'home');
});
test('practice eligibility never becomes true at finish and hidden resume stays silent',()=>{
 const h=bridge();h.api.begin(false);h.api.end(true);h.api.setBusy(false);h.api.begin(true);h.api.end(false);
 assert.deepEqual(h.calls,[['begin',false],['end',false],['begin',true],['end',false]]);
 h.doc.hidden=true;h.api.setBusy(false);h.events['crayon-native-resume']();assert.equal(h.scenes.at(-1),'paused');
});
test('native resume during displayed ad keeps audio paused until dismissal',()=>{
 const h=bridge();h.api.begin(true);h.api.end(true);h.events['crayon-native-resume']();
 assert.equal(h.overlay.inert,true);assert.equal(h.scenes.at(-1),'paused');
 h.api.setBusy(false);h.events['crayon-native-resume']();assert.equal(h.scenes.at(-1),'over');
});
test('failed Java bridge call releases result immediately for retry',()=>{
 const h=bridge({endThrows:true});h.api.begin(true);assert.doesNotThrow(()=>h.api.end(true));
 assert.deepEqual(h.calls,[['begin',true],['end',true]]);assert.equal(h.overlay.inert,false);assert.equal(h.scenes.at(-1),'over');
});
test('privacy choices entry exists only when required in settings and opens once',()=>{
 const children=[],calls=[],panel={dataset:{view:'menu'},appendChild:n=>children.push(n)},overlay={inert:false};let observer;
 const doc={hidden:false,getElementById:id=>id==='panel'?panel:id==='overlay'?overlay:children.find(n=>n.id===id),createElement:()=>{
  const events={},button={events,addEventListener:(type,fn)=>events[type]=fn,remove(){children.splice(children.indexOf(button),1);}};return button;
 }};
 const env={document:doc,CrayonAndroid:{beginGame(){},endGame(){},showPrivacyOptions:()=>calls.push('privacy')},addEventListener(){},MutationObserver:class{constructor(fn){observer=fn;}observe(){}}};
 env.window=env;vm.runInNewContext(source(),env);
 env.CrayonNativeAds.setPrivacyOptionsRequired(true);assert.equal(children.length,0);
 panel.dataset.view='settings';observer();observer();assert.equal(children.length,1);assert.equal(children[0].textContent,'광고 개인정보 설정');
 children[0].events.click();assert.deepEqual(calls,['privacy']);
 panel.dataset.view='over';observer();assert.equal(children.length,0);
 panel.dataset.view='settings';observer();assert.equal(children.length,1);
 env.CrayonNativeAds.setPrivacyOptionsRequired(false);observer();assert.equal(children.length,0);
});
test('real frozen controller reports one completion only after score save and result render',async()=>withNative(async calls=>{
 const h=boot();let completed;
 globalThis.CrayonNativeAds.end=eligible=>{
  completed={eligible,state:h.q.state,panel:h.panel(),record:JSON.parse(h.store['glassfall-v1'])};calls.push(['end',eligible]);
 };
 h.q.start();h.q.run.score=123;h.q.pause();h.q.resume();h.q.finish();h.q.finish();
 assert.deepEqual(calls,[['begin',true]]);await microtasks();
 assert.deepEqual(calls,[['begin',true],['end',true]]);assert.equal(completed.state,'over');assert.match(completed.panel,/다시 하기/);
 const records=Object.values(completed.record.endlessV1);assert.equal(records[0].plays,1);assert.equal(records[0].last.score,123);
}));
test('menu, restart, pause, settings and checkpoint do not count as completed games',async()=>withNative(async calls=>{
 const h=boot();h.q.start();h.q.pause();h.menu('settings');h.q.resume();h.dispatchWindow('pagehide');await microtasks();
 assert.deepEqual(calls,[['begin',true]]);
 h.q.menu();h.q.start();h.q.start(true);await microtasks();assert.deepEqual(calls,[['begin',true],['begin',true],['begin',true]]);
 h.q.finish();await microtasks();assert.deepEqual(calls,[['begin',true],['begin',true],['begin',true],['end',true]]);
}));
test('tutorial creates no ad session and its following normal game counts once',async()=>withNative(async calls=>{
 const Tutorial={create:()=>({start(){},stop(){},setPaused(){},observe(){}})};
 const h=boot({Tutorial});h.q.start(false,true);assert.equal(h.q.training,true);h.q.finish();await microtasks();assert.deepEqual(calls,[]);
 h.q.start(false,false);h.q.finish();await microtasks();assert.deepEqual(calls,[['begin',true],['end',true]]);
}));
test('developer practice and guest sessions cannot qualify for an ad',async()=>withNative(async calls=>{
 const practice=boot();practice.q.start();practice.q.items.practice=true;practice.q.finish();await microtasks();
 assert.deepEqual(calls,[['begin',true],['end',false]]);
 const guest=boot({Bridge:{create:port=>Bridge.create({...port,playerDefaults:false})}});
 guest.adaptive('guest');guest.q.start();assert.equal(guest.q.adaptive.guest,true);guest.q.finish();await microtasks();
 assert.deepEqual(calls,[['begin',true],['end',false],['begin',false],['end',false]]);
}));
