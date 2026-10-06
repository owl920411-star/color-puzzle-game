/* Android-only bridge. In ordinary browsers every call is inert. */
(() => {
 'use strict';
 const native=window.CrayonAndroid;
 if(!native)return;
 let eligible=false,busy=false,privacyRequired=false;
 const panel=document.getElementById('panel');
 function privacyEntry(){
  const existing=document.getElementById('native-ad-privacy');
  if(!privacyRequired||panel?.dataset.view!=='settings'){existing?.remove();return;}
  if(existing)return;
  const button=document.createElement('button');button.id='native-ad-privacy';button.className='secondary';button.type='button';button.textContent='광고 개인정보 설정';
  button.addEventListener('click',()=>native.showPrivacyOptions());panel.appendChild(button);
 }
 function restoreAudio(){const view=document.getElementById('panel')?.dataset.view;window.BloomAudio?.scene(document.hidden||busy?'paused':view==='over'?'over':view==='menu'?'home':'paused');}
 window.CrayonNativeAds=Object.freeze({
  begin(normal){eligible=!!normal;native.beginGame(eligible);},
  end(normal){busy=true;const overlay=document.getElementById('overlay');if(overlay)overlay.inert=true;window.BloomAudio?.scene('paused');try{native.endGame(eligible&&!!normal);}catch{window.CrayonNativeAds.setBusy(false);}},
  setBusy(value){busy=!!value;const overlay=document.getElementById('overlay');if(overlay)overlay.inert=busy;if(!busy)restoreAudio();},
  setPrivacyOptionsRequired(value){privacyRequired=!!value;privacyEntry();}
 });
 if(panel&&typeof MutationObserver==='function')new MutationObserver(privacyEntry).observe(panel,{attributes:true,attributeFilter:['data-view'],childList:true});
 window.addEventListener('crayon-native-resume',restoreAudio);
})();
