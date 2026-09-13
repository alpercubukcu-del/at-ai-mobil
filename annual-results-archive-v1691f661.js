;(() => {
'use strict';
if (window.__AT_ANNUAL_RESULTS_ARCHIVE_V1691F661__) return;
window.__AT_ANNUAL_RESULTS_ARCHIVE_V1691F661__ = true;

const VERSION='ANNUAL-RESULTS-ARCHIVE-V16.9.1F60.61';
const DB_NAME='at_ai_tjk_annual_results_v1';
const DB_VERSION=1;
const STORE_RACES='races';
const STORE_DAYS='days';
const STORE_META='meta';
const PROGRAM_DB='at_ai_tjk_annual_archive_v13';
const PROGRAM_STORE='races';
const FETCH_CONCURRENCY=2;
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DOMESTIC=new Set(['ADANA','ANKARA','ANTALYA','BURSA','DIYARBAKIR','ELAZIG','ISTANBUL','IZMIR','KOCAELI','SANLIURFA']);
let dbPromise=null;
let updateBusy=false;

function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function isDomestic(city){return DOMESTIC.has(fold(city))}
function raceKey(date,city,no){return`result|${clean(date)}|${fold(city)}|${Number(no)||0}`}
function dayKey(date,city){return`day|${clean(date)}|${fold(city)}`}
function yearFromDate(date){return Number(String(date||'').slice(0,4))||0}
function clone(v){try{return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v))}catch{return v}}
function waitFrame(){return new Promise(resolve=>requestAnimationFrame(()=>resolve()))}

function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    if(!('indexedDB'in window))return resolve(null);
    let q;try{q=indexedDB.open(DB_NAME,DB_VERSION)}catch{return resolve(null)}
    q.onupgradeneeded=()=>{
      const db=q.result;
      let races=db.objectStoreNames.contains(STORE_RACES)?q.transaction.objectStore(STORE_RACES):db.createObjectStore(STORE_RACES,{keyPath:'key'});
      if(!races.indexNames.contains('year'))races.createIndex('year','year',{unique:false});
      if(!races.indexNames.contains('date'))races.createIndex('date','date',{unique:false});
      let days=db.objectStoreNames.contains(STORE_DAYS)?q.transaction.objectStore(STORE_DAYS):db.createObjectStore(STORE_DAYS,{keyPath:'key'});
      if(!days.indexNames.contains('year'))days.createIndex('year','year',{unique:false});
      if(!days.indexNames.contains('date'))days.createIndex('date','date',{unique:false});
      if(!db.objectStoreNames.contains(STORE_META))db.createObjectStore(STORE_META,{keyPath:'key'});
    };
    q.onsuccess=()=>{const db=q.result;db.onversionchange=()=>{try{db.close()}catch{}dbPromise=null};resolve(db)};
    q.onerror=q.onblocked=()=>{dbPromise=null;resolve(null)};
  });
  return dbPromise;
}
async function dbGet(store,key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function dbPut(store,value){const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function dbDeleteWhereYear(store,year){const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite'),os=tx.objectStore(store),idx=os.indexNames.contains('year')?os.index('year'):null,req=idx?idx.openCursor(IDBKeyRange.only(Number(year))):os.openCursor();req.onsuccess=()=>{const c=req.result;if(!c)return;const row=c.value;if(idx||Number(row?.year)===Number(year))c.delete();c.continue()};tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function rowsByIndex(store,indexName,value){const db=await openDb();if(!db)return[];return new Promise(resolve=>{const out=[];try{const os=db.transaction(store,'readonly').objectStore(store),idx=os.indexNames.contains(indexName)?os.index(indexName):null,req=idx?idx.openCursor(IDBKeyRange.only(value)):os.openCursor();req.onsuccess=()=>{const c=req.result;if(!c)return;const row=c.value;if(idx||String(row?.[indexName])===String(value))out.push(row);c.continue()};req.onerror=()=>resolve(out);req.transaction.oncomplete=()=>resolve(out);req.transaction.onerror=req.transaction.onabort=()=>resolve(out)}catch{resolve(out)}})}

async function annualProgramRows(year){
  if(!('indexedDB'in window))return[];
  const db=await new Promise(resolve=>{let q;try{q=indexedDB.open(PROGRAM_DB)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null)});
  if(!db||!db.objectStoreNames.contains(PROGRAM_STORE))return[];
  return new Promise(resolve=>{
    const out=[];
    try{
      const os=db.transaction(PROGRAM_STORE,'readonly').objectStore(PROGRAM_STORE),idx=os.indexNames.contains('year')?os.index('year'):null,req=idx?idx.openCursor(IDBKeyRange.only(Number(year))):os.openCursor();
      req.onsuccess=()=>{const c=req.result;if(!c)return;const row=c.value?.value??c.value;if(Number(row?.year)===Number(year)&&isDomestic(row?.city)&&clean(row?.date)<=todayIso())out.push(row);c.continue()};
      req.onerror=()=>{try{db.close()}catch{}resolve(out)};
      req.transaction.oncomplete=()=>{try{db.close()}catch{}resolve(out)};
      req.transaction.onerror=req.transaction.onabort=()=>{try{db.close()}catch{}resolve(out)};
    }catch{try{db.close()}catch{}resolve(out)}
  });
}
function groupProgramDays(rows){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=clean(row?.date),city=clean(row?.city);if(!date||!city||!isDomestic(city))continue;
    const key=dayKey(date,city);
    if(!map.has(key))map.set(key,{key,date,year:yearFromDate(date),city,cityId:clean(row?.cityId),rows:[]});
    const g=map.get(key);g.rows.push(row);if(!g.cityId&&row?.cityId)g.cityId=clean(row.cityId);
  }
  return[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.city.localeCompare(b.city,'tr'));
}
async function fetchDay(group){
  const u=new URL('/api/tjk-day-results-v1',location.origin);u.searchParams.set('date',group.date);u.searchParams.set('city',group.city);
  const res=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'}}),data=await res.json();
  if(!res.ok||data?.ok===false)throw new Error(data?.error||`API ${res.status}`);
  return data;
}
async function saveDay(group,data){
  const races=Array.isArray(data?.races)?data.races:[];
  for(const race of races){
    const no=Number(race?.no||race?.raceNo||0);if(!no)continue;
    await dbPut(STORE_RACES,{
      key:raceKey(group.date,group.city,no),year:group.year,date:group.date,city:group.city,cityId:group.cityId,raceNo:no,
      source:'LOCAL_ANNUAL_RESULTS_ARCHIVE',version:VERSION,updatedAt:new Date().toISOString(),race:clone(race)
    });
  }
  const expected=Math.max(1,group.rows.length),got=races.length,status=got>=expected?'complete':(got>0?'partial':'error');
  await dbPut(STORE_DAYS,{key:group.key,year:group.year,date:group.date,city:group.city,cityId:group.cityId,expectedRaceCount:expected,raceCount:got,status,sourceVersion:data?.version||'',updatedAt:new Date().toISOString(),error:got?null:'Sonuç yarışı bulunamadı'});
  return{status,expected,got};
}
async function mapLimit(list,limit,worker){const out=new Array(list.length);let cursor=0;async function run(){for(;;){const i=cursor++;if(i>=list.length)return;out[i]=await worker(list[i],i)}}await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length||1)},run));return out}
function setStatus(text,pct=null){const el=$('aarStatusV661');if(el)el.textContent=text;const bar=$('aarProgressV661');if(bar&&pct!==null)bar.style.width=`${Math.max(0,Math.min(100,pct))}%`}

