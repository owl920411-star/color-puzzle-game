/* Small cached crayon drawings; no gameplay state or animation loop. */
(() => {
'use strict';
const cache=new Map();
function sprite(type){
 if(cache.has(type))return cache.get(type);
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.translate(32,32);g.rotate(-.10);g.strokeStyle='#67546f';g.lineWidth=2.4;g.lineJoin=g.lineCap='round';
 g.fillStyle='#fff9ee';g.beginPath();g.roundRect(-27,-26,54,52,10);g.fill();g.stroke();g.lineWidth=1;g.strokeRect(-24,-22,48,44);g.lineWidth=2.4;
 if(type==='oasis'){
  const colors=['#ee95b6','#f3cc70','#8acda6','#87c6df','#bfa1da'];
  g.save();g.rotate(-.55);for(let i=0;i<5;i++){g.fillStyle=colors[i];g.fillRect(-17,-13+i*5,30,5);}g.strokeRect(-17,-13,30,25);g.fillStyle='#f6d8bd';g.beginPath();g.moveTo(13,-13);g.lineTo(24,0);g.lineTo(13,12);g.closePath();g.fill();g.stroke();g.restore();
 }else if(type==='sunburst'){
  g.fillStyle='#f0a1be';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;g.beginPath();g.arc(Math.cos(a)*11,Math.sin(a)*11,9,0,Math.PI*2);g.fill();g.stroke();}g.fillStyle='#ffe4a0';g.beginPath();g.arc(0,0,7,0,Math.PI*2);g.fill();g.stroke();
 }else if(type==='spear'){
  g.fillStyle='#f6da83';g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?9:22;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.stroke();g.fillStyle='#fff9ee';g.beginPath();g.moveTo(12,8);g.lineTo(18,12);g.lineTo(14,2);g.closePath();g.fill();
 }else if(type==='mummy'){
  for(let i=0;i<2;i++){g.save();g.rotate(i?.3:-.23);g.fillStyle=i?'#efb4cb':'#c7b6e0';g.fillRect(-20,-9+i*3,40,15);g.strokeRect(-20,-9+i*3,40,15);g.setLineDash([2,4]);g.beginPath();g.moveTo(-15,-2+i*3);g.lineTo(15,-2+i*3);g.stroke();g.setLineDash([]);g.restore();}
 }else if(type==='scarabCurse'){
  g.strokeStyle='#a38bbe';g.lineWidth=3;g.beginPath();g.moveTo(-20,8);g.bezierCurveTo(25,-30,-23,-25,-5,12);g.bezierCurveTo(20,28,28,-19,4,-12);g.bezierCurveTo(-20,-4,1,23,21,2);g.stroke();
 }else{
  g.fillStyle='#b4aecb';g.beginPath();g.moveTo(-20,11);g.bezierCurveTo(-31,1,-17,-14,-8,-9);g.bezierCurveTo(-8,-27,17,-22,17,-8);g.bezierCurveTo(31,-9,30,14,18,14);g.lineTo(-20,11);g.fill();g.stroke();g.beginPath();g.moveTo(-8,18);g.lineTo(-12,23);g.moveTo(9,18);g.lineTo(5,23);g.stroke();
 }
 g.globalAlpha=.25;g.strokeStyle='#fff';g.lineWidth=1.5;for(let i=-18;i<20;i+=7){g.beginPath();g.moveTo(-17,i);g.lineTo(17,i-5);g.stroke();}
 cache.set(type,c);return c;
}
const urls=new Map();
window.BloomItemArt={draw(g,type,x,y,size){g.drawImage(sprite(type),x-size/2,y-size/2,size,size);},html(type){if(!urls.has(type))urls.set(type,sprite(type).toDataURL());return `<img class="bloom-item-icon" alt="" src="${urls.get(type)}">`;}};
})();
