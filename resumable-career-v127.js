/* AT AI Mobil — V12.7 COMPACT RESUMABLE CAREER
   IndexedDB checkpoint + HTTP response cache + eksikten devam.
*/
(() => {
'use strict';
if (window.__AT_RESUMABLE_CAREER_V127__) return;
window.__AT_RESUMABLE_CAREER_V127__ = true;

const VERSION='RESUMABLE-CAREER-ANALYSIS-V12.7';
const DB='at_ai_resume_v127', STORE='entries', SESSION='session|career';
const HTTP_TTL=14*864e5, SESSION_TTL=864e5;
const PATHS=new Set([
  '/api/tjk-career-v10','/api/tjk-career','/api/tjk-career-fallback-v1113',
  '/api/tjk-roadmap','/api/tjk-model-roadmap-v11','/api/tjk-adaptive-roadmap-v10',
  '/api/tjk-adaptive-roadmap-v101','/api/tjk-adaptive-roadmap-v102'
]);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toLocaleUpperCase('tr-TR');
let dbp=null, activeSession=null, networkWasOffline=!navigator.onLine;
const inFlight=new Map();

function openDb(){
  if(dbp) return dbp;
  dbp=new Promise(resolve=>{
    if(!('indexedDB' in window)) return resolve(null);
    let req; try{req=indexedDB.open(DB,1)}catch{return resolve(null)}
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'key'})};
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>resolve(null);
  });
  return dbp;
}
async function idb(mode,key,value,kind){
  const db=await openDb(); if(!db)return null;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(STORE,mode==='get'?'readonly':'readwrite'), store=tx.objectStore(STORE);
      if(mode==='get'){
        const req=store.get(key); req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>resolve(null); return;
      }
      if(mode==='delete') store.delete(key); else store.put({key,kind,value,updatedAt:Date.now()});
      tx.oncomplete=()=>resolve(true); tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(null)}
  });
}
const get=key=>idb('get',key), put=(key,kind,value)=>idb('put',key,value,kind), del=key=>idb('delete',key);

async function prune(){
  const db=await openDb(); if(!db)return;
  try{
    const tx=db.transaction(STORE,'readwrite'), req=tx.objectStore(STORE).openCursor();
    req.onsuccess=()=>{const c=req.result;if(!c)return;const row=c.value||{},ttl=row.key===SESSION?SESSION_TTL:HTTP_TTL;if(!row.updatedAt||Date.now()-Number(row.updatedAt)>ttl)c.delete();c.continue()};
  }catch{}
}

function requestKey(input){
  try{
    const raw=typeof input==='string'?input:(input instanceof Request?input.url:String(input||''));
    const url=new URL(raw,location.href); if(url.origin!==location.origin||!PATHS.has(url.pathname))return null;
    const pairs=[...url.searchParams.entries()].filter(([k])=>k!=='t').sort((a,b)=>a[0].localeCompare(b[0])||String(a[1]).localeCompare(String(b[1])));
    const q=new URLSearchParams(); for(const [k,v] of pairs)q.append(k,v);
    return `http|${VERSION}|${url.pathname}?${q}`;
  }catch{return null}
}
function cachedResponse(row){
  const p=row?.value||{};
  return new Response(p.body||'',{status:Number(p.status||200),statusText:p.statusText||'OK',headers:p.headers||{'content-type':'application/json; charset=utf-8','x-at-ai-checkpoint':'1'}});
}
const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  const method=clean(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase()||'GET';
  const key=method==='GET'?requestKey(input):null; if(!key)return nativeFetch(input,init);
  const cached=await get(key); if(cached?.updatedAt&&Date.now()-cached.updatedAt<=HTTP_TTL)return cachedResponse(cached);
  if(inFlight.has(key))return (await inFlight.get(key)).clone();
  const task=(async()=>{
    const res=await nativeFetch(input,init);
    try{
      const text=await res.clone().text(), json=text?JSON.parse(text):null;
      if(res.ok&&json?.ok===true) await put(key,'http',{body:text,status:res.status,statusText:res.statusText,headers:{'content-type':res.headers.get('content-type')||'application/json; charset=utf-8','x-at-ai-checkpoint':'1'}});
    }catch{}
    return res;
  })();
  inFlight.set(key,task);
  try{return (await task).clone()}finally{inFlight.delete(key)}
};

