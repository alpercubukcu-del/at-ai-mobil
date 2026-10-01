;(() => {
'use strict';
if (window.__AT_TRACK_MAINT_ARCHIVE_F6089__) return;
window.__AT_TRACK_MAINT_ARCHIVE_F6089__ = true;

const VERSION='TRACK-MAINT-ARCHIVE-V17.4.1';
const DB_NAME='at_ai_tjk_track_maintenance_v1';
const DB_VERSION=2;
const STORE='reports';
const META='meta';
const API='/api/tjk-track-info-v1';
const PAGE_SIZE=50;
const DETAIL_CONCURRENCY=5;
const PAGE_CONCURRENCY=4;
const MAX_PAGES=80;
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reportKey=(date,city)=>`${clean(date)}|${fold(city)}`;
let dbPromise=null;
let busy=false;
let lastContext=null;
let progressListener=null;

function isoDate(d){
  if(typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))return d;
  const x=d instanceof Date?d:new Date(d);
  if(Number.isNaN(x.getTime()))return'';
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}
function addDays(iso,n){const [y,m,d]=String(iso).split('-').map(Number),x=new Date(y,m-1,d);x.setDate(x.getDate()+n);return isoDate(x)}
function monthOf(iso){return Number(String(iso||'').slice(5,7))||0}
function median(values){const a=values.filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function mode(values){const m=new Map();for(const v of values){const k=String(v);m.set(k,(m.get(k)||0)+1)}return [...m].sort((a,b)=>b[1]-a[1])[0]?.[0]??null}
function windParts(raw=''){
  const t=clean(raw),u=fold(t);const m=t.replace(',','.').match(/(\d+(?:\.\d+)?)\s*(?:KM\s*\/?\s*(?:SA|S)|KM\/H|KPH)?/i);const speed=m?Number(m[1]):null;
  const dirs=[['KUZEYDOGU','KD'],['KUZEYBATI','KB'],['GUNEYDOGU','GD'],['GUNEYBATI','GB'],['KUZEY','K'],['GUNEY','G'],['DOGU','D'],['BATI','B']];let direction='';
  for(const [word,code] of dirs){if(u.includes(word)||new RegExp(`(^|[^A-Z])${code}([^A-Z]|$)`).test(u)){direction=code;break}}
  return{speed:Number.isFinite(speed)?speed:null,direction};
}
function detailedSurface(city,track){const c=fold(city),t=fold(track);if(t.includes('CIM'))return'Çim';if(t.includes('SENTETIK'))return'Sentetik';if(!t.includes('KUM'))return clean(track)||'Bilinmiyor';if(['ADANA','ANKARA','BURSA','IZMIR','KOCAELI'].includes(c))return'Yarı Sentetik';if(['DIYARBAKIR','ELAZIG','SANLIURFA'].includes(c))return'Doğal Dere Kumu';return'Kum'}

function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    if(!('indexedDB'in window))return resolve(null);
    let q;try{q=indexedDB.open(DB_NAME,DB_VERSION)}catch{return resolve(null)}
    q.onupgradeneeded=()=>{
      const db=q.result;
      let s=db.objectStoreNames.contains(STORE)?q.transaction.objectStore(STORE):db.createObjectStore(STORE,{keyPath:'key'});
      if(!s.indexNames.contains('year'))s.createIndex('year','year',{unique:false});
      if(!s.indexNames.contains('date'))s.createIndex('date','date',{unique:false});
      if(!s.indexNames.contains('city'))s.createIndex('city','cityKey',{unique:false});
      if(!db.objectStoreNames.contains(META))db.createObjectStore(META,{keyPath:'key'});
    };
    q.onsuccess=()=>{const db=q.result;db.onversionchange=()=>{try{db.close()}catch{}dbPromise=null};resolve(db)};
    q.onerror=q.onblocked=()=>{dbPromise=null;resolve(null)};
  });
  return dbPromise;
}
async function dbGet(store,key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function dbPut(store,value){const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function rowsByIndex(indexName,value){const db=await openDb();if(!db)return[];return new Promise(resolve=>{const out=[];try{const os=db.transaction(STORE,'readonly').objectStore(STORE),idx=os.index(indexName),q=idx.openCursor(IDBKeyRange.only(value));q.onsuccess=()=>{const c=q.result;if(!c)return;out.push(c.value);c.continue()};q.transaction.oncomplete=()=>resolve(out);q.transaction.onerror=q.transaction.onabort=()=>resolve(out)}catch{resolve(out)}})}
async function allRows(){const db=await openDb();if(!db)return[];return new Promise(resolve=>{try{const q=db.transaction(STORE,'readonly').objectStore(STORE).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([])}catch{resolve([])}})}

async function apiJson(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal:controller.signal}),d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||`API ${r.status}`);return d}catch(e){if(e?.name==='AbortError')throw Error('TJK pist verisi 20 saniyede yanıt vermedi. Tekrar deneyin.');throw e}finally{clearTimeout(timer)}}
async function mapLimit(list,limit,worker){const out=new Array(list.length);let cursor=0;async function run(){for(;;){const i=cursor++;if(i>=list.length)return;out[i]=await worker(list[i],i)}}await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length||1)},run));return out}
function setStatus(text,pct=null){const e=$('tmStatusF6089');if(e)e.textContent=text;const b=$('tmBarF6089');if(b&&pct!==null)b.style.width=`${Math.max(0,Math.min(100,pct))}%`;try{progressListener?.({text,pct})}catch{};try{window.dispatchEvent(new CustomEvent('at-ai:track-maintenance-status',{detail:{text,pct,version:VERSION}}))}catch{}}

