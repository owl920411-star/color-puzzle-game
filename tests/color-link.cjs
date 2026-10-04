'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../experiments/color-link.html'),'utf8');
const context={module:{exports:{}}};vm.runInNewContext(html.match(/<script id="color-link-engine">([\s\S]*?)<\/script>/)[1],context);const G=context.module.exports;
let checks=0;function check(name,fn){fn();checks++;console.log('OK',name);}
check('all boards have 16 cells, valid symbols, and no existing triple',()=>{for(const l of G.LEVELS){assert.equal(l.board.length,16);for(let i=0;i<16;i++){assert.ok(l.board[i]==='.'||G.TYPES[l.board[i]]);assert.ok(G.group(l.board.split(''),i).length<3);}}});
check('every authored board has a verified solution',()=>{G.LEVELS.forEach((l,i)=>{let board=l.board.split(''),cleared={};const solution=G.solve(board,cleared,l.goal);assert.ok(solution?.length,`stage ${i+1}`);for(const[a,b]of solution){const r=G.apply(board,a,b);assert.ok(r);board=r.board;cleared[r.color]=(cleared[r.color]||0)+r.removed.length;}assert.ok(G.won(cleared,l.goal));console.log('  stage',i+1,JSON.stringify(solution));});});
check('source becomes empty and destination keeps composite without random refill',()=>{const b=G.LEVELS[1].board.split(''),r=G.apply(b,4,5);assert.equal(r.board[4],'.');assert.equal(r.board[5],'P');assert.equal(b.join(''),G.LEVELS[1].board);assert.equal(r.removed.length,0);assert.equal(r.board.filter(x=>x!=='.').length,5);});
check('same pair opposite directions produces different outcomes',()=>{const b=G.LEVELS[0].board.split(''),good=G.apply(b,6,5),bad=G.apply(b,5,6);assert.equal(good.removed.length,3);assert.equal(bad.removed.length,0);assert.equal(G.solve(bad.board,{},G.LEVELS[0].goal),null);});
check('L-shaped same-color group bursts',()=>{const r=G.apply(G.LEVELS[0].board.split(''),6,5);assert.deepEqual([...r.removed].sort((a,b)=>a-b),[4,5,9]);});
check('bridge joins five results',()=>{const r=G.apply(G.LEVELS[3].board.split(''),9,5);assert.equal(r.removed.length,5);assert.equal(r.board.filter(x=>x!=='.').length,0);});
check('reject same colors, composites, blanks, diagonals, row wrap and off-board',()=>{const b='RRBP..Y.........'.split('');for(const pair of [[0,1],[2,3],[1,5],[1,4],[3,4],[0,-1],[15,16],[0,1.5],[0,NaN]])assert.equal(G.apply(b,...pair),null);});
check('all three mixing recipes work in both directions',()=>{for(const[a,b,k]of [['R','B','P'],['R','Y','O'],['B','Y','G']])for(const pair of [[0,1],[1,0]]){const grid=(a+b+'..............').split('');assert.equal(G.apply(grid,...pair).board[pair[1]],k);}});
check('diagonal result neighbors do not form a connected group',()=>{const b='P....P....P.....'.split('');assert.equal(G.group(b,0).length,1);});
check('goals require both colors and exact actual clears',()=>{assert.equal(G.won({P:3},{P:3,G:3}),false);assert.equal(G.won({P:3,G:3},{P:3,G:3}),true);});
for(const m of html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
console.log(`${checks} rule/solution checks passed; both scripts parse.`);
