const VERSION='MODEL-ROADMAP-CDN-CACHE-V16.8.8';
const TTL_MS=6*60*60*1000;
const memory=new Map();

const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function baseUrl(req){
  const host=clean(req.headers?.['x-forwarded-host'])||clean(req.headers?.host)||'at-ai-mobil.vercel.app';
  const proto=clean(req.headers?.['x-forwarded-proto'])||(host.includes('localhost')?'http':'https');
  return `${proto}://${host}`;
}
function targetUrl(req){
  const u=new URL('/api/tjk-model-roadmap-v11',baseUrl(req));
  for(const k of ['date','city','class','ageGroup','track','distance','minYear']){
    const v=clean(req.query?.[k]);if(v)u.searchParams.set(k,v);
  }
  if(!u.searchParams.has('minYear'))u.searchParams.set('minYear','2000');
  return u;
}
function cacheKey(u){return [...u.searchParams.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('&');}
function prune(){
  const now=Date.now();
  for(const [k,v] of memory)if(now-Number(v?.at||0)>TTL_MS)memory.delete(k);
  while(memory.size>40)memory.delete(memory.keys().next().value);
}
function headers(res,hit){
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
  res.setHeader('CDN-Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
  res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
  res.setHeader('X-AT-AI-Model-Cache',hit?'HIT':'MISS');
}

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Yalnız GET desteklenir.'});
  const u=targetUrl(req);const key=cacheKey(u);prune();
  const cached=memory.get(key);
  if(cached&&Date.now()-cached.at<TTL_MS){headers(res,true);return res.status(200).json({...cached.data,transportCacheVersion:VERSION,transportCache:'MEMORY_HIT'});}

  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),150000);
  try{
    const r=await fetch(u.toString(),{headers:{Accept:'application/json'},signal:ctrl.signal});
    const text=await r.text();let data={};
    try{data=text?JSON.parse(text):{};}catch{throw new Error(`Model yol haritası JSON dönmedi (HTTP ${r.status}).`);}
    if(!r.ok||data?.ok===false){headers(res,false);return res.status(r.status||502).json({ok:false,error:data?.error||`Model yol haritası HTTP ${r.status}`,transportCacheVersion:VERSION});}
    memory.set(key,{at:Date.now(),data});prune();headers(res,false);
    return res.status(200).json({...data,transportCacheVersion:VERSION,transportCache:'ORIGIN_FILL'});
  }catch(e){
    headers(res,false);
    return res.status(e?.name==='AbortError'?504:502).json({ok:false,error:e?.name==='AbortError'?'Model yol haritası zaman aşımına uğradı.':(e?.message||'Model yol haritası alınamadı.'),transportCacheVersion:VERSION});
  }finally{clearTimeout(timer);}
}
