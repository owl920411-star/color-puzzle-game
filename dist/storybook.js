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


const THEMES=[
 ['toy-cars','장난감 자동차 놀이','cars',['뒷바퀴','앞바퀴','자동차','차고','장난감 블록','표지판','작은 풀','놀이 길']],
 ['baby-bath','아기 목욕 시간','bath',['목욕 오리','비눗방울','샴푸','수건','목욕 스펀지','목욕물','아기 욕조','욕조 다리']],
 ['bear-toys','블록과 곰 인형','toys',['곰 얼굴','곰 몸통','곰 발','분홍 블록','파란 블록','쌓기 놀이','초록 블록','장난감 집']],
 ['baby-mobile','아기방 모빌','mobile',['달','구름','별','모빌 고리','아기 이불','침대 왼쪽','침대 오른쪽','아기 침대']]
];
const PAGES=[PAGE,...THEMES.map(([id,title,art,rewards])=>({id,title,art,total:8,stages:PAGE.stages.map((goal,i)=>({...goal,key:id+'-'+i,title:rewards[i]+' 색칠하기',reward:rewards[i]}))}))];
const SEQUENCE_KEY='storybookV2';
function pageFor(raw){return PAGES.find(p=>p.id===raw?.page)||PAGE;}
function pageIndex(raw){return PAGES.indexOf(pageFor(raw));}
function progressFor(all){
 const legacy=clampInt(object(all[STORE_KEY]).completed,0,8),saved=object(all[SEQUENCE_KEY]);
 const pages=Array.from({length:5},(_,i)=>clampInt(Array.isArray(saved.pages)?saved.pages[i]:0,0,8));
 pages[0]=Math.max(pages[0],legacy);
 // Later pages cannot be colored before all earlier pages are complete.
 let blocked=false;return pages.map(n=>{if(blocked)return 0;if(n<8)blocked=true;return n;});
}
function activeState(pages){let i=pages.findIndex(n=>n<8);if(i<0)i=4;return{page:PAGES[i].id,completed:pages[i]};}

