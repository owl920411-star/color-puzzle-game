/* Android-only bridge. In ordinary browsers every call is inert. */
(() => {
 'use strict';
 const native=window.CrayonAndroid;
 if(!native)return;
 let eligible=false,busy=false;
 function restoreAudio(){const view=document.getElementById('panel')?.dataset.view;window.BloomAudio?.scene(document.hidden||busy?'paused':view==='over'?'over':view==='menu'?'home':'paused');}
 window.CrayonNativeAds=Object.freeze({
  begin(normal){eligible=!!normal;native.beginGame(eligible);},
  end(normal){busy=true;const overlay=document.getElementById('overlay');if(overlay)overlay.inert=true;window.BloomAudio?.scene('paused');native.endGame(eligible&&!!normal);},
  setBusy(value){busy=!!value;const overlay=document.getElementById('overlay');if(overlay)overlay.inert=busy;if(!busy)restoreAudio();}
 });
 window.addEventListener('crayon-native-resume',restoreAudio);
})();
