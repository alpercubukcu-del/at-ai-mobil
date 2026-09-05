/* AT AI Mobil — V16.9.1F60.40 Annual Five-Model Analysis Archive
   - Tracks annual-history/career/meta requests while the Annual Archive analysis runs.
   - Persists completed/partial annual 5-model results by target date/city/race.
   - Mirrors compact annual model data into the existing daily model archive so Coupon uses it.
   - "Eksikleri Yeniden Dene" reruns the annual engine; successful history/career requests remain cached,
     therefore only missing network pieces are requested again.
   - Supports open/list/delete-one/delete-all. Deleting an annual record also removes its mirrored
     coupon model record only when that record was created by this bridge.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_FIVE_MODEL_ANALYSIS_ARCHIVE_V1691F640__) return;
window.__AT_ANNUAL_FIVE_MODEL_ANALYSIS_ARCHIVE_V1691F640__ = true;

const VERSION='ANNUAL-FIVE-MODEL-ANALYSIS-ARCHIVE-V16.9.1F60.40';
const DB_NAME='at_ai_annual_five_model_analysis_v640';
const STORE='analyses';
const DAILY_DB='at_ai_daily_career_archive_v146';
const DAILY_STORE='entries';
const TRACK_TYPES=new Set(['/api/tjk-history','/api/tjk-career-v10','/api/tjk-race-meta']);
let dbPromise=null, dailyDbPromise=null;
let trackContext='', trackMap=new Map(), saving=false;

const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null};

function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||{}}
function cityId(){return clean(st()?.city||document.getElementById('citySelect')?.value)}
function cityName(){
  try{return clean(typeof getCityName==='function'?getCityName():document.querySelector('#citySelect option:checked')?.textContent)||cityId()}
  catch{return cityId()}
}
function dateNow(){return clean(st()?.date||document.getElementById('raceDate')?.value)}
function selectedRaceNo(){
  const s=st(),v=Number(s?.selectedRace||document.getElementById('analysisRace')?.value||window.__AT_AA_ACTIVE_RACE_NO_V14__||0);
  return v||0;
}
function currentRace(no=selectedRaceNo()){
  return (Array.isArray(st()?.races)?st().races:[]).find(r=>Number(r?.no??r?.raceNo)===Number(no))||null;
}
function contextKey(no=selectedRaceNo()){return [dateNow(),fold(cityName()),Number(no)||0].join('|')}
function archiveKey(date,city,raceNo){return `analysis|${clean(date)}|${fold(city)}|${Number(raceNo)||0}`}
function dailyModelKey(date,cityKey,raceNo){return `model|${clean(date)}|${clean(cityKey)}|${Number(raceNo)||0}`}
function horseToken(h={}){
  const x=h?.horse||h;
  const no=clean(x?.no??x?.number??x?.pno);
  const name=fold(x?.name??x?.horseName??x?.atadi??x?.atismi);
  return no&&name?`${no}|${name}`:'';
}
function raceFingerprint(race){
  if(!race)return'';
  const horses=(Array.isArray(race?.horses)?race.horses:[]).map(h=>[
    clean(h?.no),clean(h?.id),clean(h?.name).toLocaleUpperCase('tr-TR')
  ].join(':')).sort();
  return [
    clean(race?.no??race?.raceNo),
    clean(race?.class||race?.yaradi1),
    clean(race?.ageGroup||race?.yaradi2),
    clean(race?.distance||race?.mesafe),
    clean(race?.track||race?.pist),
    horses.join('|')
  ].join('||');
}
function compactHorse(h={}){
  const x=h?.horse||h;
  return {
    id:clean(x?.id??x?.horseId??x?.atId),
    horseId:clean(x?.horseId??x?.id??x?.atId),
    atId:clean(x?.atId??x?.id??x?.horseId),
    no:finite(x?.no??x?.number??x?.pno),
    name:clean(x?.name??x?.horseName??x?.atadi??x?.atismi),
    hp:finite(x?.hp??x?.HP)
  };
}
function clone(v){try{return structuredClone(v)}catch{try{return JSON.parse(JSON.stringify(v))}catch{return v}}}
function compactPrepared(data={}){
  return {
    no:Number(data?.no)||0,
    roadmapOk:data?.roadmapOk!==false,
    roadmapError:clean(data?.roadmapError),
    modelCounts:clone(data?.modelCounts||{}),
    annualArchiveSource:true,
    annualArchiveRows:Number(data?.annualArchiveRows)||0,
    annualAnalysisArchiveVersion:VERSION,
    horses:(Array.isArray(data?.horses)?data.horses:[]).map(item=>({
      horse:compactHorse(item?.horse||item),
      careerOk:item?.careerOk!==false,
      careerError:clean(item?.careerError),
      scores:clone(item?.scores||{})
    }))
  };
}
function modelRanking(data,id){
  return (Array.isArray(data?.horses)?data.horses:[]).map(item=>{
    const score=finite(item?.scores?.[id]?.score);
    return {no:item?.horse?.no,name:item?.horse?.name,score};
  }).filter(x=>x.score!==null).sort((a,b)=>b.score-a.score||Number(a.no||999)-Number(b.no||999));
}

function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    try{
      const q=indexedDB.open(DB_NAME,1);
      q.onupgradeneeded=()=>{
        const db=q.result;
        const s=db.objectStoreNames.contains(STORE)?q.transaction.objectStore(STORE):db.createObjectStore(STORE,{keyPath:'key'});
        if(!s.indexNames.contains('date'))s.createIndex('date','date',{unique:false});
        if(!s.indexNames.contains('city'))s.createIndex('city','city',{unique:false});
      };
      q.onsuccess=()=>resolve(q.result);
      q.onerror=q.onblocked=()=>{dbPromise=null;resolve(null)};
    }catch{resolve(null)}
  });
  return dbPromise;
}
function openDailyDb(){
  if(dailyDbPromise)return dailyDbPromise;
  dailyDbPromise=new Promise(resolve=>{
    try{
      const q=indexedDB.open(DAILY_DB,1);
      q.onsuccess=()=>resolve(q.result);
      q.onerror=q.onblocked=()=>{dailyDbPromise=null;resolve(null)};
    }catch{resolve(null)}
  });
  return dailyDbPromise;
}
async function idbPut(rec){
  const db=await openDb();if(!db)return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(rec);
      tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(false)}
  });
}
async function idbGet(key){
  const db=await openDb();if(!db)return null;
  return new Promise(resolve=>{
    try{
      const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
      q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null);
    }catch{resolve(null)}
  });
}
async function idbAll(){
  const db=await openDb();if(!db)return[];
  return new Promise(resolve=>{
    try{
      const q=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
      q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([]);
    }catch{resolve([])}
  });
}
async function idbDelete(key){
  const db=await openDb();if(!db)return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);
      tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(false)}
  });
}
async function idbClear(){
  const db=await openDb();if(!db)return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();
      tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(false)}
  });
}
async function dailyPut(rec){
  const db=await openDailyDb();if(!db||!db.objectStoreNames.contains(DAILY_STORE))return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(DAILY_STORE,'readwrite');tx.objectStore(DAILY_STORE).put(rec);
      tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(false)}
  });
}
async function dailyGet(key){
  const db=await openDailyDb();if(!db||!db.objectStoreNames.contains(DAILY_STORE))return null;
  return new Promise(resolve=>{
    try{
      const q=db.transaction(DAILY_STORE,'readonly').objectStore(DAILY_STORE).get(key);
      q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null);
    }catch{resolve(null)}
  });
}
async function dailyDeleteIfAnnual(key){
  const rec=await dailyGet(key);
  if(!rec?.annualFiveModelAnalysisSourceF640)return false;
  const db=await openDailyDb();if(!db)return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(DAILY_STORE,'readwrite');tx.objectStore(DAILY_STORE).delete(key);
      tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(false)}
  });
}

function trackReset(){
  trackContext=contextKey();
  trackMap=new Map();
}
function parseTracked(input){
  try{
    const url=new URL(input instanceof Request?input.url:String(input||''),location.origin);
    if(url.origin!==location.origin||!TRACK_TYPES.has(url.pathname))return null;
    const q=Object.fromEntries(url.searchParams.entries());
    const key=url.pathname+'?'+url.searchParams.toString();
    return {key,path:url.pathname,url:url.pathname+'?'+url.searchParams.toString(),query:q};
  }catch{return null}
}
const baseFetch=window.fetch.bind(window);
window.fetch=async function annualArchiveTrackedFetch(input,init){
  const open=!!document.getElementById('tjkAnnualArchiveDialog')?.open;
  const req=open?parseTracked(input):null;
  if(!req)return baseFetch(input,init);
  const ctx=contextKey();
  if(trackContext!==ctx){trackContext=ctx;trackMap=new Map()}
  const started=Date.now();
  trackMap.set(req.key,{...req,status:'pending',startedAt:new Date(started).toISOString()});
  try{
    const response=await baseFetch(input,init);
    const rec=trackMap.get(req.key)||req;
    trackMap.set(req.key,{...rec,status:response?.ok?'ok':'http_error',httpStatus:Number(response?.status)||0,elapsedMs:Date.now()-started});
    return response;
  }catch(e){
    const rec=trackMap.get(req.key)||req;
    trackMap.set(req.key,{...rec,status:'failed',error:clean(e?.message||e),elapsedMs:Date.now()-started});
    throw e;
  }
};
function trackSnapshot(){
  return [...trackMap.values()].map(clone);
}
function failedSnapshot(){
  return trackSnapshot().filter(x=>x.status==='failed'||x.status==='http_error');
}

async function savePrepared(raceNo,data){
  if(saving||!data?.annualArchiveSource||data?.roadmapOk===false)return false;
  const race=currentRace(raceNo);if(!race)return false;
  saving=true;
  try{
    const date=dateNow(),city=cityName(),cityKey=cityId(),compact=compactPrepared(data);
    const requests=trackSnapshot(),failed=requests.filter(x=>x.status==='failed'||x.status==='http_error');
    const selectedIds=window.__AT_AA_SELECTED_IDS_V134__ instanceof Set?[...window.__AT_AA_SELECTED_IDS_V134__]:[];
    const key=archiveKey(date,city,raceNo);
    const rec={
      key,kind:'annual-five-model-analysis',schemaVersion:VERSION,
      date,city,cityKey,raceNo:Number(raceNo),fingerprint:raceFingerprint(race),
      prepared:compact,selectedAnnualIds:selectedIds,
      referenceCount:Number(data?.annualArchiveRows)||requests.filter(x=>x.path==='/api/tjk-history').length,
      requestCount:requests.length,
      failedCount:failed.length,
      failedRequests:failed,
      requests,
      complete:failed.length===0,
      generatedAt:new Date().toISOString(),
      archivedAt:new Date().toISOString()
    };
    await idbPut(rec);

    const dailyKey=dailyModelKey(date,cityKey,raceNo);
    await dailyPut({
      key:dailyKey,kind:'model',schemaVersion:'DAILY-CAREER-ARCHIVE-V14.6',
      engine:'ANNUAL-FIVE-MODEL-F60.40',
      date,city:cityKey,cityName:city,raceNo:clean(raceNo),
      fingerprint:raceFingerprint(race),data:compact,
      archivedAt:new Date().toISOString(),
      annualFiveModelAnalysisSourceF640:true,
      annualAnalysisKey:key,
      annualAnalysisComplete:rec.complete,
      annualAnalysisFailedCount:failed.length
    });
    try{window.dispatchEvent(new CustomEvent('at-ai:daily-five-model-archive-updated',{detail:{version:VERSION,date,city:cityKey,raceNo:clean(raceNo),source:'annual-analysis'}}))}catch{}
    await renderArchiveUi();
    return true;
  }finally{saving=false}
}

function installStoreHook(){
  const api=window.ATFiveModelSharedCacheV1687||window.ATFiveModelSharedCacheV1685;
  if(!api||typeof api.storeReady!=='function')return false;
  if(api.__annualArchiveF640)return true;
  const base=api.storeReady.bind(api);
  api.storeReady=function(raceNo,data){
    const ok=base(raceNo,data);
    if(ok&&data?.annualArchiveSource===true)Promise.resolve().then(()=>savePrepared(raceNo,data)).catch(e=>console.warn('[AT AI]',VERSION,'archive save',e));
    return ok;
  };
  api.__annualArchiveF640=VERSION;
  return true;
}

function sameCurrent(rec){
  return !!rec&&clean(rec.date)===dateNow()&&fold(rec.city)===fold(cityName())&&Number(rec.raceNo)===selectedRaceNo()&&rec.fingerprint===raceFingerprint(currentRace(rec.raceNo));
}
async function retryMissing(rec){
  if(!sameCurrent(rec)){
    alert(`Eksikleri tamamlamak için önce ${rec.date} · ${rec.city} · ${rec.raceNo}. Koşu programını yükleyip o koşuyu seçin.`);
    return;
  }
  const api=window.ATAnnualCareerFiveModelV138;
  if(!api||typeof api.run!=='function'){alert('Yıllık 5 Model motoru bulunamadı.');return}
  trackReset();
  const status=document.getElementById('aaAnnualAnalysisArchiveStatusF640');
  if(status)status.textContent=`Eksikler yeniden deneniyor · önceki eksik ${rec.failedCount||0}. Başarılı referanslar yerel cache’den kullanılacak…`;
  try{
    const out=await api.run();
    if(!out)throw new Error('Analiz tamamlanamadı.');
    if(status)status.textContent='Yeniden deneme tamamlandı; arşiv kaydı güncellendi.';
  }catch(e){
    if(status)status.textContent='Yeniden deneme hatası: '+clean(e?.message||e);
  }
}

function renderRankPreview(rec){
  const ids=['composite','exact','twin','family','career'];
  const labels={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};
  return ids.map(id=>{
    const rows=modelRanking(rec?.prepared,id).slice(0,5);
    return `<div style="margin-top:8px"><b>${labels[id]}</b><div class="aa-note">${rows.length?rows.map((x,i)=>`${i+1}. ${esc(x.no)} ${esc(x.name)} %${esc(x.score)}`).join(' · '):'Veri yok'}</div></div>`;
  }).join('');
}
async function renderArchiveUi(){
  const host=document.getElementById('aaAnnualAnalysisArchiveListF640');
  const count=document.getElementById('aaAnnualAnalysisArchiveCountF640');
  if(!host)return;
  const rows=(await idbAll()).sort((a,b)=>String(b.archivedAt||'').localeCompare(String(a.archivedAt||'')));
  if(count)count.textContent=rows.length?`(${rows.length})`:'';
  if(!rows.length){host.innerHTML='<div class="aa-note">Henüz kayıtlı Yıllık 5 Model analizi yok.</div>';return}
  host.innerHTML=rows.map(rec=>`<div class="aa-row" style="display:block;margin-top:8px">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
      <div><b>${esc(rec.date)} · ${esc(rec.city)} · ${esc(rec.raceNo)}.K</b>
      <div class="aa-row-sub">${esc(rec.referenceCount||0)} referans · ${rec.failedCount?'<span style="color:#ffbd82">'+esc(rec.failedCount)+' eksik</span>':'<span style="color:#7ee2a8">tamamlandı</span>'} · kupon arşivine bağlı</div></div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">
        <button class="aa-btn secondary" data-aa-arch-open="${esc(rec.key)}">Aç</button>
        ${rec.failedCount?`<button class="aa-btn secondary" data-aa-arch-retry="${esc(rec.key)}">Eksikleri Yeniden Dene</button>`:''}
        <button class="aa-btn secondary" data-aa-arch-del="${esc(rec.key)}">Sil</button>
      </div>
    </div>
    <div data-aa-arch-preview="${esc(rec.key)}" style="display:none">${renderRankPreview(rec)}</div>
  </div>`).join('');

  host.querySelectorAll('[data-aa-arch-open]').forEach(btn=>btn.onclick=()=>{
    const p=host.querySelector(`[data-aa-arch-preview="${CSS.escape(btn.dataset.aaArchOpen)}"]`);
    if(p)p.style.display=p.style.display==='none'?'block':'none';
  });
  host.querySelectorAll('[data-aa-arch-retry]').forEach(btn=>btn.onclick=async()=>{
    const rec=await idbGet(btn.dataset.aaArchRetry);if(rec)await retryMissing(rec);
  });
  host.querySelectorAll('[data-aa-arch-del]').forEach(btn=>btn.onclick=async()=>{
    const rec=await idbGet(btn.dataset.aaArchDel);if(!rec)return;
    if(!confirm(`${rec.date} · ${rec.city} · ${rec.raceNo}.K analiz kaydı silinsin mi? Kupon için aynalanan 5 Model kaydı da silinecek.`))return;
    await idbDelete(rec.key);
    await dailyDeleteIfAnnual(dailyModelKey(rec.date,rec.cityKey,rec.raceNo));
    await renderArchiveUi();
  });
}
function ensureUi(){
  const body=document.querySelector('#tjkAnnualArchiveDialog .aa-body');if(!body)return;
  if(document.getElementById('aaAnnualAnalysisArchiveF640')){void renderArchiveUi();return}
  const section=document.createElement('div');
  section.className='aa-section';section.id='aaAnnualAnalysisArchiveF640';
  section.innerHTML=`<h3>Yıllık 5 Model Analiz Arşivi <span id="aaAnnualAnalysisArchiveCountF640"></span></h3>
  <div class="aa-note">Tamamlanan veya eksikli analizler hedef koşu bazında otomatik kaydedilir. Aynı kayıt Kupon Oluştur'un 5 Model arşivine de yazılır.</div>
  <div class="aa-actions">
    <button class="aa-btn secondary" id="aaAnnualAnalysisArchiveRefreshF640">Arşivi Yenile</button>
    <button class="aa-btn secondary" id="aaAnnualAnalysisArchiveRetryCurrentF640">Mevcut Koşunun Eksiklerini Yeniden Dene</button>
    <button class="aa-btn secondary" id="aaAnnualAnalysisArchiveClearF640">Tüm Analiz Arşivini Sil</button>
  </div>
  <div id="aaAnnualAnalysisArchiveStatusF640" class="aa-status"></div>
  <div id="aaAnnualAnalysisArchiveListF640"></div>`;
  body.appendChild(section);
  document.getElementById('aaAnnualAnalysisArchiveRefreshF640').onclick=()=>void renderArchiveUi();
  document.getElementById('aaAnnualAnalysisArchiveRetryCurrentF640').onclick=async()=>{
    const rec=await idbGet(archiveKey(dateNow(),cityName(),selectedRaceNo()));
    if(!rec){alert('Bu hedef koşu için kayıtlı Yıllık 5 Model analizi yok. Önce analizi çalıştırın.');return}
    await retryMissing(rec);
  };
  document.getElementById('aaAnnualAnalysisArchiveClearF640').onclick=async()=>{
    if(!confirm('Tüm Yıllık 5 Model analiz arşivi silinsin mi? Bu arşivden kupona aynalanan kayıtlar da temizlenecek.'))return;
    const rows=await idbAll();
    for(const rec of rows)await dailyDeleteIfAnnual(dailyModelKey(rec.date,rec.cityKey,rec.raceNo));
    await idbClear();await renderArchiveUi();
  };
  void renderArchiveUi();
}

document.addEventListener('pointerdown',e=>{
  if(e.target?.closest?.('#aaRunSelected'))trackReset();
},true);
window.addEventListener('at-ai:annual-archive-created',()=>setTimeout(ensureUi,0));
window.addEventListener('at-ai:annual-archive-open',()=>setTimeout(ensureUi,0));
window.addEventListener('at-ai:annual-archive-render',()=>setTimeout(ensureUi,0));

if(!installStoreHook()){
  const t=setInterval(()=>{if(installStoreHook())clearInterval(t)},50);
  setTimeout(()=>clearInterval(t),5000);
}
setTimeout(ensureUi,100);

window.ATAnnualFiveModelAnalysisArchiveV640={
  version:VERSION,
  list:idbAll,
  getCurrent:()=>idbGet(archiveKey(dateNow(),cityName(),selectedRaceNo())),
  delete:key=>idbDelete(key),
  clear:idbClear,
  retryCurrent:async()=>{const rec=await idbGet(archiveKey(dateNow(),cityName(),selectedRaceNo()));if(rec)return retryMissing(rec)},
  failedRequests:failedSnapshot,
  trackSnapshot
};
console.info('[AT AI]',VERSION,'active — annual 5-model results persist, missing refs retry from cache, and coupon archive mirror is enabled.');
})();