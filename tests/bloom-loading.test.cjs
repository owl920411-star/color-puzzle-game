'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/bloom-loading.js','utf8');
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function fixture({prepare=()=>Promise.resolve(true),reduced=false}={}){
 let now=0,serial=0,maxTimers=0;const timers=new Map(),screens=[];
 const root={performance:{now:()=>now},setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,at:now+ms});maxTimers=Math.max(maxTimers,timers.size);return id;},clearTimeout(id){timers.delete(id);}};
 vm.runInNewContext(source,{window:root});
 const api=root.BloomLoading.create({show:html=>screens.push(html),prepare,reduced:()=>reduced});
 function advance(ms){const target=now+ms;let next;while((next=[...timers].sort((a,b)=>a[1].at-b[1].at).find(([,t])=>t.at<=target))){now=next[1].at;timers.delete(next[0]);next[1].fn();}now=target;}
 return{api,advance,timers,screens,global:root.BloomLoading,get maxTimers(){return maxTimers;}};
}
test('warm preparation shows one tip and finishes after only 180ms with one timer',async()=>{
 const a=fixture(),p=a.api.run();assert.equal(a.api.stats().active,true);await flush();
 assert.match(a.screens.at(-1),/준비됐어요!/);assert.equal(a.global.TIPS.filter(t=>a.screens[0].includes(t)).length,1);
 a.advance(179);assert.equal(a.api.stats().active,true);a.advance(1);const result=await p;
 assert.equal(result.elapsed,180);assert.equal(result.ready,true);assert.equal(result.cancelled,false);assert.equal(a.maxTimers,1);assert.equal(a.timers.size,0);
});
test('cold readiness finishes immediately when ready after the short minimum',async()=>{
 const d=deferred(),a=fixture({prepare:()=>d.promise}),p=a.api.run();await flush();a.advance(670);d.resolve(true);await flush();
 const result=await p;assert.equal(result.elapsed,670);assert.equal(result.ready,true);assert.equal(a.timers.size,0);
});
test('stalled and rejected preparation fail open within bounded time without a lingering timer',async()=>{
 const d=deferred(),a=fixture({prepare:()=>d.promise}),p=a.api.run();await flush();a.advance(1200);
 const timed=await p;assert.equal(timed.elapsed,1200);assert.equal(timed.ready,false);assert.equal(a.api.stats().active,false);
 const count=a.screens.length;d.reject(new Error('late decode failure'));await flush();assert.equal(a.screens.length,count);assert.equal(a.timers.size,0);
 const b=fixture({prepare:()=>Promise.reject(new Error('decode failure'))}),q=b.api.run();await flush();b.advance(180);
 assert.equal((await q).ready,false);assert.equal(b.timers.size,0);
 const c=fixture({prepare:()=>false}),r=c.api.run();await flush();c.advance(180);assert.equal((await r).ready,false);
});
test('cancel and overlapping runs settle all callers and ignore previous preparation',async()=>{
 const old=deferred(),fresh=deferred();let calls=0;const a=fixture({prepare:()=>++calls===1?old.promise:fresh.promise});
 const first=a.api.run();await flush();a.advance(70);const second=a.api.run();await flush();
 assert.equal((await first).cancelled,true);assert.equal(a.api.stats().active,true);
 const count=a.screens.length;old.resolve(true);await flush();assert.equal(a.screens.length,count);
 a.advance(50);a.api.cancel();const r=await second;assert.equal(r.cancelled,true);assert.equal(r.elapsed,50);assert.equal(a.timers.size,0);
 fresh.resolve(true);await flush();assert.equal(a.screens.length,count);assert.equal(a.api.stats().cancelled,2);assert.equal(a.maxTimers,1);
});
test('tips are frozen data and presentation preserves official art with reduced-motion support',async()=>{
 const a=fixture({reduced:true}),p=a.api.run();await flush();assert.equal(a.global.TIPS.length,9);assert.ok(Object.isFrozen(a.global.TIPS));
 const html=a.screens[0];assert.match(html,/bloom-home-hero.webp/);assert.match(html,/bloom-home-logo.webp/);assert.match(html,/data-motion="reduced"/);
 assert.doesNotMatch(html,/<button|<canvas|\d+%|onpointer|onclick/);a.api.cancel();await p;
});
test('loading distribution equals source and cannot schedule a gameplay or animation loop',()=>{
 for(const file of ['bloom-loading.js','bloom-loading.css'])assert.deepEqual(fs.readFileSync('src/'+file),fs.readFileSync('dist/'+file));
 assert.doesNotMatch(source,/addEventListener|requestAnimationFrame|setInterval|localStorage|run\.move|dispatchEvent/);
 const css=fs.readFileSync('dist/bloom-loading.css','utf8');assert.match(css,/prefers-reduced-motion/);assert.doesNotMatch(css,/infinite|filter:\s*blur/);
});
