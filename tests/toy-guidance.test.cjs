const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../dist/toy-blocks.js'),R=require('../dist/endless-rules.js'),{boot}=require('./helpers/adaptive-stable-harness.cjs');
const all=()=>Object.fromEntries(T.KINDS.map(k=>[k,true]));
test('requires BOTH four active minutes and all encounters, hides once',()=>{
 let saves=0;const learned=all();delete learned.doodle;
 const t=new T.System(new R.NormalGame('guide'),{learned,onGuidanceLearned:()=>saves++});
 t.advance(240000);assert.equal(t.guidanceHidden,false);
 t.didSpawn(t.makePiece('doodle'));assert.equal(t.guidanceHidden,true);assert.equal(t.intro,null);assert.equal(saves,1);
 t.advance(60000);t.didSpawn(t.makePiece('doodle'));assert.equal(saves,1);
});
test('all encountered early still keeps hints until exactly four minutes',()=>{
 const t=new T.System(new R.NormalGame('guide'),{learned:all()});t.advance(239999);assert.equal(t.guidanceHidden,false);t.advance(1);assert.equal(t.guidanceHidden,true);
});
test('hidden prediction draws nothing and does not change behaviour',()=>{
 const t=new T.System(new R.NormalGame('guide'),{learned:all(),guidanceHidden:true});t.game.active=t.makePiece('fat');
 const expected=t.prediction();t.drawPrediction(new Proxy({},{get(){throw new Error('hint drawing should be skipped');}}));assert.deepEqual(t.prediction(),expected);
});
test('controller persists hidden guides across restart, reload, training and keeps old settings',()=>{
 const initial={'glassfall-v1':JSON.stringify({toyLearned:all(),sound:false,best:{normal:42}})};
 const h=boot({Toys:T,initial,Tutorial:{create:()=>({start(){},stop(){},setPaused(){}})}}),q=h.q;q.start();Object.defineProperty(q.run,'gravity',{get:()=>Infinity});
 q.update(239999);assert.equal(q.toys.guidanceHidden,false);q.pause();h.step(90000);assert.equal(q.toys.clock.elapsed,239999);q.resume();q.update(1);
 assert.equal(q.toys.guidanceHidden,true);const saved=JSON.parse(h.store['glassfall-v1']);assert.equal(saved.toyGuidanceHidden,true);assert.equal(saved.sound,false);assert.equal(saved.best.normal,42);
 q.start();assert.equal(q.toys.guidanceHidden,true);q.start(false,true);assert.equal(q.toys,null);q.start();assert.equal(q.toys.guidanceHidden,true);
 const h2=boot({Toys:T,initial:h.store});h2.q.start();assert.equal(h2.q.toys.guidanceHidden,true);
});
test('ordinary landing shadow remains in hidden mode; guide notice is suppressed',()=>{
 const h=boot({Toys:T,initial:{'glassfall-v1':JSON.stringify({toyGuidanceHidden:true})}}),q=h.q;q.start();q.run.active=q.toys.makePiece('bouncy');q.toys.didSpawn(q.run.active);q.hud();assert.doesNotMatch(h.nodes.get('notice').textContent,/점선/);q.draw();
 const fs=require('fs');assert.match(fs.readFileSync('dist/endless-app.js','utf8'),/if\(!p\.toy\|\|toys\?\.guidanceHidden\)for/);
});
