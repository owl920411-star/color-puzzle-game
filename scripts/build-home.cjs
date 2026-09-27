// Home source is maintained under src/. Copy deterministic assets to the static host root.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const file of ['bloom-home.js','bloom-home.css','bloom-celebration.js','bloom-celebration.css','bloom-audio.js','bloom-loading.js','bloom-loading.css','bloom-tutorial.js','bloom-tutorial.css','assets/bloom-home-hero.webp','assets/bloom-home-logo.webp','assets/bloom-chick.webp']){
 const out=path.join(root,'dist',file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,'src',file),out);
}
