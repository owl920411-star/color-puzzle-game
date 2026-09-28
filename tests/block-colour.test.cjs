'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');

test('hard-drop streaks stay behind locked and active blocks instead of bleaching their colour',()=>{
 const h=boot(),q=h.q;q.start();
 q.run.board=Array.from({length:20},()=>Array(10).fill(null));
 q.run.active={type:'I',size:4,x:1,y:0,cells:Array.from({length:4},(_,y)=>({x:0,y,id:950+y,type:'I',mask:0}))};
 q.action('drop');
 const g=h.nodes.get('board').getContext('2d'),calls=[];
 for(const method of ['fill','fillRect'])g[method]=()=>calls.push({method,colour:g.fillStyle,alpha:g.globalAlpha});
 q.draw();
 const streaks=calls.flatMap((c,i)=>c.method==='fillRect'&&c.colour==='#c2fff2'?[i]:[]);
 const tileColours=new Set(['#77c9f4','#ffd86e','#caa0ef','#82d89b','#f58db8','#ffb09a','#9fd8f6']);
 const tiles=calls.flatMap((c,i)=>c.method==='fill'&&tileColours.has(c.colour)&&c.alpha===1?[i]:[]);
 assert.equal(streaks.length,4,'the real hard drop emits all four trails');
 assert.equal(tiles.length,8,'newly locked and next active piece both draw solid blocks');
 assert.ok(Math.max(...streaks)<Math.min(...tiles),'mint streaks must not paint over any solid block');
 h.step(200);calls.length=0;q.draw();
 assert.ok(!calls.some(c=>c.method==='fillRect'&&c.colour==='#c2fff2'),'drop trail expires normally');
});
