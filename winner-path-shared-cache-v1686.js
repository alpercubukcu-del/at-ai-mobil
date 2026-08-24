/* AT AI Mobil — V16.8.6 Ortak Kazanan Yolu Cache
   Amaç:
   - Menü 2 Kazanan Yolu Kör Testi ile Kupon Veri Denetimi aynı kör endpoint sonucunu paylaşır.
   - Aynı tarih + şehir + koşu için eşzamanlı ikinci /api/tjk-conditional-v4-blind zinciri açılmaz.
   - Menü 2 tamamladığında kuponun mevcut kompakt session cache'i otomatik beslenir.
   - Kupon tamamladığında Menü 2 aynı sayfa oturumunda ham kör sonucu bellekten anında kullanabilir.
   - Ham kör payload kalıcı depolamaya yazılmaz; yalnız RAM'de sınırlı LRU tutulur.
*/
(() => {
'use strict';
if (window.__AT_WINNER_PATH_SHARED_CACHE_V1686__) return;
window.__AT_WINNER_PATH_SHARED_CACHE_V1686__ = true;

const VERSION='WINNER-PATH-SHARED-CACHE-V16.8.6';
const ENDPOINT='/api/tjk-conditional-v4-blind';
const SESSION_KEY='at_ai_coupon_winnerpath_v1671';
const MAX_RAW_RECORDS=12;
const nativeFetch=window.fetch.bind(window);
const rawCache=new Map();
const inFlight=new Map();

const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');

function targetOf(input){
  try{
    const raw=typeof input==='string'?input:(input?.url||'');
    if(!raw)return null;
    const u=new URL(raw,location.href);
    if(u.pathname!==ENDPOINT&&!u.pathname.endsWith(ENDPOINT))return null;
    const date=clean(u.searchParams.get('date'));
    const city=clean(u.searchParams.get('city'));
    const raceNo=Number(u.searchParams.get('raceNo'));
    if(!date||!city||!Number.isFinite(raceNo)||raceNo<1)return null;
    return {url:u.toString(),date,city,raceNo,key:[date,fold(city),raceNo].join('|')};
  }catch{return null;}
}
function stateTarget(no){
  try{
    const date=clean(window.state?.date||document.getElementById('raceDate')?.value);
    const city=clean(typeof getCityName==='function'?getCityName():document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent);
    const raceNo=Number(no);
    if(!date||!city||!Number.isFinite(raceNo)||raceNo<1)return null;
    return {date,city,raceNo,key:[date,fold(city),raceNo].join('|')};
  }catch{return null;}
}
function sessionLoad(){try{const x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}');return x&&typeof x==='object'?x:{};}catch{return{};}}
function sessionSave(all){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(all));}catch{}}
function compact(data,target){
  const rows=(Array.isArray(data?.rows)?data.rows:[]).map((r,i)=>({
    id:clean(r?.At_ID??r?.horseId),
    no:num(r?.Program_No??r?.programNo??r?.no),
    name:clean(r?.At_Adı??r?.At_Adi??r?.horseName??r?.name),
    score:num(r?.V5_SKOR),
    a:num(r?.A_SIRA),
    b:num(r?.B_SIRA),
    type:clean(r?.ADAY_TIPI),
    rank:i+1
  }));
  return {
    date:target.date,
    city:target.city,
    raceNo:target.raceNo,
    rows,
    referenceCount:Array.isArray(data?.referenceWinners)?data.referenceWinners.length:0,
    referenceQuality:num(data?.referenceSetQuality)??0,
    leakPassed:data?.leakAudit?.passed===true,
    roadmapOk:data?.roadmapOk!==false,
    createdAt:new Date().toISOString(),
    sharedSource:VERSION
  };
}
function saveCompact(target,data){
  if(!target||!data||data?.ok===false||data?.resultApiCalled||data?.resultDataLoaded)return false;
  const all=sessionLoad();
  all[target.key]=compact(data,target);
  const keys=Object.keys(all);
  if(keys.length>30){
    keys.sort((a,b)=>String(all[a]?.createdAt||'').localeCompare(String(all[b]?.createdAt||'')));
    for(const k of keys.slice(0,keys.length-30))delete all[k];
  }
  sessionSave(all);
  return true;
}
function hasCompact(target){return !!(target&&sessionLoad()?.[target.key]);}
function rememberRaw(key,packet){
  if(rawCache.has(key))rawCache.delete(key);
  rawCache.set(key,packet);
  while(rawCache.size>MAX_RAW_RECORDS)rawCache.delete(rawCache.keys().next().value);
}
function responseFrom(packet){
  return new Response(packet.text,{status:packet.status,statusText:packet.statusText,headers:new Headers(packet.headers||[])});
}
function waitFor(promise,signal){
  if(!signal)return promise;
  if(signal.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(new DOMException('Aborted','AbortError'));
    signal.addEventListener('abort',abort,{once:true});
    promise.then(v=>{signal.removeEventListener('abort',abort);resolve(v);},e=>{signal.removeEventListener('abort',abort);reject(e);});
  });
}

