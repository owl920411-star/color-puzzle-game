'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'../dist'),route=fs.readFileSync(path.join(root,'sand-route.js'),'utf8');
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
function fixture({saved={},mode='stage',stage='1',sand=false}={}){
 const listeners={},urls=[],storage={'glassfall-v1':JSON.stringify(saved)};
 const content={querySelector(q){if(q.includes('data-mode'))return{dataset:{mode}};if(q.includes('data-stage'))return{dataset:{stage}};if(q.includes('data-material'))return sand?{}:null;return null;}};
 const document={readyState:'loading',addEventListener:(name,fn)=>{listeners[name]=fn;}};
 vm.runInNewContext(route,{document,window:{},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},location:{assign:url=>urls.push(url)},URLSearchParams});
 return{urls,storage,click(dataset,disabled=false){const flags=[];const button={dataset,disabled,closest:()=>content};listeners.click({target:{closest:()=>button},preventDefault:()=>flags.push('prevent'),stopImmediatePropagation:()=>flags.push('stop')});return flags;}};
}
test('return to shared lobby does not redirect automatically',()=>{assert.equal(fixture({saved:{material:'sand'}}).urls.length,0);});
test('glass selection and start remain owned by the original glass app',()=>{const f=fixture();assert.deepEqual(f.click({material:'glass'}),[]);assert.deepEqual(f.click({screen:'start'}),[]);assert.equal(f.urls.length,0);});
test('sand selection navigates only to current recovery entry',()=>{const f=fixture();assert.deepEqual(f.click({material:'sand'}),['prevent','stop']);const url=new URL(f.urls[0],'https://example.test/');assert.equal(url.pathname,'/sand-micro.html');assert.equal(url.searchParams.get('v'),'recovery1');assert.equal(JSON.parse(f.storage['glassfall-v1']).material,'sand');});
test('sand stage is not borrowed from previously selected glass progress',()=>{const f=fixture({stage:'100',saved:{campaign:{sand:{cleared:[1,2]},glass:{cleared:[1,2,3,4]}}}});f.click({material:'sand'});assert.equal(new URL(f.urls[0],'https://example.test').searchParams.get('stage'),'3');});
test('disabled material buttons do not navigate',()=>{const f=fixture();f.click({material:'sand'},true);assert.equal(f.urls.length,0);});
test('both actual HTML script URLs contain their exact current source hash',()=>{
 for(const [html,js]of[['index.html','sand-route.js'],['sand-micro.html','sand-micro.js']]){
  const b=fs.readFileSync(path.join(root,js)),sha=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
  assert.ok(fs.readFileSync(path.join(root,html),'utf8').includes(js+'?v='+sha.slice(0,12)));
 }
});
console.log('\n'+count+' entry checks passed (DOM/URL fixtures, not full glass-app browser execution).');
