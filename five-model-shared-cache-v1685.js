/* AT AI Mobil — V16.8.7 Kalıcı Kompakt 5 Model Cache
   - Aynı tarih + şehir + koşu için 5 Model hesabı bir kez gerçek hesaplanır.
   - Devam eden hesap varsa ikinci API/kariyer zinciri açılmaz.
   - Sonuç, yalnız kupon/ranking için gerekli skor alanlarıyla sessionStorage'a kompakt yazılır.
   - Sayfa yenilense bile aynı sekmede kompakt sonuç yeniden kullanılır.
   - Kupon menüsü açılırken mevcut kompakt kayıtlar karar motorunun private model belleğine sessizce hydrate edilir.
   - Puanlama/model formüllerine dokunmaz; yalnız hesap sonucunu yeniden kullanır.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_SHARED_CACHE_V1687__) return;
window.__AT_FIVE_MODEL_SHARED_CACHE_V1687__ = true;

const VERSION='FIVE-MODEL-SHARED-CACHE-V16.8.7';
const SESSION_KEY='at_ai_five_model_compact_v1687';
const MAX_RECORDS=24;
const resolved=new Map();
const inflight=new Map();
let hydrating=false;

const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
function city(){
  try{return typeof getCityName==='function'?clean(getCityName()):clean(document.querySelector('#citySelect option:checked')?.textContent);}catch{return'';}
}
function dateNow(){return clean(window.state?.date||document.getElementById('raceDate')?.value);}
function key(raceNo){return [dateNow(),fold(city()),Number(raceNo)||0].join('|');}
function valid(d){return !!d && Number(d?.no)>0 && Array.isArray(d?.horses) && d.horses.length>0;}

function sessionLoad(){
  try{const x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}');return x&&typeof x==='object'?x:{};}catch{return{};}
}
function sessionSave(store){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(store));return true;}catch{return false;}}
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
    compactVersion:VERSION,
    horses:(Array.isArray(d?.horses)?d.horses:[]).map(item=>({
      horse:compactHorse(item?.horse||{}),
      careerOk:item?.careerOk!==false,
      careerError:clean(item?.careerError),
      scores:compactScores(item?.scores||{})
    }))
  };
}
function persisted(k){
  const rec=sessionLoad()?.[k];
  const d=rec?.data||rec;
  return valid(d)?d:null;
}
function persist(k,d){
  if(!k||!valid(d))return false;
  const store=sessionLoad();
  store[k]={savedAt:Date.now(),data:compactModel(d)};
  const keys=Object.keys(store);
  if(keys.length>MAX_RECORDS){
    keys.sort((a,b)=>(Number(store[a]?.savedAt)||0)-(Number(store[b]?.savedAt)||0));
    for(const old of keys.slice(0,keys.length-MAX_RECORDS))delete store[old];
  }
  return sessionSave(store);
}

const base=typeof prepareRaceModelsV11==='function'?prepareRaceModelsV11:null;
if(!base){
  console.warn('[AT AI]',VERSION,'prepareRaceModelsV11 bulunamadı.');
  return;
}

prepareRaceModelsV11=async function(race,progressCb){
  const k=key(race?.no);
  const ready=resolved.get(k);
  if(valid(ready)){
    try{progressCb?.(`Koşu ${race?.no}: daha önce hesaplanan 5 Model kullanılıyor.`);}catch{}
    return ready;
  }
  const stored=persisted(k);
  if(valid(stored)){
    resolved.set(k,stored);
    try{progressCb?.(`Koşu ${race?.no}: oturumdaki kompakt 5 Model sonucu kullanılıyor; kariyerler yeniden çağrılmıyor.`);}catch{}
    return stored;
  }
  if(inflight.has(k)){
    try{progressCb?.(`Koşu ${race?.no}: devam eden 5 Model hesabı bekleniyor; tekrar başlatılmıyor.`);}catch{}
    return inflight.get(k);
  }
  const p=(async()=>{
    const d=await base(race,progressCb);
    if(valid(d)){
      resolved.set(k,d);
      persist(k,d);
    }
    return d;
  })();
  inflight.set(k,p);
  try{return await p;}
  finally{inflight.delete(k);}
};

function importManual(){
  try{
    const map=window.manualTicketV117?.raceDataMap;
    if(!(map instanceof Map)) return 0;
    let n=0;
    for(const [raceNo,d] of map.entries()){
      if(!valid(d)) continue;
      const k=key(raceNo);
      if(!resolved.has(k)){resolved.set(k,d);n++;}
      persist(k,d);
    }
    return n;
  }catch{return 0;}
}

async function hydrateCurrent(){
  if(hydrating)return 0;
  const races=Array.isArray(window.state?.races)?window.state.races:[];
  if(!races.length)return 0;
  const ready=races.filter(r=>valid(persisted(key(r?.no))));
  if(!ready.length)return 0;
  hydrating=true;
  let count=0;
  try{
    // Burada global prepareRaceModelsV11 çağrılır. V16.7.1 karar kapısı daha sonra bu fonksiyonu
    // sardığı için, çağrı aynı zamanda private modelMem'i de doldurur. Ağ çağrısı yapılmaz.
    for(const race of ready){
      try{const d=await prepareRaceModelsV11(race);if(valid(d))count++;}catch{}
    }
    return count;
  }finally{hydrating=false;}
}

function clearOtherContext(){
  const prefix=[dateNow(),fold(city())].join('|')+'|';
  for(const k of [...resolved.keys()]) if(!k.startsWith(prefix)) resolved.delete(k);
  for(const k of [...inflight.keys()]) if(!k.startsWith(prefix)) inflight.delete(k);
}
function has(raceNo){
  importManual();
  const k=key(raceNo);
  return valid(resolved.get(k))||valid(persisted(k));
}
function get(raceNo){
  importManual();
  const k=key(raceNo);
  const d=resolved.get(k)||persisted(k)||null;
  if(valid(d)&&!resolved.has(k))resolved.set(k,d);
  return d;
}
function clear(){
  resolved.clear();inflight.clear();
  try{sessionStorage.removeItem(SESSION_KEY);}catch{}
}

window.ATFiveModelSharedCacheV1685={VERSION,key,has,get,pending:raceNo=>inflight.has(key(raceNo)),pendingPromise:raceNo=>inflight.get(key(raceNo))||null,importManual,hydrateCurrent,stats(){const s=sessionLoad();return{version:VERSION,resolved:resolved.size,inflight:inflight.size,sessionRecords:Object.keys(s).length,sessionPersistentAcrossReload:true,keys:Object.keys(s)};},clear};
window.ATFiveModelSharedCacheV1687=window.ATFiveModelSharedCacheV1685;

// Kupon menüsüne girildiğinde daha önce hesaplanmış kompakt skorları karar motorunun private belleğine taşı.
document.addEventListener('click',e=>{
  if(e.target?.closest?.('#couponMenuBtn'))setTimeout(()=>void hydrateCurrent(),0);
  if(e.target?.closest?.('#buildAllBtn'))void hydrateCurrent();
},true);
window.addEventListener('pageshow',()=>{clearOtherContext();importManual();setTimeout(()=>void hydrateCurrent(),0);},{passive:true});
console.info('[AT AI]',VERSION,'aktif — 5 Model kompakt sonucu sessionStorage ile sayfa yenilemesinde de tekrar kullanılır.');
})();
