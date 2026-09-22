/* GLASSFALL — SHATTER FX 2.0 / spectacle tier 10
 * Normal-mode line clear presentation only. No game-state mutation.
 */
class GlassShatterFX {
 constructor(canvas,opts={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');
  this.cellSize=opts.cellSize??36;this.originX=opts.originX??0;this.originY=opts.originY??0;
  this.maxParticles=opts.maxParticles??360;this.particles=[];this.rings=[];this.streaks=[];this.glints=[];
  this.flash={alpha:0,decay:.0026,tint:'255,255,255'};this.shake={time:0,duration:0,magnitude:0};this.hitStopMs=0;
  this.lineBursts=[];this.chromatic=0;
  this.palette=['rgba(225,250,255,.98)','rgba(153,231,255,.95)','rgba(178,196,255,.94)','rgba(255,255,255,.98)','rgba(115,210,235,.9)','rgba(205,174,255,.9)'];
 }
 trigger(cells,lineCount=1){
  if(!cells?.length)return;
  const n=Math.max(1,lineCount),power=1+Math.min(3,n-1)*.55;
  const rows=[...new Set(cells.map(c=>c.row))];
  for(const c of cells)this._cellBurst(c.col,c.row,power,n);
  for(const row of rows)this._lineBurst(row,power,n);
  const cy=(rows.reduce((a,b)=>a+b,0)/rows.length+.5)*this.cellSize+this.originY;
  this.rings.push({x:this.originX+5*this.cellSize,y:cy,r:8,max:120+n*28,life:360+n*45,total:360+n*45,width:2+n*.65});
  this.flash.alpha=Math.min(.18+n*.105,.58);this.flash.tint=n>=4?'220,245,255':'255,255,255';
  this.chromatic=Math.max(this.chromatic,n>=4?1:n>=3?.58:n>=2?.25:0);
  if(n>=2){this.shake.duration=145+n*48;this.shake.time=this.shake.duration;this.shake.magnitude=2.5+n*1.75;}
  if(n>=3)this.hitStopMs=n>=4?82:46;
 }
 _cellBurst(col,row,power,n){
  const cx=this.originX+(col+.5)*this.cellSize,cy=this.originY+(row+.5)*this.cellSize;
  const count=Math.round((5+n*1.5)*power);
  for(let i=0;i<count;i++){
   if(this.particles.length>=this.maxParticles)this.particles.shift();
   const a=Math.random()*Math.PI*2,sp=(.07+Math.random()*.19)*power,size=this.cellSize*(.08+Math.random()*.19);
   this.particles.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.055,size,rot:Math.random()*6.283,vr:(Math.random()-.5)*.018,life:460+Math.random()*420,age:0,color:this.palette[(Math.random()*this.palette.length)|0],trail:Math.random()<.34});
  }
  if(Math.random()<.85)this.glints.push({x:cx,y:cy,life:260+Math.random()*220,total:420,size:7+Math.random()*13});
 }
 _lineBurst(row,power,n){
  const y=this.originY+(row+.5)*this.cellSize;
  this.lineBursts.push({y,life:300+n*45,total:300+n*45,power});
  const count=10+n*5;
  for(let i=0;i<count;i++){
   const dir=i%2?1:-1,x=this.originX+(i/(count-1))*10*this.cellSize;
   this.streaks.push({x,y,vx:dir*(.22+Math.random()*.28)*power,vy:(Math.random()-.5)*.055,life:220+Math.random()*210,total:430,len:18+Math.random()*38});
  }
 }
 update(dt){
  dt=Math.min(50,Math.max(0,dt));
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;if(p.age>=p.life){this.particles.splice(i,1);continue;}p.vy+=.00062*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;p.vx*=Math.pow(.9992,dt);}
  for(const a of [this.rings,this.streaks,this.glints,this.lineBursts])for(let i=a.length-1;i>=0;i--){a[i].life-=dt;if(a[i].life<=0)a.splice(i,1);}
  for(const s of this.streaks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=Math.pow(.996,dt);}
  if(this.shake.time>0)this.shake.time=Math.max(0,this.shake.time-dt);
  this.flash.alpha=Math.max(0,this.flash.alpha-this.flash.decay*dt);this.chromatic=Math.max(0,this.chromatic-dt*.0028);
  const stop=this.hitStopMs>0;if(stop)this.hitStopMs=Math.max(0,this.hitStopMs-dt);return stop;
 }
 getShakeOffset(){if(this.shake.time<=0)return{x:0,y:0};const q=this.shake.time/this.shake.duration,m=this.shake.magnitude*q*q;return{x:(Math.random()*2-1)*m,y:(Math.random()*2-1)*m};}
 draw(){
  const g=this.ctx;g.save();g.globalCompositeOperation='lighter';
  for(const b of this.lineBursts){const q=Math.max(0,b.life/b.total),grad=g.createLinearGradient(0,b.y-22,0,b.y+22);grad.addColorStop(0,'rgba(130,230,255,0)');grad.addColorStop(.5,`rgba(220,250,255,${.38*q})`);grad.addColorStop(1,'rgba(130,230,255,0)');g.fillStyle=grad;g.fillRect(0,b.y-22,this.canvas.width,44);}
  for(const r of this.rings){const q=r.life/r.total,t=1-q,rad=r.r+(r.max-r.r)*(1-Math.pow(q,2));g.globalAlpha=q*.72;g.strokeStyle='#baf7ff';g.lineWidth=Math.max(.6,r.width*q);g.beginPath();g.ellipse(r.x,r.y,rad,rad*.22,0,0,Math.PI*2);g.stroke();}
  for(const s of this.streaks){const q=Math.max(0,s.life/s.total);g.globalAlpha=q*.7;const grad=g.createLinearGradient(s.x-s.len,s.y,s.x+s.len,s.y);grad.addColorStop(0,'rgba(130,220,255,0)');grad.addColorStop(.5,'rgba(245,255,255,.95)');grad.addColorStop(1,'rgba(170,210,255,0)');g.strokeStyle=grad;g.lineWidth=1.1+q;g.beginPath();g.moveTo(s.x-s.len,s.y);g.lineTo(s.x+s.len,s.y);g.stroke();}
  for(const p of this.particles){const q=Math.max(0,1-p.age/p.life);g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.globalAlpha=Math.min(1,q*1.35);if(p.trail){g.strokeStyle=p.color;g.lineWidth=Math.max(.5,p.size*.08);g.beginPath();g.moveTo(-p.vx*75,-p.vy*75);g.lineTo(0,0);g.stroke();}g.fillStyle=p.color;g.shadowBlur=8*q;g.shadowColor='#aeefff';g.beginPath();g.moveTo(0,-p.size);g.lineTo(p.size*.82,p.size*.52);g.lineTo(p.size*.15,p.size*.92);g.lineTo(-p.size*.72,p.size*.35);g.closePath();g.fill();g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=Math.max(.45,p.size*.055);g.stroke();g.restore();}
  for(const s of this.glints){const q=Math.max(0,s.life/s.total),k=s.size*(1+(1-q)*1.5);g.save();g.translate(s.x,s.y);g.globalAlpha=Math.sin(Math.PI*q)*.9;g.strokeStyle='#fff';g.lineWidth=1.2;g.beginPath();g.moveTo(-k,0);g.lineTo(k,0);g.moveTo(0,-k);g.lineTo(0,k);g.moveTo(-k*.45,-k*.45);g.lineTo(k*.45,k*.45);g.moveTo(k*.45,-k*.45);g.lineTo(-k*.45,k*.45);g.stroke();g.restore();}
  g.restore();
  if(this.chromatic>0){g.save();g.globalCompositeOperation='screen';g.globalAlpha=.055*this.chromatic;g.fillStyle='#52d9ff';g.fillRect(0,0,4,this.canvas.height);g.fillStyle='#d777ff';g.fillRect(this.canvas.width-4,0,4,this.canvas.height);g.restore();}
  if(this.flash.alpha>0){g.save();g.globalAlpha=this.flash.alpha;g.fillStyle=`rgb(${this.flash.tint})`;g.fillRect(0,0,this.canvas.width,this.canvas.height);g.restore();}
 }
 clear(){this.particles.length=this.rings.length=this.streaks.length=this.glints.length=this.lineBursts.length=0;this.shake.time=0;this.flash.alpha=0;this.hitStopMs=0;this.chromatic=0;}
}
if(typeof window!=='undefined')window.GlassShatterFX=GlassShatterFX;
