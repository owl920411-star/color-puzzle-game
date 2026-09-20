/* Original Arrow Flow puzzle engine. Paths are stored tail to head. */
(function(root){
'use strict';
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
const key=([x,y])=>x+','+y;
const inside=(p,n)=>p[0]>=0&&p[1]>=0&&p[0]<n&&p[1]<n;
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function direction(a){let h=a.cells.at(-1),p=a.cells.at(-2);return[h[0]-p[0],h[1]-p[1]];}
function blocker(a,arrows,n){const d=direction(a),h=a.cells.at(-1);let p=[h[0]+d[0],h[1]+d[1]];const occupied=new Map();for(const b of arrows)if(b.id!==a.id)for(const c of b.cells)occupied.set(key(c),b.id);while(inside(p,n)){if(occupied.has(key(p)))return{at:p,id:occupied.get(key(p))};p=[p[0]+d[0],p[1]+d[1]];}return null;}
function procedural(stage,seed=7129+stage*9011,options={}){const n=options.n??Math.min(11,8+Math.floor((stage-1)/8)),random=rng(seed),used=new Set(),arrows=[];const target=Math.floor(n*n*(options.density??(stage===1?.65:.88)));let attempts=0;
while(used.size<target&&attempts++<2400){let h=[Math.floor(random()*n),Math.floor(random()*n)],d=dirs[Math.floor(random()*4)];if(used.has(key(h)))continue;let ray=new Set(),p=[h[0]+d[0],h[1]+d[1]],clear=true;while(inside(p,n)){ray.add(key(p));if(used.has(key(p))){clear=false;break;}p=[p[0]+d[0],p[1]+d[1]];}if(!clear)continue;
let prev=[h[0]-d[0],h[1]-d[1]];if(!inside(prev,n)||used.has(key(prev)))continue;let cells=[h,prev],local=new Set(cells.map(key)),max=(options.minLength??3)+Math.floor(random()*(options.lengthRange??(stage<4?3:7))),last=[-d[0],-d[1]];
while(cells.length<max){const end=cells.at(-1),opts=dirs.map(v=>({v,p:[end[0]+v[0],end[1]+v[1]],rank:random()+(v[0]===last[0]&&v[1]===last[1]?.28:0)})).filter(o=>inside(o.p,n)&&!used.has(key(o.p))&&!local.has(key(o.p))&&!ray.has(key(o.p))).sort((a,b)=>b.rank-a.rank);if(!opts.length)break;const pick=opts[0];cells.push(pick.p);local.add(key(pick.p));last=pick.v;}
cells.reverse();const a={id:arrows.length,cells,color:arrows.length%4};arrows.push(a);for(const c of cells)used.add(key(c));}
return{n,arrows};}
const curated=typeof module!=='undefined'?require('./levels.js'):root.JellyLevels;
function generate(stage){return JSON.parse(JSON.stringify(curated[stage-1]));}
function pick(x,y,arrows,n){const s=416/n,gx=(x-32)/s,gy=(y-32)/s,c=[Math.floor(gx),Math.floor(gy)];if(!inside(c,n))return null;return arrows.find(a=>a.cells.some(p=>p[0]===c[0]&&p[1]===c[1]))?.id??null;}
const isEvent=stage=>Number.isInteger(stage)&&stage>=1&&stage<=100&&stage%5===0;
function eventType(stage){if(!isEvent(stage))return 'normal';if(stage===100)return 'finale';if(stage===50)return 'layers';return ['rescue','key','ice','twins','royal'][(stage/5-1)%5];}
function eventLocked(stage,a,arrows){const type=eventType(stage);if(a.id!==0)return false;if(['rescue','royal','finale'].includes(type))return arrows.some(b=>b.id!==0);if(type==='key'){const keyId=generate(stage).arrows.at(-1).id;return arrows.some(b=>b.id===keyId);}if(type==='ice'){return arrows.some(b=>b.id!==0&&b.cells.some(p=>a.cells.some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1)));}return false;}
function moveGroup(stage,a,arrows){return eventType(stage)==='twins'&&a.id<2?arrows.filter(b=>b.id<2):[a];}
function moveBlocker(stage,a,arrows,n){const group=moveGroup(stage,a,arrows),ids=new Set(group.map(b=>b.id));for(const b of group){const hit=blocker(b,arrows.filter(c=>!ids.has(c.id)||c.id===b.id),n);if(hit)return hit;}return null;}
function wave(stage,index){const p=generate(index===2?(stage===100?99:stage+1):stage);if(index===2)for(const a of p.arrows)a.cells=a.cells.map(([x,y])=>[p.n-1-x,p.n-1-y]);return p;}
const api={generate,procedural,blocker,direction,inside,pick,isEvent,eventType,eventLocked,moveGroup,moveBlocker,wave};if(typeof module!=='undefined')module.exports=api;else root.Puzzle=api;
})(typeof window!=='undefined'?window:globalThis);