const careerToken=(horseId,before)=>`${clean(horseId)}|${clean(before)}`;
const roadmapToken=meta=>[
  clean(state?.date),clean(state?.city),upper(typeof getCityName==='function'?getCityName():''),
  upper(meta?.class||''),upper(meta?.ageGroup||''),upper(meta?.track||''),clean(meta?.distance||'')
].join('|');

function serialize(s){
  if(!s)return null;
  return {...s,raceNos:[...s.raceNos],expectedCareer:[...s.expectedCareer],doneCareer:[...s.doneCareer],expectedRoadmap:[...s.expectedRoadmap],doneRoadmap:[...s.doneRoadmap],updatedAt:Date.now()};
}
function restore(row){
  const s=row?.value; if(!s||s.version!==VERSION||Date.now()-Number(s.updatedAt||s.startedAt||0)>SESSION_TTL)return null;
  return {...s,raceNos:new Set(s.raceNos||[]),expectedCareer:new Set(s.expectedCareer||[]),doneCareer:new Set(s.doneCareer||[]),expectedRoadmap:new Set(s.expectedRoadmap||[]),doneRoadmap:new Set(s.doneRoadmap||[])};
}
const loadSession=async()=>restore(await get(SESSION));
const saveSession=async(s=activeSession)=>{if(s)await put(SESSION,'session',serialize(s))};
async function clearSession(){activeSession=null;await del(SESSION);renderBanner(null)}
function remaining(s){
  if(!s)return{careers:0,roadmaps:0,total:0};
  let careers=0,roadmaps=0; for(const k of s.expectedCareer)if(!s.doneCareer.has(k))careers++; for(const k of s.expectedRoadmap)if(!s.doneRoadmap.has(k))roadmaps++;
  return{careers,roadmaps,total:careers+roadmaps};
}

function banner(){
  let box=document.getElementById('atAiResumeV127'); if(box)return box;
  const style=document.createElement('style');
  style.textContent='#atAiResumeV127{position:fixed;z-index:99999;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));display:none;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-radius:12px;background:rgba(7,17,31,.96);border:1px solid rgba(114,213,255,.35);box-shadow:0 10px 28px rgba(0,0,0,.38);font-size:12px;line-height:1.35;color:#eef7ff}#atAiResumeV127.show{display:flex}#atAiResumeV127.offline{border-color:rgba(255,173,102,.55)}#atAiResumeV127 .at-resume-text{min-width:0}#atAiResumeV127 .at-resume-text b{display:block;margin-bottom:2px}#atAiResumeV127 button{flex:0 0 auto;border:0;border-radius:9px;padding:8px 10px;font-weight:800;background:#72d5ff;color:#07111f}';
  document.head.appendChild(style);
  box=document.createElement('div'); box.id='atAiResumeV127'; box.innerHTML='<div class="at-resume-text"><b></b><span></span></div><button type="button">Devam et</button>';
  box.querySelector('button').onclick=resumeCurrentSession; document.body.appendChild(box); return box;
}
function renderBanner(s=activeSession,override=''){
  const box=banner(); if(!s){box.classList.remove('show','offline');return}
  const rem=remaining(s), title=box.querySelector('b'), detail=box.querySelector('span'), btn=box.querySelector('button');
  box.classList.add('show'); box.classList.toggle('offline',!navigator.onLine);
  if(!navigator.onLine){title.textContent='İnternet bağlantısı kesildi';detail.textContent=override||`${s.doneCareer.size}/${s.expectedCareer.size} at korunuyor. Bağlantı gelince yalnız eksikler devam edecek.`;btn.style.display='none';return}
  title.textContent=networkWasOffline?'Bağlantı geri geldi':'Yarım kalan analiz bulundu';
  detail.textContent=override||(rem.total?`${rem.careers} at${rem.roadmaps?` · ${rem.roadmaps} tarihsel yol`:''} eksik. Tamamlananlar yeniden indirilmeyecek.`:'Checkpoint tamamlandı.');
  btn.style.display=rem.total?'':'none';
}
async function resumeCurrentSession(){
  const s=activeSession||await loadSession(); if(!s||!navigator.onLine)return;
  if(String(state?.date||'')!==String(s.date||'')||String(state?.city||'')!==String(s.city||'')){renderBanner(s,'Program değişti. Önce aynı tarih ve şehri yükleyin; checkpoint silinmedi.');return}
  activeSession=s; s.status='resuming'; await saveSession(s);
  try{
    if(typeof openAnalysis==='function')openAnalysis('career'); await Promise.resolve();
    const select=document.getElementById('analysisRace'); if(select&&[...select.options].some(o=>String(o.value)===String(s.raceValue)))select.value=String(s.raceValue);
    document.getElementById('runAnalysis')?.click();
  }catch(e){renderBanner(s,e?.message||'Analiz devam ettirilemedi.')}
}

