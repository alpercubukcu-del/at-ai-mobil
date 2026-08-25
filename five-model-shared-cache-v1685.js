/* AT AI Mobil — V16.9.9 Mobil Güvenli Kompakt 5 Model Cache
   - Eski tek-parca sessionStorage paketi Android ana is parcacigini kilitlemesin diye okunmadan temizlenir.
   - Her tarih + sehir + kosu sonucu ayri, kucuk bir sessionStorage kaydinda tutulur.
   - JSON yazma/kompaktlastirma arayuz boyandiktan sonra idle kuyruğunda yapilir.
   - get/has yalniz istenen kosuyu okur; tum manualTicket haritasini tekrar tekrar yazmaz.
   - Puanlama/model formullerine dokunmaz; yalniz hesap sonucunu yeniden kullanir.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_SHARED_CACHE_V1687__) return;
window.__AT_FIVE_MODEL_SHARED_CACHE_V1687__ = true;
window.__AT_FIVE_MODEL_MOBILE_CACHE_V1699__ = true;

const VERSION='FIVE-MODEL-SHARED-CACHE-V16.8.7';
const MOBILE_VERSION='FIVE-MODEL-MOBILE-CACHE-V16.9.9';
const LEGACY_SESSION_KEY='at_ai_five_model_compact_v1687';
const SESSION_PREFIX='at_ai_five_model_compact_v1699:';
const SESSION_INDEX='at_ai_five_model_compact_index_v1699';
const MAX_RECORDS=24;
const resolved=new Map();
const inflight=new Map();
const persistQueued=new Set();
let hydrating=false;

const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const yieldTurn=()=>new Promise(resolve=>setTimeout(resolve,0));
function city(){
  try{return typeof getCityName==='function'?clean(getCityName()):clean(document.querySelector('#citySelect option:checked')?.textContent);}catch{return'';}
}
function dateNow(){return clean(window.state?.date||document.getElementById('raceDate')?.value);}
function key(raceNo){return [dateNow(),fold(city()),Number(raceNo)||0].join('|');}
function valid(d){return !!d && Number(d?.no)>0 && Array.isArray(d?.horses) && d.horses.length>0;}
function storageKey(k){return SESSION_PREFIX+k;}

/* V16.8.7'nin tek buyuk JSON paketi donmanin kaynagiydi. Degeri getItem ile
   ana is parcacigina kopyalamadan dogrudan kaldiriyoruz. Gunluk IndexedDB arsivi
   korunur; yalniz guvensiz oturum kopyasi sifirlanir. */
try{sessionStorage.removeItem(LEGACY_SESSION_KEY);}catch{}

