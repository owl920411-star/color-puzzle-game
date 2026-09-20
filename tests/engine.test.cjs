const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const cell=(mask=0,id=1)=>({type:'I',mask,id});
test('tutorial clears exactly one row and three mutually connected crack cells',()=>{
 const g=E.tutorial();g.move(0,g.dropDistance());g.lock();const p=E.clearPlan(g.board);assert.deepEqual(p.rows,[19]);assert.equal(p.cells.length,13);assert.equal(p.extra,3);assert.ok(!p.cells.some(c=>c.x===4&&c.y===18));g.resolve(p,1);assert.equal(g.board[19][4].mask,0);assert.equal(g.board.flat().filter(Boolean).length,1);assert.equal(g.score,190);assert.equal(E.clearPlan(g.board),null);
});
test('one-sided cracks, diagonal contact, and empty gaps do not propagate',()=>{
 const b=E.blank();b[19]=Array.from({length:10},(_,i)=>cell(i===3?1:0,i));b[18][3]=cell(1);b[18][4]=cell(8);b[17][3]=cell(4);assert.equal(E.clearPlan(b).cells.length,10);
});
test('connected cycles are visited once',()=>{const b=E.blank();b[19]=Array.from({length:10},()=>cell(15));b[18][2]=cell(15);b[18][3]=cell(15);const p=E.clearPlan(b);assert.equal(p.cells.length,12);assert.equal(new Set(p.cells.map(c=>c.y*10+c.x)).size,12);});
test('gravity preserves column order and creates a second wave',()=>{
 const b=E.blank();for(let x=0;x<10;x++){b[19][x]=cell(0,x);b[15-(x%3)][x]=cell(0,x+10);}const p=E.clearPlan(b);E.applyClear(b,p);assert.deepEqual(E.clearPlan(b).rows,[19]);for(let x=0;x<10;x++)assert.equal(b[19][x].id,x+10);
});
test('same seed produces identical types and crack masks; bags contain all 7 types',()=>{
 const a=new E.Game('same'),b=new E.Game('same');const sig=g=>JSON.stringify(g.active);const all=[];for(let i=0;i<70;i++){assert.equal(sig(a),sig(b));all.push(a.active.type);a.spawn();b.spawn();}for(let i=0;i<70;i+=7)assert.equal(new Set(all.slice(i,i+7)).size,7);assert.notDeepEqual(new E.Game('different').queue,new E.Game('same').queue);
});
test('four rotations restore geometry and crack directions',()=>{const g=new E.Game('turn');g.active.y=5;const initial=JSON.stringify(g.active);for(let i=0;i<4;i++)assert.ok(g.rotate());assert.equal(JSON.stringify(g.active),initial);assert.equal(E.maskRotate(9),3);});
test('hold is once per piece and next spawn is blocked by occupied top cells',()=>{const g=new E.Game('hold');assert.ok(g.hold());assert.equal(g.hold(),false);g.board=E.blank();g.active=null;g.spawn();assert.equal(g.holdUsed,false);g.board[0]=Array.from({length:10},()=>cell());g.board[1]=Array.from({length:10},()=>cell());assert.equal(g.spawn(),false);assert.equal(g.over,true);});
test('drop cannot pass occupied cells or escape board bounds',()=>{const g=new E.Game('collision');while(g.move(-1)){}assert.equal(g.move(-1),false);const d=g.dropDistance();assert.ok(d>=0);assert.ok(g.move(0,d));assert.equal(g.move(0,1),false);g.lock();assert.equal(g.board.flat().filter(Boolean).length,4);});
test('multi-row score counts each removed cell only once and multiplies cascades',()=>{const g=new E.Game('score');g.active=null;for(let y=18;y<20;y++)g.board[y]=Array.from({length:10},()=>cell(15));const p=E.clearPlan(g.board);assert.equal(p.cells.length,20);assert.equal(p.extra,0);g.resolve(p,2);assert.equal(g.score,400);assert.equal(g.maxChain,2);assert.equal(g.lines,2);});
