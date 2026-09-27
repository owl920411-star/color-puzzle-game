'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot}=require('./helpers/adaptive-stable-harness.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('canonical product entry loads existing current assets without obsolete art downloads',()=>{
 const html=read('dist/index.html');
 assert.doesNotMatch(html,/<script[^>]+src="(?:sand-micro|art\.js|app\.js|stages\.js|progression\.js|glass-shatter-fx)/);
 for(const match of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"?]+)(?:\?[^"]*)?"/g)){
  if(!/^(?:https?:|data:)/.test(match[1]))assert.ok(fs.existsSync(path.join(__dirname,'../dist',match[1])),match[1]+' must exist');
 }
});
test('old CONTROL 23 link redirects to canonical entry without a retired game',()=>{
 const html=read('dist/control23.html');assert.match(html,/url=\.\/index\.html/);assert.doesNotMatch(html,/<script|sand|모래|glass/i);
});
test('single-mode menus and official mascot have no retired user-facing vocabulary',()=>{
 const a=boot();const forbidden=/사막|모래|피라미드|이집트|호루스|스카라베|미라|유리|DESERT|GLASSFALL|SAND|CONTROL 18/;
 assert.doesNotMatch(a.panel(),forbidden);
 a.menu('settings');assert.doesNotMatch(a.panel(),forbidden);a.menu('back');
 a.q.start();a.q.pause();assert.match(a.panel(),/처음 화면으로/);assert.doesNotMatch(a.panel(),forbidden);
 a.q.devPanel();assert.doesNotMatch(a.panel(),forbidden);
 a.menu('devrelicview');assert.doesNotMatch(a.panel(),forbidden);
 const app=read('dist/endless-app.js');assert.doesNotMatch(app,/glassartready|g\.arc\(31,684|g\.arc\(58,691/);
 assert.match(read('dist/adaptive-bridge.js'),/crayon-bloom-adaptive-diagnostic\.json/);
});
