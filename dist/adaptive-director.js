/* GLASSFALL Adaptive Director V1. Pilot thresholds, NOT population norms.
 * No DOM, network, score mutation, randomness or game-clock ownership.
 * observe is the default. Only takeInterval() can commit future ground pacing.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AdaptiveDirector = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
'use strict';
const VERSION = 'adaptive-v1.0';
const RULESET = 'control16-novice7-blockitems2-adaptive1';
const LIMITS = Object.freeze({windowMs:90000, minSpanMs:60000, minSamples:20,
  newSamples:6, cooldownMs:30000, step:.05, floorMs:11000, episodeSteps:3,
  maxSamples:120, maxLog:80, maxHistory:20, slowFrameMs:100});
const STYLES = Object.freeze({calm:{label:'편안하게',min:1,max:1.35},
  balanced:{label:'균형',min:.85,max:1.35},challenge:{label:'도전',min:.85,max:1.15}});
const MODES = Object.freeze({observe:'관찰만',adaptive:'자동 조절',off:'끄기'});
const finite = (v,d=0) => Number.isFinite(v)?v:d;
const clamp = (v,a,b) => Math.min(b,Math.max(a,finite(v,a)));
const sum = (a,f) => a.reduce((s,v)=>s+f(v),0);
const average = a => a.length?sum(a,x=>x)/a.length:0;
const median = a => {const b=a.slice().sort((x,y)=>x-y),n=b.length;return n?(b[(n-1)>>1]+b[n>>1])/2:0;};
const round = n => Math.round(n*1000)/1000;
function options(o={}) {return {mode:Object.hasOwn(MODES,o.mode)?o.mode:'observe',
  style:Object.hasOwn(STYLES,o.style)?o.style:'balanced',guest:o.guest===true};}
function metrics(board) {
  if(!Array.isArray(board)||board.length!==20||board.some(r=>!Array.isArray(r)||r.length!==10)) throw new TypeError('10×20 board required');
  const heights=Array(10).fill(0);let holes=0,cells=0;
  for(let x=0;x<10;x++){let seen=false;for(let y=0;y<20;y++){
    if(board[y][x]) {cells++;if(!seen){heights[x]=20-y;seen=true;}}
    else if(seen)holes++;
  }}
  return {height:Math.max(...heights),holes,cells,bump:heights.slice(1).reduce((s,h,i)=>s+Math.abs(h-heights[i]),0)};
}
function compact(board,rows=[]) {
  const remove=new Set(rows),out=board.filter((_,y)=>!remove.has(y)).map(r=>r.slice());
  while(out.length<20)out.unshift(Array(10).fill(null));return out;
}
function contextKey(c={}) {
  // Only compare within similar gravity + desert stage + applied pacing.
  return `L${Math.round(clamp(c.level,0,8))}-G${Math.round(clamp(c.gravity,100,4000)/100)}-P${Math.round(clamp(c.factor??1,.85,1.35)*20)}`;
}
function newProfile() {return {version:VERSION,completed:0,contexts:{}};}
function cleanProfile(p) {
  const out=newProfile();if(!p||p.version!==VERSION)return out;
  out.completed=Math.floor(clamp(p.completed,0,100000));
  for(const [k,v] of Object.entries(p.contexts||{}).slice(-32)) {
    if(!/^L\d-G\d+-P\d+$/.test(k)||!v||typeof v!=='object')continue;
    out.contexts[k]={ppm:clamp(v.ppm,0,300),lineRate:clamp(v.lineRate,0,4),
      addedHoles:clamp(v.addedHoles,0,200),sessions:Math.floor(clamp(v.sessions,0,100000))};
  }return out;
}
function learn(profile,summary) {
  const out=cleanProfile(profile);
  if(summary.version!==VERSION||summary.outcome!=='gameover'||summary.practice||summary.guest||summary.mode==='off')return out;
  let any=false;
  for(const b of summary.evidence||[]) {
    if(b.count<20||b.span<60000)continue;
    const old=out.contexts[b.key],alpha=old?.15:1;
    out.contexts[b.key]={ppm:round((old?.ppm||0)*(1-alpha)+b.ppm*alpha),
      lineRate:round((old?.lineRate||0)*(1-alpha)+b.lineRate*alpha),
      addedHoles:round((old?.addedHoles||0)*(1-alpha)+b.addedHoles*alpha),sessions:(old?.sessions||0)+1};any=true;
  }
  if(any)out.completed++;
  const keys=Object.keys(out.contexts);for(const k of keys.slice(0,Math.max(0,keys.length-32)))delete out.contexts[k];return out;
}
class Director {
  constructor(config={}, profile=null) {
    this.config=options(config);this.profile=cleanProfile(profile);this.samples=[];this.log=[];
    this.controlMs=0;this.badMs=0;this.frameCount=0;this.now=0;this.lastNow=0;
    this.placementStart=0;this.badStart=0;this.inputs=0;this.holds=0;this.firstInput=null;
    this.total=0;this.validTotal=0;this.lastEval=0;this.lastRiskEval=0;this.lastChange=-Infinity;
    this.lastChangeSample=0;this.upVotes=0;this.applied=1;this.proposed=1;this.pending=null;
    this.episode=0;this.recovering=false;this.graceUntil=0;this.assistUntil=0;
    this.practice=false;this.taintedUntil=0;this.aborted=false;
    this.intervalHistory=[];this.events={item:0,ground:0,relic:0};this.hardDrops=0;
    this.reliableBuckets={};this.lastPlacement=null;
    this.decision={code:'warmup',reason:'자료 수집 중 · 난이도는 그대로',confidence:0,metrics:null};
  }
  tick(raw,eligible=true) {
    // Caller supplies game time separately. Never change the game clock.
    if(!eligible||this.config.mode==='off'||this.practice)return;
    if(!Number.isFinite(raw)||raw<=0)return;
    this.frameCount++;
    if(raw>LIMITS.slowFrameMs){if(this.pending?.direction==='up')this.pending=null;this.upVotes=0;this.badMs+=Math.min(raw,10000);this.taintedUntil=this.now+LIMITS.cooldownMs;return;}
    this.controlMs+=raw;
  }
  input(valid,{hold=false}={}) {
    if(!valid||this.config.mode==='off'||this.practice)return;
    this.inputs++;if(this.firstInput===null)this.firstInput=this.controlMs;
    if(hold)this.holds++;
  }
  system(kind,before,after,now=this.now) {
    this.now=Math.max(this.now,finite(now));
    if(Object.hasOwn(this.events,kind))this.events[kind]++;
    if(kind==='item'||kind==='relic'){
      // Context/attribution only: NO change to earned items or their probabilities.
      this.assistUntil=Math.max(this.assistUntil,this.now+LIMITS.cooldownMs);
      this.upVotes=0;if(this.pending?.direction==='up')this.pending=null;
    }
    if(before&&after&&before.height>=15&&after.height<=12){
      this.graceUntil=Math.max(this.graceUntil,this.now+LIMITS.cooldownMs);this.recovering=true;
    }
  }
  exclude(reason='개발자 조작') {
    this.practice=true;this.pending=null;this.samples=[];this.upVotes=0;
    this.decision={code:'excluded',reason:reason+' · 학습과 실제 조절 제외',confidence:0,metrics:null};
  }
  record({now,before,natural,actual,lines=0,combo=0,hardDrop=false,context={}}) {
    if(this.config.mode==='off'||this.practice)return this.decision;
    now=finite(now);if(now<this.lastNow){this.exclude('시간 역행');return this.decision;}
    this.now=this.lastNow=now;this.total++;
    const duration=this.controlMs-this.placementStart,bad=this.badMs-this.badStart;
    const valid=this.inputs>0&&duration>=250&&duration<=60000&&bad===0;
    const reliable=valid&&now>=this.taintedUntil;
    const s={index:this.total,at:now,ms:duration,valid,reliable,inputs:this.inputs,holds:this.holds,
      firstInputMs:this.firstInput===null?null:this.firstInput-this.placementStart,
      hardDrop:hardDrop&&valid,lines:Math.round(clamp(lines,0,20)),combo:Math.round(clamp(combo,0,10000)),
      before:{...before},natural:{...natural},actual:{...actual},
      addedHoles:Math.max(0,natural.holes-before.holes),heightDelta:natural.height-before.height,
      context:{level:finite(context.level),gravity:finite(context.gravity),baseInterval:finite(context.baseInterval),
        actualInterval:finite(context.actualInterval),factor:this.applied,curses:finite(context.curses)},
      key:contextKey({...context,factor:this.applied}),assisted:now<this.assistUntil};
    this.lastPlacement=s;this.samples.push(s);this.samples=this.samples.filter(x=>now-x.at<=LIMITS.windowMs).slice(-LIMITS.maxSamples);
    this.placementStart=this.controlMs;this.badStart=this.badMs;this.inputs=0;this.holds=0;this.firstInput=null;
    if(valid)this.validTotal++;if(s.hardDrop)this.hardDrops++;
    if(reliable&&!s.assisted){
      const b=this.reliableBuckets[s.key]||{count:0,first:now,last:now,ms:0,lines:0,added:0};
      b.count++;b.last=now;b.ms+=duration;b.lines+=s.lines;b.added+=s.addedHoles;this.reliableBuckets[s.key]=b;
      if(Object.keys(this.reliableBuckets).length>32)delete this.reliableBuckets[Object.keys(this.reliableBuckets)[0]];
    }
    return this.evaluate();
  }
  evaluate() {
    const all=this.samples,clean=all.filter(s=>s.reliable&&!s.assisted),recent=all.slice(-6);
    const m={placements:all.length,reliable:clean.length,ppm:round(clean.length*60000/Math.max(1,sum(clean,s=>s.ms))),
      hardDropShare:round(average(clean.map(s=>s.hardDrop?1:0))),medianLockMs:median(clean.map(s=>s.ms)),
      naturalLines:sum(clean,s=>s.lines),lineRate:round(sum(clean,s=>s.lines)/Math.max(1,clean.length)),
      addedHoles:round(average(clean.map(s=>s.addedHoles))),height:all.at(-1)?.actual.height||0,
      holes:all.at(-1)?.actual.holes||0};
    const confidence=round(Math.min(1,clean.length/LIMITS.minSamples)*Math.min(1,this.now/LIMITS.minSpanMs));
    const decide=(code,reason)=>{this.decision={code,reason,confidence,metrics:m};return this.decision;};
    if(this.practice)return decide('excluded','개발자 상태 · 학습 제외');
    const active=recent.filter(s=>s.valid),risk=active.length>=4&&active.filter(s=>s.actual.height>=15).length>=4;
    const recovering=active.length>=4&&active.every(s=>s.actual.height<=12)&&active.at(-1).actual.holes<=active[0].actual.holes;
    if(recovering&&this.recovering){this.episode=0;this.recovering=false;this.graceUntil=Math.max(this.graceUntil,this.now+LIMITS.cooldownMs);}
    if(risk){
      this.upVotes=0;this.recovering=true;if(this.pending?.direction==='up')this.pending=null;
      if(this.total-this.lastRiskEval>=4){this.lastRiskEval=this.total;
        if(this.episode<LIMITS.episodeSteps&&this.offer('relief')){this.episode++;return decide('relief','유효 배치 중 높은 적재 지속 · 다음 지반 주기 완화 후보');}}
      return decide('risk','현재 부담 높음 · 상승 동결 / 회복 조절 대기 또는 상한');
    }
    if(this.now<this.taintedUntil)return decide('frame','프레임 정체 감지 · 속도 판정 보류');
    if(this.now<this.assistUntil)return decide('effect','아이템·유물 영향 구간 · 실력 상승 근거에서 분리');
    if(this.now<this.graceUntil)return decide('recovery','위기 회복 뒤 안정 구간 · 추가 상승 보류');
    if(this.pending?.direction==='up'&&(m.height>12||sum(recent,s=>s.addedHoles)>1||recent.some(s=>!s.reliable))){this.pending=null;this.upVotes=0;return decide('unstable','최근 배치 불안정 · 이전 상승 예약 취소');}
    if(this.pending)return decide(this.pending.direction==='up'?'up':'relief','판정 예약됨 · 현재 예고는 그대로, 다음 전체 주기부터');
    if(clean.length<LIMITS.minSamples||this.now<LIMITS.minSpanMs||clean.at(-1).at-clean[0].at<45000)
      return decide('warmup','관찰량 부족 · 20회 이상 유효 배치와 60초 관찰 필요');
    if(this.total-this.lastEval<LIMITS.newSamples){this.decision={...this.decision,confidence,metrics:m,waiting:LIMITS.newSamples-(this.total-this.lastEval)};return this.decision;}
    this.lastEval=this.total;
    const span=clean.slice(-6),heightGrowth=sum(span,s=>s.heightDelta),holeGrowth=sum(span,s=>s.addedHoles);
    const stable=m.height<=12&&m.addedHoles<=.15&&heightGrowth<=2&&holeGrowth<=1;
    const productive=m.lineRate>=.2,fast=m.ppm>=24;
    if(!stable){this.upVotes=0;return decide('unstable','빠른 입력보다 판 안정성 우선 · 높이/막힌 빈칸 증가로 상승 보류');}
    if(!fast){this.upVotes=0;return decide('steady','천천히 안정적으로 배치 · 초보로 단정하지 않고 현재 속도 유지');}
    if(!productive){this.upVotes=0;return decide('planning','자연 줄 제거 근거 부족 · 네 줄 준비 등 다음 배치를 관찰');}
    this.upVotes++;
    if(this.upVotes<2)return decide('candidate','빠름과 안정성 확인 · 새 배치 묶음에서 한 번 더 확인');
    if(this.offer('up')){this.upVotes=0;return decide('up','빠른 유효 배치 + 자연 제거 + 안정성 지속 · 다음 주기 한 단계 상승 후보');}
    return decide('bounded','성과 안정적 · 선택한 범위 상한 또는 재관찰 대기');
  }
  offer(direction) {
    if(this.pending||this.now-this.lastChange<LIMITS.cooldownMs||this.total-this.lastChangeSample<LIMITS.newSamples)return false;
    const bounds=STYLES[this.config.style],next=round(clamp(this.proposed+(direction==='up'?-LIMITS.step:LIMITS.step),bounds.min,bounds.max));
    if(next===this.proposed)return false;
    this.pending={factor:next,direction,at:this.now};return true;
  }
  takeInterval(base,{now=this.now,forceFixed=false}={}) {
    // Call ONLY when scheduling the NEXT cycle, never to rewrite an active deadline.
    if(!Number.isFinite(base)||base<=0)throw new RangeError('Finite positive base interval required');
    this.now=Math.max(this.now,finite(now));
    if(this.pending&&!this.practice&&this.config.mode!=='off'){
      this.proposed=this.pending.factor;this.lastChange=this.now;this.lastChangeSample=this.total;
      this.log.push({at:this.now,direction:this.pending.direction,factor:this.proposed,reason:this.decision.reason});
      this.log=this.log.slice(-LIMITS.maxLog);this.pending=null;
    }
    const effective=this.config.mode==='adaptive'&&!this.practice&&!forceFixed?this.proposed:1;
    const interval=effective===1?base:Math.max(LIMITS.floorMs,Math.round(base*effective));
    this.applied=interval/base;
    this.intervalHistory.push({at:this.now,base,actual:interval,factor:round(this.applied),suggested:Math.max(LIMITS.floorMs,Math.round(base*this.proposed))});
    this.intervalHistory=this.intervalHistory.slice(-LIMITS.maxLog);return interval;
  }
  report(outcome='checkpoint') {
    const evidence=Object.entries(this.reliableBuckets).map(([key,b])=>({key,count:b.count,span:b.last-b.first,
      ppm:round(b.count*60000/Math.max(1,b.ms)),lineRate:round(b.lines/Math.max(1,b.count)),addedHoles:round(b.added/Math.max(1,b.count))}));
    return {version:VERSION,ruleset:RULESET,mode:this.config.mode,style:this.config.style,guest:this.config.guest,
      practice:this.practice,outcome,seconds:Math.floor(this.now/1000),placements:this.total,validPlacements:this.validTotal,
      hardDrops:this.hardDrops,frameExcludedMs:this.badMs,events:{...this.events},decision:this.decision,
      applied:round(this.applied),proposed:this.proposed,pending:this.pending?{...this.pending}:null,
      intervalHistory:this.intervalHistory.slice(),changes:this.log.slice(),evidence};
  }
}
return {VERSION,RULESET,LIMITS,STYLES,MODES,options,metrics,compact,contextKey,newProfile,cleanProfile,learn,Director};
});
