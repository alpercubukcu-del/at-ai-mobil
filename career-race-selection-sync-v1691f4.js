/* AT AI Mobil — V16.9.1F4 Kariyer koşu seçimi senkronizasyonu
   - Android select input/change olaylarında eski koşu DOM'unun ekranda kalmasını engeller.
   - Seçim değişince önce oturumdaki Kariyer sonucunu, sonra Günlük Kariyer Arşivini kullanır.
   - Veri yoksa eski koşuyu göstermeye devam etmek yerine açık uyarı verir.
   - Sıralama, 5 Model ve tarihsel tarama formüllerine dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_CAREER_RACE_SELECTION_SYNC_V1691F4__) return;
window.__AT_CAREER_RACE_SELECTION_SYNC_V1691F4__ = true;

const VERSION='CAREER-RACE-SELECTION-SYNC-V16.9.1F4';
const DB='at_ai_daily_career_archive_v146';
const STORE='entries';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let timer=0, token=0;

function fingerprint(race){
  if(!race) return '';
  const horses=(Array.isArray(race.horses)?race.horses:[])
    .map(h=>[clean(h?.no),clean(h?.id),clean(h?.name).toLocaleUpperCase('tr-TR')].join(':'))
    .sort();
  return [clean(race.no),clean(race.class||race.yaradi1),clean(race.ageGroup||race.yaradi2),clean(race.distance||race.mesafe),clean(race.track||race.pist),horses.join('|')].join('||');
}

function currentProgramRace(no){
  try{return (Array.isArray(state?.races)?state.races:[]).find(r=>String(r?.no)===String(no))||null}catch{return null}
}

function cachedRace(no){
  try{
    const c=state?.analyses?.career;
    const races=Array.isArray(c?.races)?c.races:[];
    return races.find(r=>String(r?.no)===String(no))||null;
  }catch{return null}
}

function getArchiveRecord(key){
  return new Promise(resolve=>{
    if(!('indexedDB' in window)) return resolve(null);
    let q;
    try{q=indexedDB.open(DB)}catch{return resolve(null)}
    q.onerror=()=>resolve(null);
    q.onsuccess=()=>{
      const db=q.result;
      if(!db.objectStoreNames.contains(STORE)){try{db.close()}catch{};return resolve(null)}
      try{
        const tx=db.transaction(STORE,'readonly');
        const r=tx.objectStore(STORE).get(key);
        r.onsuccess=()=>resolve(r.result||null);
        r.onerror=()=>resolve(null);
      }catch{resolve(null)}
    };
  });
}

function renderMissing(value){
  const content=document.getElementById('analysisContent');
  if(!content) return;
  content.classList.remove('empty');
  content.innerHTML=`<div style="padding:15px;line-height:1.55"><b>${clean(value)}. Koşu seçildi.</b><br>Bu koşunun Kariyer Yol Haritası henüz hafızada veya Günlük Arşivde yok.<br><br><b>Analizi Hesapla</b> düğmesine basın. Eski koşu sonucu ekranda tutulmadı.</div>`;
}

function mergeArchiveRecord(rec){
  const old=state?.analyses?.career&&typeof state.analyses.career==='object'?state.analyses.career:{};
  const map=new Map();
  for(const r of Array.isArray(old?.races)?old.races:[]) map.set(String(r?.no),r);
  if(rec?.race) map.set(String(rec.raceNo),rec.race);
  const meta=rec?.meta||{};
  const result={
    ...old,
    ...meta,
    type:'career',
    date:clean(rec?.date||meta?.date||state?.date),
    city:clean(rec?.city||meta?.city||state?.city),
    cityName:clean(rec?.cityName||meta?.cityName||''),
    coverage:'partial',
    calculatedRace:String(rec?.raceNo||''),
    races:[...map.values()].sort((a,b)=>Number(a?.no||0)-Number(b?.no||0)),
    restoredFromArchive:true,
    generatedAt:rec?.generatedAt||rec?.archivedAt||new Date().toISOString()
  };
  state.analyses=state.analyses||{};
  state.analyses.career=result;
  return result;
}

async function syncSelection(expected){
  const sel=document.getElementById('analysisRace');
  const dialog=document.getElementById('analysisDialog');
  if(!sel||dialog?.dataset.view!=='career') return;
  const value=String(sel.value||'all');
  if(expected!==undefined&&String(expected)!==value) return;
  const my=++token;

  try{state.selectedRace=value}catch{}
  try{if(typeof save==='function')save()}catch{}
  try{if(typeof careerModelRenderTokenV112!=='undefined')careerModelRenderTokenV112++}catch{}

  const cached=state?.analyses?.career;
  if(value==='all'){
    if(cached&&Array.isArray(cached.races)&&cached.races.length&&typeof renderCareerAnalysis==='function') renderCareerAnalysis(cached,'all');
    return;
  }

  if(cachedRace(value)){
    if(typeof renderCareerAnalysis==='function') renderCareerAnalysis(cached,value);
    return;
  }

  const date=clean(state?.date),city=clean(state?.city);
  const key=`race|${date}|${city}|${value}`;
  const rec=await getArchiveRecord(key);
  if(my!==token||String(document.getElementById('analysisRace')?.value||'')!==value) return;
  const program=currentProgramRace(value);
  const valid=rec?.kind==='race'&&rec?.race&&program&&rec.fingerprint&&rec.fingerprint===fingerprint(program);
  if(valid){
    const result=mergeArchiveRecord(rec);
    if(typeof renderCareerAnalysis==='function') renderCareerAnalysis(result,value);
    return;
  }
  renderMissing(value);
}

function schedule(){
  const sel=document.getElementById('analysisRace');
  if(!sel) return;
  const expected=String(sel.value||'all');
  clearTimeout(timer);
  timer=setTimeout(()=>{syncSelection(expected).catch(e=>console.warn('[AT AI] Kariyer koşu seçim senkronizasyonu:',e))},0);
}

function bind(){
  const sel=document.getElementById('analysisRace');
  if(!sel||sel.dataset.v1691f4Bound==='1') return;
  sel.dataset.v1691f4Bound='1';
  sel.addEventListener('input',schedule);
  sel.addEventListener('change',schedule);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
else bind();
window.addEventListener('pageshow',bind);
window.ATCareerRaceSelectionSyncV1691F4={version:VERSION,sync:syncSelection};
console.info('[AT AI]',VERSION,'aktif — dropdown seçimi ile görünür Kariyer koşusu senkron');
})();
