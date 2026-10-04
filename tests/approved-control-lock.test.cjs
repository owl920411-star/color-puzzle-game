'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {check}=require('../scripts/check-control-lock.cjs');
const root=path.resolve(__dirname,'..'),manifest=require('../docs/approved-controls-lock.json');
function candidate(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'approved-control-test-'));
 try{
  for(const file of new Set([...manifest.files.map(f=>f.path),...manifest.guardFiles,'dist/index.html','dist/qa/first-install.html'])){
   const target=path.join(dir,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);
  }
  fn(dir);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('approved game passes without changing any runtime file',()=>assert.deepEqual(check(root).failures,[]));
for(const [name,file,change]of [
 ['earlier first repeat','dist/endless-app.js',s=>s.replace('TOUCH_HOLD_START_MS=232','TOUCH_HOLD_START_MS=165')],
 ['old hesitation','dist/endless-app.js',s=>s.replace('d.steps===0?33:29','d.steps===0?100:29')],
 ['extra input outside frozen spans','dist/endless-app.js',s=>s+'\nwindow.extraInput=true;\n'],
 ['button duplicate filter','dist/pointer-button-guard.js',s=>s.replace("event.detail===0","event.detail===1")],
 ['rotation kick','dist/endless-rules.js',s=>s.replace('[-2,0]','[-3,0]')],
 ['collision check','dist/engine.js',s=>s.replace('x>=0&&x<W','x>=-1&&x<W')],
 ['checker replacement','scripts/check-control-lock.cjs',()=>"process.exit(0);\n"],
 ['baseline refresh','docs/approved-controls-lock.json',s=>s.replace('232','165')],
 ['freeze hash refresh','tests/helpers/control23-freeze.json',s=>s.replace('900c46','000000')],
 ['gate deletion','scripts/test-rc.cjs',()=>"process.exit(0);\n"]
])test('trusted base rejects '+name,()=>candidate(dir=>{
 const target=path.join(dir,file),before=fs.readFileSync(target,'utf8'),after=change(before);assert.notEqual(after,before,'mutation must be real');fs.writeFileSync(target,after);
 assert.ok(check(dir,root).failures.some(f=>f.startsWith(file+':')));
}));
test('changing code and its candidate hash cannot refresh the trusted baseline',()=>candidate(dir=>{
 const controller=path.join(dir,'dist/endless-app.js');fs.appendFileSync(controller,'\n// changed\n');
 const modified=JSON.parse(fs.readFileSync(path.join(dir,'docs/approved-controls-lock.json'),'utf8'));
 modified.files.find(f=>f.path==='dist/endless-app.js').sha256=require('node:crypto').createHash('sha256').update(fs.readFileSync(controller)).digest('hex');
 fs.writeFileSync(path.join(dir,'docs/approved-controls-lock.json'),JSON.stringify(modified));
 assert.ok(check(dir,root).failures.some(f=>f.startsWith('dist/endless-app.js:')));
}));
test('deleting or weakening the workflow fails the trusted guard',()=>candidate(dir=>{
 fs.unlinkSync(path.join(dir,'.github/workflows/approved-controls.yml'));
 assert.ok(check(dir,root).failures.some(f=>f.startsWith('.github/workflows/approved-controls.yml:')));
}));
test('removing protected runtime or remapping a button fails',()=>candidate(dir=>{
 const file=path.join(dir,'dist/index.html');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('pointer-button-guard.js','different-guard.js').replace('data-action="drop"','data-action="rotate"'));
 const failures=check(dir,root).failures;assert.ok(failures.some(f=>f.includes('runtime loading')));assert.ok(failures.some(f=>f.includes('drop binding')));
}));
test('unrelated home changes and cache version updates remain possible',()=>candidate(dir=>{
 fs.appendFileSync(path.join(dir,'dist/bloom-home.js'),'\n// unrelated home artwork\n');
 for(const file of ['dist/index.html','dist/qa/first-install.html']){const p=path.join(dir,file);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('cb-rc2-hold-start1','cb-rc2-next-release'));}
 assert.deepEqual(check(dir,root).failures,[]);
}));
