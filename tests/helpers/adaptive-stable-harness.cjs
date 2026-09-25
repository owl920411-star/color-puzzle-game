'use strict';
// Real normal engine/controller/items/adaptive modules. DOM/canvas/time are test substitutes.
// Sand engine is NOT loaded/exercised by this normal-mode harness.
const vm=require('node:vm'),fs=require('node:fs');
const E=require('../../dist/engine.js'),R=require('../../dist/endless-rules.js'),B=require('../../dist/block-items.js');
function boot({initial={},appSource=null,Bridge=null}={}){
 let now=0;const nodes=new Map(),store={...initial},timers=new Map(),downloads=[];let tid=0;
 const draw=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}})},{get(t,k){return k in t?t[k]:()=>{};}});
 function node(id=''){if(nodes.has(id))return nodes.get(id);const events={};const n={id,dataset:{},innerHTML:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},parentElement:{classList:{add(){},remove(){}}},clientWidth:390,clientHeight:740,offsetHeight:35,width:120,height:100,disabled:false,hidden:false,events,getContext:()=>draw,querySelectorAll:()=>[],addEventListener(t,f){(events[t]||=[]).push(f);},focus(){},getBoundingClientRect:()=>({left:0,top:0,width:270,height:540}),setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}};nodes.set(id,n);return n;}
 const actions=['hold','rotate','drop'].map(x=>{const n=node(x);n.dataset.action=x;return n;});
 const doc={body:{dataset:{},classList:{add(){},remove(){},toggle(){}}},documentElement:{style:{setProperty(){}}},getElementById:node,querySelector:node,createElement:()=>node('new'+nodes.size),querySelectorAll:s=>s==='[data-action]'?actions:[],addEventListener(){},hidden:false};
 const env={console,document:doc,location:{search:'?qa=1'},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}},navigator:{},performance:{now:()=>now},URLSearchParams,devicePixelRatio:1,requestAnimationFrame(){},getComputedStyle:()=>({paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0',gap:'6'}),setTimeout:(f,ms)=>{timers.set(++tid,{f,at:now+ms});return tid;},clearTimeout:id=>timers.delete(id),addEventListener(){},crypto:{getRandomValues(a){a.fill(1);}},GlassEngine:E,EndlessRules:R,BlockItems:B,MicroSand:{W:120,H:240},AdaptiveDirector:require('../../dist/adaptive-director.js'),AdaptiveBridge:Bridge||require('../../dist/adaptive-bridge.js')};env.window=env;
 vm.runInNewContext(appSource||fs.readFileSync(require.resolve('../../dist/endless-app.js'),'utf8'),env,{timeout:3000});
 const q=env.__GLASSFALL_QA__;
 function click(attr,a,v){const b={dataset:{[attr]:a,v:String(v??'')},disabled:false};for(const f of node('panel').events.click||[])f({target:{closest:s=>s===(attr==='adaptive'?'[data-adaptive]':'button[data-menu]')?b:null}});}
 function step(ms){for(let t=0;t<ms;t+=100){const dt=Math.min(100,ms-t);now+=dt;q.update(dt);}}
 return {q,nodes,store,step,menu:(a,v)=>click('menu',a,v),adaptive:(a,v)=>click('adaptive',a,v),panel:()=>node('panel').innerHTML,
  gesture(x,y,dx,dy){for(const [type,xx,yy]of[['pointerdown',x,y],['pointermove',x+dx,y+dy],['pointerup',x+dx,y+dy]])for(const f of node('board').events[type]||[])f({button:0,pointerId:1,clientX:xx,clientY:yy,preventDefault(){}});}};
}
module.exports={boot,E,R,B};
