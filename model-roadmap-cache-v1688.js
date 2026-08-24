/* AT AI Mobil — V16.8.8 5 Model tarihsel yol haritası CDN cache
   - Mevcut /api/tjk-model-roadmap-v11 kullanılır; yeni serverless function oluşturulmaz.
   - Vercel route header'ı aynı tarih + şehir + koşul cevabını CDN'de 6 saat tutar.
   - İlk MISS dışında tarihsel ilk-3 kariyer zinciri sunucuda yeniden kurulmaz.
   - Puanlama / model formülleri değişmez; yalnız veri taşıma ve cache politikası değişir.
*/
(() => {
'use strict';
if(window.__AT_MODEL_ROADMAP_CACHE_V1688__) return;
window.__AT_MODEL_ROADMAP_CACHE_V1688__=true;
const VERSION='MODEL-ROADMAP-CLIENT-CACHE-V16.8.8';

fetchModelRoadmapV11=async function(race){
  const meta=typeof programRaceMeta==='function'
    ? programRaceMeta(race)
    : {ok:true,class:race?.class,ageGroup:race?.ageGroup,track:race?.track,distance:race?.distance};
  if(!meta?.ok)return{ok:false,error:meta?.error||'Koşu şartları eksik.'};

  const url=
    `/api/tjk-model-roadmap-v11`+
    `?date=${encodeURIComponent(state?.date||'')}`+
    `&city=${encodeURIComponent(typeof getCityName==='function'?getCityName():'')}`+
    `&class=${encodeURIComponent(meta.class||race?.class||'')}`+
    `&ageGroup=${encodeURIComponent(meta.ageGroup||race?.ageGroup||'')}`+
    `&track=${encodeURIComponent(meta.track||race?.track||'')}`+
    `&distance=${encodeURIComponent(meta.distance||race?.distance||'')}`+
    `&minYear=2000`;

  try{
    if(typeof atAiFetchJsonV1111==='function'){
      return await atAiFetchJsonV1111(url,120000,`Koşu ${race?.no} tarihsel model CDN cache`);
    }
    const c=new AbortController(),t=setTimeout(()=>c.abort(),120000);
    try{
      const r=await fetch(url,{cache:'default',headers:{accept:'application/json'},signal:c.signal});
      const text=await r.text();let d={};
      try{d=text?JSON.parse(text):{};}catch{throw new Error(`5 Model tarihsel veri JSON dönmedi (API ${r.status}).`);}
      if(!r.ok||d?.ok===false)return{ok:false,error:d?.error||`API ${r.status}`};
      return d;
    }finally{clearTimeout(t);}
  }catch(e){
    return{ok:false,error:e?.name==='AbortError'?'5 Model tarihsel veri zaman aşımına uğradı.':(e?.message||'5 Model tarihsel veri alınamadı.')};
  }
};

window.__AT_MODEL_ROADMAP_CACHE_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif — mevcut 5 Model roadmap endpointi Vercel CDN cache ile kullanılır.');
})();