async function updateYear(year,{force=false}={}){
  const y=Number(year);if(!y)throw new Error('Yıl seçilemedi.');
  const programRows=await annualProgramRows(y);
  if(!programRows.length)throw new Error(`${y} için önce Program Arşivini indirin. Sonuç arşivi program arşivindeki gün/şehir listesini kullanır.`);
  const groups=groupProgramDays(programRows),existing=await rowsByIndex(STORE_DAYS,'year',y),dayMap=new Map(existing.map(x=>[x.key,x]));
  const todo=groups.filter(g=>force||dayMap.get(g.key)?.status!=='complete');
  if(!todo.length){setStatus(`${y}: eksik gün yok. Sonuç arşivi güncel.`,100);await refreshMetaUi();return{year:y,total:groups.length,done:groups.length,missing:0}}
  let completed=0,errors=0;
  await mapLimit(todo,FETCH_CONCURRENCY,async(group)=>{
    try{
      setStatus(`${y}: ${group.date} · ${group.city} sonuçları alınıyor… ${completed}/${todo.length}`,Math.round(completed/Math.max(1,todo.length)*100));
      const data=await fetchDay(group),saved=await saveDay(group,data);if(saved.status!=='complete')errors++;
    }catch(e){errors++;await dbPut(STORE_DAYS,{key:group.key,year:y,date:group.date,city:group.city,cityId:group.cityId,expectedRaceCount:group.rows.length,raceCount:0,status:'error',error:e?.message||String(e),updatedAt:new Date().toISOString()})}
    completed++;setStatus(`${y}: ${completed}/${todo.length} gün/şehir işlendi${errors?` · ${errors} tekrar denenecek`:''}`,Math.round(completed/Math.max(1,todo.length)*100));
    await waitFrame();
  });
  const days=await rowsByIndex(STORE_DAYS,'year',y),races=await rowsByIndex(STORE_RACES,'year',y),valid=days.filter(x=>x.raceCount>0),last=valid.map(x=>x.date).sort().at(-1)||'';
  await dbPut(STORE_META,{key:`year:${y}`,year:y,dayCount:days.length,raceCount:races.length,lastResultDate:last,updatedAt:new Date().toISOString(),version:VERSION});
  setStatus(`${y} sonuç güncellemesi tamamlandı · ${races.length} yarış · son sonuç ${last||'—'}${errors?` · ${errors} gün/şehir sonraki Güncelle'de tekrar denenecek`:''}`,100);
  await refreshMetaUi();
  return{year:y,total:groups.length,processed:todo.length,errors,last,raceCount:races.length};
}
async function updateRange(from,to){
  if(updateBusy)return;updateBusy=true;
  const a=Math.min(Number(from)||0,Number(to)||0),b=Math.max(Number(from)||0,Number(to)||0);
  try{for(let y=a;y<=b;y++){setStatus(`${y} sonuç arşivi hazırlanıyor…`,0);await updateYear(y,{force:false})}}finally{updateBusy=false;const btn=$('aarUpdateV661');if(btn)btn.disabled=false}
}
async function deleteYear(year){const y=Number(year);if(!y)return false;await dbDeleteWhereYear(STORE_RACES,y);await dbDeleteWhereYear(STORE_DAYS,y);const db=await openDb();if(db){try{const tx=db.transaction(STORE_META,'readwrite');tx.objectStore(STORE_META).delete(`year:${y}`)}catch{}}await refreshMetaUi();return true}
async function getLocalResult(date,city,raceNo){return dbGet(STORE_RACES,raceKey(date,city,raceNo))}

async function storageText(){
  try{const e=await navigator.storage?.estimate?.();if(!e)return'Depolama bilgisi alınamadı.';const mb=n=>`${(Number(n||0)/1048576).toFixed(1)} MB`;const gb=n=>`${(Number(n||0)/1073741824).toFixed(2)} GB`;return`Tarayıcı depolaması: ${mb(e.usage)} kullanılıyor · kota ${e.quota>=1073741824?gb(e.quota):mb(e.quota)}`}
  catch{return'Depolama bilgisi alınamadı.'}
}
async function metaForYear(y){const days=await rowsByIndex(STORE_DAYS,'year',Number(y)),races=await rowsByIndex(STORE_RACES,'year',Number(y)),done=days.filter(x=>x.status==='complete').length,partial=days.filter(x=>x.status!=='complete'),dates=days.filter(x=>x.raceCount>0).map(x=>x.date).sort();return{year:Number(y),days:days.length,done,partial:partial.length,races:races.length,last:dates.at(-1)||''}}
async function refreshMetaUi(){
  const host=$('aarMetaV661');if(!host)return;
  const from=Number($('aarYearFromV661')?.value||new Date().getFullYear()),to=Number($('aarYearToV661')?.value||from),a=Math.min(from,to),b=Math.max(from,to),rows=[];
  for(let y=a;y<=b;y++)rows.push(await metaForYear(y));
  host.innerHTML=rows.map(m=>`<span class="aa-pill">${m.year}: ${m.races} yarış · ${m.done}/${m.days||0} gün tam · son ${esc(m.last||'—')}${m.partial?` · ${m.partial} eksik`:''}</span>`).join('')||'<span class="aa-pill">Sonuç arşivi yok</span>';
  const stg=$('aarStorageV661');if(stg)stg.textContent=await storageText();
}

function installPanel(){
  const dlg=$('tjkAnnualArchiveDialog');if(!dlg||$('annualResultsSectionV661'))return false;
  const title=dlg.querySelector('.aa-head h2');if(title)title.textContent='Yıllık Yarış Arşivi';
  const first=dlg.querySelector('.aa-section');if(!first)return false;
  const currentYear=new Date().getFullYear(),years=Array.from({length:currentYear-1999},(_,i)=>currentYear-i).map(y=>`<option value="${y}">${y}</option>`).join('');
  const section=document.createElement('div');section.className='aa-section';section.id='annualResultsSectionV661';section.innerHTML=`
    <h3>Yerli Yarış Sonuç Arşivi</h3>
    <div class="aa-note">Program arşivindeki yerli gün/şehir listesini kullanır. Güncelle yalnız eksik veya yarım günleri TJK'dan tamamlar. Arşiv varsa geçmiş sonuç doğrulaması önce telefondan okunur; yoksa mevcut TJK yöntemi aynen devam eder.</div>
    <div class="aa-grid two" style="margin-top:10px"><label>Başlangıç yılı<select id="aarYearFromV661">${years}</select></label><label>Bitiş yılı<select id="aarYearToV661">${years}</select></label></div>
    <div class="aa-actions"><button class="aa-btn" id="aarUpdateV661">Eksik Sonuçları Güncelle</button><button class="aa-btn secondary" id="aarDeleteV661">Bitiş Yılı Sonuçlarını Sil</button></div>
    <div id="aarStatusV661" class="aa-status">Sonuç arşivi hazır. Güncelle düğmesi yalnız eksikleri tamamlar.</div>
    <div class="aa-progress"><i id="aarProgressV661"></i></div>
    <div id="aarMetaV661" class="aa-year-pills" style="margin-top:9px"><span class="aa-pill">Durum yükleniyor…</span></div>
    <div id="aarStorageV661" class="aa-status">Depolama hesaplanıyor…</div>`;
  first.insertAdjacentElement('afterend',section);
  const from=$('aarYearFromV661'),to=$('aarYearToV661');from.value=String(currentYear);to.value=String(currentYear);
  $('aarUpdateV661').onclick=async()=>{const btn=$('aarUpdateV661');btn.disabled=true;try{await updateRange(from.value,to.value)}catch(e){setStatus(e?.message||String(e))}finally{btn.disabled=false}};
  $('aarDeleteV661').onclick=async()=>{const y=Number(to.value);if(!confirm(`${y} sonuç arşivi telefondan silinsin mi? Program arşivi korunur.`))return;await deleteYear(y);setStatus(`${y} sonuç arşivi silindi. Program arşivi korunuyor.`,0)};
  from.onchange=to.onchange=()=>void refreshMetaUi();
  void refreshMetaUi();
  return true;
}

const upstreamFetch=window.fetch.bind(window);
window.fetch=async function(input,init={}){
  try{
    const raw=typeof input==='string'?input:(input instanceof Request?input.url:String(input||'')),url=new URL(raw,location.href),method=clean(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase()||'GET';
    if(url.origin===location.origin&&method==='GET'&&url.pathname==='/api/tjk-history'){
      const date=clean(url.searchParams.get('date')),city=clean(url.searchParams.get('city')),raceNo=Number(url.searchParams.get('raceNo')||0);
      if(date&&city&&raceNo){const rec=await getLocalResult(date,city,raceNo);if(rec?.race){const race=rec.race,rows=Array.isArray(race.rows)?race.rows:[],top3=Array.isArray(race.top3)?race.top3:rows.filter(x=>Number(x?.finish)<=3),top5=Array.isArray(race.top5)?race.top5:rows.filter(x=>Number(x?.finish)<=5),payload={ok:true,version:VERSION,date,city,raceNo,class:race.class||'',ageGroup:race.ageGroup||'',distance:race.distance?`${race.distance}m`:'',track:race.track||'',conditionRaw:race.conditionRaw||'',rows,top3,top5,top3Count:top3.length,top5Count:top5.length,horseIdsComplete:top3.every(x=>clean(x?.horseId)),missingHorseIds:top3.filter(x=>!clean(x?.horseId)).length,source:'LOCAL_ANNUAL_RESULTS_ARCHIVE'};return new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json; charset=utf-8','x-at-ai-archive':'annual-results-v661'}})}}
    }
  }catch(e){console.warn('[AT AI]',VERSION,'local history lookup warning',e)}
  return upstreamFetch(input,init);
};

function installHooks(){
  installPanel();
  const btn=$('annualArchiveBtn');
  if(btn&&btn.dataset.resultsHookV661!=='1'){
    btn.dataset.resultsHookV661='1';
    btn.addEventListener('click',()=>{
      setTimeout(()=>{installPanel();void refreshMetaUi()},0);
      setTimeout(()=>{installPanel();void refreshMetaUi()},160);
    });
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHooks,{once:true});else installHooks();
setTimeout(installHooks,400);
setTimeout(installHooks,1200);
window.addEventListener('at-ai:annual-archive-open',()=>setTimeout(()=>{installPanel();void refreshMetaUi()},0));
window.ATAnnualResultsArchiveV661={version:VERSION,updateYear,updateRange,getLocalResult,refresh:refreshMetaUi,deleteYear,isDomestic};
console.info('[AT AI]',VERSION,'aktif — yerli yıllık sonuçlar telefonda IndexedDB arşivine yazılır; /api/tjk-history önce yerel arşivi, yoksa TJK fallback yöntemini kullanır.');
})();
