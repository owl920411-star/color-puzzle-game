// The live single-mode runtime has its own gate; retired campaign/material tests
// remain historical evidence and must not bring removed modes back into RC.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const retired=new Set(['endless.test.cjs','engine.test.cjs','entry-recovery.test.cjs','materials.test.cjs','progression.test.cjs','stages.test.cjs','ui.test.cjs']);
const files=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')&&!retired.has(f)).sort();
const result=spawnSync(process.execPath,['--test',...files.map(f=>'tests/'+f)],{cwd:root,stdio:'inherit'});
process.exitCode=result.status??1;
