'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
  let now=0,id=0;const timers=new Map(),prepared=[],events=[],saved=[],finished=[],sounds=[];
  const doc={createElement:tag=>new Element(tag)};
  class Element{
    constructor(tag){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.classList={toggle(){}};this.listeners={};this.hidden=false;}
    appendChild(el){this.children.push(el);el.parentNode=this;return el;}
    removeChild(el){this.children.splice(this.children.indexOf(el),1);el.parentNode=null;}
    setAttribute(k,v){this[k]=v;}
    addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
    removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(f=>f!==fn);}
    click(){for(const fn of this.listeners.click||[])fn();}
  }
  const host=new Element('div'),env={performance:{now:()=>now},setTimeout(fn,ms){timers.set(++id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(fs.readFileSync('dist/bloom-tutorial.js','utf8'),{window:env});
  const api=env.BloomTutorial.create({host,prepareStep:i=>prepared.push(i),resetInput:()=>events.push('clear'),finish:e=>finished.push(e),saveCompleted:()=>saved.push(true),celebrate:e=>events.push(e),successSound:()=>sounds.push(true)});
  function advance(ms){const target=now+ms;let t;while((t=[...timers].sort((a,b)=>a[1].at-b[1].at).find(x=>x[1].at<=target))){now=t[1].at;timers.delete(t[0]);t[1].fn();}now=target;}
  const root=host.children[0],note=root.children[0],skip=root.children[1],start=note.children.at(-1);
  function observe(action,extra={}){return api.observe({action,success:true,source:'board',gesture:'tap',inputState:'PENDING',...extra});}
  function pass(index){
    if(index===0)observe('move',{dx:-1});
    if(index===1)observe('move',{dx:1});
    if(index===2){observe('move',{dx:1,inputState:'REPEATING'});advance(38);observe('move',{dx:1,inputState:'REPEATING'});}
    if(index===3)observe('rotate',{gesture:'rotate'});
    if(index===4)observe('hold',{gesture:'hold'});
    if(index===5)observe('drop',{gesture:'drop'});
    if(index===6)observe('drop',{source:'dropButton',gesture:'button'});
    if(index===7){observe('move',{dx:1});observe('drop',{gesture:'drop',lines:1});observe('clear',{lines:1});}
    advance(350);
  }
  function to(index){while(api.stats().step<index)pass(api.stats().step);}
  return{api,host,root,note,skip,start,timers,prepared,events,saved,finished,sounds,advance,observe,pass,to};
}
test('all ten steps require real results; completion uses explicit button and saves once',()=>{
  const a=fixture();a.api.start();
  for(let step=0;step<8;step++){assert.equal(a.api.stats().step,step);a.pass(step);}
  assert.equal(a.api.stats().step,8);assert.equal(a.api.stats().completed,8);assert.equal(a.start.hidden,true);
  a.advance(1599);assert.equal(a.api.stats().step,8);a.advance(1);assert.equal(a.api.stats().step,9);assert.equal(a.start.hidden,false);
  assert.equal(a.saved.length,0);a.start.click();a.start.click();assert.equal(a.saved.length,1);assert.equal(a.finished.length,1);assert.equal(a.finished[0].skipped,false);assert.equal(a.api.stats().active,false);assert.equal(a.timers.size,0);
  assert.deepEqual(a.prepared,[0,1,2,3,4,5,6,7,8,9]);assert.equal(a.sounds.length,8);assert.ok(a.events.some(e=>e&&e.combo===3));assert.ok(a.events.some(e=>e&&e.combo===4));
});
test('wrong direction, keyboard, failed action and repeat cannot pass a short-tap lesson',()=>{
  const a=fixture();a.api.start();
  for(const extra of [{dx:1},{dx:-1,source:'keyboard'},{dx:-1,inputState:'REPEATING'},{dx:-1,success:false}]){a.observe('move',extra);a.advance(0);assert.equal(a.api.stats().step,0);assert.equal(a.api.stats().success,false);}
  assert.equal(a.api.stats().wrong,4);assert.equal(a.saved.length,0);assert.equal(a.finished.length,0);
  a.observe('move',{dx:-1});assert.equal(a.api.stats().success,true);a.advance(349);assert.equal(a.api.stats().step,0);a.advance(1);assert.equal(a.api.stats().step,1);
});
test('long-press requires two timely successful moves in actual REPEATING state',()=>{
  const a=fixture();a.api.start();a.to(2);
  a.observe('move',{dx:-1,inputState:'REPEATING'});a.advance(200);a.observe('move',{dx:-1,inputState:'REPEATING'});assert.equal(a.api.stats().success,false);
  a.advance(38);a.observe('move',{dx:-1,inputState:'REPEATING'});assert.equal(a.api.stats().success,true);a.advance(350);assert.equal(a.api.stats().step,3);
});
test('HOLD and down-swipe steps reject buttons; button lesson rejects board swipes',()=>{
  const a=fixture();a.api.start();a.to(4);
  a.observe('hold',{source:'holdButton',gesture:'button'});a.advance(0);assert.equal(a.api.stats().success,false);a.pass(4);
  a.observe('drop',{source:'dropButton',gesture:'button'});a.advance(0);assert.equal(a.api.stats().success,false);a.pass(5);
  a.observe('drop',{gesture:'drop'});a.advance(0);assert.equal(a.api.stats().success,false);a.pass(6);assert.equal(a.api.stats().step,7);
});
test('line lesson needs actual manipulation and actual clear; wrong drop resets safely after stack',()=>{
  const a=fixture();a.api.start();a.to(7);const count=a.prepared.length;
  a.observe('drop',{gesture:'drop',lines:0});assert.equal(a.prepared.length,count);a.advance(0);assert.equal(a.prepared.length,count+1);
  a.observe('clear',{lines:1});assert.equal(a.api.stats().success,false);a.advance(0);
  a.observe('move',{dx:1});a.observe('drop',{gesture:'drop',lines:1});a.advance(500);assert.equal(a.api.stats().step,7);assert.equal(a.api.stats().success,false);
  a.observe('clear',{lines:1});assert.equal(a.api.stats().success,true);assert.match(a.note.children[3].textContent,/활짝/);
});
test('pause hides lesson and freezes success/demo timers, resume preserves remaining delay',()=>{
  const a=fixture();a.api.start();a.observe('move',{dx:-1});a.advance(100);a.api.setPaused(true);
  assert.equal(a.root.hidden,true);assert.equal(a.timers.size,0);a.advance(2000);assert.equal(a.api.stats().step,0);
  a.api.setPaused(false);a.advance(249);assert.equal(a.api.stats().step,0);a.advance(1);assert.equal(a.api.stats().step,1);
  a.to(8);a.advance(600);a.api.setPaused(true);a.advance(3000);assert.equal(a.api.stats().step,8);a.api.setPaused(false);a.advance(1000);assert.equal(a.api.stats().step,9);
});
test('skip marks complete and removes every task; restart reuses DOM, stop/destroy never save',()=>{
  const a=fixture();a.api.start();a.observe('move',{dx:-1});a.skip.click();assert.equal(a.saved.length,1);assert.equal(a.finished[0].skipped,true);assert.equal(a.timers.size,0);a.advance(2000);assert.equal(a.api.stats().active,false);
  const root=a.root;a.api.start();assert.equal(a.host.children[0],root);a.api.stop();assert.equal(a.saved.length,1);a.api.start();a.api.destroy();assert.equal(a.host.children.length,0);assert.equal(a.timers.size,0);assert.equal(a.api.start(),false);
});
test('source matches build and tutorial never installs game input handlers',()=>{
  for(const f of ['bloom-tutorial.js','bloom-tutorial.css'])assert.deepEqual(fs.readFileSync('src/'+f),fs.readFileSync('dist/'+f));
  const source=fs.readFileSync('src/bloom-tutorial.js','utf8');assert.doesNotMatch(source,/addEventListener\(['"](?:pointer|touch|mouse|key)|preventDefault|setPointerCapture|requestAnimationFrame/);
});
