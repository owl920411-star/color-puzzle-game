'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{boot}=require('./helpers/adaptive-stable-harness.cjs');
function setup(){const a=boot();a.q.start();const calls=[];
 for(const name of ['move','rotateDir','hold','lock']){const fn=a.q.run[name].bind(a.q.run);a.q.run[name]=(...args)=>{const result=fn(...args);if(name!=='move'||args[0])calls.push({name,args,at:a.now,result});return result;};}
 const fire=(type,x=60,y=200,id=1,target='board')=>{for(const fn of a.nodes.get(target).events[type]||[])fn({button:0,pointerId:id,clientX:x,clientY:y,detail:1,preventDefault(){}});};
 return Object.assign(a,{fire,calls});}
for(const x of [60,220]){
 test(`30 taps ${x}`,()=>{for(let i=0;i<30;i++){const a=setup();a.fire('pointerdown',x);a.advance(100+i%30);a.fire('pointerup',x);a.advance(300);assert.equal(a.calls.filter(c=>c.name==='move').length,1);}});
 test(`10 stationary holds ${x}`,()=>{for(let i=0;i<10;i++){const a=setup();a.fire('pointerdown',x);a.advance(280);assert.deepEqual(a.calls.map(c=>c.at),[165,203,236,265]);a.fire('pointerup',x);a.advance(300);assert.equal(a.calls.length,4);}});
 test(`20 single swipes ${x}`,()=>{for(let i=0;i<20;i++){const a=setup(),dx=x===60?-60:60;a.fire('pointerdown',x);a.advance(40);a.fire('pointermove',x+dx);a.advance(400);a.fire('pointermove',x+dx*2);a.fire('pointerup',x+dx*2);assert.deepEqual(a.calls.map(c=>c.name),['rotateDir']);assert.equal(a.calls[0].args[0],Math.sign(dx));}});
}
for(const drift of [6,12,15,16,17,18,22,25])test(`former dead-zone ${drift}px preserves tap and hold`,()=>{for(const hold of [false,true]){const a=setup();a.fire('pointerdown');a.advance(80);a.fire('pointermove',60+drift,200);a.advance(hold?200:40);a.fire('pointerup',60+drift);assert.equal(a.calls.length,hold?4:1);if(hold)assert.deepEqual(a.calls.map(c=>c.at),[165,203,236,265]);}});
test('diagonal micro-jitter does not trip radial peakDistance guard',()=>{const a=setup();a.fire('pointerdown');a.advance(100);a.fire('pointermove',73,213);a.advance(180);assert.deepEqual(a.calls.map(c=>c.at),[165,203,236,265]);});
test('100–250ms boundary: no release extra step, tap dead zone or duplicate at confirmation',()=>{for(let ms=100;ms<=250;ms++){const a=setup();a.fire('pointerdown');a.advance(ms);const before=a.calls.length;a.fire('pointerup');const expected=ms<203?1:ms<236?2:3+Math.floor((ms-236)/29);assert.equal(a.calls.length,expected,`duration ${ms}`);if(ms>=165)assert.equal(a.calls.length,before);a.advance(250);assert.equal(a.calls.length,expected);}});
for(const [dy,name]of[[-60,'hold'],[60,'lock']])test(`20 vertical ${name}`,()=>{for(let i=0;i<20;i++){const a=setup();a.fire('pointerdown');a.advance(50);a.fire('pointermove',60,200+dy);const p=a.q.run.active;a.advance(300);a.fire('pointermove',110,200+dy);a.fire('pointerup',110,200+dy);assert.equal(a.calls.filter(c=>c.name===name).length,1);assert.equal(a.calls.filter(c=>c.name==='rotateDir'||c.name==='move').length,0);assert.equal(a.q.run.active,p);}});
test('long hold then horizontal swipe keeps repeating without rotation; release stops',()=>{const a=setup();a.fire('pointerdown');a.advance(180);a.fire('pointermove',110);a.advance(140);a.fire('pointerup',110);assert.ok(a.calls.length>1);assert.ok(a.calls.every(c=>c.name==='move'&&c.args[0]===-1));const n=a.calls.length;a.advance(300);assert.equal(a.calls.length,n);});
test('quick horizontal swipes rotate, including release-only recognition; long swipes do not',()=>{
 for(const age of [30,100,164,165,166,400])for(const dir of [-1,1])for(const releaseOnly of [false,true]){
  const a=setup();a.fire('pointerdown');a.advance(age);if(!releaseOnly)a.fire('pointermove',60+dir*55);a.fire('pointerup',60+dir*55);
  assert.equal(a.calls.filter(c=>c.name==='rotateDir').length,age<165?1:0,`${age}/${dir}/${releaseOnly}`);
 }
});
test('holding at a wall then swiping cannot rotate, and a fresh short swipe still can',()=>{
 for(const dir of [-1,1]){const a=setup();while(a.q.run.move(dir)){}a.calls.length=0;const x=dir<0?60:220;a.fire('pointerdown',x);a.advance(250);assert.equal(a.q.drag.state,'BLOCKED');a.fire('pointermove',x-dir*55);a.fire('pointerup',x-dir*55);assert.equal(a.calls.filter(c=>c.name==='rotateDir').length,0);a.fire('pointerdown',x);a.advance(30);a.fire('pointerup',x-dir*55);assert.equal(a.calls.filter(c=>c.name==='rotateDir').length,1);}
});
test('up HOLD and down drop remain available after a confirmed long hold',()=>{
 for(const [dy,method] of [[-60,'hold'],[60,'lock']]){const a=setup();a.fire('pointerdown');a.advance(180);a.fire('pointermove',60,200+dy);a.fire('pointerup',60,200+dy);assert.equal(a.calls.filter(c=>c.name===method).length,1);assert.equal(a.calls.filter(c=>c.name==='rotateDir').length,0);}
});
test('pause/resume does not revive old timer',()=>{const a=setup();a.fire('pointerdown');a.advance(100);a.q.pause();a.advance(500);a.q.resume();a.fire('pointerup');assert.equal(a.calls.length,0);a.fire('pointerdown');a.advance(170);assert.equal(a.calls.length,1);});
test('wall rotation does not restore an old virtual lane',()=>{for(const dir of [-1,1]){const a=setup();while(a.q.run.move(dir)){}a.calls.length=0;a.fire('pointerdown');a.advance(30);a.fire('pointermove',60+dir*50);const x=a.q.run.active.x;a.advance(350);a.fire('pointerup',60+dir*50);assert.equal(a.calls.filter(c=>c.name==='rotateDir').length,1);assert.equal(a.calls.filter(c=>c.name==='move').length,0);assert.equal(a.q.run.active.x,x);}});

