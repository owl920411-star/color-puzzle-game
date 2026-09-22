/* ENDLESS 1 — two independent engines, one score-first interface.
 * The MicroSand Field/Run are reused unchanged. No campaign/daily controller is loaded.
 */
(() => {
'use strict';
const E=window.GlassEngine,M=window.MicroSand,R=window.EndlessRules,$=id=>document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d'),panel=$('panel'),KEY='glassfall-v1';
const COLORS={I:['#83eee3','#318b99'],O:['#f7d790','#b9844e'],T:['#ceb0fb','#7550b3'],S:['#a9e9ba','#478c70'],Z:['#f5a3b1','#a74769'],J:['#a0c4fa','#4d71b1'],L:['#f4b798','#ab6349']};
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function object(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function readStore(){try{return object(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return{};}}
let saved=readStore(),saveOK=true,kind=new URLSearchParams(location.search).get('mode')==='sand'?'sand':saved.material==='sand'?'sand':'normal';
let reduced=systemReduced||saved.effects==='light',run=null,state='menu',beforePause='playing',overlayView='menu',elapsed=0,last=0,fallTime=0,lockTime=0,lockResets=0;
let phase=null,phaseTime=0,pending=null,falls=[],drag=null,repeat=null,heldKeys=new Set(),fx=[],floaters=[],impact=null,trail=null,calloutTime=0;
let currentSeed='',recordBest=0,initialBest=0,finalSaved=false,recordAnnounced=false,lastSave=0,lastHUD=0,audio=null,previewReturn='menu';
const bitmap=document.createElement('canvas');bitmap.width=M.W;bitmap.height=M.H;
const bg=bitmap.getContext('2d'),pixels=bg.createImageData(M.W,M.H),sprites=new WeakMap();let ghost=null;
const playing=()=>state==='playing'||state==='clearing';
const canAct=()=>state==='playing'&&run?.active&&(kind==='normal'||run.state==='falling');
const pieceID=()=>kind==='sand'?run?.active?.id:run?.active?.cells[0]?.id;
const finite=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
function writeStore(change){try{const fresh=readStore();change(fresh);localStorage.setItem(KEY,JSON.stringify(fresh));saved=fresh;saveOK=true;}catch{saveOK=false;}}
function pref(key,value){saved[key]=value;writeStore(s=>{s[key]=value;});}
function loadBest(){recordBest=finite(object(object(readStore().endlessV1)[kind]).best);initialBest=recordBest;}
function rememberScore(final=false){
 if(!run||state==='menu')return;
 recordBest=Math.max(recordBest,run.score);
 writeStore(s=>{
  s.endlessV1=object(s.endlessV1);const r=object(s.endlessV1[kind]);r.best=Math.max(finite(r.best),recordBest);recordBest=r.best;
  if(final&&!finalSaved){r.plays=finite(r.plays)+1;r.last={score:run.score,seconds:Math.floor(elapsed/1000),lines:kind==='normal'?run.lines:0,units:kind==='sand'?Math.floor(run.removed/M.UNIT):0,combo:kind==='normal'?run.maxCombo:run.maxChain};}
  s.endlessV1[kind]=r;
 });
 if(final)finalSaved=true;
 lastSave=performance.now();
}
function seed(){const n=new Uint32Array(2);if(window.crypto?.getRandomValues)window.crypto.getRandomValues(n);else{n[0]=Math.random()*4294967295;n[1]=Date.now();}return'ENDLESS-'+Array.from(n,x=>x.toString(36)).join('-');}
function name(){return kind==='normal'?'일반':'모래';}
function timeText(){const n=Math.floor(elapsed/1000);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
function clearInput(){
 const d=drag;drag=null;repeat=null;heldKeys.clear();
 if(d&&canvas.hasPointerCapture?.(d.id))try{canvas.releasePointerCapture(d.id);}catch{}
 for(const b of document.querySelectorAll('[data-action]'))b.classList.remove('pressed');
}
function fit(){
 const app=$('app'),style=getComputedStyle(app),width=app.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
 const rail=Math.max(54,Math.min(72,width*.20)),gap=parseFloat(style.gap)||0;
 const available=app.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-document.querySelector('.topbar').offsetHeight-document.querySelector('.scorebar').offsetHeight-document.querySelector('footer').offsetHeight-gap*3;
 const bw=Math.max(40,Math.floor(Math.min(width-rail-9,available/2)));
 document.documentElement.style.setProperty('--rail',rail+'px');document.documentElement.style.setProperty('--board-width',bw+'px');document.documentElement.style.setProperty('--board-height',bw*2+'px');
 const ratio=Math.min(devicePixelRatio||1,2);canvas.width=360*ratio;canvas.height=720*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);
}
function showPanel(html,view){overlayView=view;panel.innerHTML=html;$('overlay').hidden=false;$('app').inert=true;panel.focus({preventScroll:true});}
function hidePanel(){$('overlay').hidden=true;$('app').inert=false;overlayView='';}
function ruleHTML(){return kind==='normal'?'<b>줄 제거 점수</b><br>1줄 100 · 2줄 300 · 3줄 500 · 4줄 800점<br>줄 제거 점수 × 현재 레벨<br>연속으로 제거하면 두 번째부터 콤보 보너스<br>+50 × (연속 제거 횟수 − 1) × 레벨<br>천천히 하강: 칸당 1점 · 즉시 하강: 칸당 2점<br>10줄마다 낙하 레벨 상승':'<b>모래 붕괴 점수</b><br>같은 색 12 모래량 연결 → 붕괴<br>(제거 모래량 × 20 + 제거 묶음 × 100)점<br>자연 연쇄 배수: ×1 → ×2 → ×4 → ×8…<br>배수 상한 ×1,024 · 모래주머니 하나 = 4 모래량<br>즉시 하강: 미세 격자 6칸당 1점';}
function menu(){
 if(playing()||state==='paused')rememberScore();clearInput();state='menu';phase=null;pending=null;falls=[];fx=[];floaters=[];trail=null;impact=null;elapsed=0;calloutTime=0;$('callout').classList.remove('show');
 loadBest();run=kind==='normal'?new R.NormalGame('preview'):new M.Run({seed:'preview',colors:3,burst:12,gravity:26});
 if(kind==='normal')for(let x=0;x<10;x++)for(let y=19;y>=19-(x%3);y--)run.board[y][x]={type:Object.keys(COLORS)[(x+y)%7],mask:0,id:1000+y*10+x};
 run.active=null;showMenu();hud();draw();
}
function showMenu(){
 showPanel(`<div class="kicker">ENDLESS SCORE ATTACK</div><h1>GLASSFALL</h1><p>끝없이 쌓고, 터뜨리고,<br>나의 최고 점수를 넘어보세요.</p><div class="modes"><button class="mode-card ${kind==='normal'?'selected':''}" data-menu="normal" aria-pressed="${kind==='normal'}"><canvas class="mode-art" data-art="glass" width="320" height="180"></canvas><strong>일반 모드</strong><small>NORMAL</small></button><button class="mode-card ${kind==='sand'?'selected':''}" data-menu="sand" aria-pressed="${kind==='sand'}"><canvas class="mode-art" data-art="sand" width="320" height="180"></canvas><strong>모래 모드</strong><small>SAND</small></button></div><p class="mode-description">${kind==='normal'?'가로줄을 완성해 제거하세요.<br>여러 줄과 연속 제거로 더 높은 점수!':'모래주머니를 쌓고 같은 색을 모으세요.<br>붕괴와 산사태 연쇄로 더 높은 점수!'}</p><button class="primary" data-menu="start">▶ ${name()} 무한 모드 시작</button><div class="menu-best">이 모드 최고 ${recordBest.toLocaleString()}점</div><button class="text-button" data-menu="settings">점수 규칙 · 설정</button><p class="storage-note">기록은 이 브라우저에 저장됩니다.</p>`,'menu');
 // A readable fallback before the existing artwork finishes loading.
 for(const c of panel.querySelectorAll('.mode-art')){const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);if(c.dataset.art==='glass'){const p=new R.NormalGame('card').queue[0];normalPreview(g,p,c.width,c.height);}else{const p=M.packet(M.random('card'),3,0);sandPreview(g,p,c.width,c.height);}}
 window.GlassArt?.menu(panel);
}
function start(retry=false){
 if(playing()||state==='paused')rememberScore();clearInput();currentSeed=retry&&currentSeed?currentSeed:seed();
 run=kind==='normal'?new R.NormalGame(currentSeed):new M.Run({seed:currentSeed,colors:3,burst:12,gravity:26,gems:0});
 state='playing';beforePause='playing';elapsed=fallTime=lockTime=lockResets=0;phase=null;pending=null;falls=[];fx=[];floaters=[];impact=trail=ghost=null;calloutTime=0;recordAnnounced=false;finalSaved=false;
 loadBest();$('best').parentElement.classList.remove('record');last=performance.now();lastSave=last;hidePanel();$('callout').classList.remove('show');initAudio();hud();draw();
}
function pause(){if(!playing())return;beforePause=state;state='paused';clearInput();rememberScore();pausePanel();hud();}
function pausePanel(){showPanel(`<div class="kicker">PAUSED</div><h2>잠시 쉬어가세요.</h2><div class="result-meta">현재 ${run.score.toLocaleString()}점 · 최고 ${recordBest.toLocaleString()}점<br>플레이 ${timeText()}</div><button class="primary" data-menu="resume">계속하기</button><button class="secondary" data-menu="settings">점수 규칙 · 설정</button><button class="secondary" data-menu="retry">같은 판 다시 시작</button><button class="text-button" data-menu="menu">일반·모래 선택</button>`,'pause');}
function resume(){if(state!=='paused')return;clearInput();state=beforePause;last=performance.now();hidePanel();hud();}
function finish(){
 if(state==='over')return;state='over';clearInput();run.active=null;phase=null;pending=null;rememberScore(true);
 showPanel(`<div class="kicker">${run.score>initialBest?'NEW BEST':'GAME OVER'}</div><h2>${run.score>initialBest?'최고 기록을 넘었어요!':'한 번 더 도전해 볼까요?'}</h2><div class="result-score">${run.score.toLocaleString()}<small style="font-size:17px"> 점</small></div><div class="result-meta">${kind==='normal'?`제거 ${run.lines}줄 · 최대 ${run.maxCombo}연속 제거`:`제거 ${Math.floor(run.removed/M.UNIT)} 모래량 · 최대 ${run.maxChain}연쇄`}<br>플레이 ${timeText()} · 최고 ${recordBest.toLocaleString()}점</div><button class="primary" data-menu="new">새로운 판 시작</button><button class="secondary" data-menu="retry">같은 판 다시 도전</button><button class="text-button" data-menu="menu">일반·모래 선택</button><p class="storage-note">${saveOK?'일반·모래 최고 점수는 따로 저장됩니다.':'이 브라우저에서는 기록을 저장하지 못했습니다.'}</p>`,'over');hud();
}
function settings(){
 if(playing()){beforePause=state;state='paused';clearInput();rememberScore();}
 showPanel(`<div class="kicker">HOW TO PLAY</div><h2>${name()} 모드</h2><div class="rule-box">${ruleHTML()}</div><p>게임판을 좌우로 밀어 이동하세요.<br>${kind==='normal'?'짧게 탭하거나 회전 버튼으로 회전합니다.<br>':''}다른 손가락으로 하강${kind==='normal'?'·회전':''} 버튼을 눌러도<br>게임판의 스와이프는 계속 이어집니다.</p><div class="settings-row"><button data-menu="sound">소리 ${saved.sound?'켬':'끔'}</button><button data-menu="haptics" ${typeof navigator.vibrate!=='function'?'disabled':''}>진동 ${saved.haptics?'켬':'끔'}</button><button data-menu="effects" ${systemReduced?'disabled':''}>효과 ${reduced?'간결':'풍부'}</button></div><button class="primary" data-menu="back">${state==='paused'?'게임으로 돌아가기':'뒤로'}</button><p class="storage-note">${saveOK?'최고 점수는 이 기기·브라우저에 저장됩니다.':'저장이 제한되어 있습니다. 이번 점수는 화면에서 확인해 주세요.'}</p>`,'settings');hud();
}
panel.addEventListener('click',e=>{
 const b=e.target.closest('button[data-menu]');if(!b||b.disabled)return;const a=b.dataset.menu;
 if(a==='normal'||a==='sand'){kind=a;pref('material',kind==='normal'?'glass':'sand');menu();}
 else if(a==='start'||a==='new')start();else if(a==='retry')start(true);else if(a==='resume')resume();else if(a==='menu')menu();else if(a==='settings')settings();
 else if(a==='sound'){pref('sound',!saved.sound);initAudio();settings();}else if(a==='haptics'){pref('haptics',!saved.haptics);settings();}
 else if(a==='effects'&&!systemReduced){reduced=!reduced;pref('effects',reduced?'light':'rich');settings();}
 else if(a==='back'){if(overlayView==='preview'){if(previewReturn==='playing')resume();else if(previewReturn==='pause')pausePanel();else showMenu();}else if(state==='paused')resume();else if(state==='over'){state='paused';beforePause='playing';menu();}else showMenu();}
});
function hud(){
 if(!run)return;document.body.dataset.kind=kind;$('mode-label').textContent=name()+' · 무한 모드';
 if(state!=='menu')recordBest=Math.max(recordBest,run.score);
 $('score').textContent=(state==='menu'?0:run.score).toLocaleString();$('best').textContent=recordBest.toLocaleString();$('time').textContent=timeText();
 $('score').style.fontSize=run.score>=1e9?'14px':'';$('best').style.fontSize=recordBest>=1e9?'14px':'';
 $('pace-label').textContent=kind==='normal'?'LEVEL '+run.level:'CHAIN '+run.maxChain;
 $('rotate').hidden=kind==='sand';for(const b of document.querySelectorAll('[data-action]'))b.disabled=!canAct()||(b.dataset.action==='hold'&&run.holdUsed);
 $('pause').disabled=!playing();$('notice').textContent=kind==='normal'?`제거 ${run.lines}줄 · 연속 ${run.combo||0}회`:`3색 · 12 모래량 연결 → 붕괴 · 최대 ${run.maxChain}연쇄`;
 if(!saveOK)$('notice').textContent='기록 저장이 제한되어 있습니다.';
 for(const [id,p]of [['next',run.queue[0]],['next2',run.queue[1]],['held',run.held]]){const c=$(id),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);if(p)(kind==='normal'?normalPreview:sandPreview)(g,p,c.width,c.height);}
}
function rebase(){if(!drag||!run.active)return;drag.originX=run.active.x;drag.anchorX=drag.lastX;drag.shift=0;drag.piece=pieceID();drag.downAnchor=drag.lastY;}
function carry(){
 if(!drag||drag.axis==='y')return false;
 drag.lane=run.active.x;drag.originX=run.active.x;drag.anchorX=drag.lastX;drag.shift=0;drag.axis='x';drag.noRelease=true;drag.piece=null;return true;
}
function moveTo(x){
 if(!run.active)return false;
 if(kind==='sand'){run.moveTo(x);return run.active.x===Math.round(x);}
 const target=Math.round(x);let steps=0;while(run.active.x!==target&&steps++<20){if(!action(target>run.active.x?'right':'left'))break;}return run.active.x===target;
}
function restore(){if(!drag||!drag.noRelease||!run.active)return;moveTo(drag.lane);rebase();}
function nextNormal(){
 phase=null;pending=null;falls=[];state='playing';fallTime=lockTime=lockResets=0;
 if(!run.spawn()){finish();return;}restore();hud();
}
function lockNormal(keep=false){
 if(!run.active)return;if(!keep)clearInput();
 const p=run.active;impact={x:(p.x+1.5)*36,y:(p.y+Math.max(...p.cells.map(c=>c.y))+1)*36,life:340,total:340};
 run.lock();vibrate(7);pending=R.linePlan(run.board);
 if(pending){state='clearing';phase='flash';phaseTime=0;hud();}
 else{run.noClear();nextNormal();}
}
function action(a){
 if(!canAct())return false;initAudio();let moved=false;
 if(kind==='sand'){
  if(a==='rotate')return false;
  if(a==='drop'||a==='hold'){
   if(a==='hold'&&run.holdUsed)return false;const keep=carry();if(!keep)clearInput();
   if(a==='drop')run.drop();else run.hold();
   if(run.state==='over'){finish();return false;}if(keep)restore();moved=true;
  }else if(a==='left'||a==='right'){moved=run.moveTo(run.active.x+(a==='left'?-3:3));}
  else if(a==='down'){const id=pieceID();run.softDrop(3);moved=true;if(id!==pieceID())clearInput();}
  if(run.state==='over')finish();hud();return moved;
 }
 const grounded=!run.fits(run.active,0,1);
 if(a==='left'||a==='right')moved=run.move(a==='left'?-1:1);
 else if(a==='rotate'){
  moved=run.rotate();if(moved)tone('rotate');
  if(drag){rebase();drag.noRelease=true;drag.axis='x';drag.lane=run.active.x;}
 }else if(a==='down'){moved=run.move(0,1);if(moved){run.score++;fallTime=0;}}
 else if(a==='drop'){
  const keep=carry(),p=run.active,d=run.dropDistance();trail={cells:p.cells.map(c=>({...c,x:c.x+p.x,y:c.y+p.y})),distance:d,life:170};
  run.move(0,d);run.score+=d*2;tone('drop');lockNormal(keep);hud();return true;
 }else if(a==='hold'){
  if(run.holdUsed)return false;const keep=carry();moved=run.hold();if(!keep)clearInput();
  if(run.over){finish();return false;}fallTime=lockTime=lockResets=0;if(keep)restore();
 }
 if(moved&&grounded&&lockResets<12&&['left','right','rotate'].includes(a)){lockTime=0;lockResets++;}
 if(a!=='left'&&a!=='right')hud();return moved;
}
function initAudio(){if(!saved.sound)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function vibrate(pattern){if(saved.haptics&&typeof navigator.vibrate==='function')try{navigator.vibrate(pattern);}catch{}}
function tone(type,power=1){
 if(!saved.sound)return;initAudio();if(!audio)return;
 try{const start=audio.currentTime;
 if(kind==='sand'){const src=audio.createBufferSource(),buf=audio.createBuffer(1,Math.floor(audio.sampleRate*.10),audio.sampleRate),v=buf.getChannelData(0);for(let i=0;i<v.length;i++)v[i]=(Math.random()-.5)*(1-i/v.length);src.buffer=buf;const gain=audio.createGain();gain.gain.value=type==='clear'?.12:.07;src.connect(gain);gain.connect(audio.destination);src.start();return;}
 const voices=type==='clear'?3:1;for(let i=0;i<voices;i++){const osc=audio.createOscillator(),gain=audio.createGain(),when=start+i*.045,base=(type==='clear'?740:type==='drop'?311:444)*(1+i*.33)*Math.min(1.65,1+(power-1)*.1);osc.type='sine';osc.frequency.setValueAtTime(base,when);osc.frequency.exponentialRampToValueAtTime(base*.8,when+.32);gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(type==='clear'?.025:.015,when+.008);gain.gain.exponentialRampToValueAtTime(.001,when+.32);osc.connect(gain);gain.connect(audio.destination);osc.start(when);osc.stop(when+.34);}
 }catch{}
}
function callout(title,sub){$('callout').innerHTML='<strong>'+title+'</strong><span>'+sub+'</span>';$('callout').classList.add('show');calloutTime=1000;}
function emitNormal(plan,result){
 const cap=reduced?45:260,count=reduced?1:8;
 for(const c of plan.cells)for(let i=0;i<count&&fx.length<cap;i++){const life=650+Math.random()*220;fx.push({x:(c.x+.5)*36,y:(c.y+.5)*36,vx:(Math.random()-.5)*260,vy:-90-Math.random()*160,gravity:350,life,total:life,size:2+Math.random()*4.5,kind:'glass',spark:i%4===0,sprite:Math.floor(Math.random()*8),angle:Math.random()*6.28,color:COLORS[c.cell.type]?.[0]||COLORS.I[0]});}
 const y=plan.rows.reduce((s,r)=>s+r+.5,0)/plan.rows.length*36;floaters.push({x:180,y,gain:result.gain,life:1000,total:1000,rows:plan.rows,color:'#b6f3e5',power:Math.min(3,plan.rows.length)});floaters=floaters.slice(-6);
 const title=plan.rows.length===4?'4 LINES!':plan.rows.length+' LINE'+(plan.rows.length>1?'S':'');callout(result.combo>1?result.combo+' COMBO!':title,'+'+result.gain.toLocaleString()+'점'+(result.bonus?' · 콤보 +'+result.bonus:''));tone('clear',plan.rows.length);vibrate(result.combo>1?[12,35,12]:12);
}
function sandEvents(){
 for(const e of run.events.splice(0)){
  if(e.type==='over'){finish();break;}
  if(e.type==='land'){if(drag&&drag.piece===e.id)clearInput();tone('drop');vibrate(6);ghost=null;}
  if(e.type==='burst'){
   const ids=e.groups.flatMap(g=>g.indices),limit=reduced?0:Math.min(180,ids.length),stride=Math.max(1,Math.floor(ids.length/Math.max(1,limit)));
   for(let j=0;j<ids.length&&j/stride<limit;j+=stride){const i=ids[j],life=350;fx.push({x:i%M.W*3,y:Math.floor(i/M.W)*3,vx:(Math.random()-.5)*100,vy:-30-Math.random()*50,gravity:200,life,total:life,size:1.6,angle:0,kind:'sand',color:'#e8d5ad'});}fx=fx.slice(-340);
   const y=ids.reduce((n,i)=>n+Math.floor(i/M.W)*3,0)/Math.max(1,ids.length);floaters.push({x:180,y,gain:e.gain,life:1100,total:1100,rows:[],color:'#e1c696',power:Math.min(3,e.chain)});floaters=floaters.slice(-6);
   callout(e.chain>=5?'MEGA AVALANCHE!':e.chain>=3?'AVALANCHE!':e.chain>1?e.chain+' CHAIN':'SAND BURST','+'+e.gain.toLocaleString()+'점 · ×'+Math.pow(2,Math.min(10,e.chain-1)));tone('clear',e.chain);vibrate(e.chain>=3?[12,25,16]:10);ghost=null;
  }
 }
}
function update(raw){
 const dt=Math.min(100,Math.max(0,raw));if(!playing())return;elapsed+=dt;
 if(repeat&&canAct()){repeat.time-=dt;let n=0;while(repeat&&repeat.time<=0&&n++<4){const r=repeat;action(r.action);if(repeat===r)r.time+=70;}}
 if(kind==='sand'){run.step(Math.min(50,dt));sandEvents();}
 else if(state==='playing'){
  if(run.active&&!run.fits(run.active,0,1)){fallTime=0;lockTime+=dt;if(lockTime>=run.lockDelay)lockNormal();}
  else{lockTime=0;fallTime+=dt;while(state==='playing'&&fallTime>=run.gravity){fallTime-=run.gravity;run.move(0,1);}}
 }else if(state==='clearing'){
  phaseTime+=dt;if(phase==='flash'&&phaseTime>=240){const p=pending,result=run.resolve(p);falls=result.falls;emitNormal(p,result);pending=null;phase='fall';phaseTime=0;hud();}
  else if(phase==='fall'&&phaseTime>=200)nextNormal();
 }
 if(drag?.axis==='y'&&canAct())processSwipe(drag,drag.lastX,drag.lastY,performance.now());
 for(const p of fx){p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=p.gravity*dt/1000;p.angle+=dt*.002;}fx=fx.filter(p=>p.life>0);
 for(const f of floaters)f.life-=dt;floaters=floaters.filter(f=>f.life>0);
 if(impact&&(impact.life-=dt)<=0)impact=null;if(trail&&(trail.life-=dt)<=0)trail=null;
 if(calloutTime>0&&(calloutTime-=dt)<=0)$('callout').classList.remove('show');
 recordBest=Math.max(recordBest,run.score);
 if(initialBest>0&&run.score>initialBest&&!recordAnnounced){recordAnnounced=true;$('best').parentElement.classList.add('record');}
 if(run.score>0&&performance.now()-lastSave>1500)rememberScore();
}
function normalCell(g,c,x,y,size=36,alpha=1,ghostCell=false,hot=false){
 const [light,dark]=COLORS[c.type]||COLORS.I;g.save();g.globalAlpha=alpha;const m=Math.max(1.4,size*.055),r=Math.max(2,size*.08),px=x+m,py=y+m,s=size-m*2;
 if(ghostCell){g.fillStyle=light+'20';g.fillRect(px,py,s,s);g.strokeStyle=light;g.lineWidth=1.5;g.strokeRect(px+.5,py+.5,s-1,s-1);g.restore();return;}
 if(!window.GlassArt?.tile(g,c,'glass',px,py,s)){const fill=g.createLinearGradient(px,py,px+s,py+s);fill.addColorStop(0,light+'a8');fill.addColorStop(.35,dark+'ba');fill.addColorStop(1,dark+'58');g.fillStyle=fill;g.beginPath();g.roundRect(px,py,s,s,r);g.fill();g.strokeStyle=light+'a0';g.lineWidth=.8;g.stroke();g.beginPath();g.moveTo(px+3,py+s-3);g.lineTo(px+3,py+3);g.lineTo(px+s-3,py+3);g.strokeStyle='#ffffff80';g.stroke();g.beginPath();g.moveTo(px+2,py+s*.53);g.lineTo(px+s*.55,py+2);g.lineTo(px+s*.78,py+2);g.lineTo(px+2,py+s*.78);g.closePath();g.fillStyle='#ffffff0e';g.fill();}
 // No crack masks, crack paths or fracture propagation overlays.
 if(hot){g.fillStyle='#dbfff588';g.fillRect(px,py,s,s);}g.restore();
}
function normalPreview(g,p,w,h){if(!p)return;const minX=Math.min(...p.cells.map(c=>c.x)),maxX=Math.max(...p.cells.map(c=>c.x)),minY=Math.min(...p.cells.map(c=>c.y)),maxY=Math.max(...p.cells.map(c=>c.y));const size=Math.min((w-16)/(maxX-minX+1),(h-16)/(maxY-minY+1),w*.21),x=(w-(maxX-minX+1)*size)/2,y=(h-(maxY-minY+1)*size)/2;for(const c of p.cells)normalCell(g,c,x+(c.x-minX)*size,y+(c.y-minY)*size,size);}
function sprite(p){let out=sprites.get(p.grains);if(out)return out;const b=p.bounds,c=document.createElement('canvas');c.width=b.right-b.left+1;c.height=b.bottom-b.top+1;const g=c.getContext('2d'),im=g.createImageData(c.width,c.height);for(const grain of p.grains){const i=((grain.y-b.top)*c.width+grain.x-b.left)*4;im.data.set([...M.tint(p.color,grain.shade),255],i);}g.putImageData(im,0,0);sprites.set(p.grains,c);return c;}
function drawPacket(g,p,cx,cy,scale=3,alpha=1){if(!p)return;g.save();g.globalAlpha=alpha;g.imageSmoothingEnabled=false;g.drawImage(sprite(p),cx+p.bounds.left*scale,cy+p.bounds.top*scale,(p.bounds.right-p.bounds.left+1)*scale,(p.bounds.bottom-p.bounds.top+1)*scale);g.restore();}
function sandPreview(g,p,w,h){if(!p)return;const b=p.bounds,scale=Math.min((w-18)/(b.right-b.left+1),(h-18)/(b.bottom-b.top+1));drawPacket(g,p,w/2-(b.left+b.right+1)*scale/2,h/2-(b.top+b.bottom+1)*scale/2,scale);}
function paintSand(){
 if(!run.field.dirty)return;const a=run.field.cells,s=run.field.shade,p=pixels.data;
 for(let i=0;i<a.length;i++){const j=i*4,c=a[i];if(c===0||c===4){p[j+3]=0;continue;}const rgb=M.tint(c,s[i],i>=M.W&&!a[i-M.W]?9:0);p[j]=rgb[0];p[j+1]=rgb[1];p[j+2]=rgb[2];p[j+3]=255;}
 bg.putImageData(pixels,0,0);run.field.dirty=false;ghost=null;
}
function draw(){
 if(!run)return;ctx.clearRect(0,0,360,720);ctx.fillStyle=kind==='sand'?'#15171b':'#0e1e2d';ctx.fillRect(0,0,360,720);
 if(kind==='sand'){
  paintSand();ctx.imageSmoothingEnabled=false;ctx.drawImage(bitmap,0,0,360,720);
  if(run.active){const p=run.active;if(!ghost||ghost.x!==p.x||ghost.grains!==p.grains)ghost={x:p.x,grains:p.grains,y:run.field.dropY(p)};if(ghost.y-p.y>3)drawPacket(ctx,p,p.x*3,ghost.y*3,3,.13);drawPacket(ctx,p,p.x*3,p.y*3);}
  if(run.pending){ctx.save();ctx.fillStyle='#fff4d1';ctx.globalAlpha=reduced?.16:.27;for(const group of run.pending)for(const i of group.indices)ctx.fillRect(i%M.W*3,Math.floor(i/M.W)*3,3,3);ctx.restore();}
 }else{
  ctx.imageSmoothingEnabled=true;window.GlassArt?.background(ctx,'glass');ctx.strokeStyle='#8fbed109';ctx.lineWidth=1;ctx.beginPath();for(let x=1;x<10;x++){ctx.moveTo(x*36,0);ctx.lineTo(x*36,720);}for(let y=1;y<20;y++){ctx.moveTo(0,y*36);ctx.lineTo(360,y*36);}ctx.stroke();
  const map=new Map(falls.map(f=>[f.cell.id,f])),hot=new Set(pending?.rows||[]);
  for(let y=0;y<20;y++)for(let x=0;x<10;x++){const c=run.board[y][x];if(!c)continue;const f=map.get(c.id),t=Math.min(1,phaseTime/200),yy=f&&phase==='fall'?f.from+(f.to-f.from)*(1-Math.pow(1-t,3)):y;normalCell(ctx,c,x*36,yy*36,36,1, false,hot.has(y));}
  if(run.active){const p=run.active,d=run.dropDistance();for(const c of p.cells)normalCell(ctx,c,(p.x+c.x)*36,(p.y+c.y+d)*36,36,.75,true);for(const c of p.cells)normalCell(ctx,c,(p.x+c.x)*36,(p.y+c.y)*36);}
 }
 if(trail&&!reduced){ctx.save();ctx.globalAlpha=trail.life/900;ctx.fillStyle='#c2fff2';for(const c of trail.cells)ctx.fillRect(c.x*36+5,c.y*36,26,(trail.distance+1)*36);ctx.restore();}
 if(impact&&!reduced){const t=1-impact.life/impact.total;ctx.save();ctx.globalAlpha=(1-t)*.55;ctx.strokeStyle='#b7fff0';ctx.lineWidth=2*(1-t)+.5;ctx.beginPath();ctx.ellipse(impact.x,Math.min(714,impact.y),20+90*t,3+13*t,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const p of fx){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life/350);if(p.spark&&!reduced){ctx.strokeStyle=p.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-p.size*2,0);ctx.lineTo(p.size*2,0);ctx.moveTo(0,-p.size*2);ctx.lineTo(0,p.size*2);ctx.stroke();}if(p.kind==='glass'&&window.GlassArt?.particle(ctx,p)){ctx.restore();continue;}ctx.fillStyle=p.color;if(p.kind==='sand')ctx.fillRect(0,0,1.6,1.6);else{ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size*.7,-p.size*.6);ctx.lineTo(p.size*.2,p.size);ctx.closePath();ctx.fill();}ctx.restore();}
 for(const f of floaters){const t=1-f.life/f.total;ctx.save();ctx.globalAlpha=Math.min(1,f.life/220);if(!reduced){ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.globalAlpha=(1-t)*.6;ctx.beginPath();ctx.ellipse(f.x,f.y,25+t*145,10+t*55,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6,near=10+t*100,far=near+22*(1-t)*f.power;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*near,f.y+Math.sin(a)*near*.6);ctx.lineTo(f.x+Math.cos(a)*far,f.y+Math.sin(a)*far*.6);ctx.stroke();}}ctx.globalAlpha=Math.min(1,f.life/220);ctx.font='600 21px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f1fff9';ctx.fillText('+'+f.gain.toLocaleString(),180,Math.max(30,f.y-12-t*35));ctx.restore();}
}
function fastDown(d,x,y,now){const dx=x-d.startX,dy=y-d.startY,age=Math.max(1,now-d.started);if(kind==='sand')return!d.noRelease&&d.axis==='y'&&!d.soft&&dy>45&&dy>Math.abs(dx)*1.5&&age<350&&dy/age>.4;return!d.noRelease&&d.axis==='y'&&d.vertical===1&&!d.soft&&dy>=Math.max(44,d.unit*1.5)&&age<=300&&dy/age>=.5&&dy>Math.abs(dx)*1.6&&d.peakX<=Math.max(20,dy*.55)&&d.peakDown-dy<d.unit*.6;}
function processSwipe(d,x,y,now){
 if(drag!==d||!playing())return;d.lastX=x;d.lastY=y;
 if(d.piece!==null&&d.piece!==pieceID()){clearInput();return;}
 const dx=x-d.startX,dy=y-d.startY,age=now-d.started;d.peakX=Math.max(d.peakX,Math.abs(dx));d.peakDown=Math.max(d.peakDown,dy);d.peakDistance=Math.max(d.peakDistance,Math.hypot(dx,dy));
 if(!d.axis&&kind==='sand'&&Math.max(Math.abs(dx),Math.abs(dy))>9){d.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';d.vertical=Math.sign(dy);}
 if(!d.axis&&kind==='normal'){if(Math.abs(dx)>=12&&Math.abs(dx)>Math.abs(dy)*1.25)d.axis='x';else if(Math.abs(dy)>=14&&Math.abs(dy)>Math.abs(dx)*1.4){d.axis='y';d.vertical=Math.sign(dy);}}
 if(d.axis==='x'){
  if(kind==='normal'){
   const offset=Math.max(-20,Math.min(20,(x-d.anchorX)/d.unit));if(d.shift===0&&Math.abs(x-d.anchorX)>=12)d.shift=Math.sign(x-d.anchorX);
   while(offset>d.shift+.65)d.shift++;while(offset<d.shift-.65)d.shift--;
   if(state==='clearing'){d.lane=Math.max(-2,Math.min(9,d.originX+d.shift));return;}
   if(!run.active)return;const before=run.active.x;if(!moveTo(d.originX+d.shift))rebase();if(run.active.x!==before)d.translated=true;
  }else if(canAct()){const before=run.active.x,target=d.originX+(x-d.anchorX)/canvas.getBoundingClientRect().width*M.W;run.moveTo(target);if(Math.abs(target-run.active.x)>2)rebase();if(before!==run.active.x)d.translated=true;}
  if(run.active)d.lane=run.active.x;
 }else if(d.axis==='y'&&d.vertical===1&&dy>0&&canAct()){
  if(age>300||(kind==='normal'&&age>=120&&dy>=24&&dy/age<.28))d.soft=true;
  if(d.soft){const unit=kind==='normal'?d.rowUnit:canvas.getBoundingClientRect().height/M.H;let n=Math.min(kind==='normal'?20:80,Math.floor((y-d.downAnchor)/unit));
   while(n-->0){d.downAnchor+=unit;const id=pieceID();if(kind==='sand')run.softDrop(1);else if(!action('down')){d.downAnchor=y;break;}if(id!==pieceID()){clearInput();break;}}
  }
 }
}
canvas.addEventListener('pointerdown',e=>{
 if(!canAct()||drag||e.button!==0)return;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);repeat=null;initAudio();const r=canvas.getBoundingClientRect();
 drag={id:e.pointerId,piece:pieceID(),startX:e.clientX,startY:e.clientY,anchorX:e.clientX,lastX:e.clientX,lastY:e.clientY,started:performance.now(),originX:run.active.x,lane:run.active.x,shift:0,axis:null,peakDistance:0,soft:false,translated:false,noRelease:false,peakX:0,peakDown:0,downAnchor:e.clientY,unit:Math.max(16,Math.min(34,r.width/10)),rowUnit:Math.max(12,r.height/20)};
});
canvas.addEventListener('pointermove',e=>{const d=drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();processSwipe(d,e.clientX,e.clientY,performance.now());});
canvas.addEventListener('pointerup',e=>{
 const d=drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();const now=performance.now();processSwipe(d,e.clientX,e.clientY,now);if(drag!==d)return;drag=null;
 if(!canAct()||d.piece!==pieceID()||d.noRelease)return;
 if(kind==='normal'&&!d.axis&&d.peakDistance<=10&&now-d.started<=300)action('rotate');
 else if(fastDown(d,e.clientX,e.clientY,now))action('drop');
 else if(kind==='normal'&&d.axis==='x'&&!d.translated&&Math.abs(e.clientX-d.startX)>=12)action(e.clientX>d.startX?'right':'left');
 else if(kind==='normal'&&d.axis==='y'&&d.vertical===1&&!d.soft&&e.clientY-d.startY>=Math.max(18,d.unit*.6)){let n=Math.min(20,Math.max(1,Math.floor((e.clientY-d.startY)/d.rowUnit)));const id=pieceID();while(n-->0&&canAct()&&pieceID()===id)action('down');}
});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(drag?.id===e.pointerId)clearInput();});
for(const b of document.querySelectorAll('[data-action]')){
 b.addEventListener('pointerdown',e=>{if(e.button!==0||b.disabled)return;e.preventDefault();b.setPointerCapture?.(e.pointerId);action(b.dataset.action);b.classList.add('pressed');});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>b.classList.remove('pressed'));
 b.addEventListener('click',e=>{if(e.detail===0&&!b.disabled)action(b.dataset.action);});
}
for(const b of document.querySelectorAll('[data-preview]'))b.addEventListener('click',()=>{
 if(!run||!playing())return;const p=run.queue[Number(b.dataset.preview)];previewReturn='playing';beforePause=state;state='paused';clearInput();rememberScore();
 showPanel('<div class="kicker">NEXT</div><h2>'+ (b.dataset.preview==='0'?'다음 블록':'두 번째 다음 블록')+'</h2><canvas class="preview-large" id="preview-large" width="240" height="240"></canvas><button class="primary" data-menu="back">계속하기</button>','preview');const g=$('preview-large').getContext('2d');(kind==='normal'?normalPreview:sandPreview)(g,p,240,240);hud();
});
$('pause').addEventListener('click',pause);
const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',x:'rotate',X:'rotate',' ':'drop',c:'hold',C:'hold'};
document.addEventListener('keydown',e=>{
 if(['Escape','p','P'].includes(e.key)){if(e.repeat)return;e.preventDefault();if(state==='paused')resume();else pause();return;}
 if(e.target.closest?.('input,select,textarea,[contenteditable]')||e.key===' '&&e.target.closest?.('button,a'))return;
 const a=keys[e.key];if(!a||!canAct())return;e.preventDefault();if(e.repeat||heldKeys.has(e.key))return;heldKeys.add(e.key);action(a);if(['left','right','down'].includes(a))repeat={id:e.key,action:a,time:200};
});
document.addEventListener('keyup',e=>{heldKeys.delete(e.key);if(repeat?.id===e.key)repeat=null;});
window.addEventListener('blur',()=>{if(playing())pause();else clearInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing())pause();});
window.addEventListener('pagehide',()=>{rememberScore();clearInput();});
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
window.addEventListener('glassartready',()=>{if(overlayView==='menu')window.GlassArt?.menu(panel);hud();draw();});
function frame(now){const dt=last?now-last:0;last=now;update(dt);draw();if(now-lastHUD>=120){hud();lastHUD=now;}requestAnimationFrame(frame);}
if(new URLSearchParams(location.search).get('qa')==='1')window.__GLASSFALL_QA__={get run(){return run;},get state(){return state;},get kind(){return kind;},get drag(){return drag;},action,update,start,menu,pause,resume,finish,draw,hud,setKind(k){kind=k;menu();},lock(){lockNormal(!!drag);}};
menu();fit();$('boot').hidden=true;if(new URLSearchParams(location.search).get('play')==='1')start();requestAnimationFrame(frame);
})();