function readIndex(){
  try{const x=JSON.parse(sessionStorage.getItem(SESSION_INDEX)||'{}');return x&&typeof x==='object'?x:{};}catch{return{};}
}
function saveIndex(index){try{sessionStorage.setItem(SESSION_INDEX,JSON.stringify(index));return true;}catch{return false;}}
function compactChannel(src={}){
  const out={};
  const scalarKeys=['score','rawScore','decisionScore','coverageYears','strongYears','supportYears','latestScore','mode','analysisMode','modeRank','modeSize','coverage','usedWeight','modeAware','targetFinish'];
  for(const k of scalarKeys){
    const v=src?.[k];
    if(v===null||typeof v==='string'||typeof v==='boolean'||Number.isFinite(Number(v))) out[k]=v;
  }
  if(Array.isArray(src?.present))out.present=src.present.map(clean).filter(Boolean);
  if(Array.isArray(src?.missing))out.missing=src.missing.map(clean).filter(Boolean);
  return out;
}
function compactPlacement(src={}){
  const out={};
  for(const k of ['targetFinish','analysisMode'])if(src?.[k]!==undefined)out[k]=src[k];
  for(const id of ['exact','twin','family','career','composite'])out[id]=compactChannel(src?.[id]||{});
  return out;
}
function compactScores(src={}){
  const out={analysisMode:src?.analysisMode||null};
  if(src?.podiumSimilarityVersion)out.podiumSimilarityVersion=src.podiumSimilarityVersion;
  for(const id of ['exact','twin','family','career','composite'])out[id]=compactChannel(src?.[id]||{});
  if(src?.byFinish&&typeof src.byFinish==='object'){
    out.byFinish={};
    for(const f of ['1','2','3'])if(src.byFinish[f]||src.byFinish[Number(f)])out.byFinish[f]=compactPlacement(src.byFinish[f]||src.byFinish[Number(f)]);
  }
  return out;
}
function compactHorse(h={}){
  return {
    id:clean(h?.id??h?.horseId??h?.At_ID??h?.atId),
    horseId:clean(h?.horseId??h?.id??h?.At_ID??h?.atId),
    atId:clean(h?.atId??h?.id??h?.horseId??h?.At_ID),
    no:finite(h?.no??h?.Program_No??h?.programNo),
    name:clean(h?.name??h?.horseName??h?.At_Adı??h?.At_Adi),
    hp:finite(h?.hp??h?.HP)
  };
}
function compactModel(d={}){
  return {
    no:Number(d?.no)||0,
    roadmapOk:d?.roadmapOk!==false,
    roadmapError:clean(d?.roadmapError),
    modelCounts:d?.modelCounts&&typeof d.modelCounts==='object'?d.modelCounts:{},
    compactSession:true,
    compactVersion:MOBILE_VERSION,
    horses:(Array.isArray(d?.horses)?d.horses:[]).map(item=>({
      horse:compactHorse(item?.horse||{}),
      careerOk:item?.careerOk!==false,
      careerError:clean(item?.careerError),
      scores:compactScores(item?.scores||{})
    }))
  };
}
function persisted(k){
  try{
    const rec=JSON.parse(sessionStorage.getItem(storageKey(k))||'null');
    const d=rec?.data||rec;
    if(valid(d)){resolved.set(k,d);return d;}
  }catch{}
  return null;
}
function trimIndex(index){
  const keys=Object.keys(index);
  if(keys.length<=MAX_RECORDS)return;
  keys.sort((a,b)=>(Number(index[a])||0)-(Number(index[b])||0));
  for(const old of keys.slice(0,keys.length-MAX_RECORDS)){
    try{sessionStorage.removeItem(storageKey(old));}catch{}
    delete index[old];
  }
}
function persistNow(k,d){
  if(!k||!valid(d))return false;
  try{
    const rec={savedAt:Date.now(),data:compactModel(d)};
    sessionStorage.setItem(storageKey(k),JSON.stringify(rec));
    const index=readIndex();index[k]=rec.savedAt;trimIndex(index);saveIndex(index);
    return true;
  }catch{return false;}
}
function schedulePersist(k,d){
  if(!k||!valid(d)||persistQueued.has(k))return;
  persistQueued.add(k);
  const run=()=>{persistQueued.delete(k);persistNow(k,d);};
  if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1500});
  else setTimeout(run,32);
}
function manualFor(raceNo){
  try{
    const map=window.manualTicketV117?.raceDataMap;
    if(!(map instanceof Map))return null;
    for(const d of [map.get(raceNo),map.get(Number(raceNo)),map.get(String(raceNo))])if(valid(d))return d;
    return null;
  }catch{return null;}
}
function prime(raceNo,d,{persist=true}={}){
  if(!valid(d))return false;
  const k=key(raceNo);
  resolved.set(k,d);
  if(persist)schedulePersist(k,d);
  return true;
}

const base=typeof prepareRaceModelsV11==='function'?prepareRaceModelsV11:null;
if(!base){
  console.warn('[AT AI]',MOBILE_VERSION,'prepareRaceModelsV11 bulunamadı.');
  return;
}

