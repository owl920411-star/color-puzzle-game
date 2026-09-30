const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./helpers/adaptive-stable-harness.cjs');
test('production hides adaptive UI and uses adaptive calm, preserving profile',()=>{
 const h=boot();h.q.start();assert.equal(h.q.adaptive.info().mode,'adaptive');assert.equal(h.q.adaptive.session.config.style,'calm');h.q.pause();h.menu('settings');assert.doesNotMatch(h.panel(),/data-adaptive|개인 맞춤 난이도/);
 h.adaptive('mode','off');assert.equal(h.q.adaptive.next.mode,'adaptive');h.adaptive('style','challenge');assert.equal(h.q.adaptive.next.style,'calm');
});
test('board side choices persist without changing the live game or settings',()=>{
 const h=boot({initial:{'glassfall-v1':JSON.stringify({sound:false,toyGuidanceHidden:true})}});h.q.start();h.q.pause();h.menu('settings');assert.match(h.panel(),/게임판 왼쪽/);assert.match(h.panel(),/쏙! 왼쪽/);
 const run=h.q.run,board=JSON.stringify(run.board),active=JSON.stringify(run.active);h.menu('board-side','right');assert.equal(h.q.run,run);assert.equal(JSON.stringify(run.board),board);assert.equal(JSON.stringify(run.active),active);
 let s=JSON.parse(h.store['glassfall-v1']);assert.equal(s.boardSide,'right');assert.equal(s.sound,false);assert.equal(s.toyGuidanceHidden,true);
 const h2=boot({initial:h.store});h2.menu('settings');assert.match(h2.panel(),/data-v="right" aria-pressed="true"/);h.menu('board-side','left');assert.equal(JSON.parse(h.store['glassfall-v1']).boardSide,'left');
});
