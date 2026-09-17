/* AT AI Mobil — F60.86 gerçek TJK Koşu No otoritesi + Y.G. kalıcı checkpoint */
(() => {
'use strict';
if (window.__AT_RESULTS_YG_CONTINUATION_F6081__) return;
window.__AT_RESULTS_YG_CONTINUATION_F6081__ = true;

const VERSION = 'ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.86';
const DB_NAME = 'at_ai_tjk_annual_results_v1';
const STORE_RACES = 'races', STORE_DAYS = 'days', STORE_META = 'meta';
const JOB_KEY = 'f6079:yg-results-job';
const NUMBERING_SOURCE = 'TJK_RESULTS';
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
function raceNo(r) { return Number(r?.no ?? r?.raceNo ?? r?.race?.no ?? r?.race?.raceNo ?? 0) || 0; }
function realNos(races) { return [...new Set((Array.isArray(races)?races:[]).map(raceNo).filter(Boolean))].sort((a,b)=>a-b); }

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
      const tx=db.transaction(STORE_DAYS,'readonly'),os=tx.objectStore(STORE_DAYS),idx=os.indexNames.contains('date')?os.index('date'):null;
      const req=idx?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();
      req.onsuccess=e=>{const c=e.target.result;if(!c)return;const row=c.value,d=isoDate(row?.date);if(d&&d>=start&&d<=end)out.push(row);c.continue();};
      tx.oncomplete=()=>resolve(out); tx.onerror=tx.onabort=()=>resolve(out);
    } catch { resolve(out); }
  });
}
async function readStoredGroup(group) {
  const db=await openDb(); if(!db||!db.objectStoreNames.contains(STORE_RACES)) return [];
  return new Promise(resolve=>{
    const out=[];
    try {
      const tx=db.transaction(STORE_RACES,'readonly'),os=tx.objectStore(STORE_RACES),idx=os.indexNames.contains('date')?os.index('date'):null;
      const req=idx?idx.openCursor(IDBKeyRange.only(group.date)):os.openCursor();
      req.onsuccess=e=>{
        const c=e.target.result;if(!c)return;const row=c.value,d=isoDate(row?.date||row?.scheduledDate);
        if(d===group.date&&fold(row?.city)===fold(group.city)&&raceNo(row))out.push(row);
        c.continue();
      };
      tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>resolve(out);
    } catch { resolve(out); }
  });
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
async function fetchDay(date,city,resultUrl='') {
  const u=new URL('/api/tjk-day-results-v1',location.origin); u.searchParams.set('date',date); u.searchParams.set('city',city);
  if(resultUrl)u.searchParams.set('resultUrl',resultUrl);
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
    numberingSource:NUMBERING_SOURCE,source:'LOCAL_ANNUAL_RESULTS_ARCHIVE_YG',version:VERSION,updatedAt:new Date().toISOString(),race:race?.race??race
  });
}
async function saveDay(group,info) {
  const exp=info.expectedRaceNos||[], found=info.foundRaceNos||[], post=info.postponedRaceNos||[];
  return put(STORE_DAYS,{
    key:group.key,year:Number(group.date.slice(0,4)),date:group.date,scheduledDate:group.date,city:group.city,cityId:group.cityId,
    annualProgramRowCount:group.rows.length,expectedRaceCount:exp.length,raceCount:found.length,expectedRaceNos:exp,foundRaceNos:found,meetingRaceNos:found,
    postponedRaceNos:post,runDates:info.runDates||[],meetingNo:info.meetingNo||null,meetingLabel:info.meetingLabel||'',
    numberingSource:info.authoritative?NUMBERING_SOURCE:'TJK_RESULTS_PARTIAL',status:info.status||'partial',sourceVersion:VERSION,
    updatedAt:new Date().toISOString(),error:info.error||null
  });
}
function authoritativeComplete(day) {
  if(day?.status!=='complete'||day?.numberingSource!==NUMBERING_SOURCE)return false;
  const exp=[...(day?.expectedRaceNos||[])].map(Number).filter(Boolean),found=new Set((day?.foundRaceNos||day?.meetingRaceNos||[]).map(Number));
  return exp.length>0&&exp.every(n=>found.has(n));
}
async function loadSavedGroup(group) {
  const found=new Map(),runDates=new Set(),postponed=new Set(),recs=await readStoredGroup(group);
  for(const rec of recs){
    const no=raceNo(rec);if(!no||!rec?.race)continue;
    const runDate=isoDate(rec?.runDate||rec?.actualResultDate||rec?.date)||group.date;
    found.set(no,{race:rec.race,runDate,stored:true});runDates.add(runDate);if(runDate!==group.date||rec?.postponed)postponed.add(no);
  }
  return{found,runDates,postponed};
}
async function checkpoint(group,found,runDates,postponed,meeting,status='partial',error=null,authoritative=false,expected=null){
  const foundNos=[...found.keys()].sort((a,b)=>a-b),postponedNos=[...postponed].sort((a,b)=>a-b);
  const expectedNos=Array.isArray(expected)?[...new Set(expected.map(Number).filter(Boolean))].sort((a,b)=>a-b):foundNos;
  await saveDay(group,{expectedRaceNos:expectedNos,foundRaceNos:foundNos,postponedRaceNos:postponedNos,runDates:[...runDates].sort(),meetingNo:Number(meeting?.meetingNo||0)||null,meetingLabel:clean(meeting?.meetingLabel),status,error,authoritative});
}

