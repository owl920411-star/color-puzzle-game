/* ENDLESS / BLOCK ITEMS V2. CONTROL 16 and NOVICE 7 retained.
 * Item design: DESERT-BLOCK-ITEMS-V2.md.
 */
(() => {
'use strict';
const E=window.GlassEngine,R=window.EndlessRules,B=window.BlockItems,$=id=>document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d'),panel=$('panel'),KEY='glassfall-v1';
const shatterFX=window.CrayonBloomFX?new window.CrayonBloomFX(canvas,{cellSize:36,width:360,height:720,maxParticles:180}):null;
const COLORS={I:['#77c9f4','#2f78c7'],O:['#ffd86e','#e8a72e'],T:['#caa0ef','#8156bd'],S:['#82d89b','#3a9b62'],Z:['#f58db8','#d64d88'],J:['#ffb09a','#dd6f67'],L:['#9fd8f6','#559ed2']};
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function object(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function readStore(){try{return object(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return{};}}
let saved=readStore(),saveOK=true,kind='normal';
function applyBoardSide(){document.body.dataset.boardSide=saved.boardSide==='right'?'right':'left';}
applyBoardSide();
let reduced=systemReduced||saved.effects==='light',run=null,state='menu',beforePause='playing',overlayView='menu',elapsed=0,last=0,fallTime=0,lockTime=0,lockResets=0;
let phase=null,phaseTime=0,pending=null,falls=[],drag=null,repeat=null,heldKeys=new Set(),fx=[],floaters=[],impact=null,trail=null,calloutTime=0;
let toys=null,maxClear=0;
const celebration=window.BloomCelebration?.create({host:$('game-area'),reduced:()=>reduced});
let startRequest=0,training=false,tutorial=null,tutorialInput={source:'other',gesture:'',inputState:''};
const loading=window.BloomLoading?.create({show:html=>showPanel(html,'loading'),prepare:()=>celebration?.preload()??Promise.resolve(true),reduced:()=>reduced});
let currentSeed='',recordBest=0,initialBest=0,finalSaved=false,recordAnnounced=false,lastSave=0,lastHUD=0,audio=null,previewReturn='menu';
const DESERT_LEVELS=[
 {at:0,lv:0,interval:Infinity,mult:1,label:'새 도화지'},
 {at:180000,lv:1,interval:45000,mult:1.10,label:'첫 낙서'},
 {at:300000,lv:2,interval:38000,mult:1.20,label:'색칠 놀이'},
 {at:420000,lv:3,interval:32000,mult:1.35,label:'꽃잎 그리기'},
 {at:540000,lv:4,interval:26000,mult:1.50,label:'별 붙이기'},
 {at:660000,lv:5,interval:21000,mult:1.70,label:'무지개 그림'},
 {at:780000,lv:6,interval:17000,mult:1.90,label:'낙서 축제'},
 {at:900000,lv:7,interval:13000,mult:2.15,label:'가득 핀 그림'},
 {at:1020000,lv:8,interval:11000,mult:2.40,label:'BLOOM MAX'}
];
let desert, itemSystem=B.state('preview'),relicReturn='game';
/* ADAPTIVE DIRECTOR V1 HOOKS */
let adaptive=null,resultHTML='';
function adaptiveRecordKey(){return adaptive?.recordKey()||'normal';}

const DESERT_ITEMS=B.ITEMS;
// Golden Scarab score item was removed; non-score support relics stay available.
const RELICS=['hourglass','sun','eye','hammer','ankh'];
const RELIC_NAMES={hourglass:'쉬어가는 구름',sun:'쓱싹 지우개',eye:'미리보기 색연필',hammer:'톡톡 도장',ankh:'하트 반창고'};
const RELIC_HELP={hourglass:'다음 꽃밭 상승을 10초 늦춰요. 지연은 최대 15초예요.',sun:'가장 아래 적재 줄 하나를 지워요.',eye:'다음 꽃밭 상승의 빈칸 위치를 미리 표시해요.',hammer:'아래 4줄의 가운데 3칸씩을 지워요.',ankh:'치명적인 꽃밭 상승 때 위쪽 4줄을 자동으로 비워요.'};
const RELIC_ICONS={hourglass:'☁',sun:'▱',eye:'✎',hammer:'✿',ankh:'♡'};
function desertCfg(){let d=DESERT_LEVELS[0];for(const x of DESERT_LEVELS)if(elapsed>=x.at)d=x;return d;}
function resetDesert(){document.body.classList.remove('ground-warning');desert={level:0,nextRise:180000,warned:false,lastHoles:[],rises:0,maxLevel:0,lastEscapeUntil:0,delay:0,invincible:false,inventory:Object.fromEntries(RELICS.map(k=>[k,0])),previewHoles:null,relicMeter:0,lastRelicAt:-60000};document.body.dataset.desert='0';itemSystem=B.state(currentSeed+'/block-items-v2');}
function practice(){return itemSystem.practice;}
function markPractice(){itemSystem.practice=true;adaptive?.exclude();recordBest=initialBest;}
function desertRecord(final=false){if(practice()||adaptive?.guest)return;const sec=Math.floor(elapsed/1000);writeStore(s=>{const key=adaptive?.desertKey()||'desertSurvival';s[key]=object(s[key]);const d=s[key];d.bestTime=Math.max(finite(d.bestTime),sec);d.maxLevel=Math.max(finite(d.maxLevel),desert.maxLevel);d.bestScore=Math.max(finite(d.bestScore),run?.score||0);if(final)d.last={seconds:sec,level:desert.level,rises:desert.rises,score:run?.score||0};});}
function boardDanger(){let top=20,holes=0,bump=0,prev=20;for(let x=0;x<10;x++){let h=20;for(let y=0;y<20;y++)if(run.board[y][x]){h=y;break;}top=Math.min(top,h);if(x)bump+=Math.abs(h-prev);prev=h;for(let y=h;y<20;y++)if(!run.board[y][x])holes++;}return{top,holes,bump};}
function fairHoles(){const heights=Array(10).fill(20);for(let x=0;x<10;x++)for(let y=0;y<20;y++)if(run.board[y][x]){heights[x]=y;break;}let choices=[0,1,2,3,4,5,6,7,8,9].sort((a,b)=>heights[b]-heights[a]);choices=choices.filter(x=>!desert.lastHoles.includes(x)).concat(choices.filter(x=>desert.lastHoles.includes(x)));const d=boardDanger();if(d.top<5)choices=choices.filter(x=>heights[x]>=7).concat(choices.filter(x=>heights[x]<7));const first=choices[0],second=Math.max(0,Math.min(9,first+(first<5?1:-1)));const holes=(desert.level<=3||d.top<6)?[first,second]:[first];desert.lastHoles=holes;return holes;}
function itemEligible(){return desert.level>0&&itemSystem.enabled;}
function findSpecials(){return run?B.specials(run.board):[];}
function directorPick(k=null){return itemEligible()?B.pick(run,itemSystem,desert.level,k):null;}
function attachItemToPiece(p,type){return B.attach(p,type,itemSystem);}
function forceNextItem(type){if(!DESERT_ITEMS[type]||!run?.queue[0])return false;markPractice();for(const c of run.queue[0].cells)delete c.special;return attachItemToPiece(run.queue[0],type);}
function maybeSeedNextItem(){if(!itemEligible()||!run?.queue?.[0]||B.liveCount(run)>=B.LIMIT)return;
 // Keep earned rewards until a free slot exists; never discard them.
 if(itemSystem.purify>=2){const p=run.queue[1]||run.queue[0],t=directorPick('good');if(t&&attachItemToPiece(p,t)){itemSystem.purify-=2;callout('깔끔한 그림 선물','다음 블록에 도움 도구가 예약됐습니다');}return;}
 if(run.queue.some(p=>p.cells.some(c=>c.special)))return;const early=elapsed<420000?.55:1,chance=Math.min(.20,(.04+desert.level*.010)*early);if(itemSystem.random()<chance){const t=directorPick();if(t)attachItemToPiece(run.queue[0],t);}
}
function announceItems(events){if(!events.length)return;tone(events.some(e=>e.status==='failed')?'bad':'good');if(!reduced)for(const e of events)shatterFX?.item?.(e,DESERT_ITEMS[e.type]);const names=events.map(e=>DESERT_ITEMS[e.type].label).join(' · '),text=events.map(e=>e.status==='wounded'?'스티커 한 겹 제거 · 남은 줄을 한 번 더 완성':e.status==='purified'?'낙서 정리 · 선물 게이지 +1':e.status==='failed'?`${e.blocks}칸 ${e.type==='seal'?'스티커 덧붙임':'낙서 추가'}`:e.status==='blocked'?'안전한 대상 없음 · 추가 피해 없음':e.status==='removed'?'남은 방해 낙서 제거':e.type==='oasis'?'아래 적재 줄 쓱싹':e.type==='spear'?`아래쪽 ${e.blocks}칸 별빛 지우기`:`주변 ${e.blocks}칸 꽃잎 지우기`).join(' / ');callout(names,text);}
function resolveNormal(p){if(!p)return null;const tx=itemSystem.enabled?B.resolve(run.board,p.rows,p.itemAt??elapsed):{board:run.board,scoringRows:p.rows,events:[],purified:0,extraRemoved:0,falls:null};let result;
 if(itemSystem.enabled){run.board=tx.board;result=run.awardClear(tx.scoringRows.length);result.falls=tx.falls;if(!tx.scoringRows.length)run.noClear();}else result=run.resolve(p);
 itemSystem.purify+=tx.purified;itemSystem.stats.cleared+=tx.events.filter(e=>e.status==='activated'||e.status==='purified').length;itemSystem.stats.removed+=tx.extraRemoved;
 // Score only naturally completed, removable rows. Block effects never add points.
 adaptive?.resolved(p,tx);emitNormal({...p,rows:tx.scoringRows},result);announceItems(tx.events);return result;
}
function itemTick(){if(!itemSystem.enabled||state!=='playing'||toys?.busy)return;const before=adaptive?.board(),events=B.expire(run,itemSystem,elapsed);if(events.length)adaptive?.system('item',before);announceItems(events);}
function awardRelic(reason='SURVIVAL'){if(desert.level===0||elapsed-desert.lastRelicAt<45000)return;const key=RELICS[(desert.rises+run.lines+desert.level)%RELICS.length];if(desert.inventory[key]>=2)return;desert.inventory[key]++;desert.lastRelicAt=elapsed;callout(RELIC_NAMES[key],reason+' 보상 · 획득');hud();}
function useRelic(key){if(toys?.busy||!RELICS.includes(key)||key==='ankh'||!desert.inventory[key]||beforePause==='clearing')return false;
 const adaptiveBefore=adaptive?.board();
 if(key==='hourglass')desert.delay=Math.min(15000,desert.delay+10000);
 else if(key==='sun'){const b=B.removeBottom(run.board,run.active);if(!b){callout('쓱싹 지우개','대상이 없거나 현재 블록과 겹쳐 사용하지 않았습니다');return false;}run.board=b;}
 else if(key==='eye')desert.previewHoles ||= fairHoles();
 else if(key==='hammer')for(let y=16;y<20;y++)for(let x=4;x<=6;x++)run.board[y][x]=null;
 desert.inventory[key]--;adaptive?.system('relic',adaptiveBefore);callout(RELIC_NAMES[key],'도구 사용 · 아이템 추가 점수 없음');hud();return true;
}
function showRelics(){if(!run||kind!=='normal')return;relicReturn=overlayView==='dev'?'dev':'game';if(playing())beforePause=state;state='paused';clearInput();showPanel(`<div class="kicker">DOODLE TOOLBOX</div><h2>낙서 도구함</h2><div class="relic-grid">${RELICS.map(k=>`<button data-relic="${k}" ${!desert.inventory[k]||k==='ankh'||beforePause==='clearing'||toys?.busy?'disabled':''}><b>${RELIC_ICONS[k]} ${RELIC_NAMES[k]} ×${desert.inventory[k]}</b><small>${RELIC_HELP[k]}</small></button>`).join('')}</div><p>보조 도구는 추가 점수를 주지 않습니다.<br>하트 반창고는 치명적인 지반 상승 때 자동 발동합니다.${beforePause==='clearing'?'<br>줄 제거 연출 후 사용할 수 있습니다.':''}</p><button class="primary" data-menu="back">${relicReturn==='dev'?'개발자 모드':'게임으로 돌아가기'}</button>`,'relic');}
function riseGround(){if(!run||state==='clearing'||state==='over'||toys?.busy)return false;const adaptiveBefore=adaptive?.board();const source=B.clone(run.board),holes=desert.previewHoles||fairHoles();const types=Object.keys(COLORS);let topOut=source[0].some(Boolean);const row=Array.from({length:10},(_,x)=>holes.includes(x)?null:{type:types[(x+desert.rises)%7],mask:0,id:++run.serial,desert:true});source.shift();source.push(row);let p=run.active?{...run.active}:null;
 const locate=()=>{if(!p)return true;for(const dy of [0,-1,-2]){const q={...run.active,y:run.active.y+dy};if(B.fits(source,q)){p=q;return true;}}return false;};let safe=locate();
 if(topOut||!safe){if(desert.inventory.ankh>0||desert.invincible){if(!desert.invincible)desert.inventory.ankh--;for(let y=0;y<4;y++)source[y]=Array(10).fill(null);topOut=false;safe=locate();if(!safe&&desert.invincible){for(let y=0;y<20;y++)source[y]=Array(10).fill(null);p=run.active?{...run.active,y:0}:null;safe=true;}}if(topOut||!safe){finish(topOut?'ground_overflow':'ground_active_blocked',{topOut,activeFits:safe,attemptedRows:source.map(r=>r.reduce((m,c,x)=>m|(c?1<<x:0),0))});return false;}}
 run.board=source;run.active=p;adaptive?.system('ground',adaptiveBefore);desert.previewHoles=null;desert.rises++;desert.warned=false;fallTime=lockTime=0;vibrate([18,28,24]);callout('꽃밭이 자라나요!','꽃밭 +1');if(desert.rises%4===0)awardRelic('지반 생존');return true;
}
function desertTick(){if(!playing()||toys?.busy)return;const cfg=desertCfg();if(cfg.lv!==desert.level){desert.level=cfg.lv;desert.maxLevel=Math.max(desert.maxLevel,cfg.lv);document.body.dataset.desert=String(cfg.lv);if(cfg.lv)callout(cfg.lv===8?'BLOOM MAX':'BLOOM LEVEL '+cfg.lv,cfg.label);}
 const left=desert.nextRise+desert.delay-elapsed,warning=left<=3000;document.body.classList.toggle('ground-warning',warning);if(warning&&!desert.warned){desert.warned=true;vibrate(8);}if(left>3000)desert.warned=false;
 // Never change the board while its line-clear transaction is pending.
 if(cfg.lv&&left<=0&&state==='playing'){desert.delay=0;if(riseGround()){const next=adaptive?.interval(cfg.interval)??cfg.interval;desert.nextRise=elapsed+next;desert.adaptiveInterval=next;}}
}
function jumpTime(ms){markPractice();elapsed=Math.max(0,ms);const c=desertCfg();desert.level=c.lv;desert.maxLevel=Math.max(desert.maxLevel,c.lv);desert.nextRise=c.lv?elapsed+c.interval:180000;desert.delay=0;desert.warned=false;document.body.dataset.desert=String(c.lv);document.body.classList.remove('ground-warning');for(const q of findSpecials())if(q.s.deadline&&!q.s.failed)q.s.deadline=elapsed+(DESERT_ITEMS[q.s.type].duration||0);}
function freshPractice(){markPractice();clearInput();toys?.cancel();B.strip(run);run.board=B.blank();run.over=false;run.active=null;run.spawn();phase=pending=null;falls=[];fx=[];floaters=[];trail=impact=null;fallTime=lockTime=lockResets=0;beforePause='playing';state='paused';itemSystem.enabled=true;}
function loadPreset(type){if(kind!=='normal')return;freshPractice();const cell=(x,y)=>({type:Object.keys(COLORS)[(x+y)%7],mask:0,id:++run.serial,desert:true});for(let y=0;y<20;y++)for(let x=0;x<10;x++){const put=type==='high'?y>=11&&(x+y)%5!==0:type==='holes'?y>=9&&(x*3+y)%4!==0:type==='left'?y>=5&&x<5&&(x+y)%3:type==='right'?y>=5&&x>=5&&(x+y)%3:type==='ceiling'?y>=2&&x!==4&&x!==5:type==='rise'?y>=12&&(x+y)%4!==0:type==='max'?y>=9&&(x*2+y)%5!==0:false;if(put)run.board[y][x]=cell(x,y);}if(type==='max')jumpTime(1020000);if(type==='rise'){jumpTime(180000);desert.nextRise=elapsed+3000;}hud();}
function itemScenario(type){if(!DESERT_ITEMS[type])return;freshPractice();const cell=()=>({type:'J',mask:0,id:++run.serial});if(type==='spear'){for(let x=0;x<10;x++)if(x!==4)run.board[12][x]=cell();for(let y=13;y<20;y++)run.board[y][5]=cell();run.board[15][4]=cell();attachItemToPiece({cells:[run.board[12][5]]},type);B.arm(run.board,elapsed);run.active={type:'I',size:4,x:4,y:0,cells:[0,1,2,3].map(y=>({...cell(),type:'I',x:0,y}))};hud();return;}for(let x=0;x<10;x++)if(x!==4)run.board[18][x]=cell();for(const x of [1,2,5,6,7])run.board[19][x]=cell();for(const x of [3,5,6])run.board[17][x]=cell();const target=run.board[18][5];attachItemToPiece({cells:[target]},type);B.arm(run.board,elapsed);run.active={type:'I',size:4,x:4,y:0,cells:[0,1,2,3].map(y=>({...cell(),type:'I',x:0,y}))};hud();}
function instantItem(type){
 if(!DESERT_ITEMS[type])return;itemScenario(type);if(type==='scarabCurse')run.board[17][5]=null;resume();
 if(DESERT_ITEMS[type].duration){const q=findSpecials().find(q=>q.s.type===type);q.s.deadline=elapsed||1;announceItems(B.expire(run,itemSystem,q.s.deadline));hud();}
 else action('drop');
}
function runSim(){const t=B.regression(300);showPanel(`<div class="kicker">REAL BOARD REGRESSION</div><h2>${t.cases}개 보드 연산 검사</h2><div class="rule-box">${t.pass?'통과':'실패'} · 오류 ${t.failures.length}<br>검사: 보드 크기·셀 ID 중복·원본 보드 보존·겹친 스티커의 줄 판정</div><p>${t.scope}<br>이전 생존시간 근사 계산은 이번 아이템의 검증 근거로 사용하지 않습니다.</p><button class="primary" data-menu="back">개발자 모드</button>`,'sim');}
function desertChecklist(){showPanel('<div class="kicker">PLAN TRACKER</div><h2>도움 도구와 방해 낙서</h2><div class="rule-box">구현: 6종 보드 효과 / 점수 아이템 제거 / NEXT 예고 / 착지 타이머 / 낙서 정리 선물 예약 / 연습 프리셋<br><br>남음: 실제 휴대폰 조작·연출 평가 / 초보 7분 목표 보정 / 실전 엔진을 사용하는 대량 BOT</div><p>좋은 도구 3종과 방해 낙서 3종의 기존 보드 효과를 유지합니다. 구현과 검증 완료는 구분합니다.</p><button class="primary" data-menu="back">개발자 모드</button>','audit');}
function devPanel(){if(kind!=='normal')return;const d=boardDanger();showPanel(`<div class="kicker">DEV LAB · BLOCK ITEMS V2</div><h2>블록 아이템 테스트</h2>${adaptive?.button()||''}<div class="rule-box">${timeText()} · BLOOM ${desert.level} · 높이 ${20-d.top}/20 · 구멍 ${d.holes}<br>${practice()?'연습 기록 · 최고점 저장 제외':'정상 기록 · 상태를 바꾸면 연습으로 전환'}<br>생성 ${itemSystem.stats.spawned} / 성공 ${itemSystem.stats.cleared} / 실패 ${itemSystem.stats.failed}<br>정리 ${itemSystem.purify}/2 · 활성 ${B.liveCount(run)}/${B.LIMIT}</div><p>이름을 누르면 연습판을 준비하고, 즉시 발동을 누르면 바로 효과를 보여줍니다. 방해 낙서는 시간이 지나면 방해 효과가 발생합니다.</p><div class="item-force-grid">${Object.entries(DESERT_ITEMS).map(([k,v])=>`<button data-menu="itemscenario" data-v="${k}">${window.BloomItemArt?.html(k)||v.icon} ${v.label}</button><button data-menu="iteminstant" data-v="${k}" aria-label="${v.label} 즉시 발동">즉시 발동</button>`).join('')}</div><div class="settings-row"><button data-menu="forcegood">NEXT GOOD</button><button data-menu="forcebad">NEXT BAD</button><button data-menu="itemtoggle">아이템 ${itemSystem.enabled?'ON':'OFF'}</button></div><div class="settings-row"><button data-menu="itemdeadline">방해까지 1초</button><button data-menu="itemcombo">MAX 복합판</button><button data-menu="devinv">무적 ${desert.invincible?'ON':'OFF'}</button></div><div class="item-force-grid">${[0,3,5,7,9,11,13,15,17,30].map(m=>`<button data-menu="devtime" data-v="${m*60000}">${m===17?'MAX 17분':m+'분'}</button>`).join('')}</div><div class="settings-row"><button data-menu="devrise">지반 +1</button><button data-menu="devrelic">보조 도구 지급</button><button data-menu="devrelicview">도구함</button></div><div class="item-force-grid">${[['high','높은 적재'],['holes','구멍판'],['left','좌측 위험'],['right','우측 위험'],['ceiling','천장 직전'],['rise','상승 직전'],['max','MAX 위험']].map(([k,v])=>`<button data-menu="preset" data-v="${k}">${v}</button>`).join('')}</div><div class="settings-row"><button data-menu="devsim">보드 연산 검사</button><button data-menu="devaudit">기획 체크리스트</button></div><button class="primary" data-menu="back">게임으로 돌아가기</button><p class="storage-note">점수 추가·배수 아이템 없음. 조작 CONTROL 23 최종 후보 / 기존 기본 난이도 유지.</p>`,'dev');}
let ghost=null;
const playing=()=>state==='playing'||state==='clearing';
const canAct=()=>state==='playing'&&run?.active&&!toys?.busy;
const pieceID=()=>run?.active?.cells[0]?.id;
const finite=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
const touchLevel=()=>Math.max(1,Math.min(10,Math.round(Number(saved.touchSensitivity10)||Number(saved.touchSensitivity)*2||6)));
const touchScale=()=>[0,.72,.78,.84,.90,.96,1.02,1.09,1.16,1.24,1.34][touchLevel()];
function writeStore(change){try{const fresh=readStore();change(fresh);localStorage.setItem(KEY,JSON.stringify(fresh));saved=fresh;saveOK=true;}catch{saveOK=false;}}
function pref(key,value){saved[key]=value;writeStore(s=>{s[key]=value;});}
function loadBest(){recordBest=finite(object(object(readStore().endlessV1)[adaptiveRecordKey()]).best);initialBest=recordBest;}
function rememberScore(final=false){
 if(!run||state==='menu')return;if(practice()||adaptive?.guest){lastSave=performance.now();return;}
 recordBest=Math.max(recordBest,run.score);
 writeStore(s=>{
  s.endlessV1=object(s.endlessV1);const key=adaptiveRecordKey(),r=object(s.endlessV1[key]);r.best=Math.max(finite(r.best),recordBest);recordBest=r.best;
  if(final&&!finalSaved){r.plays=finite(r.plays)+1;r.last={score:run.score,seconds:Math.floor(elapsed/1000),lines:run.lines,combo:run.maxCombo};}
  s.endlessV1[key]=r;
 });
 if(final)finalSaved=true;
 lastSave=performance.now();
}
function seed(){const n=new Uint32Array(2);if(window.crypto?.getRandomValues)window.crypto.getRandomValues(n);else{n[0]=Math.random()*4294967295;n[1]=Date.now();}return'ENDLESS-'+Array.from(n,x=>x.toString(36)).join('-');}
function name(){return'CRAYON BLOOM';}
function timeText(){const n=Math.floor(elapsed/1000);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
function clearInput(){
 const d=drag;if(d?.timer)clearTimeout(d.timer);drag=null;repeat=null;heldKeys.clear();
 if(d&&canvas.hasPointerCapture?.(d.id))try{canvas.releasePointerCapture(d.id);}catch{}
 for(const b of document.querySelectorAll('[data-action]'))b.classList.remove('pressed');
}
function fit(){
 const app=$('app'),style=getComputedStyle(app),width=app.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
 const rail=Math.max(54,Math.min(72,width*.20)),gap=parseFloat(style.gap)||0;
 const available=app.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-document.querySelector('.topbar').offsetHeight-document.querySelector('.scorebar').offsetHeight-document.querySelector('footer').offsetHeight-gap*3;
 const bw=Math.max(40,Math.floor(Math.min(width-rail-9,available/2)));
 document.documentElement.style.setProperty('--rail',rail+'px');document.documentElement.style.setProperty('--board-width',bw+'px');document.documentElement.style.setProperty('--board-height',bw*2+'px');
 const ratio=Math.min(devicePixelRatio||1,2);canvas.width=360*ratio;canvas.height=720*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);if(run)draw();
}
function showPanel(html,view){tutorial?.setPaused(true);celebration?.clear();window.BloomAudio?.scene(view==='menu'?'home':view==='over'?'over':'paused');if(view==='over')resultHTML=html;overlayView=view;panel.dataset.view=view;panel.innerHTML=html;$('overlay').hidden=false;$('app').inert=true;panel.focus({preventScroll:true});}
function hidePanel(){tutorial?.setPaused(false);window.BloomAudio?.scene('game');$('overlay').hidden=true;panel.innerHTML='';$('app').inert=false;overlayView='';}
function ruleHTML(){return'<b>줄 제거 점수</b><br>1줄 100 · 2줄 300 · 3줄 500 · 4줄 800점<br>줄 제거 점수 × 현재 레벨<br>연속으로 제거하면 두 번째부터 콤보 보너스<br>+50 × (연속 제거 횟수 − 1) × 레벨<br>천천히 하강: 칸당 1점 · 쏙 내려요: 칸당 2점<br>10줄마다 낙하 레벨 상승<br><br><b>도움 도구와 방해 낙서</b><br>아이템으로 추가 제거한 칸·줄에는 점수나 콤보가 붙지 않습니다.<br>방해 낙서를 제때 정리하면 좋은 블록 예약 게이지가 쌓입니다.<br>스티커의 첫 겹 제거는 줄 제거 점수를 주지 않습니다.<br><br><b>장난 친구들</b><br>시작할 때 통통이, 이후 플레이 1분마다 뚱뚱이 → 겁쟁이 → 낙서쟁이 → 통통이가 차례로 나와요.<br>쉬는 동안에는 시간이 멈추며, 다음 블록과 보관에서도 친구의 모습이 유지돼요.';}
function menu(){
 startRequest++;loading?.cancel();
 celebration?.clear(); adaptive?.end('menu');
 if(playing()||state==='paused')rememberScore();tutorial?.stop();training=false;clearInput();toys=null;shatterFX?.clear();state='menu';phase=null;pending=null;falls=[];fx=[];floaters=[];trail=null;impact=null;elapsed=0;calloutTime=0;$('callout').classList.remove('show');resetDesert();
 loadBest();run=new R.NormalGame('preview');
 for(let x=0;x<10;x++)for(let y=19;y>=19-(x%3);y--)run.board[y][x]={type:Object.keys(COLORS)[(x+y)%7],mask:0,id:1000+y*10+x};
 run.active=null;showMenu();hud();draw();
}
function showMenu(){
 showPanel(window.CrayonHome.render({kind,best:recordBest}),'menu');
}
async function requestStart(retry=false,replay=false){
 if(state==='loading')return;initAudio();const request=++startRequest;
 if(playing()||state==='paused')rememberScore();clearInput();state='loading';
 const result=loading?await loading.run():{cancelled:false};
 if(result.cancelled||request!==startRequest)return;start(retry,!!tutorial&&(replay||saved.tutorialCompleted!==true));
}
function start(retry=false,asTraining=false){
 celebration?.clear(); adaptive?.end('restart');
 if(playing()||state==='paused')rememberScore();tutorial?.stop();training=asTraining;clearInput();currentSeed=retry&&currentSeed?currentSeed:seed();
 maxClear=0;run=new R.NormalGame(currentSeed);toys=!training&&window.ToyBlocks?new window.ToyBlocks.System(run,{onLock:placeNormal,onDone:completeNormal,learned:{...object(saved.toyLearned)},guidanceHidden:saved.toyGuidanceHidden===true,onGuidanceLearned:()=>pref('toyGuidanceHidden',true),onEncounter:k=>{pref('toyLearned',{...object(saved.toyLearned),[k]:true});}}):null;watchAudioRun();
 state='playing';beforePause='playing';elapsed=fallTime=lockTime=lockResets=0;resetDesert();phase=null;pending=null;falls=[];fx=[];floaters=[];impact=trail=ghost=null;shatterFX?.clear();calloutTime=0;recordAnnounced=false;finalSaved=false;
 if(training){itemSystem.practice=true;itemSystem.enabled=false;desert.nextRise=Infinity;Object.defineProperty(run,'gravity',{get:()=>Infinity});Object.defineProperty(run,'lockDelay',{get:()=>Infinity});watchTutorialRun();}else adaptive?.begin();loadBest();maybeSeedNextItem();$('best').parentElement.classList.remove('record');last=performance.now();lastSave=last;hidePanel();$('callout').classList.remove('show');initAudio();hud();draw();if(training)tutorial.start();
}
function pause(){if(!playing())return;beforePause=state;state='paused';document.body.classList.remove('ground-warning');clearInput();rememberScore();pausePanel();hud();}
function pausePanel(){showPanel(`<img class="paper-chick" src="assets/bloom-chick.webp?v=cb-rc2" alt="" width="72" height="72"><div class="kicker">잠깐 쉬는 시간</div><h2>잠깐 쉬어갈까요?</h2><div class="result-meta">현재 ${run.score.toLocaleString()}점 · 최고 ${recordBest.toLocaleString()}점<br>플레이 ${timeText()}${practice()?' · 연습 기록':''}</div><button class="primary" data-menu="resume">계속하기</button><button class="secondary" data-menu="settings">놀이 방법 · 설정</button><button class="secondary" data-menu="retry">같은 판 다시 시작</button><button class="text-button" data-menu="menu">처음 화면으로</button>`,'pause');}
function resume(){if(state!=='paused')return;clearInput();state=beforePause==='clearing'?'clearing':'playing';last=performance.now();hidePanel();hud();}
function finish(reason='unknown',detail=null){
 if(state!=='over'){adaptive?.terminal(reason,detail);adaptive?.end('gameover');}
 if(state==='over')return;toys?.cancel();state='over';document.body.classList.remove('ground-warning');clearInput();run.active=null;phase=null;pending=null;desertRecord(true);rememberScore(true);
 const ds=object(readStore()[adaptive?.desertKey()||'desertSurvival']);showPanel(`<div class="kicker">${practice()?'연습 그림':run.score>initialBest?'새 기록!':'오늘의 그림'}</div><img class="result-friends" src="assets/${!practice()&&run.score>initialBest?'bloom-happy.webp':'bloom-home-hero.webp'}?v=cb-rc2" alt="크레용을 든 아기와 병아리" width="240" height="180"><h2>${!practice()&&run.score>initialBest?'활짝! 새 기록이에요':'한 번 더 그려볼까요?'}</h2><div class="result-score" data-best="${!practice()&&run.score>initialBest}">${run.score.toLocaleString()}<small style="font-size:17px"> 점</small></div><div class="result-best">BEST <strong>${recordBest.toLocaleString()}</strong></div><p class="result-achievement">${run.maxCombo>1?`이번 그림의 반짝임 · ${run.maxCombo}번 연속으로 지웠어요`:maxClear>0?`이번 그림의 반짝임 · 한 번에 ${maxClear}줄을 지웠어요`:`이번 그림 · 블록 ${run.pieces}개를 놓았어요`}</p><div class="result-meta">제거 ${run.lines}줄 · 최대 ${run.maxCombo}연속 제거<br>플레이 ${timeText()}<br>BLOOM ${desert.level===8?'MAX':'LV.'+desert.level} · 지반 ${desert.rises}회<br>최고 생존 ${Math.floor(finite(ds.bestTime)/60)}:${String(Math.floor(finite(ds.bestTime)%60)).padStart(2,'0')} · 최고 BLOOM LV.${finite(ds.maxLevel)}</div>${adaptive?.button()||''}<button class="primary" data-menu="new">다시 하기</button><button class="secondary" data-menu="retry">같은 판 다시 도전</button><button class="text-button" data-menu="menu">처음 화면으로</button><p class="storage-note">${adaptive?.guest?'임시 플레이는 기록과 개인 프로필에 저장하지 않습니다.':practice()?'개발자 조작을 사용한 판은 최고 기록에 저장되지 않습니다.':saveOK?'최고 점수는 이 기기·브라우저에 저장됩니다.':'이 브라우저에서는 기록을 저장하지 못했습니다.'}</p>`,'over');tone('over');hud();
}
function settings(){
 if(playing()){beforePause=state;state='paused';clearInput();rememberScore();}
 const toggle=(key,label,on,disabled=false)=>`<button class="paper-toggle" data-menu="${key}" aria-pressed="${on}" ${disabled?'disabled':''}><span>${label}</span><span class="toggle-state">${key==='effects'?(on?'풍부':'간결'):(disabled&&(key==='bgm'||key==='sfx')?'전체 소리 꺼짐 · 저장 '+(on?'켬':'끔'):(on?'켬':'끔'))}</span><svg viewBox="0 0 28 28" aria-hidden="true"><path class="toggle-ring" d="M14 2C29 1 30 26 14 26 0 27-2 3 14 2Z"/><path class="toggle-check" d="m7 14 5 6L22 8"/></svg></button>`;
 showPanel(`<div class="paper-options"><header><img class="paper-chick" src="assets/bloom-chick.webp?v=cb-rc2" alt="" width="54" height="54"><div class="kicker">그림책 뒤쪽</div><h2>놀이 방법 · 설정</h2></header><h3>소리</h3>${toggle('sound','전체 소리',saved.sound!==false)}${toggle('bgm','배경음',saved.bgm!==false,saved.sound===false)}${toggle('sfx','효과음',saved.sfx!==false,saved.sound===false)}${saved.sound===false?'<p role="status">전체 소리가 꺼져 있어요. 배경음·효과음 설정은 보관되며, 전체 소리를 켜면 적용돼요.</p>':''}<h3>화면 배치</h3><div class="settings-row" role="group" aria-label="게임판 위치"><button data-menu="board-side" data-v="left" aria-pressed="${saved.boardSide!=='right'}">게임판 왼쪽<br><small>쏙! 오른쪽</small></button><button data-menu="board-side" data-v="right" aria-pressed="${saved.boardSide==='right'}">게임판 오른쪽<br><small>쏙! 왼쪽</small></button></div><h3>느낌</h3>${toggle('haptics','진동',!!saved.haptics,typeof navigator.vibrate!=='function')}${toggle('effects','효과',!reduced,systemReduced)}<h3>도움</h3><button class="secondary" data-menu="tutorial">튜토리얼 다시 보기</button><details class="paper-rules"><summary>조작과 점수 알아보기</summary><p>짧게 톡! 한 칸 이동<br>꾹 누르면 휘리릭!<br>옆으로 슥! 회전 · 위로 보관 · 아래로 쏙!</p><div class="rule-box">${ruleHTML()}</div></details>${adaptive?.button()||''}<button class="text-button" data-menu="back">${state==='paused'?'게임으로 돌아가기':'뒤로'}</button><p class="storage-note">${saveOK?'기록은 이 기기·브라우저에 저장돼요.':'저장이 제한되어 있습니다. 이번 점수는 화면에서 확인해 주세요.'}</p></div>`,'settings');hud();
}
panel.addEventListener('click',e=>{
 const relic=e.target.closest('[data-relic]');if(relic){if(!relic.disabled&&useRelic(relic.dataset.relic)){if(relicReturn==='dev')devPanel();else resume();}return;}
 const b=e.target.closest('button[data-menu]');if(!b||b.disabled)return;const a=b.dataset.menu;initAudio();
 if(a==='normal'){kind='normal';pref('material','glass');menu();}
 else if(a==='start'||a==='new')requestStart();else if(a==='retry')requestStart(true);else if(a==='resume')resume();else if(a==='menu')menu();else if(a==='settings')settings();
 else if(a==='board-side'&&['left','right'].includes(b.dataset.v)){clearInput();pref('boardSide',b.dataset.v);applyBoardSide();fit();settings();}
 else if(a==='tutorial')requestStart(false,true);
 else if(a==='sound'){pref('sound',saved.sound===false);initAudio();settings();}else if(a==='bgm'||a==='sfx'){pref(a,saved[a]===false);window.BloomAudio?.configure(saved);initAudio();settings();}else if(a==='haptics'){pref('haptics',!saved.haptics);settings();}
 else if(a==='effects'&&!systemReduced){reduced=!reduced;pref('effects',reduced?'light':'rich');settings();}
 else if(a==='touch-down'){pref('touchSensitivity10',Math.max(1,touchLevel()-1));settings();}
 else if(a==='touch-up'){pref('touchSensitivity10',Math.min(10,touchLevel()+1));settings();}
 else if(a==='preset'){loadPreset(b.dataset.v);devPanel();}
 else if(a==='devtime'){jumpTime(Number(b.dataset.v)||0);resume();}
 else if(a==='iteminstant'){instantItem(b.dataset.v);}
 else if(a==='itemscenario'){itemScenario(b.dataset.v);devPanel();}
 else if(a==='itemdeadline'){markPractice();let q=findSpecials().find(q=>DESERT_ITEMS[q.s.type].duration);if(!q){itemScenario('scarabCurse');q=findSpecials()[0];}q.s.deadline=elapsed+1000;q.s.failed=false;devPanel();}
 else if(a==='itemcombo'){loadPreset('max');B.strip(run);forceNextItem('sunburst');attachItemToPiece(run.queue[1],'seal');devPanel();}
 else if(a==='itemtoggle'){markPractice();itemSystem.enabled=!itemSystem.enabled;if(!itemSystem.enabled){B.strip(run);itemSystem.purify=0;}devPanel();}
 else if(a==='forceitem'){forceNextItem(b.dataset.v);devPanel();}
 else if(a==='forcegood'||a==='forcebad'){const pool=Object.keys(DESERT_ITEMS).filter(k=>DESERT_ITEMS[k].kind===(a==='forcegood'?'good':'bad'));forceNextItem(pool[Math.floor(itemSystem.random()*pool.length)]);devPanel();}
 else if(a==='devaudit'){desertChecklist();}
 else if(a==='devsim'){runSim();}
 else if(a==='devrelicview'){showRelics();}
 else if(a==='devrise'){markPractice();if(beforePause==='clearing'){callout('줄 제거 처리 중','게임으로 돌아가 제거가 끝난 뒤 사용해 주세요');devPanel();}else{state='playing';riseGround();if(state!=='over'){state='paused';devPanel();}}}
 else if(a==='devinv'){markPractice();desert.invincible=!desert.invincible;devPanel();}
 else if(a==='devrelic'){markPractice();for(const k of RELICS)desert.inventory[k]=Math.max(1,desert.inventory[k]);devPanel();}
 else if(a==='devdanger'){loadPreset('ceiling');devPanel();}
 else if(a==='back'){if(overlayView==='adaptive'){adaptive?.back();}else if(overlayView==='relic'){if(relicReturn==='dev')devPanel();else resume();}else if(['sim','audit'].includes(overlayView)){devPanel();}else if(overlayView==='dev'){resume();}else if(overlayView==='preview'){if(previewReturn==='playing')resume();else if(previewReturn==='pause')pausePanel();else showMenu();}else if(state==='paused')resume();else if(state==='over')menu();else showMenu();}
});
function hud(){
 if(!run)return;document.body.dataset.kind=kind;$('mode-label').textContent=name()+' · '+(practice()?'연습 모드':'무한 모드');
 if(state!=='menu'&&!practice())recordBest=Math.max(recordBest,run.score);
 $('score').textContent=(state==='menu'?0:run.score).toLocaleString();$('best').textContent=recordBest.toLocaleString();$('time').textContent=timeText();
 $('score').style.fontSize=run.score>=1e9?'14px':'';$('best').style.fontSize=recordBest>=1e9?'14px':'';
 $('pace-label').textContent=desert.level?'BLOOM '+(desert.level===8?'MAX':'LV.'+desert.level):'LEVEL '+run.level;
 $('rotate').hidden=false;for(const b of document.querySelectorAll('[data-action]'))b.disabled=!canAct()||(b.dataset.action==='hold'&&run.holdUsed);
 $('pause').disabled=!playing();$('notice').textContent=`제거 ${run.lines}줄 · 연속 ${run.combo||0}회`;
 if(!toys?.guidanceHidden&&run.active?.toy&&toys?.intro?.id===run.active.toy.id)$('notice').textContent=window.ToyBlocks.LABELS[run.active.toy.kind]+' · '+({bouncy:'점선 칸으로 통! 옆으로 튀어요',fat:'＋칸까지 뿌웅! 몸이 커져요',coward:'화살표 쪽으로 한 칸 피해요',doodle:'빗금 칸에 슥삭! 낙서를 남겨요'}[run.active.toy.kind]);
 if(desert.level>0){const left=Math.max(0,Math.ceil((desert.nextRise+desert.delay-elapsed)/1000));$('notice').textContent=`지반 상승 ${left}초 · 정리 ${itemSystem.purify}/2${practice()?' · 연습':''}`;}
 if(!saveOK)$('notice').textContent='기록 저장이 제한되어 있습니다.';
 for(const [id,p]of [['next',run.queue[0]],['next2',run.queue[1]],['held',run.held]]){const c=$(id),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);if(p)normalPreview(g,p,c.width,c.height);}
}
function rebase(){if(!drag||!run.active)return;drag.originX=run.active.x;drag.anchorX=drag.lastX;drag.shift=0;drag.piece=pieceID();drag.downAnchor=drag.lastY;}
function carry(){return false;} // CONTROL 23 freeze: a replacement piece never inherits a gesture.

function moveTo(x){
 if(!run.active)return false;
 const target=Math.round(x);let steps=0;while(run.active.x!==target&&steps++<20){if(!action(target>run.active.x?'right':'left'))break;}return run.active.x===target;
}
function restore(){if(!drag||!drag.noRelease||!run.active)return;moveTo(drag.lane);rebase();}
function nextNormal(){
 clearInput();
 phase=null;pending=null;falls=[];state='playing';fallTime=lockTime=lockResets=0;
 desertTick();if(state==='over')return;
 if(!run.spawn()){finish('spawn_collision');return;}maybeSeedNextItem();restore();hud();
}
function lockNormal(keep=false){
 if(!run.active||toys?.busy)return;if(!keep)clearInput();
 if(toys?.begin()){hud();return;}
 placeNormal();completeNormal();
}
function placeNormal(){
 adaptive?.beforeLock();
 const p=run.active;impact={x:(p.x+1.5)*36,y:(p.y+Math.max(...p.cells.map(c=>c.y))+1)*36,life:340,total:340};
 run.lock();adaptive?.locked();B.arm(run.board,elapsed);vibrate(7);
}
function completeNormal(){
 pending=R.linePlan(run.board);
 if(pending){pending.itemAt=elapsed;state='clearing';phase='flash';phaseTime=0;hud();}
 else{run.noClear();adaptive?.resolved(null,null);nextNormal();}
}
function action(a){
 if(!canAct())return false;initAudio();let moved=false;
 const grounded=!run.fits(run.active,0,1);
 if(a==='left'||a==='right'){moved=run.move(a==='left'?-1:1);if(moved)moveTone();}
 else if(a==='rotate'||a==='rotateCCW'){
  const beforeX=run.active.x,hadDrag=!!drag,target=hadDrag&&Number.isFinite(drag.virtualX)?drag.virtualX:null;
  moved=a==='rotateCCW'&&run.rotateDir?run.rotateDir(-1):run.rotate();if(moved)tone('rotate');
  if(drag){
   // CONTROL 9: preserve the finger's virtual target through wall-kick rotation.
   // A wall kick may move the piece inward by one cell, but the thumb must not
   // be pushed farther off-screen to recover that cell.
   const kick=run.active.x-beforeX;
   if(drag.mode==='tap'||drag.mode==='hold'){
    drag.originX=run.active.x;drag.lane=run.active.x;drag.piece=pieceID();drag.downAnchor=drag.lastY;drag.noRelease=true;
   }else{
    if(target!==null)drag.virtualX=target;drag.startPieceX-=kick;drag.originX=run.active.x;drag.anchorX=drag.lastX;drag.shift=0;drag.piece=pieceID();drag.downAnchor=drag.lastY;drag.noRelease=true;drag.axis='x';drag.lane=run.active.x;if(target!==null)moveTo(Math.round(target));
   }
  }
 }else if(a==='down'){moved=run.move(0,1);if(moved){run.score++;fallTime=0;}}
 else if(a==='drop'){
  const keep=carry(),p=run.active,d=run.dropDistance();trail={cells:p.cells.map(c=>({...c,x:c.x+p.x,y:c.y+p.y})),distance:d,life:170};
  adaptive?.input('drop',true);run.move(0,d);run.score+=d*2;tone('drop');lockNormal(keep);hud();return true;
 }else if(a==='hold'){
  if(run.holdUsed)return false;const keep=carry();moved=run.hold();if(!keep)clearInput();
  if(run.over){finish('hold_collision');return false;}fallTime=lockTime=lockResets=0;if(keep)restore();
 }
 adaptive?.input(a,moved);if(moved&&grounded&&lockResets<12&&['left','right','rotate'].includes(a)){lockTime=0;lockResets++;}
 if(a!=='left'&&a!=='right')hud();return moved;
}
function initAudio(){window.BloomAudio?.configure(saved);window.BloomAudio?.unlock();}
function vibrate(pattern){if(saved.haptics&&typeof navigator.vibrate==='function')try{navigator.vibrate(pattern);}catch{}}
function tone(type,power=1){window.BloomAudio?.effect(type,power);}
function moveTone(){window.BloomAudio?.effect('move');}
function watchAudioRun(){const game=run,hold=game.hold;game.hold=function(...args){const ok=hold.apply(this,args);if(ok)tone('hold');return ok;};}
function callout(title,sub){$('callout').innerHTML='<strong>'+title+'</strong><span>'+sub+'</span>';$('callout').classList.add('show');calloutTime=1000;}
// Tutorial observes successful real-engine results. It owns no game input or timers.
function watchTutorialRun(){
 const game=run;
 for(const method of ['move','rotateDir','hold','lock']){const original=game[method];game[method]=function(...args){
  const active=!!this.active,inputState=drag?.state||tutorialInput.inputState;
  const result=original.apply(this,args);
  if(training&&run===game){const action=method==='move'?'move':method==='rotateDir'?'rotate':method==='lock'?'drop':'hold';
   if(method!=='move'||(!args[1]&&args[0]))tutorial?.observe({action,success:method==='lock'?active&&!this.active:!!result,lines:method==='lock'?(R.linePlan(this.board)?.rows.length||0):0,dx:args[0],inputState,source:tutorialInput.source,gesture:tutorialInput.gesture});
  }return result;
 };}
}
function prepareTutorialStep(index){
 if(!training||!run)return;clearInput();phase=pending=null;phaseTime=0;falls=[];fx=[];floaters=[];impact=trail=null;shatterFX?.clear();
 run.board=B.blank();run.over=false;run.holdUsed=false;run.held=null;run.score=run.lines=run.combo=run.maxCombo=0;state='playing';beforePause='playing';fallTime=lockTime=lockResets=0;
 const type=index===7?'I':'T';run.active={type,size:type==='I'?4:3,x:index===7?2:3,y:4,cells:E.SHAPES[type].map(([x,y])=>({type,x,y,mask:0,id:++run.serial}))};
 if(index===7)for(let x=0;x<10;x++)if(x<3||x>6)run.board[19][x]={type:'S',mask:0,id:++run.serial};
 if(index>=8)run.active=null;
 tutorialInput={source:'other',gesture:'',inputState:''};hud();draw();
}
function observeTutorialPointer(e){
 if(!training)return;
 if(e.type==='pointerdown')tutorialInput={source:e.target===canvas?'board':e.target.closest?.('[data-action="drop"]')?'dropButton':'other',gesture:'',inputState:'PENDING'};
 if(e.target===canvas&&drag){tutorialInput.inputState=drag.state;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(Math.max(Math.abs(dx),Math.abs(dy))>=drag.swipe)tutorialInput.gesture=Math.abs(dx)>=Math.abs(dy)?'rotate':dy<0?'hold':'drop';
  else if(e.type==='pointerup'&&drag.state==='PENDING')tutorialInput.gesture='tap';
 }
}
for(const type of ['pointerdown','pointermove','pointerup'])document.addEventListener(type,observeTutorialPointer,{capture:true,passive:true});
document.addEventListener('keydown',()=>{if(training)tutorialInput={source:'keyboard',gesture:'',inputState:''};},{capture:true,passive:true});
document.addEventListener('click',e=>{if(training&&e.detail===0&&e.target.closest?.('[data-action="drop"]'))tutorialInput={source:'dropButton',gesture:'drop',inputState:''};},{capture:true,passive:true});
function emitNormal(plan,result){
 const n=plan.rows.length;
 if(!reduced&&shatterFX)shatterFX.trigger(plan.cells.filter(c=>plan.rows.includes(c.y)).map(c=>({col:c.x,row:c.y,color:COLORS[c.cell.type]?.[0]||COLORS.I[0]})),n,result.combo||0);
 if(!n){tone('clear');return;}
 maxClear=Math.max(maxClear,n);celebration?.celebrate({combo:result.combo||0,lines:n});
 const cfg=desertCfg(),extra=cfg.lv>0?Math.floor(result.gain*(cfg.mult-1)):0;if(extra>0){run.score+=extra;result.gain+=extra;}
 // This is the existing BLOOM level multiplier, not an item multiplier.
 const remaining=desert.nextRise+desert.delay-(plan.itemAt??elapsed),imminent=cfg.lv>0&&remaining>=0&&remaining<=3000;
 if(imminent){const bonus=250*cfg.lv;run.score+=bonus;desert.lastEscapeUntil=elapsed+1000;callout('LAST BLOOM','+'+bonus.toLocaleString()+'점 · 상승 직전 탈출');}
 if(n===4&&cfg.lv>0){adaptive?.system('relic');desert.delay=Math.min(15000,desert.delay+5000);awardRelic('BLOOM BURST');desert.warned=false;callout('BLOOM BURST','다음 지반 상승 +5초 지연');}
 const y=plan.rows.reduce((s,r)=>s+r+.5,0)/n*36;floaters.push({x:180,y,gain:result.gain,life:1000,total:1000,rows:plan.rows,color:'#b6f3e5',power:Math.min(3,n)});floaters=floaters.slice(-6);
 if(training)tutorial?.observe({action:'clear',success:true,lines:n,source:tutorialInput.source});
 const title=n===4?'4 LINES!':n+' LINE'+(n>1?'S':'');if(!imminent&&(n!==4||cfg.lv===0))callout(result.combo>1?result.combo+' COMBO!':title,'+'+result.gain.toLocaleString()+'점'+(result.bonus?' · 콤보 +'+result.bonus:''));tone('clear',n);if(result.combo>1)tone('combo',Math.min(6,result.combo));vibrate(result.combo>1?[12,35,12]:12);
}
function update(raw){
 const dt=Math.min(100,Math.max(0,raw));if(playing()&&!document.hidden)toys?.advance(raw);
 const hitStop=!reduced&&shatterFX?shatterFX.update(dt):false;if(!playing()||hitStop)return;elapsed+=dt;adaptive?.tick(raw);
 desertTick();if(!playing())return;itemTick();if(repeat&&canAct()){repeat.time-=dt;let n=0;while(repeat&&repeat.time<=0&&n++<4){const r=repeat;action(r.action);if(repeat===r)r.time+=70;}}
 if(state==='playing'){
  if(toys?.busy)toys.update(dt);
  else if(toys?.shouldPanic()){clearInput();toys.begin();hud();}
  else if(run.active&&!run.fits(run.active,0,1)){fallTime=0;lockTime+=dt;if(lockTime>=run.lockDelay)lockNormal();}
  else{lockTime=0;fallTime+=dt;while(state==='playing'&&run.active&&fallTime>=run.gravity){fallTime-=run.gravity;run.move(0,1);}}
 }else if(state==='clearing'){
  phaseTime+=dt;if(phase==='flash'&&phaseTime>=240){const p=pending,result=resolveNormal(p);falls=result?.falls||[];pending=null;phase='fall';phaseTime=0;hud();}
  else if(phase==='fall'&&phaseTime>=200)nextNormal();
 }
 if(drag?.axis==='y'&&canAct())processSwipe(drag,drag.lastX,drag.lastY,performance.now());
 for(const p of fx){p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=p.gravity*dt/1000;p.angle+=dt*.002;}fx=fx.filter(p=>p.life>0);
 for(const f of floaters)f.life-=dt;floaters=floaters.filter(f=>f.life>0);
 if(impact&&(impact.life-=dt)<=0)impact=null;if(trail&&(trail.life-=dt)<=0)trail=null;
 if(calloutTime>0&&(calloutTime-=dt)<=0)$('callout').classList.remove('show');
 if(!practice())recordBest=Math.max(recordBest,run.score);
 if(!practice()&&run.score>0&&run.score>initialBest&&!recordAnnounced){recordAnnounced=true;$('best').parentElement.classList.add('record');celebration?.celebrate({best:true});}
 if(run.score>0&&performance.now()-lastSave>1500){rememberScore();desertRecord();}if(desert.level>0&&Math.floor(elapsed/60000)>desert.relicMeter){desert.relicMeter=Math.floor(elapsed/60000);awardRelic('장기 생존');}
}
function desertAtmosphere(g){const lv=desert.level,t=Math.min(1,lv/8);
 if(lv>=3){g.save();g.fillStyle=`rgba(174,147,209,${.008*lv})`;g.fillRect(0,0,360,720);g.restore();}

 const danger=run?.board?run.board.slice(0,5).some(row=>row.some(Boolean)):false;
 if(danger){g.save();g.strokeStyle='rgba(184,76,109,.72)';g.setLineDash([10,7]);g.lineWidth=2;g.beginPath();g.moveTo(0,108);g.lineTo(360,108);g.stroke();g.restore();}
 if(desert.previewHoles){g.save();g.fillStyle='rgba(152,136,221,.30)';for(const x of desert.previewHoles)g.fillRect(x*36,684,36,36);g.restore();}
}
function drawPyramidBackground(g){
 g.fillStyle='#fffaf0';g.fillRect(0,0,360,720);
 g.save();g.strokeStyle='#b5c9c7';g.globalAlpha=.24;g.lineWidth=.8;
 g.beginPath();for(let y=36;y<720;y+=36){g.moveTo(0,y+.5);g.lineTo(360,y+.5);}g.stroke();
 g.globalAlpha=.18;g.strokeStyle='#80b7c8';g.lineWidth=2;g.beginPath();g.moveTo(18,88);g.bezierCurveTo(20,76,31,79,34,83);g.bezierCurveTo(37,64,62,67,62,83);g.bezierCurveTo(81,77,88,94,70,95);g.lineTo(24,96);g.stroke();
 g.globalAlpha=.16;g.strokeStyle='#83a98c';g.beginPath();g.moveTo(0,710);g.quadraticCurveTo(95,689,185,709);g.quadraticCurveTo(270,722,360,703);g.stroke();g.restore();
}
function pyramidTile(g,c,x,y,size){
 const pair=COLORS[c.type]||COLORS.I,light=pair[0],dark=pair[1],r=Math.max(1.5,size*.055),seed=(c.id??0);
 g.save();g.lineJoin='round';g.lineCap='round';
 // Matte, densely coloured crayon paper; no glass/candy highlight.
 g.globalAlpha=.12;g.fillStyle='#685548';g.beginPath();g.roundRect(x+1,y+2,size*.94,size*.94,2);g.fill();
 g.globalAlpha=1;g.fillStyle=light;g.beginPath();g.moveTo(x+1,y+1);g.lineTo(x+size*.94,y+size*.025);g.lineTo(x+size*.92,y+size*.94);g.lineTo(x+size*.025,y+size*.92);g.closePath();g.fill();
 // doubled hand-drawn edge
 g.strokeStyle=dark;g.globalAlpha=.95;g.lineWidth=Math.max(1.7,size*.055);g.beginPath();g.roundRect(x+1,y+1,size*.94-2,size*.94-2,r);g.stroke();
 g.strokeStyle='#fff';g.globalAlpha=.34;g.lineWidth=Math.max(1,size*.035);g.beginPath();g.roundRect(x+size*.08,y+size*.07,size*.78,size*.78,r*.72);g.stroke();
 // visible crayon scribble strokes
 g.globalAlpha=.25;g.strokeStyle=dark;g.lineWidth=Math.max(.8,size*.026);for(let k=0;k<6;k++){const yy=y+size*(.13+k*.13);g.beginPath();g.moveTo(x+size*.12,yy+((seed+k)%3-1));g.lineTo(x+size*.80,yy+(((seed+k*2)%3)-1));g.stroke();}
 const mark=seed%5;g.globalAlpha=.92;g.strokeStyle=dark;g.fillStyle=dark;g.lineWidth=Math.max(1.4,size*.05);
 if(mark===0){ // heart
   const cx=x+size*.47,cy=y+size*.47;g.beginPath();g.moveTo(cx,cy+size*.16);g.bezierCurveTo(cx-size*.30,cy-size*.02,cx-size*.18,cy-size*.27,cx,cy-size*.08);g.bezierCurveTo(cx+size*.18,cy-size*.27,cx+size*.30,cy-size*.02,cx,cy+size*.16);g.stroke();
 } else if(mark===1){ // friendly face
   g.beginPath();g.arc(x+size*.36,y+size*.48,size*.035,0,Math.PI*2);g.arc(x+size*.58,y+size*.48,size*.035,0,Math.PI*2);g.fill();g.beginPath();g.arc(x+size*.47,y+size*.53,size*.10,.15,Math.PI-.15);g.stroke();g.fillStyle='rgba(235,72,112,.52)';g.beginPath();g.arc(x+size*.25,y+size*.55,size*.06,0,Math.PI*2);g.arc(x+size*.69,y+size*.55,size*.06,0,Math.PI*2);g.fill();
 } else if(mark===2){ // flower
   const cx=x+size*.47,cy=y+size*.48;for(let i=0;i<5;i++){const aa=i*Math.PI*2/5-Math.PI/2;g.beginPath();g.arc(cx+Math.cos(aa)*size*.13,cy+Math.sin(aa)*size*.13,size*.095,0,Math.PI*2);g.stroke();}g.beginPath();g.arc(cx,cy,size*.07,0,Math.PI*2);g.fill();
 } else if(mark===3){ // star
   const cx=x+size*.47,cy=y+size*.48;g.beginPath();for(let i=0;i<10;i++){const aa=-Math.PI/2+i*Math.PI/5,rr=i%2?size*.09:size*.21,px=cx+Math.cos(aa)*rr,py=cy+Math.sin(aa)*rr;i?g.lineTo(px,py):g.moveTo(px,py);}g.closePath();g.stroke();
 } else { // leaf
   g.beginPath();g.moveTo(x+size*.30,y+size*.59);g.quadraticCurveTo(x+size*.47,y+size*.25,x+size*.68,y+size*.35);g.quadraticCurveTo(x+size*.61,y+size*.62,x+size*.30,y+size*.59);g.stroke();g.beginPath();g.moveTo(x+size*.34,y+size*.57);g.lineTo(x+size*.61,y+size*.38);g.stroke();
 }
 g.restore();return true;
}
function normalCell(g,c,x,y,size=36,alpha=1,ghostCell=false,hot=false){
 const [light,dark]=COLORS[c.type]||COLORS.I;g.save();g.globalAlpha=alpha;const m=Math.max(1.4,size*.055),r=Math.max(2,size*.08),px=x+m,py=y+m,s=size-m*2;
 if(ghostCell){g.fillStyle='rgba(70,83,166,.20)';g.fillRect(px+2,py+2,s-4,s-4);g.setLineDash([5,4]);g.strokeStyle='#ffffff';g.lineWidth=Math.max(3,size*.10);g.strokeRect(px+2,py+2,s-4,s-4);g.strokeStyle='#3545a5';g.lineWidth=Math.max(2,size*.065);g.strokeRect(px+2,py+2,s-4,s-4);g.setLineDash([]);g.restore();return;}
 if(!window.ToyBlocks?.drawCell(g,c,x,y,size,reduced)&&!pyramidTile(g,c,px,py,s)){const fill=g.createLinearGradient(px,py,px+s,py+s);fill.addColorStop(0,light+'a8');fill.addColorStop(.35,dark+'ba');fill.addColorStop(1,dark+'58');g.fillStyle=fill;g.beginPath();g.roundRect(px,py,s,s,r);g.fill();g.strokeStyle=light+'a0';g.lineWidth=.8;g.stroke();g.beginPath();g.moveTo(px+3,py+s-3);g.lineTo(px+3,py+3);g.lineTo(px+s-3,py+3);g.strokeStyle='#ffffff80';g.stroke();g.beginPath();g.moveTo(px+2,py+s*.53);g.lineTo(px+s*.55,py+2);g.lineTo(px+s*.78,py+2);g.lineTo(px+2,py+s*.78);g.closePath();g.fillStyle='#ffffff0e';g.fill();}
 if(c.special&&DESERT_ITEMS[c.special.type]){const it=DESERT_ITEMS[c.special.type],sp=c.special;g.save();g.globalAlpha=sp.failed?.48:.96;g.strokeStyle=it.color;g.lineWidth=2;g.strokeRect(px+1,py+1,s-2,s-2);if(window.BloomItemArt)window.BloomItemArt.draw(g,sp.type,px+s*.69,py+s*.30,Math.max(13,s*.51));else{g.fillStyle='#594766';g.font=`700 ${Math.max(8,s*.24)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(it.icon,px+s*.69,py+s*.30);}g.textAlign='center';g.textBaseline='middle';g.fillStyle='#433d63';g.font=`700 ${Math.max(7,s*.22)}px sans-serif`;if(sp.deadline&&!sp.failed)g.fillText(String(Math.max(0,Math.ceil((sp.deadline-elapsed)/1000))),px+s*.27,py+s*.75);if(sp.type==='mummy')g.fillText(String(sp.hp),px+s*.27,py+s*.75);g.restore();}
 if(hot){g.fillStyle='#dbfff588';g.fillRect(px,py,s,s);}g.restore();
}
function previewItemLabel(g,p,w,h){if(p?.toy&&window.ToyBlocks){g.save();g.fillStyle='#755065';g.font="700 17px 'Gaegu Toys', Gaegu, sans-serif";g.textAlign='center';g.textBaseline='bottom';g.fillText(window.ToyBlocks.LABELS[p.toy.kind],w/2,h-2,w-6);g.restore();}const sp=p?.cells?.find(c=>c.special)?.special;if(!sp)return;const it=DESERT_ITEMS[sp.type];if(!it)return;g.save();g.fillStyle=it.color;g.globalAlpha=.96;g.font=`700 ${Math.max(9,w*.075)}px sans-serif`;g.textAlign='center';g.textBaseline='bottom';g.fillText((it.kind==='good'?'★ ':'⚠ ')+it.label,w/2,h-(p.toy?19:2),w-6);g.restore();}
function normalPreview(g,p,w,h){if(!p)return;const minX=Math.min(...p.cells.map(c=>c.x)),maxX=Math.max(...p.cells.map(c=>c.x)),minY=Math.min(...p.cells.map(c=>c.y)),maxY=Math.max(...p.cells.map(c=>c.y));const reserve=(p.cells.some(c=>c.special)?18:0)+(p.toy?18:0),hh=h-reserve;const size=Math.min((w-16)/(maxX-minX+1),(hh-16)/(maxY-minY+1),w*.21),x=(w-(maxX-minX+1)*size)/2,y=(hh-(maxY-minY+1)*size)/2;for(const c of p.cells)normalCell(g,c,x+(c.x-minX)*size,y+(c.y-minY)*size,size);previewItemLabel(g,p,w,h);}
function draw(){
 if(!run)return;ctx.clearRect(0,0,360,720);ctx.fillStyle='#2a1a10';ctx.fillRect(0,0,360,720);
 ctx.imageSmoothingEnabled=true;drawPyramidBackground(ctx);desertAtmosphere(ctx);ctx.strokeStyle='#8fbed109';ctx.lineWidth=1;ctx.beginPath();for(let x=1;x<10;x++){ctx.moveTo(x*36,0);ctx.lineTo(x*36,720);}for(let y=1;y<20;y++){ctx.moveTo(0,y*36);ctx.lineTo(360,y*36);}ctx.stroke();
 // Keep the translucent drop trail behind solid tiles so it cannot wash out their colour.
 if(trail&&!reduced){ctx.save();ctx.globalAlpha=trail.life/900;ctx.fillStyle='#c2fff2';for(const cell of trail.cells)ctx.fillRect(cell.x*36+5,cell.y*36,26,(trail.distance+1)*36);ctx.restore();}
 const map=new Map(falls.map(f=>[f.cell.id,f])),hot=new Set(pending?.rows||[]);
 for(let y=0;y<20;y++)for(let x=0;x<10;x++){const cell=run.board[y][x];if(!cell||toys?.ownsAnimated(cell))continue;const f=map.get(cell.id),t=Math.min(1,phaseTime/200),yy=f&&phase==='fall'?f.from+(f.to-f.from)*(1-Math.pow(1-t,3)):y;normalCell(ctx,cell,x*36,yy*36,36,1,false,hot.has(y));}
 if(run.active&&!toys?.busy){const p=run.active,d=run.dropDistance();if(!p.toy||toys?.guidanceHidden)for(const cell of p.cells)normalCell(ctx,cell,(p.x+cell.x)*36,(p.y+cell.y+d)*36,36,.75,true);for(const cell of p.cells)normalCell(ctx,cell,(p.x+cell.x)*36,(p.y+cell.y)*36);}
 if(run.active&&!toys?.busy)toys?.drawPrediction(ctx);
 toys?.draw(ctx,reduced,(canvas.getBoundingClientRect?.().width||360)/360);
 if(impact&&!reduced){const t=1-impact.life/impact.total;ctx.save();ctx.globalAlpha=(1-t)*.55;ctx.strokeStyle='#b7fff0';ctx.lineWidth=2*(1-t)+.5;ctx.beginPath();ctx.ellipse(impact.x,Math.min(714,impact.y),20+90*t,3+13*t,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const p of fx){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life/350);if(p.spark&&!reduced){ctx.strokeStyle=p.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-p.size*2,0);ctx.lineTo(p.size*2,0);ctx.moveTo(0,-p.size*2);ctx.lineTo(0,p.size*2);ctx.stroke();}ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size*.7,-p.size*.6);ctx.lineTo(p.size*.2,p.size);ctx.closePath();ctx.fill();ctx.restore();}
 if(!reduced)shatterFX?.draw();
 for(const f of floaters){const t=1-f.life/f.total;ctx.save();ctx.globalAlpha=Math.min(1,f.life/220);if(!reduced){ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.globalAlpha=(1-t)*.6;ctx.beginPath();ctx.ellipse(f.x,f.y,25+t*145,10+t*55,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6,near=10+t*100,far=near+22*(1-t)*f.power;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*near,f.y+Math.sin(a)*near*.6);ctx.lineTo(f.x+Math.cos(a)*far,f.y+Math.sin(a)*far*.6);ctx.stroke();}}ctx.globalAlpha=Math.min(1,f.life/220);ctx.font='700 23px Gaegu, sans-serif';ctx.textAlign='center';ctx.fillStyle='#755065';ctx.fillText('+'+f.gain.toLocaleString(),180,Math.max(30,f.y-12-t*35));ctx.restore();}
}
// CONTROL 23: normal-board gestures own one state and one timer.
// Keyboard repeat remains in update().
function normalTouchTick(d){
 d.timer=null;
 if(drag!==d||d.piece!==pieceID()||!canAct()){if(drag===d)clearInput();return;}
 if(d.state!=='PENDING'&&d.state!=='REPEATING')return;
 d.state='REPEATING';
 if(!action(d.side<0?'left':'right')){d.state='BLOCKED';return;}
 // Timer belongs to this pointer and this piece, not animation/gameplay dt.
 // No accumulated catch-up work after a main-thread stall.
 if(drag===d){const delay=d.steps===0?38:d.steps===1?33:29;d.steps++;d.timer=setTimeout(()=>normalTouchTick(d),delay);}
}
function normalTouchMove(d,x,y){
 if(drag!==d)return;
 if(d.piece!==pieceID()||!canAct()){clearInput();return;}
 const dx=x-d.startX,dy=y-d.startY,ax=Math.abs(dx),ay=Math.abs(dy);
 if(Math.max(ax,ay)<d.swipe)return;
 // User-approved 2026-09-29: only a quick horizontal swipe may rotate.
 // A confirmed hold (including BLOCKED at a wall) keeps its original direction.
 // Check elapsed time too, in case the 165ms timer is delayed by a busy frame.
 if(ax>=ay&&(d.state!=='PENDING'||performance.now()-d.startedAt>=165))return;
 // Vertical HOLD/drop still retires the repeat before its one swipe action.
 clearInput();
 if(action(ax>=ay?(dx>0?'rotate':'rotateCCW'):(dy<0?'hold':'drop')))draw();
}
function processSwipe(d,x,y,now){if(drag!==d||!playing())return;normalTouchMove(d,x,y);}
canvas.addEventListener('pointerdown',e=>{
 if(!canAct()||drag||e.button!==0)return;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);repeat=null;initAudio();const r=canvas.getBoundingClientRect(),side=e.clientX<r.left+r.width/2?-1:1;
 const d=drag={id:e.pointerId,piece:pieceID(),state:'PENDING',steps:0,side,startedAt:performance.now(),startX:e.clientX,startY:e.clientY,swipe:Math.max(26,Math.max(23,Math.min(36,r.width/10))*.78),timer:null};
 d.timer=setTimeout(()=>normalTouchTick(d),165);
});
canvas.addEventListener('pointermove',e=>{const d=drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();processSwipe(d,e.clientX,e.clientY,performance.now());});
canvas.addEventListener('pointerup',e=>{
 const d=drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();
 normalTouchMove(d,e.clientX,e.clientY);if(drag!==d)return;
 const tap=d.state==='PENDING'&&d.piece===pieceID()&&canAct();clearInput();
 if(tap&&action(d.side<0?'left':'right'))draw();
});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(drag?.id===e.pointerId)clearInput();});
for(const b of document.querySelectorAll('[data-action]')){
 b.addEventListener('pointerdown',e=>{if(e.button!==0||b.disabled)return;e.preventDefault();b.setPointerCapture?.(e.pointerId);if(drag)clearInput();action(b.dataset.action);b.classList.add('pressed');});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>b.classList.remove('pressed'));
 b.addEventListener('click',e=>{if(e.detail===0&&!b.disabled)action(b.dataset.action);});
}
for(const b of document.querySelectorAll('[data-preview]'))b.addEventListener('click',()=>{
 if(!run||!playing())return;const p=run.queue[Number(b.dataset.preview)];previewReturn='playing';beforePause=state;state='paused';clearInput();rememberScore();const sp=p?.cells?.find(c=>c.special)?.special,it=sp&&DESERT_ITEMS[sp.type];
 showPanel('<div class="kicker">NEXT</div><h2>'+ (b.dataset.preview==='0'?'다음 블록':'두 번째 다음 블록')+(p?.toy?' · '+window.ToyBlocks.LABELS[p.toy.kind]:'')+'</h2><canvas class="preview-large" id="preview-large" width="240" height="240"></canvas>'+(p?.toy?'<p>'+window.ToyBlocks.HELP[p.toy.kind]+'</p>':'')+(it?'<p>'+it.help+'<br>추가 점수 없음 · NEXT/보관 중 방해 시간 정지</p>':'')+'<button class="primary" data-menu="back">계속하기</button>','preview');const g=$('preview-large').getContext('2d');normalPreview(g,p,240,240);hud();
});
$('pause').addEventListener('click',pause);
$('mode-label')?.addEventListener('click',()=>{if(run&&state!=='menu'&&state!=='over')showRelics();});
$('build')?.addEventListener('click',()=>{if(!run||state==='menu'||state==='over')return;if(playing())beforePause=state;state='paused';document.body.classList.remove('ground-warning');clearInput();devPanel();hud();});
const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',x:'rotate',X:'rotate',' ':'drop',c:'hold',C:'hold'};
document.addEventListener('keydown',e=>{
 if(['Escape','p','P'].includes(e.key)){if(e.repeat)return;e.preventDefault();if(state==='paused')resume();else pause();return;}
 if(e.target.closest?.('input,select,textarea,[contenteditable]')||e.key===' '&&e.target.closest?.('button,a'))return;
 const a=keys[e.key];if(!a||!canAct())return;e.preventDefault();if(e.repeat||heldKeys.has(e.key))return;heldKeys.add(e.key);action(a);if(['left','right','down'].includes(a))repeat={id:e.key,action:a,time:200};
});
document.addEventListener('keyup',e=>{heldKeys.delete(e.key);if(repeat?.id===e.key)repeat=null;});
window.addEventListener('blur',()=>{if(state==='loading')menu();else if(playing())pause();else clearInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state==='loading')menu();else if(playing())pause();}});
window.addEventListener('pagehide',()=>{if(state==='loading')menu();rememberScore();adaptive?.end('interrupted',true);clearInput();});
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
function frame(now){const dt=last?now-last:0;last=now;if(playing()&&!document.hidden){update(dt);draw();if(now-lastHUD>=120){hud();lastHUD=now;}}requestAnimationFrame(frame);}
tutorial=window.BloomTutorial?.create({host:$('game-area'),prepareStep:prepareTutorialStep,resetInput:clearInput,finish:()=>start(false,false),saveCompleted:()=>pref('tutorialCompleted',true),celebrate:event=>celebration?.celebrate(event),successSound:()=>tone('success')});
if(new URLSearchParams(location.search).get('qa')==='1')window.__GLASSFALL_QA__={get tutorial(){return tutorial;},get training(){return training;},get loading(){return loading;},requestStart,get celebration(){return celebration;},get run(){return run;},get toys(){return toys;},get state(){return state;},get kind(){return kind;},get drag(){return drag;},get desert(){return desert;},get items(){return itemSystem;},get elapsed(){return elapsed;},get adaptive(){return adaptive;},action,update,start,menu,pause,resume,finish,draw,hud,devPanel,jumpTime,loadPreset,itemScenario,forceNextItem,resolveNormal,riseGround,maybeSeedNextItem,useRelic,setKind(k){kind='normal';menu();},lock(){lockNormal(!!drag);}};

if(window.AdaptiveBridge&&window.AdaptiveDirector)adaptive=window.AdaptiveBridge.create({
 playerDefaults:true,storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},panel,
 get:()=>({run,kind,state,desert,elapsed,seed:currentSeed,practice:practice(),overlayView,
  baseInterval:desertCfg().interval,interval:desert?.adaptiveInterval||desertCfg().interval}),
 curses:()=>findSpecials().filter(q=>DESERT_ITEMS[q.s.type].kind==='bad'&&!q.s.failed).length,
 show:showPanel,
 pauseForPanel:()=>{if(playing()){beforePause=state;state='paused';clearInput();rememberScore();}document.body.classList.remove('ground-warning');},
 back:view=>{if(view==='over'&&state==='over'){showPanel(resultHTML,'over');return;}if(view==='dev')devPanel();else if(view==='settings')settings();else if(view==='pause')pausePanel();else if(view==='menu'||state==='menu')showMenu();else if(state==='paused')resume();else showMenu();},
 download:(filename,text)=>{const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
});

// Fill only absent audio keys; preserve explicit OFF and all unrelated records.
if(['sound','bgm','sfx'].some(key=>saved[key]===undefined)){
 writeStore(s=>{for(const key of ['sound','bgm','sfx'])if(s[key]===undefined)s[key]=true;});
 for(const key of ['sound','bgm','sfx'])if(saved[key]===undefined)saved[key]=true;
}
document.addEventListener('pointerdown',initAudio,{capture:true,passive:true});window.BloomAudio?.configure(saved);celebration?.preload();menu();fit();$('boot').hidden=true;if(new URLSearchParams(location.search).get('play')==='1')start();requestAnimationFrame(frame);
})();
