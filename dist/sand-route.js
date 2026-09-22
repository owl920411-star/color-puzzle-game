/* MICRO SAND entry guard: selecting sand must never start the legacy renderer.
 * Keep the shared lobby, glass and tutorial unchanged. Do not redirect on load:
 * the player must still be able to return to the mode-selection screen. */
(function(){
'use strict';
const KEY='glassfall-v1',VERSION='recovery1';
function readSave(){
 try{const value=JSON.parse(localStorage.getItem(KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}
}
function progress(saved){
 if(window.GlassStages)return window.GlassStages.progress(saved.campaign?.sand).unlocked;
 const cleared=Array.isArray(saved.campaign?.sand?.cleared)?saved.campaign.sand.cleared:[];
 let n=1;while(n<100&&cleared.includes(n))n++;return n;
}
function target(content,selecting){
 const saved=readSave(),unlocked=progress(saved);
 const mode=content.querySelector('[data-mode][aria-pressed="true"]')?.dataset.mode||'stage';
 // On a material change, a selected glass stage is NOT a selected sand stage.
 const selected=selecting?unlocked:Number(content.querySelector('[data-stage][aria-pressed="true"]')?.dataset.stage||unlocked);
 let stage=Number.isInteger(selected)?Math.max(1,Math.min(100,selected)):unlocked;
 if(!saved.devMode)stage=Math.min(stage,unlocked);
 return {saved,mode:['stage','endless','daily'].includes(mode)?mode:'stage',stage};
}
document.addEventListener('click',function(event){
 const button=event.target.closest?.('button');if(!button||button.disabled)return;
 const content=button.closest('.screen-content');if(!content)return;
 const selecting=button.dataset.material==='sand';
 const starting=['start','last-replay'].includes(button.dataset.screen)&&!!content.querySelector('[data-material="sand"][aria-pressed="true"]');
 if(!selecting&&!starting)return;
 const next=target(content,selecting);
 event.preventDefault();event.stopImmediatePropagation();
 next.saved.material='sand';try{localStorage.setItem(KEY,JSON.stringify(next.saved));}catch{}
 location.assign('sand-micro.html?'+new URLSearchParams({mode:next.mode,stage:String(next.stage),v:VERSION}));
},true);
function markEntry(){
 const content=document.querySelector('.screen.lobby .screen-content');if(!content)return;
 const sand=!!content.querySelector('[data-material="sand"][aria-pressed="true"]');
 const start=content.querySelector('[data-screen="start"]');
 let note=content.querySelector('#sand-entry-version');
 if(sand&&start&&!note){
  note=document.createElement('p');note.id='sand-entry-version';note.setAttribute('role','status');
  note.textContent='MICRO SAND 1.3.1 · 모래 실행 복구';
  note.style.cssText='font-size:12px;line-height:1.5;color:#d9c590;text-align:center;margin:8px 0';
  start.before(note);
 }else if(!sand&&note)note.remove();
 // An old-engine record cannot truthfully be called a replay of the new physics.
 const replay=content.querySelector('[data-screen="last-replay"]');if(replay)replay.hidden=sand;
}
function watch(){
 markEntry();const screen=document.getElementById('screen');
 if(screen)new MutationObserver(markEntry).observe(screen,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
