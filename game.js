// Farm Friends visual update. Existing gameplay and save keys are preserved.
'use strict';
// Flower Bloom — asset integration v1. Balance values are retained from main.
const ASSET_ROOT = 'assets/sakura-v1/';
const ASSET_VERSION = 'sakura-assets-1';
const EFFECT_VERSION = 'bloom-spectacle-5';
const $ = id => document.getElementById(id);
const P = ['red', 'blue', 'yellow'];
const C = {red:'var(--r)', blue:'var(--b)', yellow:'var(--y)'};
const F = {
 purple:{e:'🍇', n:'포도', c:'var(--p)', need:['red','blue'], r:'토마토 + 물방울'},
 orange:{e:'🥕', n:'당근', c:'var(--o)', need:['red','yellow'], r:'토마토 + 옥수수'},
 green:{e:'🌿', n:'잎사귀', c:'var(--g)', need:['blue','yellow'], r:'물방울 + 옥수수'}
};
const M = {'blue,red':'purple', 'red,yellow':'orange', 'blue,yellow':'green'};
const FESTIVAL_DURATION = 45, FESTIVAL_TOTAL_GOAL = 25;
const FESTIVAL_SPAWN_TUNING = Object.freeze({goalRate:.20,chainRate:.25,chainWeight:1.2});
const PRESSURE_DURATION = 38, CHALLENGE_DURATION = 42, CHALLENGE_COMBO_GOAL = 7;
const EXPERT_DURATION = 50, EXPERT_COMBO_GOAL = 7;
const ST = [
 {type:'normal',goalType:'flowers',g:{purple:8},t:60,a:.28},
 {type:'normal',goalType:'flowers',g:{orange:10},t:60,a:.25},
 {type:'normal',goalType:'flowers',g:{green:12},t:60,a:.23},
 {type:'festival',goalType:'total',g:{},totalGoal:FESTIVAL_TOTAL_GOAL,t:FESTIVAL_DURATION,a:.23,spawnTuning:FESTIVAL_SPAWN_TUNING},
 {type:'normal',goalType:'flowers',g:{purple:8,green:6},t:55,a:.20},
 {type:'normal',goalType:'flowers',g:{purple:7,orange:7,green:7},t:55,a:.16},
 {difficulty:'HARD',g:{purple:15,green:4},t:52,a:.18},
 {difficulty:'HARD',g:{purple:10,orange:5},comboGoal:5,t:52,a:.18},
 {difficulty:'HARD',g:{purple:8,orange:7,green:6},t:50,a:.16},
 {type:'pressure',difficulty:'HARD',randomProfile:'PRESSURE',g:{purple:9,orange:9,green:6},t:PRESSURE_DURATION,a:.23},
 {difficulty:'NORMAL',g:{purple:8,green:8},t:55,a:.20},
 {difficulty:'HARD',g:{orange:14,purple:5,green:3},comboGoal:6,t:48,a:.16},
 {difficulty:'EXPERT',g:{purple:8,orange:8,green:8},comboGoal:6,t:50,a:.16},
 {type:'challenge',goalType:'combo',difficulty:'EXPERT',randomProfile:'COMBO',g:{},comboGoal:CHALLENGE_COMBO_GOAL,t:CHALLENGE_DURATION,a:.20},
 {difficulty:'EXPERT',g:{purple:10,orange:10,green:10},comboGoal:EXPERT_COMBO_GOAL,t:EXPERT_DURATION,a:.16}
].map((stage,index)=>({type:'normal',goalType:'flowers',difficulty:index<3?'EASY':'NORMAL',butterflyEnabled:true,...stage,
 randomProfile:stage.randomProfile||stage.difficulty||(index<3?'EASY':'NORMAL')}));
const N = 6;
// Playtest knobs: natural / goal balance / chain opportunity = 70 / 20 / 10.
const COMBO_TIME_BONUS = .2, COMBO_TIME_CAP = 8;
const BLOOM_TRIGGER = 8, BLOOM_DURATION = 5, BLOOM_SCORE_MULTIPLIER = 1.5;
const SWIPE_MIN_DISTANCE = 18;
const RANDOM_BALANCE = Object.freeze({
 goalRate:.20, chainRate:.10, materialFloor:10, materialWeight:.2,
 goalWeight:3, pairFloor:3, pairWeight:.35, neighborWeight:.45, chainWeight:.8
});
// Preserve the first six stages. Later profiles reduce assistance, never remove it.
const DIFFICULTY_PROFILES = Object.freeze({
 EASY:Object.freeze({goalRate:.20,chainRate:.10}),
 NORMAL:Object.freeze({goalRate:.20,chainRate:.10}),
 HARD:Object.freeze({goalRate:.14,chainRate:.08}),
 EXPERT:Object.freeze({goalRate:.10,chainRate:.07}),
 PRESSURE:Object.freeze({goalRate:.22,chainRate:.23,chainWeight:1.2}),
 COMBO:Object.freeze({goalRate:.15,chainRate:.25,chainWeight:1.2})
});
const DEAD_BOARD_THRESHOLD = 0;
const COMBO_FEEDBACK = Object.freeze({
 normal:{petals:5,vibration:0}, warm:{petals:8,vibration:12},
 hot:{petals:13,vibration:22}, mega:{petals:18,vibration:35}
});
const BLOOM_EXTRA_PETALS = 5, MAX_EFFECT_NODES = 96;
const FLOWER_LIGHT = Object.freeze({purple:{light:'#e2a4ff',edge:'#a54ce6'},orange:{light:'#ffd18c',edge:'#ee7d4d'},green:{light:'#d6f49b',edge:'#69b95a'}});
const VISUAL_PETALS = Object.freeze({normal:8,warm:12,hot:17,mega:22});
// Cosmetic randomness must not change the sequence of gameplay random draws.
let fxSeed=0x6d2b79f5;
function fxRandom(){fxSeed=(Math.imul(fxSeed,1664525)+1013904223)>>>0;return fxSeed/4294967296;}
const BUTTERFLY_FIRST_MIN_DELAY = 6, BUTTERFLY_FIRST_MAX_DELAY = 10;
const BUTTERFLY_MIN_DELAY = 8, BUTTERFLY_MAX_DELAY = 14;
const BUTTERFLY_LIFETIME = 7, BUTTERFLY_LEAVING_TIME = 1.5;
const BUTTERFLY_SCORE_MULTIPLIER = 2, BUTTERFLY_MAX_ON_BOARD = 1;
const BUTTERFLY_MIN_BLOOMS = 2, BUTTERFLY_RETRY_DELAY = 1, BUTTERFLY_VIBRATION = 10;
let butterfly=null, butterflyNextAt=0, butterflyPausedAt=0;
let si=0, T=ST[0], board=[], goals={}, score=0, time=60, combo=0,
 maxCombo=0, total=0, run=false, beatAt=0, timer=null, beatTimer=null,
 lastFlower=null, clearing=false, devPaused=false, menuPaused=false,
 pausedAt=0, stageHoldTimer=null, generation=0, startPointer=null,
 bloomUntil=0, bloomPausedRemaining=0, bloomTriggered=false;
