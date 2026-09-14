/* AT AI Mobil — F60.63 Güncel Analiz video-referanslı Özel Analiz arayüzü */
(() => {
'use strict';
if (window.__AT_F6063_CURRENT_MULTIFILTER__) return;
window.__AT_F6063_CURRENT_MULTIFILTER__ = true;
const VERSION='CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63';
const C=window.ATF6062Core;
if(!C){console.warn('[AT AI]',VERSION,'F60.62 core bulunamadı');return;}

const DB_NAME='at_ai_tjk_annual_archive_v13';
const DB_VERSION=3;
const STORE_RACES='races';
const STORE_META='meta';
const STORE_DAY='daycache';
const $=id=>document.getElementById(id);
const clean=C.clean, fold=C.fold;
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=n=>Number(n||0).toLocaleString('tr-TR');
let dbPromise=null;
let universe=[];
let loadedRange='';
let prepareSeq=0;
let activeMode='custom';
let wakeQueued=false;
const configs=window.__AT_CURRENT_FILTER_CONFIGS_F6063__ instanceof Map?window.__AT_CURRENT_FILTER_CONFIGS_F6063__:new Map();
window.__AT_CURRENT_FILTER_CONFIGS_F6063__=configs;

function stateRef(){try{if(typeof state==='object'&&state)return state;}catch{}return window.state||{};}
function currentDate(){return C.isoDate(stateRef()?.date||$('raceDate')?.value)||new Date().toISOString().slice(0,10);}
function currentCity(){
  const s=stateRef(),id=clean(s?.city||$('citySelect')?.value);
  return clean((Array.isArray(s?.cities)?s.cities:[]).find(x=>clean(x?.id)===id)?.name)||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id;
}
function races(){return (Array.isArray(stateRef()?.races)?stateRef().races:[]).filter(Boolean);}
function raceMeta(r){
  let m={};try{if(typeof programRaceMeta==='function')m=programRaceMeta(r)||{};}catch{}
  const classRaw=clean(m.class||r?.class||r?.raceClass||r?.yaradi1);
  let classKey='';try{classKey=clean(window.canonicalClassKeyV125?.(classRaw)||'');}catch{}
  return {date:currentDate(),city:currentCity(),classRaw,classKey,groupRaw:clean(m.ageGroup||r?.ageGroup||r?.group||r?.yaradi2),distance:Number(m.distance||r?.distance||r?.mesafe||0)||0,track:clean(m.track||r?.track||r?.pist),raceNo:Number(r?.no??r?.raceNo??0)||0,race:r};
}
function selectedRaceContext(){
  const value=$('analysisRace')?.value||'all';
  if(value==='all')return {all:true,date:currentDate(),city:currentCity(),raceNo:0,race:null};
  const n=Number(value)||0,r=races().find(x=>Number(x?.no??x?.raceNo)===n);
  return r?{all:false,...raceMeta(r)}:null;
}
function runContexts(){
  const ctx=selectedRaceContext();
  if(!ctx)return [];
  if(!ctx.all)return [ctx];
  return races().map(r=>raceMeta(r));
}
function configKey(ctx){return `${ctx?.date||currentDate()}|${fold(ctx?.city||currentCity())}|${ctx?.raceNo||0}`;}
function addDays(iso,n){const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function yearsBack(iso,n){const d=new Date(`${iso}T12:00:00`);d.setFullYear(d.getFullYear()-n);return d.toISOString().slice(0,10);}

function openArchiveDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    if(!('indexedDB'in window))return resolve(null);
    let q;try{q=indexedDB.open(DB_NAME,DB_VERSION);}catch{return resolve(null);}
    q.onupgradeneeded=()=>{
      const db=q.result;
      let s=db.objectStoreNames.contains(STORE_RACES)?q.transaction.objectStore(STORE_RACES):db.createObjectStore(STORE_RACES,{keyPath:'key'});
      if(!db.objectStoreNames.contains(STORE_META))db.createObjectStore(STORE_META,{keyPath:'key'});
      if(!db.objectStoreNames.contains(STORE_DAY))db.createObjectStore(STORE_DAY,{keyPath:'key'});
      if(!s.indexNames.contains('year'))s.createIndex('year','value.year',{unique:false});
      if(!s.indexNames.contains('date'))s.createIndex('date','value.date',{unique:false});
    };
    q.onsuccess=()=>{const db=q.result;db.onversionchange=()=>{try{db.close();}catch{}dbPromise=null;};resolve(db);};
    q.onerror=()=>{dbPromise=null;resolve(null);};
    q.onblocked=()=>console.warn('[AT AI]',VERSION,'Yıllık arşiv DB başka bağlantı tarafından engellendi.');
  });
  return dbPromise;
}
async function archiveBounds(){
  const db=await openArchiveDb();
  if(!db||!db.objectStoreNames.contains(STORE_RACES))return {min:'',max:''};
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(STORE_RACES,'readonly'),store=tx.objectStore(STORE_RACES),idx=store.indexNames.contains('date')?store.index('date'):null;
      if(!idx)return resolve({min:'',max:''});
      let min='',max='',pending=2;const done=()=>{if(--pending===0)resolve({min,max});};
      const a=idx.openCursor(null,'next');a.onsuccess=e=>{min=clean(e.target.result?.value?.value?.date||'');done();};a.onerror=done;
      const b=idx.openCursor(null,'prev');b.onsuccess=e=>{max=clean(e.target.result?.value?.value?.date||'');done();};b.onerror=done;
    }catch{resolve({min:'',max:''});}
  });
}
async function readRange(start,end){
  const db=await openArchiveDb();
  if(!db||!db.objectStoreNames.contains(STORE_RACES))return [];
  return new Promise(resolve=>{
    const out=[];
    try{
      const tx=db.transaction(STORE_RACES,'readonly'),store=tx.objectStore(STORE_RACES),idx=store.indexNames.contains('date')?store.index('date'):null;
      const q=idx?idx.openCursor(IDBKeyRange.bound(start,end)):store.openCursor();
      q.onsuccess=e=>{const cur=e.target.result;if(!cur)return;const row=cur.value?.value??cur.value,d=C.isoDate(row?.date);if(d&&d>=start&&d<=end)out.push(row);cur.continue();};
      tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>resolve(out);
    }catch{resolve(out);}
  });
}

