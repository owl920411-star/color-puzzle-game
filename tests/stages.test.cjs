const test=require('node:test'),assert=require('node:assert/strict'),S=require('../dist/stages.js'),E=require('../dist/engine.js');
test('all 100 stages have bounded speed, unique seeds, valid starting boards and attainable removal goals',()=>{
 for(const material of ['glass','sand','water','jelly']){
  const seeds=new Set();for(let n=1;n<=100;n++){
   const c=S.config(n,material),g=new E.Game(c.seed,'stage',material);S.prepare(g,c);seeds.add(c.seed);
   assert.equal(c.number,n);assert.ok(c.target>=8&&c.target<=190);assert.ok(g.gravity>=200);assert.ok(g.fits(g.active));assert.ok(!E.materialPlan(g.board,material));
   const retry=new E.Game(c.seed,'stage',material);S.prepare(retry,c);assert.deepEqual(retry.board,g.board);assert.deepEqual(retry.queue,g.queue);
  }assert.equal(seeds.size,100);
 }
});
test('campaign advances sequentially, persists clears, rejects locked jumps and stops at 100',()=>{
 let p=S.progress(null);assert.equal(p.unlocked,1);assert.deepEqual(S.complete(p,50),p);
 for(let n=1;n<=100;n++){p=S.complete(p,n);assert.equal(p.unlocked,Math.min(n+1,100));assert.equal(p.cleared.length,n);}
 assert.deepEqual(S.progress(JSON.parse(JSON.stringify(p))),p);assert.deepEqual(S.complete(p,100),p);
 assert.equal(S.progress({cleared:[99,100,'1',-1]}).unlocked,1);
});
