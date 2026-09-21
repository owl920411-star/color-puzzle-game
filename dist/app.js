(() => {
'use strict';
const E=window.GlassEngine,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const colors={I:['#83eee3','#318b99'],O:['#f7d790','#b9844e'],T:['#ceb0fb','#7550b3'],S:['#a9e9ba','#478c70'],Z:['#f5a3b1','#a74769'],J:['#a0c4fa','#4d71b1'],L:['#f4b798','#ab6349']};
const storageKey='glassfall-v1';let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{saved={};}if(!saved||typeof saved!=='object')saved={};saved.best=saved.best&&typeof saved.best==='object'?saved.best:{};saved.badges=saved.badges&&typeof saved.badges==='object'?saved.badges:{};
let storageWorks=true;function save(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{storageWorks=false;}}
let mode='sprint',state='menu',game=new E.Game('preview'),remaining=180000,elapsed=0,fallTime=0,lockTime=0,lockResets=0,last=0,chain=0,phase=null,phaseTime=0,plan=null,falls=[],particles=[],dropTrail=null,calloutTime=0,pausedFrom='playing',resumeAfterHelp=false,gameResultSaved=false,endingReason='';
let repeat=null,drag=null,placementGesture=null,keyHeld=new Set(),soundOn=!!saved.sound,audio=null,renderRatio=1;
const modes={sprint:'3분 도전',daily:'오늘의 도전',endless:'무한 모드',tutorial:'균열 연습'};
const screen=$('screen'),content=screen.querySelector('.screen-content');
function bestKey(){return mode==='daily'?'daily-'+(state!=='menu'&&game.seed.startsWith('DAILY-')?game.seed.slice(6):day()):mode;}
function best(){return Number(saved.best[bestKey()])||0;}
function day(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function newSeed(){const v=new Uint32Array(1);if(window.crypto?.getRandomValues)crypto.getRandomValues(v);else v[0]=Math.random()*4294967295;return v[0].toString(36).toUpperCase();}
function setStatus(text){$('status').textContent=text;}
function resetInput(){repeat=null;drag=null;if(placementGesture)placementGesture.cancelled=true;keyHeld.clear();$('touchpad').classList.remove('engaged');$('pad-hint').textContent='원하는 위치를 누르거나 밀어보세요';for(const b of document.querySelectorAll('[data-action]'))b.classList.remove('pressed');}
function horizontalBounds(){
 const p=game.active;if(!p)return{min:0,max:7};
 return{min:-Math.min(...p.cells.map(c=>c.x)),max:9-Math.max(...p.cells.map(c=>c.x))};
}
function syncPosition(){
 const range=$('position'),p=game.active,bounds=horizontalBounds();
 range.min=String(bounds.min);range.max=String(bounds.max);range.disabled=state!=='playing'||!p;
 if(p){range.value=String(p.x);const column=p.x+Math.min(...p.cells.map(c=>c.x))+1;$('position-label').textContent=column+'열';range.setAttribute('aria-valuetext','왼쪽에서 '+column+'번째 열');}
 else $('position-label').textContent='가로 위치 선택';
}
function moveToColumn(target){
 if(state!=='playing'||!game.active)return false;
 const wanted=Math.round(target);let steps=0;
 while(game.active.x!==wanted&&steps++<10){if(!action(wanted>game.active.x?'right':'left'))break;}
 const reached=game.active.x===wanted;syncPosition();return reached;
}
function rebaseBoardDrag(){
 if(!drag||!game.active)return;
 drag.originX=game.active.x;drag.anchorX=drag.lastX;drag.shift=0;
}
function audioInit(){if(!soundOn)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function tone(kind,n=1){if(!soundOn)return;audioInit();if(!audio)return;const start=audio.currentTime;const base=kind==='clear'?660:kind==='drop'?165:kind==='rotate'?350:220;const voices=kind==='clear'?3:1;for(let i=0;i<voices;i++){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(base*(1+i*.5)*Math.min(1.7,1+(n-1)*.12),start+i*.035);osc.frequency.exponentialRampToValueAtTime(base*(kind==='drop'?.6:1.03)*(1+i*.5),start+.18);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(kind==='clear'?.045:.025,start+i*.035+.008);gain.gain.exponentialRampToValueAtTime(.001,start+.32);osc.connect(gain);gain.connect(audio.destination);osc.start(start+i*.035);osc.stop(start+.35);}}
function updateSound(){$('sound').setAttribute('aria-label',soundOn?'소리 끄기':'소리 켜기');$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').style.color=soundOn?'#a6efe5':'#718a9a';}
function badgeUI(){const badges=[['fracture','첫 번째 공명','균열 유리 1개 이상 파쇄'],['cascade','연쇄 설계자','한 번에 2연쇄 완성'],['glass100','빛의 수집가','한 판에서 유리 100개 제거']];$('milestones').innerHTML=badges.map(([id,name,desc])=>`<div class="milestone ${saved.badges[id]?'unlocked':''}"><span aria-hidden="true">${saved.badges[id]?'✧':'◇'}</span><div><strong>${name}${saved.badges[id]?' · 달성':''}</strong><p>${desc}</p></div></div>`).join('');}
function updateHUD(){const n=Math.max(0,Math.ceil((mode==='endless'||mode==='tutorial'?elapsed:remaining)/1000));$('score').textContent=game.score.toLocaleString();$('time').textContent=mode==='tutorial'?'연습':`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;$('time').classList.toggle('urgent',remaining<20000&&mode!=='endless'&&mode!=='tutorial');$('time-label').textContent=mode==='endless'?'플레이 시간':mode==='tutorial'?'시간 제한 없음':'남은 시간';$('level').textContent=String(game.level).padStart(2,'0');$('chain').textContent=game.maxChain?game.maxChain+'×':'—';$('lines').textContent=game.lines;$('extra').textContent=game.extra;$('mode-label').textContent=modes[mode];$('seed-label').textContent=mode==='tutorial'?'LEARN':state==='menu'?'READY':game.seed.slice(-9);$('side-best').textContent=best().toLocaleString();$('side-best-label').textContent=modes[mode];$('best-mini').textContent='BEST '+best().toLocaleString();$('hold').disabled=state!=='playing'||game.holdUsed||mode==='tutorial';syncPosition();$('pause').disabled=['menu','end'].includes(state);$('pause').setAttribute('aria-label',state==='paused'?'계속하기':'일시정지');for(const b of document.querySelectorAll('.controls button'))b.disabled=state!=='playing';}
function menu(){resetInput();state='menu';mode=mode==='tutorial'?'sprint':mode;game=new E.Game('preview');game.active=null;remaining=180000;elapsed=0;particles=[];phase=null;plan=null;falls=[];for(let x=0;x<10;x++)for(let j=0;j<(x<4?4-x:1+(x%3));j++)game.board[19-j][x]={type:Object.keys(colors)[(x+j)%7],mask:[3,5,10,12][(x+j)%4],id:100+x*5+j};showMenu();updateHUD();renderPreviews();setStatus('한 줄을 완성하면, 이어진 균열이 함께 깨집니다.');}
function showMenu(){screen.hidden=false;screen.className='screen';content.innerHTML=`<div class="screen-kicker">THE ART OF BREAKING</div><h2>GLASSFALL<span class="glass-word">유리의 공명</span></h2><p>유리를 쌓고 균열을 이어<br>나만의 연쇄를 완성하세요.</p><div class="menu-tabs" role="group" aria-label="게임 모드">${['sprint','endless','daily'].map(m=>`<button data-mode="${m}" class="${mode===m?'selected':''}" aria-pressed="${mode===m}">${m==='sprint'?'3분':m==='endless'?'무한':'오늘'}</button>`).join('')}</div><button class="primary" data-screen="start">${modes[mode]} 시작</button><button class="secondary" data-screen="tutorial">균열 배워보기</button><div class="menu-best">${mode==='daily'?day()+' · 같은 조각으로 도전':'최고 기록 '+best().toLocaleString()}</div>`;}
function start(selected=mode,seed){resetInput();mode=selected;game=selected==='tutorial'?E.tutorial():new E.Game(seed||(selected==='daily'?'DAILY-'+day():newSeed()),selected);state='playing';remaining=180000;elapsed=0;fallTime=0;lockTime=0;lockResets=0;chain=0;phase=null;plan=null;falls=[];particles=[];dropTrail=null;calloutTime=0;gameResultSaved=false;endingReason='';last=performance.now();screen.hidden=true;$('callout').classList.remove('show');audioInit();setStatus(selected==='tutorial'?'오른쪽에 맞춰져 있어요. 「즉시 낙하」로 한 줄을 채워보세요.':'흰 균열의 끝을 맞춰보세요. 색이 달라도 이어집니다.');updateHUD();renderPreviews();}
function pause(){if(state!=='playing'&&state!=='resolving')return;pausedFrom=state;state='paused';resetInput();screen.hidden=false;screen.className='screen small';content.innerHTML='<div class="screen-kicker">TAKE A BREATH</div><h2>잠시 쉬어가세요.</h2><p>유리도, 시간도 멈춰 있어요.</p><button class="primary" data-screen="resume">계속하기</button><button class="secondary" data-screen="retry">같은 판 다시 시작</button><button class="text-btn" data-screen="menu">모드 선택으로</button>';updateHUD();}
function resume(){if(state!=='paused')return;state=pausedFrom;screen.hidden=true;last=performance.now();resetInput();updateHUD();}
function finish(reason){if(state==='end')return;state='end';endingReason=reason;resetInput();game.active=null;phase=null;screen.hidden=false;screen.className='screen small';if(mode==='tutorial'){saved.learned=true;save();content.innerHTML='<div class="screen-kicker">FIRST RESONANCE</div><h2>균열이 이어졌어요.</h2><p>완성한 줄에서 충격이 퍼져<br>연결된 유리까지 함께 깨집니다.<br>다음에는 직접 길을 만들어보세요.</p><button class="primary" data-screen="start-sprint">3분 도전 시작</button><button class="secondary" data-screen="tutorial">한 번 더 연습</button>';setStatus('균열이 닿지 않은 조각은 남고, 아래로 내려옵니다.');}
 else{const prev=best();if(!gameResultSaved){saved.best[bestKey()]=Math.max(prev,game.score);if(game.extra>0)saved.badges.fracture=true;if(game.maxChain>=2)saved.badges.cascade=true;if(game.shards>=100)saved.badges.glass100=true;saved.plays=(Number(saved.plays)||0)+1;save();gameResultSaved=true;}content.innerHTML=`<div class="screen-kicker">${game.score>prev?'NEW PERSONAL BEST':'YOUR RESONANCE'}</div><h2>${reason==='time'?'빛나는 3분.':'다음 균열을 향해.'}</h2><div class="result-score">${game.score.toLocaleString()}</div><div class="result-stats"><span><b>${game.lines}</b> 줄</span><span><b>${game.maxChain}</b> 연쇄</span><span><b>${game.extra}</b> 균열</span></div><p>${reason==='time'?'시간이 끝났어요. 같은 조각으로<br>더 큰 연쇄를 만들어볼까요?':'유리가 입구까지 차올랐어요.<br>다른 배치로 다시 도전해보세요.'}</p><button class="primary" data-screen="retry">같은 판 다시 도전</button><button class="secondary" data-screen="new">${mode==='daily'?'오늘의 도전 다시':'새로운 판 시작'}</button><button class="text-btn" data-screen="menu">모드 선택으로</button>`;setStatus(storageWorks?'같은 판에서는 조각과 균열이 같은 순서로 나옵니다.':'브라우저에서 기록 저장이 제한되어 있습니다.');}
 badgeUI();updateHUD();renderPreviews();}
function emit(cells){for(const c of cells){const n=reduced?1:5;for(let i=0;i<n&&particles.length<220;i++)particles.push({x:(c.x+.5)*36,y:(c.y+.5)*36,vx:(Math.random()-.5)*180,vy:-30-Math.random()*150,life:450+Math.random()*450,total:900,size:2+Math.random()*6,angle:Math.random()*6.28,color:colors[c.cell.type][0]});}}
function callout(title,sub){$('callout').innerHTML=`<strong>${title}</strong><span>${sub}</span>`;$('callout').classList.add('show');calloutTime=950;}
function beginClear(p){plan=p;chain++;phase='crack';phaseTime=0;state='resolving';resetInput();tone('clear',chain);if(chain>1)callout(chain+' CHAIN','연쇄 배수 ×'+chain);else if(p.extra>0)callout('RESONANCE','균열 +'+p.extra);setStatus(`${p.rows.length}줄 완성${p.extra?' · 이어진 유리 '+p.extra+'개 파쇄':''}${chain>1?' · '+chain+'연쇄':''}`);updateHUD();}
function afterPiece(){if(mode==='tutorial'&&game.lines>0){finish('tutorial');return;}if((mode==='sprint'||mode==='daily')&&remaining<=0){finish('time');return;}if(!game.spawn()){finish('top');return;}state='playing';chain=0;lockTime=0;lockResets=0;fallTime=0;phase=null;plan=null;falls=[];resetInput();renderPreviews();updateHUD();}
function lock(){if(!game.active)return;game.lock();resetInput();chain=0;const p=E.clearPlan(game.board);if(p)beginClear(p);else afterPiece();}
function action(a){if(state!=='playing'||!game.active)return false;audioInit();let moved=false;const grounded=!game.fits(game.active,0,1);if(a==='left'||a==='right')moved=game.move(a==='left'?-1:1);else if(a==='rotate'){moved=game.rotate();if(moved){tone('rotate');rebaseBoardDrag();}}else if(a==='down'){moved=game.move(0,1);if(moved){game.score++;fallTime=0;}}else if(a==='drop'){const d=game.dropDistance();dropTrail={cells:game.active.cells.map(c=>({...c,x:c.x+game.active.x,y:c.y+game.active.y})),distance:d,life:170};game.move(0,d);game.score+=d*2;tone('drop');lock();updateHUD();return true;}else if(a==='hold'&&mode!=='tutorial'){moved=game.hold();if(game.over){finish('top');return false;}if(moved){resetInput();lockTime=0;lockResets=0;fallTime=0;renderPreviews();}}
 if(moved&&grounded&&lockResets<12&&(a==='left'||a==='right'||a==='rotate')){lockTime=0;lockResets++;}if(a==='left'||a==='right'||a==='rotate')syncPosition();else updateHUD();return moved;}
function update(rawDt){const dt=Math.min(100,rawDt);if(state==='playing'||state==='resolving'){elapsed+=rawDt;if(mode==='sprint'||mode==='daily')remaining=Math.max(0,remaining-rawDt);if(state==='playing'&&remaining<=0&&mode!=='endless'&&mode!=='tutorial'){finish('time');return;}if(repeat&&state==='playing'){repeat.time-=dt;let count=0;while(repeat&&repeat.time<=0&&count++<4){const r=repeat;action(r.action);if(repeat===r)r.time+=70;}}if(state==='playing'&&mode!=='tutorial'){if(game.active&&!game.fits(game.active,0,1)){fallTime=0;lockTime+=dt;if(lockTime>=650)lock();}else{fallTime+=dt;lockTime=0;while(state==='playing'&&fallTime>=game.gravity){fallTime-=game.gravity;game.move(0,1);}}}
 if(state==='resolving'){phaseTime+=dt;if(phase==='crack'&&phaseTime>=(reduced?90:260+Math.min(180,Math.max(...plan.cells.map(c=>c.depth))*24))){emit(plan.cells);const result=game.resolve(plan,chain);falls=result.falls;plan=null;phase='fall';phaseTime=0;updateHUD();}else if(phase==='fall'&&phaseTime>=(reduced?60:240)){falls=[];const p=E.clearPlan(game.board);if(p)beginClear(p);else afterPiece();}}}
 if(state!=='paused'){for(const p of particles){p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=350*dt/1000;p.angle+=dt*.002;}particles=particles.filter(p=>p.life>0);if(dropTrail){dropTrail.life-=dt;if(dropTrail.life<=0)dropTrail=null;}if(calloutTime>0){calloutTime-=dt;if(calloutTime<=0)$('callout').classList.remove('show');}}
}
function glass(c,x,y,size=36,options={}){const g=options.context||ctx,[light,dark]=colors[c.type]||colors.I;g.save();if(options.alpha!==undefined)g.globalAlpha=options.alpha;const m=Math.max(1.4,size*.055),r=Math.max(2,size*.08),px=x+m,py=y+m,s=size-m*2;
 if(options.ghost){g.fillStyle=light+'20';g.fillRect(px,py,s,s);g.strokeStyle=light;g.globalAlpha=.75;g.lineWidth=1.5;g.strokeRect(px+.5,py+.5,s-1,s-1);g.restore();return;}
 const fill=g.createLinearGradient(px,py,px+s,py+s);fill.addColorStop(0,light+'a8');fill.addColorStop(.35,dark+'ba');fill.addColorStop(1,dark+'58');g.fillStyle=fill;g.beginPath();g.roundRect(px,py,s,s,r);g.fill();g.strokeStyle=light+'a0';g.lineWidth=.8;g.stroke();g.beginPath();g.moveTo(px+3,py+s-3);g.lineTo(px+3,py+3);g.lineTo(px+s-3,py+3);g.strokeStyle='#ffffff80';g.stroke();g.beginPath();g.moveTo(px+2,py+s*.53);g.lineTo(px+s*.55,py+2);g.lineTo(px+s*.78,py+2);g.lineTo(px+2,py+s*.78);g.closePath();g.fillStyle='#ffffff0e';g.fill();
 if(c.mask){const cx=x+size*.5,cy=y+size*.5;g.beginPath();for(const[dx,dy,bit]of E.DIRS)if(c.mask&bit){g.moveTo(cx,cy);g.lineTo(cx+dx*size*.2+dy*size*.07,cy+dy*size*.2-dx*size*.07);g.lineTo(cx+dx*size*.5,cy+dy*size*.5);}g.strokeStyle='#102332';g.lineWidth=2.5;g.stroke();g.strokeStyle=options.hot?'#ffffff':'#e8ffffe0';g.lineWidth=1.2;g.stroke();g.fillStyle='#eaffff';g.beginPath();g.arc(cx,cy,size*.025,0,Math.PI*2);g.fill();}
 if(options.hot){g.fillStyle='#dbfff588';g.fillRect(px,py,s,s);g.strokeStyle='#ffffff';g.lineWidth=1.5;g.strokeRect(px,py,s,s);}g.restore();}
function resize(){renderRatio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(360*renderRatio);canvas.height=Math.round(720*renderRatio);ctx.setTransform(renderRatio,0,0,renderRatio,0,0);}
function render(){ctx.clearRect(0,0,360,720);const bg=ctx.createLinearGradient(0,0,360,720);bg.addColorStop(0,'#0e1e2d');bg.addColorStop(1,'#10232b');ctx.fillStyle=bg;ctx.fillRect(0,0,360,720);ctx.strokeStyle='#8fbed109';ctx.lineWidth=1;ctx.beginPath();for(let x=1;x<10;x++){ctx.moveTo(x*36,0);ctx.lineTo(x*36,720);}for(let y=1;y<20;y++){ctx.moveTo(0,y*36);ctx.lineTo(360,y*36);}ctx.stroke();ctx.fillStyle='#a8d7e91a';for(let x=1;x<10;x++)for(let y=1;y<20;y++)ctx.fillRect(x*36-.7,y*36-.7,1.4,1.4);
 const clearMap=new Map(plan?plan.cells.map(c=>[c.y*10+c.x,c.depth]):[]),fallMap=new Map(falls.map(f=>[f.cell.id,f]));
 for(let y=0;y<20;y++)for(let x=0;x<10;x++){const c=game.board[y][x];if(!c)continue;let yy=y;const f=fallMap.get(c.id);if(f&&phase==='fall'){const t=Math.min(1,phaseTime/(reduced?60:240));yy=f.from+(f.to-f.from)*(1-Math.pow(1-t,3));}const hot=clearMap.has(y*10+x)&&phaseTime>clearMap.get(y*10+x)*24;glass(c,x*36,yy*36,36,{hot});}
 if(game.active&&['playing','paused'].includes(state)){const p=game.active,dy=game.dropDistance();for(const c of p.cells)glass(c,(p.x+c.x)*36,(p.y+c.y+dy)*36,36,{ghost:true});for(const c of p.cells)glass(c,(p.x+c.x)*36,(p.y+c.y)*36,36);}
 if(dropTrail&&!reduced){ctx.save();ctx.globalAlpha=dropTrail.life/900;ctx.fillStyle='#c2fff2';for(const c of dropTrail.cells)ctx.fillRect(c.x*36+5,c.y*36,26,(dropTrail.distance+1)*36);ctx.restore();}
 for(const p of particles){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life/400);ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size*.7,-p.size*.6);ctx.lineTo(p.size*.2,p.size);ctx.closePath();ctx.fill();ctx.restore();}
 if(game.board.slice(0,4).some(row=>row.some(Boolean))&&state!=='menu'){ctx.fillStyle='#ff677811';ctx.fillRect(0,0,360,144);ctx.strokeStyle='#ff9ca360';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(0,144);ctx.lineTo(360,144);ctx.stroke();ctx.setLineDash([]);}}
function previewPiece(g,p,y){if(!p)return;const minX=Math.min(...p.cells.map(c=>c.x)),maxX=Math.max(...p.cells.map(c=>c.x)),minY=Math.min(...p.cells.map(c=>c.y));const size=19,x=(96-(maxX-minX+1)*size)/2;for(const c of p.cells)glass(c,x+(c.x-minX)*size,y+(c.y-minY)*size,size,{context:g});}
function renderPreviews(){const n=$('next').getContext('2d'),h=$('held').getContext('2d');n.clearRect(0,0,96,224);h.clearRect(0,0,96,76);game.queue.slice(0,3).forEach((p,i)=>previewPiece(n,p,16+i*70));previewPiece(h,game.held,15);}
let lastHud=0;function frame(now){const dt=last?Math.max(0,now-last):0;last=now;update(dt);render();if(now-lastHud>200){updateHUD();lastHud=now;}requestAnimationFrame(frame);}
content.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.mode){mode=b.dataset.mode;showMenu();updateHUD();return;}const a=b.dataset.screen;if(a==='start')start();if(a==='start-sprint')start('sprint');if(a==='tutorial')start('tutorial');if(a==='retry')start(mode,game.seed);if(a==='new')start(mode);if(a==='resume')resume();if(a==='menu')menu();});
// Buttons respond immediately; a held direction uses one repeat owner.
for(const b of document.querySelectorAll('[data-action]')){
 b.addEventListener('pointerdown',e=>{
  if(e.button!==0||b.disabled)return;
  e.preventDefault();b.setPointerCapture?.(e.pointerId);
  const a=b.dataset.action;
  if(['left','right'].includes(a)){drag=null;$('touchpad').classList.remove('engaged');}
  action(a);b.classList.add('pressed');
  if(['left','right'].includes(a)&&state==='playing')repeat={id:e.pointerId,action:a,time:200};
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>{
  b.classList.remove('pressed');if(repeat?.id===e.pointerId)repeat=null;
 });
 b.addEventListener('click',e=>{if(e.detail===0)action(b.dataset.action);});
}
// The native range selects a column; vertical thumb wobble cannot become a command.
const position=$('position');
position.addEventListener('pointerdown',e=>{
 if(state!=='playing'||!game.active)return;
 if(e.button!==0||e.isPrimary===false){e.preventDefault();return;}
 if(placementGesture?.cancelled)placementGesture=null;
 if(placementGesture){e.preventDefault();return;}
 repeat=null;drag=null;
 placementGesture={id:e.pointerId,pieceId:game.active.cells[0].id,cancelled:false};
 position.setPointerCapture?.(e.pointerId);$('touchpad').classList.add('engaged');
});
position.addEventListener('input',()=>{
 if(state!=='playing'||!game.active||placementGesture&&(placementGesture.cancelled||placementGesture.pieceId!==game.active.cells[0].id)){syncPosition();return;}
 const target=Number(position.value),bounds=horizontalBounds();
 if(!Number.isFinite(target)){syncPosition();return;}
 const reached=moveToColumn(Math.max(bounds.min,Math.min(bounds.max,target)));
 $('pad-hint').textContent=reached?'회전한 뒤 위치를 다시 맞출 수도 있어요':'다른 유리에 막혀 있어요';
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])position.addEventListener(name,e=>{
 if(placementGesture?.id!==e.pointerId)return;
 placementGesture=null;$('touchpad').classList.remove('engaged');$('pad-hint').textContent='원하는 위치를 누르거나 밀어보세요';
});
// Board dragging follows total finger displacement, with a small hysteresis band.
// Returning to the starting point returns to the starting column; taps never rotate.
canvas.addEventListener('pointerdown',e=>{
 if(state!=='playing'||!game.active||drag||placementGesture||e.button!==0)return;
 e.preventDefault();canvas.setPointerCapture?.(e.pointerId);repeat=null;
 drag={id:e.pointerId,pieceId:game.active.cells[0].id,startX:e.clientX,startY:e.clientY,anchorX:e.clientX,lastX:e.clientX,lastY:e.clientY,originX:game.active.x,shift:0,axis:null,downAnchor:e.clientY,unit:Math.max(14,canvas.getBoundingClientRect().width/10)};
});
canvas.addEventListener('pointermove',e=>{
 const d=drag;if(!d||d.id!==e.pointerId||state!=='playing'||game.active?.cells[0].id!==d.pieceId)return;
 e.preventDefault();d.lastX=e.clientX;d.lastY=e.clientY;
 const dx=e.clientX-d.startX,dy=e.clientY-d.startY;
 // A tiny initial vertical wobble must not lock out a later horizontal drag.
 if(d.axis!=='x'&&Math.abs(dx)>=d.unit*.55&&Math.abs(dx)>Math.abs(dy)*.8)d.axis='x';
 else if(!d.axis&&dy>=d.unit&&dy>Math.abs(dx)*2)d.axis='y';
 if(d.axis==='x'){
  const offset=(e.clientX-d.anchorX)/d.unit;
  while(offset>d.shift+.6)d.shift++;
  while(offset<d.shift-.6)d.shift--;
  if(!moveToColumn(d.originX+d.shift))rebaseBoardDrag();
 }else if(d.axis==='y'){
  let steps=Math.min(20,Math.floor((e.clientY-d.downAnchor)/d.unit));
  while(steps-->0){d.downAnchor+=d.unit;if(!action('down')){d.downAnchor=e.clientY;break;}}
 }
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(drag?.id===e.pointerId)drag=null;});
const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',x:'rotate',X:'rotate',' ':'drop',c:'hold',C:'hold'};document.addEventListener('keydown',e=>{if($('help-dialog').open)return;if(e.key==='Escape'||e.key==='p'||e.key==='P'){if(e.repeat)return;e.preventDefault();if(state==='paused')resume();else pause();return;}if(e.target.closest?.('input,select,textarea,[contenteditable]')||e.key===' '&&e.target.closest?.('button,a'))return;const a=keys[e.key];if(!a||state!=='playing')return;e.preventDefault();if(e.repeat||keyHeld.has(e.key))return;keyHeld.add(e.key);action(a);if(['left','right','down'].includes(a)&&state==='playing')repeat={id:e.key,action:a,time:200};});document.addEventListener('keyup',e=>{keyHeld.delete(e.key);if(repeat?.id===e.key)repeat=null;});
$('pause').addEventListener('click',()=>state==='paused'?resume():pause());$('sound').addEventListener('click',()=>{soundOn=!soundOn;saved.sound=soundOn;save();updateSound();audioInit();if(soundOn)tone('rotate');});
$('help').addEventListener('click',()=>{resumeAfterHelp=state==='playing'||state==='resolving';if(resumeAfterHelp)pause();$('learn').textContent=resumeAfterHelp?'균열 연습 시작 · 현재 판 종료':'직접 균열 배워보기';$('help-dialog').showModal();});function closeHelp(){$('help-dialog').close();} $('close-help').addEventListener('click',closeHelp);$('resume-help').addEventListener('click',closeHelp);$('help-dialog').addEventListener('close',()=>{if(resumeAfterHelp){resumeAfterHelp=false;resume();}});$('learn').addEventListener('click',()=>{resumeAfterHelp=false;closeHelp();start('tutorial');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();pause();}});window.addEventListener('blur',()=>{resetInput();pause();});window.addEventListener('resize',resize);
// Old game caches must not serve the replaced entrypoint.
if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
resize();updateSound();badgeUI();menu();requestAnimationFrame(frame);
})();
