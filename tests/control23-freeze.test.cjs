'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const source=fs.readFileSync(require.resolve('../dist/endless-app.js'),'utf8');
for(const span of require('./helpers/control23-freeze.json'))test(`CONTROL FINAL frozen ${span.name}`,()=>{
 const start=source.indexOf(span.start),end=source.indexOf(span.end,start);
 assert.ok(start>=0&&end>start,'frozen boundary must exist');
 assert.equal(crypto.createHash('sha256').update(source.slice(start,end)).digest('hex'),span.sha256,'input change requires an explicit reason and renewed CONTROL gate');
});
