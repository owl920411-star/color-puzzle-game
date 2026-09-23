/* Endless 1: ordinary line clears. Legacy fracture/stage rules are never called. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));
  else root.EndlessRules=factory(root.GlassEngine);
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
const LINE_POINTS=[0,100,300,500,800];
function linePlan(board){
  const rows=[];for(let y=0;y<E.H;y++)if(board[y].every(Boolean))rows.push(y);
  if(!rows.length)return null;
  return{rows,cells:rows.flatMap(y=>board[y].map((cell,x)=>({x,y,cell,depth:0}))),extra:0};
}
function clearRows(board,rows){
  const removed=new Set(rows),falls=[];let target=E.H-1;
  // Shift whole rows, not individual columns: holes and floating cells remain intact.
  for(let y=E.H-1;y>=0;y--)if(!removed.has(y)){
    const row=board[y].slice();board[target]=row;
    if(y!==target)for(let x=0;x<E.W;x++)if(row[x])falls.push({x,from:y,to:target,cell:row[x]});
    target--;
  }
  while(target>=0)board[target--]=Array(E.W).fill(null);
  return falls;
}
class NormalGame extends E.Game{
  constructor(seed){super(seed,'endless','glass','standard');this.combo=0;this.maxCombo=0;}
  makePiece(){const p=super.makePiece();for(const c of p.cells)c.mask=0;return p;}
  rotateDir(dir=1){
    if(!this.active)return false;const p=this.active,n=((dir%4)+4)%4;if(!n)return false;
    let cells=p.cells.map(c=>({...c}));
    for(let r=0;r<n;r++)cells=cells.map(c=>({...c,x:p.size-1-c.y,y:c.x,mask:0}));
    const next={...p,cells};
    for(const[dx,dy]of[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]])if(this.fits(next,dx,dy)){next.x+=dx;next.y+=dy;this.active=next;return true;}
    return false;
  }
  rotate(){return this.rotateDir(1);}
  get level(){return 1+Math.floor(this.lines/10);}
  resolve(plan){
    const level=this.level,count=plan.rows.length;
    if(!count)return{falls:[],gain:0,base:0,bonus:0};
    const falls=clearRows(this.board,plan.rows);
    this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);
    const base=(LINE_POINTS[count]||800+(count-4)*300)*level;
    const bonus=50*Math.max(0,this.combo-1)*level,gain=base+bonus;
    this.score+=gain;this.lines+=count;this.shards+=count*E.W;this.maxChain=this.maxCombo;
    return{falls,gain,base,bonus,level,combo:this.combo};
  }
  noClear(){this.combo=0;}
}
return{NormalGame,linePlan,clearRows,LINE_POINTS,version:1};
});
