// Home source is maintained under src/. Copy deterministic assets to the static host root.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const file of ['bloom-visual.css','assets/paper-grain.svg','assets/crayon-stroke.svg','assets/paper-star.svg','assets/paper-flower.svg','assets/fonts/gaegu-bold.woff','assets/fonts/OFL.txt','bloom-home.js','bloom-home.css','bloom-celebration.js','bloom-celebration.css','bloom-audio.js','bloom-loading.js','bloom-loading.css','bloom-tutorial.js','bloom-tutorial.css','assets/bloom-home-hero.webp','assets/bloom-home-logo.webp','assets/bloom-happy.webp','assets/bloom-chick.webp']){
 const out=path.join(root,'dist',file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,'src',file),out);
}
// Test-only first installation fixture: canonical app HTML and identical cache keys.
// The shim replaces the property before any application script executes. It never
// reads, writes or clears the real browser Storage object.
const firstInstallShim=`(() => {
 'use strict';
 const data=new Map();let writes=0;
 const memory={get length(){return data.size;},key:i=>[...data.keys()][i]??null,
  getItem:k=>data.has(String(k))?data.get(String(k)):null,
  setItem(k,v){writes++;data.set(String(k),String(v));},
  removeItem(k){writes++;data.delete(String(k));},clear(){writes++;data.clear();}};
 Object.defineProperty(window,'localStorage',{configurable:true,value:memory});
 window.__BLOOM_FIRST_INSTALL_QA__=Object.freeze({stats:()=>({initialEntries:0,entries:data.size,writes,storage:'empty-memory-before-app'})});
})();`;
const canonical=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
if(!canonical.includes('<head>'))throw Error('Canonical HTML head is missing');
const firstInstall=canonical.replace('<head>','<head>\n<base href="../">\n<meta name="robots" content="noindex,nofollow">\n<meta name="rc-first-install" content="empty-memory-before-app">\n<script id="qa-first-install-storage">'+firstInstallShim+'</script>');
fs.mkdirSync(path.join(root,'dist/qa'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/qa/first-install.html'),firstInstall);
