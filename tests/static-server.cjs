const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const MIME={
 '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml',
 '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
 '.gif':'image/gif', '.ico':'image/x-icon', '.mp3':'audio/mpeg', '.wav':'audio/wav',
 '.woff':'font/woff', '.woff2':'font/woff2'
};

// Exercise the same local asset URLs as deployment instead of returning HTML
// for every image request. Missing assets must fail visibly in browser tests.
function createStaticServer(directory){
 const root=fs.realpathSync(directory);
 return http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;
  }
  let filename;
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   filename=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
   if(filename!==root&&!filename.startsWith(root+path.sep)){
    res.writeHead(403);res.end();return;
   }
   filename=fs.realpathSync(filename);
   if(filename!==root&&!filename.startsWith(root+path.sep)){
    res.writeHead(403);res.end();return;
   }
   const stat=fs.statSync(filename);
   if(!stat.isFile()){res.writeHead(404);res.end();return;}
   res.writeHead(200,{
    'Content-Type':MIME[path.extname(filename).toLowerCase()]||'application/octet-stream',
    'Content-Length':stat.size,
    'Cache-Control':'no-store'
   });
   if(req.method==='HEAD'){res.end();return;}
   const stream=fs.createReadStream(filename);
   stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch(error){
   res.writeHead(error.code==='ENOENT'||error.code==='ENOTDIR'?404:400);res.end();
  }
 });
}

module.exports={createStaticServer};
