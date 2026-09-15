/* AT AI Mobil — F60.81 Y.G. sonuç arşivi kalıcı koşu checkpoint + yeniden açılışta geri yükleme */
(() => {
'use strict';
if (window.__AT_RESULTS_YG_CONTINUATION_F6081__) return;
window.__AT_RESULTS_YG_CONTINUATION_F6081__ = true;

const VERSION = 'ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.81';
const DB_NAME = 'at_ai_tjk_annual_results_v1';
const STORE_RACES = 'races', STORE_DAYS = 'days', STORE_META = 'meta';
const JOB_KEY = 'f6079:yg-results-job';
const DOMESTIC = new Set(['ADANA','ANKARA','ANTALYA','BURSA','DIYARBAKIR','ELAZIG','ISTANBUL','IZMIR','KOCAELI','SANLIURFA']);
const $ = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I').replace(/[^A-Z0-9]+/g, '');
const isDomestic = city => DOMESTIC.has(fold(city));
let dbPromise = null;
let running = false;

function isoDate(v) {
  const s = clean(v);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : '';
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dayKey(date, city) { return `day|${isoDate(date)}|${fold(city)}`; }
function raceKey(date, city, no) { return `result|${isoDate(date)}|${fold(city)}|${Number(no)||0}`; }

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    let q; try { q = indexedDB.open(DB_NAME); } catch { return resolve(null); }
    q.onupgradeneeded = () => {
      const d = q.result;
      if (!d.objectStoreNames.contains(STORE_RACES)) {
        const s = d.createObjectStore(STORE_RACES, {keyPath:'key'});
        s.createIndex('year','year',{unique:false}); s.createIndex('date','date',{unique:false});
      }
      if (!d.objectStoreNames.contains(STORE_DAYS)) {
        const s = d.createObjectStore(STORE_DAYS, {keyPath:'key'});
        s.createIndex('year','year',{unique:false}); s.createIndex('date','date',{unique:false});
      }
      if (!d.objectStoreNames.contains(STORE_META)) d.createObjectStore(STORE_META, {keyPath:'key'});
    };
    q.onsuccess = () => {
      const db = q.result;
      db.onversionchange = () => { try { db.close(); } catch {} dbPromise = null; };
      resolve(db);
    };
    q.onerror = q.onblocked = () => { dbPromise = null; resolve(null); };
  });
  return dbPromise;
}
async function put(store, value) {
  const db = await openDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(store,'readwrite'); tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve(true); tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function get(store, key) {
  const db = await openDb(); if (!db) return null;
  return new Promise(resolve => {
    try {
      const q = db.transaction(store,'readonly').objectStore(store).get(key);
      q.onsuccess = () => resolve(q.result || null); q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function readDaysRange(start,end) {
  const db=await openDb(); if(!db||!db.objectStoreNames.contains(STORE_DAYS)) return [];
  return new Promise(resolve=>{
    const out=[];
    try {
      const os=db.transaction(STORE_DAYS,'readonly').objectStore(STORE_DAYS),idx=os.indexNames.contains('date')?os.index('date'):null;
      const req=idx?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();
      req.onsuccess=e=>{const c=e.target.result;if(!c)return;const row=c.value,d=isoDate(row?.date);if(d&&d>=start&&d<=end)out.push(row);c.continue();};
      req.transaction.oncomplete=()=>resolve(out); req.transaction.onerror=req.transaction.onabort=()=>resolve(out);
    } catch { resolve(out); }
  });
}

function resolveRaceNo(row, rows) {
  const n = Number(row?.raceNo || 0); if (n) return n;
  const sorted = [...rows].sort((a,b) => Number(a?.page||0)-Number(b?.page||0) || Number(a?.rowIndex||0)-Number(b?.rowIndex||0));
  const i = sorted.findIndex(x => x === row || x?.id === row?.id);
  return i >= 0 ? i + 1 : 0;
}
function makeGroups(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!isDomestic(r?.city)) continue;
    const date = isoDate(r?.date), city = clean(r?.city); if (!date || !city) continue;
    const key = dayKey(date,city);
    if (!map.has(key)) map.set(key,{key,date,city,cityId:clean(r?.cityId),rows:[]});
    map.get(key).rows.push(r);
  }
  return [...map.values()].sort((a,b) => a.date.localeCompare(b.date) || a.city.localeCompare(b.city,'tr'));
}
function expectedNos(group) {
  const rows = [...group.rows].sort((a,b) => Number(a?.page||0)-Number(b?.page||0) || Number(a?.rowIndex||0)-Number(b?.rowIndex||0));
  return [...new Set(rows.map((r,i) => resolveRaceNo(r,rows) || i+1).filter(Boolean))].sort((a,b)=>a-b);
}
function raceNo(r) { return Number(r?.no ?? r?.raceNo ?? r?.race?.no ?? r?.race?.raceNo ?? 0) || 0; }
function setStatus(text) { const el=$('f62rStatus'); if(el) el.textContent=text; }
function setButton(text,disabled=false) { const b=$('f62rUpdate'); if(b){ b.textContent=text; b.disabled=!!disabled; } }
async function persistJob(x) { return put(STORE_META,{key:JOB_KEY,version:VERSION,updatedAt:new Date().toISOString(),...x}); }
async function currentJob(){ return get(STORE_META,JOB_KEY); }
function normalizeRange() {
  const core=window.ATF6062?.core; let start=$('f62rStart')?.value, end=$('f62rEnd')?.value;
  if(core?.normalizeRange){ const n=core.normalizeRange(start,end,todayIso()); start=n.start; end=n.end; }
  return {start:isoDate(start),end:isoDate(end)};
}

async function fetchJson(url,{allow404=false}={}) {
  const res=await fetch(url,{cache:'no-store',headers:{accept:'application/json'}}); let data=null;
  try { data=await res.json(); } catch {}
  if(res.ok && data?.ok!==false) return data || {};
  if(allow404 && res.status===404) return null;
  throw new Error(clean(data?.error) || `API ${res.status}`);
}
async function fetchDay(date,city) {
  const u=new URL('/api/tjk-day-results-v1',location.origin); u.searchParams.set('date',date); u.searchParams.set('city',city);
  return fetchJson(u.pathname+u.search,{allow404:true});
}
async function resolveMeeting(group) {
  const u=new URL('/api/tjk-meeting-resolve-v1',location.origin);
  u.searchParams.set('date',group.date); u.searchParams.set('city',group.city); u.searchParams.set('forwardDays','30');
  return fetchJson(u.pathname+u.search);
}

async function saveRace(group,race,runDate,meeting=null) {
  const no=raceNo(race); if(!no) return false;
  const scheduledDate=group.date, actualDate=isoDate(runDate)||scheduledDate;
  return put(STORE_RACES,{
    key:raceKey(scheduledDate,group.city,no),year:Number(scheduledDate.slice(0,4)),date:scheduledDate,scheduledDate,runDate:actualDate,
    city:group.city,cityId:group.cityId,raceNo:no,meetingNo:Number(meeting?.meetingNo||0)||null,
    meetingLabel:clean(meeting?.meetingLabel||meeting?.label),postponed:actualDate!==scheduledDate,
    source:'LOCAL_ANNUAL_RESULTS_ARCHIVE_YG',version:VERSION,updatedAt:new Date().toISOString(),race:race?.race??race
  });
}
async function saveDay(group,info) {
  const exp=info.expectedRaceNos||[], found=info.foundRaceNos||[], post=info.postponedRaceNos||[];
  return put(STORE_DAYS,{
    key:group.key,year:Number(group.date.slice(0,4)),date:group.date,scheduledDate:group.date,city:group.city,cityId:group.cityId,
    expectedRaceCount:exp.length,raceCount:found.length,expectedRaceNos:exp,foundRaceNos:found,meetingRaceNos:found,
    postponedRaceNos:post,runDates:info.runDates||[],meetingNo:info.meetingNo||null,meetingLabel:info.meetingLabel||'',
    status:info.status||'partial',sourceVersion:VERSION,updatedAt:new Date().toISOString(),error:info.error||null
  });
}
function completeDay(day,exp) {
  if(day?.status!=='complete') return false;
  const found=new Set((day?.foundRaceNos||day?.meetingRaceNos||[]).map(Number));
  return exp.length>0 && exp.every(n=>found.has(n));
}
function shouldResolveMeeting(exp,sameNos) {
  if(!sameNos.length) return true;
  if(exp.some(n=>!sameNos.includes(n))) return true;
  if(exp.length<=3 || sameNos.length<=3) return true;
  return false;
}
async function loadSavedGroup(group,exp) {
  const found=new Map(),runDates=new Set(),postponed=new Set();
  const recs=await Promise.all(exp.map(no=>get(STORE_RACES,raceKey(group.date,group.city,no))));
  for(const rec of recs){
    const no=Number(rec?.raceNo||0); if(!no||!rec?.race) continue;
    const runDate=isoDate(rec?.runDate||rec?.date)||group.date;
    found.set(no,{race:rec.race,runDate,stored:true}); runDates.add(runDate);
    if(runDate!==group.date||rec?.postponed) postponed.add(no);
  }
  return{found,runDates,postponed};
}
async function checkpoint(group,exp,found,runDates,postponed,meeting,status='partial',error=null){
  const foundNos=[...found.keys()].sort((a,b)=>a-b);
  const postponedNos=[...postponed].sort((a,b)=>a-b);
  await saveDay(group,{expectedRaceNos:exp,foundRaceNos:foundNos,postponedRaceNos:postponedNos,runDates:[...runDates].sort(),meetingNo:Number(meeting?.meetingNo||0)||null,meetingLabel:clean(meeting?.meetingLabel),status,error});
}

async function processGroup(group) {
  const exp=expectedNos(group),existing=await get(STORE_DAYS,group.key),saved=await loadSavedGroup(group,exp);
  const found=saved.found,runDates=saved.runDates,postponed=saved.postponed;
  let meeting=null,lastError=null;
  if(completeDay(existing,exp) && exp.every(n=>found.has(n))) {
    return{skipped:true,status:'complete',exp,foundNos:[...found.keys()].sort((a,b)=>a-b),postponedNos:[...postponed].sort((a,b)=>a-b),meetingNo:existing?.meetingNo||null,runDates:[...runDates].sort()};
  }

  try {
    const same=await fetchDay(group.date,group.city),races=Array.isArray(same?.races)?same.races:[];
    for(const race of races){
      const no=raceNo(race); if(!no||!exp.includes(no)) continue;
      found.set(no,{race,runDate:group.date}); runDates.add(group.date);
      await saveRace(group,race,group.date,null);
    }
    if(races.length) await checkpoint(group,exp,found,runDates,postponed,null,'partial',null);
  } catch(e) { lastError=e; }

  const sameNos=[...found.entries()].filter(([,x])=>x.runDate===group.date).map(([n])=>n).sort((a,b)=>a-b);
  if(shouldResolveMeeting(exp,sameNos) && exp.some(n=>!found.has(n))) {
    try {
      meeting=await resolveMeeting(group);
      for(const ref of (Array.isArray(meeting?.resultDates)?meeting.resultDates:[])) {
        const actualDate=isoDate(ref?.date); if(!actualDate) continue;
        let day=null;
        try { day=await fetchDay(actualDate,group.city); } catch(e) { lastError=e; continue; }
        let changed=false;
        for(const race of (Array.isArray(day?.races)?day.races:[])) {
          const no=raceNo(race); if(!no||!exp.includes(no)||found.has(no)) continue;
          found.set(no,{race,runDate:actualDate}); runDates.add(actualDate); changed=true;
          if(actualDate!==group.date) postponed.add(no);
          await saveRace(group,race,actualDate,meeting);
        }
        if(changed) await checkpoint(group,exp,found,runDates,postponed,meeting,'partial',null);
        if(exp.every(n=>found.has(n))) break;
      }
    } catch(e) { lastError=e; }
  }

  const foundNos=[...found.keys()].sort((a,b)=>a-b),missing=exp.filter(n=>!found.has(n));
  const complete=missing.length===0;
  const status=complete?'complete':lastError?'error':'partial';
  const error=complete?null:(lastError?.message||`Eksik koşular: ${missing.join(', ')}`);
  await checkpoint(group,exp,found,runDates,postponed,meeting,status,error);
  return{skipped:false,status,exp,foundNos,missing,postponedNos:[...postponed].sort((a,b)=>a-b),meetingNo:Number(meeting?.meetingNo||existing?.meetingNo||0)||null,meetingLabel:clean(meeting?.meetingLabel||existing?.meetingLabel),runDates:[...runDates].sort(),error};
}

async function summarizeStored(start,end,groups=null){
  const dayRows=await readDaysRange(start,end),map=new Map(dayRows.map(x=>[x.key||dayKey(x.date,x.city),x]));
  let complete=0,partial=0,races=0,postponed=0;
  if(Array.isArray(groups)&&groups.length){
    for(const g of groups){const d=map.get(g.key),exp=expectedNos(g);if(completeDay(d,exp))complete++;else if(d?.raceCount>0)partial++;races+=Number(d?.raceCount||0);postponed+=Array.isArray(d?.postponedRaceNos)?d.postponedRaceNos.length:0;}
    return{total:groups.length,complete,partial,races,postponed};
  }
  for(const d of dayRows){if(d?.status==='complete')complete++;else if(Number(d?.raceCount||0)>0)partial++;races+=Number(d?.raceCount||0);postponed+=Array.isArray(d?.postponedRaceNos)?d.postponedRaceNos.length:0;}
  return{total:dayRows.length,complete,partial,races,postponed};
}
async function showSavedProgress(){
  if(running)return;
  const{start,end}=normalizeRange(); if(!start||!end)return;
  try{
    const api=window.ATF6062;if(!api?.readProgramRange)return;
    const program=(await api.readProgramRange(start,end)).filter(r=>isDomestic(r?.city)),groups=makeGroups(program);
    if(!groups.length)return;
    const s=await summarizeStored(start,end,groups);
    setStatus(`Telefonda kayıtlı: ${s.complete}/${s.total} toplantı tam · ${s.partial} yarım · ${s.races} koşu · ${s.postponed} ertelenmiş koşu. Güncelle yalnız eksikleri tamamlar.`);
  }catch{
    const job=await currentJob();if(job?.total)setStatus(`Kayıtlı ilerleme: ${job.complete||0}/${job.total} toplantı. Güncelle kaldığı yerden devam eder.`);
  }
}

async function updateByYG(start,end) {
  if(running) return;
  const api=window.ATF6062; if(!api?.readProgramRange) throw new Error('Yıllık Yarış Programı okuyucusu hazır değil.');
  running=true; setButton('Y.G. ile sonuçlar indiriliyor…',true);
  try {
    setStatus('Yıllık Yarış Programı okunuyor…');
    const program=(await api.readProgramRange(start,end)).filter(r=>isDomestic(r?.city));
    const groups=makeGroups(program);
    if(!groups.length) throw new Error('Bu tarih aralığında Yıllık Yarış Programı kaydı yok. Önce üst bölümden ilgili yılı güncelleyin.');
    const pre=await summarizeStored(start,end,groups);
    const dayRows=await readDaysRange(start,end),dayMap=new Map(dayRows.map(x=>[x.key||dayKey(x.date,x.city),x]));
    const todo=groups.filter(g=>!completeDay(dayMap.get(g.key),expectedNos(g)));
    let complete=pre.complete,partial=pre.partial,errors=0,postponedRaces=pre.postponed,processed=groups.length-todo.length;
    await persistJob({start,end,total:groups.length,processed,complete,partial,errors,postponedRaces,status:'running'});
    setStatus(`Kayıtlı ${complete}/${groups.length} tam · ${partial} yarım · yalnız ${todo.length} toplantı tamamlanacak.`);
    for(const group of todo) {
      setStatus(`${group.date} · ${group.city} · kayıtlı koşular yüklenip eksikler aranıyor… ${processed}/${groups.length}`);
      let r;
      try { r=await processGroup(group); } catch(e) { r={status:'error',error:e?.message||String(e),postponedNos:[],runDates:[]}; }
      processed++;
      if(r?.status==='complete')complete++; else if(r?.status==='error')errors++; else partial++;
      postponedRaces+=Number(r?.postponedNos?.length||0);
      const yg=r?.meetingNo?` · ${r.meetingNo}. Y.G.`:'';
      const dates=Array.isArray(r?.runDates)&&r.runDates.length?` · sonuç ${r.runDates.join(' + ')}`:'';
      setStatus(`${processed}/${groups.length} toplantı işlendi · ${complete} tam · ${partial} yarım · ${errors} hata · ${postponedRaces} ileri tarihte koşu${yg}${dates}`);
      await persistJob({start,end,total:groups.length,processed,complete,partial,errors,postponedRaces,status:'running',current:{date:group.date,city:group.city,meetingNo:r?.meetingNo||null}});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const final=await summarizeStored(start,end,groups),done=final.complete===groups.length;
    await persistJob({start,end,total:groups.length,processed:groups.length,complete:final.complete,partial:final.partial,errors,postponedRaces:final.postponed,status:done?'complete':'partial'});
    setStatus(done
      ? `Tamamlandı · ${final.complete}/${groups.length} toplantı · ${final.races} koşu kalıcı kayıtlı · ${final.postponed} koşu Y.G. ile ileri tarihten bulundu.`
      : `Kayıt korundu · ${final.complete}/${groups.length} tam · ${final.partial} yarım · ${final.races} koşu telefonda. Aynı düğme yalnız eksikleri tamamlar.`);
    window.ATAnnualResultsArchiveV661?.refresh?.();
  } finally {
    running=false; setButton('Y.G. ile Sonuçları Güncelle',false);
  }
}

function bind() {
  const b=$('f62rUpdate'); if(!b) return false;
  b.textContent='Y.G. ile Sonuçları Güncelle'; b.dataset.f6081='1'; b.onclick=null;
  return true;
}
async function intercept(e) {
  const b=e.target?.closest?.('#f62rUpdate'); if(!b) return;
  e.preventDefault(); e.stopImmediatePropagation(); if(running) return;
  const {start,end}=normalizeRange();
  if(!start||!end){ setStatus('Başlangıç ve bitiş tarihini girin.'); return; }
  try { await updateByYG(start,end); }
  catch(err){ setStatus(err?.message||String(err)); running=false; setButton('Y.G. ile Sonuçları Güncelle',false); }
}
document.addEventListener('click',intercept,true);
function schedule(){
  setTimeout(()=>{bind();void showSavedProgress();},120);
  setTimeout(()=>{bind();void showSavedProgress();},700);
  setTimeout(()=>{bind();void showSavedProgress();},1700);
}
document.addEventListener('click',e=>{ if(e.target?.closest?.('#tjkAnnualArchiveButton,#annualArchiveButton,[data-view="annual-archive"]')) schedule(); },true);
window.addEventListener('pageshow',schedule);
window.addEventListener('at-ai:annual-archive-open',schedule);
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
setTimeout(schedule,1800);

window.ATF6081YGResults={version:VERSION,updateByYG,processGroup,resolveMeeting,showSavedProgress,currentJob,bind};
console.info('[AT AI]',VERSION,'aktif — her koşu anında IndexedDB’ye yazılır; menü yeniden açıldığında kayıtlı koşular yüklenir ve yalnız eksikler tamamlanır.');
})();