const fs=require('node:fs'),E=require('../dist/engine.js');
const levels=Array.from({length:30},(_,i)=>E.generate(i+1));
function metrics(p){let left=p.arrows.slice(),depth=0;const legal=left.filter(a=>!E.blocker(a,left,p.n)).length;while(left.length){const ids=new Set(left.filter(a=>!E.blocker(a,left,p.n)).map(a=>a.id));if(!ids.size)throw Error('cycle');left=left.filter(a=>!ids.has(a.id));depth++;}return{count:p.arrows.length,depth,legal};}
for(let stage=31;stage<=100;stage++){const target=26+Math.floor((stage-31)/10),n=stage<=50?11:12;let best=null,score=-Infinity;
for(let seed=1;seed<=3000;seed++){const p=E.procedural(stage,seed*2833+stage*977,{n,density:.95,minLength:2,lengthRange:4});if(p.arrows.length<target)continue;p.arrows=p.arrows.slice(0,target);const m=metrics(p);if(m.depth<6||m.legal>10)continue;const rank=m.depth*10-m.legal*5;if(rank>score){score=rank;best=p;}if(seed>=100&&best&&metrics(best).depth>=7)break;}
if(!best)throw Error('No candidate '+stage);levels.push(best);}
fs.writeFileSync('dist/levels.js',`/* 100 fixed solvable layouts. */\n(function(root){const levels=${JSON.stringify(levels)};if(typeof module!=='undefined')module.exports=levels;else root.JellyLevels=levels;})(typeof window!=='undefined'?window:globalThis);\n`);
fs.writeFileSync('tests/opening-metrics.json',JSON.stringify(levels.map((p,i)=>({stage:i+1,size:p.n,...metrics(p)})),null,2)+'\n');console.log('Saved',levels.length,'stages; stage 100:',metrics(levels[99]));
