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
  assert.match(S.resultCard(result,true),/첫 페이지 완성!/);
});


test('home paints one growing plant; later flowers and visitors share one scene',()=>{
 const expected=[[],[0],[1],[2],[3],[3,4],[3,4,5],[3,4,5,6],[3,4,5,6,7]];
 for(let n=0;n<=8;n++){
  const html=S.homeHTML({completed:n});
  assert.match(html,new RegExp(n+'/8'));
  assert.match(html,/class="storybook-scene/);
  assert.doesNotMatch(html,/storybook-pieces|is-locked|is-current|is-unlocked/);
  assert.deepEqual([...html.matchAll(/data-piece="(\d+)"/g)].map(m=>Number(m[1])),expected[n]);
  if(n>0)assert.match(html,/class="storybook-scene-piece scene-growth(?: is-new)?"/);
 }
});

test('existing objective metrics and thresholds stay frozen',()=>{
 assert.deepEqual(S.PAGE.stages.map(s=>[s.metric,s.target]),[['pieces',12],['lines',4],['score',1500],['lines',6],['maxCombo',2],['pieces',24],['lines',8],['score',4000]]);
});


test('only the newest scene detail reveals once; reload and storage remain unchanged',()=>{
 const vm=require('node:vm'),fs=require('node:fs');let writes=0;
 function fresh(){const env={localStorage:{getItem:()=>JSON.stringify({storybookV1:{completed:5}}),setItem:()=>writes++}};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/storybook.js'),'utf8'),env);return env.CrayonStorybook;}
 const view=fresh();assert.doesNotMatch(view.homeHTML(),/is-new/);
 view.homeHTML({completed:0});
 for(let n=1;n<=8;n++){
  const html=view.homeHTML({completed:n});
  assert.equal([...html.matchAll(/class="storybook-scene-piece[^"\n]*is-new"/g)].length,1);
  assert.match(html,new RegExp('is-new" data-piece="'+(n-1)+'"'));
  assert.doesNotMatch(view.homeHTML({completed:n}),/is-new/);
 }
 assert.match(view.homeHTML({completed:8}),/storybook-completion/);
 assert.doesNotMatch(fresh().homeHTML(),/is-new/);
 assert.equal(writes,0);
});
