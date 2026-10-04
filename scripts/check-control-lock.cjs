'use strict';
// Read files only. CI runs this from the trusted base, never from PR code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function readRegular(root,relative){
 const parts=relative.split('/');
 if(parts.some(p=>!p||p==='.'||p==='..'))throw Error('invalid protected path');
 let current=root;
 for(const part of parts){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw Error('protected path is a symlink');}
 if(!fs.statSync(current).isFile())throw Error('protected path is not a file');
 return fs.readFileSync(current);
}
function check(root,guardRoot=root){
 root=path.resolve(root);guardRoot=path.resolve(guardRoot);
 const manifest=JSON.parse(readRegular(guardRoot,'docs/approved-controls-lock.json'));
 const failures=[];
 function verify(file,expected){
  try{if(digest(readRegular(root,file))!==expected)failures.push(file+': approved content changed');}
  catch(error){failures.push(file+': '+error.message);}
 }
 for(const file of manifest.files)verify(file.path,file.sha256);
 // A PR cannot replace the checker, baseline, instructions, tests or workflow.
 for(const file of manifest.guardFiles)verify(file,digest(readRegular(guardRoot,file)));
 for(const file of ['dist/index.html','dist/qa/first-install.html']){
  try{
   const html=readRegular(root,file).toString('utf8');
   const scripts=[...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
   const required=['engine.js','endless-rules.js','pointer-button-guard.js','endless-app.js'];
   const positions=required.map(name=>scripts.indexOf(name));
   if(required.some(name=>scripts.filter(s=>s===name).length!==1)||positions.some((p,i)=>i&&p<=positions[i-1])||scripts.at(-1)!=='endless-app.js')failures.push(file+': protected runtime loading changed');
   for(const [tag,id,action]of [['canvas','board'],['button','hold','hold'],['button','rotate','rotate'],['button','drop','drop']]){
    const matches=[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*\\sid="'+id+'"[^>]*>','g'))];
    if(matches.length!==1||(action&&!matches[0][0].includes('data-action="'+action+'"')))failures.push(file+': protected '+id+' binding changed');
   }
  }catch(error){failures.push(file+': '+error.message);}
 }
 return{approvedCommit:manifest.approvedCommit,failures};
}
if(require.main===module){
 try{
  const args=process.argv.slice(2),options={};
  for(let i=0;i<args.length;i+=2){if(!['--root','--guard-root'].includes(args[i])||!args[i+1])throw Error('usage: check-control-lock.cjs [--root PATH] [--guard-root TRUSTED_PATH]');options[args[i]]=args[i+1];}
  const root=options['--root']||path.resolve(__dirname,'..');
  const result=check(root,options['--guard-root']||path.resolve(__dirname,'..'));
  for(const failure of result.failures)console.error('CONTROL LOCK: '+failure);
  if(result.failures.length){console.error('Approved controls are locked. Do not refresh hashes or weaken the gate. Explicit user unlock is required.');process.exitCode=1;}
  else console.log('Approved controls unchanged ('+result.approvedCommit+').');
 }catch(error){console.error('CONTROL LOCK: '+error.message);process.exitCode=1;}
}
module.exports={check};
