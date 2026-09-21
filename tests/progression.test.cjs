const test=require('node:test'),assert=require('node:assert/strict'),P=require('../dist/progression.js'),E=require('../dist/engine.js');
test('mastery thresholds unlock the promised frames and handle old or malformed values',()=>{
 assert.equal(P.mastery(undefined).level,1);assert.equal(P.mastery(-10).xp,0);assert.equal(P.mastery(99).level,1);assert.equal(P.mastery(100).level,2);assert.equal(P.mastery(260).level,3);assert.equal(P.mastery(850).level,5);assert.equal(P.mastery(1300).next,null);assert.ok(Number.isFinite(P.mastery(Infinity).xp));
});
test('goals award individual rewards and all-clear bonus only when conditions are met',()=>{
 const goals=P.missions('sand','standard');assert.equal(P.evaluate(goals,{pieces:6,shards:0,score:0}).xp,15);assert.equal(P.evaluate(goals,{pieces:6,shards:16,score:600}).xp,115);assert.equal(P.evaluate(goals,{pieces:5,shards:15,score:599}).xp,0);assert.equal(P.evaluate([],{score:9999}).xp,0);
});
test('strategy hints require real orthogonal connections and identify the relevant missing side',()=>{
 const b=E.blank();for(let x=0;x<7;x++)b[19][x]={paint:0,id:x+1};assert.match(P.strategy(b,'water').text,/3칸 더/);assert.match(P.strategy(b,'jelly').text,/1칸 더/);assert.match(P.strategy(b,'sand').text,/오른쪽/);assert.match(P.strategy(b,'glass').text,/3칸/);
 const diagonal=E.blank();for(let i=0;i<7;i++)diagonal[19-i][i]={paint:0,id:i+1};assert.equal(P.strategy(diagonal,'jelly'),null);
});
test('difficulty changes are deterministic and keep standard play and piece supply intact',()=>{
 for(const material of ['glass','sand','water','jelly']){
  const standard=new E.Game('terrain','sprint',material),calm=new E.Game('terrain','sprint',material,'calm'),hard=new E.Game('terrain','sprint',material,'challenge'),repeat=new E.Game('terrain','sprint',material,'challenge');
  assert.equal(standard.board.flat().filter(Boolean).length,0);assert.equal(standard.gravity,920);assert.equal(standard.lockDelay,650);assert.ok(calm.gravity>standard.gravity);assert.equal(calm.lockDelay,850);assert.ok(hard.gravity<standard.gravity);assert.ok(hard.board.flat().filter(Boolean).length>=20);assert.deepEqual(hard.board,repeat.board);assert.deepEqual(hard.active,repeat.active);assert.equal(hard.active.type,standard.active.type);assert.ok(hard.fits(hard.active));
 }
});
