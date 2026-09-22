;(() => {
'use strict';
if (window.__AT_TRACK_MAINT_ARCHIVE_F6089__) return;
window.__AT_TRACK_MAINT_ARCHIVE_F6089__ = true;

const VERSION='TRACK-MAINT-ARCHIVE-V16.9.1F60.94.32.21';
const TRACK_MASTER={
 ADANA:{name:'Adana Yeşiloba',race:{CIM:'Çim',KUM:'Yarı Sentetik'},training:['Doğal Dere Kumu']},
 ANKARA:{name:'Ankara 75. Yıl',race:{CIM:'Çim',KUM:'Yarı Sentetik'},training:['Doğal Dere Kumu']},
 BURSA:{name:'Bursa Osmangazi',race:{CIM:'Çim',KUM:'Yarı Sentetik'},training:['Doğal Dere Kumu']},
 DIYARBAKIR:{name:'Diyarbakır',race:{KUM:'Doğal Dere Kumu'},training:[]},
 ELAZIG:{name:'Elazığ',race:{KUM:'Doğal Dere Kumu'},training:[]},
 ISTANBUL:{name:'İstanbul Veliefendi',race:{CIM:'Çim',SENTETIK:'Sentetik',KUM:'Sentetik'},training:['Yarı Sentetik']},
 IZMIR:{name:'İzmir Şirinyer',race:{CIM:'Çim',KUM:'Yarı Sentetik'},training:['Sentetik']},
 SANLIURFA:{name:'Şanlıurfa',race:{KUM:'Doğal Dere Kumu'},training:['Doğal Dere Kumu']},
 KOCAELI:{name:'Kocaeli',race:{KUM:'Yarı Sentetik'},training:[]}
};
const TRACK_RULES={
 grass:{drainageCm:[30,40],vegetationCm:[20,30],ph:[6.5,7.5],mowingCm:[10,12],aerationDays:21,maintenance:['Gübre','Herbisid','İnsektisid','Fungisid','Havalandırma','Sulama','İz doldurma','Biçim','Ara ekim','Bariyer değişimi','Silindir','Günlük ölçüm'],penetrometer:[{min:2.5,max:2.9,label:'Sert'},{min:3,max:3.3,label:'Normal'},{min:3.4,max:3.4,label:'Biraz Yumuşak'},{min:3.5,max:3.7,label:'Yumuşak'},{min:3.8,max:4.3,label:'Çok Yumuşak'},{min:4.4,max:4.4,label:'Biraz Ağır'},{min:4.5,max:4.9,label:'Ağır'},{min:5,max:99,label:'Çok Ağır'}]},
 synthetic:{depthCm:15,asphaltCm:6,drainageCm:10,maintenance:['Gallop Master','Power Harrow','Stone Burier','Kum derinliği','Reglaj','Derece takibi','Clegg Hammer'],gallopMasterPerDay:2,powerHarrowSummerDays:14,powerHarrowWinterDays:2,stoneBurierWinterDays:15},
 semiSynthetic:{drainageCm:[30,40],sandCm:20,hardLayerCm:8,softLayerCm:12,fiberGm2:[600,800],stabilizerGm2:[300,400],maintenance:['Synchrogerm','Mini Synchrogerm','Rotavatör','Silindir','Sulama','Kum derinliği','Reglaj','Derece takibi','Clegg Hammer'],rakeDepthCm:[6.5,11],rotavatorDays:21,rotavatorDepthCm:[10,12],reglajDays:15},
 naturalSand:{drainageCm:[30,40],sandCm:12,maintenance:['Normal tırmık','Rotavatör','Silindir','Sulama','Kum derinliği','Reglaj','Derece takibi','Clegg Hammer'],rotavatorDays:21,rotavatorDepthCm:[8,9],reglajDays:15},
 sandConditions:['Normal','Nemli','Islak','Sulu']
};
const DB_NAME='at_ai_tjk_track_maintenance_v1';
const DB_VERSION=1;
const STORE='reports';
const META='meta';
const API='/api/tjk-track-info-v1';
const PAGE_SIZE=50;
const DETAIL_CONCURRENCY=2;
const MAX_PAGES=80;
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reportKey=(date,city)=>`${clean(date)}|${fold(city)}`;
let dbPromise=null;
let busy=false;
let lastContext=null;

function isoDate(d){
  if(typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))return d;
  const x=d instanceof Date?d:new Date(d);
  if(Number.isNaN(x.getTime()))return'';
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}
function addDays(iso,n){const [y,m,d]=String(iso).split('-').map(Number),x=new Date(y,m-1,d);x.setDate(x.getDate()+n);return isoDate(x)}
function monthOf(iso){return Number(String(iso||'').slice(5,7))||0}
function median(values){const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function mode(values){const m=new Map();for(const v of values){const k=String(v);m.set(k,(m.get(k)||0)+1)}return [...m].sort((a,b)=>b[1]-a[1])[0]?.[0]??null}
function windParts(raw=''){
  const t=clean(raw),u=fold(t);const m=t.replace(',','.').match(/(\d+(?:\.\d+)?)\s*(?:KM\s*\/?\s*(?:SA|S)|KM\/H|KPH)?/i);const speed=m?Number(m[1]):null;
  const dirs=[['KUZEYDOGU','KD'],['KUZEYBATI','KB'],['GUNEYDOGU','GD'],['GUNEYBATI','GB'],['KUZEY','K'],['GUNEY','G'],['DOGU','D'],['BATI','B']];let direction='';
  for(const [word,code] of dirs){if(u.includes(word)||new RegExp(`(^|[^A-Z])${code}([^A-Z]|$)`).test(u)){direction=code;break}}
  return{speed:Number.isFinite(speed)?speed:null,direction};
}
function detailedSurface(city,track){const c=fold(city),t=fold(track),ref=TRACK_MASTER[c];if(t.includes('CIM'))return'Çim';if(t.includes('SENTETIK'))return'Sentetik';if(t.includes('KUM')&&ref?.race?.KUM)return ref.race.KUM;if(!t.includes('KUM'))return clean(track)||'Bilinmiyor';return'Kum'}
function masterContext(city,track){const surface=detailedSurface(city,track),rules=surface==='Çim'?TRACK_RULES.grass:surface==='Sentetik'?TRACK_RULES.synthetic:surface==='Yarı Sentetik'?TRACK_RULES.semiSynthetic:surface==='Doğal Dere Kumu'?TRACK_RULES.naturalSand:null;return{city:clean(city),surface,hippodrome:TRACK_MASTER[fold(city)]?.name||clean(city),rules,source:'AT_AI_PIST_ANA_REFERANSI'}}

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

async function apiJson(url){const r=await fetch(url,{cache:'no-store',headers:{accept:'application/json'}}),d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||`API ${r.status}`);return d}
async function mapLimit(list,limit,worker){const out=new Array(list.length);let cursor=0;async function run(){for(;;){const i=cursor++;if(i>=list.length)return;out[i]=await worker(list[i],i)}}await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length||1)},run));return out}
function setStatus(text,pct=null){const e=$('tmStatusF6089');if(e)e.textContent=text;const b=$('tmBarF6089');if(b&&pct!==null)b.style.width=`${Math.max(0,Math.min(100,pct))}%`}

