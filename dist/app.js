(() => {
'use strict';
const E=window.GlassEngine,L=window.GlassLab,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const colors={I:['#83eee3','#318b99'],O:['#f7d790','#b9844e'],T:['#ceb0fb','#7550b3'],S:['#a9e9ba','#478c70'],Z:['#f5a3b1','#a74769'],J:['#a0c4fa','#4d71b1'],L:['#f4b798','#ab6349']};
const storageKey='glassfall-v1';let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{saved={};}if(!saved||typeof saved!=='object')saved={};saved.best=saved.best&&typeof saved.best==='object'?saved.best:{};saved.badges=saved.badges&&typeof saved.badges==='object'?saved.badges:{};
saved.lab=saved.lab&&typeof saved.lab==='object'&&!Array.isArray(saved.lab)?saved.lab:{};saved.records=saved.records&&typeof saved.records==='object'?saved.records:{};
let labIndex=0;
let storageWorks=true;function save(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{storageWorks=false;}}
let mode='sprint',state='menu',game=new E.Game('preview'),remaining=180000,elapsed=0,fallTime=0,lockTime=0,lockResets=0,last=0,chain=0,phase=null,phaseTime=0,plan=null,falls=[],particles=[],dropTrail=null,calloutTime=0,pausedFrom='playing',resumeAfterHelp=false,gameResultSaved=false,endingReason='';
let repeat=null,drag=null,gestureFeedbackTime=0,keyHeld=new Set(),soundOn=!!saved.sound,audio=null,renderRatio=1;
const modes={sprint:'3분 도전',daily:'오늘의 도전',endless:'무한 모드',tutorial:'균열 연습',lab:'균열 연구실'};
const screen=$('screen'),content=screen.querySelector('.screen-content');
function bestKey(){return mode==='daily'?'daily-'+(state!=='menu'&&game.seed.startsWith('DAILY-')?game.seed.slice(6):day()):mode;}
function best(){return Number(saved.best[bestKey()])||0;}
function day(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function newSeed(){const v=new Uint32Array(1);if(window.crypto?.getRandomValues)crypto.getRandomValues(v);else v[0]=Math.random()*4294967295;return v[0].toString(36).toUpperCase();}
function setStatus(text){$('status').textContent=text;}
function gestureFeedback(message,ready=false){
 $('pad-hint').textContent=message;$('touchpad').classList.toggle('drop-ready',ready);gestureFeedbackTime=700;
}
function resetInput(){
 repeat=null;drag=null;keyHeld.clear();gestureFeedbackTime=0;
 $('touchpad').classList.remove('engaged','drop-ready');$('pad-hint').textContent='게임판에서도 똑같이 조작하세요';
 for(const b of document.querySelectorAll('[data-action]'))b.classList.remove('pressed');
}
function moveToColumn(target){
 if(state!=='playing'||!game.active)return false;
 const wanted=Math.round(target);let steps=0;
 while(game.active.x!==wanted&&steps++<10){if(!action(wanted>game.active.x?'right':'left'))break;}
 return game.active.x===wanted;
}
function rebaseBoardDrag(){
 if(!drag||!game.active)return;
 drag.originX=game.active.x;drag.anchorX=drag.lastX;drag.shift=0;
}
function audioInit(){if(!soundOn)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function tone(kind,n=1){if(!soundOn)return;audioInit();if(!audio)return;const start=audio.currentTime;const base=kind==='clear'?660:kind==='drop'?165:kind==='rotate'?350:220;const voices=kind==='clear'?3:1;for(let i=0;i<voices;i++){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(base*(1+i*.5)*Math.min(1.7,1+(n-1)*.12),start+i*.035);osc.frequency.exponentialRampToValueAtTime(base*(kind==='drop'?.6:1.03)*(1+i*.5),start+.18);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(kind==='clear'?.045:.025,start+i*.035+.008);gain.gain.exponentialRampToValueAtTime(.001,start+.32);osc.connect(gain);gain.connect(audio.destination);osc.start(start+i*.035);osc.stop(start+.35);}}
function updateSound(){$('sound').setAttribute('aria-label',soundOn?'소리 끄기':'소리 켜기');$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').style.color=soundOn?'#a6efe5':'#718a9a';}
function badgeUI(){const badges=[['fracture','첫 번째 공명','균열 유리 1개 이상 파쇄'],['cascade','연쇄 설계자','한 번에 2연쇄 완성'],['glass100','빛의 수집가','한 판에서 유리 100개 제거']];$('milestones').innerHTML=badges.map(([id,name,desc])=>`<div class="milestone ${saved.badges[id]?'unlocked':''}"><span aria-hidden="true">${saved.badges[id]?'✧':'◇'}</span><div><strong>${name}${saved.badges[id]?' · 달성':''}</strong><p>${desc}</p></div></div>`).join('');}
function labStage(){return L.stages[labIndex];}
function labGoalText(stage){return L.objectives(stage,{lines:0,extra:0,maxChain:0}).map(o=>o.key==='chain'?`${o.target}연쇄 만들기`:o.key==='extra'?`균열 유리 ${o.target}개 파쇄`:`${o.target}줄 제거`).join(' · ');}
function starsText(count){return '★'.repeat(Math.max(0,Math.min(3,Number(count)||0)))+'☆'.repeat(3-Math.max(0,Math.min(3,Number(count)||0)));}
function updateHUD(){
 const lab=mode==='lab',n=Math.max(0,Math.ceil((mode==='endless'||mode==='tutorial'||lab?elapsed:remaining)/1000));
 $('score').textContent=game.score.toLocaleString();$('time').textContent=lab?Math.max(0,labStage().pieces.length-game.pieces)+'개':mode==='tutorial'?'연습':`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
 $('time').classList.toggle('urgent',remaining<20000&&(mode==='sprint'||mode==='daily'));
 $('time-label').textContent=lab?'남은 조각':mode==='endless'?'플레이 시간':mode==='tutorial'?'시간 제한 없음':'남은 시간';
 $('level-label').textContent=lab?'연구':'레벨';$('level').textContent=String(lab?labIndex+1:game.level).padStart(2,'0');$('chain').textContent=game.maxChain?game.maxChain+'×':'—';$('lines').textContent=game.lines;$('extra').textContent=game.extra;
 $('mode-label').textContent=modes[mode];$('seed-label').textContent=lab?'LAB '+String(labIndex+1).padStart(2,'0'):mode==='tutorial'?'LEARN':state==='menu'?'READY':game.seed.slice(-9);
 $('side-best').textContent=lab?L.total(saved.lab)+' / 27':best().toLocaleString();$('side-best-label').textContent=lab?'연구실 수집 별':modes[mode];
 $('best-mini').textContent=lab?'★ '+L.total(saved.lab)+'/27':'BEST '+best().toLocaleString()+' · 연쇄 '+(Number(saved.records[bestKey()]?.chain)||0);
 $('hold').disabled=state!=='playing'||game.holdUsed||mode==='tutorial'||lab;
 $('touchpad').setAttribute('aria-disabled',String(state!=='playing'));$('pause').disabled=!['playing','resolving','paused'].includes(state);$('pause').setAttribute('aria-label',state==='paused'?'계속하기':'일시정지');
 for(const b of document.querySelectorAll('.controls button'))b.disabled=state!=='playing';
 const showGoal=lab&&state!=='select';$('lab-goal').hidden=!showGoal;$('play-section').classList.toggle('lab-active',showGoal);
 if(showGoal){$('lab-title').textContent=String(labIndex+1).padStart(2,'0')+' · '+labStage().title;$('lab-target').textContent=labGoalText(labStage());$('lab-progress').textContent=L.objectives(labStage(),game).map(o=>`${o.label} ${Math.min(o.target,o.value)}/${o.target}`).join(' · ');$('lab-retry').disabled=!['playing','paused','end','resolving'].includes(state);}
}
function showLabList(){
 resetInput();state='select';mode='lab';game.active=null;screen.hidden=false;screen.className='screen lab-menu';
 const cleared=L.stages.filter(s=>Number(saved.lab[s.id]?.stars)>0).length;
 let next=L.stages.findIndex(s=>!Number(saved.lab[s.id]?.stars));if(next<0)next=L.stages.findIndex(s=>Number(saved.lab[s.id]?.stars)<3);if(next<0)next=0;
 content.innerHTML=`<div class="screen-kicker">THE CRACK LAB</div><h2>균열 연구실</h2><p>시간에 쫓기지 않고<br>한 수 앞을 설계하세요.</p><div class="lab-total"><strong>★ ${L.total(saved.lab)}<small> / 27</small></strong><span>${cleared}/9 연구 완료</span></div><button class="primary" data-lab="${next}">${L.total(saved.lab)===27?'완성한 연구 다시 보기':cleared===9?'남은 별에 도전':'이어서 연구하기'}</button>${['배치','균열','연쇄'].map((chapter,c)=>`<div class="lab-chapter"><strong>${c+1}. ${chapter}</strong><div class="lab-grid">${L.stages.slice(c*3,c*3+3).map((stage,j)=>{const i=c*3+j,open=L.unlocked(i,saved.lab),count=Number(saved.lab[stage.id]?.stars)||0;return `<button data-lab="${i}" ${open?'':'disabled'} aria-label="${i+1}번 ${stage.title}, ${open?count+'별':'이전 연구 완료 후 열림'}"><b>${String(i+1).padStart(2,'0')}</b><span>${open?starsText(count):'잠김'}</span></button>`;}).join('')}</div></div>`).join('')}<p class="lab-footnote">★ 하나면 다음 연구가 열립니다.<br>기록은 이 기기에 저장됩니다.</p><button class="text-btn" data-screen="menu">자유 플레이로</button>`;
 $('lab-hint').hidden=true;updateHUD();renderPreviews();setStatus('배치 → 균열 → 연쇄 · 9개의 연구, 27개의 별');
}
function openLab(index){
 if(!Number.isInteger(index)||!L.stages[index]||!L.unlocked(index,saved.lab))return;
 labIndex=index;start('lab');state='brief';screen.hidden=false;screen.className='screen small lab-brief';
 content.innerHTML=`<div class="screen-kicker">RESEARCH ${String(index+1).padStart(2,'0')} · ${labStage().chapter}</div><h2>${labStage().title}</h2><p>${labGoalText(labStage())}</p><div class="lab-conditions"><span>★ 목표 달성</span><span>★ ${labStage().par}조각 이내 성공</span><span>★ 남은 유리 없이 성공</span></div><p class="lab-footnote">자동 낙하 없음 · 시간 제한 없음<br>순서가 정해진 ${labStage().pieces.length}개 조각 · 보관 없음</p><button class="primary" data-screen="lab-play">연구 시작</button><button class="text-btn" data-screen="lab-list">연구 목록</button>`;updateHUD();
}
function finishLab(reason){
 const stage=labStage(),won=reason==='lab-clear',count=won?L.stars(stage,game):0;
 if(won){L.record(saved.lab,stage,game);save();}
 const conditions=[['목표 달성',won],[stage.par+'조각 이내 성공',won&&game.pieces<=stage.par],['남은 유리 없이 성공',won&&game.board.every(row=>row.every(c=>!c))]];
 const next=won&&labIndex<L.stages.length-1;
 const advice=won?(count===3?'모든 별을 모았어요. 다음 배치로 가볼까요?':game.pieces>stage.par?`${game.pieces-stage.par}조각 덜 쓰는 해법을 찾아보세요.`:'흰 균열을 이어 남은 유리까지 없애보세요.'):'배치를 바꿔 다시 도전해보세요. 실마리도 확인할 수 있어요.';
 content.innerHTML=`<div class="screen-kicker">${won?'RESEARCH COMPLETE':'TRY ANOTHER WAY'}</div><h2>${won?(labIndex===8?'아홉 번째 공명.':'해답을 찾았어요.'):'다른 배치가 있어요.'}</h2><div class="result-stars" aria-label="이번 결과 ${count}별">${starsText(count)}</div><div class="lab-conditions">${conditions.map(([label,met])=>`<span class="${met?'met':''}">${met?'★':'☆'} ${label}</span>`).join('')}</div><p>${advice}</p>${won?`<button class="primary" data-screen="${next?'lab-next':'lab-list'}">${next?'다음 연구':'연구 목록 · 남은 별 보기'}</button>`:''}<button class="${won?'secondary':'primary'}" data-screen="retry">같은 판 다시 연구</button>${won?'':'<button class="secondary" data-screen="lab-result-hint">실마리 보기</button>'}<p id="result-hint" class="lab-result-hint" hidden>${stage.hint}</p><button class="text-btn" data-screen="lab-list">연구 목록</button>`;
 setStatus(storageWorks?`이번 ${count}별 · 최고 ${Number(saved.lab[stage.id]?.stars)||0}별 · 전체 ★ ${L.total(saved.lab)}/27`:'기록 저장이 제한되어 이번 접속 중에만 진행이 유지됩니다.');
}
function menu(){resetInput();state='menu';mode=['tutorial','lab'].includes(mode)?'sprint':mode;game=new E.Game('preview');game.active=null;remaining=180000;elapsed=0;particles=[];phase=null;plan=null;falls=[];for(let x=0;x<10;x++)for(let j=0;j<(x<4?4-x:1+(x%3));j++)game.board[19-j][x]={type:Object.keys(colors)[(x+j)%7],mask:[3,5,10,12][(x+j)%4],id:100+x*5+j};showMenu();updateHUD();renderPreviews();setStatus('한 줄을 완성하면, 이어진 균열이 함께 깨집니다.');}
function showMenu(){screen.hidden=false;screen.className='screen';content.innerHTML=`<div class="screen-kicker">THE ART OF BREAKING</div><h2>GLASSFALL<span class="glass-word">유리의 공명</span></h2><p>유리를 쌓고 균열을 이어<br>나만의 연쇄를 완성하세요.</p><button class="primary lab-entry" data-screen="lab-list">균열 연구실 <span>★ ${L.total(saved.lab)}/27</span></button><div class="menu-lab-note">9개의 해답 · 시간 제한 없음</div><div class="menu-tabs" role="group" aria-label="게임 모드">${['sprint','endless','daily'].map(m=>`<button data-mode="${m}" class="${mode===m?'selected':''}" aria-pressed="${mode===m}">${m==='sprint'?'3분':m==='endless'?'무한':'오늘'}</button>`).join('')}</div><button class="secondary" data-screen="start">${modes[mode]} 시작</button><button class="text-btn" data-screen="tutorial">균열 배워보기</button><div class="menu-best">${mode==='daily'?day()+' · 같은 조각으로 도전':'최고 '+best().toLocaleString()+' · 최고 연쇄 '+(Number(saved.records[bestKey()]?.chain)||0)}</div>`;}
function start(selected=mode,seed){resetInput();mode=selected;game=selected==='lab'?L.create(labIndex):selected==='tutorial'?E.tutorial():new E.Game(seed||(selected==='daily'?'DAILY-'+day():newSeed()),selected);state='playing';remaining=180000;elapsed=0;fallTime=0;lockTime=0;lockResets=0;chain=0;phase=null;plan=null;falls=[];particles=[];dropTrail=null;calloutTime=0;gameResultSaved=false;endingReason='';last=performance.now();screen.hidden=true;$('lab-hint').hidden=true;$('callout').classList.remove('show');audioInit();setStatus(selected==='lab'?'시간 제한 없이 생각하세요. 아래로 빠르게 쓸고 떼면 배치를 확정합니다.':selected==='tutorial'?'오른쪽에 맞춰져 있어요. 아래로 빠르게 쓸고 떼어보세요.':'톡 터치하면 회전 · 좌우 이동 · 아래로 쓸고 떼면 낙하');updateHUD();renderPreviews();}
function pause(){if(state!=='playing'&&state!=='resolving')return;pausedFrom=state;state='paused';resetInput();screen.hidden=false;screen.className='screen small';content.innerHTML='<div class="screen-kicker">TAKE A BREATH</div><h2>잠시 쉬어가세요.</h2><p>유리도, 시간도 멈춰 있어요.</p><button class="primary" data-screen="resume">계속하기</button><button class="secondary" data-screen="retry">같은 판 다시 시작</button><button class="text-btn" data-screen="menu">모드 선택으로</button>';updateHUD();}
function resume(){if(state!=='paused')return;state=pausedFrom;screen.hidden=true;last=performance.now();resetInput();updateHUD();}
function finish(reason){if(state==='end')return;state='end';endingReason=reason;resetInput();game.active=null;phase=null;screen.hidden=false;screen.className='screen small';if(mode==='lab'){finishLab(reason);}
 else if(mode==='tutorial'){saved.learned=true;save();content.innerHTML='<div class="screen-kicker">FIRST RESONANCE</div><h2>균열이 이어졌어요.</h2><p>완성한 줄에서 충격이 퍼져<br>연결된 유리까지 함께 깨집니다.<br>다음에는 직접 길을 만들어보세요.</p><button class="primary" data-screen="start-sprint">3분 도전 시작</button><button class="secondary" data-screen="tutorial">한 번 더 연습</button>';setStatus('균열이 닿지 않은 조각은 남고, 아래로 내려옵니다.');}
 else{const prev=best(),record=saved.records[bestKey()]||{},delta=record.last?.seed===game.seed?game.score-record.last.score:null;let reflection=delta===null?'같은 판에 다시 도전해 기록을 비교하세요.':`같은 판 이전 기록보다 ${delta>=0?'+':''}${delta.toLocaleString()}점`;if(!gameResultSaved){saved.records[bestKey()]={chain:Math.max(Number(record.chain)||0,game.maxChain),extra:Math.max(Number(record.extra)||0,game.extra),last:{seed:game.seed,score:game.score}};saved.best[bestKey()]=Math.max(prev,game.score);if(game.extra>0)saved.badges.fracture=true;if(game.maxChain>=2)saved.badges.cascade=true;if(game.shards>=100)saved.badges.glass100=true;saved.plays=(Number(saved.plays)||0)+1;save();gameResultSaved=true;}content.innerHTML=`<div class="screen-kicker">${game.score>prev?'NEW PERSONAL BEST':'YOUR RESONANCE'}</div><h2>${reason==='time'?'빛나는 3분.':'다음 균열을 향해.'}</h2><div class="result-score">${game.score.toLocaleString()}</div><div class="result-stats"><span><b>${game.lines}</b> 줄</span><span><b>${game.maxChain}</b> 연쇄</span><span><b>${game.extra}</b> 균열</span></div><p>${reason==='time'?'시간이 끝났어요. 같은 조각으로<br>더 큰 연쇄를 만들어볼까요?':'유리가 입구까지 차올랐어요.<br>다른 배치로 다시 도전해보세요.'}</p><div class="run-reflection">${reflection}<br>이 모드 최고 연쇄 ${saved.records[bestKey()].chain} · 균열 ${saved.records[bestKey()].extra}</div><button class="primary" data-screen="retry">같은 판 다시 도전</button><button class="secondary" data-screen="new">${mode==='daily'?'오늘의 도전 다시':'새로운 판 시작'}</button><button class="text-btn" data-screen="menu">모드 선택으로</button>`;setStatus(storageWorks?'같은 판에서는 조각과 균열이 같은 순서로 나옵니다.':'브라우저에서 기록 저장이 제한되어 있습니다.');}
 badgeUI();updateHUD();renderPreviews();}
function emit(cells){for(const c of cells){const n=reduced?1:5;for(let i=0;i<n&&particles.length<220;i++)particles.push({x:(c.x+.5)*36,y:(c.y+.5)*36,vx:(Math.random()-.5)*180,vy:-30-Math.random()*150,life:450+Math.random()*450,total:900,size:2+Math.random()*6,angle:Math.random()*6.28,color:colors[c.cell.type][0]});}}
function callout(title,sub){$('callout').innerHTML=`<strong>${title}</strong><span>${sub}</span>`;$('callout').classList.add('show');calloutTime=950;}
function beginClear(p){plan=p;chain++;phase='crack';phaseTime=0;state='resolving';resetInput();tone('clear',chain);if(chain>1)callout(chain+' CHAIN','연쇄 배수 ×'+chain);else if(p.extra>0)callout('RESONANCE','균열 +'+p.extra);setStatus(`${p.rows.length}줄 완성${p.extra?' · 이어진 유리 '+p.extra+'개 파쇄':''}${chain>1?' · '+chain+'연쇄':''}`);updateHUD();}
function afterPiece(){if(mode==='lab'){if(L.cleared(labStage(),game)){finish('lab-clear');return;}if(game.pieces>=labStage().pieces.length){finish('lab-fail');return;}}if(mode==='tutorial'&&game.lines>0){finish('tutorial');return;}if((mode==='sprint'||mode==='daily')&&remaining<=0){finish('time');return;}if(!game.spawn()){finish(mode==='lab'?'lab-fail':'top');return;}state='playing';chain=0;lockTime=0;lockResets=0;fallTime=0;phase=null;plan=null;falls=[];resetInput();renderPreviews();updateHUD();}
function lock(){if(!game.active)return;game.lock();resetInput();chain=0;const p=E.clearPlan(game.board);if(p)beginClear(p);else afterPiece();}
function action(a){if(state!=='playing'||!game.active)return false;audioInit();let moved=false;const grounded=!game.fits(game.active,0,1);if(a==='left'||a==='right')moved=game.move(a==='left'?-1:1);else if(a==='rotate'){moved=game.rotate();if(moved){tone('rotate');rebaseBoardDrag();}}else if(a==='down'){moved=game.move(0,1);if(moved){game.score++;fallTime=0;}}else if(a==='drop'){const d=game.dropDistance();dropTrail={cells:game.active.cells.map(c=>({...c,x:c.x+game.active.x,y:c.y+game.active.y})),distance:d,life:170};game.move(0,d);game.score+=d*2;tone('drop');lock();updateHUD();return true;}else if(a==='hold'&&mode!=='tutorial'&&mode!=='lab'){moved=game.hold();if(game.over){finish('top');return false;}if(moved){resetInput();lockTime=0;lockResets=0;fallTime=0;renderPreviews();}}
 if(moved&&grounded&&lockResets<12&&(a==='left'||a==='right'||a==='rotate')){lockTime=0;lockResets++;}if(a!=='left'&&a!=='right'&&a!=='rotate')updateHUD();return moved;}
function update(rawDt){const dt=Math.min(100,rawDt);if(state==='playing'||state==='resolving'){elapsed+=rawDt;if(mode==='sprint'||mode==='daily')remaining=Math.max(0,remaining-rawDt);if(state==='playing'&&remaining<=0&&(mode==='sprint'||mode==='daily')){finish('time');return;}if(repeat&&state==='playing'){repeat.time-=dt;let count=0;while(repeat&&repeat.time<=0&&count++<4){const r=repeat;action(r.action);if(repeat===r)r.time+=70;}}if(state==='playing'&&mode!=='tutorial'&&mode!=='lab'){if(game.active&&!game.fits(game.active,0,1)){fallTime=0;lockTime+=dt;if(lockTime>=650)lock();}else{fallTime+=dt;lockTime=0;while(state==='playing'&&fallTime>=game.gravity){fallTime-=game.gravity;game.move(0,1);}}}
 if(state==='resolving'){phaseTime+=dt;if(phase==='crack'&&phaseTime>=(reduced?90:260+Math.min(180,Math.max(...plan.cells.map(c=>c.depth))*24))){emit(plan.cells);const result=game.resolve(plan,chain);falls=result.falls;plan=null;phase='fall';phaseTime=0;updateHUD();}else if(phase==='fall'&&phaseTime>=(reduced?60:240)){falls=[];const p=E.clearPlan(game.board);if(p)beginClear(p);else afterPiece();}}}
 if(state!=='paused'){if(drag?.axis==='y'&&state==='playing')processSwipe(drag,drag.lastX,drag.lastY,performance.now());if(gestureFeedbackTime>0&&!drag){gestureFeedbackTime-=dt;if(gestureFeedbackTime<=0){$('pad-hint').textContent='게임판에서도 똑같이 조작하세요';$('touchpad').classList.remove('drop-ready');}}for(const p of particles){p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=350*dt/1000;p.angle+=dt*.002;}particles=particles.filter(p=>p.life>0);if(dropTrail){dropTrail.life-=dt;if(dropTrail.life<=0)dropTrail=null;}if(calloutTime>0){calloutTime-=dt;if(calloutTime<=0)$('callout').classList.remove('show');}}
}
function glass(c,x,y,size=36,options={}){const g=options.context||ctx,[light,dark]=colors[c.type]||colors.I;g.save();if(options.alpha!==undefined)g.globalAlpha=options.alpha;const m=Math.max(1.4,size*.055),r=Math.max(2,size*.08),px=x+m,py=y+m,s=size-m*2;
 if(options.ghost){g.fillStyle=light+'20';g.fillRect(px,py,s,s);g.strokeStyle=options.ready?'#f5fff8':light;g.globalAlpha=options.ready?1:.75;g.lineWidth=options.ready?2.5:1.5;g.strokeRect(px+.5,py+.5,s-1,s-1);g.restore();return;}
 const fill=g.createLinearGradient(px,py,px+s,py+s);fill.addColorStop(0,light+'a8');fill.addColorStop(.35,dark+'ba');fill.addColorStop(1,dark+'58');g.fillStyle=fill;g.beginPath();g.roundRect(px,py,s,s,r);g.fill();g.strokeStyle=light+'a0';g.lineWidth=.8;g.stroke();g.beginPath();g.moveTo(px+3,py+s-3);g.lineTo(px+3,py+3);g.lineTo(px+s-3,py+3);g.strokeStyle='#ffffff80';g.stroke();g.beginPath();g.moveTo(px+2,py+s*.53);g.lineTo(px+s*.55,py+2);g.lineTo(px+s*.78,py+2);g.lineTo(px+2,py+s*.78);g.closePath();g.fillStyle='#ffffff0e';g.fill();
 if(c.mask){const cx=x+size*.5,cy=y+size*.5;g.beginPath();for(const[dx,dy,bit]of E.DIRS)if(c.mask&bit){g.moveTo(cx,cy);g.lineTo(cx+dx*size*.2+dy*size*.07,cy+dy*size*.2-dx*size*.07);g.lineTo(cx+dx*size*.5,cy+dy*size*.5);}g.strokeStyle='#102332';g.lineWidth=2.5;g.stroke();g.strokeStyle=options.hot?'#ffffff':'#e8ffffe0';g.lineWidth=1.2;g.stroke();g.fillStyle='#eaffff';g.beginPath();g.arc(cx,cy,size*.025,0,Math.PI*2);g.fill();}
 if(options.hot){g.fillStyle='#dbfff588';g.fillRect(px,py,s,s);g.strokeStyle='#ffffff';g.lineWidth=1.5;g.strokeRect(px,py,s,s);}g.restore();}
function resize(){renderRatio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(360*renderRatio);canvas.height=Math.round(720*renderRatio);ctx.setTransform(renderRatio,0,0,renderRatio,0,0);}
function render(){ctx.clearRect(0,0,360,720);const bg=ctx.createLinearGradient(0,0,360,720);bg.addColorStop(0,'#0e1e2d');bg.addColorStop(1,'#10232b');ctx.fillStyle=bg;ctx.fillRect(0,0,360,720);ctx.strokeStyle='#8fbed109';ctx.lineWidth=1;ctx.beginPath();for(let x=1;x<10;x++){ctx.moveTo(x*36,0);ctx.lineTo(x*36,720);}for(let y=1;y<20;y++){ctx.moveTo(0,y*36);ctx.lineTo(360,y*36);}ctx.stroke();ctx.fillStyle='#a8d7e91a';for(let x=1;x<10;x++)for(let y=1;y<20;y++)ctx.fillRect(x*36-.7,y*36-.7,1.4,1.4);
 const clearMap=new Map(plan?plan.cells.map(c=>[c.y*10+c.x,c.depth]):[]),fallMap=new Map(falls.map(f=>[f.cell.id,f]));
 for(let y=0;y<20;y++)for(let x=0;x<10;x++){const c=game.board[y][x];if(!c)continue;let yy=y;const f=fallMap.get(c.id);if(f&&phase==='fall'){const t=Math.min(1,phaseTime/(reduced?60:240));yy=f.from+(f.to-f.from)*(1-Math.pow(1-t,3));}const hot=clearMap.has(y*10+x)&&phaseTime>clearMap.get(y*10+x)*24;glass(c,x*36,yy*36,36,{hot});}
 if(game.active&&['playing','paused'].includes(state)){const p=game.active,dy=game.dropDistance();for(const c of p.cells)glass(c,(p.x+c.x)*36,(p.y+c.y+dy)*36,36,{ghost:true,ready:!!drag?.dropReady});for(const c of p.cells)glass(c,(p.x+c.x)*36,(p.y+c.y)*36,36);}
 if(dropTrail&&!reduced){ctx.save();ctx.globalAlpha=dropTrail.life/900;ctx.fillStyle='#c2fff2';for(const c of dropTrail.cells)ctx.fillRect(c.x*36+5,c.y*36,26,(dropTrail.distance+1)*36);ctx.restore();}
 for(const p of particles){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life/400);ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size*.7,-p.size*.6);ctx.lineTo(p.size*.2,p.size);ctx.closePath();ctx.fill();ctx.restore();}
 if(game.board.slice(0,4).some(row=>row.some(Boolean))&&state!=='menu'){ctx.fillStyle='#ff677811';ctx.fillRect(0,0,360,144);ctx.strokeStyle='#ff9ca360';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(0,144);ctx.lineTo(360,144);ctx.stroke();ctx.setLineDash([]);}}
function previewPiece(g,p,y){if(!p)return;const minX=Math.min(...p.cells.map(c=>c.x)),maxX=Math.max(...p.cells.map(c=>c.x)),minY=Math.min(...p.cells.map(c=>c.y));const size=19,x=(96-(maxX-minX+1)*size)/2;for(const c of p.cells)glass(c,x+(c.x-minX)*size,y+(c.y-minY)*size,size,{context:g});}
function renderPreviews(){const n=$('next').getContext('2d'),h=$('held').getContext('2d');n.clearRect(0,0,96,224);h.clearRect(0,0,96,76);game.queue.slice(0,3).forEach((p,i)=>previewPiece(n,p,16+i*70));previewPiece(h,game.held,15);}
let lastHud=0;function frame(now){const dt=last?Math.max(0,now-last):0;last=now;update(dt);render();if(now-lastHud>200){updateHUD();lastHud=now;}requestAnimationFrame(frame);}
content.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.lab!==undefined){openLab(Number(b.dataset.lab));return;}
 if(b.dataset.mode){mode=b.dataset.mode;showMenu();updateHUD();return;}
 const a=b.dataset.screen;
 if(a==='lab-list'){showLabList();return;}if(a==='lab-next'){openLab(labIndex+1);return;}
 if(a==='lab-play'&&state==='brief'){state='playing';screen.hidden=true;last=performance.now();updateHUD();return;}
 if(a==='lab-result-hint'){const hint=content.querySelector('.lab-result-hint');if(hint)hint.hidden=false;return;}
 if(a==='start')start();if(a==='start-sprint')start('sprint');if(a==='tutorial')start('tutorial');if(a==='retry')start(mode,game.seed);if(a==='new')start(mode);if(a==='resume')resume();if(a==='menu')menu();
});
$('lab-hint-button').addEventListener('click',()=>{if(mode!=='lab')return;$('lab-hint').textContent=labStage().hint;$('lab-hint').hidden=!$('lab-hint').hidden;});
$('lab-retry').addEventListener('click',()=>{if(mode==='lab')start('lab');});
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
// One contact owns one piece. Only a short, unmoved release rotates; swipes never do.
function isFastDown(d,x,y,now){
 const dx=x-d.startX,dy=y-d.startY,age=Math.max(1,now-d.started);
 return d.axis==='y'&&d.vertical===1&&!d.soft&&dy>=Math.max(44,d.unit*1.5)&&age<=300&&dy/age>=.5&&dy>Math.abs(dx)*1.6&&d.peakX<=Math.max(20,dy*.55)&&d.peakDown-dy<d.unit*.6;
}
function processSwipe(d,x,y,now){
 if(drag!==d||state!=='playing'||game.active?.cells[0].id!==d.pieceId)return;
 d.lastX=x;d.lastY=y;
 const dx=x-d.startX,dy=y-d.startY,age=now-d.started;
 d.peakX=Math.max(d.peakX,Math.abs(dx));d.peakDown=Math.max(d.peakDown,dy);
 d.peakDistance=Math.max(d.peakDistance,Math.hypot(dx,dy));
 if(!d.axis){
  if(Math.abs(dx)>=12&&Math.abs(dx)>Math.abs(dy)*1.25)d.axis='x';
  else if(Math.abs(dy)>=14&&Math.abs(dy)>Math.abs(dx)*1.4){d.axis='y';d.vertical=Math.sign(dy);}
 }
 if(d.axis==='x'){
  const before=game.active.x,offset=Math.max(-20,Math.min(20,(x-d.anchorX)/d.unit));
  while(offset>d.shift+.6)d.shift++;
  while(offset<d.shift-.6)d.shift--;
  if(!moveToColumn(d.originX+d.shift))rebaseBoardDrag();
  if(game.active.x!==before)d.translated=true;
  gestureFeedback('좌우로 밀어 위치를 맞추세요');
 }else if(d.axis==='y'){
  if(d.vertical===1&&dy>0){
   if(age>300||(age>=120&&dy>=24&&dy/age<.28))d.soft=true;
   if(d.soft){
    let steps=Math.min(20,Math.floor((y-d.downAnchor)/d.unit));
    while(steps-->0){d.downAnchor+=d.unit;if(!action('down')){d.downAnchor=y;break;}}
    gestureFeedback('천천히 내리는 중');
   }else{
    d.dropReady=isFastDown(d,x,y,now);
    gestureFeedback(d.dropReady?'손을 떼면 즉시 낙하':'아래로 빠르게 쓸고 떼면 낙하',d.dropReady);
   }
  }else{d.dropReady=false;gestureFeedback('회전은 짧게 톡 터치하세요');}
 }
 if(d.axis!=='y'||d.soft)d.dropReady=false;
}
for(const surface of [canvas,$('touchpad')]){
 surface.addEventListener('pointerdown',e=>{
  if(state!=='playing'||!game.active||drag||e.button!==0||e.isPrimary===false)return;
  e.preventDefault();surface.setPointerCapture?.(e.pointerId);repeat=null;audioInit();
  drag={id:e.pointerId,surface,pieceId:game.active.cells[0].id,startX:e.clientX,startY:e.clientY,anchorX:e.clientX,lastX:e.clientX,lastY:e.clientY,started:performance.now(),originX:game.active.x,shift:0,axis:null,peakDistance:0,soft:false,translated:false,dropReady:false,peakX:0,peakDown:0,downAnchor:e.clientY,unit:Math.max(16,Math.min(34,canvas.getBoundingClientRect().width/10))};
  $('touchpad').classList.add('engaged');gestureFeedback('톡 터치: 회전 · 좌우: 이동 · 아래: 낙하');
 });
 surface.addEventListener('pointermove',e=>{
  const d=drag;if(!d||d.id!==e.pointerId||d.surface!==surface)return;
  e.preventDefault();processSwipe(d,e.clientX,e.clientY,performance.now());
 });
 surface.addEventListener('pointerup',e=>{
  const d=drag;if(!d||d.id!==e.pointerId||d.surface!==surface)return;
  e.preventDefault();const now=performance.now();processSwipe(d,e.clientX,e.clientY,now);
  if(drag!==d||state!=='playing'||game.active?.cells[0].id!==d.pieceId)return;
  const dx=e.clientX-d.startX,dy=e.clientY-d.startY,fast=isFastDown(d,e.clientX,e.clientY,now);
  drag=null;$('touchpad').classList.remove('engaged','drop-ready');
  if(!d.axis&&d.peakDistance<=10&&now-d.started<=300){
   const rotated=action('rotate');gestureFeedback(rotated?'회전 · 다시 톡 터치하면 한 번 더':'회전할 공간이 없어요');
  }else if(fast){action('drop');gestureFeedback('즉시 낙하');}
  else if(d.axis==='x'&&!d.translated&&Math.abs(dx)>=12){action(dx>0?'right':'left');gestureFeedback('한 칸 이동');}
  else if(d.axis==='y'&&d.vertical===1&&!d.soft&&dy>=Math.max(18,d.unit*.6)){
   const steps=Math.min(20,Math.max(1,Math.floor(dy/d.unit)));for(let i=0;i<steps;i++)if(!action('down'))break;
   gestureFeedback('천천히 내렸어요');
  }
 });
 for(const name of ['pointercancel','lostpointercapture'])surface.addEventListener(name,e=>{
  if(drag?.id===e.pointerId&&drag.surface===surface){drag=null;$('touchpad').classList.remove('engaged','drop-ready');gestureFeedback('취소했어요 · 다시 스와이프하세요');}
 });
}
const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',x:'rotate',X:'rotate',' ':'drop',c:'hold',C:'hold'};document.addEventListener('keydown',e=>{if($('help-dialog').open)return;if(e.key==='Escape'||e.key==='p'||e.key==='P'){if(e.repeat)return;e.preventDefault();if(state==='paused')resume();else pause();return;}if(e.target.closest?.('input,select,textarea,[contenteditable]')||e.key===' '&&e.target.closest?.('button,a'))return;const a=keys[e.key];if(!a||state!=='playing')return;e.preventDefault();if(e.repeat||keyHeld.has(e.key))return;keyHeld.add(e.key);action(a);if(['left','right','down'].includes(a)&&state==='playing')repeat={id:e.key,action:a,time:200};});document.addEventListener('keyup',e=>{keyHeld.delete(e.key);if(repeat?.id===e.key)repeat=null;});
$('pause').addEventListener('click',()=>state==='paused'?resume():pause());$('sound').addEventListener('click',()=>{soundOn=!soundOn;saved.sound=soundOn;save();updateSound();audioInit();if(soundOn)tone('rotate');});
$('help').addEventListener('click',()=>{resumeAfterHelp=state==='playing'||state==='resolving';if(resumeAfterHelp)pause();$('learn').textContent=resumeAfterHelp?'균열 연습 시작 · 현재 판 종료':'직접 균열 배워보기';$('help-dialog').showModal();});function closeHelp(){$('help-dialog').close();} $('close-help').addEventListener('click',closeHelp);$('resume-help').addEventListener('click',closeHelp);$('help-dialog').addEventListener('close',()=>{if(resumeAfterHelp){resumeAfterHelp=false;resume();}});$('learn').addEventListener('click',()=>{resumeAfterHelp=false;closeHelp();start('tutorial');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();pause();}});window.addEventListener('blur',()=>{resetInput();pause();});window.addEventListener('resize',resize);
// Old game caches must not serve the replaced entrypoint.
if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
resize();updateSound();badgeUI();menu();requestAnimationFrame(frame);
})();
