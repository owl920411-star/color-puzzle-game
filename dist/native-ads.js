/* Android-only bridge. In ordinary browsers every call is inert. */
(() => {
 'use strict';
 const native=window.CrayonAndroid;
 if(!native)return;
 let pending=0,eligible=false,busy=false;
 function flush(){if(pending>0){native.activeTime(Math.min(1000,Math.floor(pending)));pending=0;}}
 function restoreAudio(){const view=document.getElementById('panel')?.dataset.view;window.BloomAudio?.scene(document.hidden||busy?'paused':view==='over'?'over':view==='menu'?'home':'paused');}
 window.CrayonNativeAds=Object.freeze({
  begin(normal){flush();eligible=!!normal;native.beginGame(eligible);},
  tick(ms){if(!eligible||busy||document.hidden)return;pending+=Math.max(0,Math.min(100,ms));if(pending>=1000)flush();},
  end(normal){flush();busy=true;const overlay=document.getElementById('overlay');if(overlay)overlay.inert=true;window.BloomAudio?.scene('paused');native.endGame(eligible&&!!normal);},
  setBusy(value){busy=!!value;const overlay=document.getElementById('overlay');if(overlay)overlay.inert=busy;if(!busy)restoreAudio();}
 });
 window.addEventListener('blur',flush);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
 window.addEventListener('crayon-native-resume',restoreAudio);
})();
