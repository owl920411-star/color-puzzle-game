'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../dist/sand-micro.js');
const S=require('../dist/stages.js');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function until(r,predicate,limit=2000){for(let i=0;i<limit;i++){if(predicate())return;r.step(16.6667);}assert.fail('timed out');}
test('removed rotation control has no remaining DOM lookup',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../dist/sand-micro.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../dist/sand-micro.html'),'utf8');
 assert.ok(!src.includes("$('rotate')"));assert.ok(!html.includes('id="rotate"'));assert.ok(!src.includes('짧게 터치 / 회전 버튼'));
});
test('all startup HUD controls exist in actual sand HTML',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../dist/sand-micro.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../dist/sand-micro.html'),'utf8');
 const hud=src.slice(src.indexOf('function updateHUD(){'),src.indexOf('function settings(){'));
 for(const [,id]of hud.matchAll(/\$\('([^']+)'\)/g))assert.ok(html.includes('id="'+id+'"'),id);
});
test('a packet still contains 576 unique actual grains',()=>{const rng=M.random('sacks');for(let id=1;id<=20;id++){const p=M.packet(rng,3,id);assert.equal(p.grains.length,576);assert.equal(new Set(p.grains.map(g=>g.x+','+g.y)).size,576);}});
test('hard drop immediately spawns the next controllable packet',()=>{const r=new M.Run(),id=r.queue[0].id;r.drop();assert.equal(r.pieces,1);assert.equal(r.field.count(),576);assert.equal(r.active.id,id);assert.equal(r.state,'falling');assert.ok(r.moveTo(15));});
test('old grains keep settling while the next packet falls',()=>{const r=new M.Run();r.drop();const before=r.field.cells.slice(),id=r.active.id,y=r.active.y;r.step(50);assert.notDeepEqual(r.field.cells,before);assert.equal(r.active.id,id);assert.ok(r.active.y>y);assert.equal(r.field.count(),576);});
test('automatic landing does not write old Y onto the new packet',()=>{const r=new M.Run();r.active.y=r.field.dropY(r.active);const expected=r.queue[0].id;r.step(50);assert.equal(r.pieces,1);assert.equal(r.active.id,expected);assert.equal(r.active.y,-r.active.bounds.top+2);assert.ok(r.field.fits(r.active));});
test('pending burst cannot be overwritten by automatic landing',()=>{
 const r=new M.Run({burst:1});for(let x=0;x<120;x++){r.field.set(x,239,1);r.field.set(x,238,1);}r.field.sleep=4;r.step(0);
 assert.equal(r.state,'clearing');const p=r.active;p.y=r.field.dropY(p);const y=p.y;const pending=r.pending;
 r.step(50);assert.equal(r.state,'clearing');assert.equal(r.pending,pending);assert.equal(r.pieces,0);assert.equal(r.active,p);assert.equal(r.active.y,y);
 r.step(50);r.step(50);r.step(50);assert.equal(r.pending,null);assert.equal(r.removed,240);assert.equal(r.pieces,0);assert.equal(r.state,'falling');
});
test('natural two-chain still uses the existing mass and score rules',()=>{
 const r=new M.Run({burst:1,gravity:0});
 for(let x=0;x<80;x++)r.field.set(x,239,2);
 for(let x=0;x<120;x++)for(let y=237;y<239;y++)r.field.set(x,y,1);
 for(let x=0;x<80;x++)r.field.set(x,236,2);
 until(r,()=>r.removed===400);assert.equal(r.maxChain,2);assert.equal(r.score,377);assert.equal(r.field.count(),0);
});
test('hold is once per packet and resets after landing',()=>{const r=new M.Run();assert.ok(r.hold());assert.equal(r.hold(),false);r.drop();assert.ok(r.hold());});
test('rapid deposits conserve every grain',()=>{const r=new M.Run({burst:1000});for(const x of[18,60,101]){r.moveTo(x);r.drop();r.step(50);}assert.equal(r.pieces,3);assert.equal(r.field.count(),1728);});
test('all 100 stage configs still supply the established settings',()=>{for(let n=1;n<=100;n++){const c=S.config(n,'sand');assert.equal(c.number,n);assert.equal(c.sandColors,n<=2?2:3);assert.equal(c.sandBurst,n<=2?10:12);assert.ok(c.target>0);}});
test('top out is terminal and cannot spawn duplicate over events',()=>{const r=new M.Run();for(let x=0;x<120;x++)for(let y=0;y<50;y++)r.field.set(x,y,4);r.spawn();assert.equal(r.state,'over');const events=r.events.length;r.step(50);assert.equal(r.events.length,events);assert.equal(r.active,null);});
console.log('\n'+passed+' tests passed.');
