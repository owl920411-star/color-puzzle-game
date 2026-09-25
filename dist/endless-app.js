/* ENDLESS / BLOCK ITEMS V2. CONTROL 16 and NOVICE 7 retained.
 * Item design: DESERT-BLOCK-ITEMS-V2.md. Sand engine is unchanged.
 */
(() => {
'use strict';
const E=window.GlassEngine,M=window.MicroSand,R=window.EndlessRules,B=window.BlockItems,$=id=>document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d'),panel=$('panel'),KEY='glassfall-v1';
const shatterFX=window.SandShatterFX?new window.SandShatterFX(canvas,{cellSize:36,originX:0,originY:0,maxParticles:180}):window.GlassShatterFX?new window.GlassShatterFX(canvas,{cellSize:36,originX:0,originY:0,maxParticles:180}):null;
const COLORS={I:['#e8c878','#9b672e'],O:['#f2d58a','#a97432'],T:['#d7ad5d','#805126'],S:['#e2bf72','#91602d'],Z:['#c98a4b','#713d22'],J:['#e7c47a','#8b5929'],L:['#f0d18a','#a2672d']};
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function object(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function readStore(){try{return object(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return{};}}
let saved=readStore(),saveOK=true,kind=new URLSearchParams(location.search).get('mode')==='sand'?'sand':saved.material==='sand'?'sand':'normal';
let reduced=systemReduced||saved.effects==='light',run=null,state='menu',beforePause='playing',overlayView='menu',elapsed=0,last=0,fallTime=0,lockTime=0,lockResets=0;
let phase=null,phaseTime=0,pending=null,falls=[],drag=null,repeat=null,heldKeys=new Set(),fx=[],floaters=[],impact=null,trail=null,calloutTime=0;
let currentSeed='',recordBest=0,initialBest=0,finalSaved=false,recordAnnounced=false,lastSave=0,lastHUD=0,audio=null,previewReturn='menu';
const DESERT_LEVELS=[
 {at:0,lv:0,interval:Infinity,mult:1,label:'CALM'},
 {at:180000,lv:1,interval:45000,mult:1.10,label:'DAWN'},
 {at:300000,lv:2,interval:38000,mult:1.20,label:'SCORCH'},
 {at:420000,lv:3,interval:32000,mult:1.35,label:'SUNSET'},
 {at:540000,lv:4,interval:26000,mult:1.50,label:'DUSK'},
 {at:660000,lv:5,interval:21000,mult:1.70,label:'NIGHT'},
 {at:780000,lv:6,interval:17000,mult:1.90,label:'SANDSTORM'},
 {at:900000,lv:7,interval:13000,mult:2.15,label:'ETERNAL DESERT'},
 {at:1020000,lv:8,interval:11000,mult:2.40,label:'DESERT MAX'}
];
let desert, itemSystem=B.state('preview'),relicReturn='game';
/* ADAPTIVE DIRECTOR V1 HOOKS */
let adaptive=null,resultHTML='';
function adaptiveRecordKey(){return kind==='normal'?(adaptive?.recordKey()||'normal'):kind;}

const DESERT_ITEMS=B.ITEMS;
// Golden Scarab score item was removed; non-score support relics stay available.
const RELICS=['hourglass','sun','eye','hammer','ankh'];
const RELIC_NAMES={hourglass:'시간의 모래시계',sun:'태양의 부적',eye:'호루스의 눈',hammer:'파라오의 망치',ankh:'앙크'};
function desertCfg(){let d=DESERT_LEVELS[0];for(const x of DESERT_LEVELS)if(elapsed>=x.at)d=x;return d;}
function resetDesert(){document.body.classList.remove('ground-warning');desert={level:0,nextRise:180000,warned:false,lastHoles:[],rises:0,maxLevel:0,lastEscapeUntil:0,delay:0,invincible:false,inventory:Object.fromEntries(RELICS.map(k=>[k,0])),previewHoles:null,relicMeter:0,lastRelicAt:-60000};document.body.dataset.desert='0';itemSystem=B.state(currentSeed+'/block-items-v2');}
function practice(){return kind==='normal'&&itemSystem.practice;}
function markPractice(){itemSystem.practice=true;adaptive?.exclude();recordBest=initialBest;}
function desertRecord(final=false){if(kind!=='normal'||practice()||adaptive?.guest)return;const sec=Math.floor(elapsed/1000);writeStore(s=>{const key=adaptive?.desertKey()||'desertSurvival';s[key]=object(s[key]);const d=s[key];d.bestTime=Math.max(finite(d.bestTime),sec);d.maxLevel=Math.max(finite(d.maxLevel),desert.maxLevel);d.bestScore=Math.max(finite(d.bestScore),run?.score||0);if(final)d.last={seconds:sec,level:desert.level,rises:desert.rises,score:run?.score||0};});}
function boardDanger(){let top=20,holes=0,bump=0,prev=20;for(let x=0;x<10;x++){let h=20;for(let y=0;y<20;y++)if(run.board[y][x]){h=y;break;}top=Math.min(top,h);if(x)bump+=Math.abs(h-prev);prev=h;for(let y=h;y<20;y++)if(!run.board[y][x])holes++;}return{top,holes,bump};}
function fairHoles(){const heights=Array(10).fill(20);for(let x=0;x<10;x++)for(let y=0;y<20;y++)if(run.board[y][x]){heights[x]=y;break;}let choices=[0,1,2,3,4,5,6,7,8,9].sort((a,b)=>heights[b]-heights[a]);choices=choices.filter(x=>!desert.lastHoles.includes(x)).concat(choices.filter(x=>desert.lastHoles.includes(x)));const d=boardDanger();if(d.top<5)choices=choices.filter(x=>heights[x]>=7).concat(choices.filter(x=>heights[x]<7));const first=choices[0],second=Math.max(0,Math.min(9,first+(first<5?1:-1)));const holes=(desert.level<=3||d.top<6)?[first,second]:[first];desert.lastHoles=holes;return holes;}
function itemEligible(){return kind==='normal'&&desert.level>0&&itemSystem.enabled;}
function findSpecials(){return kind==='normal'&&run?B.specials(run.board):[];}
function directorPick(k=null){return itemEligible()?B.pick(run,itemSystem,desert.level,k):null;}
function attachItemToPiece(p,type){return B.attach(p,type,itemSystem);}
function forceNextItem(type){if(kind!=='normal'||!DESERT_ITEMS[type]||!run?.queue[0])return false;markPractice();for(const c of run.queue[0].cells)delete c.special;return attachItemToPiece(run.queue[0],type);}
function maybeSeedNextItem(){if(!itemEligible()||!run?.queue?.[0]||B.liveCount(run)>=B.LIMIT)return;
 // Keep earned rewards until a free slot exists; never discard them.
 if(itemSystem.purify>=2){const p=run.queue[1]||run.queue[0],t=directorPick('good');if(t&&attachItemToPiece(p,t)){itemSystem.purify-=2;callout('정화의 선물','다음 블록에 블록형 축복이 예약됐습니다');}return;}
 if(run.queue.some(p=>p.cells.some(c=>c.special)))return;const early=elapsed<420000?.55:1,chance=Math.min(.20,(.04+desert.level*.010)*early);if(itemSystem.random()<chance){const t=directorPick();if(t)attachItemToPiece(run.queue[0],t);}
}
function announceItems(events){if(!events.length)return;const names=events.map(e=>DESERT_ITEMS[e.type].label).join(' · '),text=events.map(e=>e.status==='wounded'?'붕대 파손 · 남은 줄을 한 번 더 완성':e.status==='purified'?'정화 성공 · 축복 게이지 +1':e.status==='failed'?`${e.blocks}칸 ${e.type==='seal'?'석화':'증식'}`:e.status==='blocked'?'안전한 대상 없음 · 추가 피해 없음':e.status==='removed'?'남은 저주 블록 제거':e.type==='oasis'?'아래 적재 줄 세척':e.type==='spear'?`아래쪽 ${e.blocks}칸 관통`:`주변 ${e.blocks}칸 파괴`).join(' / ');callout(names,text);}
function resolveNormal(p){if(!p)return null;const tx=itemSystem.enabled?B.resolve(run.board,p.rows,p.itemAt??elapsed):{board:run.board,scoringRows:p.rows,events:[],purified:0,extraRemoved:0,falls:null};let result;
 if(itemSystem.enabled){run.board=tx.board;result=run.awardClear(tx.scoringRows.length);result.falls=tx.falls;if(!tx.scoringRows.length)run.noClear();}else result=run.resolve(p);
 itemSystem.purify+=tx.purified;itemSystem.stats.cleared+=tx.events.filter(e=>e.status==='activated'||e.status==='purified').length;itemSystem.stats.removed+=tx.extraRemoved;
 // Score only naturally completed, removable rows. Block effects never add points.
 adaptive?.resolved(p,tx);emitNormal({...p,rows:tx.scoringRows},result);announceItems(tx.events);return result;
}
function itemTick(){if(kind!=='normal'||!itemSystem.enabled||state!=='playing')return;const before=adaptive?.board(),events=B.expire(run,itemSystem,elapsed);if(events.length)adaptive?.system('item',before);announceItems(events);}
function awardRelic(reason='SURVIVAL'){if(kind!=='normal'||desert.level===0||elapsed-desert.lastRelicAt<45000)return;const key=RELICS[(desert.rises+run.lines+desert.level)%RELICS.length];if(desert.inventory[key]>=2)return;desert.inventory[key]++;desert.lastRelicAt=elapsed;callout(RELIC_NAMES[key],reason+' 보상 · 획득');hud();}
function useRelic(key){if(kind!=='normal'||!RELICS.includes(key)||key==='ankh'||!desert.inventory[key]||beforePause==='clearing')return false;
 const adaptiveBefore=adaptive?.board();
 if(key==='hourglass')desert.delay=Math.min(15000,desert.delay+10000);
 else if(key==='sun'){const b=B.removeBottom(run.board,run.active);if(!b){callout('태양의 부적','대상이 없거나 현재 블록과 겹쳐 사용하지 않았습니다');return false;}run.board=b;}
 else if(key==='eye')desert.previewHoles ||= fairHoles();
 else if(key==='hammer')for(let y=16;y<20;y++)for(let x=4;x<=6;x++)run.board[y][x]=null;
 desert.inventory[key]--;adaptive?.system('relic',adaptiveBefore);callout(RELIC_NAMES[key],'유물 사용 · 아이템 추가 점수 없음');hud();return true;
}
function showRelics(){if(!run||kind!=='normal')return;relicReturn=overlayView==='dev'?'dev':'game';if(playing())beforePause=state;state='paused';clearInput();showPanel(`<div class="kicker">SUPPORT RELICS</div><h2>보조 유물</h2><div class="relic-grid">${RELICS.map(k=>`<button data-relic="${k}" ${!desert.inventory[k]||k==='ankh'||beforePause==='clearing'?'disabled':''}>${RELIC_NAMES[k]} ×${desert.inventory[k]}</button>`).join('')}</div><p>점수 증가 유물은 삭제됐습니다.<br>앙크는 치명적인 지반 상승 때 자동 발동합니다.${beforePause==='clearing'?'<br>줄 제거 연출 후 사용할 수 있습니다.':''}</p><button class="primary" data-menu="back">${relicReturn==='dev'?'개발자 모드':'게임으로 돌아가기'}</button>`,'relic');}
function riseGround(){if(kind!=='normal'||!run||state==='clearing'||state==='over')return false;const adaptiveBefore=adaptive?.board();const source=B.clone(run.board),holes=desert.previewHoles||fairHoles();const types=Object.keys(COLORS);let topOut=source[0].some(Boolean);const row=Array.from({length:10},(_,x)=>holes.includes(x)?null:{type:types[(x+desert.rises)%7],mask:0,id:++run.serial,desert:true});source.shift();source.push(row);let p=run.active?{...run.active}:null;
 const locate=()=>{if(!p)return true;for(const dy of [0,-1,-2]){const q={...run.active,y:run.active.y+dy};if(B.fits(source,q)){p=q;return true;}}return false;};let safe=locate();
 if(topOut||!safe){if(desert.inventory.ankh>0||desert.invincible){if(!desert.invincible)desert.inventory.ankh--;for(let y=0;y<4;y++)source[y]=Array(10).fill(null);topOut=false;safe=locate();if(!safe&&desert.invincible){for(let y=0;y<20;y++)source[y]=Array(10).fill(null);p=run.active?{...run.active,y:0}:null;safe=true;}}if(topOut||!safe){finish(topOut?'ground_overflow':'ground_active_blocked',{topOut,activeFits:safe,attemptedRows:source.map(r=>r.reduce((m,c,x)=>m|(c?1<<x:0),0))});return false;}}
 run.board=source;run.active=p;adaptive?.system('ground',adaptiveBefore);desert.previewHoles=null;desert.rises++;desert.warned=false;fallTime=lockTime=0;vibrate([18,28,24]);callout('GROUND RISING','사막 지반 +1');if(desert.rises%4===0)awardRelic('지반 생존');return true;
}
function desertTick(){if(kind!=='normal'||!playing())return;const cfg=desertCfg();if(cfg.lv!==desert.level){desert.level=cfg.lv;desert.maxLevel=Math.max(desert.maxLevel,cfg.lv);document.body.dataset.desert=String(cfg.lv);if(cfg.lv)callout(cfg.lv===8?'DESERT MAX':'DESERT LEVEL '+cfg.lv,cfg.label);}
 const left=desert.nextRise+desert.delay-elapsed,warning=left<=3000;document.body.classList.toggle('ground-warning',warning);if(warning&&!desert.warned){desert.warned=true;vibrate(8);}if(left>3000)desert.warned=false;
 // Never change the board while its line-clear transaction is pending.
 if(cfg.lv&&left<=0&&state==='playing'){desert.delay=0;if(riseGround()){const next=adaptive?.interval(cfg.interval)??cfg.interval;desert.nextRise=elapsed+next;desert.adaptiveInterval=next;}}
}
function jumpTime(ms){markPractice();elapsed=Math.max(0,ms);const c=desertCfg();desert.level=c.lv;desert.maxLevel=Math.max(desert.maxLevel,c.lv);desert.nextRise=c.lv?elapsed+c.interval:180000;desert.delay=0;desert.warned=false;document.body.dataset.desert=String(c.lv);document.body.classList.remove('ground-warning');for(const q of findSpecials())if(q.s.deadline&&!q.s.failed)q.s.deadline=elapsed+(DESERT_ITEMS[q.s.type].duration||0);}
function freshPractice(){markPractice();clearInput();B.strip(run);run.board=B.blank();run.over=false;run.active=null;run.spawn();phase=pending=null;falls=[];fx=[];floaters=[];trail=impact=null;fallTime=lockTime=lockResets=0;beforePause='playing';state='paused';itemSystem.enabled=true;}
function loadPreset(type){if(kind!=='normal')return;freshPractice();const cell=(x,y)=>({type:Object.keys(COLORS)[(x+y)%7],mask:0,id:++run.serial,desert:true});for(let y=0;y<20;y++)for(let x=0;x<10;x++){const put=type==='high'?y>=11&&(x+y)%5!==0:type==='holes'?y>=9&&(x*3+y)%4!==0:type==='left'?y>=5&&x<5&&(x+y)%3:type==='right'?y>=5&&x>=5&&(x+y)%3:type==='ceiling'?y>=2&&x!==4&&x!==5:type==='rise'?y>=12&&(x+y)%4!==0:type==='max'?y>=9&&(x*2+y)%5!==0:false;if(put)run.board[y][x]=cell(x,y);}if(type==='max')jumpTime(1020000);if(type==='rise'){jumpTime(180000);desert.nextRise=elapsed+3000;}hud();}
function itemScenario(type){if(!DESERT_ITEMS[type])return;freshPractice();const cell=()=>({type:'J',mask:0,id:++run.serial});if(type==='spear'){for(let x=0;x<10;x++)if(x!==4)run.board[12][x]=cell();for(let y=13;y<20;y++)run.board[y][5]=cell();run.board[15][4]=cell();attachItemToPiece({cells:[run.board[12][5]]},type);B.arm(run.board,elapsed);run.active={type:'I',size:4,x:4,y:0,cells:[0,1,2,3].map(y=>({...cell(),type:'I',x:0,y}))};hud();return;}for(let x=0;x<10;x++)if(x!==4)run.board[18][x]=cell();for(const x of [1,2,5,6,7])run.board[19][x]=cell();for(const x of [3,5,6])run.board[17][x]=cell();const target=run.board[18][5];attachItemToPiece({cells:[target]},type);B.arm(run.board,elapsed);run.active={type:'I',size:4,x:4,y:0,cells:[0,1,2,3].map(y=>({...cell(),type:'I',x:0,y}))};hud();}
function runSim(){const t=B.regression(300);showPanel(`<div class="kicker">REAL BOARD REGRESSION</div><h2>${t.cases}개 보드 연산 검사</h2><div class="rule-box">${t.pass?'통과':'실패'} · 오류 ${t.failures.length}<br>검사: 보드 크기·셀 ID 중복·원본 보드 보존·미라의 줄 판정</div><p>${t.scope}<br>이전 생존시간 근사 계산은 이번 아이템의 검증 근거로 사용하지 않습니다.</p><button class="primary" data-menu="back">개발자 모드</button>`,'sim');}
function desertChecklist(){showPanel('<div class="kicker">PLAN TRACKER</div><h2>블록 아이템 V2</h2><div class="rule-box">구현: 6종 보드 효과 / 점수 아이템 제거 / NEXT 예고 / 착지 타이머 / 정화 보상 예약 / 연습 프리셋<br><br>남음: 실제 휴대폰 조작·연출 평가 / 초보 7분 목표 보정 / 실전 엔진을 사용하는 대량 BOT / 파라오의 거래</div><p>기획 원본과 교체 사유는 DESERT-BLOCK-ITEMS-V2.md에 보존합니다. 구현과 검증 완료는 구분합니다.</p><button class="primary" data-menu="back">개발자 모드</button>','audit');}
function devPanel(){if(kind!=='normal')return;const d=boardDanger();showPanel(`<div class="kicker">DEV LAB · BLOCK ITEMS V2</div><h2>블록 아이템 테스트</h2>${adaptive?.button()||''}<div class="rule-box">${timeText()} · DESERT ${desert.level} · 높이 ${20-d.top}/20 · 구멍 ${d.holes}<br>${practice()?'연습 기록 · 최고점 저장 제외':'정상 기록 · 상태를 바꾸면 연습으로 전환'}<br>생성 ${itemSystem.stats.spawned} / 성공 ${itemSystem.stats.cleared} / 실패 ${itemSystem.stats.failed}<br>정화 ${itemSystem.purify}/2 · 활성 ${B.liveCount(run)}/${B.LIMIT}</div><p>아래 아이템을 누르고 게임으로 돌아가 즉시하강하면 효과를 확인할 수 있습니다. 저주는 기다리면 실패 효과가 발생합니다.</p><div class="item-force-grid">${Object.entries(DESERT_ITEMS).map(([k,v])=>`<button data-menu="itemscenario" data-v="${k}">${v.kind==='good'?'★':'⚠'} ${v.label}</button>`).join('')}</div><div class="settings-row"><button data-menu="forcegood">NEXT GOOD</button><button data-menu="forcebad">NEXT BAD</button><button data-menu="itemtoggle">아이템 ${itemSystem.enabled?'ON':'OFF'}</button></div><div class="settings-row"><button data-menu="itemdeadline">저주 1초</button><button data-menu="itemcombo">MAX 복합판</button><button data-menu="devinv">무적 ${desert.invincible?'ON':'OFF'}</button></div><div class="item-force-grid">${[0,3,5,7,9,11,13,15,17,30].map(m=>`<button data-menu="devtime" data-v="${m*60000}">${m===17?'MAX 17분':m+'분'}</button>`).join('')}</div><div class="settings-row"><button data-menu="devrise">지반 +1</button><button data-menu="devrelic">보조 유물 지급</button><button data-menu="devrelicview">유물함</button></div><div class="item-force-grid">${[['high','높은 적재'],['holes','구멍판'],['left','좌측 위험'],['right','우측 위험'],['ceiling','천장 직전'],['rise','상승 직전'],['max','MAX 위험']].map(([k,v])=>`<button data-menu="preset" data-v="${k}">${v}</button>`).join('')}</div><div class="settings-row"><button data-menu="devsim">보드 연산 검사</button><button data-menu="devaudit">기획 체크리스트</button></div><button class="primary" data-menu="back">게임으로 돌아가기</button><p class="storage-note">점수 추가·배수 아이템 없음. 조작 CONTROL 16 / 기본 난이도 NOVICE 7 유지.</p>`,'dev');}
const bitmap=document.createElement('canvas');bitmap.width=M.W;bitmap.height=M.H;
const bg=bitmap.getContext('2d'),pixels=bg.createImageData(M.W,M.H),sprites=new WeakMap();let ghost=null;
const playing=()=>state==='playing'||state==='clearing';
const canAct=()=>state==='playing'&&run?.active&&(kind==='normal'||run.state==='falling');
const pieceID=()=>kind==='sand'?run?.active?.id:run?.active?.cells[0]?.id;
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
  if(final&&!finalSaved){r.plays=finite(r.plays)+1;r.last={score:run.score,seconds:Math.floor(elapsed/1000),lines:kind==='normal'?run.lines:0,units:kind==='sand'?Math.floor(run.removed/M.UNIT):0,combo:kind==='normal'?run.maxCombo:run.maxChain};}
  s.endlessV1[key]=r;
 });
 if(final)finalSaved=true;
 lastSave=performance.now();
}
function seed(){const n=new Uint32Array(2);if(window.crypto?.getRandomValues)window.crypto.getRandomValues(n);else{n[0]=Math.random()*4294967295;n[1]=Date.now();}return'ENDLESS-'+Array.from(n,x=>x.toString(36)).join('-');}
function name(){return kind==='normal'?'일반':'모래';}
function timeText(){const n=Math.floor(elapsed/1000);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
function clearInput(){
 const d=drag;if(d?.holdTimer)clearTimeout(d.holdTimer);drag=null;repeat=null;heldKeys.clear();
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
function showPanel(html,view){if(view==='over')resultHTML=html;overlayView=view;panel.innerHTML=html;$('overlay').hidden=false;$('app').inert=true;panel.focus({preventScroll:true});}
function hidePanel(){$('overlay').hidden=true;$('app').inert=false;overlayView='';}
function ruleHTML(){return kind==='normal'?'<b>줄 제거 점수</b><br>1줄 100 · 2줄 300 · 3줄 500 · 4줄 800점<br>줄 제거 점수 × 현재 레벨<br>연속으로 제거하면 두 번째부터 콤보 보너스<br>+50 × (연속 제거 횟수 − 1) × 레벨<br>천천히 하강: 칸당 1점 · 즉시 하강: 칸당 2점<br>10줄마다 낙하 레벨 상승<br><br><b>블록 아이템 V2</b><br>아이템으로 추가 제거한 칸·줄에는 점수나 콤보가 붙지 않습니다.<br>저주를 제때 정화하면 좋은 블록 예약 게이지가 쌓입니다.<br>미라의 첫 붕대 파손은 줄 제거 점수를 주지 않습니다.':'<b>모래 붕괴 점수</b><br>같은 색 12 모래량 연결 → 붕괴<br>(제거 모래량 × 20 + 제거 묶음 × 100)점<br>자연 연쇄 배수: ×1 → ×2 → ×4 → ×8…<br>배수 상한 ×1,024 · 모래주머니 하나 = 4 모래량<br>즉시 하강: 미세 격자 6칸당 1점';}
function menu(){
 adaptive?.end('menu');
 if(playing()||state==='paused')rememberScore();clearInput();shatterFX?.clear();state='menu';phase=null;pending=null;falls=[];fx=[];floaters=[];trail=null;impact=null;elapsed=0;calloutTime=0;$('callout').classList.remove('show');resetDesert();
 loadBest();run=kind==='normal'?new R.NormalGame('preview'):new M.Run({seed:'preview',colors:3,burst:12,gravity:26});
 if(kind==='normal')for(let x=0;x<10;x++)for(let y=19;y>=19-(x%3);y--)run.board[y][x]={type:Object.keys(COLORS)[(x+y)%7],mask:0,id:1000+y*10+x};
 run.active=null;showMenu();hud();draw();
}
function showMenu(){
 showPanel(`<div class="kicker">ENDLESS SCORE ATTACK</div><h1>GLASSFALL</h1><p>끝없이 쌓고, 터뜨리고,<br>나의 최고 점수를 넘어보세요.</p><div class="modes"><button class="mode-card ${kind==='normal'?'selected':''}" data-menu="normal" aria-pressed="${kind==='normal'}"><canvas class="mode-art" data-art="glass" width="320" height="180"></canvas><strong>일반 모드</strong><small>NORMAL</small></button><button class="mode-card ${kind==='sand'?'selected':''}" data-menu="sand" aria-pressed="${kind==='sand'}"><canvas class="mode-art" data-art="sand" width="320" height="180"></canvas><strong>모래 모드</strong><small>SAND</small></button></div><p class="mode-description">${kind==='normal'?'가로줄을 완성해 제거하세요.<br>블록을 바꾸는 축복과 저주를 활용하세요.':'모래주머니를 쌓고 같은 색을 모으세요.<br>붕괴와 산사태 연쇄로 더 높은 점수!'}</p><button class="primary" data-menu="start">▶ ${name()} 무한 모드 시작</button><div class="menu-best">이 모드 최고 ${recordBest.toLocaleString()}점</div><button class="text-button" data-menu="settings">점수 규칙 · 설정</button><p class="storage-note">기록은 이 브라우저에 저장됩니다.</p>`,'menu');
 for(const c of panel.querySelectorAll('.mode-art')){const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);if(c.dataset.art==='glass'){const p=new R.NormalGame('card').queue[0];normalPreview(g,p,c.width,c.height);}else{const p=M.packet(M.random('card'),3,0);sandPreview(g,p,c.width,c.height);}}
 window.GlassArt?.menu(panel);
}
function start(retry=false){
 adaptive?.end('restart');
 if(playing()||state==='paused')rememberScore();clearInput();currentSeed=retry&&currentSeed?currentSeed:seed();
 run=kind==='normal'?new R.NormalGame(currentSeed):new M.Run({seed:currentSeed,colors:3,burst:12,gravity:26,gems:0});
 state='playing';beforePause='playing';elapsed=fallTime=lockTime=lockResets=0;resetDesert();phase=null;pending=null;falls=[];fx=[];floaters=[];impact=trail=ghost=null;shatterFX?.clear();calloutTime=0;recordAnnounced=false;finalSaved=false;
 adaptive?.begin();loadBest();if(kind==='normal')maybeSeedNextItem();$('best').parentElement.classList.remove('record');last=performance.now();lastSave=last;hidePanel();$('callout').classList.remove('show');initAudio();hud();draw();
}
function pause(){if(!playing())return;beforePause=state;state='paused';document.body.classList.remove('ground-warning');clearInput();rememberScore();pausePanel();hud();}
function pausePanel(){showPanel(`<div class="kicker">PAUSED</div><h2>잠시 쉬어가세요.</h2><div class="result-meta">현재 ${run.score.toLocaleString()}점 · 최고 ${recordBest.toLocaleString()}점<br>플레이 ${timeText()}${practice()?' · 연습 기록':''}</div><button class="primary" data-menu="resume">계속하기</button><button class="secondary" data-menu="settings">점수 규칙 · 설정</button><button class="secondary" data-menu="retry">같은 판 다시 시작</button><button class="text-button" data-menu="menu">일반·모래 선택</button>`,'pause');}
function resume(){if(state!=='paused')return;clearInput();state=beforePause==='clearing'?'clearing':'playing';last=performance.now();hidePanel();hud();}
function finish(reason='unknown',detail=null){
 if(state!=='over'){adaptive?.terminal(reason,detail);adaptive?.end('gameover');}
 if(state==='over')return;state='over';document.body.classList.remove('ground-warning');clearInput();run.active=null;phase=null;pending=null;desertRecord(true);rememberScore(true);
 const ds=object(readStore()[adaptive?.desertKey()||'desertSurvival']);showPanel(`<div class="kicker">${practice()?'PRACTICE':run.score>initialBest?'NEW BEST':'GAME OVER'}</div><h2>${!practice()&&run.score>initialBest?'최고 기록을 넘었어요!':'한 번 더 도전해 볼까요?'}</h2><div class="result-score">${run.score.toLocaleString()}<small style="font-size:17px"> 점</small></div><div class="result-meta">${kind==='normal'?`제거 ${run.lines}줄 · 최대 ${run.maxCombo}연속 제거`:`제거 ${Math.floor(run.removed/M.UNIT)} 모래량 · 최대 ${run.maxChain}연쇄`}<br>플레이 ${timeText()} · 최고 ${recordBest.toLocaleString()}점${kind==='normal'?`<br>DESERT ${desert.level===8?'MAX':'LV.'+desert.level} · 지반 ${desert.rises}회<br>최고 생존 ${Math.floor(finite(ds.bestTime)/60)}:${String(Math.floor(finite(ds.bestTime)%60)).padStart(2,'0')} · 최고 DESERT LV.${finite(ds.maxLevel)}`:''}</div>${adaptive?.button()||''}<button class="primary" data-menu="new">새로운 판 시작</button><button class="secondary" data-menu="retry">같은 판 다시 도전</button><button class="text-button" data-menu="menu">일반·모래 선택</button><p class="storage-note">${adaptive?.guest?'임시 플레이는 기록과 개인 프로필에 저장하지 않습니다.':practice()?'개발자 조작을 사용한 판은 최고 기록에 저장되지 않습니다.':saveOK?'일반·모래 최고 점수는 따로 저장됩니다.':'이 브라우저에서는 기록을 저장하지 못했습니다.'}</p>`,'over');hud();
}
function settings(){
 if(playing()){beforePause=state;state='paused';clearInput();rememberScore();}
 showPanel(`<div class="kicker">HOW TO PLAY</div><h2>${name()} 모드</h2>${adaptive?.button()||''}<div class="rule-box">${ruleHTML()}</div><p>${kind==='normal'?'왼쪽·오른쪽 짧게 터치: 한 칸 이동<br>길게 누르기: 연속 이동<br>좌우 스와이프: 회전 · 위: 보관 · 아래: 즉시하강':'게임판을 좌우로 밀어 이동하세요.<br>다른 손가락으로 즉시하강을 함께 누를 수 있습니다.'}</p><div class="settings-row"><button data-menu="sound">소리 ${saved.sound?'켬':'끔'}</button><button data-menu="haptics" ${typeof navigator.vibrate!=='function'?'disabled':''}>진동 ${saved.haptics?'켬':'끔'}</button><button data-menu="effects" ${systemReduced?'disabled':''}>효과 ${reduced?'간결':'풍부'}</button></div><button class="primary" data-menu="back">${state==='paused'?'게임으로 돌아가기':'뒤로'}</button><p class="storage-note">${saveOK?'최고 점수는 이 기기·브라우저에 저장됩니다.':'저장이 제한되어 있습니다. 이번 점수는 화면에서 확인해 주세요.'}</p>`,'settings');hud();
}
panel.addEventListener('click',e=>{
 const relic=e.target.closest('[data-relic]');if(relic){if(!relic.disabled&&useRelic(relic.dataset.relic)){if(relicReturn==='dev')devPanel();else resume();}return;}
 const b=e.target.closest('button[data-menu]');if(!b||b.disabled)return;const a=b.dataset.menu;
 if(a==='normal'||a==='sand'){kind=a;pref('material',kind==='normal'?'glass':'sand');menu();}
 else if(a==='start'||a==='new')start();else if(a==='retry')start(true);else if(a==='resume')resume();else if(a==='menu')menu();else if(a==='settings')settings();
 else if(a==='sound'){pref('sound',!saved.sound);initAudio();settings();}else if(a==='haptics'){pref('haptics',!saved.haptics);settings();}
 else if(a==='effects'&&!systemReduced){reduced=!reduced;pref('effects',reduced?'light':'rich');settings();}
 else if(a==='touch-down'){pref('touchSensitivity10',Math.max(1,touchLevel()-1));settings();}
 else if(a==='touch-up'){pref('touchSensitivity10',Math.min(10,touchLevel()+1));settings();}
 else if(a==='preset'){loadPreset(b.dataset.v);devPanel();}
 else if(a==='devtime'){jumpTime(Number(b.dataset.v)||0);resume();}
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
 $('pace-label').textContent=kind==='normal'?(desert.level?'DESERT '+(desert.level===8?'MAX':'LV.'+desert.level):'LEVEL '+run.level):'CHAIN '+run.maxChain;
 $('rotate').hidden=kind==='sand';for(const b of document.querySelectorAll('[data-action]'))b.disabled=!canAct()||(b.dataset.action==='hold'&&run.holdUsed);
 $('pause').disabled=!playing();$('notice').textContent=kind==='normal'?`제거 ${run.lines}줄 · 연속 ${run.combo||0}회`:`3색 · 12 모래량 연결 → 붕괴 · 최대 ${run.maxChain}연쇄`;
 if(kind==='normal'&&desert.level>0){const left=Math.max(0,Math.ceil((desert.nextRise+desert.delay-elapsed)/1000));$('notice').textContent=`지반 상승 ${left}초 · 정화 ${itemSystem.purify}/2${practice()?' · 연습':''}`;}
 if(!saveOK)$('notice').textContent='기록 저장이 제한되어 있습니다.';
 for(const [id,p]of [['next',run.queue[0]],['next2',run.queue[1]],['held',run.held]]){const c=$(id),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);if(p)(kind==='normal'?normalPreview:sandPreview)(g,p,c.width,c.height);}
}
function rebase(){if(!drag||!run.active)return;drag.originX=run.active.x;drag.anchorX=drag.lastX;drag.shift=0;drag.piece=pieceID();drag.downAnchor=drag.lastY;}
function carry(){
 if(!drag||drag.axis==='y')return false;
 // Commit the continuously tracked target before drop/hold. This prevents a
 // pointermove arriving one frame late from dropping in the previous column.
 if(kind==='normal'&&run.active&&Number.isFinite(drag.virtualX))moveTo(Math.round(drag.virtualX));
 drag.lane=run.active.x;drag.originX=run.active.x;drag.startPieceX=run.active.x;drag.startX=drag.lastX;drag.anchorX=drag.lastX;drag.virtualX=run.active.x;drag.shift=0;drag.axis='x';drag.noRelease=true;drag.piece=null;return true;
}
function moveTo(x){
 if(!run.active)return false;
 if(kind==='sand'){run.moveTo(x);return run.active.x===Math.round(x);}
 const target=Math.round(x);let steps=0;while(run.active.x!==target&&steps++<20){if(!action(target>run.active.x?'right':'left'))break;}return run.active.x===target;
}
function restore(){if(!drag||!drag.noRelease||!run.active)return;moveTo(drag.lane);rebase();}
function nextNormal(){
 phase=null;pending=null;falls=[];state='playing';fallTime=lockTime=lockResets=0;
 desertTick();if(state==='over')return;
 if(!run.spawn()){finish('spawn_collision');return;}maybeSeedNextItem();restore();hud();
}
function lockNormal(keep=false){
 if(!run.active)return;adaptive?.beforeLock();if(!keep)clearInput();
 const p=run.active;impact={x:(p.x+1.5)*36,y:(p.y+Math.max(...p.cells.map(c=>c.y))+1)*36,life:340,total:340};
 run.lock();adaptive?.locked();B.arm(run.board,elapsed);vibrate(7);pending=R.linePlan(run.board);
 if(pending){pending.itemAt=elapsed;state='clearing';phase='flash';phaseTime=0;hud();}
 else{run.noClear();adaptive?.resolved(null,null);nextNormal();}
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
 const n=plan.rows.length;
 if(!reduced&&shatterFX)shatterFX.trigger(plan.cells.map(c=>({col:c.x,row:c.y})),Math.max(1,n));
 const cap=reduced?45:260,count=reduced?1:8;
 for(const c of plan.cells)for(let i=0;i<count&&fx.length<cap;i++){const life=650+Math.random()*220;fx.push({x:(c.x+.5)*36,y:(c.y+.5)*36,vx:(Math.random()-.5)*260,vy:-90-Math.random()*160,gravity:350,life,total:life,size:2+Math.random()*4.5,kind:'glass',spark:i%4===0,sprite:Math.floor(Math.random()*8),angle:Math.random()*6.28,color:COLORS[c.cell.type]?.[0]||COLORS.I[0]});}
 if(!n){tone('clear');return;}
 const cfg=desertCfg(),extra=cfg.lv>0?Math.floor(result.gain*(cfg.mult-1)):0;if(extra>0){run.score+=extra;result.gain+=extra;}
 // This is the existing DESERT level multiplier, not an item multiplier.
 const remaining=desert.nextRise+desert.delay-(plan.itemAt??elapsed),imminent=cfg.lv>0&&remaining>=0&&remaining<=3000;
 if(imminent){const bonus=250*cfg.lv;run.score+=bonus;desert.lastEscapeUntil=elapsed+1000;callout('LAST ESCAPE','+'+bonus.toLocaleString()+'점 · 상승 직전 탈출');}
 if(n===4&&cfg.lv>0){adaptive?.system('relic');desert.delay=Math.min(15000,desert.delay+5000);awardRelic('PYRAMID COLLAPSE');desert.warned=false;callout('PYRAMID COLLAPSE','다음 지반 상승 +5초 지연');}
 const y=plan.rows.reduce((s,r)=>s+r+.5,0)/n*36;floaters.push({x:180,y,gain:result.gain,life:1000,total:1000,rows:plan.rows,color:'#b6f3e5',power:Math.min(3,n)});floaters=floaters.slice(-6);
 const title=n===4?'4 LINES!':n+' LINE'+(n>1?'S':'');if(!imminent&&(n!==4||cfg.lv===0))callout(result.combo>1?result.combo+' COMBO!':title,'+'+result.gain.toLocaleString()+'점'+(result.bonus?' · 콤보 +'+result.bonus:''));tone('clear',n);vibrate(result.combo>1?[12,35,12]:12);
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
 const dt=Math.min(100,Math.max(0,raw));const hitStop=kind==='normal'&&!reduced&&shatterFX?shatterFX.update(dt):false;if(!playing()||hitStop)return;elapsed+=dt;adaptive?.tick(raw);
 desertTick();if(!playing())return;itemTick();if(repeat&&canAct()){repeat.time-=dt;let n=0;while(repeat&&repeat.time<=0&&n++<4){const r=repeat;if(r.hidden&&r.drag===drag)hiddenMove(r.drag,r.action==='left'?-1:1);else action(r.action);if(repeat===r)r.time+=r.hidden?38:70;}}
 if(kind==='sand'){run.step(Math.min(50,dt));sandEvents();}
 else if(state==='playing'){
  if(run.active&&!run.fits(run.active,0,1)){fallTime=0;lockTime+=dt;if(lockTime>=run.lockDelay)lockNormal();}
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
 if(!practice()&&initialBest>0&&run.score>initialBest&&!recordAnnounced){recordAnnounced=true;$('best').parentElement.classList.add('record');}
 if(run.score>0&&performance.now()-lastSave>1500){rememberScore();desertRecord();}if(kind==='normal'&&desert.level>0&&Math.floor(elapsed/60000)>desert.relicMeter){desert.relicMeter=Math.floor(elapsed/60000);awardRelic('장기 생존');}
}
function desertAtmosphere(g){
 if(kind!=='normal')return;const lv=desert.level,t=Math.min(1,lv/8);
 if(lv>=3){g.save();g.fillStyle=`rgba(92,38,20,${.035*lv})`;g.fillRect(0,0,360,720);g.restore();}
 if(lv>=6&&!reduced){g.save();g.globalAlpha=.10+.025*(lv-6);g.strokeStyle='#e8bd72';g.lineWidth=2;for(let i=0;i<14;i++){const y=(i*57+(elapsed/35)%57)%720;g.beginPath();g.moveTo(0,y);g.lineTo(360,y-55);g.stroke();}g.restore();}
 const danger=run?.board?run.board.slice(0,5).some(row=>row.some(Boolean)):false;
 if(danger){g.save();g.strokeStyle='rgba(255,91,53,.72)';g.setLineDash([10,7]);g.lineWidth=2;g.beginPath();g.moveTo(0,108);g.lineTo(360,108);g.stroke();g.restore();}
 if(desert.previewHoles){g.save();g.fillStyle='rgba(255,220,115,.22)';for(const x of desert.previewHoles)g.fillRect(x*36,684,36,36);g.restore();}
}
function pyramidProgress(g){
 if(kind!=='normal')return;const step=Math.min(8,Math.floor(elapsed/120000)),baseY=640,cx=180;
 g.save();g.globalAlpha=.18+.055*step;for(let layer=0;layer<=step;layer++){const w=55+layer*22,h=18,y=baseY-layer*18;g.fillStyle=layer===step?'#e9c36f':'#9d6a35';g.beginPath();g.moveTo(cx-w/2,y);g.lineTo(cx+w/2,y);g.lineTo(cx+w/2-9,y+h);g.lineTo(cx-w/2+9,y+h);g.closePath();g.fill();}
 if(step>=5){g.globalAlpha=.65;g.fillStyle='#f3d781';g.fillRect(cx-4,baseY-(step+1)*18-14,8,14);}
 if(step>=7){g.strokeStyle='#e6b95f';g.lineWidth=3;for(const x of [92,268]){g.beginPath();g.moveTo(x,620);g.lineTo(x,540);g.stroke();g.beginPath();g.moveTo(x-7,548);g.lineTo(x,532);g.lineTo(x+7,548);g.stroke();}}
 g.restore();
}
function drawPyramidBackground(g){
 const sky=g.createLinearGradient(0,0,0,720);sky.addColorStop(0,'#171321');sky.addColorStop(.42,'#6e4328');sky.addColorStop(.7,'#c58a48');sky.addColorStop(1,'#3a2419');g.fillStyle=sky;g.fillRect(0,0,360,720);
 g.save();g.globalAlpha=.7;g.fillStyle='#f0b45c';g.beginPath();g.arc(292,112,48,0,Math.PI*2);g.fill();g.globalAlpha=.42;g.fillStyle='#d5a45e';g.beginPath();g.moveTo(-35,610);g.lineTo(105,310);g.lineTo(245,610);g.closePath();g.fill();g.fillStyle='#9a6437';g.beginPath();g.moveTo(105,310);g.lineTo(245,610);g.lineTo(160,610);g.closePath();g.fill();
 g.globalAlpha=.28;g.fillStyle='#e6bd76';g.beginPath();g.moveTo(145,625);g.lineTo(265,390);g.lineTo(390,625);g.closePath();g.fill();g.fillStyle='#7b4a2d';g.beginPath();g.moveTo(265,390);g.lineTo(390,625);g.lineTo(318,625);g.closePath();g.fill();
 g.globalAlpha=.22;g.fillStyle='#f2cf8b';g.fillRect(0,610,360,110);
 g.globalAlpha=.22;g.strokeStyle='#6d4026';g.lineWidth=2;for(let yy=350;yy<610;yy+=24){g.beginPath();g.moveTo(0,yy);g.lineTo(360,yy);g.stroke();}
 g.globalAlpha=.32;g.fillStyle='#d8a45c';g.beginPath();g.moveTo(0,650);g.quadraticCurveTo(90,610,180,655);g.quadraticCurveTo(270,700,360,642);g.lineTo(360,720);g.lineTo(0,720);g.closePath();g.fill();g.restore();
 const haze=g.createLinearGradient(0,0,0,720);haze.addColorStop(0,'rgba(20,12,18,.18)');haze.addColorStop(.55,'rgba(38,20,15,.08)');haze.addColorStop(1,'rgba(18,10,10,.48)');g.fillStyle=haze;g.fillRect(0,0,360,720);pyramidProgress(g);
}
function pyramidTile(g,c,x,y,size){
 const pair=COLORS[c.type]||COLORS.I,dark=pair[1],light=pair[0],r=Math.max(2,size*.055);
 g.save();const grad=g.createLinearGradient(x,y,x+size,y+size);grad.addColorStop(0,light);grad.addColorStop(.52,'#c99a52');grad.addColorStop(1,dark);g.fillStyle=grad;g.beginPath();g.roundRect(x,y,size,size,r);g.fill();
 g.strokeStyle='rgba(255,225,154,.55)';g.lineWidth=Math.max(.7,size*.025);g.stroke();
 g.globalAlpha=.28;g.strokeStyle='#6e4527';g.lineWidth=Math.max(.6,size*.018);for(let k=1;k<4;k++){const yy=y+size*k/4;g.beginPath();g.moveTo(x+2,yy);g.lineTo(x+size-2,yy+(k%2?1:-1));g.stroke();}
 const mark=(c.id??0)%5;g.globalAlpha=.36;g.strokeStyle='#5b3521';g.lineWidth=Math.max(.7,size*.024);g.beginPath();if(mark===0){g.moveTo(x+size*.3,y+size*.65);g.lineTo(x+size*.5,y+size*.28);g.lineTo(x+size*.7,y+size*.65);}else if(mark===1){g.arc(x+size*.5,y+size*.5,size*.18,0,Math.PI*2);}else if(mark===2){g.moveTo(x+size*.28,y+size*.5);g.lineTo(x+size*.72,y+size*.5);g.moveTo(x+size*.5,y+size*.28);g.lineTo(x+size*.5,y+size*.72);}else if(mark===3){g.moveTo(x+size*.28,y+size*.65);g.quadraticCurveTo(x+size*.5,y+size*.25,x+size*.72,y+size*.65);}else{g.rect(x+size*.34,y+size*.34,size*.32,size*.32);}g.stroke();g.restore();return true;
}
function normalCell(g,c,x,y,size=36,alpha=1,ghostCell=false,hot=false){
 const [light,dark]=COLORS[c.type]||COLORS.I;g.save();g.globalAlpha=alpha;const m=Math.max(1.4,size*.055),r=Math.max(2,size*.08),px=x+m,py=y+m,s=size-m*2;
 if(ghostCell){g.fillStyle=light+'20';g.fillRect(px,py,s,s);g.strokeStyle=light;g.lineWidth=1.5;g.strokeRect(px+.5,py+.5,s-1,s-1);g.restore();return;}
 if(!pyramidTile(g,c,px,py,s)){const fill=g.createLinearGradient(px,py,px+s,py+s);fill.addColorStop(0,light+'a8');fill.addColorStop(.35,dark+'ba');fill.addColorStop(1,dark+'58');g.fillStyle=fill;g.beginPath();g.roundRect(px,py,s,s,r);g.fill();g.strokeStyle=light+'a0';g.lineWidth=.8;g.stroke();g.beginPath();g.moveTo(px+3,py+s-3);g.lineTo(px+3,py+3);g.lineTo(px+s-3,py+3);g.strokeStyle='#ffffff80';g.stroke();g.beginPath();g.moveTo(px+2,py+s*.53);g.lineTo(px+s*.55,py+2);g.lineTo(px+s*.78,py+2);g.lineTo(px+2,py+s*.78);g.closePath();g.fillStyle='#ffffff0e';g.fill();}
 if(c.special&&DESERT_ITEMS[c.special.type]){const it=DESERT_ITEMS[c.special.type],sp=c.special;g.save();g.globalAlpha=sp.failed?.48:.96;g.strokeStyle=it.color;g.lineWidth=2;g.strokeRect(px+1,py+1,s-2,s-2);g.fillStyle=it.color;g.beginPath();g.arc(px+s*.69,py+s*.30,Math.max(5,s*.21),0,Math.PI*2);g.fill();g.fillStyle='#17120e';g.font=`700 ${Math.max(8,s*.24)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(it.icon,px+s*.69,py+s*.30);g.fillStyle='#fff';g.font=`700 ${Math.max(7,s*.22)}px sans-serif`;if(sp.deadline&&!sp.failed)g.fillText(String(Math.max(0,Math.ceil((sp.deadline-elapsed)/1000))),px+s*.27,py+s*.75);if(sp.type==='mummy')g.fillText(String(sp.hp),px+s*.27,py+s*.75);g.restore();}
 if(hot){g.fillStyle='#dbfff588';g.fillRect(px,py,s,s);}g.restore();
}
function previewItemLabel(g,p,w,h){const sp=p?.cells?.find(c=>c.special)?.special;if(!sp)return;const it=DESERT_ITEMS[sp.type];if(!it)return;g.save();g.fillStyle=it.color;g.globalAlpha=.96;g.font=`700 ${Math.max(9,w*.075)}px sans-serif`;g.textAlign='center';g.textBaseline='bottom';g.fillText((it.kind==='good'?'★ ':'⚠ ')+it.label,w/2,h-2,w-6);g.restore();}
function normalPreview(g,p,w,h){if(!p)return;const minX=Math.min(...p.cells.map(c=>c.x)),maxX=Math.max(...p.cells.map(c=>c.x)),minY=Math.min(...p.cells.map(c=>c.y)),maxY=Math.max(...p.cells.map(c=>c.y));const reserve=p.cells.some(c=>c.special)?18:0,hh=h-reserve;const size=Math.min((w-16)/(maxX-minX+1),(hh-16)/(maxY-minY+1),w*.21),x=(w-(maxX-minX+1)*size)/2,y=(hh-(maxY-minY+1)*size)/2;for(const c of p.cells)normalCell(g,c,x+(c.x-minX)*size,y+(c.y-minY)*size,size);previewItemLabel(g,p,w,h);}
function sprite(p){let out=sprites.get(p.grains);if(out)return out;const b=p.bounds,c=document.createElement('canvas');c.width=b.right-b.left+1;c.height=b.bottom-b.top+1;const g=c.getContext('2d'),im=g.createImageData(c.width,c.height);for(const grain of p.grains){const i=((grain.y-b.top)*c.width+grain.x-b.left)*4;im.data.set([...M.tint(p.color,grain.shade),255],i);}g.putImageData(im,0,0);sprites.set(p.grains,c);return c;}
function drawPacket(g,p,cx,cy,scale=3,alpha=1){if(!p)return;g.save();g.globalAlpha=alpha;g.imageSmoothingEnabled=false;g.drawImage(sprite(p),cx+p.bounds.left*scale,cy+p.bounds.top*scale,(p.bounds.right-p.bounds.left+1)*scale,(p.bounds.bottom-p.bounds.top+1)*scale);g.restore();}
function sandPreview(g,p,w,h){if(!p)return;const b=p.bounds,scale=Math.min((w-18)/(b.right-b.left+1),(h-18)/(b.bottom-b.top+1));drawPacket(g,p,w/2-(b.left+b.right+1)*scale/2,h/2-(b.top+b.bottom+1)*scale/2,scale);}
function paintSand(){
 if(!run.field.dirty)return;const a=run.field.cells,s=run.field.shade,p=pixels.data;
 for(let i=0;i<a.length;i++){const j=i*4,c=a[i];if(c===0||c===4){p[j+3]=0;continue;}const rgb=M.tint(c,s[i],i>=M.W&&!a[i-M.W]?9:0);p[j]=rgb[0];p[j+1]=rgb[1];p[j+2]=rgb[2];p[j+3]=255;}
 bg.putImageData(pixels,0,0);run.field.dirty=false;ghost=null;
}
function draw(){
 if(!run)return;ctx.clearRect(0,0,360,720);ctx.fillStyle=kind==='sand'?'#15171b':'#2a1a10';ctx.fillRect(0,0,360,720);
 if(kind==='sand'){
  paintSand();ctx.imageSmoothingEnabled=false;ctx.drawImage(bitmap,0,0,360,720);
  if(run.active){const p=run.active;if(!ghost||ghost.x!==p.x||ghost.grains!==p.grains)ghost={x:p.x,grains:p.grains,y:run.field.dropY(p)};if(ghost.y-p.y>3)drawPacket(ctx,p,p.x*3,ghost.y*3,3,.13);drawPacket(ctx,p,p.x*3,p.y*3);}
  if(run.pending){ctx.save();ctx.fillStyle='#fff4d1';ctx.globalAlpha=reduced?.16:.27;for(const group of run.pending)for(const i of group.indices)ctx.fillRect(i%M.W*3,Math.floor(i/M.W)*3,3,3);ctx.restore();}
 }else{
  ctx.imageSmoothingEnabled=true;drawPyramidBackground(ctx);desertAtmosphere(ctx);ctx.strokeStyle='#8fbed109';ctx.lineWidth=1;ctx.beginPath();for(let x=1;x<10;x++){ctx.moveTo(x*36,0);ctx.lineTo(x*36,720);}for(let y=1;y<20;y++){ctx.moveTo(0,y*36);ctx.lineTo(360,y*36);}ctx.stroke();
  const map=new Map(falls.map(f=>[f.cell.id,f])),hot=new Set(pending?.rows||[]);
  for(let y=0;y<20;y++)for(let x=0;x<10;x++){const c=run.board[y][x];if(!c)continue;const f=map.get(c.id),t=Math.min(1,phaseTime/200),yy=f&&phase==='fall'?f.from+(f.to-f.from)*(1-Math.pow(1-t,3)):y;normalCell(ctx,c,x*36,yy*36,36,1, false,hot.has(y));}
  if(run.active){const p=run.active,d=run.dropDistance();for(const c of p.cells)normalCell(ctx,c,(p.x+c.x)*36,(p.y+c.y+d)*36,36,.75,true);for(const c of p.cells)normalCell(ctx,c,(p.x+c.x)*36,(p.y+c.y)*36);}
 }
 if(trail&&!reduced){ctx.save();ctx.globalAlpha=trail.life/900;ctx.fillStyle='#c2fff2';for(const c of trail.cells)ctx.fillRect(c.x*36+5,c.y*36,26,(trail.distance+1)*36);ctx.restore();}
 if(impact&&!reduced){const t=1-impact.life/impact.total;ctx.save();ctx.globalAlpha=(1-t)*.55;ctx.strokeStyle='#b7fff0';ctx.lineWidth=2*(1-t)+.5;ctx.beginPath();ctx.ellipse(impact.x,Math.min(714,impact.y),20+90*t,3+13*t,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const p of fx){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=Math.min(1,p.life/350);if(p.spark&&!reduced){ctx.strokeStyle=p.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-p.size*2,0);ctx.lineTo(p.size*2,0);ctx.moveTo(0,-p.size*2);ctx.lineTo(0,p.size*2);ctx.stroke();}ctx.fillStyle=p.color;if(p.kind==='sand')ctx.fillRect(0,0,1.6,1.6);else{ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size*.7,-p.size*.6);ctx.lineTo(p.size*.2,p.size);ctx.closePath();ctx.fill();}ctx.restore();}
 if(kind==='normal'&&!reduced)shatterFX?.draw();
 for(const f of floaters){const t=1-f.life/f.total;ctx.save();ctx.globalAlpha=Math.min(1,f.life/220);if(!reduced){ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.globalAlpha=(1-t)*.6;ctx.beginPath();ctx.ellipse(f.x,f.y,25+t*145,10+t*55,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6,near=10+t*100,far=near+22*(1-t)*f.power;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*near,f.y+Math.sin(a)*near*.6);ctx.lineTo(f.x+Math.cos(a)*far,f.y+Math.sin(a)*far*.6);ctx.stroke();}}ctx.globalAlpha=Math.min(1,f.life/220);ctx.font='600 21px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f1fff9';ctx.fillText('+'+f.gain.toLocaleString(),180,Math.max(30,f.y-12-t*35));ctx.restore();}
}
function fastDown(d,x,y,now){const dx=x-d.startX,dy=y-d.startY,age=Math.max(1,now-d.started);if(kind==='sand')return!d.noRelease&&d.axis==='y'&&!d.soft&&dy>45&&dy>Math.abs(dx)*1.5&&age<350&&dy/age>.4;return!d.noRelease&&dy>=Math.max(48,d.unit*1.5)&&age<=380&&dy>Math.abs(dx)*1.35&&d.peakDown-dy<d.unit*.65;}
function hiddenMove(d,dir){
 if(!canAct()||kind!=='normal')return false;
 const before=run.active.x,moved=action(dir<0?'left':'right');
 if(moved){d.translated=true;d.lane=run.active.x;d.virtualX=run.active.x;}
 return run.active.x!==before;
}
function hiddenRepeat(d,now){
 if(kind!=='normal'||d.mode!=='tap'||!canAct())return;
 const held=now-d.started;if(held<115)return;
 if(!d.repeatStarted){d.repeatStarted=true;d.repeatNext=now;d.mode='hold';}
 let n=0;while(now>=d.repeatNext&&n++<4){hiddenMove(d,d.side);d.repeatNext+=42;}
}
function processSwipe(d,x,y,now){
 if(drag!==d||!playing())return;d.lastX=x;d.lastY=y;
 if(d.piece!==null&&d.piece!==pieceID()){clearInput();return;}
 const dx=x-d.startX,dy=y-d.startY;d.peakX=Math.max(d.peakX,Math.abs(dx));d.peakDown=Math.max(d.peakDown,dy);d.peakDistance=Math.max(d.peakDistance,Math.hypot(dx,dy));
 if(kind==='normal'){
  // CONTROL 12: invisible left/right pad. Short touch = one cell. Hold = DAS/ARR.
  // A deliberate downward swipe always wins and performs hard drop.
  const swipe=Math.max(30,d.unit*.9);
  // Vertical gestures: up = hold, down = hard drop.
  if(!d.dropIntent&&!d.rotateIntent&&!d.holdIntent&&dy>swipe&&dy>Math.abs(dx)*1.25)d.dropIntent=true;
  if(!d.dropIntent&&!d.rotateIntent&&!d.holdIntent&&dy<-swipe&&-dy>Math.abs(dx)*1.25){
   d.holdIntent=true;d.mode='holdSwipe';if(d.holdTimer){clearTimeout(d.holdTimer);d.holdTimer=null;}if(repeat?.hidden&&repeat.drag===d)repeat=null;
  }
  // Horizontal swipe is rotation: right=CW, left=CCW. It must be a real swipe,
  // not the stationary left/right hidden pad hold.
  if(!d.dropIntent&&!d.rotateIntent&&Math.abs(dx)>swipe&&Math.abs(dx)>Math.abs(dy)*1.35){
   d.rotateIntent=dx>0?1:-1;d.mode='rotate';if(d.holdTimer){clearTimeout(d.holdTimer);d.holdTimer=null;}if(repeat?.hidden&&repeat.drag===d)repeat=null;
  }
  if(d.dropIntent||d.rotateIntent||d.holdIntent)return;
  hiddenRepeat(d,now);return;
 }
 if(!d.axis&&Math.max(Math.abs(dx),Math.abs(dy))>9){d.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';d.vertical=Math.sign(dy);}
 if(d.axis==='x'&&canAct()){const before=run.active.x,target=d.originX+(x-d.anchorX)/canvas.getBoundingClientRect().width*M.W;run.moveTo(target);if(Math.abs(target-run.active.x)>2)rebase();if(before!==run.active.x)d.translated=true;}
 else if(d.axis==='y'&&d.vertical===1&&dy>0&&canAct()){if(now-d.started>300)d.soft=true;if(d.soft){const unit=canvas.getBoundingClientRect().height/M.H;let n=Math.min(80,Math.floor((y-d.downAnchor)/unit));while(n-->0){d.downAnchor+=unit;const id=pieceID();run.softDrop(1);if(id!==pieceID()){clearInput();break;}}}}
}
canvas.addEventListener('pointerdown',e=>{
 if(!canAct()||drag||e.button!==0)return;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);repeat=null;initAudio();const r=canvas.getBoundingClientRect(),side=e.clientX<r.left+r.width/2?-1:1;
 drag={id:e.pointerId,piece:pieceID(),startX:e.clientX,startY:e.clientY,anchorX:e.clientX,lastX:e.clientX,lastY:e.clientY,started:performance.now(),originX:run.active.x,startPieceX:run.active.x,virtualX:run.active.x,lane:run.active.x,shift:0,axis:null,mode:kind==='normal'?'tap':null,side,repeatStarted:false,repeatNext:0,dropIntent:false,rotateIntent:0,holdIntent:false,holdTimer:null,peakDistance:0,soft:false,translated:false,noRelease:false,peakX:0,peakDown:0,downAnchor:e.clientY,unit:Math.max(23,Math.min(36,r.width/10)),rowUnit:Math.max(12,r.height/20)};
 if(kind==='normal'){const d=drag;d.holdTimer=setTimeout(()=>{if(drag!==d||d.dropIntent||d.rotateIntent||d.holdIntent||d.peakDistance>16||!canAct())return;d.repeatStarted=true;d.mode='hold';hiddenMove(d,d.side);repeat={id:'hidden-'+d.id,action:d.side<0?'left':'right',time:38,hidden:true,drag:d};},92);}
});
canvas.addEventListener('pointermove',e=>{const d=drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();processSwipe(d,e.clientX,e.clientY,performance.now());});
canvas.addEventListener('pointerup',e=>{
 const d=drag;if(!d||d.id!==e.pointerId)return;e.preventDefault();const now=performance.now();processSwipe(d,e.clientX,e.clientY,now);if(drag!==d)return;if(d.holdTimer)clearTimeout(d.holdTimer);if(repeat?.hidden&&repeat.drag===d)repeat=null;drag=null;
 if(!canAct()||d.piece!==pieceID()||d.noRelease)return;
 if(kind==='normal'){
  if(d.holdIntent){action('hold');return;}
  if(d.dropIntent||fastDown(d,e.clientX,e.clientY,now)){action('drop');return;}
  if(d.rotateIntent){action(d.rotateIntent>0?'rotate':'rotateCCW');return;}
  if(!d.repeatStarted&&now-d.started<115&&d.peakDistance<18)hiddenMove(d,d.side);
  return;
 }
 if(fastDown(d,e.clientX,e.clientY,now))action('drop');
});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(drag?.id===e.pointerId)clearInput();});
for(const b of document.querySelectorAll('[data-action]')){
 b.addEventListener('pointerdown',e=>{if(e.button!==0||b.disabled)return;e.preventDefault();b.setPointerCapture?.(e.pointerId);action(b.dataset.action);b.classList.add('pressed');});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>b.classList.remove('pressed'));
 b.addEventListener('click',e=>{if(e.detail===0&&!b.disabled)action(b.dataset.action);});
}
for(const b of document.querySelectorAll('[data-preview]'))b.addEventListener('click',()=>{
 if(!run||!playing())return;const p=run.queue[Number(b.dataset.preview)];previewReturn='playing';beforePause=state;state='paused';clearInput();rememberScore();const sp=p?.cells?.find(c=>c.special)?.special,it=sp&&DESERT_ITEMS[sp.type];
 showPanel('<div class="kicker">NEXT</div><h2>'+ (b.dataset.preview==='0'?'다음 블록':'두 번째 다음 블록')+'</h2><canvas class="preview-large" id="preview-large" width="240" height="240"></canvas>'+(it?'<p>'+it.help+'<br>추가 점수 없음 · NEXT/보관 중 저주 시간 정지</p>':'')+'<button class="primary" data-menu="back">계속하기</button>','preview');const g=$('preview-large').getContext('2d');(kind==='normal'?normalPreview:sandPreview)(g,p,240,240);hud();
});
$('pause').addEventListener('click',pause);
$('mode-label')?.addEventListener('click',()=>{if(kind==='normal'&&run&&state!=='menu'&&state!=='over')showRelics();});
$('build')?.addEventListener('click',()=>{if(kind!=='normal'||!run||state==='menu'||state==='over')return;if(playing())beforePause=state;state='paused';document.body.classList.remove('ground-warning');clearInput();devPanel();hud();});
const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',x:'rotate',X:'rotate',' ':'drop',c:'hold',C:'hold'};
document.addEventListener('keydown',e=>{
 if(['Escape','p','P'].includes(e.key)){if(e.repeat)return;e.preventDefault();if(state==='paused')resume();else pause();return;}
 if(e.target.closest?.('input,select,textarea,[contenteditable]')||e.key===' '&&e.target.closest?.('button,a'))return;
 const a=keys[e.key];if(!a||!canAct())return;e.preventDefault();if(e.repeat||heldKeys.has(e.key))return;heldKeys.add(e.key);action(a);if(['left','right','down'].includes(a))repeat={id:e.key,action:a,time:200};
});
document.addEventListener('keyup',e=>{heldKeys.delete(e.key);if(repeat?.id===e.key)repeat=null;});
window.addEventListener('blur',()=>{if(playing())pause();else clearInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing())pause();});
window.addEventListener('pagehide',()=>{rememberScore();adaptive?.end('interrupted',true);clearInput();});
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
window.addEventListener('glassartready',()=>{if(overlayView==='menu')window.GlassArt?.menu(panel);hud();draw();});
function frame(now){const dt=last?now-last:0;last=now;update(dt);draw();if(now-lastHUD>=120){hud();lastHUD=now;}requestAnimationFrame(frame);}
if(new URLSearchParams(location.search).get('qa')==='1')window.__GLASSFALL_QA__={get run(){return run;},get state(){return state;},get kind(){return kind;},get drag(){return drag;},get desert(){return desert;},get items(){return itemSystem;},get elapsed(){return elapsed;},get adaptive(){return adaptive;},action,update,start,menu,pause,resume,finish,draw,hud,devPanel,jumpTime,loadPreset,itemScenario,forceNextItem,resolveNormal,riseGround,maybeSeedNextItem,useRelic,setKind(k){kind=k;menu();},lock(){lockNormal(!!drag);}};

if(window.AdaptiveBridge&&window.AdaptiveDirector)adaptive=window.AdaptiveBridge.create({
 storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},panel,
 get:()=>({run,kind,state,desert,elapsed,seed:currentSeed,practice:practice(),overlayView,
  baseInterval:desertCfg().interval,interval:desert?.adaptiveInterval||desertCfg().interval}),
 curses:()=>kind==='normal'?findSpecials().filter(q=>DESERT_ITEMS[q.s.type].kind==='bad'&&!q.s.failed).length:0,
 show:showPanel,
 pauseForPanel:()=>{if(playing()){beforePause=state;state='paused';clearInput();rememberScore();}document.body.classList.remove('ground-warning');},
 back:view=>{if(view==='over'&&state==='over'){showPanel(resultHTML,'over');return;}if(view==='dev')devPanel();else if(view==='settings')settings();else if(view==='pause')pausePanel();else if(view==='menu'||state==='menu')showMenu();else if(state==='paused')resume();else showMenu();},
 download:(filename,text)=>{const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
});

menu();fit();$('boot').hidden=true;if(new URLSearchParams(location.search).get('play')==='1')start();requestAnimationFrame(frame);
})();
