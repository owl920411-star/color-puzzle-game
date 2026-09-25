'use strict';
// Real controller, normal/sand engines, Director and Bridge. DOM/canvas and scheduling are stand-ins.
// This is not a physical-phone render, input-latency, or sand-physics test.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const E=require('../dist/engine.js'),R=require('../dist/endless-rules.js'),B=require('../dist/block-items.js');
function boot(){
 let now=0;const nodes=new Map(),store={},timers=new Map();let tid=0;
 const draw=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}})}, {get(t,k){return k in t?t[k]:()=>{};}});
 function node(id=''){if(nodes.has(id))return nodes.get(id);const events={};const n={id,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},parentElement:{classList:{add(){},remove(){}}},clientWidth:390,clientHeight:740,offsetHeight:35,width:120,height:100,disabled:false,hidden:false,events,getContext:()=>draw,querySelectorAll:()=>[],addEventListener(t,f){(events[t]||=[]).push(f);},focus(){},getBoundingClientRect:()=>({left:0,top:0,width:270,height:540}),setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}};nodes.set(id,n);return n;}
 const actions=['hold','rotate','drop'].map(x=>{const n=node(x);n.dataset.action=x;return n;});
 const doc={body:{dataset:{},classList:{add(){},remove(){},toggle(){}}},documentElement:{style:{setProperty(){}}},getElementById:node,querySelector:node,createElement:()=>node('new'+nodes.size),querySelectorAll:s=>s==='[data-action]'?actions:[],addEventListener(){},hidden:false};
 const env={console,document:doc,location:{search:'?qa=1'},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}},navigator:{},performance:{now:()=>now},URLSearchParams,devicePixelRatio:1,requestAnimationFrame(){},getComputedStyle:()=>({paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0',gap:'6'}),setTimeout:(f,ms)=>{timers.set(++tid,{f,at:now+ms});return tid;},clearTimeout:id=>timers.delete(id),addEventListener(){},crypto:{getRandomValues(a){a.fill(1);}},GlassEngine:E,EndlessRules:R,BlockItems:B,MicroSand:require('../dist/sand-micro.js'),AdaptiveDirector:require('../dist/adaptive-director.js'),AdaptiveBridge:require('../dist/adaptive-bridge.js')};env.window=env;
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/endless-app.js'),'utf8'),env,{timeout:3000});
 function menu(a,v){const b={dataset:{menu:a,v:String(v??'')},disabled:false};const e={target:{closest:s=>s==='button[data-menu]'?b:null}};for(const f of node('panel').events.click||[])f(e);}
 function step(ms){for(let t=0;t<ms;t+=100){now+=Math.min(100,ms-t);env.__GLASSFALL_QA__.update(Math.min(100,ms-t));}}
 function adaptive(a,v){const b={dataset:{adaptive:a,v},disabled:false};for(const f of node('panel').events.click||[])f({target:{closest:s=>s==='[data-adaptive]'?b:null}});}
 return {adaptive,q:env.__GLASSFALL_QA__,nodes,store,menu,step,timers,advance(n){now+=n;}};
}
test('integrated new game defaults to observation and records actual hard drop',()=>{
 const a=boot();a.menu('start');assert.equal(a.q.adaptive.info().mode,'observe');assert.equal(a.q.adaptive.info().applied,1);
 a.step(500);a.q.action('drop');assert.equal(a.q.adaptive.info().placements,1);assert.equal(a.q.adaptive.info().hardDrops,1);
 a.menu('new');assert.equal(a.q.adaptive.info().placements,0);assert.equal(a.q.adaptive.info().applied,1);
});
test('integrated hold and rotation do not finish an adaptive placement',()=>{
 const a=boot();a.q.start();a.step(400);assert.equal(a.q.action('rotate'),true);assert.equal(a.q.action('hold'),true);
 assert.ok(a.q.run.held);assert.equal(a.q.adaptive.info().placements,0);a.step(300);a.q.action('drop');
 assert.equal(a.q.adaptive.info().placements,1);assert.equal(a.q.adaptive.session.lastPlacement.ms,700);
});
test('integrated pause freezes game and adaptive clocks and blocks drop',()=>{
 const a=boot();a.q.start();a.step(400);a.q.pause();const before=JSON.stringify(a.q.adaptive.info()),board=JSON.stringify(a.q.run.board);
 a.step(5000);assert.equal(a.q.action('drop'),false);assert.equal(a.q.elapsed,400);assert.equal(JSON.stringify(a.q.adaptive.info()),before);assert.equal(JSON.stringify(a.q.run.board),board);
 a.menu('resume');a.step(100);a.q.action('drop');assert.equal(a.q.adaptive.session.lastPlacement.ms,500);
});
test('integrated settings apply auto/off only to the next game',()=>{
 const a=boot();a.q.start();a.menu('settings');a.adaptive('open');assert.match(a.nodes.get('panel').innerHTML,/현재: 관찰/);
 const deadline=a.q.desert.nextRise;a.adaptive('mode','adaptive');a.adaptive('style','calm');assert.equal(a.q.adaptive.info().mode,'observe');assert.equal(a.q.desert.nextRise,deadline);
 a.adaptive('return');assert.match(a.nodes.get('panel').innerHTML,/HOW TO PLAY/);a.menu('back');assert.equal(a.q.state,'playing');
 a.q.start();assert.equal(a.q.adaptive.info().mode,'adaptive');assert.equal(a.q.adaptive.info().applied,1);assert.equal(a.q.adaptive.recordKey(),'normal-adaptive-v1-calm');
 a.menu('settings');a.adaptive('open');a.adaptive('mode','off');assert.equal(a.q.adaptive.info().mode,'adaptive');a.q.start();a.q.action('drop');assert.equal(a.q.adaptive.info().mode,'off');assert.equal(a.q.adaptive.info().placements,0);
});
test('integrated gameover persists fixed/adaptive bests separately and only one report',()=>{
 const a=boot();a.q.start();a.step(500);a.q.action('drop');const score=a.q.run.score;a.q.finish();a.q.finish();
 let store=JSON.parse(a.store['glassfall-v1']);assert.equal(store.endlessV1.normal.best,score);assert.equal(JSON.parse(a.store['glassfall-adaptive-v1']).history.length,1);
 a.menu('menu');a.menu('settings');a.adaptive('open');a.adaptive('mode','adaptive');a.adaptive('style','calm');a.q.start();a.step(500);a.q.action('drop');const adaptiveScore=a.q.run.score;a.q.finish();
 store=JSON.parse(a.store['glassfall-v1']);assert.equal(store.endlessV1.normal.best,score);assert.equal(store.endlessV1['normal-adaptive-v1-calm'].best,adaptiveScore);assert.ok(store['desertSurvival-normal-adaptive-v1-calm']);
});
test('integrated normal to sand to normal uses the real sand engine without observation',()=>{
 const a=boot();a.q.start();a.q.action('drop');a.q.pause();a.menu('menu');a.menu('sand');a.menu('start');assert.equal(a.q.kind,'sand');assert.equal(a.q.adaptive.info(),null);
 assert.equal(a.q.action('hold'),true);assert.equal(a.q.action('drop'),true);a.step(1000);assert.equal(a.q.adaptive.info(),null);a.q.finish();assert.ok(JSON.parse(a.store['glassfall-v1']).endlessV1.sand);
 a.menu('menu');a.menu('normal');a.menu('start');assert.equal(a.q.adaptive.info().mode,'observe');assert.equal(a.q.adaptive.info().placements,0);
});
test('integrated DEV LAB returns correctly and excludes forced play from learning',()=>{
 const a=boot();a.q.start();a.q.pause();a.q.devPanel();a.adaptive('open');assert.match(a.nodes.get('panel').innerHTML,/ADAPTIVE DESERT/);a.adaptive('return');assert.match(a.nodes.get('panel').innerHTML,/DEV LAB/);
 const savedBefore=a.store['glassfall-v1'];a.menu('itemscenario','oasis');assert.equal(a.q.adaptive.info().practice,true);a.menu('back');a.q.action('drop');a.step(500);a.q.finish();assert.equal(a.q.adaptive.profile.completed,0);assert.equal(a.store['glassfall-v1'],savedBefore);
});
test('integrated temporary game does not save bests or adaptive history',()=>{
 const a=boot();a.menu('settings');a.adaptive('open');a.adaptive('guest');a.q.start();a.step(500);a.q.action('drop');a.q.finish();assert.ok(!a.store['glassfall-adaptive-v1']);assert.ok(!JSON.parse(a.store['glassfall-v1']||'{}').endlessV1);assert.match(a.nodes.get('panel').innerHTML,/임시 플레이는 기록/);
});
for(const type of Object.keys(B.ITEMS))test(`integrated ${type} keeps natural scoring with Director loaded`,()=>{
 const a=boot();a.q.start();a.q.itemScenario(type);a.q.resume();const drop=a.q.run.dropDistance()*2;a.q.action('drop');a.step(500);assert.equal(a.q.adaptive.info().placements,0,'DEV practice is excluded');assert.equal(a.q.adaptive.info().practice,true);assert.equal(a.q.run.score,drop+(type==='mummy'?0:100));
});
test('integrated natural line clear reports exactly one completed placement',()=>{
 const a=boot();a.q.start();const g=a.q.run;g.board=B.blank();for(let x=0;x<10;x++)if(x<3||x>6)g.board[19][x]={id:++g.serial,type:'I',mask:0};
 g.active={type:'I',size:4,x:3,y:0,cells:[0,1,2,3].map(x=>({x,y:0,id:++g.serial,type:'I',mask:0}))};
 a.step(500);a.q.action('drop');assert.equal(a.q.state,'clearing');assert.equal(a.q.adaptive.info().placements,0);a.step(500);
 assert.equal(g.lines,1);assert.equal(a.q.adaptive.info().placements,1);assert.equal(a.q.adaptive.session.lastPlacement.lines,1);
});
test('integrated pointer tap, swipe rotation, hold and drop use unchanged handlers',()=>{
 const a=boot();a.q.start();const board=a.nodes.get('board');
 function gesture(x,y,dx,dy){for(const [type,xx,yy] of [['pointerdown',x,y],['pointermove',x+dx,y+dy],['pointerup',x+dx,y+dy]])for(const f of board.events[type]||[])f({button:0,pointerId:1,clientX:xx,clientY:yy,preventDefault(){}});}
 const x=a.q.run.active.x;gesture(40,100,0,0);assert.equal(a.q.run.active.x,x-1);
 const cells=JSON.stringify(a.q.run.active.cells);gesture(100,100,80,0);assert.notEqual(JSON.stringify(a.q.run.active.cells),cells);
 gesture(100,180,0,-80);assert.ok(a.q.run.held);gesture(100,100,0,90);assert.equal(a.q.adaptive.info().placements,1);
});
test('integrated first ground rise stays at three minutes and records ground separately',()=>{
 const a=boot();a.q.start();a.q.desert.nextRise=100;a.step(100);assert.equal(a.q.desert.rises,0,'LV0 must not rise early');
 a.q.jumpTime(177000);assert.equal(a.q.desert.nextRise,180000);a.step(2900);assert.equal(a.q.desert.rises,0);a.step(100);assert.equal(a.q.desert.rises,1);assert.equal(a.q.adaptive.info().events.ground,1);assert.equal(a.q.adaptive.info().placements,0);assert.equal(a.q.adaptive.info().applied,1);
});
