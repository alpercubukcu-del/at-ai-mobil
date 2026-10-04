import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {timingSafeEqual} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
export function createApp({token,publicDir=path.join(root,'public'),apiDir=path.join(root,'api')}){
 if(!token||token.length<24)throw Error('Local session token required');
 const handlers=new Map(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
 const equal=s=>{const a=Buffer.from(String(s||'')),b=Buffer.from(token);return a.length===b.length&&timingSafeEqual(a,b)};
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://'+req.headers.host),origin=req.headers.origin;
   if(origin&&origin!=='http://'+req.headers.host){res.writeHead(403);return res.end('Origin blocked')}
   const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('at_session='))?.slice(11);
   if(url.pathname==='/'&&equal(url.searchParams.get('session')))res.setHeader('Set-Cookie','at_session='+token+'; HttpOnly; SameSite=Strict; Path=/');
   else if(!equal(cookie)){res.writeHead(401);return res.end('Local session required')}
   if(url.pathname==='/__health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,mode:'standalone',node:process.versions.node}))}
   if(url.pathname.startsWith('/api/')){
    const name=url.pathname.slice(5).replace(/\.js$/,'');if(!/^[a-zA-Z0-9_-]+$/.test(name)){res.writeHead(400);return res.end()}
    const file=path.join(apiDir,name+'.js');if(!fs.existsSync(file)){res.writeHead(404);return res.end(JSON.stringify({ok:false,error:'APK içinde API bulunamadı: '+name}))}
    if(!['GET','POST'].includes(req.method)){res.writeHead(405);return res.end()}
    if(req.method==='POST'){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4*1024*1024){res.writeHead(413);return res.end(JSON.stringify({ok:false,error:'İstek boyutu sınırı aşıldı.'}))}chunks.push(chunk)}try{req.body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{res.writeHead(400);return res.end(JSON.stringify({ok:false,error:'Geçersiz JSON isteği.'}))}}

    req.headers['x-forwarded-proto']='http';req.query=Object.fromEntries(url.searchParams);res.status=code=>{res.statusCode=code;return res};res.json=body=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));return res};
    let handler=handlers.get(name);if(!handler){handler=import(file).then(m=>m.default);handlers.set(name,handler)}await(await handler)(req,res);return;
   }
   let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html',file=path.resolve(publicDir,relative);
   if(!file.startsWith(path.resolve(publicDir)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
  }catch(error){if(!res.headersSent){res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:false,error:error.message}))}else res.destroy(error)}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.argv[2]),token=process.argv[3],base='http://127.0.0.1:'+port;process.chdir(root);process.env.AT_AI_LOCAL_API_BASE=base;
 const nativeFetch=globalThis.fetch;globalThis.fetch=(input,options={})=>{const url=typeof input==='string'?input:input.url||String(input);if(url.startsWith(base+'/api/')){const headers=new Headers(options.headers||{});headers.set('Cookie','at_session='+token);return nativeFetch(input,{...options,headers})}if(/https?:\/\/[^/]*(?:vercel\.app|github\.com)(?:\/|$)/i.test(url))throw Error('APK uzak uygulama servisine bağlanamaz.');return nativeFetch(input,options)};
 createApp({token}).listen(port,'127.0.0.1');
}
