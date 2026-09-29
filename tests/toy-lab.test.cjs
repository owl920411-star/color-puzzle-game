'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const{ToyLab,ToyClock,SHAPES,seeded}=require('../dist/qa/toy-lab-core.js');
function lab(kind='bouncy',value=0){return new ToyLab(kind,{rng:()=>value,normalRng:seeded(15)});}
function until(g,condition,limit=10000){for(let t=0;t<limit&&!condition();t+=5)g.update(5);assert.ok(condition(),'state reached within bound');}
function locked(g){until(g,()=>!!g.lastLock);return g.lastLock;}
function tile(){return{kind:'block',colour:'#77c9f4',owner:0};}
test('bouncy performs one unbiased one-cell move, lands once, and drop spam cannot skip its prank',()=>{
 for(const [random,dir] of [[0,-1],[.4999,-1],[.5,1],[.99999,1]]){
  const g=lab('bouncy',random),start=g.p.x,id=g.p.id;g.drop();
  for(let i=0;i<100;i++)assert.equal(g.drop(),false);
  const final=locked(g);assert.equal(final.id,id);assert.equal(final.x,start+dir);assert.equal(final.automaticMoves,1);assert.equal(g.locks,1);
 }
});
test('bouncy tries opposite blocked side and bounces in place when both sides are blocked',()=>{
 for(const both of [false,true]){const g=lab();g.board[19][3]=tile();if(both)g.board[19][6]=tile();g.drop();const r=locked(g);assert.equal(r.x,both?4:5);assert.equal(r.automaticMoves,both?0:1);}
});
test('bouncy really rolls down a lower ledge once and never bounces again',()=>{
 const g=lab();g.board[15][5]=tile();g.drop();until(g,()=>g.p.state==='roll');
 const y=g.p.y;assert.equal(g.p.x,3);assert.equal(g.effects[0].text,'데굴~');g.update(60);assert.ok(g.p.y>y);const r=locked(g);assert.equal(r.y,18);assert.equal(r.automaticMoves,1);
});
test('bouncy retains user lateral movement during bounce separately from automatic movement',()=>{
 const g=lab();g.drop();until(g,()=>g.p.state==='bounce');assert.equal(g.move(1),true);const r=locked(g);assert.equal(r.automaticMoves,1);assert.equal(r.userMoves,1);assert.equal(r.x,4);
});
test('replacement and reset cancel an unfinished bouncy action without delayed locks',()=>{
 const g=lab();g.drop();g.update(80);g.newToy();const id=g.p.id;g.update(500);assert.equal(g.p.id,id);assert.equal(g.locks,0);assert.equal(g.p.used,false);
 g.drop();g.update(100);g.clear();g.update(500);assert.equal(g.locks,0);assert.equal(g.p.used,false);
});
test('bouncy top and wall collision stays in the logical grid',()=>{
 const g=lab();g.p.x=0;g.p.y=1;g.board[3][0]=tile();g.board[3][1]=tile();g.board[2][2]=tile();g.drop();locked(g);assert.equal(g.lastLock.automaticMoves,0);assert.ok(g.lastLock.cells.every(([dx,dy])=>g.lastLock.x+dx>=0&&g.lastLock.y+dy<20));
});
test('active clock reserves once at 60, 120 and 180 seconds with a separate initial grant',()=>{
 const c=new ToyClock('cycle');c.take(1);c.advanceTo(59999);assert.equal(c.pending,null);c.advanceTo(60000);assert.equal(c.pending.reservedAt,60000);c.advanceTo(60000);c.take(2);c.advanceTo(120000);c.take(3);c.advanceTo(180000);c.take(4);
 assert.deepEqual(c.events.filter(e=>e.event==='spawn').map(e=>e.reservedAt),[0,60000,120000,180000]);assert.equal(c.events.filter(e=>e.event==='reserve').length,3);
});
test('an unconsumed reservation stays single and missed intervals are documented',()=>{
 const c=new ToyClock('cycle');c.take(1);c.advanceTo(60000);c.advanceTo(240000);assert.equal(c.pending.reservedAt,60000);assert.equal(c.skipped,3);c.take(2);assert.equal(c.take(3),null);assert.equal(c.next,300000);
});
test('render frequency does not change bouncy direction, lock, or clock',()=>{
 const results=[];for(const hz of [30,60,120]){const g=lab();g.drop();for(let i=0;i<hz*2;i++)g.update(1000/hz);results.push(g.snapshot());}
 for(const r of results.slice(1)){assert.deepEqual(r.board,results[0].board);assert.deepEqual(r.lastLock,results[0].lastLock);assert.ok(Math.abs(r.clock.elapsed-2000)<1e-6);}
});
test('fat O becomes 4x2, I becomes 6x1, using only original horizontal neighbours',()=>{
 for(const [shape,count,width] of [[SHAPES[0],8,4],[SHAPES[1],6,6]]){
  const g=lab('fat');g.p.cells=shape.map(c=>c.slice());g.p.original=shape.map(c=>c.slice());g.p.x=3;
  g.drop();assert.equal(g.p.cells.length,4);g.update(99);assert.equal(g.p.cells.length,4);g.update(1);assert.equal(g.p.cells.length,count);
  const r=locked(g);assert.equal(r.cells.length,count);assert.equal(new Set(r.cells.map(c=>c.join(','))).size,count);assert.equal(Math.max(...r.cells.map(c=>c[0]))-Math.min(...r.cells.map(c=>c[0]))+1,width);
  for(const [x,y]of r.extra)assert.ok(r.original.some(([a,b])=>b===y&&Math.abs(a-x)===1));
 }
});
test('fat respects one or both walls and never overwrites existing cells',()=>{
 for(const both of [false,true]){const g=lab('fat');for(const y of [18,19]){g.board[y][3]=tile();if(both)g.board[y][6]=tile();}const saved=JSON.stringify(g.board[19][3]);g.drop();const r=locked(g);assert.equal(r.extra.length,both?0:2);assert.equal(JSON.stringify(g.board[19][3]),saved);assert.ok(g.effects.some(e=>e.text===(both?'낑…':'뿌웅!')));}
});
test('fat expansion is solid for the next piece and rapid drops/reset do not expand twice',()=>{
 const g=lab('fat');g.drop();g.update(100);for(let i=0;i<12;i++)assert.equal(g.drop(),false);locked(g);assert.equal(g.locks,1);assert.equal(g.hit(3,18,[[0,0]]),true);g.clear();g.update(500);assert.equal(g.locks,0);assert.equal(g.p.cells.length,4);
});
test('coward panics one cell BEFORE landing, retains 200/170ms phases and escapes once',()=>{
 for(const direction of [-1,1]){
  const g=lab('coward',direction<0?0:.8),x=g.p.x,goal=g.landingY();g.drop();assert.equal(g.p.y,goal-1);assert.equal(g.p.state,'panic');assert.equal(g.locks,0);
  g.update(199);assert.equal(g.p.state,'panic');g.update(1);assert.equal(g.p.state,'escape');assert.equal(g.p.x,x);g.update(169);assert.equal(g.p.x,x);g.update(1);assert.equal(g.p.x,x+direction);assert.equal(g.p.automaticMoves,1);
  const r=locked(g);assert.equal(r.automaticMoves,1);assert.equal(r.cells.length,4);assert.ok(g.effects.some(e=>e.text==='휴우~'));
 }
});
test('coward falls after fleeing a higher ledge without another fright or bounce',()=>{
 const g=lab('coward');g.board[15][5]=tile();g.drop();const y=g.p.y;locked(g);assert.equal(g.lastLock.y,18);assert.ok(g.lastLock.y>y+1);assert.equal(g.lastLock.automaticMoves,1);assert.equal(g.lastLock.extra.length,0);
});
test('coward checks the opposite side, or trembles when both sides are blocked',()=>{
 for(const both of [false,true]){const g=lab('coward');g.board[17][3]=tile();if(both)g.board[17][6]=tile();g.drop();g.update(200);assert.equal(g.p.state,both?'blocked':'escape');assert.equal(g.effects[0].text,both?'벌벌…':'후다닥!');const r=locked(g);assert.equal(r.x,both?4:5);assert.equal(r.automaticMoves,both?0:1);}
});
test('coward drop spam cannot skip panic; replacing the piece cancels the escape',()=>{
 const g=lab('coward');g.drop();for(let i=0;i<30;i++)assert.equal(g.drop(),false);g.update(220);g.newToy();const id=g.p.id;g.update(500);assert.equal(g.p.id,id);assert.equal(g.p.used,false);assert.equal(g.locks,0);
});
