const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f745.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.26] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

// 1) Hızlı arşiv: her Koşu Sorgulama sayfasını anında ortak gün/şehir indeksine yaz.
const FAST_MARK='/* AT AI Mobil - F60.94.31.25 fast archive progress / IndexedDB stall hotfix */';
const fm=app.indexOf(FAST_MARK);
if(fm<0)throw new Error('[F60.94.31.26] fast hotfix marker missing');
const fsStart=app.indexOf('async function scanYear(year,selected){',fm);
const fsEnd=app.indexOf('async function completedKeys(db,days){',fsStart);
if(fsStart<0||fsEnd<0)throw new Error('[F60.94.31.26] fast scan target missing');
function saveIndexPageF746(rawRows){
  return (async()=>{
    const db=await dayDb();if(!db)return false;
    const m=new Map();ingestRows(m,rawRows||[]);if(!m.size)return true;
    return timeout(new Promise(resolve=>{try{const tx=db.transaction(DAY_STORE,'readwrite'),os=tx.objectStore(DAY_STORE);for(const v of m.values())os.put(v);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}}),6000,'Ara tarih indeksi yazımı').catch(()=>false);
  })();
}
async function scanYearF746(year,selected){
  const start=`${year}-01-01`,end=year===currentYear()?today():`${year}-12-31`,days=new Map();
  status(`${year}: İndeks 1/? · Koşu Sorgulama sunucusuna bağlanıyor…`,2);
  const first=await qpage(start,end,0),firstRows=Array.isArray(first?.rows)?first.rows:[];
  ingestRows(days,firstRows);await saveIndexPageF746(firstRows);
  const total=Number(first?.total||firstRows.length||0),pages=Math.max(1,Math.ceil(Math.max(total,firstRows.length)/PAGE_SIZE));
  let done=1;const selectedCount=()=>[...days.values()].filter(x=>selected.has(x.cityKey)).length;
  status(`${year}: İndeks ${done}/${pages} · ${selectedCount()} seçili gün/şehir · yerel indekse işlendi`,4+Math.round(done/pages*26));
  const nums=[];for(let p=1;p<pages;p++)nums.push(p);
  await mapLimit(nums,QUERY_WORKERS,async p=>{const d=await qpage(start,end,p),rows=Array.isArray(d?.rows)?d.rows:[];ingestRows(days,rows);await saveIndexPageF746(rows);done++;status(`${year}: İndeks ${done}/${pages} · ${selectedCount()} seçili gün/şehir · ${QUERY_WORKERS} paralel · kaydediliyor`,4+Math.round(done/pages*26))});
  if(stopRequested)throw new Error('Kullanıcı tarafından durduruldu');
  const all=[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.city.localeCompare(b.city,'tr'));
  status(`${year}: İndeks tamamlandı · ${all.length} toplam gün/şehir · tamamlandı işareti yazılıyor…`,31);
  const saved=await saveFullIndex(all,year,total,pages),picked=all.filter(x=>selected.has(x.cityKey));
  status(`${year}: İndeks ${pages}/${pages} tamam · ${picked.length} seçili gün/şehir${saved?'':' · tamamlandı işareti yazılamadı; ara kayıtlar korundu'}`,33);
  return picked;
}
const fastReplacement=saveIndexPageF746.toString()+'\n'+scanYearF746.toString().replace('scanYearF746','scanYear');
app=app.slice(0,fsStart)+fastReplacement+'\n'+app.slice(fsEnd);

