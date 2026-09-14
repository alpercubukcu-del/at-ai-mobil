/* AT AI Mobil — F60.63 Güncel Analiz Takvim + Çoklu Filtre Köprüsü */
(() => {
'use strict';
if (window.__AT_F6063_CURRENT_MULTIFILTER__) return;
window.__AT_F6063_CURRENT_MULTIFILTER__ = true;
const VERSION = 'CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63';
const C = window.ATF6062Core;
if (!C) { console.warn('[AT AI]', VERSION, 'F60.62 core bulunamadı'); return; }

const DB_NAME = 'at_ai_tjk_annual_archive_v13';
const DB_VERSION = 3;
const STORE_RACES = 'races';
const STORE_META = 'meta';
const STORE_DAY = 'daycache';
const $ = id => document.getElementById(id);
const clean = C.clean;
const fold = C.fold;
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt = n => Number(n || 0).toLocaleString('tr-TR');
let dbPromise = null;
let dialog = null;
let universe = [];
let found = [];
let draft = new Set();
let activeContext = null;
const configs = window.__AT_CURRENT_FILTER_CONFIGS_F6063__ instanceof Map
  ? window.__AT_CURRENT_FILTER_CONFIGS_F6063__
  : new Map();
window.__AT_CURRENT_FILTER_CONFIGS_F6063__ = configs;

function stateRef() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  return window.state || {};
}
function currentDate() { return C.isoDate(stateRef()?.date || $('raceDate')?.value) || new Date().toISOString().slice(0,10); }
function currentCity() {
  const s = stateRef(), id = clean(s?.city || $('citySelect')?.value);
  return clean((Array.isArray(s?.cities) ? s.cities : []).find(x => clean(x?.id) === id)?.name)
    || clean($('citySelect')?.selectedOptions?.[0]?.textContent) || id;
}
function races() { return (Array.isArray(stateRef()?.races) ? stateRef().races : []).filter(Boolean); }
function raceMeta(r) {
  let m = {};
  try { if (typeof programRaceMeta === 'function') m = programRaceMeta(r) || {}; } catch {}
  const classRaw = clean(m.class || r?.class || r?.raceClass || r?.yaradi1);
  let classKey = '';
  try { classKey = clean(window.canonicalClassKeyV125?.(classRaw) || ''); } catch {}
  return {
    date: currentDate(), city: currentCity(),
    classRaw, classKey,
    groupRaw: clean(m.ageGroup || r?.ageGroup || r?.group || r?.yaradi2),
    distance: Number(m.distance || r?.distance || r?.mesafe || 0) || 0,
    track: clean(m.track || r?.track || r?.pist),
    raceNo: Number(r?.no ?? r?.raceNo ?? 0) || 0,
    race: r
  };
}
function selectedRaceContext() {
  const value = $('analysisRace')?.value || 'all';
  if (value === 'all') return { all:true, date:currentDate(), city:currentCity(), raceNo:0, race:null };
  const n = Number(value) || 0;
  const r = races().find(x => Number(x?.no ?? x?.raceNo) === n);
  return r ? { all:false, ...raceMeta(r) } : null;
}
function configKey(ctx) { return `${ctx?.date || currentDate()}|${fold(ctx?.city || currentCity())}|${ctx?.raceNo || 0}`; }
function addDays(iso, n) { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); }

function openArchiveDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let q;
    try { q = indexedDB.open(DB_NAME, DB_VERSION); } catch { return resolve(null); }
    q.onupgradeneeded = () => {
      const db = q.result;
      let s = db.objectStoreNames.contains(STORE_RACES) ? q.transaction.objectStore(STORE_RACES) : db.createObjectStore(STORE_RACES, {keyPath:'key'});
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, {keyPath:'key'});
      if (!db.objectStoreNames.contains(STORE_DAY)) db.createObjectStore(STORE_DAY, {keyPath:'key'});
      if (!s.indexNames.contains('year')) s.createIndex('year','value.year',{unique:false});
      if (!s.indexNames.contains('date')) s.createIndex('date','value.date',{unique:false});
    };
    q.onsuccess = () => {
      const db = q.result;
      db.onversionchange = () => { try { db.close(); } catch {} dbPromise = null; };
      resolve(db);
    };
    q.onerror = () => { dbPromise = null; resolve(null); };
    q.onblocked = () => console.warn('[AT AI]', VERSION, 'Yıllık arşiv DB yükseltmesi başka bağlantı tarafından engellendi.');
  });
  return dbPromise;
}
async function archiveBounds() {
  const db = await openArchiveDb();
  if (!db || !db.objectStoreNames.contains(STORE_RACES)) return {min:'',max:''};
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_RACES,'readonly'), store = tx.objectStore(STORE_RACES);
      const idx = store.indexNames.contains('date') ? store.index('date') : null;
      if (!idx) return resolve({min:'',max:''});
      let min='', max='', pending=2;
      const done = () => { if (--pending === 0) resolve({min,max}); };
      const a = idx.openCursor(null,'next');
      a.onsuccess = e => { min = clean(e.target.result?.value?.value?.date || ''); done(); };
      a.onerror = done;
      const b = idx.openCursor(null,'prev');
      b.onsuccess = e => { max = clean(e.target.result?.value?.value?.date || ''); done(); };
      b.onerror = done;
    } catch { resolve({min:'',max:''}); }
  });
}
async function readRange(start,end) {
  const db = await openArchiveDb();
  if (!db || !db.objectStoreNames.contains(STORE_RACES)) return [];
  return new Promise(resolve => {
    const out=[];
    try {
      const tx=db.transaction(STORE_RACES,'readonly'), store=tx.objectStore(STORE_RACES), idx=store.indexNames.contains('date')?store.index('date'):null;
      const q=idx?idx.openCursor(IDBKeyRange.bound(start,end)):store.openCursor();
      q.onsuccess=e=>{
        const cur=e.target.result;
        if(!cur)return;
        const row=cur.value?.value ?? cur.value;
        const d=C.isoDate(row?.date);
        if(d&&d>=start&&d<=end) out.push(row);
        cur.continue();
      };
      tx.oncomplete=()=>resolve(out);
      tx.onerror=tx.onabort=()=>resolve(out);
    } catch { resolve(out); }
  });
}

