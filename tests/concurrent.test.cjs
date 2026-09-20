const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Puzzle=require('../dist/engine.js');
const app=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');
const source=app.slice(app.indexOf('function checkComplete('),app.indexOf('\nfunction fly('));
(async()=>{const pending=new Map(),timers=[],result=[];const ctx={developer:false,eventWave:1,Puzzle,arrows:[{id:0,cells:[[0,0],[1,0]]},{id:1,cells:[[2,1],[2,0]]},{id:2,cells:[[3,2],[3,1]]}],n:8,moving:new Set(),blockedUntil:new Map(),hearts:3,epoch:1,mistakes:0,hints:0,stage:1,scores:{},eventBadges:{},completionScheduled:false,$:()=>({open:false}),clearGuides(){},tone(){},crystalBurst(){},drawFloor(){},hud(){},status(){},save(){},setTimeout:fn=>timers.push(fn),showResult:win=>result.push(win),fly:a=>new Promise(r=>pending.set(a.id,r))};vm.createContext(ctx);vm.runInContext(source,ctx);
const tasks=[];while(ctx.arrows.length){const a=ctx.arrows.find(a=>!Puzzle.blocker(a,ctx.arrows,ctx.n));assert(a);tasks.push(ctx.tap(a.id));assert.equal((await ctx.tap(a.id)).status,'unavailable','Duplicate move ignored');}
assert.equal(pending.size,3,'Three exits started without awaiting animation');assert.equal(timers.length,0,'Wait for all exits before completion');
for(const resolve of [...pending.values()].reverse())resolve();await Promise.all(tasks);assert.equal(ctx.moving.size,0);assert.equal(timers.length,1,'One completion only');timers[0]();assert.deepEqual(result,[true]);
console.log('PASS: concurrent dependent exits, duplicate taps, reverse completion order, single win.');})();
