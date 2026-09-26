'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../dist/pointer-button-guard.js');
for(const type of ['touch','mouse','pen'])test(`detail-zero ${type} followup is physical, not keyboard`,()=>assert.equal(G.isPointerFollowup({type:'click',detail:0,pointerType:type}),true));
test('legacy touch MouseEvent is suppressed',()=>assert.equal(G.isPointerFollowup({type:'click',detail:0,sourceCapabilities:{firesTouchEvents:true}}),true));
for(const e of [{type:'click',detail:0},{type:'click',detail:0,pointerType:''},{type:'click',detail:1,pointerType:'touch'},{type:'pointerdown',detail:0,pointerType:'touch'}])test('nonduplicate activation is left untouched '+JSON.stringify(e),()=>assert.equal(G.isPointerFollowup(e),false));
test('installation affects only action buttons and can be removed',()=>{
 let fn=null,removed=false;const d={addEventListener(t,f,c){assert.equal(t,'click');assert.equal(c,true);fn=f;},removeEventListener(t,f,c){assert.equal(f,fn);assert.equal(c,true);removed=true;}};
 const stop=G.install(d);let cancelled=0;
 const event={type:'click',detail:0,pointerType:'touch',target:{closest:()=>null},preventDefault(){cancelled++;},stopImmediatePropagation(){cancelled++;}};
 fn(event);assert.equal(cancelled,0);
 event.target.closest=s=>{assert.equal(s,'button[data-action]');return {};};fn(event);assert.equal(cancelled,2);
 event.pointerType='';fn(event);assert.equal(cancelled,2);stop();assert.equal(removed,true);
});
