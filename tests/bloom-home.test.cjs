'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
test('home uses real illustrated assets, a real single-mode start button and correct saved best',()=>{
 const saved={sound:true,haptics:false,touchSensitivity10:5,material:'glass',endlessV1:{normal:{best:9876},'normal-adaptive-v1-calm':{best:4321}},storybookV2:{version:2,pages:[1,0,0,0,0]},otherUnrelated:{preserved:true}};
 const a=boot({initial:{'glassfall-v1':JSON.stringify(saved)}});const html=a.panel();
 assert.match(html,/bloom-home-hero.webp/);assert.match(html,/bloom-home-logo.webp/);assert.match(html,/4,321/);
 assert.match(html,/data-menu="start" aria-label="게임 시작하기"/);assert.doesNotMatch(html,/data-menu="(?:normal|sand)"|모래/);
 assert.doesNotMatch(html,/mascot-strip|baby-doodle|mode-art|glass|crystal/);
 a.menu('start');assert.equal(a.q.state,'playing');a.q.pause();a.menu('menu');assert.equal(a.q.state,'menu');assert.match(a.panel(),/cb-home/);
 a.menu('settings');assert.doesNotMatch(a.panel(),/cb-home/);a.menu('back');assert.match(a.panel(),/cb-home/);
 const stored=JSON.parse(a.store['glassfall-v1']);assert.equal(stored.sound,true);assert.equal(stored.touchSensitivity10,5);assert.deepEqual(stored.otherUnrelated,saved.otherUnrelated);assert.deepEqual(stored.storybookV2,saved.storybookV2);assert.deepEqual(stored.endlessV1,saved.endlessV1);
});
test('earned best survives a cold reload on home, in game and after returning home',()=>{
 const initial={'glassfall-v1':JSON.stringify({tutorialCompleted:true,storybookV2:{version:2,pages:[1,0,0,0,0]}})};
 const first=boot({initial});first.menu('start');first.q.action('drop');
 const earned=first.q.run.score;assert.ok(earned>0);first.q.finish();first.menu('menu');
 assert.equal(first.nodes.get('best').textContent,String(earned));
 const saved=first.store['glassfall-v1'],reloaded=boot({initial:first.store});
 assert.equal(reloaded.nodes.get('best').textContent,String(earned),'cold home must show the earned best before any game starts');
 assert.equal(reloaded.store['glassfall-v1'],saved,'reading home must not rewrite game or storybook records');
 assert.match(reloaded.panel(),new RegExp('class="cb-best">최고점 <strong>'+earned+'<small>점</small>'));
 reloaded.menu('start');assert.equal(reloaded.nodes.get('best').textContent,String(earned));
 reloaded.q.pause();reloaded.menu('menu');assert.equal(reloaded.nodes.get('best').textContent,String(earned));
 assert.deepEqual(JSON.parse(reloaded.store['glassfall-v1']).storybookV2,JSON.parse(saved).storybookV2);
});
test('legacy fixed-rule best remains separate when no adaptive best has been earned',()=>{
 const saved=JSON.stringify({sound:true,bgm:true,sfx:true,endlessV1:{normal:{best:9876}},storybookV2:{version:2,pages:[3,0,0,0,0]}});
 const a=boot({initial:{'glassfall-v1':saved}});
 assert.equal(a.nodes.get('best').textContent,'0');assert.equal(a.store['glassfall-v1'],saved);
 a.menu('start');assert.equal(a.nodes.get('best').textContent,'0');assert.equal(a.store['glassfall-v1'],saved);
});
test('home generated files equal maintained source',()=>{
 for(const f of ['bloom-home.js','bloom-home.css','assets/bloom-home-hero.webp','assets/bloom-home-logo.webp'])assert.deepEqual(fs.readFileSync('src/'+f),fs.readFileSync('dist/'+f));
});
test('first entrance and short return never lock the real start action',()=>{
 const a=boot();assert.match(a.panel(),/data-home-intro="first"/);
 const button=a.panel().match(/<button class="cb-start"[^>]*>/)[0];assert.doesNotMatch(button,/disabled|aria-disabled/);
 assert.equal(a.now,0);a.menu('start');assert.equal(a.q.state,'playing');assert.equal(a.now,0);
 a.q.pause();a.menu('menu');assert.match(a.panel(),/data-home-intro="return"/);
 const before=a.timers.size;a.menu('settings');a.menu('back');assert.match(a.panel(),/data-home-intro="return"/);
 assert.equal(a.timers.size,before,'home presentation must not create persistent timers');
 a.menu('start');assert.equal(a.q.state,'playing');
});
