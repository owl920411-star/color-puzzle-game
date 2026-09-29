'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/engine.js'),R=require('../dist/endless-rules.js'),T=require('../dist/toy-blocks.js');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
function game(){const g=new R.NormalGame('production-toys');return{g,t:new T.System(g)};}
function piece(g,t,kind,shape='O'){
  const p=t.makePiece(kind);p.type=shape;p.size=shape==='I'?4:shape==='O'?2:3;
  p.cells=E.SHAPES[shape].map(([x,y],i)=>({x,y,id:++g.serial,type:shape,mask:0,toy:{...p.toy,face:i===0,crayon:kind==='doodle'&&i===1}}));
  p.x=3;p.y=0;g.active=p;return p;
}
function complete(t){let n=0;while(t.busy&&n++<400){t.advance(10);t.update(10);}assert.ok(!t.busy,'toy action must finish');}
function signature(p){return{type:p.type,cells:p.cells.map(({x,y,mask})=>({x,y,mask}))};}
test('initial toy and extra periodic pieces preserve 28 normal pieces and seven-bag RNG',()=>{
  const plain=new R.NormalGame('production-toys'),{g,t}=game();
  assert.equal(g.active.toy.kind,'bouncy');
  const actual=[];for(let i=0;i<32;i++){g.spawn();if(!g.active.toy)actual.push(signature(g.active));if(i===6||i===14||i===22)t.advance(60000);}
  const expected=[];for(let i=0;i<actual.length;i++){expected.push(signature(plain.active));plain.spawn();}
  assert.deepEqual(actual,expected);assert.ok(actual.length>=28);
  assert.deepEqual(t.clock.events.filter(e=>e.event==='spawn').map(e=>e.reservedAt),[0,60000,120000,180000]);
});
test('exact minute queues one toy, leaves the current piece untouched, coalesces missed minutes',()=>{
  const {g,t}=game(),first=g.active;t.advance(59999);assert.equal(g.queue.filter(p=>p.toy).length,0);
  t.advance(1);assert.equal(g.active,first);assert.equal(g.queue[0].toy.kind,'fat');
  t.advance(240000);assert.equal(g.queue.filter(p=>p.toy).length,1);assert.equal(t.clock.skipped,4);
  g.spawn();assert.equal(g.active.toy.kind,'fat');assert.equal(t.clock.pending,null);
});
test('hold, retrieval and rotation retain a toy and never duplicate it',()=>{
  const {g,t}=game(),id=g.active.toy.id;assert.ok(g.rotateDir(-1));assert.equal(g.active.toy.id,id);
  assert.ok(g.hold());assert.equal(g.held.toy.id,id);assert.ok(!g.active.toy);
  g.holdUsed=false;assert.ok(g.hold());assert.equal(g.active.toy.id,id);assert.ok(!g.held.toy);
  assert.equal(t.clock.events.filter(e=>e.event==='spawn').length,1);
  t.advance(60000);g.holdUsed=false;g.held=null;assert.ok(g.hold());assert.equal(g.active.toy.kind,'fat');
  assert.equal(t.clock.events.filter(e=>e.event==='spawn').length,2);
});
for(const kind of T.KINDS)for(const shape of Object.keys(E.SHAPES))for(const terrain of ['flat','steps','left','right','blocked'])test(`${kind}/${shape}/${terrain}: safe one-time landing and unique IDs`,()=>{
  const {g,t}=game(),p=piece(g,t,kind,shape),heights=terrain==='steps'?[0,1,2,3,4,3,2,1,0,1]:terrain==='blocked'?[0,0,0,4,2,2,4,0,0,0]:Array(10).fill(0);
  heights.forEach((h,x)=>{for(let y=20-h;y<20;y++)g.board[y][x]={id:++g.serial,type:'S',mask:0};});
  if(terrain==='left')p.x=-Math.min(...p.cells.map(c=>c.x));if(terrain==='right')p.x=9-Math.max(...p.cells.map(c=>c.x));
  const before=g.board.flat().filter(Boolean).map(c=>c.id);g.move(0,g.dropDistance());assert.ok(t.begin());assert.equal(t.begin(),false);complete(t);
  const cells=g.board.flat().filter(Boolean),ids=cells.map(c=>c.id);assert.equal(new Set(ids).size,ids.length);assert.equal(g.pieces,1);assert.equal(g.active,null);
  for(const id of before)assert.ok(ids.includes(id),'existing cell preserved');
  const owned=cells.filter(c=>c.toy?.id===p.toy.id);assert.equal(owned.filter(c=>c.toy.face).length,1);
  if(kind==='fat')assert.ok(owned.length>=4&&owned.length<=12);else assert.equal(owned.length,4);
  if(kind==='doodle')assert.ok(cells.filter(c=>c.toyInk).length<=2);
});
test('doodle body locks first, ink is solid only after its stroke and scores through normal rows',()=>{
  const {g,t}=game();piece(g,t,'doodle');g.move(0,g.dropDistance());assert.ok(t.begin());assert.equal(g.pieces,1);
  assert.equal(g.board.flat().filter(c=>c?.toyInk).length,0);for(let n=0;n<38;n++)t.update(10);
  assert.equal(g.board.flat().filter(c=>c?.toyInk).length,0);t.update(10);assert.equal(g.board.flat().filter(c=>c?.toyInk).length,1);
  complete(t);const ink=g.board.flat().find(c=>c?.toyInk);assert.ok(ink.id);assert.equal(ink.mask,0);
  g.board[19]=Array.from({length:10},(_,x)=>x===0?ink:{type:'I',mask:0,id:++g.serial});
  const plan=R.linePlan(g.board),score=g.score;g.resolve(plan);assert.equal(g.score-score,100);assert.equal(g.lines,1);
});
test('fat expansion keeps the one original item badge without cloning it',()=>{
  const {g,t}=game(),p=piece(g,t,'fat');p.cells[0].special={type:'sunburst',id:17,hp:1};g.move(0,g.dropDistance());t.begin();complete(t);
  assert.equal(g.board.flat().filter(c=>c?.special).length,1);assert.equal(g.board.flat().filter(c=>c?.toy).length,8);
});
test('real controller: initial toy, drop, pause, resume, score, no carried input and reset',()=>{
  const h=boot({Toys:T,Tutorial:{create:()=>({start(){},stop(){},setPaused(){}})}}),q=h.q;q.start();assert.equal(q.run.active.toy.kind,'bouncy');
  assert.ok(q.action('drop'));assert.ok(q.toys.busy);assert.equal(q.action('hold'),false);assert.equal(q.action('left'),false);
  const time=q.toys.clock.elapsed,stage=q.toys.animation.p.state;q.pause();h.step(30000);
  assert.equal(q.toys.clock.elapsed,time);assert.equal(q.toys.animation.p.state,stage);q.resume();h.step(2000);
  assert.ok(!q.toys.busy);assert.equal(q.run.pieces,1);assert.ok(!q.run.active.toy);assert.ok(q.run.score>0);assert.equal(q.drag,null);
  q.draw();q.hud();q.start(true);assert.equal(q.toys.clock.elapsed,0);assert.equal(q.run.active.toy.kind,'bouncy');q.start(false,true);assert.equal(q.toys,null);
});
test('controller counts real active time during hit-stop and clearing; background and game-over stop it',()=>{
  const h=boot({Toys:T,FX:'real'}),q=h.q;q.start();Object.defineProperty(q.run,'gravity',{get:()=>Infinity});
  q.update(59999);assert.equal(q.toys.clock.elapsed,59999);assert.ok(!q.run.queue[0].toy);q.update(1);assert.equal(q.run.queue[0].toy.kind,'fat');
  h.dispatchWindow('blur');h.step(5000);assert.equal(q.toys.clock.elapsed,60000);q.resume();q.update(1000);assert.equal(q.toys.clock.elapsed,61000);
  q.finish();h.step(5000);assert.equal(q.toys.clock.elapsed,61000);
});
test('controller finishes fat/ink before clearing rows, keeps item arming, blocks ground mutation during action',()=>{
  const h=boot({Toys:T}),q=h.q;q.start();piece(q.run,q.toys,'fat');
  for(const x of [0,1,6,7,8,9])q.run.board[19][x]={type:'I',mask:0,id:++q.run.serial};
  q.run.active.cells[0].special={type:'scarabCurse',id:71,hp:1,landedAt:null,deadline:0,failed:false};
  q.action('drop');const board=JSON.stringify(q.run.board);assert.equal(q.riseGround(),false);assert.equal(JSON.stringify(q.run.board),board);
  h.step(400);assert.equal(q.run.pieces,1);assert.equal(q.run.lines,0);q.draw();
  const sp=q.run.board.flat().find(c=>c?.special)?.special;assert.ok(sp?.landedAt>=0);assert.ok(sp?.deadline>0);
  h.step(1000);assert.equal(q.run.lines,1);assert.ok(q.run.score>=100);assert.equal(q.state,'playing');
});
test('controller coward starts panic one cell above landing and blocks the original gesture',()=>{
  const h=boot({Toys:T}),q=h.q;q.start();piece(q.run,q.toys,'coward');q.run.move(0,q.run.dropDistance()-1);
  h.dispatch('pointerdown');q.update(16);assert.ok(q.toys.busy);assert.equal(q.toys.animation.p.state,'panic');assert.equal(q.toys.animation.p.y,17);assert.equal(q.drag,null);
  h.step(2000);assert.equal(q.run.pieces,1);assert.equal(q.state,'playing');
});
