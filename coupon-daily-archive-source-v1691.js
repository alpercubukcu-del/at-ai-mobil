/* AT AI Mobil — V16.9.1 Kupon Günlük Arşiv Kaynağı
   Kupon Veri Denetimi, Kariyer Yol Haritası ve 5 Model için önce telefondaki
   mevcut Günlük Arşiv (IndexedDB) kayıtlarını kullanır. Yalnız arşivde gerçekten
   eksik olan ayaklar daha sonra normal hesaplama yoluna bırakılır.
*/
(()=>{
'use strict';
if(window.__AT_COUPON_DAILY_ARCHIVE_SOURCE_V1691__) return;
window.__AT_COUPON_DAILY_ARCHIVE_SOURCE_V1691__=true;

const VERSION='COUPON-DAILY-ARCHIVE-SOURCE-V16.9.1';
const DB_NAME='at_ai_daily_career_archive_v146';
const STORE='entries';
const MODEL_SESSION='at_ai_five_model_compact_v1687';
let dbPromise=null;
let running=null;

const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
function cityName(){try{return typeof getCityName==='function'?clean(getCityName()):clean(document.querySelector('#citySelect option:checked')?.textContent);}catch{return'';}}
function dateNow(){return clean(window.state?.date||document.getElementById('raceDate')?.value);}
function cityId(){return clean(window.state?.city||document.getElementById('citySelect')?.value);}
function races(){return Array.isArray(window.state?.races)?window.state.races:[];}
function raceFingerprint(race){
  if(!race)return'';
  const horses=(Array.isArray(race?.horses)?race.horses:[])
    .map(h=>[clean(h?.no),clean(h?.id),clean(h?.name).toLocaleUpperCase('tr-TR')].join(':')).sort();
  return [clean(race?.no),clean(race?.class||race?.yaradi1),clean(race?.ageGroup||race?.yaradi2),clean(race?.distance||race?.mesafe),clean(race?.track||race?.pist),horses.join('|')].join('||');
}
function recordMatchesRace(rec,race){
  if(!rec||!race)return false;
  const fp=clean(rec?.fingerprint)||raceFingerprint(rec?.race);
  return !!fp && fp===raceFingerprint(race);
}
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    if(!('indexedDB' in window))return resolve(null);
    let req;try{req=indexedDB.open(DB_NAME,1);}catch{return resolve(null);}
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);
    req.onupgradeneeded=()=>{};
  });
  return dbPromise;
}
async function listDate(date){
  const db=await openDb();if(!db)return[];
  return new Promise(resolve=>{
    const out=[];try{
      const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
      if(store.indexNames.contains('date')){
        const req=store.index('date').openCursor(IDBKeyRange.only(String(date||'')));
        req.onsuccess=()=>{const c=req.result;if(!c)return;out.push(c.value);c.continue();};
      }else{
        const req=store.openCursor();req.onsuccess=()=>{const c=req.result;if(!c)return;if(clean(c.value?.date)===clean(date))out.push(c.value);c.continue();};
      }
      tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>resolve(out);
    }catch{resolve(out);}
  });
}
function sameCity(rec){
  const id=cityId(),name=fold(cityName());
  if(id&&clean(rec?.city)===id)return true;
  if(name&&fold(rec?.cityName)===name)return true;
  return false;
}
function modelSessionLoad(){try{const x=JSON.parse(sessionStorage.getItem(MODEL_SESSION)||'{}');return x&&typeof x==='object'?x:{};}catch{return{};}}
function modelSessionSave(x){try{sessionStorage.setItem(MODEL_SESSION,JSON.stringify(x));return true;}catch{return false;}}
function modelSessionKey(raceNo){return [dateNow(),fold(cityName()),Number(raceNo)||0].join('|');}
function validModel(d){return !!d&&Number(d?.no)>0&&Array.isArray(d?.horses)&&d.horses.length>0;}
function restoreCareer(records){
  const current=window.state?.analyses?.career;
  const map=new Map();
  if(clean(current?.date)===dateNow()&&Array.isArray(current?.races))for(const r of current.races)map.set(String(r?.no),r);
  for(const rec of records)if(rec?.race)map.set(String(rec.raceNo),rec.race);
  if(!map.size)return 0;
  const base=records[0]||{};
  window.state.analyses=window.state.analyses||{};
  window.state.analyses.career={
    ...(base?.meta||{}),type:'career',version:base?.meta?.version||'DAILY-ARCHIVE',date:dateNow(),city:cityId(),cityName:cityName(),
    coverage:map.size>=races().length?'all':'partial',calculatedRace:map.size>=races().length?'all':String(base?.raceNo||''),
    races:[...map.values()].sort((a,b)=>(Number(a?.no)||0)-(Number(b?.no)||0)),generatedAt:base?.generatedAt||base?.archivedAt||new Date().toISOString(),
    restoredFromArchive:true,archiveVersion:'DAILY-CAREER-ARCHIVE-V14.6',couponArchiveRestore:true
  };
  return records.length;
}
async function hydrateCurrent(){
  if(running)return running;
  running=(async()=>{
    const date=dateNow(),program=races();
    if(!date||!program.length)return{careerLoaded:0,modelLoaded:0,careerMissing:program.map(r=>r.no),modelMissing:program.map(r=>r.no)};
    const rows=(await listDate(date)).filter(sameCity);
    const careerRecords=[],modelRecords=[];
    for(const race of program){
      const no=String(race?.no);
      const cr=rows.find(x=>x?.kind==='race'&&String(x?.raceNo)===no&&recordMatchesRace(x,race));
      if(cr)careerRecords.push(cr);
      const mr=rows.find(x=>x?.kind==='model'&&String(x?.raceNo)===no&&recordMatchesRace(x,race)&&validModel(x?.data));
      if(mr)modelRecords.push(mr);
    }
    const careerLoaded=restoreCareer(careerRecords);
    let modelLoaded=0;
    if(modelRecords.length){
      const store=modelSessionLoad();
      for(const rec of modelRecords){store[modelSessionKey(rec.raceNo)]={savedAt:Date.now(),source:'daily-archive-v146',data:rec.data};modelLoaded++;}
      modelSessionSave(store);
      try{await window.ATFiveModelSharedCacheV1685?.hydrateCurrent?.();}catch(e){console.warn('[AT AI] Kupon arşiv 5 Model hydrate uyarısı:',e);}
    }
    const careerSet=new Set(careerRecords.map(x=>String(x.raceNo))),modelSet=new Set(modelRecords.map(x=>String(x.raceNo)));
    const result={version:VERSION,date,city:cityName(),careerLoaded,modelLoaded,careerMissing:program.filter(r=>!careerSet.has(String(r.no))).map(r=>Number(r.no)),modelMissing:program.filter(r=>!modelSet.has(String(r.no))).map(r=>Number(r.no)),archiveRows:rows.length};
    window.__AT_COUPON_ARCHIVE_LAST_V1691__=result;
    console.info('[AT AI]',VERSION,result);
    return result;
  })();
  try{return await running;}finally{running=null;}
}

window.ATCouponDailyArchiveV1691={VERSION,hydrateCurrent,listDate,stats:()=>window.__AT_COUPON_ARCHIVE_LAST_V1691__||null};
console.info('[AT AI]',VERSION,'aktif — Kupon önce Günlük Arşivden Kariyer + 5 Model alır.');
})();
