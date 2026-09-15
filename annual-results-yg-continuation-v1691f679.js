/* AT AI Mobil — F60.79 Yıllık Program -> Y.G. toplantı kimliği -> gerçek koşu sonuçları */
(() => {
'use strict';
if (window.__AT_RESULTS_YG_CONTINUATION_F6079__) return;
window.__AT_RESULTS_YG_CONTINUATION_F6079__ = true;

const VERSION = 'ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.79';
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
  if(day?.sourceVersion!==VERSION || day?.status!=='complete') return false;
  const found=new Set((day?.foundRaceNos||day?.meetingRaceNos||[]).map(Number));
  return exp.length>0 && exp.every(n=>found.has(n));
}
function shouldResolveMeeting(exp,sameNos) {
  if(!sameNos.length) return true;
  if(exp.some(n=>!sameNos.includes(n))) return true;
  if(exp.length<=3 || sameNos.length<=3) return true;
  return false;
}

async function processGroup(group) {
  const exp=expectedNos(group), found=new Map(), runDates=new Set(), postponed=new Set();
  let meeting=null, lastError=null;
  const existing=await get(STORE_DAYS,group.key);
  if(completeDay(existing,exp)) return {skipped:true,status:'complete',exp,foundNos:existing.foundRaceNos||[],postponedNos:existing.postponedRaceNos||[],meetingNo:existing.meetingNo||null,runDates:existing.runDates||[]};

  try {
    const same=await fetchDay(group.date,group.city), races=Array.isArray(same?.races)?same.races:[];
    for(const race of races){ const no=raceNo(race); if(no){ found.set(no,{race,runDate:group.date}); runDates.add(group.date); } }
  } catch(e) { lastError=e; }

  const sameNos=[...found.keys()].sort((a,b)=>a-b);
  if(shouldResolveMeeting(exp,sameNos)) {
    try {
      meeting=await resolveMeeting(group);
      for(const ref of (Array.isArray(meeting?.resultDates)?meeting.resultDates:[])) {
        const actualDate=isoDate(ref?.date); if(!actualDate) continue;
        let day=null;
        try { day=await fetchDay(actualDate,group.city); } catch(e) { lastError=e; continue; }
        for(const race of (Array.isArray(day?.races)?day.races:[])) {
          const no=raceNo(race); if(!no) continue;
          const old=found.get(no); if(old && old.runDate<=actualDate) continue;
          found.set(no,{race,runDate:actualDate}); runDates.add(actualDate);
          if(actualDate!==group.date) postponed.add(no);
        }
      }
    } catch(e) { lastError=e; }
  }

  for(const [no,item] of found) {
    await saveRace(group,item.race,item.runDate,meeting);
    if(item.runDate!==group.date) postponed.add(no);
  }
  const foundNos=[...found.keys()].sort((a,b)=>a-b), missing=exp.filter(n=>!found.has(n));
  const lowMeeting=exp.length<=3 || sameNos.length<=3;
  const meetingClosed=meeting ? Boolean(meeting.closed || (meeting.resultDates||[]).length>1) : !lowMeeting;
  const complete=missing.length===0 && (!lowMeeting || meetingClosed);
  const status=complete?'complete':lastError?'error':'partial';
  const error=complete?null:(lastError?.message || 'Y.G. toplantısının bütün koşuları henüz doğrulanamadı.');
  const postponedNos=[...postponed].sort((a,b)=>a-b), dates=[...runDates].sort();
  await saveDay(group,{expectedRaceNos:exp,foundRaceNos:foundNos,postponedRaceNos:postponedNos,runDates:dates,meetingNo:Number(meeting?.meetingNo||0)||null,meetingLabel:clean(meeting?.meetingLabel),status,error});
  return {skipped:false,status,exp,foundNos,missing,postponedNos,meetingNo:Number(meeting?.meetingNo||0)||null,meetingLabel:clean(meeting?.meetingLabel),runDates:dates,error};
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
    let complete=0,partial=0,errors=0,postponedRaces=0,processed=0;
    await persistJob({start,end,total:groups.length,processed,complete,status:'running'});
    for(const group of groups) {
      setStatus(`${group.date} · ${group.city} · program toplantısı kontrol ediliyor… ${processed}/${groups.length}`);
      let r;
      try { r=await processGroup(group); } catch(e) { r={status:'error',error:e?.message||String(e),postponedNos:[],runDates:[]}; }
      processed++; postponedRaces+=Number(r?.postponedNos?.length||0);
      if(r?.skipped || r?.status==='complete') complete++; else if(r?.status==='error') errors++; else partial++;
      const yg=r?.meetingNo?` · ${r.meetingNo}. Y.G.`:'';
      const dates=Array.isArray(r?.runDates)&&r.runDates.length?` · sonuç ${r.runDates.join(' + ')}`:'';
      setStatus(`${processed}/${groups.length} toplantı işlendi · ${complete} tam · ${partial} yarım · ${errors} hata · ${postponedRaces} ileri tarihte koşu${yg}${dates}`);
      await persistJob({start,end,total:groups.length,processed,complete,partial,errors,postponedRaces,status:'running',current:{date:group.date,city:group.city,meetingNo:r?.meetingNo||null}});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const done=partial===0&&errors===0;
    await persistJob({start,end,total:groups.length,processed,complete,partial,errors,postponedRaces,status:done?'complete':'partial'});
    setStatus(done
      ? `Tamamlandı · ${complete}/${groups.length} program toplantısının gerçek sonuçları indirildi · ${postponedRaces} koşu Y.G. eşleşmesiyle ileri tarihten bulundu.`
      : `Bitti · ${complete}/${groups.length} tam · ${partial} yarım · ${errors} hata · ${postponedRaces} ertelenen koşu bulundu. Aynı düğme yalnız tamamlanmayanları yeniden dener.`);
    window.ATAnnualResultsArchiveV661?.refresh?.();
  } finally {
    running=false; setButton('Y.G. ile Sonuçları Güncelle',false);
  }
}

function bind() {
  const b=$('f62rUpdate'); if(!b) return false;
  b.textContent='Y.G. ile Sonuçları Güncelle'; b.dataset.f6079='1'; b.onclick=null;
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
function schedule(){ setTimeout(bind,120); setTimeout(bind,650); setTimeout(bind,1500); }
document.addEventListener('click',e=>{ if(e.target?.closest?.('#tjkAnnualArchiveButton,#annualArchiveButton,[data-view="annual-archive"]')) schedule(); },true);
window.addEventListener('pageshow',schedule);
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
setTimeout(bind,1800);

window.ATF6079YGResults={version:VERSION,updateByYG,processGroup,resolveMeeting,bind};
console.info('[AT AI]',VERSION,'aktif — yıllık program toplantıları şehir + Y.G. + koşu no ile ileri tarihte takip edilir.');
})();
