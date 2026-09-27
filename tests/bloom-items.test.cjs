'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot,B}=require('./helpers/adaptive-stable-harness.cjs');
for(const type of Object.keys(B.ITEMS))test('developer immediate effect: '+type,()=>{
 const a=boot();a.q.start();a.q.pause();a.q.devPanel();assert.match(a.panel(),new RegExp(B.ITEMS[type].label+' 즉시 발동'));
 const bestBefore=JSON.stringify(JSON.parse(a.store['glassfall-v1']||'{}').endlessV1);a.menu('iteminstant',type);a.step(400);a.q.draw();
 assert.equal(a.q.items.practice,true);assert.equal(a.q.run.board.length,20);assert.ok(a.q.run.board.every(r=>r.length===10));
 if(type==='scarabCurse'){assert.equal(a.q.items.stats.added,1);assert.equal(a.q.run.score,0);}
 else if(type==='seal'){assert.equal(a.q.items.stats.armored,2);assert.equal(a.q.run.score,0);}
 else if(type==='mummy'){assert.equal(B.specials(a.q.run.board)[0].s.hp,1);assert.equal(a.q.run.lines,0);}
 else{assert.equal(a.q.run.lines,1);assert.ok(a.q.items.stats.removed>0);}
 assert.ok(B.fits(a.q.run.board,a.q.run.active));a.q.finish();assert.equal(JSON.stringify(JSON.parse(a.store['glassfall-v1']||'{}').endlessV1),bestBefore);
});
test('toolbox and developer screens contain no retired theme copy',()=>{
 const a=boot();a.q.start();a.q.pause();a.q.devPanel();
 for(const route of ['devrelicview','devaudit','devsim']){a.menu(route);assert.doesNotMatch(a.panel(),/호루스|피라미드|파라오|스카라|사막|유물|앙크|미라|붕대|DESERT|RELICS/);a.menu('back');}
 assert.equal(Object.values(B.ITEMS).filter(i=>i.kind==='good').length,3);assert.equal(Object.values(B.ITEMS).filter(i=>i.kind==='bad').length,3);
});