function injectStyle(){
  if($('f6063CurrentStyle'))return;
  const s=document.createElement('style');s.id='f6063CurrentStyle';
  s.textContent=`
  #f63CurrentPanel{font-family:inherit;box-sizing:border-box;margin:10px 0 14px;color:#172033;background:#f7f9fc;border:1px solid #dde4ec;border-radius:18px;padding:12px;box-shadow:0 5px 20px rgba(15,23,42,.08)}
  #f63CurrentPanel *{box-sizing:border-box}
  .f63-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;background:#edf2f7;border-radius:14px;padding:5px;margin-bottom:11px}
  .f63-tab{appearance:none;border:0;border-radius:10px;min-height:42px;background:transparent;color:#667085;font-size:13px;font-weight:800;padding:0 8px}
  .f63-tab.is-active{background:#fff;color:#153f62;box-shadow:0 2px 9px rgba(15,23,42,.10)}
  .f63-pane[hidden]{display:none!important}
  .f63-params{background:#fff;border:1px solid #dfe5ec;border-radius:16px;overflow:visible}
  .f63-params>summary{list-style:none;min-height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-size:15px;font-weight:900;color:#172033;cursor:pointer}
  .f63-params>summary::-webkit-details-marker{display:none}.f63-params>summary:after{content:'⌄';font-size:22px;color:#7c8b9b;transition:transform .15s}.f63-params[open]>summary:after{transform:rotate(180deg)}
  .f63-param-body{padding:0 12px 13px;display:grid;gap:11px;overflow:visible}
  .f63-label{font-size:12px;font-weight:800;color:#4b5565;margin-bottom:5px}
  .f63-date-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .f63-date-grid label{font-size:10px;font-weight:700;color:#7a8795;display:grid;gap:5px}
  .f63-date-grid input,.f63-selectbox{width:100%;min-height:52px;border:1px solid #dce3ea;border-radius:14px;background:#fff;color:#25364c;padding:0 12px;font:inherit;font-size:13px;outline:none}
  .f63-date-grid input:focus,.f63-selectbox:focus{border-color:#7ca9c9;box-shadow:0 0 0 3px rgba(64,120,160,.10)}
  #f63Picks{overflow:visible!important}
  .f63-rowbox{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;min-height:58px;border:1px solid #dce3ea;border-radius:14px;background:#fff;padding:0 12px}
  .f63-rowbox-text{display:grid;gap:2px}.f63-rowbox-title{font-size:12px;font-weight:800;color:#4b5565}.f63-rowbox-note{font-size:10px;color:#8b98a7}
  .f63-switch{position:relative;width:48px;height:28px;display:inline-block}.f63-switch input{opacity:0;width:0;height:0}.f63-slider{position:absolute;inset:0;border-radius:999px;background:#d5dce4;transition:.18s}.f63-slider:before{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #0003;transition:.18s}.f63-switch input:checked+.f63-slider{background:#1c628f}.f63-switch input:checked+.f63-slider:before{transform:translateX(20px)}
  .f63-status{font-size:11px;line-height:1.45;color:#607080;background:#eef4f8;border-radius:12px;padding:9px 11px;min-height:34px}
  .f63-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}
  .f63-action{min-height:50px;border-radius:14px;font-weight:900;font-size:14px;border:1px solid #d5dde6;background:#fff;color:#334155}.f63-action.primary{background:#173f61;border-color:#173f61;color:#fff}.f63-action:disabled{opacity:.55}
  .f63-standard-note{background:#fff;border:1px solid #dfe5ec;border-radius:15px;padding:13px;font-size:12px;line-height:1.5;color:#536273}
  .f63-target{font-size:11px;font-weight:800;color:#264b68;background:#edf5fb;border-radius:10px;padding:8px 10px}
  #analysisDialog[data-view='current'] #f63CurrentPanel+.analysis-content,#analysisDialog[data-view='current'] #f63CurrentPanel+#analysisContent{margin-top:10px}
  @media(max-width:560px){#f63CurrentPanel{margin:8px 0 12px;padding:9px;border-radius:16px}.f63-tabs{gap:5px}.f63-tab{min-height:40px;font-size:12px}.f63-date-grid{grid-template-columns:1fr 1fr}.f63-actions{position:sticky;bottom:0;background:linear-gradient(180deg,rgba(247,249,252,.25),#f7f9fc 28%);padding-top:8px;z-index:30}}
  `;
  document.head.appendChild(s);
}

