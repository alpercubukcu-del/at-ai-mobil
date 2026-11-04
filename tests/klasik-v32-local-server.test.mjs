import test from "node:test";
import assert from "node:assert/strict";
import {once} from "node:events";
import {createClassicServer} from "../klasik-v32/server.mjs";

async function withServer(fn){
  const server=createClassicServer({
    apis:new Map([["/api/tjk-program",async (req,res)=>res.status(200).json({
      ok:true,date:req.query.date,cityId:req.query.cityId||null,catalog:req.query.catalog||null
    })]]),
    readStatic:async()=>Buffer.from("<h1>Klasik Analiz V3.2</h1>")
  });
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const base="http://127.0.0.1:"+server.address().port;
  try{await fn(base);}finally{server.close();await once(server,"close");}
}
test("standalone server opens Classic page without Vercel",async()=>{
  await withServer(async base=>{
    const res=await fetch(base+"/klasik-v32/");
    assert.equal(res.status,200);
    assert.match(await res.text(),/Klasik Analiz V3\.2/);
  });
});
test("server maps TJK query to Node HTTP handler",async()=>{
  await withServer(async base=>{
    const res=await fetch(base+"/api/tjk-program?date=2026-11-04&catalog=1");
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.date,"2026-11-04");
    assert.equal(data.catalog,"1");
  });
});
test("unlisted paths are not proxied and POST requests are refused",async()=>{
  await withServer(async base=>{
    assert.equal((await fetch(base+"/api/private")).status,404);
    assert.equal((await fetch(base+"/klasik-v32/",{method:"POST"})).status,405);
  });
});
test("root redirects to Classic only",async()=>{
  await withServer(async base=>{
    const res=await fetch(base+"/",{redirect:"manual"});
    assert.equal(res.status,302);
    assert.equal(res.headers.get("location"),"/klasik-v32/");
  });
});