prepareRaceModelsV11=async function(race,progressCb){
  const k=key(race?.no);
  const ready=resolved.get(k);
  if(valid(ready)){
    try{progressCb?.(`Koşu ${race?.no}: daha önce hesaplanan 5 Model kullanılıyor.`);}catch{}
    return ready;
  }
  const manual=manualFor(race?.no);
  if(valid(manual)){
    prime(race?.no,manual);
    try{progressCb?.(`Koşu ${race?.no}: açık oturumdaki 5 Model sonucu kullanılıyor.`);}catch{}
    return manual;
  }
  const stored=persisted(k);
  if(valid(stored)){
    try{progressCb?.(`Koşu ${race?.no}: oturumdaki kompakt 5 Model sonucu kullanılıyor; koşuya özel kayıt sayesinde kariyerler yeniden çağrılmıyor.`);}catch{}
    return stored;
  }
  if(inflight.has(k)){
    try{progressCb?.(`Koşu ${race?.no}: devam eden 5 Model hesabı bekleniyor; tekrar başlatılmıyor.`);}catch{}
    return inflight.get(k);
  }
  const p=(async()=>{
    await yieldTurn();
    const d=await base(race,progressCb);
    if(valid(d))prime(race?.no,d);
    return d;
  })();
  inflight.set(k,p);
  try{return await p;}
  finally{inflight.delete(k);}
};

function importManual(){
  try{
    const map=window.manualTicketV117?.raceDataMap;
    if(!(map instanceof Map))return 0;
    let n=0;
    for(const [raceNo,d] of map.entries()){
      if(!valid(d))continue;
      const k=key(raceNo);
      if(!resolved.has(k)){resolved.set(k,d);n++;}
      schedulePersist(k,d);
    }
    return n;
  }catch{return 0;}
}

async function hydrateCurrent(){
  if(hydrating)return 0;
  const races=Array.isArray(window.state?.races)?window.state.races:[];
  if(!races.length)return 0;
  hydrating=true;
  let count=0;
  try{
    for(const race of races){
      const k=key(race?.no);
      const d=resolved.get(k)||manualFor(race?.no)||persisted(k);
      if(!valid(d))continue;
      resolved.set(k,d);
      try{const ready=await prepareRaceModelsV11(race);if(valid(ready))count++;}catch{}
      await yieldTurn();
    }
    return count;
  }finally{hydrating=false;}
}

function clearOtherContext(){
  const prefix=[dateNow(),fold(city())].join('|')+'|';
  for(const k of [...resolved.keys()])if(!k.startsWith(prefix))resolved.delete(k);
  for(const k of [...inflight.keys()])if(!k.startsWith(prefix))inflight.delete(k);
}
function has(raceNo){
  const k=key(raceNo),manual=manualFor(raceNo);
  if(valid(manual))prime(raceNo,manual);
  return valid(resolved.get(k))||valid(persisted(k));
}
function get(raceNo){
  const k=key(raceNo),manual=manualFor(raceNo);
  if(valid(manual))prime(raceNo,manual);
  return resolved.get(k)||persisted(k)||null;
}
function clear(){
  resolved.clear();inflight.clear();persistQueued.clear();
  const index=readIndex();
  for(const k of Object.keys(index))try{sessionStorage.removeItem(storageKey(k));}catch{}
  try{sessionStorage.removeItem(SESSION_INDEX);sessionStorage.removeItem(LEGACY_SESSION_KEY);}catch{}
}

window.ATFiveModelSharedCacheV1685={
  VERSION,key,has,get,prime,
  pending:raceNo=>inflight.has(key(raceNo)),
  pendingPromise:raceNo=>inflight.get(key(raceNo))||null,
  importManual,hydrateCurrent,
  stats(){const index=readIndex();return{version:VERSION,mobileVersion:MOBILE_VERSION,resolved:resolved.size,inflight:inflight.size,sessionRecords:Object.keys(index).length,sessionPersistentAcrossReload:true,compactSessionReuse:true,rawPersistent:false,perRaceStorage:true,keys:Object.keys(index)};},
  clear
};
window.ATFiveModelSharedCacheV1687=window.ATFiveModelSharedCacheV1685;

document.addEventListener('click',e=>{
  if(e.target?.closest?.('#couponMenuBtn'))setTimeout(()=>void hydrateCurrent(),0);
  if(e.target?.closest?.('#buildAllBtn'))setTimeout(()=>void hydrateCurrent(),0);
},true);
window.addEventListener('pageshow',()=>{clearOtherContext();setTimeout(()=>{importManual();void hydrateCurrent();},0);},{passive:true});
console.info('[AT AI]',MOBILE_VERSION,'aktif — eski buyuk oturum paketi temizlendi; kosu-bazli cache ve idle yazim kullaniliyor.');
})();
