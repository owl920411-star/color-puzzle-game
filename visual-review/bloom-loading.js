/* RC loading owns presentation and one cancellable wait; never gameplay or input. */
(function(root){
'use strict';
const TIPS=Object.freeze([
 '짧게 톡! 블록이 한 칸 움직여요.',
 '길게 누르면 블록이 휘리릭 움직여요.',
 '좌우로 슥! 밀면 블록이 돌아가요.',
 '위로 슥! 밀면 블록을 보관할 수 있어요.',
 '아래로 슥! 밀면 바로 내려가요.',
 '다음 블록을 미리 확인해 보세요.',
 '방해 낙서를 정리하면 도움 도구가 찾아와요.',
 '높이 쌓이기 전에 빈 공간을 정리해 보세요.',
 '연속으로 줄을 지우면 콤보!'
]);
const MIN_MS=180,MAX_MS=1200;
function create({show,prepare=()=>Promise.resolve(true),reduced=()=>false}){
 let current=null,serial=0,last=null,completed=0,cancelled=0;
 const now=()=>root.performance.now();
 function html(tip,ready){return `<section class="cb-loading" data-motion="${reduced()?'reduced':'full'}" aria-label="색칠 준비">
  <p class="cb-load-brand">CRAYON BLOOM</p>
  <img class="cb-load-logo" src="assets/bloom-home-logo.webp?v=cb-rc2" width="900" height="320" alt="크레용블룸">
  <img class="cb-load-friends" src="assets/bloom-home-hero.webp?v=cb-rc2" width="1000" height="750" alt="분홍 후드티의 아기와 노란 병아리가 함께 기다려요">
  <div class="cb-load-stroke" aria-hidden="true"></div>
  <p class="cb-load-status" role="status" aria-live="polite">${ready?'준비됐어요!':'색칠 준비 중…'}</p>
  <p class="cb-load-tip"><span>작은 놀이 팁</span>${tip}</p>
 </section>`;}
 function clearTimer(s){if(s.timer!==null){root.clearTimeout(s.timer);s.timer=null;}}
 function finish(s,ready,wasCancelled=false){
  if(current!==s)return;
  clearTimer(s);current=null;
  last={elapsed:Math.max(0,now()-s.started),ready:!!ready,cancelled:wasCancelled};
  if(wasCancelled)cancelled++;else completed++;
  s.resolve({...last});
 }
 function cancel(){if(current)finish(current,false,true);}
 function run(){
  cancel();
  return new Promise(resolve=>{
   const s={id:++serial,started:now(),timer:null,resolve,tip:TIPS[Math.floor(Math.random()*TIPS.length)]};current=s;
   try{show(html(s.tip,false));}catch{finish(s,false);return;}
   // At most one live timeout. A resolved preparation replaces the deadline with
   // only the remaining short warm transition; a rejection still fails open.
   s.timer=root.setTimeout(()=>finish(s,false),MAX_MS);
   Promise.resolve().then(()=>prepare()).then(value=>settled(value!==false),()=>settled(false));
   function settled(ready){
    if(current!==s)return;
    clearTimer(s);
    const remaining=Math.max(0,MIN_MS-(now()-s.started));
    if(ready&&remaining>0){try{show(html(s.tip,true));}catch{ready=false;}}
    if(remaining>0)s.timer=root.setTimeout(()=>finish(s,ready),remaining);
    else finish(s,ready);
   }
  });
 }
 return Object.freeze({run,cancel,stats:()=>({active:!!current,timers:current?.timer!==null&&!!current?1:0,completed,cancelled,last:last?{...last}:null})});
}
root.BloomLoading=Object.freeze({TIPS,MIN_MS,MAX_MS,create});
})(window);
