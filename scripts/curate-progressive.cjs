const fs=require('node:fs'),E=require('../dist/engine.js');
const levels=Array.from({length:4},(_,i)=>E.generate(i+1)),report=[];
function metrics(p){let left=p.arrows.slice(),depth=0;const legal=left.filter(a=>!E.blocker(a,left,p.n)).length;while(left.length){const ids=new Set(left.filter(a=>!E.blocker(a,left,p.n)).map(a=>a.id));if(!ids.size)throw Error('cycle');left=left.filter(a=>!ids.has(a.id));depth++;}return{count:p.arrows.length,depth,legal};}
for(let stage=5;stage<=30;stage++){const target=13+Math.floor((stage-5)/2),n=stage<13?9:stage<23?10:11;let best=null,score=-Infinity;
for(let seed=1;seed<=2500;seed++){const p=E.procedural(stage,seed*1337+stage*799,{n,density:.94,minLength:2,lengthRange:5});if(p.arrows.length<target)continue;p.arrows=p.arrows.slice(0,target);const m=metrics(p);if(m.depth<6||m.legal>7)continue;const rank=m.depth*10-m.legal*5;if(rank>score){score=rank;best=p;}}
if(!best)throw Error('No candidate '+stage);levels.push(best);}
for(let i=0;i<30;i++)report.push({stage:i+1,size:levels[i].n,...metrics(levels[i])});
fs.writeFileSync('dist/levels.js',`/* Fixed progressive layouts. */\n(function(root){const levels=${JSON.stringify(levels)};if(typeof module!=='undefined')module.exports=levels;else root.JellyLevels=levels;})(typeof window!=='undefined'?window:globalThis);\n`);fs.writeFileSync('tests/opening-metrics.json',JSON.stringify(report,null,2)+'\n');console.log(report);
