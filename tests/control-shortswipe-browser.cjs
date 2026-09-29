'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(root,'dist',decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff')?'font/woff':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));}catch(e){res.statusCode=404;res.end('missing');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.TOY_CHROMIUM,args:['--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?qa=1&play=1`);await page.waitForFunction(()=>window.__GLASSFALL_QA__?.run?.active);
  const cdp=await page.context().newCDPSession(page),results=[];
  for(const [age,dx,dy,expected] of [[280,65,0,'no-rotation'],[40,65,0,'CW'],[40,-65,0,'CCW'],[220,0,-65,'HOLD'],[220,0,65,'drop']]){
   await page.evaluate(()=>{const q=__GLASSFALL_QA__;q.start(false,false);window.controlCalls=[];for(const k of ['move','rotateDir','hold','lock']){const f=q.run[k].bind(q.run);q.run[k]=(...args)=>{const r=f(...args);controlCalls.push({name:k,args,result:r});return r;};}});
   const r=await page.locator('#board').boundingBox(),point={x:r.x+r.width*.4,y:r.y+r.height*.4,id:1};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForTimeout(age);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:point.x+dx,y:point.y+dy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const calls=await page.evaluate(()=>controlCalls),rotations=calls.filter(c=>c.name==='rotateDir');
   if(expected==='no-rotation'){assert.equal(rotations.length,0);assert.ok(calls.filter(c=>c.name==='move').length>=2);}
   else if(expected==='CW'||expected==='CCW'){assert.equal(rotations.length,1);assert.equal(rotations[0].args[0],expected==='CW'?1:-1);}
   else assert.equal(calls.filter(c=>c.name===(expected==='HOLD'?'hold':'lock')).length,1);
   const x=await page.evaluate(()=>__GLASSFALL_QA__.run.active?.x);await page.waitForTimeout(140);assert.equal(await page.evaluate(()=>__GLASSFALL_QA__.run.active?.x),x);
   results.push({age,dx,dy,expected,calls});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'docs/qa/toy-v2/control-browser-results.json'),JSON.stringify(results,null,2)+'\n');console.log('Production browser: long hold no rotation, short CW/CCW, long-hold up HOLD/down drop and release stops PASS');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
