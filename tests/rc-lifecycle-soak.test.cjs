'use strict';
// Accelerated controller/engine/FX-state soak. This does not measure browser FPS,
// browser DOM, AudioContext memory, actual wall-clock play or Android touch latency.
const test=require('node:test'),assert=require('node:assert/strict');
const {boot,B}=require('./helpers/adaptive-stable-harness.cjs');
for(const minutes of [10,20,30])test(`accelerated ${minutes}min real controller lifecycle and bounded FX/timers`,()=>{
 const a=boot({FX:'real',initial:{'glassfall-v1':JSON.stringify({sound:false,haptics:false,unknownPreference:'keep',endlessV1:{normal:{best:54321}}})}});
 a.q.start();a.q.draw();a.q.hud();const baseNodes=a.nodes.size,baseNames=[...a.nodes.keys()];let games=1,drops=0,pauses=0,maxParticles=0,maxTimers=0,maxNodes=baseNodes,nextDrop=1000;
 const fire=(type,x=60)=>{for(const fn of a.nodes.get('board').events[type]||[])fn({button:0,pointerId:1,clientX:x,clientY:200,preventDefault(){}});};
 const wallStart=performance.now();
 for(let t=0;t<minutes*60000;t+=100){
  if(a.q.state==='over'){assert.equal(a.q.drag,null);a.q.menu();a.q.start();games++;}
  if(t>0&&t%60000===0){
   fire('pointerdown');a.q.pause();const frozen=a.q.elapsed;assert.equal(a.q.drag,null);assert.equal(a.timers.size,0);
   a.advance(1000,100);assert.equal(a.q.elapsed,frozen);a.q.resume();assert.equal(a.q.drag,null);
   a.q.pause();a.q.menu();assert.equal(a.q.state,'menu');a.q.start();games++;pauses++;assert.equal(a.q.run.score,0);assert.equal(a.q.items.stats.spawned,0);
  }
  if(a.q.state==='playing'){
   if(t%1000===100)fire('pointerdown',(drops%2)?220:60);
   if(t%1000===400)fire('pointerup',(drops%2)?220:60);
   if(t>=nextDrop){a.q.action(drops%3===0?'rotate':'hold');a.q.action('drop');drops++;nextDrop=t+1000;}
  }
  if(t%5000===0)a.fx.trigger([{col:3,row:18,color:'#f58db8'},{col:4,row:18,color:'#77c9f4'}],1,2);
  a.advance(100,100);
  if(t%1000===0){a.q.draw();a.q.hud();assert.equal(a.q.run.board.length,20);assert.ok(a.q.run.board.every(row=>row.length===10));if(a.q.run.active&&a.q.state!=='over')assert.ok(B.fits(a.q.run.board,a.q.run.active));}
  maxParticles=Math.max(maxParticles,a.fx.particles.length);maxTimers=Math.max(maxTimers,a.timers.size);maxNodes=Math.max(maxNodes,a.nodes.size);
  assert.ok(a.fx.particles.length<=180);assert.ok(a.timers.size<=1,'only the live gesture may own a repeat timer');
 }
 fire('pointerup');a.q.pause();a.q.menu();a.advance(3000,100);
 assert.equal(a.q.drag,null);assert.equal(a.timers.size,0);assert.equal(a.fx.particles.length,0);
 assert.ok(maxNodes<=baseNodes+a.fx.sprites.size,`stand-in node registry grew: ${baseNodes} -> ${maxNodes} ${[...a.nodes.keys()].filter(n=>!baseNames.includes(n))}`);
 const saved=JSON.parse(a.store['glassfall-v1']);assert.equal(saved.unknownPreference,'keep');assert.equal(saved.sound,false);assert.equal(saved.haptics,false);assert.ok(saved.endlessV1.normal.best>=54321);
 console.log(JSON.stringify({kind:'accelerated-state-soak',simulatedMinutes:minutes,realTestMs:Math.round(performance.now()-wallStart),games,drops,pauses,maxParticles,maxRepeatTimers:maxTimers,standInNodes:{start:baseNodes,max:maxNodes,cachedParticleSprites:a.fx.sprites.size},fps:'NOT MEASURED',browserMemory:'NOT MEASURED',audio:'NOT LOADED'}));
});
