'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
test('home uses real illustrated assets, real mode buttons and correct saved best',()=>{
 const saved={sound:true,haptics:false,touchSensitivity10:5,material:'glass',endlessV1:{normal:{best:4321}},otherUnrelated:{preserved:true}};
 const a=boot({initial:{'glassfall-v1':JSON.stringify(saved)}});const html=a.panel();
 assert.match(html,/bloom-home-hero.webp/);assert.match(html,/bloom-home-logo.webp/);assert.match(html,/4,321/);
 assert.match(html,/data-menu="normal" aria-pressed="true"/);assert.match(html,/data-menu="sand" aria-pressed="false"/);
 assert.doesNotMatch(html,/mascot-strip|baby-doodle|mode-art|glass|crystal/);
 a.menu('start');assert.equal(a.q.state,'playing');a.q.pause();a.menu('menu');assert.equal(a.q.state,'menu');assert.match(a.panel(),/cb-home/);
 a.menu('settings');assert.doesNotMatch(a.panel(),/cb-home/);a.menu('back');assert.match(a.panel(),/cb-home/);
 const stored=JSON.parse(a.store['glassfall-v1']);assert.equal(stored.sound,true);assert.equal(stored.touchSensitivity10,5);assert.deepEqual(stored.otherUnrelated,saved.otherUnrelated);assert.equal(stored.endlessV1.normal.best,4321);
});
test('home generated files equal maintained source',()=>{
 for(const f of ['bloom-home.js','bloom-home.css','assets/bloom-home-hero.webp','assets/bloom-home-logo.webp'])assert.deepEqual(fs.readFileSync('src/'+f),fs.readFileSync('dist/'+f));
});
