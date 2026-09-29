'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const{ToyLab,seeded}=require('../dist/qa/toy-lab-core.js'),{ToyPainter}=require('../dist/qa/toy-lab-view.js');
GlobalFonts.registerFromPath(require('node:path').join(__dirname,'../dist/qa/toy-assets/gaegu-lab-bold.woff'),'Gaegu');
for(const kind of ['bouncy','fat','coward','doodle'])test(`${kind}: DPR/reduced-motion/extra draw calls do not mutate physics or gameplay RNG`,()=>{
 const results=[];for(const dpr of [1,2,3])for(const reduced of [false,true]){
  const rng=seeded(83);let calls=0;const g=new ToyLab(kind,{rng:()=>{calls++;return rng();},normalRng:seeded(4)}),canvas=createCanvas(360,720),view=new ToyPainter(canvas,kind,reduced);view.resize(dpr);
  const before=JSON.stringify(g.snapshot()),count=calls;for(let i=0;i<3;i++)view.draw(g);assert.equal(JSON.stringify(g.snapshot()),before);assert.equal(calls,count);assert.equal(view.ctx.globalAlpha,1);assert.equal(view.ctx.getTransform().a,dpr);
  g.drop();for(let t=0;t<1200;t+=20){g.update(20);view.draw(g);}
  results.push([g.board,g.lastLock,calls]);
 }for(const r of results.slice(1))assert.deepEqual(r,results[0]);
});
test('renderer shows a distinct initial silhouette/face for all four kinds using identical colour/shape',()=>{
 const hashes=[];for(const kind of ['normal','bouncy','fat','coward','doodle']){
  const canvas=createCanvas(360,720),view=new ToyPainter(canvas,'bouncy',true),cells=[[0,0],[1,0],[0,1],[1,1]];view.piece({type:kind,cells,original:cells,x:1,y:1,colour:'#f58faf',state:'fall',ms:0,dir:0});hashes.push(canvas.toBuffer('image/png').toString('base64'));
 }assert.equal(new Set(hashes).size,5);
});
