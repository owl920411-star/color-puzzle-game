/* Cosmetic-only show: independent RNG, capped particles, 30fps, no game timers. */
(()=>{
 'use strict';
 const app=document.getElementById('app'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const atmosphere=document.createElement('div');atmosphere.className='festival-atmosphere';atmosphere.setAttribute('aria-hidden','true');
 atmosphere.innerHTML='<i class="festival-beam beam-one"></i><i class="festival-beam beam-two"></i><i class="festival-beam beam-three"></i><div class="festival-lights">'+Array.from({length:15},(_,i)=>'<i style="--bulb:'+['#ffcc64','#ff75bc','#76edee','#cc9bff'][i%4]+';--delay:'+(-i*.19)+'s"></i>').join('')+'</div>';
 app.prepend(atmosphere);
 const canvas=document.createElement('canvas');canvas.id='festivalCanvas';canvas.setAttribute('aria-hidden','true');app.append(canvas);
 const ctx=canvas.getContext('2d'),palette=['#ffd777','#ff86cf','#83f8ee','#bca2ff','#fff0b8'];
 const CAP=520, QUEUE_CAP=24;let queue=[],particles=[],active=false,paused=false,raf=0,last=0,clock=0,next=0,finale=false,seed=41317,width=0,height=0,banner=null,bannerUntil=0,lastBurst=-10;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function resize(){const r=app.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);}
 function add(p){if(particles.length>=CAP)particles.shift();particles.push({...p,age:0});}
 function schedule(delay,kind,args){if(queue.length>=QUEUE_CAP)queue.shift();queue.push({at:clock+delay,kind,args});}
 function ring(x,y,color,power=1){add({x,y,vx:0,vy:0,color,life:.7,size:8*power,growth:145*power,kind:'ring',gravity:0});}
 function firework(x,y,power=1){
  const color=palette[Math.floor(rand()*palette.length)],count=Math.round(44*power);
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,s=(65+rand()*70)*power;add({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color:i%3===0?'#fff1ac':color,life:1.05+rand()*.65,size:1.8+rand()*1.7,kind:i%6===0?'star':'spark',gravity:32,angle:a});}
  ring(x,y,color,power);add({x,y,vx:0,vy:0,color,life:.65,size:55*power,kind:'glow',gravity:0});
 }
 function impact(x,y,power){
  for(let n=0;n<3;n++)ring(x,y,palette[n],power*(.7+n*.22));
  add({x,y,vx:0,vy:0,color:'#ffd99b',life:.48,size:82*power,kind:'glow',gravity:0});
  for(let i=0;i<40;i++){const a=i/40*Math.PI*2,s=(65+rand()*100)*power;add({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-15,color:palette[i%5],life:.6+rand()*.35,size:i%3===0?4+rand()*3:2+rand()*2,kind:i%3===0?'star':'spark',gravity:65,angle:a});}
  for(let i=0;i<14;i++)add({x,y,vx:(rand()-.5)*180*power,vy:-90-rand()*120,color:palette[i%5],life:.9+rand()*.4,size:3+rand()*3,kind:'paper',gravity:210,angle:rand()*6});
 }
 function confetti(count=54){
  for(let i=0;i<count;i++){const side=i%2;add({x:side?width-6:6,y:height*(.70+rand()*.18),vx:(side?-1:1)*(35+rand()*85),vy:-210-rand()*190,color:palette[i%palette.length],life:1.8+rand()*.7,size:4+rand()*4,kind:'paper',gravity:170,angle:rand()*6});}
 }
 function label(title,subtitle){
  if(banner)banner.remove();banner=document.createElement('div');banner.className='festival-banner';banner.setAttribute('aria-hidden','true');
  const b=document.createElement('b'),s=document.createElement('span');b.textContent=title;s.textContent=subtitle;banner.append(b,s);app.append(banner);bannerUntil=clock+1.7;
 }
 function paint(dt){
  ctx.clearRect(0,0,width,height);
  particles=particles.filter(p=>p.age<p.life);
  for(const p of particles){
   p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;
   const fade=Math.max(0,1-p.age/p.life);ctx.globalAlpha=fade;ctx.strokeStyle=ctx.fillStyle=p.color;
   ctx.globalCompositeOperation=p.kind==='paper'?'source-over':'lighter';
   if(p.kind==='ring'){ctx.globalAlpha=fade*.8;ctx.lineWidth=3.4*fade+.5;ctx.beginPath();ctx.arc(p.x,p.y,p.size+p.age*p.growth,0,Math.PI*2);ctx.stroke();}
   else if(p.kind==='glow'){const radius=p.size*(.4+p.age/p.life),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);g.addColorStop(0,p.color);g.addColorStop(.22,p.color+'99');g.addColorStop(1,p.color+'00');ctx.globalAlpha=fade*.34;ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}
   else if(p.kind==='star'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle+p.age*2);const size=p.size*(1+fade);ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?size*.3:size;if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.restore();}
   else if(p.kind==='paper'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle+p.age*4);ctx.fillRect(-p.size/2,-p.size,p.size,2*p.size*Math.cos(p.age*7));ctx.restore();}
   else{ctx.lineWidth=p.size;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.13,p.y-p.vy*.13);ctx.stroke();ctx.fillStyle='#fff8df';ctx.fillRect(p.x-1,p.y-1,2,2);}
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 }
 function tick(now){
  raf=0;if(!active||paused||document.hidden||motion.matches||!ctx)return;
  if(last&&now-last<32){raf=requestAnimationFrame(tick);return;}
  const dt=last?Math.min((now-last)/1000,.06):.033;last=now;clock+=dt;
  if(!finale&&clock>=next){firework(width*(rand()<.5?.12:.88),height*(.055+rand()*.10),1.15+rand()*.35);next=clock+.7;}
  const due=queue.filter(e=>e.at<=clock);queue=queue.filter(e=>e.at>clock);for(const e of due){if(e.kind==='firework')firework(...e.args);else if(e.kind==='impact')impact(...e.args);else confetti(...e.args);}
  if(banner&&clock>=bannerUntil){banner.remove();banner=null;}
  paint(dt);
  if(finale&&clock>=.8){stop();return;}
  raf=requestAnimationFrame(tick);
 }
 function stop(){cancelAnimationFrame(raf);raf=0;active=false;paused=false;particles=[];queue=[];last=0;clock=0;finale=false;lastBurst=-10;if(ctx)ctx.clearRect(0,0,width,height);banner?.remove();banner=null;app.classList.remove('festival-active','festival-paused','festival-finale');}
 function start(){
  stop();if(motion.matches||!ctx)return;resize();active=true;app.classList.add('festival-active');
  label('FESTIVAL TIME!','빛과 별이 팡팡! 신나는 퍼즐 축제');
  firework(width*.18,height*.1,1.6);firework(width*.82,height*.15,1.6);confetti(72);
  schedule(.22,'firework',[width*.5,height*.08,1.8]);schedule(.42,'confetti',[54]);next=.8;raf=requestAnimationFrame(tick);
 }
 function burst(el,combo,perfect){
  if(!active||paused||finale||motion.matches)return;
  const a=app.getBoundingClientRect(),r=el.getBoundingClientRect(),x=r.left-a.left+r.width/2,y=r.top-a.top+r.height/2;
  // A substantial, short-lived impact for EVERY merge; echoes build with combos.
  impact(x,y,combo>=8?1.25:combo>=5?1.1:.9);
  if(clock-lastBurst<.10)return;lastBurst=clock;
  firework(width*(combo%2?.15:.85),height*.10,combo>=8?1.8:1.3);
  if(combo>=3||perfect)schedule(.16,'firework',[width*(combo%2?.85:.15),height*.14,1.45]);
  if(combo>=5){confetti(48);schedule(.24,'impact',[x,y,.7]);schedule(.38,'firework',[width*.5,height*.08,1.5]);}
  if(combo>=8){schedule(.48,'firework',[width*.05,height*.52,1.2]);schedule(.62,'firework',[width*.95,height*.66,1.2]);schedule(.32,'confetti',[42]);}
 }
 function fever(){
  if(!active||paused||motion.matches)return;
  label('MEGA FEVER!','불꽃도 콤보도 팡팡! · 점수 ×1.5');
  firework(width*.14,height*.10,2);firework(width*.86,height*.15,2);confetti(90);
  for(let i=0;i<5;i++)schedule(.15+i*.16,'firework',[width*[.5,.05,.95,.25,.75][i],height*[.08,.46,.65,.12,.1][i],1.6]);
  schedule(.35,'confetti',[72]);
 }
 function clear(){
  if(!active||motion.matches)return;finale=true;clock=0;queue=[];app.classList.add('festival-finale');banner?.remove();banner=null;
  firework(width*.18,height*.13,2);firework(width*.82,height*.13,2);confetti(100);
  schedule(.16,'firework',[width*.5,height*.22,2]);schedule(.32,'firework',[width*.12,height*.60,1.8]);schedule(.46,'firework',[width*.88,height*.60,1.8]);schedule(.28,'confetti',[72]);
 }
 function pause(value){paused=Boolean(value);app.classList.toggle('festival-paused',paused);cancelAnimationFrame(raf);raf=0;last=0;if(active&&!paused&&!document.hidden&&!motion.matches)raf=requestAnimationFrame(tick);}
 window.FestivalShow=Object.freeze({start,stop,burst,fever,clear,pause,inspect:()=>({active,paused,particles:particles.length,pending:queue.length,queueCap:QUEUE_CAP,cap:CAP,scheduled:Boolean(raf),finale})});
 window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});motion.addEventListener('change',()=>{if(motion.matches)stop();});
})();
