/* Event bridge for the existing ENDLESS controller, not a replacement engine. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./adaptive-director.js'),require('./adaptive-audit.js'));
 else root.AdaptiveBridge=factory(root.AdaptiveDirector,root.AdaptiveAudit);
})(typeof globalThis!=='undefined'?globalThis:this,function(D,A){
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
  id='',pending=null,lastHard=false,returnView='menu',savedOK=true,profileReset=false,
  lastReport=store.history.at(-1)||null,lastCheckpoint=null,terminalDetail=null;
 function get(){return port.get();}
 function board(){return D.metrics(get().run.board);}
 function save(){try{port.storage.setItem(KEY,JSON.stringify(store));savedOK=true;}catch{savedOK=false;}}
 function begin(){
  const g=get();if(g.kind!=='normal'){session=null;active=false;return;}
  session=new A.AuditDirector(next,next.guest?null:store.profile);active=true;pending=null;lastHard=false;
  terminalDetail=null;lastCheckpoint=null;id=g.seed+'-'+Date.now().toString(36)+'-'+(++create.counter);profileReset=false;
 }
 function end(outcome='gameover',checkpoint=false){
  if(!active||!session)return;const g=get();session.now=g.elapsed;
  if(g.practice)session.exclude('개발자 조작');
  if(outcome==='gameover')session.markTerminal(terminalDetail||{code:'unknown',description:'직접 종료 경로 정보 없음: 추측하지 않음'});
  const report=session.report(outcome);
  Object.assign(report,{id,score:g.run.score,desertLevel:g.desert.level,recordKey:recordKey(),
   endSchedule:{nextRiseAt:Number.isFinite(g.desert.nextRise)?g.desert.nextRise:null,delayMs:g.desert.delay||0},
   snapshot:'finished-session'});
  if(checkpoint)lastCheckpoint=report;else{lastReport=report;lastCheckpoint=null;}
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
 function info(){return session?(active?session.report('checkpoint'):lastReport):null;}
 function terminal(code='unknown',detail={}){
  if(!session||!active||session.config.mode==='off'||get().kind!=='normal')return;const g=get(),p=g.run.active;
  const allowed=['spawn_collision','hold_collision','ground_overflow','ground_active_blocked','unknown'];
  terminalDetail={code:allowed.includes(code)?code:'unknown',detectedAt:g.elapsed,
   board:board(),boardRows:g.run.board.map(row=>row.reduce((mask,c,x)=>mask|(c?1<<x:0),0)),
   active:p?{type:p.type,x:p.x,y:p.y,cells:(p.cells||[]).map(c=>({x:c.x,y:c.y}))}:null,
   groundAttempt:detail&&typeof detail==='object'?detail:null,
   note:'실제 종료 조건이며 근본 원인·실수·게임의 불공정성을 판정한 값이 아닙니다.'};
 }
 function button(){return get().kind==='normal'?'<button class="secondary" data-adaptive="open">개인 맞춤 난이도 · '+(active?label():'설정 / 지난 판 결과')+'　›</button>':'';}
 function esc(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function fmt(v,n=1){return Number.isFinite(v)?v.toFixed(n):'—';}
 function seconds(v){return Number.isFinite(v)?(v/1000).toFixed(2).replace(/\.?0+$/,'')+'초':'—';}
 function time(v){if(!Number.isFinite(v))return '—';const n=Math.floor(v/1000);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
 function terminalText(code){return ({spawn_collision:'새 블록 생성 위치 충돌',hold_collision:'보관 교체·생성 위치 충돌',ground_overflow:'지반 상승 시 상단 넘침',ground_active_blocked:'지반 상승 후 조작 블록 배치 불가',unknown:'종료 경로 정보 없음'})[code]||'이전 기록: 종료 경로 미수집';}
 function outcomeText(outcome){return ({gameover:'게임오버',restart:'재시작으로 중단',menu:'메뉴 이동으로 중단',interrupted:'접속 중단 체크포인트'})[outcome]||'종료 기록';}
 function resultHTML(r,running,g){
  if(!r)return '<div class="rule-box">아직 분석할 지난 판이 없습니다. 새 판을 시작하면 관찰합니다.</div>';
  const dec=r.decision,m=dec?.metrics,diag=r.diagnostics,last=r.intervalHistory?.at(-1);
  const pending=r.pending,details=diag?.sampleWindow;
  const metricCount=m?.reliable||0,shown=metricCount>0;
  const pace=last?`마지막 예약: 기본 ${seconds(last.base)} → 실제 ${seconds(last.actual)}<br>그 주기의 보정 ×${fmt(last.factor,2)}`:'아직 지반 주기가 예약되지 않았습니다.';
  const countdown=running&&Number.isFinite(g.desert?.nextRise)?`현재 예고: ${Math.max(0,Math.ceil((g.desert.nextRise+g.desert.delay-g.elapsed)/1000))}초 · 이미 예고한 시각은 바꾸지 않습니다.`:'';
  const proposal=pending?`다음 주기 후보 ×${fmt(pending.factor,2)} · ${time(pending.at)}에 제안 · 아직 적용 전`:'대기 중인 변경 제안 없음';
  const gates=(diag?.waits||[]).map(x=>esc(x.label)+(Number.isFinite(x.remainingMs)?' ('+seconds(x.remainingMs)+' 남음)':Number.isFinite(x.remaining)?' ('+x.remaining+'개 남음)':'')).join('<br>');
  const heading=diag&&['risk','bounded'].includes(dec?.code)?(dec.code==='risk'?'현재 부담 높음 · 추가 가속 중지':'성과 안정적 · 조절 범위와 대기 조건 확인'):dec?.reason||'자료 수집 중';
  const latestChange=r.changes?.at(-1);
  const changeLabel=latestChange?.actualChanged===false?'검토 확정(실제 변경 없음)':latestChange?.actualChanged===true?'실제 적용':'이전 변경 기록';
  const causal=latestChange?`제안 ${time(latestChange.proposedAt)} → ${changeLabel} ${time(latestChange.appliedAt??latestChange.at)}<br>제안 이유: ${esc(latestChange.reason||'이전 기록: 미수집')}<br>${latestChange.decisionReasonAtApply?'적용 당시 상태: '+esc(latestChange.decisionReasonAtApply):''}`:'아직 조절 변경 이력이 없습니다.';
  const excluded=details?Object.entries(details.primary).map(([k,n])=>`${esc(A.LABELS[k]||k)}: ${n}개`).join('<br>'):'이전 기록에는 상세 제외 사유가 없습니다. 소급해서 추정하지 않습니다.';
  return `<section data-section="${running?'current-result':'last-result'}"><h3>${running?'현재 판 진단':'지난 판 결과'}</h3>
   <div class="rule-box">${running?'현재: '+esc(MODES[r.mode]||r.mode):esc(outcomeText(r.outcome))+' · 생존 '+time(r.seconds*1000)}<br>
   이 판 설정: ${esc(MODES[r.mode]||r.mode)} · ${esc(STYLES[r.style]?.label||r.style)}<br>
   <b>${esc(heading)}</b><br>${gates||''}<br>${pace}<br>${proposal}${countdown?'<br>'+countdown:''}
   ${!running?'<br>종료 조건: '+esc(terminalText(diag?.terminal?.code)):''}</div>
   <details style="margin:12px 0"><summary>판정 자료와 제외 사유 보기</summary><div class="rule-box">
   판정 자료 충족도 ${fmt((dec?.confidence||0)*100,0)}% · 판정 정확도나 IQ가 아닙니다.<br>
   표본 ${m?.placements||0}개 / 사용 ${metricCount}개 / 제외 ${details?.excluded??'—'}개<br>
   배치/분 ${shown?fmt(m.ppm):'—'} · 자연 제거 ${shown?fmt(m.lineRate,2):'—'}줄/블록<br>
   새 막힌 빈칸 ${shown?fmt(m.addedHoles,2):'—'}개/블록 · 보드 ${m?.height??'—'}/20<br>
   ${excluded||'제외 표본 없음'}<br>제외 수는 대표 사유로 한 번씩 집계합니다.</div></details>
   <details><summary>위험·제안·적용 이력 보기</summary><div class="rule-box">첫 위험 감지 ${time(diag?.firstRiskAt)}<br>${causal}<br>
   ${diag?'최근 진단 사건 '+diag.timeline.length+'개 · 상한으로 생략 '+diag.droppedTimelineEvents+'개':'이전 기록: 상세 이력 미수집'}</div></details></section>`;
 }
 function panel(){
  const g=get(),running=active&&g.kind==='normal';
  const r=running?info():lastReport;
  const choice=(name,values,value)=>Object.entries(values).map(([k,v])=>`<button data-adaptive="${name}" data-v="${k}" aria-pressed="${value===k}">${value===k?'✓ ':''}${typeof v==='string'?v:v.label}</button>`).join('');
  const content=`<div class="kicker">ADAPTIVE DESERT DIRECTOR V1 · STABLE</div><h2>개인 맞춤 난이도</h2>
   ${resultHTML(r,running,g)}
   <section data-section="next-settings"><h3>다음 판 설정</h3>
   <p>${running?'현재 판은 바뀌지 않습니다. 다음 새 판부터 적용됩니다.':'위의 지난 판 결과와 별개의 설정입니다.'}</p>
   <div class="settings-row">${choice('mode',MODES,next.mode)}</div>
   <p>자동 조절 범위</p><div class="settings-row">${choice('style',STYLES,next.style)}</div>
   <p><button data-adaptive="guest">${next.guest?'✓ ':''}다음 판 임시 플레이 ${next.guest?'ON':'OFF'}</button></p></section>
   <p>관찰만은 실제 난이도를 바꾸지 않습니다. 자동 조절도 지반 주기만 바꿉니다. 낙하·NEXT·저주 타이머·터치 반응은 그대로입니다.</p>
   <div class="rule-box">저장된 판 ${store.history.length}/20 · 프로필 반영 판 ${store.profile.completed}<br>
   ${r?.practice?'개발자 상태: 학습·정상 기록 제외<br>':''}${next.guest?'임시 플레이: 새 판의 기록·학습 저장 안 함<br>':''}
   ${savedOK?'이 브라우저에만 저장합니다. 서버 전송·나이 수집 없음.':'저장 실패: 메모리에서만 동작 중입니다.'}</div>
   <div class="settings-row"><button data-adaptive="export">진단 JSON 저장</button><button data-adaptive="reset-question">프로필 초기화</button></div>
   <button class="primary" data-adaptive="return">돌아가기</button>
   <p class="storage-note">7분 생존이나 재미 향상을 보장하지 않습니다. 자동 모드 최고점은 고정 규칙 기록과 분리됩니다.</p>`;
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
  else if(a==='reset-confirm'){store.profile=D.newProfile();store.history=[];lastReport=null;lastCheckpoint=null;profileReset=true;if(session)session.profile=D.newProfile();save();panel();}
  else if(a==='cancel-reset')panel();
  else if(a==='export')port.download('glassfall-adaptive-diagnostic.json',JSON.stringify({version:D.VERSION,
    diagnosticVersion:A.VERSION,note:'로컬 규칙 판정 진단. 사람 평균·실력 정답 데이터가 아님.',
    profile:store.profile,history:store.history,current:active?info():null,lastResult:lastReport,
    lastCheckpoint,nextSettings:{...next},
    deduplication:'history와 lastResult는 같은 id면 한 판입니다. 종료 후 current는 null입니다.'},null,2));
 }
 port.panel.addEventListener('click',handle);
 return {begin,end,tick,input,beforeLock,locked,resolved,system,exclude,interval,board,recordKey,desertKey,
  button,label,open,back,info,terminal,get guest(){return !!session?.config.guest;},
  get session(){return session;},get next(){return {...next};},get profile(){return D.cleanProfile(store.profile);}};
}
create.counter=0;
return {create,KEY,safeState};
});
