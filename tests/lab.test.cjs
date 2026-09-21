const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/engine.js'),L=require('../dist/lab.js');
const solutions=[[[6,0]],[[2,1]],[[0,0],[2,0]],[[6,0]],[[4,1],[2,0]],[[4,1]],[[6,0]],[[4,0]],[[0,0],[6,0]]];
function place(g,x,rotations){for(let n=0;n<rotations;n++)assert.ok(g.rotate());while(g.active.x!==x)assert.ok(g.move(g.active.x<x?1:-1));g.move(0,g.dropDistance());g.lock();let p,chain=0;while((p=E.clearPlan(g.board)))g.resolve(p,++chain);}
for(let i=0;i<L.stages.length;i++)test('lab '+(i+1)+' has a real three-star solution and finite deterministic supply',()=>{
 const g=L.create(i),twin=L.create(i);assert.deepEqual(g.board,twin.board);assert.deepEqual(g.active,twin.active);assert.deepEqual(g.queue,twin.queue);assert.equal(g.hold(),false);
 for(const [j,[x,r]]of solutions[i].entries()){place(g,x,r);if(j<solutions[i].length-1)assert.ok(g.spawn());}
 assert.equal(L.cleared(L.stages[i],g),true);assert.equal(L.stars(L.stages[i],g),3);
 while(g.spawn()){}assert.equal(g.active,null);assert.equal(g.queue.length,0);
});
test('crack orientation offers a two-star clear and rewards a cleaner rotated solution',()=>{const g=L.create(5);place(g,4,0);assert.equal(L.cleared(L.stages[5],g),true);assert.equal(L.stars(L.stages[5],g),2);assert.equal(g.board.flat().filter(Boolean).length,3);const better=L.create(5);place(better,4,1);assert.equal(L.stars(L.stages[5],better),3);});
test('unlock needs a clear and replay never downgrades earned stars',()=>{
 const progress={};assert.equal(L.unlocked(0,progress),true);assert.equal(L.unlocked(1,progress),false);
 const g=L.create(0);place(g,6,0);L.record(progress,L.stages[0],g);assert.equal(L.unlocked(1,progress),true);assert.equal(L.total(progress),3);
 g.pieces=2;g.board[19][0]={type:'I',mask:0,id:999};assert.equal(L.stars(L.stages[0],g),1);L.record(progress,L.stages[0],g);assert.equal(L.total(progress),3);assert.equal(progress.gap.pieces,1);
 const failed=L.create(1);L.record(progress,L.stages[1],failed);assert.equal(L.unlocked(2,progress),false);
});
test('fall lab supports distinct one, two and three star solutions with the same fixed pieces',()=>{
 for(const [expected,route]of [[3,[[6,0]]],[2,[[4,1]]],[1,[[0,0],[6,0]]]]){
  const g=L.create(6);for(const [i,[x,r]]of route.entries()){place(g,x,r);if(i<route.length-1){assert.equal(L.cleared(L.stages[6],g),false);assert.ok(g.spawn());}}
  assert.equal(L.cleared(L.stages[6],g),true);assert.equal(L.stars(L.stages[6],g),expected);
 }
});
module.exports={solutions,place};