function optionsFor(rows,getter,normalizer=x=>clean(x),labeler=x=>clean(x)){
  const map=new Map();for(const row of rows){const raw=getter(row),key=normalizer(raw);if(!key||map.has(key))continue;map.set(key,{value:raw,label:labeler(raw,row)});}return [...map.values()].sort((a,b)=>String(a.label).localeCompare(String(b.label),'tr',{numeric:true}));
}
function classOptions(rows){const map=new Map();for(const r of rows){const value=clean(r?.classKey)||fold(r?.classRaw);if(!value||map.has(value))continue;map.set(value,{value,label:clean(r?.classRaw)||value});}return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label,'tr',{numeric:true}));}
function chipGroup(title,name,opts,selected,normalizer=x=>clean(x)){
  const set=new Set((selected||[]).map(normalizer));
  return `<div class="f63-label">${esc(title)}</div><details class="f62-pick"><summary>${esc(title)}</summary><div class="f62-chips">${opts.map(o=>`<label class="f62-chip"><input type="checkbox" data-f63-group="${esc(name)}" value="${esc(o.value)}" ${set.has(normalizer(o.value))?'checked':''}>${esc(o.label)}</label>`).join('')||'<span style="padding:12px;color:#8290a0;font-size:12px">Seçenek yok</span>'}</div></details>`;
}
function selectedFilters(){
  const get=g=>[...document.querySelectorAll(`#f63Picks [data-f63-group="${g}"]:checked`)].map(x=>x.value);
  return {startDate:$('f63Start')?.value,endDate:$('f63End')?.value,cities:get('cities'),groups:get('groups'),classes:get('classes'),distances:get('distances').map(Number),tracks:get('tracks'),tokens:[]};
}
function targetDefaults(ctx){if(!ctx||ctx.all)return {cities:[],groups:[],classes:[],distances:[],tracks:[]};return {cities:[ctx.city],groups:[ctx.groupRaw],classes:[ctx.classKey||fold(ctx.classRaw)],distances:[ctx.distance],tracks:[ctx.track]};}
function renderPicks(rows,ctx,defaults=targetDefaults(ctx)){
  const host=$('f63Picks');if(!host)return;
  host.innerHTML=chipGroup('İl','cities',optionsFor(rows,r=>r.city,fold),defaults.cities,fold)+chipGroup('Yaş / Grup','groups',optionsFor(rows,r=>r.groupRaw,fold),defaults.groups,fold)+chipGroup('Koşu Cinsi','classes',classOptions(rows),defaults.classes,x=>clean(x))+chipGroup('Mesafe','distances',optionsFor(rows,r=>Number(r.distance)||0,x=>String(Number(x)||0),x=>`${Number(x)||0} m`),defaults.distances,x=>String(Number(x)||0))+chipGroup('Pistler','tracks',optionsFor(rows,r=>r.track,C.trackKey),defaults.tracks,C.trackKey);
  window.ATF6063CompactDropdown?.enhance?.(host);
}
function selectedSnapshot(){
  const out={};for(const g of ['cities','groups','classes','distances','tracks'])out[g]=[...document.querySelectorAll(`#f63Picks [data-f63-group="${g}"]:checked`)].map(x=>x.value);return out;
}
function defaultsFromSnapshot(snap){return {cities:snap?.cities||[],groups:snap?.groups||[],classes:snap?.classes||[],distances:(snap?.distances||[]).map(Number),tracks:snap?.tracks||[]};}
function rowComplete(r){return !!(C.isoDate(r?.date)&&clean(r?.city)&&Number(r?.distance)>0&&clean(r?.track));}

