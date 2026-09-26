/* ADAPTIVE V1 STABLE: bounded, observational diagnostics around unchanged V1 rules.
 * Original decision thresholds, clocks, modes, profile schema and pacing are untouched.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./adaptive-director.js'));
 else root.AdaptiveAudit=factory(root.AdaptiveDirector);
})(typeof globalThis!=='undefined'?globalThis:this,function(D){
'use strict';
const VERSION='adaptive-audit-v1.1',MAX_LOG=240;
const COPY=v=>v==null?v:JSON.parse(JSON.stringify(v));
const LABELS=Object.freeze({
 no_input:'유효 입력 없음',too_short:'배치 조작시간 250ms 미만',too_long:'배치 조작시간 60초 초과',
 frame_in_placement:'배치 중 긴 프레임 발생',frame_recovery:'프레임 정체 후 보호 구간',
 item_relic_window:'아이템·유물 영향 구간',next_cycle:'다음 전체 지반 주기 예약 대기',
 cooldown:'직전 조절 후 30초 재관찰 대기',fresh_samples:'직전 조절 후 새 배치 6개 대기',
 risk_samples:'새 위험 배치 관찰 대기',episode_cap:'이번 회복 구간 완화 3단계 상한',
 style_bound:'선택한 성향의 조절 범위 상한',minimum_samples:'속도·안정성 판단 표본 부족',
 observation_time:'초기 60초 관찰 대기',sample_span:'유효 표본 사이 45초 관찰 대기',
 frame:'프레임 보호 구간',effect:'아이템·유물 영향 구간',recovery:'위기 회복 후 안정 구간',
 new_evidence:'새 배치 묶음 재관찰 대기',unstable:'판 안정성 부족',planning:'자연 줄 제거 근거 부족',
 candidate:'상승 후보 재확인 중',steady:'현재 속도 유지',observe_only:'관찰 모드: 실제 변경 없음',
 off:'조절 끄기',practice:'개발자 연습: 실제 조절·학습 제외'
});
function exclusion(s){
 const reasons=[];
 if(!(s.inputs>0))reasons.push('no_input');
 if(s.ms<250)reasons.push('too_short');
 if(s.ms>60000)reasons.push('too_long');
 if(s.auditBadMs>0)reasons.push('frame_in_placement');
 if(s.valid&&!s.reliable)reasons.push('frame_recovery');
 if(s.assisted)reasons.push('item_relic_window');
 return reasons;
}
function counts(samples){
 const primary={},overlap={};let eligible=0;
 for(const s of samples){if(s.reliable&&!s.assisted){eligible++;continue;}
  const reasons=exclusion(s);const key=reasons[0]||'unclassified';primary[key]=(primary[key]||0)+1;
  for(const k of reasons)overlap[k]=(overlap[k]||0)+1;
 }
 return {total:samples.length,eligible,excluded:samples.length-eligible,primary,overlap,
  note:'primary 합계는 제외 표본 수와 같습니다. overlap 사유는 중복될 수 있습니다.'};
}
function waits(d){
 const list=[],add=(code,extra={})=>list.push({code,label:LABELS[code]||code,...extra});
 const code=d.decision.code;
 if(d.config.mode==='off')add('off');
 if(d.practice){add('practice');return list;}
 if(d.pending)add('next_cycle',{proposalId:d.pending.auditId||null,direction:d.pending.direction});
 if(['risk','bounded'].includes(code)){
  if(d.episode>=D.LIMITS.episodeSteps&&code==='risk')add('episode_cap');
  if(d.now-d.lastChange<D.LIMITS.cooldownMs)add('cooldown',{remainingMs:Math.max(0,Math.ceil(D.LIMITS.cooldownMs-d.now+d.lastChange))});
  if(d.total-d.lastChangeSample<D.LIMITS.newSamples)add('fresh_samples',{remaining:D.LIMITS.newSamples-d.total+d.lastChangeSample});
  const bound=D.STYLES[d.config.style];
  if((code==='risk'&&d.proposed>=bound.max)||(code==='bounded'&&d.proposed<=bound.min))add('style_bound');
  if(!list.length)add(code==='risk'?'risk_samples':'new_evidence');
 }
 if(code==='warmup'){
  const clean=d.samples.filter(s=>s.reliable&&!s.assisted);
  if(clean.length<D.LIMITS.minSamples)add('minimum_samples',{remaining:D.LIMITS.minSamples-clean.length});
  if(d.now<D.LIMITS.minSpanMs)add('observation_time',{remainingMs:D.LIMITS.minSpanMs-d.now});
  if(!clean.length||clean.at(-1).at-clean[0].at<45000)add('sample_span');
 }
 if(['frame','effect','recovery','unstable','planning','candidate','steady'].includes(code))add(code);
 if(d.decision.waiting>0)add('new_evidence',{remaining:d.decision.waiting});
 if(d.config.mode==='observe')add('observe_only');
 return list;
}
class AuditDirector extends D.Director{
 constructor(config,profile){super(config,profile);this.auditLog=[];this.auditDropped=0;this.auditRisk=false;
  this.firstRiskAt=null;this.riskEpisodeAt=null;this.proposalSerial=0;this.terminal=null;
  this.excludedLifetime={total:0,eligible:0,excluded:0,primary:{}};this._recordBad=0;this._lastDecisionSignature='';
 }
 auditEvent(type,data={}){if(this.config.mode==='off')return;this.auditLog.push({at:this.now,type,...COPY(data)});if(this.auditLog.length>MAX_LOG){this.auditDropped++;this.auditLog.shift();}}
 pendingEnd(before,reason){if(before&&(!this.pending||before.auditId!==this.pending.auditId))this.auditEvent('proposal_cancelled',{proposalId:before.auditId||null,proposedAt:before.at,direction:before.direction,reason});}
 tick(raw,eligible=true){const before=this.pending;super.tick(raw,eligible);this.pendingEnd(before,'frame_stall');}
 system(kind,before,after,now){const p=this.pending;super.system(kind,before,after,now);this.pendingEnd(p,'system_'+kind);
  this.auditEvent('system',{source:kind,before,after});
 }
 exclude(reason){const p=this.pending;super.exclude(reason);this.pendingEnd(p,'practice_or_clock');this.auditEvent('excluded',{reason:reason||'개발자 조작'});}
 record(input){this._recording=true;this._recordBad=this.badMs-this.badStart;const oldTotal=this.total;let r;try{r=super.record(input);}finally{this._recording=false;}
  if(this.total!==oldTotal){const s=this.lastPlacement;s.auditBadMs=this._recordBad;
   const c=counts([s]),a=this.excludedLifetime;a.total++;a.eligible+=c.eligible;a.excluded+=c.excluded;
   for(const [k,v] of Object.entries(c.primary))a.primary[k]=(a.primary[k]||0)+v;
  }this._recordBad=0;return r;
 }
 evaluate(){
  if(this._recording&&this.lastPlacement)this.lastPlacement.auditBadMs=this._recordBad;
  const active=this.samples.slice(-6).filter(s=>s.valid),risk=active.length>=4&&active.filter(s=>s.actual.height>=15).length>=4;
  if(risk&&!this.auditRisk){this.firstRiskAt??=this.now;this.riskEpisodeAt=this.now;this.auditEvent('risk_enter',{sample:this.total,height:this.samples.at(-1)?.actual.height});}
  if(!risk&&this.auditRisk)this.auditEvent('risk_exit',{detectedAt:this.riskEpisodeAt});this.auditRisk=risk;
  const p=this.pending,decision=super.evaluate();this.pendingEnd(p,'evaluate_'+decision.code);
  const gates=waits(this),signature=JSON.stringify([decision.code,gates.map(g=>g.code)]);
  if(signature!==this._lastDecisionSignature){this.auditEvent('decision',{code:decision.code,reason:decision.reason,waits:gates,
    sample:this.total,eligible:decision.metrics?.reliable||0,excluded:counts(this.samples).primary});this._lastDecisionSignature=signature;}
  return decision;
 }
 offer(direction){const accepted=super.offer(direction);if(accepted){
   const p=this.pending;p.auditId=++this.proposalSerial;p.detectedAt=direction==='relief'?this.riskEpisodeAt:null;
   p.proposalReason=direction==='relief'?'유효 배치 중 높은 적재 지속':'빠른 유효 배치·자연 제거·안정성 재확인';
   p.proposalCode=direction==='relief'?'persistent_risk':'stable_productivity';
   this.auditEvent('proposal_created',{proposalId:p.auditId,proposedAt:p.at,detectedAt:p.detectedAt,
    direction,factor:p.factor,reason:p.proposalReason,code:p.proposalCode,sample:this.total});
  }return accepted;
 }
 takeInterval(base,options={}){
  const p=this.pending?COPY(this.pending):null,oldApplied=this.applied,decisionAtApply=COPY(this.decision);
  const ms=super.takeInterval(base,options);
  if(p&&!this.pending&&!this.practice&&this.config.mode!=='off'){
   const last=this.log.at(-1);Object.assign(last,{reason:p.proposalReason||last.reason,proposalId:p.auditId||null,
    detectedAt:p.detectedAt??null,proposedAt:p.at,appliedAt:this.now,waitMs:this.now-p.at,
    proposalCode:p.proposalCode||null,decisionAtApply:decisionAtApply?.code||null,
    decisionReasonAtApply:decisionAtApply?.reason||null,actualChanged:Math.abs(this.applied-oldApplied)>1e-9,
    effectiveMode:this.config.mode,forceFixed:!!options.forceFixed});
   this.auditEvent(this.config.mode==='adaptive'&&!options.forceFixed?'proposal_applied':'proposal_simulated',last);
  }
  this.auditEvent('cycle_scheduled',this.intervalHistory.at(-1));return ms;
 }
 markTerminal(detail={}){if(this.terminal)return;this.terminal={at:this.now,...COPY(detail)};this.auditEvent('terminal',this.terminal);}
 report(outcome='checkpoint'){
  const r=super.report(outcome);r.diagnosticVersion=VERSION;
  r.diagnostics={firstRiskAt:this.firstRiskAt,riskEpisodeAt:this.riskEpisodeAt,waits:waits(this),
   sampleWindow:counts(this.samples),lifetime:COPY(this.excludedLifetime),terminal:COPY(this.terminal),
   timeline:COPY(this.auditLog),droppedTimelineEvents:this.auditDropped,
   metricMeaning:'판정 자료 충족도는 표본·시간 기준 충족률이며 실제 판정 정확도나 IQ가 아닙니다.'};return COPY(r);
 }
}
return {VERSION,MAX_LOG,LABELS,exclusion,counts,waits,AuditDirector};
});
