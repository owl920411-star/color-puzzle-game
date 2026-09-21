(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.GlassEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.GlassLab=api;})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
// Rows are bottom-aligned. # is plain glass; 1..f are the existing crack masks.
const stages=[
 {id:'gap',title:'첫 번째 틈',chapter:'배치',rows:['######....'],pieces:['I','O'],goal:{lines:1},par:1,hint:'가로로 긴 조각을 오른쪽 네 칸에 맞춰보세요.'},
 {id:'vertical',title:'세로의 해답',chapter:'배치',rows:['####.#####','####.#####','####.#####','####.#####'],pieces:['I','O'],goal:{lines:4},par:1,hint:'긴 조각을 한 번 회전하세요. 다섯 번째 열이 비어 있어요.'},
 {id:'twins',title:'두 번의 설계',chapter:'배치',rows:['....######','....######'],pieces:['O','O','I'],goal:{lines:2},par:2,hint:'왼쪽의 네 칸짜리 공간을 정사각형 두 개로 나누어 채워보세요.'},
 {id:'path',title:'균열의 입구',chapter:'균열',rows:['..68......','..5.......','##1###....'],pieces:['I','O'],goal:{extra:3},par:1,hint:'줄 바깥으로 이어진 흰 선이 세 조각을 연결하고 있어요. 아래 줄을 완성해보세요.'},
 {id:'fork',title:'두 갈래 공명',chapter:'균열',rows:['2c.....68.','.5.....5..','#1.....1##'],pieces:[{type:'I',masks:[10,10,10,10]},'I'],goal:{extra:9},par:2,hint:'아래 줄은 다섯 칸이 비어 있어요. 첫 I를 세로로 일곱 번째 열에 두고, 두 번째 I로 남은 네 칸을 채워보세요.'},
 {id:'turn',title:'균열을 돌려라',chapter:'균열',rows:['......a8..','####..####'],pieces:[{type:'O',masks:[6,10,1,0],turns:3}],goal:{extra:1},par:1,hint:'정사각형도 회전하면 흰 선의 방향이 바뀝니다. 한 번 터치하고 가운데 두 칸으로 내려보세요.'},
 {id:'fall',title:'낙하의 순서',chapter:'연쇄',rows:['##........','######....','..########'],pieces:['I','O'],goal:{chain:2,lines:2},par:1,hint:'가장 아래 줄부터 채울 필요는 없어요. 오른쪽 위 빈틈을 채우면 왼쪽 유리가 떨어집니다.'},
 {id:'double',title:'겹쳐진 해답',chapter:'연쇄',rows:['####......','..##..####','####..####','##..######'],pieces:['O','I'],goal:{chain:2,lines:3},par:1,hint:'정사각형을 가운데 틈에 넣어보세요. 첫 파쇄 뒤 두 줄이 함께 완성됩니다.'},
 {id:'prepare',title:'한 수 앞의 공명',chapter:'연쇄',rows:['..#.......','..####....','...#######'],pieces:['O','I','O'],goal:{chain:2,lines:2},par:2,hint:'먼저 정사각형으로 왼쪽 아래를 받쳐두세요. 다음 긴 조각은 오른쪽 빈틈으로 갑니다.'}
];
function create(index){
 const stage=stages[index];if(!stage)throw new RangeError('Unknown lab stage');
 const g=new E.Game('LAB-1-'+stage.id,'lab');g.board=E.blank();g.serial=0;g.active=null;g.over=false;g.held=null;
 stage.rows.forEach((row,i)=>{if(row.length!==E.W)throw new Error('Invalid lab row');[...row].forEach((c,x)=>{if(c!=='.')g.board[E.H-stage.rows.length+i][x]={type:c==='#'?'J':'I',mask:c==='#'?0:parseInt(c,16),id:++g.serial};});});
 g.queue=stage.pieces.map(spec=>{const d=typeof spec==='string'?{type:spec}:spec,type=d.type,size=type==='I'?4:type==='O'?2:3;let cells=E.SHAPES[type].map(([x,y],i)=>({x,y,type,id:++g.serial,mask:d.masks?.[i]||0}));for(let r=0;r<(d.turns||0);r++)cells=cells.map(c=>({...c,x:size-1-c.y,y:c.x,mask:E.maskRotate(c.mask)}));return{type,size,x:type==='O'?4:3,y:0,cells};});
 g.spawn=function(){this.active=this.queue.shift()||null;this.holdUsed=false;if(!this.active)return false;this.active.x=this.active.type==='O'?4:3;this.active.y=0;if(!this.fits(this.active))this.over=true;return!this.over;};
 g.hold=()=>false;g.spawn();return g;
}
function objectives(stage,g){const goal=stage.goal;return[['lines','줄',g.lines],['extra','균열 파쇄',g.extra],['chain','연쇄',g.maxChain]].filter(([key])=>goal[key]).map(([key,label,value])=>({key,label,value,target:goal[key]}));}
function cleared(stage,g){return objectives(stage,g).every(o=>o.value>=o.target);}
function stars(stage,g){if(!cleared(stage,g))return 0;return 1+Number(g.pieces<=stage.par)+Number(g.board.every(row=>row.every(c=>!c)));}
function unlocked(index,progress){return index===0||Number(progress[stages[index-1]?.id]?.stars)>0;}
function record(progress,stage,g){const previous=progress[stage.id]||{},count=stars(stage,g);if(!count)return previous;const next={stars:Math.max(Number(previous.stars)||0,count),pieces:Math.min(Number(previous.pieces)||Infinity,g.pieces),chain:Math.max(Number(previous.chain)||0,g.maxChain)};progress[stage.id]=next;return next;}
function total(progress){return stages.reduce((n,s)=>n+Math.max(0,Math.min(3,Number(progress[s.id]?.stars)||0)),0);}
return{stages,create,objectives,cleared,stars,unlocked,record,total};
});
