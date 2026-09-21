(() => {
'use strict';
const E=window.GlassEngine,P=window.GlassProgress,S=window.GlassStages,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let reduced=systemReduced;
const colors={I:['#83eee3','#318b99'],O:['#f7d790','#b9844e'],T:['#ceb0fb','#7550b3'],S:['#a9e9ba','#478c70'],Z:['#f5a3b1','#a74769'],J:['#a0c4fa','#4d71b1'],L:['#f4b798','#ab6349']};
const materials={glass:{name:'유리',tag:'균열을 잇는 설계',rule:'가로줄을 채우면 연결된 흰 균열까지 파쇄됩니다.',effect:'파쇄'},sand:{name:'모래',tag:'산사태를 설계하는 퍼즐',rule:'착지한 모래는 낮은 곳으로 흘러 지형을 바꿉니다. 3스테이지부터 3색, 같은 색 12칸부터 SAND BURST! 붕괴 뒤 산사태 연쇄를 설계하세요.',effect:'SAND BURST'},water:{name:'물',tag:'빈틈을 찾아 흐르는 물',rule:'같은 색 물 10칸 이상을 상하좌우로 모으면 배수됩니다.',effect:'배수'},jelly:{name:'젤리',tag:'붙을수록 커지는 탄성',rule:'같은 색 젤리 8칸 이상이 상하좌우로 붙으면 터집니다.',effect:'팝'}};
const materialColors={sand:[['#e6c47b','#8d5d28'],['#b99ac9','#705b7c'],['#91aab0','#4f686f']],water:[['#78dfff','#237bad'],['#91ffdc','#218f87'],['#b3aaff','#6556bf'],['#ffafe1','#ab528c']],jelly:[['#ff94c5','#b23875'],['#b6f585','#579744'],['#ffdb77','#b47727'],['#c6a2ff','#7650b0']]};
const storageKey='glassfall-v1';let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{saved={};}if(!saved||typeof saved!=='object')saved={};saved.best=saved.best&&typeof saved.best==='object'?saved.best:{};saved.badges=saved.badges&&typeof saved.badges==='object'?saved.badges:{};
reduced=systemReduced||saved.effects==='light';saved.mastery=saved.mastery&&typeof saved.mastery==='object'&&!Array.isArray(saved.mastery)?saved.mastery:{};
saved.records=saved.records&&typeof saved.records==='object'?saved.records:{};
saved.runs=Array.isArray(saved.runs)?saved.runs.filter(r=>r&&['stage','sprint','endless','daily'].includes(r.mode)&&typeof r.seed==='string'&&r.last&&Number.isFinite(r.best)).slice(-12):[];
const difficulties={calm:{name:'여유',description:'느린 낙하 · 넉넉한 배치 시간'},standard:{name:'기본',description:'빈 판에서 시작 · 지금의 속도'},challenge:{name:'도전',description:'쌓인 바닥 공략 · 더 빠른 낙하'}};
let difficulty=Object.hasOwn(difficulties,saved.difficulty)?saved.difficulty:'standard',goals=[],goalDone=[],goalToast=0,goalToastText='',strategy=null,feedback=[],impact=null;
let replayBest=null,material=Object.hasOwn(materials,saved.material)?saved.material:'glass',settleCount=0;
let storageWorks=true;function save(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{storageWorks=false;}}
saved.campaign=saved.campaign&&typeof saved.campaign==='object'&&!Array.isArray(saved.campaign)?saved.campaign:{};saved.devMode=!!saved.devMode;
let stageNumber=1,stageConfig=null;
let mode='stage',state='menu',game=new E.Game('preview'),remaining=180000,elapsed=0,fallTime=0,lockTime=0,lockResets=0,last=0,chain=0,phase=null,phaseTime=0,plan=null,falls=[],particles=[],dropTrail=null,calloutTime=0,pausedFrom='playing',resumeAfterHelp=false,gameResultSaved=false,endingReason='';
let repeat=null,drag=null,gestureFeedbackTime=0,keyHeld=new Set(),soundOn=!!saved.sound,audio=null,renderRatio=1;
const modes={stage:'스테이지',sprint:'기존 시간 도전',daily:'오늘의 도전',endless:'무한 모드',tutorial:'조작 연습'};
const screen=$('screen'),content=screen.querySelector('.screen-content');
function bestKey(){if(mode==='stage')return material+':stage:'+stageNumber;return(difficulty==='standard'?'':difficulty+':')+(material==='glass'?'':material+':')+(mode==='daily'?'daily-'+(state!=='menu'&&game.seed.startsWith('DAILY-')?game.seed.slice(6):day()):mode);}
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
function tone(kind,n=1){
 if(!soundOn)return;audioInit();if(!audio)return;
 const profile={glass:{base:740,type:'sine',tail:.32},sand:{base:180,type:'triangle',tail:.14},water:{base:440,type:'sine',tail:.25},jelly:{base:260,type:'triangle',tail:.22}}[game.material];
 const start=audio.currentTime,base=kind==='clear'?profile.base:kind==='goal'?660:kind==='drop'?profile.base*.42:profile.base*.6,voices=kind==='clear'||kind==='goal'?3:1;
 for(let i=0;i<voices;i++){const osc=audio.createOscillator(),gain=audio.createGain(),when=start+i*.045,duration=profile.tail;
  osc.type=kind==='goal'?'sine':profile.type;const pitch=base*(1+i*.33)*Math.min(1.65,1+(n-1)*.1);osc.frequency.setValueAtTime(pitch,when);osc.frequency.exponentialRampToValueAtTime(pitch*(kind==='goal'?1.2:game.material==='jelly'?.48:game.material==='water'?1.45:.8),when+duration);
  gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(kind==='clear'?.025:.015,when+.008);gain.gain.exponentialRampToValueAtTime(.001,when+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(when);osc.stop(when+duration+.02);
 }
}
function vibrate(pattern){if(saved.haptics&&typeof navigator.vibrate==='function')try{navigator.vibrate(pattern);}catch{}}
function updateExperience(){
 $('effects-setting').textContent=systemReduced?'효과: 간결 · 기기 설정':reduced?'효과: 간결':'효과: 풍부';$('effects-setting').disabled=systemReduced;$('effects-setting').setAttribute('aria-pressed',String(!reduced));
 const supported=typeof navigator.vibrate==='function';$('haptics-setting').disabled=!supported;$('haptics-setting').textContent=supported?'진동: '+(saved.haptics?'켬':'끔'):'진동: 이 브라우저는 미지원';$('haptics-setting').setAttribute('aria-pressed',String(!!saved.haptics));
}
function addFeedback(clear,gain){
 const x=clear.cells.reduce((n,c)=>n+c.x+.5,0)/clear.cells.length*36,y=clear.cells.reduce((n,c)=>n+c.y+.5,0)/clear.cells.length*36;
 feedback.push({x,y,gain,life:game.material==='sand'?1250:1000,total:game.material==='sand'?1250:1000,color:cellColors(clear.cells[0].cell)[0],kind:game.material,rows:clear.rows.slice(),power:Math.min(game.material==='sand'?5:3,chain),rays:Math.min(24,8+chain*4)});feedback=feedback.slice(-6);vibrate(game.material==='sand'&&chain>=4?[18,30,24,35,30]:chain>1?[12,35,12]:12);
}
function updateSound(){$('sound').setAttribute('aria-label',soundOn?'소리 끄기':'소리 켜기');$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').style.color=soundOn?'#a6efe5':'#718a9a';}
function badgeUI(){const badges=[['fracture','첫 번째 공명','균열 유리 1개 이상 파쇄'],['cascade','연쇄 설계자','한 번에 2연쇄 완성'],['glass100','빛의 수집가','한 판에서 유리 100개 제거']];$('milestones').innerHTML=badges.map(([id,name,desc])=>`<div class="milestone ${saved.badges[id]?'unlocked':''}"><span aria-hidden="true">${saved.badges[id]?'✧':'◇'}</span><div><strong>${name}${saved.badges[id]?' · 달성':''}</strong><p>${desc}</p></div></div>`).join('');}
function signed(n){return(n>0?'+':'')+n.toLocaleString();}
function findRun(){return saved.runs.find(r=>r.mode===mode&&r.seed===game.seed&&(r.material||'glass')===material&&(r.difficulty||'standard')===(mode==='stage'?'standard':difficulty));}
function lastReplay(){const last=saved.records[bestKey()]?.last;return last&&typeof last.seed==='string'&&Number.isFinite(last.score)?last:null;}
function legacyRun(){const last=lastReplay();return last?.seed===game.seed?last:null;}
function masteryMarkup(){const m=P.mastery(saved.mastery[material]);return `<div class="mastery-card"><div><strong>${materials[material].name} Lv.${m.level} · ${m.title}</strong><span>${m.next===null?'최고 단계':`${m.next-m.xp} XP 후 승급`}</span></div><progress max="1" value="${m.progress}" aria-label="소재 숙련도"></progress><small>${m.level<3?'Lv.3 공명 테두리 해금':m.level<5?'공명 테두리 적용 · Lv.5 오로라 테두리':'오로라 테두리 적용'}</small></div>`;}
function updateGoals(){
 const panel=$('goal-panel'),visible=mode!=='tutorial'&&['playing','paused','resolving'].includes(state);panel.hidden=!visible;
 $('material-guide').hidden=visible;if(!visible)return;
 const result=P.evaluate(goals,game);
 for(let i=0;i<goals.length;i++)if(result.done[i]&&!goalDone[i]){goalToast=1700;goalToastText=`${goals[i].label} 달성 · +${goals[i].xp} XP`;tone('goal');}
 goalDone=result.done;
 const next=goals.find((g,i)=>!result.done[i]);
 $('goal-title').textContent=goalToast>0?goalToastText:next?`이번 판 ${result.count}/${goals.length} · ${next.label}`:'목표 완료 · 보너스 +25 XP';
 $('goal-value').textContent=next?`${Math.min(game[next.key],next.target)}/${next.target}${next.unit}`:`+${result.xp} XP`;
 $('goal-progress').max=next?next.target:1;$('goal-progress').value=next?Math.min(game[next.key],next.target):1;
 panel.classList.toggle('completed',goalToast>0||!next);
 $('strategy-note').textContent=strategy?.text||`${difficulties[difficulty].name} · ${materials[material].effect}를 준비하세요`;
}
function updateHUD(){
 $('rail-rotate').disabled=state!=='playing';
 $('stage-hud').hidden=mode!=='stage'||state==='menu';
 if(mode==='stage'){$('stage-hud').textContent='제거 '+Math.min(game.shards,stageConfig?.target||0)+' / '+(stageConfig?.target||0)+'칸'+(game.material==='sand'&&stageConfig?.gems?' · 💎 '+game.gems+'/'+stageConfig.gems:'');}
 document.body.classList.toggle('menu-open',state==='menu');
 document.body.dataset.material=game.material;
 const n=Math.max(0,Math.ceil((mode==='endless'||mode==='tutorial'?elapsed:remaining)/1000));
 updateGoals();$('play-section').setAttribute('data-pad',saved.showPad?'show':'hide');$('play-section').setAttribute('data-mastery',String(P.mastery(saved.mastery[material]).level));
 $('score').textContent=game.score.toLocaleString();$('time').textContent=mode==='stage'?stageNumber+' / 100':mode==='tutorial'?'연습':`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
 $('time').classList.toggle('urgent',remaining<20000&&(mode==='sprint'||mode==='daily'));
 $('time-label').textContent=mode==='stage'?'스테이지':mode==='endless'?'플레이 시간':mode==='tutorial'?'시간 제한 없음':'남은 시간';
 $('level-label').textContent='레벨';$('level').textContent=String(game.level).padStart(2,'0');$('chain').textContent=game.maxChain?game.maxChain+'×':'—';$('lines').textContent=game.lines;$('extra').textContent=game.extra;
 $('mode-label').textContent=materials[game.material].name+' · '+modes[mode];$('material-guide').textContent=materials[game.material].rule;$('play-section').setAttribute('data-material',game.material);$('clear-label').textContent=game.material==='glass'?'제거':'연결 제거';$('clear-unit').textContent=game.material==='glass'?'줄':'묶음';$('extra-label').textContent=game.material==='glass'?'균열 파쇄':'제거한 칸';$('seed-label').textContent=mode==='tutorial'?'LEARN':state==='menu'?'READY':game.seed.slice(-9);
 $('side-best').textContent=best().toLocaleString();$('side-best-label').textContent=modes[mode];
 $('best-mini').textContent='BEST '+best().toLocaleString()+' · 연쇄 '+(Number(saved.records[bestKey()]?.chain)||0);
 $('rail-drop').disabled=state!=='playing';
 $('hold').disabled=state!=='playing'||game.holdUsed||mode==='tutorial';
 $('touchpad').setAttribute('aria-disabled',String(state!=='playing'));$('pause').disabled=!['playing','resolving','paused'].includes(state);$('pause').setAttribute('aria-label',state==='paused'?'계속하기':'일시정지');
 for(const b of document.querySelectorAll('.controls button'))b.disabled=state!=='playing';
 $('replay-target').hidden=replayBest===null||!['playing','paused','resolving'].includes(state);
 if(replayBest!==null){const gap=replayBest-game.score;$('replay-target').textContent=gap>=0?'같은 판 최고 '+replayBest.toLocaleString()+'점 · 갱신까지 '+(gap+1).toLocaleString()+'점':'같은 판 최고 기록 돌파 · +'+(-gap).toLocaleString()+'점';}
}
function menu(){resetInput();state='menu';mode=mode==='tutorial'?'stage':mode;stageNumber=S.progress(saved.campaign[material]).unlocked;stageConfig=S.config(stageNumber,material);game=new E.Game('preview',mode,material);goals=[];strategy=null;feedback=[];impact=null;game.active=null;remaining=180000;elapsed=0;particles=[];phase=null;plan=null;falls=[];for(let x=0;x<10;x++)for(let j=0;j<(x<4?4-x:1+(x%3));j++)game.board[19-j][x]={type:Object.keys(colors)[(x+j)%7],mask:[3,5,10,12][(x+j)%4],id:100+x*5+j,paint:x%game.colorCount};showMenu();updateHUD();renderPreviews();setStatus(materials[material].rule);}
function stageMarkup(){const p=S.progress(saved.campaign[material]),c=S.config(stageNumber,material);const dev=saved.devMode;return `<div class="stage-card"><strong>${c.chapter}장 · ${c.title}${c.boss?' · 관문':''}</strong><p>${stageNumber} 스테이지 · ${c.target}칸 제거<br>시간 제한 없음 · ${p.cleared.length}/100 완료</p><details class="stage-map"><summary>스테이지 선택</summary><div class="stage-grid">${Array.from({length:100},(_,i)=>i+1).map(n=>`<button data-stage="${n}" ${!dev&&n>p.unlocked?'disabled':''} aria-label="${n} 스테이지${p.cleared.includes(n)?' 완료':''}" aria-pressed="${n===stageNumber}" class="${n===stageNumber?'selected':''}">${p.cleared.includes(n)?'✓ ':''}${n}</button>`).join('')}</div></details>${dev?'<div class="dev-badge">DEV MODE · 모든 스테이지 테스트 가능</div>':''}</div>`;}
function showMenu(){screen.hidden=false;screen.className='screen lobby';content.innerHTML=`<div class="lobby-heading"><div class="screen-kicker">THE ART OF BREAKING</div><h2>GLASSFALL</h2><p>떨어뜨리고, 터뜨리는 새로운 테트리스</p></div><div class="material-options" role="group" aria-label="소재 선택">${Object.entries(materials).map(([key,m])=>`<button data-material="${key}" class="${material===key?'selected':''}" aria-pressed="${material===key}"><canvas class="mode-art" data-art="${key}" width="320" height="260" aria-hidden="true"></canvas><span class="mode-name">${m.name} 모드</span><small>${key.toUpperCase()} MODE</small></button>`).join('')}</div><p class="material-description"><strong>${materials[material].tag}</strong><br>${materials[material].rule}</p>${masteryMarkup()}${mode==='stage'?stageMarkup():''}<div class="difficulty-options" ${mode==='stage'?'hidden':''} role="group" aria-label="난이도">${Object.entries(difficulties).map(([key,d],i)=>`<button data-difficulty="${key}" class="${difficulty===key?'selected':''}" aria-pressed="${difficulty===key}"><span aria-hidden="true">${['❧','▦','♨'][i]}</span> ${d.name}</button>`).join('')}</div><p class="difficulty-note" ${mode==='stage'?'hidden':''}>${difficulties[difficulty].description}</p><div class="duration-panel"><div class="duration-label">플레이 방식</div><div class="menu-tabs" role="group" aria-label="게임 모드">${['stage','endless','daily'].map(m=>`<button data-mode="${m}" class="${mode===m?'selected':''}" aria-pressed="${mode===m}">${m==='stage'?'100 스테이지':m==='endless'?'∞ 무한':'오늘의 도전'}</button>`).join('')}</div></div><button class="primary start-button" data-screen="start"><span aria-hidden="true">▶</span> ${materials[material].name} 모드 · ${mode==='stage'?stageNumber+' 스테이지':modes[mode]} 시작 <span aria-hidden="true">›</span></button>${lastReplay()?'<button class="secondary" data-screen="last-replay">직전 판 기록에 재도전</button>':''}<div class="lobby-tools"><button class="text-btn" data-screen="tutorial"><span aria-hidden="true">◇</span>조작 연습</button><button class="text-btn" data-screen="help"><span aria-hidden="true">⚙</span>설정·도움말</button><button class="text-btn" data-screen="dev-toggle"><span aria-hidden="true">⌘</span>${saved.devMode?'개발자 ON':'개발자 모드'}</button></div><div class="menu-best">${mode==='daily'?day()+' · 같은 조각으로 도전':'최고 '+best().toLocaleString()+' · 최고 연쇄 '+(Number(saved.records[bestKey()]?.chain)||0)}</div>`;window.GlassArt?.menu(content);}

function start(selected=mode,seed){resetInput();mode=selected;if(mode==='stage'){stageConfig=S.config(stageNumber,material);seed=stageConfig.seed;}game=selected==='tutorial'?E.tutorial():new E.Game(seed||(selected==='daily'?'DAILY-'+day():newSeed()),selected,material,mode==='stage'?'standard':difficulty);if(mode==='stage')S.prepare(game,stageConfig);state='playing';goals=mode==='tutorial'?[]:mode==='stage'?[{key:'shards',label:'블록 제거',target:stageConfig.target,unit:'칸',xp:40+stageNumber}]:P.missions(material,difficulty);goalDone=[];goalToast=0;feedback=[];impact=null;strategy=P.strategy(game.board,game.material,stageConfig?.sandBurst||10);remaining=180000;elapsed=0;fallTime=0;lockTime=0;lockResets=0;chain=0;phase=null;plan=null;falls=[];particles=[];dropTrail=null;calloutTime=0;gameResultSaved=false;endingReason='';settleCount=0;last=performance.now();screen.hidden=true;replayBest=mode==='tutorial'?null:findRun()?.best??legacyRun()?.score??null;$('callout').classList.remove('show');audioInit();setStatus(selected==='tutorial'?'오른쪽에 맞춰져 있어요. 아래로 빠르게 쓸고 떼어보세요.':'톡 터치하면 회전 · 좌우 이동 · 아래로 쓸고 떼면 낙하');updateHUD();renderPreviews();}
function pause(){
 if(state!=='playing'&&state!=='resolving')return;pausedFrom=state;state='paused';resetInput();screen.hidden=false;screen.className='screen small';showPause();updateHUD();
}
function showPause(){
 const result=P.evaluate(goals,game);
 content.innerHTML=`<div class="screen-kicker">PAUSED</div><h2>잠시 쉬어가세요.</h2><button class="primary" data-screen="resume">계속하기</button><details class="pause-info"><summary>목표와 기록 · ${result.count}/${goals.length}</summary>${goals.map((g,i)=>`<p>${result.done[i]?'✓':'○'} ${g.label} ${Math.min(game[g.key],g.target)}/${g.target}${g.unit}</p>`).join('')}<p>레벨 ${game.level} · 최고 연쇄 ${game.maxChain}<br>제거 ${game.lines}${game.material==='glass'?'줄':'묶음'} · ${game.shards}칸<br>${replayBest===null?'이 판의 첫 기록에 도전 중':'같은 판 최고 '+replayBest.toLocaleString()+'점'}</p><p>${materials[game.material].rule}</p></details><div class="pause-settings"><button class="secondary" data-screen="sound-toggle">소리 ${soundOn?'켬':'끔'}</button><button class="secondary" data-screen="pad-toggle">조작 패드 ${saved.showPad?'켬':'끔'}</button></div><button class="secondary" data-screen="help">설정·도움말</button><button class="secondary" data-screen="retry">같은 판 다시 시작</button><button class="text-btn" data-screen="menu">모드 선택으로</button>`;
}
function resume(){if(state!=='paused')return;state=pausedFrom;screen.hidden=true;last=performance.now();resetInput();updateHUD();}
function finish(reason){if(state==='end')return;if(mode==='stage'&&reason==='stage'){saved.campaign[material]=S.complete(saved.campaign[material],stageNumber);}state='end';endingReason=reason;resetInput();game.active=null;phase=null;screen.hidden=false;screen.className='screen small';if(mode==='tutorial'){saved.learned=true;save();content.innerHTML='<div class="screen-kicker">FIRST RESONANCE</div><h2>균열이 이어졌어요.</h2><p>완성한 줄에서 충격이 퍼져<br>연결된 유리까지 함께 깨집니다.<br>다음에는 직접 길을 만들어보세요.</p><button class="primary" data-screen="start-stage">스테이지 시작</button><button class="secondary" data-screen="tutorial">한 번 더 연습</button>';setStatus('균열이 닿지 않은 조각은 남고, 아래로 내려옵니다.');}
 else{
  const reward=P.evaluate(goals,game),before=P.mastery(saved.mastery[material]),after=P.mastery(before.xp+reward.xp);
  const prev=best(),record=saved.records[bestKey()]||{},prior=findRun(),previous=prior?.last||legacyRun();
  const run={seed:game.seed,score:game.score,lines:game.lines,extra:game.extra,pieces:game.pieces,efficiency:game.pieces?Math.round(game.shards/game.pieces*100)/100:0};
  const delta=previous?game.score-previous.score:null;
  const reflection=delta===null?'첫 기록을 남겼어요. 다음 판에서 더 나은 배치를 찾아보세요.':`같은 판 이전 기록보다 ${signed(delta)}점`;
  const attempts=(Number(prior?.attempts)||(previous?1:0))+1,sameBest=Math.max(Number(prior?.best)||0,Number(previous?.score)||0,run.score);
  if(!gameResultSaved){saved.mastery[material]=after.xp;
   saved.runs=saved.runs.filter(r=>r.mode!==mode||r.seed!==game.seed||(r.material||'glass')!==material||(r.difficulty||'standard')!==(mode==='stage'?'standard':difficulty));
   saved.runs.push({mode,material,difficulty:game.difficulty,seed:game.seed,attempts,best:sameBest,last:run});saved.runs=saved.runs.slice(-12);
   saved.records[bestKey()]={chain:Math.max(Number(record.chain)||0,game.maxChain),extra:Math.max(Number(record.extra)||0,game.extra),last:run};
   saved.best[bestKey()]=Math.max(prev,game.score);if(material==='glass'){if(game.extra>0)saved.badges.fracture=true;if(game.maxChain>=2)saved.badges.cascade=true;if(game.shards>=100)saved.badges.glass100=true;}saved.plays=(Number(saved.plays)||0)+1;save();gameResultSaved=true;
  }
  const rows=[['lines',material==='glass'?'제거한 줄':'제거 묶음',material==='glass'?'줄':'묶음'],['extra',material==='glass'?'추가 파쇄':'제거한 칸','개'],['efficiency','조각당 제거량','개']].map(([key,label,unit])=>`<tr><th scope="row">${label}</th><td>${run[key]}${unit}</td><td>${Number.isFinite(previous?.[key])?signed(Math.round((run[key]-previous[key])*100)/100)+unit:'—'}</td></tr>`).join('');
  content.innerHTML=`<div class="screen-kicker">${game.score>prev?'NEW PERSONAL BEST':'YOUR RESONANCE'}</div><h2>${reason==='stage'?(stageNumber===100?'100 스테이지 완주!':stageNumber+' 스테이지 클리어!'):mode==='stage'?'다시 도전해 보세요.':reason==='time'?'도전 완료.':'다음 연결을 향해.'}</h2><div class="result-score">${game.score.toLocaleString()}</div><div class="run-reflection">${reflection}<br>같은 판 최고 ${sameBest.toLocaleString()}점 · ${attempts}회 도전</div><div class="reward-card"><strong>${reward.count}/${goals.length} 목표 달성 · +${reward.xp} XP</strong><span>${materials[material].name} Lv.${after.level} · ${after.title}${after.level>before.level?' · 승급!':''}</span>${before.level<3&&after.level>=3?'<small>공명 테두리 해금</small>':before.level<5&&after.level>=5?'<small>오로라 테두리 해금</small>':''}</div><details class="goal-results"><summary>이번 판 목표 보기</summary>${goals.map((g,i)=>`<div>${reward.done[i]?'✓':'○'} ${g.label} ${Math.min(game[g.key],g.target)}/${g.target}${g.unit}</div>`).join('')}</details><table class="replay-stats"><caption>직전 동일 조건과 비교</caption><thead><tr><th>기록</th><th>이번</th><th>직전 대비</th></tr></thead><tbody>${rows}</tbody></table><p class="replay-note">조각당 제거량 = 제거한 칸 ÷ 배치한 조각<br>이 모드 최고 연쇄 ${saved.records[bestKey()].chain} · 제거 ${saved.records[bestKey()].extra}</p><p>${reason==='stage'?'목표를 달성했어요. 진행 상황을 이 기기에 저장했습니다.':reason==='time'?'시간이 끝났어요. 같은 조각으로<br>더 큰 연결을 만들어볼까요?':'조각이 입구까지 차올랐어요.<br>다른 배치로 다시 도전해보세요.'}</p>${mode==='stage'&&reason==='stage'&&stageNumber<100?'<button class="primary" data-screen="next-stage">다음 스테이지</button>':''}<button class="${mode==='stage'&&reason==='stage'?'secondary':'primary'}" data-screen="retry">${mode==='stage'?'이 스테이지 다시 도전':'같은 판 최고 기록에 도전'}</button><button class="secondary" ${mode==='stage'?'hidden':''} data-screen="new">${mode==='daily'?'오늘의 도전 다시':'새로운 판 시작'}</button><button class="text-btn" data-screen="menu">모드 선택으로</button>`;
  setStatus(storageWorks?'최근 12개 판의 비교 기록이 이 기기에 저장됩니다.':'브라우저에서 기록 저장이 제한되어 있습니다.');
 }

 badgeUI();updateHUD();renderPreviews();}
function emit(cells){
 const kind=game.material,count=reduced?1:kind==='sand'?14:kind==='water'?7:8,cap=reduced?45:kind==='sand'?340:260;
 for(const c of cells)for(let i=0;i<count&&particles.length<cap;i++){
  const life=(kind==='sand'?500:kind==='water'?780:650)+Math.random()*220;
  particles.push({x:(c.x+.5)*36,y:(c.y+.5)*36,vx:(Math.random()-.5)*(kind==='water'?310:260),vy:-(kind==='sand'?50:90)-Math.random()*160,gravity:kind==='sand'?420:kind==='water'?290:350,life,total:life,size:kind==='sand'?1.3+Math.random()*2:2+Math.random()*4.5,kind,paint:c.cell.paint??0,spark:i%4===0,sprite:Math.floor(Math.random()*8),angle:Math.random()*6.28,color:cellColors(c.cell)[0]});
 }
}
function callout(title,sub){$('callout').innerHTML=`<strong>${title}</strong><span>${sub}</span>`;$('callout').classList.add('show');calloutTime=950;}
function beginClear(p){plan=p;chain++;phase='crack';phaseTime=0;state='resolving';resetInput();tone('clear',chain);if(chain>1)callout(game.material==='sand'?(chain>=5?'MEGA AVALANCHE!':chain>=3?'AVALANCHE!':chain+' CHAIN'):chain+' CHAIN',game.material==='sand'?'산사태 배수 ×'+Math.pow(2,chain-1):'연쇄 배수 ×'+chain);else callout(game.material==='glass'?'RESONANCE':materials[game.material].effect,game.material==='glass'?'균열 파쇄':p.cells.length+'칸 붕괴');setStatus(game.material==='glass'?`${p.rows.length}줄 완성${p.extra?' · 이어진 유리 '+p.extra+'개 파쇄':''}${chain>1?' · '+chain+'연쇄':''}`:`${materials[game.material].effect} · ${p.cells.length}칸 · ${chain}연쇄`);updateHUD();}
function afterPiece(){strategy=P.strategy(game.board,game.material,stageConfig?.sandBurst||10);if(mode==='stage'&&game.shards>=stageConfig.target&&(!stageConfig.gems||game.gems>=stageConfig.gems)){finish('stage');return;}if(mode==='tutorial'&&game.lines>0){finish('tutorial');return;}if((mode==='sprint'||mode==='daily')&&remaining<=0){finish('time');return;}if(!game.spawn()){finish('top');return;}state='playing';chain=0;lockTime=0;lockResets=0;fallTime=0;phase=null;plan=null;falls=[];resetInput();renderPreviews();updateHUD();}
function beginSettle(){phase='settle';phaseTime=0;falls=[];state='resolving';resetInput();}
function lock(){if(!game.active)return;const cells=game.active.cells.map(c=>({x:c.x+game.active.x,y:c.y+game.active.y}));impact={x:cells.reduce((n,c)=>n+c.x+.5,0)/cells.length*36,y:Math.max(...cells.map(c=>c.y+1))*36,life:360,total:360};vibrate(8);game.lock();resetInput();chain=0;settleCount=0;if(game.material!=='glass'){beginSettle();return;}const p=E.clearPlan(game.board);if(p)beginClear(p);else afterPiece();}
function action(a){if(state!=='playing'||!game.active)return false;audioInit();let moved=false;const grounded=!game.fits(game.active,0,1);if(a==='left'||a==='right')moved=game.move(a==='left'?-1:1);else if(a==='rotate'){moved=game.rotate();if(moved){tone('rotate');rebaseBoardDrag();}}else if(a==='down'){moved=game.move(0,1);if(moved){game.score++;fallTime=0;}}else if(a==='drop'){const d=game.dropDistance();dropTrail={cells:game.active.cells.map(c=>({...c,x:c.x+game.active.x,y:c.y+game.active.y})),distance:d,life:170};game.move(0,d);game.score+=d*2;tone('drop');lock();updateHUD();return true;}else if(a==='hold'&&mode!=='tutorial'){moved=game.hold();if(game.over){finish('top');return false;}if(moved){resetInput();lockTime=0;lockResets=0;fallTime=0;renderPreviews();}}
 if(moved&&grounded&&lockResets<12&&(a==='left'||a==='right'||a==='rotate')){lockTime=0;lockResets++;}if(a!=='left'&&a!=='right'&&a!=='rotate')updateHUD();return moved;}
function update(rawDt){const dt=Math.min(100,rawDt);if(state==='playing'||state==='resolving'){elapsed+=rawDt;if(mode==='sprint'||mode==='daily')remaining=Math.max(0,remaining-rawDt);if(state==='playing'&&remaining<=0&&(mode==='sprint'||mode==='daily')){finish('time');return;}if(repeat&&state==='playing'){repeat.time-=dt;let count=0;while(repeat&&repeat.time<=0&&count++<4){const r=repeat;action(r.action);if(repeat===r)r.time+=70;}}if(state==='playing'&&mode!=='tutorial'){if(game.active&&!game.fits(game.active,0,1)){fallTime=0;lockTime+=dt;if(lockTime>=game.lockDelay)lock();}else{fallTime+=dt;lockTime=0;while(state==='playing'&&fallTime>=game.gravity){fallTime-=game.gravity;game.move(0,1);}}}
 if(state==='resolving'){phaseTime+=dt;if(phase==='settle'&&phaseTime>=(42)){phaseTime=0;falls=E.settleStep(game.board,game.material,game.pieces+settleCount++);if(!falls.length){const next=E.materialPlan(game.board,game.material,stageConfig?.sandBurst||10);if(next)beginClear(next);else afterPiece();}}else if(phase==='crack'&&phaseTime>=(260+Math.min(180,Math.max(...plan.cells.map(c=>c.depth))*24))){emit(plan.cells);const result=game.resolve(plan,chain);addFeedback(plan,result.gain);falls=result.falls;plan=null;if(game.material==='glass'){phase='fall';phaseTime=0;}else beginSettle();updateHUD();}else if(phase==='fall'&&phaseTime>=(240)){falls=[];const p=E.clearPlan(game.board);if(p)beginClear(p);else afterPiece();}}}
 if(state!=='paused'){if(goalToast>0)goalToast-=dt;if(impact){impact.life-=dt;if(impact.life<=0)impact=null;}for(const f of feedback)f.life-=dt;feedback=feedback.filter(f=>f.life>0);if(drag?.axis==='y'&&state==='playing')processSwipe(drag,drag.lastX,drag.lastY,performance.now());if(gestureFeedbackTime>0&&!drag){gestureFeedbackTime-=dt;if(gestureFeedbackTime<=0){$('pad-hint').textContent='게임판에서도 똑같이 조작하세요';$('touchpad').classList.remove('drop-ready');}}for(const p of particles){p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=(p.gravity||350)*dt/1000;p.angle+=dt*.002;}particles=particles.filter(p=>p.life>0);if(dropTrail){dropTrail.life-=dt;if(dropTrail.life<=0)dropTrail=null;}if(calloutTime>0){calloutTime-=dt;if(calloutTime<=0)$('callout').classList.remove('show');}}
}
function cellColors(c){if(c?.gem)return['#fff6bd','#b98724'];return game.material==='glass'?(colors[c.type]||colors.I):materialColors[game.material][c.paint??0];}
function softCell(c,x,y,size,options){
 const g=options.context||ctx,[light,dark]=cellColors(c),kind=game.material;if(c.gem){g.save();g.translate(x+size/2,y+size/2);g.rotate(Math.PI/4);const q=size*.28;g.fillStyle='#ffe88c';g.shadowColor='#fff1a8';g.shadowBlur=10;g.fillRect(-q,-q,q*2,q*2);g.strokeStyle='#fff8d0';g.lineWidth=1.5;g.strokeRect(-q,-q,q*2,q*2);g.restore();return;}
 g.save();if(options.alpha!==undefined)g.globalAlpha=options.alpha;
 const margin=size*.06,side=size-margin*2,px=x+margin,py=y+margin;
 if(options.ghost){if(kind==='sand'){g.globalAlpha=options.ready?0.34:0.2;const gg=g.createLinearGradient(px,py,px,py+side);gg.addColorStop(0,light+'55');gg.addColorStop(1,dark+'88');g.fillStyle=gg;g.beginPath();g.moveTo(px,py+side*.42);g.quadraticCurveTo(px+side*.28,py+side*.18,px+side*.5,py+side*.28);g.quadraticCurveTo(px+side*.76,py+side*.18,px+side,py+side*.42);g.lineTo(px+side,py+side);g.lineTo(px,py+side);g.closePath();g.fill();}else{g.fillStyle=light+'18';g.strokeStyle=options.ready?'#ffffff':light;g.lineWidth=options.ready?2.5:1.2;g.beginPath();g.roundRect(px,py,side,side,side*.3);g.fill();g.stroke();}g.restore();return;}
 if(kind==='sand'){
  const boardX=Math.round(x/size),boardY=Math.round(y/size);
  const settled=options.context===undefined&&game.board?.[boardY]?.[boardX]===c;
  const at=(dx,dy)=>settled?game.board?.[boardY+dy]?.[boardX+dx]:null;
  const same=(dx,dy)=>at(dx,dy)&&!at(dx,dy).gem&&at(dx,dy).paint===c.paint;
  const L=same(-1,0),R=same(1,0),U=same(0,-1),D=same(0,1);
  const seed=(c.id*47+(c.paint||0)*83)%101;
  if(!settled){
   // Airborne sand stays a readable tetromino, but looks compressed rather than boxed.
   const top=py+side*(.08+(seed%4)*.015),grad=g.createLinearGradient(px,top,px,py+side);
   grad.addColorStop(0,light);grad.addColorStop(.72,light+'d8');grad.addColorStop(1,dark+'cc');g.fillStyle=grad;
   g.beginPath();g.moveTo(px+side*.04,py+side*.2);g.quadraticCurveTo(px+side*.3,top,px+side*.52,top+side*.025);g.quadraticCurveTo(px+side*.78,top+side*.08,px+side*.96,py+side*.2);g.lineTo(px+side*.94,py+side*.92);g.lineTo(px+side*.06,py+side*.92);g.closePath();g.fill();
  }else{
   // Settled cells visually fuse into one continuous granular terrain.
   const left=L?x:px,right=R?x+size:px+side,bottom=D?y+size:py+side;
   const top=U?y:py+side*(.18+((seed%7)-3)*.012);
   const grad=g.createLinearGradient(0,top,0,bottom);grad.addColorStop(0,light);grad.addColorStop(.7,light+'e0');grad.addColorStop(1,dark+'b8');g.fillStyle=grad;
   g.beginPath();g.moveTo(left,top+(L?0:side*.06));
   if(!U){g.quadraticCurveTo(x+size*.22,top-side*.08,x+size*.48,top);g.quadraticCurveTo(x+size*.75,top+side*.07,right,top+(R?0:side*.05));}
   else g.lineTo(right,top);
   g.lineTo(right,bottom);g.lineTo(left,bottom);g.closePath();g.fill();
   // Cover seams between equal-color cells; no dark cell outline.
   g.fillStyle=light+'d8';if(L)g.fillRect(x-1,top+2,margin+3,Math.max(2,bottom-top-4));if(R)g.fillRect(px+side-2,top+2,margin+4,Math.max(2,bottom-top-4));if(D)g.fillRect(left+2,py+side-3,Math.max(2,right-left-4),margin+5);
  }
  // Fine grains, concentrated lower in the pile.
  const grainTop=settled?(U?y:py+side*.18):py+side*.14;
  for(let n=0;n<(settled?64:38);n++){const q=(seed+n*43)%127,gx=(settled?(L?x:px):px)+(settled?(R?size:side):side)*(((q*19)%91)/100+.045),gy=grainTop+(py+side-grainTop)*(((q*31+n*7)%94)/100);g.globalAlpha=.25+((q%7)*.075);g.fillStyle=n%13===0?'#fff7d7':n%4===0?dark:light;const rr=Math.max(.45,size*(.008+(q%4)*.004));g.beginPath();g.arc(gx,gy,rr,0,Math.PI*2);g.fill();}
  g.globalAlpha=options.alpha===undefined?1:options.alpha;
 }else if(kind==='water'){
  const connected=(dx,dy)=>(options.links||[]).some(d=>d[0]===dx&&d[1]===dy),left=connected(-1,0),right=connected(1,0),up=connected(0,-1),down=connected(0,1);
  const wx=left?x:px,wy=up?y:py,ww=(right?x+size:px+side)-wx,wh=(down?y+size:py+side)-wy,r=size*.24;
  const fill=g.createLinearGradient(0,0,0,720);fill.addColorStop(0,light);fill.addColorStop(1,dark);g.fillStyle=fill;
  g.beginPath();g.roundRect(wx,wy,ww,wh,[!left&&!up?r:0,!right&&!up?r:0,!right&&!down?r:0,!left&&!down?r:0]);g.fill();
  window.GlassArt?.tile(g,c,kind,px,py,side);
  if(!up){g.strokeStyle=light;g.lineWidth=2;g.beginPath();g.moveTo(wx+3,wy+3);g.quadraticCurveTo(wx+ww*.5,wy+(reduced?2:Math.sin(elapsed*.004+c.id)*1.5),wx+ww-3,wy+3);g.stroke();}
  if(c.id%5===0){g.strokeStyle=light+'80';g.lineWidth=1;g.beginPath();g.arc(x+size*.62,y+size*.62,size*.075,0,Math.PI*2);g.stroke();}
 }else{
  const squash=kind==='jelly'&&!reduced?(options.squash||0):0;
  g.translate(x+size/2,y+size/2);g.scale(1+squash,1-squash);g.translate(-x-size/2,-y-size/2);
  if(options.links){g.fillStyle=dark;for(const [dx,dy]of options.links){if(dx)g.fillRect(x+(dx>0?size*.5:0),y+size*.18,size*.5,size*.64);else g.fillRect(x+size*.18,y+(dy>0?size*.5:0),size*.64,size*.5);}}
  if(!window.GlassArt?.tile(g,c,kind,px,py,side)){
  const fill=g.createLinearGradient(px,py,px+side,py+side);fill.addColorStop(0,light);fill.addColorStop(1,dark);g.fillStyle=fill;
  g.beginPath();g.roundRect(px,py,side,side,kind==='jelly'?size*.29:size*.2);g.fill();g.strokeStyle=light+'d0';g.lineWidth=1.1;g.stroke();
  g.strokeStyle='#ffffffa0';g.lineWidth=Math.max(1.2,size*.05);g.lineCap='round';g.beginPath();g.moveTo(px+side*.23,py+side*.2);g.quadraticCurveTo(px+side*.4,py+side*.08,px+side*.58,py+side*.17);g.stroke();
  }
 }
 if(options.hot){g.fillStyle='#ffffff99';g.beginPath();g.roundRect(px,py,side,side,side*.2);g.fill();}
 g.restore();
}
function glass(c,x,y,size=36,options={}){if(game.material!=='glass'){softCell(c,x,y,size,options);return;}const g=options.context||ctx,[light,dark]=colors[c.type]||colors.I;g.save();if(options.alpha!==undefined)g.globalAlpha=options.alpha;const m=Math.max(1.4,size*.055),r=Math.max(2,size*.08),px=x+m,py=y+m,s=size-m*2;
 if(options.ghost){g.fillStyle=light+'20';g.fillRect(px,py,s,s);g.strokeStyle=options.ready?'#f5fff8':light;g.globalAlpha=options.ready?1:.75;g.lineWidth=options.ready?2.5:1.5;g.strokeRect(px+.5,py+.5,s-1,s-1);g.restore();return;}
 if(!window.GlassArt?.tile(g,c,'glass',px,py,s)){
 const fill=g.createLinearGradient(px,py,px+s,py+s);fill.addColorStop(0,light+'a8');fill.addColorStop(.35,dark+'ba');fill.addColorStop(1,dark+'58');g.fillStyle=fill;g.beginPath();g.roundRect(px,py,s,s,r);g.fill();g.strokeStyle=light+'a0';g.lineWidth=.8;g.stroke();g.beginPath();g.moveTo(px+3,py+s-3);g.lineTo(px+3,py+3);g.lineTo(px+s-3,py+3);g.strokeStyle='#ffffff80';g.stroke();g.beginPath();g.moveTo(px+2,py+s*.53);g.lineTo(px+s*.55,py+2);g.lineTo(px+s*.78,py+2);g.lineTo(px+2,py+s*.78);g.closePath();g.fillStyle='#ffffff0e';g.fill();
 }
 if(c.mask){const cx=x+size*.5,cy=y+size*.5;g.beginPath();for(const[dx,dy,bit]of E.DIRS)if(c.mask&bit){g.moveTo(cx,cy);g.lineTo(cx+dx*size*.2+dy*size*.07,cy+dy*size*.2-dx*size*.07);g.lineTo(cx+dx*size*.5,cy+dy*size*.5);}g.strokeStyle='#102332';g.lineWidth=2.5;g.stroke();g.strokeStyle=options.hot?'#ffffff':'#e8ffffe0';g.lineWidth=1.2;g.stroke();g.fillStyle='#eaffff';g.beginPath();g.arc(cx,cy,size*.025,0,Math.PI*2);g.fill();}
 if(options.hot){g.fillStyle='#dbfff588';g.fillRect(px,py,s,s);g.strokeStyle='#ffffff';g.lineWidth=1.5;g.strokeRect(px,py,s,s);}g.restore();}
function resize(){renderRatio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(360*renderRatio);canvas.height=Math.round(720*renderRatio);ctx.setTransform(renderRatio,0,0,renderRatio,0,0);}
function render(){ctx.clearRect(0,0,360,720);const bg=ctx.createLinearGradient(0,0,360,720);bg.addColorStop(0,game.material==='sand'?'#241d19':game.material==='jelly'?'#24192c':'#0e1e2d');bg.addColorStop(1,game.material==='sand'?'#3a2e20':game.material==='jelly'?'#332139':'#102c3b');ctx.fillStyle=bg;ctx.fillRect(0,0,360,720);window.GlassArt?.background(ctx,game.material);ctx.strokeStyle='#8fbed109';ctx.lineWidth=1;ctx.beginPath();for(let x=1;x<10;x++){ctx.moveTo(x*36,0);ctx.lineTo(x*36,720);}for(let y=1;y<20;y++){ctx.moveTo(0,y*36);ctx.lineTo(360,y*36);}ctx.stroke();ctx.fillStyle='#a8d7e91a';for(let x=1;x<10;x++)for(let y=1;y<20;y++)ctx.fillRect(x*36-.7,y*36-.7,1.4,1.4);
 const clearMap=new Map(plan?plan.cells.map(c=>[c.y*10+c.x,c.depth]):[]),fallMap=new Map(falls.map(f=>[f.cell.id,f]));
 for(let y=0;y<20;y++)for(let x=0;x<10;x++){const c=game.board[y][x];if(!c)continue;let yy=y,xx=x,squash=0;const f=fallMap.get(c.id);if(f&&(phase==='fall'||phase==='settle')){const t=Math.min(1,phaseTime/(phase==='settle'?(42):(240))),ease=1-Math.pow(1-t,3);yy=f.from+(f.to-f.from)*ease;xx=(f.fromX??x)+(x-(f.fromX??x))*ease;squash=Math.sin(t*Math.PI)*.14;}const hot=clearMap.has(y*10+x)&&phaseTime>=clearMap.get(y*10+x)*24;const links=game.material!=='glass'&&game.material!=='sand'&&!(f&&phase==='settle')?E.DIRS.filter(([dx,dy])=>game.board[y+dy]?.[x+dx]?.paint===c.paint):null;glass(c,xx*36,yy*36,36,{hot,squash,links});}
 if(game.active&&['playing','paused'].includes(state)){const p=game.active,dy=game.dropDistance();for(const c of p.cells)glass(c,(p.x+c.x)*36,(p.y+c.y+dy)*36,36,{ghost:true,ready:!!drag?.dropReady});for(const c of p.cells)glass(c,(p.x+c.x)*36,(p.y+c.y)*36,36);}
 if(strategy&&state==='playing'){
  ctx.save();
  if(game.material==='sand'){
   // Sand hints should feel embedded in the pile, not like square UI markers.
   const pulse=reduced?.22:.18+.08*(.5+.5*Math.sin(elapsed*.006));
   ctx.globalCompositeOperation='lighter';
   for(const c of strategy.cells){
    const cell=game.board[c.y]?.[c.x];if(!cell)continue;
    const [light]=cellColors(cell),seed=(cell.id*31+c.x*17+c.y*13)%97;
    for(let i=0;i<(reduced?3:7);i++){
     const ox=((seed+i*37)%83)/83*24+6,oy=((seed+i*53)%79)/79*22+7;
     ctx.globalAlpha=pulse*(.65+(i%3)*.14);ctx.fillStyle=i%4===0?'#fff7dc':light;
     ctx.beginPath();ctx.arc(c.x*36+ox,c.y*36+oy,reduced?1:1.15+(i%2)*.45,0,Math.PI*2);ctx.fill();
    }
   }
  }else{
   ctx.strokeStyle='#ffffff80';ctx.lineWidth=1.2;ctx.setLineDash([4,5]);
   for(const c of strategy.cells){ctx.beginPath();ctx.roundRect(c.x*36+3,c.y*36+3,30,30,7);ctx.stroke();}
  }
  ctx.restore();
 }
 if(impact&&!reduced){const t=1-impact.life/impact.total;ctx.save();ctx.globalAlpha=(1-t)*.55;ctx.strokeStyle=game.material==='glass'?'#b7fff0':materialColors[game.material][0][0];ctx.lineWidth=2*(1-t)+.5;ctx.beginPath();ctx.ellipse(impact.x,Math.min(714,impact.y),20+90*t,3+13*t,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(dropTrail&&!reduced){ctx.save();ctx.globalAlpha=dropTrail.life/900;ctx.fillStyle='#c2fff2';for(const c of dropTrail.cells)ctx.fillRect(c.x*36+5,c.y*36,26,(dropTrail.distance+1)*36);ctx.restore();}
 for(const p of particles){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life/400);if(p.spark&&!reduced){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=p.color;ctx.lineWidth=1.4;const arm=p.size*2;ctx.beginPath();ctx.moveTo(-arm,0);ctx.lineTo(arm,0);ctx.moveTo(0,-arm);ctx.lineTo(0,arm);ctx.stroke();ctx.restore();}if(window.GlassArt?.particle(ctx,p)){ctx.restore();continue;}ctx.fillStyle=p.color;ctx.beginPath();if(p.kind==='glass'){ctx.moveTo(-p.size,0);ctx.lineTo(p.size*.7,-p.size*.6);ctx.lineTo(p.size*.2,p.size);ctx.closePath();}else ctx.arc(0,0,p.kind==='sand'?p.size*.45:p.size*.8,0,Math.PI*2);ctx.fill();ctx.restore();}
 for(const f of feedback){const t=1-f.life/f.total;ctx.save();ctx.globalAlpha=Math.min(1,f.life/220);ctx.strokeStyle=f.color;ctx.fillStyle='#f1fff9';
  if(!reduced){
   ctx.save();ctx.globalCompositeOperation='lighter';
   const radius=40+t*160,glow=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,radius);glow.addColorStop(0,f.color+'66');glow.addColorStop(1,f.color+'00');ctx.fillStyle=glow;ctx.globalAlpha=Math.pow(1-t,2)*.65;ctx.fillRect(0,Math.max(0,f.y-radius),360,radius*2);
   ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.globalAlpha=(1-t)*.75;
   for(let i=0;i<f.rays;i++){const angle=i*Math.PI*2/f.rays,near=10+t*100,far=near+22*(1-t)*f.power;ctx.beginPath();ctx.moveTo(f.x+Math.cos(angle)*near,f.y+Math.sin(angle)*near*.6);ctx.lineTo(f.x+Math.cos(angle)*far,f.y+Math.sin(angle)*far*.6);ctx.stroke();}
   for(const row of f.rows){ctx.fillStyle=f.color;ctx.globalAlpha=Math.pow(1-t,3)*.32;ctx.fillRect(0,row*36+14,360,8*(1-t));}
   ctx.globalAlpha=(1-t)*.5;ctx.beginPath();ctx.ellipse(f.x,f.y,25+t*145,10+t*55,0,0,Math.PI*2);ctx.stroke();ctx.restore();
   ctx.lineWidth=3*(1-t)+.5;ctx.beginPath();if(f.kind==='water')ctx.ellipse(f.x,f.y,18+t*105,8+t*32,0,0,Math.PI*2);else ctx.arc(f.x,f.y,12+t*(f.kind==='jelly'?80:65),0,Math.PI*2);ctx.stroke();}
  ctx.font='600 21px sans-serif';ctx.textAlign='center';ctx.fillText('+'+f.gain,Math.max(45,Math.min(315,f.x)),Math.max(30,f.y-12-t*35));ctx.restore();
 }
 if(game.board.slice(0,4).some(row=>row.some(Boolean))&&state!=='menu'){ctx.fillStyle='#ff677811';ctx.fillRect(0,0,360,144);ctx.strokeStyle='#ff9ca360';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(0,144);ctx.lineTo(360,144);ctx.stroke();ctx.setLineDash([]);}}
function previewPiece(g,p,y){if(!p)return;const minX=Math.min(...p.cells.map(c=>c.x)),maxX=Math.max(...p.cells.map(c=>c.x)),minY=Math.min(...p.cells.map(c=>c.y));const size=19,x=(96-(maxX-minX+1)*size)/2;for(const c of p.cells)glass(c,x+(c.x-minX)*size,y+(c.y-minY)*size,size,{context:g});}
function renderPreviews(){
 ['next','next-second','next-third'].forEach((id,i)=>{const g=$(id).getContext('2d'),p=game.queue[i];g.clearRect(0,0,96,96);if(p){const rows=Math.max(...p.cells.map(c=>c.y))-Math.min(...p.cells.map(c=>c.y))+1;previewPiece(g,p,(96-rows*19)/2);}});
 const h=$('held').getContext('2d');h.clearRect(0,0,96,76);previewPiece(h,game.held,15);
}
let resumeAfterPreview=false;
for(const button of document.querySelectorAll('[data-preview]'))button.addEventListener('click',()=>{
 const index=Number(button.dataset.preview),p=game.queue[index];if(!p)return;
 resumeAfterPreview=state==='playing'||state==='resolving';if(resumeAfterPreview)pause();
 $('preview-title').textContent=index===0?'다음 블록':'두 번째 다음 블록';const g=$('preview-large').getContext('2d');g.clearRect(0,0,192,192);g.save();g.scale(2,2);const rows=Math.max(...p.cells.map(c=>c.y))-Math.min(...p.cells.map(c=>c.y))+1;previewPiece(g,p,(96-rows*19)/2);g.restore();$('preview-dialog').showModal();
});
$('close-preview').addEventListener('click',()=>$('preview-dialog').close());
$('preview-dialog').addEventListener('close',()=>{if(resumeAfterPreview){resumeAfterPreview=false;resume();}});
let lastHud=0;function frame(now){const dt=last?Math.max(0,now-last):0;last=now;update(dt);render();if(now-lastHud>200){updateHUD();lastHud=now;}requestAnimationFrame(frame);}
content.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.material&&Object.hasOwn(materials,b.dataset.material)){material=b.dataset.material;saved.material=material;save();menu();return;}
 if(b.dataset.difficulty&&Object.hasOwn(difficulties,b.dataset.difficulty)){difficulty=b.dataset.difficulty;saved.difficulty=difficulty;save();showMenu();updateHUD();return;}
 if(b.dataset.stage){const n=Number(b.dataset.stage),unlocked=S.progress(saved.campaign[material]).unlocked;if(Number.isInteger(n)&&n>=1&&n<=100&&(saved.devMode||n<=unlocked)){stageNumber=n;stageConfig=S.config(n,material);showMenu();updateHUD();}return;}
 if(b.dataset.mode){mode=b.dataset.mode;showMenu();updateHUD();return;}
 const a=b.dataset.screen;
 if(a==='help'){openHelp();return;}
 if(a==='sound-toggle'){toggleSound();if(state==='paused')showPause();return;}
 if(a==='pad-toggle'){saved.showPad=!saved.showPad;save();updateHUD();if(state==='paused')showPause();return;}
 if(a==='last-replay'){const previous=lastReplay();if(previous)start(mode,previous.seed);return;}
 if(a==='next-stage'&&mode==='stage'&&state==='end'&&endingReason==='stage'&&stageNumber<100){stageNumber++;start('stage');return;}
 if(a==='start-stage'){stageNumber=S.progress(saved.campaign[material]).unlocked;start('stage');return;}
 if(a==='start')start();if(a==='start-sprint')start('sprint');if(a==='tutorial')start('tutorial');if(a==='retry')start(mode,game.seed);if(a==='new')start(mode);if(a==='resume')resume();if(a==='menu')menu();
});
// Buttons respond immediately; a held direction uses one repeat owner.
for(const b of document.querySelectorAll('[data-action]')){
 b.addEventListener('pointerdown',e=>{
  if(e.button!==0||b.disabled)return;
  e.preventDefault();b.setPointerCapture?.(e.pointerId);
  const a=b.dataset.action;
  if(['left','right','rotate'].includes(a)){drag=null;$('touchpad').classList.remove('engaged');}
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
  // A deliberate short swipe responds before release; hysteresis absorbs finger jitter.
  if(d.shift===0&&Math.abs(x-d.anchorX)>=12)d.shift=Math.sign(x-d.anchorX);
  while(offset>d.shift+.65)d.shift++;
  while(offset<d.shift-.65)d.shift--;
  if(!moveToColumn(d.originX+d.shift))rebaseBoardDrag();
  if(game.active.x!==before)d.translated=true;
  gestureFeedback('좌우로 밀어 위치를 맞추세요');
 }else if(d.axis==='y'){
  if(d.vertical===1&&dy>0){
   if(age>300||(age>=120&&dy>=24&&dy/age<.28))d.soft=true;
   if(d.soft){
    let steps=Math.min(20,Math.floor((y-d.downAnchor)/d.rowUnit));
    while(steps-->0){d.downAnchor+=d.rowUnit;if(!action('down')){d.downAnchor=y;break;}}
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
  const boardRect=canvas.getBoundingClientRect();
  drag={id:e.pointerId,surface,pieceId:game.active.cells[0].id,startX:e.clientX,startY:e.clientY,anchorX:e.clientX,lastX:e.clientX,lastY:e.clientY,started:performance.now(),originX:game.active.x,shift:0,axis:null,peakDistance:0,soft:false,translated:false,dropReady:false,peakX:0,peakDown:0,downAnchor:e.clientY,unit:Math.max(16,Math.min(34,boardRect.width/10)),rowUnit:Math.max(12,boardRect.height/20)};
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
   const steps=Math.min(20,Math.max(1,Math.floor(dy/d.rowUnit)));for(let i=0;i<steps;i++)if(!action('down'))break;
   gestureFeedback('천천히 내렸어요');
  }
 });
 for(const name of ['pointercancel','lostpointercapture'])surface.addEventListener(name,e=>{
  if(drag?.id===e.pointerId&&drag.surface===surface){drag=null;$('touchpad').classList.remove('engaged','drop-ready');gestureFeedback('취소했어요 · 다시 스와이프하세요');}
 });
}
const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',x:'rotate',X:'rotate',' ':'drop',c:'hold',C:'hold'};document.addEventListener('keydown',e=>{if($('help-dialog').open||$('preview-dialog').open)return;if(e.key==='Escape'||e.key==='p'||e.key==='P'){if(e.repeat)return;e.preventDefault();if(state==='paused')resume();else pause();return;}if(e.target.closest?.('input,select,textarea,[contenteditable]')||e.key===' '&&e.target.closest?.('button,a'))return;const a=keys[e.key];if(!a||state!=='playing')return;e.preventDefault();if(e.repeat||keyHeld.has(e.key))return;keyHeld.add(e.key);action(a);if(['left','right','down'].includes(a)&&state==='playing')repeat={id:e.key,action:a,time:200};});document.addEventListener('keyup',e=>{keyHeld.delete(e.key);if(repeat?.id===e.key)repeat=null;});
$('pause').addEventListener('click',()=>state==='paused'?resume():pause());
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-screen="dev-toggle"]');if(!b)return;saved.devMode=!saved.devMode;save();showMenu();updateHUD();renderPreviews();});
function toggleSound(){soundOn=!soundOn;saved.sound=soundOn;save();updateSound();audioInit();if(soundOn)tone('rotate');}
$('sound').addEventListener('click',toggleSound);
function openHelp(){resumeAfterHelp=state==='playing'||state==='resolving';if(resumeAfterHelp)pause();$('learn').textContent=(resumeAfterHelp||state==='paused')?'조작 연습 시작 · 현재 판 종료':'조작 연습 시작';$('help-dialog').showModal();}
$('help').addEventListener('click',openHelp);function closeHelp(){$('help-dialog').close();} $('close-help').addEventListener('click',closeHelp);$('resume-help').addEventListener('click',closeHelp);$('help-dialog').addEventListener('close',()=>{if(resumeAfterHelp){resumeAfterHelp=false;resume();}});$('learn').addEventListener('click',()=>{resumeAfterHelp=false;closeHelp();start('tutorial');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();pause();}});window.addEventListener('blur',()=>{resetInput();pause();});window.addEventListener('resize',resize);
// Old game caches must not serve the replaced entrypoint.
if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
$('effects-setting').addEventListener('click',()=>{if(systemReduced)return;reduced=!reduced;saved.effects=reduced?'light':'rich';if(reduced){particles=[];feedback=[];impact=null;}save();updateExperience();});
$('haptics-setting').addEventListener('click',()=>{saved.haptics=!saved.haptics;save();updateExperience();vibrate(12);});
window.addEventListener('glassartready',()=>{renderPreviews();render();});
window.addEventListener('glassartready',()=>{if(state==='menu')window.GlassArt?.menu(content);});
resize();updateSound();updateExperience();badgeUI();menu();requestAnimationFrame(frame);
})();

// Fit the mobile board around the actual controls, including wrapped goals.
// Respect the visible bottom edge; never force the board beyond a short viewport.
(() => {
 'use strict';
 if (!window.ResizeObserver) return;
 const section=document.getElementById('play-section');
 const shell=document.querySelector('.app-shell');
 const space=document.querySelector('.play-space');
 const rail=document.querySelector('.piece-rail');
 let pending=false;
 function fit(){
  pending=false;
  if(window.innerWidth>650){section.style.removeProperty('--board-h');return;}
  const viewport=window.visualViewport;
  // Pinch zoom should magnify the board instead of shrinking it again.
  if(viewport&&viewport.scale!==1)return;
  const height=viewport?.height||window.innerHeight;
  const visibleBottom=(viewport?.offsetTop||0)+height;
  const top=space.getBoundingClientRect().top;
  const safeBottom=parseFloat(getComputedStyle(shell).paddingBottom)||0;
  // Mobile uses the available height independently of its ten-column width.
  const target=Math.floor(Math.max(100,visibleBottom-top-safeBottom-4));
  rail.classList.toggle('compact-rail',target<470);
  if(target>0&&section.style.getPropertyValue('--board-h')!==target+'px')section.style.setProperty('--board-h',target+'px');
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(fit);}}
 const observer=new ResizeObserver(schedule);
 for(const el of [shell,space,...section.children])observer.observe(el);
 window.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('scroll',schedule);
 schedule();
})();