function object(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function clampInt(v,min,max){return Math.max(min,Math.min(max,Math.floor(Number(v)||0)));}
function normalize(raw){const r=object(raw);return{page:pageFor(r).id,completed:clampInt(r.completed,0,8)};}
function current(raw){const state=normalize(raw);return state.completed>=8?null:pageFor(state).stages[state.completed];}
function valueFor(run,stage){if(!stage||!run)return 0;return Math.max(0,Math.floor(Number(run[stage.metric])||0));}
function evaluate(raw,run){
  const state=normalize(raw),stage=current(state);
  if(!stage)return{state,stage:null,value:0,target:0,success:false,pageComplete:true};
  const value=valueFor(run,stage);
  return{state,stage,value,target:stage.target,success:value>=stage.target,pageComplete:false};
}
function advance(raw,run){
  const before=normalize(raw),evaluation=evaluate(before,run);
  const after=evaluation.success?{page:before.page,completed:Math.min(8,before.completed+1)}:before;
  return{before,after,evaluation,changed:after.completed!==before.completed,pageComplete:after.completed>=PAGE.total};
}
function readRoot(){
  try{return object(JSON.parse(root.localStorage?.getItem(STORAGE_KEY)||'{}'));}catch{return{};}
}
function read(){return activeState(progressFor(readRoot()));}
function write(state){
  try{const all=readRoot(),next=normalize(state),i=pageIndex(next),pages=progressFor(all);for(let j=0;j<i;j++)pages[j]=8;pages[i]=next.completed;for(let j=i+1;j<5;j++)pages[j]=0;all[STORE_KEY]={page:PAGE.id,completed:pages[0]};all[SEQUENCE_KEY]={version:2,pages};root.localStorage?.setItem(STORAGE_KEY,JSON.stringify(all));return true;}catch{return false;}
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
// Presentation-only memory: existing progress does not replay its reveal on reload.
let lastHomeCompleted=null;
function sceneHTML(raw,{reveal=false}={}){
  const state=normalize(raw),n=state.completed;
  if(pageIndex(state)>0)return coloringScene(state,reveal);
  const elements=[];
  const outlines=[[3,'growth',4],[4,'pink',5],[5,'yellow',6],[6,'chick',7]].filter(([, ,stage])=>n<stage).map(([i,place])=>`<span class="storybook-outline scene-${place}" style="background-image:url(assets/storybook-outline-${i}.svg)" aria-hidden="true"></span>`).join('');
  // The first four stages replace a single plant at the same ground anchor.
  if(n>1)elements.push(scenePiece(Math.min(n,4)-1,'growth',reveal&&n<=4));
  if(n>=5)elements.push(scenePiece(4,'pink',reveal&&n===5));
  if(n>=6)elements.push(scenePiece(5,'yellow',reveal&&n===6));
  if(n>=7)elements.push(scenePiece(6,'chick',reveal&&n===7));
  if(n>=8)elements.push(scenePiece(7,'rainbow',reveal&&n===8));
  return `<div class="storybook-scene${n===8?' is-complete':''}" role="img" aria-label="${PAGE.title} · ${n<=1?'꽃 세 송이와 병아리 밑그림이 있는 꽃밭':n<5?PAGE.stages[n-1].reward+'이 자라는 꽃밭':n===5?'하얀 꽃과 분홍 꽃':n===6?'세 송이 꽃이 핀 꽃밭':n===7?'병아리가 놀러온 꽃밭':'무지개 아래 병아리와 세 송이 꽃'}"><div class="storybook-ground" aria-hidden="true"></div>${outlines}${elements.join('')}</div>`;
}
function scenePiece(index,place,reveal=false){
  return `<span class="storybook-scene-piece scene-${place}${reveal?' is-new':''}" data-piece="${index}" aria-hidden="true"></span>`;
}
// Native SVG regions keep each colored part aligned with its uncolored drawing.
const REGIONS={
 cars:[
  'M183 337 A41 41 0 1 0 265 337 A41 41 0 1 0 183 337Z',
  'M307 360 A43 43 0 1 0 393 360 A43 43 0 1 0 307 360Z',
  'M177 327 Q180 290 218 263 Q235 200 296 188 Q354 178 389 207 L421 259 Q465 257 490 285 L508 343 L494 373 L425 381 L392 379 L305 355 L268 351 L180 344Z M183 337 A41 41 0 1 0 265 337 A41 41 0 1 0 183 337Z M307 360 A43 43 0 1 0 393 360 A43 43 0 1 0 307 360Z',
  'M375 40H634V280H555L539 260H421L390 207L375 175Z',
  'M634 155H760V318H595V240H634Z',
  'M88 153 A57 57 0 1 0 202 153 A57 57 0 1 0 88 153Z M135 204H155V278H135Z M104 277H206V316H104Z',
  'M20 231H104V316H20Z M155 231H209V277H155Z M625 296H755V375H625Z'
 ],
 bath:[
  'M233 205 Q228 184 245 190 L267 199 Q254 170 270 143 L294 122L308 111L328 107L341 112 Q376 123 384 154 Q397 180 381 194 Q403 218 379 242 Q344 257 288 248 Q252 245 233 205Z',
  'M165 99 A27 27 0 1 0 219 99 A27 27 0 1 0 165 99Z M216 133 A20 20 0 1 0 256 133 A20 20 0 1 0 216 133Z M370 80 A48 48 0 1 0 466 80 A48 48 0 1 0 370 80Z M452 128 A27 27 0 1 0 506 128 A27 27 0 1 0 452 128Z M400 157 A11 11 0 1 0 422 157 A11 11 0 1 0 400 157Z',
  'M565 129L571 111L615 111L616 99L684 100L719 110L723 135L688 143L688 169 Q724 186 729 238 L733 352L702 363L595 335L566 315L574 219L582 176L625 157L624 139Z',
  'M400 398 Q399 361 438 337 Q478 312 540 319 L706 347 Q751 360 748 393 Q768 420 745 445 L696 468 Q653 476 602 463 L433 438 Q393 425 400 398Z',
  'M14 327 Q13 309 44 301 L80 299 Q110 282 150 291 Q170 290 184 307 Q223 297 232 327 Q239 341 228 351 Q263 357 270 395 Q264 424 240 434 Q241 451 215 462 L162 471L109 461L68 437L42 410L48 386L32 370L27 356Z',
  'M105 183 Q175 149 265 181 L389 174 Q492 150 556 196 Q517 250 387 260 Q213 256 105 210Z',
  'M60 140H602V410H270V290H60Z'
 ],
 toys:[
  'M175 145 Q174 90 218 83 Q244 78 279 105 Q341 55 391 65 Q388 23 437 29 Q504 26 497 88 Q492 110 464 135 Q500 188 476 227 Q463 253 424 267 Q342 289 293 267 Q258 252 240 214 Q183 211 175 145Z',
  'M297 262 Q350 278 423 252 L483 229 Q520 192 551 195 Q570 212 544 236 L475 301 L472 354 Q430 335 408 371 L384 407L363 429L284 368 Q232 367 235 324 Q247 284 297 262Z',
  'M256 415 A65 65 0 1 0 386 415 A65 65 0 1 0 256 415Z M405 376 Q423 345 450 350 Q481 355 499 392 L490 393L434 401L435 459 Q409 450 405 426Z',
  'M434 401L490 393L555 410L553 470L499 488L435 468Z',
  'M585 408L646 390L690 405L689 469L646 487L585 468Z',
  'M0 180H290V512H0Z',
  'M486 329L587 317L656 338L655 392L583 411L579 447L552 436L557 410L496 393L486 394Z'
 ],
 mobile:[
  'M321 155 Q276 156 257 185 Q236 224 265 248 Q292 266 321 250 Q342 242 343 219 Q315 232 306 219 Q297 190 321 155Z',
  'M326 200H453V291H326Z',
  'M445 182H550V278H445Z',
  'M230 0H560V145H230Z M375 145H405V200H375Z M472 145H504V182H472Z',
  'M402 354 Q418 325 470 323 L542 328L573 379L614 450 Q614 463 586 470 L506 494 Q491 495 482 470 L446 378 Q426 356 402 354Z',
  'M151 311 Q160 253 198 243 Q246 228 269 291 L268 340L242 340L239 306 Q221 277 204 298 L204 478L219 492L219 505L174 501 Q149 495 151 471Z',
  'M548 291 Q553 251 589 247 Q629 249 638 293 L642 489L623 504L596 504L596 471L613 454L601 389L572 332L548 325Z'
 ]
};
const DETAIL_BOXES={
 cars:[[165,278,120,120],[290,300,120,120],[160,175,365,240],[355,25,300,280],[575,130,190,210],[75,90,145,245],[610,285,155,110],[25,270,655,225]],
 bath:[[260,70,200,195],[125,0,415,110],[535,45,230,310],[390,270,375,240],[5,265,245,240],[120,155,410,130],[135,220,405,250],[180,395,345,115]],
 toys:[[155,0,355,290],[280,180,275,190],[260,300,255,210],[485,330,130,180],[585,355,180,155],[0,120,305,390],[510,225,250,160],[510,130,240,180]],
 mobile:[[245,115,125,185],[335,145,130,155],[430,115,145,185],[225,0,350,155],[425,275,230,235],[130,230,150,280],[595,230,130,280],[230,260,430,250]]
};
let sceneSerial=0;
function coloringScene(raw,reveal=false,detail=null){
 const state=normalize(raw),book=pageFor(state),n=state.completed,id='sb'+(++sceneSerial),paths=REGIONS[book.art];
 const box=detail===null?'0 0 768 512':DETAIL_BOXES[book.art][detail].join(' ');
 const whole='M0 0H768V512H0Z',regions=[...paths,whole+' '+paths.join(' ')];
 const image=`<image href="assets/storybook-${book.art}.webp" width="768" height="512"/>`;
 const defs=regions.map((d,i)=>`<clipPath id="${id}p${i}"><path d="${d}" clip-rule="evenodd"/></clipPath>`).join('');
 const color=Array.from({length:n},(_,i)=>detail!==null&&i!==detail?'':`<g clip-path="url(#${id}p${i})" class="storybook-color-part${reveal&&i===n-1?' is-new':''}" data-color-piece="${i}">${image}</g>`).join('');
 return `<div class="storybook-scene storybook-coloring${n===8?' is-complete':''}" role="img" aria-label="${book.title} · ${n}/8 색칠"><svg viewBox="${box}" aria-hidden="true"><defs>${defs}<filter id="${id}line" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="smooth"/><feColorMatrix in="smooth" type="saturate" values="0"/><feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" divisor="1" bias="0" preserveAlpha="true"/><feColorMatrix values="0 0 0 0 .6 0 0 0 0 .5 0 0 0 0 .4 1.6 0 0 0 0" result="inner"/><feComposite in="inner" in2="SourceAlpha" operator="in" result="inside"/><feMorphology in="SourceAlpha" operator="erode" radius="1.2" result="eroded"/><feComposite in="SourceAlpha" in2="eroded" operator="out" result="edge"/><feFlood flood-color="#99836e" flood-opacity=".55"/><feComposite in2="edge" operator="in"/><feMerge><feMergeNode/><feMergeNode in="inside"/></feMerge></filter></defs><g filter="url(#${id}line)" opacity=".65">${image}</g>${color}</svg></div>`;
}

function homeHTML(raw=read()){
  const state=normalize(raw),stage=current(state),book=pageFor(state),index=pageIndex(state),done=state.completed>=8;
  const count=index*8+state.completed;const reveal=lastHomeCompleted!==null&&count>lastHomeCompleted;
  lastHomeCompleted=count;
  return `<section class="cb-storybook" role="button" tabindex="0" aria-haspopup="dialog" aria-label="그림책 진행 상황"><div class="storybook-binding" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="storybook-head"><div><span>그림책 ${index+1}/5 · 보기</span><strong>${book.title}</strong></div><b>${state.completed}/${PAGE.total}</b></div>${sceneHTML(state,{reveal})}<p${done?` class="storybook-completion${reveal?' is-new':''}"`: ''}>${done?(index===4?'다섯 장 완성!':'페이지 완성!'):`다음 그림 · ${stage.title} · ${stage.goal}`}</p></section>`;
}
function openBook(){
 if(!root.document)return;
 const previous=root.document.querySelector('.storybook-reader');if(previous)return;
 const trigger=root.document.querySelector('.cb-storybook');
 const dialog=root.document.createElement('dialog');dialog.className='storybook-reader';dialog.setAttribute('aria-label','내 그림책');
 const all=readRoot(),pages=progressFor(all),state=activeState(pages),active=pageIndex(state);let page=active;
 function render(){
  const book=PAGES[page],completed=pages[page],locked=page>active,shown={page:book.id,completed},stage=current(shown);
  dialog.innerHTML=`<div class="reader-top"><strong>내 그림책 · ${page+1}/5</strong><button type="button" data-book-close aria-label="그림책 닫기">닫기</button></div><h2>${book.title}</h2><div class="reader-art">${sceneHTML(shown)}</div><p class="reader-status">${locked?'아직 기다리는 그림':`현재 진행 · ${completed}/8${completed===8?' · 페이지 완성!':''}`}</p><p class="reader-goal">${locked?'앞의 그림을 완성하면 이어서 색칠해요.':completed===8?(page===4?'다섯 장을 모두 색칠했어요!':'이 페이지를 모두 색칠했어요!'):stage?`이번 판 목표 · ${stage.goal}<br>다음 변화 · ${stage.reward}`:''}</p><nav aria-label="그림책 페이지"><button type="button" data-book-prev ${page===0?'disabled':''}>이전 그림</button><button type="button" data-book-next ${page===4?'disabled':''}>다음 그림</button></nav>`;

 }
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-book-close]'))dialog.close();else if(e.target.closest('[data-book-prev]')&&page>0){page--;render();dialog.querySelector('[data-book-prev]').focus();}else if(e.target.closest('[data-book-next]')&&page<4){page++;render();dialog.querySelector('[data-book-next]').focus();}});
 dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus();});
 render();root.document.body.appendChild(dialog);dialog.showModal();
}
if(root.document){
 root.document.addEventListener('keydown',e=>{const reader=root.document.querySelector('.storybook-reader[open]');if(reader&&e.key==='Escape'){e.preventDefault();e.stopPropagation();reader.close();}},true);
 root.document.addEventListener('click',e=>{if(e.target.closest?.('.cb-storybook'))openBook();});
 root.document.addEventListener('keydown',e=>{if(e.target.closest?.('.cb-storybook')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openBook();}});
}

