(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GlassProgress=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const levels=[0,100,260,500,850,1300],titles=['입문','탐험가','설계자','숙련자','전문가','마스터'];
function mastery(value){const xp=Math.min(1000000000,Math.max(0,Math.floor(Number(value)||0)));let index=0;while(index<levels.length-1&&xp>=levels[index+1])index++;return{xp,level:index+1,title:titles[index],next:levels[index+1]??null,progress:index===levels.length-1?1:(xp-levels[index])/(levels[index+1]-levels[index])};}
function missions(material,difficulty){const n=difficulty==='calm'?0:difficulty==='challenge'?2:1;return[
 {key:'pieces',label:'조각 배치',target:[4,6,10][n],unit:'개',xp:15},
 {key:'shards',label:material==='glass'?'유리 제거':'같은 색 제거',target:[8,16,24][n],unit:'칸',xp:30},
 {key:'score',label:'점수 도전',target:[300,600,1000][n],unit:'점',xp:45}
];}
function evaluate(goals,game){const done=goals.map(g=>(Number(game[g.key])||0)>=g.target);const count=done.filter(Boolean).length;return{done,count,xp:goals.reduce((sum,g,i)=>sum+(done[i]?g.xp:0),0)+(count===goals.length&&goals.length?25:0)};}
function strategy(board,material,sandTarget=10){
 if(material==='glass'){let best=null;for(let y=0;y<board.length;y++){const count=board[y].filter(Boolean).length;if(count>=6&&(!best||count>best.count))best={count,y};}return best?{text:`한 줄 완성까지 ${10-best.count}칸`,cells:board[best.y].map((c,x)=>c?{x,y:best.y}:null).filter(Boolean)}:null;}
 const seen=new Set();let best=null;
 for(let y=0;y<20;y++)for(let x=0;x<10;x++){
  const first=board[y][x];if(!first||seen.has(y*10+x))continue;const cells=[{x,y}];seen.add(y*10+x);
  for(let i=0;i<cells.length;i++)for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=cells[i].x+dx,ny=cells[i].y+dy;if(nx<0||nx>=10||ny<0||ny>=20||seen.has(ny*10+nx)||board[ny][nx]?.paint!==first.paint)continue;seen.add(ny*10+nx);cells.push({x:nx,y:ny});}
  const min=Math.min(...cells.map(c=>c.x)),max=Math.max(...cells.map(c=>c.x)),value=cells.length,target=material==='sand'?Math.max(10,Number(sandTarget)||10):material==='water'?10:material==='jelly'?8:10;
  if(value<target&&value>=target-4&&(!best||value>best.value))best={value,cells,text:material==='sand'?`붕괴 준비 ${value}/${target}칸 · ${target-value}칸만 더 연결하면 SAND BURST`:`${material==='water'?'물':'젤리'} ${value}/${target}칸 · ${target-value}칸 더 연결`};
 }
 return best;
}
return{mastery,missions,evaluate,strategy};
});