window.fetch=async function sharedWinnerPathFetch(input,init){
  const target=targetOf(input);
  if(!target)return nativeFetch(input,init);

  if(rawCache.has(target.key)){
    const packet=rawCache.get(target.key);
    rawCache.delete(target.key);rawCache.set(target.key,packet);
    return responseFrom(packet);
  }

  let task=inFlight.get(target.key);
  if(!task){
    const safeInit={...(init||{})};
    delete safeInit.signal;
    task=(async()=>{
      const res=await nativeFetch(target.url,safeInit);
      const text=await res.text();
      const packet={text,status:res.status,statusText:res.statusText,headers:[...res.headers.entries()]};
      if(res.ok){
        try{
          const data=JSON.parse(text);
          if(data?.ok!==false&&!data?.resultApiCalled&&!data?.resultDataLoaded){
            rememberRaw(target.key,packet);
            saveCompact(target,data);
          }
        }catch{}
      }
      return packet;
    })().finally(()=>inFlight.delete(target.key));
    inFlight.set(target.key,task);
  }
  const packet=await waitFor(task,init?.signal);
  return responseFrom(packet);
};

function seedLastBlind(){
  try{
    const last=window.__AT_WINNER_PATH_LAST_BLIND_V1669__;
    const c=last?.context,d=last?.data;
    if(!c||!d)return;
    const target={date:clean(c.date),city:clean(c.city),raceNo:Number(c.raceNo)};
    target.key=[target.date,fold(target.city),target.raceNo].join('|');
    if(target.date&&target.city&&Number.isFinite(target.raceNo))saveCompact(target,d);
  }catch{}
}

function wrapCoupon(){
  const A=window.ATCouponDecisionV1671;
  if(!A||A.__winnerSharedV1686||typeof A.completeWinner!=='function')return false;
  const base=A.completeWinner.bind(A);
  A.completeWinner=async function(raceNos){
    if(!Array.isArray(raceNos))return base(raceNos);
    const missing=raceNos.filter(no=>!hasCompact(stateTarget(no)));
    if(!missing.length)return;
    return base(missing);
  };
  A.__winnerSharedV1686=true;
  return true;
}

seedLastBlind();
wrapCoupon();
setTimeout(wrapCoupon,0);
setTimeout(wrapCoupon,400);
window.addEventListener('pageshow',()=>{seedLastBlind();wrapCoupon();},{passive:true});

window.ATWinnerPathSharedCacheV1686={
  VERSION,
  has:(date,city,raceNo)=>hasCompact({key:[clean(date),fold(city),Number(raceNo)||0].join('|')}),
  stats:()=>({version:VERSION,rawMemoryRecords:rawCache.size,inFlight:inFlight.size,sessionRecords:Object.keys(sessionLoad()).length,rawPersistent:false}),
  clearMemory:()=>{rawCache.clear();inFlight.clear();}
};
console.info('[AT AI]',VERSION,'aktif — Menü 2 + Kupon aynı Kazanan Yolu kör isteğini paylaşır; ham payload yalnız RAM.');
})();
