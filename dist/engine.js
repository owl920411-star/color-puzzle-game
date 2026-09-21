(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GlassEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const W=10,H=20,DIRS=[[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]];
const SHAPES={I:[[0,1],[1,1],[2,1],[3,1]],O:[[0,0],[1,0],[0,1],[1,1]],T:[[1,0],[0,1],[1,1],[2,1]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]]};
function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function random(seed){let n=hash(seed);return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function maskRotate(m){return((m<<1)&15)|(m>>3);}
function blank(){return Array.from({length:H},()=>Array(W).fill(null));}
function clearPlan(board){const rows=[];for(let y=0;y<H;y++)if(board[y].every(Boolean))rows.push(y);if(!rows.length)return null;
 const seen=new Set(),cells=[];for(const y of rows)for(let x=0;x<W;x++){const k=y*W+x;seen.add(k);cells.push({x,y,depth:0,cell:board[y][x]});}
 for(let i=0;i<cells.length;i++){const a=cells[i];for(const[dx,dy,bit,opposite]of DIRS){const x=a.x+dx,y=a.y+dy;if(x<0||x>=W||y<0||y>=H||seen.has(y*W+x))continue;const b=board[y][x];if(b&&(a.cell.mask&bit)&&(b.mask&opposite)){seen.add(y*W+x);cells.push({x,y,depth:a.depth+1,cell:b});}}}
 return{rows,cells,extra:cells.length-rows.length*W};}
function applyClear(board,plan){for(const c of plan.cells)board[c.y][c.x]=null;const falls=[];for(let x=0;x<W;x++){let target=H-1;for(let y=H-1;y>=0;y--){if(board[y][x]){const cell=board[y][x];board[y][x]=null;board[target][x]=cell;if(target!==y)falls.push({x,from:y,to:target,cell});target--;}}}return falls;}
// Each move strictly increases height index, so settling always terminates.
function groups(board){
 const seen=new Set(),result=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(!board[y][x]||seen.has(y*W+x))continue;
  const cells=[{x,y,cell:board[y][x],depth:0}];seen.add(y*W+x);
  for(let i=0;i<cells.length;i++)for(const [dx,dy]of DIRS){const nx=cells[i].x+dx,ny=cells[i].y+dy;
   if(nx<0||nx>=W||ny<0||ny>=H||seen.has(ny*W+nx)||!board[ny][nx]||board[ny][nx].paint!==board[y][x].paint)continue;
   seen.add(ny*W+nx);cells.push({x:nx,y:ny,cell:board[ny][nx],depth:0});
  }
  result.push(cells);
 }
 return result;
}
function materialPlan(board,material='glass',sandTarget=10){
 if(material==='glass')return clearPlan(board);
 const target=Math.max(10,Number(sandTarget)||10);const eligible=groups(board).filter(cells=>cells.length>=(material==='sand'?target:material==='water'?10:8));
 if(!eligible.length)return null;
 const cells=eligible.flat();return{rows:[],cells,extra:cells.length,groups:eligible.length};
}
function settleStep(board,material,step=0){
 const moves=[];
 if(material==='glass')return moves;
 if(material==='jelly'){
  const clusters=groups(board).sort((a,b)=>Math.max(...b.map(c=>c.y))-Math.max(...a.map(c=>c.y)));
  for(const cells of clusters){
   const own=new Set(cells.map(c=>c.y*W+c.x));
   if(!cells.every(c=>c.y+1<H&&(!board[c.y+1][c.x]||own.has((c.y+1)*W+c.x))))continue;
   for(const c of cells)board[c.y][c.x]=null;
   for(const c of cells){board[c.y+1][c.x]=c.cell;moves.push({fromX:c.x,from:c.y,x:c.x,to:c.y+1,cell:c.cell});}
  }
  return moves;
 }
 for(let y=H-2;y>=0;y--)for(let n=0;n<W;n++){
  const x=step%2?W-1-n:n,cell=board[y][x];if(!cell)continue;
  let target=!board[y+1][x]?x:null;
  const dirs=(cell.id+step)%2?[-1,1]:[1,-1];
  if(target===null)for(const dir of dirs){const nx=x+dir;if(nx>=0&&nx<W&&!board[y+1][nx]&&(material!=='sand'||!board[y][nx])){target=nx;break;}}
  if(target===null&&material==='water'){
   const paths=[];
   for(const dir of dirs)for(let d=1;d<W;d++){const nx=x+dir*d;if(nx<0||nx>=W||board[y][nx])break;if(!board[y+1][nx]){paths.push({x:nx,d});break;}}
   paths.sort((a,b)=>a.d-b.d);if(paths.length)target=paths[0].x;
  }
  if(target!==null){board[y][x]=null;board[y+1][target]=cell;moves.push({fromX:x,from:y,x:target,to:y+1,cell});}
 }
 return moves;
}
class Game{
 constructor(seed='glass',mode='sprint',material='glass',difficulty='standard'){this.difficulty=['calm','standard','challenge'].includes(difficulty)?difficulty:'standard';this.material=['glass','sand','water','jelly'].includes(material)?material:'glass';this.seed=String(seed);this.mode=mode;this.rng=random(seed);this.bag=[];this.queue=[];this.board=blank();this.serial=0;this.score=0;this.lines=0;this.shards=0;this.extra=0;this.maxChain=0;this.pieces=0;this.held=null;this.holdUsed=false;this.over=false;this.sandColors=2;for(let i=0;i<4;i++)this.queue.push(this.makePiece());if(this.difficulty==='challenge')this.prepareChallenge();this.spawn();}
 prepareChallenge(){
  const offset=hash(this.seed+'-terrain')%W;
  for(let y=H-3;y<H;y++)for(let x=0;x<W;x++){
   if(this.material==='glass'&&x===(offset+(H-y)*3)%W)continue;
   if(this.material!=='glass'&&y===H-3&&(x+offset)%3===0)continue;
   this.board[y][x]={id:++this.serial,type:'J',mask:0,paint:(x+y*2+offset)%this.colorCount};
  }
  if(this.material!=='glass')for(let step=0;step<H*W;step++)if(!settleStep(this.board,this.material,step).length)break;
 }
 makePiece(){if(!this.bag.length){this.bag=Object.keys(SHAPES);for(let i=6;i>0;i--){const j=Math.floor(this.rng()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}}
 const type=this.bag.pop(),masks=[3,6,9,12,5,10,15],paint=this.material==='glass'?undefined:Math.floor(this.rng()*this.colorCount);return{type,size:type==='I'?4:type==='O'?2:3,x:3,y:0,cells:SHAPES[type].map(([x,y])=>({x,y,mask:this.rng()<.66?masks[Math.floor(this.rng()*masks.length)]:0,id:++this.serial,type,...(paint===undefined?{}:{paint,mask:0})}))};}
 spawn(){this.active=this.queue.shift();this.queue.push(this.makePiece());this.active.x=this.active.type==='O'?4:3;this.active.y=0;this.holdUsed=false;if(!this.fits(this.active))this.over=true;return!this.over;}
 fits(p,dx=0,dy=0){return p.cells.every(c=>{const x=p.x+c.x+dx,y=p.y+c.y+dy;return x>=0&&x<W&&y>=0&&y<H&&!this.board[y][x];});}
 move(dx,dy=0){if(!this.active||!this.fits(this.active,dx,dy))return false;this.active.x+=dx;this.active.y+=dy;return true;}
 rotate(){if(!this.active)return false;const p=this.active;const next={...p,cells:p.cells.map(c=>({...c,x:p.size-1-c.y,y:c.x,mask:maskRotate(c.mask)}))};for(const[dx,dy]of[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]])if(this.fits(next,dx,dy)){next.x+=dx;next.y+=dy;this.active=next;return true;}return false;}
 dropDistance(){if(!this.active)return 0;let d=0;while(this.fits(this.active,0,d+1))d++;return d;}
 hold(){if(this.holdUsed||!this.active)return false;const p=this.active;p.x=3;p.y=0;if(this.held){this.active=this.held;this.held=p;this.active.x=this.active.type==='O'?4:3;this.active.y=0;if(!this.fits(this.active))this.over=true;}else{this.held=p;this.spawn();}this.holdUsed=true;return true;}
 lock(){if(!this.active)return;for(const c of this.active.cells)this.board[this.active.y+c.y][this.active.x+c.x]={...c};this.pieces++;this.active=null;}
 resolve(plan,chain){let falls=[];if(this.material==='glass')falls=applyClear(this.board,plan);else for(const c of plan.cells)this.board[c.y][c.x]=null;this.lines+=plan.rows.length||(plan.groups||0);this.shards+=plan.cells.length;this.extra+=plan.extra;this.maxChain=Math.max(this.maxChain,chain);const chainMultiplier=this.material==='sand'?Math.pow(2,Math.max(0,chain-1)):chain;const gain=(this.material==='glass'?plan.rows.length*100+plan.extra*30+(plan.rows.length===4?400:0):plan.cells.length*20+(plan.groups||0)*100)*chainMultiplier;this.score+=gain;return{falls,gain};}
 get colorCount(){return this.material==='sand'?Math.max(2,Math.min(3,this.sandColors||2)):4;}
 get level(){return 1+Math.floor(this.lines/8);}
 get gravity(){if(this.stageSpeed)return Math.max(200,920*this.stageSpeed*Math.pow(.96,Math.floor(this.lines/8)));return Math.max(this.difficulty==='calm'?180:this.difficulty==='challenge'?110:130,920*Math.pow(.83,this.level-1)*(this.difficulty==='calm'?1.4:this.difficulty==='challenge'?.76:1));}
 get lockDelay(){return this.difficulty==='calm'?850:650;}
}
function tutorial(){const g=new Game('learn','tutorial');const cell=(mask=0)=>({mask,id:++g.serial,type:'I'});for(let x=0;x<6;x++)g.board[19][x]=cell();g.board[19][3]=cell(1);g.board[18][3]=cell(5);g.board[17][3]=cell(6);g.board[17][4]=cell(8);g.board[18][4]=cell();g.active={type:'I',size:4,x:6,y:0,cells:SHAPES.I.map(([x,y])=>({...cell(),x,y}))};return g;}
return{W,H,DIRS,SHAPES,hash,random,maskRotate,blank,clearPlan,applyClear,groups,materialPlan,settleStep,Game,tutorial};
});