async function fetchPage(start,end,page){const u=new URL(API,location.origin);u.searchParams.set('start',start);u.searchParams.set('end',end);u.searchParams.set('page',String(page));return apiJson(u.pathname+u.search)}
async function fetchDetail(reportUrl){if(!reportUrl)return null;const u=new URL(API,location.origin);u.searchParams.set('mode','report');u.searchParams.set('url',reportUrl);return apiJson(u.pathname+u.search)}
function normalizeRow(row){const wind=windParts(row?.wind);return{...row,key:reportKey(row?.date,row?.city),year:Number(String(row?.date||'').slice(0,4))||0,cityKey:fold(row?.city),month:monthOf(row?.date),windSpeedKmh:wind.speed,windDirection:wind.direction,updatedAt:new Date().toISOString()}}
async function saveRows(rows,{loadReports=true,onProgress=null}={}){
  const list=(Array.isArray(rows)?rows:[]).map(normalizeRow);let done=0;
  await mapLimit(list,DETAIL_CONCURRENCY,async row=>{
    const old=await dbGet(STORE,row.key);let merged={...old,...row};
    if(loadReports&&row.reportUrl&&(!old?.maintenance||old?.reportUrl!==row.reportUrl)){
      try{const detail=await fetchDetail(row.reportUrl);merged={...merged,maintenance:detail?.maintenance||null,reportPages:detail?.pages||0,reportParsedAt:new Date().toISOString()}}catch(e){merged.reportError=e?.message||String(e)}
    }
    await dbPut(STORE,merged);
    await dbPut(META,{key:`city:${merged.cityKey}`,city:merged.city,cityKey:merged.cityKey,lastDate:merged.date,updatedAt:new Date().toISOString()});
    done++;if(onProgress)onProgress(done,list.length,merged);
  });
  return list.length;
}
async function syncRange(start,end,{loadReports=true,label='Pist bilgileri'}={}){
  const first=await fetchPage(start,end,0),total=Number(first?.total||0),pages=Math.max(1,Math.min(MAX_PAGES,Math.ceil(Math.max(total,(first?.rows||[]).length)/PAGE_SIZE)));
  let rows=[...(first?.rows||[])];
  for(let p=1;p<pages;p++){setStatus(`${label}: ${p+1}/${pages} sayfa alınıyor…`,Math.round(p/pages*45));const d=await fetchPage(start,end,p);rows.push(...(d?.rows||[]));if(!(d?.rows||[]).length)break}
  const uniq=[...new Map(rows.map(r=>[reportKey(r.date,r.city),r])).values()].filter(r=>r.date>=start&&r.date<=end);
  await saveRows(uniq,{loadReports,onProgress:(done,n,row)=>setStatus(`${label}: ${done}/${n} rapor · ${row.city} ${row.date}`,45+Math.round(done/Math.max(1,n)*50))});
  await dbPut(META,{key:'sync:last',lastDate:end,startDate:start,rowCount:uniq.length,updatedAt:new Date().toISOString(),version:VERSION});
  setStatus(`${label} tamamlandı · ${uniq.length} gün/hipodrom`,100);
  return uniq;
}
async function syncYear(year){const y=Number(year),start=`${y}-01-01`,end=`${y}-12-31`;setStatus(`${y} pist/bakım/hava arşivi hazırlanıyor…`,0);const rows=await syncRange(start,end,{loadReports:true,label:String(y)});await dbPut(META,{key:`year:${y}`,year:y,rowCount:rows.length,status:'complete',updatedAt:new Date().toISOString(),version:VERSION});return rows}
async function backfillYears(from,to){if(busy)return;busy=true;try{const a=Math.min(Number(from),Number(to)),b=Math.max(Number(from),Number(to));for(let y=a;y<=b;y++)await syncYear(y);await refreshUi()}finally{busy=false}}
async function autoSync(targetDate){
  if(busy||!/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate||'')))return;
  busy=true;
  try{
    const meta=await dbGet(META,'sync:last');
    let start=meta?.lastDate&&meta.lastDate<targetDate?addDays(meta.lastDate,-7):addDays(targetDate,-7);
    if(start>targetDate)start=addDays(targetDate,-7);
    await syncRange(start,targetDate,{loadReports:true,label:'Otomatik pist güncellemesi'});
    const city=typeof getCityName==='function'?getCityName():'';
    if(city){lastContext=await infer(targetDate,city);window.__AT_TRACK_CONTEXT_F6089__=lastContext;}
    await refreshUi();
  }catch(e){console.warn('[AT AI]',VERSION,'otomatik güncelleme:',e)}finally{busy=false}
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
  const inferredMaintenance=exact?.maintenance?.signalCount?exact.maintenance:(p?{inferred:true,probabilities:p.probabilities,barrierMeters:Number.isFinite(Number(p.barrierMedian))?[Number(p.barrierMedian)]:[],penetrometer:Number.isFinite(Number(p.penetrometerMedian))?[Number(p.penetrometerMedian)]:[],signalCount:0}:null);
  const master=masterContext(city,env?.track||env?.surface||env?.pist||'');return{date,city,master,source:exact?'EXACT_TJK':(last?'LAST_KNOWN_PLUS_SEASONAL':'SEASONAL_ONLY'),confidence:exact?.maintenance?.signalCount?1:((last&&p?.sampleCount>=5)?.72:(p?.sampleCount>=5?.55:.25)),record:exact||null,lastKnown:last,maintenance:inferredMaintenance,weather:{temperature:env.temperature??null,humidity:env.humidity??null,pressure:env.pressure??null,sky:env.sky||'',wind:env.wind||'',windSpeedKmh:env.windSpeedKmh??null,windDirection:env.windDirection||'',temperatureAnomaly:z(env.temperature,p?.temperatureMedian,8),humidityAnomaly:z(env.humidity,p?.humidityMedian,20),pressureAnomaly:z(env.pressure,p?.pressureMedian,15),windAnomaly:z(env.windSpeedKmh,p?.windSpeedMedian,15)},profile:p};
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

try{
  if(typeof loadProgram==='function'){
    const before=loadProgram;
    loadProgram=async function(){const out=await before();const d=state?.date||$('raceDate')?.value;if(d)setTimeout(()=>autoSync(d),20);return out};
    if($('loadProgramBtn'))$('loadProgramBtn').onclick=loadProgram;
  }
}catch(e){console.warn('[AT AI]',VERSION,'program hook kurulamadı',e)}

window.ATTrackMaintenanceV1={version:VERSION,get:getReport,profile,infer,syncRange,backfillYears,autoSync,detailedSurface,masterContext,TRACK_MASTER,TRACK_RULES,windParts,getLastContext:()=>lastContext};
installWhenReady();
console.info('[AT AI]',VERSION,'aktif');
})();