function markDone(type,key){
  if(!activeSession)return Promise.resolve();
  const expected=type==='career'?activeSession.expectedCareer:activeSession.expectedRoadmap;
  const done=type==='career'?activeSession.doneCareer:activeSession.doneRoadmap;
  if(!expected.has(key)||done.has(key))return Promise.resolve();
  done.add(key); return saveSession(activeSession).then(()=>renderBanner(activeSession));
}

if(typeof fetchCareer==='function'){
  const base=fetchCareer;
  fetchCareer=async function(horseId,before){const out=await base(horseId,before);if(out?.ok)await markDone('career',careerToken(horseId,before));return out};
}
function roadmapComplete(data){
  if(!data?.ok)return false;
  for(const race of data?.historicalRaces||[])for(const ref of race?.top3||[])if(ref?.horseId&&(ref?.career?.ok===false||ref?.career?.fullPathError))return false;
  return true;
}
if(typeof fetchHistoricalRoadmap==='function'){
  const base=fetchHistoricalRoadmap;
  fetchHistoricalRoadmap=async function(meta){const out=await base(meta);if(roadmapComplete(out))await markDone('roadmap',roadmapToken(meta));return out};
}

if(typeof runCareerAnalysis==='function'){
  const base=runCareerAnalysis;
  runCareerAnalysis=async function(selectedRaces,raceValue){
    const races=Array.isArray(selectedRaces)?selectedRaces:[], expectedCareer=new Set(),expectedRoadmap=new Set(),raceNos=new Set();
    for(const race of races){
      raceNos.add(String(race?.no??''));
      for(const horse of race?.horses||[])if(horse?.id)expectedCareer.add(careerToken(horse.id,state.date));
      try{const meta=typeof programRaceMeta==='function'?programRaceMeta(race):null;if(meta?.ok)expectedRoadmap.add(roadmapToken(meta))}catch{}
    }
    const previous=await loadSession(), same=previous&&String(previous.date)===String(state?.date||'')&&String(previous.city)===String(state?.city||'')&&String(previous.raceValue)===String(raceValue??'all');
    activeSession={version:VERSION,date:state?.date||'',city:String(state?.city||''),cityName:typeof getCityName==='function'?getCityName():'',raceValue:String(raceValue??'all'),raceNos,expectedCareer,doneCareer:same?new Set([...previous.doneCareer].filter(x=>expectedCareer.has(x))):new Set(),expectedRoadmap,doneRoadmap:same?new Set([...previous.doneRoadmap].filter(x=>expectedRoadmap.has(x))):new Set(),status:'running',startedAt:same?previous.startedAt:Date.now(),updatedAt:Date.now()};
    await saveSession(); renderBanner(activeSession,'Analiz checkpointi açık. Bağlantı koparsa tamamlananlar korunacak.');
    try{
      const out=await base(selectedRaces,raceValue), rem=remaining(activeSession);
      if(!rem.total)await clearSession(); else{activeSession.status=navigator.onLine?'partial':'offline';await saveSession();renderBanner()}
      return out;
    }catch(e){if(activeSession){activeSession.status=navigator.onLine?'partial':'offline';await saveSession();renderBanner(activeSession,e?.message||'Analiz yarıda kaldı; tamamlananlar korundu.')}throw e}
  };
}

window.addEventListener('offline',async()=>{networkWasOffline=true;const s=activeSession||await loadSession();if(!s)return;activeSession=s;s.status='offline';await saveSession();renderBanner()});
window.addEventListener('online',async()=>{const s=activeSession||await loadSession();if(!s){networkWasOffline=false;return}activeSession=s;s.status='partial';await saveSession();renderBanner();networkWasOffline=false});

(async()=>{await prune();const s=await loadSession();if(!s)return;if(String(s.date)!==String(state?.date||'')||String(s.city)!==String(state?.city||''))return;activeSession=s;renderBanner()})();
console.info('[AT AI]',VERSION,'aktif — compact checkpoint + eksikten devam');
})();
