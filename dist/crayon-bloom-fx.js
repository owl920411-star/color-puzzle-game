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
  else if(shape==='flower'){for(let i=0;i<=80;i++){const a=i*Math.PI*2/80-Math.PI/2,r=15+4*Math.cos(i*Math.PI*10/80),x=Math.cos(a)*r,y=Math.sin(a)*r;i?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();}
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
  const power=Math.min(4,Math.max(1,lines));
  // Exactly three petals per cleared block; retire old effects to make room.
  const sources=cells.slice(0,Math.floor(this.maxParticles/3)),count=sources.length*3;
  this.particles.splice(0,Math.max(0,this.particles.length+count-this.maxParticles));
  const rows=[...new Set(sources.map(c=>c.row))].slice(0,4);
  this.blooms.push({rows,age:0,life:150,power});this.blooms=this.blooms.slice(-3);
  const seed=Math.random()*1000,columns=Math.round(this.canvas.width/this.cellSize);
  for(const cell of sources){
   const ox=(cell.col+.5)*this.cellSize,oy=(cell.row+.5)*this.cellSize;
   // Neighboring cells vary, while mirror columns share motion weight to avoid a sideways bias.
   const column=Math.min(cell.col,columns-1-cell.col),mirror=cell.col<(columns-1)/2?-1:1;
   const sample=n=>{const v=Math.sin(seed+column*53+cell.row*17+n*113)*43758.5453;return v-Math.floor(v);};
   const spread=35+sample(1)*35;
   for(const side of [-1,0,1]){
    const middle=side===0,approachMs=260+sample(middle?3:4)*60;
    const targetScale=middle?2.8+sample(20)*.4:2+sample(21)*.6;
    const angle=middle?mirror*sample(7)*Math.PI:side*(.3+sample(8)*1.8),tilt=sample(middle?11:12)*Math.PI;
    // Start all three at the actual block. Only their motion varies; no row-wise sweep or delay.
    this.particles.push({x:ox,y:oy,ox,oy,col:cell.col,row:cell.row,
     vx:side*spread,launchVX:side*spread,vy:0,launchVY:middle?15+sample(2)*85:25+sample(5)*130,z:460*(1-1/.55),approachMs,targetScale,
     gravity:middle?1000+sample(6)*2200:1400+sample(19)*3200,angle,startAngle:angle,
     spin:middle?mirror*(2+sample(9)*5):side*(4+sample(10)*5),
     tilt,startTilt:tilt,flip:7+sample(middle?13:14)*6,
     age:0,life:approachMs+360+sample(middle?15:16)*100,size:middle?14+sample(17)*7:8+sample(18)*8,
     phase:0,burst:true,sprite:this.sprite('petal',cell.color||PALETTE[0])});
   }
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
  let n=0;for(const p of this.particles){
   p.age+=dt;if(p.age>=p.life)continue;
   if(p.age<0){this.particles[n++]=p;continue;}
   const step=Math.min(dt,p.age)/1000;
   if(p.burst){
    const time=p.age/1000,u=Math.min(1,p.age/p.approachMs);
    const fall=Math.max(0,(p.age-p.approachMs)/1000),gravityTime=Math.max(0,fall-.055);
    // First visibly approach the viewer. The downward clock starts only after that stage.
    const scale=.55+(p.targetScale-.55)*u*u*(3-2*u);
    p.z=460*(1-1/scale);
    p.x=p.ox+p.launchVX*(1-Math.exp(-4*time))/4;
    p.y=p.oy+p.launchVY*fall+.5*p.gravity*gravityTime*gravityTime;
    p.vy=fall>0?p.launchVY+p.gravity*gravityTime:0;
    p.angle=p.startAngle+p.spin*fall;p.tilt=p.startTilt+p.flip*fall;
   }else{
    p.vx*=Math.exp(-s*1.2);p.vy+=165*s;
    p.x+=p.vx*step+Math.sin(p.age*.006+p.phase)*step*12;p.y+=p.vy*step;
   }
   if(!p.burst)p.angle+=p.spin*step;this.particles[n++]=p;
  }this.particles.length=n;
  // Far flowers paint first; close flowers overlap them, reinforcing depth.
  this.particles.sort((a,b)=>(a.z||0)-(b.z||0));
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
   // A short crayon stroke ties the row together. No full-screen flash or shake.
   for(const row of b.rows){g.save();g.globalAlpha=Math.max(0,1-t*3)*.7;g.strokeStyle='#ffe5a0';g.lineWidth=3+8*(1-t);g.lineCap='round';g.beginPath();g.moveTo(6,(row+.5)*this.cellSize);g.lineTo(this.canvas.width-6,(row+.5)*this.cellSize);g.stroke();g.restore();}
  }
  for(const p of this.particles){
   if(p.age<0)continue;const t=p.age/p.life;
   const perspective=p.burst?this.project(p):{x:p.x,y:p.y,scale:1};
   const size=p.size*perspective.scale;
   if(perspective.x+size<0||perspective.x-size>this.canvas.width||perspective.y-size>this.canvas.height)continue;
   g.save();g.translate(perspective.x,perspective.y);g.rotate(p.angle);
   if(p.burst)g.scale(1,perspective.faceScale);
   g.globalAlpha=(p.burst?Math.min(1,(1-t)*5):Math.min(1,(1-t)*2.4))*.94;

   g.drawImage(p.sprite,-size/2,-size/2,size,size);g.restore();
  }
  g.restore();
 }
 project(p){
  const scale=460/(460-p.z),fall=Math.max(0,p.age-p.approachMs);
  // Keep the petal face visible during enlargement; introduce tumbling only as it falls.
  const faceScale=1+(.24+.76*Math.abs(Math.cos(p.tilt))-1)*Math.min(1,fall/80);
  return {x:p.ox+(p.x-p.ox)*scale,y:p.oy+(p.y-p.oy)*scale,scale,faceScale};
 }
 clear(){this.particles.length=0;this.blooms.length=0;}
}
window.CrayonBloomFX=CrayonBloomFX;
})();