const busy = new Set();
const pending = new Set();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const entries = () => Object.entries(T.g);
const totalGoalStage = () => T.goalType==='total';
const flowerGoalDone = () => T.goalType==='combo'||(totalGoalStage()?total>=T.totalGoal:entries().every(([name,goal]) => (goals[name]||0) >= goal));
const done = () => flowerGoalDone()&&maxCombo>=(T.comboGoal||0);
const stageName = () => ({festival:'퍼즐 축제',pressure:'수확 러시',challenge:'콤보 챌린지'}[T.type]||'컬러 퍼즐');
const randomBalance = () => ({...RANDOM_BALANCE,...(DIFFICULTY_PROFILES[T.randomProfile]||DIFFICULTY_PROFILES.NORMAL),...T.spawnTuning});
const asset = name => window.FLOWER_BLOOM_ASSETS?.[name] || ASSET_ROOT + name + '.webp';
const sprite = (kind, name, alt='') => `<img src="${asset(kind+'-'+name)}" alt="${alt}" draggable="false">`;
const clock = seconds => {
 const n=Math.max(0,Math.ceil(seconds));
 return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
};

// Puzzle progress only. Read a previous save's stage once; never modify its data.
const PUZZLE_PROGRESS_KEY='farm-friends.puzzle-progress.v1';
let progressReadOnly=false;
const validStage=value=>Number.isInteger(value)&&value>=0&&value<ST.length;
function loadPuzzleStage(){
 try{
  const raw=localStorage.getItem(PUZZLE_PROGRESS_KEY);
  if(raw!==null){
   const saved=JSON.parse(raw);
   if(saved?.version!==1){progressReadOnly=true;return 0;}
   return validStage(saved.nextStage)?saved.nextStage:0;
  }
  const previous=JSON.parse(localStorage.getItem('flower-bloom.garden.v1')||'null');
  return [1,2].includes(previous?.version)&&validStage(previous.nextStage)?previous.nextStage:0;
 }catch{return 0;}
}
function savePuzzleStage(nextStage){
 if(progressReadOnly||!validStage(nextStage))return;
 try{localStorage.setItem(PUZZLE_PROGRESS_KEY,JSON.stringify({version:1,nextStage}));}catch{}
}

