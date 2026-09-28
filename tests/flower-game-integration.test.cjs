'use strict';
// Real controller/clear path and preview script; DOM, canvas drawing and time are substitutes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
const random=()=>.372,types=['Z','I','O','S','T'];

function clearInGame(pixelRatio,lines){
 const h=boot({FX:'real',pixelRatio,random});h.q.start();
 h.q.run.board=Array.from({length:20},()=>Array(10).fill(null));
 for(let row=20-lines;row<20;row++)for(let col=0;col<10;col++)if(col!==4)
  h.q.run.board[row][col]={id:1000+row*10+col,type:types[(row+col)%5],mask:0};
 h.q.run.active={type:'I',size:4,x:4,y:0,cells:Array.from({length:4},(_,y)=>({x:0,y,id:2000+y,type:types[(20+y)%5],mask:0}))};
 assert.equal(h.q.action('drop'),true);
 assert.equal(h.q.state,'clearing','hard drop enters the real line-clear transaction');
 h.step(240);
 assert.equal(h.q.run.lines,lines,'actual controller credits the completed lines');
 return h;
}

function openPreview(lines){
 const draw=new Proxy({},{get:()=>()=>{}}),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{getContext:()=>draw,width:360,height:720,value:'bottom'});return nodes.get(id);};
 let pending=null,fx=null;
 const env={document:{getElementById:node,createElement:()=>({getContext:()=>draw})},performance:{now:()=>0},Math:Object.assign(Object.create(Math),{random}),requestAnimationFrame:f=>{pending=f;return 1;},cancelAnimationFrame:()=>{pending=null;}};
 env.window=env;
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/crayon-bloom-fx.js'),'utf8'),env);
 const Actual=env.CrayonBloomFX;env.CrayonBloomFX=class extends Actual{constructor(...args){super(...args);fx=this;}};
 const html=fs.readFileSync(require.resolve('../dist/qa/flower-preview.html'),'utf8');
 const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInNewContext(inline,env);
 node(lines===4?'four':'one').onclick();
 function frame(time){if(pending){const f=pending;pending=null;f(time);}}
 frame(180); // The real preview emits its rows after the 180 ms lead-in.
 return {get fx(){return fx;},frame};
}

function snapshot(f){
 return Array.from(f.particles,p=>({col:p.col,row:p.row,side:Math.sign(p.launchVX),shape:p.shape,
  sprite:[...f.sprites].find(([,sprite])=>sprite===p.sprite)[0],age:p.age,size:p.size,
  angle:p.angle,tilt:p.tilt,life:p.life,projection:{...f.project(p)}}))
  .sort((a,b)=>a.row-b.row||a.col-b.col||a.side-b.side);
}

function assertCentered(f){
 let weight=0,moment=0;
 for(const p of f.particles){const q=f.project(p),size=p.size*q.scale;
  if(q.x+size<0||q.x-size>360||q.y-size>720)continue;
  const w=size*size;weight+=w;moment+=(q.x-180)*w;
 }
 if(weight)assert.ok(Math.abs(moment/weight)<1e-8,'visible flowers remain balanced around the logical board center');
}

for(const pixelRatio of [1,2,3])for(const lines of [1,4])test(`real ${lines}-line clear matches approved preview at DPR ${pixelRatio}`,()=>{
 const game=clearInGame(pixelRatio,lines),preview=openPreview(lines);
 assert.equal(game.nodes.get('board').width,360*Math.min(pixelRatio,2),'real fit() configures the high-resolution backing canvas');
 assert.equal(game.nodes.get('board').height,720*Math.min(pixelRatio,2));
 assert.equal(game.fx.particles.length,lines*30);
 for(let row=20-lines;row<20;row++)for(let col=0;col<10;col++){
  const group=game.fx.particles.filter(p=>p.row===row&&p.col===col);
  assert.equal(group.length,3,'each genuinely cleared cell emits exactly three flowers/petals');
  for(const p of group){assert.equal(game.fx.project(p).x,(col+.5)*36);assert.equal(game.fx.project(p).y,(row+.5)*36);}
 }
 assert.deepEqual(snapshot(game.fx),snapshot(preview.fx),'actual clear and preview start with identical artwork and geometry');
 for(let frame=1;frame<=50;frame++){
  game.q.update(16);game.q.draw();preview.frame(180+frame*16);
  assert.deepEqual(snapshot(game.fx),snapshot(preview.fx),`same complete projected motion at ${frame*16} ms`);
  assertCentered(game.fx);
 }
 assert.equal(game.fx.particles.length,0,'both paths fully finish the effect');
});
