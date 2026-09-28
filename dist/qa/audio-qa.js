/* Isolated audio diagnostics. Only audio.html loads this file. */
(() => {
 const q=window.__GLASSFALL_QA__,audio=window.BloomAudio;
 const box=document.createElement('aside');box.id='audio-qa';
 box.style.cssText='position:fixed;right:0;top:0;width:340px;max-height:95vh;overflow:auto;z-index:99999;background:#fff;color:#111;padding:8px;font:12px monospace;border:1px solid #777';
 box.innerHTML='<b>AUDIO 1 QA — Android listening NOT VERIFIED</b><p>Storage is isolated memory. Use the real START button.</p><nav>'+['new','on','off','missing','bgmOff','sfxOff'].map(c=>`<a href="qa/audio.html?qa=1&case=${c}">${c}</a> `).join('')+'</nav><p>'+['rotate','hold','drop','clear','combo','good','bad','gameover'].map(e=>`<button data-audio-event="${e}">${e}</button>`).join(' ')+'</p><pre id="audio-report"></pre>';
 document.body.append(box);
 let lastEvent=null;
 const refresh=()=>{document.getElementById('audio-report').textContent=JSON.stringify({version:document.getElementById('build').textContent,state:q?.state,audio:audio.stats(),resumes:window.__AUDIO_QA_RESUMES__.slice(-8),lastEvent,saved:JSON.parse(localStorage.getItem('glassfall-v1')||'{}')},null,2);};
 box.addEventListener('click',async e=>{
  const type=e.target.dataset.audioEvent;if(!type||!q)return;
  audio.unlock();
  const start=audio.stats().effectsScheduled,counts=audio.stats().effectEvents;
  if(q.state!=='playing'){if(q.state==='paused')q.resume();else q.start();}
  // Real engine/controller events with deterministic board fixtures, not effect() calls.
  await Promise.resolve();await Promise.resolve();
  if(['rotate','hold','drop'].includes(type))q.action(type);
  else if(type==='gameover')q.finish();
  else if(type==='good'||type==='bad'){
   q.itemScenario(type==='good'?'oasis':'seal');q.resume();await Promise.resolve();await Promise.resolve();
   if(type==='good'){q.action('drop');for(let i=0;i<4;i++)q.update(100);}
   else{for(const cell of q.run.board.flat())if(cell?.special?.deadline)cell.special.deadline=q.elapsed+100;q.update(100);}
  }else{
   for(let i=0;i<(type==='combo'?2:1);i++){
    const g=q.run;g.board[19]=Array.from({length:10},(_,x)=>({type:'I',mask:0,id:++g.serial}));
    q.resolveNormal({rows:[19],cells:g.board[19].map((cell,x)=>({x,y:19,cell})),itemAt:q.elapsed});
   }
  }
  const after=audio.stats();lastEvent={type,scheduled:after.effectsScheduled-start,eventVoices:Object.fromEntries(Object.entries(after.effectEvents).map(([k,v])=>[k,v-(counts[k]||0)]))};refresh();
 });
 setInterval(refresh,200);refresh();
})();
