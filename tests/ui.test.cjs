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
 const controls=[...html.matchAll(/<button\b[^>]*data-action="([^"]+)"/g)].map(m=>m[1]).filter(a=>a!=='hold').map(a=>new El('', 'BUTTON',a));byId.hold.dataset.action='hold';
 const doc=new El();doc.getElementById=id=>byId[id];doc.querySelectorAll=s=>s==='[data-action]'?[...controls,byId.hold]:s==='.controls button'?controls:[];
 const win=new El();Object.assign(win,{devicePixelRatio:1,crypto:{getRandomValues:v=>{v[0]=123456;return v;}}});
 const context={window:win,document:doc,navigator:{},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},matchMedia:()=>({matches:false}),performance:{now:()=>now},requestAnimationFrame:f=>raf.push(f),crypto:win.crypto,Intl,Date,Math,Uint32Array,console};win.window=win;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/engine.js'),'utf8'),context);const instances=[];const OriginalGame=context.GlassEngine.Game;win.GlassEngine={...context.GlassEngine,Game:class extends OriginalGame{constructor(...args){super(...args);instances.push(this);}}};vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'),'utf8'),context);
 function step(ms=16){now+=ms;const f=raf.shift();assert.ok(f,'animation frame remains scheduled');f(now);}
 function screen(a,mode){const b=new El('','BUTTON');b.dataset=mode?{mode}:{screen:a};byId.screen.child.emit('click',{target:b});}
 function press(a,id=1){const b=a==='hold'?byId.hold:controls.find(b=>b.dataset.action===a);b.emit('pointerdown',{pointerId:id});b.emit('pointerup',{pointerId:id});}
 return{byId,doc,win,step,advance:ms=>now+=ms,screen,press,controls,stored,get game(){return instances[instances.length-1];},render:()=>byId.board.raw?.toBuffer('image/png')};
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
function touch(surface,type,x,y,id=1){surface.emit(type,{pointerId:id,clientX:x,clientY:y});}
function begin(h,surface='touchpad'){h.screen('start');const s=h.byId[surface];touch(s,'pointerdown',100,100);return s;}
test('short swipe moves one column; long swipe tracks distance on either surface',()=>{
 for(const surface of ['touchpad','board']){
  const h=harness(),s=begin(h,surface),x=h.game.active.x;
  h.advance(60);touch(s,'pointerup',114,101);assert.equal(h.game.active.x,x+1);
  touch(s,'pointerdown',100,100,2);touch(s,'pointermove',40,101,2);assert.equal(h.game.active.x,x-1);
  touch(s,'pointerup',40,101,2);assert.equal(h.game.active.x,x-1);assert.equal(h.game.pieces,0);
 }
});
test('horizontal round trips have no accumulated drift or jitter at snap boundaries',()=>{
 const h=harness(),s=begin(h),x=h.game.active.x;
 for(let cycle=0;cycle<5;cycle++){
  for(const px of [119,121,118,122,119]){touch(s,'pointermove',px,100);assert.equal(h.game.active.x,x+1);}
  for(const px of [130,118,162,130,100])touch(s,'pointermove',px,100);
  assert.equal(h.game.active.x,x);
 }
 touch(s,'pointerup',100,100);assert.equal(h.game.active.x,x);
});
test('small initial vertical wobble allows horizontal intent; diagonal strokes do not drop',()=>{
 const h=harness(),s=begin(h),x=h.game.active.x,y=h.game.active.y;
 touch(s,'pointermove',108,109);touch(s,'pointermove',170,110);assert.equal(h.game.active.x,x+2);assert.equal(h.game.active.y,y);
 touch(s,'pointerup',170,110);touch(s,'pointerdown',100,100,2);h.advance(60);touch(s,'pointerup',150,150,2);assert.equal(h.game.pieces,0);assert.equal(h.game.active.y,y);
});
test('horizontal intent cannot become rotation or hard drop during the same contact',()=>{
 for(const endY of [20,200]){
  const h=harness(),s=begin(h),shape=JSON.stringify(h.game.active.cells);
  touch(s,'pointermove',140,100);h.advance(80);touch(s,'pointerup',140,endY);
  assert.equal(JSON.stringify(h.game.active.cells),shape);assert.equal(h.game.pieces,0);
 }
});
test('short taps rotate once per release on both surfaces, including slight finger wobble',()=>{
 for(const surface of ['touchpad','board']){
  const h=harness(),s=begin(h,surface);let rotations=0;const rotate=h.game.rotate.bind(h.game);h.game.rotate=()=>{rotations++;return rotate();};
  assert.equal(rotations,0);h.advance(80);touch(s,'pointermove',106,104);assert.equal(rotations,0);
  touch(s,'pointerup',106,104);assert.equal(rotations,1);s.emit('click');touch(s,'pointerup',106,104);assert.equal(rotations,1);
  for(let id=2;id<=4;id++){touch(s,'pointerdown',100,100,id);h.advance(60);touch(s,'pointerup',100,100,id);assert.equal(rotations,id);}
  assert.equal(h.game.pieces,0);assert.equal(h.game.active.y,0);
 }
});
test('long holds, upward strokes and out-and-back diagonal drags never rotate',()=>{
 const h=harness(),s=begin(h);let rotations=0;const rotate=h.game.rotate.bind(h.game);h.game.rotate=()=>{rotations++;return rotate();};
 h.advance(400);touch(s,'pointerup',100,100);assert.equal(rotations,0);
 touch(s,'pointerdown',100,100,2);h.advance(60);touch(s,'pointermove',100,60,2);touch(s,'pointerup',100,100,2);assert.equal(rotations,0);
 touch(s,'pointerdown',100,100,3);touch(s,'pointermove',140,140,3);touch(s,'pointerup',100,100,3);assert.equal(rotations,0);
 touch(s,'pointerdown',100,100,4);touch(s,'pointermove',130,100,4);touch(s,'pointerup',100,100,4);assert.equal(rotations,0);
 touch(s,'pointerdown',100,100,5);h.advance(60);touch(s,'pointerup',100,100,5);assert.equal(rotations,1);
});
test('cancelled or replaced-piece taps cannot rotate; a new contact recovers immediately',()=>{
 for(const change of ['pointercancel','lostpointercapture','hold','drop','blur']){
  const h=harness(),s=begin(h);
  if(change==='blur'){h.win.emit('blur');h.screen('resume');}
  else if(change==='hold'||change==='drop')h.press(change,2);
  else s.emit(change,{pointerId:1});
  let rotations=0;const rotate=h.game.rotate.bind(h.game);h.game.rotate=()=>{rotations++;return rotate();};
  touch(s,'pointerup',100,100);assert.equal(rotations,0);
  touch(s,'pointerdown',100,100,3);h.advance(60);touch(s,'pointerup',100,100,3);assert.equal(rotations,1);
 }
});
test('fast downward swipe commits only on release, once per contact, on both surfaces',()=>{
 for(const surface of ['touchpad','board']){
  const h=harness(),s=begin(h,surface);h.advance(100);touch(s,'pointermove',103,180);
  assert.equal(h.game.pieces,0);assert.match(h.byId['pad-hint'].textContent,/손을 떼면/);
  touch(s,'pointerup',103,180);assert.equal(h.game.pieces,1);const id=h.game.active.cells[0].id;
  touch(s,'pointerup',103,180);s.emit('click');assert.equal(h.game.pieces,1);assert.equal(h.game.active.cells[0].id,id);
 }
 const h=harness(),s=begin(h);h.advance(250);touch(s,'pointerup',100,240);assert.equal(h.game.pieces,1,'a sufficiently fast longer flick remains valid at 250ms');
});
test('tutorial can be completed using only a downward swipe',()=>{
 const h=harness();h.screen('tutorial');const s=h.byId.touchpad;
 touch(s,'pointerdown',100,100);h.advance(80);touch(s,'pointerup',100,170);
 for(let i=0;i<15;i++)h.step(60);assert.match(h.byId.screen.child.innerHTML,/균열이 이어졌어요/);
});
test('slow downward drag lowers by distance and can never upgrade to hard drop',()=>{
 const h=harness(),s=begin(h),y=h.game.active.y;
 h.advance(180);touch(s,'pointermove',103,140);assert.equal(h.game.active.y,y+1);
 h.advance(40);touch(s,'pointermove',103,190);touch(s,'pointerup',103,190);
 assert.equal(h.game.active.y,y+3);assert.equal(h.game.pieces,0);
});
test('holding a ready flick clears its drop preview and soft drops instead',()=>{
 const h=harness(),s=begin(h);h.advance(100);touch(s,'pointermove',100,180);assert.match(h.byId['pad-hint'].textContent,/손을 떼면/);
 h.step(250);assert.match(h.byId['pad-hint'].textContent,/천천히/);
 touch(s,'pointerup',100,180);assert.equal(h.game.pieces,0);
});
test('retracted downward flick never drops and returning to origin removes ready feedback',()=>{
 const h=harness(),s=begin(h);h.advance(60);touch(s,'pointermove',100,190);
 h.advance(10);touch(s,'pointermove',100,150);touch(s,'pointerup',100,150);assert.equal(h.game.pieces,0);
 touch(s,'pointerdown',100,100,2);h.advance(60);touch(s,'pointermove',100,180,2);touch(s,'pointermove',100,100,2);
 assert.doesNotMatch(h.byId['pad-hint'].textContent,/손을 떼면/);touch(s,'pointerup',100,100,2);assert.equal(h.game.pieces,0);
});
test('wall and obstacle collisions do not accumulate travel or permit teleporting',()=>{
 const h=harness(),s=begin(h);
 touch(s,'pointermove',-500,100);assert.equal(h.game.active.x,0);
 touch(s,'pointermove',-480,100);assert.equal(h.game.active.x,1);
 touch(s,'pointerup',-480,100);
 const g=h.game,p=g.active,edge=Math.max(...p.cells.map(c=>c.x)),c=p.cells.find(c=>c.x===edge),x=p.x;
 g.board[p.y+c.y][p.x+edge+1]={type:'I',mask:0,id:999};
 touch(s,'pointerdown',100,100,2);touch(s,'pointerup',400,100,2);assert.equal(g.active.x,x);
});
test('reversing vertical intent cancels without turning a downward swipe into rotation',()=>{
 const h=harness(),s=begin(h),shape=JSON.stringify(h.game.active.cells);
 h.advance(60);touch(s,'pointermove',100,160);h.advance(60);touch(s,'pointerup',100,70);
 assert.equal(JSON.stringify(h.game.active.cells),shape);assert.equal(h.game.pieces,0);
 touch(s,'pointerdown',100,100,2);touch(s,'pointermove',100,85,2);h.advance(60);touch(s,'pointerup',100,180,2);
 assert.equal(h.game.pieces,0);assert.equal(h.game.active.y,0);
});
test('cancelled flicks never act and secondary pointers cannot steal or cancel ownership',()=>{
 for(const name of ['pointercancel','lostpointercapture']){
  const h=harness(),s=begin(h);h.advance(60);touch(s,'pointermove',100,180);s.emit(name,{pointerId:1});touch(s,'pointerup',100,180);assert.equal(h.game.pieces,0);
 }
 const h=harness(),s=begin(h),x=h.game.active.x;
 touch(s,'pointerdown',200,100,2);s.emit('pointercancel',{pointerId:2});touch(s,'pointerup',200,190,2);
 touch(s,'pointerup',130,100);assert.equal(h.game.active.x,x+1);assert.equal(h.game.pieces,0);
});
test('old contact cannot act on a replacement piece or after pause and fresh contact recovers',()=>{
 for(const change of ['hold','drop','blur']){
  const h=harness(),s=begin(h);h.advance(50);touch(s,'pointermove',100,180);
  if(change==='blur'){h.win.emit('blur');h.screen('resume');}else h.press(change,2);
  const count=h.game.pieces,id=h.game.active.cells[0].id;
  touch(s,'pointerup',100,180);assert.equal(h.game.pieces,count);assert.equal(h.game.active.cells[0].id,id);
  touch(s,'pointerdown',100,100,3);h.advance(60);touch(s,'pointerup',100,180,3);assert.equal(h.game.pieces,count+1);
 }
});
if(process.env.GLASS_RENDER_PATH){const h=harness(true);h.screen('tutorial');h.step();fs.writeFileSync(process.env.GLASS_RENDER_PATH,h.render());}
module.exports={harness};
