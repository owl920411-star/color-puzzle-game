/* Sand has its own physics/rendering entrypoint. Glass and the existing lobby
 * remain untouched; capture only an explicit sand START click, not navigation. */
(function(){
'use strict';
document.addEventListener('click',function(event){
 const button=event.target.closest('button');
 if(!button||button.disabled||!['start','last-replay'].includes(button.dataset.screen))return;
 const content=button.closest('.screen-content');
 if(!content||!content.querySelector('[data-material="sand"][aria-pressed="true"]'))return;
 const mode=content.querySelector('[data-mode][aria-pressed="true"]')?.dataset.mode||'stage';
 const stage=content.querySelector('[data-stage][aria-pressed="true"]')?.dataset.stage||'1';
 if(!['stage','endless','daily'].includes(mode))return;
 event.preventDefault();event.stopImmediatePropagation();
 location.assign('sand-micro.html?'+new URLSearchParams({mode,stage,v:'micro1'}));
},true);
})();