function hud(run,raw=read()){
  const state=normalize(raw),stage=current(state);
  if(!stage)return'그림책 완성 · 자유롭게 놀아요';
  return `그림 목표 · ${stage.title} ${formatValue(stage,valueFor(run,stage))}`;
}
function goalHTML(raw=read()){
  const state=normalize(raw),stage=current(state);
  if(!stage)return `<span>내 그림책</span><strong>다섯 장 완성!</strong><small>이제 자유롭게 놀아도 좋아요</small>`;
  return `<span>${pageFor(state).title}</span><strong>${stage.title}</strong><small>${stage.goal}</small>`;
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
 const ev=result.evaluation,book=pageFor(result.before),page=pageIndex(result.before),idx=result.before.completed;
 if(!ev.stage)return `<section class="storybook-result is-complete"><div><span>다섯 장 완성!</span><strong>내 그림책 완성</strong><small>모든 그림을 색칠했어요.</small></div></section>`;
 const art=page===0&&idx===0?'':page===0?`<span class="storybook-result-piece${result.changed?'':' is-locked'}" data-piece="${idx}" role="img" aria-label="${ev.stage.reward}"></span>`:`<div class="storybook-result-detail">${coloringScene({page:book.id,completed:result.changed?idx+1:idx},false,idx)}</div>`;
 if(result.changed){
  const message=page===0?['그림을 시작했어요!','새싹이 자랐어요!','꽃봉오리가 생겼어요!','첫 꽃이 피었어요!','분홍 꽃이 피었어요!','꽃밭이 더 풍성해졌어요!','병아리가 놀러왔어요!','무지개가 나타났어요!'][idx]:ev.stage.reward+' 색칠했어요!';
  return `<section class="storybook-result is-success">${art}<div><span>${result.pageComplete?(page===0?'첫 페이지 완성!':page===4?'다섯 장 완성!':'페이지 완성!'):'그림이 자라고 있어요'}</span><strong>${message}</strong><small>${book.title} ${idx+1}/8${result.pageComplete?(page<4?' · 다음 그림이 열렸어요!':' · 모두 완성'):''}</small></div></section>`;
 }
 return `<section class="storybook-result">${art}<div><span>이번에는 여기까지</span><strong>${ev.stage.title}</strong><small>${formatValue(ev.stage,ev.value)} · 다음 판에 다시 이어 그려요</small></div></section>`;
}

function finish(run,{eligible=true}={}){
  const before=read();
  if(!eligible){const result=advance(before,null);return{...result,html:''};}
  const result=advance(before,run);
  if(result.changed)write(result.after);
  return{...result,html:resultCard(result,true)};
}
return{PAGE,PAGES,normalize,current,valueFor,evaluate,advance,read,write,formatValue,pieceHTML,sceneHTML,homeHTML,hud,goalHTML,announce,resultCard,finish};
});
