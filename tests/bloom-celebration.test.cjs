'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
function fixture({failed=false, pending=false, reduced=false}={}) {
  let now=0, next=1, decodes=0;const timers=new Map();
  class Element {
    constructor(tag){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.hidden=false;this.style={setProperty(){}};this.classList={toggle(){}};if(tag==='img'){this.complete=!pending;this.naturalWidth=failed?0:320;this.decode=()=>{decodes++;return Promise.resolve();};}}
    setAttribute(k,v){this[k]=v;}
    appendChild(el){this.children.push(el);el.parentNode=this;return el;}
    removeChild(el){this.children.splice(this.children.indexOf(el),1);el.parentNode=null;}
    get childElementCount(){return this.children.length;}
  }
  const doc={createElement:tag=>new Element(tag)},host=new Element('div');
  const global={performance:{now:()=>now},setTimeout(fn,ms){const id=next++;timers.set(id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(fs.readFileSync('dist/bloom-celebration.js','utf8'),{window:global});
  const api=global.BloomCelebration.create({host,reduced:()=>reduced});
  function advance(ms){const target=now+ms;let t;while((t=[...timers].sort((a,b)=>a[1].at-b[1].at).find(x=>x[1].at<=target))){now=t[1].at;timers.delete(t[0]);t[1].fn();}now=target;}
  return {api,host,timers,advance,decodes:()=>decodes};
}
test('assets decode once and milestone celebrations reuse fixed DOM with bounded intensity', async()=>{
  const a=fixture();await a.api.preload();await a.api.preload();assert.equal(a.decodes(),2);
  const root=a.host.children[0],children=root.children.slice();
  assert.equal(a.api.celebrate({combo:1,lines:1}),false);
  for(const [combo,label] of [[2,'좋아!'],[3,'멋져!'],[4,'BLOOM!'],[6,'BLOOM!'],[98,'BLOOM!']]){
    a.advance(1050);assert.equal(a.api.celebrate({combo}),true);assert.equal(a.api.stats().lastEvent.label,label);assert.ok(Number(root.dataset.strength)<=5);
  }
  assert.equal(a.api.celebrate({combo:99}),false);
  assert.equal(a.api.stats().particles,12);assert.deepEqual(root.children,children);assert.equal(a.host.childElementCount,1);assert.equal(a.api.stats().timers,1);
  a.advance(820);assert.equal(a.api.stats().active,false);assert.equal(a.timers.size,0);
});
test('cooldown suppresses duplicate bursts but important milestone overrides safely',async()=>{
  const a=fixture();await a.api.preload();assert.equal(a.api.celebrate({combo:2}),true);
  assert.equal(a.api.celebrate({combo:2}),false);assert.equal(a.api.celebrate({combo:3}),true);
  assert.equal(a.api.celebrate({lines:4}),true);assert.equal(a.api.stats().lastEvent.label,'활짝!');
  assert.equal(a.api.celebrate({best:true}),true);assert.equal(a.api.stats().lastEvent.label,'새 기록!');assert.equal(a.timers.size,1);
  a.api.clear();assert.equal(a.timers.size,0);assert.equal(a.api.stats().active,false);
  a.api.destroy();assert.equal(a.host.childElementCount,0);assert.equal(a.api.celebrate({best:true}),false);
});
test('reduced motion keeps a brief fixed appearance and no residual timer',async()=>{
  const a=fixture({reduced:true});await a.api.preload();a.api.celebrate({combo:3});
  a.advance(449);assert.equal(a.api.stats().active,true);a.advance(1);assert.equal(a.api.stats().active,false);assert.equal(a.timers.size,0);
});
test('failed or timed out assets do not delay the game or expose broken-image cutins',async()=>{
  const failed=fixture({failed:true});assert.equal(await failed.api.preload(),false);assert.equal(failed.api.celebrate({combo:2}),false);assert.equal(failed.timers.size,0);
  const stalled=fixture({pending:true});const p=stalled.api.preload();stalled.advance(1800);assert.equal(await p,false);assert.equal(stalled.api.celebrate({combo:3}),false);assert.equal(stalled.timers.size,0);
  const removed=fixture({pending:true});const removedP=removed.api.preload();removed.api.destroy();assert.equal(await removedP,false);assert.equal(removed.timers.size,0);
});
test('source artifacts match built files and stylesheet never captures pointers',()=>{
  for(const f of ['bloom-celebration.js','bloom-celebration.css'])assert.deepEqual(fs.readFileSync('src/'+f),fs.readFileSync('dist/'+f));
  const css=fs.readFileSync('src/bloom-celebration.css','utf8');assert.match(css,/pointer-events:none!important/);assert.match(css,/prefers-reduced-motion/);assert.doesNotMatch(css,/filter:|backdrop-filter:|blur\(/);
});