async function processGroup(group) {
  const existing=await get(STORE_DAYS,group.key),saved=await loadSavedGroup(group);
  const found=saved.found,runDates=saved.runDates,postponed=saved.postponed;
  if(authoritativeComplete(existing)){
    const exp=(existing.expectedRaceNos||[]).map(Number).filter(Boolean);
    if(exp.every(n=>found.has(n)))return{skipped:true,status:'complete',exp,foundNos:[...found.keys()].sort((a,b)=>a-b),postponedNos:[...postponed].sort((a,b)=>a-b),meetingNo:existing?.meetingNo||null,runDates:[...runDates].sort(),authoritative:true};
  }

  let meeting=null,lastError=null,sameRaceCount=0,authoritative=false,allMeetingRefsFetched=true;
  try {
    const same=await fetchDay(group.date,group.city),races=Array.isArray(same?.races)?same.races:[];
    sameRaceCount=races.length;
    for(const race of races){
      const no=raceNo(race);if(!no)continue;found.set(no,{race,runDate:group.date});runDates.add(group.date);await saveRace(group,race,group.date,null);
    }
    if(races.length)await checkpoint(group,found,runDates,postponed,null,'partial',null,false,realNos(races));
  } catch(e) { lastError=e; }

  const annualCount=Math.max(0,Number(group.rows.length)||0);
  const needsMeeting=!sameRaceCount||sameRaceCount<annualCount;
  if(needsMeeting){
    try{
      meeting=await resolveMeeting(group);
      const refs=Array.isArray(meeting?.resultDates)?meeting.resultDates:[];
      if(!refs.length)allMeetingRefsFetched=false;
      for(const ref of refs){
        const actualDate=isoDate(ref?.date);if(!actualDate){allMeetingRefsFetched=false;continue;}
        let day=null;
        try{day=await fetchDay(actualDate,group.city,clean(ref?.resultUrl));}catch(e){lastError=e;allMeetingRefsFetched=false;continue;}
        const races=Array.isArray(day?.races)?day.races:[];if(!races.length){allMeetingRefsFetched=false;continue;}
        for(const race of races){
          const no=raceNo(race);if(!no)continue;
          found.set(no,{race,runDate:actualDate});runDates.add(actualDate);if(actualDate!==group.date)postponed.add(no);await saveRace(group,race,actualDate,meeting);
        }
        await checkpoint(group,found,runDates,postponed,meeting,'partial',null,false);
      }
      authoritative=!!found.size&&!!meeting?.closed&&allMeetingRefsFetched;
    }catch(e){lastError=e;}
  }else{
    authoritative=!!found.size;
  }

  const foundNos=[...found.keys()].sort((a,b)=>a-b);
  const status=authoritative?'complete':lastError?'error':'partial';
  const error=authoritative?null:(lastError?.message||'TJK toplantısının gerçek koşu numaraları henüz tam doğrulanamadı.');
  await checkpoint(group,found,runDates,postponed,meeting,status,error,authoritative,foundNos);
  return{skipped:false,status,exp:foundNos,foundNos,missing:[],postponedNos:[...postponed].sort((a,b)=>a-b),meetingNo:Number(meeting?.meetingNo||existing?.meetingNo||0)||null,meetingLabel:clean(meeting?.meetingLabel||existing?.meetingLabel),runDates:[...runDates].sort(),error,authoritative};
}

