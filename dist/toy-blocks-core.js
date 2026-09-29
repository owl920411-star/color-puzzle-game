/* Shared toy behaviour for CRAYON BLOOM and the comparison laboratories. */
(function(root){
'use strict';
const COLS=10,ROWS=20,S=36,EPS=1e-7,STEP=5;
const SHAPES=[[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[1,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[1,1],[2,1]]];
const PALETTES={bouncy:['#f58faf','#77c9f4','#ffd86b','#91d8b4'],fat:['#f58faf','#77c9f4','#ffd86b','#91d8b4'],coward:['#c0a5df','#9fd5ee','#eaa9bb','#f3d479'],doodle:['#91d5bf','#a7cfea','#ecadc0','#f1d17b']};
const WORDS={bounce:{text:'통!',colour:'#a64a6f',ms:520},roll:{text:'데굴~',colour:'#a64a6f',ms:520},land:{text:'톡!',colour:'#81634c',ms:340},expand:{text:'뿌웅!',colour:'#ae5974',ms:550},taDa:{text:'짜잔!',colour:'#986038',ms:350},noSpace:{text:'낑…',colour:'#88694b',ms:550}};
Object.assign(WORDS,{panic:{text:'으악!',colour:'#7e579b',ms:480},escape:{text:'후다닥!',colour:'#7e579b',ms:520},blocked:{text:'벌벌…',colour:'#846c94',ms:520},relief:{text:'휴우~',colour:'#756888',ms:350}});
Object.assign(WORDS,{draw:{text:'슥삭!',colour:'#43856c',ms:550},giggle:{text:'히히!',colour:'#508172',ms:350},noInk:{text:'힝…',colour:'#8e745b',ms:500}});
const empty=()=>Array.from({length:ROWS},()=>Array(COLS).fill(null));
const copy=v=>JSON.parse(JSON.stringify(v));
function seeded(seed){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function random(fn){const n=Number(fn());return Number.isFinite(n)?Math.max(0,Math.min(.999999999,n)):0;}
class ToyClock{
  constructor(mode='repeat'){this.reset(mode);}
  reset(mode){this.mode=mode;this.elapsed=0;this.next=60000;this.pending=mode==='cycle'?{reservedAt:0,reason:'initial'}:null;this.events=[];this.skipped=0;}
  log(event){this.events.push(event);if(this.events.length>120)this.events.shift();}
  advanceTo(time){
    if(time<this.elapsed)return;
    this.elapsed=time;
    if(this.mode!=='cycle'||time<this.next)return;
    // At most one outstanding reservation, including an active-tab stall.
    const count=Math.floor((time-this.next)/60000)+1;
    if(!this.pending){this.pending={reservedAt:this.next,reason:'periodic'};this.log({event:'reserve',...this.pending,observedAt:time});this.skipped+=count-1;}
    else this.skipped+=count;
    if(count>1||this.pending.reservedAt!==this.next)this.log({event:'coalesced',at:time,missed:this.skipped});
    this.next+=count*60000;
  }
  take(id){if(!this.pending)return null;const event={event:'spawn',...this.pending,spawnedAt:this.elapsed,id};this.pending=null;this.log(event);return event;}
}
class ToyLab{
  constructor(kind='bouncy',options={}){
    if(!PALETTES[kind])throw new Error('Unknown laboratory');
    this.kind=kind;this.rng=options.rng||Math.random;
    // Normal-piece order has its own stream; inserting a toy never consumes it.
    this.normalRng=options.normalRng||seeded(Math.floor(Math.random()*4294967296));
    this.serial=0;this.terrain=0;this.bounce='normal';this.reset('repeat');
  }
  reset(mode=this.mode,terrain='empty'){
    this.mode=mode==='cycle'?'cycle':'repeat';this.clock=new ToyClock(this.mode);this.simTime=0;
    this.board=empty();this.effects=[];this.history=[];this.locks=0;this.lastLock=null;this.normalIndex=0;this.paused=false;
    const heights={flat:[2,2,2,2,2,2,2,2,2,2],steps:[1,1,2,2,3,3,4,4,5,5],lower:[0,0,0,0,5,0,0,0,0,0],wall:[0,0,0,0,0,0,0,0,0,8],blocked:[0,0,0,5,2,2,5,0,0,0]}[terrain];
    if(heights)heights.forEach((h,x)=>{for(let y=ROWS-h;y<ROWS;y++)this.board[y][x]={kind:'block',colour:PALETTES[this.kind][(x+y)%4],owner:0};});
    this.spawn();
  }
  spawn(){
    const type=this.mode==='repeat'||this.clock.pending?this.kind:'normal';
    const rng=type==='normal'?this.normalRng:this.rng;
    const cells=copy(SHAPES[Math.floor(random(rng)*SHAPES.length)]),width=Math.max(...cells.map(c=>c[0]))+1;
    const p=this.p={id:++this.serial,type,cells,original:copy(cells),x:Math.floor((COLS-width)/2),y:0,colour:PALETTES[this.kind][Math.floor(random(rng)*4)],state:'fall',ms:0,used:false,dir:0,automaticMoves:0,userMoves:0,fast:false,locked:false,extra:[],added:[]};
    if(type==='normal')p.normalIndex=++this.normalIndex;
    this.message='';
    if(this.hit(p.x,0)){p.state='full';this.message='보드가 꽉 찼어요. 보드 비우기로 다시 시작해요.';return;}
    if(type!=='normal'&&this.mode==='cycle')this.clock.take(p.id);
    this.history.push({id:p.id,type,at:this.clock.elapsed});if(this.history.length>120)this.history.shift();
  }
  newToy(){if(this.mode==='cycle')return false;this.effects=[];this.spawn();return true;}
  clear(){this.reset();}
  fill(){const names=['lower','flat','steps','wall','blocked'];this.reset(this.mode,names[this.terrain++%names.length]);}
  hit(x,y,cells=this.p.cells){
    if(!Number.isInteger(x)||!Number.isFinite(y))return true;
    return cells.some(([dx,dy])=>{
      const col=x+dx,top=y+dy;
      if(col<0||col>=COLS||top<-EPS||top+1>ROWS+EPS)return true;
      for(let row=Math.max(0,Math.floor(top+EPS));row<=Math.min(ROWS-1,Math.floor(top+1-EPS));row++)if(this.board[row][col])return true;
      return false;
    });
  }
  landingY(){let y=Math.floor(this.p.y+EPS);while(y<ROWS&&!this.hit(this.p.x,y+1))y++;return y;}
  controllable(){return ['fall','after'].includes(this.p.state)||(this.p.type==='bouncy'&&['squash','bounce','roll'].includes(this.p.state));}
  move(dir){if(this.paused||!this.controllable()||![-1,1].includes(dir)||this.hit(this.p.x+dir,this.p.y))return false;this.p.x+=dir;this.p.userMoves++;return true;}
  drop(){
    const p=this.p;if(this.paused||!['fall','after'].includes(p.state))return false;
    p.fast=true;const goal=this.landingY();
    if(p.type==='coward'&&!p.used){p.y=Math.max(p.y,goal-1);this.panic();}
    else{p.y=goal;this.land();}return true;
  }
  transition(state){this.p.state=state;this.p.ms=0;}
  say(key,secondary=false){
    const word=WORDS[key];if(!word)return;
    const p=this.p,e={...word,key,secondary,id:p.id,x:(p.x+(Math.min(...p.cells.map(c=>c[0]))+Math.max(...p.cells.map(c=>c[0]))+1)/2)*S,y:p.y*S,born:this.clock.elapsed,dir:p.dir};
    this.effects=this.effects.filter(v=>this.clock.elapsed-v.born<v.ms);
    this.effects=secondary?[...this.effects.filter(v=>!v.secondary).slice(0,1),e]:[e];
    this.message=word.text;
  }
  chooseSide(){const p=this.p,first=random(this.rng)<.5?-1:1;return !this.hit(p.x+first,p.y)?first:!this.hit(p.x-first,p.y)?-first:0;}
  panic(){if(this.p.used)return;this.p.used=true;this.transition('panic');this.say('panic');}
  land(){
    const p=this.p;if(p.locked)return;
    if(p.type==='bouncy'&&!p.used){p.used=true;this.transition('squash');return;}
    if(p.type==='fat'&&!p.used){p.used=true;this.transition('fatSquash');return;}
    this.lock();
  }
  fatten(){
    const p=this.p,seen=new Set(p.original.map(c=>c.join(','))),extras=[];
    for(const [dx,dy] of p.original)for(const side of [-1,1]){
      const nx=dx+side,key=nx+','+dy,X=p.x+nx,Y=p.y+dy;
      if(seen.has(key)||X<0||X>=COLS||Y<0||Y>=ROWS||this.board[Y][X])continue;
      seen.add(key);extras.push([nx,dy]);
    }
    p.extra=extras;p.cells=copy(p.original).concat(extras);this.transition('fatpop');this.say(extras.length?'expand':'noSpace');
  }
  inkCandidates(){
    const p=this.p,seen=new Set(),out=[];
    for(const [dx,dy] of p.original)for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const x=p.x+dx+ox,y=p.y+dy+oy,key=x+','+y;
      if(x<0||x>=COLS||y<0||y>=ROWS||this.board[y][x]||seen.has(key))continue;
      seen.add(key);out.push({x,y});
    }return out;
  }
  prepareInk(){
    const p=this.p,choices=this.inkCandidates(),wanted=random(this.rng)<.5?1:2;
    p.used=true;p.targets=[];p.inkIndex=0;
    for(let i=0;i<wanted&&choices.length;i++){
      const target=choices.splice(Math.floor(random(this.rng)*choices.length),1)[0];
      // Cosmetic colour/pattern selection never consumes gameplay randomness.
      p.targets.push({...target,kind:'ink',colour:['#d75c86','#3c98b7','#a86fc2'][i%3],pattern:(p.id+i)%3,owner:p.id});
    }
    this.transition('doodleReady');if(!p.targets.length)this.say('noInk');
  }
  finishStroke(){
    const p=this.p,target=p.targets[p.inkIndex];
    if(target&&!this.board[target.y][target.x]){
      const{x,y,...ink}=target;this.board[y][x]=ink;p.added.push({x,y});
      if(this.lastLock?.id===p.id)this.lastLock.added.push({x,y});
    }
    p.inkIndex++;
    if(p.inkIndex>=p.targets.length){this.transition('doodleRest');this.say('giggle',true);}
    else{this.transition('draw');this.say('draw');}
  }
  lock(){
    const p=this.p;if(p.locked)return false;
    if(this.hit(p.x,p.y)||Math.abs(p.y-Math.round(p.y))>EPS||!this.hit(p.x,p.y+1))throw new Error('Invalid or unsupported lock');
    p.y=Math.round(p.y);p.locked=true;
    for(const [dx,dy] of p.cells)this.board[p.y+dy][p.x+dx]={kind:'block',colour:p.colour,owner:p.id,toy:p.type};
    this.locks++;this.lastLock={id:p.id,type:p.type,x:p.x,y:p.y,cells:copy(p.cells),original:copy(p.original),automaticMoves:p.automaticMoves,userMoves:p.userMoves,extra:copy(p.extra),added:[]};
    if(p.type==='doodle'){this.prepareInk();return true;}
    this.transition('settle');if(p.type==='bouncy')this.say('land',true);if(p.type==='fat'&&p.extra.length)this.say('taDa',true);if(p.type==='coward')this.say('relief',true);return true;
  }
  update(delta){
    if(this.paused||this.p.state==='full'||!Number.isFinite(delta)||delta<=0)return;
    const target=this.clock.elapsed+delta;
    // A long active-tab stall advances the real clock, but does not replay
    // minutes of unseen drops. Missed reservations coalesce in ToyClock.
    if(delta>2000){this.clock.advanceTo(target-100);this.simTime=Math.floor(this.clock.elapsed/STEP)*STEP;}
    // Fixed physical steps give identical behaviour at 30/60/120 Hz. The active
    // clock is elapsed time, never a clamped frame counter.
    while(this.simTime+STEP<=target+EPS){
      this.simTime+=STEP;this.clock.advanceTo(this.simTime);this.step(STEP);
      if(this.p.state==='full')return;
    }
    this.clock.advanceTo(target);
  }
  step(dt){
    const p=this.p;p.ms+=dt;
    if(p.state==='fall'||p.state==='after'){
      const landing=this.landingY(),scared=p.type==='coward',goal=scared&&!p.used?Math.max(p.y,landing-1):landing;
      const speed=scared&&p.used?(p.fast?12:7):p.type==='bouncy'||this.kind==='fat'?1000/360:4.8;
      p.y=Math.min(goal,p.y+speed*dt/1000);
      if(p.y>=goal-EPS){p.y=goal;if(scared&&!p.used)this.panic();else this.land();}
    }else if(p.state==='panic'&&p.ms>=200){
      p.dir=this.chooseSide();p.fromX=p.x;p.toX=p.x+p.dir;this.transition(p.dir?'escape':'blocked');this.say(p.dir?'escape':'blocked');
    }else if((p.state==='escape'||p.state==='blocked')&&p.ms>=170){
      if(p.dir&&!this.hit(p.toX,p.y)){p.x=p.toX;p.automaticMoves++;}else p.dir=0;
      this.transition('after');
    }else if(p.state==='doodleReady'&&p.ms>=130){this.transition(p.targets.length?'draw':'doodleRest');if(p.targets.length)this.say('draw');}
    else if(p.state==='draw'&&p.ms>=260)this.finishStroke();
    else if(p.state==='doodleRest'&&p.ms>=200)this.spawn();
    else if(p.state==='fatSquash'&&p.ms>=100)this.fatten();
    else if(p.state==='fatpop'&&p.ms>=260)this.lock();
    else if(p.state==='squash'&&p.ms>=95){
      p.dir=this.chooseSide();if(p.dir){p.x+=p.dir;p.automaticMoves++;}
      p.bounceY=p.y;p.vy={soft:-47,normal:-72,wild:-95}[this.bounce];this.transition('bounce');this.say('bounce');
    }else if(p.state==='bounce'){
      const goal=this.landingY(),ny=p.y+p.vy*dt/1000+.5*350*(dt/1000)**2;p.vy+=350*dt/1000;
      if(p.vy<0&&this.hit(p.x,ny)){p.y=Math.max(0,Math.ceil(p.y-EPS));p.vy=0;}
      else if(p.vy>=0&&ny>=goal){p.y=goal;this.lock();}
      else if(p.vy>=0&&ny>=p.bounceY&&p.dir&&goal>p.bounceY){p.y=p.bounceY;this.transition('roll');this.say('roll');}
      else p.y=ny;
    }else if(p.state==='roll'){
      const goal=this.landingY();p.y=Math.min(goal,p.y+dt/115);if(p.y>=goal-EPS){p.y=goal;this.lock();}
    }else if(p.state==='settle'&&p.ms>=(p.type==='coward'?200:170))this.spawn();
  }
  snapshot(){return copy({kind:this.kind,mode:this.mode,p:this.p,board:this.board,clock:this.clock,locks:this.locks,lastLock:this.lastLock,effects:this.effects,history:this.history});}
}
const api={ToyLab,ToyClock,SHAPES,PALETTES,WORDS,COLS,ROWS,S,seeded};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ToyLabKit=api;
})(typeof window!=='undefined'?window:globalThis);
