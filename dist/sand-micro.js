/* GLASSFALL MICRO SAND 1 — actual 3px grains, not a texture over 36px cells.
 * Physics and drawing share exactly the same occupancy field. No external library.
 * Grain mass, colors and deterministic simulation are invariant under effect settings.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MicroSand=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const W=120,H=240,PIXEL=3,UNIT=144,PACKET=4*UNIT;
const PALETTE=[[221,182,102],[172,137,194],[122,161,168]];
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function random(seed){let n=hash(seed);return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function bounds(points){return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}
function packet(rng,colorCount=2,id=0){
  // Pick a fixed mass from a noisy elliptical distance field, never a tetromino.
  const aspect=1.1+rng()*.65,angle=rng()*6.283,phase=rng()*6.283,points=[];
  for(let y=-25;y<=25;y++)for(let x=-25;x<=25;x++){
    const theta=Math.atan2(y*aspect,x),edge=1+.10*Math.sin(theta*3+phase)+.06*Math.cos(theta*5-angle);
    const r=(x*x/(aspect*aspect)+y*y)*aspect/(edge*edge);
    points.push({x,y,r:r+((hash(id+':'+x+':'+y)%100)/100)*2,shade:hash(id+':'+x+':'+y)%21});
  }
  points.sort((a,b)=>a.r-b.r);const grains=points.slice(0,PACKET).map(({x,y,shade})=>({x,y,shade}));
  return{id,color:1+Math.floor(rng()*colorCount),grains,bounds:bounds(grains),x:W/2,y:0};
}
class Field{
  constructor(){this.cells=new Uint8Array(W*H);this.shade=new Uint8Array(W*H);this.tick=0;this.sleep=0;this.minY=H;this.dirty=true;this.gems=[];this.seen=new Uint32Array(W*H);this.queue=new Int32Array(W*H);this.stamp=0;}
  set(x,y,color,shade=10){if(x<0||x>=W||y<0||y>=H)return false;const i=y*W+x;this.cells[i]=color;this.shade[i]=shade;this.minY=Math.min(this.minY,y);this.dirty=true;this.sleep=0;return true;}
  count(){let n=0;for(const c of this.cells)if(c>0&&c<4)n++;return n;}
  fits(p,x=p.x,y=p.y){x=Math.round(x);y=Math.floor(y);for(const g of p.grains){const xx=x+g.x,yy=y+g.y;if(xx<0||xx>=W||yy<0||yy>=H||this.cells[yy*W+xx])return false;}return true;}
  dropY(p){let y=Math.floor(p.y);while(this.fits(p,p.x,y+1))y++;return y;}
  deposit(p){if(!this.fits(p))return false;const x=Math.round(p.x),y=Math.floor(p.y);for(const g of p.grains)this.set(x+g.x,y+g.y,p.color,g.shade);return true;}
  step(){
    if(this.sleep>=4)return 0;
    const a=this.cells,s=this.shade,reverse=(this.tick++&1)!==0;let moves=0;
    for(let y=H-2;y>=this.minY;y--)for(let n=0;n<W;n++){
      const x=reverse?W-1-n:n,i=y*W+x,c=a[i];if(c===0||c>=4)continue;
      let to=i+W;
      if(a[to]){
        // Diagonal fall requires a free side AND a free lower neighbor.
        // This prevents grains tunneling through solid corners or gem walls.
        const d=((x+y+this.tick)&1)?1:-1;to=-1;
        for(const dx of [d,-d])if(x+dx>=0&&x+dx<W&&!a[i+dx]&&!a[i+W+dx]){to=i+W+dx;break;}
      }
      if(to<0)continue;a[to]=c;s[to]=s[i];a[i]=0;s[i]=0;moves++;
    }
    if(moves){this.sleep=0;this.dirty=true;}else this.sleep++;
    return moves;
  }
  groups(minimum){
    const a=this.cells,seen=this.seen,q=this.queue;let stamp=++this.stamp;
    if(!stamp||stamp>=0xffffffff){seen.fill(0);this.stamp=stamp=1;}
    const result=[];
    for(let start=this.minY*W;start<a.length;start++){
      const color=a[start];if(!color||color>=4||seen[start]===stamp)continue;
      let head=0,tail=1;q[0]=start;seen[start]=stamp;
      while(head<tail){const i=q[head++],x=i%W;
        for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,i-W,i+W])if(j>=0&&j<a.length&&a[j]===color&&seen[j]!==stamp){seen[j]=stamp;q[tail++]=j;}
      }
      if(tail>=minimum)result.push({color,indices:Array.from(q.subarray(0,tail))});
    }
    return result;
  }
  clear(groups){
    let count=0,gemCount=0;const removed=new Set();
    for(const group of groups)for(const i of group.indices)if(this.cells[i]&&this.cells[i]<4){this.cells[i]=0;removed.add(i);count++;}
    // Gem collection requires a burst next to the gem; empty starting air alone is not enough.
    for(const gem of this.gems){if(gem.collected)continue;
      const touched=gem.indices.some(i=>{const x=i%W;return[x>0?i-1:-1,x<W-1?i+1:-1,i-W,i+W].some(j=>removed.has(j));});
      if(touched){gem.collected=true;gemCount++;for(const i of gem.indices)this.cells[i]=0;}
    }
    if(count||gemCount){this.sleep=0;this.dirty=true;}return{count,gemCount};
  }
  addGem(cx,cy){
    const indices=[];for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(Math.abs(dx)+Math.abs(dy)<=4){const x=cx+dx,y=cy+dy;if(x>=0&&x<W&&y>=0&&y<H){this.set(x,y,4,10);indices.push(y*W+x);}}
    this.gems.push({x:cx,y:cy,indices,collected:false});
  }
}
class Run{
  constructor({seed='sand',colors=2,burst=10,gravity=26,gems=0,stage=1}={}){
    this.field=new Field();this.rng=random(seed);this.colors=colors;this.burst=burst*UNIT;this.gravity=gravity;this.serial=0;this.queue=[];this.held=null;this.holdUsed=false;this.active=null;this.state='falling';this.chain=0;this.maxChain=0;this.score=0;this.removed=0;this.collected=0;this.pieces=0;this.pending=null;this.clearTime=0;this.accumulator=0;this.events=[];this.lastMoves=0;
    for(let k=0;k<gems;k++){const x=((stage*3+k*4)%8+1)*12+6,y=H-5-k*12;this.field.addGem(x,y);}
    for(let i=0;i<3;i++)this.queue.push(this.makePacket());this.spawn();
  }
  makePacket(){return packet(this.rng,this.colors,++this.serial);}
  place(p){p.x=W/2;p.y=-p.bounds.top+2;this.active=p;if(!this.field.fits(p)){this.active=null;this.state='over';this.events.push({type:'over'});return false;}return true;}
  spawn(){const p=this.queue.shift();this.queue.push(this.makePacket());this.holdUsed=false;this.state='falling';return this.place(p);}
  moveTo(x){const p=this.active;if(!p||this.state!=='falling')return false;const target=Math.round(Math.max(-p.bounds.left,Math.min(W-1-p.bounds.right,x)));let moved=false;
    while(p.x!==target){const n=p.x+Math.sign(target-p.x);if(!this.field.fits(p,n,p.y))break;p.x=n;moved=true;}return moved;
  }
  rotate(){const p=this.active;if(!p||this.state!=='falling')return false;const grains=p.grains.map(g=>({x:-g.y,y:g.x,shade:g.shade})),b=bounds(grains),next={...p,grains,bounds:b};
    const ox=Math.max(-b.left,Math.min(W-1-b.right,p.x)),oy=Math.max(p.y,-b.top);for(const dx of [0,-1,1,-3,3,-6,6,-12,12])for(const dy of [0,-1,-3])if(this.field.fits(next,ox+dx,oy+dy)){next.x=ox+dx;next.y=oy+dy;this.active=next;return true;}return false;
  }
  hold(){if(this.state!=='falling'||!this.active||this.holdUsed)return false;const p=this.active;if(this.held){const h=this.held;this.held=p;this.place(h);}else{this.held=p;this.spawn();}this.holdUsed=true;return true;}
  land(){if(!this.active)return;const p=this.active;if(!this.field.deposit(p)){this.state='over';this.active=null;this.events.push({type:'over'});return;}this.pieces++;this.active=null;this.chain=0;this.events.push({type:'land'});this.spawn();}
  drop(){if(!this.active||this.state!=='falling')return;const p=this.active,y=this.field.dropY(p);this.score+=Math.floor((y-p.y)/6);p.y=y;this.land();}
  softDrop(distance=3){if(!this.active||this.state!=='falling')return;const p=this.active;for(let i=0;i<distance;i++){if(!this.field.fits(p,p.x,p.y+1)){this.land();break;}p.y++;}}
  step(dt){
    if(this.state==='over')return;
    // dt capped at the caller boundary; pause does not call this method.
    dt=Math.max(0,Math.min(50,dt));
    if(this.active){const p=this.active,target=p.y+this.gravity*dt/1000;let y=p.y;
      while(y<target){const next=Math.min(target,y+1);if(!this.field.fits(p,p.x,next)){p.y=y;this.land();break;}y=next;}if(this.active)p.y=y;
    }
    if(this.state==='clearing'){
      this.clearTime-=dt;if(this.clearTime<=0){const result=this.field.clear(this.pending);this.removed+=result.count;this.collected+=result.gemCount;const gain=Math.round(result.count/UNIT*20+this.pending.length*100)*Math.pow(2,Math.min(10,this.chain-1))+result.gemCount*500;this.score+=gain;this.events.push({type:'burst',groups:this.pending,gain,chain:this.chain,gems:result.gemCount});this.pending=null;this.state=this.active?'falling':'settling';}return;
    }
    this.accumulator+=dt;this.lastMoves=0;let steps=0;
    while(this.accumulator>=1000/120&&steps++<6){this.accumulator-=1000/120;this.lastMoves+=this.field.step();}
    if(this.field.sleep>=4&&this.state!=='clearing'){
      const groups=this.field.groups(this.burst);
      if(groups.length){this.pending=groups;this.chain++;this.maxChain=Math.max(this.maxChain,this.chain);this.clearTime=180;this.state='clearing';this.events.push({type:'prepare',chain:this.chain});}
      else if(!this.active)this.spawn();
    }
  }
}
function tint(color,shade,light=0){return PALETTE[(color-1)%3].map(v=>Math.max(0,Math.min(255,Math.round(v*(.9+shade*.01)+light))));}
return{W,H,PIXEL,UNIT,PACKET,PALETTE,hash,random,packet,bounds,Field,Run,tint};
});

// Sand-only controller. The legacy glass app remains on index.html, unchanged.
if(typeof window!=='undefined'&&document.getElementById('sand-board')){
(function(){
'use strict';
const M=window.MicroSand,S=window.GlassStages,$=id=>document.getElementById(id),canvas=$('sand-board'),ctx=canvas.getContext('2d');
const bitmap=document.createElement('canvas');bitmap.width=M.W;bitmap.height=M.H;const bg=bitmap.getContext('2d'),image=bg.createImageData(M.W,M.H),sprites=new WeakMap();
const KEY='glassfall-v1',query=new URLSearchParams(location.search),mode=['stage','endless','daily'].includes(query.get('mode'))?query.get('mode'):'stage';
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{}
if(typeof saved!=='object'||Array.isArray(saved))saved={};
saved.campaign=saved.campaign&&typeof saved.campaign==='object'?saved.campaign:{};
saved.sandMicro=saved.sandMicro&&typeof saved.sandMicro==='object'?saved.sandMicro:{};
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let reduced=systemReduced||saved.effects==='light',stage=S.number(query.get('stage')||S.progress(saved.campaign.sand).unlocked),run,config,last=0,elapsed=0,paused=false,finished=false,drag=null,messageTime=0,fx=[],ghost=null,hudTime=0,saveOK=true,audio=null;
if(!saved.devMode)stage=Math.min(stage,S.progress(saved.campaign.sand).unlocked);
function save(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{saveOK=false;}}
function resize(){const ratio=Math.min(2,window.devicePixelRatio||1,2);canvas.width=360*ratio;canvas.height=720*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.imageSmoothingEnabled=false;}
function seed(){if(mode==='stage')return config.seed+'-micro1';if(mode==='daily')return 'DAILY-MICRO-'+new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return 'MICRO-'+Date.now().toString(36);}
let currentSeed='';
function begin(retry){
 config=S.config(stage,'sand');currentSeed=retry||seed();
 run=new M.Run({seed:currentSeed,colors:mode==='stage'?config.sandColors:3,burst:mode==='stage'?config.sandBurst:12,gravity:26/(mode==='stage'?config.speed:1),gems:mode==='stage'?config.gems:0,stage});
 elapsed=0;last=performance.now();paused=false;finished=false;drag=null;fx=[];ghost=null;messageTime=0;hudTime=0;$('notice').textContent='';$('overlay').hidden=true;
 const q=new URLSearchParams({mode,stage:String(stage),v:'micro1'});try{history.replaceState(null,'','?'+q);}catch{}updateHUD();draw();
}
function sprite(p){let out=sprites.get(p.grains);if(out)return out;const b=p.bounds,c=document.createElement('canvas');c.width=b.right-b.left+1;c.height=b.bottom-b.top+1;const g=c.getContext('2d'),im=g.createImageData(c.width,c.height);for(const grain of p.grains){const i=((grain.y-b.top)*c.width+grain.x-b.left)*4;const rgb=M.tint(p.color,grain.shade);im.data.set([...rgb,255],i);}g.putImageData(im,0,0);sprites.set(p.grains,c);return c;}
function drawPacket(g,p,cx,cy,scale=3,alpha=1){if(!p)return;g.save();g.globalAlpha=alpha;g.imageSmoothingEnabled=false;g.drawImage(sprite(p),cx+p.bounds.left*scale,cy+p.bounds.top*scale,(p.bounds.right-p.bounds.left+1)*scale,(p.bounds.bottom-p.bounds.top+1)*scale);g.restore();}
function preview(id,p){const c=$(id),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);if(!p)return;const b=p.bounds,scale=Math.min((c.width-18)/(b.right-b.left+1),(c.height-18)/(b.bottom-b.top+1));drawPacket(g,p,c.width/2-(b.left+b.right+1)*scale/2,c.height/2-(b.top+b.bottom+1)*scale/2,scale);}
function paintField(){
 if(!run.field.dirty)return;const a=run.field.cells,s=run.field.shade,p=image.data;
 for(let i=0;i<a.length;i++){const j=i*4,c=a[i];if(c===0||c===4){p[j+3]=0;continue;}const light=i>=M.W&&!a[i-M.W]?9:0;const rgb=M.tint(c,s[i],light);p[j]=rgb[0];p[j+1]=rgb[1];p[j+2]=rgb[2];p[j+3]=255;}
 bg.putImageData(image,0,0);run.field.dirty=false;ghost=null;
}
function draw(){
 if(!run)return;ctx.clearRect(0,0,360,720);ctx.fillStyle='#15171b';ctx.fillRect(0,0,360,720);paintField();ctx.imageSmoothingEnabled=false;ctx.drawImage(bitmap,0,0,360,720);
 for(const gem of run.field.gems){if(gem.collected)continue;const x=gem.x*3+1.5,y=gem.y*3+1.5;ctx.fillStyle='#86ecdf';ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+8,y);ctx.lineTo(x,y+9);ctx.lineTo(x-8,y);ctx.closePath();ctx.fill();ctx.fillStyle='#e4fff7';ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+2,y);ctx.lineTo(x-8,y);ctx.closePath();ctx.fill();}
 if(run.active){const p=run.active;if(!ghost||ghost.x!==p.x||ghost.grains!==p.grains)ghost={x:p.x,grains:p.grains,y:run.field.dropY(p)};if(ghost.y-p.y>3)drawPacket(ctx,p,p.x*3,ghost.y*3,3,.13);drawPacket(ctx,p,p.x*3,p.y*3);}
 if(run.pending){ctx.save();ctx.fillStyle='#fff4d1';ctx.globalAlpha=reduced?.16:.27;for(const group of run.pending)for(const i of group.indices)ctx.fillRect(i%M.W*3,Math.floor(i/M.W)*3,3,3);ctx.restore();}
 if(!reduced)for(const p of fx){ctx.globalAlpha=Math.max(0,p.life/350);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,1.6,1.6);}ctx.globalAlpha=1;
}
function status(text){$('notice').textContent=text;messageTime=1300;}
function feedback(event){
 if(saved.haptics&&!reduced&&navigator.vibrate)try{navigator.vibrate(event.type==='land'?6:event.chain>=3?[12,25,16]:10);}catch{}
 if(!saved.sound)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const source=audio.createBufferSource(),buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*.10),audio.sampleRate),values=buffer.getChannelData(0);for(let i=0;i<values.length;i++)values[i]=(Math.random()-.5)*(1-i/values.length);source.buffer=buffer;const gain=audio.createGain();gain.gain.value=event.type==='land'?.07:.12;source.connect(gain);gain.connect(audio.destination);source.start();}catch{}
}
function finish(won){
 if(finished)return;finished=true;paused=true;drag=null;const key=mode==='stage'?'stage:'+stage:mode;
 saved.sandMicro[key]=Math.max(Number(saved.sandMicro[key])||0,run.score);
 if(won&&mode==='stage'){saved.campaign.sand=S.complete(saved.campaign.sand,stage);saved.mastery=saved.mastery&&typeof saved.mastery==='object'?saved.mastery:{};saved.mastery.sand=(Number(saved.mastery.sand)||0)+65+stage;}
 save();$('overlay-title').textContent=won?(mode==='stage'?stage+' 스테이지 완료':'도전 완료'):'모래가 입구에 닿았어요';
 $('overlay-body').innerHTML='<p class="result">'+run.score.toLocaleString()+'<small>최대 '+run.maxChain+'연쇄 · '+Math.floor(run.removed/M.UNIT)+' 모래량 제거</small></p>'+(won&&mode==='stage'&&stage<100?'<button data-menu="next" class="primary">다음 스테이지</button>':'')+'<button data-menu="retry">같은 판 다시 시작</button><button data-menu="settings">스테이지·설정</button><a class="button" href="index.html?v=micro1">모드 선택</a><p class="muted">'+(saveOK?'진행도는 기존 기록에 보존됩니다. 마이크로 모래 최고 점수는 별도 집계합니다.':'이 브라우저에서는 기록을 저장하지 못했습니다.')+'</p>';$('overlay').hidden=false;updateHUD();
}
function updateHUD(){
 if(!run)return;$('score').textContent=run.score.toLocaleString();const seconds=Math.floor(mode==='daily'?Math.max(0,180-elapsed/1000):elapsed/1000);
 $('time').textContent=mode==='stage'?stage+' / 100':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');$('time-label').textContent=mode==='stage'?'스테이지':mode==='daily'?'남은 시간':'플레이 시간';
 $('goal').textContent=mode==='stage'?'제거 '+Math.min(config.target,Math.floor(run.removed/M.UNIT))+' / '+config.target+' 모래량'+(config.gems?' · 💎 '+run.collected+'/'+config.gems:''):'최대 '+run.maxChain+'연쇄 · '+Math.floor(run.removed/M.UNIT)+' 모래량 제거';
 $('rule').textContent=(mode==='stage'?config.sandBurst:12)+' 모래량 연결 → 붕괴 · 한 덩어리 = 4 모래량';
 $('hold').disabled=paused||finished||!run.active||run.holdUsed;$('rotate').disabled=$('drop').disabled=paused||finished||!run.active;
 preview('next',run.queue[0]);preview('next2',run.queue[1]);preview('held',run.held);$('pause').textContent=paused?'▶':'Ⅱ';
}
function settings(){
 paused=true;drag=null;const p=S.progress(saved.campaign.sand);$('overlay-title').textContent=finished?'스테이지·설정':'잠시 쉬어가세요';
 $('overlay-body').innerHTML=(finished?'':'<button data-menu="resume" class="primary">계속하기</button>')+'<button data-menu="retry">같은 판 다시 시작</button><details><summary>스테이지 선택 · '+(saved.devMode?'DEV 1~100 전체 열림':p.unlocked+'까지 열림')+'</summary><div class="stage-grid">'+Array.from({length:100},(_,i)=>i+1).map(n=>'<button data-stage="'+n+'" '+(!saved.devMode&&n>p.unlocked?'disabled':'')+' class="'+(n===stage?'selected':'')+'">'+n+'</button>').join('')+'</div></details><button data-menu="dev">개발자 모드 '+(saved.devMode?'ON':'OFF')+'</button><button data-menu="effects" '+(systemReduced?'disabled':'')+'>효과 '+(reduced?'간결':'풍부')+'</button><button data-menu="sound">소리 '+(saved.sound?'ON':'OFF')+'</button><button data-menu="haptics">진동 '+(saved.haptics?'ON':'OFF')+'</button><p class="muted">좌우로 밀기: 이동<br>짧게 터치 / 회전 버튼: 덩어리 방향 바꾸기<br>아래로 빠르게 밀기 / 즉시 하강: 떨어뜨리기<br>착지한 알갱이는 실제로 아래·대각선으로 흐릅니다. 같은 색 '+(mode==='stage'?config.sandBurst:12)+' 모래량이 연결되면 붕괴합니다.<br>1 모래량 = '+M.UNIT+'개 알갱이. 효과 설정을 바꿔도 모래량과 판정은 같습니다.</p><a class="button" href="index.html?v=micro1">모드 선택</a>';
 $('overlay').hidden=false;updateHUD();
}
$('overlay-body').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.stage){const n=Number(b.dataset.stage);if(n>=1&&n<=100&&(saved.devMode||n<=S.progress(saved.campaign.sand).unlocked)){if(mode!=='stage'){location.href='sand-micro.html?mode=stage&stage='+n+'&v=micro1';return;}stage=n;begin();}return;}
 switch(b.dataset.menu){case'resume':if(!finished){paused=false;last=performance.now();$('overlay').hidden=true;}break;case'retry':begin(currentSeed);break;case'next':stage++;begin();break;case'settings':settings();break;case'dev':saved.devMode=!saved.devMode;save();settings();break;case'effects':if(!systemReduced){reduced=!reduced;saved.effects=reduced?'light':'rich';save();settings();}break;case'sound':saved.sound=!saved.sound;save();settings();break;case'haptics':saved.haptics=!saved.haptics;save();settings();break;}updateHUD();
});
$('pause').addEventListener('click',()=>{if(finished)return;if(paused){paused=false;last=performance.now();$('overlay').hidden=true;updateHUD();}else settings();});
function act(name){if(paused||finished||!run.active)return;if(name==='hold')run.hold();if(name==='rotate')run.rotate();if(name==='drop')run.drop();ghost=null;drag=null;updateHUD();}
for(const name of ['hold','rotate','drop'])$(name).addEventListener('click',()=>act(name));
for(const [id,index]of [['peek1',0],['peek2',1]])$(id).addEventListener('click',()=>{if(finished)return;paused=true;drag=null;$('overlay-title').textContent='다음 모래 '+(index+1);$('overlay-body').innerHTML='<canvas id="large-preview" width="192" height="150"></canvas><button data-menu="resume" class="primary">닫고 계속하기</button>';$('overlay').hidden=false;preview('large-preview',run.queue[index]);updateHUD();});
canvas.addEventListener('pointerdown',e=>{if(paused||finished||!run.active||drag||!e.isPrimary||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,packet:run.active.id,x:e.clientX,y:e.clientY,lastY:e.clientY,origin:run.active.x,started:performance.now(),max:0,axis:null};});
canvas.addEventListener('pointermove',e=>{const d=drag;if(!d||d.id!==e.pointerId||run.active?.id!==d.packet)return;e.preventDefault();const dx=e.clientX-d.x,dy=e.clientY-d.y;d.max=Math.max(d.max,Math.hypot(dx,dy));if(!d.axis&&Math.max(Math.abs(dx),Math.abs(dy))>9)d.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';if(d.axis==='x'){run.moveTo(d.origin+dx/canvas.getBoundingClientRect().width*M.W);ghost=null;}else if(d.axis==='y'&&dy>0&&performance.now()-d.started>300){const steps=Math.floor((e.clientY-d.lastY)/canvas.getBoundingClientRect().height*M.H);if(steps>0){run.softDrop(Math.min(12,steps));d.lastY=e.clientY;}}});
canvas.addEventListener('pointerup',e=>{const d=drag;drag=null;if(!d||d.id!==e.pointerId||run.active?.id!==d.packet||paused)return;e.preventDefault();const dy=e.clientY-d.y,dx=e.clientX-d.x,age=performance.now()-d.started;if(d.max<9&&Math.hypot(dx,dy)<9&&age<300)run.rotate();else if(dy>45&&dy>Math.abs(dx)*1.5&&age<350&&dy/age>.4)run.drop();ghost=null;updateHUD();});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
document.addEventListener('keydown',e=>{if(e.target.closest('button,summary,a,input,select'))return;if(['Escape','p','P'].includes(e.key)){e.preventDefault();if(!finished)settings();return;}if(paused||finished||!run.active)return;if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','c','C'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')run.moveTo(run.active.x-3);if(e.key==='ArrowRight')run.moveTo(run.active.x+3);if(e.key==='ArrowDown')run.softDrop(3);if(!e.repeat&&e.key==='ArrowUp')run.rotate();if(!e.repeat&&e.key===' ')run.drop();if(!e.repeat&&['c','C'].includes(e.key))run.hold();ghost=null;updateHUD();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&!finished)settings();});window.addEventListener('blur',()=>{if(!paused&&!finished)settings();});window.addEventListener('resize',resize);
function frame(now){const dt=Math.max(0,Math.min(50,now-last));last=now;
 if(!paused&&!finished){elapsed+=dt;run.step(dt);if(messageTime>0){messageTime-=dt;if(messageTime<=0)$('notice').textContent='';}
  for(const event of run.events.splice(0)){if(event.type==='over')finish(false);if(event.type==='land'){drag=null;feedback(event);}if(event.type==='prepare')status(event.chain>=3?'산사태 · '+event.chain+' CHAIN':event.chain>1?event.chain+' CHAIN':'SAND BURST');if(event.type==='burst'){feedback(event);if(!reduced)for(const group of event.groups){const hop=Math.max(1,Math.ceil(group.indices.length/40));for(let j=0;j<group.indices.length&&fx.length<160;j+=hop){const i=group.indices[j];fx.push({x:i%M.W*3,y:Math.floor(i/M.W)*3,life:350,vx:(Math.random()-.5)*35,vy:30+Math.random()*45,color:'rgb('+M.PALETTE[group.color-1].join(',')+')'});}}}}
  for(const p of fx){p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=dt*.12;}fx=fx.filter(p=>p.life>0);
  if(!finished&&mode==='stage'&&run.removed>=config.target*M.UNIT&&run.collected>=config.gems&&run.state==='falling')finish(true);
  if(!finished&&mode==='daily'&&elapsed>=180000)finish(true);
 }
 if(now-hudTime>120){updateHUD();hudTime=now;}draw();requestAnimationFrame(frame);
}
// Read-only diagnostics are available only with an explicit QA query parameter.
if(query.get('qa')==='1')window.sandQA={snapshot:()=>({stage,mode,paused,finished,state:run.state,pieces:run.pieces,grains:run.field.count(),score:run.score,chain:run.maxChain,active:run.active?{id:run.active.id,x:run.active.x,y:run.active.y,color:run.active.color,count:run.active.grains.length}:null,colors:run.colors,removed:run.removed,gems:run.collected,holdUsed:run.holdUsed}),field:()=>Array.from(run.field.cells)};
resize();begin();$('boot').hidden=true;requestAnimationFrame(frame);
})();
}
