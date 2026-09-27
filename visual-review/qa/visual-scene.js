const scene=new URLSearchParams(location.search).get('scene')||'home';const q=window.__GLASSFALL_QA__;const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function setup(){await document.fonts.ready;await q.celebration.preload();
 if(scene==='home'){q.menu();return;}
 if(scene==='loading'){q.requestStart();return;}
 if(scene==='tutorial'){q.start(false,true);return;}
 q.start();Object.defineProperty(q.run,'gravity',{get:()=>Infinity});Object.defineProperty(q.run,'lockDelay',{get:()=>Infinity});
 const cols=['I','O','T','S','Z','J','L'];for(let y=16;y<20;y++)for(let x=0;x<10;x++){if(x===5||y===16&&x>2||y===17&&x>7)continue;q.run.board[y][x]={type:cols[(x+y)%7],id:1000+y*10+x,mask:0};}
 q.run.score=5110;q.run.lines=24;q.run.maxCombo=4;q.hud();q.draw();
 if(scene==='bloom'){q.jumpTime(540000);q.hud();q.draw();}
 if(scene==='pause')q.pause();
 if(scene==='settings'){q.pause();document.querySelector('[data-menu="settings"]').click();}
 if(scene==='over'||scene==='best'){if(scene==='best')q.run.score=999999;q.finish('qa-fixture');}
 if(scene.startsWith('combo')||scene==='four'){q.celebration.clear();q.celebration.celebrate({combo:Number(scene.slice(5))||4,lines:scene==='four'?4:1});
 // A documented static sample of the real 250ms presentation, only for art review.
 // Timing and input are independently exercised by the unmodified RC regression page.
 await wait(250);const real=document.querySelector('.bloom-celebration'),copy=real.cloneNode(true);const source=[real,...real.querySelectorAll('*')],dest=[copy,...copy.querySelectorAll('*')];source.forEach((e,i)=>{const st=getComputedStyle(e);dest[i].style.animation='none';dest[i].style.transform=st.transform;dest[i].style.opacity=st.opacity;});q.celebration.clear();copy.dataset.visualSample='250ms';copy.hidden=false;real.parentNode.appendChild(copy);}
 if(scene==='danger'){q.loadPreset('high');q.draw();}
}
setup().catch(e=>document.body.dataset.qaError=String(e));