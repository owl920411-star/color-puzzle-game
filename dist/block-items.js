/* BLOCK ITEMS V2. Pure board operations: no score, timers, DOM or global game reference.
 * Application and regression tests use these SAME functions.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BlockItems=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const W=10,H=20,LIMIT=2;
const ITEMS=Object.freeze({
 oasis:{kind:'good',unlock:1,label:'오아시스 수로',icon:'≈',color:'#63e6d2',help:'줄 완성 후 남아 있는 가장 아래 적재 줄 하나를 씻어냅니다.'},
 mummy:{kind:'bad',unlock:2,label:'미라의 붕대',icon:'M',color:'#dbcbaa',help:'첫 줄 완성은 붕대만 벗깁니다. 미라가 남은 줄을 다시 채우면 제거됩니다.'},
 sunburst:{kind:'good',unlock:3,label:'태양 폭발',icon:'☀',color:'#ffd76b',help:'줄 완성 시 원래 위치 중심 3×3 영역의 고정 블록을 파괴합니다.'},
 scarabCurse:{kind:'bad',unlock:4,label:'스카라베 증식',icon:'S',color:'#b699d3',duration:12000,help:'착지 후 12초. 늦으면 안전한 인접 빈칸에 블록 하나가 생깁니다. 한 번만 발동합니다.'},
 spear:{kind:'good',unlock:5,label:'호루스의 창',icon:'↓',color:'#96dcff',help:'줄 완성 시 같은 열 아래쪽의 고정 블록을 최대 6개 파괴합니다.'},
 seal:{kind:'bad',unlock:6,label:'사암 봉인',icon:'▣',color:'#d08d9b',duration:15000,help:'착지 후 15초. 늦으면 인접 일반 블록 최대 2개가 두 번 제거하는 석화 블록으로 바뀝니다.'}
});
function assertBoard(b){if(!Array.isArray(b)||b.length!==H||b.some(r=>!Array.isArray(r)||r.length!==W))throw new TypeError('Expected a 10×20 board');}
function clone(b){return b.map(r=>r.map(c=>c?{...c,...(c.special?{special:{...c.special}}:{})}:null));}
function blank(){return Array.from({length:H},()=>Array(W).fill(null));}
function rng(seed){let s=2166136261;for(const c of String(seed))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s+=0x6D2B79F5;let t=Math.imul(s^(s>>>15),s|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function specials(board){const a=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){const cell=board[y][x];if(cell?.special&&ITEMS[cell.special.type])a.push({x,y,cell,s:cell.special});}return a;}
function liveCount(game){const ids=new Set();for(const q of specials(game.board))if(!q.s.failed)ids.add(q.s.id);for(const p of [game.active,game.held,...(game.queue||[])])for(const c of p?.cells||[])if(c.special&&!c.special.failed)ids.add(c.special.id);return ids.size;}
function state(seed){return {enabled:true,serial:0,random:rng(seed),goodStreak:0,badStreak:0,lastKind:null,purify:0,practice:false,stats:{spawned:0,good:0,bad:0,cleared:0,failed:0,removed:0,added:0,armored:0}};}
function attach(p,type,s,generated=false){if(!ITEMS[type]||!p?.cells?.length||p.cells.some(c=>c.special))return false;const c=p.cells[Math.floor(p.cells.length/2)];c.special={type,id:++s.serial,hp:type==='mummy'?2:1,landedAt:null,deadline:0,failed:false,generated};s.stats.spawned++;s.stats[ITEMS[type].kind]++;const k=ITEMS[type].kind;s.goodStreak=k==='good'?(s.lastKind===k?s.goodStreak+1:1):0;s.badStreak=k==='bad'?(s.lastKind===k?s.badStreak+1:1):0;s.lastKind=k;return true;}
function top(board){for(let y=0;y<H;y++)if(board[y].some(Boolean))return y;return H;}
function pick(game,s,level,forceKind=null){if(!s.enabled||level<1||liveCount(game)>=LIMIT)return null;const t=top(game.board);let pool=Object.entries(ITEMS).filter(([,d])=>d.unlock<=level&&(!forceKind||d.kind===forceKind));
 // Automatic mercy applies to the whole pool, not just explicit BAD requests.
 if(t<4||s.badStreak>=2)pool=pool.filter(([,d])=>d.kind==='good');if(!pool.length)return null;
 const weighted=pool.map(([key,d])=>({key,w:d.kind==='good'?(t<6?1.8:1)*(s.goodStreak>=2?.35:1):(t<6?.45:t>11?1.25:1)}));let n=s.random()*weighted.reduce((a,v)=>a+v.w,0);for(const v of weighted){n-=v.w;if(n<=0)return v.key;}return weighted[weighted.length-1].key;}
function arm(board,now){for(const q of specials(board))if(q.s.landedAt===null){q.s.landedAt=now;const ms=ITEMS[q.s.type].duration||0;q.s.deadline=ms?now+ms:0;}}
function compact(board,rows){const gone=new Set(rows),out=board.filter((_,i)=>!gone.has(i));while(out.length<H)out.unshift(Array(W).fill(null));return out;}
function lowestRow(board){for(let y=H-1;y>=0;y--)if(board[y].some(Boolean))return y;return -1;}
function resolve(board,rows,now){assertBoard(board);const valid=[...new Set(rows)].filter(y=>Number.isInteger(y)&&y>=0&&y<H&&board[y].every(Boolean)).sort((a,b)=>a-b);let out=clone(board);const completed=new Set(valid),armored=new Set(),events=[],struck=[],orig=new Map();let purified=0,extraRemoved=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(board[y][x])orig.set(board[y][x].id,{x,y});
 const marked=valid.flatMap(y=>board[y].map((cell,x)=>({x,y,cell,s:cell.special}))).filter(q=>q.s&&ITEMS[q.s.type]);
 for(const y of valid)if(board[y].some(c=>c.special?.type==='mummy'&&c.special.hp>1))armored.add(y);
 for(const y of armored)for(let x=0;x<W;x++){const c=out[y][x];if(c.special?.type==='mummy'&&c.special.hp>1)c.special.hp=1;else out[y][x]=null;}
 const erase=(x,y)=>{if(x<0||x>=W||y<0||y>=H||!out[y][x])return false;struck.push({x,y,cell:out[y][x]});out[y][x]=null;extraRemoved++;return true;};
 let flushes=0;
 for(const q of marked){const {x,y,s}=q,d=ITEMS[s.type];if(s.type==='mummy'&&s.hp>1){events.push({type:s.type,status:'wounded',x,y});continue;}
  const timely=!s.failed&&(!s.deadline||now<=s.deadline);if(d.kind==='bad'){if(timely&&!s.generated)purified++;events.push({type:s.type,status:timely&&!s.generated?'purified':'removed',x,y});continue;}
  if(s.type==='oasis'){flushes++;events.push({type:s.type,status:'activated',x,y});}
  if(s.type==='sunburst'){const before=extraRemoved;for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(!completed.has(yy))erase(xx,yy);events.push({type:s.type,status:'activated',x,y,blocks:extraRemoved-before});}
  if(s.type==='spear'){let n=0;for(let yy=y+1;yy<H&&n<6;yy++)if(!completed.has(yy)&&erase(x,yy))n++;events.push({type:s.type,status:'activated',x,y,blocks:n});}
 }
 const scoringRows=valid.filter(y=>!armored.has(y));out=compact(out,scoringRows);
 let flushed=0;while(flushes-->0){const y=lowestRow(out);if(y<0)break;for(let x=0;x<W;x++)if(out[y][x]){extraRemoved++;struck.push({x,y,cell:out[y][x]});}out=compact(out,[y]);flushed++;}
 const falls=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=out[y][x],p=c&&orig.get(c.id);if(p&&p.y!==y)falls.push({x,from:p.y,to:y,cell:c});}
 return {board:out,scoringRows,armoredRows:[...armored],falls,events,purified,extraRemoved,flushed,struck};
}
function activeCells(p){return new Set((p?.cells||[]).map(c=>(p.y+c.y)*W+p.x+c.x));}
function fits(board,p){return !p||p.cells.every(c=>{const x=p.x+c.x,y=p.y+c.y;return x>=0&&x<W&&y>=0&&y<H&&!board[y][x];});}
function expire(game,s,now){const board=game.board,protectedCells=activeCells(game.active),events=[];
 for(const q of specials(board)){const {x,y,cell}=q,sp=cell.special;if(!sp.deadline||sp.failed||now<sp.deadline)continue;sp.failed=true;s.stats.failed++;let changed=0;
  if(sp.type==='scarabCurse'){
   const opts=[];for(const [dx,dy] of [[-1,0],[1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<6||yy>=H||board[yy][xx]||protectedCells.has(yy*W+xx))continue;if(yy<H-1&&!board[yy+1][xx])continue;if(board[yy].filter(Boolean).length>=W-1)continue;opts.push({x:xx,y:yy});}
   if(opts.length){const p=opts[Math.floor(s.random()*opts.length)];board[p.y][p.x]={type:'J',id:++game.serial,mask:0,desert:true,curseSpawn:true};changed=1;s.stats.added++;}
  }else if(sp.type==='seal'){
   const room=Math.max(0,LIMIT-liveCount(game));for(const [dx,dy] of [[-1,0],[1,0],[0,1],[0,-1]]){if(changed>=Math.min(2,room))break;const xx=x+dx,yy=y+dy,c=board[yy]?.[xx];if(xx<0||xx>=W||yy<6||yy>=H||!c||c.special||protectedCells.has(yy*W+xx))continue;c.special={type:'mummy',id:++s.serial,hp:2,landedAt:now,deadline:0,failed:false,generated:true};changed++;s.stats.armored++;}
  }
  events.push({type:sp.type,status:changed?'failed':'blocked',x,y,blocks:changed});
 }
 return events;
}
function strip(game){for(const q of specials(game.board))delete q.cell.special;for(const p of [game.active,game.held,...(game.queue||[])])for(const c of p?.cells||[])delete c.special;}
function removeBottom(board,p=null){assertBoard(board);const y=lowestRow(board);if(y<0)return null;const out=compact(clone(board),[y]);return fits(out,p)?out:null;}
function regression(samples=300){const random=rng('block-v2-check'),failures=[];let checked=0;for(let n=0;n<samples;n++){const board=blank();let id=0;for(let y=8;y<H;y++)for(let x=0;x<W;x++)if(random()<.65)board[y][x]={id:++id,type:'I',mask:0};board[15]=Array.from({length:W},()=>({id:++id,type:'I',mask:0}));const type=Object.keys(ITEMS)[n%6];board[15][4].special={id:1,type,hp:type==='mummy'?2:1,deadline:0,failed:false};const before=JSON.stringify(board);const result=resolve(board,[15],0);checked++;try{assertBoard(result.board);const ids=result.board.flat().filter(Boolean).map(c=>c.id);if(new Set(ids).size!==ids.length)throw Error('duplicate cell');if(before!==JSON.stringify(board))throw Error('input mutated');if(result.scoringRows.length!==(type==='mummy'?0:1))throw Error('line credit');}catch(e){failures.push({case:n,error:e.message});}}
 return {cases:checked,failures,pass:failures.length===0,scope:'보드 연산 회귀 검사. 인간 생존시간·재미·무한생존은 검증하지 않습니다.'};}
return {ITEMS,LIMIT,blank,clone,rng,state,attach,pick,top,specials,liveCount,arm,resolve,expire,strip,removeBottom,fits,regression};
});
