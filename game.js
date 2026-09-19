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
const stageName = () => ({festival:'농장 대축제',pressure:'수확 러시',challenge:'콤보 챌린지'}[T.type]||'햇살 농장');
const randomBalance = () => ({...RANDOM_BALANCE,...(DIFFICULTY_PROFILES[T.randomProfile]||DIFFICULTY_PROFILES.NORMAL),...T.spawnTuning});
const asset = name => window.FLOWER_BLOOM_ASSETS?.[name] || ASSET_ROOT + name + '.webp';
const sprite = (kind, name, alt='') => `<img src="${asset(kind+'-'+name)}" alt="${alt}" draggable="false">`;
const clock = seconds => {
 const n=Math.max(0,Math.ceil(seconds));
 return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
};

// Garden World v2. Pure save validation runs before any DOM or game mutation.
const GARDEN_KEY='flower-bloom.garden.v1';
const GARDEN_FLOWERS=['purple','orange','green'];
const GARDEN_SPECIAL={
 starlight:{base:'purple',name:'별빛 포도',hint:'한 판에서 같은 수확물 8콤보',mark:'★'},
 sunburst:{base:'orange',name:'축제의 황금 당근',hint:'농장 대축제 첫 클리어',mark:'✦'},
 jade:{base:'green',name:'비취 왕관 잎사귀',hint:'EXPERT 스테이지 첫 클리어',mark:'♛'}
};
const GARDEN_THEMES={spring:{name:'봄 햇살',need:0,sky:'#d2e5d7',ground:'#abc58c',ink:'#36553e'},sunset:{name:'노을 농장',need:3,sky:'#f1c1ac',ground:'#b7b281',ink:'#704c4a'},moonlight:{name:'밤의 축제',need:6,sky:'#394667',ground:'#698583',ink:'#e7efda'}};
const GARDEN_ROOMS={home:{name:'첫 농장',short:'농장'},greenhouse:{name:'새싹 온실',short:'온실'},pond:{name:'나비 연못',short:'연못'}};
const GARDEN_VISITORS={violet:{name:'보랏빛 나비',hint:'포도 3개 심기',color:'#b184d4'},amber:{name:'노을 나비',hint:'축제 클리어 + 당근 3개',color:'#efb965'},jade:{name:'풀잎 나비',hint:'분수 전시 + 잎사귀 3개',color:'#a7ce81'},rainbow:{name:'무지개 나비',hint:'누적 수확 10 + 세 가지 색 심기',color:'#e4a4b5'}};
const GARDEN_TROPHIES={albumLabel:{name:'작물 이름표',hint:'한 종류의 작물 누적 10개',mark:'✿'},requestFence:{name:'부탁의 울타리',hint:'친구들의 부탁 첫 완료',mark:'▥'},festivalFlag:{name:'축제 깃발',hint:'축제 첫 클리어',mark:'⚑'},festivalCrown:{name:'축제 꽃관',hint:'축제 3회 클리어',mark:'♛'},patternFrame:{name:'도안 기념패',hint:'배치 도안 첫 완성',mark:'♡'}};
const GARDEN_PATTERNS={
 rainbow:{name:'작은 무지개',capacity:4,slots:['purple','orange','green','purple'],frame:'rainbow'},
 checker:{name:'수확 체크무늬',capacity:8,slots:['purple','orange','purple','orange','orange','purple','orange','purple'],frame:'checker'},
 heart:{name:'하트 텃밭',capacity:12,slots:['purple','purple','purple','purple','purple','orange','orange','purple',null,'purple','purple',null],frame:'heart'}
};
const GARDEN_REQUESTS=[
 {name:'세 빛깔 수확 바구니',hint:'새로 포도·당근·잎사귀을 각각 2개 수확해 주세요.',type:'colors',goal:2},
 {name:'초록빛 산책',hint:'새로 잎사귀 6개를 수확해 주세요.',type:'green',goal:6},
 {name:'이어지는 풍년',hint:'같은 수확물 5콤보를 달성해 주세요.',type:'combo',goal:5},
 {name:'열두 번의 수확',hint:'종류와 관계없이 새로 수확물 12개를 수확해 주세요.',type:'total',goal:12}
];
const GARDEN_DECOR={bench:{name:'쉼터 의자',cost:15,element:'gardenBench'},fountain:{name:'작은 분수',cost:25,element:'gardenFountain'},lantern:{name:'농장 등불',cost:35,element:'gardenLantern'}};
function gardenDecorArt(id){
 const drawings={
  bench:'<path d="M10 34v8m28-8v8M7 25v10h34V25" stroke="#655c43"/><rect x="8" y="13" width="32" height="7" rx="2" fill="#b99061" stroke="#7b6248"/><path d="M12 20v9m24-9v9" stroke="#7b6248"/><rect x="6" y="28" width="36" height="6" rx="2" fill="#c5a06e" stroke="#7b6248"/>',
  fountain:'<ellipse cx="24" cy="37" rx="20" ry="7" fill="#8fbbb0" stroke="#618f83"/><path d="M8 36q16 9 32 0M24 30V12M24 14q-12-12-13 5M24 14q12-12 13 5" stroke="#caece3"/><path d="M21 25h6l3 12H18z" fill="#c5cba3" stroke="#829b80"/><path d="M12 23h24q-2 9-12 9t-12-9" fill="#d9dec1" stroke="#829b80"/><circle cx="24" cy="10" r="3" fill="#def7e7" stroke="none"/>',
  lantern:'<path d="M24 4v7M18 12h12M24 37v7" stroke="#846545"/><rect x="12" y="13" width="24" height="24" rx="9" fill="#f5d489" stroke="#aa8456"/><path d="M20 14q-4 11 0 22M28 14q4 11 0 22" stroke="#e6af69"/><path d="M18 38h12" stroke="#846545"/>'
 };
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+drawings[id]+'</svg>';
}
const gardenInt=(n,fallback=0)=>Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000):fallback;
const gardenHas=(object,key)=>typeof key==='string'&&Object.hasOwn(object,key);
const gardenFlowerValid=id=>GARDEN_FLOWERS.includes(id)||gardenHas(GARDEN_SPECIAL,id);
const gardenBase=id=>gardenHas(GARDEN_SPECIAL,id)?GARDEN_SPECIAL[id].base:id;
const gardenFlowerName=id=>gardenHas(GARDEN_SPECIAL,id)?GARDEN_SPECIAL[id].name:F[id]?.n||'';
const freshGarden=()=>({version:2,flowers:{purple:1,orange:1,green:1},earned:{purple:0,orange:0,green:0},sun:0,capacity:4,plots:Array(12).fill(null),decor:[],visibleDecor:[],cleared:[],nextStage:0,
 records:{purple:{firstStage:null,bestCombo:0,festival:0},orange:{firstStage:null,bestCombo:0,festival:0},green:{firstStage:null,bestCombo:0,festival:0}},
 rare:{starlight:0,sunburst:0,jade:0},specialUnlocked:[],theme:'spring',visitors:[],favoriteVisitor:null,
 festival:{clears:0,maxBlooms:0,bestCombo:0},request:{index:0,baseline:{purple:0,orange:0,green:0},combo:0,completed:0},
 trophies:[],shownTrophies:[],patterns:[],pattern:null,homeCompleted:false,activeRoom:'home',rooms:{greenhouse:Array(6).fill(null),pond:Array(6).fill(null)},
 treeStyle:'mint',photo:{name:'나의 작은 농장',showStats:true,still:true,frame:'plain'}
});
let gardenSaveError='',gardenReadOnly=false,gardenMigrationBackup=null;
function normalizeGarden(value){
 if(!value||typeof value!=='object'||![1,2].includes(value.version))throw new Error('Unsupported garden save');
 const clean=freshGarden(),old=value.version===1;
 const list=(source,allowed)=>allowed.filter(id=>Array.isArray(source)&&source.includes(id));
 for(const name of GARDEN_FLOWERS){
  clean.flowers[name]=gardenInt(value.flowers?.[name]);clean.earned[name]=gardenInt(value.earned?.[name]);
  const record=value.records?.[name]||{};
  clean.records[name]={firstStage:Number.isInteger(record.firstStage)&&record.firstStage>0&&record.firstStage<=ST.length?record.firstStage:null,bestCombo:gardenInt(record.bestCombo),festival:Math.min(clean.earned[name],gardenInt(record.festival))};
 }
 clean.sun=gardenInt(value.sun);clean.capacity=[4,8,12].includes(value.capacity)?value.capacity:4;
 clean.plots=Array.from({length:12},(_,i)=>i<clean.capacity&&gardenFlowerValid(value.plots?.[i])?value.plots[i]:null);
 clean.decor=list(value.decor,Object.keys(GARDEN_DECOR));clean.visibleDecor=list(value.visibleDecor,clean.decor);
 clean.cleared=list(value.cleared,Array.from({length:ST.length},(_,i)=>i));
 clean.nextStage=Number.isInteger(value.nextStage)&&value.nextStage>=0&&value.nextStage<ST.length?value.nextStage:0;
 clean.specialUnlocked=list(value.specialUnlocked,Object.keys(GARDEN_SPECIAL));
 for(const id of Object.keys(GARDEN_SPECIAL))clean.rare[id]=Math.min(1,gardenInt(value.rare?.[id]));
 clean.festival={clears:gardenInt(value.festival?.clears),maxBlooms:gardenInt(value.festival?.maxBlooms),bestCombo:gardenInt(value.festival?.bestCombo)};
 if(old&&clean.cleared.some(i=>ST[i].type==='festival'))clean.festival.clears=1;
 clean.theme=gardenHas(GARDEN_THEMES,value.theme)&&clean.cleared.length>=GARDEN_THEMES[value.theme].need?value.theme:'spring';
 clean.visitors=list(value.visitors,Object.keys(GARDEN_VISITORS));clean.favoriteVisitor=clean.visitors.includes(value.favoriteVisitor)?value.favoriteVisitor:null;
 clean.request.index=gardenInt(value.request?.index);clean.request.completed=gardenInt(value.request?.completed);clean.request.combo=gardenInt(value.request?.combo);
 for(const name of GARDEN_FLOWERS)clean.request.baseline[name]=old?clean.earned[name]:Math.min(clean.earned[name],gardenInt(value.request?.baseline?.[name]));
 clean.patterns=list(value.patterns,Object.keys(GARDEN_PATTERNS));
 clean.pattern=gardenHas(GARDEN_PATTERNS,value.pattern)&&clean.capacity>=GARDEN_PATTERNS[value.pattern].capacity?value.pattern:null;
 clean.trophies=list(value.trophies,Object.keys(GARDEN_TROPHIES));clean.shownTrophies=list(value.shownTrophies,clean.trophies);
 clean.homeCompleted=value.homeCompleted===true||(clean.capacity===12&&clean.plots.every(Boolean));
 for(const id of ['greenhouse','pond'])clean.rooms[id]=Array.from({length:6},(_,i)=>clean.homeCompleted&&gardenFlowerValid(value.rooms?.[id]?.[i])?value.rooms[id][i]:null);
 clean.activeRoom=clean.homeCompleted&&['greenhouse','pond'].includes(value.activeRoom)?value.activeRoom:'home';
 clean.treeStyle=['mint','rose','gold'].includes(value.treeStyle)?value.treeStyle:'mint';
 const name=typeof value.photo?.name==='string'?value.photo.name.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,20):'';
 clean.photo={name:name||'나의 작은 농장',showStats:value.photo?.showStats!==false,still:value.photo?.still!==false,frame:clean.patterns.includes(value.photo?.frame)?value.photo.frame:'plain'};
 // A rare flower is unique: repair duplicates while preserving its discovered state.
 for(const id of Object.keys(GARDEN_SPECIAL)){
  let seen=false;
  for(const plots of [clean.plots,...Object.values(clean.rooms)])for(let i=0;i<plots.length;i++)if(plots[i]===id){if(seen)plots[i]=null;else seen=true;}
  if(seen)clean.rare[id]=0;
  if((seen||clean.rare[id])&&!clean.specialUnlocked.includes(id))clean.specialUnlocked.push(id);
  if(clean.specialUnlocked.includes(id)&&!seen)clean.rare[id]=1;
 }
 return clean;
}
function loadGarden(){
 gardenMigrationBackup=null;
 try{
  const raw=localStorage.getItem(GARDEN_KEY);if(!raw)return freshGarden();
  try{const parsed=JSON.parse(raw),state=normalizeGarden(parsed);if(parsed.version===1)gardenMigrationBackup=raw;return state;}
  catch{gardenReadOnly=true;gardenSaveError='저장된 농장을 읽지 못했습니다. 기존 기록을 보호하며 이번 농장은 임시로 유지합니다.';return freshGarden();}
 }catch{gardenSaveError='자동 저장을 사용할 수 없습니다. 이 창을 닫으면 농장 변경사항이 사라질 수 있어요.';return freshGarden();}
}
let garden=loadGarden(),gardenTool='purple',gardenMoveFrom=null,gardenOpen=false,gardenOwnPause=false,gardenMenuWasVisible=false,gardenFocus=null;
let gardenTab='decorate',gardenPhotoURL=null,gardenPhotoBusy=false,gardenPhotoEpoch=0;
let gardenRenderedRoom=null,gardenRenderedPlots=[];
const gardenInert=new Map();
let gardenLastReward='',gardenRewardGeneration=-1,gardenAnnouncements=[];
const gardenEarned=()=>GARDEN_FLOWERS.reduce((sum,id)=>sum+garden.earned[id],0);
const gardenPlots=()=>garden.activeRoom==='home'?garden.plots:garden.rooms[garden.activeRoom];
const gardenCapacity=()=>garden.activeRoom==='home'?garden.capacity:6;
const gardenAllPlots=()=>garden.homeCompleted?[...garden.plots,...garden.rooms.greenhouse,...garden.rooms.pond]:garden.plots;
const gardenStock=id=>gardenHas(GARDEN_SPECIAL,id)?garden.rare[id]:garden.flowers[id];
function gardenChangeStock(id,delta){const stock=gardenHas(GARDEN_SPECIAL,id)?garden.rare:garden.flowers;stock[id]=gardenInt(stock[id]+delta);}
function saveGarden(){
 if(gardenReadOnly)return false;
 try{
  if(gardenMigrationBackup!==null){localStorage.setItem(GARDEN_KEY+'.backup-v1',gardenMigrationBackup);gardenMigrationBackup=null;}
  localStorage.setItem(GARDEN_KEY,JSON.stringify(garden));gardenSaveError='';return true;
 }catch{gardenSaveError='자동 저장에 실패했습니다. 이 창을 닫으면 최근 변경사항이 사라질 수 있어요.';return false;}
}
function gardenEntryText(){
 const count=Object.values(garden.flowers).reduce((a,b)=>a+b,0)+Object.values(garden.rare).reduce((a,b)=>a+b,0);
 document.querySelectorAll('[data-open-garden]').forEach(button=>{button.textContent='🌿 나의 농장 · 수확물 '+count+'개';});
}
function gardenAnnounce(text){gardenAnnouncements.push(text);if(gardenAnnouncements.length>5)gardenAnnouncements.shift();}
function gardenAwardSpecial(id){if(garden.specialUnlocked.includes(id))return false;garden.specialUnlocked.push(id);garden.rare[id]=1;gardenAnnounce(GARDEN_SPECIAL[id].name+'을 얻었어요!');return true;}
function gardenAwardTrophy(id){if(garden.trophies.includes(id))return false;garden.trophies.push(id);garden.shownTrophies.push(id);gardenAnnounce(GARDEN_TROPHIES[id].name+'을 받았어요.');return true;}
function gardenPatternDone(id){const p=GARDEN_PATTERNS[id];return garden.capacity>=p.capacity&&p.slots.every((color,i)=>color===null?garden.plots[i]===null:gardenBase(garden.plots[i])===color);}
function updateGardenMilestones(){
 let changed=false;
 if(Math.max(...GARDEN_FLOWERS.map(id=>garden.records[id].bestCombo))>=8)changed=gardenAwardSpecial('starlight')||changed;
 if(garden.festival.clears>=1){changed=gardenAwardSpecial('sunburst')||changed;changed=gardenAwardTrophy('festivalFlag')||changed;}
 if(garden.cleared.some(i=>ST[i].difficulty==='EXPERT'))changed=gardenAwardSpecial('jade')||changed;
 if(garden.festival.clears>=3)changed=gardenAwardTrophy('festivalCrown')||changed;
 if(GARDEN_FLOWERS.some(id=>garden.earned[id]>=10))changed=gardenAwardTrophy('albumLabel')||changed;
 if(garden.request.completed)changed=gardenAwardTrophy('requestFence')||changed;
 for(const id of Object.keys(GARDEN_PATTERNS))if(!garden.patterns.includes(id)&&gardenPatternDone(id)){garden.patterns.push(id);gardenAnnounce(GARDEN_PATTERNS[id].name+' 도안 완성! 사진 테두리가 열렸어요.');changed=true;}
 if(garden.patterns.length)changed=gardenAwardTrophy('patternFrame')||changed;
 if(!garden.homeCompleted&&garden.capacity===12&&garden.plots.every(Boolean)){garden.homeCompleted=true;gardenAnnounce('첫 농장 완성! 온실과 연못이 열렸어요.');changed=true;}
 const counts={purple:0,orange:0,green:0};gardenAllPlots().filter(Boolean).forEach(id=>counts[gardenBase(id)]++);
 const eligible={violet:counts.purple>=3,amber:counts.orange>=3&&garden.festival.clears>=1,jade:counts.green>=3&&garden.visibleDecor.includes('fountain'),rainbow:gardenEarned()>=10&&GARDEN_FLOWERS.every(id=>counts[id]>0)};
 for(const [id,yes] of Object.entries(eligible))if(yes&&!garden.visitors.includes(id)){garden.visitors.push(id);if(!garden.favoriteVisitor)garden.favoriteVisitor=id;gardenAnnounce(GARDEN_VISITORS[id].name+'가 처음 찾아왔어요!');changed=true;}
 return changed;
}
function collectGardenFlower(name){
 if(!GARDEN_FLOWERS.includes(name))return;
 garden.flowers[name]=gardenInt(garden.flowers[name]+1);garden.earned[name]=gardenInt(garden.earned[name]+1);
 const record=garden.records[name];if(record.firstStage===null)record.firstStage=si+1;record.bestCombo=Math.max(record.bestCombo,combo);
 if(T.type==='festival')record.festival=gardenInt(record.festival+1);
 garden.request.combo=Math.max(garden.request.combo,combo);
 updateGardenMilestones();saveGarden();gardenEntryText();
}
function rewardGardenClear(){
 if(gardenRewardGeneration===generation)return;gardenRewardGeneration=generation;
 const first=!garden.cleared.includes(si),reward=first?20:10;
 if(first)garden.cleared.push(si);
 garden.sun=gardenInt(garden.sun+reward);garden.nextStage=(si+1)%ST.length;
 if(T.type==='festival'){garden.festival.clears=gardenInt(garden.festival.clears+1);garden.festival.maxBlooms=Math.max(garden.festival.maxBlooms,total);garden.festival.bestCombo=Math.max(garden.festival.bestCombo,maxCombo);}
 updateGardenMilestones();
 gardenLastReward='☀ 햇살 +'+reward+(first?' · 첫 클리어 보너스 포함':'')+' · 농장에 모았어요';
 saveGarden();gardenEntryText();$('gardenReward').textContent=gardenLastReward;
}
function gardenMessage(text){$('gardenMessage').textContent=text;}
function gardenSprite(id){return sprite('flower',gardenBase(id))+(gardenHas(GARDEN_SPECIAL,id)?'<em class="rare-mark" aria-hidden="true">'+GARDEN_SPECIAL[id].mark+'</em>':'');}
function gardenRequestState(){
 const request=GARDEN_REQUESTS[garden.request.index%GARDEN_REQUESTS.length],delta=Object.fromEntries(GARDEN_FLOWERS.map(id=>[id,Math.max(0,garden.earned[id]-garden.request.baseline[id])]));
 const value=request.type==='colors'?GARDEN_FLOWERS.reduce((sum,id)=>sum+Math.min(request.goal,delta[id]),0):request.type==='green'?delta.green:request.type==='combo'?garden.request.combo:Object.values(delta).reduce((a,b)=>a+b,0);
 const goal=request.type==='colors'?request.goal*3:request.goal;
 return {request,value:Math.min(value,goal),goal,done:value>=goal,delta};
}
function gardenTree(){const thresholds=[0,10,30,60,120,240],names=['작은 씨앗','새싹의 인사','푸른 잎사귀','그늘을 만드는 나무','새가 머무는 나무','꽃이 가득한 나무'],xp=gardenEarned();let level=0;for(let i=1;i<thresholds.length;i++)if(xp>=thresholds[i])level=i;return {xp,level,name:names[level],next:thresholds[level+1]??null};}
function gardenTreeArt(){
 const tree=gardenTree(),color={mint:'#81ac7c',rose:'#d69cad',gold:'#cfb96d'}[garden.treeStyle];
 if(tree.level===0)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90" aria-hidden="true"><ellipse cx="40" cy="70" rx="5" ry="5" fill="#8b7955"/></svg>';
 let shapes='<path d="M40 79V34M40 61L26 48M40 51L53 38" fill="none" stroke="#8a7652" stroke-width="5" stroke-linecap="round"/>';
 if(tree.level<2)shapes+='<ellipse cx="30" cy="40" rx="13" ry="7" fill="'+color+'" transform="rotate(28 30 40)"/><ellipse cx="50" cy="34" rx="13" ry="7" fill="'+color+'" transform="rotate(-28 50 34)"/>';
 else{shapes+='<circle cx="25" cy="39" r="18" fill="'+color+'"/><circle cx="53" cy="36" r="19" fill="'+color+'"/><circle cx="39" cy="23" r="22" fill="'+color+'"/>';if(tree.level>=4)shapes+='<path d="M43 57q12 8 23-1" stroke="#b89d70" stroke-width="6"/><ellipse cx="53" cy="52" rx="6" ry="4" fill="#ecd7a5"/>';if(tree.level===5)for(const [x,y] of [[23,32],[40,16],[53,32],[36,42]])shapes+='<circle cx="'+x+'" cy="'+y+'" r="5" fill="#ffe7cf"/>';}
 if(tree.level===2)shapes='<g transform="translate(8 15) scale(.8)">'+shapes+'</g>';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90" aria-hidden="true">'+shapes+'</svg>';
}
function renderGarden(){
 const plots=gardenPlots(),capacity=gardenCapacity(),planted=plots.filter(Boolean).length,view=$('gardenView');
 view.dataset.theme=garden.theme;view.dataset.room=garden.activeRoom;view.dataset.tab=gardenTab;
 view.classList.toggle('photo-still',gardenTab==='photo'&&garden.photo.still);
 $('gardenTitle').textContent=garden.activeRoom==='home'?'나의 작은 농장':GARDEN_ROOMS[garden.activeRoom].name;
 $('gardenSun').textContent=garden.sun.toLocaleString('ko-KR');
 $('gardenLevel').textContent=garden.activeRoom==='home'?({4:'첫 번째 텃밭',8:'넓어지는 농장',12:'수확이 가득한 농장'})[garden.capacity]:GARDEN_ROOMS[garden.activeRoom].name;
 $('gardenStats').textContent='심은 작물 '+planted+' / '+capacity+' · 클리어 '+garden.cleared.length+' / '+ST.length;
 const pattern=garden.activeRoom==='home'&&garden.pattern?GARDEN_PATTERNS[garden.pattern]:null;
 $('gardenPlots').innerHTML=plots.map((flower,i)=>{
  const locked=i>=capacity,label=locked?'확장하면 열리는 텃밭':flower?gardenFlowerName(flower):'빈 텃밭',ghost=pattern&&i<pattern.slots.length?pattern.slots[i]:undefined;
  return '<button class="garden-plot '+(locked?'locked':flower?'planted':'empty')+(gardenMoveFrom===i?' selected':'')+(gardenHas(GARDEN_SPECIAL,flower)?' rare-flower':'')+(flower&&(gardenRenderedRoom!==garden.activeRoom||gardenRenderedPlots[i]!==flower)?' just-planted':'')+'" data-plot="'+i+'" '+(ghost!==undefined?'data-ghost="'+(ghost||'empty')+'"':'')+' aria-label="'+(i+1)+'번 '+label+(ghost!==undefined?' · 도안 '+(ghost?F[ghost].n:'빈칸'):'')+'" '+(locked?'disabled':'')+' aria-pressed="'+(gardenMoveFrom===i)+'">'+(locked?'✧':flower?gardenSprite(flower):'')+(flower&&garden.shownTrophies.includes('albumLabel')?'<span class="garden-plot-label">'+gardenFlowerName(flower)+'</span>':'')+'</button>';
 }).join('');
 gardenRenderedRoom=garden.activeRoom;gardenRenderedPlots=[...plots];
 $('gardenSeeds').innerHTML=GARDEN_FLOWERS.map(id=>'<button class="garden-seed" data-seed="'+id+'" aria-pressed="'+(gardenTool===id)+'" aria-label="'+F[id].n+' 선택, 보관 '+garden.flowers[id]+'개">'+gardenSprite(id)+'<b>'+F[id].n+' · '+garden.flowers[id]+'</b><span>누적 수확 '+garden.earned[id]+'</span></button>').join('');
 $('gardenRareSeeds').innerHTML=Object.entries(GARDEN_SPECIAL).map(([id,item])=>'<button class="garden-seed rare-flower" data-seed="'+id+'" '+(!garden.specialUnlocked.includes(id)?'disabled':'')+' aria-pressed="'+(gardenTool===id)+'">'+gardenSprite(id)+'<b>'+item.name+'</b><span>'+(garden.specialUnlocked.includes(id)?'보관 '+garden.rare[id]+' · 기념 수확물 1개':item.hint)+'</span></button>').join('');
 $('gardenMove').setAttribute('aria-pressed',gardenTool==='move');$('gardenRemove').setAttribute('aria-pressed',gardenTool==='remove');
 const cost=garden.capacity===4?30:60;
 $('gardenExpand').textContent=garden.capacity===12?'모든 텃밭이 열렸어요 · 12칸':'텃밭 4칸 넓히기 · ☀ '+cost;
 $('gardenExpand').disabled=garden.capacity===12||garden.sun<cost;$('gardenExpand').classList.toggle('hide',garden.activeRoom!=='home');
 $('gardenShop').innerHTML=Object.entries(GARDEN_DECOR).map(([id,item])=>{const owned=garden.decor.includes(id),shown=garden.visibleDecor.includes(id);return '<button class="garden-item" data-decor="'+id+'" aria-pressed="'+shown+'" '+(!owned&&garden.sun<item.cost?'disabled':'')+'><i aria-hidden="true">'+gardenDecorArt(id)+'</i><b>'+item.name+'</b><span>'+(owned?shown?'전시 중 · 누르면 보관':'보유 중 · 누르면 전시':'☀ '+item.cost)+'</span></button>';}).join('');
 for(const [id,item] of Object.entries(GARDEN_DECOR)){$(item.element).innerHTML=gardenDecorArt(id);$(item.element).classList.toggle('hide',!garden.visibleDecor.includes(id));}
 const butterflies=new Set(plots.filter(Boolean).map(gardenBase)).size===3||Boolean(garden.favoriteVisitor);
 $('gardenButterflies').classList.toggle('hide',!butterflies);$('gardenButterflies').dataset.visitor=garden.favoriteVisitor||'default';
 $('gardenButterflies').style.setProperty('--visitor-color',GARDEN_VISITORS[garden.favoriteVisitor]?.color||'#ac84cb');
 $('gardenSceneNote').textContent=gardenTab==='photo'?garden.photo.name:garden.favoriteVisitor?GARDEN_VISITORS[garden.favoriteVisitor].name+'가 함께 쉬어 가요':butterflies?'싱그러운 풀내음을 따라 나비가 찾아왔어요':'세 가지 작물을 심으면 나비가 찾아와요';
 $('gardenSceneTree').innerHTML=gardenTreeArt();$('gardenSceneTree').setAttribute('aria-label',gardenTree().name);
 const scene=document.querySelector('.garden-scene');scene.classList.toggle('has-fence',garden.shownTrophies.includes('requestFence'));scene.classList.toggle('has-festival',garden.shownTrophies.includes('festivalFlag'));scene.classList.toggle('has-crown',garden.shownTrophies.includes('festivalCrown'));scene.classList.toggle('has-pattern',garden.shownTrophies.includes('patternFrame'));
 renderGardenWorld();
 $('gardenSave').textContent=gardenSaveError||'이 기기·브라우저에 자동 저장됩니다. 사이트 데이터 삭제 시 기록도 삭제됩니다.';
 $('gardenSave').classList.toggle('error',Boolean(gardenSaveError));gardenEntryText();
}
function renderGardenWorld(){
 document.querySelectorAll('[data-garden-tab]').forEach(button=>{const selected=button.dataset.gardenTab===gardenTab;button.setAttribute('aria-selected',selected);button.tabIndex=selected?0:-1;});
 for(const id of ['decorate','album','progress','photo'])$('gardenPanel-'+id).classList.toggle('hide',gardenTab!==id);
 $('gardenRooms').innerHTML=Object.entries(GARDEN_ROOMS).map(([id,item])=>'<button data-room="'+id+'" aria-pressed="'+(garden.activeRoom===id)+'" '+(id!=='home'&&!garden.homeCompleted?'disabled':'')+'>'+item.short+(id!=='home'&&!garden.homeCompleted?' · 잠김':'')+'</button>').join('');
 $('gardenRoomHint').textContent=garden.homeCompleted?'온실·연못에도 작물을 옮길 수 있어요. 보관함은 함께 사용합니다.':'첫 농장 12칸을 모두 채우면 온실과 연못이 열려요.';
 $('gardenThemes').innerHTML=Object.entries(GARDEN_THEMES).map(([id,item])=>'<button data-theme="'+id+'" aria-pressed="'+(garden.theme===id)+'" '+(garden.cleared.length<item.need?'disabled':'')+'><i style="background:'+item.sky+'" aria-hidden="true"></i>'+item.name+(garden.cleared.length<item.need?'<small>첫 클리어 '+garden.cleared.length+'/'+item.need+'</small>':'')+'</button>').join('');
 $('gardenTrophies').innerHTML=Object.entries(GARDEN_TROPHIES).map(([id,item])=>'<button data-trophy="'+id+'" aria-pressed="'+garden.shownTrophies.includes(id)+'" '+(!garden.trophies.includes(id)?'disabled':'')+'><b>'+item.mark+' '+item.name+'</b><small>'+(garden.trophies.includes(id)?garden.shownTrophies.includes(id)?'전시 중 · 보관하기':'보유 중 · 전시하기':item.hint)+'</small></button>').join('');
 $('gardenAlbum').innerHTML=GARDEN_FLOWERS.map(id=>{const n=garden.earned[id],record=garden.records[id],rank=n>=75?'만개':n>=30?'성장':n>=10?'새싹':'기록 시작',next=[10,30,75].find(target=>n<target);return '<article class="garden-record">'+sprite('flower',id)+'<div><h4>'+F[id].n+' <span>'+rank+'</span></h4><p>누적 '+n+'개 · 최고 '+record.bestCombo+'콤보<br>첫 수확 '+(record.firstStage?'ST'+record.firstStage:n?'이전 버전 기록':'아직 없음')+' · 축제 수확 '+record.festival+'개</p><small>'+(next?'다음 도감 단계까지 '+(next-n)+'개':'모든 도감 단계 달성')+'</small><progress max="'+(next||75)+'" value="'+Math.min(n,next||75)+'" aria-label="'+F[id].n+' 도감 진행"></progress></div></article>';}).join('');
 $('gardenSpecialAlbum').innerHTML=Object.entries(GARDEN_SPECIAL).map(([id,item])=>'<article class="garden-record '+(garden.specialUnlocked.includes(id)?'':'undiscovered')+'"><div class="rare-flower">'+gardenSprite(id)+'</div><div><h4>'+item.name+'</h4><p>'+item.hint+'</p><small>'+(garden.specialUnlocked.includes(id)?'발견 완료 · '+(garden.rare[id]?'보관함에 있어요':'농장에 심어 두었어요'):'조건을 달성하면 1개 지급')+'</small></div></article>').join('');
 $('gardenVisitors').innerHTML=Object.entries(GARDEN_VISITORS).map(([id,item])=>'<button data-visitor="'+id+'" aria-pressed="'+(garden.favoriteVisitor===id)+'" '+(!garden.visitors.includes(id)?'disabled':'')+'><i class="visitor-swatch" style="--wing:'+item.color+'" aria-hidden="true">❦</i><b>'+item.name+'</b><small>'+(garden.visitors.includes(id)?garden.favoriteVisitor===id?'농장에 머무는 중':'발견 완료 · 농장에 초대':item.hint)+'</small></button>').join('');
 $('gardenVisitorCount').textContent=garden.visitors.length+' / '+Object.keys(GARDEN_VISITORS).length+'종';
 const tree=gardenTree();$('gardenTreeArt').innerHTML=gardenTreeArt();$('gardenTreeName').textContent=tree.name;$('gardenTreeProgress').textContent='누적 수확 '+tree.xp+'개 · '+(tree.next?'다음 성장까지 '+(tree.next-tree.xp)+'개':'마지막 성장 단계에 도달했어요');
 $('gardenTreeMeter').max=tree.next||240;$('gardenTreeMeter').value=Math.min(tree.xp,tree.next||240);
 $('gardenTreeStyles').innerHTML=Object.entries({mint:'푸른 잎',rose:'분홍 잎',gold:'금빛 잎'}).map(([id,label])=>'<button data-tree-style="'+id+'" aria-pressed="'+(garden.treeStyle===id)+'" '+(id!=='mint'&&tree.level<3?'disabled':'')+'>'+label+(id!=='mint'&&tree.level<3?' · 수확 60':'')+'</button>').join('');
 const state=gardenRequestState();$('gardenRequestName').textContent=state.request.name;$('gardenRequestHint').textContent=state.request.hint;
 $('gardenRequestProgress').textContent=state.request.type==='colors'?GARDEN_FLOWERS.map(id=>F[id].n+' '+Math.min(state.request.goal,state.delta[id])+'/'+state.request.goal).join(' · '):state.value+' / '+state.goal;
 $('gardenRequestClaim').disabled=!state.done;$('gardenRequestClaim').textContent=state.done?'부탁 완료 · 햇살 8 받기':'완료하면 햇살 8 · 첫 완료는 울타리';
 $('gardenRequestCount').textContent='완료한 부탁 '+garden.request.completed+'회 · 바꾸면 현재 부탁의 진척만 초기화됩니다.';
 $('gardenFestivalRecord').textContent='축제 '+garden.festival.clears+'회 클리어 · 최고 수확 '+garden.festival.maxBlooms+'개 · 최고 '+garden.festival.bestCombo+'콤보';
 $('gardenFestivalNext').textContent=garden.festival.clears>=3?'황금 당근·축제 깃발·꽃관을 모두 모았어요.':garden.festival.clears?'축제 '+(3-garden.festival.clears)+'회 더 클리어하면 꽃관을 얻어요.':'축제 첫 클리어로 황금 당근과 축제 깃발을 얻어요.';
 $('gardenPatternChoices').innerHTML='<button data-pattern="none" aria-pressed="'+(garden.pattern===null)+'">자유 배치</button>'+Object.entries(GARDEN_PATTERNS).map(([id,p])=>'<button data-pattern="'+id+'" aria-pressed="'+(garden.pattern===id)+'" '+(garden.capacity<p.capacity?'disabled':'')+'>'+p.name+(garden.patterns.includes(id)?' ✓':garden.capacity<p.capacity?' · '+p.capacity+'칸':'')+'</button>').join('');
 renderGardenPattern();
 $('gardenPhotoName').value=garden.photo.name;$('gardenPhotoStats').checked=garden.photo.showStats;$('gardenPhotoStill').checked=garden.photo.still;
 $('gardenPhotoFrames').innerHTML='<option value="plain">기본 프레임</option>'+garden.patterns.map(id=>'<option value="'+id+'">'+GARDEN_PATTERNS[id].name+' 기념 프레임</option>').join('');$('gardenPhotoFrames').value=garden.photo.frame;
 $('gardenNews').textContent=gardenAnnouncements.length?gardenAnnouncements.join(' · '):'수확물은 실패해도 남아요. 친구들과 함께 농장을 꾸며요.';
}
function renderGardenPattern(){
 const p=GARDEN_PATTERNS[garden.pattern];
 if(!p){$('gardenPatternPreview').replaceChildren();$('gardenPatternHint').textContent='도안을 고르면 첫 농장 텃밭에 색 안내가 나타납니다. 작물은 직접 심고 언제든 회수할 수 있어요.';return;}
 $('gardenPatternPreview').innerHTML=p.slots.map(color=>'<i class="pattern-dot" data-color="'+(color||'empty')+'" aria-label="'+(color?F[color].n:'빈칸')+'"></i>').join('');
 const needed={purple:0,orange:0,green:0},available={...garden.flowers};p.slots.filter(Boolean).forEach(id=>needed[id]++);garden.plots.filter(Boolean).forEach(id=>available[gardenBase(id)]++);
 for(const id of Object.keys(GARDEN_SPECIAL))available[GARDEN_SPECIAL[id].base]+=garden.rare[id];
 const missing=GARDEN_FLOWERS.filter(id=>needed[id]>available[id]).map(id=>F[id].n+' '+(needed[id]-available[id])+'개');
 const cells=p.slots.reduce((sum,id,i)=>sum+(id===null?garden.plots[i]!==null:gardenBase(garden.plots[i])!==id),0);
 $('gardenPatternHint').textContent=(garden.patterns.includes(garden.pattern)?'완성 기록 ✓ · 사진 프레임 보유. ':'')+(gardenPatternDone(garden.pattern)?'현재 배치도 도안과 같아요!':'첫 농장에서 '+cells+'칸을 맞춰 주세요. ')+(missing.length?'추가로 모을 작물: '+missing.join(', '):'현재 작물로 배치할 수 있어요.');
}
function openGarden(){
 if(clearing||gardenOpen)return;
 gardenFocus=document.activeElement;gardenOwnPause=!menuPaused;gardenMenuWasVisible=!$('menu').classList.contains('hide');
 if(gardenOwnPause)openMenu();$('menu').classList.add('hide');gardenOpen=true;gardenMoveFrom=null;
 for(const child of $('app').children)if(child!==$('gardenView')){gardenInert.set(child,child.inert);child.inert=true;}
 if(updateGardenMilestones())saveGarden();renderGarden();gardenMessage('작물을 고르고 빈 텃밭을 눌러 심어 보세요.');
 $('gardenView').classList.remove('hide');$('gardenView').scrollTop=0;$('gardenClose').focus();
}
function closeGarden(){
 if(!gardenOpen)return;gardenOpen=false;$('gardenView').classList.add('hide');
 for(const [child,inert] of gardenInert)child.inert=inert;gardenInert.clear();
 if(gardenOwnPause)closeMenu();else if(gardenMenuWasVisible)$('menu').classList.remove('hide');
 if(gardenFocus?.isConnected)gardenFocus.focus();
}
function gardenCommit(message,focusSelector){updateGardenMilestones();saveGarden();renderGarden();if(message)gardenMessage(message);if(focusSelector)document.querySelector(focusSelector)?.focus();}
function editGardenPlot(index){
 if(!gardenOpen||gardenTab!=='decorate'||!Number.isInteger(index)||index<0||index>=gardenCapacity())return;
 const plots=gardenPlots(),old=plots[index];let message='';
 if(gardenTool==='remove'){
  if(!old){gardenMessage('보관할 작물이 있는 텃밭을 눌러 주세요.');return;}
  gardenChangeStock(old,1);plots[index]=null;message=gardenFlowerName(old)+'을 보관함으로 옮겼어요.';
 }else if(gardenTool==='move'){
  if(gardenMoveFrom===null){if(!old){gardenMessage('먼저 옮길 작물을 눌러 주세요.');return;}gardenMoveFrom=index;renderGarden();gardenMessage('옮길 텃밭을 눌러 주세요. 작물이 있으면 서로 자리를 바꿔요.');$('gardenPlots').querySelector('[data-plot="'+index+'"]').focus();return;}
  [plots[index],plots[gardenMoveFrom]]=[plots[gardenMoveFrom],old];gardenMoveFrom=null;message='작물의 자리를 바꿨어요.';
 }else{
  if(!gardenFlowerValid(gardenTool))return;
  if(old===gardenTool){gardenMessage('이미 같은 수확물이 피어 있어요.');return;}
  if(gardenStock(gardenTool)<1){gardenMessage('이 작물을 모두 심었어요. 퍼즐에서 더 수확하거나 다른 농장에서 회수해 주세요.');return;}
  gardenChangeStock(gardenTool,-1);if(old)gardenChangeStock(old,1);plots[index]=gardenTool;
  message=gardenFlowerName(gardenTool)+'을 농장에 심었어요!'+(old?' 이전 작물은 보관함에 돌려드렸어요.':'');
 }
 gardenCommit(message,'#gardenPlots [data-plot="'+index+'"]');
}
function expandGarden(){if(!gardenOpen||garden.activeRoom!=='home'||garden.capacity>=12)return;const cost=garden.capacity===4?30:60;if(garden.sun<cost)return;garden.sun-=cost;garden.capacity+=4;gardenCommit('새 텃밭 4칸이 열렸어요. 더 많은 작물을 심어 보세요!');}
function decorateGarden(id){
 if(!gardenOpen||!gardenHas(GARDEN_DECOR,id))return;const item=GARDEN_DECOR[id],owned=garden.decor.includes(id);
 if(!owned){if(garden.sun<item.cost)return;garden.sun-=item.cost;garden.decor.push(id);garden.visibleDecor.push(id);}
 else if(garden.visibleDecor.includes(id))garden.visibleDecor=garden.visibleDecor.filter(name=>name!==id);else garden.visibleDecor.push(id);
 gardenCommit(item.name+(garden.visibleDecor.includes(id)?'을 농장에 놓았어요.':'을 보관했어요. 언제든 다시 놓을 수 있어요.'),'#gardenShop [data-decor="'+id+'"]');
}
function selectGardenTab(id){if(!gardenOpen||!['decorate','album','progress','photo'].includes(id))return;gardenTab=id;gardenMoveFrom=null;renderGarden();$('gardenView').scrollTop=0;document.querySelector('[data-garden-tab="'+id+'"]').focus();}
function selectGardenRoom(id){if(!gardenOpen||!gardenHas(GARDEN_ROOMS,id)||(id!=='home'&&!garden.homeCompleted))return;garden.activeRoom=id;gardenMoveFrom=null;gardenCommit(GARDEN_ROOMS[id].name+'으로 왔어요.','#gardenRooms [data-room="'+id+'"]');}
function selectGardenTheme(id){if(!gardenOpen||!gardenHas(GARDEN_THEMES,id)||garden.cleared.length<GARDEN_THEMES[id].need)return;garden.theme=id;gardenCommit(GARDEN_THEMES[id].name+'을 적용했어요.','#gardenThemes [data-theme="'+id+'"]');}
function resetGardenRequest(){garden.request.index=gardenInt(garden.request.index+1);garden.request.baseline={...garden.earned};garden.request.combo=0;}
function claimGardenRequest(){if(!gardenOpen||!gardenRequestState().done)return;garden.sun=gardenInt(garden.sun+8);garden.request.completed=gardenInt(garden.request.completed+1);resetGardenRequest();gardenAnnounce('친구들의 부탁 완료! 햇살 8개를 받았어요.');gardenCommit('햇살 8개를 받았어요. 다음 부탁을 확인해 보세요.');}
function skipGardenRequest(){if(!gardenOpen)return;if(gardenRequestState().value>0&&!window.confirm('현재 부탁의 진척을 초기화하고 다른 부탁을 받을까요? 모은 작물은 유지됩니다.'))return;resetGardenRequest();gardenCommit('새로운 부탁을 받았어요.');}
function selectGardenPattern(id){if(!gardenOpen)return;if(id==='none')garden.pattern=null;else if(gardenHas(GARDEN_PATTERNS,id)&&garden.capacity>=GARDEN_PATTERNS[id].capacity)garden.pattern=id;else return;gardenCommit('도안은 첫 농장에 적용됩니다. 작물을 직접 심어 완성해 보세요.','#gardenPatternChoices [data-pattern="'+id+'"]');}
function updateGardenPhotoSettings(){
 garden.photo.name=$('gardenPhotoName').value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,20)||'나의 작은 농장';garden.photo.showStats=$('gardenPhotoStats').checked;garden.photo.still=$('gardenPhotoStill').checked;
 const frame=$('gardenPhotoFrames').value;garden.photo.frame=garden.patterns.includes(frame)?frame:'plain';saveGarden();
 $('gardenView').classList.toggle('photo-still',gardenTab==='photo'&&garden.photo.still);if(gardenTab==='photo')$('gardenSceneNote').textContent=garden.photo.name;
 $('gardenPhotoStatus').textContent='설정을 바꾼 뒤 사진 만들기를 눌러 새 사진을 만들어 주세요.';
}
function gardenLoadPicture(url){return new Promise((resolve,reject)=>{const picture=new Image();picture.onload=()=>resolve(picture);picture.onerror=()=>reject(new Error('사진용 그림을 불러오지 못했습니다.'));picture.src=url;});}
function gardenSvgURL(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
async function makeGardenPhoto(){
 if(!gardenOpen||gardenPhotoBusy)return;gardenPhotoBusy=true;const epoch=++gardenPhotoEpoch;
 updateGardenPhotoSettings();$('gardenPhotoMake').disabled=true;$('gardenPhotoStatus').textContent='농장의 사진을 만들고 있어요…';
 // Snapshot once: changing a tab or save while images decode cannot mix two gardens.
 const state=JSON.parse(JSON.stringify(garden)),plots=state.activeRoom==='home'?state.plots:state.rooms[state.activeRoom],capacity=state.activeRoom==='home'?state.capacity:6,theme=GARDEN_THEMES[state.theme],treeSvg=gardenTreeArt();
 try{
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1280;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('이 브라우저에서는 사진을 만들 수 없습니다.');
  const rounded=(x,y,w,h,r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
  rounded(0,0,1000,1280,0,state.theme==='moonlight'?'#222b42':'#f6f4e9');
  ctx.fillStyle=state.theme==='moonlight'?'#dee8d4':'#69815c';ctx.textAlign='center';ctx.font='600 20px system-ui';ctx.fillText('FARM FRIENDS · MY LITTLE FARM',500,70);
  ctx.font='600 42px system-ui';ctx.fillText(state.photo.name,500,140,850);ctx.font='22px system-ui';ctx.fillText(GARDEN_ROOMS[state.activeRoom].name+' · '+theme.name,500,184);
  ctx.save();ctx.beginPath();ctx.roundRect(60,225,880,840,[155,155,50,50]);ctx.clip();
  const sky=ctx.createLinearGradient(0,225,0,1065);sky.addColorStop(0,theme.sky);sky.addColorStop(.42,theme.sky);sky.addColorStop(.43,theme.ground);sky.addColorStop(1,theme.ground);ctx.fillStyle=sky;ctx.fillRect(60,225,880,840);
  const farmBackdrop=await gardenLoadPicture(asset(state.theme==='moonlight'?'festival':'garden'));
  ctx.drawImage(farmBackdrop,0,Math.round(farmBackdrop.height*.1),farmBackdrop.width,Math.round(farmBackdrop.height*.8),60,225,880,840);
  ctx.fillStyle=state.theme==='moonlight'?'#e4e8c8':'#fff0bc';ctx.beginPath();ctx.arc(740,315,43,0,Math.PI*2);ctx.fill();
  if(state.activeRoom==='greenhouse'){ctx.strokeStyle='#fff8d890';ctx.lineWidth=7;ctx.strokeRect(125,270,750,740);for(const x of [375,625]){ctx.beginPath();ctx.moveTo(x,270);ctx.lineTo(x,1000);ctx.stroke();}}
  if(state.activeRoom==='pond'){ctx.fillStyle='#77aead';ctx.beginPath();ctx.ellipse(500,755,440,245,0,0,Math.PI*2);ctx.fill();}
  const columns=state.activeRoom==='home'?4:3,cell=columns===4?175:210,gap=20,startX=(1000-(columns*cell+(columns-1)*gap))/2,startY=410;
  const images={};for(const id of new Set(plots.filter(Boolean).map(gardenBase)))images[id]=await gardenLoadPicture(asset('flower-'+id));
  for(let i=0;i<plots.length;i++){
   const x=startX+(i%columns)*(cell+gap),y=startY+Math.floor(i/columns)*(cell+gap),id=plots[i];
   rounded(x,y,cell,cell,38,i<capacity?'#eff5ce44':'#a9bc9344');if(i>=capacity)continue;
   ctx.fillStyle='#6e875650';ctx.beginPath();ctx.ellipse(x+cell/2,y+cell*.64,cell*.36,cell*.2,0,0,Math.PI*2);ctx.fill();
   if(id){ctx.drawImage(images[gardenBase(id)],x-5,y-13,cell+10,cell+10);if(gardenHas(GARDEN_SPECIAL,id)){ctx.fillStyle='#ffe199';ctx.font='bold 36px system-ui';ctx.fillText(GARDEN_SPECIAL[id].mark,x+cell*.8,y+cell*.2);}}
  }
  for(const id of state.visibleDecor){const picture=await gardenLoadPicture(gardenSvgURL(gardenDecorArt(id)));const x=id==='bench'?80:id==='fountain'?800:825,y=id==='lantern'?335:970;ctx.drawImage(picture,x,y,110,90);}
  ctx.drawImage(await gardenLoadPicture(gardenSvgURL(treeSvg)),110,270,105,118);
  if(state.shownTrophies.includes('requestFence')){ctx.strokeStyle='#f0e2b4';ctx.lineWidth=7;for(let x=105;x<900;x+=35){ctx.beginPath();ctx.moveTo(x,1030);ctx.lineTo(x,1060);ctx.stroke();}ctx.beginPath();ctx.moveTo(95,1040);ctx.lineTo(905,1040);ctx.stroke();}
  if(state.shownTrophies.includes('festivalFlag')){ctx.fillStyle='#f0c278';ctx.beginPath();ctx.moveTo(410,320);ctx.lineTo(590,320);ctx.lineTo(500,370);ctx.closePath();ctx.fill();}
  if(state.shownTrophies.includes('festivalCrown')){ctx.font='42px system-ui';ctx.fillStyle='#ffe6a0';ctx.fillText('♛',500,308);}
  if(state.favoriteVisitor||new Set(plots.filter(Boolean).map(gardenBase)).size===3){ctx.fillStyle=GARDEN_VISITORS[state.favoriteVisitor]?.color||'#b184d4';for(const [x,y] of [[320,355],[675,385]]){ctx.beginPath();ctx.ellipse(x-10,y,12,19,-.5,0,Math.PI*2);ctx.ellipse(x+10,y,12,19,.5,0,Math.PI*2);ctx.fill();}}
  ctx.drawImage(await gardenLoadPicture(asset('mascots')),685,815,210,210);
  ctx.restore();
  if(state.photo.frame!=='plain'){ctx.strokeStyle={rainbow:'#b2a1ce',checker:'#c4946e',heart:'#d18da5'}[state.photo.frame];ctx.lineWidth=10;ctx.beginPath();ctx.roundRect(30,25,940,1230,35);ctx.stroke();ctx.font='22px system-ui';ctx.fillStyle=state.theme==='moonlight'?'#edf2dc':'#65795b';ctx.fillText(GARDEN_PATTERNS[state.photo.frame].name+' · 도안 완성 기념',500,1217);}
  ctx.fillStyle=state.theme==='moonlight'?'#edf2dc':'#426047';ctx.font='24px system-ui';
  ctx.fillText(state.photo.showStats?'누적 수확 '+GARDEN_FLOWERS.reduce((sum,id)=>sum+state.earned[id],0)+'개 · 클리어 '+state.cleared.length+' / '+ST.length:'농장 친구들과 함께하는 행복한 하루',500,1130);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('사진 저장 파일을 만들지 못했습니다.')),'image/png'));
  if(epoch!==gardenPhotoEpoch)return;
  if(gardenPhotoURL)URL.revokeObjectURL(gardenPhotoURL);gardenPhotoURL=URL.createObjectURL(blob);$('gardenPhotoPreview').src=gardenPhotoURL;$('gardenPhotoPreview').classList.remove('hide');
  $('gardenPhotoDownload').href=gardenPhotoURL;$('gardenPhotoDownload').classList.remove('hide');$('gardenPhotoStatus').textContent='사진이 준비됐어요. 사진 저장을 눌러 받으세요. 외부에 자동 공유하지 않습니다.';
 }catch(error){$('gardenPhotoStatus').textContent=error.message||'사진을 만들지 못했습니다. 다시 시도해 주세요.';}
 finally{gardenPhotoBusy=false;$('gardenPhotoMake').disabled=false;}
}
function setupGarden(){
 const button='<button class="btn secondary garden-entry" data-open-garden>🌿 나의 농장</button>';
 $('startBtn').insertAdjacentHTML('afterend','<p class="garden-reward" id="gardenReward" role="status"></p>'+button);$('retry').insertAdjacentHTML('afterend',button);$('resumeBtn').insertAdjacentHTML('afterend',button);
 document.querySelectorAll('[data-open-garden]').forEach(el=>el.addEventListener('click',openGarden));$('gardenClose').onclick=closeGarden;$('gardenPlay').onclick=closeGarden;
 $('gardenPlots').onclick=e=>{const target=e.target.closest('[data-plot]');if(target)editGardenPlot(Number(target.dataset.plot));};
 const selectSeed=e=>{const target=e.target.closest('[data-seed]');if(!target||target.disabled)return;gardenTool=target.dataset.seed;gardenMoveFrom=null;renderGarden();gardenMessage(gardenFlowerName(gardenTool)+'을 심을 텃밭을 눌러 주세요.');document.querySelector('[data-seed="'+gardenTool+'"]').focus();};
 $('gardenSeeds').onclick=selectSeed;$('gardenRareSeeds').onclick=selectSeed;
 for(const [id,tool] of [['gardenMove','move'],['gardenRemove','remove']])$(id).onclick=()=>{gardenTool=tool;gardenMoveFrom=null;renderGarden();gardenMessage(tool==='move'?'옮길 작물을 먼저 눌러 주세요.':'보관함에 돌려놓을 작물을 눌러 주세요.');};
 $('gardenExpand').onclick=expandGarden;
 const delegate=(id,attribute,handler)=>$(id).addEventListener('click',e=>{const target=e.target.closest('['+attribute+']');if(target&&!target.disabled)handler(target.getAttribute(attribute));});
 delegate('gardenShop','data-decor',decorateGarden);delegate('gardenTabs','data-garden-tab',selectGardenTab);delegate('gardenRooms','data-room',selectGardenRoom);delegate('gardenThemes','data-theme',selectGardenTheme);delegate('gardenPatternChoices','data-pattern',selectGardenPattern);
 $('gardenTabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const ids=['decorate','album','progress','photo'],index=ids.indexOf(gardenTab);selectGardenTab(ids[e.key==='Home'?0:e.key==='End'?3:(index+(e.key==='ArrowRight'?1:3))%4]);});
 delegate('gardenTrophies','data-trophy',id=>{if(!garden.trophies.includes(id))return;garden.shownTrophies=garden.shownTrophies.includes(id)?garden.shownTrophies.filter(x=>x!==id):[...garden.shownTrophies,id];gardenCommit('기념 장식의 전시 상태를 바꿨어요.','#gardenTrophies [data-trophy="'+id+'"]');});
 delegate('gardenVisitors','data-visitor',id=>{if(!garden.visitors.includes(id))return;garden.favoriteVisitor=id;gardenCommit(GARDEN_VISITORS[id].name+'를 농장에 초대했어요.','#gardenVisitors [data-visitor="'+id+'"]');});
 delegate('gardenTreeStyles','data-tree-style',id=>{if(!['mint','rose','gold'].includes(id)||(id!=='mint'&&gardenTree().level<3))return;garden.treeStyle=id;gardenCommit('응원 나무의 잎 색을 바꿨어요.','#gardenTreeStyles [data-tree-style="'+id+'"]');});
 $('gardenRequestClaim').onclick=claimGardenRequest;$('gardenRequestSkip').onclick=skipGardenRequest;$('gardenPhotoMake').onclick=makeGardenPhoto;
 for(const id of ['gardenPhotoName','gardenPhotoStats','gardenPhotoStill','gardenPhotoFrames'])$(id).addEventListener('change',updateGardenPhotoSettings);
 $('gardenView').addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();closeGarden();return;}if(e.key!=='Tab')return;
  const controls=Array.from($('gardenView').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')).filter(el=>el.getClientRects().length),first=controls[0],last=controls[controls.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
 window.addEventListener('storage',e=>{if(e.key!==GARDEN_KEY)return;gardenSaveError='';gardenReadOnly=false;garden=loadGarden();gardenMoveFrom=null;if(updateGardenMilestones())saveGarden();gardenEntryText();if(gardenOpen)renderGarden();});
 const changed=updateGardenMilestones();if(changed||gardenMigrationBackup!==null)saveGarden();gardenEntryText();
}

// Scheduled board callbacks must never affect a different stage/reset.
function later(fn, ms) {
 const epoch=generation;
 const id=setTimeout(() => {pending.delete(id); if(epoch===generation) fn();},ms);
 pending.add(id); return id;
}
function stopClocks() { clearInterval(timer); clearInterval(beatTimer); timer=beatTimer=null; }
function cancelBoardWork() {
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
 frameFlowers(true);
}
function ui() {
 T=ST[si];
 $('app').dataset.scene=T.type;
 document.querySelector('.garden-label').innerHTML=T.type==='festival'?'반짝이는 농장 대축제<span>FARM FESTIVAL · LET’S CELEBRATE</span>':'햇살 가득한 우리 농장<span>LITTLE FARM · BIG HAPPINESS</span>';
 document.querySelector('.tagline').textContent=T.type==='festival'?'친구들과 함께, 밤하늘 가득 축제!':'농장 친구들과 함께하는 컬러 퍼즐';
 $('startTitle').textContent=T.type==='normal'?'오늘의 수확 목표':stageName();
 document.querySelector('.stage-name').textContent=T.type!=='normal'?stageName():T.difficulty==='EXPERT'?'🌺 EXPERT':T.difficulty==='HARD'?'🔥 HARD':'햇살 농장';
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
  $('sStage').textContent='🎪 SPECIAL STAGE';$('target').textContent='🎪 농장 대축제';
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
 effectAt('fx-halo',x,y,cellSize*1.75,light.light,540);
 effectAt('fx-corolla',x,y,cellSize*2.6,light.light,850);
 effectAt('fx-orbit',x,y,cellSize*1.8,light.light,900);
 if(combo>=5||festival||perfect)effectAt('fx-corolla outer',x,y,cellSize*3.5,light.light,1050);
 if(combo>=5||perfect||festival)effectAt('fx-halo second',x,y,cellSize*2.05,light.light,740);
 effectAt('fx-bloom-flash',x,y,cellSize*(combo>=5?3:2.2),light.light,700);
 const satellites=combo>=8?8:combo>=5||festival?6:4;
 for(let i=0;i<satellites;i++){
  const angle=i/satellites*Math.PI*2-.9,dist=cellSize*(combo>=8?2.1:1.45);
  const flower=effectAt('fx-bloom-satellite',x,y,cellSize*(combo>=5?.58:.43),light.light,1150,'img');
  flower.src=asset(festival?['festival-pinwheel','festival-balloon','festival-gift'][i%3]:'flower-'+name);flower.alt='';
  flower.style.setProperty('--life','1100ms');flower.style.setProperty('--dx',Math.cos(angle)*dist+'px');flower.style.setProperty('--dy',(Math.sin(angle)*dist-24)+'px');
  flower.style.setProperty('--start-rot',(i*45)+'deg');flower.style.setProperty('--rot',(i*45+150)+'deg');
 }
 if(combo>=3||festival||perfect){
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
 if(combo>=5&&!reducedMotion){
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
 collectGardenFlower(name);
 if(combo>=2){time=Math.min(T.t+COMBO_TIME_CAP,time+COMBO_TIME_BONUS);comboEffect(board[b].el);}
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
 if(gardenOpen)closeGarden();
 resetButterfly();
 goals={purple:0,orange:0,green:0};score=combo=maxCombo=total=0;
 lastFlower=null;bloomTriggered=false;endBloom();clearing=false;devPaused=false;menuPaused=false;time=T.t;
 $('harvest').replaceChildren();$('devPause').textContent='타이머 정지';
 $('menu').classList.add('hide');$('end').classList.add('hide');
}
function begin() {
 cancelBoardWork();T=ST[si];resetState();build();ui();fitBoard();
 $('start').classList.add('hide');run=true;beatAt=Date.now();
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
 rewardGardenClear();
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
 run=false;stopClocks();endBloom();cancelPointer();
 resetButterfly();
 $('endTitle').textContent=resultTitle();
 $('result').innerHTML='최종 점수 <b>'+score.toLocaleString('ko-KR')+'</b><br>'+goalText()+
  '<br>농장 보관함에 수확물 '+total+'개를 모았어요<br>전체 수확 '+total+'개'+(T.comboGoal?'':' · MAX COMBO '+maxCombo)+
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
$('devInfo').insertAdjacentHTML('beforebegin','<div class="devRow"><button class="devBtn" id="devButterfly">🦋 나비 생성</button><button class="devBtn" id="devFestival">🌸 농장 대축제</button></div>');
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
setupGarden();prepareStage(garden.nextStage);requestAnimationFrame(fitBoard);
// Decode essential art before enabling play. No remote CDN/font dependencies.
const required=['garden','festival','mascots','bud-red','bud-blue','bud-yellow','flower-purple','flower-orange','flower-green'];
$('startBtn').disabled=true;$('startBtn').textContent='농장 친구들을 불러오고 있어요…';
Promise.allSettled(required.map(name=>new Promise((resolve,reject)=>{
 const img=new Image();img.onload=()=>resolve(name);img.onerror=()=>reject(name);img.src=asset(name);
}))).then(results=>{
 $('startBtn').disabled=false;$('startBtn').innerHTML='시작하기 <span>→</span>';
 const missing=results.filter(r=>r.status==='rejected').map(r=>r.reason);
 if(missing.length){$('assetWarning').classList.remove('hide');console.warn('Missing Farm Friends assets:',missing);}
 document.documentElement.dataset.assetsReady=missing.length?'partial':'true';
 document.documentElement.dataset.farmVersion='farm-friends-1';
});