async function setDefaultDates(force=false){
  const startEl=$('f63Start'),endEl=$('f63End');if(!startEl||!endEl)return;
  if(!force&&startEl.value&&endEl.value)return;
  const cap=currentDate(),b=await archiveBounds(),last=addDays(cap,-1),candidate=yearsBack(cap,2);
  startEl.value=b.min&&b.min>candidate?b.min:candidate;
  endEl.value=b.max&&b.max<last?b.max:last;
}
async function prepare(ctx,useTarget=true,preserve=false){
  const seq=++prepareSeq,status=$('f63Status');
  await setDefaultDates(false);
  let start=$('f63Start')?.value,end=$('f63End')?.value,cap=ctx?.date||currentDate();
  ({start,end}=C.normalizeRange(start,end,cap));if(end>=cap)end=addDays(cap,-1);
  if(!start||!end||start>end){universe=[];renderPicks([],ctx);if(status)status.textContent='Tarih aralığını kontrol edin.';return [];}
  $('f63Start').value=start;$('f63End').value=end;
  const snap=preserve?selectedSnapshot():null;
  if(status)status.textContent='Arşiv seçenekleri hazırlanıyor…';
  const rows=await readRange(start,end);if(seq!==prepareSeq)return universe;
  universe=rows;loadedRange=`${start}|${end}`;
  const defs=preserve?defaultsFromSnapshot(snap):(useTarget?targetDefaults(ctx):{cities:[],groups:[],classes:[],distances:[],tracks:[]});
  renderPicks(universe,ctx,defs);
  if(status)status.textContent=universe.length?`${fmt(universe.length)} geçmiş yarış hazır. Filtrelerini seçip Hesapla'ya bas.`:'Bu tarih aralığında telefondaki Yıllık Yarış Arşivinde veri yok.';
  return universe;
}

