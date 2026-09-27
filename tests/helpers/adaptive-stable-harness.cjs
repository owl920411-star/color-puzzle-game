'use strict';
// Real normal engine/controller/items/adaptive modules. DOM/canvas/time are test substitutes.
// Optional real effect module supports input regression tests; single-mode runtime only.
const vm=require('node:vm'),fs=require('node:fs');
const E=require('../../dist/engine.js'),R=require('../../dist/endless-rules.js'),B=require('../../dist/block-items.js');
function boot({initial={},appSource=null,Bridge=null,FX=null,Tutorial=null,Loading=null}={}){
 let now=0;const nodes=new Map(),store={...initial},timers=new Map(),downloads=[],documentEvents={},windowEvents={};let tid=0;
 const draw=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}})},{get(t,k){return k in t?t[k]:()=>{};}});
 function node(id=''){if(nodes.has(id))return nodes.get(id);const events={};const n={id,dataset:{},innerHTML:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},parentElement:{classList:{add(){},remove(){}}},clientWidth:390,clientHeight:740,offsetHeight:35,width:120,height:100,disabled:false,hidden:false,events,getContext:()=>draw,querySelectorAll:()=>[],addEventListener(t,f){(events[t]||=[]).push(f);},focus(){},getBoundingClientRect:()=>({left:0,top:0,width:270,height:540}),setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}};nodes.set(id,n);return n;}
 const actions=['hold','rotate','drop'].map(x=>{const n=node(x);n.dataset.action=x;return n;});
 const doc={body:{dataset:{},classList:{add(){},remove(){},toggle(){}}},documentElement:{style:{setProperty(){}}},getElementById:node,querySelector:node,createElement:()=>node('new'+nodes.size),querySelectorAll:s=>s==='[data-action]'?actions:[],addEventListener(t,f,options){(documentEvents[t]||=[]).push({f,capture:options===true||!!options?.capture});},hidden:false};
 const env={console,document:doc,location:{search:'?qa=1'},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}},navigator:{},performance:{now:()=>now},URLSearchParams,devicePixelRatio:1,requestAnimationFrame(){},getComputedStyle:()=>({paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0',gap:'6'}),setTimeout:(f,ms)=>{timers.set(++tid,{f,at:now+ms});return tid;},clearTimeout:id=>timers.delete(id),addEventListener(t,f){(windowEvents[t]||=[]).push(f);},crypto:{getRandomValues(a){a.fill(1);}},CrayonBloomFX:FX,GlassEngine:E,EndlessRules:R,BlockItems:B,AdaptiveDirector:require('../../dist/adaptive-director.js'),AdaptiveBridge:Bridge||require('../../dist/adaptive-bridge.js')};env.window=env;
 if(Tutorial)env.BloomTutorial=Tutorial;
 if(Loading)env.BloomLoading=Loading;
 if(FX==='real'){vm.runInNewContext(fs.readFileSync(require.resolve('../../dist/crayon-bloom-fx.js'),'utf8'),env);const Actual=env.CrayonBloomFX;env.CrayonBloomFX=class extends Actual{constructor(...args){super(...args);env.testFX=this;}};}
 vm.runInNewContext(fs.readFileSync(require.resolve('../../dist/bloom-home.js'),'utf8'),env);
 vm.runInNewContext(appSource||fs.readFileSync(require.resolve('../../dist/endless-app.js'),'utf8'),env,{timeout:3000});
 const q=env.__GLASSFALL_QA__;
 function click(attr,a,v){const b={dataset:{[attr]:a,v:String(v??'')},disabled:false};for(const f of node('panel').events.click||[])f({target:{closest:s=>s===(attr==='adaptive'?'[data-adaptive]':'button[data-menu]')?b:null}});}
 function step(ms){for(let t=0;t<ms;t+=100){const dt=Math.min(100,ms-t);now+=dt;q.update(dt);}}
 function advance(ms,frame=1,runUpdate=true){const end=now+ms;while(now<end){now=Math.min(end,now+frame);for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.f();}if(runUpdate)q.update(frame);}}
 function dispatch(type,{target='board',x=60,y=200,id=1,detail=1,key}={}){const element=node(target);element.closest=s=>s===`[data-action="${element.dataset.action}"]`?element:null;const event={type,target:element,button:0,pointerId:id,clientX:x,clientY:y,detail,key,preventDefault(){}};for(const l of documentEvents[type]||[])if(l.capture)l.f(event);for(const f of element.events[type]||[])f(event);for(const l of documentEvents[type]||[])if(!l.capture)l.f(event);}
 function dispatchWindow(type,detail={}){for(const f of windowEvents[type]||[])f({type,...detail});}
 function dispatchDocument(type,detail={}){if('hidden'in detail)doc.hidden=detail.hidden;for(const l of documentEvents[type]||[])l.f({type,...detail});}
 return {q,nodes,store,step,advance,dispatch,dispatchWindow,dispatchDocument,get fx(){return env.testFX;},get now(){return now;},timers,menu:(a,v)=>click('menu',a,v),adaptive:(a,v)=>click('adaptive',a,v),panel:()=>node('panel').innerHTML,
  gesture(x,y,dx,dy){for(const [type,xx,yy]of[['pointerdown',x,y],['pointermove',x+dx,y+dy],['pointerup',x+dx,y+dy]])for(const f of node('board').events[type]||[])f({button:0,pointerId:1,clientX:xx,clientY:yy,preventDefault(){}});}};
}
module.exports={boot,E,R,B};
