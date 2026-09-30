const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('dist/native-ads.js','utf8');
function bridge(){
 const calls=[],events={},overlay={inert:false},panel={dataset:{view:'over'}},scenes=[];
 const doc={hidden:false,getElementById:id=>id==='overlay'?overlay:panel,addEventListener:(k,f)=>events[k]=f};
 const env={document:doc,CrayonAndroid:{beginGame:x=>calls.push(['begin',x]),activeTime:x=>calls.push(['tick',x]),endGame:x=>calls.push(['end',x])},BloomAudio:{scene:x=>scenes.push(x)},addEventListener:(k,f)=>events[k]=f};env.window=env;vm.runInNewContext(source,env);return {api:env.CrayonNativeAds,calls,doc,events,overlay,scenes};
}
test('web browser has no native ad API or side effects',()=>{const e={window:{}};vm.runInNewContext(source,e);assert.equal(e.window.CrayonNativeAds,undefined);});
test('only normal visible active ticks count, remainder flushes before result',()=>{
 const h=bridge();h.api.begin(false);h.api.tick(100);assert.deepEqual(h.calls,[['begin',false]]);
 h.api.begin(true);for(let i=0;i<10;i++)h.api.tick(100);h.doc.hidden=true;h.api.tick(100);h.doc.hidden=false;h.api.tick(55);h.api.end(true);
 assert.deepEqual(h.calls.slice(1),[['begin',true],['tick',1000],['tick',55],['end',true]]);assert.equal(h.overlay.inert,true);
 h.api.tick(100);assert.equal(h.calls.length,5);h.api.setBusy(false);assert.equal(h.overlay.inert,false);assert.equal(h.scenes.at(-1),'over');
});
test('blur flushes only accrued time and practice finish is excluded',()=>{
 const h=bridge();h.api.begin(true);h.api.tick(40);h.events.blur();h.api.end(false);assert.deepEqual(h.calls,[['begin',true],['tick',40],['end',false]]);
 h.doc.hidden=true;h.api.setBusy(false);assert.equal(h.scenes.at(-1),'paused');
});
test('game integration ends once after saved result and excludes paused/tutorial time',()=>{
 const {boot}=require('./helpers/adaptive-stable-harness.cjs');let events=[];
 const source=fs.readFileSync('dist/endless-app.js','utf8');
 const api="window.CrayonNativeAds={begin:x=>console.__ads.push(['begin',x]),tick:x=>console.__ads.push(['tick',x]),end:x=>console.__ads.push(['end',x])};\n";
 const original=console.__ads;console.__ads=events;
 try {
  const h=boot({appSource:api+source});h.q.start();h.q.update(20);h.q.pause();h.q.update(20);h.q.resume();h.q.finish();h.q.finish();
  assert.deepEqual(JSON.parse(JSON.stringify(events)),[['begin',true],['tick',20],['end',true]]);assert.match(h.panel(),/다시 하기/);
 } finally {if(original===undefined)delete console.__ads;else console.__ads=original;}
});