function refFromRow(r){return {id:r.id,date:r.date,city:r.city,groupRaw:r.groupRaw,classRaw:r.classRaw,classKey:r.classKey,distance:r.distance,track:r.track};}
function selectedRefs(){
  const f=selectedFilters(),limit=Math.max(1,Number($('f63Limit')?.value)||50),dropBad=!!$('f63DropBad')?.checked;
  let rows=universe.filter(r=>r?.date<currentDate()&&C.rowPasses(r,f));
  if(dropBad)rows=rows.filter(rowComplete);
  rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(a.raceNo||0)-Number(b.raceNo||0));
  return {filters:f,rows:rows.slice(0,limit)};
}
function setConfigsForCurrentSelection(filters,rows){
  const refs=rows.map(refFromRow),contexts=runContexts();
  for(const ctx of contexts)configs.set(configKey(ctx),{filters:{...filters},refs:[...refs],updatedAt:new Date().toISOString(),mode:'custom'});
  return contexts.length;
}
function clearConfigsForCurrentSelection(){for(const ctx of runContexts())configs.delete(configKey(ctx));}

async function calculateCustom(){
  const btn=$('f63Calculate'),status=$('f63Status');
  if(btn)btn.disabled=true;
  try{
    const ctx=selectedRaceContext();if(!ctx){if(status)status.textContent='Önce programdan bir koşu seç.';return;}
    const wanted=`${$('f63Start')?.value||''}|${$('f63End')?.value||''}`;
    if(!universe.length||wanted!==loadedRange)await prepare(ctx,true,false);
    const {filters,rows}=selectedRefs();
    if(!rows.length){if(status)status.textContent='Bu seçimlerle eşleşen geçmiş yarış bulunamadı. Filtrelerden birini genişlet.';return;}
    const count=setConfigsForCurrentSelection(filters,rows);
    if(status)status.textContent=`${fmt(rows.length)} geçmiş yarış seçildi · ${count||1} koşu için Güncel Analiz hesaplanıyor…`;
    if(typeof runAnalysis==='function')await runAnalysis();
    if(status)status.textContent=`Hesap tamamlandı · ${fmt(rows.length)} geçmiş yarış özel filtrede kullanıldı.`;
    setMode('results',true);
  }catch(err){console.error('[AT AI]',VERSION,'custom calculate',err);if(status)status.textContent=`Hesaplama başlatılamadı: ${clean(err?.message||err)}`;}finally{if(btn)btn.disabled=false;}
}
async function resetCustom(){
  clearConfigsForCurrentSelection();loadedRange='';
  if($('f63Limit'))$('f63Limit').value='50';if($('f63DropBad'))$('f63DropBad').checked=false;
  await setDefaultDates(true);await prepare(selectedRaceContext(),true,false);
  const status=$('f63Status');if(status)status.textContent='Özel filtreler sıfırlandı; bugünkü koşu değerleri yeniden seçildi.';
}