function injectStyle() {
  if ($('f6063Style')) return;
  const s=document.createElement('style'); s.id='f6063Style';
  s.textContent=`.f63-card{border:1px solid #3f769a;border-radius:14px;background:#0a2234;padding:11px;margin:10px 0;color:#eaf6ff}.f63-card h3{margin:0 0 7px;font-size:14px}.f63-btn{min-height:42px;border-radius:9px;border:1px solid #ffffff22;background:#173f5e;color:#eef7ff;font-weight:800}.f63-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.f63-grid label{font-size:10px;color:#a9bbcb;display:grid;gap:4px}.f63-grid input{min-height:42px;border:1px solid #315f7f;border-radius:9px;background:#071522;color:#eef7ff;padding:0 9px}.f63-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.f63-picks{display:grid;gap:7px;margin-top:9px}.f63-pick{border:1px solid #ffffff16;border-radius:10px;padding:7px}.f63-pick summary{font-size:11px;font-weight:800;cursor:pointer}.f63-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;max-height:145px;overflow:auto}.f63-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid #ffffff1f;border-radius:999px;padding:5px 8px;font-size:10px;background:#ffffff09}.f63-chip input{width:17px;height:17px}.f63-note,.f63-status{font-size:10px;line-height:1.45;color:#a9bbcb}.f63-status{margin-top:8px;padding:8px;border-radius:9px;background:#ffffff08;color:#dceaf5}.f63-list{display:grid;gap:5px;margin-top:8px;max-height:42vh;overflow:auto}.f63-row{display:grid;grid-template-columns:26px 1fr;gap:6px;border-bottom:1px solid #ffffff12;padding:7px 2px;font-size:10px}.f63-row b{font-size:11px}@media(max-width:560px){.f63-grid,.f63-actions{grid-template-columns:1fr 1fr}}`;
  document.head.appendChild(s);
}
function optionsFor(rows, getter, normalizer=x=>clean(x), labeler=x=>clean(x)) {
  const map=new Map();
  for(const row of rows){const raw=getter(row), key=normalizer(raw); if(!key||map.has(key))continue; map.set(key,{value:raw,label:labeler(raw,row)});}
  return [...map.values()].sort((a,b)=>String(a.label).localeCompare(String(b.label),'tr',{numeric:true}));
}
function classOptions(rows){
  const map=new Map();
  for(const r of rows){const value=clean(r?.classKey)||fold(r?.classRaw); if(!value||map.has(value))continue; map.set(value,{value,label:clean(r?.classRaw)||value});}
  return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label,'tr',{numeric:true}));
}
function chipGroup(title,name,opts,selected,normalizer=x=>clean(x)){
  const set=new Set((selected||[]).map(normalizer));
  return `<details class="f63-pick" open><summary>${esc(title)} · ${set.size?set.size+' seçili':'Tümü'}</summary><div class="f63-chips">${opts.map(o=>`<label class="f63-chip"><input type="checkbox" data-f63-group="${esc(name)}" value="${esc(o.value)}" ${set.has(normalizer(o.value))?'checked':''}>${esc(o.label)}</label>`).join('')||'<span class="f63-note">Seçenek yok</span>'}</div></details>`;
}
function selectedFilters(){
  const get=g=>[...document.querySelectorAll(`#f63Picks [data-f63-group="${g}"]:checked`)].map(x=>x.value);
  return {startDate:$('f63Start')?.value,endDate:$('f63End')?.value,cities:get('cities'),groups:get('groups'),classes:get('classes'),distances:get('distances').map(Number),tracks:get('tracks'),tokens:[]};
}
function targetDefaults(ctx){
  if(!ctx||ctx.all)return {cities:[],groups:[],classes:[],distances:[],tracks:[]};
  return {cities:[ctx.city],groups:[ctx.groupRaw],classes:[ctx.classKey||fold(ctx.classRaw)],distances:[ctx.distance],tracks:[ctx.track]};
}
function renderPicks(rows,ctx,defaults=targetDefaults(ctx)){
  const host=$('f63Picks'); if(!host)return;
  host.innerHTML=
    chipGroup('İl','cities',optionsFor(rows,r=>r.city,fold),defaults.cities,fold)+
    chipGroup('Yaş / Grup','groups',optionsFor(rows,r=>r.groupRaw,fold),defaults.groups,fold)+
    chipGroup('Koşu Cinsi','classes',classOptions(rows),defaults.classes,x=>clean(x))+ 
    chipGroup('Mesafe','distances',optionsFor(rows,r=>Number(r.distance)||0,x=>String(Number(x)||0),x=>`${Number(x)||0} m`),defaults.distances,x=>String(Number(x)||0))+
    chipGroup('Pist','tracks',optionsFor(rows,r=>r.track,C.trackKey),defaults.tracks,C.trackKey);
}
async function prepare(ctx,useTarget=true){
  let start=$('f63Start')?.value, end=$('f63End')?.value;
  const cap=ctx?.date||currentDate();
  ({start,end}=C.normalizeRange(start,end,cap));
  if(!start||!end){const b=await archiveBounds(); start=start||b.min; end=end||addDays(cap,-1)||b.max;}
  if(end>=cap)end=addDays(cap,-1);
  if(!start||!end||start>end){universe=[];renderPicks([],ctx);$('f63Status').textContent='Yıllık Yarış Arşivinde kullanılabilir tarih bulunamadı.';return[];}
  $('f63Start').value=start;$('f63End').value=end;
  universe=await readRange(start,end);
  renderPicks(universe,ctx,useTarget?targetDefaults(ctx):{cities:[],groups:[],classes:[],distances:[],tracks:[]});
  $('f63Status').textContent=universe.length?`${fmt(universe.length)} arşiv yarışı filtrelemeye hazır.`:'Bu tarih aralığında Yıllık Yarış Arşivi verisi yok. Önce ilgili yılları arşive indirin.';
  return universe;
}
function renderRows(rows){
  const host=$('f63List'); if(!host)return;
  host.innerHTML=rows.length?rows.slice(0,400).map(r=>`<label class="f63-row"><input type="checkbox" data-f63-row="${esc(r.id)}" ${draft.has(r.id)?'checked':''}><div><b>${esc(C.displayDate(r.date))} · ${esc(r.city)}${r.raceNo?` · ${r.raceNo}.K`:''}</b><div>${esc(r.classRaw)} · ${esc(r.groupRaw)}</div><div>${esc(r.distance)} m · ${esc(r.track)}</div></div></label>`).join('')+(rows.length>400?`<div class="f63-note">İlk 400 / ${fmt(rows.length)} gösteriliyor. Filtreyi daraltın.</div>`:''):'<div class="f63-note">Bu filtrelerle tarihsel yarış bulunamadı.</div>';
}
function ensureDialog(){
  if(dialog)return dialog;
  const d=document.createElement('dialog');d.id='f63CurrentFilterDialog';
  d.innerHTML=`<div class="f63-card" style="margin:0;min-width:min(94vw,900px);max-height:92vh;overflow:auto"><h3>🎯 Güncel Analiz · Takvim ve Çoklu Filtre</h3><div id="f63Target" class="f63-note"></div><div class="f63-grid"><label>Başlangıç tarihi<input id="f63Start" type="date"></label><label>Bitiş tarihi<input id="f63End" type="date"></label></div><div class="f63-actions"><button class="f63-btn" id="f63Prepare">Filtreleri Hazırla</button><button class="f63-btn" id="f63Today">Bugünkü Koşudan Doldur</button></div><div id="f63Picks" class="f63-picks"></div><div class="f63-actions"><button class="f63-btn" id="f63Search">Eşleşmeleri Bul</button><button class="f63-btn" id="f63SelectAll">Bulunanların Tümünü Seç</button></div><div id="f63Status" class="f63-status">Filtreler hazırlanıyor…</div><div id="f63List" class="f63-list"></div><div class="f63-actions"><button class="f63-btn" id="f63Apply">Seçimi Uygula</button><button class="f63-btn" id="f63Close">Kapat</button></div></div>`;
  document.body.appendChild(d);
  $('f63Close').onclick=()=>d.close();
  $('f63Prepare').onclick=()=>prepare(activeContext,false);
  $('f63Today').onclick=()=>prepare(activeContext,true);
  $('f63Search').onclick=async()=>{
    if(!universe.length)await prepare(activeContext,true);
    const f=selectedFilters(), cap=activeContext?.date||currentDate();
    found=universe.filter(r=>r.date<cap&&C.rowPasses(r,f)); draft=new Set(); renderRows(found);
    $('f63Status').textContent=`${fmt(found.length)} eşleşme bulundu. Aynı kutudaki seçimler VEYA, farklı kutular arasında VE çalışır.`;
  };
  $('f63SelectAll').onclick=()=>{draft=new Set(found.map(r=>r.id));renderRows(found);$('f63Status').textContent=`${fmt(draft.size)} eşleşme seçildi.`;};
  $('f63List').onchange=e=>{const x=e.target?.closest?.('[data-f63-row]');if(!x)return;x.checked?draft.add(x.dataset.f63Row):draft.delete(x.dataset.f63Row);};
  $('f63Apply').onclick=()=>{
    if(!activeContext||activeContext.all){$('f63Status').textContent='Filtreyi uygulamak için üstten tek bir koşu seçin.';return;}
    if(!draft.size){$('f63Status').textContent='En az bir tarihsel eşleşme seçin.';return;}
    const refs=found.filter(r=>draft.has(r.id));
    const cfg={filters:selectedFilters(),refs:refs.map(r=>({id:r.id,date:r.date,city:r.city,groupRaw:r.groupRaw,classRaw:r.classRaw,classKey:r.classKey,distance:r.distance,track:r.track})),updatedAt:new Date().toISOString()};
    configs.set(configKey(activeContext),cfg); d.close(); updatePanel();
  };
  dialog=d;return d;
}
async function openDialog(){
  const ctx=selectedRaceContext(); activeContext=ctx; const d=ensureDialog();
  if(!ctx){$('f63Status').textContent='Önce programdan bir koşu seçin.';d.showModal();return;}
  if(ctx.all){$('f63Target').textContent='Tüm Koşular seçili. Filtre kaydı için üstte tek bir koşu seçin; her koşunun referans havuzu ayrı saklanır.';}else $('f63Target').textContent=`${ctx.raceNo}. Koşu · ${ctx.city} · ${ctx.classRaw} · ${ctx.groupRaw} · ${ctx.distance} m ${ctx.track}`;
  const b=await archiveBounds(); const end=addDays(ctx.date,-1); $('f63Start').value=b.min||`${ctx.date.slice(0,4)-6}-01-01`; $('f63End').value=b.max&&b.max<end?b.max:end;
  draft=new Set();universe=[];found=[];$('f63List').innerHTML='';d.showModal();
  await prepare(ctx,true);
}
function updatePanel(){
  const p=$('f63CurrentPanel');if(!p)return;
  const ctx=selectedRaceContext(), status=$('f63CurrentPanelStatus');
  if(!ctx){status.textContent='Önce programı yükleyin.';return;}
  if(ctx.all){status.textContent='Tüm Koşular. Eşleşme havuzunu düzenlemek için üstten tek koşu seçin.';return;}
  const cfg=configs.get(configKey(ctx));
  status.textContent=cfg?`${cfg.refs.length} tarihsel referans seçili · ${cfg.filters.startDate} → ${cfg.filters.endDate}`:'Bu koşu için özel tarihsel referans seçilmedi. Güncel Analiz mevcut kariyer verisini kullanır.';
}
function installCurrentPanel(){
  const d=$('analysisDialog');if(!d)return false;
  const isCurrent=d.dataset.view==='current';
  const leaked=$('f62CareerPanel'); if(leaked&&isCurrent) leaked.style.display='none'; else if(leaked&&!isCurrent) leaked.style.display='';
  let p=$('f63CurrentPanel');
  if(!isCurrent){if(p)p.style.display='none';return false;}
  if(!p){
    p=document.createElement('section');p.id='f63CurrentPanel';p.className='f63-card';
    p.innerHTML=`<h3>🎯 Güncel Analiz Eşleşmeleri</h3><div class="f63-note">Analizden önce tarih aralığı ve İl / Yaş-Grup / Koşu Cinsi / Mesafe / Pist havuzunu seçin. Seçilen referanslar yalnız ilgili koşunun yarış öncesi kariyer verisini süzer.</div><button class="f63-btn" id="f63CurrentOpen" style="width:100%;margin-top:8px">Takvim ve Çoklu Filtre ile Eşleşmeleri Seç</button><div id="f63CurrentPanelStatus" class="f63-status"></div>`;
    const content=$('analysisContent');d.insertBefore(p,content||null);$('f63CurrentOpen').onclick=openDialog;
  }
  p.style.display='block';updatePanel();return true;
}

