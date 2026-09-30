/* Production adapter: normal queue, scoring, items and controls stay with the game. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'),require('./toy-blocks-core.js'),require('./toy-blocks-view.js').ToyPainter);
  else root.ToyBlocks=factory(root.GlassEngine,root.ToyLabKit,root.ToyPainter);
})(typeof globalThis!=='undefined'?globalThis:this,function(E,K,Painter){
'use strict';
const KINDS=['bouncy','fat','coward','doodle'];
const LABELS={bouncy:'통통이',fat:'뚱뚱이',coward:'겁쟁이',doodle:'낙서쟁이'};
const HELP={bouncy:'착지하면 통! 옆으로 튀고 낮은 곳으로 굴러요.',fat:'착지하면 뿌웅! 좌우 빈칸으로 몸이 커져요.',coward:'착지 직전 으악! 옆으로 한 칸 도망가요.',doodle:'착지하면 슥삭! 주변에 낙서 1~2칸을 남겨요.'};
const COLOURS={I:'#77c9f4',O:'#ffd86e',T:'#caa0ef',S:'#82d89b',Z:'#f58db8',J:'#ffb09a',L:'#9fd8f6'};
function painter(ctx,kind,reduced=false,scale=1){return Object.assign(Object.create(Painter.prototype),{ctx,kind,reduced,scale});}
function drawCell(ctx,cell,x,y,size=36,reduced=false){
  if(!cell.toy&&!cell.toyInk)return false;
  const v=painter(ctx,cell.toy?.kind||'doodle',reduced,size/36);
  ctx.save();ctx.translate(x,y);ctx.scale(size/36,size/36);
  if(cell.toyInk)v.inkCell(0,0,cell.toyInk);
  else{
    v.cell(0,0,COLOURS[cell.type]||COLOURS.I,cell.toy.kind,'rest');
    if(cell.toy.face)v.face(0,0,cell.toy.kind,'fall',0,0);
    if(cell.toy.crayon)v.crayon(24,26,'#d75c86',-2.15);
  }
  ctx.restore();return true;
}
class System{
  constructor(game,{onLock=()=>game.lock(),onDone=()=>{},learned=null,onEncounter=()=>{}}={}){
    this.game=game;this.onLock=onLock;this.onDone=onDone;this.onEncounter=onEncounter;this.guided=learned!==null;this.learned=learned||{};this.intro=null;
    this.clock=new K.ToyClock('cycle');this.rng=E.random(game.seed+'/toys-v1');
    this.nextKind=this.guided?Math.max(0,KINDS.findIndex(k=>!this.learned[k])):0;this.scheduled=null;this.animation=null;this.linger=null;this.accumulator=0;
    const system=this,spawn=game.spawn;
    // Extra pieces are inserted ahead of the four normal previews. Taking an
    // inserted piece does not consume the seven-bag RNG or discard a normal.
    game.spawn=function(){
      let ok;
      if(this.queue.length>4){this.active=this.queue.shift();this.active.x=this.active.type==='O'?4:3;this.active.y=0;this.holdUsed=false;this.over=!this.fits(this.active);ok=!this.over;}
      else ok=spawn.call(this);
      if(ok)system.didSpawn(this.active);return ok;
    };
    if(this.guided){this.clock.pending=null;this.firstPending=true;}else{game.queue.unshift(game.active);game.active=this.makePiece(KINDS[this.nextKind++]);this.clock.take(game.active.toy.id);}
  }
  get busy(){return !!this.animation;}
  cancel(){this.animation=null;this.linger=null;this.accumulator=0;}
  makePiece(kind){
    if(!KINDS.includes(kind))throw new Error('Unknown toy');
    const g=this.game,type=Object.keys(E.SHAPES)[Math.floor(this.rng()*7)],id=g.serial+1;
    const cells=E.SHAPES[type].map(([x,y],i)=>({x,y,type,mask:0,id:++g.serial,toy:{kind,id,face:i===0,crayon:kind==='doodle'&&i===1}}));
    return{type,size:type==='I'?4:type==='O'?2:3,x:type==='O'?4:3,y:0,cells,toy:{kind,id,seed:Math.floor(this.rng()*4294967296)}};
  }
  advance(ms){
    if(!Number.isFinite(ms)||ms<=0||this.game.over)return;
    this.clock.advanceTo(this.clock.elapsed+ms);
    if(this.firstPending){this.clock.pending=null;if(this.game.pieces>=3||this.game.lines>0){this.firstPending=false;this.clock.pending={reservedAt:this.clock.elapsed,reason:'basic-success'};this.clock.next=this.clock.elapsed+60000;}}
    if(this.clock.pending&&!this.scheduled){
      const p=this.makePiece(KINDS[this.nextKind++%KINDS.length]);
      this.game.queue.unshift(p);this.scheduled=p.toy.id;
    }
  }
  didSpawn(piece){
    if(this.guided&&piece?.toy&&!this.learned[piece.toy.kind]){this.learned[piece.toy.kind]=true;this.intro={kind:piece.toy.kind,id:piece.toy.id};this.onEncounter(piece.toy.kind);}
    if(piece?.toy?.id===this.scheduled){this.clock.take(this.scheduled);this.scheduled=null;}
  }
  shouldPanic(){return !this.busy&&this.game.active?.toy?.kind==='coward'&&this.game.dropDistance()<=1;}
  begin(){
    const g=this.game,source=g.active;
    if(this.busy||!source?.toy)return false;
    const sim=Object.assign(Object.create(K.ToyLab.prototype),{
      kind:source.toy.kind,rng:K.seeded(source.toy.seed??source.toy.id),board:g.board,effects:[],clock:this.clock,bounce:'normal',message:'',locks:0,lastLock:null,
      p:{id:source.toy.id,type:source.toy.kind,cells:source.cells.map(c=>[c.x,c.y]),original:source.cells.map(c=>[c.x,c.y]),
        x:source.x,y:source.y,colour:COLOURS[source.type],state:'fall',ms:0,used:false,dir:0,automaticMoves:0,userMoves:0,fast:true,locked:false,extra:[],added:[]}
    });
    const system=this;
    sim.spawn=function(){this.done=true;};
    sim.lock=function(){
      const p=this.p;if(p.locked)return false;
      if(this.hit(p.x,p.y)||Math.abs(p.y-Math.round(p.y))>1e-7||!this.hit(p.x,p.y+1))throw new Error('Unsafe toy landing');
      p.y=Math.round(p.y);p.locked=true;
      const original=new Map(source.cells.map(c=>[c.x+','+c.y,c]));
      g.active={...source,x:p.x,y:p.y,cells:p.cells.map(([x,y])=>{
        const cell=original.get(x+','+y);
        return cell?{...cell}:{x,y,type:source.type,mask:0,id:++g.serial,toy:{kind:p.type,id:p.id,face:false,crayon:false}};
      })};
      system.onLock();this.board=g.board;this.locks++;
      this.lastLock={id:p.id,type:p.type,added:[]};
      if(p.type==='doodle'){this.prepareInk();return true;}
      this.transition('settle');
      if(p.type==='bouncy')this.say('land',true);
      if(p.type==='fat'&&p.extra.length)this.say('taDa',true);
      if(p.type==='coward')this.say('relief',true);
      return true;
    };
    const stroke=sim.finishStroke;
    sim.finishStroke=function(){
      const target=this.p.targets[this.p.inkIndex];stroke.call(this);
      if(target&&this.board[target.y][target.x]?.owner===this.p.id){
        this.board[target.y][target.x]={type:source.type,mask:0,id:++g.serial,toyInk:{colour:target.colour,pattern:target.pattern}};
      }
    };
    this.animation=sim;this.accumulator=0;
    if(sim.p.type==='coward'){
      const goal=sim.landingY(),above=Math.max(0,goal-1);sim.p.y=sim.hit(sim.p.x,above)?goal:above;sim.panic();
    }else sim.land();
    return true;
  }
  update(dt){
    const sim=this.animation;if(!sim)return;
    this.accumulator+=Math.min(100,Math.max(0,dt));
    while(this.accumulator>=5&&!sim.done){this.accumulator-=5;sim.step(5);}
    if(sim.done){this.linger=sim;this.animation=null;this.accumulator=0;this.onDone();}
  }
  prediction(){
    const g=this.game,p=g.active;if(!p?.toy||this.busy)return null;
    const key=JSON.stringify([{...p,y:p.y+g.dropDistance()},g.board]);if(this.previewKey===key)return this.preview;
    const clone=Object.assign(Object.create(Object.getPrototypeOf(g)),JSON.parse(JSON.stringify(g)));
    clone.move(0,clone.dropDistance());
    const sim=Object.assign(Object.create(System.prototype),{game:clone,clock:new K.ToyClock('repeat'),onLock:()=>clone.lock(),onDone:()=>{},accumulator:0});
    sim.begin();let steps=0;while(sim.busy&&steps++<500)sim.update(10);
    if(sim.busy)throw new Error('Toy preview did not settle');
    const cells=[];for(let y=0;y<20;y++)for(let x=0;x<10;x++)if(clone.board[y][x]&&!g.board[y][x])cells.push({x,y,ink:!!clone.board[y][x].toyInk,extra:!p.cells.some(c=>c.x+p.x===x&&c.y+p.y+g.dropDistance()===y)});
    this.previewKey=key;return this.preview={cells,kind:p.toy.kind,dir:sim.linger.p.dir};
  }
  drawPrediction(ctx){
    const preview=this.prediction();if(!preview)return;
    ctx.save();ctx.strokeStyle='#76516e';ctx.fillStyle='#76516e';ctx.lineWidth=2;ctx.font="700 20px 'Gaegu Toys', Gaegu, sans-serif";ctx.setLineDash([5,4]);
    for(const c of preview.cells){ctx.strokeRect(c.x*36+4,c.y*36+4,28,28);if(c.ink){ctx.beginPath();ctx.moveTo(c.x*36+10,c.y*36+24);ctx.lineTo(c.x*36+18,c.y*36+12);ctx.moveTo(c.x*36+17,c.y*36+24);ctx.lineTo(c.x*36+25,c.y*36+12);ctx.stroke();}else if(c.extra){ctx.fillText('+',c.x*36+12,c.y*36+24);}}
    ctx.setLineDash([]);ctx.font="700 20px 'Gaegu Toys', Gaegu, sans-serif";
    if(preview.dir){const p=this.game.active;ctx.fillText(preview.dir<0?'←':'→',(p.x+1)*36,Math.max(22,Math.min(690,(p.y+this.game.dropDistance())*36-8)));}
    ctx.restore();
  }
  ownsAnimated(cell){return this.animation?.p.locked&&cell.toy?.id===this.animation.p.id;}
  draw(ctx,reduced=false,scale=1){
    const sim=this.animation||this.linger;if(!sim)return;
    const v=painter(ctx,sim.p.type,reduced,scale);
    if(this.animation){
      v.piece(sim.p);
      // Item badges remain visible throughout the body's short landing action.
      for(const c of this.game.active?.cells||[])if(c.special&&typeof window!=='undefined')window.BloomItemArt?.draw(ctx,c.special.type,(sim.p.x+c.x+.72)*36,(sim.p.y+c.y+.3)*36,16);
      if(sim.p.state==='draw'){const t=sim.p.targets[sim.p.inkIndex];v.inkCell(t.x,t.y,t,Math.min(1,sim.p.ms/260),!reduced);}
    }
    for(const e of sim.effects)v.word(e,this.clock.elapsed,sim.p);
  }
}
return{System,drawCell,KINDS,LABELS,HELP,version:'TOY MAIN 1'};
});
