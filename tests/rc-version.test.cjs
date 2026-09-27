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
