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
 assert.ok(f.project(p).scale>initial*2,'foreground visibly grows toward viewer');
 assert.ok(p.tilt>tilt+1.2,'flower tumbles rather than only spinning flat');
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
test('every cleared cell emits exactly three petals simultaneously from its own center',()=>{
 const a=boot({FX:'real'}),f=a.fx;f.canvas.width=360;f.canvas.height=720;
 for(const lines of [1,2,3,4])for(const combo of [0,8]){
  f.clear();const source=cells.slice(0,lines*10);f.trigger(source,lines,combo);
  assert.equal(f.particles.length,lines*30);
  for(const c of source){const group=f.particles.filter(p=>p.col===c.col&&p.row===c.row);
   assert.equal(group.length,3);
   for(const p of group){assert.equal(p.x,(c.col+.5)*36);assert.equal(p.y,(c.row+.5)*36);assert.equal(p.age,0);}
  }
 }
});
test('each cell stays horizontally balanced through projection, including edge cells',()=>{
 const a=boot({FX:'real'}),f=a.fx;f.trigger(cells,4,9);
 for(let frame=0;frame<50;frame++){
  f.update(16);
  for(const c of cells){const group=f.particles.filter(p=>p.col===c.col&&p.row===c.row);
   const center=group.reduce((sum,p)=>sum+f.project(p).x,0)/3;
   assert.ok(Math.abs(center-(c.col+.5)*36)<1e-8,'no sideways drift from a block');
  }
 }
});

test('neighboring cells vary naturally and depth growth slows smoothly without a hard stop',()=>{
 const a=boot({FX:'real'}),f=a.fx;f.trigger(cells.slice(0,10),1,0);
 const centers=f.particles.filter(p=>p.vx===0);
 assert.ok(new Set(centers.map(p=>p.approach)).size>=4,'not a repeated identical launch');
 assert.ok(new Set(centers.map(p=>p.tilt)).size>=4,'petals do not turn edge-on together');
 const p=centers[0];f.update(100);const first=p.z;
 f.update(100);const second=p.z-first;
 assert.ok(second>0&&second<first,'growth smoothly eases after the initial pop');
 for(let i=0;i<5;i++)f.update(100);const before=p.z;f.update(100);
 assert.ok(p.z>before&&p.z-before<second,'no abrupt perspective clamp');
 assert.ok(f.project(p).scale<2.6,'large petals do not blanket the next block');
});

test('petals spray toward the viewer without upward travel and only settle slightly late',()=>{
 const a=boot({FX:'real'}),f=a.fx;f.trigger(cells,4,0);
 for(let frame=0;frame<50;frame++){
  f.update(16);
  for(const p of f.particles){const q=f.project(p);
   assert.ok(q.y>=p.oy,'never rises above its launch point');
   if(p.age<=250)assert.equal(q.y,p.oy,'initial burst goes straight forward');
   assert.ok(q.y-p.oy<15,'only a slight late descent');
   if(p.age>=200)assert.ok(q.scale>1.9,'initial burst visibly approaches viewer');
  }
 }
});