// Scheduled board callbacks must never affect a different stage/reset.
function later(fn, ms) {
 const epoch=generation;
 const id=setTimeout(() => {pending.delete(id); if(epoch===generation) fn();},ms);
 pending.add(id); return id;
}
function stopClocks() { clearInterval(timer); clearInterval(beatTimer); timer=beatTimer=null; }
function cancelBoardWork() {
 window.FestivalShow?.stop();
 generation++;
 pending.forEach(clearTimeout); pending.clear();
 stopClocks(); busy.clear(); startPointer=null;
 endBloom();
 resetButterfly();
 $('effects').replaceChildren();
 document.querySelectorAll('.stageClear').forEach(el=>el.remove());
 $('beat').classList.remove('on');
}
function goalText() {
 const flowers=totalGoalStage()?'🌸 수확 '+Math.min(total,T.totalGoal)+' / '+T.totalGoal:entries().map(([n,g])=>F[n].e+' '+Math.min(goals[n]||0,g)+'/'+g).join('  ');
 return [flowers,T.comboGoal?'🔥 MAX COMBO '+maxCombo+' / '+T.comboGoal+(maxCombo>=T.comboGoal?' ✓':''):''].filter(Boolean).join(' · ');
}
function remainingGoalText() {
 const missing=totalGoalStage()?(total<T.totalGoal?['수확물 '+(T.totalGoal-total)+'개 부족']:[]):entries().filter(([n,g])=>(goals[n]||0)<g).map(([n,g])=>F[n].n+' '+(g-(goals[n]||0))+'개 부족');
 if(T.comboGoal&&maxCombo<T.comboGoal)missing.push('최고 콤보 '+(T.comboGoal-maxCombo)+'단계 부족');
 return missing.join(' · ');
}
function resultTitle() {
 if(done())return 'STAGE CLEAR!';
 const missingFlowers=totalGoalStage()?Math.max(0,T.totalGoal-total):entries().reduce((sum,[n,g])=>sum+Math.max(0,g-(goals[n]||0)),0);
 if(missingFlowers===1&&maxCombo>=(T.comboGoal||0))return '딱 1개 남았어요!';
 if(missingFlowers===0&&T.comboGoal-maxCombo===1)return '최고 콤보 1단계만 더!';
 return '조금만 더 수확해 볼까요?';
}
function renderTime() {
 $('time').textContent=clock(time);
 const ratio=Math.max(0,Math.min(100,time/T.t*100));
 $('bar').style.width=ratio+'%';
 $('timeMeter').setAttribute('aria-valuenow',String(Math.round(ratio)));
 document.querySelector('.time-stat').classList.toggle('urgent',time<=10);
}
function renderCombo() {
 $('combo').textContent='COMBO '+combo;
 $('combo').classList.toggle('active',combo>=2);
 $('combo').dataset.tier=comboTier();
}
function comboTier() {return combo>=8?'mega':combo>=5?'hot':combo>=2?'warm':'normal';}
function bloomActive() {return menuPaused?bloomPausedRemaining>0:performance.now()<bloomUntil;}
function endBloom() {
 bloomUntil=0;bloomPausedRemaining=0;
 $('boardShell').classList.remove('bloom-mode');$('bloomBadge').textContent='';
}
function updateBloom() {if(bloomUntil&&!menuPaused&&!bloomActive())endBloom();}
function triggerBloom() {
 bloomTriggered=true;bloomUntil=performance.now()+BLOOM_DURATION*1000;
 $('boardShell').classList.add('bloom-mode');
 $('bloomBadge').textContent='FEVER TIME · ×'+BLOOM_SCORE_MULTIPLIER;
 if(T.type!=='festival')frameFlowers(true);
 if(T.type==='festival')window.FestivalShow?.fever();
}
function ui() {
 T=ST[si];
 $('app').dataset.scene=T.type;
 document.querySelector('.scene-label').innerHTML=T.type==='festival'?'반짝이는 퍼즐 축제<span>FARM FESTIVAL · LET’S CELEBRATE</span>':'색을 잇고, 콤보를 이어가요<span>MATCH · COMBO · CLEAR</span>';
 document.querySelector('.tagline').textContent=T.type==='festival'?'친구들과 함께, 밤하늘 가득 축제!':'농장 친구들과 함께하는 컬러 퍼즐';
 $('startTitle').textContent=T.type==='normal'?'오늘의 수확 목표':stageName();
 document.querySelector('.stage-name').textContent=T.type!=='normal'?stageName():T.difficulty==='EXPERT'?'🌺 EXPERT':T.difficulty==='HARD'?'🔥 HARD':'컬러 퍼즐';
 $('mission').classList.toggle('special',T.type!=='normal');
 $('mission').classList.toggle('with-combo',Boolean(T.comboGoal));
 $('mission').classList.toggle('combo-only',T.goalType==='combo');
 $('stage').textContent=$('sStage').textContent='STAGE '+(si+1);
 $('target').textContent=entries().length>1?'수확물을 모아 주세요':'농작물을 수확해요';
 $('mission').classList.toggle('multi',entries().length>1);
 $('progress').innerHTML=entries().map(([n,g])=>
  `<span class="goal-chip${(goals[n]||0)>=g?' complete':''}" aria-label="${F[n].n} ${Math.min(goals[n]||0,g)} / ${g}">${sprite('flower',n)}<span>${Math.min(goals[n]||0,g)}/${g}</span></span>`).join('');
 $('sGoal').innerHTML=entries().map(([n,g])=>
  `<div class="start-goal">${sprite('flower',n)}<span>${F[n].n}</span><b>${g}개</b></div>`).join('');
 $('guide').innerHTML=entries().map(([n])=>F[n].r).join(' / ')+
  '<br>제한시간 <b>'+T.t+'초</b><br><small>같은 수확물 2연속부터 콤보 · 매회 +0.2초</small>';
 if(totalGoalStage()){
  $('sStage').textContent='🎪 SPECIAL STAGE';$('target').textContent='🎪 퍼즐 축제';
  $('progress').innerHTML='<span class="goal-chip'+(done()?' complete':'')+'">수확 '+Math.min(total,T.totalGoal)+' / '+T.totalGoal+'</span>';
  $('sGoal').innerHTML='<div class="start-goal"><span>모든 수확물</span><b>'+T.totalGoal+'개</b></div>';
  $('guide').innerHTML='시간 안에 농작물을 마음껏 수확해 주세요!<br>제한시간 <b>'+T.t+'초</b> · 모든 수확를 합산합니다.';
 }
 if(T.type==='pressure'){
  $('sStage').textContent='🔥 HARVEST RUSH · STAGE '+(si+1);$('target').textContent='🔥 수확 러시';
 }
 if(T.goalType==='combo'){
  $('sStage').textContent='🌺 COMBO CHALLENGE';$('target').textContent='같은 수확물 연속 수확';
  $('guide').innerHTML='제한시간 <b>'+T.t+'초</b><br>같은 수확물 콤보를 한 번 달성하면 성공!';
 }
 $('comboGoal').classList.toggle('hide',!T.comboGoal);
 $('comboGoal').classList.toggle('complete',maxCombo>=(T.comboGoal||0));
 $('comboGoal').textContent=T.comboGoal?'🔥 같은 수확물 COMBO '+Math.min(maxCombo,T.comboGoal)+' / '+T.comboGoal+(maxCombo>=T.comboGoal?' ✓':''):'';
 if(T.comboGoal)$('sGoal').insertAdjacentHTML('beforeend','<div class="start-goal"><span>🔥 같은 수확물 연속</span><b>'+T.comboGoal+' COMBO</b></div>');
 $('score').textContent=score.toLocaleString('ko-KR');
 $('harvestCount').textContent=String(total);
 renderCombo(); renderTime(); devInfo();
}
function counts() {
 const c={red:0,blue:0,yellow:0};
 board.forEach(x=>{if(x&&Object.hasOwn(c,x.k)) c[x.k]++;}); return c;
}
function devInfo() {
 const c=counts(),pairs=adjacentFlowerCounts();
 $('devInfo').textContent='ST '+(si+1)+' / '+ST.length+' · '+T.type+' · 목표 '+(totalGoalStage()?goalText():entries().map(([n,g])=>F[n].e+g).join(' '))+
  ' · 보드 🔴'+c.red+' 🔵'+c.blue+' 🟡'+c.yellow+' · 인접쌍 🟣'+pairs.purple+' 🟠'+pairs.orange+' 🟢'+pairs.green+
  ' · '+T.difficulty+' / randomProfile '+T.randomProfile+' · 인접 총 '+Object.values(pairs).reduce((a,b)=>a+b,0)+
  ' · 남은시간 '+time.toFixed(1)+'초 · 나비 '+(butterfly?'칸 '+(butterfly.index+1):butterflyNextAt?'등장 대기':'없음')+' · '+ASSET_VERSION+' · '+EFFECT_VERSION;
}
function neighbors(index) {
 if(!Number.isInteger(index)||index<0||index>=N*N)return [];
 const result=[],row=Math.floor(index/N),col=index%N;
 if(col>0)result.push(index-1);if(col<N-1)result.push(index+1);
 if(row>0)result.push(index-N);if(row<N-1)result.push(index+N);
 return result;
}
// Count each currently playable orthogonal pair once; no diagonals or row wrapping.
function adjacentFlowerCounts() {
 const result={purple:0,orange:0,green:0};
 board.forEach((cell,i)=>{
  if(!cell?.k||busy.has(i))return;
  neighbors(i).forEach(j=>{
   if(j<=i||!board[j]?.k||busy.has(j))return;
   const flower=M[[cell.k,board[j].k].sort().join(',')];
   if(flower)result[flower]++;
  });
 });
 return result;
}
// Recover only a settled, genuinely unplayable board. Never interrupt a gesture
// or mistake temporarily empty bloom cells for a dead board.
function recoverDeadBoard() {
 if(!run||menuPaused||clearing||busy.size||startPointer||board.length!==N*N||board.some(cell=>!P.includes(cell.k)))return false;
 if(Object.values(adjacentFlowerCounts()).reduce((sum,n)=>sum+n,0)>DEAD_BOARD_THRESHOLD)return false;
 const candidates=board.map((cell,index)=>index).filter(index=>index!==butterfly?.index);
 const index=candidates[Math.random()*candidates.length|0],cell=board[index];
 const alternatives=P.filter(color=>color!==board[neighbors(index)[0]].k);
 cell.k=alternatives[Math.random()*alternatives.length|0];paintBud(cell.bud,cell.k);
 cell.el.classList.add('drop');later(()=>cell.el.classList.remove('drop'),230);
 return true;
}
// A single attachment belongs to one bud and one board generation.
// Deadlines use the monotonic clock; menu pause shifts both arrival and expiry.
function renderButterflyHint(text=butterfly?'🦋 이 칸으로 합성 → 점수 ×'+BUTTERFLY_SCORE_MULTIPLIER:'') {
 $('butterflyHint').textContent=text;
 $('app').classList.toggle('has-butterfly-hint',Boolean(text));
}
function scheduleButterfly(first=false) {
 if(!run||clearing||T.butterflyEnabled===false)return;
 const min=first?BUTTERFLY_FIRST_MIN_DELAY:BUTTERFLY_MIN_DELAY;
 const max=first?BUTTERFLY_FIRST_MAX_DELAY:BUTTERFLY_MAX_DELAY;
 butterflyNextAt=performance.now()+(min+Math.random()*(max-min))*1000;
}
function butterflyIcon(){return '<span class="butterfly-icon"><i class="wing wing-left"></i><i class="wing wing-right"></i><i class="thorax"></i></span>';}
function stopButterflyFlights(){
 $('effects').querySelectorAll('.butterfly-flight').forEach(node=>node.remove());
 butterfly?.mark.classList.remove('arriving');
}
function butterflyFlight(index,arrival=false) {
 if(reducedMotion||!board[index])return;
 const mark=butterfly?.index===index?butterfly.mark:null;
 const {x,y,w,h}=centerOf(mark||board[index].el),fx=document.createElement('span');
 const direction=x<w/2?-1:1,edge=direction<0?-x-20:w-x+20;
 const path=arrival?[[edge,-Math.min(y,100)-35],[edge*.65,-95],[edge*.18,-35],[0,0]]:
  [[0,0],[-direction*w*.13,-45],[direction*w*.17,-h*.27],[direction*w*.46,-Math.min(y+45,h*.7)]];
 const duration=arrival?900:1100;
 fx.className='butterfly-flight'+(arrival?' arrival':'');fx.innerHTML=butterflyIcon();fx.setAttribute('aria-hidden','true');
 fx.style.left=x+'px';fx.style.top=y+'px';fx.style.setProperty('--flight-time',duration+'ms');fx.style.setProperty('--flight-end-opacity',arrival?'1':'0');
 path.forEach(([dx,dy],i)=>{fx.style.setProperty('--x'+i,dx+'px');fx.style.setProperty('--y'+i,dy+'px');});
 if(arrival&&mark)mark.classList.add('arriving');
 addEffect(fx,duration+40);
 if(arrival)later(()=>{if(butterfly?.mark===mark)mark.classList.remove('arriving');fx.remove();},duration);
}
function clearButterfly({reschedule=false,fly=false}={}) {
 if(butterfly){
  const {index,el,mark}=butterfly;
  stopButterflyFlights();
  if(fly)butterflyFlight(index);
  mark.remove();el.classList.remove('butterfly-target','butterfly-leaving');el.removeAttribute('aria-label');
 }
 butterfly=null;renderButterflyHint();
 if(reschedule)scheduleButterfly();
}
function resetButterfly() {
 clearButterfly();butterflyNextAt=0;butterflyPausedAt=0;
 document.querySelectorAll('.butterfly-flight').forEach(el=>el.remove());
}
function spawnButterfly() {
 if(!run||menuPaused||clearing||T.butterflyEnabled===false||butterfly||BUTTERFLY_MAX_ON_BOARD<1)return false;
 const candidates=board.flatMap((cell,index)=>{
  if(!P.includes(cell.k)||busy.has(index)||startPointer?.index===index)return [];
  return neighbors(index).some(j=>!busy.has(j)&&P.includes(board[j]?.k)&&board[j].k!==cell.k)?[index]:[];
 });
 if(!candidates.length){butterflyNextAt=performance.now()+BUTTERFLY_RETRY_DELAY*1000;return false;}
 const index=candidates[Math.random()*candidates.length|0],cell=board[index],mark=document.createElement('span');
 mark.className='butterfly-mark';mark.innerHTML=butterflyIcon();mark.setAttribute('aria-hidden','true');cell.el.append(mark);
 cell.el.classList.add('butterfly-target');cell.el.setAttribute('aria-label',cell.bud.alt+' · 이 칸으로 합성하면 나비 보너스');
 butterfly={index,color:cell.k,bud:cell.bud,el:cell.el,mark,epoch:generation,until:performance.now()+BUTTERFLY_LIFETIME*1000};
 butterflyNextAt=0;renderButterflyHint();butterflyFlight(index,true);return true;
}
function updateButterfly() {
 if(!run||menuPaused||clearing)return;
 if(T.butterflyEnabled===false){resetButterfly();return;}
 const now=performance.now();
 if(butterfly){
  const cell=board[butterfly.index];
  if(butterfly.epoch!==generation||cell?.bud!==butterfly.bud||cell.k!==butterfly.color||busy.has(butterfly.index)){
   clearButterfly({reschedule:true});return;
  }
  if(now>=butterfly.until){clearButterfly({reschedule:true,fly:true});return;}
  butterfly.el.classList.toggle('butterfly-leaving',butterfly.until-now<=BUTTERFLY_LEAVING_TIME*1000);
 }else if(butterflyNextAt&&now>=butterflyNextAt){
  if(total<BUTTERFLY_MIN_BLOOMS){butterflyNextAt=now+BUTTERFLY_RETRY_DELAY*1000;return;}
  spawnButterfly();
 }
}
function collectButterfly(source,destination) {
 if(!butterfly||![source,destination].includes(butterfly.index))return false;
 const collected=butterfly.index===destination;
 clearButterfly({reschedule:true,fly:true});
 if(collected){
  renderButterflyHint('🦋 BUTTERFLY BONUS ×'+BUTTERFLY_SCORE_MULTIPLIER);
  later(()=>renderButterflyHint(),1000);
 }
 return collected;
}
function spawn(index) {
 if(butterfly?.index===index)clearButterfly({reschedule:true});
 const mode=Math.random(),balance=randomBalance();
 if(mode>=balance.goalRate+balance.chainRate)return P[Math.random()*P.length|0];
 const c=counts(),pairs=adjacentFlowerCounts(),w={red:1,blue:1,yellow:1};
 const local=neighbors(index).filter(i=>board[i]?.k&&!busy.has(i));
 const favor=(flower,weight)=>F[flower].need.forEach(k=>{
  const partner=F[flower].need.find(color=>color!==k);
  w[k]+=weight+local.filter(i=>board[i].k===partner).length*balance.neighborWeight;
 });
 if(mode<balance.goalRate){
  const spawnGoals=T.goalType==='combo'?Object.keys(F).map(name=>[name,Infinity]):totalGoalStage()?Object.keys(F).map(name=>[name,T.totalGoal]):entries();
  spawnGoals.forEach(([flower,goal])=>{
   if((goals[flower]||0)>=goal)return;
   F[flower].need.forEach(k=>w[k]+=Math.max(0,balance.materialFloor-c[k])*balance.materialWeight+T.a*balance.goalWeight);
   if(pairs[flower]<balance.pairFloor)favor(flower,(balance.pairFloor-pairs[flower])*balance.pairWeight);
  });
 }else if(lastFlower&&combo>0){
  // Still a weighted draw: every color retains a nonzero chance.
  favor(lastFlower,balance.chainWeight/(1+pairs[lastFlower]));
 }
 let r=Math.random()*(w.red+w.blue+w.yellow);
 for(const k of P) {r-=w[k];if(r<=0)return k;}
 return 'yellow';
}
function paintBud(bud, k) {
 if(butterfly?.bud===bud)clearButterfly({reschedule:true});
 bud.className='bud'; bud.style.cssText=''; bud.src=asset('bud-'+k);
 bud.alt={red:'빨간 토마토',blue:'파란 물방울',yellow:'노란 옥수수'}[k];
 bud.dataset.color=k; bud.style.setProperty('--fallback-color',C[k]);
}
function build() {
 resetButterfly();
 board=[]; busy.clear(); startPointer=null; $('grid').replaceChildren();
 const fragment=document.createDocumentFragment();
 for(let i=0;i<N*N;i++) {
  const k=P[Math.random()*3|0],el=document.createElement('div'),bud=document.createElement('img');
  el.className='cell'; el.dataset.index=String(i); bud.draggable=false;
  paintBud(bud,k); el.append(bud); fragment.append(el); board.push({k,el,bud});
 }
 $('grid').append(fragment);
}
function fail(a,b) {
 combo=0; lastFlower=null; bloomTriggered=false; renderCombo();
 new Set([a,b]).forEach(i=>{
  const el=board[i]?.el; if(!el)return;
  el.classList.add('shake'); later(()=>el.classList.remove('shake'),260);
 });
}
function centerOf(el) {
 const r=el.getBoundingClientRect(),q=$('boardShell').getBoundingClientRect();
 return {x:r.left-q.left+r.width/2,y:r.top-q.top+r.height/2,w:q.width,h:q.height};
}
function floater(points,perfect) {
 $('effects').querySelectorAll('.float').forEach(node=>node.remove());
 const f=document.createElement('div');
 f.className='float'; f.innerHTML=(perfect?'<b>PERFECT!</b>':'')+'+'+points;
 $('effects').append(f); later(()=>f.remove(),670);
}
function addEffect(node,life=700){
 const layer=$('effects');
 while(layer.childElementCount>=MAX_EFFECT_NODES)layer.firstElementChild.remove();
 layer.append(node);later(()=>node.remove(),life);return node;
}
function effectAt(className,x,y,size,color,life,tag='i'){
 const node=document.createElement(tag);node.className='fx-bit '+className;
 node.style.left=x+'px';node.style.top=y+'px';node.style.setProperty('--size',size+'px');node.style.setProperty('--fx-color',color);
 return addEffect(node,life);
}
function mergeRibbon(source,destination){
 if(reducedMotion)return;
 const a=centerOf(source),b=centerOf(destination),dx=b.x-a.x,dy=b.y-a.y;
 const ribbon=effectAt('fx-trail',a.x,a.y,0,'#ffeecb',280);
 ribbon.style.width=Math.hypot(dx,dy)+'px';ribbon.style.setProperty('--angle',Math.atan2(dy,dx)+'rad');
 ribbon.style.setProperty('--trail-color',FLOWER_LIGHT[lastFlower].light);
}
function frameFlowers(major=false){
 if(reducedMotion)return;
 const box=$('boardShell').getBoundingClientRect();
 const positions=major?[[.09,.18],[.5,.15],[.91,.18],[.07,.41],[.93,.41],[.07,.65],[.93,.65],[.11,.87],[.5,.91],[.89,.87]]:[[.09,.2],[.91,.2],[.09,.84],[.91,.84]];
 positions.forEach(([x,y],i)=>{
  const flower=effectAt('fx-edge-flower',box.width*x,box.height*y,major?36:28,'#ffdfab',960,'img');
  flower.src=asset('flower-'+(major?Object.keys(F)[i%3]:lastFlower));flower.alt='';
 });
}
function particles(el,name,perfect=false) {
 if(reducedMotion)return;
 const {x,y,w}=centerOf(el),light=FLOWER_LIGHT[name],tier=comboTier(),festival=T.type==='festival';
 const cellSize=el.getBoundingClientRect().width,boost=combo>=8?1.6:combo>=5?1.35:1.15;
 // Eight large facets give each break a crisp silhouette without a cloud of DOM nodes.
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4+.2,dist=cellSize*(.85+(i%3)*.22);
  const shard=effectAt('fx-shard',x,y,cellSize*(i%2?.24:.32),light.light,560);
  shard.style.setProperty('--dx',Math.cos(angle)*dist+'px');
  shard.style.setProperty('--dy',Math.sin(angle)*dist+'px');
  shard.style.setProperty('--rot',(i%2?-150:170)+'deg');
 }
 if(festival)return; // Canvas owns rings/stars; keep only eight crisp DOM facets.
 effectAt('fx-halo',x,y,cellSize*(festival?2.4:1.75),light.light,540);
 effectAt('fx-corolla',x,y,cellSize*(festival?3.4:2.6),light.light,850);
 if(!festival)effectAt('fx-orbit',x,y,cellSize*1.8,light.light,900);
 if(!festival&&(combo>=5||perfect))effectAt('fx-corolla outer',x,y,cellSize*3.5,light.light,1050);
 if(combo>=5||perfect||festival)effectAt('fx-halo second',x,y,cellSize*2.05,light.light,740);
 effectAt('fx-bloom-flash',x,y,cellSize*(combo>=5?3:2.2),light.light,700);
 const satellites=festival?4:combo>=8?8:combo>=5?6:4;
 for(let i=0;i<satellites;i++){
  const angle=i/satellites*Math.PI*2-.9,dist=cellSize*(festival?2.4:combo>=8?2.1:1.45);
  const flower=effectAt('fx-bloom-satellite',x,y,cellSize*(combo>=5?.58:.43),light.light,1150,'img');
  flower.src=asset(festival?['festival-pinwheel','festival-balloon','festival-gift'][i%3]:'flower-'+name);flower.alt='';
  flower.style.setProperty('--life','1100ms');flower.style.setProperty('--dx',Math.cos(angle)*dist+'px');flower.style.setProperty('--dy',(Math.sin(angle)*dist-24)+'px');
  flower.style.setProperty('--start-rot',(i*45)+'deg');flower.style.setProperty('--rot',(i*45+150)+'deg');
 }
 // Canvas owns the festival sparks/rings; avoid rendering them again as DOM effects.
 if(festival)return;
 if(combo>=3||perfect){
  for(let i=0;i<4;i++){
   const comet=effectAt('fx-comet',x,y,cellSize*.75,light.light,900);
   comet.style.setProperty('--angle',(i*Math.PI/2+.4)+'rad');comet.style.setProperty('--travel',cellSize*(combo>=8?2.2:1.6)+'px');
  }
 }
 const rays=combo>=8?8:combo>=5||festival?6:3;
 for(let i=0;i<rays;i++){
  const angle=i/rays*Math.PI*2+.3;
  const ray=effectAt('fx-ray',x,y,cellSize*(combo>=5?1.1:.8),light.light,570);
  ray.style.setProperty('--angle',angle+'rad');ray.style.setProperty('--gap',cellSize*.35+'px');
 }
 if(combo>=8||(festival&&total%5===0)){
  for(let i=0;i<3;i++){
   const angle=i/3*Math.PI*2-.7,dist=cellSize*1.65;
   const little=effectAt('fx-mini-flower',x,y,cellSize*.48,light.light,870,'img');little.src=asset('flower-'+name);little.alt='';
   little.style.setProperty('--dx',Math.cos(angle)*dist+'px');little.style.setProperty('--dy',Math.sin(angle)*dist-12+'px');
   little.style.setProperty('--start-rot','-20deg');little.style.setProperty('--rot',(i*60+80)+'deg');
  }
  if(festival&&total%5===0)frameFlowers(false);
 }
 if(combo>=5||festival){const echo=effectAt('fx-echo',x,y,cellSize*1.5,light.light,640,'img');echo.src=asset('flower-'+name);echo.alt='';}
 const count=VISUAL_PETALS[tier]+(bloomActive()?BLOOM_EXTRA_PETALS:0)+(festival?4:0)+(perfect?2:0);
 for(let i=0;i<count;i++){
  const angle=i/count*Math.PI*2+(fxRandom()-.5)*.55;
  const dist=(cellSize*.5+fxRandom()*Math.min(w*.13,55))*boost;
  const star=i%4===0,life=620+fxRandom()*260;
  const p=effectAt(star?'fx-star':'fx-petal',x,y,star?7+fxRandom()*6:14+fxRandom()*12,light.light,life+40);
  p.style.setProperty('--petal-edge',light.edge);p.style.setProperty('--life',life+'ms');
  p.style.setProperty('--dx',Math.cos(angle)*dist+'px');p.style.setProperty('--dy',Math.sin(angle)*dist-16+'px');
  p.style.setProperty('--start-rot',(angle*180/Math.PI)+'deg');p.style.setProperty('--rot',(angle*180/Math.PI+90+fxRandom()*180)+'deg');
 }
 const encoreCount=combo>=5||festival?8:5;
 later(()=>{
  if(!run||menuPaused||clearing)return;
  effectAt('fx-halo afterglow',x,y,cellSize*2.15,light.light,700);
  for(let i=0;i<encoreCount;i++){
   const angle=i/encoreCount*Math.PI*2+.45,dist=cellSize*(.85+fxRandom()*.6);
   const p=effectAt(i%3===0?'fx-star':'fx-petal',x,y,10+fxRandom()*9,light.light,700);
   p.style.setProperty('--petal-edge',light.edge);p.style.setProperty('--life','650ms');
   p.style.setProperty('--dx',Math.cos(angle)*dist+'px');p.style.setProperty('--dy',Math.sin(angle)*dist-22+'px');
   p.style.setProperty('--start-rot','15deg');p.style.setProperty('--rot',(i*65+80)+'deg');
  }
 },150);
}
function comboEffect(el) {
 $('effects').querySelectorAll('.comboFx,.board-wave').forEach(node=>node.remove());
 const fx=document.createElement('div');
 fx.className='comboFx'+(combo>=8?' mega':combo>=5?' hot':'');
 fx.innerHTML=combo+' COMBO<span>'+(combo>=8?'대풍년! · ':combo>=5?'풍성한 수확! · ':'')+'+'+COMBO_TIME_BONUS+' sec</span>';
 if(!reducedMotion&&navigator.vibrate)navigator.vibrate(COMBO_FEEDBACK[comboTier()].vibration);
 $('effects').append(fx); el.classList.add('comboGlow');
 if(combo>=5&&!reducedMotion&&T.type!=='festival'){
  const wave=document.createElement('i');wave.className='board-wave'+(combo>=8?' mega':'');
  addEffect(wave,660);
  if(combo%5===0)frameFlowers(combo>=8);
 }
 later(()=>fx.remove(),710);
}
function merge(a,b) {
 if(!run||menuPaused||busy.has(a)||busy.has(b)||!board[a]||!board[b])return;
 if(!neighbors(a).includes(b))return;
 updateButterfly();
 const x=board[a].k,y=board[b].k,name=M[[x,y].sort().join(',')];
 if(!name){fail(a,b);return;}
 const butterflyBonus=collectButterfly(a,b);
 busy.add(a);busy.add(b);
 if(lastFlower!==name)bloomTriggered=false;
 combo=lastFlower===name?combo+1:1;lastFlower=name;maxCombo=Math.max(maxCombo,combo);
 updateBloom();
 if(combo>=BLOOM_TRIGGER&&!bloomTriggered)triggerBloom();
 board[b].el.dataset.comboTier=comboTier();
 board[b].el.style.setProperty('--bloom-color',F[name].c);
 const target=T.goalType==='combo'||(totalGoalStage()?total<T.totalGoal:T.g[name]!=null&&(goals[name]||0)<T.g[name]);
 const perfect=Date.now()-beatAt<260;
 const mul=1+Math.min(combo-1,9)*.1;
 const basePoints=Math.round((target?100:45)*(perfect?2:1)*mul/5)*5;
 const bloomPoints=Math.round(basePoints*(bloomActive()?BLOOM_SCORE_MULTIPLIER:1));
 const points=bloomPoints*(butterflyBonus?BUTTERFLY_SCORE_MULTIPLIER:1);
 score+=points;total++;goals[name]=(goals[name]||0)+1;
 if(combo>=2){time=Math.min(T.t+COMBO_TIME_CAP,time+COMBO_TIME_BONUS);comboEffect(board[b].el);}
 if(T.type==='festival')window.FestivalShow?.burst(board[b].el,combo,perfect);
 ui();floater(points,perfect);mergeRibbon(board[a].el,board[b].el);particles(board[b].el,name,perfect);
 if(butterflyBonus&&combo<2&&!reducedMotion&&navigator.vibrate)navigator.vibrate(BUTTERFLY_VIBRATION);
 const flower=document.createElement('img');flower.src=asset('flower-'+name);flower.alt=F[name].n;
 $('harvest').append(flower);
 while($('harvest').childElementCount>14)$('harvest').firstElementChild.remove();
 [a,b].forEach(i=>{board[i].k=null;board[i].bud.style.transform='scale(0)';});
 const destination=board[b];
 destination.bud.style.transform='';destination.bud.src=asset('flower-'+name);
 destination.bud.alt=F[name].n;destination.bud.className='bud flower';
 destination.bud.style.setProperty('--bloom-color',F[name].c);
 destination.el.classList.add('pop');
 later(()=>{[a,b].forEach(i=>{
  const k=spawn(i),cell=board[i];cell.k=k;paintBud(cell.bud,k);
  cell.el.classList.remove('pop','comboGlow');cell.el.classList.add('drop');
  later(()=>cell.el.classList.remove('drop'),230);busy.delete(i);
 });recoverDeadBoard();},380);
 if(done())stageClear();
}
function resetState() {
 resetButterfly();
 goals={purple:0,orange:0,green:0};score=combo=maxCombo=total=0;
 lastFlower=null;bloomTriggered=false;endBloom();clearing=false;devPaused=false;menuPaused=false;time=T.t;
 $('harvest').replaceChildren();$('devPause').textContent='타이머 정지';
 $('menu').classList.add('hide');$('end').classList.add('hide');
}
function begin() {
 cancelBoardWork();T=ST[si];resetState();build();ui();fitBoard();
 $('start').classList.add('hide');run=true;beatAt=Date.now();
 if(T.type==='festival')window.FestivalShow?.start();
 scheduleButterfly(true);
 recoverDeadBoard();
 beatTimer=setInterval(()=>{
  if(!run||menuPaused)return;
  beatAt=Date.now();$('beat').classList.add('on');later(()=>$('beat').classList.remove('on'),160);
 },900);
 timer=setInterval(()=>{
  if(!run||menuPaused)return;
  updateBloom();
  updateButterfly();
  recoverDeadBoard();
  if(devPaused)return;
  time=Math.max(0,time-.1);renderTime();
  if(!$('devPanel').classList.contains('hide'))devInfo();
  if(time<=0)finish();
 },100);
}
function prepareStage(index) {
 cancelBoardWork();run=false;si=(index+ST.length)%ST.length;T=ST[si];
 resetState();build();ui();fitBoard();$('start').classList.remove('hide');
}
function stageClear() {
 if(clearing||!run)return;
 clearing=true;run=false;stopClocks();endBloom();cancelPointer();
 if(T.type==='festival')window.FestivalShow?.clear();
 savePuzzleStage((si+1)%ST.length);
 resetButterfly();
 const fx=document.createElement('div');fx.className='stageClear';
 const centerFlower=lastFlower||'purple',sides=Object.keys(F).filter(name=>name!==centerFlower);
 fx.innerHTML='<span class="clear-kicker">'+(T.type==='festival'?'FARM FESTIVAL':'HAPPY HARVEST')+'</span><div class="clear-bouquet">'+sides.map(name=>sprite('flower',name)).join('')+sprite('flower',centerFlower)+'</div><span>STAGE '+(si+1)+' CLEAR</span><small>다음 스테이지로 이동합니다</small>';
 if(!reducedMotion)for(let i=0;i<28;i++){
  const p=document.createElement('i'),angle=i/28*Math.PI*2,dist=90+fxRandom()*140;p.className='clear-confetti';
  p.style.setProperty('--dx',Math.cos(angle)*dist+'px');p.style.setProperty('--dy',Math.sin(angle)*dist+'px');p.style.setProperty('--rot',(fxRandom()*360)+'deg');
  p.style.setProperty('--confetti-color',['#edb5ff','#ffe4a3','#d8f2a3','#ffb8ce'][i%4]);fx.append(p);
 }
 $('app').append(fx);later(()=>{fx.remove();prepareStage(si+1);},850);
}
function finish() {
 if(!run)return;
 window.FestivalShow?.stop();
 run=false;stopClocks();endBloom();cancelPointer();
 resetButterfly();
 $('endTitle').textContent=resultTitle();
 $('result').innerHTML='최종 점수 <b>'+score.toLocaleString('ko-KR')+'</b><br>'+goalText()+
  '<br>전체 조합 '+total+'개'+(T.comboGoal?'':' · MAX COMBO '+maxCombo)+
  (done()?'':'<br><b>'+remainingGoalText()+'</b>');
 $('next').classList.toggle('hide',!done());
 $('next').textContent=si===ST.length-1?'처음부터 다시':'다음 스테이지';
 $('end').classList.remove('hide');
}
function openMenu(help=false) {
 if(clearing)return;
 if(!menuPaused){
  stopButterflyFlights();
  updateButterfly();butterflyPausedAt=performance.now();
  updateBloom();bloomPausedRemaining=Math.max(0,bloomUntil-performance.now());
  menuPaused=true;pausedAt=Date.now();cancelPointer();
 }
 $('helpText').classList.toggle('hide',!help);
 $('menuTitle').textContent=help?'농작물을 수확하는 방법':'잠시 쉬어가세요';
 $('resumeBtn').textContent=run?'계속하기':'닫기';
 $('menu').classList.remove('hide');
 window.FestivalShow?.pause(true);
}
function closeMenu() {
 if(menuPaused){
  const butterflyPause=performance.now()-butterflyPausedAt;
  if(butterfly)butterfly.until+=butterflyPause;
  if(butterflyNextAt)butterflyNextAt+=butterflyPause;
  butterflyPausedAt=0;
  beatAt+=Date.now()-pausedAt;
  bloomUntil=bloomPausedRemaining?performance.now()+bloomPausedRemaining:0;
  bloomPausedRemaining=0;
 }
 menuPaused=false;$('menu').classList.add('hide');
 window.FestivalShow?.pause(false);
}
function toggleDev(show) {
 const hidden=$('devPanel').classList.contains('hide');
 $('devPanel').classList.toggle('hide',show===undefined?!hidden:!show);devInfo();
}
function jumpStage(delta) {prepareStage(si+delta);}

