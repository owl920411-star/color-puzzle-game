/* Shared hand-drawn toy renderer. No random calls, input or game mutations. */
(function(root){
'use strict';
const S=36,INK='#624e48',PAPER='#fffaf0';
function path(ctx,points){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);}
function stroke(ctx,points){path(ctx,points);ctx.stroke();}
function ellipse(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill)ctx.fill();else ctx.stroke();}
const patterns=[[],[],[]];
for(let i=0;i<16;i++)patterns[0].push([i%2?28:8,7+i*1.45]);
for(let i=0;i<42;i++){const a=i*.47,r=11-i*.20;patterns[1].push([18+Math.cos(a)*r,18+Math.sin(a)*r]);}
for(let i=0;i<40;i++)patterns[2].push([7+i*.56,18+Math.sin(i*.95)*9]);
class ToyPainter{
  constructor(canvas,kind,reduced=false){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.kind=kind;this.reduced=reduced;this.scale=1;}
  resize(dpr=1){dpr=Math.max(1,Math.min(3,dpr));this.canvas.width=360*dpr;this.canvas.height=720*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.scale=(this.canvas.getBoundingClientRect?.().width||360)/360;}
  cell(col,row,colour,type='normal',phase='fall',age=0,dir=0,ghost=false){
    const c=this.ctx;c.save();c.translate(col*S,row*S);c.strokeStyle=INK;c.fillStyle=colour;c.lineWidth=type==='normal'?(['bouncy','fat'].includes(this.kind)?2.4:2):1.8;c.lineJoin='round';
    if(ghost){c.globalAlpha=.46;c.setLineDash([4,4]);c.strokeStyle='#ad9184';c.lineWidth=1.7;}
    if(type==='bouncy'){
      c.translate(18,18);
      if(!this.reduced){
        if(phase==='roll'){c.rotate(dir*.12*Math.sin(age/85));c.scale(.89,.89);}
        else if(phase==='squash')c.scale(1,.84);
        else if(phase==='fall')c.scale(1,1-.025*Math.sin(age/190));
      }
      c.translate(-18,-18);c.beginPath();c.moveTo(11,3);c.bezierCurveTo(23,1,31,4,33,13);c.bezierCurveTo(35,25,30,32,23,33);c.bezierCurveTo(11,35,4,31,3,24);c.bezierCurveTo(1,13,4,5,11,3);c.closePath();
    }else if(type==='fat'){
      if(phase==='fatSquash'&&!this.reduced){c.translate(0,4);c.scale(1,.88);}
      c.beginPath();c.moveTo(10,2);c.bezierCurveTo(21,0,32,1,34,10);c.bezierCurveTo(35,18,36,30,27,33);c.bezierCurveTo(18,36,4,35,2,27);c.bezierCurveTo(0,18,0,5,10,2);c.closePath();
    }else if(type==='coward'){
      c.beginPath();c.moveTo(10,5);c.quadraticCurveTo(18,10,26,5);c.quadraticCurveTo(32,12,32,29);c.quadraticCurveTo(18,35,4,30);c.quadraticCurveTo(4,13,10,5);c.closePath();
    }else if(type==='doodle'){
      c.beginPath();c.moveTo(7,3);c.quadraticCurveTo(20,6,29,3);c.lineTo(33,26);c.quadraticCurveTo(25,34,5,31);c.lineTo(3,13);c.closePath();
    }else if(this.kind==='bouncy'||this.kind==='fat'){c.beginPath();c.roundRect(3,3,30,30,6);}
    else{path(c,[[4,5],[31,3],[33,31],[5,33]]);c.closePath();}
    if(!ghost)c.fill();c.stroke();
    if(!ghost&&type==='normal'){
      if(this.kind==='bouncy'||this.kind==='fat'){c.globalAlpha=.18;c.fillStyle='#fff';c.fillRect(8,8,20,4);}
      else{c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=2;stroke(c,[[8,10],[28,8]]);stroke(c,[[9,16],[28,14]]);}
    }else if(!ghost){
      c.save();c.clip();c.strokeStyle='rgba(255,250,234,.42)';c.lineWidth=1.4;
      for(let i=0;i<6;i++)stroke(c,[[4,8+i*4],[30,4+i*4]]);
      c.strokeStyle='rgba(104,75,61,.11)';c.lineWidth=.65;
      for(let i=0;i<4;i++)stroke(c,[[7+i*6,3],[4+i*6,34]]);
      c.restore();
      if(type!=='normal'){c.strokeStyle='rgba(98,78,72,.4)';c.lineWidth=.85;stroke(c,[[8,31],[17,33],[26,30]]);}
    }
    c.restore();
  }
  face(col,row,type,phase,age,dir){
    if(type==='normal')return;
    const c=this.ctx;c.save();c.translate(col*S+18,row*S+15);c.strokeStyle=INK;c.fillStyle=INK;c.lineWidth=1.9;c.lineCap='round';c.lineJoin='round';
    if(type==='bouncy'){
      if(phase==='roll'&&!this.reduced)c.rotate(dir*.1*Math.sin(age/85));
      stroke(c,[[-10,-2],[-6,-4],[-3,-1]]);stroke(c,[[3,-1],[7,-4],[11,-2]]);
      c.beginPath();c.moveTo(-6,6);c.quadraticCurveTo(0,15,7,5);c.quadraticCurveTo(0,10,-6,6);c.fill();
      c.fillStyle='#fff4d9';stroke(c,[[-10,-7],[-5,-8]]);
      c.fillStyle='#f5b09f';ellipse(c,-11,5,3,1.9,true);ellipse(c,11,5,3,1.9,true);
    }else if(type==='fat'){
      c.fillStyle='#e98ba5';c.globalAlpha=.6;ellipse(c,-10,5,5,4,true);ellipse(c,10,5,5,4,true);c.globalAlpha=1;c.fillStyle=INK;c.lineWidth=1.5;
      if(phase==='straining'){stroke(c,[[-6,-3],[-3,-1],[-6,1]]);stroke(c,[[6,-3],[3,-1],[6,1]]);stroke(c,[[-3,6],[0,5],[3,6]]);}
      else{stroke(c,[[-6,0],[-4,-1],[-2,0]]);stroke(c,[[2,0],[4,-1],[6,0]]);c.beginPath();c.moveTo(-3,5);c.quadraticCurveTo(0,8,3,5);c.stroke();}
      c.strokeStyle='#aa7068';c.lineWidth=1.5;c.beginPath();c.moveTo(-10,10);c.bezierCurveTo(-8,20,10,20,11,10);c.stroke();
      c.fillStyle='#b47c72';ellipse(c,1,13,1,1,true);
      if(phase==='fatpop'){stroke(c,[[-6,-4],[-2,-5]]);stroke(c,[[2,-5],[6,-4]]);}
    }else if(type==='coward'){
      const scared=['panic','escape','blocked'].includes(phase),rest=phase==='settle';
      c.lineWidth=1.45;c.fillStyle='#fffdf6';
      for(const x of [-6,6]){ellipse(c,x,1,scared?4.6:4,scared?6.3:4.8,true);ellipse(c,x,1,scared?4.6:4,scared?6.3:4.8,false);c.fillStyle=INK;ellipse(c,x+dir*.6,3,1.3,1.9,true);c.fillStyle='#fffdf6';}
      stroke(c,[[-11,-6],[-5,-9]]);stroke(c,[[5,-9],[11,-6]]);
      if(scared)ellipse(c,0,11,2.5,3.3,false);else if(rest){c.beginPath();c.moveTo(-3,10);c.quadraticCurveTo(0,13,3,10);c.stroke();}else stroke(c,[[-4,10],[-2,9],[0,11],[2,9],[4,10]]);
      c.fillStyle='#8bccdf';c.beginPath();c.moveTo(13,-6);c.quadraticCurveTo(8,2,13,3);c.quadraticCurveTo(17,2,13,-6);c.fill();c.stroke();
    }else if(type==='doodle'){
      stroke(c,[[-11,-7],[-5,-10]]);stroke(c,[[3,-5],[10,-4]]);
      ellipse(c,-6,0,1.7,3,true);
      if(['draw','doodleRest'].includes(phase)){stroke(c,[[4,-1],[8,1],[4,3]]);}else{ellipse(c,7,1,1.7,2.5,true);}
      c.beginPath();c.moveTo(-6,7);c.quadraticCurveTo(1,phase==='noInk'?3:15,10,5);c.stroke();if(phase!=='noInk')stroke(c,[[9,4],[11,6]]);
      c.strokeStyle='#d97193';c.lineWidth=2;stroke(c,[[-13,6],[-9,4],[-12,9],[-8,7]]);
    }
    c.restore();
  }
  piece(p){
    const c=this.ctx,phase=p.state;c.save();
    let vx=p.x;
    if(phase==='escape')vx=p.fromX+(p.toX-p.fromX)*(1-(1-Math.min(1,p.ms/170))**3);
    // Keep tiny anxious motion inside the occupied cell, including at a wall.
    if(p.type==='coward'&&!this.reduced&&['panic','blocked'].includes(phase))c.translate(Math.sin(p.ms*.085)*.7,0);
    for(const [dx,dy] of p.cells)this.cell(vx+dx,p.y+dy,p.colour,p.type,phase,p.ms,p.dir);
    const [fx,fy]=p.original[0],expression=p.type==='fat'&&phase==='fatpop'&&!p.extra?.length?'straining':p.type==='doodle'&&phase==='doodleRest'&&!p.targets?.length?'noInk':phase;this.face(vx+fx,p.y+fy,p.type,expression,p.ms,p.dir);
    if(p.type==='doodle'&&phase!=='draw'){
      const [dx,dy]=p.original[1]||p.original[0];this.crayon((vx+dx)*S+24,(p.y+dy)*S+26,'#d75c86',-2.15);
    }
    c.restore();
  }
  crayon(px,py,colour,angle){
    const c=this.ctx;c.save();c.translate(px,py);c.rotate(angle);c.fillStyle=colour;c.strokeStyle=INK;c.lineWidth=1;
    path(c,[[0,0],[5,-3],[18,-3],[18,3],[5,3]]);c.closePath();c.fill();c.stroke();c.fillStyle='#fff2d7';c.fillRect(7,-2.5,7,5);stroke(c,[[9,-2],[9,2]]);c.restore();
  }
  inkCell(col,row,ink,progress=1,drawing=false){
    const c=this.ctx,points=patterns[ink.pattern%3],end=Math.max(0,Math.min(1,progress))*(points.length-1),idx=Math.floor(end),t=end-idx,a=points[idx],b=points[Math.min(idx+1,points.length-1)],tip=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    c.save();c.translate(col*S,row*S);c.fillStyle=ink.colour;c.globalAlpha=progress===1?.15:.05;c.fillRect(3,3,30,30);c.globalAlpha=1;c.strokeStyle=ink.colour;c.lineWidth=1.2;c.setLineDash(progress===1?[]:[2,3]);c.strokeRect(3.5,3.5,29,29);c.setLineDash([]);
    c.beginPath();c.moveTo(...points[0]);for(let i=1;i<=idx;i++)c.lineTo(...points[i]);c.lineTo(...tip);c.lineCap='round';c.lineJoin='round';c.lineWidth=3.5;c.stroke();c.strokeStyle='rgba(255,250,235,.4)';c.lineWidth=.8;c.stroke();c.restore();
    if(drawing){const dx=18-tip[0],dy=18-tip[1],angle=Math.abs(dx)+Math.abs(dy)<4?-2.2:Math.atan2(dy,dx);this.crayon(col*S+tip[0],row*S+tip[1],ink.colour,angle);}
  }
  word(e,time,p){
    let age=time-e.born;if(age<0||age>=e.ms)return;
    const c=this.ctx,t=age/e.ms,secondary=e.secondary;
    const font=Math.min(40,Math.max(26,(secondary?17:22)/this.scale));
    c.save();c.font=`700 ${font}px 'Gaegu Toys', Gaegu, 'Malgun Gothic', sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
    const width=c.measureText(e.text).width,pop=this.reduced?1:age<95?.9+.18*age/95:age<190?1.08-.08*(age-95)/95:1;
    let px=e.x,py=e.y-(secondary?19:53);
    if(!this.reduced&&['roll','escape'].includes(e.key))px+=e.dir*Math.min(11,age/35);
    if(e.id===p.id&&['roll','bounce'].includes(p.state))py=p.y*S-(secondary?19:53);
    px=Math.max(width*.56+9,Math.min(351-width*.56,px));py=Math.max(font*.7+9,Math.min(720-font*.7-9,py));
    if(secondary&&py<font*2)py=Math.min(720-font,py+font);
    c.translate(px,py);if(!this.reduced){c.rotate(e.secondary?.025:-.035);c.scale(pop,pop);}
    c.globalAlpha=Math.min(1,(1-t)*5);c.strokeStyle=PAPER;c.lineWidth=5;c.strokeText(e.text,0,0);c.fillStyle=e.colour;c.fillText(e.text,0,0);
    c.restore();
  }
  draw(game){
    const c=this.ctx,p=game.p;c.clearRect(0,0,360,720);c.fillStyle='#fffdf7';c.fillRect(0,0,360,720);c.strokeStyle='rgba(110,85,68,.075)';c.lineWidth=1;
    for(let n=1;n<20;n++){if(n<10)stroke(c,[[n*S,0],[n*S,720]]);stroke(c,[[0,n*S],[360,n*S]]);}
    if(game.controllable()&&!p.locked){const goal=game.landingY();if(goal>p.y+.3)for(const [dx,dy] of p.cells)this.cell(p.x+dx,goal+dy,p.colour,'normal','fall',0,0,true);}
    for(let y=0;y<20;y++)for(let x=0;x<10;x++){
      const tile=game.board[y][x];if(!tile)continue;
      if(tile.kind==='ink'){this.inkCell(x,y,tile);continue;}
      this.cell(x,y,tile.colour,tile.toy||'normal','rest');
      if(tile.toy&&tile.toy!=='normal'){c.save();c.fillStyle='rgba(98,78,72,.36)';ellipse(c,x*S+29,y*S+7,1.5,1.5,true);c.restore();}
    }
    if(p.state!=='full')this.piece(p);
    if(p.state==='draw'){const target=p.targets[p.inkIndex];this.inkCell(target.x,target.y,target,Math.min(1,p.ms/260),!this.reduced);}
    for(const e of game.effects)this.word(e,game.clock.elapsed,p);
    if(p.state==='full'){
      c.save();c.fillStyle='rgba(255,249,237,.95)';c.fillRect(20,284,320,138);c.fillStyle=INK;c.textAlign='center';c.font="700 30px 'Gaegu Toys', Gaegu,sans-serif";c.fillText('보드가 꽉 찼어요',180,333);c.font='18px sans-serif';c.fillText('보드 비우기로 다시 시작해요',180,376);c.restore();
    }
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports={ToyPainter};else root.ToyPainter=ToyPainter;
})(typeof window!=='undefined'?window:globalThis);
