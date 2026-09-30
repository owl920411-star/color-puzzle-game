const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/engine.js'),R=require('../dist/endless-rules.js'),T=require('../dist/toy-blocks.js'),{boot}=require('./helpers/adaptive-stable-harness.cjs');
for(const kind of T.KINDS)for(const shape of Object.keys(E.SHAPES))for(const x of [0,3,6])for(const rotation of [0,1,2,3])test(`${kind}/${shape}/${x}/${rotation} preview equals lock`,()=>{
 const g=new R.NormalGame('preview'),t=new T.System(g);g.active=t.makePiece(kind);Object.assign(g.active,{type:shape,size:shape==='I'?4:shape==='O'?2:3,x,y:0,cells:E.SHAPES[shape].map(([x,y])=>({x,y,type:shape,id:++g.serial,toy:{...g.active.toy}}))});
 for(let n=0;n<rotation;n++)g.rotateDir(1);
 for(let col=0;col<10;col++)for(let y=20-(col%4);y<20;y++)g.board[y][col]={type:'S',id:++g.serial};
 if(!g.fits(g.active))return;const before=JSON.stringify(g.board),preview=t.prediction();assert.equal(JSON.stringify(g.board),before);assert.deepEqual(t.prediction(),preview);
 // HOLD retrieval and hard drop must preserve the piece's planned randomness.
 const p=g.active;g.hold();g.holdUsed=false;g.hold();assert.equal(g.active.toy.id,p.toy.id);const expected=t.prediction().cells;
 g.move(0,g.dropDistance());t.begin();for(let n=0;t.busy&&n<500;n++)t.update(10);assert.ok(!t.busy);
 const old=JSON.parse(before),actual=[];for(let y=0;y<20;y++)for(let x=0;x<10;x++)if(g.board[y][x]&&!old[y][x])actual.push({x,y,ink:!!g.board[y][x].toyInk});assert.deepEqual(actual,expected.map(({x,y,ink})=>({x,y,ink})));
});
test('basic success, one encounter, saved next unseen friend, no repeat introduction',()=>{
 const h=boot({Toys:T}),q=h.q;q.start();assert.ok(!q.run.active.toy);q.update(60001);assert.ok(!q.run.queue.some(p=>p.toy));
 q.run.pieces=3;q.update(1);assert.equal(q.run.queue[0].toy.kind,'bouncy');q.run.spawn();assert.equal(q.toys.intro.kind,'bouncy');q.hud();assert.match(h.nodes.get('notice').textContent,/点|点線|점선/);
 q.start();q.run.pieces=3;q.update(1);assert.equal(q.run.queue[0].toy.kind,'fat');
 const h2=boot({Toys:T,initial:h.store});h2.q.start();h2.q.run.pieces=3;h2.q.update(1);assert.equal(h2.q.run.queue[0].toy.kind,'fat');
});
test('actual normal locks precede first toy, then learned guide stays absent after HOLD',()=>{
 const h=boot({Toys:T}),q=h.q;q.start();
 for(let n=0;n<3;n++){assert.ok(!q.run.active.toy);q.action('drop');h.step(1000);}
 if(!q.run.active.toy){q.action('drop');h.step(1000);}assert.equal(q.run.active.toy.kind,'bouncy');
 q.hud();assert.match(h.nodes.get('notice').textContent,/점선/);q.action('hold');q.hud();assert.doesNotMatch(h.nodes.get('notice').textContent,/점선/);
});
test('result reflects actual combo and zero-clear placement count',()=>{
 const h=boot({Toys:T}),q=h.q;q.start();q.run.maxCombo=3;q.finish();assert.match(h.panel(),/3번 연속으로 지웠어요/);
 q.start();q.run.pieces=2;q.finish();assert.match(h.panel(),/블록 2개를 놓았어요/);assert.doesNotMatch(h.panel(),/반짝임/);
});
