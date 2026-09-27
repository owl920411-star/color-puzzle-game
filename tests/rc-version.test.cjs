'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('HTML build and every runtime JS/CSS cache key identify one release',()=>{
 const html=read('dist/index.html'),build=html.match(/name="crayon-build" content="([^"]+)"/)[1].toLowerCase();
 const assets=[...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))\?v=([^"&]+)"/g)];
 assert.ok(assets.length>=15);for(const [,asset,key]of assets)assert.equal(key,build,asset);
 const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)];assert.equal(scripts.length,assets.filter(m=>m[1].endsWith('.js')).length,'no unversioned runtime script');
});
test('home and game screen versions agree',()=>{
 const footer=read('dist/index.html').match(/id="build">CRAYON BLOOM · ([^<]+)/)[1];
 assert.ok(read('src/bloom-home.js').includes('<small>'+footer+'</small>'));
});
test('published presentation modules match their editable source',()=>{
 for(const file of fs.readdirSync(path.join(root,'src')).filter(f=>/^bloom-.*\.(?:js|css)$/.test(f)))assert.equal(read('dist/'+file),read('src/'+file),file);
});
test('first-install fixture embeds the identical canonical app and asset cache keys',()=>{
 const canonical=read('dist/index.html'),fixture=read('dist/qa/first-install.html');
 const injected=/\n<base href="\.\.\/">\n<meta name="robots" content="noindex,nofollow">\n<meta name="rc-first-install" content="empty-memory-before-app">\n<script id="qa-first-install-storage">[\s\S]*?<\/script>/;
 assert.match(fixture,injected);assert.equal(fixture.replace(injected,''),canonical);
 assert.ok(fixture.indexOf('id="qa-first-install-storage"')<fixture.search(/<script[^>]+src=/),'storage isolation must run before application scripts');
 const urls=s=>[...s.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))\?v=([^"&]+)"/g)].map(m=>[m[1],m[2]]);
 assert.deepEqual(urls(fixture),urls(canonical));
});
test('first-install shim starts empty without reading writing or clearing native storage',()=>{
 const vm=require('node:vm'),fixture=read('dist/qa/first-install.html'),code=fixture.match(/<script id="qa-first-install-storage">([\s\S]*?)<\/script>/)[1];
 let nativeTouches=0;const window={};Object.defineProperty(window,'localStorage',{configurable:true,get(){nativeTouches++;throw Error('native storage read');},set(){nativeTouches++;throw Error('native storage write');}});
 vm.runInNewContext(code,{window});assert.equal(nativeTouches,0);assert.equal(window.localStorage.length,0);assert.equal(window.__BLOOM_FIRST_INSTALL_QA__.stats().initialEntries,0);assert.equal(window.__BLOOM_FIRST_INSTALL_QA__.stats().writes,0);
 window.localStorage.setItem('glassfall-v1','{"tutorialCompleted":true}');assert.equal(window.localStorage.length,1);assert.equal(window.localStorage.getItem('glassfall-v1'),'{"tutorialCompleted":true}');window.localStorage.clear();assert.equal(window.localStorage.length,0);assert.equal(nativeTouches,0);
});
