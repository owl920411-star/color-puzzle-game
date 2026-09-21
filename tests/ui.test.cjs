const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Minimal DOM adapter exercises actual app input/state handlers without claiming browser layout QA.
function harness(realCanvas=false,initialSaved=null){
 const all=[],byId={},raf=[],stored=new Map();let now=1000;let napi;if(initialSaved)stored.set('glassfall-v1',JSON.stringify(initialSaved));
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
 const previews=[0,1].map(i=>{const b=new El('','BUTTON');b.dataset.preview=String(i);return b;});
 const doc=new El();doc.body=new El();doc.getElementById=id=>byId[id];doc.querySelectorAll=s=>s==='[data-action]'?[...controls,byId.hold]:s==='.controls button'?controls:s==='[data-preview]'?previews:[];
 const win=new El();Object.assign(win,{devicePixelRatio:1,crypto:{getRandomValues:v=>{v[0]=123456;return v;}}});
 const context={window:win,document:doc,navigator:{},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},matchMedia:()=>({matches:false}),performance:{now:()=>now},requestAnimationFrame:f=>raf.push(f),crypto:win.crypto,Intl,Date,Math,Uint32Array,console};win.window=win;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/engine.js'),'utf8'),context);const instances=[];const OriginalGame=context.GlassEngine.Game;win.GlassEngine={...context.GlassEngine,Game:class extends OriginalGame{constructor(...args){super(...args);instances.push(this);}}};context.GlassEngine=win.GlassEngine;vm.runInContext(fs.readFileSync(require.resolve('../dist/progression.js'),'utf8'),context);win.GlassProgress=context.GlassProgress;vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'),'utf8'),context);
 function step(ms=16){now+=ms;const f=raf.shift();assert.ok(f,'animation frame remains scheduled');f(now);}
 function screen(a,mode,extra={}){const b=new El('','BUTTON');b.dataset=mode?{mode}:{screen:a,...extra};byId.screen.child.emit('click',{target:b});}
 function press(a,id=1){const b=a==='hold'?byId.hold:controls.find(b=>b.dataset.action===a);b.emit('pointerdown',{pointerId:id});b.emit('pointerup',{pointerId:id});}
 return{byId,doc,win,previews,step,advance:ms=>now+=ms,screen,press,controls,stored,get game(){return instances[instances.length-1];},render:()=>byId.board.raw?.toBuffer('image/png')};
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
test('regular mode stores chain records and compares the previous run only for the same seed',()=>{
 const h=harness();h.screen('start');h.game.maxChain=2;h.game.extra=5;h.game.score=200;h.step(180000);assert.match(h.byId.screen.child.innerHTML,/이 모드 최고 연쇄 2/);
 const saved=JSON.parse(h.stored.get('glassfall-v1'));assert.equal(saved.records.sprint.chain,2);assert.equal(saved.records.sprint.extra,5);
 h.screen('retry');h.game.score=250;h.step(180000);assert.match(h.byId.screen.child.innerHTML,/이전 기록보다 \+50점/);assert.match(h.byId.screen.child.innerHTML,/최고 연쇄 2/);
});
if(process.env.GLASS_RENDER_PATH){const h=harness(true);h.screen('tutorial');h.step();fs.writeFileSync(process.env.GLASS_RENDER_PATH,h.render());}
module.exports={harness};

