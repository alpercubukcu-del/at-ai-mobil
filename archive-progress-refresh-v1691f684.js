/* AT AI Mobil — F60.84 Sonuç arşivi yenileme sonrası kalıcı özet */
(() => {
'use strict';
if (window.__AT_F6084_ARCHIVE_PROGRESS_REFRESH__) return;
window.__AT_F6084_ARCHIVE_PROGRESS_REFRESH__ = true;

const VERSION='ARCHIVE-PROGRESS-REFRESH-V16.9.1F60.84';
const DB='at_ai_tjk_annual_results_v1', DAYS='days', RACES='races', META='meta';
const META_RANGE='f6084:last-visible-range';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function iso(v){
  const s=clean(v); let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:'';
}
function openDb(){return new Promise(resolve=>{let q;try{q=indexedDB.open(DB)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null);});}
async function metaGet(key){const db=await openDb();if(!db||!db.objectStoreNames.contains(META))return null;return new Promise(resolve=>{try{const q=db.transaction(META,'readonly').objectStore(META).get(key);q.onsuccess=()=>{try{db.close()}catch{}resolve(q.result||null)};q.onerror=()=>{try{db.close()}catch{}resolve(null)}}catch{try{db.close()}catch{}resolve(null)}})}
async function metaPut(value){const db=await openDb();if(!db||!db.objectStoreNames.contains(META))return false;return new Promise(resolve=>{try{const tx=db.transaction(META,'readwrite');tx.objectStore(META).put(value);tx.oncomplete=()=>{try{db.close()}catch{}resolve(true)};tx.onerror=tx.onabort=()=>{try{db.close()}catch{}resolve(false)}}catch{try{db.close()}catch{}resolve(false)}})}
function uiRange(){const start=iso($('f62rStart')?.value),end=iso($('f62rEnd')?.value);return start&&end?{start,end}:null;}
async function range(){const r=uiRange();if(r){await metaPut({key:META_RANGE,...r,updatedAt:new Date().toISOString()});return r;}const old=await metaGet(META_RANGE);if(old?.start&&old?.end)return{start:iso(old.start),end:iso(old.end)};return null;}
async function summarize(start,end){
  const db=await openDb();if(!db)return null;
  const out={days:0,complete:0,partial:0,error:0,races:0,postponed:0,minDate:'',maxDate:''};
  try{
    if(db.objectStoreNames.contains(DAYS)) await new Promise(resolve=>{const tx=db.transaction(DAYS,'readonly'),os=tx.objectStore(DAYS),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx&&start&&end?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();q.onsuccess=e=>{const c=e.target.result;if(!c)return;const d=c.value,date=iso(d?.date||d?.scheduledDate);if((!start||date>=start)&&(!end||date<=end)){out.days++;if(d?.status==='complete')out.complete++;else if(Number(d?.raceCount||0)>0)out.partial++;else if(d?.status==='error')out.error++;out.races+=Number(d?.raceCount||0);out.postponed+=Array.isArray(d?.postponedRaceNos)?d.postponedRaceNos.length:0;if(date&&(!out.minDate||date<out.minDate))out.minDate=date;if(date&&(!out.maxDate||date>out.maxDate))out.maxDate=date;}c.continue()};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>resolve();});
    if(out.races===0&&db.objectStoreNames.contains(RACES)) await new Promise(resolve=>{let count=0;const tx=db.transaction(RACES,'readonly'),os=tx.objectStore(RACES),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx&&start&&end?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();q.onsuccess=e=>{const c=e.target.result;if(!c)return;const r=c.value,date=iso(r?.date||r?.scheduledDate);if((!start||date>=start)&&(!end||date<=end))count++;c.continue()};tx.oncomplete=()=>{out.races=count;resolve()};tx.onerror=tx.onabort=()=>resolve();});
  }finally{try{db.close()}catch{}}
  return out;
}
function fmt(n){return Number(n||0).toLocaleString('tr-TR');}
function ensureSummaryHost(){
  let el=$('f6084StoredSummary'); if(el)return el;
  const status=$('f62rStatus'); if(!status)return null;
  el=document.createElement('div');el.id='f6084StoredSummary';el.className='f62-status';el.style.marginTop='8px';status.insertAdjacentElement('afterend',el);return el;
}
async function refresh(){
  const r=await range();const s=await summarize(r?.start||'',r?.end||'');if(!s)return;
  const el=ensureSummaryHost();if(!el)return;
  const scope=r?`${r.start.split('-').reverse().join('.')} → ${r.end.split('-').reverse().join('.')}`:'tüm kayıtlar';
  el.textContent=`📦 Telefonda kalıcı sonuç arşivi · ${scope}: ${fmt(s.races)} koşu · ${fmt(s.complete)}/${fmt(s.days)} toplantı tam · ${fmt(s.partial)} yarım · ${fmt(s.postponed)} ertelenmiş. Sayfa yenilense de bu kayıtlar IndexedDB'de korunur.`;
  const st=$('f62rStatus');if(st&&!clean(st.textContent))st.textContent='Kayıtlı sonuç arşivi telefondan yeniden okundu. Güncelle yalnız eksikleri tamamlar.';
}
function schedule(){for(const ms of [80,300,800,1600,3000,6000])setTimeout(()=>void refresh(),ms);}
window.addEventListener('pageshow',schedule);
window.addEventListener('load',schedule);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
document.addEventListener('click',e=>{if(e.target?.closest?.('#tjkAnnualArchiveButton,#annualArchiveButton,[data-view="annual-archive"],#f62rUpdate,#f62rRepair'))schedule();},true);
document.addEventListener('change',e=>{if(e.target?.matches?.('#f62rStart,#f62rEnd'))schedule();},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
setTimeout(schedule,2000);
window.ATF6084ArchiveProgress={version:VERSION,refresh,summarize};
console.info('[AT AI]',VERSION,'aktif — sonuç arşivi özeti sayfa yenilemesinde doğrudan IndexedDB’den geri yüklenir.');
})();
