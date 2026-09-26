'use strict';
// Focused update/frame regression only. DOM, rendering and engines are stubs.
// Run against repository source: node --test tests/main-runtime.test.cjs
// LOCAL_APP_SOURCE is only used to run the exact fetched function excerpt offline.
const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(process.env.LOCAL_APP_SOURCE||path.join(__dirname,'../dist/endless-app.js'),'utf8');
const from=source.indexOf('function update(raw){'),to=source.indexOf('\nfunction desertAtmosphere',from);
assert.ok(from>=0&&to>from,'actual update function delimiters');
const fixed=source.slice(from,to),frame=source.match(/function frame\(now\)\{[^\n]+\}/)?.[0];
assert.ok(frame,'actual frame function');
const anchor="if(calloutTime>0&&(calloutTime-=dt)<=0)$('callout').classList.remove('show');";
assert.ok(fixed.includes(anchor));
const broken=fixed.replace(anchor,anchor+'if(mascotTime>0&&(mascotTime-=dt)<=0)');
function boot({kind='normal',state='playing',brokenSource=false,practice=false,hitStop=false}={}){
 let steps=0,draws=0,queued=0,moves=0,saves=0,resolves=0,spawns=0;
 const ctx={kind,state,reduced:false,shatterFX:{update:()=>hitStop},elapsed:0,adaptive:{tick(){}},
 repeat:null,drag:null,run:{active:{},score:264,gravity:1000,lockDelay:500,fits:()=>true,move(){moves++;},step(){steps++;}},
 fallTime:0,lockTime:0,phase:'flash',phaseTime:0,pending:{rows:[19]},falls:[],fx:[],floaters:[],impact:null,trail:null,
 calloutTime:0,recordBest:0,initialBest:0,recordAnnounced:false,lastSave:0,last:0,lastHUD:0,desert:{level:0,relicMeter:0},
 playing:()=>ctx.state==='playing'||ctx.state==='clearing',canAct:()=>ctx.state==='playing',practice:()=>practice,
 desertTick(){},itemTick(){},sandEvents(){},hiddenMove(){},action(){},lockNormal(){},
 resolveNormal(){resolves++;return{falls:[]};},nextNormal(){spawns++;ctx.state='playing';},
 processSwipe(){},hud(){},draw(){draws++;},rememberScore(){saves++;ctx.lastSave=ctx.last;},desertRecord(){},awardRelic(){},
 performance:{now:()=>ctx.last},$:()=>({classList:{remove(){}},parentElement:{classList:{add(){}}}}),
 requestAnimationFrame(){queued++;}};
 vm.createContext(ctx);vm.runInContext((brokenSource?broken:fixed)+'\n'+frame,ctx);
 return{ctx,get stats(){return{steps,draws,queued,moves,saves,resolves,spawns};}};
}
for(const kind of ['normal','sand']){
 test(kind+': old WORLD 2A defect reproduced',()=>{const a=boot({kind,brokenSource:true});assert.throws(()=>a.ctx.frame(16),/mascotTime is not defined/);assert.equal(a.stats.queued,0);});
 test(kind+': 180 frames continue without mascot globals',()=>{const a=boot({kind});for(let i=1;i<=180;i++)a.ctx.frame(i*16);assert.equal(a.stats.queued,180);assert.equal(a.stats.draws,180);assert.ok(a.ctx.elapsed>2000);assert.equal(a.ctx.recordBest,264);if(kind==='sand')assert.equal(a.stats.steps,180);else assert.ok(a.stats.moves>=2);});
 test(kind+': pause freezes time and preserves frame loop',()=>{const a=boot({kind,state:'paused'});for(let i=1;i<=5;i++)a.ctx.frame(i*16);assert.equal(a.ctx.elapsed,0);assert.equal(a.stats.queued,5);});
}
test('best score is not gated by deleted mascot timer',()=>{const a=boot();a.ctx.update(16);assert.equal(a.ctx.recordBest,264);});
test('practice remains excluded from best score',()=>{const a=boot({practice:true});a.ctx.update(16);assert.equal(a.ctx.recordBest,0);});
test('clear flash and compact phases complete',()=>{const a=boot({state:'clearing'});for(let i=0;i<6;i++)a.ctx.update(100);assert.equal(a.stats.resolves,1);assert.equal(a.stats.spawns,1);assert.equal(a.ctx.state,'playing');});
test('effect hit-stop does not kill scheduled rendering',()=>{const a=boot({hitStop:true});a.ctx.frame(100);assert.equal(a.ctx.elapsed,0);assert.equal(a.stats.queued,1);});
test('callout cleanup still runs',()=>{const a=boot();a.ctx.calloutTime=10;assert.doesNotThrow(()=>a.ctx.update(16));assert.ok(a.ctx.calloutTime<=0);});
test('fixed update has no placeholder mascot dependencies',()=>{assert.doesNotMatch(fixed,/mascotTime|mascotMood|mascot\(/);});