test('replay comparisons persist, retain a higher best and restore identical pieces after reload',()=>{
 const h=harness();assert.doesNotMatch(h.byId.screen.child.innerHTML,/연구실|lab-list/);h.screen('start');
 const opening=JSON.stringify(h.game.active),seed=h.game.seed;
 Object.assign(h.game,{score:300,lines:2,extra:4,pieces:5,shards:24});h.step(180000);
 h.screen('retry');assert.equal(JSON.stringify(h.game.active),opening);assert.match(h.byId['replay-target'].textContent,/300점/);
 Object.assign(h.game,{score:350,lines:3,extra:6,pieces:6,shards:36});h.step(180000);
 assert.match(h.byId.screen.child.innerHTML,/\+50점/);assert.match(h.byId.screen.child.innerHTML,/\+1줄/);assert.match(h.byId.screen.child.innerHTML,/\+1.2개/);
 h.screen('retry');Object.assign(h.game,{score:200,pieces:0,shards:0});h.step(180000);
 const saved=JSON.parse(h.stored.get('glassfall-v1'));assert.equal(saved.runs[0].attempts,3);assert.equal(saved.runs[0].best,350);assert.equal(saved.runs[0].last.efficiency,0);assert.doesNotMatch(h.byId.screen.child.innerHTML,/NaN|Infinity/);
 const restored=harness(false,saved);assert.match(restored.byId.screen.child.innerHTML,/직전 판 기록에 재도전/);restored.screen('last-replay');assert.equal(restored.game.seed,seed);assert.equal(JSON.stringify(restored.game.active),opening);assert.match(restored.byId['replay-target'].textContent,/350점/);
 restored.game.score=351;restored.step(250);assert.match(restored.byId['replay-target'].textContent,/돌파 · \+1점/);
});
test('older saves retain scores and compare only known metrics; a different mode has no replay target',()=>{
 const h=harness(false,{best:{sprint:900},badges:{fracture:true},lab:{gap:{stars:3}},records:{sprint:{last:{seed:'OLD',score:400}}}});
 h.screen('last-replay');assert.equal(h.game.seed,'OLD');assert.match(h.byId['replay-target'].textContent,/400점/);h.game.score=450;h.step(180000);
 assert.match(h.byId.screen.child.innerHTML,/\+50점/);assert.doesNotMatch(h.byId.screen.child.innerHTML,/NaN|undefined/);
 const saved=JSON.parse(h.stored.get('glassfall-v1'));assert.equal(saved.best.sprint,900);assert.equal(saved.badges.fracture,true);assert.equal(saved.lab.gap.stars,3);
 h.screen('menu');h.screen('', 'endless');assert.doesNotMatch(h.byId.screen.child.innerHTML,/직전 판 기록에 재도전/);h.screen('start');assert.equal(h.byId['replay-target'].hidden,true);
});
test('a new seed does not inherit comparison metrics and recent run history is bounded',()=>{
 const runs=Array.from({length:12},(_,i)=>({mode:'sprint',seed:'OLD-'+i,best:100,attempts:1,last:{seed:'OLD-'+i,score:100}}));
 const h=harness(false,{runs});h.screen('start');h.game.score=50;h.step(180000);assert.match(h.byId.screen.child.innerHTML,/첫 기록/);
 let saved=JSON.parse(h.stored.get('glassfall-v1'));assert.equal(saved.runs.length,12);assert.equal(saved.runs[0].seed,'OLD-1');
 h.win.crypto.getRandomValues=v=>{v[0]=987654;return v;};h.screen('new');assert.equal(h.byId['replay-target'].hidden,true);h.step(180000);assert.match(h.byId.screen.child.innerHTML,/첫 기록/);
 h.step(1000);saved=JSON.parse(h.stored.get('glassfall-v1'));assert.equal(saved.runs.length,12);assert.equal(saved.runs.at(-1).attempts,1);
});

test('all new materials flow after touch drop, suspend during pause and return input to a fresh piece',()=>{
 for(const material of ['sand','water','jelly']){
  const h=harness();h.screen('',null,{material});assert.match(h.byId.screen.child.innerHTML,/소재 선택/);h.screen('start');assert.equal(h.game.material,material);
  const active=h.game.active,initial=JSON.stringify(active);const pad=h.byId.touchpad;
  touch(pad,'pointerdown',100,100);h.advance(50);touch(pad,'pointerup',100,180);assert.equal(h.game.active,null);assert.equal(h.game.pieces,1);
  h.byId.pause.emit('click');const frozen=JSON.stringify(h.game.board);h.step(60000);assert.equal(JSON.stringify(h.game.board),frozen);h.screen('resume');
  for(let i=0;i<100;i++)h.step(50);assert.ok(h.game.active);assert.equal(h.game.pieces,1);assert.equal(h.game.board.flat().filter(Boolean).length,4);
  h.byId.pause.emit('click');h.screen('retry');assert.equal(JSON.stringify(h.game.active),initial);assert.equal(h.game.material,material);
 }
});
test('a timed material clear finishes its settling and cascade before saving; replay scores are material-specific',()=>{
 const h=harness();h.screen('',null,{material:'jelly'});h.screen('start');h.game.board=Array.from({length:20},()=>Array(10).fill(null));
 const paint=h.game.active.cells[0].paint;for(let x=0;x<8;x++)h.game.board[19][x]={id:900+x,paint,mask:0,type:'O'};
 h.press('drop');h.step(180000);for(let i=0;i<150;i++)h.step(50);
 assert.match(h.byId.screen.child.innerHTML,/직전 동일 조건과 비교/);assert.ok(h.game.shards>=8);
 const saved=JSON.parse(h.stored.get('glassfall-v1'));assert.ok(saved.best['jelly:sprint']>0);assert.equal(saved.best.sprint,undefined);assert.equal(saved.runs[0].material,'jelly');
 const restored=harness(false,saved);restored.screen('last-replay');assert.equal(restored.game.material,'jelly');assert.equal(restored.game.seed,h.game.seed);
 restored.screen('menu');restored.screen('',null,{material:'water'});assert.doesNotMatch(restored.byId.screen.child.innerHTML,/직전 판 기록에 재도전/);restored.screen('start');assert.equal(restored.byId['replay-target'].hidden,true);
});

