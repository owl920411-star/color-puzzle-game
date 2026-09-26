/* Physical action buttons already execute on pointerdown in CONTROL 17.
 * Some touch browsers then emit click with detail=0. Do not mistake that
 * second physical event for keyboard/screen-reader activation. No debounce,
 * touch thresholds, board gestures or game rules are changed here.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root.document)api.install(root.document);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function isPointerFollowup(event){
  return event.type==='click'&&event.detail===0&&
   (!!event.pointerType||event.sourceCapabilities?.firesTouchEvents===true);
 }
 function install(doc){
  function onClick(event){
   if(!event.target?.closest?.('button[data-action]')||!isPointerFollowup(event))return;
   event.preventDefault();
   event.stopImmediatePropagation();
  }
  doc.addEventListener('click',onClick,true);
  return()=>doc.removeEventListener('click',onClick,true);
 }
 return{isPointerFollowup,install};
});
