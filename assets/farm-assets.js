/* Farm Friends: use the supplied art sheets as atlases, without server-side
 * image manipulation or an external image service. Crop once before gameplay.
 * The resulting local data URLs are reused by the puzzle HUD and effects. */
(async function loadFarmArt(){
  'use strict';
  const button=document.getElementById('startBtn');
  button.disabled=true;button.textContent='농장 친구들을 불러오고 있어요…';
  const assets={scene:'assets/farm-day.webp',festival:'assets/farm-festival.webp',mascots:'assets/farm-mascots.webp'};
  const atlases={
    farm:{url:'assets/farm-reference.png',size:[1536,1024],rects:{
      'bud-red':[331,47,96,95], 'bud-blue':[649,174,96,94],
      'bud-yellow':[540,47,96,95], 'flower-purple':[540,174,96,94],
      'flower-orange':[435,47,95,95], 'flower-green':[650,47,95,95],
      'farm-daisy':[330,174,96,94], 'farm-peach':[435,174,95,94],
      'farm-star':[1010,169,112,112], 'farm-gift':[892,171,111,108]
    }},
    festival:{url:'assets/festival-reference.png',size:[1536,1024],rects:{
      'festival-balloon':[109,407,85,88], 'festival-pinwheel':[206,407,85,88],
      'festival-gift':[206,541,85,87], 'festival-cupcake':[306,407,84,88],
      'festival-lantern':[109,541,85,87], 'festival-ticket':[403,541,84,87]
    }}
  };
  function load(url){return new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(url));img.src=url;
  });}
  const failed=[];
  await Promise.all(Object.values(atlases).map(async atlas=>{
    try{
      const source=await load(atlas.url),sx=source.naturalWidth/atlas.size[0],sy=source.naturalHeight/atlas.size[1];
      for(const [name,[x,y,w,h]] of Object.entries(atlas.rects)){
        const canvas=document.createElement('canvas');canvas.width=144;canvas.height=144;
        const ctx=canvas.getContext('2d');
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
        ctx.beginPath();ctx.roundRect(0,0,144,144,20);ctx.clip();
        ctx.drawImage(source,x*sx,y*sy,w*sx,h*sy,0,0,144,144);
        assets[name]=canvas.toDataURL('image/png');
      }
    }catch(error){failed.push(atlas.url);}
  }));
  if(failed.length){
    const warning=document.getElementById('assetWarning');warning.classList.remove('hide');
    warning.textContent='농장 그림을 불러오지 못했어요. 아래 버튼으로 다시 시도해 주세요.';
    button.disabled=false;button.textContent='그림 다시 불러오기';button.onclick=()=>location.reload();
    document.documentElement.dataset.assetsReady='error';return;
  }
  // Original logical asset keys deliberately survive the visual update.
  window.FLOWER_BLOOM_ASSETS=assets;
  window.FARM_FRIENDS_ASSETS=assets;
  const script=document.createElement('script');script.src='game.js?v=festival-spectacle-3';
  script.onerror=()=>{
    button.disabled=false;button.textContent='게임 다시 불러오기';button.onclick=()=>location.reload();
    const warning=document.getElementById('assetWarning');warning.textContent='게임을 불러오지 못했어요. 다시 시도해 주세요.';warning.classList.remove('hide');
  };
  document.body.appendChild(script);
})();
