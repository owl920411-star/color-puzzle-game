const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Minimal DOM adapter exercises actual app input/state handlers without claiming browser layout QA.
function harness(realCanvas=false){
 const all=[],byId={},raf=[],stored=new Map();let now=1000;let napi;
 if(realCanvas)napi=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
 const noop=()=>{},gradient={addColorStop:noop};const fallback=new Proxy({createLinearGradient:()=>gradient},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 class El{
  constructor(id='',tag='DIV',action){this.id=id;this.tagName=tag;this.dataset=action?{action}:{};this.listeners={};this.hidden=false;this.disabled=false;this.style={};this.textContent='';this.innerHTML='';this.attrs={};this.classList={add:noop,remove:noop,toggle:noop};this.width=360;this.height=720;this.open=false;all.push(this);if(id)byId[id]=this;}
  addEventListener(n,f){(this.listeners[n]||=[]).push(f)}
  emit(n,e={}){e={button:0,detail:1,preventDefault:noop,target:this,...e};for(const f of this.listeners[n]||[])f(e);return e;}
  setAttribute(k,v){this.attrs[k]=v;} querySelector(){return this.child ||=new El();}
  closest(s){return (s==='button'||s.includes('button,'))&&this.tagName==='BUTTON'?this:null;}
  getContext(){if(napi){this.raw ||=napi.createCanvas(this.width,this.height);return this.raw.getContext('2d');}return fallback;}
  getBoundingClientRect(){return{width:300,height:600,left:0,top:0};}
  setPointerCapture(){} showModal(){this.open=true;}close(){this.open=false;this.emit('close');}
 }
 const html=fs.readFileSync(require.resolve('../dist/index.html'),'utf8');for(const match of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const el=new El(match[2],match[1].toUpperCase());for(const attr of ['width','height']){const m=match[0].match(new RegExp(attr+'="(\\d+)"'));if(m)el[attr]=+m[1];}}
 const controls=['left','rotate','right','down','drop'].map(a=>new El('', 'BUTTON',a));byId.hold.dataset.action='hold';
 const doc=new El();doc.getElementById=id=>byId[id];doc.querySelectorAll=s=>s==='[data-action]'?[...controls,byId.hold]:s==='.controls button'?controls:[];
 const win=new El();Object.assign(win,{devicePixelRatio:1,crypto:{getRandomValues:v=>{v[0]=123456;return v;}}});
 const context={window:win,document:doc,navigator:{},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},matchMedia:()=>({matches:false}),performance:{now:()=>now},requestAnimationFrame:f=>raf.push(f),crypto:win.crypto,Intl,Date,Math,Uint32Array,console};win.window=win;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/engine.js'),'utf8'),context);win.GlassEngine=context.GlassEngine;vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'),'utf8'),context);
 function step(ms=16){now+=ms;const f=raf.shift();assert.ok(f,'animation frame remains scheduled');f(now);}
 function screen(a,mode){const b=new El('','BUTTON');b.dataset=mode?{mode}:{screen:a};byId.screen.child.emit('click',{target:b});}
 function press(a,id=1){const b=a==='hold'?byId.hold:controls.find(b=>b.dataset.action===a);b.emit('pointerdown',{pointerId:id});b.emit('pointerup',{pointerId:id});}
 return{byId,doc,win,step,screen,press,controls,stored,render:()=>byId.board.raw?.toBuffer('image/png')};
}
test('menu, tutorial, exact clear score and same-seed retry work through real UI handlers',()=>{
 const h=harness();h.step();assert.match(h.byId.screen.child.innerHTML,/GLASSFALL/);h.screen('tutorial');assert.equal(h.byId.screen.hidden,true);h.press('drop');for(let i=0;i<15;i++)h.step(60);assert.match(h.byId.screen.child.innerHTML,/균열이 이어졌어요/);assert.equal(h.byId.lines.textContent,1);assert.equal(h.byId.extra.textContent,3);assert.equal(h.byId.hold.disabled,true);assert.equal(h.byId.pause.disabled,true);h.screen('start-sprint');const seed=h.byId['seed-label'].textContent;h.press('drop');h.byId.pause.emit('click');h.screen('retry');assert.equal(h.byId['seed-label'].textContent,seed);assert.equal(h.byId.score.textContent,'0');
});
test('pointer click does not duplicate hard drop and OS key repeat cannot drop a second piece',()=>{
 const h=harness();h.screen('start');const drop=h.controls.find(b=>b.dataset.action==='drop');h.press('drop');const score=h.byId.score.textContent;drop.emit('click',{detail:1});assert.equal(h.byId.score.textContent,score);h.doc.emit('keydown',{key:' ',repeat:false});const score2=h.byId.score.textContent;h.doc.emit('keydown',{key:' ',repeat:true});assert.equal(h.byId.score.textContent,score2);
});
test('pause and background suspend time; a delayed visible frame uses real elapsed time',()=>{
 const h=harness();h.screen('start');h.step(1000);h.step(1000);const before=h.byId.time.textContent;h.byId.pause.emit('click');h.step(60000);assert.equal(h.byId.time.textContent,before);h.screen('resume');h.step(1000);assert.notEqual(h.byId.time.textContent,before);h.doc.hidden=true;h.doc.emit('visibilitychange');assert.match(h.byId.screen.child.innerHTML,/잠시 쉬어가세요/);h.step(99999);h.doc.hidden=false;h.screen('resume');h.step(180000);assert.match(h.byId.screen.child.innerHTML,/빛나는 3분/);
});
test('cancelled held controls stop repeat, and Space on a focused button is not intercepted',()=>{
 const h=harness();h.screen('start');const down=h.controls.find(b=>b.dataset.action==='down');down.emit('pointerdown',{pointerId:7});down.emit('pointercancel',{pointerId:7});const score=h.byId.score.textContent;h.step(200);assert.equal(h.byId.score.textContent,score);h.doc.emit('keydown',{key:' ',repeat:false,target:h.byId.sound});assert.equal(h.byId.score.textContent,score);
});
if(process.env.GLASS_RENDER_PATH){const h=harness(true);h.screen('tutorial');h.step();fs.writeFileSync(process.env.GLASS_RENDER_PATH,h.render());}
module.exports={harness};