async function fetchPage(start,end,page){const u=new URL(API,location.origin);u.searchParams.set('start',start);u.searchParams.set('end',end);u.searchParams.set('page',String(page));return apiJson(u.pathname+u.search)}
async function fetchDetail(reportUrl){if(!reportUrl)return null;const u=new URL(API,location.origin);u.searchParams.set('mode','report');u.searchParams.set('url',reportUrl);return apiJson(u.pathname+u.search)}
function normalizeRow(row){const wind=windParts(row?.wind);return{...row,key:reportKey(row?.date,row?.city),year:Number(String(row?.date||'').slice(0,4))||0,cityKey:fold(row?.city),month:monthOf(row?.date),windSpeedKmh:wind.speed,windDirection:wind.direction,updatedAt:new Date().toISOString()}}
async function saveRows(rows,{loadReports=true,onProgress=null}={}){
  const list=(Array.isArray(rows)?rows:[]).map(normalizeRow);let done=0;
  await mapLimit(list,DETAIL_CONCURRENCY,async row=>{
    const old=await dbGet(STORE,row.key);let merged={...old,...row};
    if(loadReports&&row.reportUrl&&(old?.maintenance?.observationKind!=='DOCUMENTED_SCHEDULE'||!old?.maintenanceAvailableAt||old?.reportUrl!==row.reportUrl)){
      try{const detail=await fetchDetail(row.reportUrl);merged={...merged,maintenance:detail?.maintenance||null,maintenanceAvailableAt:new Date().toISOString(),maintenanceAvailabilitySource:'FIRST_VERIFIED_DOWNLOAD',reportPages:detail?.pages||0,reportError:null,reportParsedAt:new Date().toISOString()}}catch(e){merged.reportError=e?.message||String(e)}
    }
    if(!await dbPut(STORE,merged))throw Error('Pist arşivi kaydı yazılamadı. Tarayıcı depolama iznini kontrol edin.');
    await dbPut(META,{key:`city:${merged.cityKey}`,city:merged.city,cityKey:merged.cityKey,lastDate:merged.date,updatedAt:new Date().toISOString()});
    done++;if(onProgress)onProgress(done,list.length,merged);
  });
  return list.length;
}
async function syncWindow(start,end,{loadReports=true,label='Pist bilgileri'}={}){
 const first=await fetchPage(start,end,0),total=Number(first?.total||0),size=(first?.rows||[]).length||PAGE_SIZE,pages=Math.max(1,Math.ceil(total/size));
 if(pages>MAX_PAGES)throw Error('Pist arşivi pencere sınırını aşıyor; eksik indirme tamamlandı sayılmadı.');
 const rows=[],seen=new Set();
 for(let page=0;page<pages;page++){
  const data=page===0?first:await fetchPage(start,end,page),part=data?.rows||[];
  if(part.some(r=>!r.city||!r.date||r.date<start||r.date>end))throw Error('Pist sayfası tarih aralığı dışında; ilerleme kaydedilmedi.');
  if(!part.length&&rows.length<total)throw Error('Pist arşivinde beklenen sayfa boş; ilerleme kaydedilmedi.');
  for(const r of part){const key=reportKey(r.date,r.city);if(seen.has(key))throw Error('TJK aynı pist kaydını tekrar döndürdü; indirme tamamlandı sayılmadı.');seen.add(key);rows.push(r)}
  setStatus(`${label}: ${page+1}/${pages} sayfa alındı…`,Math.round((page+1)/pages*45));
 }
 if(rows.length<total)throw Error(`Pist arşivi eksik (${rows.length}/${total}); ilerleme kaydedilmedi.`);
 await saveRows(rows,{loadReports,onProgress:(done,n,row)=>setStatus(`${label}: ${done}/${n} rapor · ${row.city} ${row.date}`,45+Math.round(done/Math.max(1,n)*50))});
 return rows;
}
async function syncRangeInternal(start,end,options={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw Error('Geçerli pist arşivi tarih aralığı seçin.');
 const key=`verified-range:${start}:${end}`,saved=await dbGet(META,key),rows=[];if(end>=isoDate(new Date())&&saved?.nextDate>end)saved.nextDate=end;
 let cursor=saved?.validationVersion===17413?saved.nextDate:start;
 while(cursor<=end){const last=[addDays(cursor,6),end].sort()[0];rows.push(...await syncWindow(cursor,last,options));const next=addDays(last,1);
  if(!await dbPut(META,{key,startDate:start,lastDate:last,nextDate:next,validationVersion:17413,updatedAt:new Date().toISOString()}))throw Error('Pist arşivi ilerlemesi kaydedilemedi.');cursor=next;await new Promise(resolve=>setTimeout(resolve,0));
 }
 const archived=(await allRows()).filter(r=>r.date>=start&&r.date<=end),repairs=options.loadReports===false?[]:archived.filter(r=>r.reportUrl&&(r.maintenance?.observationKind!=='DOCUMENTED_SCHEDULE'||!r.maintenanceAvailableAt||r.reportError));if(repairs.length)await saveRows(repairs,{loadReports:true});
 if(!await dbPut(META,{key:'sync:last',lastDate:end,startDate:start,rowCount:rows.length,validationVersion:17413,updatedAt:new Date().toISOString(),version:VERSION}))throw Error('Pist arşivi güncelleme kaydı saklanamadı.');
 setStatus(`${options.label||'Pist bilgileri'} tamamlandı · doğrulanmış aralık ${start} → ${end}`,100);return rows;
}
async function syncRange(start,end,options={}){if(busy)throw Error('Pist verileri zaten güncelleniyor.');busy=true;try{return await syncRangeInternal(start,end,options)}finally{busy=false}}
async function syncYear(year){const y=Number(year),start=`${y}-01-01`,end=`${y}-12-31`,saved=await dbGet(META,`year:${y}:progress`),resume=start;if(resume>end){await dbPut(META,{key:`year:${y}`,year:y,rowCount:Number(saved?.rowCount||0),status:'complete',validationVersion:17413,updatedAt:new Date().toISOString(),version:VERSION});return[]}setStatus(`${y} pist/bakım/hava arşivi ${resume} tarihinden devam ediyor…`,0);const rows=await syncRangeInternal(resume,end,{loadReports:true,label:String(y)});const all=(await rowsByIndex('year',y)).filter(r=>r.date>=start&&r.date<=end);await dbPut(META,{key:`year:${y}:progress`,year:y,lastDate:end,rowCount:all.length,updatedAt:new Date().toISOString(),version:VERSION});await dbPut(META,{key:`year:${y}`,year:y,rowCount:all.length,status:'complete',validationVersion:17413,updatedAt:new Date().toISOString(),version:VERSION});return rows}
async function backfillYears(from,to,{throwIfBusy=false}={}){if(busy){if(throwIfBusy)throw Error('Pist verileri zaten güncelleniyor. Tamamlanmasını bekleyin.');return}busy=true;try{const a=Math.min(Number(from),Number(to)),b=Math.max(Number(from),Number(to));for(let y=a;y<=b;y++){const done=await dbGet(META,'year:'+y);if(done?.status==='complete'&&done.validationVersion===17413&&Number(done?.rowCount||0)>0){setStatus(y+' arşivde mevcut · TJK indirmesi atlandı',Math.round((y-a+1)/Math.max(1,b-a+1)*100));continue}await syncYear(y)}await refreshUi()}finally{busy=false}}
async function autoSync(targetDate,{throwOnError=false}={}){
  if(window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__){if(throwOnError)throw Error('Başka bir arşiv güncellemesi sürüyor. Tamamlanmasını bekleyin.');return}
  if(busy){if(throwOnError)throw Error('Pist verileri zaten güncelleniyor. Tamamlanmasını bekleyin.');return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate||'')))return;
  busy=true;
  try{
    const meta=await dbGet(META,'sync:last'),all=await allRows(),dates=all.map(r=>r?.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d))&&d<=targetDate).sort(),localLast=dates.at(-1)||'',last=[meta?.lastDate||'',localLast].sort().at(-1)||'';
    let start=last&&last<targetDate?addDays(last,1):targetDate;
    if(start>targetDate)start=targetDate;
    await syncRangeInternal(start,targetDate,{loadReports:true,label:'Otomatik pist güncellemesi'});
    const city=typeof getCityName==='function'?getCityName():'';
    if(city){lastContext=await infer(targetDate,city);window.__AT_TRACK_CONTEXT_F6089__=lastContext;}
    await refreshUi();
  }catch(e){console.warn('[AT AI]',VERSION,'otomatik güncelleme:',e);if(throwOnError)throw e}finally{busy=false}
}

