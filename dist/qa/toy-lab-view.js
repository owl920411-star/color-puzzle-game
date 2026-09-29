/* Hand-drawn laboratory renderer. No random calls, input or game mutations. */
(function(root){
'use strict';
const S=36,INK='#624e48',PAPER='#fffaf0';
function path(ctx,points){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);}
function stroke(ctx,points){path(ctx,points);ctx.stroke();}
function ellipse(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill)ctx.fill();else ctx.stroke();}
class ToyPainter{
  constructor(canvas,kind,reduced=false){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.kind=kind;this.reduced=reduced;this.scale=1;}
  resize(dpr=1){dpr=Math.max(1,Math.min(3,dpr));this.canvas.width=360*dpr;this.canvas.height=720*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.scale=(this.canvas.getBoundingClientRect?.().width||360)/360;}
  cell(col,row,colour,type='normal',phase='fall',age=0,dir=0,ghost=false){
    const c=this.ctx;c.save();c.translate(col*S,row*S);c.strokeStyle=INK;c.fillStyle=colour;c.lineWidth=1.8;c.lineJoin='round';
    if(ghost){c.globalAlpha=.46;c.setLineDash([4,4]);c.strokeStyle='#ad9184';}
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
      stroke(c,[[-6,0],[-4,-1],[-2,0]]);stroke(c,[[2,0],[4,-1],[6,0]]);
      c.beginPath();c.moveTo(-3,5);c.quadraticCurveTo(0,8,3,5);c.stroke();
      c.strokeStyle='#aa7068';c.lineWidth=1.5;c.beginPath();c.moveTo(-10,10);c.bezierCurveTo(-8,20,10,20,11,10);c.stroke();
      c.fillStyle='#b47c72';ellipse(c,1,13,1,1,true);
      if(phase==='fatpop'){stroke(c,[[-6,-4],[-2,-5]]);stroke(c,[[2,-5],[6,-4]]);}
    }
    c.restore();
  }
  piece(p){
    const c=this.ctx,phase=p.state;c.save();
    for(const [dx,dy] of p.cells)this.cell(p.x+dx,p.y+dy,p.colour,p.type,phase,p.ms,p.dir);
    const [fx,fy]=p.original[0];this.face(p.x+fx,p.y+fy,p.type,phase,p.ms,p.dir);
    c.restore();
  }
  word(e,time,p){
    let age=time-e.born;if(age<0||age>=e.ms)return;
    const c=this.ctx,t=age/e.ms,secondary=e.secondary;
    const font=Math.min(40,Math.max(26,(secondary?17:22)/this.scale));
    c.save();c.font=`700 ${font}px Gaegu, 'Malgun Gothic', sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
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
      this.cell(x,y,tile.colour,tile.toy||'normal','rest');
      if(tile.toy&&tile.toy!=='normal'){c.save();c.fillStyle='rgba(98,78,72,.36)';ellipse(c,x*S+29,y*S+7,1.5,1.5,true);c.restore();}
    }
    if(p.state!=='full')this.piece(p);
    for(const e of game.effects)this.word(e,game.clock.elapsed,p);
    if(p.state==='full'){
      c.save();c.fillStyle='rgba(255,249,237,.95)';c.fillRect(20,284,320,138);c.fillStyle=INK;c.textAlign='center';c.font='700 30px Gaegu,sans-serif';c.fillText('보드가 꽉 찼어요',180,333);c.font='18px sans-serif';c.fillText('보드 비우기로 다시 시작해요',180,376);c.restore();
    }
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports={ToyPainter};else root.ToyPainter=ToyPainter;
})(typeof window!=='undefined'?window:globalThis);