// One pointer handler supports Android touch and desktop mouse without duplicate events.
$('grid').addEventListener('pointerdown',e=>{
 const el=e.target.closest('.cell');
 if(!e.isPrimary||e.button!==0||!el||!run||menuPaused||startPointer)return;
 const index=Number(el.dataset.index);if(busy.has(index))return;
 startPointer={id:e.pointerId,index,x:e.clientX,y:e.clientY};el.classList.add('pressed');
 $('grid').setPointerCapture(e.pointerId);
});
$('grid').addEventListener('pointerup',e=>{
 if(!startPointer||startPointer.id!==e.pointerId)return;
 const a=startPointer.index,dx=e.clientX-startPointer.x,dy=e.clientY-startPointer.y;
 startPointer=null;board[a]?.el.classList.remove('pressed');
 if(!run||menuPaused)return;
 // A tap or small drift is not a failed swipe.
 if(Math.max(Math.abs(dx),Math.abs(dy))<SWIPE_MIN_DISTANCE)return;
 const row=Math.floor(a/N),col=a%N;let b=null;
 if(Math.abs(dx)>Math.abs(dy)){if(dx>0&&col<N-1)b=a+1;if(dx<0&&col>0)b=a-1;}
 else{if(dy>0&&row<N-1)b=a+N;if(dy<0&&row>0)b=a-N;}
 // Keep outward edge swipes as misses; refilling cells simply ignore input.
 if(b===null)fail(a,a);else if(!busy.has(b))merge(a,b);
});
function cancelPointer(){if(startPointer)board[startPointer.index]?.el.classList.remove('pressed');startPointer=null;}
$('grid').addEventListener('pointercancel',cancelPointer);
$('grid').addEventListener('lostpointercapture',cancelPointer);
$('grid').addEventListener('contextmenu',e=>e.preventDefault());
$('startBtn').onclick=begin;$('retry').onclick=begin;$('next').onclick=()=>prepareStage(si+1);
$('pauseBtn').onclick=()=>openMenu();$('menuBtn').onclick=()=>openMenu();$('helpBtn').onclick=()=>openMenu(true);
$('resumeBtn').onclick=closeMenu;
$('restartBtn').onclick=()=>{
 if(run&&!window.confirm('현재 점수를 초기화하고 다시 시작할까요?'))return;
 closeMenu();begin();
};
$('devOpen').onclick=()=>{closeMenu();toggleDev(true);};
$('stage').addEventListener('pointerdown',()=>{clearTimeout(stageHoldTimer);stageHoldTimer=setTimeout(()=>toggleDev(),900);});
['pointerup','pointercancel','pointerleave'].forEach(name=>$('stage').addEventListener(name,()=>clearTimeout(stageHoldTimer)));
$('devClose').onclick=()=>toggleDev(false);
$('devInfo').insertAdjacentHTML('beforebegin','<div class="devRow"><button class="devBtn" id="devButterfly">🦋 나비 생성</button><button class="devBtn" id="devFestival">🌸 퍼즐 축제</button></div>');
$('devInfo').insertAdjacentHTML('beforebegin','<div class="devRow"><input class="dev-stage-input" id="devStageInput" type="number" min="1" max="'+ST.length+'" step="1" value="1" inputmode="numeric" aria-label="이동할 스테이지"><button class="devBtn" id="devStageGo">ST 이동</button><button class="devBtn" id="devHard">HARD</button><button class="devBtn" id="devExpert">EXPERT</button><button class="devBtn" id="devRush">RUSH</button><button class="devBtn" id="devChallenge">COMBO</button></div>');
$('mission').insertAdjacentHTML('beforeend','<div class="combo-goal hide" id="comboGoal"></div>');
$('harvest').insertAdjacentHTML('beforebegin','<span class="butterfly-hint" id="butterflyHint" role="status"></span>');
$('devStageGo').onclick=()=>{
 const stage=Number($('devStageInput').value);
 if(Number.isInteger(stage)&&stage>=1&&stage<=ST.length){$('devStageInput').setCustomValidity('');prepareStage(stage-1);}
 else{$('devStageInput').setCustomValidity('1부터 '+ST.length+'까지 입력해 주세요.');$('devStageInput').reportValidity();}
};
$('devStageInput').oninput=()=>$('devStageInput').setCustomValidity('');
$('devHard').onclick=()=>prepareStage(ST.findIndex(stage=>stage.difficulty==='HARD'));
$('devExpert').onclick=()=>prepareStage(ST.length-1);
$('devRush').onclick=()=>prepareStage(ST.findIndex(stage=>stage.type==='pressure'));
$('devChallenge').onclick=()=>prepareStage(ST.findIndex(stage=>stage.type==='challenge'));
$('devButterfly').onclick=()=>{spawnButterfly();devInfo();};
$('devFestival').onclick=()=>prepareStage(ST.findIndex(stage=>stage.type==='festival'));
$('devPrev').onclick=()=>jumpStage(-1);$('devNext').onclick=()=>jumpStage(1);
$('devComplete').onclick=()=>{if(totalGoalStage())total=Math.max(0,T.totalGoal-1);else entries().forEach(([n,g])=>goals[n]=Math.max(0,g-1));if(T.comboGoal)maxCombo=Math.max(maxCombo,T.comboGoal-1);ui();};
$('devTimePlus').onclick=()=>{time+=10;renderTime();devInfo();};
$('devTimeMinus').onclick=()=>{time=Math.max(.1,time-10);renderTime();devInfo();};
$('devPause').onclick=()=>{devPaused=!devPaused;$('devPause').textContent=devPaused?'타이머 재개':'타이머 정지';devInfo();};
$('devGoalPlus').onclick=()=>{if(totalGoalStage())T.totalGoal++;else if(T.goalType==='combo')T.comboGoal++;else Object.keys(T.g).forEach(n=>T.g[n]++);ui();};
$('devGoalMinus').onclick=()=>{if(totalGoalStage())T.totalGoal=Math.max(1,T.totalGoal-1);else if(T.goalType==='combo')T.comboGoal=Math.max(1,T.comboGoal-1);else Object.keys(T.g).forEach(n=>T.g[n]=Math.max(1,T.g[n]-1));ui();if(run&&done())stageClear();};
$('devReset').onclick=()=>{toggleDev(false);begin();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&run&&!menuPaused)openMenu();});

