/* Event bridge for the existing ENDLESS controller, not a replacement engine. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./adaptive-director.js'));
 else root.AdaptiveBridge=factory(root.AdaptiveDirector);
})(typeof globalThis!=='undefined'?globalThis:this,function(D){
'use strict';
const KEY='glassfall-adaptive-v1', MODES=D.MODES, STYLES=D.STYLES;
function safeState(value){
 const s=value&&typeof value==='object'?value:{};
 return {version:D.VERSION,options:{...D.options(s.options),guest:false},profile:D.cleanProfile(s.profile),
  history:Array.isArray(s.history)?s.history.filter(x=>x&&x.version===D.VERSION).slice(-20):[]};
}
function create(port){
 let persisted;try{persisted=JSON.parse(port.storage.getItem(KEY)||'{}');}catch{persisted={};}
 let store=safeState(persisted),next={...store.options,guest:false},session=null,active=false,
  id='',pending=null,lastHard=false,returnView='menu',savedOK=true,profileReset=false;
 function get(){return port.get();}
 function board(){return D.metrics(get().run.board);}
 function save(){try{port.storage.setItem(KEY,JSON.stringify(store));savedOK=true;}catch{savedOK=false;}}
 function begin(){
  const g=get();if(g.kind!=='normal'){session=null;active=false;return;}
  session=new D.Director(next,next.guest?null:store.profile);active=true;pending=null;lastHard=false;
  id=g.seed+'-'+Date.now().toString(36)+'-'+(++create.counter);profileReset=false;
 }
 function end(outcome='gameover',checkpoint=false){
  if(!active||!session)return;const g=get();session.now=g.elapsed;
  if(g.practice)session.exclude('개발자 조작');const report=session.report(outcome);
  Object.assign(report,{id,score:g.run.score,desertLevel:g.desert.level,recordKey:recordKey()});
  if(report.placements>0&&!report.guest&&report.mode!=='off'&&!profileReset){
   store.history=store.history.filter(x=>x.id!==id).concat(report).slice(-D.LIMITS.maxHistory);
   // Checkpoints/abandoned games, practice, unreliable data and reset-in-this-run never train.
   if(!checkpoint&&!profileReset)store.profile=D.learn(store.profile,report);save();
  }
  if(!checkpoint)active=false;
 }
 function tick(raw){const g=get();if(!active||!session)return;session.now=g.elapsed;
  if(g.practice&&!session.practice)session.exclude('개발자 조작');
  session.tick(raw,g.kind==='normal'&&g.state==='playing'&&!!g.run.active);
 }
 function input(type,valid){if(!session||!active)return;session.input(valid,{hold:type==='hold'});if(type==='drop'&&valid)lastHard=true;}
 function beforeLock(){if(!session||!active)return;pending={before:board(),hardDrop:lastHard};lastHard=false;}
 function locked(){if(!pending)return;pending.lockedBoard=get().run.board.map(r=>r.slice());}
 function resolved(plan,tx){
  if(!session||!active||!pending?.lockedBoard)return;
  const g=get(),rows=tx?tx.scoringRows:(plan?.rows||[]),natural=D.metrics(D.compact(pending.lockedBoard,rows)),actual=board();
  const itemChanged=!!tx&&(tx.extraRemoved>0||(tx.events||[]).length>0);
  if(itemChanged)session.system('item',natural,actual,g.elapsed);
  session.record({now:g.elapsed,before:pending.before,natural,actual,lines:rows.length,
   hardDrop:pending.hardDrop,combo:g.run.combo,context:{level:g.desert.level,gravity:g.run.gravity,
    baseInterval:g.baseInterval,actualInterval:g.interval,curses:port.curses?port.curses():0}});
  pending=null;
 }
 function system(kind,before){if(!session||!active)return;const g=get();session.system(kind,before||board(),board(),g.elapsed);}
 function exclude(){if(session){session.exclude('개발자 조작');pending=null;}}
 function interval(base){if(!session||!active)return base;const g=get();return session.takeInterval(base,{now:g.elapsed,forceFixed:g.practice});}
 function recordKey(){return session?.config.mode==='adaptive'?'normal-adaptive-v1-'+session.config.style:'normal';}
 function desertKey(){return recordKey()==='normal'?'desertSurvival':'desertSurvival-'+recordKey();}
 function label(){return session?MODES[session.config.mode]+(session.config.guest?' · 임시':''):MODES[next.mode];}
 function info(){return session?.report('checkpoint')||null;}
 function button(){return get().kind==='normal'?'<button class="text-button" data-adaptive="open">개인 맞춤 난이도 · '+label()+'</button>':'';}
 function esc(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function fmt(v,n=1){return Number.isFinite(v)?v.toFixed(n):'—';}
 function panel(){
  const r=info(),dec=r?.decision,m=dec?.metrics,g=get(),running=active&&g.kind==='normal';
  const choice=(name,values,value)=>Object.entries(values).map(([k,v])=>`<button data-adaptive="${name}" data-v="${k}" aria-pressed="${value===k}">${value===k?'✓ ':''}${typeof v==='string'?v:v.label}</button>`).join('');
  const content=`<div class="kicker">ADAPTIVE DESERT DIRECTOR V1</div><h2>개인 맞춤 난이도</h2>
   <div class="rule-box"><b>현재: ${running?label():'다음 판 설정'}</b><br>${running?'현재 판 설정은 유지됩니다. 아래 선택은 새 판부터 적용됩니다.':'관찰 모드는 기존 난이도를 바꾸지 않고 판단만 보여줍니다.'}</div>
   <p>다음 판 모드</p><div class="settings-row">${choice('mode',MODES,next.mode)}</div>
   <p>자동 조절 범위</p><div class="settings-row">${choice('style',STYLES,next.style)}</div>
   <p><button data-adaptive="guest">${next.guest?'✓ ':''}다음 판 임시 플레이 ${next.guest?'ON':'OFF'}</button></p>
   <div class="rule-box"><b>${esc(dec?.reason||'새 판을 시작하면 관찰합니다.')}</b><br>
   관찰 신뢰도 ${fmt((dec?.confidence||0)*100,0)}% · 개인 등급/IQ가 아닙니다.<br>
   실제 적용 ×${fmt(r?.applied||1,2)} / 제안 ×${fmt(r?.pending?.factor??r?.proposed??1,2)}<br>
   유효 표본 ${m?.reliable||0} · 배치/분 ${fmt(m?.ppm)}<br>블록당 자연 제거 ${fmt(m?.lineRate,2)}줄 · 새 막힌 빈칸 ${fmt(m?.addedHoles,2)}<br>
   보드 높이 ${m?.height??'—'}/20 · 즉시하강 비율 ${fmt((m?.hardDropShare||0)*100,0)}%<br>
   아이템·유물 사건 ${(r?.events.item||0)+(r?.events.relic||0)} / 지반 ${r?.events.ground||0}<br>
   현재 예고 ${Number.isFinite(g.desert?.nextRise)?Math.max(0,Math.ceil((g.desert.nextRise+g.desert.delay-g.elapsed)/1000))+'초':'—'}는 변경하지 않습니다.</div>
   <p>빠름만으로 올리지 않습니다. 자동 조절도 지반 주기만 한 단계씩 바꿉니다. 낙하속도·NEXT·저주 타이머·터치 반응은 그대로입니다.</p>
   <div class="rule-box">저장된 판 ${store.history.length}/20 · 신뢰할 자료가 있는 판 ${store.profile.completed}<br>
   장기 프로필은 비슷한 난이도끼리 천천히 갱신합니다. V1은 모든 새 판을 ×1로 시작합니다.<br>
   ${r?.practice?'개발자 상태: 학습·정상 기록 제외<br>':''}${next.guest?'임시 플레이: 새 판의 기록·학습 저장 안 함<br>':''}
   ${savedOK?'이 브라우저에만 저장합니다. 서버 전송·나이 수집 없음.':'저장 실패: 메모리에서만 동작 중입니다.'}</div>
   <div class="settings-row"><button data-adaptive="export">진단 JSON 저장</button><button data-adaptive="reset-question">프로필 초기화</button></div>
   <button class="primary" data-adaptive="return">돌아가기</button>
   <p class="storage-note">7분 생존 보장이나 객관적 고수 판정 기능이 아닙니다. 자동 모드 최고점은 고정 규칙 기록과 분리됩니다.</p>`;
  port.show(content,'adaptive');
 }
 function open(){returnView=get().overlayView||'game';port.pauseForPanel();panel();}
 function back(){port.back(returnView);}
 function handle(event){const b=event.target.closest?.('[data-adaptive]');if(!b||b.disabled)return;
  const a=b.dataset.adaptive,k=b.dataset.v;
  if(a==='open'){open();return;}
  if(a==='return'){back();return;}
  if(a==='mode'&&Object.hasOwn(MODES,k)){next.mode=k;store.options={...next,guest:false};save();panel();}
  else if(a==='style'&&Object.hasOwn(STYLES,k)){next.style=k;store.options={...next,guest:false};save();panel();}
  else if(a==='guest'){next.guest=!next.guest;panel();}
  else if(a==='reset-question')port.show('<h2>개인 난이도 프로필을 지울까요?</h2><p>개인 관찰 이력과 학습 요약만 지웁니다. 기존 게임 최고점은 삭제하지 않습니다. 현재 판은 초기화 후 학습에 저장하지 않습니다.</p><button class="primary" data-adaptive="reset-confirm">프로필과 관찰 이력 지우기</button><button class="secondary" data-adaptive="cancel-reset">취소</button>','adaptive');
  else if(a==='reset-confirm'){store.profile=D.newProfile();store.history=[];profileReset=true;if(session)session.profile=D.newProfile();save();panel();}
  else if(a==='cancel-reset')panel();
  else if(a==='export')port.download('glassfall-adaptive-diagnostic.json',JSON.stringify({version:D.VERSION,
    note:'로컬 규칙 판정 진단. 사람 평균·실력 정답 데이터가 아님.',profile:store.profile,history:store.history,current:info()},null,2));
 }
 port.panel.addEventListener('click',handle);
 return {begin,end,tick,input,beforeLock,locked,resolved,system,exclude,interval,board,recordKey,desertKey,
  button,label,open,back,info,get guest(){return !!session?.config.guest;},
  get session(){return session;},get next(){return {...next};},get profile(){return D.cleanProfile(store.profile);}};
}
create.counter=0;
return {create,KEY,safeState};
});
