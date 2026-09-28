'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function setup(saved={},options={}){
 let gesture=false,app,created=0;const resumes=[],gains=[];
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){},start(){},stop(){}});
 class AudioContext{
  constructor(){created++;this.state='suspended';this.sampleRate=8000;this.destination={};this.authorized=false;}
  get currentTime(){return (app?.now||0)/1000;}
  resume(){resumes.push({gesture,scene:app?.audio.stats().scene});if(gesture)this.authorized=true;
   if(!this.authorized)return options.pending?new Promise(()=>{}):Promise.reject(Error('gesture required'));
   this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
  createGain(){const n=node();gains.push(n);return n;}
  createOscillator(){return node();}createBufferSource(){return node();}createBiquadFilter(){return node();}
  createBuffer(c,n){return{getChannelData:()=>new Float32Array(n)};}
 }
 const initial=saved===null?{}:{'glassfall-v1':JSON.stringify(saved),'unrelated':'keep'};
 app=boot({initial,AudioContext,Loading:options.Loading});
 return Object.assign(app,{resumes,gains,created:()=>created,gesture(fn){gesture=true;try{return fn();}finally{gesture=false;}}});
}
const cases=[['new storage',null],['legacy missing sound',{tutorialCompleted:true}],['sound ON',{sound:true}],['sound OFF',{sound:false}],['BGM OFF',{bgm:false}],['SFX OFF',{sfx:false}]];
for(const [name,settings]of cases)test(`audio migration ${name}: defaults, stored choices and UI agree`,async()=>{
 const preserved={tutorialCompleted:true,touchSensitivity10:7,endlessV1:{normal:{best:34567}},adaptiveV1:{keep:[1,2]},unknown:{keep:1}};
 const before=settings===null?null:{...preserved,...settings};const a=setup(before),stored=JSON.parse(a.store['glassfall-v1']);
 for(const key of ['sound','bgm','sfx'])assert.equal(stored[key],settings?.[key]!==false);
 if(before){for(const key of Object.keys(preserved))assert.deepEqual(stored[key],before[key]);assert.equal(a.store.unrelated,'keep');}
 assert.equal(a.created(),0,'no context before a gesture');a.menu('settings');
 for(const key of ['sound','bgm','sfx'])assert.match(a.panel(),new RegExp(`data-menu="${key}" aria-pressed="${stored[key]}"`));
 if(stored.sound===false){assert.match(a.panel(),/data-menu="bgm" aria-pressed="true" disabled/);assert.match(a.panel(),/전체 소리가 꺼져/);}
 a.gesture(()=>a.menu('back'));a.gesture(()=>a.menu('start'));await settle();const s=a.audio.stats();
 assert.equal(s.sound,stored.sound);assert.equal(s.bgm,stored.bgm);assert.equal(s.sfx,stored.sfx);
 if(!stored.sound){assert.equal(s.scheduled,0);assert.equal(s.contextsCreated,0);assert.equal(s.unlocked,false);return;}
 assert.equal(s.contextState,'running');assert.equal(s.scene,'game');assert.equal(s.unlocked,true);assert.equal(s.contextsCreated,1);
 assert.equal(s.musicScheduled>0,stored.bgm);a.q.action('rotate');assert.equal(a.audio.stats().effectsScheduled>0,stored.sfx);
 assert.deepEqual(a.gains.slice(0,3).map(x=>x.gain.value),[.64,.30,.65]);
});
test('master OFF preserves independent choices across toggles and reload',async()=>{
 const a=setup({sound:false,bgm:false,sfx:true});a.menu('settings');a.gesture(()=>a.menu('sound'));assert.equal(a.audio.stats().sound,true);
 assert.equal(a.audio.stats().bgm,false);a.menu('sound');const stored=JSON.parse(a.store['glassfall-v1']);
 assert.deepEqual([stored.sound,stored.bgm,stored.sfx],[false,false,true]);const b=setup(stored);assert.equal(b.audio.stats().sound,false);assert.equal(b.audio.stats().bgm,false);
});
test('START click resumes in the gesture before loading; cancelled load cannot start late',async()=>{
 let resolve,atLoad;const Loading={create:()=>({run(){atLoad=a.resumes.at(-1);return new Promise(r=>resolve=r);},cancel(){}})};
 const a=setup({sound:true,tutorialCompleted:true},{Loading});const pending=a.gesture(()=>a.q.requestStart());
 assert.equal(atLoad.gesture,true);assert.equal(a.q.state,'loading');a.q.menu();resolve({cancelled:false});await pending;await settle();
 assert.equal(a.q.state,'menu');assert.equal(a.audio.stats().scene,'home');assert.equal(a.audio.stats().contextsCreated,1);
});
test('pending policy-blocked resume can be retried inside START gesture',async()=>{
 const a=setup({sound:true},{pending:true});a.q.start();await settle();assert.equal(a.audio.stats().contextState,'suspended');
 a.q.pause();a.gesture(()=>a.menu('resume'));await settle();assert.equal(a.audio.stats().contextState,'running');assert.ok(a.audio.stats().scheduled>0);
});
test('HOME, GAME, PAUSE, RESUME and background recovery keep one context',async()=>{
 const a=setup({sound:true});a.gesture(()=>a.dispatchDocument('pointerdown'));await settle();assert.equal(a.audio.stats().scene,'home');assert.ok(a.audio.stats().musicScheduled>0);
 a.gesture(()=>a.menu('start'));await settle();a.q.pause();await settle();assert.equal(a.audio.stats().contextState,'suspended');assert.equal(a.audio.stats().voices,0);
 a.gesture(()=>a.menu('resume'));await settle();assert.equal(a.audio.stats().contextState,'running');
 a.dispatchDocument('visibilitychange',{hidden:true});await settle();assert.equal(a.audio.stats().contextState,'suspended');
 a.dispatchDocument('visibilitychange',{hidden:false});a.gesture(()=>a.menu('resume'));await settle();assert.equal(a.audio.stats().contextState,'running');
 a.q.pause();a.gesture(()=>a.menu('menu'));await settle();assert.equal(a.audio.stats().scene,'home');assert.equal(a.audio.stats().contextsCreated,1);assert.ok(a.audio.stats().musicScheduled>0);
});
async function game(){const a=setup({sound:true,bgm:false,tutorialCompleted:true});a.gesture(()=>a.menu('start'));await settle();return a;}
for(const [event,action]of [['rotate','rotate'],['hold','hold'],['drop','drop']])test(`real game ${event} creates effect voices`,async()=>{
 const a=await game();a.q.action(action);assert.ok(a.audio.stats().effectEvents[event]>0);assert.ok(a.audio.stats().effectVoices>0);
});
test('real line clear and combo schedule effect voices',async()=>{
 const a=await game();
 for(let i=0;i<2;i++){
  const g=a.q.run;g.board[19]=Array.from({length:10},(_,x)=>({type:'I',mask:0,id:900+x}));
  a.q.resolveNormal({rows:[19],cells:g.board[19].map((cell,x)=>({x,y:19,cell})),itemAt:0});
 }
 assert.ok(a.audio.stats().effectEvents.clear>=8);assert.ok(a.audio.stats().effectEvents.combo>=3);
});
test('real good item activation creates effect voices',async()=>{
 const a=await game();a.q.itemScenario('oasis');a.q.resume();await settle();a.q.action('drop');a.step(300);
 assert.ok(a.audio.stats().effectEvents.good>=3);
});
test('real bad item expiry creates effect voices',async()=>{
 const a=await game();a.q.itemScenario('seal');a.q.resume();await settle();a.step(15000);
 assert.ok(a.q.items.stats.failed>0);assert.ok(a.audio.stats().effectEvents.bad>=3,JSON.stringify(a.audio.stats()));
});
test('real gameover schedules its effect, and lateral movement stays silent',async()=>{
 const a=await game();a.q.action('left');a.q.action('right');assert.equal(a.audio.stats().effectsScheduled,0);
 a.q.finish();assert.ok(a.audio.stats().effectEvents.over>=4);assert.equal(a.audio.stats().scene,'over');
});
