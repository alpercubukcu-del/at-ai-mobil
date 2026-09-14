/* AT AI Mobil — F60.75 Sonuç-Öncelikli Geçmiş Arşiv */
(() => {
'use strict';
if(window.__AT_RESULTS_FIRST_F6075__)return;
window.__AT_RESULTS_FIRST_F6075__=true;
const VERSION='RESULTS-FIRST-HISTORICAL-V16.9.1F60.75';
const RESULTS_DB='at_ai_tjk_annual_results_v1',RACES='races',DAYS='days',META='meta';
const MIRROR_DB='at_ai_tjk_annual_archive_v13',MIRROR_RACES='races',MIRROR_META='meta',MIRROR_DAY='daycache';
const JOB_KEY='f6075:results-first-job';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const iso=v=>{const s=clean(v);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''};
const raceKey=(date,city,no)=>`result|${iso(date)}|${fold(city)}|${Number(no)||0}`;
const dayKey=(date,city)=>`day|${iso(date)}|${fold(city)}`;
const indexKey=year=>`f6075:index:${year}`;
let resultsDbPromise=null,mirrorDbPromise=null,running=false;

function ensureResultsDb(){
  if(resultsDbPromise)return resultsDbPromise;
  resultsDbPromise=new Promise(resolve=>{
    let q;try{q=indexedDB.open(RESULTS_DB)}catch{return resolve(null)}
    q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(RACES)){const s=d.createObjectStore(RACES,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(DAYS)){const s=d.createObjectStore(DAYS,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(META))d.createObjectStore(META,{keyPath:'key'})};
    q.onsuccess=()=>{const db=q.result,need=[RACES,DAYS,META].filter(s=>!db.objectStoreNames.contains(s));if(!need.length){db.onversionchange=()=>{try{db.close()}catch{}resultsDbPromise=null};return resolve(db)}const v=db.version+1;try{db.close()}catch{}let u;try{u=indexedDB.open(RESULTS_DB,v)}catch{return resolve(null)}u.onupgradeneeded=()=>{const d=u.result;if(!d.objectStoreNames.contains(RACES)){const s=d.createObjectStore(RACES,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(DAYS)){const s=d.createObjectStore(DAYS,{keyPath:'key'});s.createIndex('year','year',{unique:false});s.createIndex('date','date',{unique:false})}if(!d.objectStoreNames.contains(META))d.createObjectStore(META,{keyPath:'key'})};u.onsuccess=()=>resolve(u.result);u.onerror=u.onblocked=()=>resolve(null)};
    q.onerror=q.onblocked=()=>{resultsDbPromise=null;resolve(null)};
  });return resultsDbPromise;
}
function ensureMirrorDb(){
  if(mirrorDbPromise)return mirrorDbPromise;
  mirrorDbPromise=new Promise(resolve=>{
    let q;try{q=indexedDB.open(MIRROR_DB)}catch{return resolve(null)}
    q.onupgradeneeded=()=>{const d=q.result;let s=d.objectStoreNames.contains(MIRROR_RACES)?q.transaction.objectStore(MIRROR_RACES):d.createObjectStore(MIRROR_RACES,{keyPath:'key'});if(!s.indexNames.contains('year'))s.createIndex('year','value.year',{unique:false});if(!s.indexNames.contains('date'))s.createIndex('date','value.date',{unique:false});if(!d.objectStoreNames.contains(MIRROR_META))d.createObjectStore(MIRROR_META,{keyPath:'key'});if(!d.objectStoreNames.contains(MIRROR_DAY))d.createObjectStore(MIRROR_DAY,{keyPath:'key'})};
    q.onsuccess=()=>{const db=q.result,need=[MIRROR_RACES,MIRROR_META,MIRROR_DAY].filter(s=>!db.objectStoreNames.contains(s));if(!need.length){db.onversionchange=()=>{try{db.close()}catch{}mirrorDbPromise=null};return resolve(db)}const v=db.version+1;try{db.close()}catch{}let u;try{u=indexedDB.open(MIRROR_DB,v)}catch{return resolve(null)}u.onupgradeneeded=()=>{const d=u.result;let s=d.objectStoreNames.contains(MIRROR_RACES)?u.transaction.objectStore(MIRROR_RACES):d.createObjectStore(MIRROR_RACES,{keyPath:'key'});if(!s.indexNames.contains('year'))s.createIndex('year','value.year',{unique:false});if(!s.indexNames.contains('date'))s.createIndex('date','value.date',{unique:false});if(!d.objectStoreNames.contains(MIRROR_META))d.createObjectStore(MIRROR_META,{keyPath:'key'});if(!d.objectStoreNames.contains(MIRROR_DAY))d.createObjectStore(MIRROR_DAY,{keyPath:'key'})};u.onsuccess=()=>resolve(u.result);u.onerror=u.onblocked=()=>resolve(null)};
    q.onerror=q.onblocked=()=>{mirrorDbPromise=null;resolve(null)};
  });return mirrorDbPromise;
}
async function put(dbp,store,value){const db=await dbp;if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function get(dbp,store,key){const db=await dbp;if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function readRange(dbp,store,start,end,unwrap=false){const db=await dbp;if(!db||!db.objectStoreNames.contains(store))return[];return new Promise(resolve=>{const out=[];try{const tx=db.transaction(store,'readonly'),os=tx.objectStore(store),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();q.onsuccess=e=>{const c=e.target.result;if(!c)return;const raw=c.value,row=unwrap?(raw?.value??raw):raw,d=iso(row?.date);if(d&&d>=start&&d<=end)out.push(row);c.continue()};tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>resolve(out)}catch{resolve(out)}})}
async function deleteResultCity(date,city){const db=await ensureResultsDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(RACES,'readwrite'),os=tx.objectStore(RACES),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx?idx.openCursor(IDBKeyRange.only(date)):os.openCursor();q.onsuccess=e=>{const c=e.target.result;if(!c)return;const r=c.value;if(iso(r?.date)===date&&fold(r?.city)===fold(city))c.delete();c.continue()};tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function deleteMirrorDate(date){const db=await ensureMirrorDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(MIRROR_RACES,'readwrite'),os=tx.objectStore(MIRROR_RACES),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx?idx.openCursor(IDBKeyRange.only(date)):os.openCursor();q.onsuccess=e=>{const c=e.target.result;if(!c)return;const row=c.value?.value??c.value;if(iso(row?.date)===date)c.delete();c.continue()};tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
function classKey(raw=''){try{return clean(window.canonicalClassKeyV125?.(raw)||'')}catch{return''}}
function historicalRow(rec){
  const race=(rec?.race??rec)||{},date=iso(rec?.date||race?.date),city=clean(rec?.city||race?.city),raceNo=Number(rec?.raceNo||race?.no||race?.raceNo||0),classRaw=clean(race?.class||race?.yaradi1||race?.classRaw),groupRaw=clean(race?.ageGroup||race?.yaradi2||race?.groupRaw),distance=Number(race?.distance||race?.mesafe||0)||0,track=clean(race?.track||race?.pist),id=`resultref|${date}|${fold(city)}|${raceNo}`;
  return{id,date,year:Number(date.slice(0,4))||0,city,cityId:clean(rec?.cityId||race?.cityId),raceNo,classRaw,classKey:classKey(classRaw),groupRaw,distance,track,raceName:clean(race?.conditionRaw||race?.raceName||race?.yaradi3),horses:Array.isArray(race?.horses)?race.horses:[],rows:Array.isArray(race?.rows)?race.rows:[],winner:race?.winner||null,top3:Array.isArray(race?.top3)?race.top3:[],top5:Array.isArray(race?.top5)?race.top5:[],source:'ANNUAL_RESULTS_SOURCE_OF_TRUTH',page:0,rowIndex:raceNo};
}
async function readHistoricalRange(start,end){return (await readRange(ensureResultsDb(),RACES,start,end,false)).map(historicalRow).filter(r=>r.date&&r.city&&r.raceNo)}
async function rebuildMirrorDate(date){
  const rows=await readHistoricalRange(date,date);await deleteMirrorDate(date);const db=await ensureMirrorDb();if(!db)return false;
  return new Promise(resolve=>{try{const tx=db.transaction(MIRROR_RACES,'readwrite'),os=tx.objectStore(MIRROR_RACES),now=Date.now();for(const row of rows)os.put({key:row.id,value:row,updatedAt:now});tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})
}
async function fetchJson(path){const c=new AbortController(),t=setTimeout(()=>c.abort(),30000);try{const r=await fetch(path,{cache:'no-store',headers:{accept:'application/json'},signal:c.signal});let j=null;try{j=await r.json()}catch{}if(!r.ok||j?.ok===false)throw new Error(j?.error||`API ${r.status}`);return j||{}}finally{clearTimeout(t)}}
async function discoverYear(year,start,end,force=false){
  const key=indexKey(year),cached=await get(ensureResultsDb(),META,key),today=new Date().toISOString().slice(0,10),isCurrent=Number(today.slice(0,4))===Number(year);
  if(!force&&!isCurrent&&cached?.status==='complete'&&Array.isArray(cached?.groups))return cached.groups;
  const ys=`${year}-01-01`,ye=`${year}-12-31`,from=start>ys?start:ys,to=end<ye?end:ye;if(from>to)return[];
  const map=new Map();let page=1;
  while(page<=200){const u=new URL('/api/tjk-result-index-v1',location.origin);u.searchParams.set('start',from);u.searchParams.set('end',to);u.searchParams.set('page',String(page));const data=await fetchJson(u.pathname+u.search),rows=Array.isArray(data?.rows)?data.rows:[];for(const r of rows){const date=iso(r.date),city=clean(r.city),no=Number(r.raceNo||0);if(!date||!city||!no)continue;const k=dayKey(date,city);if(!map.has(k))map.set(k,{key:k,date,city,expectedNos:[]});const g=map.get(k);if(!g.expectedNos.includes(no))g.expectedNos.push(no)}if(!data?.hasMore||!rows.length)break;page++}
  const groups=[...map.values()].map(g=>({...g,expectedNos:g.expectedNos.sort((a,b)=>a-b)})).sort((a,b)=>a.date.localeCompare(b.date)||a.city.localeCompare(b.city,'tr'));
  await put(ensureResultsDb(),META,{key,year,from,to,status:'complete',groups,updatedAt:new Date().toISOString(),source:VERSION});return groups;
}
async function saveRace(group,race){const no=Number(race?.no||race?.raceNo||0);if(!no)return false;return put(ensureResultsDb(),RACES,{key:raceKey(group.date,group.city,no),year:Number(group.date.slice(0,4)),date:group.date,city:group.city,cityId:clean(race?.cityId),raceNo:no,source:'LOCAL_ANNUAL_RESULTS_ARCHIVE',sourceVersion:VERSION,updatedAt:new Date().toISOString(),race})}
async function savedNos(group){const rows=await readRange(ensureResultsDb(),RACES,group.date,group.date,false),set=new Set();for(const r of rows)if(fold(r.city)===fold(group.city)){const n=Number(r.raceNo||0);if(n)set.add(n)}return set}
async function cityComplete(group){const set=await savedNos(group);return group.expectedNos.length>0&&group.expectedNos.every(n=>set.has(n))}
async function fetchCity(group){const u=new URL('/api/tjk-day-results-v1',location.origin);u.searchParams.set('date',group.date);u.searchParams.set('city',group.city);return fetchJson(u.pathname+u.search)}
async function saveDay(group,status,error=null){const set=await savedNos(group),missing=group.expectedNos.filter(n=>!set.has(n));return put(ensureResultsDb(),DAYS,{key:group.key,year:Number(group.date.slice(0,4)),date:group.date,city:group.city,expectedRaceCount:group.expectedNos.length,raceCount:set.size,expectedRaceNos:[...group.expectedNos],missingRaceNos:missing,status,error,sourceVersion:VERSION,updatedAt:new Date().toISOString()})}
function status(text){const e=$('f62rStatus');if(e)e.textContent=text}
function button(text,disabled=false){const b=$('f62rUpdate');if(b){b.textContent=text;b.disabled=disabled}}
async function updateRange(start,end){
  if(running)return;running=true;button('Sonuçlar indiriliyor…',true);
  try{
    const y0=Number(start.slice(0,4)),y1=Number(end.slice(0,4)),groups=[];
    status('TJK gerçekleşmiş yarış sonuçları listeleniyor…');
    for(let y=y0;y<=y1;y++){status(`${y} sonuç listesi hazırlanıyor…`);groups.push(...await discoverYear(y,start,end,false))}
    const unique=[...new Map(groups.map(g=>[g.key,g])).values()],total=unique.length;let complete=0,errors=0;
    for(const g of unique)if(await cityComplete(g))complete++;
    await put(ensureResultsDb(),META,{key:JOB_KEY,start,end,total,complete,errors,status:'running',updatedAt:new Date().toISOString(),source:VERSION});
    status(`${complete}/${total} gün/şehir sonuç arşivinde hazır · yalnız eksikler indirilecek.`);
    let touchedDate='';
    for(const g of unique){
      if(await cityComplete(g))continue;
      status(`${g.date} · ${g.city} gerçek sonuçları alınıyor… ${complete}/${total}`);
      try{
        const data=await fetchCity(g),races=Array.isArray(data?.races)?data.races:[];
        await deleteResultCity(g.date,g.city);
        for(const race of races)await saveRace(g,race);
        const ok=await cityComplete(g);await saveDay(g,ok?'complete':'partial',ok?null:'TJK sonuç sayfasındaki bazı koşular ayrıştırılamadı');if(ok)complete++;else errors++;
      }catch(e){errors++;await saveDay(g,'error',e?.message||String(e))}
      if(touchedDate&&touchedDate!==g.date)await rebuildMirrorDate(touchedDate);touchedDate=g.date;
      await put(ensureResultsDb(),META,{key:JOB_KEY,start,end,total,complete,errors,status:'running',current:{date:g.date,city:g.city},updatedAt:new Date().toISOString(),source:VERSION});
      await new Promise(r=>setTimeout(r,0));
    }
    if(touchedDate)await rebuildMirrorDate(touchedDate);
    const dates=[...new Set(unique.map(g=>g.date))];for(const d of dates)await rebuildMirrorDate(d);
    const done=complete===total;await put(ensureResultsDb(),META,{key:JOB_KEY,start,end,total,complete,errors,status:done?'complete':'partial',updatedAt:new Date().toISOString(),source:VERSION});
    status(done?`Tamamlandı · ${complete}/${total} gün/şehir gerçek sonuçlardan hazır. Geçmiş filtrelerin kaynağı artık Sonuç Arşivi.`:`${complete}/${total} gün/şehir hazır · ${total-complete} eksik/hata kaldı. Tekrar dokununca yalnız eksikler denenir.`);
  }finally{running=false;button('Eksik Sonuçları Güncelle',false)}
}
function normalizeRange(){let start=iso($('f62rStart')?.value),end=iso($('f62rEnd')?.value);if(start&&end&&start>end)[start,end]=[end,start];return{start,end}}
function reviseUi(){
  const b=$('f62rUpdate');if(b&&b.dataset.f6075Bound!=='1'){b.dataset.f6075Bound='1';b.onclick=async()=>{const{start,end}=normalizeRange();if(!start||!end)return;try{await updateRange(start,end)}catch(e){running=false;button('Eksik Sonuçları Güncelle',false);status(e?.name==='AbortError'?'TJK yanıtı zaman aşımına uğradı. Tekrar deneyin.':(e?.message||String(e)))}}}
  const repair=$('f62rRepair');if(repair){repair.style.display='none';repair.disabled=true}
  const sec=$('annualResultsSectionV661');if(sec){for(const el of sec.querySelectorAll('p,.aa-note,.aa-status,.aa-sub,.aa-help')){const t=clean(el.textContent);if(/Program arşiv|program arşiv/i.test(t))el.textContent='Geçmiş veri kaynağı: TJK gerçekleşmiş yarış sonuçları. Erteleme, pist ve mesafe değişiklikleri sonuçtaki son haliyle saklanır; yıllık program arşivine ihtiyaç yoktur.'}}
  if(window.ATF6062)window.ATF6062.readProgramRange=readHistoricalRange;
}
function schedule(){setTimeout(reviseUi,80);setTimeout(reviseUi,400)}
document.addEventListener('click',e=>{if(e.target.closest?.('#tjkAnnualArchiveButton,#annualArchiveButton,[data-view="annual-archive"],[data-view="career"],[data-view="calibration"]'))schedule()},true);
window.addEventListener('pageshow',schedule);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();setTimeout(schedule,1000);
window.ATResultsFirstF6075={version:VERSION,updateRange,readHistoricalRange,historicalRow,rebuildMirrorDate,discoverYear,reviseUi};
console.info('[AT AI]',VERSION,'aktif — geçmiş yarışların tek veri kaynağı Sonuç Arşivi; yıllık program arşivi yalnız otomatik uyumluluk aynasıdır.');
})();