async function summarizeStored(start,end,groups=null){
  const dayRows=await readDaysRange(start,end),map=new Map(dayRows.map(x=>[x.key||dayKey(x.date,x.city),x]));
  let complete=0,partial=0,races=0,postponed=0,legacy=0;
  if(Array.isArray(groups)&&groups.length){
    for(const g of groups){const d=map.get(g.key);if(authoritativeComplete(d))complete++;else if(d?.status==='complete')legacy++;else if(Number(d?.raceCount||0)>0)partial++;races+=Number(d?.raceCount||0);postponed+=Array.isArray(d?.postponedRaceNos)?d.postponedRaceNos.length:0;}
    return{total:groups.length,complete,partial,races,postponed,legacy};
  }
  for(const d of dayRows){if(authoritativeComplete(d))complete++;else if(d?.status==='complete')legacy++;else if(Number(d?.raceCount||0)>0)partial++;races+=Number(d?.raceCount||0);postponed+=Array.isArray(d?.postponedRaceNos)?d.postponedRaceNos.length:0;}
  return{total:dayRows.length,complete,partial,races,postponed,legacy};
}
async function showSavedProgress(){
  if(running)return;
  const{start,end}=normalizeRange();if(!start||!end)return;
  try{
    const api=window.ATF6062;if(!api?.readProgramRange)return;
    const program=(await api.readProgramRange(start,end)).filter(r=>isDomestic(r?.city)),groups=makeGroups(program);if(!groups.length)return;
    const s=await summarizeStored(start,end,groups);
    const legacy=s.legacy?` · ${s.legacy} eski numaralama doğrulanacak`:'';
    setStatus(`Telefonda kayıtlı: ${s.complete}/${s.total} toplantı gerçek Koşu No ile tam · ${s.partial} yarım · ${s.races} koşu · ${s.postponed} ertelenmiş${legacy}.`);
  }catch{
    const job=await currentJob();if(job?.total)setStatus(`Kayıtlı ilerleme: ${job.complete||0}/${job.total} toplantı. Güncelle kaldığı yerden devam eder.`);
  }
}