async function getReport(date,city){return dbGet(STORE,reportKey(date,city))}
async function cityRows(city){return rowsByIndex('city',fold(city))}
async function profile(city,month,dateLimit='9999-12-31'){
  const rows=(await cityRows(city)).filter(r=>r.date<dateLimit&&(!month||Math.abs((r.month||month)-month)<=1));
  if(!rows.length)return null;
  const ops=['watering','mowing','roller','harrow','rotavator','synchrogerm','gallopMaster','powerHarrow','vertiDrain','reglaj','stoneBurier'];
  const probabilities={};for(const op of ops){const known=rows.filter(r=>r.maintenance&&typeof r.maintenance[op]==='boolean');probabilities[op]=known.length?known.filter(r=>r.maintenance[op]).length/known.length:null}
  const barriers=rows.flatMap(r=>r.maintenance?.barrierMeters||[]),pens=rows.flatMap(r=>r.maintenance?.penetrometer||[]);
  return{sampleCount:rows.length,probabilities,barrierMedian:median(barriers),barrierMode:mode(barriers),penetrometerMedian:median(pens),temperatureMedian:median(rows.map(r=>r.temperature)),humidityMedian:median(rows.map(r=>r.humidity)),pressureMedian:median(rows.map(r=>r.pressure)),windSpeedMedian:median(rows.map(r=>r.windSpeedKmh))};
}
async function infer(date,city){
  const exact=await getReport(date,city),m=monthOf(date),p=await profile(city,m,date);
  const rows=(await cityRows(city)).filter(r=>r.date<date).sort((a,b)=>b.date.localeCompare(a.date));const last=rows[0]||null;
  const env=exact||last||{};
  const z=(v,med,scale)=>Number.isFinite(v)&&Number.isFinite(med)?Number(((v-med)/scale).toFixed(3)):null;
  const inferredMaintenance=exact?.maintenance?.signalCount?exact.maintenance:(p?{inferred:true,probabilities:p.probabilities,barrierMeters:Number.isFinite(p.barrierMedian)?[Number(p.barrierMedian)]:[],penetrometer:Number.isFinite(p.penetrometerMedian)?[Number(p.penetrometerMedian)]:[],signalCount:0}:null);
  return{date,city,source:exact?'EXACT_TJK':(last?'LAST_KNOWN_PLUS_SEASONAL':'SEASONAL_ONLY'),confidence:exact?.maintenance?.signalCount?1:(last&&p?.sampleCount>=5?.72:p?.sampleCount>=5?.55:.25),record:exact||null,lastKnown:last,maintenance:inferredMaintenance,weather:{temperature:env.temperature??null,humidity:env.humidity??null,pressure:env.pressure??null,sky:env.sky||'',wind:env.wind||'',windSpeedKmh:env.windSpeedKmh??null,windDirection:env.windDirection||'',temperatureAnomaly:z(env.temperature,p?.temperatureMedian,8),humidityAnomaly:z(env.humidity,p?.humidityMedian,20),pressureAnomaly:z(env.pressure,p?.pressureMedian,15),windAnomaly:z(env.windSpeedKmh,p?.windSpeedMedian,15)},profile:p};
}

