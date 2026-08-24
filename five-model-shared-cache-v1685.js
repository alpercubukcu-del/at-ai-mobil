/* AT AI Mobil — V16.8.5 Ortak 5 Model cache / in-flight tekilleştirme
   - Aynı tarih + şehir + koşu için prepareRaceModelsV11 aynı sayfa oturumunda yalnız bir kez gerçek hesap yapar.
   - Devam eden hesap varsa ikinci istek yeni API zinciri başlatmaz; mevcut Promise'i bekler.
   - Tamamlanan sonuç Kupon, Manuel Kupon ve diğer 5 Model kullanan ekranlar arasında paylaşılır.
   - Puanlama/model formüllerine dokunmaz.
   NOT: Bu katman coupon-decision-gate-v1671'den ÖNCE yüklenmelidir; böylece kuponun private modelMem'i ortak cache sonucunu kendi içine alabilir.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_SHARED_CACHE_V1685__) return;
window.__AT_FIVE_MODEL_SHARED_CACHE_V1685__ = true;

const VERSION='FIVE-MODEL-SHARED-CACHE-V16.8.5';
const resolved=new Map();
const inflight=new Map();

const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
function city(){
  try{return typeof getCityName==='function'?clean(getCityName()):clean(document.querySelector('#citySelect option:checked')?.textContent);}catch{return'';}
}
function key(raceNo){return [clean(window.state?.date||document.getElementById('raceDate')?.value),fold(city()),Number(raceNo)||0].join('|');}
function valid(d){return !!d && Number(d?.no)>0 && Array.isArray(d?.horses) && d.horses.length>0;}

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
  if(inflight.has(k)){
    try{progressCb?.(`Koşu ${race?.no}: devam eden 5 Model hesabı bekleniyor; tekrar başlatılmıyor.`);}catch{}
    return inflight.get(k);
  }
  const p=(async()=>{
    const d=await base(race,progressCb);
    if(valid(d)) resolved.set(k,d);
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
    }
    return n;
  }catch{return 0;}
}

function clearOtherContext(){
  const prefix=[clean(window.state?.date||document.getElementById('raceDate')?.value),fold(city())].join('|')+'|';
  for(const k of [...resolved.keys()]) if(!k.startsWith(prefix)) resolved.delete(k);
  for(const k of [...inflight.keys()]) if(!k.startsWith(prefix)) inflight.delete(k);
}

window.ATFiveModelSharedCacheV1685={
  VERSION,
  key,
  has(raceNo){importManual();return valid(resolved.get(key(raceNo)));},
  get(raceNo){importManual();return resolved.get(key(raceNo))||null;},
  pending(raceNo){return inflight.has(key(raceNo));},
  pendingPromise(raceNo){return inflight.get(key(raceNo))||null;},
  importManual,
  stats(){return{resolved:resolved.size,inflight:inflight.size,keys:[...resolved.keys()]};},
  clear(){resolved.clear();inflight.clear();}
};

window.addEventListener('pageshow',()=>{clearOtherContext();importManual();},{passive:true});
console.info('[AT AI]',VERSION,'aktif — aynı koşunun 5 Model hesabı tekrar başlatılmaz.');
})();
