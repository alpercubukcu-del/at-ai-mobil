/* AT AI Mobil - V16.9.1F60.94.29 real-race index/result matcher */
(()=>{
'use strict';
if(window.__AT_REAL_RACE_INDEX_MATCH_F609429__)return;
window.__AT_REAL_RACE_INDEX_MATCH_F609429__=true;
const VERSION='REAL-RACE-INDEX-MATCH-V16.9.1F60.94.29';
const QUERY_SCHEMA='F60.94.29';
const INDEX_DB='at_ai_tjk_real_race_index_v1',INDEX_STORE='races',INDEX_META='meta';
const RESULT_DB='at_ai_tjk_annual_results_v1',RESULT_RACES='races',RESULT_DAYS='days',RESULT_META='meta';
const QUERY_API='/api/tjk-race-query-v1',RESULT_API='/api/tjk-day-results-v1';
const PAGE_SIZE=50,MAX_PAGES=500;
const CITY_IDS={ADANA:1,IZMIR:2,ISTANBUL:3,BURSA:4,ANKARA:5,SANLIURFA:6,ELAZIG:7,DIYARBAKIR:8,KOCAELI:9,ANTALYA:10};
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const clone=v=>{try{return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v))}catch{return v}};
let busy=false;
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function validYear(v){const n=Number(v);return Number.isInteger(n)&&n>=1800&&n<=9999?n:null}
function cityId(city){return CITY_IDS[fold(city)]||null}
function raceKey(date,city,no){return`result|${clean(date)}|${fold(city)}|${Number(no)||0}`}
function dayKey(date,city){return`day|${clean(date)}|${fold(city)}`}
function groupKey(date,city){return`${clean(date)}|${fold(city)}`}
function degreeNorm(v){return clean(v).replace(/,/g,'.').replace(/[^0-9.]/g,'')}
function setStatus(text,pct=null){const s=$('rrStatusF6093');if(s)s.textContent=String(text||'');const b=$('rrBarF6093');if(b&&pct!==null){const n=Math.max(0,Math.min(100,Number(pct)||0));b.style.width=n+'%';b.setAttribute('aria-valuenow',String(n))}}
function openDb(name){return new Promise(resolve=>{let q;try{q=indexedDB.open(name)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null)})}
async function dbGet(name,store,key){const db=await openDb(name);if(!db||!db.objectStoreNames.contains(store)){try{db?.close?.()}catch{}return null}return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).get(key);q.onsuccess=()=>{const v=q.result||null;try{db.close()}catch{}resolve(v)};q.onerror=()=>{try{db.close()}catch{}resolve(null)}}catch{try{db.close()}catch{}resolve(null)}})}
async function dbPut(name,store,value){const db=await openDb(name);if(!db||!db.objectStoreNames.contains(store)){try{db?.close?.()}catch{}return false}return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>{try{db.close()}catch{}resolve(true)};tx.onerror=tx.onabort=()=>{try{db.close()}catch{}resolve(false)}}catch{try{db.close()}catch{}resolve(false)}})}
async function dbDelete(name,store,key){const db=await openDb(name);if(!db||!db.objectStoreNames.contains(store)){try{db?.close?.()}catch{}return false}return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=()=>{try{db.close()}catch{}resolve(true)};tx.onerror=tx.onabort=()=>{try{db.close()}catch{}resolve(false)}}catch{try{db.close()}catch{}resolve(false)}})}
async function apiJson(url){const r=await fetch(url,{cache:'no-store',headers:{accept:'application/json'}});let d=null;try{d=await r.json()}catch{}if(!r.ok||d?.ok===false)throw new Error(d?.error||`API ${r.status}`);return d}
async function byYear(year){const db=await openDb(INDEX_DB);if(!db||!db.objectStoreNames.contains(INDEX_STORE)){try{db?.close?.()}catch{}return[]}return new Promise(resolve=>{const out=[];try{const os=db.transaction(INDEX_STORE,'readonly').objectStore(INDEX_STORE),idx=os.indexNames.contains('year')?os.index('year'):null;if(!idx){try{db.close()}catch{}return resolve(out)}const q=idx.openCursor(IDBKeyRange.only(Number(year)));q.onsuccess=()=>{const c=q.result;if(!c)return;out.push(c.value);c.continue()};q.transaction.oncomplete=()=>{try{db.close()}catch{}resolve(out)};q.transaction.onerror=q.transaction.onabort=()=>{try{db.close()}catch{}resolve(out)}}catch{try{db.close()}catch{}resolve(out)}})}
async function migrateYearIndex(year){
 const y=Number(year),db=await openDb(INDEX_DB);if(!db||!db.objectStoreNames.contains(INDEX_STORE)){try{db?.close?.()}catch{}return{removed:0,reset:false}}
 return new Promise(resolve=>{let removed=0,staleMeta=false;try{const stores=[INDEX_STORE,...(db.objectStoreNames.contains(INDEX_META)?[INDEX_META]:[])],tx=db.transaction(stores,'readwrite'),os=tx.objectStore(INDEX_STORE),idx=os.indexNames.contains('year')?os.index('year'):null;if(!idx){try{db.close()}catch{}return resolve({removed:0,reset:false})}const q=idx.openCursor(IDBKeyRange.only(y));q.onsuccess=()=>{const c=q.result;if(!c)return;const r=c.value;if(r?.queryKeyVersion!==QUERY_SCHEMA||!String(r?.key||'').startsWith('query|')){c.delete();removed++}c.continue()};if(db.objectStoreNames.contains(INDEX_META)){const meta=tx.objectStore(INDEX_META),mq=meta.get(`year:${y}:index`);mq.onsuccess=()=>{const m=mq.result;if(m&&(m.queryKeyVersion!==QUERY_SCHEMA&&m.version!==VERSION)){meta.delete(`year:${y}:index`);meta.delete(`year:${y}`);staleMeta=true}}}tx.oncomplete=()=>{try{db.close()}catch{}resolve({removed,reset:staleMeta||removed>0})};tx.onerror=tx.onabort=()=>{try{db.close()}catch{}resolve({removed,reset:staleMeta||removed>0})}}catch{try{db.close()}catch{}resolve({removed,reset:false})}})
}
async function fetchQueryPage(start,end,page){const u=new URL(QUERY_API,location.origin);u.searchParams.set('start',start);u.searchParams.set('end',end);u.searchParams.set('page',String(page));return apiJson(u.pathname+u.search)}
async function saveIndexRows(rows){for(const r0 of Array.isArray(rows)?rows:[]){const r={...r0,cityKey:fold(r0?.city),cityId:cityId(r0?.city),year:Number(r0?.year||String(r0?.date||'').slice(0,4))||0,queryKeyVersion:QUERY_SCHEMA,source:'TJK_KOSU_SORGULAMA',updatedAt:new Date().toISOString()};if(r.date&&r.city&&r.key)await dbPut(INDEX_DB,INDEX_STORE,r)}}
async function indexYear(year){
 const y=Number(year),start=`${y}-01-01`,end=y===new Date().getFullYear()?todayIso():`${y}-12-31`,metaKey=`year:${y}:index`;
 await migrateYearIndex(y);
 const old=await dbGet(INDEX_DB,INDEX_META,metaKey);let fromPage=old?.queryKeyVersion===QUERY_SCHEMA&&old?.status==='partial'?Math.max(0,Number(old.nextPage)||0):0;
 let total=old?.queryKeyVersion===QUERY_SCHEMA?Number(old.total||0):0,pages=total?Math.max(1,Math.min(MAX_PAGES,Math.ceil(total/PAGE_SIZE))):1,lastPage=fromPage-1,seen=0;
 if(old?.queryKeyVersion===QUERY_SCHEMA&&old?.status==='complete'){const rows=await byYear(y);if(rows.length>=Math.max(1,Math.floor(total*.85)))return{start,end,total,seen:0,reused:true}}
 for(let p=fromPage;p<pages||p===0;p++){
  setStatus(`${y}: Koşu Sorgulama ${p+1}/${pages||'?'} · doğru indeks hazırlanıyor…`,Math.min(38,Math.round((p+1)/Math.max(1,pages)*38)));
  const d=await fetchQueryPage(start,end,p),rows=Array.isArray(d?.rows)?d.rows:[];if(d?.queryKeyVersion&&d.queryKeyVersion!==QUERY_SCHEMA)throw new Error(`Koşu Sorgulama şeması uyumsuz: ${d.queryKeyVersion}`);
  total=Math.max(total,Number(d?.total||0));pages=Math.max(1,Math.min(MAX_PAGES,Math.ceil(Math.max(total,rows.length)/PAGE_SIZE)));
  if(!rows.length){if(p===0&&total>0)throw new Error(`Koşu Sorgulama ${total} kayıt bildiriyor fakat satırlar okunamadı.`);break}
  await saveIndexRows(rows);seen+=rows.length;lastPage=p;
  await dbPut(INDEX_DB,INDEX_META,{key:metaKey,status:'partial',start,end,total,nextPage:p+1,lastPage:p,queryKeyVersion:QUERY_SCHEMA,updatedAt:new Date().toISOString(),version:VERSION});
  if(rows.length<PAGE_SIZE&&p+1>=pages)break;
 }
 await dbPut(INDEX_DB,INDEX_META,{key:metaKey,status:'complete',start,end,total,nextPage:0,lastPage,queryKeyVersion:QUERY_SCHEMA,updatedAt:new Date().toISOString(),version:VERSION});
 return{start,end,total,seen,reused:false}
}
function groupsFromRows(rows){const m=new Map();for(const r of rows){if(!r?.date||!r?.city)continue;const k=groupKey(r.date,r.city);if(!m.has(k))m.set(k,{key:k,date:r.date,year:Number(r.year||String(r.date).slice(0,4)),city:r.city,cityId:r.cityId||cityId(r.city),rows:[]});m.get(k).rows.push(r)}return[...m.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.city.localeCompare(b.city,'tr'))}
async function fetchDay(g){const u=new URL(RESULT_API,location.origin);u.searchParams.set('date',g.date);u.searchParams.set('city',g.city);if(g.cityId)u.searchParams.set('cityId',String(g.cityId));return apiJson(u.pathname+u.search)}
function winnerOf(race){return race?.winner||race?.rows?.find?.(x=>Number(x?.finish)===1)||null}
function matchIndex(rows,race,used){
 const w=winnerOf(race),wn=fold(w?.horseName||w?.name),dg=degreeNorm(w?.degree),dist=Number(race?.distance||race?.mesafe||0),cls=fold(race?.class||race?.yaradi1),track=fold(race?.track||race?.pist);
 const candidates=rows.map((r,i)=>({r,i})).filter(x=>!used.has(x.i));
 const exact=candidates.find(x=>fold(x.r?.winner)===wn&&degreeNorm(x.r?.winnerDegree)===dg);if(exact)return exact;
 const winnerStrong=candidates.find(x=>fold(x.r?.winner)===wn&&(!dist||!Number(x.r?.distance)||Number(x.r.distance)===dist)&&(!track||!fold(x.r?.track)||fold(x.r.track)===track));if(winnerStrong)return winnerStrong;
 const winnerOnly=candidates.filter(x=>fold(x.r?.winner)===wn);if(winnerOnly.length===1)return winnerOnly[0];
 const degreeStrong=candidates.filter(x=>degreeNorm(x.r?.winnerDegree)===dg&&(!dist||!Number(x.r?.distance)||Number(x.r.distance)===dist)&&(!cls||!fold(x.r?.raceType)||cls.includes(fold(x.r.raceType))||fold(x.r.raceType).includes(cls)));if(degreeStrong.length===1)return degreeStrong[0];
 return null
}
function verification(idx,race){const w=winnerOf(race),winnerActual=clean(w?.horseName||w?.name),degreeActual=clean(w?.degree);return{winnerExpected:idx?.winner||'',winnerActual,winnerMatch:idx?.winner&&winnerActual?fold(idx.winner)===fold(winnerActual):null,degreeExpected:idx?.winnerDegree||'',degreeActual,degreeMatch:idx?.winnerDegree&&degreeActual?degreeNorm(idx.winnerDegree)===degreeNorm(degreeActual):null,matchSource:'WINNER_DEGREE_F60.94.29'}}
async function saveDay(g,data){
 const races=Array.isArray(data?.races)?data.races:[],used=new Set();let matched=0;
 for(const race of races){const no=Number(race?.no||race?.raceNo||0);if(!Number.isInteger(no)||no<1)continue;const hit=matchIndex(g.rows,race,used),idx=hit?.r||null;if(hit){used.add(hit.i);matched++}await dbPut(RESULT_DB,RESULT_RACES,{key:raceKey(g.date,g.city,no),year:g.year,date:g.date,city:g.city,cityId:g.cityId,raceNo:no,source:'KOSU_SORGULAMA_REAL_ARCHIVE',version:VERSION,updatedAt:new Date().toISOString(),index:idx?clone(idx):null,verification:idx?verification(idx,race):null,race:clone(race)})}
 const expected=g.rows.length,got=races.length,status=expected>0&&got>=expected&&matched>=expected?'complete':(got>0?'partial':'error');
 await dbPut(RESULT_DB,RESULT_DAYS,{key:dayKey(g.date,g.city),year:g.year,date:g.date,city:g.city,cityId:g.cityId,expectedRaceCount:expected,raceCount:got,matchedRaceCount:matched,status,source:'KOSU_SORGULAMA_REAL_ARCHIVE',sourceVersion:data?.version||'',matchVersion:VERSION,updatedAt:new Date().toISOString(),error:got?null:'Sonuç yarışı bulunamadı'});
 return{expected,got,matched,status}
}
async function downloadGroups(groups,year){let done=0,errors=0,skipped=0,matched=0;for(const g of groups){const old=await dbGet(RESULT_DB,RESULT_DAYS,dayKey(g.date,g.city));if(old?.status==='complete'&&Number(old.expectedRaceCount||0)===g.rows.length&&Number(old.raceCount||0)>=g.rows.length&&Number(old.matchedRaceCount||0)>=g.rows.length){done++;skipped++;matched+=Number(old.matchedRaceCount||0);continue}setStatus(`${year} tam sonuç: ${done+1}/${groups.length} · ${g.date} ${g.city}`,40+Math.round(done/Math.max(1,groups.length)*55));try{const d=await fetchDay(g),s=await saveDay(g,d);matched+=s.matched;if(s.status!=='complete')errors++}catch(e){errors++;await dbPut(RESULT_DB,RESULT_DAYS,{key:dayKey(g.date,g.city),year:g.year,date:g.date,city:g.city,cityId:g.cityId,expectedRaceCount:g.rows.length,raceCount:0,matchedRaceCount:0,status:'error',source:'KOSU_SORGULAMA_REAL_ARCHIVE',matchVersion:VERSION,updatedAt:new Date().toISOString(),error:e?.message||String(e)})}done++;await new Promise(r=>setTimeout(r,25))}return{done,errors,skipped,matched}}
async function syncYear(year){
 const y=validYear(year);if(!y)throw new Error('Geçerli yıl gerekli.');const ix=await indexYear(y),rows=(await byYear(y)).filter(r=>r?.queryKeyVersion===QUERY_SCHEMA&&String(r?.key||'').startsWith('query|')&&r.date>=ix.start&&r.date<=ix.end),groups=groupsFromRows(rows);
 if(!groups.length){setStatus(`${y}: doğru Koşu Sorgulama indeksi oluşmadı.`,100);return{year:y,races:0,groups:0,errors:1}}
 const r=await downloadGroups(groups,y),state=r.errors?'Kısmi arşiv':'Arşiv hazır';
 await dbPut(INDEX_DB,INDEX_META,{key:`year:${y}`,year:y,status:r.errors?'partial':'complete',raceCount:rows.length,dayCityCount:groups.length,errorCount:r.errors,queryKeyVersion:QUERY_SCHEMA,updatedAt:new Date().toISOString(),version:VERSION});
 await dbPut(RESULT_DB,RESULT_META,{key:`year:${y}`,year:y,status:r.errors?'partial':'complete',raceCount:rows.length,dayCount:groups.length,errorCount:r.errors,source:'KOSU_SORGULAMA_REAL_ARCHIVE',matchVersion:VERSION,updatedAt:new Date().toISOString(),version:VERSION});
 setStatus(`${state} · ${y}: ${rows.length} indeks · ${groups.length} gün/şehir · ${r.matched} eşleşmiş yarış${r.skipped?` · ${r.skipped} mevcut gün atlandı`:''}${r.errors?` · ${r.errors} eksik gün`:''}`,100);
 try{await window.ATArchiveYearInventoryF609425?.refresh?.()}catch{}try{await window.ATAnnualResultsArchiveV661?.refresh?.()}catch{}return{year:y,races:rows.length,groups:groups.length,errors:r.errors,matched:r.matched,skipped:r.skipped}
}
async function syncYears(from,to){if(busy)return;const a=validYear(from),b=validYear(to);if(!a||!b)throw new Error('Geçerli başlangıç/bitiş yılı gerekli.');busy=true;const out=[];try{for(let y=Math.min(a,b);y<=Math.max(a,b);y++)out.push(await syncYear(y));return out}finally{busy=false}}
function install(){const old=window.ATRealRaceArchiveF6093;if(!old?.syncYears)return false;if(old.__f609429)return true;const oldRefresh=typeof old.refresh==='function'?old.refresh:null;const refresh=async function(...args){const s=$('rrStatusF6093'),before=s?.textContent||'';let out;try{out=oldRefresh?await oldRefresh.apply(old,args):undefined}finally{if(s&&before)s.textContent=before}return out};window.ATRealRaceArchiveF6093={...old,version:VERSION,syncYear,syncYears,refresh,__f609429:true};console.info('[AT AI]',VERSION,'active - Koşu Sorgulama rows are keyed independently of race number and matched to actual day-result race numbers by winner+degree.');return true}
function boot(){if(install())return;let n=0;const tick=()=>{if(install()||++n>=80)return;setTimeout(tick,100)};tick()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ATRealRaceIndexMatchF609429={version:VERSION,install,syncYear,syncYears,migrateYearIndex};
})();
