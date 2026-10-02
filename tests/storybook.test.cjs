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
 const expected=[[],[],[1],[2],[3],[3,4],[3,4,5],[3,4,5,6],[3,4,5,6,7]];
 for(let n=0;n<=8;n++){
  const html=S.homeHTML({completed:n});
  assert.match(html,new RegExp(n+'/8'));
  assert.match(html,/class="storybook-scene/);
  assert.doesNotMatch(html,/storybook-pieces|is-locked|is-current|is-unlocked/);
  assert.deepEqual([...html.matchAll(/data-piece="(\d+)"/g)].map(m=>Number(m[1])),expected[n]);
  if(n>1)assert.match(html,/class="storybook-scene-piece scene-growth(?: is-new)?"/);
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
  assert.equal([...html.matchAll(/class="storybook-scene-piece[^"\n]*is-new"/g)].length,n===1?0:1);
  if(n>1)assert.match(html,new RegExp('is-new" data-piece="'+(n-1)+'"'));
  assert.doesNotMatch(view.homeHTML({completed:n}),/is-new/);
 }
 assert.match(view.homeHTML({completed:8}),/storybook-completion/);
 assert.doesNotMatch(fresh().homeHTML(),/is-new/);
 assert.equal(writes,0);
});


test('coloring-book outlines disappear as their existing stage receives color',()=>{
 for(let n=0;n<=8;n++){
  const html=S.homeHTML({completed:n});
  assert.equal([...html.matchAll(/class="storybook-outline /g)].length,n<4?4:Math.max(0,7-n));
  assert.match(html,/role="button" tabindex="0" aria-haspopup="dialog"/);
 }
});


test('five pages reuse the frozen goals and each run colors at most one detail',()=>{
 assert.equal(S.PAGES.length,5);
 for(const page of S.PAGES){
  assert.deepEqual(page.stages.map(g=>[g.metric,g.target]),S.PAGE.stages.map(g=>[g.metric,g.target]));
  for(let n=0;n<8;n++){
   const raw={page:page.id,completed:n},goal=page.stages[n];
   assert.equal(S.advance(raw,{[goal.metric]:goal.target-1}).changed,false);
   const r=S.advance(raw,{pieces:999,lines:999,score:999999,maxCombo:99});
   assert.equal(r.after.page,page.id);assert.equal(r.after.completed,n+1);
  }
 }
});

test('legacy saves migrate lazily and forty successes advance pages in order',()=>{
 const vm=require('node:vm'),fs=require('node:fs');let text=JSON.stringify({best:12345,storybookV1:{page:'spring-garden',completed:5}}),writes=0;
 const env={localStorage:{getItem:()=>text,setItem:(k,v)=>{text=v;writes++;}}};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/storybook.js'),'utf8'),env);const A=env.CrayonStorybook;
 assert.equal(A.read().completed,5);assert.equal(writes,0);
 for(let total=5;total<40;total++){
  const before=A.read();assert.equal(before.page,A.PAGES[Math.floor(total/8)].id);assert.equal(before.completed,total%8);
  const r=A.finish({pieces:999,lines:999,score:999999,maxCombo:99});assert.equal(r.changed,true);
  const save=JSON.parse(text);assert.equal(save.best,12345);assert.equal(save.storybookV1.completed,Math.min(8,total+1));assert.equal(save.storybookV2.pages.reduce((a,b)=>a+b),total+1);
  const reload={localStorage:env.localStorage};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/storybook.js'),'utf8'),reload);assert.equal(JSON.stringify(reload.CrayonStorybook.read()),JSON.stringify(A.read()));
 }
 assert.equal(A.read().page,A.PAGES[4].id);assert.equal(A.read().completed,8);assert.equal(A.finish({score:999999}).changed,false);
});

test('future pages only reveal outlines; result cards identify the newly colored element',()=>{
 for(const page of S.PAGES.slice(1))for(let n=0;n<=8;n++){
  const html=S.sceneHTML({page:page.id,completed:n});assert.equal([...html.matchAll(/data-color-piece=/g)].length,n);assert.doesNotMatch(html,/완성 그림 미리보기/);
  if(n<8)assert.match(S.resultCard(S.advance({page:page.id,completed:n},{pieces:999,lines:999,score:999999,maxCombo:99})),/색칠했어요!/);
 }
});


test('every legacy progress value survives and corrupt future progress cannot bypass page order',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),code=fs.readFileSync(require.resolve('../dist/storybook.js'),'utf8');
 for(let n=0;n<=8;n++){
  let writes=0;const env={localStorage:{getItem:()=>JSON.stringify({storybookV1:{page:'spring-garden',completed:n}}),setItem:()=>writes++}};vm.runInNewContext(code,env);
  const state=env.CrayonStorybook.read();assert.equal(state.page,n<8?'spring-garden':'toy-cars');assert.equal(state.completed,n<8?n:0);assert.equal(writes,0);
 }
 const env={localStorage:{getItem:()=>JSON.stringify({storybookV1:{completed:3},storybookV2:{pages:[3,8,8,8,8]}})}};vm.runInNewContext(code,env);assert.equal(env.CrayonStorybook.read().completed,3);assert.equal(env.CrayonStorybook.read().page,'spring-garden');
});
