'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
const cells=Array.from({length:40},(_,i)=>({col:i%10,row:16+Math.floor(i/10),color:'#f58db8'}));
test('flower bursts remain bounded during repeated four-line clears and fully expire',()=>{
 const a=boot({FX:'real'}),f=a.fx;
 for(let i=0;i<100;i++){f.trigger(cells,4,8);assert.equal(f.update(16),false);f.draw();assert.ok(f.particles.length<=180);assert.ok(f.blooms.length<=3);}
 for(let i=0;i<30;i++)f.update(100);
 assert.equal(f.particles.length,0);assert.equal(f.blooms.length,0);
});
test('flower effects clear on reset and do not create input timers',()=>{
 const a=boot({FX:'real'}),f=a.fx;const before=a.timers.size;
 f.trigger(cells,2,3);f.update(100);f.draw();assert.equal(a.timers.size,before);
 f.clear();assert.equal(f.particles.length,0);assert.equal(f.blooms.length,0);
});
test('forward flowers grow in perspective, tumble, sort by depth and fall',()=>{
 const a=boot({FX:'real'}),f=a.fx;
 f.trigger(cells,4,3);const p=f.particles.find(p=>p.vz>=600);const initial=f.project(p).scale,tilt=p.tilt;
 for(let i=0;i<6;i++)f.update(100);
 assert.ok(f.project(p).scale>initial*2.5,'foreground visibly grows toward viewer');
 assert.ok(p.tilt>tilt+2,'flower tumbles rather than only spinning flat');
 assert.ok(p.vy>0,'gravity turns flight downward');
 assert.ok(f.particles.every((p,i,ps)=>!i||ps[i-1].z<=p.z),'far particles draw before near ones');
 assert.ok(f.particles.every(p=>Number.isFinite(f.project(p).scale)&&f.project(p).scale<=4));
 f.draw();
});
test('projected burst stays centered with equal size on both sides throughout flight',()=>{
 const a=boot({FX:'real'}),f=a.fx;f.canvas.width=360;f.canvas.height=720;
 for(const lines of [1,2,4]){
  f.clear();f.trigger(cells.slice(0,lines*10),lines,4);
  for(let frame=0;frame<60;frame++){
   f.update(16);
   let weight=0,moment=0;
   for(const p of f.particles){if(p.age<0)continue;const q=f.project(p),size=p.size*q.scale;
    if(q.x+size<0||q.x-size>360||q.y-size>720)continue;
    const w=size*size;weight+=w;moment+=(q.x-180)*w;
   }
   if(weight)assert.ok(Math.abs(moment/weight)<1e-8,'visible size-weighted center remains at board center');
  }
 }
});
test('single-line clears are dense and four-line clears add a longer three-wave burst',()=>{
 const a=boot({FX:'real'}),f=a.fx;f.canvas.width=360;f.canvas.height=720;
 f.trigger(cells.slice(0,10),1,0);assert.equal(f.particles.length,112);
 const singleDelay=Math.max(...f.particles.map(p=>-p.age));
 assert.ok(f.particles.every(p=>Math.abs(p.x-180)<=57),'launch stays centered');
 for(let i=0;i<3;i++)f.update(100);
 assert.ok(f.particles.filter(p=>{const q=f.project(p);return q.x>=0&&q.x<=360;}).length>=100,'dense burst stays on screen');
 f.clear();f.trigger(cells,4,0);assert.equal(f.particles.length,180);
 assert.ok(Math.max(...f.particles.map(p=>-p.age))>singleDelay+100,'four lines have a longer layered release');
});