function setMode(mode,scroll=false){
  activeMode=mode;
  document.querySelectorAll('#f63CurrentPanel [data-f63-mode]').forEach(b=>b.classList.toggle('is-active',b.dataset.f63Mode===mode));
  const custom=$('f63CustomPane'),standard=$('f63StandardPane'),content=$('analysisContent');
  if(custom)custom.hidden=mode!=='custom';if(standard)standard.hidden=mode!=='standard';
  if(mode==='results'&&content&&scroll)setTimeout(()=>content.scrollIntoView({behavior:'smooth',block:'start'}),30);
  if(mode==='custom'&&!universe.length)setTimeout(()=>prepare(selectedRaceContext(),true,false),0);
}
function targetText(){
  const ctx=selectedRaceContext();if(!ctx)return 'Program yüklenmedi.';
  if(ctx.all)return `Tüm Koşular · ${ctx.city||currentCity()}`;
  return `${ctx.raceNo}. Koşu · ${ctx.city} · ${ctx.classRaw||'-'} · ${ctx.groupRaw||'-'} · ${ctx.distance||'-'} m ${ctx.track||''}`;
}
function updatePanel(){
  const t=$('f63Target');if(t)t.textContent=targetText();
  const ctx=selectedRaceContext(),status=$('f63Status');if(!status||activeMode!=='custom')return;
  if(ctx&&!ctx.all){const cfg=configs.get(configKey(ctx));if(cfg)status.textContent=`Bu koşuda ${cfg.refs?.length||0} özel tarihsel referans seçili.`;}
}
function installCurrentPanel(){
  const d=$('analysisDialog');if(!d)return false;
  const isCurrent=d.dataset.view==='current';
  const leaked=$('f62CareerPanel');if(leaked&&isCurrent)leaked.style.display='none';else if(leaked&&!isCurrent)leaked.style.display='';
  let p=$('f63CurrentPanel');
  if(!isCurrent){if(p)p.style.display='none';return false;}
  injectStyle();
  if(!p){
    p=document.createElement('section');p.id='f63CurrentPanel';
    p.innerHTML=`
      <div class="f63-tabs" role="tablist" aria-label="Güncel Analiz modu">
        <button type="button" class="f63-tab" data-f63-mode="standard">Standart</button>
        <button type="button" class="f63-tab is-active" data-f63-mode="custom">Özel</button>
        <button type="button" class="f63-tab" data-f63-mode="results">Sonuçlar</button>
      </div>
      <div id="f63StandardPane" class="f63-pane" hidden><div class="f63-standard-note"><b>Standart Analiz</b><br>Özel tarihsel filtre kullanmadan mevcut Güncel Analiz motoru çalışır. Aşağıdaki mevcut hesaplama alanını kullanabilirsin.</div></div>
      <div id="f63CustomPane" class="f63-pane">
        <div id="f63Target" class="f63-target">${esc(targetText())}</div>
        <details class="f63-params" open>
          <summary>Analiz Parametreleri</summary>
          <div class="f63-param-body">
            <div><div class="f63-label">Tarih Aralığı</div><div class="f63-date-grid"><label>Başlangıç<input id="f63Start" type="date"></label><label>Bitiş<input id="f63End" type="date"></label></div></div>
            <div id="f63Picks" class="f62-picks"></div>
            <div><div class="f63-label">Koşu Sayısı Limiti</div><select id="f63Limit" class="f63-selectbox"><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="50" selected>50</option><option value="100">100</option><option value="200">200</option></select></div>
            <div class="f63-rowbox"><div class="f63-rowbox-text"><span class="f63-rowbox-title">Eksik / Hatalı Yarışları At</span><span class="f63-rowbox-note">Tarih, il, mesafe veya pist bilgisi eksik arşiv kayıtlarını kullanma.</span></div><label class="f63-switch"><input id="f63DropBad" type="checkbox"><span class="f63-slider"></span></label></div>
          </div>
        </details>
        <div id="f63Status" class="f63-status">Arşiv seçenekleri hazırlanıyor…</div>
        <div class="f63-actions"><button type="button" class="f63-action" id="f63Reset">Sıfırla</button><button type="button" class="f63-action primary" id="f63Calculate">Hesapla</button></div>
      </div>`;
    const content=$('analysisContent');d.insertBefore(p,content||null);
    p.addEventListener('click',e=>{const b=e.target.closest?.('[data-f63-mode]');if(b)setMode(b.dataset.f63Mode,b.dataset.f63Mode==='results');});
    $('f63Reset').onclick=resetCustom;$('f63Calculate').onclick=calculateCustom;
    const dateChange=()=>{loadedRange='';prepare(selectedRaceContext(),true,false);};
    $('f63Start').addEventListener('change',dateChange);$('f63End').addEventListener('change',dateChange);
    setDefaultDates(false).then(()=>prepare(selectedRaceContext(),true,false));
  }
  p.style.display='block';setMode(activeMode,false);updatePanel();return true;
}

