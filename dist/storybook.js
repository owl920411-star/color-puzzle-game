(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CrayonStorybook=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const STORAGE_KEY='glassfall-v1';
const STORE_KEY='storybookV1';
const PAGE={
  id:'spring-garden',
  title:'봄날의 꽃밭',
  total:8,
  stages:[
    {key:'seed',title:'첫 씨앗 심기',reward:'씨앗',metric:'pieces',target:12,unit:'개',goal:'블록 12개 놓기'},
    {key:'sprout',title:'새싹 키우기',reward:'새싹',metric:'lines',target:4,unit:'줄',goal:'줄 4개 지우기'},
    {key:'bud',title:'꽃봉오리 만들기',reward:'꽃봉오리',metric:'score',target:1500,unit:'점',goal:'1,500점 모으기'},
    {key:'flower-white',title:'첫 꽃 피우기',reward:'하얀 꽃',metric:'lines',target:6,unit:'줄',goal:'줄 6개 지우기'},
    {key:'flower-pink',title:'꽃밭 반짝이기',reward:'분홍 꽃',metric:'maxCombo',target:2,unit:'연속',goal:'2연속 줄 지우기'},
    {key:'flower-yellow',title:'꽃밭 채우기',reward:'노란 꽃',metric:'pieces',target:24,unit:'개',goal:'블록 24개 놓기'},
    {key:'chick',title:'병아리 불러오기',reward:'노란 병아리',metric:'lines',target:8,unit:'줄',goal:'줄 8개 지우기'},
    {key:'rainbow',title:'무지개 완성하기',reward:'무지개',metric:'score',target:4000,unit:'점',goal:'4,000점 모으기'}
  ]
};

function object(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function clampInt(v,min,max){return Math.max(min,Math.min(max,Math.floor(Number(v)||0)));}
function normalize(raw){const r=object(raw);return{page:PAGE.id,completed:clampInt(r.completed,0,PAGE.total)};}
function current(raw){const state=normalize(raw);return state.completed>=PAGE.total?null:PAGE.stages[state.completed];}
function valueFor(run,stage){if(!stage||!run)return 0;return Math.max(0,Math.floor(Number(run[stage.metric])||0));}
function evaluate(raw,run){
  const state=normalize(raw),stage=current(state);
  if(!stage)return{state,stage:null,value:0,target:0,success:false,pageComplete:true};
  const value=valueFor(run,stage);
  return{state,stage,value,target:stage.target,success:value>=stage.target,pageComplete:false};
}
function advance(raw,run){
  const before=normalize(raw),evaluation=evaluate(before,run);
  const after=evaluation.success?{page:PAGE.id,completed:Math.min(PAGE.total,before.completed+1)}:before;
  return{before,after,evaluation,changed:after.completed!==before.completed,pageComplete:after.completed>=PAGE.total};
}
function readRoot(){
  try{return object(JSON.parse(root.localStorage?.getItem(STORAGE_KEY)||'{}'));}catch{return{};}
}
function read(){return normalize(readRoot()[STORE_KEY]);}
function write(state){
  try{const all=readRoot();all[STORE_KEY]=normalize(state);root.localStorage?.setItem(STORAGE_KEY,JSON.stringify(all));return true;}catch{return false;}
}
function formatValue(stage,value){
  const n=Math.min(Math.max(0,Math.floor(Number(value)||0)),stage.target);
  if(stage.metric==='score')return `${n.toLocaleString()}/${stage.target.toLocaleString()}${stage.unit}`;
  return `${n}/${stage.target}${stage.unit}`;
}
function pieceHTML(index,unlocked,currentPiece=false){
  const stage=PAGE.stages[index];
  return `<span class="storybook-piece${unlocked?' is-unlocked':''}${currentPiece?' is-current':''}" data-piece="${index}" role="img" aria-label="${stage.reward}${unlocked?' 완성':' 아직 비어 있음'}"></span>`;
}
function sceneHTML(raw){
  const state=normalize(raw),n=state.completed;
  const elements=[];
  // The first four stages replace a single plant at the same ground anchor.
  if(n>0)elements.push(scenePiece(Math.min(n,4)-1,'growth'));
  if(n>=5)elements.push(scenePiece(4,'pink'));
  if(n>=6)elements.push(scenePiece(5,'yellow'));
  if(n>=7)elements.push(scenePiece(6,'chick'));
  if(n>=8)elements.push(scenePiece(7,'rainbow'));
  return `<div class="storybook-scene${n===8?' is-complete':''}" role="img" aria-label="${PAGE.title} · ${n===0?'아직 비어 있는 꽃밭':n<5?PAGE.stages[n-1].reward+'이 자라는 꽃밭':n===5?'하얀 꽃과 분홍 꽃':n===6?'세 송이 꽃이 핀 꽃밭':n===7?'병아리가 놀러온 꽃밭':'무지개 아래 병아리와 세 송이 꽃'}"><div class="storybook-ground" aria-hidden="true"></div>${elements.join('')}</div>`;
}
function scenePiece(index,place){
  return `<span class="storybook-scene-piece scene-${place}" data-piece="${index}" aria-hidden="true"></span>`;
}
function homeHTML(raw=read()){
  const state=normalize(raw),stage=current(state),done=state.completed>=PAGE.total;
  return `<section class="cb-storybook" aria-label="그림책 진행 상황"><div class="storybook-head"><div><span>그림책 1</span><strong>${PAGE.title}</strong></div><b>${state.completed}/${PAGE.total}</b></div>${sceneHTML(state)}<p>${done?'첫 페이지 완성!':`다음 그림 · ${stage.title} · ${stage.goal}`}</p></section>`;
}
function hud(run,raw=read()){
  const state=normalize(raw),stage=current(state);
  if(!stage)return'그림책 완성 · 자유롭게 놀아요';
  return `그림 목표 · ${stage.title} ${formatValue(stage,valueFor(run,stage))}`;
}
function goalHTML(raw=read()){
  const state=normalize(raw),stage=current(state);
  if(!stage)return `<span>봄날의 꽃밭</span><strong>첫 페이지 완성!</strong><small>이제 자유롭게 놀아도 좋아요</small>`;
  return `<span>이번 그림</span><strong>${stage.title}</strong><small>${stage.goal}</small>`;
}
function announce(raw=read()){
  if(typeof document==='undefined')return false;
  const host=document.getElementById('game-area');if(!host)return false;
  let el=document.getElementById('storybook-goal-toast');
  if(!el){el=document.createElement('div');el.id='storybook-goal-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');host.appendChild(el);}
  el.innerHTML=goalHTML(raw);el.classList.remove('show');
  if(el._hideTimer)clearTimeout(el._hideTimer);
  requestAnimationFrame(()=>el.classList.add('show'));
  el._hideTimer=setTimeout(()=>el.classList.remove('show'),1800);
  return true;
}
function resultCard(result,eligible=true){
  if(!eligible)return'';
  const ev=result.evaluation;
  if(!ev.stage)return `<section class="storybook-result is-complete"><div><span>그림책 1</span><strong>${PAGE.title} 완성</strong><small>첫 페이지는 이미 모두 채워졌어요.</small></div></section>`;
  const idx=result.before.completed;
  if(result.changed){
    return `<section class="storybook-result is-success"><span class="storybook-result-piece" data-piece="${idx}" role="img" aria-label="${ev.stage.reward} 완성"></span><div><span>${result.pageComplete?'첫 페이지 완성!':'그림이 자라고 있어요'}</span><strong>${['씨앗을 심었어요!','새싹이 자랐어요!','꽃봉오리가 생겼어요!','첫 꽃이 피었어요!','분홍 꽃이 피었어요!','꽃밭이 더 풍성해졌어요!','병아리가 놀러왔어요!','무지개가 나타났어요!'][idx]}</strong><small>${PAGE.title} ${result.after.completed}/${PAGE.total}${result.pageComplete?' · 완성':''}</small></div></section>`;
  }
  return `<section class="storybook-result"><span class="storybook-result-piece is-locked" data-piece="${idx}" aria-hidden="true"></span><div><span>이번에는 여기까지</span><strong>${ev.stage.title}</strong><small>${formatValue(ev.stage,ev.value)} · 다음 판에 다시 이어 그려요</small></div></section>`;
}
function finish(run,{eligible=true}={}){
  const before=read();
  if(!eligible){const result=advance(before,null);return{...result,html:''};}
  const result=advance(before,run);
  if(result.changed)write(result.after);
  return{...result,html:resultCard(result,true)};
}
return{PAGE,normalize,current,valueFor,evaluate,advance,read,write,formatValue,pieceHTML,sceneHTML,homeHTML,hud,goalHTML,announce,resultCard,finish};
});
