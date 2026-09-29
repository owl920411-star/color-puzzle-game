/* Only laboratory DOM and memory are used. */
(function(){
'use strict';
const kind=document.body.dataset.toy,canvas=document.getElementById('game'),game=new ToyLabKit.ToyLab(kind),reduced=matchMedia('(prefers-reduced-motion: reduce)'),painter=new ToyPainter(canvas,kind,reduced.matches);
const $=id=>document.getElementById(id),legacy=['bouncy','fat'].includes(kind);
let last=performance.now(),manualPaused=false,background=document.hidden||!document.hasFocus(),pointer=null;
const captures=[],label=$('clock'),status=$('status');
function syncTime(now=performance.now()){if(!manualPaused&&!background)game.update(Math.max(0,now-last));last=now;}
function pauseState(){game.paused=manualPaused||background;}
function draw(){
  painter.draw(game);
  label.textContent=manualPaused?'잠깐 쉬는 중 · 시간도 멈춤':game.p.state==='full'?'보드가 꽉 참 · 시간 멈춤':game.mode==='repeat'?'바로 반복 · 매번 장난 블록':game.clock.pending?'다음 블록에 장난쟁이!':`다음 장난 ${String(Math.floor(Math.ceil((game.clock.next-game.clock.elapsed)/1000)/60)).padStart(2,'0')}:${String(Math.ceil((game.clock.next-game.clock.elapsed)/1000)%60).padStart(2,'0')}`;
  $('new').disabled=game.mode==='cycle';$('pause').textContent=manualPaused?'계속하기':'잠깐 쉬기';status.textContent=game.message;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===game.mode)));
}
function cancelInputs(){pointer=null;captures.forEach(f=>f());}
function reset(mode=game.mode,terrain='empty'){cancelInputs();game.reset(mode,terrain);manualPaused=false;pauseState();last=performance.now();draw();}
function act(fn){syncTime();if(!manualPaused&&!background){fn();draw();}}
const actions={left:()=>game.move(-1),right:()=>game.move(1),drop:()=>game.drop(),new:()=>game.newToy(),fill:()=>{const names=['lower','flat','steps','wall','blocked'];reset(game.mode,names[game.terrain++%5]);},clear:()=>reset()};
// Every gesture captures the piece ID and its input eligibility at pointer-down.
// Cancel, outside release and compatibility clicks cannot leak into a new piece.
for(const [id,fn] of Object.entries(actions)){
  const b=$(id);let touch=null,ignoreUntil=0;
  const cancel=()=>{if(touch){touch=null;ignoreUntil=performance.now()+650;}};captures.push(cancel);
  b.addEventListener('pointerdown',e=>{
    if(e.button>0||touch||e.isPrimary===false)return;
    syncTime();touch={id:e.pointerId,piece:game.p.id,allowed:['new','fill','clear'].includes(id)||game.controllable()};b.setPointerCapture(e.pointerId);
  });
  b.addEventListener('pointerup',e=>{
    if(!touch||touch.id!==e.pointerId)return;const start=touch;touch=null;ignoreUntil=performance.now()+650;e.preventDefault();
    syncTime();const r=b.getBoundingClientRect();
    if(start.allowed&&(['new','fill','clear'].includes(id)||start.piece===game.p.id)&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)act(fn);
  });
  b.addEventListener('pointercancel',cancel);b.addEventListener('lostpointercapture',cancel);
  b.addEventListener('click',e=>{if(e.detail!==0&&performance.now()<ignoreUntil){e.preventDefault();return;}if(e.pointerType==='touch'||e.pointerType==='pen'){if(performance.now()<ignoreUntil)return;}act(fn);});
}
canvas.addEventListener('pointerdown',e=>{if(pointer||e.button>0||e.isPrimary===false)return;e.preventDefault();syncTime();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,rect:canvas.getBoundingClientRect(),piece:game.p.id,allowed:game.controllable()};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{
  if(!pointer||e.pointerId!==pointer.id)return;e.preventDefault();const s=pointer;pointer=null;syncTime();
  if(!s.allowed||s.piece!==game.p.id||manualPaused||background)return;
  const dx=e.clientX-s.x,dy=e.clientY-s.y,r=s.rect;
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
  if(Math.abs(dx)>28&&Math.abs(dx)>Math.abs(dy))act(dx>0?actions.right:actions.left);
  else if(dy>28&&dy>Math.abs(dx))act(actions.drop);
  else if(Math.abs(dx)<14&&Math.abs(dy)<14)act(legacy?actions.drop:e.clientX<r.left+r.width/2?actions.left:actions.right);
});
const cancelPointer=e=>{if(pointer&&pointer.id===e.pointerId)pointer=null;};canvas.addEventListener('pointercancel',cancelPointer);canvas.addEventListener('lostpointercapture',cancelPointer);
$('pause').addEventListener('click',()=>{syncTime();manualPaused=!manualPaused;cancelInputs();pauseState();draw();});
$('restart').addEventListener('click',()=>reset());
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>reset(b.dataset.mode)));
document.querySelectorAll('[data-terrain]').forEach(b=>b.addEventListener('click',()=>reset(game.mode,b.dataset.terrain)));
document.querySelectorAll('[data-b]').forEach(b=>b.addEventListener('click',()=>{game.bounce=b.dataset.b;document.querySelectorAll('[data-b]').forEach(v=>v.classList.toggle('on',v===b));}));
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLButtonElement&&[' ','Enter'].includes(e.key))return;
  const action={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'drop',' ':'drop',n:'new',N:'new',c:'clear',C:'clear'}[e.key];
  if(action){e.preventDefault();if(!e.repeat||['left','right'].includes(action))act(actions[action]);}
});
function suspend(value){syncTime();background=value;cancelInputs();pauseState();last=performance.now();}
document.addEventListener('visibilitychange',()=>suspend(document.hidden||!document.hasFocus()));
window.addEventListener('blur',()=>suspend(true));window.addEventListener('focus',()=>suspend(document.hidden));
function comparison(){
  const cv=$('compare'),c=cv.getContext('2d'),dpr=Math.min(3,devicePixelRatio||1);cv.width=360*dpr;cv.height=130*dpr;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,360,130);
  const view=new ToyPainter(cv,kind,true);view.scale=1;
  const base={cells:[[0,0],[1,0],[0,1],[1,1]],original:[[0,0],[1,0],[0,1],[1,1]],y:.8,colour:ToyLabKit.PALETTES[kind][0],state:'fall',ms:0,dir:0};
  view.piece({...base,x:1.2,type:'normal'});view.piece({...base,x:6.6,type:kind});
}
function resize(){painter.resize(devicePixelRatio||1);draw();comparison();}
window.addEventListener('resize',resize);reduced.addEventListener('change',()=>{painter.reduced=reduced.matches;draw();});
function frame(now){syncTime(now);draw();requestAnimationFrame(frame);}
pauseState();resize();document.fonts.ready.then(draw);requestAnimationFrame(frame);
if(new URLSearchParams(location.search).has('qa'))window.__toyLab={game,painter,draw,reset,comparison,pause:()=>{syncTime();manualPaused=true;pauseState();},resume:()=>{last=performance.now();manualPaused=false;background=false;pauseState();}};
})();
