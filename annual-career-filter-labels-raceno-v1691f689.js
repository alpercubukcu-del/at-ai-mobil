/* AT AI Mobil — F60.89 Yıllık Arşiv görünür filtre başlıkları + Koşu No filtresi */
(() => {
'use strict';
if(window.__AT_F6089_ANNUAL_FILTER_LABELS_RACENO__)return;
window.__AT_F6089_ANNUAL_FILTER_LABELS_RACENO__=true;

const VERSION='ANNUAL-FILTER-LABELS-RACENO-V16.9.1F60.89';
const RESULTS_DB='at_ai_tjk_annual_results_v1',RESULTS_STORE='races';
const PROGRAM_DB='at_ai_tjk_annual_archive_v13',PROGRAM_STORE='races';
const MAX_RENDER=500;
const LABELS={cities:'İl',groups:'Yaş / Grup',classes:'Koşu Cinsi',distances:'Mesafe',tracks:'Pist',raceNos:'Koşu No'};
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
const fold=v=>upper(v).replace(/[^A-Z0-9]+/g,'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('tr-TR');
const core=()=>window.ATF6062?.core||null;
let universe=[],found=[],resultRows=[],noById=new Map(),loadedRange='';
let resultsDbPromise=null,programDbPromise=null;

function ensureStyle(){
  if($('f6089Style'))return;
  const s=document.createElement('style');
  s.id='f6089Style';
  s.textContent=`
    #f62aaPicks .f6063-filter-label{display:none!important}
    #f62aaPicks .f6089-filter-label{display:block!important;margin:0 0 7px 2px!important;font-size:12px!important;font-weight:800!important;line-height:1.2!important;color:#d7e4ee!important}
    #f62aaPicks details.f62-pick{margin-top:0!important}
    #f62aaPicks details.f62-pick+details.f62-pick{margin-top:2px!important}
    #f6089RaceNoFilter .f62-chip span{font-weight:700}
  `;
  document.head.appendChild(s);
}
function selectionSet(){return window.ATAnnualArchiveV13?.selectionSet||window.__AT_AA_SELECTED_IDS_V134__||null}
function range(){return{start:clean($('f62aaStart')?.value),end:clean($('f62aaEnd')?.value)}}
function openResultsDb(){
  if(resultsDbPromise)return resultsDbPromise;
  resultsDbPromise=new Promise(resolve=>{try{const q=indexedDB.open(RESULTS_DB);q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>{resultsDbPromise=null;resolve(null)}}catch{resolve(null)}});
  return resultsDbPromise;
}
function openProgramDb(){
  if(programDbPromise)return programDbPromise;
  programDbPromise=new Promise(resolve=>{try{const q=indexedDB.open(PROGRAM_DB);q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>{programDbPromise=null;resolve(null)}}catch{resolve(null)}});
  return programDbPromise;
}
async function readResults(start,end){
  const db=await openResultsDb();if(!db||!db.objectStoreNames.contains(RESULTS_STORE))return[];
  return new Promise(resolve=>{const out=[];try{const tx=db.transaction(RESULTS_STORE,'readonly'),os=tx.objectStore(RESULTS_STORE),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();q.onsuccess=e=>{const cur=e.target.result;if(!cur)return;const r=cur.value,d=clean(r?.date);if(d>=start&&d<=end)out.push(r);cur.continue()};tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>resolve(out)}catch{resolve(out)}})
}
async function saveProgramRow(row){
  if(!row?.id)return false;const db=await openProgramDb();if(!db||!db.objectStoreNames.contains(PROGRAM_STORE))return false;
  return new Promise(resolve=>{try{const tx=db.transaction(PROGRAM_STORE,'readwrite');tx.objectStore(PROGRAM_STORE).put({key:row.id,value:row,updatedAt:Date.now()});tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})
}
function classKey(v){try{if(typeof window.canonicalClassKeyV125==='function')return clean(window.canonicalClassKeyV125(v)||'')}catch{}return fold(v)}
function trackKey(v){const u=upper(v);if(u.includes('SENTETIK'))return'SENTETIK';if(u.includes('CIM'))return'CIM';if(u.includes('KUM'))return'KUM';return fold(v)}
function programMeta(r){return{date:clean(r?.date),city:fold(r?.city),cls:classKey(r?.classRaw||r?.class||r?.yaradi1),grp:fold(r?.groupRaw||r?.ageGroup||r?.group||r?.yaradi2),dist:Number(r?.distance||r?.mesafe||0)||0,track:trackKey(r?.track||r?.pist)}}
function resultMeta(rec){const x=rec?.race??rec;return{date:clean(rec?.date||x?.date),city:fold(rec?.city||x?.city),cls:classKey(x?.classRaw||x?.class||x?.raceClass||x?.yaradi1),grp:fold(x?.groupRaw||x?.ageGroup||x?.group||x?.yaradi2),dist:Number(x?.distance||x?.mesafe||0)||0,track:trackKey(x?.track||x?.pist),raceNo:Number(rec?.raceNo??x?.raceNo??x?.no??0)||0}}
function metaMatches(a,b){return a.date===b.date&&a.city===b.city&&a.cls===b.cls&&a.grp===b.grp&&a.dist===b.dist&&a.track===b.track}
function buildResolvedMap(rows,results){
  const map=new Map(),resultMetaRows=results.map(r=>({rec:r,m:resultMeta(r)})).filter(x=>x.m.raceNo>0);
  for(const row of rows){
    const existing=Number(row?.raceNo||0)||0;
    if(existing){map.set(row.id,existing);continue}
    const pm=programMeta(row),candidates=resultMetaRows.filter(x=>metaMatches(pm,x.m));
    const nos=[...new Set(candidates.map(x=>x.m.raceNo).filter(Boolean))];
    if(nos.length===1)map.set(row.id,nos[0]);
  }
  return map;
}
async function persistResolvedRows(rows,map){
  let changed=0;
  for(const row of rows){const no=Number(map.get(row.id)||0);if(!no||Number(row.raceNo||0)===no)continue;row.raceNo=no;row.permanentKey=`${row.date}|${row.cityId||''}|${no}`;row.resolutionMethod='AUTHORITATIVE_RESULT_ARCHIVE_F6089';await saveProgramRow(row);changed++}
  return changed;
}
function groupName(details){return details?.querySelector('[data-f62-group]')?.dataset?.f62Group||details?.dataset?.f6089Group||''}
function ensureVisibleLabels(){
  const host=$('f62aaPicks');if(!host)return false;
  for(const d of host.querySelectorAll('details.f62-pick')){
    const group=groupName(d),title=LABELS[group]||'';if(!title)continue;
    let label=d.querySelector(':scope > .f6089-filter-label');
    if(!label){label=document.createElement('div');label.className='f6089-filter-label';d.insertBefore(label,d.firstChild)}
    label.textContent=title;
    d.setAttribute('aria-label',title);
  }
  return true;
}
function raceNoValues(){return[...new Set([...noById.values()].map(Number).filter(n=>n>0))].sort((a,b)=>a-b)}
function raceNoFilterHtml(values,selected=new Set()){
  const chips=values.length?values.map(n=>`<label class="f62-chip"><input type="checkbox" data-f62-group="raceNos" value="${n}" ${selected.has(String(n))?'checked':''}><span>${n}. Koşu</span></label>`).join(''):'<span class="f62-note">Bu tarih aralığında doğrulanmış Koşu No henüz yok.</span>';
  return `<div class="f6089-filter-label">Koşu No</div><summary>Koşu No · Tümü</summary><div class="f62-chips">${chips}</div>`;
}
function installRaceNoFilter(){
  const host=$('f62aaPicks');if(!host)return false;
  const selected=new Set([...host.querySelectorAll('#f6089RaceNoFilter [data-f62-group="raceNos"]:checked')].map(x=>x.value));
  let d=$('f6089RaceNoFilter');
  if(!d){d=document.createElement('details');d.id='f6089RaceNoFilter';d.className='f62-pick';d.dataset.f6089Group='raceNos';host.appendChild(d)}
  d.innerHTML=raceNoFilterHtml(raceNoValues(),selected);
  ensureVisibleLabels();
  try{window.ATF6063CompactDropdown?.enhance?.(d)}catch{}
  return true;
}
function existingFilters(){
  const get=g=>[...document.querySelectorAll(`#f62aaPicks [data-f62-group="${g}"]:checked`)].map(x=>x.value);
  return{startDate:$('f62aaStart')?.value,endDate:$('f62aaEnd')?.value,cities:get('cities'),groups:get('groups'),classes:get('classes'),distances:get('distances').map(Number),tracks:get('tracks'),tokens:get('tokens')}
}
function selectedRaceNos(){return new Set([...document.querySelectorAll('#f6089RaceNoFilter [data-f62-group="raceNos"]:checked')].map(x=>Number(x.value)).filter(Boolean))}
function displayDate(v){try{return core()?.displayDate?.(v)||v}catch{return v}}
function renderRows(rows){
  const host=$('f62aaList'),sel=selectionSet();if(!host)return;
  const visible=rows.slice(0,MAX_RENDER);
  host.innerHTML=visible.length?visible.map(r=>{const no=Number(noById.get(r.id)||r.raceNo||0);return`<label class="f62-row"><input type="checkbox" data-f62-row="${esc(r.id)}" ${sel?.has(r.id)?'checked':''}><div><b>${esc(displayDate(r.date))} · ${esc(r.city)}${no?` · ${no}.K`:''}</b><div>${esc(r.classRaw||'')} · ${esc(r.groupRaw||'')}</div><div>${esc(r.distance||'')} m · ${esc(r.track||'')}${r.raceName?' · '+esc(r.raceName):''}</div></div><span class="f62-type">${no?`${no}.K`:'No ?'}</span></label>`}).join('')+(rows.length>MAX_RENDER?`<div class="f62-note">İlk ${MAX_RENDER} / ${fmt(rows.length)} gösteriliyor. Filtreyi daraltın.</div>`:''):'<div class="f62-note">Bu filtrelerde yarış bulunamadı.</div>';
  try{window.ATF6088AnnualCareerUi?.updateBatchState?.()}catch{}
}
async function loadRange(force=false){
  const {start,end}=range();if(!start||!end)return false;const key=`${start}|${end}`;
  if(!force&&loadedRange===key&&universe.length)return true;
  const api=window.ATF6062;if(!api?.readProgramRange)return false;
  universe=await api.readProgramRange(start,end);resultRows=await readResults(start,end);noById=buildResolvedMap(universe,resultRows);await persistResolvedRows(universe,noById);loadedRange=key;installRaceNoFilter();ensureVisibleLabels();return true
}
async function prepareRaceNumbers(force=false){
  const st=$('f62aaStatus');
  try{await loadRange(force);if(st){const resolved=[...noById.values()].length;st.textContent=`${fmt(universe.length)} arşiv yarışı filtrelemeye hazır · ${fmt(resolved)} yarışın Koşu No bilgisi doğrulandı.`}}catch(e){if(st)st.textContent=`Koşu No filtresi hazırlanamadı: ${e?.message||e}`}
}
async function searchOwn(){
  const st=$('f62aaStatus');if(st)st.textContent='Arşiv filtreleniyor…';
  await loadRange(false);
  const C=core(),filters=existingFilters(),raceNos=selectedRaceNos();
  found=universe.filter(r=>{let ok=true;try{ok=C?.rowPasses?C.rowPasses(r,filters):true}catch{}if(!ok)return false;if(raceNos.size){const no=Number(noById.get(r.id)||r.raceNo||0);if(!raceNos.has(no))return false}return true}).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||clean(a.city).localeCompare(clean(b.city),'tr')||Number(noById.get(a.id)||a.raceNo||99)-Number(noById.get(b.id)||b.raceNo||99));
  renderRows(found);
  if(st){const suffix=raceNos.size?` · Koşu No: ${[...raceNos].sort((a,b)=>a-b).join(', ')}`:'';st.textContent=`${fmt(found.length)} yarış bulundu${suffix}.`}
}
async function runOwn(){
  const sel=selectionSet(),st=$('f62aaStatus');if(!sel?.size){if(st)st.textContent='En az bir yarış seçin.';return}
  await loadRange(false);
  const chosen=universe.filter(r=>sel.has(r.id));await persistResolvedRows(chosen,noById);
  if(st)st.textContent=`${sel.size} seçim hazır; Kariyer/5 Model motoru başlatılıyor…`;
  const old=$('aaRunSelected');if(old){old.click();return}
  if(window.ATAnnualCareerFiveModelV138?.run)await window.ATAnnualCareerFiveModelV138.run();
}
function bind(){
  ensureStyle();const sec=$('f62ArchiveSearch');if(!sec)return false;
  ensureVisibleLabels();
  if(!sec.dataset.f6089Bound){
    sec.dataset.f6089Bound='1';
    sec.addEventListener('click',e=>{
      if(e.target?.closest?.('#f62aaPrepare')){loadedRange='';for(const ms of[80,250,700])setTimeout(()=>{ensureVisibleLabels();prepareRaceNumbers(true)},ms)}
    },false);
    document.addEventListener('click',e=>{
      const search=e.target?.closest?.('#f62aaSearch');if(search){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void searchOwn();return}
      const run=e.target?.closest?.('#f62aaRun');if(run){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void runOwn()}
    },true);
  }
  if($('f62aaPicks')?.querySelector('details.f62-pick')){ensureVisibleLabels();if(!$('f6089RaceNoFilter'))void prepareRaceNumbers(false)}
  return true
}
function schedule(){for(const ms of[0,80,220,600,1300])setTimeout(bind,ms)}
const mo=new MutationObserver(()=>setTimeout(()=>{ensureVisibleLabels();bind()},0));
try{mo.observe(document.documentElement,{subtree:true,childList:true})}catch{}
window.addEventListener('at-ai:annual-archive-open',schedule);
document.addEventListener('click',e=>{if(e.target?.closest?.('#annualArchiveBtn,#tjkAnnualArchiveButton,#annualArchiveButton'))schedule()},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.ATF6089AnnualFilterRaceNo={version:VERSION,bind,prepareRaceNumbers,search:searchOwn};
console.info('[AT AI]',VERSION,'aktif — yıllık arşiv filtre başlıkları görünür; Koşu No yalnız doğrulanmış sonuç arşivi eşleşmelerinden filtrelenir.');
})();
