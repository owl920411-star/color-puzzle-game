'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const{ToyLab,seeded}=require('../dist/qa/toy-lab-core.js');
const kinds=['bouncy','fat','coward','doodle'];
const make=kind=>new ToyLab(kind,{rng:seeded(71),normalRng:seeded(8)});
function advanceClockOnly(g,ms){const step=g.step;g.step=()=>{};g.update(ms);g.step=step;}
function nextPiece(g){const id=g.p.id;g.drop();for(let t=0;t<6000&&g.p.id===id;t+=5)g.update(5);assert.notEqual(g.p.id,id);}
for(const kind of kinds){
 test(`${kind}: initial + 60/120/180s reservations preserve the current piece and insert safely`,()=>{
  const g=make(kind);g.reset('cycle');assert.equal(g.history.length,1);assert.equal(g.history[0].type,kind);nextPiece(g);assert.equal(g.p.type,'normal');
  for(const target of [60000,120000,180000]){
   advanceClockOnly(g,target-1-g.clock.elapsed);const p=g.p,id=p.id;assert.equal(g.clock.pending,null);g.update(1);assert.equal(g.p.id,id);assert.equal(g.p.type,'normal');assert.equal(g.clock.pending.reservedAt,target);
   g.clock.advanceTo(g.clock.elapsed);assert.equal(g.clock.events.filter(e=>e.event==='reserve'&&e.reservedAt===target).length,1);
   nextPiece(g);assert.equal(g.p.type,kind);const event=g.clock.events.filter(e=>e.event==='spawn').at(-1);assert.equal(event.reservedAt,target);assert.ok(event.spawnedAt>=target);nextPiece(g);assert.equal(g.p.type,'normal');
  }
  assert.equal(g.history.filter(p=>p.type===kind).length,4);assert.equal(g.clock.skipped,0);
 });
 test(`${kind}: 40s active + 30s pause + 20s active, background gap, resets and manual grant guard`,()=>{
  const g=make(kind);g.reset('cycle');nextPiece(g);advanceClockOnly(g,40000-g.clock.elapsed);g.paused=true;g.update(30000);assert.equal(g.clock.elapsed,40000);g.paused=false;advanceClockOnly(g,19999);assert.equal(g.clock.pending,null);g.update(1);assert.equal(g.clock.pending.reservedAt,60000);
  g.paused=true;g.update(300000);assert.equal(g.clock.elapsed,60000);g.paused=false;assert.equal(g.clock.events.filter(e=>e.event==='reserve').length,1);assert.equal(g.newToy(),false);g.clear();assert.equal(g.clock.elapsed,0);assert.equal(g.clock.events.length,1);assert.equal(g.p.type,kind);g.reset('repeat');assert.equal(g.clock.pending,null);g.newToy();assert.equal(g.p.type,kind);
 });
 test(`${kind}: a stalled reservation is coalesced, full board stops time, new session cancels it`,()=>{
  const g=make(kind);g.reset('cycle');advanceClockOnly(g,180000);assert.equal(g.clock.pending.reservedAt,60000);assert.equal(g.clock.skipped,2);g.p.state='full';g.update(30000);assert.equal(g.clock.elapsed,180000);g.reset('repeat');assert.equal(g.clock.elapsed,0);assert.equal(g.clock.pending,null);
 });
 test(`${kind}: a single three-minute active frame counts time but does not replay a burst of pieces`,()=>{
  const g=make(kind);g.reset('cycle');const id=g.p.id;g.update(180000);assert.equal(g.clock.elapsed,180000);assert.equal(g.p.id,id);assert.equal(g.clock.pending.reservedAt,60000);assert.equal(g.clock.skipped,2);
 });
 test(`${kind}: inserting toys does not consume or reorder the independent normal stream`,()=>{
  function sequence(insert){const g=make(kind);g.reset('cycle');const out=[];for(let i=0;i<8;i++){if(insert&&i%2){g.clock.pending={reservedAt:i*60000,reason:'periodic'};g.spawn();}g.spawn();assert.equal(g.p.type,'normal');out.push([g.p.cells,g.p.colour,g.p.normalIndex]);}return out;}
  assert.deepEqual(sequence(true),sequence(false));
 });
 test(`${kind}: 15/30/60/120 Hz yield the same physical lock, without timer slowdown`,()=>{
  const outcomes=[];for(const hz of [15,30,60,120]){const g=make(kind);g.drop();for(let i=0;i<hz*2;i++)g.update(1000/hz);assert.ok(Math.abs(g.clock.elapsed-2000)<1e-6);outcomes.push([g.board,g.lastLock]);}outcomes.slice(1).forEach(o=>assert.deepEqual(o,outcomes[0]));
 });
}