test('repeat timer progresses without update or pointermove',()=>{const a=setup();a.fire('pointerdown');a.advance(280,1,false);assert.deepEqual(a.calls.map(c=>c.at),[165,203,236,265]);a.fire('pointerup');a.advance(300,1,false);assert.equal(a.calls.length,4);});

test('CONTROL 23 ramp settles to 29ms with seven-cell traversal at352ms',()=>{const a=setup();while(a.q.run.move(1)){}a.calls.length=0;a.fire('pointerdown',60);a.advance(410);const times=a.calls.filter(c=>c.name==='move').map(c=>c.at);assert.deepEqual(times.slice(0,7),[165,203,236,265,294,323,352]);a.fire('pointerup');const n=a.calls.length;a.advance(300);assert.equal(a.calls.length,n);console.log('CONTROL23 trace',times);});
test('center boundary side is fixed at pointerdown, never flips with jitter',()=>{for(const x of [134,135,136]){const a=setup();a.fire('pointerdown',x);a.advance(70);a.fire('pointermove',x<135?136:134);a.fire('pointerup',x<135?136:134);assert.equal(a.calls.length,1);assert.equal(a.calls[0].args[0],x<135?-1:1);}});
test('tap executes in pointerup handler with no post-release timer',()=>{const a=setup();a.fire('pointerdown');a.advance(80);assert.equal(a.calls.length,0);a.fire('pointerup');assert.equal(a.calls[0].at,80);a.advance(200);assert.equal(a.calls.length,1);});

test('20 two-finger drops: clear old pointer and suppress its move/up/followup click',()=>{
 for(let i=0;i<20;i++){
  const a=setup(),x=i%2?220:60;a.fire('pointerdown',x);a.advance(i%3===0?70:180);
  a.fire('pointerdown',0,0,2,'drop');const p=a.q.run.active,afterX=p.x,afterCells=JSON.stringify(p.cells),before=a.calls.length;
  a.fire('click',0,0,2,'drop');a.advance(200);a.fire('pointermove',x+(i%2?60:-60));a.fire('pointerup',x+(i%2?60:-60));a.advance(200);
  assert.equal(a.calls.filter(c=>c.name==='lock').length,1);assert.equal(a.calls.length,before);
  assert.equal(a.q.run.active,p);assert.equal(p.x,afterX);assert.equal(JSON.stringify(p.cells),afterCells);
 }
});
test('physical HOLD button clears a board repeat before replacing the piece',()=>{
 const a=setup();a.fire('pointerdown');a.advance(180);a.fire('pointerdown',0,0,2,'hold');const p=a.q.run.active,x=p.x,n=a.calls.length;
 a.advance(300);a.fire('pointerup');assert.equal(a.calls.length,n);assert.equal(a.q.run.active,p);assert.equal(p.x,x);
});