async function storageSummary(){try{const e=await navigator.storage?.estimate?.();if(!e)return'';return`Tarayıcı: ${(Number(e.usage||0)/1048576).toFixed(1)} MB kullanılıyor`;}catch{return''}}
async function refreshUi(){
  const host=$('tmMetaF6089');if(!host)return;
  const all=await allRows(),years=[...new Set(all.map(r=>r.year).filter(Boolean))].sort((a,b)=>a-b),last=all.map(r=>r.date).filter(Boolean).sort().at(-1)||'—';
  const cities=[...new Set(all.map(r=>r.city).filter(Boolean))];
  host.innerHTML=`<b>${all.length}</b> pist günü · <b>${cities.length}</b> hipodrom/şehir · ${years.length?`${years[0]}–${years.at(-1)}`:'arşiv boş'} · son ${esc(last)}<br><span style="opacity:.7">${esc(await storageSummary())}</span>`;
}
function installPanel(){
  const dlg=$('tjkAnnualArchiveDialog');if(!dlg||$('trackMaintenanceSectionF6089'))return false;
  const sections=dlg.querySelectorAll('.aa-section');const anchor=sections[sections.length-1]||dlg.querySelector('form')||dlg;
  const current=new Date().getFullYear(),years=Array.from({length:Math.max(1,current-2000+1)},(_,i)=>current-i).map(y=>`<option value="${y}">${y}</option>`).join('');
  const s=document.createElement('div');s.className='aa-section';s.id='trackMaintenanceSectionF6089';s.innerHTML=`
    <h3>Pist / Bakım / Hava Arşivi</h3>
    <div class="aa-note">Bir kez geçmiş yılları indirir. Sonrasında her TJK program yüklemesinde son kaldığı tarihten itibaren otomatik güncellenir. Sıcaklık, nem, basınç, gökyüzü ve rüzgâr derece modeline birlikte aktarılır.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><label>Başlangıç yılı<select id="tmFromF6089">${years}</select></label><label>Bitiş yılı<select id="tmToF6089">${years}</select></label></div>
    <button id="tmBackfillF6089" class="primary" type="button" style="margin-top:8px">Seçili Yılları Bir Kez İndir</button>
    <button id="tmNowF6089" type="button" style="margin-top:6px">Bugüne Kadar Eksikleri Güncelle</button>
    <div style="height:6px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;margin-top:8px"><div id="tmBarF6089" style="height:100%;width:0;background:currentColor;opacity:.65"></div></div>
    <div id="tmStatusF6089" class="aa-note" style="margin-top:6px">Hazır.</div><div id="tmMetaF6089" class="aa-note"></div>`;
  anchor.insertAdjacentElement('afterend',s);
  $('tmFromF6089').value=String(Math.max(2000,current-5));$('tmToF6089').value=String(current);
  $('tmBackfillF6089').onclick=()=>backfillYears($('tmFromF6089').value,$('tmToF6089').value).catch(e=>setStatus(`Hata: ${e?.message||e}`,0));
  $('tmNowF6089').onclick=()=>autoSync((typeof state!=='undefined'&&state?.date)||isoDate(new Date())).catch(e=>setStatus(`Hata: ${e?.message||e}`,0));
  refreshUi();return true;
}
function installWhenReady(){if(installPanel())return;let n=0;const t=setInterval(()=>{n++;if(installPanel()||n>60)clearInterval(t)},500)}

window.ATTrackMaintenanceV1={version:VERSION,get:getReport,allRows,profile,infer,syncRange,backfillYears,autoSync,detailedSurface,windParts,getLastContext:()=>lastContext,isBusy:()=>busy,initialize:openDb,setProgressListener:fn=>{progressListener=typeof fn==='function'?fn:null}};
installWhenReady();
console.info('[AT AI]',VERSION,'aktif');
})();
