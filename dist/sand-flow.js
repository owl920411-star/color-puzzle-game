/* SAND POUR 2 — input is independent of falling/settling/clearing.
 * Keep MicroSand.Field unchanged. Each accepted click owns a frozen source,
 * color, seed and exactly 576 grains; next stock becomes available immediately.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./sand-micro.js'):root.MicroSand);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.SandPour=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(M){
'use strict';
if(!M)throw new Error('MicroSand core did not load');
const STEP=1000/120,TICKS=84,WIDTH=17,SOURCE_Y=8,HALF=8,MAX_STREAMS=48;
class Run{
 constructor({seed='sand',colors=2,burst=10,gems=0,stage=1}={}){
  this.field=new M.Field();this.seed=String(seed);this.rng=M.random(seed);this.colors=Math.max(2,Math.min(3,colors));this.burst=burst*M.UNIT;
  this.queue=[];this.serial=0;this.held=null;this.holdUsed=false;this.active=null;this.x=M.W/2;this.state='aiming';this.accepting=true;
  this.chain=0;this.maxChain=0;this.score=0;this.removed=0;this.collected=0;this.pieces=0;this.delivered=0;this.accepted=0;this.burstVersion=-1;
  this.pending=null;this.clearTime=0;this.accumulator=0;this.events=[];this.lastMoves=0;this.streams=[];this.emissionTick=0;
  for(let k=0;k<gems;k++)this.field.addGem(((stage*3+k*4)%8+1)*12+6,M.H-5-k*12);
  for(let i=0;i<3;i++)this.queue.push(this.makeDose());this.spawn();
 }
 get ready(){return this.accepting&&this.state!=='over'&&!!this.active;}
 get remaining(){return this.streams.reduce((n,s)=>n+M.PACKET-s.emitted,0);}
 makeDose(){this.rng();this.rng();this.rng();return{id:++this.serial,color:1+Math.floor(this.rng()*this.colors),amount:M.PACKET};}
 spawn(){this.active=this.queue.shift();this.queue.push(this.makeDose());this.holdUsed=false;}
 moveTo(x){if(!this.ready||!Number.isFinite(x))return false;const next=Math.max(HALF,Math.min(M.W-1-HALF,Math.round(x)));const changed=this.x!==next;this.x=next;return changed;}
 columns(x=this.x){return Array.from({length:WIDTH},(_,i)=>x-HALF+i);}
 canPour(){return this.ready&&this.streams.length<MAX_STREAMS&&(this.columns().some(x=>!this.field.cells[SOURCE_Y*M.W+x])||this.streams.some(s=>Math.abs(s.x-this.x)<WIDTH));}
 hold(){if(!this.ready||this.holdUsed)return false;const p=this.active;if(this.held){this.active=this.held;this.held=p;}else{this.held=p;this.spawn();}this.holdUsed=true;return true;}
 pour(){
  if(!this.canPour())return false;
  const dose=this.active;
  this.streams.push({id:dose.id,color:dose.color,x:this.x,columns:this.columns(),ticks:0,emitted:0,jammed:0,rng:M.random(this.seed+':dose:'+dose.id)});
  this.accepted++;this.spawn(); // Does NOT reset physics time, earlier streams, or pending burst.
  if(this.state!=='clearing')this.state='pouring';
  this.events.push({type:'pour',id:dose.id});return true;
 }
 emit(){
  if(!this.streams.length)return;
  // Snapshot availability before ANY stream writes. Another stream temporarily
  // occupying an inlet must not be counted as a permanently blocked source.
  const blocked=this.streams.map(s=>s.columns.every(x=>!!this.field.cells[SOURCE_Y*M.W+x]));
  const count=this.streams.length,offset=this.emissionTick++%count;
  for(let n=0;n<count;n++){
   const index=(offset+n)%count,s=this.streams[index],t=Math.min(1,++s.ticks/TICKS);
   const wanted=Math.min(M.PACKET,Math.floor(M.PACKET*(t-Math.sin(t*Math.PI*2)/(Math.PI*2))));
   const radius=t<1?Math.round(4+4*Math.sin(Math.PI*t)):HALF;
   const columns=s.columns.filter(x=>Math.abs(x-s.x)<=radius);
   for(let i=columns.length-1;i>0;i--){const j=Math.floor(s.rng()*(i+1));[columns[i],columns[j]]=[columns[j],columns[i]];}
   let emitted=0;
   for(const x of columns){if(s.emitted>=wanted)break;if(this.field.cells[SOURCE_Y*M.W+x])continue;
    this.field.set(x,SOURCE_Y,s.color,M.hash(s.id+':'+s.emitted)%21);s.emitted++;this.delivered++;emitted++;
   }
   s.jammed=!emitted&&wanted>s.emitted&&blocked[index]?s.jammed+1:0;
   if(s.jammed>=120){this.over();return;}
   if(s.emitted===M.PACKET){this.pieces++;this.events.push({type:'supply-end',id:s.id});}
  }
  this.streams=this.streams.filter(s=>s.emitted<M.PACKET);
 }
 over(){if(this.state==='over')return;this.state='over';this.active=null;this.accepting=false;this.events.push({type:'over'});}
 tick(){
  if(this.state==='aiming'||this.state==='over')return;
  if(this.state==='clearing'){
   // Keep this 180 ms snapshot immutable so incoming clicks cannot change
   // which grains the pending burst deletes. Input/aim/hold are still live.
   this.clearTime-=STEP;if(this.clearTime>0)return;
   const result=this.field.clear(this.pending);this.removed+=result.count;this.collected+=result.gemCount;
   const gain=Math.round(result.count/M.UNIT*20+this.pending.length*100)*Math.pow(2,Math.min(10,this.chain-1))+result.gemCount*500;
   this.score+=gain;this.events.push({type:'burst',groups:this.pending,gain,chain:this.chain,gems:result.gemCount});this.pending=null;
   this.state=this.streams.length?'pouring':'settling';return;
  }
  this.lastMoves+=this.field.step();this.emit();if(this.state==='over')return;
  this.state=this.streams.length?'pouring':'settling';
  if(!this.streams.length&&this.field.sleep>=4){
   const groups=this.field.groups(this.burst);
   if(groups.length){
    // Only unaided collapse continues the multiplier. Extra player input
    // cannot turn repeated separate supplies into an unlimited chain.
    this.chain=this.burstVersion===this.accepted?this.chain+1:1;this.burstVersion=this.accepted;
    this.pending=groups;this.maxChain=Math.max(this.maxChain,this.chain);this.clearTime=180;this.state='clearing';this.events.push({type:'prepare',chain:this.chain});
   }else{
    this.state='aiming';this.chain=0;
    if(this.field.cells.slice(SOURCE_Y*M.W,(SOURCE_Y+1)*M.W).every(Boolean))this.over();
   }
  }
 }
 step(dt){
  if(this.state==='aiming'||this.state==='over'||!Number.isFinite(dt))return;
  this.accumulator+=Math.max(0,Math.min(50,dt));this.lastMoves=0;
  for(let n=0;this.accumulator+1e-7>=STEP&&n<6;n++){
   this.accumulator=Math.max(0,this.accumulator-STEP);this.tick();if(this.state==='aiming'||this.state==='over'){this.accumulator=0;break;}
  }
 }
}
return{Run,STEP,TICKS,WIDTH,SOURCE_Y,MAX_STREAMS};
});

if(typeof window!=='undefined'&&document.getElementById('pour-board'))(function(){
'use strict';
const M=window.MicroSand,P=window.SandPour,S=window.GlassStages,$=id=>document.getElementById(id),canvas=$('pour-board'),ctx=canvas.getContext('2d');
const query=new URLSearchParams(location.search),mode=['stage','endless','daily'].includes(query.get('mode'))?query.get('mode'):'stage',KEY='glassfall-v1';
const valid=o=>o&&typeof o==='object'&&!Array.isArray(o);let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}if(!valid(saved))saved={};
for(const key of ['campaign','sandFlow','mastery'])if(!valid(saved[key]))saved[key]={};
const reducedBySystem=matchMedia('(prefers-reduced-motion: reduce)').matches;let reduced=reducedBySystem||saved.effects==='light';
let stage=S.number(query.get('stage')||S.progress(saved.campaign.sand).unlocked);if(!saved.devMode)stage=Math.min(stage,S.progress(saved.campaign.sand).unlocked);
let run,config,currentSeed='',paused=false,finished=false,elapsed=0,last=0,hudTime=0,drag=null,fx=[],noticeTime=0,audio=null,focusBefore=null;
const bitmap=document.createElement('canvas');bitmap.width=M.W;bitmap.height=M.H;const raster=bitmap.getContext('2d'),image=raster.createImageData(M.W,M.H);
const names=['황금','자수정','회청'],hex=['#ddb666','#ac89c2','#7aa1a8'],lut=[];
for(let c=1;c<=3;c++){lut[c]=[];for(let light=0;light<2;light++){lut[c][light]=[];for(let shade=0;shade<=20;shade++)lut[c][light][shade]=M.tint(c,shade,light?9:0);}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(saved));return true;}catch{return false;}}
function seed(){if(mode==='stage')return config.seed+'-micro1';if(mode==='daily')return 'DAILY-MICRO-'+new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return 'POUR-'+Date.now().toString(36);}
function resize(){const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=360*dpr;canvas.height=720*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;}
function begin(retry){
 config=S.config(stage,'sand');currentSeed=retry||seed();run=new P.Run({seed:currentSeed,colors:mode==='stage'?config.sandColors:3,burst:mode==='stage'?config.sandBurst:12,gems:mode==='stage'?config.gems:0,stage});
 elapsed=0;paused=false;finished=false;drag=null;fx=[];noticeTime=0;last=performance.now();$('notice').textContent='';$('overlay').hidden=true;
 const q=new URLSearchParams({mode,stage:String(stage),v:'pour2'});if(query.get('qa')==='1')q.set('qa','1');try{history.replaceState(null,'','?'+q);}catch{}
 hud();draw();
}
function card(id,dose){const el=$(id),signature=dose?String(dose.color):'empty';if(el.dataset.signature===signature)return;el.dataset.signature=signature;
 el.style.setProperty('--sand',dose?hex[dose.color-1]:'#48515a');el.querySelector('.color-name').textContent=dose?names[dose.color-1]:'비어 있음';el.querySelector('.amount').textContent=dose?'4 모래량':'한 번 보관';el.querySelector('.sample').classList.toggle('empty',!dose);
}
function hud(){
 const ready=run.ready&&!paused&&!finished,count=run.streams.length;
 $('score').textContent=run.score.toLocaleString();$('time-label').textContent=mode==='stage'?'스테이지':mode==='daily'?'남은 시간':'플레이 시간';
 const seconds=Math.floor(mode==='daily'?Math.max(0,180-elapsed/1000):elapsed/1000);$('time').textContent=mode==='stage'?stage+' / 100':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 $('goal').textContent=mode==='stage'?'제거 '+Math.min(config.target,Math.floor(run.removed/M.UNIT))+' / '+config.target+' 모래량'+(config.gems?' · 💎 '+run.collected+'/'+config.gems:''):'최대 '+run.maxChain+'연쇄 · '+Math.floor(run.removed/M.UNIT)+' 모래량 제거';
 $('rule').textContent=(mode==='stage'?config.sandBurst:12)+' 모래량 연결 → 붕괴 · 한 번에 4 모래량';
 const color=(run.active?.color||1)-1;$('current-color').style.background=hex[color];$('current-name').textContent='투입할 '+names[color]+' 모래';
 $('state-note').textContent=finished?'게임 종료':!run.accepting?'목표 달성 · 남은 모래 정리 중':count?'추가 투입 가능 · 공급 '+count+'개':run.state==='clearing'?'붕괴 중에도 추가 투입 가능':run.state==='settling'?'내려오는 중에도 추가 투입 가능':'위치를 고르고 연속으로 부어주세요';
 $('dose-meter').value=run.active?1:0;$('dose-meter').style.accentColor=hex[color];$('dose-meter').style.setProperty('--sand',hex[color]);$('dose-left').textContent='4 모래량';
 card('next-card',run.queue[0]);card('next2-card',run.queue[1]);card('hold',run.held);
 $('hold').disabled=!ready||run.holdUsed;$('pour').disabled=!ready;$('pour').querySelector('span').textContent='모래 붓기';
 $('aim').disabled=!ready;$('aim').value=run.x;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'게임 계속하기':'일시정지와 설정');
}
function paintField(){
 if(!run.field.dirty)return;const a=run.field.cells,s=run.field.shade,p=image.data;
 for(let i=0;i<a.length;i++){const j=i*4,c=a[i];if(!c||c===4){p[j+3]=0;continue;}const rgb=lut[c][i>=M.W&&!a[i-M.W]?1:0][s[i]];p[j]=rgb[0];p[j+1]=rgb[1];p[j+2]=rgb[2];p[j+3]=255;}
 raster.putImageData(image,0,0);run.field.dirty=false;
}
function inlet(x,color,amount=1){ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-17,7);ctx.lineTo(x-17,17);ctx.lineTo(x+17,17);ctx.lineTo(x+17,7);ctx.stroke();ctx.fillStyle=color;ctx.fillRect(x-16,21,32*amount,2);}
function draw(){
 if(!run)return;ctx.clearRect(0,0,360,720);ctx.fillStyle='#15171b';ctx.fillRect(0,0,360,720);paintField();ctx.imageSmoothingEnabled=false;ctx.drawImage(bitmap,0,0,360,720);
 for(const gem of run.field.gems){if(gem.collected)continue;const x=gem.x*3+1.5,y=gem.y*3+1.5;ctx.fillStyle='#86ecdf';ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+8,y);ctx.lineTo(x,y+9);ctx.lineTo(x-8,y);ctx.closePath();ctx.fill();ctx.fillStyle='#e4fff7';ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+2,y);ctx.lineTo(x-8,y);ctx.closePath();ctx.fill();}
 ctx.save();ctx.globalAlpha=.55;for(const s of run.streams)inlet(s.x*3+1.5,hex[s.color-1],1-s.emitted/M.PACKET);ctx.restore();
 if(run.ready){
  const color=hex[run.active.color-1],x=run.x*3+1.5;let ground=M.H;
  for(let y=P.SOURCE_Y;y<M.H;y++){let hit=false;for(let dx=-8;dx<=8;dx++)if(run.field.cells[y*M.W+run.x+dx]){hit=true;break;}if(hit){ground=y;break;}}
  ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=.15;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,28);ctx.lineTo(x,ground*3);ctx.stroke();ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(x-9,Math.min(715,ground*3-3));ctx.lineTo(x+9,Math.min(715,ground*3-3));ctx.stroke();ctx.restore();
  inlet(x,color);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-3,3);ctx.lineTo(x+3,3);ctx.lineTo(x,8);ctx.closePath();ctx.fill();
 }
 if(run.pending){ctx.save();ctx.fillStyle='#fff4d1';ctx.globalAlpha=reduced?.16:.27;for(const group of run.pending)for(const i of group.indices)ctx.fillRect(i%M.W*3,Math.floor(i/M.W)*3,3,3);ctx.restore();}
 if(!reduced)for(const p of fx){ctx.globalAlpha=Math.max(0,p.life/350);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,1.6,1.6);}ctx.globalAlpha=1;
}
function status(text){$('notice').textContent=text;noticeTime=1800;}
function feedback(event){
 if(saved.haptics&&!reduced&&navigator.vibrate)try{navigator.vibrate(event.type==='pour'?6:event.chain>=3?[12,25,16]:10);}catch{}
 if(!saved.sound)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const source=audio.createBufferSource(),buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*(event.type==='pour'?.35:.1)),audio.sampleRate),values=buffer.getChannelData(0);for(let i=0;i<values.length;i++)values[i]=(Math.random()-.5)*(1-i/values.length);source.buffer=buffer;const gain=audio.createGain();gain.gain.value=.09;source.connect(gain);gain.connect(audio.destination);source.start();}catch{}
}
function show(title,body){paused=true;drag=null;focusBefore=document.activeElement;$('overlay-title').textContent=title;$('overlay-body').innerHTML=body;$('overlay').hidden=false;hud();$('overlay-body').querySelector('button,a,summary')?.focus();}
function resume(){if(finished)return;paused=false;last=performance.now();$('overlay').hidden=true;focusBefore?.focus();hud();}
function finish(won){
 if(finished)return;finished=true;const key=mode==='stage'?'stage:'+stage:mode;saved.sandFlow[key]=Math.max(Number(saved.sandFlow[key])||0,run.score);
 if(won&&mode==='stage'){saved.campaign.sand=S.complete(saved.campaign.sand,stage);saved.mastery.sand=(Number(saved.mastery.sand)||0)+65+stage;}
 const ok=save();show(won?(mode==='stage'?stage+' 스테이지 완료':'도전 완료'):'공급 위치가 모래로 막혔어요',
 '<p class="result">'+run.score.toLocaleString()+'<small>최대 '+run.maxChain+'연쇄 · '+Math.floor(run.removed/M.UNIT)+' 모래량 제거</small></p>'+(won&&mode==='stage'&&stage<100?'<button data-menu="next" class="primary">다음 스테이지</button>':'')+'<button data-menu="retry">같은 판 다시 시작</button><button data-menu="settings">스테이지·설정</button><a class="button" href="index.html?v=pour2">모드 선택</a><p class="muted">'+(ok?'진행도를 보존했습니다. 연속 붓기 점수는 별도 저장합니다.':'브라우저에서 기록을 저장하지 못했습니다.')+'</p>');
}
function settings(){
 const p=S.progress(saved.campaign.sand);
 show(finished?'스테이지·설정':'잠시 쉬어가세요',(finished?'':'<button data-menu="resume" class="primary">계속하기</button>')+'<button data-menu="retry">같은 판 다시 시작</button><details><summary>스테이지 선택 · '+(saved.devMode?'DEV 1~100 전체 열림':p.unlocked+'까지 열림')+'</summary><div class="stage-grid">'+Array.from({length:100},(_,i)=>i+1).map(n=>'<button data-stage="'+n+'" '+(!saved.devMode&&n>p.unlocked?'disabled':'')+' class="'+(n===stage?'selected':'')+'">'+n+'</button>').join('')+'</div></details><button data-menu="dev">개발자 모드 '+(saved.devMode?'ON':'OFF')+'</button><button data-menu="effects" '+(reducedBySystem?'disabled':'')+'>효과 '+(reduced?'간결':'풍부')+'</button><button data-menu="sound">소리 '+(saved.sound?'ON':'OFF')+'</button><button data-menu="haptics">진동 '+(saved.haptics?'ON':'OFF')+'</button><p class="muted">게임판을 터치하거나 좌우로 밀어 위치를 고릅니다.<br>모래 붓기 버튼 / 아래로 빠른 스와이프: 한 번에 일정량 공급<br>붓는 순간 다음 색이 준비됩니다. 먼저 부은 모래가 내려오는 중에도 다른 곳에 바로 부을 수 있습니다.<br>각 공급은 시작 위치와 색을 유지합니다. 같은 곳에 연속 공급하면 실제 빈자리만 사용하므로 시간이 길어질 수 있습니다.<br>보관은 다음 투입할 모래에 적용됩니다. 붕괴 중 입력도 접수되며, 짧은 제거 연출 뒤 공급됩니다.<br>한 번 = 576개 알갱이 = 4 모래량. 쌓임·미끄러짐 물리는 그대로입니다.</p><a class="button" href="sand-clump.html?mode='+mode+'&stage='+stage+'">이전 뭉치 버전 비교</a><a class="button" href="index.html?v=pour2">모드 선택</a>');
}
$('overlay-body').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.stage){const n=Number(b.dataset.stage);if(n>=1&&n<=100&&(saved.devMode||n<=S.progress(saved.campaign.sand).unlocked)){if(mode!=='stage'){location.assign('sand-micro.html?mode=stage&stage='+n+'&v=pour2');return;}stage=n;begin();}return;}
 switch(b.dataset.menu){case'resume':resume();break;case'retry':begin(currentSeed);break;case'next':if(finished&&stage<100){stage++;begin();}break;case'settings':settings();break;case'dev':saved.devMode=!saved.devMode;save();settings();break;case'effects':if(!reducedBySystem){reduced=!reduced;saved.effects=reduced?'light':'rich';save();settings();}break;case'sound':saved.sound=!saved.sound;save();settings();break;case'haptics':saved.haptics=!saved.haptics;save();settings();break;}
});
$('pause').addEventListener('click',()=>{if(finished){settings();return;}if(paused)resume();else settings();});
function pour(){if(paused||finished)return;if(run.pour()){drag=null;noticeTime=0;$('notice').textContent='';feedback({type:'pour'});hud();}else if(run.ready)status(run.streams.length>=P.MAX_STREAMS?'접수된 모래가 많아요. 잠깐만 기다려주세요.':'공급구가 막혔어요. 옆으로 옮겨주세요.');}
$('pour').addEventListener('click',pour);$('hold').addEventListener('click',()=>{if(!paused&&!finished){run.hold();hud();}});
$('aim').addEventListener('input',()=>{if(!paused&&!finished){run.moveTo(Number($('aim').value));hud();}});
function aimAt(x){const rect=canvas.getBoundingClientRect();run.moveTo((x-rect.left)/rect.width*M.W);hud();}
canvas.addEventListener('pointerdown',e=>{if(paused||finished||!run.ready||drag||e.button!==0||e.isPrimary===false)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);aimAt(e.clientX);drag={id:e.pointerId,x:e.clientX,y:e.clientY,started:performance.now(),maxX:0};});
canvas.addEventListener('pointermove',e=>{const d=drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();d.maxX=Math.max(d.maxX,Math.abs(e.clientX-d.x));if(Math.abs(e.clientX-d.x)>Math.abs(e.clientY-d.y)*.6)aimAt(e.clientX);});
canvas.addEventListener('pointerup',e=>{const d=drag;drag=null;if(!d||d.id!==e.pointerId||paused)return;e.preventDefault();const dy=e.clientY-d.y,dx=e.clientX-d.x,age=Math.max(1,performance.now()-d.started);if(dy>45&&dy>Math.abs(dx)*1.5&&d.maxX<dy*.55&&age<350&&dy/age>.4)pour();});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
document.addEventListener('keydown',e=>{
 if(!$('overlay').hidden){if(e.key==='Escape'){e.preventDefault();resume();}if(e.key==='Tab'){const els=[...$('overlay').querySelectorAll('button:not(:disabled),a,summary')].filter(el=>el.getClientRects().length),first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
 if(['Escape','p','P'].includes(e.key)){e.preventDefault();settings();return;}if(e.target.closest('button,a,input,summary')||paused||finished)return;
 if(['ArrowLeft','ArrowRight','ArrowDown',' ','c','C'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')run.moveTo(run.x-3);if(e.key==='ArrowRight')run.moveTo(run.x+3);if(!e.repeat&&[' ','ArrowDown'].includes(e.key))pour();if(!e.repeat&&['c','C'].includes(e.key))run.hold();hud();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&!finished)settings();});window.addEventListener('blur',()=>{if(!paused&&!finished)settings();});window.addEventListener('resize',resize);
function frame(now){
 const dt=Math.max(0,Math.min(50,now-last));last=now;
 if(!paused&&!finished){elapsed+=dt;run.step(dt);
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
  for(const event of run.events.splice(0)){
   if(event.type==='over')finish(false);
   if(event.type==='prepare')status(event.chain>=3?'산사태 · '+event.chain+' CHAIN':event.chain>1?event.chain+' CHAIN':'SAND BURST');
   if(event.type==='burst'){feedback(event);if(!reduced)for(const group of event.groups){const hop=Math.max(1,Math.ceil(group.indices.length/40));for(let j=0;j<group.indices.length&&fx.length<160;j+=hop){const i=group.indices[j];fx.push({x:i%M.W*3,y:Math.floor(i/M.W)*3,life:350,vx:(Math.random()-.5)*35,vy:30+Math.random()*45,color:hex[group.color-1]});}}}
  }
  for(const p of fx){p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=dt*.12;}fx=fx.filter(p=>p.life>0);
  if(!finished&&mode==='stage'&&run.removed>=config.target*M.UNIT&&run.collected>=config.gems){run.accepting=false;if(run.state==='aiming')finish(true);}
  if(!finished&&mode==='daily'&&elapsed>=180000)finish(true);
 }
 if(now-hudTime>120){hud();hudTime=now;}draw();requestAnimationFrame(frame);
}
if(query.get('qa')==='1')window.sandQA={snapshot:()=>({stage,mode,paused,finished,state:run.state,ready:run.ready,accepted:run.accepted,pieces:run.pieces,grains:run.field.count(),score:run.score,chain:run.maxChain,x:run.x,color:run.active?.color,colors:run.colors,remaining:run.remaining,delivered:run.delivered,removed:run.removed,gems:run.collected,holdUsed:run.holdUsed,streams:run.streams.map(s=>({id:s.id,x:s.x,color:s.color,emitted:s.emitted,ticks:s.ticks}))}),field:()=>Array.from(run.field.cells)};
resize();begin();$('boot').hidden=true;requestAnimationFrame(frame);
})();