function fitBoard(){
 const app=$('app'),cs=getComputedStyle(app),hero=document.querySelector('.hero');
 const blocks=['.status','.mission','.harvest-row','.footer','.signature'];
 const marginHeight=el=>{const style=getComputedStyle(el);return parseFloat(style.marginTop)+parseFloat(style.marginBottom);};
 const fixed=blocks.reduce((sum,sel)=>sum+document.querySelector(sel).getBoundingClientRect().height,0)+
  parseFloat(getComputedStyle(hero).minHeight)+parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+parseFloat(cs.rowGap)*6+
  [...blocks.map(sel=>document.querySelector(sel)),hero,$('boardZone')].reduce((sum,el)=>sum+marginHeight(el),0);
 const maxWidth=app.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
 $('boardShell').style.width=Math.floor(Math.min(maxWidth,Math.max(170,(app.clientHeight-fixed)*512/558)))+'px';
}
window.addEventListener('resize',fitBoard);window.visualViewport?.addEventListener('resize',fitBoard);
$('helpText').insertAdjacentHTML('beforeend','<p>같은 수확물 <b>'+BLOOM_TRIGGER+'콤보</b>를 만들면 '+BLOOM_DURATION+'초 동안 <b>FEVER TIME · 점수 ×'+BLOOM_SCORE_MULTIPLIER+'</b>! 콤보가 끊겨도 유지되며, 피버 자체는 시간을 추가하지 않습니다.</p>');
$('helpText').insertAdjacentHTML('beforeend','<p><b>다른 색 → 🦋 나비 칸</b>으로 합성하면 해당 수확 점수 ×'+BUTTERFLY_SCORE_MULTIPLIER+'! 나비 칸에서 출발하면 보너스 없이 날아갑니다. 시간 보너스는 없습니다.</p>');
$('legend').innerHTML=Object.entries(F).map(([name,f])=>`<div class="recipe" aria-label="${f.r} = ${f.n}">${sprite('bud',f.need[0])}<span>+</span>${sprite('bud',f.need[1])}<span>=</span>${sprite('flower',name)}</div>`).join('');
if(!reducedMotion){
 for(let i=0;i<7;i++){const p=document.createElement('i');p.style.left=(i*15+2)+'%';p.style.animationDelay=(-i*1.6)+'s';p.style.animationDuration=(10+i%3*2)+'s';$('ambient').append(p);}
}
document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement){e.target.classList.add('missing');$('assetWarning').classList.remove('hide');}},true);
prepareStage(loadPuzzleStage());requestAnimationFrame(fitBoard);
// Decode essential art before enabling play. No remote CDN/font dependencies.
const required=['scene','festival','mascots','bud-red','bud-blue','bud-yellow','flower-purple','flower-orange','flower-green'];
$('startBtn').disabled=true;$('startBtn').textContent='농장 친구들을 불러오고 있어요…';
Promise.allSettled(required.map(name=>new Promise((resolve,reject)=>{
 const img=new Image();img.onload=()=>resolve(name);img.onerror=()=>reject(name);img.src=asset(name);
}))).then(results=>{
 $('startBtn').disabled=false;$('startBtn').innerHTML='시작하기 <span>→</span>';
 const missing=results.filter(r=>r.status==='rejected').map(r=>r.reason);
 if(missing.length){$('assetWarning').classList.remove('hide');console.warn('Missing Farm Friends assets:',missing);}
 document.documentElement.dataset.assetsReady=missing.length?'partial':'true';
 document.documentElement.dataset.farmVersion='festival-smooth-6';
});
