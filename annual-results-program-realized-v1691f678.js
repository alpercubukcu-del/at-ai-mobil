/* AT AI Mobil — F60.78 Program kaynaklı, yalnız aynı gün gerçekleşen sonuçlar */
(() => {
'use strict';
if(window.__AT_RESULTS_PROGRAM_REALIZED_F6078__)return;
window.__AT_RESULTS_PROGRAM_REALIZED_F6078__=true;

const VERSION='ANNUAL-RESULTS-PROGRAM-REALIZED-V16.9.1F60.78';
const DB_NAME='at_ai_tjk_annual_results_v1';
const STORE_RACES='races',STORE_DAYS='days',STORE_META='meta';
const JOB_KEY='f6078:program-realized-results-job';
const DOMESTIC=new Set(['ADANA','ANKARA','ANTALYA','BURSA','DIYARBAKIR','ELAZIG','ISTANBUL','IZMIR','KOCAELI','SANLIURFA']);
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const iso=v=>{const s=clean(v);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''};
const isDomestic=c=>DOMESTIC.has(fold(c));
const dayKey=(date,city)=>`day|${iso(date)}|${fold(city)}`;
const raceKey=(date,city,no)=>`result|${iso(date)}|${fold(city)}|${Number(no)||0}`;
let dbPromise=null,running=false;

function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function openDb(){if(dbPromise)return dbPromise;dbPromise=new Promise(resolve=>{let q;try{q=indexedDB.open(DB_NAME)}catch{return resolve(null)};q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(STORE_RACES)){const s=d.createObjectStore(STORE_RACES,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(STORE_DAYS)){const s=d.createObjectStore(STORE_DAYS,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(STORE_META))d.createObjectStore(STORE_META,{keyPath:'key'})};q.onsuccess=()=>{const db=q.result;db.onversionchange=()=>{try{db.close()}catch{}dbPromise=null};resolve(db)};q.onerror=q.onblocked=()=>{dbPromise=null;resolve(null)}});return dbPromise}
async function put(store,value){const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function get(store,key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function readRange(store,start,end){const db=await openDb();if(!db||!db.objectStoreNames.contains(store))return[];return new Promise(resolve=>{const out=[];try{const tx=db.transaction(store,'readonly'),os=tx.objectStore(store),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();q.onsuccess=e=>{const c=e.target.result;if(!c)return;const row=c.value,d=iso(row?.date);if(d&&d>=start&&d<=end)out.push(row);c.continue()};tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>resolve(out)}catch{resolve(out)}})}
function resolveRaceNo(row,rows){const n=Number(row?.raceNo||0);if(n)return n;const sorted=[...rows].sort((a,b)=>Number(a?.page||0)-Number(b?.page||0)||Number(a?.rowIndex||0)-Number(b?.rowIndex||0));const i=sorted.findIndex(x=>x===row||x?.id===row?.id);return i>=0?i+1:0}
function makeGroups(rows){const map=new Map();for(const r of rows){if(!isDomestic(r?.city))continue;const date=iso(r?.date),city=clean(r?.city);if(!date||!city)continue;const k=dayKey(date,city);if(!map.has(k))map.set(k,{key:k,date,city,cityId:clean(r?.cityId),rows:[]});map.get(k).rows.push(r)}return[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.city.localeCompare(b.city,'tr'))}
function expectedNos(group){const rows=[...group.rows].sort((a,b)=>Number(a?.page||0)-Number(b?.page||0)||Number(a?.rowIndex||0)-Number(b?.rowIndex||0));return [...new Set(rows.map((r,i)=>resolveRaceNo(r,rows)||i+1).filter(Boolean))].sort((a,b)=>a-b)}
function raceNo(r){return Number(r?.no??r?.raceNo??r?.race?.no??r?.race?.raceNo??0)||0}
function setStatus(text){const el=$('f62rStatus');if(el)el.textContent=text}
function setButton(text,disabled=false){const b=$('f62rUpdate');if(b){b.textContent=text;b.disabled=!!disabled}}
async function saveRace(group,race){const no=raceNo(race);if(!no)return false;return put(STORE_RACES,{key:raceKey(group.date,group.city,no),year:Number(group.date.slice(0,4)),date:group.date,city:group.city,cityId:group.cityId,raceNo:no,source:'LOCAL_ANNUAL_RESULTS_ARCHIVE',version:VERSION,updatedAt:new Date().toISOString(),race:race?.race??race})}
async function saveDay(group,{expectedNos:exp=[],actualNos=[],postponedNos=[],extraNos=[],status='complete',error=null}){return put(STORE_DAYS,{key:group.key,year:Number(group.date.slice(0,4)),date:group.date,city:group.city,cityId:group.cityId,expectedRaceCount:exp.length,raceCount:actualNos.length,expectedRaceNos:exp,actualRaceNos:actualNos,postponedRaceNos:postponedNos,extraRaceNos:extraNos,status,postponedAll:exp.length>0&&actualNos.length===0&&postponedNos.length===exp.length,sourceVersion:VERSION,updatedAt:new Date().toISOString(),error})}
async function fetchSameDay(group){const u=new URL('/api/tjk-day-results-v1',location.origin);u.searchParams.set('date',group.date);u.searchParams.set('city',group.city);const res=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'}});let data=null;try{data=await res.json()}catch{};const msg=clean(data?.error||'');if(res.ok&&data?.ok!==false)return{kind:'ok',data:data||{}};if(/tarihli TJK yarış sonucu bulunamadı|yarış sonucu bulunamadı/i.test(msg))return{kind:'no-meeting',data:data||{},message:msg};throw new Error(msg||`API ${res.status}`)}
function spanDays(start,end){const a=Date.parse(start+'T00:00:00Z'),b=Date.parse(end+'T00:00:00Z');return Number.isFinite(a)&&Number.isFinite(b)?Math.floor((b-a)/86400000)+1:0}
function suspiciousProgramCoverage(groups,start,end){const days=spanDays(start,end);if(days<60)return false;return groups.length<Math.max(12,Math.floor(days*0.25))}
function completeByNewRule(day){return day?.status==='complete'&&day?.sourceVersion===VERSION}
async function persistJob(x){return put(STORE_META,{key:JOB_KEY,version:VERSION,updatedAt:new Date().toISOString(),...x})}
function normalizeRange(){const core=window.ATF6062?.core;let start=$('f62rStart')?.value,end=$('f62rEnd')?.value;if(core?.normalizeRange){const n=core.normalizeRange(start,end,todayIso());start=n.start;end=n.end}return{start:iso(start),end:iso(end)}}

async function updateProgramRealized(start,end){
  if(running)return;
  const api=window.ATF6062;if(!api?.readProgramRange)throw new Error('Yıllık Program Arşivi okuyucusu hazır değil.');
  running=true;setButton('Gerçekleşenler indiriliyor…',true);
  try{
    setStatus('Yıllık Yarış Programı okunuyor…');
    const program=(await api.readProgramRange(start,end)).filter(r=>isDomestic(r?.city));
    const groups=makeGroups(program);
    if(!groups.length)throw new Error('Bu aralıkta Yıllık Yarış Programı bulunamadı. Önce üstteki Program Arşivinden ilgili yılı güncelleyin.');
    if(suspiciousProgramCoverage(groups,start,end))throw new Error(`Program kaynağı eksik görünüyor: yalnız ${groups.length} gün/şehir bulundu. Bu sayı seçilen aralık için güvenilir değil. Önce Yıllık Yarış Programını yeniden güncelleyin; sonuç indirme yanlışlıkla tamamlandı sayılmadı.`);
    const dayRows=await readRange(STORE_DAYS,start,end),dayMap=new Map(dayRows.map(d=>[d.key||dayKey(d.date,d.city),d]));
    let complete=groups.filter(g=>completeByNewRule(dayMap.get(g.key))).length,normal=0,postponedDays=0,networkErrors=0,pending=0;
    await persistJob({start,end,total:groups.length,complete,status:'running'});
    setStatus(`${groups.length} gün/şehir programdan bulundu · ${complete} daha önce işlendi.`);
    for(const group of groups){
      if(completeByNewRule(dayMap.get(group.key)))continue;
      const exp=expectedNos(group),past=group.date<todayIso();
      setStatus(`${group.date} · ${group.city} aynı gün gerçekleşen sonuçlar kontrol ediliyor… ${complete}/${groups.length}`);
      try{
        const response=await fetchSameDay(group);
        if(response.kind==='no-meeting'){
          if(!past){pending++;await saveDay(group,{expectedNos:exp,actualNos:[],postponedNos:[],status:'pending',error:'Bugün/gelecek tarih; sonuç henüz oluşmamış olabilir.'});dayMap.set(group.key,{key:group.key,status:'pending',sourceVersion:VERSION});continue}
          await saveDay(group,{expectedNos:exp,actualNos:[],postponedNos:exp,status:'complete',error:null});
          dayMap.set(group.key,{key:group.key,status:'complete',sourceVersion:VERSION});postponedDays++;complete++;continue;
        }
        const races=Array.isArray(response.data?.races)?response.data.races:[],actual=[];
        for(const race of races){const n=raceNo(race);if(!n)continue;if(await saveRace(group,race))actual.push(n)}
        const actualNos=[...new Set(actual)].sort((a,b)=>a-b),actualSet=new Set(actualNos),expSet=new Set(exp),missing=exp.filter(n=>!actualSet.has(n)),extra=actualNos.filter(n=>!expSet.has(n));
        if(!past&&missing.length){pending++;await saveDay(group,{expectedNos:exp,actualNos,postponedNos:[],extraNos:extra,status:'pending',error:'Gün henüz tamamlanmamış olabilir.'});dayMap.set(group.key,{key:group.key,status:'pending',sourceVersion:VERSION});continue}
        await saveDay(group,{expectedNos:exp,actualNos,postponedNos:missing,extraNos:extra,status:'complete',error:null});
        dayMap.set(group.key,{key:group.key,status:'complete',sourceVersion:VERSION});complete++;if(missing.length)postponedDays++;else normal++;
      }catch(e){networkErrors++;await saveDay(group,{expectedNos:exp,actualNos:[],postponedNos:[],status:'error',error:e?.message||String(e)});dayMap.set(group.key,{key:group.key,status:'error',sourceVersion:VERSION})}
      await persistJob({start,end,total:groups.length,complete,status:'running',current:{date:group.date,city:group.city},normal,postponedDays,networkErrors,pending});
      setStatus(`${complete}/${groups.length} gün/şehir işlendi · ${postponedDays} ertelenmiş/kısmi · ${networkErrors} bağlantı hatası${pending?` · ${pending} bekleyen`:''}`);
      await new Promise(r=>setTimeout(r,0));
    }
    const done=networkErrors===0&&pending===0&&complete===groups.length;
    await persistJob({start,end,total:groups.length,complete,status:done?'complete':'partial',normal,postponedDays,networkErrors,pending});
    setStatus(done?`Tamamlandı · ${complete}/${groups.length} gün/şehir programdan kontrol edildi · ${postponedDays} gün ertelenmiş/kısmi. Aynı gün koşulmayan yarışlar eksik sayılmadı.`:`${complete}/${groups.length} gün/şehir işlendi · ${postponedDays} ertelenmiş/kısmi · ${networkErrors} bağlantı hatası${pending?` · ${pending} bekleyen`:''}. Tekrar dokununca yalnız tamamlanmayanlar denenir.`);
    window.ATAnnualResultsArchiveV661?.refresh?.();
  } finally {running=false;setButton('Eksik Sonuçları Güncelle',false)}
}

function bind(){const btn=$('f62rUpdate');if(!btn)return false;if(btn.dataset.f6078Bound==='1')return true;btn.dataset.f6078Bound='1';btn.onclick=async()=>{const{start,end}=normalizeRange();if(!start||!end){setStatus('Başlangıç ve bitiş tarihini girin.');return}try{await updateProgramRealized(start,end)}catch(e){setStatus(e?.message||String(e));running=false;setButton('Eksik Sonuçları Güncelle',false)}};const repair=$('f62rRepair');if(repair)repair.title='F60.78: ertelenen yarışlar sonuç arşivinde eksik sayılmaz.';return true}
function schedule(){setTimeout(bind,80);setTimeout(bind,350);setTimeout(bind,900)}
document.addEventListener('click',e=>{if(e.target?.closest?.('#tjkAnnualArchiveButton,#annualArchiveButton,[data-view="annual-archive"]'))schedule()},true);
window.addEventListener('pageshow',schedule);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
setTimeout(bind,1400);
window.ATF6078ProgramRealized={version:VERSION,updateProgramRealized,bind,suspiciousProgramCoverage};
console.info('[AT AI]',VERSION,'aktif — kaynak Yıllık Yarış Programı; yalnız aynı gün gerçekleşen yarışlar sonuç arşivine yazılır, ertelenenler eksik sayılmaz.');
})();