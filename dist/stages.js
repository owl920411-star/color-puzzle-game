(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GlassStages=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const chapters=['첫 번째 빛','빛의 계단','깊어지는 흐름','반짝이는 길','공명의 문','빛의 파도','별빛 설계','오로라','마지막 균열','백 번째 공명'];
function number(n){return Math.max(1,Math.min(100,Math.floor(Number(n)||1)));}
function config(n,material='glass'){
 n=number(n);const chapter=Math.floor((n-1)/10),boss=n%10===0;
 const base={glass:10,sand:20,water:10,jelly:8}[material]||10;
 const sandTitles=['첫 붕괴','색을 모아라','마지막 한 조각','첫 연쇄','모래 폭포'];const title=material==='sand'&&n<=5?sandTitles[n-1]:chapters[chapter];const sandTarget=material==='sand'&&n<=5?[20,30,40,50,70][n-1]:null;return{number:n,chapter:chapter+1,title,boss:material==='sand'&&n===5?true:boss,seed:`STAGE-v2-${material}-${n}`,target:sandTarget??(base+Math.floor((n-1)*1.6)+(boss?12:0)),sandBurst:material==='sand'?(n<=2?10:12):null,sandColors:material==='sand'?(n<=2?2:3):null,gems:material==='sand'&&n>=6?Math.min(3,1+Math.floor((n-6)/5)):0,speed:Math.max(.48,1-(n-1)*.0045),rows:material==='glass'?Math.min(4,Math.floor((n-1)/20)):0};
}
function progress(raw){const cleared=[...new Set((Array.isArray(raw?.cleared)?raw.cleared:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=100))];let unlocked=1;while(unlocked<100&&cleared.includes(unlocked))unlocked++;return{cleared,unlocked};}
function complete(raw,n){const p=progress(raw);n=number(n);if(n>p.unlocked)return p;if(!p.cleared.includes(n))p.cleared.push(n);return progress(p);}
function prepare(game,c){game.stageSpeed=c.speed;if(game.material==='sand'&&c.sandColors){game.sandColors=c.sandColors;game.queue=game.queue.map(()=>game.makePiece());if(c.gems){for(let k=0;k<c.gems;k++){const x=(c.number*3+k*4)%8+1,y=19-Math.min(3,k);game.board[y][x]={id:++game.serial,type:'O',mask:0,gem:true};}}}for(let y=20-c.rows;y<20;y++){const hole=(c.number+y*3)%10;for(let x=0;x<10;x++)if(x!==hole&&x!==(hole+1)%10)game.board[y][x]={id:++game.serial,type:['I','O','T','S','Z','J','L'][(x+y+c.number)%7],mask:0};}}
return{config,progress,complete,prepare,number};
});
