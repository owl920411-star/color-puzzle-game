const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('dist/native-ads.js','utf8');
function bridge(){
 const calls=[],events={},overlay={inert:false},panel={dataset:{view:'over'}},scenes=[];
 const doc={hidden:false,getElementById:id=>id==='overlay'?overlay:panel};
 const env={document:doc,CrayonAndroid:{beginGame:x=>calls.push(['begin',x]),endGame:x=>calls.push(['end',x])},BloomAudio:{scene:x=>scenes.push(x)},addEventListener:(k,f)=>events[k]=f};env.window=env;vm.runInNewContext(source,env);return {api:env.CrayonNativeAds,calls,doc,events,overlay,scenes};
}
test('web browser has no native ad API or side effects',()=>{const e={window:{}};vm.runInNewContext(source,e);assert.equal(e.window.CrayonNativeAds,undefined);});
test('result input is locked only until native ad decision or close',()=>{
 const h=bridge();h.api.begin(true);h.api.end(true);assert.deepEqual(h.calls,[['begin',true],['end',true]]);assert.equal(h.overlay.inert,true);
 h.api.setBusy(false);assert.equal(h.overlay.inert,false);assert.equal(h.scenes.at(-1),'over');assert.equal(h.api.tick,undefined);
});
test('tutorial and practice results do not qualify, hidden audio stays paused',()=>{
 const h=bridge();h.api.begin(false);h.api.end(true);h.api.begin(true);h.api.end(false);
 assert.deepEqual(h.calls,[['begin',false],['end',false],['begin',true],['end',false]]);
 h.doc.hidden=true;h.api.setBusy(false);assert.equal(h.scenes.at(-1),'paused');
});
test('game integration ends once after saved result, without any time accounting',()=>{
 const {boot}=require('./helpers/adaptive-stable-harness.cjs');let events=[];
 const appSource=fs.readFileSync('dist/endless-app.js','utf8');
 const api="window.CrayonNativeAds={begin:x=>console.__ads.push(['begin',x]),end:x=>console.__ads.push(['end',x])};\n";
 const original=console.__ads;console.__ads=events;
 try {
  const h=boot({appSource:api+appSource});h.q.start();h.q.update(20);h.q.pause();h.q.update(20);h.q.resume();h.q.finish();h.q.finish();
  assert.deepEqual(JSON.parse(JSON.stringify(events)),[['begin',true],['end',true]]);assert.match(h.panel(),/다시 하기/);
 } finally {if(original===undefined)delete console.__ads;else console.__ads=original;}
});
