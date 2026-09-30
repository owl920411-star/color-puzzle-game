'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({unsupported=false,resumeError=false}={}){
  let now=0,id=1,contextCount=0,buffers=0;
  const timers=new Map(),listeners=new Map(),nodes=new Set();
  const schedule=(fn,ms,kind='scheduler')=>{const n=id++;timers.set(n,{fn,at:now+ms,kind});return n;};
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  class Node{
    constructor(ctx,kind){this.ctx=ctx;this.kind=kind;this.gain=param();this.frequency=param();this.Q=param();this.onended=null;this.end=null;nodes.add(this);}
    connect(){}
    disconnect(){nodes.delete(this);}
    start(at){this.startedAt=at;}
    stop(at){if(this.end!==null)timers.delete(this.end);this.end=schedule(()=>{this.end=null;if(this.onended)this.onended();},at===undefined?0:Math.max(0,(at-this.ctx.currentTime)*1000),'source');}
  }
  class Context{
    constructor(){contextCount++;this.state='suspended';this.offset=0;this.epoch=now;this.destination={};this.sampleRate=8000;}
    get currentTime(){return this.offset+(this.state==='running'?(now-this.epoch)/1000:0);}
    resume(){if(resumeError)return Promise.reject(new Error('denied'));this.epoch=now;this.state='running';return Promise.resolve();}
    suspend(){this.offset=this.currentTime;this.state='suspended';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
    createGain(){return new Node(this,'gain');}
    createOscillator(){return new Node(this,'oscillator');}
    createBufferSource(){return new Node(this,'buffer-source');}
    createBiquadFilter(){return new Node(this,'filter');}
    createBuffer(c,n){buffers++;const a=new Float32Array(n);return{getChannelData:()=>a};}
  }
  const doc={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  const global={document:doc,setTimeout:schedule,clearTimeout:n=>timers.delete(n)};
  if(!unsupported)global.AudioContext=Context;
  vm.runInNewContext(fs.readFileSync('dist/bloom-audio.js','utf8'),{window:global});
  function advance(ms){const until=now+ms;let next;while((next=[...timers].filter(x=>x[1].at<=until).sort((a,b)=>a[1].at-b[1].at)[0])){now=next[1].at;timers.delete(next[0]);next[1].fn();}now=until;}
  function stall(ms){now+=ms;const due=[...timers].filter(x=>x[1].at<=now);for(const [n,event]of due){if(!timers.has(n))continue;timers.delete(n);event.fn();}}
  return {api:global.BloomAudio,advance,stall,timers,nodes,doc,listeners,counts:()=>({contexts:contextCount,buffers}),
    hide(value){doc.hidden=value;listeners.get('visibilitychange')?.();}};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
async function start(a,scene='home',settings={sound:true}){a.api.configure(settings);a.api.scene(scene);a.api.unlock();await settle();}

test('audio remains lazy until enabled user interaction, and repeated config/unlock reuse one context',async()=>{
 const a=fixture();a.api.scene('home');assert.equal(a.counts().contexts,0);a.api.configure({sound:false});assert.equal(a.api.unlock(),false);assert.equal(a.counts().contexts,0);
 const saved={sound:true,unrelated:'preserve'};a.api.configure(saved);assert.equal(a.counts().contexts,0);a.api.unlock();await settle();
 for(let i=0;i<1000;i++){a.api.configure(saved);a.api.unlock();}
 assert.equal(a.counts().contexts,1);assert.equal(a.counts().buffers,1);assert.equal(a.api.stats().timers,1);assert.equal(saved.unrelated,'preserve');
 assert.equal(a.api.stats().cycleBeats,128);const before=a.api.stats().effectsScheduled;assert.equal(a.api.effect('move'),true);assert.equal(a.api.stats().effectsScheduled,before+1);assert.equal(a.api.effect('unknown'),false);
});
test('home and game have distinct scores; 30 minutes of virtual scheduling stays bounded and clears nodes',async()=>{
 const a=fixture();await start(a);a.advance(120000);const homeScheduled=a.api.stats().scheduled;
 a.api.scene('game');const before=a.api.stats().scheduled;a.advance(120000);assert.ok(a.api.stats().scheduled-before>homeScheduled);
 a.advance(26*60000);assert.equal(a.api.stats().contextsCreated,1);assert.equal(a.api.stats().timers,1);
 assert.ok(a.api.stats().peakVoices<=28);assert.ok(a.api.stats().voices<=16);assert.ok(a.nodes.size<=51);
 a.api.clear();a.advance(1);await settle();assert.equal(a.api.stats().voices,0);assert.equal(a.api.stats().timers,0);assert.equal(a.nodes.size,3);assert.equal(a.timers.size,0);
});
test('master, BGM and SFX gates are independent and preserve backward-compatible sound setting',async()=>{
 const a=fixture();await start(a,'game',{sound:true,bgm:false});assert.equal(a.api.stats().timers,0);assert.equal(a.api.effect('drop'),true);assert.equal(a.api.stats().voices,2);
 a.api.configure({sound:true,bgm:false,sfx:false});assert.equal(a.api.stats().voices,0);assert.equal(a.api.effect('drop'),false);
 a.api.configure({sound:true,sfx:false});assert.equal(a.api.stats().timers,1);assert.equal(a.api.effect('good'),false);
 a.api.configure({sound:false});assert.equal(a.api.stats().voices,0);assert.equal(a.api.stats().timers,0);assert.equal(a.api.stats().contextState,'suspended');
 a.api.configure({sound:true});await settle();assert.equal(a.api.stats().timers,1);assert.equal(a.counts().contexts,1);
});
test('pause, visibility, gameover and destroy silence scheduled music without leaked timers',async()=>{
 const a=fixture();await start(a,'game');a.api.effect('combo',6);a.api.scene('paused');a.advance(1);await settle();assert.equal(a.api.stats().voices,0);assert.equal(a.api.stats().timers,0);
 a.api.scene('game');await settle();a.hide(true);a.advance(1);await settle();assert.equal(a.api.stats().contextState,'suspended');assert.equal(a.api.stats().timers,0);
 a.hide(false);await settle();assert.equal(a.api.stats().timers,1);assert.equal(a.counts().contexts,1);
 a.api.scene('over');assert.equal(a.api.stats().timers,0);assert.equal(a.api.effect('over'),true);a.advance(600);assert.equal(a.api.stats().voices,0);
 a.api.destroy();a.advance(1);await settle();assert.equal(a.nodes.size,0);assert.equal(a.listeners.size,0);assert.equal(a.api.unlock(),false);assert.equal(a.api.stats().destroyed,true);
});
test('all requested effects clean up, extreme combo power and rapid calls respect the voice cap',async()=>{
 const a=fixture();await start(a,'game',{sound:true,bgm:false});
 for(const name of ['rotate','hold','drop','clear','combo','good','bad','gameover','success']){assert.equal(a.api.effect(name,999),true);assert.ok(a.api.stats().voices>0);a.advance(1000);assert.equal(a.api.stats().voices,0);}
 for(let i=0;i<1000;i++)a.api.effect('combo',10000);
 assert.equal(a.api.stats().voices,28);assert.ok(a.api.stats().dropped>0);a.advance(1000);assert.equal(a.api.stats().voices,0);assert.equal(a.nodes.size,3);
});
test('stalled scheduling does not burst missed notes; missing audio and rejected resume never block',async()=>{
 const a=fixture();await start(a,'game');const before=a.api.stats().scheduled;a.stall(5000);assert.ok(a.api.stats().scheduled-before<=6);assert.equal(a.api.stats().timers,1);
 const unsupported=fixture({unsupported:true});await start(unsupported);assert.equal(unsupported.api.stats().contextsCreated,0);assert.equal(unsupported.api.effect('drop'),false);
 const denied=fixture({resumeError:true});await start(denied);assert.equal(denied.api.stats().timers,0);assert.equal(denied.api.effect('drop'),false);assert.equal(denied.api.stats().voices,0);
 denied.api.destroy();await settle();
});
test('built module matches source and contains no pointer handlers, external samples, or repeated intervals',()=>{
 assert.deepEqual(fs.readFileSync('src/bloom-audio.js'),fs.readFileSync('dist/bloom-audio.js'));
 const source=fs.readFileSync('src/bloom-audio.js','utf8');assert.doesNotMatch(source,/pointerdown|pointermove|setInterval\(|fetch\(|https?:/);
});

