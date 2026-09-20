const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('../dist/engine.js');
const app=fs.readFileSync(require.resolve('../dist/app.js'),'utf8'),source=app.slice(app.indexOf('function fly('),app.indexOf('\nfunction hint('));
async function run(mode){let frames=[],timer,removed=0,points=[];const g={remove(){removed++},removeAttribute(){},querySelector:()=>({setAttribute(){}})};
const ctx={document:{querySelector:()=>g},Puzzle:E,n:8,epoch:1,matchMedia:()=>({matches:false}),performance:{now:()=>100},requestAnimationFrame:fn=>(frames.push(fn),frames.length),cancelAnimationFrame(){},setTimeout:fn=>(timer=fn,1),clearTimeout(){},console:{error(){}},updateJelly:(g,p)=>{if(mode==='error')throw Error('render interrupted');points.push(p);}};
vm.createContext(ctx);vm.runInContext(source,ctx);const a={id:1,cells:[[0,3],[1,3],[2,3],[3,3]]};let completed=false;const p=ctx.fly(a,1).then(()=>completed=true);
if(mode==='suspended')timer();else{frames.shift()(90);if(mode==='normal'){frames.shift()(89);frames.shift()(1000);}}
await p;assert(completed);assert.equal(removed,1);for(const row of points)for(const point of row)assert(point.every(Number.isFinite));}
(async()=>{await run('normal');await run('error');await run('suspended');console.log('PASS: early/backward frame timestamps, render failure and suspended frames all complete.');})();
