const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
let removed = 0;
for(let stage=1;stage<=100;stage++) {
  const {n,arrows} = E.generate(stage);
  assert.deepEqual(E.generate(stage), {n,arrows}, 'Stable stage layout');
  const occupied = new Set();
  for(const a of arrows) {
    assert(a.cells.length >= 2);
    for(let i=0;i<a.cells.length;i++) {
      const p=a.cells[i], key=p.join(',');
      assert(E.inside(p,n));
      assert(!occupied.has(key), 'No overlapping paths');
      occupied.add(key);
      if(i) assert.equal(Math.abs(p[0]-a.cells[i-1][0])+Math.abs(p[1]-a.cells[i-1][1]),1);
    }
    const d=E.direction(a),h=a.cells.at(-1);let p=[h[0]+d[0],h[1]+d[1]];
    while(E.inside(p,n)) {assert(!a.cells.some(c=>c[0]===p[0]&&c[1]===p[1]),'No self-blocking arrow');p=[p[0]+d[0],p[1]+d[1]];}
  }
  assert(arrows.some(a=>E.blocker(a,arrows,n)), 'Stage requires ordering');
  const remaining=arrows.slice();
  while(remaining.length) {
    const i=remaining.findIndex(a=>!E.blocker(a,remaining,n));
    assert(i>=0, 'Every stage has a complete solution');
    remaining.splice(i,1);removed++;
  }
}
const a={id:0,cells:[[1,2],[1,1],[2,1]]};
const b={id:1,cells:[[3,2],[3,1],[3,0]]};
assert.deepEqual(E.blocker(a,[a,b],5),{id:1,at:[3,1]},'An arrow body blocks the ray');
assert.equal(E.blocker(a,[a],5),null,'Removing blocker opens exit');
console.log(`PASS: 100 solvable stages, ${removed} arrows, geometry, determinism, and blocking.`);
for(let stage=1;stage<=15;stage++){
 const {n,arrows}=E.generate(stage),s=416/n;
 for(const a of arrows)for(const [x,y]of a.cells)assert.equal(E.pick(32+(x+.5)*s,32+(y+.5)*s,arrows,n),a.id,'Every jelly cell selects its owner');
 assert.equal(E.pick(0,0,arrows,n),null,'Board margins ignored');
 const [x,y]=arrows[0].cells[0];assert.equal(E.pick(32+(x+.01)*s,32+(y+.5)*s,arrows,n),arrows[0].id,'Whole occupied cell accepts touch');
}
console.log('PASS: curated stage touch targets and boundary protection.');
for(let stage=1;stage<=100;stage++){
 const {n,arrows}=E.generate(stage);let left=arrows.slice(),depth=0;
 assert(n<=12,'Keep mobile cells readable');
 assert(left.filter(a=>!E.blocker(a,left,n)).length<=(stage<=30?7:10),'Bounded starting choices');
 while(left.length){const ids=new Set(left.filter(a=>!E.blocker(a,left,n)).map(a=>a.id));assert(ids.size);left=left.filter(a=>!ids.has(a.id));depth++;}
 assert(depth>=6,'At least six dependency layers');
}
console.log('PASS: all hard layouts meet dependency and opening-choice thresholds.');

for(let stage=5;stage<=30;stage++)assert.equal(E.generate(stage).arrows.length,13+Math.floor((stage-5)/2),'Progressive jelly count');

for(let stage=31;stage<=100;stage++)assert.equal(E.generate(stage).arrows.length,26+Math.floor((stage-31)/10));
