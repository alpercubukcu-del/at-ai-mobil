/**
 * Klasik Analiz V3.2 — bağımsız Node.js web sunucusu.
 * Vercel, IndexedDB, localStorage ve cloud deployment kullanılmaz.
 * TJK API'lerini bu bilgisayarda/özel sunucuda aynı adresten sunar.
 *
 * node klasik-v32/server.mjs
 * AT_KLASIK_HOST=0.0.0.0 AT_KLASIK_PORT=8787 node klasik-v32/server.mjs
 */
import http from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
import programHandler from "../api/tjk-program.js";
import resultsHandler from "../api/tjk-day-results-v1.js";
import betsHandler from "../api/tjk-bet-starts-v11.js";

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const APIs=new Map([
  ["/api/tjk-program",programHandler],
  ["/api/tjk-day-results-v1",resultsHandler],
  ["/api/tjk-bet-starts-v11",betsHandler]
]);
const STATIC=new Map([
  ["/klasik-v32/","index.html"],
  ["/klasik-v32/index.html","index.html"],
  ["/klasik-v32/styles.css","styles.css"],
  ["/klasik-v32/app.mjs","app.mjs"],
  ["/klasik-v32/core.mjs","core.mjs"],
  ["/klasik-v32/bulk.mjs","bulk.mjs"]
]);
const TYPES={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".mjs":"text/javascript; charset=utf-8"};

function reply(res,status,content,type="application/json; charset=utf-8"){
  if(res.writableEnded)return;
  res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.end(type.startsWith("application/json")?JSON.stringify(content):content);
}
/**
 * Sunucu adaptörü: API'lerin Vercel benzeri req/res beklentisini
 * barındırma platformundan bağımsız standart Node HTTP'ye dönüştürür.
 */
export function nodeResponseAdapter(res){
  let status=200,headers={};
  return {
    status(code){status=code;return this;},
    setHeader(name,value){headers[name]=String(value);return this;},
    json(data){
      if(res.writableEnded)return this;
      res.writeHead(status,{"Content-Type":"application/json; charset=utf-8",
        "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers});
      res.end(JSON.stringify(data));return this;
    }
  };
}
export function createClassicServer({apis=APIs,staticFiles=STATIC,readStatic=readFile}={}){
  return http.createServer(async(req,res)=>{
    if(req.method!=="GET"){reply(res,405,{ok:false,error:"Yalnız GET desteklenir"});return;}
    let url;
    try{url=new URL(req.url||"/","http://localhost");}
    catch{reply(res,400,{ok:false,error:"Geçersiz URL"});return;}
    if(url.pathname==="/"){res.writeHead(302,{Location:"/klasik-v32/"});res.end();return;}
    const handler=apis.get(url.pathname);
    if(handler){
      const query=Object.fromEntries(url.searchParams.entries());
      try{
        await handler({method:"GET",query},nodeResponseAdapter(res));
        if(!res.writableEnded)reply(res,502,{ok:false,error:"TJK servisi yanıt üretmedi"});
      }catch(err){
        reply(res,502,{ok:false,error:"TJK servis hatası: "+String(err?.message||err)});
      }
      return;
    }
    const filename=staticFiles.get(url.pathname);
    if(!filename){reply(res,404,{ok:false,error:"Böyle bir sayfa yok"});return;}
    try{
      const file=await readStatic(path.join(ROOT,filename));
      reply(res,200,file,TYPES[path.extname(filename)]||"application/octet-stream");
    }catch(e){reply(res,500,{ok:false,error:"Uygulama dosyası okunamadı: "+e.code});}
  });
}
const isCli=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCli){
  const host=process.env.AT_KLASIK_HOST||"127.0.0.1";
  const port=Number(process.env.AT_KLASIK_PORT||8787);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error("AT_KLASIK_PORT geçersiz");
  const server=createClassicServer();
  server.listen(port,host,()=>{
    console.log("[KLASIK V3.2] Web arayüzü: http://"+host+":"+port+"/klasik-v32/");
    console.log("[KLASIK V3.2] TJK veri API'leri aynı Node sunucusunda çalışıyor.");
    console.log("[KLASIK V3.2] Kalıcı kayıt için klasör seçin veya ZIP yedeği indirin. IndexedDB kullanılmaz.");
  });
}