test('goals grant mastery once at finish, unlock a frame and preserve progress on reload',()=>{
 const h=harness(false,{mastery:{glass:200}});h.screen('start');assert.equal(h.byId['goal-panel'].hidden,false);Object.assign(h.game,{pieces:6,shards:16,score:600});h.step(250);assert.match(h.byId['goal-title'].textContent,/달성/);assert.equal(h.stored.get('glassfall-v1'),JSON.stringify({mastery:{glass:200}}),'uncompleted run does not bank XP');h.step(180000);
 let saved=JSON.parse(h.stored.get('glassfall-v1'));assert.equal(saved.mastery.glass,315);assert.match(h.byId.screen.child.innerHTML,/공명 테두리 해금/);h.step(1000);assert.equal(JSON.parse(h.stored.get('glassfall-v1')).mastery.glass,315);
 const restored=harness(false,saved);assert.match(restored.byId.screen.child.innerHTML,/Lv.3/);restored.screen('tutorial');restored.press('drop');for(let i=0;i<20;i++)restored.step(60);assert.equal(JSON.parse(restored.stored.get('glassfall-v1')).mastery.glass,315);
});
test('difficulty-specific replay records cannot overwrite standard scores and retries keep the terrain',()=>{
 const h=harness(false,{best:{sprint:1234}});h.screen('',null,{difficulty:'challenge'});h.screen('start');const initial=JSON.stringify(h.game.board);assert.ok(h.game.board.flat().filter(Boolean).length>0);h.game.score=500;h.step(180000);
 const saved=JSON.parse(h.stored.get('glassfall-v1'));assert.equal(saved.best.sprint,1234);assert.equal(saved.best['challenge:sprint'],500);assert.equal(saved.runs[0].difficulty,'challenge');h.screen('retry');assert.equal(JSON.stringify(h.game.board),initial);assert.match(h.byId['replay-target'].textContent,/500점/);
 h.screen('menu');h.screen('',null,{difficulty:'standard'});assert.doesNotMatch(h.byId.screen.child.innerHTML,/직전 판 기록에 재도전/);h.screen('start');assert.equal(h.game.board.flat().filter(Boolean).length,0);
});
test('light visual effects keep simulation timing and results identical to rich effects',()=>{
 const rich=harness(),light=harness();light.byId['effects-setting'].emit('click');assert.equal(JSON.parse(light.stored.get('glassfall-v1')).effects,'light');
 for(const h of [rich,light]){h.screen('',null,{material:'jelly'});h.screen('start');h.press('drop');for(let i=0;i<50;i++)h.step(50);}
 assert.equal(JSON.stringify(rich.game.board),JSON.stringify(light.game.board));assert.equal(rich.game.score,light.game.score);assert.equal(rich.byId.time.textContent,light.byId.time.textContent);assert.equal(JSON.stringify(rich.game.active),JSON.stringify(light.game.active));
});

test('focused play keeps goals accessible while pause settings preserve paused time and pad preference',()=>{
 const h=harness();h.screen('start');h.step(1000);h.byId.pause.emit('click');const time=h.byId.time.textContent;assert.match(h.byId.screen.child.innerHTML,/목표와 기록/);assert.match(h.byId.screen.child.innerHTML,/조작 패드 끔/);
 h.screen('pad-toggle');assert.equal(h.byId['play-section'].attrs['data-pad'],'show');assert.match(h.byId.screen.child.innerHTML,/조작 패드 켬/);h.screen('sound-toggle');assert.equal(h.byId.sound.attrs['aria-pressed'],'true');h.screen('help');assert.equal(h.byId['help-dialog'].open,true);h.byId['resume-help'].emit('click');assert.match(h.byId.screen.child.innerHTML,/계속하기/);h.step(60000);assert.equal(h.byId.time.textContent,time);
 h.screen('resume');h.step(1000);assert.notEqual(h.byId.time.textContent,time);h.press('drop');assert.equal(h.game.pieces,1);const restored=harness(false,JSON.parse(h.stored.get('glassfall-v1')));assert.equal(restored.byId['play-section'].attrs['data-pad'],'show');
});


test('both next-block cards open the correct preview, pause time and resume without changing the queue',()=>{
 const h=harness();h.screen('start');const queue=JSON.stringify(h.game.queue);
 for(const [i,button]of h.previews.entries()){
  button.emit('click');assert.equal(h.byId['preview-dialog'].open,true);assert.equal(h.byId['preview-title'].textContent,i===0?'다음 블록':'두 번째 다음 블록');const time=h.byId.time.textContent;
  h.step(10000);assert.equal(h.byId.time.textContent,time);h.doc.emit('keydown',{key:' '});assert.equal(h.game.pieces,0);h.byId['close-preview'].emit('click');assert.equal(h.byId.screen.hidden,true);assert.equal(JSON.stringify(h.game.queue),queue);
 }
 h.byId.pause.emit('click');h.previews[0].emit('click');h.byId['close-preview'].emit('click');assert.equal(h.byId.screen.hidden,false,'a previously paused game stays paused');
});
