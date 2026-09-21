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
  closest(s){return s.split(',').map(v=>v.trim()).includes(this.tagName.toLowerCase())?this:null;}
  getContext(){if(napi){this.raw ||=napi.createCanvas(this.width,this.height);return this.raw.getContext('2d');}return fallback;}
  getBoundingClientRect(){return{width:300,height:600,left:0,top:0};}
  setPointerCapture(){} showModal(){this.open=true;}close(){this.open=false;this.emit('close');}
 }
 const html=fs.readFileSync(require.resolve('../dist/index.html'),'utf8');for(const match of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const el=new El(match[2],match[1].toUpperCase());for(const attr of ['width','height']){const m=match[0].match(new RegExp(attr+'="(\\d+)"'));if(m)el[attr]=+m[1];}}
 const controls=['left','right','rotate','drop'].map(a=>new El('', 'BUTTON',a));byId.hold.dataset.action='hold';
 const doc=new El();doc.getElementById=id=>byId[id];doc.querySelectorAll=s=>s==='[data-action]'?[...controls,byId.hold]:s==='.controls button'?controls:[];
 const win=new El();Object.assign(win,{devicePixelRatio:1,crypto:{getRandomValues:v=>{v[0]=123456;return v;}}});
 const context={window:win,document:doc,navigator:{},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},matchMedia:()=>({matches:false}),performance:{now:()=>now},requestAnimationFrame:f=>raf.push(f),crypto:win.crypto,Intl,Date,Math,Uint32Array,console};win.window=win;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/engine.js'),'utf8'),context);const instances=[];const OriginalGame=context.GlassEngine.Game;win.GlassEngine={...context.GlassEngine,Game:class extends OriginalGame{constructor(...args){super(...args);instances.push(this);}}};vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'),'utf8'),context);
 function step(ms=16){now+=ms;const f=raf.shift();assert.ok(f,'animation frame remains scheduled');f(now);}
 function screen(a,mode){const b=new El('','BUTTON');b.dataset=mode?{mode}:{screen:a};byId.screen.child.emit('click',{target:b});}
 function press(a,id=1){const b=a==='hold'?byId.hold:controls.find(b=>b.dataset.action===a);b.emit('pointerdown',{pointerId:id});b.emit('pointerup',{pointerId:id});}
 return{byId,doc,win,step,screen,press,controls,stored,get game(){return instances[instances.length-1];},render:()=>byId.board.raw?.toBuffer('image/png')};
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
 const h=harness();h.screen('start');const left=h.controls.find(b=>b.dataset.action==='left');left.emit('pointerdown',{pointerId:7});left.emit('pointercancel',{pointerId:7});const x=h.game.active.x,score=h.byId.score.textContent;h.step(200);assert.equal(h.game.active.x,x);assert.equal(h.byId.score.textContent,score);h.doc.emit('keydown',{key:' ',repeat:false,target:h.byId.sound});assert.equal(h.byId.score.textContent,score);
});
test('grounded adjustment does not bank gravity time and lock delay permits 600ms',()=>{
 const h=harness();h.screen('start');const g=h.game;
 g.active={type:'O',size:2,x:3,y:17,cells:[{x:0,y:0,id:999,mask:0,type:'O'},{x:1,y:0,id:1000,mask:0,type:'O'},{x:0,y:1,id:1001,mask:0,type:'O'},{x:1,y:1,id:1002,mask:0,type:'O'}]};
 g.board[19][3]={id:998,mask:0,type:'I'};
 for(let i=0;i<6;i++)h.step(100);assert.equal(g.pieces,0);
 h.press('right');assert.equal(g.active.y,17);
 for(let i=0;i<4;i++)h.step(100);assert.equal(g.active.y,17,'moving off a ledge should receive a fresh gravity interval');
});
test('direct position input selects exact columns without rotating or dropping',()=>{
 const h=harness();h.screen('start');const range=h.byId.position,y=h.game.active.y,shape=JSON.stringify(h.game.active.cells);
 for(const target of [Number(range.max),Number(range.min),3,4,3]){range.value=String(target);range.emit('input');assert.equal(h.game.active.x,target);assert.equal(h.game.active.y,y);assert.equal(JSON.stringify(h.game.active.cells),shape);}
 assert.equal(h.game.pieces,0);
});
test('board round trips return to the same column without accumulated drift',()=>{
 const h=harness();h.screen('start');const board=h.byId.board,x=h.game.active.x;
 board.emit('pointerdown',{pointerId:1,clientX:100,clientY:100});
 for(let cycle=0;cycle<5;cycle++){
  for(const px of [108,104,116,100,124,130,118,162,130,100])board.emit('pointermove',{pointerId:1,clientX:px,clientY:100});
  assert.equal(h.game.active.x,x);
 }
 board.emit('pointerup',{pointerId:1,clientX:100,clientY:100});assert.equal(h.game.active.x,x);
});
test('small initial vertical wobble does not capture horizontal gestures',()=>{
 const h=harness();h.screen('start');const board=h.byId.board,x=h.game.active.x,y=h.game.active.y;
 board.emit('pointerdown',{pointerId:1,clientX:100,clientY:100});
 board.emit('pointermove',{pointerId:1,clientX:108,clientY:109});
 board.emit('pointermove',{pointerId:1,clientX:170,clientY:110});
 assert.equal(h.game.active.x,x+2);assert.equal(h.game.active.y,y);
});
test('board taps never rotate and snap boundaries tolerate small finger jitter',()=>{
 const h=harness();h.screen('start');const board=h.byId.board,shape=JSON.stringify(h.game.active.cells),x=h.game.active.x;
 board.emit('pointerdown',{pointerId:1,clientX:100,clientY:100});board.emit('pointerup',{pointerId:1,clientX:105,clientY:102});assert.equal(JSON.stringify(h.game.active.cells),shape);
 board.emit('pointerdown',{pointerId:2,clientX:100,clientY:100});
 for(const px of [119,121,118,122,119]){board.emit('pointermove',{pointerId:2,clientX:px,clientY:100});assert.equal(h.game.active.x,x+1);}
 board.emit('pointermove',{pointerId:2,clientX:100,clientY:100});assert.equal(h.game.active.x,x);
});
test('a wall rebases board dragging so reversing needs only a normal small move',()=>{
 const h=harness();h.screen('start');const board=h.byId.board;
 board.emit('pointerdown',{pointerId:1,clientX:100,clientY:100});board.emit('pointermove',{pointerId:1,clientX:-500,clientY:100});assert.equal(h.game.active.x,0);
 board.emit('pointermove',{pointerId:1,clientX:-480,clientY:100});assert.equal(h.game.active.x,1);
 h.press('hold',2);const x=h.game.active.x;board.emit('pointermove',{pointerId:1,clientX:-440,clientY:100});assert.equal(h.game.active.x,x);
});
test('direct selection cannot teleport through an occupied cell',()=>{
 const h=harness();h.screen('start');const g=h.game,p=g.active,edge=Math.max(...p.cells.map(c=>c.x));const c=p.cells.find(c=>c.x===edge);
 g.board[p.y+c.y][p.x+edge+1]={type:'I',mask:0,id:999};const x=p.x;
 h.byId.position.value=h.byId.position.max;h.byId.position.emit('input');assert.equal(g.active.x,x);assert.equal(Number(h.byId.position.value),x);
});
test('range gesture ownership blocks input after the piece is replaced',()=>{
 const h=harness();h.screen('start');const range=h.byId.position;
 range.emit('pointerdown',{pointerId:1});h.press('drop',2);const x=h.game.active.x;
 range.value=range.max;range.emit('input');assert.equal(h.game.active.x,x);
 range.emit('pointerup',{pointerId:1});range.emit('pointerdown',{pointerId:3});range.value=range.max;range.emit('input');assert.equal(h.game.active.x,Number(range.max));
});
test('a fresh touch recovers range ownership after a lost release during blur',()=>{
 const h=harness();h.screen('start');const range=h.byId.position;
 range.emit('pointerdown',{pointerId:1});h.win.emit('blur');h.screen('resume');
 range.emit('pointerdown',{pointerId:2});range.value=range.max;range.emit('input');
 assert.equal(h.game.active.x,Number(range.max));
});
test('focused native range keeps keyboard events and rotation updates its legal bounds',()=>{
 const h=harness();h.screen('start');const range=h.byId.position,x=h.game.active.x;
 h.doc.emit('keydown',{key:'ArrowRight',repeat:false,target:range});assert.equal(h.game.active.x,x);
 h.press('rotate');const min=-Math.min(...h.game.active.cells.map(c=>c.x)),max=9-Math.max(...h.game.active.cells.map(c=>c.x));assert.equal(Number(range.min),min);assert.equal(Number(range.max),max);
 range.value=String(min);range.emit('input');assert.equal(h.game.active.x,min);
});
test('a second pointer cannot cancel a board gesture and deliberate down-drag stays soft',()=>{
 const h=harness();h.screen('start');const board=h.byId.board,x=h.game.active.x,y=h.game.active.y;
 board.emit('pointerdown',{pointerId:1,clientX:100,clientY:100});board.emit('pointerdown',{pointerId:2,clientX:200,clientY:100});board.emit('pointercancel',{pointerId:2});
 board.emit('pointermove',{pointerId:1,clientX:106,clientY:136});assert.equal(h.game.active.y,y+1);assert.equal(h.game.active.x,x);assert.equal(h.game.pieces,0);
});
if(process.env.GLASS_RENDER_PATH){const h=harness(true);h.screen('tutorial');h.step();fs.writeFileSync(process.env.GLASS_RENDER_PATH,h.render());}
module.exports={harness};
