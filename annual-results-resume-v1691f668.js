/* AT AI Mobil — F60.68 Yerli Sonuç Arşivi kalıcı checkpoint + güvenli devam */
(() => {
'use strict';
if(window.__AT_ANNUAL_RESULTS_RESUME_F6068__)return;
window.__AT_ANNUAL_RESULTS_RESUME_F6068__=true;

const VERSION='ANNUAL-RESULTS-RESUME-V16.9.1F60.68';
const DB_NAME='at_ai_tjk_annual_results_v1';
const STORE_RACES='races',STORE_DAYS='days',STORE_META='meta';
const DOMESTIC=new Set(['ADANA','ANKARA','ANTALYA','BURSA','DIYARBAKIR','ELAZIG','ISTANBUL','IZMIR','KOCAELI','SANLIURFA']);
const JOB_KEY='f6068:results-download-job';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const iso=v=>{const s=clean(v);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''};
const isDomestic=city=>DOMESTIC.has(fold(city));
const raceKey=(date,city,no)=>`result|${iso(date)}|${fold(city)}|${Number(no)||0}`;
const dayKey=(date,city)=>`day|${iso(date)}|${fold(city)}`;
let dbPromise=null,running=false;

function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    let q;try{q=indexedDB.open(DB_NAME)}catch{return resolve(null)}
    q.onsuccess=()=>{const db=q.result;const need=[STORE_RACES,STORE_DAYS,STORE_META].filter(s=>!db.objectStoreNames.contains(s));if(!need.length){db.onversionchange=()=>{try{db.close()}catch{}dbPromise=null};return resolve(db)}const v=db.version+1;try{db.close()}catch{}let u;try{u=indexedDB.open(DB_NAME,v)}catch{return resolve(null)}u.onupgradeneeded=()=>{const d=u.result;if(!d.objectStoreNames.contains(STORE_RACES)){const s=d.createObjectStore(STORE_RACES,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(STORE_DAYS)){const s=d.createObjectStore(STORE_DAYS,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(STORE_META))d.createObjectStore(STORE_META,{keyPath:'key'})};u.onsuccess=()=>resolve(u.result);u.onerror=u.onblocked=()=>resolve(null)};
    q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(STORE_RACES)){const s=d.createObjectStore(STORE_RACES,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(STORE_DAYS)){const s=d.createObjectStore(STORE_DAYS,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(STORE_META))d.createObjectStore(STORE_META,{keyPath:'key'})};
    q.onerror=q.onblocked=()=>{dbPromise=null;resolve(null)};
  });
  return dbPromise;
}
async function put(store,value){const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function get(store,key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function readRange(store,start,end){const db=await openDb();if(!db||!db.objectStoreNames.contains(store))return[];return new Promise(resolve=>{const out=[];try{const tx=db.transaction(store,'readonly'),os=tx.objectStore(store),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();q.onsuccess=e=>{const c=e.target.result;if(!c)return;const row=c.value,d=iso(row?.date);if(d&&d>=start&&d<=end)out.push(row);c.continue()};tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>resolve(out)}catch{resolve(out)}})}

function resolveRaceNo(row,rows){const n=Number(row?.raceNo||0);if(n)return n;const sorted=[...rows].sort((a,b)=>Number(a?.page||0)-Number(b?.page||0)||Number(a?.rowIndex||0)-Number(b?.rowIndex||0));const i=sorted.findIndex(x=>x===row||x?.id===row?.id);return i>=0?i+1:0}
function resultRaceNo(x){return Number(x?.raceNo??x?.no??x?.race?.raceNo??x?.race?.no??0)||0}
function resultRace(x){return x?.race??x}
function makeGroups(rows){const map=new Map();for(const r of rows){if(!isDomestic(r?.city))continue;const date=iso(r?.date),city=clean(r?.city);if(!date||!city)continue;const k=dayKey(date,city);if(!map.has(k))map.set(k,{key:k,date,city,cityId:clean(r?.cityId),rows:[]});map.get(k).rows.push(r)}return[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.city.localeCompare(b.city,'tr'))}
function expectedNos(group){const rows=[...group.rows].sort((a,b)=>Number(a?.page||0)-Number(b?.page||0)||Number(a?.rowIndex||0)-Number(b?.rowIndex||0));return rows.map((r,i)=>resolveRaceNo(r,rows)||i+1).filter(Boolean)}
async function fetchDay(group){const u=new URL('/api/tjk-day-results-v1',location.origin);u.searchParams.set('date',group.date);u.searchParams.set('city',group.city);const res=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'}});let data=null;try{data=await res.json()}catch{}if(!res.ok||data?.ok===false)throw new Error(data?.error||`API ${res.status}`);return data||{}}
function setStatus(text){const el=$('f62rStatus');if(el)el.textContent=text}
function setButton(text,disabled=false){const b=$('f62rUpdate');if(b){b.textContent=text;b.disabled=!!disabled}}

async function persistJob(job){return put(STORE_META,{key:JOB_KEY,version:VERSION,updatedAt:new Date().toISOString(),...job})}
async function currentJob(){return get(STORE_META,JOB_KEY)}

async function saveDayState(group,{expected,raceCount,status,missingRaceNos=[],error=null}){
  return put(STORE_DAYS,{key:group.key,year:Number(group.date.slice(0,4)),date:group.date,city:group.city,cityId:group.cityId,expectedRaceCount:expected,raceCount,status,missingRaceNos,sourceVersion:VERSION,updatedAt:new Date().toISOString(),error});
}
async function saveRace(group,race){const no=resultRaceNo(race);if(!no)return false;return put(STORE_RACES,{key:raceKey(group.date,group.city,no),year:Number(group.date.slice(0,4)),date:group.date,city:group.city,cityId:group.cityId,raceNo:no,source:'LOCAL_ANNUAL_RESULTS_ARCHIVE',version:VERSION,updatedAt:new Date().toISOString(),race:resultRace(race)})}

function buildExistingMaps(raceRows,dayRows){const races=new Map(),days=new Map();for(const r of raceRows){const k=dayKey(r.date,r.city);if(!races.has(k))races.set(k,new Set());const no=Number(r.raceNo||0);if(no)races.get(k).add(no)}for(const d of dayRows)days.set(d.key||dayKey(d.date,d.city),d);return{races,days}}
function isComplete(group,maps){const expected=expectedNos(group),saved=maps.races.get(group.key)||new Set(),day=maps.days.get(group.key);if(day?.status==='complete'&&Number(day?.raceCount||0)>=Math.min(expected.length,Number(day?.expectedRaceCount||expected.length)))return true;return expected.length>0&&expected.every(no=>saved.has(no))}

async function updateDurable(start,end){
  if(running)return;
  const api=window.ATF6062;if(!api?.readProgramRange)throw new Error('Program arşivi okuyucusu hazır değil.');
  running=true;setButton('İndiriliyor…',true);
  try{
    const program=(await api.readProgramRange(start,end)).filter(r=>isDomestic(r?.city));
    const groups=makeGroups(program);if(!groups.length)throw new Error('Bu tarih aralığında yerli program arşivi bulunamadı. Önce Program Arşivini indirin.');
    const [raceRows,dayRows]=await Promise.all([readRange(STORE_RACES,start,end),readRange(STORE_DAYS,start,end)]),maps=buildExistingMaps(raceRows,dayRows);
    let completed=groups.filter(g=>isComplete(g,maps)).length,errors=0;
    await persistJob({start,end,total:groups.length,completed,status:'running',current:null,errors});
    setStatus(`${completed}/${groups.length} gün/şehir telefonda kayıtlı · eksikler tamamlanıyor…`);
    for(const group of groups){
      if(isComplete(group,maps))continue;
      const expected=expectedNos(group),saved=maps.races.get(group.key)||new Set();
      await persistJob({start,end,total:groups.length,completed,status:'running',current:{date:group.date,city:group.city,saved:saved.size,expected:expected.length},errors});
      setStatus(`${group.date} · ${group.city} alınıyor… ${completed}/${groups.length} · bu güne ait ${saved.size}/${expected.length} yarış kalıcı kayıtlı`);
      try{
        const data=await fetchDay(group),races=Array.isArray(data?.races)?data.races:[];
        for(const race of races){
          const no=resultRaceNo(race);if(!no)continue;
          if(await saveRace(group,race))saved.add(no);
          maps.races.set(group.key,saved);
          const missingNow=expected.filter(n=>!saved.has(n));
          await saveDayState(group,{expected:expected.length,raceCount:saved.size,status:missingNow.length?'partial':'complete',missingRaceNos:missingNow,error:null});
          await persistJob({start,end,total:groups.length,completed,status:'running',current:{date:group.date,city:group.city,saved:saved.size,expected:expected.length},errors});
        }
        const missing=expected.filter(n=>!saved.has(n)),state=missing.length?'partial':'complete';
        await saveDayState(group,{expected:expected.length,raceCount:saved.size,status:state,missingRaceNos:missing,error:races.length?null:'Sonuç yarışı bulunamadı'});
        maps.days.set(group.key,{key:group.key,status:state,raceCount:saved.size,expectedRaceCount:expected.length});
        if(state==='complete')completed++;else errors++;
      }catch(e){
        errors++;
        await saveDayState(group,{expected:expected.length,raceCount:saved.size,status:saved.size?'partial':'error',missingRaceNos:expected.filter(n=>!saved.has(n)),error:e?.message||String(e)});
        maps.days.set(group.key,{key:group.key,status:saved.size?'partial':'error',raceCount:saved.size,expectedRaceCount:expected.length});
      }
      await persistJob({start,end,total:groups.length,completed,status:'running',current:null,errors});
      setStatus(`${completed}/${groups.length} gün/şehir kalıcı kaydedildi${errors?` · ${errors} eksik/hata tekrar denenecek`:''}`);
      await new Promise(r=>setTimeout(r,0));
    }
    const finalComplete=groups.filter(g=>isComplete(g,maps)).length,finished=finalComplete===groups.length;
    await persistJob({start,end,total:groups.length,completed:finalComplete,status:finished?'complete':'partial',current:null,errors});
    setStatus(finished?`Tamamlandı · ${finalComplete}/${groups.length} gün/şehir telefona kalıcı kaydedildi.`:`${finalComplete}/${groups.length} gün/şehir kalıcı kaydedildi · kalan eksikler için aynı düğmeye tekrar dokun.`);
    window.ATAnnualResultsArchiveV661?.refresh?.();
  } finally {
    running=false;setButton('Eksik Sonuçları Güncelle',false);
  }
}

async function showSavedProgress(){
  const job=await currentJob();if(!job||running)return;
  const start=$('f62rStart')?.value,end=$('f62rEnd')?.value;if(start&&end&&(job.start!==start||job.end!==end))return;
  if(job.status==='complete')setStatus(`Son indirme tamamlandı · ${job.completed||job.total||0}/${job.total||0} gün/şehir kalıcı kayıtlı.`);
  else if(job.total)setStatus(`Kayıtlı ilerleme: ${job.completed||0}/${job.total} gün/şehir. İndirme yarıda kaldıysa “Eksik Sonuçları Güncelle” ile kaldığı yerden devam eder.`);
}

function normalizeRange(){const core=window.ATF6062?.core;let start=$('f62rStart')?.value,end=$('f62rEnd')?.value;if(core?.normalizeRange){const n=core.normalizeRange(start,end,new Date().toISOString().slice(0,10));start=n.start;end=n.end}return{start:iso(start),end:iso(end)}}
function bind(){
  const btn=$('f62rUpdate');if(!btn||btn.dataset.f6068Bound==='1')return false;
  btn.dataset.f6068Bound='1';
  btn.onclick=async()=>{const{start,end}=normalizeRange();if(!start||!end)return;btn.disabled=true;try{await updateDurable(start,end)}catch(e){setStatus(e?.message||String(e));running=false;setButton('Eksik Sonuçları Güncelle',false)}};
  void showSavedProgress();
  return true;
}
function scheduleBind(){setTimeout(bind,100);setTimeout(bind,500)}
document.addEventListener('click',e=>{if(e.target?.closest?.('#tjkAnnualArchiveButton,#annualArchiveButton,[data-view="annual-archive"]'))scheduleBind()},true);
window.addEventListener('pageshow',scheduleBind);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleBind,{once:true});else scheduleBind();
setTimeout(bind,1200);

window.ATF6068ResultsResume={version:VERSION,updateDurable,showSavedProgress,currentJob,bind};
console.info('[AT AI]',VERSION,'aktif — sonuçlar yarış yarış kalıcı kaydedilir; menü/sayfa değişiminden sonra gerçek IndexedDB kayıtlarından devam edilir.');
})();
