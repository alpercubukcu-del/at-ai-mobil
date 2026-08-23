/* AT AI Mobil — V16.6.6 Compact Winner Path Cache
   Amaç: Kör testte telefonu doldurmadan yalnız geçmiş 1. olanların gerekli yol özetini saklamak.
   - Yıllık arşivi kopyalamaz.
   - Ham HTML/JSON saklamaz.
   - Güncel koşacak at kariyerleri kalıcı saklanmaz; analiz sırasında bellekte tutulur.
   - Kalıcı kazanan-yolu cache bütçesi: 8 MB, LRU budama.
*/
(() => {
'use strict';
if (window.ATWinnerPathCompactCacheV1666) return;

const VERSION='WINNER-PATH-COMPACT-CACHE-V16.6.6';
const DB_NAME='at_ai_winner_path_compact_v1';
const DB_VERSION=1;
const STORE='winnerPaths';
const MAX_BYTES=8*1024*1024;
const TARGET_BYTES=Math.floor(MAX_BYTES*0.88);
let dbPromise=null;

const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const dateOf=r=>clean(r?.isoDate??r?.date??r?.Tarih_ISO??r?.Tarih);

function compactRow(r={}){
  return {
    d:dateOf(r),
    c:clean(r?.city??r?.sehir??r?.Şehir),
    s:clean(r?.class??r?.raceClass??r?.classRaw??r?.Koşu_Sınıfı??r?.yaradi1),
    a:clean(r?.ageGroup??r?.yasGrubu??r?.yaradi2),
    m:num(r?.distance??r?.mesafe??r?.Mesafe),
    p:clean(r?.track??r?.pist??r?.Pist),
    h:num(r?.hp??r?.hpu??r?.HP),
    k:num(r?.weight??r?.kilo??r?.siklet??r?.Sıklet),
    f:num(r?.finish??r?.rank??r?.sira??r?.Bitiriş??r?.bitiris)
  };
}
function compactPath(rows=[]){
  const seen=new Set(),out=[];
  for(const r of Array.isArray(rows)?rows:[]){
    const x=compactRow(r); if(!x.d) continue;
    const key=[x.d,x.c,x.s,x.m,x.p,x.f].join('|');
    if(seen.has(key)) continue; seen.add(key); out.push(x);
  }
  out.sort((a,b)=>a.d.localeCompare(b.d));
  return out;
}
function bytesOf(v){
  try{return new Blob([JSON.stringify(v)]).size;}catch{return JSON.stringify(v).length*2;}
}
function openDb(){
  if(dbPromise) return dbPromise;
  dbPromise=new Promise(resolve=>{
    if(!('indexedDB' in window)) return resolve(null);
    let req; try{req=indexedDB.open(DB_NAME,DB_VERSION);}catch{return resolve(null);}
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)){
        const s=db.createObjectStore(STORE,{keyPath:'key'});
        s.createIndex('lastUsed','lastUsed',{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>{dbPromise=null;resolve(null);};
  });
  return dbPromise;
}
async function allRecords(){
  const db=await openDb(); if(!db) return [];
  return new Promise(resolve=>{try{const q=db.transaction(STORE,'readonly').objectStore(STORE).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([]);}catch{resolve([]);}});
}
async function totalBytes(){return (await allRecords()).reduce((s,r)=>s+(Number(r?.bytes)||0),0);}
async function prune(){
  const db=await openDb(); if(!db) return {removed:0,bytes:0};
  const rows=await allRecords(); let total=rows.reduce((s,r)=>s+(Number(r?.bytes)||0),0);
  if(total<=MAX_BYTES) return {removed:0,bytes:total};
  rows.sort((a,b)=>(Number(a?.lastUsed)||0)-(Number(b?.lastUsed)||0));
  let removed=0;
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  for(const r of rows){if(total<=TARGET_BYTES) break;store.delete(r.key);total-=Number(r?.bytes)||0;removed++;}
  await new Promise(resolve=>{tx.oncomplete=tx.onerror=tx.onabort=()=>resolve();});
  return {removed,bytes:Math.max(0,total)};
}
async function putWinner(input={}){
  const referenceDate=clean(input.referenceDate??input.date);
  const horseId=clean(input.horseId??input.id);
  const horseName=clean(input.horseName??input.name);
  const raceKey=clean(input.raceKey??[referenceDate,input.city,input.raceNo,input.raceClass,input.distance,input.track].join('|'));
  const key=clean(input.key??`${raceKey}|${horseId||horseName}`);
  if(!key||!referenceDate) return false;
  const path=compactPath(input.path??input.career??input.rows??[]).filter(r=>r.d<referenceDate);
  const value={
    key,
    rd:referenceDate,
    hid:horseId,
    hn:horseName,
    rk:raceKey,
    city:clean(input.city),
    rn:num(input.raceNo),
    cls:clean(input.raceClass??input.class),
    ag:clean(input.ageGroup),
    dist:num(input.distance),
    tr:clean(input.track),
    path
  };
  const record={...value,bytes:bytesOf(value),lastUsed:Date.now()};
  if(record.bytes>MAX_BYTES/4) return false;
  const db=await openDb(); if(!db) return false;
  await new Promise(resolve=>{try{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);}catch{resolve(false);}});
  await prune();
  return true;
}
async function getWinner(key){
  const db=await openDb(); if(!db) return null;
  const row=await new Promise(resolve=>{try{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null);}catch{resolve(null);}});
  if(!row) return null;
  try{const tx=db.transaction(STORE,'readwrite');row.lastUsed=Date.now();tx.objectStore(STORE).put(row);}catch{}
  return row;
}
async function stats(){
  const rows=await allRecords();
  let browser=null;
  try{browser=await navigator.storage?.estimate?.();}catch{}
  return {
    version:VERSION,
    records:rows.length,
    bytes:rows.reduce((s,r)=>s+(Number(r?.bytes)||0),0),
    maxBytes:MAX_BYTES,
    browserUsage:Number(browser?.usage)||null,
    browserQuota:Number(browser?.quota)||null,
    policy:'winner-only compact; raw HTML yok; güncel at kariyeri kalıcı değil; 8 MB LRU sınırı'
  };
}
async function clear(){
  const db=await openDb(); if(!db) return false;
  return new Promise(resolve=>{try{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);}catch{resolve(false);}});
}

window.ATWinnerPathCompactCacheV1666={VERSION,MAX_BYTES,putWinner,getWinner,compactPath,stats,prune,clear};
window.__AT_WINNER_PATH_STORAGE_POLICY_V1666__={version:'V16.6.6',persistent:'winner-only',currentHorse:'memory-only',raw:false,maxMB:8,lru:true,reuseAnnualArchive:true};
console.info('[AT AI]',VERSION,'aktif — kazanan yolu cache en fazla 8 MB.');
})();
