const test=require('node:test'),assert=require('node:assert/strict'),E=require('../dist/engine.js');
const cell=(id,paint=0)=>({id,paint,mask:0,type:'O'});
function settle(board,material){for(let i=0;i<400;i++)if(!E.settleStep(board,material,i).length)return i;throw Error('settling did not terminate');}
test('sand tumbles diagonally; water reaches a distant lower gap across an open shelf',()=>{
 const b=E.blank();for(let x=0;x<9;x++)b[19][x]=cell(x+1,1);b[18][4]=cell(20);
 const sand=structuredClone(b),water=structuredClone(b);settle(sand,'sand');settle(water,'water');
 assert.equal(sand[18][4].id,20);assert.equal(water[19][9].id,20);assert.equal(water.flat().filter(Boolean).length,10);
 const blocked=structuredClone(b);blocked[18][6]=cell(21,2);settle(blocked,'water');assert.equal(blocked[18][4].id,20,'water cannot cross occupied cells');
});
test('jelly preserves a connected shape over an empty gap and falls as one when released',()=>{
 const b=E.blank();b[19][4]=cell(1,1);b[18][4]=cell(2);b[18][5]=cell(3);b[17][5]=cell(4);settle(b,'jelly');assert.equal(b[18][5].id,3);
 b[19][4]=null;settle(b,'jelly');assert.equal(b[19][4].id,2);assert.equal(b[19][5].id,3);assert.equal(b[18][5].id,4);
});
test('each material enforces its own connection condition, without ordinary row auto-clears',()=>{
 const b=E.blank();for(let x=0;x<10;x++)b[19][x]=cell(x+1,x<8?0:1);
 assert.equal(E.materialPlan(b,'sand'),null);assert.equal(E.materialPlan(b,'water'),null);assert.equal(E.materialPlan(b,'jelly').cells.length,8);
 for(let x=0;x<10;x++)b[19][x].paint=0;
 for(const m of ['sand','water','jelly']){const p=E.materialPlan(b,m);assert.equal(p.cells.length,10);assert.equal(p.groups,1);}
 const diagonal=E.blank();for(let i=0;i<10;i++)diagonal[19-i][i]=cell(i+1);assert.equal(E.materialPlan(diagonal,'sand'),null);
});
test('material clears score once, remove only eligible groups, then allow a cascade',()=>{
 const g=new E.Game('cascade','sprint','jelly');g.active=null;g.board=E.blank();
 for(let x=0;x<8;x++)g.board[19][x]=cell(x+100,0);
 for(let x=0;x<4;x++){g.board[18][x]=cell(x+200,1);g.board[16][x+4]=cell(x+300,1);}
 let p=E.materialPlan(g.board,'jelly');assert.equal(p.cells.length,8);g.resolve(p,1);assert.equal(g.shards,8);settle(g.board,'jelly');p=E.materialPlan(g.board,'jelly');assert.equal(p.cells.length,8);g.resolve(p,2);assert.equal(g.maxChain,2);assert.equal(g.score,780);assert.equal(g.lines,2);assert.equal(g.board.flat().filter(Boolean).length,0);
});
test('settling conserves every cell, stays in bounds, terminates and is deterministic on dense boards',()=>{
 for(const m of ['sand','water','jelly'])for(let seed=0;seed<20;seed++){
  const rng=E.random('settle-'+seed),b=E.blank();let id=0;
  for(let y=0;y<20;y++)for(let x=0;x<10;x++)if(rng()<.48)b[y][x]=cell(++id,Math.floor(rng()*4));
  const clone=structuredClone(b);settle(b,m);settle(clone,m);assert.deepEqual(b,clone);
  const ids=b.flat().filter(Boolean).map(c=>c.id);assert.equal(ids.length,id);assert.equal(new Set(ids).size,id);assert.deepEqual(E.settleStep(b,m),[]);
 }
});
test('material piece supply and hold preserve paint and repeat with the same seed',()=>{
 for(const m of ['sand','water','jelly']){
  const a=new E.Game('repeat','sprint',m),b=new E.Game('repeat','sprint',m);
  for(let i=0;i<35;i++){assert.deepEqual(a.active,b.active);assert.equal(new Set(a.active.cells.map(c=>c.paint)).size,1);assert.ok(a.active.cells.every(c=>c.mask===0));a.spawn();b.spawn();}
  const original=a.active.cells[0].paint;a.hold();assert.equal(a.held.cells[0].paint,original);
 }
});
