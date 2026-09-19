/* Cosmetic-only show: independent RNG, capped particles, 30fps, no game timers. */
(()=>{
 'use strict';
 const app=document.getElementById('app'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const atmosphere=document.createElement('div');atmosphere.className='festival-atmosphere';atmosphere.setAttribute('aria-hidden','true');
 atmosphere.innerHTML='<i class="festival-beam beam-one"></i><i class="festival-beam beam-two"></i><i class="festival-beam beam-three"></i><div class="festival-lights">'+Array.from({length:15},(_,i)=>'<i style="--bulb:'+['#ffcc64','#ff75bc','#76edee','#cc9bff'][i%4]+';--delay:'+(-i*.19)+'s"></i>').join('')+'</div>';
 app.prepend(atmosphere);
 const canvas=document.createElement('canvas');canvas.id='festivalCanvas';canvas.setAttribute('aria-hidden','true');app.append(canvas);
 const ctx=canvas.getContext('2d'),palette=['#ffd777','#ff86cf','#83f8ee','#bca2ff','#fff0b8'];
 const CAP=260;let particles=[],active=false,paused=false,raf=0,last=0,clock=0,next=0,finale=false,seed=41317,width=0,height=0,banner=null,bannerUntil=0,lastBurst=-10;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function resize(){const r=app.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);}
 function add(p){if(particles.length>=CAP)particles.shift();particles.push({...p,age:0});}
 function firework(x,y,power=1){
  const color=palette[Math.floor(rand()*palette.length)],count=Math.round(24*power);
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,s=(35+rand()*48)*power;add({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color,life:1.1+rand()*.5,size:1.3+rand()*1.2,kind:'spark',gravity:24});}
  add({x,y,vx:0,vy:0,color,life:.8,size:14*power,kind:'ring',gravity:0});
 }
 function confetti(count=24){
  for(let i=0;i<count;i++){const side=i%2;add({x:side?width-6:6,y:height*(.70+rand()*.18),vx:(side?-1:1)*(25+rand()*55),vy:-150-rand()*130,color:palette[i%palette.length],life:1.8+rand()*.7,size:3+rand()*3,kind:'paper',gravity:150,angle:rand()*6});}
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
   const fade=Math.max(0,1-p.age/p.life);ctx.globalAlpha=fade*.9;ctx.strokeStyle=ctx.fillStyle=p.color;
   if(p.kind==='ring'){ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(p.x,p.y,p.size+p.age*54,0,Math.PI*2);ctx.stroke();}
   else if(p.kind==='paper'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle+p.age*4);ctx.fillRect(-p.size/2,-p.size,p.size,2*p.size*Math.cos(p.age*7));ctx.restore();}
   else{ctx.lineWidth=p.size;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.065,p.y-p.vy*.065);ctx.stroke();ctx.fillStyle='#fff8df';ctx.fillRect(p.x-.7,p.y-.7,1.4,1.4);}
  }
  ctx.globalAlpha=1;
 }
 function tick(now){
  raf=0;if(!active||paused||document.hidden||motion.matches||!ctx)return;
  if(last&&now-last<32){raf=requestAnimationFrame(tick);return;}
  const dt=last?Math.min((now-last)/1000,.06):.033;last=now;clock+=dt;
  if(!finale&&clock>=next){firework(width*(rand()<.5?.13:.87),height*(.055+rand()*.09),.8+rand()*.3);next=clock+1.25;}
  if(banner&&clock>=bannerUntil){banner.remove();banner=null;}
  paint(dt);
  if(finale&&clock>=.8){stop();return;}
  raf=requestAnimationFrame(tick);
 }
 function stop(){cancelAnimationFrame(raf);raf=0;active=false;paused=false;particles=[];last=0;clock=0;finale=false;lastBurst=-10;if(ctx)ctx.clearRect(0,0,width,height);banner?.remove();banner=null;app.classList.remove('festival-active','festival-paused');}
 function start(){stop();if(motion.matches||!ctx)return;resize();active=true;app.classList.add('festival-active');label('FESTIVAL TIME!','반짝이는 퍼즐 축제에 오신 걸 환영해요');firework(width*.18,height*.1,1.15);firework(width*.82,height*.15,1.15);confetti(36);next=1.4;raf=requestAnimationFrame(tick);}
 function burst(el,combo,perfect){
  if(!active||paused||finale||motion.matches)return;
  const a=app.getBoundingClientRect(),r=el.getBoundingClientRect();
  // Keep board response delicate; big fireworks live over the header, outside tiles.
  const x=r.left-a.left+r.width/2,y=r.top-a.top+r.height/2;
  for(let i=0;i<12;i++){const angle=i/12*Math.PI*2;add({x,y,vx:Math.cos(angle)*65,vy:Math.sin(angle)*65,color:palette[i%5],life:.45,size:1.5,kind:'spark',gravity:10});}
  if(clock-lastBurst<.16)return;lastBurst=clock;
  if(combo>=3||perfect)firework(width*(combo%2?.18:.82),height*.11,combo>=8?1.5:1);
  if(combo>=5&&combo%5===0)confetti(28);
 }
 function fever(){if(!active||paused||motion.matches)return;label('FEVER PARTY!','콤보의 열기를 이어가세요 · 점수 ×1.5');firework(width*.14,height*.1,1.65);firework(width*.86,height*.15,1.65);confetti(54);}
 function clear(){if(!active||motion.matches)return;finale=true;clock=0;banner?.remove();banner=null;firework(width*.18,height*.13,1.8);firework(width*.82,height*.13,1.8);confetti(65);}
 function pause(value){paused=Boolean(value);app.classList.toggle('festival-paused',paused);cancelAnimationFrame(raf);raf=0;last=0;if(active&&!paused&&!document.hidden&&!motion.matches)raf=requestAnimationFrame(tick);}
 window.FestivalShow=Object.freeze({start,stop,burst,fever,clear,pause,inspect:()=>({active,paused,particles:particles.length,cap:CAP,scheduled:Boolean(raf),finale})});
 window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});motion.addEventListener('change',()=>{if(motion.matches)stop();});
})();