function careerRow(row){
  return {
    ...row,
    date:C.isoDate(row?.isoDate??row?.date??row?.tarih??row?.raceDate),
    city:clean(row?.city??row?.cityName??row?.sehir??row?.il),
    groupRaw:clean(row?.groupRaw??row?.ageGroup??row?.group??row?.yaradi2),
    classRaw:clean(row?.classRaw??row?.class??row?.raceClass??row?.yaradi1??row?.kcins),
    classKey:clean(row?.classKey),
    distance:Number(row?.distance??row?.mesafe??row?.msf??row?.Mesafe??0)||0,
    track:clean(row?.track??row?.pist??row?.Pist??row?.surface),
    extraTokens:Array.isArray(row?.extraTokens)?row.extraTokens:[]
  };
}
function refMatch(row,ref){
  const r=careerRow(row); if(!r.date||r.date!==C.isoDate(ref?.date))return false;
  if(r.city&&ref?.city&&fold(r.city)!==fold(ref.city))return false;
  if(r.distance&&ref?.distance&&Number(r.distance)!==Number(ref.distance))return false;
  if(r.track&&ref?.track&&C.trackKey(r.track)!==C.trackKey(ref.track))return false;
  if(r.groupRaw&&ref?.groupRaw&&fold(r.groupRaw)!==fold(ref.groupRaw))return false;
  if(r.classRaw&&ref?.classRaw){
    const a=clean(r.classKey)||fold(r.classRaw), b=clean(ref.classKey)||fold(ref.classRaw);
    if(a!==b&&fold(r.classRaw)!==fold(ref.classRaw))return false;
  }
  return true;
}
function filterCareerPayload(payload,cfg){
  if(!payload||typeof payload!=='object'||payload.ok===false||!cfg)return payload;
  const out={...payload}, names=['history','preparationPath','top5','roadmap','races'];
  for(const name of names){
    const arr=payload[name]; if(!Array.isArray(arr))continue;
    out[name]=arr.filter(row=>{const n=careerRow(row);return n.date&&C.rowPasses(n,cfg.filters)&&(cfg.refs?.length?cfg.refs.some(ref=>refMatch(n,ref)):true);});
  }
  out.f6063Filter={version:VERSION,referenceCount:cfg.refs?.length||0,filters:cfg.filters};
  return out;
}
function currentConfigsByHorse(){
  const value=$('analysisRace')?.value||'all';
  const selected=value==='all'?races():races().filter(r=>String(r?.no??r?.raceNo)===String(value));
  const map=new Map();
  for(const r of selected){const ctx=raceMeta(r), cfg=configs.get(configKey(ctx));if(!cfg)continue;for(const h of (Array.isArray(r?.horses)?r.horses:[])){if(h?.id!==null&&h?.id!==undefined&&h?.id!=='')map.set(String(h.id),cfg);}}
  return map;
}
function wrapCurrentRun(){
  if(window.__AT_F6063_RUN_WRAPPED__)return; window.__AT_F6063_RUN_WRAPPED__=true;
  if(typeof runAnalysis!=='function')return;
  const before=runAnalysis;
  runAnalysis=async function(){
    const view=$('analysisDialog')?.dataset?.view||'current';
    if(view!=='current')return before.apply(this,arguments);
    const byHorse=currentConfigsByHorse(); if(!byHorse.size||typeof fetchCareer!=='function')return before.apply(this,arguments);
    const original=fetchCareer;
    fetchCareer=async function(id,date){const payload=await original.apply(this,arguments);return filterCareerPayload(payload,byHorse.get(String(id)));};
    try{return await before.apply(this,arguments);}finally{fetchCareer=original;}
  };
}
function wrapRaceChange(){
  if(window.__AT_F6063_RACE_CHANGE_WRAPPED__)return; window.__AT_F6063_RACE_CHANGE_WRAPPED__=true;
  if(typeof handleAnalysisRaceChange!=='function')return;
  const before=handleAnalysisRaceChange;
  handleAnalysisRaceChange=function(){const out=before.apply(this,arguments);setTimeout(updatePanel,0);return out;};
}
function wake(){injectStyle();installCurrentPanel();wrapCurrentRun();wrapRaceChange();}
const obs=new MutationObserver(()=>setTimeout(wake,0));
if(document.documentElement)obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open','data-view']});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="current"],#analysisRace'))setTimeout(wake,30);},true);
document.addEventListener('change',e=>{if(e.target?.id==='analysisRace')setTimeout(updatePanel,0);},true);
openArchiveDb();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(wake,0),{once:true});else setTimeout(wake,0);
setTimeout(wake,500);
window.ATF6063Current={version:VERSION,openArchiveDb,readRange,archiveBounds,filterCareerPayload,configs,install:wake};
console.info('[AT AI]',VERSION,'aktif — Güncel Analiz ilk açılış filtresi + arşiv DB v3 + seçili referans köprüsü.');
})();
