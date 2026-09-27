/* Original generated artwork; sample each tile once, then reuse small canvases. */
(() => {
 'use strict';
 const tiles={glass:{},jelly:{},water:{},sand:{}},shards={glass:[],jelly:[]};
 let backdrop=null;const backdrops={},menuCards={};
 const glassRects={I:[168,126,127,127],O:[779,44,128,128],T:[42,384,124,124],S:[573,385,121,121],Z:[880,387,122,122],J:[169,699,123,123],L:[929,698,119,120]};
 const jellyRects={I:[186,128,126,126],O:[795,58,119,119],T:[49,384,121,121],S:[574,384,116,116],Z:[857,383,115,115],J:[178,704,124,124],L:[953,703,124,124]};
 // Jelly's four paint identities stay coral, green, gold, purple.
 const paintTypes=['Z','S','O','T'];
 function sample(image,rect,size=96){
  const c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(image,...rect,0,0,size,size);return c;
 }
 function load(file,done){
  const image=new Image();image.decoding='async';
  image.onload=()=>{done(image);window.dispatchEvent(new Event('glassartready'));};
  // The original vector renderer remains usable if a download fails.
  image.onerror=()=>{};image.src='assets/'+file;
 }
 load('glass-atlas.webp',image=>{
  for(const [key,rect]of Object.entries(glassRects))tiles.glass[key]=sample(image,rect);
 });
 load('glass-fragments.webp',image=>{
  for(const rect of [[16,218,354,355],[405,278,183,250],[635,234,321,340],[1005,263,213,288],[24,720,312,350],[376,762,247,319],[645,763,316,292],[1004,810,206,232]])shards.glass.push(sample(image,rect,64));
 });
 load('jelly-atlas.webp',image=>{for(const [key,rect]of Object.entries(jellyRects))tiles.jelly[key]=sample(image,rect);});
 load('jelly-fragments.webp',image=>{
  // Group the scattered atlas sprites by gameplay paint, not by shape.
  const rows=window.GlassArt.jellyFragmentRects;
  for(const row of rows)shards.jelly.push(row.map(rect=>sample(image,rect,64)));
 });
 load('crystal-background.webp',image=>{
  backdrop=document.createElement('canvas');backdrop.width=360;backdrop.height=720;
  const g=backdrop.getContext('2d');
  const ratio=Math.max(360/image.width,720/image.height),w=image.width*ratio,h=image.height*ratio;
  g.drawImage(image,(360-w)/2,(720-h)/2,w,h);
  g.fillStyle='#071222b8';g.fillRect(0,0,360,720);
 });
 // Supplied design sheets are sampled once; full reference images never cover live controls.
 load('design-menu.jpg',image=>{
  ['glass','sand','water','jelly'].forEach((kind,i)=>{menuCards[kind]=sample(image,[45+i*241,264,212,174],320);});
 });
 load('design-materials.jpg',image=>{
  ['glass','sand','water','jelly'].forEach((kind,i)=>{
   const c=document.createElement('canvas');c.width=360;c.height=720;const g=c.getContext('2d');
   g.drawImage(image,154+i*384,650,70,140,0,0,360,720);
   const shade=g.createLinearGradient(0,0,0,720);shade.addColorStop(0,'#061020b8');shade.addColorStop(.5,'#061020db');shade.addColorStop(1,'#061020b8');g.fillStyle=shade;g.fillRect(0,0,360,720);backdrops[kind]=c;
  });
  [[833,356,29,29],[1065,345,28,28],[962,416,28,28],[1067,446,27,27]].forEach((r,i)=>tiles.water[i]=sample(image,r));
  tiles.sand[0]=sample(image,[452,356,27,27]);
  const purple=sample(image,[452,356,27,27]);const g=purple.getContext('2d');g.globalCompositeOperation='color';g.fillStyle='#ad75d4';g.fillRect(0,0,96,96);g.globalCompositeOperation='source-over';tiles.sand[1]=purple;
 });
 window.GlassArt={
  jellyFragmentRects:[
   [[1020,34,214,215],[292,280,192,202],[36,752,216,204],[536,1004,198,196]],
   [[764,28,218,220],[33,505,206,223],[793,773,191,192],[1018,1000,214,210]],
   [[271,40,220,208],[518,510,216,215],[278,988,220,224]],
   [[510,27,229,223],[1023,263,203,224],[286,532,208,176],[36,988,215,219]]
  ],
  tile(g,c,kind,x,y,size){
   const key=kind==='jelly'?paintTypes[c.paint??0]:['sand','water'].includes(kind)?c.paint??0:c.type;
   const sprite=tiles[kind]?.[key];if(!sprite)return false;
   g.save();g.beginPath();g.roundRect(x,y,size,size,kind==='jelly'?size*.19:size*.025);g.clip();
   g.drawImage(sprite,x,y,size,size);g.restore();return true;
  },
  particle(g,p){
   const list=p.kind==='jelly'?shards.jelly[p.paint??0]:shards.glass;
   if(!list?.length||!['glass','jelly'].includes(p.kind))return false;
   const sprite=list[p.sprite%list.length],side=p.size*(p.kind==='glass'?3.1:3.6);
   g.save();
   if(p.kind==='jelly'){const stretch=Math.sin((1-p.life/p.total)*Math.PI*3)*.18;g.scale(1+stretch,1-stretch);}
   g.drawImage(sprite,-side/2,-side/2,side,side);g.restore();return true;
  },
  menu(root){for(const c of root.querySelectorAll('.mode-art')){const art=menuCards[c.dataset.art];if(art)c.getContext('2d').drawImage(art,0,0,c.width,c.height);}},
  background(g,kind='glass'){const image=backdrops[kind]||backdrop;if(image)g.drawImage(image,0,0);}
 };
})();
