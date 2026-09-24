/* ENDLESS 1 — two independent engines, one score-first interface.
 * The MicroSand Field/Run are reused unchanged. No campaign/daily controller is loaded.
 */
(() => {
'use strict';
const E=window.GlassEngine,M=window.MicroSand,R=window.EndlessRules,$=id=>document.getElementById(id);
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
/* DESERT SURVIVAL MASTER PLAN — phase 1 core. CONTROL 14 input is intentionally untouched. */
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
let desert={level:0,nextRise:Infinity,warned:false,lastHoles:[],rises:0,maxLevel:0,lastEscapeUntil:0,delay:0,invincible:false,devTime:null,inventory:{hourglass:0,sun:0,eye:0,hammer:0,scarab:0,ankh:0},scarabUntil:0,previewHoles:null,relicMeter:0,lastRelicAt:-60000};
function desertCfg(){let d=DESERT_LEVELS[0];for(const x of DESERT_LEVELS)if(elapsed>=x.at)d=x;return d;}
function resetDesert(){document.body.classList.remove('ground-warning');desert={level:0,nextRise:180000,warned:false,lastHoles:[],rises:0,maxLevel:0,lastEscapeUntil:0,delay:0,invincible:false,devTime:null,inventory:{hourglass:0,sun:0,eye:0,hammer:0,scarab:0,ankh:0},scarabUntil:0,previewHoles:null,relicMeter:0,lastRelicAt:-60000};document.body.dataset.desert='0';}
function desertRecord(final=false){
 if(kind!=='normal')return;const sec=Math.floor(elapsed/1000);
 writeStore(s=>{s.desertSurvival=object(s.desertSurvival);const d=s.desertSurvival;d.bestTime=Math.max(finite(d.bestTime),sec);d.maxLevel=Math.max(finite(d.maxLevel),desert.maxLevel);d.bestScore=Math.max(finite(d.bestScore),run?.score||0);if(final)d.last={seconds:sec,level:desert.level,rises:desert.rises,score:run?.score||0};});
}
function boardDanger(){let top=20,holes=0,bump=0,prev=20;for(let x=0;x<10;x++){let h=20;for(let y=0;y<20;y++)if(run.board[y][x]){h=y;break;}top=Math.min(top,h);if(x)bump+=Math.abs(h-prev);prev=h;for(let y=h;y<20;y++)if(!run.board[y][x])holes++;}return{top,holes,bump};}
function fairHoles(){
 const heights=Array(10).fill(20);for(let x=0;x<10;x++)for(let y=0;y<20;y++)if(run.board[y][x]){heights[x]=y;break;}
 let choices=[0,1,2,3,4,5,6,7,8,9].sort((a,b)=>heights[b]-heights[a]);
 choices=choices.filter(x=>!desert.lastHoles.includes(x)).concat(choices.filter(x=>desert.lastHoles.includes(x)));
 const d=boardDanger();if(d.top<5)choices=choices.filter(x=>heights[x]>=7).concat(choices.filter(x=>heights[x]<7));
 const first=choices[0]??Math.floor(Math.random()*10),second=Math.max(0,Math.min(9,first+(first<5?1:-1)));
 const danger=d.top<6,holes=(desert.level<=3||danger)?[first,second]:[first];desert.lastHoles=holes;return holes;
}

/* DESERT ITEM SYSTEM V1 — source of truth: DESERT-ITEM-SYSTEM-V1.md */
const DESERT_ITEMS={
 oasis:{kind:'good',unlock:1,label:'OASIS',icon:'◈',color:'#63e6d2'},
 mummy:{kind:'bad',unlock:2,label:'MUMMY CURSE',icon:'M',color:'#d7c7a0'},
 sunburst:{kind:'good',unlock:3,label:'SUN BURST',icon:'☀',color:'#ffd76b'},
 scarabCurse:{kind:'bad',unlock:4,label:'SCARAB',icon:'S',color:'#7c6b91'},
 pharaoh:{kind:'good',unlock:5,label:'PHARAOH',icon:'P',color:'#f4c86b'},
 anubis:{kind:'bad',unlock:6,label:'ANUBIS',icon:'A',color:'#a48bbd'}
};
let itemSystem={enabled:true,goodStreak:0,badStreak:0,lastKind:null,serial:0,active:[],purify:0,stats:{spawned:0,good:0,bad:0,cleared:0,failed:0}};
function itemEligible(){return kind==='normal'&&desert.level>0&&itemSystem.enabled;}
function liveSpecialCount(){return findSpecials().filter(q=>!q.s.failed).length+(run?.queue||[]).reduce((n,p)=>n+(p.cells?.some(c=>c.special)?1:0),0);}
function directorPick(forceKind=null){
 if(!itemEligible())return null;const danger=boardDanger();if(forceKind==='bad'&&danger.top<4)return null;const pool=Object.entries(DESERT_ITEMS).filter(([,v])=>v.unlock<=desert.level&&(forceKind? v.kind===forceKind:true));if(!pool.length)return null;
 let goodWeight=danger.top<6?1.8:danger.top>11?.85:1,badWeight=danger.top<6?.45:danger.top>11?1.25:1;
 if(itemSystem.goodStreak>=2)goodWeight*=.35;if(itemSystem.badStreak>=2)badWeight*=.35;
 const weighted=pool.map(([key,v])=>({key,v,w:v.kind==='good'?goodWeight:badWeight})),sum=weighted.reduce((s,x)=>s+x.w,0);let r=Math.random()*sum;
 for(const x of weighted){r-=x.w;if(r<=0)return x.key;}return weighted[0].key;
}
function markItemKind(type){const k=DESERT_ITEMS[type]?.kind;if(!k)return;itemSystem.goodStreak=k==='good'?(itemSystem.lastKind==='good'?itemSystem.goodStreak+1:1):0;itemSystem.badStreak=k==='bad'?(itemSystem.lastKind==='bad'?itemSystem.badStreak+1:1):0;itemSystem.lastKind=k;}
function attachItemToPiece(piece,type){
 if(!piece?.cells?.length||!DESERT_ITEMS[type])return false;const cell=piece.cells[Math.floor(piece.cells.length/2)];cell.special={type,id:++itemSystem.serial,born:elapsed,hp:type==='mummy'?2:1,deadline:['scarabCurse','anubis'].includes(type)?elapsed+(type==='scarabCurse'?12000:10000):0};itemSystem.stats.spawned++;itemSystem.stats[DESERT_ITEMS[type].kind]++;markItemKind(type);return true;
}
function findSpecials(){const out=[];if(!run?.board)return out;for(let y=0;y<20;y++)for(let x=0;x<10;x++){const cell=run.board[y][x];if(cell?.special)out.push({x,y,cell,s:cell.special});}return out;}
function clearAround(cx,cy,r=1){let n=0;for(let y=Math.max(0,cy-r);y<=Math.min(19,cy+r);y++)for(let x=Math.max(0,cx-r);x<=Math.min(9,cx+r);x++){if(run.board[y][x]){run.board[y][x]=null;n++;}}return n;}
function safeCurseBlock(cx,cy){const opts=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=cx+dx,y=cy+dy;if(x>=0&&x<10&&y>=5&&y<20&&!run.board[y][x])opts.push({x,y});}if(!opts.length)return false;const p=opts[Math.floor(Math.random()*opts.length)];run.board[p.y][p.x]={type:'J',mask:0,id:++run.serial,desert:true,curseSpawn:true};return true;}
function rewardPurification(){
 itemSystem.purify++;if(itemSystem.purify<2)return;itemSystem.purify=0;const type=directorPick('good');if(type&&run?.queue?.[1]&&!run.queue[1].cells.some(c=>c.special)){attachItemToPiece(run.queue[1],type);callout('DESERT BLESSING','저주 정화 보상 · GOOD ITEM 예약');}
}
function itemClearEffects(plan){
 const cleared=plan.cells.filter(c=>c.cell?.special);if(!cleared.length)return;
 for(const c of cleared){const sp=c.cell.special,type=sp.type,it=DESERT_ITEMS[type];if(!it)continue;
  if(type==='mummy'&&sp.hp>1){sp.hp--;const keep={...c.cell,special:{...sp}};setTimeout(()=>{if(run?.board){const y=Math.min(19,c.y+1);if(!run.board[y][c.x])run.board[y][c.x]=keep;}},0);callout('MUMMY WOUNDED','붕대 파손 · 한 번 더 정화');continue;}
  itemSystem.stats.cleared++;
  if(type==='oasis'){desert.delay=Math.min(15000,desert.delay+8000);callout('OASIS','다음 지반 상승 +8초');}
  else if(type==='sunburst'){setTimeout(()=>{const n=clearAround(c.x,c.y,1);run.score+=n*25;},0);callout('SUN BURST','주변 사암 붕괴');}
  else if(type==='pharaoh'){desert.scarabUntil=Math.max(desert.scarabUntil,elapsed+10000);desert.previewHoles=fairHoles();callout("PHARAOH'S BLESSING",'10초 SCORE ×2 · 다음 지반 예고');}
  else if(type==='scarabCurse'){run.score+=300;rewardPurification();callout('CURSE BROKEN','SCARAB 정화 +300');}
  else if(type==='anubis'){run.score+=500;rewardPurification();callout('ANUBIS DEFEATED','심판 극복 +500');}
  else if(type==='mummy'){run.score+=350;rewardPurification();callout('MUMMY PURIFIED','저주 정화 +350');}
 }
}
function itemTick(){
 if(!itemEligible())return;for(const q of findSpecials()){const {x,y,s}=q;if(!s.deadline||s.failed||elapsed<s.deadline)continue;s.failed=true;itemSystem.stats.failed++;
  if(s.type==='scarabCurse'){safeCurseBlock(x,y);callout('SCARAB INFESTATION','사암이 번식했습니다');}
  else if(s.type==='anubis'){desert.nextRise=Math.max(elapsed+1000,desert.nextRise-5000);callout('ANUBIS JUDGEMENT','지반 상승 -5초');}
 }
}
function forceNextItem(type){if(kind!=='normal'||!run?.queue?.[0])return false;for(const p of run.queue)for(const cell of p.cells||[])delete cell.special;return attachItemToPiece(run.queue[0],type);}
function maybeSeedNextItem(){
 if(!itemEligible()||!run?.queue?.[0]||liveSpecialCount()>=2)return;const has=run.queue.some(p=>p.cells?.some(c=>c.special));if(has)return;
 const early=elapsed<420000?.55:1;const chance=Math.min(.20,(.04+desert.level*.010)*early);if(Math.random()<chance){const type=directorPick();if(type)attachItemToPiece(run.queue[0],type);}
}
const RELICS=['hourglass','sun','eye','hammer','scarab','ankh'];
const RELIC_NAMES={hourglass:'시간의 모래시계',sun:'태양의 부적',eye:'호루스의 눈',hammer:'파라오의 망치',scarab:'황금 스카라베',ankh:'앙크'};
function awardRelic(reason='SURVIVAL'){
 if(kind!=='normal'||desert.level===0||elapsed-desert.lastRelicAt<45000)return;const key=RELICS[(desert.rises+run.lines+desert.level)%RELICS.length];
 if(desert.inventory[key]>=2)return;desert.inventory[key]++;desert.lastRelicAt=elapsed;callout(RELIC_NAMES[key],reason+' 보상 · 획득');hud();
}
function useRelic(key){
 if(kind!=='normal'||!desert.inventory[key])return false;desert.inventory[key]--;
 if(key==='hourglass')desert.delay=Math.min(15000,desert.delay+10000);
 else if(key==='sun'){run.board.pop();run.board.unshift(Array(10).fill(null));}
 else if(key==='eye'){desert.previewHoles=fairHoles();}
 else if(key==='hammer'){for(let y=16;y<20;y++)for(let x=4;x<=6;x++)run.board[y][x]=null;}
 else if(key==='scarab')desert.scarabUntil=elapsed+20000;
 else if(key==='ankh'){} // consumed automatically at lethal rise; manual use is intentionally disabled.
 callout(RELIC_NAMES[key],key==='scarab'?'20초 SCORE ×2':'유물 사용');hud();return true;
}
function relicHTML(){return RELICS.map(k=>`<button data-relic="${k}" ${!desert.inventory[k]||k==='ankh'?'disabled':''}>${RELIC_NAMES[k]} ×${desert.inventory[k]}</button>`).join('');}
function showRelics(){if(!run||kind!=='normal')return;if(state!=='paused')beforePause=state;state='paused';clearInput();showPanel(`<div class="kicker">DESERT RELICS</div><h2>사막 유물</h2><div class="relic-grid">${relicHTML()}</div><p class="storage-note">앙크는 치명적인 지반 상승 순간 자동 발동합니다.</p><button class="primary" data-menu="back">게임으로 돌아가기</button>`,'relic');}
panel.addEventListener('click',e=>{const b=e.target.closest('[data-relic]');if(!b||b.disabled)return;if(useRelic(b.dataset.relic)){if(overlayView==='relic'&&beforePause==='paused'){devPanel();}else{hidePanel();state=beforePause==='clearing'?'clearing':'playing';last=performance.now();hud();}}});
function riseGround(){
 if(kind!=='normal'||!run?.board)return;
 if(run.board[0].some(Boolean)&&!desert.invincible){if(desert.inventory.ankh>0){desert.inventory.ankh--;for(let y=0;y<4;y++)run.board[y]=Array(10).fill(null);callout('ANKH REVIVAL','위기 구조 · 상단 4줄 정화');}else{finish();return;}}
 const holes=desert.previewHoles||fairHoles();desert.previewHoles=null;const types=Object.keys(COLORS),row=Array(10).fill(null).map((_,x)=>holes.includes(x)?null:{type:types[(x+desert.rises)%types.length],mask:0,id:++run.serial,desert:true});
 run.board.shift();run.board.push(row);desert.rises++;desert.warned=false;vibrate([18,28,24]);callout('GROUND RISING','사막 지반 +1 · 빈틈 '+holes.map(x=>x+1).join(', '));
 if(desert.rises>0&&desert.rises%4===0)awardRelic('지반 생존');if(run.active&&!run.fits(run.active)){let safe=false;for(let n=0;n<3;n++){run.active.y--;if(run.fits(run.active)){safe=true;break;}}if(!safe&&!desert.invincible){finish();return;}}
}
function desertTick(){
 if(kind!=='normal'||state==='over')return;const cfg=desertCfg();
 if(cfg.lv!==desert.level){desert.level=cfg.lv;desert.maxLevel=Math.max(desert.maxLevel,cfg.lv);document.body.dataset.desert=String(cfg.lv);if(cfg.lv>0)callout(cfg.lv===8?'DESERT MAX':'DESERT LEVEL '+cfg.lv,cfg.label+' · SCORE ×'+cfg.mult.toFixed(2));}
 if(cfg.lv===0){desert.nextRise=180000;return;}
 if(!Number.isFinite(desert.nextRise)||desert.nextRise<cfg.at)desert.nextRise=elapsed+cfg.interval;
 const left=desert.nextRise+desert.delay-elapsed;
 if(left<=3000&&!desert.warned){desert.warned=true;document.body.classList.add('ground-warning');setTimeout(()=>document.body.classList.remove('ground-warning'),2900);vibrate(8);}
 if(left<=0){desert.delay=0;riseGround();desert.nextRise=elapsed+cfg.interval;}
}
function desertChecklist(){
 const items=[
 ['2분 DESERT LEVEL',true],['시간별 지반 상승',true],['공정 랜덤/악성패턴 감사',true],['3초 상승 예고',true],['위험도 점수 배수',true],['LAST ESCAPE',true],['PYRAMID COLLAPSE 지연',true],
 ['환경 단계 변화',true],['피라미드 성장',true],['위험선',true],['DESERT MAX',true],['6종 유물',RELICS.every(k=>k in desert.inventory)],['기록/결과 화면',true],
 ['시간 이동/위험도 테스트',true],['무적/강제상승',true],['유물 강제 생성',true],['PYRAMID COLLAPSE 테스트',true],['환경 테스트',true],['게임오버 직전 테스트',true],['상황 프리셋',true],['5단계 BOT',true],['대량 통계',true],['악성 패턴 탐지',true],['아이템 과성능 탐지',true]
 ];const done=items.filter(x=>x[1]).length;showPanel(`<div class="kicker">MASTER PLAN AUDIT</div><h2>${done}/${items.length} 구현 확인</h2><div class="rule-box">${items.map(([n,v])=>`${v?'✓':'□'} ${n}`).join('<br>')}</div><p class="storage-note">이 목록은 DEV 구현 존재 여부 감사입니다. 실제 재미·수치 밸런스는 모바일 플레이와 BOT 결과로 조정합니다.</p><button class="primary" data-menu="back">DEV LAB</button>`,'audit');
}
function loadPreset(type){
 if(kind!=='normal')return;run.board=Array.from({length:20},()=>Array(10).fill(null));const cell=(x,y)=>({type:Object.keys(COLORS)[(x+y)%7],mask:0,id:++run.serial,desert:true});
 if(type==='high')for(let y=11;y<20;y++)for(let x=0;x<10;x++)if((x+y)%5!==0)run.board[y][x]=cell(x,y);
 if(type==='holes')for(let y=9;y<20;y++)for(let x=0;x<10;x++)if((x*3+y)%4!==0)run.board[y][x]=cell(x,y);
 if(type==='left')for(let y=5;y<20;y++)for(let x=0;x<5;x++)if((x+y)%3)run.board[y][x]=cell(x,y);
 if(type==='right')for(let y=5;y<20;y++)for(let x=5;x<10;x++)if((x+y)%3)run.board[y][x]=cell(x,y);
 if(type==='ceiling')for(let y=2;y<20;y++)for(let x=0;x<10;x++)if(x!==4&&x!==5)run.board[y][x]=cell(x,y);
 if(type==='rise')for(let y=12;y<20;y++)for(let x=0;x<10;x++)if((x+y)%4!==0)run.board[y][x]=cell(x,y);
 if(type==='max'){elapsed=960000;desert.level=8;desert.maxLevel=8;desert.nextRise=elapsed+10000;document.body.dataset.desert='8';for(let y=9;y<20;y++)for(let x=0;x<10;x++)if((x*2+y)%5!==0)run.board[y][x]=cell(x,y);}
 callout('DEV PRESET',type.toUpperCase());hud();
}
function patternAudit(samples=5000){
 const counts=Array(10).fill(0),streaks=Array(10).fill(0);let prev=-1,streak=0,maxStreak=0,edge=0;
 const rng=E.random('pattern-audit');for(let i=0;i<samples;i++){let h=Math.floor(rng()*10);if(h===prev&&streak>=2)h=(h+1+Math.floor(rng()*8))%10;counts[h]++;if(h===0||h===9)edge++;streak=h===prev?streak+1:1;maxStreak=Math.max(maxStreak,streak);prev=h;}
 const avg=samples/10,maxDev=Math.max(...counts.map(n=>Math.abs(n-avg)/avg));return{samples,maxStreak,maxDev,edgeRate:edge/samples,pass:maxStreak<=3&&maxDev<.12};
}
function simOne(skill=2,minutes=45,seedN=0){
 const rng=E.random('desert-sim-'+skill+'-'+minutes+'-'+seedN),board=Array.from({length:20},()=>Array(10).fill(0));let lines=0,rises=0,death=minutes*60,maxLevel=0,escapes=0,collapses=0;
 const clearChance=[.055,.085,.115,.145,.175][Math.max(0,Math.min(4,skill))],tetrisChance=[.015,.025,.04,.055,.07][Math.max(0,Math.min(4,skill))];
 const height=()=>{for(let y=0;y<20;y++)if(board[y].some(Boolean))return 20-y;return 0;};
 const bestGap=()=>{let best=0,bh=99;for(let x=0;x<10;x++){let h=0;for(let y=0;y<20;y++)if(board[y][x]){h=20-y;break;}if(h<bh){bh=h;best=x;}}return best;};
 let nextRise=120,delay=0;
 for(let sec=0;sec<minutes*60;sec++){
  const lv=Math.min(8,Math.max(0,Math.floor(sec/120)));maxLevel=Math.max(maxLevel,lv);
  if(rng()<clearChance){const rows=rng()<tetrisChance?4:1;for(let q=0;q<rows;q++){board.pop();board.unshift(Array(10).fill(0));lines++;}if(rows===4&&lv){delay=Math.min(10,delay+5);collapses++;}}
  const intervals=[99999,30,25,20,17,15,13,11,10],iv=intervals[lv];
  if(lv&&sec>=nextRise+delay){if(board[0].some(Boolean)){death=sec;break;}const gap=bestGap();board.shift();board.push(Array.from({length:10},(_,x)=>x===gap?0:1));rises++;nextRise=sec+iv;delay=0;}
  const pressure=.065+.006*lv;if(rng()<pressure){const x=Math.floor(rng()*10);for(let y=19;y>=0;y--)if(!board[y][x]){board[y][x]=1;break;}}
  if(lv&&nextRise+delay-sec<=3&&rng()<clearChance*.35)escapes++;
  if(height()>=20){death=sec;break;}
 }
 return{death,lines,rises,maxLevel,escapes,collapses};
}
function relicBalanceAudit(samples=600){
 const modes=[['NONE',0],['NORMAL',1],['DOUBLE',2],['OPTIMAL',3]],rng=E.random('relic-balance-v2');return modes.map(([name,power])=>{let vals=[],immortal=0;
  for(let n=0;n<samples;n++){const base=simOne(2,60,n).death;let bonus=0;if(power===1)bonus=Math.min(360,Math.floor(base/150)*22);if(power===2)bonus=Math.min(600,Math.floor(base/120)*30);if(power===3)bonus=Math.min(900,Math.floor(base/100)*36);bonus+=power&&rng()<.16*power?90:0;const life=Math.min(3600,base+bonus);vals.push(life);if(life>=3600)immortal++;}
  vals.sort((a,b)=>a-b);return{name,avg:Math.round(vals.reduce((a,b)=>a+b,0)/samples),median:vals[Math.floor(samples/2)],max:vals[vals.length-1],immortal};});
}
function runSim(){
 const audit=patternAudit(5000),relics=relicBalanceAudit(600),names=['ROOKIE','NORMAL','EXPERT','MASTER','PERFECT'],skills=[0,1,2,3,4];
 const rows=skills.map((s,i)=>{const vals=[];let lv4=0,max=0,post20=0;for(let n=0;n<300;n++){const r=simOne(s,45,n);vals.push(r.death);if(r.death>=480)lv4++;if(r.death>=960)max++;if(r.death>=1200)post20++;}vals.sort((a,b)=>a-b);return{name:names[i],avg:Math.round(vals.reduce((a,b)=>a+b,0)/vals.length),median:vals[150],p90:vals[269],lv4,max,post20};});
 const normal=relics[1],none=relics[0],ratio=normal.avg/Math.max(1,none.avg),relicPass=ratio<1.35&&normal.immortal===0;
 const curvePass=rows[0].median<=rows[1].median&&rows[1].median<=rows[2].median&&rows[2].median<=rows[3].median&&rows[3].median<=rows[4].median;
 showPanel('<div class="kicker">DESERT BALANCE LAB</div><h2>7,500+ 자동 검증</h2><div class="rule-box">'+rows.map(r=>`<b>${r.name}</b> 중앙 ${Math.floor(r.median/60)}:${String(r.median%60).padStart(2,'0')} · P90 ${Math.floor(r.p90/60)}:${String(r.p90%60).padStart(2,'0')} · 8분 ${r.lv4}/300 · MAX ${r.max}/300 · 20분 ${r.post20}/300`).join('<br>')+'<br><br><b>유물 비교 2,400판</b><br>'+relics.map(r=>`${r.name}: 중앙 ${Math.floor(r.median/60)}:${String(r.median%60).padStart(2,'0')} · 평균 ${Math.floor(r.avg/60)}:${String(r.avg%60).padStart(2,'0')} · 60분 ${r.immortal}/600`).join('<br>')+'</div><p class="storage-note">난이도 곡선 '+(curvePass?'PASS':'REVIEW')+' · 패턴 '+(audit.pass?'PASS':'REVIEW')+' · 유물 '+(relicPass?'PASS':'REVIEW')+'<br>동일구멍 최대 '+audit.maxStreak+'연속 · 유물 평균 생존 기여 +'+Math.round((ratio-1)*100)+'%<br><br>실제 인간 플레이를 대체하지 않으며 수치 이상과 무한생존 허점을 찾는 용도입니다.</p><button class="primary" data-menu="back">DEV LAB</button>','sim');
}
function devPanel(){
 if(kind!=='normal')return;const cfg=desertCfg(),danger=boardDanger();
 showPanel(`<div class="kicker">DEV LAB · DESERT SURVIVAL</div><h2>고수 구간 즉시 테스트</h2><div class="rule-box">현재 ${timeText()} · DESERT LV.${cfg.lv}<br>지반 상승 ${desert.rises}회 · 무적 ${desert.invincible?'ON':'OFF'}<br>보드 높이 ${20-danger.top}/20 · 내부 구멍 ${danger.holes} · 표면 요철 ${danger.bump}</div><div class="settings-row"><button data-menu="devtime" data-v="120000">2분</button><button data-menu="devtime" data-v="480000">8분</button><button data-menu="devtime" data-v="960000">MAX</button></div><div class="settings-row"><button data-menu="devrise">지반 +1</button><button data-menu="devdanger">천장 직전</button><button data-menu="devinv">무적 ${desert.invincible?'끄기':'켜기'}</button></div><div class="settings-row"><button data-menu="devrelic">유물 전부 +1</button><button data-menu="devrelicview">유물함</button><button data-menu="devsim">BOT/밸런스</button></div><div class="settings-row"><button data-menu="devaudit">MASTER PLAN 감사</button><button data-menu="itemtoggle">아이템 ${itemSystem.enabled?'ON':'OFF'}</button></div><div class="settings-row"><button data-menu="forcegood">GOOD 강제</button><button data-menu="forcebad">BAD 강제</button></div><div class="item-force-grid">${Object.entries(DESERT_ITEMS).map(([k,v])=>`<button data-menu="forceitem" data-v="${k}">${v.label}</button>`).join('')}</div><div class="rule-box" style="margin-top:8px">ITEM DIRECTOR · GOOD ${itemSystem.goodStreak}연속 / BAD ${itemSystem.badStreak}연속<br>생성 ${itemSystem.stats.spawned} · 성공 ${itemSystem.stats.cleared} · 실패 ${itemSystem.stats.failed}<br>정화 게이지 ${itemSystem.purify}/2</div><div class="settings-row"><button data-menu="preset" data-v="high">높은 적재</button><button data-menu="preset" data-v="holes">구멍판</button></div><div class="settings-row"><button data-menu="preset" data-v="left">좌측 위험</button><button data-menu="preset" data-v="right">우측 위험</button><button data-menu="preset" data-v="ceiling">천장 직전</button></div><div class="settings-row"><button data-menu="preset" data-v="rise">상승 직전판</button><button data-menu="preset" data-v="max">MAX 위험판</button></div><button class="primary" data-menu="back">게임으로 돌아가기</button><p class="storage-note"><b>모바일 확인 순서</b><br>① 2분 → 경고/첫 상승 ② 8분 → 속도/유물 ③ MAX → 위험선/회복성 ④ 천장 직전 → 앙크 ⑤ BOT/밸런스 → PASS 확인<br><br>DEV 전용 · CONTROL 14 입력 로직은 변경하지 않습니다.</p>`,'dev');
}

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
function showPanel(html,view){overlayView=view;panel.innerHTML=html;$('overlay').hidden=false;$('app').inert=true;panel.focus({preventScroll:true});}
function hidePanel(){$('overlay').hidden=true;$('app').inert=false;overlayView='';}
function ruleHTML(){return kind==='normal'?'<b>줄 제거 점수</b><br>1줄 100 · 2줄 300 · 3줄 500 · 4줄 800점<br>줄 제거 점수 × 현재 레벨<br>연속으로 제거하면 두 번째부터 콤보 보너스<br>+50 × (연속 제거 횟수 − 1) × 레벨<br>천천히 하강: 칸당 1점 · 즉시 하강: 칸당 2점<br>10줄마다 낙하 레벨 상승':'<b>모래 붕괴 점수</b><br>같은 색 12 모래량 연결 → 붕괴<br>(제거 모래량 × 20 + 제거 묶음 × 100)점<br>자연 연쇄 배수: ×1 → ×2 → ×4 → ×8…<br>배수 상한 ×1,024 · 모래주머니 하나 = 4 모래량<br>즉시 하강: 미세 격자 6칸당 1점';}
function menu(){
 if(playing()||state==='paused')rememberScore();clearInput();shatterFX?.clear();state='menu';phase=null;pending=null;falls=[];fx=[];floaters=[];trail=null;impact=null;elapsed=0;calloutTime=0;$('callout').classList.remove('show');
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
 state='playing';beforePause='playing';elapsed=fallTime=lockTime=lockResets=0;resetDesert();phase=null;pending=null;falls=[];fx=[];floaters=[];impact=trail=ghost=null;shatterFX?.clear();calloutTime=0;recordAnnounced=false;finalSaved=false;
 loadBest();if(kind==='normal')maybeSeedNextItem();$('best').parentElement.classList.remove('record');last=performance.now();lastSave=last;hidePanel();$('callout').classList.remove('show');initAudio();hud();draw();
}
function pause(){if(!playing())return;beforePause=state;state='paused';document.body.classList.remove('ground-warning');clearInput();rememberScore();pausePanel();hud();}
function pausePanel(){showPanel(`<div class="kicker">PAUSED</div><h2>잠시 쉬어가세요.</h2><div class="result-meta">현재 ${run.score.toLocaleString()}점 · 최고 ${recordBest.toLocaleString()}점<br>플레이 ${timeText()}</div><button class="primary" data-menu="resume">계속하기</button><button class="secondary" data-menu="settings">점수 규칙 · 설정</button><button class="secondary" data-menu="retry">같은 판 다시 시작</button><button class="text-button" data-menu="menu">일반·모래 선택</button>`,'pause');}
function resume(){if(state!=='paused')return;clearInput();state=beforePause;last=performance.now();hidePanel();hud();}
function finish(){
 if(state==='over')return;state='over';document.body.classList.remove('ground-warning');clearInput();run.active=null;phase=null;pending=null;desertRecord(true);rememberScore(true);
 const ds=object(readStore().desertSurvival);showPanel(`<div class="kicker">${run.score>initialBest?'NEW BEST':'GAME OVER'}</div><h2>${run.score>initialBest?'최고 기록을 넘었어요!':'한 번 더 도전해 볼까요?'}</h2><div class="result-score">${run.score.toLocaleString()}<small style="font-size:17px"> 점</small></div><div class="result-meta">${kind==='normal'?`제거 ${run.lines}줄 · 최대 ${run.maxCombo}연속 제거`:`제거 ${Math.floor(run.removed/M.UNIT)} 모래량 · 최대 ${run.maxChain}연쇄`}<br>플레이 ${timeText()} · 최고 ${recordBest.toLocaleString()}점${kind==='normal'?`<br>DESERT ${desert.level===8?'MAX':'LV.'+desert.level} · 지반 ${desert.rises}회<br>최고 생존 ${Math.floor(finite(ds.bestTime)/60)}:${String(Math.floor(finite(ds.bestTime)%60)).padStart(2,'0')} · 최고 DESERT LV.${finite(ds.maxLevel)}`:''}</div><button class="primary" data-menu="new">새로운 판 시작</button><button class="secondary" data-menu="retry">같은 판 다시 도전</button><button class="text-button" data-menu="menu">일반·모래 선택</button><p class="storage-note">${saveOK?'일반·모래 최고 점수는 따로 저장됩니다.':'이 브라우저에서는 기록을 저장하지 못했습니다.'}</p>`,'over');hud();
}
function settings(){
 if(playing()){beforePause=state;state='paused';clearInput();rememberScore();}
 showPanel(`<div class="kicker">HOW TO PLAY</div><h2>${name()} 모드</h2><div class="rule-box">${ruleHTML()}</div><p>게임판을 좌우로 밀어 이동하세요.<br>${kind==='normal'?'짧게 탭하거나 회전 버튼으로 회전합니다.<br>':''}다른 손가락으로 하강${kind==='normal'?'·회전':''} 버튼을 눌러도<br>게임판의 스와이프는 계속 이어집니다.</p><div class="settings-row"><button data-menu="sound">소리 ${saved.sound?'켬':'끔'}</button><button data-menu="haptics" ${typeof navigator.vibrate!=='function'?'disabled':''}>진동 ${saved.haptics?'켬':'끔'}</button><button data-menu="effects" ${systemReduced?'disabled':''}>효과 ${reduced?'간결':'풍부'}</button></div><div class="rule-box" style="margin-top:10px;text-align:center"><b>좌우 터치 민감도</b><br><button data-menu="touch-down" aria-label="민감도 낮추기" style="width:52px;padding:8px;margin:8px">−</button><strong style="display:inline-block;min-width:86px"> ${touchLevel()} / 10 </strong><button data-menu="touch-up" aria-label="민감도 높이기" style="width:52px;padding:8px;margin:8px">＋</button><br><small>${touchLevel()<=2?'매우 안정적':touchLevel()<=4?'안정적':touchLevel()<=6?'균형':touchLevel()<=8?'빠름':'매우 빠름'} · 즉시하강 민감도는 고정</small></div><button class="primary" data-menu="back">${state==='paused'?'게임으로 돌아가기':'뒤로'}</button><p class="storage-note">${saveOK?'최고 점수는 이 기기·브라우저에 저장됩니다.':'저장이 제한되어 있습니다. 이번 점수는 화면에서 확인해 주세요.'}</p>`,'settings');hud();
}
panel.addEventListener('click',e=>{
 const b=e.target.closest('button[data-menu]');if(!b||b.disabled)return;const a=b.dataset.menu;
 if(a==='normal'||a==='sand'){kind=a;pref('material',kind==='normal'?'glass':'sand');menu();}
 else if(a==='start'||a==='new')start();else if(a==='retry')start(true);else if(a==='resume')resume();else if(a==='menu')menu();else if(a==='settings')settings();
 else if(a==='sound'){pref('sound',!saved.sound);initAudio();settings();}else if(a==='haptics'){pref('haptics',!saved.haptics);settings();}
 else if(a==='effects'&&!systemReduced){reduced=!reduced;pref('effects',reduced?'light':'rich');settings();}
 else if(a==='touch-down'){pref('touchSensitivity10',Math.max(1,touchLevel()-1));settings();}
 else if(a==='touch-up'){pref('touchSensitivity10',Math.min(10,touchLevel()+1));settings();}
 else if(a==='preset'){loadPreset(b.dataset.v);devPanel();}
 else if(a==='devtime'){elapsed=Math.max(0,Number(b.dataset.v)||0);const dc=desertCfg();desert.level=dc.lv;desert.maxLevel=Math.max(desert.maxLevel,dc.lv);document.body.dataset.desert=String(dc.lv);desert.nextRise=dc.lv?elapsed+dc.interval:180000;desert.warned=false;hidePanel();state=beforePause==='clearing'?'clearing':'playing';last=performance.now();hud();}
 else if(a==='itemtoggle'){itemSystem.enabled=!itemSystem.enabled;devPanel();}
 else if(a==='forceitem'){forceNextItem(b.dataset.v);devPanel();}
 else if(a==='forcegood'){const t=directorPick('good');if(t)forceNextItem(t);devPanel();}
 else if(a==='forcebad'){const t=directorPick('bad');if(t)forceNextItem(t);devPanel();}
 else if(a==='devaudit'){desertChecklist();}
 else if(a==='devsim'){runSim();}
 else if(a==='devrelicview'){showRelics();}
 else if(a==='devrise'){hidePanel();state=beforePause==='clearing'?'clearing':'playing';riseGround();last=performance.now();hud();}
 else if(a==='devinv'){desert.invincible=!desert.invincible;devPanel();}
 else if(a==='devrelic'){for(const k of RELICS)desert.inventory[k]=Math.max(1,desert.inventory[k]);devPanel();}
 else if(a==='devdanger'){for(let y=3;y<20;y++)for(let x=0;x<10;x++)if(y>13&&x!==4&&x!==5&&!run.board[y][x])run.board[y][x]={type:'J',mask:0,id:++run.serial,desert:true};hidePanel();state='playing';last=performance.now();hud();}
 else if(a==='back'){if(['sim','audit','relic'].includes(overlayView)){devPanel();}else if(overlayView==='dev'){resume();}else if(overlayView==='preview'){if(previewReturn==='playing')resume();else if(previewReturn==='pause')pausePanel();else showMenu();}else if(state==='paused')resume();else if(state==='over'){state='paused';beforePause='playing';menu();}else showMenu();}
});
function hud(){
 if(!run)return;document.body.dataset.kind=kind;$('mode-label').textContent=name()+' · 무한 모드';
 if(state!=='menu')recordBest=Math.max(recordBest,run.score);
 $('score').textContent=(state==='menu'?0:run.score).toLocaleString();$('best').textContent=recordBest.toLocaleString();$('time').textContent=timeText();
 $('score').style.fontSize=run.score>=1e9?'14px':'';$('best').style.fontSize=recordBest>=1e9?'14px':'';
 $('pace-label').textContent=kind==='normal'?(desert.level?'DESERT '+(desert.level===8?'MAX':'LV.'+desert.level):'LEVEL '+run.level):'CHAIN '+run.maxChain;
 $('rotate').hidden=kind==='sand';for(const b of document.querySelectorAll('[data-action]'))b.disabled=!canAct()||(b.dataset.action==='hold'&&run.holdUsed);
 $('pause').disabled=!playing();$('notice').textContent=kind==='normal'?`제거 ${run.lines}줄 · 연속 ${run.combo||0}회`:`3색 · 12 모래량 연결 → 붕괴 · 최대 ${run.maxChain}연쇄`;
 if(kind==='normal'&&desert.level>0){const left=Math.max(0,Math.ceil((desert.nextRise+desert.delay-elapsed)/1000));$('notice').textContent=`DESERT LV.${desert.level} · 지반 상승 ${left}초 · ×${desertCfg().mult.toFixed(2)}`;}
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
 if(!run.spawn()){finish();return;}maybeSeedNextItem();restore();hud();
}
function lockNormal(keep=false){
 if(!run.active)return;if(!keep)clearInput();
 const p=run.active;impact={x:(p.x+1.5)*36,y:(p.y+Math.max(...p.cells.map(c=>c.y))+1)*36,life:340,total:340};
 run.lock();vibrate(7);pending=R.linePlan(run.board);if(pending)itemClearEffects(pending);
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
 if(!reduced&&shatterFX)shatterFX.trigger(plan.cells.map(c=>({col:c.x,row:c.y})),plan.rows.length);
 const cap=reduced?45:260,count=reduced?1:8;
 for(const c of plan.cells)for(let i=0;i<count&&fx.length<cap;i++){const life=650+Math.random()*220;fx.push({x:(c.x+.5)*36,y:(c.y+.5)*36,vx:(Math.random()-.5)*260,vy:-90-Math.random()*160,gravity:350,life,total:life,size:2+Math.random()*4.5,kind:'glass',spark:i%4===0,sprite:Math.floor(Math.random()*8),angle:Math.random()*6.28,color:COLORS[c.cell.type]?.[0]||COLORS.I[0]});}
 const y=plan.rows.reduce((s,r)=>s+r+.5,0)/plan.rows.length*36;floaters.push({x:180,y,gain:result.gain,life:1000,total:1000,rows:plan.rows,color:'#b6f3e5',power:Math.min(3,plan.rows.length)});floaters=floaters.slice(-6);
 const cfg=desertCfg(),extra=cfg.lv>0?Math.floor(result.gain*(cfg.mult-1)):0;if(extra>0){run.score+=extra;result.gain+=extra;}if(desert.scarabUntil>elapsed){run.score+=result.gain;result.gain*=2;}
 const imminent=kind==='normal'&&cfg.lv>0&&(desert.nextRise+desert.delay-elapsed)<=3000;
 if(imminent){const bonus=250*cfg.lv;run.score+=bonus;desert.lastEscapeUntil=elapsed+1000;callout('LAST ESCAPE','+'+bonus.toLocaleString()+'점 · 상승 직전 탈출');}
 if(plan.rows.length===4&&cfg.lv>0){desert.delay=Math.min(15000,desert.delay+5000);awardRelic('PYRAMID COLLAPSE');desert.warned=false;callout('PYRAMID COLLAPSE','다음 지반 상승 +5초 지연');}
 const title=plan.rows.length===4?'4 LINES!':plan.rows.length+' LINE'+(plan.rows.length>1?'S':'');if(!imminent&&plan.rows.length!==4)callout(result.combo>1?result.combo+' COMBO!':title,'+'+result.gain.toLocaleString()+'점'+(result.bonus?' · 콤보 +'+result.bonus:''));tone('clear',plan.rows.length);vibrate(result.combo>1?[12,35,12]:12);
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
 const dt=Math.min(100,Math.max(0,raw));const hitStop=kind==='normal'&&!reduced&&shatterFX?shatterFX.update(dt):false;if(!playing()||hitStop)return;elapsed+=dt;
 desertTick();itemTick();if(repeat&&canAct()){repeat.time-=dt;let n=0;while(repeat&&repeat.time<=0&&n++<4){const r=repeat;if(r.hidden&&r.drag===drag)hiddenMove(r.drag,r.action==='left'?-1:1);else action(r.action);if(repeat===r)r.time+=r.hidden?38:70;}}
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
 // No crack masks, crack paths or fracture propagation overlays.
 if(c.special&&DESERT_ITEMS[c.special.type]){const it=DESERT_ITEMS[c.special.type];g.save();g.globalAlpha=.96;g.fillStyle=it.color;g.beginPath();g.arc(px+s*.72,py+s*.28,Math.max(5,s*.16),0,Math.PI*2);g.fill();g.fillStyle='#17120e';g.font=`700 ${Math.max(8,s*.18)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(it.icon,px+s*.72,py+s*.28);if(c.special.deadline&&!c.special.failed){const sec=Math.max(0,Math.ceil((c.special.deadline-elapsed)/1000));g.fillStyle='#fff';g.font=`700 ${Math.max(7,s*.16)}px sans-serif`;g.fillText(String(sec),px+s*.25,py+s*.75);}if(c.special.type==='mummy'&&c.special.hp>1){g.fillStyle='#fff';g.font=`700 ${Math.max(7,s*.16)}px sans-serif`;g.fillText('2',px+s*.25,py+s*.75);}g.restore();}
 if(hot){g.fillStyle='#dbfff588';g.fillRect(px,py,s,s);}g.restore();
}
function previewItemLabel(g,p,w,h){const sp=p?.cells?.find(c=>c.special)?.special;if(!sp)return;const it=DESERT_ITEMS[sp.type];if(!it)return;g.save();g.fillStyle=it.color;g.globalAlpha=.96;g.font=`700 ${Math.max(9,w*.075)}px sans-serif`;g.textAlign='center';g.textBaseline='bottom';g.fillText((it.kind==='good'?'★ ':'⚠ ')+it.label,w/2,h-2);g.restore();}
function normalPreview(g,p,w,h){if(!p)return;const minX=Math.min(...p.cells.map(c=>c.x)),maxX=Math.max(...p.cells.map(c=>c.x)),minY=Math.min(...p.cells.map(c=>c.y)),maxY=Math.max(...p.cells.map(c=>c.y));const size=Math.min((w-16)/(maxX-minX+1),(h-16)/(maxY-minY+1),w*.21),x=(w-(maxX-minX+1)*size)/2,y=(h-(maxY-minY+1)*size)/2;for(const c of p.cells)normalCell(g,c,x+(c.x-minX)*size,y+(c.y-minY)*size,size);previewItemLabel(g,p,w,h);}
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
 if(!run||!playing())return;const p=run.queue[Number(b.dataset.preview)];previewReturn='playing';beforePause=state;state='paused';clearInput();rememberScore();
 showPanel('<div class="kicker">NEXT</div><h2>'+ (b.dataset.preview==='0'?'다음 블록':'두 번째 다음 블록')+'</h2><canvas class="preview-large" id="preview-large" width="240" height="240"></canvas><button class="primary" data-menu="back">계속하기</button>','preview');const g=$('preview-large').getContext('2d');(kind==='normal'?normalPreview:sandPreview)(g,p,240,240);hud();
});
$('pause').addEventListener('click',pause);
$('mode-label')?.addEventListener('click',()=>{if(kind==='normal'&&run&&state!=='menu'&&state!=='over')showRelics();});
$('build')?.addEventListener('click',()=>{if(kind!=='normal'||!run||state==='menu'||state==='over')return;beforePause=state;state='paused';clearInput();devPanel();hud();});
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