function careerRow(row){return {...row,date:C.isoDate(row?.isoDate??row?.date??row?.tarih??row?.raceDate),city:clean(row?.city??row?.cityName??row?.sehir??row?.il),groupRaw:clean(row?.groupRaw??row?.ageGroup??row?.group??row?.yaradi2),classRaw:clean(row?.classRaw??row?.class??row?.raceClass??row?.yaradi1??row?.kcins),classKey:clean(row?.classKey),distance:Number(row?.distance??row?.mesafe??row?.msf??row?.Mesafe??0)||0,track:clean(row?.track??row?.pist??row?.Pist??row?.surface),extraTokens:Array.isArray(row?.extraTokens)?row.extraTokens:[]};}
function refMatch(row,ref){
  const r=careerRow(row);if(!r.date||r.date!==C.isoDate(ref?.date))return false;
  if(r.city&&ref?.city&&fold(r.city)!==fold(ref.city))return false;
  if(r.distance&&ref?.distance&&Number(r.distance)!==Number(ref.distance))return false;
  if(r.track&&ref?.track&&C.trackKey(r.track)!==C.trackKey(ref.track))return false;
  if(r.groupRaw&&ref?.groupRaw&&fold(r.groupRaw)!==fold(ref.groupRaw))return false;
  if(r.classRaw&&ref?.classRaw){const a=clean(r.classKey)||fold(r.classRaw),b=clean(ref.classKey)||fold(ref.classRaw);if(a!==b&&fold(r.classRaw)!==fold(ref.classRaw))return false;}
  return true;
}
function filterCareerPayload(payload,cfg){
  if(!payload||typeof payload!=='object'||payload.ok===false||!cfg)return payload;
  const out={...payload},names=['history','preparationPath','top5','roadmap','races'];
  for(const name of names){const arr=payload[name];if(!Array.isArray(arr))continue;out[name]=arr.filter(row=>{const n=careerRow(row);if(!n.date)return false;return cfg.refs?.length?cfg.refs.some(ref=>refMatch(n,ref)):C.rowPasses(n,cfg.filters);});}
  out.f6063Filter={version:VERSION,referenceCount:cfg.refs?.length||0,filters:cfg.filters};return out;
}
function currentConfigsByHorse(){
  const map=new Map();if(activeMode!=='custom')return map;
  const value=$('analysisRace')?.value||'all',selected=value==='all'?races():races().filter(r=>String(r?.no??r?.raceNo)===String(value));
  for(const r of selected){const ctx=raceMeta(r),cfg=configs.get(configKey(ctx));if(!cfg)continue;for(const h of(Array.isArray(r?.horses)?r.horses:[])){if(h?.id!==null&&h?.id!==undefined&&h?.id!=='')map.set(String(h.id),cfg);}}
  return map;
}
function wrapCurrentRun(){
  if(window.__AT_F6063_RUN_WRAPPED__)return;if(typeof runAnalysis!=='function')return;
  window.__AT_F6063_RUN_WRAPPED__=true;const before=runAnalysis;
  runAnalysis=async function(){const view=$('analysisDialog')?.dataset?.view||'current';if(view!=='current')return before.apply(this,arguments);const byHorse=currentConfigsByHorse();if(!byHorse.size||typeof fetchCareer!=='function')return before.apply(this,arguments);const original=fetchCareer;fetchCareer=async function(id,date){const payload=await original.apply(this,arguments);return filterCareerPayload(payload,byHorse.get(String(id)));};try{return await before.apply(this,arguments);}finally{fetchCareer=original;}};
}
function wrapRaceChange(){
  if(window.__AT_F6063_RACE_CHANGE_WRAPPED__)return;if(typeof handleAnalysisRaceChange!=='function')return;
  window.__AT_F6063_RACE_CHANGE_WRAPPED__=true;const before=handleAnalysisRaceChange;
  handleAnalysisRaceChange=function(){const out=before.apply(this,arguments);setTimeout(()=>{updatePanel();loadedRange='';if(activeMode==='custom')prepare(selectedRaceContext(),true,false);},0);return out;};
}
function wake(){injectStyle();installCurrentPanel();wrapCurrentRun();wrapRaceChange();}
function scheduleWake(){if(wakeQueued)return;wakeQueued=true;setTimeout(()=>{wakeQueued=false;wake();},0);}
const obs=new MutationObserver(scheduleWake);if(document.documentElement)obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open','data-view']});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="current"],#analysisRace'))setTimeout(scheduleWake,20);},true);
document.addEventListener('change',e=>{if(e.target?.id==='analysisRace')setTimeout(()=>{updatePanel();loadedRange='';if(activeMode==='custom')prepare(selectedRaceContext(),true,false);},0);},true);
openArchiveDb();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(scheduleWake,0),{once:true});else setTimeout(scheduleWake,0);setTimeout(scheduleWake,500);
window.ATF6063Current={version:VERSION,openArchiveDb,readRange,archiveBounds,filterCareerPayload,configs,install:wake,setMode,prepare,calculateCustom};
console.info('[AT AI]',VERSION,'aktif — Standart / Özel / Sonuçlar + Analiz Parametreleri + inline çoklu filtre + Sıfırla/Hesapla.');
})();
