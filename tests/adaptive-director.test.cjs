'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../dist/adaptive-director.js');
const blank=()=>Array.from({length:20},()=>Array(10).fill(null));
function met(height=6,holes=0){return {height,holes,cells:30,bump:5};}
function play(d,{count=1,ms=2400,nowStep=ms,lines=1,before=met(),natural=met(),actual=natural,valid=true,hardDrop=true,bad=false,context={level:2,gravity:1000,baseInterval:38000}}={}){
 for(let i=0;i<count;i++){
  if(bad)d.tick(400,true);
  for(let n=0;n<ms;n+=100)d.tick(Math.min(100,ms-n),true);
  if(valid)d.input(true);
  d.record({now:d.now+nowStep,before,natural,actual,lines,hardDrop,context});
 }return d;
}
test('default is observation, validated preferences',()=>{assert.deepEqual(D.options(),{mode:'observe',style:'balanced',guest:false});assert.equal(D.options({mode:'INVALID'}).mode,'observe');});
test('board metrics track holes, not just occupied count',()=>{const b=blank();b[17][3]={};b[19][3]={};const m=D.metrics(b);assert.equal(m.height,3);assert.equal(m.holes,1);assert.equal(m.cells,2);});
test('natural row compaction does not mutate input',()=>{const b=blank();b[19]=Array(10).fill({});b[18][2]={};const s=JSON.stringify(b),out=D.compact(b,[19]);assert.equal(JSON.stringify(b),s);assert.ok(out[19][2]);assert.equal(out.length,20);});
test('one combo never produces a difficulty increase',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:1,lines:4});assert.equal(d.pending,null);assert.equal(d.applied,1);});
test('fast stable productive sequence needs distinct windows then stages one step',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:30,ms:2000});assert.equal(d.pending,null);play(d,{count:6,ms:2000});assert.equal(d.pending.direction,'up');assert.equal(d.applied,1);assert.equal(d.pending.factor,.95);});
test('observation returns unchanged actual interval even with a pending proposal',()=>{const d=new D.Director();play(d,{count:40,ms:2000});assert.ok(d.pending);assert.equal(d.takeInterval(38000),38000);assert.equal(d.applied,1);assert.equal(d.proposed,.95);});
test('adaptive applies only when scheduling next full interval',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:40,ms:2000});assert.equal(d.applied,1);assert.equal(d.takeInterval(38000),36100);assert.equal(d.applied,.95);});
test('minimum fixed rules floor takes precedence at MAX',()=>{const d=new D.Director({mode:'adaptive'});d.pending={factor:.85,direction:'up'};assert.equal(d.takeInterval(11000),11000);assert.equal(d.applied,1);});
test('score or combo totals cannot override growing holes',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:60,ms:1000,lines:4,natural:met(12,5),before:met(10,0)});assert.equal(d.pending,null);assert.equal(d.decision.code,'unstable');});
test('slow stable player is kept steady, not classified as novice',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:22,ms:3500});assert.equal(d.pending,null);assert.equal(d.decision.code,'steady');});
test('waiting for a four-line preparation does not force a speed increase',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:40,ms:2000,lines:0});assert.equal(d.pending,null);assert.equal(d.decision.code,'planning');play(d,{count:1,ms:2000,lines:4});assert.equal(d.pending,null);});
test('invalid presses and natural idle falls cannot farm skill or relief',()=>{const d=new D.Director({mode:'adaptive'});for(let i=0;i<500;i++)d.input(false);play(d,{count:30,ms:2000,valid:false,natural:met(18,5)});assert.equal(d.validTotal,0);assert.equal(d.pending,null);});
test('active persistent danger can offer relief before high-skill sample minimum',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:8,ms:3000,natural:met(17,6)});assert.equal(d.pending.direction,'relief');assert.equal(d.pending.factor,1.05);});
test('no multiple pending steps before one cycle is consumed',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:150,ms:1000,natural:met(17,8)});assert.equal(d.pending.factor,1.05);assert.equal(d.proposed,1);});
test('cooldown and distinct placements block rapid alternation',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:8,ms:3000,natural:met(17,6)});d.takeInterval(38000);play(d,{count:8,ms:1000,natural:met(17,6)});assert.equal(d.pending,null);assert.equal(d.proposed,1.05);});
test('persistent risk has a finite per-recovery adjustment budget',()=>{const d=new D.Director({mode:'adaptive'});for(let i=0;i<15;i++){play(d,{count:12,ms:3000,natural:met(17,6)});d.takeInterval(38000);}assert.ok(d.proposed<=1.15);assert.equal(d.episode,3);});
test('chosen comfortable mode does not create faster-than-base challenge',()=>{const d=new D.Director({mode:'adaptive',style:'calm'});for(let i=0;i<5;i++){play(d,{count:36,ms:2000});d.takeInterval(38000);}assert.equal(d.proposed,1);});
test('mode off collects no input profile and schedules base intervals',()=>{const d=new D.Director({mode:'off'});play(d,{count:40});assert.equal(d.total,0);assert.equal(d.takeInterval(38000),38000);});
test('menus, clear animations and pause frames do not inflate placement speed',()=>{const d=new D.Director();d.tick(100,false);d.tick(30000,false);play(d,{ms:2000});assert.equal(d.lastPlacement.ms,2000);assert.equal(d.badMs,0);});
test('frame stalls exclude the affected placement and taint confidence',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:40,ms:2000,bad:true});assert.equal(d.pending,null);assert.equal(d.samples.filter(x=>x.reliable).length,0);assert.ok(d.badMs>0);});
test('hold time stays part of the same placement episode',()=>{const d=new D.Director();for(let i=0;i<20;i++)d.tick(100);d.input(true,{hold:true});for(let i=0;i<30;i++)d.tick(100);d.input(true);d.record({now:5000,before:met(),natural:met(),actual:met(),lines:1});assert.equal(d.lastPlacement.ms,5000);assert.equal(d.lastPlacement.holds,1);});
test('item clearing is measured separately, not instantly called skill',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:36,ms:2000});assert.ok(d.pending);d.system('item',met(18),met(4),d.now);assert.equal(d.pending,null);play(d,{ms:2000});assert.equal(d.decision.code,'effect');assert.equal(d.lastPlacement.assisted,true);});
test('ground event does not add a player placement or fake hole error',()=>{const d=new D.Director();d.system('ground',met(5),met(6,2),1000);assert.equal(d.total,0);assert.equal(d.events.ground,1);play(d,{before:met(6,2),natural:met(6,2)});assert.equal(d.lastPlacement.addedHoles,0);});
test('developer mutations exclude adaptation and learning',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:36,ms:2000});d.exclude();assert.equal(d.pending,null);assert.equal(d.takeInterval(38000),38000);assert.equal(D.learn(null,d.report('gameover')).completed,0);});
test('past high profile never starts a new game already harder',()=>{const p=D.newProfile();p.completed=100;p.contexts['L2-G10-P20']={ppm:90,lineRate:1,addedHoles:0,sessions:10};const d=new D.Director({mode:'adaptive'},p);assert.equal(d.proposed,1);assert.equal(d.applied,1);});
test('profiles compare matched context and smooth over completed sessions',()=>{const d=new D.Director();play(d,{count:40,ms:2000});const r=d.report('gameover');let p=D.learn(null,r);assert.equal(p.completed,1);const old=p.contexts['L2-G10-P20'].ppm;r.evidence[0].ppm=50;p=D.learn(p,r);assert.equal(p.contexts['L2-G10-P20'].ppm,old*.85+50*.15);});
test('guest, interrupted, stale-version or dev profiles do not learn',()=>{const d=new D.Director();play(d,{count:40,ms:2000});for(const add of [{guest:true},{practice:true},{outcome:'interrupted'},{version:'old'}])assert.equal(D.learn(null,{...d.report('gameover'),...add}).completed,0);});
test('corrupt stored profile is bounded and invalid fields are dropped',()=>{const p=D.cleanProfile({version:D.VERSION,completed:-2,contexts:{'L2-G10-P20':{ppm:Infinity,sessions:-1},'<script>':{ppm:2}}});assert.equal(p.completed,0);assert.equal(p.contexts['L2-G10-P20'].ppm,0);assert.equal(p.contexts['<script>'],undefined);});
test('time rewinds do not create negative latency or train old data',()=>{const d=new D.Director();play(d,{ms:2000});d.record({now:1,before:met(),natural:met(),actual:met()});assert.equal(d.practice,true);});
test('summary is bounded and records settings, versions and actual intervals',()=>{const d=new D.Director({mode:'adaptive'});for(let i=0;i<250;i++){play(d,{ms:3000,natural:met(17,5)});d.takeInterval(38000);}const s=d.report();assert.ok(d.samples.length<=120);assert.ok(s.changes.length<=80);assert.ok(s.intervalHistory.length<=80);assert.equal(s.ruleset,D.RULESET);assert.equal(s.mode,'adaptive');assert.ok(JSON.stringify(s).length<60000);});
test('negative/infinite ground intervals are rejected',()=>{const d=new D.Director();for(const n of [NaN,Infinity,0,-1])assert.throws(()=>d.takeInterval(n),RangeError);});

test('deteriorating placement cancels a previously queued challenge',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:36,ms:2000});assert.ok(d.pending);play(d,{ms:2000,natural:met(11,4)});assert.equal(d.pending,null);assert.equal(d.takeInterval(38000),38000);});
test('frame stall cancels an outstanding speed-up before the next cycle',()=>{const d=new D.Director({mode:'adaptive'});play(d,{count:36,ms:2000});assert.ok(d.pending);d.tick(300,true);assert.equal(d.pending,null);assert.equal(d.takeInterval(38000),38000);});
