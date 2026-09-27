/* CRAYON BLOOM: bounded, cached doodle particles. Visual only; never hit-stops play. */
(() => {
'use strict';
const PALETTE=['#f58db8','#77c9f4','#82d89b','#ffd86e','#caa0ef','#ffb09a'];
class CrayonBloomFX {
 constructor(canvas,opts={}){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.cellSize=opts.cellSize||36;this.maxParticles=opts.maxParticles||180;this.particles=[];this.blooms=[];this.sprites=new Map();}
 sprite(shape,color){
  const key=shape+color;if(this.sprites.has(key))return this.sprites.get(key);
  const c=document.createElement('canvas');c.width=c.height=48;const g=c.getContext('2d');g.translate(24,24);g.fillStyle=color;g.strokeStyle='#775477';g.lineWidth=1.4;g.lineJoin='round';g.beginPath();
  if(shape==='heart'){g.moveTo(0,15);g.bezierCurveTo(-27,-2,-13,-25,0,-10);g.bezierCurveTo(13,-25,27,-2,0,15);}
  else if(shape==='flower'){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;g.moveTo(Math.cos(a)*10+8,Math.sin(a)*10);g.arc(Math.cos(a)*10,Math.sin(a)*10,8,0,Math.PI*2);}}
  else if(shape==='star'){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?8:19;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();}
  else if(shape==='cloud'){g.moveTo(-18,9);g.bezierCurveTo(-29,-2,-14,-15,-7,-9);g.bezierCurveTo(-5,-24,15,-20,15,-7);g.bezierCurveTo(28,-6,25,12,14,12);g.closePath();}
  else if(shape==='scribble'){g.moveTo(-17,8);g.bezierCurveTo(22,-25,-24,-21,-4,12);g.bezierCurveTo(23,23,25,-18,0,-10);g.bezierCurveTo(-18,2,2,19,18,0);}
  else if(shape==='petal'){g.moveTo(0,17);g.bezierCurveTo(-24,-4,-7,-27,7,-13);g.bezierCurveTo(17,-3,8,10,0,17);}
  else{g.moveTo(-15,-9);g.lineTo(7,-14);g.lineTo(17,1);g.lineTo(5,13);g.lineTo(-13,8);g.closePath();}
  g.fill();g.stroke();g.save();g.clip();g.strokeStyle='#fff7e8';g.globalAlpha=.48;g.lineWidth=2;
  for(let i=-20;i<22;i+=6){g.beginPath();g.moveTo(-22,i);g.lineTo(22,i-10);g.stroke();}g.restore();
  if(shape==='flower'){g.fillStyle='#fff2ae';g.beginPath();g.arc(0,0,4,0,Math.PI*2);g.fill();}
  this.sprites.set(key,c);return c;
 }
 trigger(cells,lines=1,combo=0){
  if(!cells?.length)return;
  const power=Math.min(4,Math.max(1,lines)),boost=Math.min(3,Math.max(0,combo-1));
  const count=Math.min(this.maxParticles,Math.round(32+power*24+boost*12));
  this.particles.splice(0,Math.max(0,this.particles.length+count-this.maxParticles));
  const cy=cells.reduce((v,c)=>v+(c.row+.5)*this.cellSize,0)/cells.length;
  const y=Math.max(46,Math.min(this.canvas.height-48,cy));
  this.blooms.push({y,age:0,life:power===4?850:480,power});this.blooms=this.blooms.slice(-3);
  for(let i=0;i<count;i++){
   const cell=cells[i%cells.length],shape=i%5===0?'crumb':['petal','star','heart','flower'][i%4];
   const color=cell.color||PALETTE[i%PALETTE.length],a=Math.random()*Math.PI*2;
   const speed=55+Math.random()*(85+power*24),fountain=power===4&&i%3===0;
   this.particles.push({x:fountain?this.canvas.width/2:(cell.col+.5)*this.cellSize,y:(cell.row+.5)*this.cellSize,
    vx:fountain?(Math.random()-.5)*270:Math.cos(a)*speed,vy:fountain?-220-Math.random()*170:Math.sin(a)*speed-100,
    angle:a,spin:(Math.random()-.5)*5,age:0,life:650+Math.random()*600+power*70,
    size:shape==='crumb'?5+Math.random()*5:11+Math.random()*8+power,phase:a,sprite:this.sprite(shape,color)});
  }
 }
 item(event,definition){
  if(!definition||!Number.isFinite(event.x)||!Number.isFinite(event.y))return;
  const bad=definition.kind==='bad'&&event.status!=='purified'&&event.status!=='removed';
  const x=(event.x+.5)*this.cellSize,y=(event.y+.5)*this.cellSize,count=bad?16:26;
  this.particles.splice(0,Math.max(0,this.particles.length+count-this.maxParticles));
  const shapes=bad?['cloud','scribble','crumb']:['flower','star','heart','crumb'];
  for(let i=0;i<count;i++){const a=i*Math.PI*2/count,color=bad?['#9d96b4','#b5a0c9','#9194ab'][i%3]:PALETTE[i%6];
   this.particles.push({x,y,vx:Math.cos(a)*(40+Math.random()*65),vy:Math.sin(a)*65-65,angle:a,spin:(Math.random()-.5)*3,age:0,life:600+Math.random()*350,size:8+Math.random()*7,phase:a,sprite:this.sprite(shapes[i%shapes.length],color)});
  }
  this.blooms.push({x,y,age:0,life:550,power:1,item:event.type,bad});this.blooms=this.blooms.slice(-3);
 }
 update(ms){
  const dt=Math.max(0,Math.min(100,Number.isFinite(ms)?ms:0)),s=dt/1000;
  let n=0;for(const p of this.particles){p.age+=dt;if(p.age>=p.life)continue;p.vx*=Math.exp(-s*1.2);p.vy+=165*s;p.x+=p.vx*s+Math.sin(p.age*.006+p.phase)*s*12;p.y+=p.vy*s;p.angle+=p.spin*s;this.particles[n++]=p;}this.particles.length=n;
  n=0;for(const b of this.blooms){b.age+=dt;if(b.age<b.life)this.blooms[n++]=b;}this.blooms.length=n;
  return false;
 }
 draw(){
  const g=this.ctx;g.save();
  for(const b of this.blooms){const t=b.age/b.life;
   if(b.item){g.save();g.globalAlpha=(1-t)*.65;g.lineWidth=2;g.lineCap='round';
    for(let i=0;i<3;i++){g.strokeStyle=b.bad?'#a49abd':PALETTE[i*2];g.beginPath();
     if(b.item==='oasis'){g.moveTo(0,b.y+i*3);g.quadraticCurveTo(180,b.y-9+i*3,this.canvas.width*Math.min(1,t*3),b.y+i*3);}
     else if(b.item==='spear'){g.moveTo(b.x+i*3,b.y);g.lineTo(b.x+i*3,Math.min(this.canvas.height,b.y+180*t));}
     else{g.moveTo(b.x-15,b.y+i*5);g.bezierCurveTo(b.x+25,b.y-24,b.x-25,b.y+24,b.x+15,b.y+i*5);}g.stroke();
    }g.restore();continue;
   }
   g.save();g.translate(this.canvas.width/2,b.y);g.globalAlpha=(1-t)*.65;g.lineWidth=2.3;g.strokeStyle=PALETTE[b.power%6];
   g.beginPath();for(let i=0;i<=100;i++){const a=i*Math.PI*2/100,r=(12+95*t)*(1+.19*Math.cos(a*6)),x=Math.cos(a)*r,y=Math.sin(a)*r*.55;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
   for(let i=0;i<8+b.power*2;i++){const a=i*Math.PI*2/(8+b.power*2),r=20+120*t;g.strokeStyle=PALETTE[i%6];g.beginPath();g.moveTo(Math.cos(a)*r,Math.sin(a)*r*.5);g.quadraticCurveTo(Math.cos(a+.15)*(r+12),Math.sin(a+.15)*(r+12)*.5,Math.cos(a)*(r+23),Math.sin(a)*(r+23)*.5);g.stroke();}g.restore();
  }
  for(const p of this.particles){const t=p.age/p.life;g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.globalAlpha=Math.min(1,(1-t)*2.4)*.94;const size=p.size*(.8+Math.min(1,t*8)*.2);g.drawImage(p.sprite,-size/2,-size/2,size,size);g.restore();}
  g.restore();
 }
 clear(){this.particles.length=0;this.blooms.length=0;}
}
window.CrayonBloomFX=CrayonBloomFX;
})();
