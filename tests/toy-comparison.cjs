/* Deterministic enlarged art comparison using the exact game renderer. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas'),{ToyPainter}=require('../dist/qa/toy-lab-view.js');
GlobalFonts.registerFromPath(path.join(__dirname,'../dist/qa/toy-assets/gaegu-lab-bold.woff'),'Gaegu');
const canvas=createCanvas(1080,690),c=canvas.getContext('2d');c.fillStyle='#fff8ec';c.fillRect(0,0,1080,690);c.fillStyle='#624e48';c.textAlign='center';c.font='700 32px Gaegu';c.fillText('CRAYON BLOOM · TOY V2',540,43);
const names=['통통이','뚱뚱이','겁쟁이','낙서쟁이'];
['bouncy','fat','coward','doodle'].forEach((kind,i)=>{
 const left=20+(i%2)*530,top=65+Math.floor(i/2)*300;c.fillStyle='#fffdf7';c.strokeStyle='#d3baa3';c.lineWidth=2;c.beginPath();c.roundRect(left,top,510,280,15);c.fill();c.stroke();c.fillStyle='#826455';c.font='700 28px Gaegu';c.fillText('일반 블록',left+133,top+47);c.fillText(names[i],left+370,top+47);
 for(const[type,x]of[['normal',left+53],[kind,left+291]]){
  c.save();c.translate(x,top+88);c.scale(2.2,2.2);const view=new ToyPainter(canvas,kind,true),cells=[[0,0],[1,0],[0,1],[1,1]];view.piece({type,cells,original:cells,x:0,y:0,colour:'#f58faf',state:'fall',ms:0,dir:0});c.restore();
 }
});
fs.writeFileSync(path.join(__dirname,'../docs/qa/toy-v2/character-comparison.png'),canvas.toBuffer('image/png'));
