/* Cosmetic-only, event-driven celebration. No idle render loop or gameplay RNG. */
(()=>{
 'use strict';
 const app=document.getElementById('app'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const atmosphere=document.createElement('div');atmosphere.className='festival-atmosphere';atmosphere.setAttribute('aria-hidden','true');
 atmosphere.innerHTML='<i class="festival-beam beam-one"></i><i class="festival-beam beam-two"></i><i class="festival-beam beam-three"></i><div class="festival-lights">'+Array.from({length:15},(_,i)=>'<i style="--bulb:'+['#ffcc64','#ff75bc','#76edee','#cc9bff'][i%4]+'"></i>').join('')+'</div>';
 app.prepend(atmosphere);
 const canvas=document.createElement('canvas');canvas.id='festivalCanvas';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;app.append(canvas);
 const ctx=canvas.getContext('2d'),palette=['#ffd777','#ff86cf','#83f8ee','#bca2ff','#fff0b8'];
 const CAP=96,QUEUE_CAP=4;
 let queue=[],particles=[],active=false,paused=false,raf=0,last=0,clock=0,finale=false,seed=41317,width=0,height=0,banner=null,bannerUntil=0,lastBurst=-10,replaceAt=0,cap=CAP,slowFrames=0;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sprites=new Map();
 function sprite(kind,color){
  const key=kind+color;if(sprites.has(key))return sprites.get(key);
  const img=document.createElement('canvas');img.width=img.height=64;
  const c=img.getContext('2d');c.fillStyle=color;
  if(kind==='glow'){
   const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,color);g.addColorStop(.22,color+'99');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,64,64);
  }else{
   c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?8:30;c.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r);}c.closePath();c.fill();
   c.fillStyle='#fff8df';c.fillRect(29,29,6,6);
  }
  sprites.set(key,img);return img;
 }
 function resize(){
  const r=app.getBoundingClientRect();width=r.width;height=r.height;
  // CSS-pixel resolution avoids allocating a large, translucent mobile overlay.
  const w=Math.round(width),h=Math.round(height);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 }
 function add(p){p.age=0;if(particles.length<cap)particles.push(p);else{particles[replaceAt%cap]=p;replaceAt++;}}
 function schedule(delay,kind,args){if(queue.length<QUEUE_CAP)queue.push({at:clock+delay,kind,args});}
 function ring(x,y,color,power=1){add({x,y,vx:0,vy:0,color,life:.45,size:8*power,growth:130*power,kind:'ring',gravity:0});}
 function firework(x,y,power=1){
  const color=palette[Math.floor(rand()*palette.length)],count=cap< CAP?10:18;
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,s=(65+rand()*70)*power;add({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color:i%3===0?'#fff0b8':color,life:.65+rand()*.25,size:3+rand()*2,kind:i%3===0?'star':'spark',gravity:32});}
  ring(x,y,color,power);
 }
 function impact(x,y,power){
  ring(x,y,palette[0],power);ring(x,y,palette[2],power*.72);
  add({x,y,vx:0,vy:0,color:'#ffd777',life:.3,size:62*power,kind:'glow',gravity:0});
  const count=cap<CAP?8:12;
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,s=(75+rand()*70)*power;add({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-15,color:palette[i%5],life:.35+rand()*.2,size:4+rand()*3,kind:i%3===0?'star':'spark',gravity:65});}
 }
 function confetti(count=20){
  count=Math.min(count,cap<CAP?12:24);
  for(let i=0;i<count;i++){const side=i%2;add({x:side?width-6:6,y:height*(.7+rand()*.15),vx:(side?-1:1)*(35+rand()*85),vy:-180-rand()*120,color:palette[i%5],life:.8+rand()*.3,size:4+rand()*3,kind:'paper',gravity:170});}
 }
 function label(title,subtitle){
  banner?.remove();banner=document.createElement('div');banner.className='festival-banner';banner.setAttribute('aria-hidden','true');
  const b=document.createElement('b'),s=document.createElement('span');b.textContent=title;s.textContent=subtitle;banner.append(b,s);app.append(banner);bannerUntil=clock+1.7;
 }
 function wake(){if(active&&!paused&&!document.hidden&&!motion.matches&&!raf){last=0;canvas.hidden=false;raf=requestAnimationFrame(tick);}}
 function paint(dt){
  ctx.clearRect(0,0,width,height);let live=0;
  for(let i=0;i<particles.length;i++){
   const p=particles[i];p.age+=dt;if(p.age>=p.life)continue;particles[live++]=p;
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;
   const fade=1-p.age/p.life;ctx.globalAlpha=fade;
   if(p.kind==='ring'){ctx.strokeStyle=p.color;ctx.lineWidth=2*fade+.5;ctx.beginPath();ctx.arc(p.x,p.y,p.size+p.age*p.growth,0,Math.PI*2);ctx.stroke();}
   else if(p.kind==='glow'){const radius=p.size*(.4+p.age/p.life);ctx.globalAlpha=fade*.3;ctx.drawImage(sprite('glow',p.color),p.x-radius,p.y-radius,radius*2,radius*2);}
   else if(p.kind==='star'){const size=p.size*(1+fade);ctx.drawImage(sprite('star',p.color),p.x-size,p.y-size,size*2,size*2);}
   else if(p.kind==='paper'){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size*1.5);}
   else{ctx.strokeStyle=p.color;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.08,p.y-p.vy*.08);ctx.stroke();}
  }
  particles.length=live;ctx.globalAlpha=1;
 }
 function tick(now){
  raf=0;if(!active||paused||document.hidden||motion.matches||!ctx)return;
  if(last&&now-last<32){raf=requestAnimationFrame(tick);return;}
  const gap=last?now-last:33,dt=Math.min(gap/1000,.1);last=now;clock+=dt;
  if(gap>55)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
  // Drop decorative density for the rest of this stage when frames keep falling behind.
  if(slowFrames>=4&&cap===CAP){cap=48;particles.length=Math.min(particles.length,cap);queue.length=0;}
  for(let i=queue.length-1;i>=0;i--){const e=queue[i];if(e.at>clock)continue;queue.splice(i,1);if(e.kind==='firework')firework(...e.args);else confetti(...e.args);}
  if(banner&&clock>=bannerUntil){banner.remove();banner=null;}
  if(particles.length)paint(dt);
  if(finale&&clock>=.8){stop();return;}
  if(particles.length||queue.length||banner||finale)raf=requestAnimationFrame(tick);
  else{last=0;canvas.hidden=true;}
 }
 function stop(){cancelAnimationFrame(raf);raf=0;active=false;paused=false;particles.length=0;queue.length=0;last=0;clock=0;finale=false;lastBurst=-10;replaceAt=0;if(ctx)ctx.clearRect(0,0,width,height);canvas.hidden=true;banner?.remove();banner=null;app.classList.remove('festival-active','festival-paused','festival-finale');}
 function start(){
  stop();if(motion.matches||!ctx)return;resize();cap=CAP;slowFrames=0;active=true;app.classList.add('festival-active');
  label('FESTIVAL TIME!','빛과 별이 팡팡! 신나는 퍼즐 축제');
  firework(width*.18,height*.1,1.5);firework(width*.82,height*.15,1.5);confetti(24);wake();
 }
 function burst(el,combo,perfect){
  if(!active||paused||finale||motion.matches)return;
  const a=app.getBoundingClientRect(),r=el.getBoundingClientRect();
  // Preserve immediate local feedback; reserve background fireworks for milestones.
  impact(r.left-a.left+r.width/2,r.top-a.top+r.height/2,combo>=8?1.15:.9);
  if(cap===CAP&&clock-lastBurst>=.9&&(combo%5===0||perfect)){
   lastBurst=clock;firework(width*(combo%2?.15:.85),height*.1,1.3);
   if(combo>=5)schedule(.2,'confetti',[16]);
  }
  wake();
 }
 function fever(){
  if(!active||paused||finale||motion.matches)return;
  // Replace old decorations rather than piling a second show on top of them.
  queue.length=0;particles.length=0;label('MEGA FEVER!','불꽃도 콤보도 팡팡! · 점수 ×1.5');
  firework(width*.14,height*.1,1.7);firework(width*.86,height*.15,1.7);confetti(24);wake();
 }
 function clear(){
  if(!active||motion.matches)return;finale=true;clock=0;queue.length=0;particles.length=0;app.classList.add('festival-finale');banner?.remove();banner=null;
  firework(width*.18,height*.13,1.8);firework(width*.82,height*.13,1.8);confetti(24);schedule(.16,'firework',[width*.5,height*.22,1.5]);wake();
 }
 function pause(value){paused=Boolean(value);app.classList.toggle('festival-paused',paused);cancelAnimationFrame(raf);raf=0;last=0;if(particles.length||queue.length||banner||finale)wake();}
 window.FestivalShow=Object.freeze({start,stop,burst,fever,clear,pause,inspect:()=>({active,paused,particles:particles.length,pending:queue.length,queueCap:QUEUE_CAP,cap,scheduled:Boolean(raf),finale})});
 window.addEventListener('resize',()=>{if(active)resize();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});motion.addEventListener('change',()=>{if(motion.matches)stop();});
})();