// 2) FOGD: planlanan yıllık programı tarih kaynağı olarak kullanma.
// Yalnız Koşu Sorgulama gün/şehir indeksi + gerçek sonuç günleri kullanılır.
const HIST='/* AT AI Mobil - V16.9.1F60.94.31.11 FOGD historical calibration center */';
const hm=app.indexOf(HIST),hEnd=app.indexOf('window.ATFogdHistoryCalibrationF60943111=',hm);
const ds=app.indexOf('async function discoverDays(city,start,end){',hm),de=app.indexOf('function cityOptionList(){',ds);
if(hm<0||hEnd<0||ds<0||de<0||de>hEnd)throw new Error('[F60.94.31.26] FOGD discover target missing');
function fogdDayDbF746(){
  return new Promise(resolve=>{let q;try{q=indexedDB.open('at_ai_tjk_real_day_index_v2',1)}catch{return resolve(null)};q.onupgradeneeded=()=>{const db=q.result;let s=db.objectStoreNames.contains('days')?q.transaction.objectStore('days'):db.createObjectStore('days',{keyPath:'key'});if(!s.indexNames.contains('year'))s.createIndex('year','year',{unique:false});if(!s.indexNames.contains('date'))s.createIndex('date','date',{unique:false});if(!s.indexNames.contains('city'))s.createIndex('city','cityKey',{unique:false});if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'})};let settled=false;const done=v=>{if(settled)return;settled=true;clearTimeout(t);resolve(v)};const t=setTimeout(()=>done(null),5000);q.onsuccess=()=>done(q.result);q.onerror=q.onblocked=()=>done(null)});
}
async function fogdActualDatesF746(city,start,end){
  const year=Number(start.slice(0,4)),ck=fold(city),found=new Set();
  for(const [db,store] of [['at_ai_tjk_real_day_index_v2','days'],[RESULT_DB,RESULT_DAYS]]){
    try{const rows=await fogdLocalByIndexF738(db,store,'year',year);for(const r of rows){const date=clean(r?.date),c=clean(r?.city);if(fold(c)!==ck||date<start||date>end)continue;if(db===RESULT_DB&&(r?.status!=='complete'||Number(r?.raceCount)<=0))continue;found.add(date)}}catch(e){console.warn('[AT AI] F60.94.31.26 actual date read',db,e?.message||e)}
  }
  let meta=null;try{meta=await fogdLocalOneF738('at_ai_tjk_real_day_index_v2','meta',`year:${year}:scan`)}catch{}
  return{dates:[...found].sort(),complete:meta?.status==='complete',meta};
}
async function fogdSaveQueryRowsF746(rows){
  const db=await fogdDayDbF746();if(!db)return false;
  const m=new Map();for(const r of rows||[]){const date=clean(r?.date),city=clean(r?.city);if(!date||!city)continue;const ck=fold(city),id=fogdCityIdF738(city);m.set(`${date}|${ck}`,{key:`${date}|${ck}`,date,year:Number(date.slice(0,4)),city,cityKey:ck,cityId:id,source:'TJK_KOSU_SORGULAMA_FOGD_F60943126',updatedAt:new Date().toISOString()})}
  if(!m.size){try{db.close()}catch{}return true}
  return new Promise(resolve=>{let settled=false;const done=v=>{if(settled)return;settled=true;clearTimeout(t);try{db.close()}catch{}resolve(v)};const t=setTimeout(()=>done(false),6500);try{const tx=db.transaction('days','readwrite'),os=tx.objectStore('days');for(const v of m.values())os.put(v);tx.oncomplete=()=>done(true);tx.onerror=tx.onabort=()=>done(false)}catch{done(false)}});
}
async function fogdMarkYearCompleteF746(year,start,end,total,pages){
  const db=await fogdDayDbF746();if(!db)return false;
  return new Promise(resolve=>{let settled=false;const done=v=>{if(settled)return;settled=true;clearTimeout(t);try{db.close()}catch{}resolve(v)};const t=setTimeout(()=>done(false),4500);try{const tx=db.transaction('meta','readwrite');tx.objectStore('meta').put({key:`year:${year}:scan`,year:Number(year),status:'complete',start,end,total:Number(total)||0,pages:Number(pages)||0,nextPage:0,source:'FOGD_KOSU_SORGULAMA_F60943126',version:'F60.94.31.26',updatedAt:new Date().toISOString()});tx.oncomplete=()=>done(true);tx.onerror=tx.onabort=()=>done(false)}catch{done(false)}});
}
async function fogdMapLimitF746(items,limit,fn){let cursor=0;async function worker(){for(;;){if(stopRequested)return;const i=cursor++;if(i>=items.length)return;await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(limit,Math.max(1,items.length))},worker))}
async function discoverDaysF746(city,start,end){
  const year=Number(start.slice(0,4)),ck=fold(city),fullStart=`${year}-01-01`,fullEnd=year===new Date().getFullYear()?todayIso():`${year}-12-31`;
  setStatus(`Gerçek tarih indeksi kontrol ediliyor · ${city} · ${start} → ${end}`,2);
  const local=await fogdActualDatesF746(city,start,end);
  if(local.complete){setStatus(`Koşu Sorgulama tarih indeksi hazır · ${local.dates.length} ${city} yarış günü · internet taraması yok`,10);return local.dates}
  const found=new Set(local.dates);
  setStatus(`Tarih indeksi eksik · Koşu Sorgulama 1/? · ${city}`,2);
  const u0=new URL(QUERY_API,location.origin);u0.searchParams.set('start',start);u0.searchParams.set('end',end);u0.searchParams.set('page','0');
  const first=await fetchJson(u0.pathname+u0.search,35000,1),firstRows=Array.isArray(first?.rows)?first.rows:[];
  for(const r of firstRows){const date=clean(r?.date);if(date>=start&&date<=end&&fold(r?.city)===ck)found.add(date)}
  await fogdSaveQueryRowsF746(firstRows);
  const total=Number(first?.total||firstRows.length||0),pages=Math.max(1,Math.ceil(Math.max(total,firstRows.length)/50));let done=1;
  setStatus(`Koşu Sorgulama ${done}/${pages} · ${city}: ${found.size} yarış günü · tarih indeksi kaydediliyor`,Math.min(10,2+Math.round(done/pages*8)));
  const nums=[];for(let p=1;p<pages;p++)nums.push(p);
  await fogdMapLimitF746(nums,6,async p=>{const u=new URL(QUERY_API,location.origin);u.searchParams.set('start',start);u.searchParams.set('end',end);u.searchParams.set('page',String(p));const d=await fetchJson(u.pathname+u.search,35000,1),rows=Array.isArray(d?.rows)?d.rows:[];for(const r of rows){const date=clean(r?.date);if(date>=start&&date<=end&&fold(r?.city)===ck)found.add(date)}await fogdSaveQueryRowsF746(rows);done++;setStatus(`Koşu Sorgulama ${done}/${pages} · ${city}: ${found.size} yarış günü · 6 paralel`,Math.min(10,2+Math.round(done/pages*8)))});
  if(stopRequested)throw new Error('Kullanıcı tarafından durduruldu.');
  if(start===fullStart&&end===fullEnd)await fogdMarkYearCompleteF746(year,start,end,total,pages);
  const dates=[...found].sort();setStatus(`Gerçek tarih indeksi hazır · ${city}: ${dates.length} yarış günü`,10);return dates;
}
const fogdReplacement=[fogdDayDbF746,fogdActualDatesF746,fogdSaveQueryRowsF746,fogdMarkYearCompleteF746,fogdMapLimitF746].map(f=>f.toString()).join('\n')+'\n'+discoverDaysF746.toString().replace('discoverDaysF746','discoverDays');
app=app.slice(0,ds)+fogdReplacement+'\n'+app.slice(de);

app=app.replace('F60.94.31.25 · FAST-PROGRESS-FIX','F60.94.31.26 · FOGD-INDEX-BRIDGE');
for(const token of['TJK_KOSU_SORGULAMA_FOGD_F60943126','Koşu Sorgulama ${done}/${pages}','actual date read','ara kayıtlar korundu','F60.94.31.26 · FOGD-INDEX-BRIDGE'])if(!app.includes(token))throw new Error('[F60.94.31.26] invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692996').replaceAll('F60.94.31.25','F60.94.31.26');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692996'))throw new Error('[F60.94.31.26] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.26 build complete: FOGD reads only actual Koşu Sorgulama/result dates; fast scan persists each page immediately.');
