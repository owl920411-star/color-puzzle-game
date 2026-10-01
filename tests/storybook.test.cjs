const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../dist/storybook.js');

test('storybook has one eight-piece launch page and clamps malformed saves',()=>{
  assert.equal(S.PAGE.id,'spring-garden');assert.equal(S.PAGE.stages.length,8);
  assert.deepEqual(S.normalize(null),{page:'spring-garden',completed:0});
  assert.equal(S.normalize({completed:99}).completed,8);
  assert.equal(S.normalize({completed:-2}).completed,0);
});

test('each run evaluates only the current picture goal and advances by one',()=>{
  let state={completed:0};
  let r=S.advance(state,{pieces:11,lines:99,score:99999,maxCombo:9});
  assert.equal(r.changed,false);assert.equal(r.after.completed,0);
  r=S.advance(state,{pieces:12});assert.equal(r.changed,true);assert.equal(r.after.completed,1);
  state=r.after;
  r=S.advance(state,{lines:4});assert.equal(r.changed,true);assert.equal(r.after.completed,2);
});

test('all eight goals are attainable with ordinary game counters and completion stops',()=>{
  let state={completed:0};
  const run={pieces:999,lines:999,score:999999,maxCombo:99};
  for(let i=0;i<8;i++){const r=S.advance(state,run);assert.equal(r.changed,true);state=r.after;}
  assert.equal(state.completed,8);assert.equal(S.current(state),null);
  const done=S.advance(state,run);assert.equal(done.changed,false);assert.equal(done.pageComplete,true);
});

test('home, hud and result copy expose progress without requiring control changes',()=>{
  assert.match(S.homeHTML({completed:3}),/3\/8/);
  assert.match(S.hud({lines:2},{completed:1}),/2\/4줄/);
  const result=S.advance({completed:7},{score:4000});
  assert.match(S.resultCard(result,true),/첫 페이지가 완성됐어요/);
});
