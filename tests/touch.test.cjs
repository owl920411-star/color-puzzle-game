const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');
const input=app.slice(app.indexOf('const presses=new Map();'),app.indexOf('\nfunction devHud()'));
function scenario(source){
 const handlers={},taps=[],board={addEventListener:(name,fn)=>handlers[name]=fn,getBoundingClientRect:()=>({left:0,top:0,width:480,height:480}),setPointerCapture(){}},child={};
 const context={$:()=>board,Puzzle:{pick:()=>0},arrows:[],n:8,epoch:1,busy:false,hearts:3,document:{querySelector:()=>({classList:{add(){},remove(){}}})},tap:id=>taps.push(id)};
 vm.runInNewContext(source,context);
 const e={pointerId:1,isPrimary:true,button:0,clientX:100,clientY:100,target:child};
 handlers.pointerdown(e);
 assert.equal(taps.length,1,'Activation happens before finger release');
 // Android implicitly captures the hit path. Explicit board capture transfers it.
 handlers.lostpointercapture(e);
 handlers.pointerup({...e,target:board});
 return {handlers,taps,e,board};
}
const {handlers,taps,e,board}=scenario(input);
assert.deepEqual(taps,[0],'Touch transfer must preserve one tap');
handlers.pointerdown(e);handlers.pointermove({...e,clientX:130});handlers.pointerup(e);
assert.equal(taps.length,2,'Movement after press must not add an activation');
handlers.pointerdown(e);handlers.pointercancel(e);handlers.pointerup(e);
assert.equal(taps.length,3,'Cancellation after press must not duplicate activation');
handlers.pointerdown(e);handlers.lostpointercapture({...e,target:board});handlers.pointerup(e);
assert.equal(taps.length,4,'Capture loss must not duplicate activation');
handlers.pointerdown({...e,pointerType:'mouse'});handlers.pointerup(e);
assert.equal(taps.length,5,'Mouse click still activates once');
handlers.pointerdown(e);handlers.pointerdown({...e,pointerId:2,isPrimary:false});handlers.pointerup(e);handlers.pointerup({...e,pointerId:2});assert.equal(taps.length,7,'Both fingers accepted');
console.log('PASS: touch transfer, cancellation, mouse and two-finger input.');

handlers.pointerdown({...e,button:2});assert.equal(taps.length,7,'Right click ignored');