async function updateByYG(start,end) {
  if(running)return;
  const api=window.ATF6062;if(!api?.readProgramRange)throw new Error('Yıllık Yarış Programı okuyucusu hazır değil.');
  running=true;setButton('Gerçek Koşu No ile doğrulanıyor…',true);
  try{
    setStatus('Yıllık Yarış Programı toplantıları hazırlanıyor…');
    const program=(await api.readProgramRange(start,end)).filter(r=>isDomestic(r?.city)),groups=makeGroups(program);
    if(!groups.length)throw new Error('Bu tarih aralığında Yıllık Yarış Programı kaydı yok. Önce üst bölümden ilgili yılı güncelleyin.');
    const pre=await summarizeStored(start,end,groups),dayRows=await readDaysRange(start,end),dayMap=new Map(dayRows.map(x=>[x.key||dayKey(x.date,x.city),x]));
    const todo=groups.filter(g=>!authoritativeComplete(dayMap.get(g.key)));
    let complete=pre.complete,partial=pre.partial,errors=0,postponedRaces=pre.postponed,processed=groups.length-todo.length;
    await persistJob({start,end,total:groups.length,processed,complete,partial,errors,postponedRaces,status:'running',numberingSource:NUMBERING_SOURCE});
    setStatus(`Gerçek Koşu No doğrulanmış ${complete}/${groups.length} · ${pre.legacy} eski toplantı yeniden kontrol edilecek · toplam ${todo.length} toplantı sırada.`);
    for(const group of todo){
      setStatus(`${group.date} · ${group.city} · TJK sonuçtaki gerçek Koşu No alınıyor… ${processed}/${groups.length}`);
      let r;try{r=await processGroup(group);}catch(e){r={status:'error',error:e?.message||String(e),postponedNos:[],runDates:[]};}
      processed++;if(r?.status==='complete')complete++;else if(r?.status==='error')errors++;else partial++;
      postponedRaces+=Number(r?.postponedNos?.length||0);
      const yg=r?.meetingNo?` · ${r.meetingNo}. Y.G.`:'',dates=Array.isArray(r?.runDates)&&r.runDates.length?` · sonuç ${r.runDates.join(' + ')}`:'';
      setStatus(`${processed}/${groups.length} toplantı · ${complete} gerçek numarayla tam · ${partial} yarım · ${errors} hata · ${postponedRaces} ertelenmiş${yg}${dates}`);
      await persistJob({start,end,total:groups.length,processed,complete,partial,errors,postponedRaces,status:'running',numberingSource:NUMBERING_SOURCE,current:{date:group.date,city:group.city,meetingNo:r?.meetingNo||null}});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const final=await summarizeStored(start,end,groups),done=final.complete===groups.length;
    await persistJob({start,end,total:groups.length,processed:groups.length,complete:final.complete,partial:final.partial,errors,postponedRaces:final.postponed,status:done?'complete':'partial',numberingSource:NUMBERING_SOURCE});
    setStatus(done?`Tamamlandı · ${final.complete}/${groups.length} toplantı gerçek TJK Koşu No ile doğrulandı · ${final.races} koşu kalıcı kayıtlı · ${final.postponed} ertelenmiş.`:`Kayıt korundu · ${final.complete}/${groups.length} gerçek numarayla tam · ${final.partial} yarım · ${final.legacy} eski numaralama kaldı · ${final.races} koşu telefonda.`);
    window.ATAnnualResultsArchiveV661?.refresh?.();
  }finally{running=false;setButton('Y.G. ile Sonuçları Güncelle',false);}
}

function bind(){const b=$('f62rUpdate');if(!b)return false;b.textContent='Y.G. ile Sonuçları Güncelle';b.dataset.f6081='1';b.dataset.f6086='1';b.onclick=null;return true;}
async function intercept(e){
  const b=e.target?.closest?.('#f62rUpdate');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(running)return;
  const{start,end}=normalizeRange();if(!start||!end){setStatus('Başlangıç ve bitiş tarihini girin.');return;}
  try{await updateByYG(start,end);}catch(err){setStatus(err?.message||String(err));running=false;setButton('Y.G. ile Sonuçları Güncelle',false);}
}
document.addEventListener('click',intercept,true);
function schedule(){setTimeout(()=>{bind();void showSavedProgress();},120);setTimeout(()=>{bind();void showSavedProgress();},700);setTimeout(()=>{bind();void showSavedProgress();},1700);}
document.addEventListener('click',e=>{if(e.target?.closest?.('#tjkAnnualArchiveButton,#annualArchiveButton,[data-view="annual-archive"]'))schedule();},true);
window.addEventListener('pageshow',schedule);window.addEventListener('at-ai:annual-archive-open',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();setTimeout(schedule,1800);

window.ATF6081YGResults={version:VERSION,updateByYG,processGroup,resolveMeeting,showSavedProgress,currentJob,bind,numberingSource:NUMBERING_SOURCE};
console.info('[AT AI]',VERSION,'aktif — yıllık program satır sırası Koşu No sayılmaz; gerçek Koşu No yalnız TJK sonuç sayfasından alınır.');
})();
