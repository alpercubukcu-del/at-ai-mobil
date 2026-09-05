/* AT AI Mobil — V16.9.1F60.35 Lazy Daily Calibration
   Flow:
   1) choose current race
   2) open selector (only archive META is read)
   3) choose start/end year
   4) "Bul ve Koşu Numaralarını Çözümle" reads only selected years, finds Exact/Twin/Family matches,
      resolves race numbers grouped by date+city, persists them into Annual Archive
   5) bulk/manual select
   6) "Hesapla ve Kaydet" hands resolved rows to the legacy F59.4 five-model backtest engine
*/
(() => {
'use strict';
if (window.__AT_DAILY_CALIBRATION_LAZY_V1691F635__) return;
window.__AT_DAILY_CALIBRATION_LAZY_V1691F635__ = true;

const VERSION='DAILY-CALIBRATION-LAZY-V16.9.1F60.35';
const DB='at_ai_tjk_annual_archive_v13';
const STORE_RACES='races';
const STORE_META='meta';
const PAGE_ID='dailyCalibrationPageF635';
const DIALOG_ID='dailyCalibrationSelectorF635';
const PAGE_SIZE=100;
const MODEL_IDS=['composite','exact','twin','family','career'];
const MODEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};

let dbPromise=null;
let contextNow=null;
let rangeRows=[];
let matches=[];
let draft=new Set();
let shown=PAGE_SIZE;
let busy=false;
let statusObserver=null;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
const key=v=>upper(v).replace(/[^A-Z0-9]+/g,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('tr-TR');
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||{}}
function currentDate(){return clean(st()?.date||$('raceDate')?.value)}
function currentCityId(){return clean(st()?.city||$('citySelect')?.value)}
function currentCity(){
  const s=st(),id=currentCityId();
  try{if(typeof getCityName==='function')return clean(getCityName())}catch{}
  return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)
    ||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id;
}
function programRaces(){
  return (Array.isArray(st()?.races)?st().races:[]).filter(Boolean)
    .sort((a,b)=>Number(a?.no||a?.raceNo||0)-Number(b?.no||b?.raceNo||0));
}
function raceNo(r){return Number(r?.no??r?.raceNo??0)||0}
function canonicalClass(v){
  try{if(typeof window.canonicalClassKeyV125==='function')return window.canonicalClassKeyV125(v)||key(v)}catch{}
  return key(v);
}
function sameClass(a,b){return canonicalClass(a)===canonicalClass(b)}
function sameAge(a,b){return key(a)===key(b)}
function trackKey(v){
  const t=upper(v);
  if(t.includes('CIM'))return'CIM';
  if(t.includes('KUM'))return'KUM';
  if(t.includes('SENTETIK'))return'SENTETIK';
  return key(v);
}
function sameTrack(a,b){return trackKey(a)===trackKey(b)}
function metaOf(race){
  let m=null;try{if(typeof programRaceMeta==='function')m=programRaceMeta(race)}catch{}
  m=m||{};
  return{
    classRaw:clean(m.class||race?.class||race?.raceClass||race?.yaradi1),
    ageGroup:clean(m.ageGroup||race?.ageGroup||race?.group||race?.yaradi2),
    distance:Number(m.distance||race?.distance||race?.mesafe||0)||0,
    track:clean(m.track||race?.track||race?.pist)
  };
}
function selectedRaceNo(){
  const own=Number($('dcalRaceF635')?.value||0); if(own)return own;
  const saved=Number(st()?.selectedRace||0); if(saved)return saved;
  return raceNo(programRaces()[0]);
}
function selectedRace(){const n=selectedRaceNo();return programRaces().find(r=>raceNo(r)===n)||null}
function context(){
  const race=selectedRace(); if(!race)return null;
  const date=currentDate(),city=currentCity(),cityId=currentCityId(),n=raceNo(race);
  if(!date||!n)return null;
  return{race,raceNo:n,date,city,cityId,meta:metaOf(race)};
}
function targetKey(c){return `${c.date}|${key(c.city)}|${c.raceNo}`}
function selectionKey(c){return `at_ai_daily_calibration_selection_v635|${targetKey(c)}`}
function yearKey(c){return `at_ai_daily_calibration_year_range_v635|${targetKey(c)}`}
function saveSelection(c,set){try{localStorage.setItem(selectionKey(c),JSON.stringify([...set]))}catch{}}
function loadSelection(c){try{const a=JSON.parse(localStorage.getItem(selectionKey(c))||'[]');return new Set(Array.isArray(a)?a:[])}catch{return new Set()}}
function saveYears(c,from,to){try{localStorage.setItem(yearKey(c),JSON.stringify({from,to}))}catch{}}
function loadYears(c,years){
  const min=years[0]||0,max=years.at(-1)||0;
  try{
    const x=JSON.parse(localStorage.getItem(yearKey(c))||'null');
    let from=Number(x?.from)||min,to=Number(x?.to)||max;
    if(!years.includes(from))from=min;
    if(!years.includes(to))to=max;
    if(from>to)[from,to]=[to,from];
    return{from,to};
  }catch{return{from:min,to:max}}
}

function matchType(c,row){
  if(!sameClass(c.meta.classRaw,row.classRaw)||!sameAge(c.meta.ageGroup,row.groupRaw))return'';
  const city=key(c.city)===key(row.city);
  const dist=Number(c.meta.distance)===Number(row.distance);
  const track=sameTrack(c.meta.track,row.track);
  if(city&&dist&&track)return'EXACT';
  if(dist&&track)return'CONDITION_TWIN';
  if(city)return'RACE_FAMILY';
  return'';
}
function similarity(c,row){
  try{
    const C=typeof classSimilarity==='function'?classSimilarity(c.meta.classRaw,row.classRaw):1;
    const A=typeof ageGroupSimilarity==='function'?ageGroupSimilarity(c.meta.ageGroup,row.groupRaw):1;
    const D=typeof distanceSimilarity==='function'?distanceSimilarity(c.meta.distance,row.distance):Math.max(0,1-Math.abs(Number(c.meta.distance)-Number(row.distance))/800);
    const T=typeof trackSimilarity==='function'?trackSimilarity(c.meta.track,row.track):(sameTrack(c.meta.track,row.track)?1:.12);
    const I=typeof citySimilarity==='function'?citySimilarity(c.city,row.city):(key(c.city)===key(row.city)?1:.5);
    return Math.round(Math.max(0,Math.min(1,C*.30+A*.25+D*.18+T*.17+I*.10))*100);
  }catch{return 50}
}
const label=t=>t==='EXACT'?'Tam':t==='CONDITION_TWIN'?'İkiz':'Aile';
const rule=t=>t==='EXACT'?'İl + pist + mesafe aynı':t==='CONDITION_TWIN'?'Pist + mesafe aynı · il değişebilir':'İl aynı · pist / mesafe değişebilir';
const order=t=>t==='EXACT'?0:t==='CONDITION_TWIN'?1:2;
function displayDate(v){const m=clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:clean(v)}

function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    try{
      const q=indexedDB.open(DB);
      q.onsuccess=()=>resolve(q.result);
      q.onerror=q.onblocked=()=>{dbPromise=null;resolve(null)};
    }catch{resolve(null)}
  });
  return dbPromise;
}
async function readMetaYears(){
  const db=await openDb();
  if(!db||!db.objectStoreNames.contains(STORE_META))return[];
  return new Promise(resolve=>{
    try{
      const q=db.transaction(STORE_META,'readonly').objectStore(STORE_META).getAll();
      q.onsuccess=()=>{
        const years=(q.result||[]).map(x=>x?.value??x)
          .filter(x=>x?.status==='complete'&&Number(x?.year))
          .map(x=>Number(x.year));
        resolve([...new Set(years)].sort((a,b)=>a-b));
      };
      q.onerror=()=>resolve([]);
    }catch{resolve([])}
  });
}
async function readYearRange(from,to){
  const db=await openDb();
  if(!db||!db.objectStoreNames.contains(STORE_RACES))return[];
  const lo=Math.min(Number(from)||0,Number(to)||9999);
  const hi=Math.max(Number(from)||0,Number(to)||9999);
  return new Promise(resolve=>{
    const out=[];
    try{
      const tx=db.transaction(STORE_RACES,'readonly');
      const store=tx.objectStore(STORE_RACES);
      const idx=store.indexNames.contains('year')?store.index('year'):null;
      const req=idx?idx.openCursor(IDBKeyRange.bound(lo,hi)):store.openCursor();
      req.onsuccess=e=>{
        const cur=e.target.result;if(!cur)return;
        const row=cur.value?.value??cur.value;
        const y=Number(row?.year||String(row?.date||'').slice(0,4));
        if(row&&y>=lo&&y<=hi)out.push(row);
        cur.continue();
      };
      tx.oncomplete=()=>resolve(out);
      tx.onerror=tx.onabort=()=>resolve([]);
    }catch{resolve([])}
  });
}
async function putRow(row){
  const db=await openDb();
  if(!db||!row?.id||!db.objectStoreNames.contains(STORE_RACES))return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(STORE_RACES,'readwrite');
      tx.objectStore(STORE_RACES).put({key:row.id,value:row,updatedAt:Date.now()});
      tx.oncomplete=()=>resolve(true);
      tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(false)}
  });
}
async function mapLimit(items,limit,fn){
  const xs=Array.isArray(items)?items:[],out=new Array(xs.length);let cursor=0;
  async function worker(){while(true){const i=cursor++;if(i>=xs.length)return;out[i]=await fn(xs[i],i)}}
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),xs.length||1)},worker));
  return out;
}
function groupKey(row){return `${row.date}|${clean(row.cityId)}|${key(row.city)}`}
function sameDayRows(row){
  return rangeRows.filter(x=>x?.date===row?.date&&(clean(x?.cityId)===clean(row?.cityId)||key(x?.city)===key(row?.city)))
    .sort((a,b)=>Number(a?.page||0)-Number(b?.page||0)||Number(a?.rowIndex||0)-Number(b?.rowIndex||0));
}
function rowOrderNo(row){
  const rows=sameDayRows(row);
  const idx=rows.findIndex(x=>x?.id===row?.id);
  return idx>=0?idx+1:0;
}
function dayCandidates(row,day){
  return (Array.isArray(day?.races)?day.races:[]).filter(r=>
    sameClass(r?.class||r?.yaradi1,row?.classRaw) &&
    sameAge(r?.ageGroup||r?.yaradi2,row?.groupRaw) &&
    Number(r?.distance||r?.mesafe||0)===Number(row?.distance) &&
    sameTrack(r?.track||r?.pist,row?.track)
  ).map(r=>Number(r?.no||r?.raceNo)).filter(Boolean).sort((a,b)=>a-b);
}
async function fetchDay(row){
  const q=await fetch(`/api/tjk-race-meta?date=${encodeURIComponent(row.date)}&cityId=${encodeURIComponent(row.cityId||'')}&cityName=${encodeURIComponent(row.city||'')}`,{cache:'no-store'});
  const d=await q.json();
  if(!q.ok||d?.ok===false)throw new Error(d?.error||`HTTP ${q.status}`);
  return d;
}
async function resolveGroup(rows,index,totalGroups){
  let day=null;
  try{day=await fetchDay(rows[0])}catch{}
  let resolved=0;
  for(const row of rows){
    let n=Number(row?.raceNo)||0;
    if(!n&&day){
      const candidates=dayCandidates(row,day);
      if(candidates.length===1)n=candidates[0];
      else if(candidates.length>1){
        const occ=Math.max(1,Number(row?.occurrenceIndex||1));
        n=candidates[Math.min(occ-1,candidates.length-1)]||0;
      }
    }
    if(!n)n=rowOrderNo(row);
    if(n){
      row.raceNo=n;
      row.permanentKey=`${row.date}|${row.cityId||''}|${n}`;
      row.resolutionMethod=day?'DAILY_PROGRAM_OR_ANNUAL_ORDER_F635':'ANNUAL_ORDER_F635';
      row.resolveError=null;
      await putRow(row);
      resolved++;
    }
  }
  const status=$('dcalSelectorStatusF635');
  if(status)status.textContent=`Koşu numaraları çözülüyor: ${index+1}/${totalGroups} gün/şehir · ${resolved}/${rows.length} bu grup`;
}
async function findAndResolve(){
  if(busy||!contextNow)return;
  const from=Number($('dcalYearFromF635')?.value||0),to=Number($('dcalYearToF635')?.value||0);
  if(!from||!to){$('dcalSelectorStatusF635').textContent='Başlangıç ve bitiş yılını seçin.';return}
  busy=true;
  $('dcalFindF635').disabled=true;
  $('dcalApplyF635').disabled=true;
  $('dcalSelectorStatusF635').textContent=`${from}–${to} Yıllık Arşiv okunuyor…`;
  try{
    saveYears(contextNow,from,to);
    rangeRows=await readYearRange(from,to);
    const historical=rangeRows.filter(r=>r?.id&&r?.date&&r.date<contextNow.date);
    matches=historical.map(row=>({row,type:matchType(contextNow,row),score:similarity(contextNow,row)}))
      .filter(x=>x.type)
      .sort((a,b)=>order(a.type)-order(b.type)||b.score-a.score||String(b.row.date).localeCompare(String(a.row.date)));
    if(!matches.length){
      draft.clear();shown=PAGE_SIZE;renderMatches();
      $('dcalSelectorStatusF635').textContent=`${from}–${to} aralığında Tam / İkiz / Aile eşleşmesi yok.`;
      return;
    }

    const unresolved=matches.map(x=>x.row).filter(r=>!Number(r?.raceNo));
    const groups=new Map();
    for(const row of unresolved){
      const k=groupKey(row);
      if(!groups.has(k))groups.set(k,[]);
      groups.get(k).push(row);
    }
    const entries=[...groups.values()];
    if(entries.length){
      await mapLimit(entries,3,(rows,i)=>resolveGroup(rows,i,entries.length));
    }

    const resolvedIds=new Set(matches.filter(x=>Number(x.row?.raceNo)>0).map(x=>x.row.id));
    const saved=loadSelection(contextNow);
    draft=new Set([...saved].filter(id=>resolvedIds.has(id)));
    shown=PAGE_SIZE;
    selectorDialog().querySelectorAll('[data-pick]').forEach(x=>x.classList.remove('active'));
    renderMatches();

    const resolvedCount=resolvedIds.size;
    const missing=matches.length-resolvedCount;
    $('dcalSelectorStatusF635').textContent=
      `${from}–${to}: ${matches.length} eşleşme bulundu · ${resolvedCount} koşu no çözüldü${missing?` · ${missing} çözülemedi`:''}. Şimdi seçim yapıp Hesapla ve Kaydet'e bas.`;
  }catch(e){
    $('dcalSelectorStatusF635').textContent=e?.message||'Yıllık Arşiv okunamadı.';
  }finally{
    busy=false;
    $('dcalFindF635').disabled=false;
    $('dcalApplyF635').disabled=false;
  }
}

function injectStyle(){
  if($('dailyCalibrationStyleF635'))return;
  const style=document.createElement('style');style.id='dailyCalibrationStyleF635';
  style.textContent=`
#analysisDialog[data-daily-calibration-f6018="1"] .toolbar{display:none!important}
#analysisDialog[data-daily-calibration-f6018="1"] #analysisContent>.xcal-wrap{display:none!important}
#${PAGE_ID}{display:grid;gap:12px;padding:2px 0 28px}
#${PAGE_ID} .dc-card{border:1px solid rgba(114,213,255,.18);background:rgba(8,24,39,.72);border-radius:15px;padding:13px}
#${PAGE_ID} .dc-title{font-size:16px;font-weight:900;margin-bottom:5px}
#${PAGE_ID} .dc-copy{font-size:11px;line-height:1.5;color:#aebfd0}
#${PAGE_ID} .dc-select{width:100%;min-height:48px;margin-top:10px}
#${PAGE_ID} .dc-open{width:100%;min-height:50px;margin-top:10px;font-weight:900}
#${PAGE_ID} .dc-target{margin-top:9px;padding:9px 10px;border:1px solid rgba(255,255,255,.08);border-radius:11px;font-size:11px;line-height:1.45}
#${PAGE_ID} .dc-status{border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:10px;font-size:11px;line-height:1.45;color:#c5d8e9}
#${PAGE_ID} .dc-result-row{display:grid;grid-template-columns:72px repeat(5,minmax(0,1fr));gap:5px;align-items:center;font-size:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)}
#${PAGE_ID} .dc-result-row b{font-size:11px}
#${PAGE_ID} .dc-result-row span{text-align:center}
#${DIALOG_ID}{width:min(960px,100vw);height:min(92vh,900px);max-width:none;max-height:none;padding:0;border:1px solid #315d7c;border-radius:16px;background:#071522;color:#eef7ff}
#${DIALOG_ID}::backdrop{background:#000b}
#${DIALOG_ID} .shell{height:100%;display:flex;flex-direction:column}
#${DIALOG_ID} header,#${DIALOG_ID} footer{padding:12px;border-bottom:1px solid #ffffff18}
#${DIALOG_ID} footer{border-top:1px solid #ffffff18;border-bottom:0}
#${DIALOG_ID} .head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
#${DIALOG_ID} h2{margin:0;font-size:18px}
#${DIALOG_ID} .target,#${DIALOG_ID} .tools{padding:10px 12px;border-bottom:1px solid #ffffff18;font-size:11px;line-height:1.5}
#${DIALOG_ID} .years{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#${DIALOG_ID} .years label{display:grid;gap:4px;font-size:10px;color:#9fb2c5}
#${DIALOG_ID} .years select{width:100%;min-height:42px;border-radius:9px;border:1px solid #ffffff24;background:#0b1d2d;color:#eef7ff;padding:0 9px;font-weight:800}
#${DIALOG_ID} .find{width:100%;margin-top:8px;background:#276f9f}
#${DIALOG_ID} .tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:9px}
#${DIALOG_ID} .actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#${DIALOG_ID} button{min-height:40px;border-radius:9px;border:1px solid #ffffff24;background:#ffffff0d;color:#eef7ff;font-weight:800}
#${DIALOG_ID} button.active,#${DIALOG_ID} .apply{background:#276f9f}
#${DIALOG_ID} button:disabled{opacity:.45}
#${DIALOG_ID} .list{flex:1;min-height:0;overflow:auto;padding:6px 10px}
#${DIALOG_ID} .row{display:grid;grid-template-columns:28px 1fr auto;gap:8px;padding:10px 4px;border-bottom:1px solid #ffffff12}
#${DIALOG_ID} .row input{width:20px;height:20px}
#${DIALOG_ID} .title{font-size:12px;font-weight:800}
#${DIALOG_ID} .sub{font-size:10px;line-height:1.5;opacity:.73}
#${DIALOG_ID} .chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
#${DIALOG_ID} .chip,#${DIALOG_ID} .type{padding:3px 6px;border-radius:999px;background:#ffffff12;font-size:9px}
#${DIALOG_ID} .type{font-size:10px;font-weight:800;background:#276f9f55}
#${DIALOG_ID} .status{font-size:10px;margin-top:7px;opacity:.82}
@media(max-width:560px){
 #${DIALOG_ID}{width:100vw;height:100dvh;border-radius:0;border:0}
 #${DIALOG_ID} .tabs{grid-template-columns:repeat(3,1fr)}
 #${DIALOG_ID} .actions{grid-template-columns:1fr 1fr}
 #${DIALOG_ID} .apply{grid-column:1/-1}
}`;
  document.head.appendChild(style);
}

function syncLegacyRace(no){
  const n=String(no||selectedRaceNo());if(!n)return;
  try{st().selectedRace=n;if(typeof save==='function')save()}catch{}
  const legacy=$('xcalRace');if(legacy&&[...legacy.options].some(o=>String(o.value)===n))legacy.value=n;
  const main=$('analysisRace');if(main&&[...main.options].some(o=>String(o.value)===n))main.value=n;
}
async function resultHtml(){
  const c=context();
  if(!c)return '<div class="dc-copy">Koşu seçildiğinde sonuç burada görünür.</div>';
  let entry=null;try{entry=await window.ATExactMatchCalibrationV1691F594?.getForRace?.(c.date,c.city,c.raceNo)}catch{}
  if(!entry)return '<div class="dc-copy">Bu koşu için henüz kalibrasyon kaydı yok. Eşleşmeleri bulup hesaplayın.</div>';
  const stats=entry?.stats||{};
  const head='<div class="dc-result-row"><b>Model</b><span>Top1</span><span>Top2</span><span>Top3</span><span>Top5</span><span>Ort.</span></div>';
  const rows=MODEL_IDS.map(id=>{
    const m=stats[id]||{},cov=Number(m.coverage)||0;
    const cell=(k,rk)=>cov?`${Number(m[k]||0)}/${cov} · %${Math.round(Number(m[rk]||0)*100)}`:'—';
    return `<div class="dc-result-row"><b>${MODEL_LABELS[id]}</b><span>${cell('top1','top1Rate')}</span><span>${cell('top2','top2Rate')}</span><span>${cell('top3','top3Rate')}</span><span>${cell('top5','top5Rate')}</span><span>${m.averageRank??'—'}</span></div>`;
  }).join('');
  return `<div class="dc-copy"><b>${entry.validCount??0}/${entry.historicalCount??0}</b> geçmiş yarış geçerli · ${entry.mode==='MANUAL_SELECTED'?'Manuel seçim':'Otomatik'}</div>${head}${rows}`;
}
async function refreshResult(){const h=$('dcalResultF635');if(h)h.innerHTML=await resultHtml()}

function page(){
  const content=$('analysisContent');if(!content)return null;
  let p=$(PAGE_ID);if(p)return p;
  p=document.createElement('div');p.id=PAGE_ID;
  p.innerHTML=`
<section class="dc-card">
 <div class="dc-title">Günün 5 Model Kalibrasyonu</div>
 <div class="dc-copy">Önce bugünkü hedef koşuyu seç. Yıllık Arşiv bu ekrana girerken yüklenmez.</div>
 <select id="dcalRaceF635" class="dc-select"></select>
 <div id="dcalTargetF635" class="dc-target"></div>
 <button id="dcalOpenF635" type="button" class="primary dc-open">Eşleşmeleri Gör ve Seç</button>
 <div class="dc-copy" style="margin-top:8px">İkinci sayfada önce başlangıç/bitiş yılını seç, sonra <b>Bul ve Koşu Numaralarını Çözümle</b>.</div>
</section>
<div id="dcalStatusF635" class="dc-status">Hazır. Yıllık yarış verisi henüz okunmadı.</div>
<section class="dc-card">
 <div class="dc-title">5 Model Kalibrasyon Sonucu</div>
 <div id="dcalResultF635"></div>
</section>`;
  content.prepend(p);
  $('dcalRaceF635').addEventListener('change',()=>{
    syncLegacyRace(selectedRaceNo());updateTarget();void refreshResult();
    const s=$('dcalStatusF635');if(s)s.textContent='Koşu değişti. Yıllık yarış verisi henüz okunmadı.';
  });
  $('dcalOpenF635').onclick=e=>{e.preventDefault();void openSelector()};
  return p;
}
function fillRaceSelect(){
  const sel=$('dcalRaceF635');if(!sel)return;
  const races=programRaces(),preferred=Number(st()?.selectedRace||0);
  const initial=races.some(r=>raceNo(r)===preferred)?preferred:raceNo(races[0]);
  sel.innerHTML=races.map(r=>{const m=metaOf(r),n=raceNo(r);return `<option value="${n}" ${n===initial?'selected':''}>${n}. Koşu · ${esc(m.classRaw)} · ${esc(m.ageGroup)} · ${m.distance?esc(m.distance)+' m ':''}${esc(m.track)}</option>`}).join('');
  if(initial)syncLegacyRace(initial);
}
function updateTarget(){
  const h=$('dcalTargetF635'),c=context();if(!h)return;
  h.innerHTML=c?`<b>${c.raceNo}. Koşu · ${esc(c.city)} · ${esc(c.date)}</b><br>${esc(c.meta.classRaw)} · ${esc(c.meta.ageGroup)} · ${esc(c.meta.distance)} m ${esc(c.meta.track)}`:'<b>Günün programı yüklenmedi.</b>';
}
function mirrorLegacyStatus(){
  const src=$('xcalStatus'),dst=$('dcalStatusF635');
  if(dst&&src&&clean(src.textContent))dst.textContent=clean(src.textContent);
  void refreshResult();
}
function attachLegacyStatus(){
  statusObserver?.disconnect?.();const src=$('xcalStatus');if(!src)return;
  statusObserver=new MutationObserver(mirrorLegacyStatus);
  statusObserver.observe(src,{childList:true,subtree:true,characterData:true,attributes:true});
}
function buildClean(){
  const d=$('analysisDialog');if(!d||d.dataset.dailyCalibrationF6018!=='1')return false;
  injectStyle();
  if($('dialogEyebrow'))$('dialogEyebrow').textContent='SEÇİLMİŞ GEÇMİŞ YARIŞ BACKTESTİ';
  if($('dialogTitle'))$('dialogTitle').textContent='Günün Koşu Kalibrasyonu';
  const content=$('analysisContent');if(!content)return false;
  const legacy=content.querySelector(':scope > .xcal-wrap')||content.querySelector('.xcal-wrap');if(legacy)legacy.style.display='none';
  const p=page();if(!p)return false;
  fillRaceSelect();updateTarget();attachLegacyStatus();void refreshResult();return true;
}

function selectorDialog(){
  let d=$(DIALOG_ID);if(d)return d;
  d=document.createElement('dialog');d.id=DIALOG_ID;
  d.innerHTML=`<div class="shell">
<header><div class="head"><div><small>AT AI SYSTEM · ${VERSION}</small><h2>Kalibrasyon Eşleşmelerini Seç</h2></div><button id="dcalCloseF635">✕</button></div></header>
<div id="dcalSelectorTargetF635" class="target"></div>
<div class="tools">
 <div class="years"><label>Başlangıç Yılı<select id="dcalYearFromF635"></select></label><label>Bitiş Yılı<select id="dcalYearToF635"></select></label></div>
 <button id="dcalFindF635" class="find">Bul ve Koşu Numaralarını Çözümle</button>
 <div class="tabs">
  <button data-pick="ALL" disabled>Tümü</button><button data-pick="EXACT" disabled>Tam</button><button data-pick="CONDITION_TWIN" disabled>İkiz</button><button data-pick="RACE_FAMILY" disabled>Aile</button>
 </div>
 <div id="dcalSelectorSummaryF635" class="sub" style="margin-top:7px">Önce yılları seçip Bul ve Koşu Numaralarını Çözümle'ye bas.</div>
</div>
<div id="dcalSelectorListF635" class="list"><div class="sub" style="padding:20px">Yıllık yarış kayıtları henüz yüklenmedi.</div></div>
<footer><div class="actions"><button id="dcalClearF635">Seçimi Temizle</button><button id="dcalApplyF635" class="apply" disabled>Hesapla ve Kaydet</button></div><div id="dcalSelectorStatusF635" class="status">Yalnız yıl bilgileri okunuyor…</div></footer>
</div>`;
  document.body.appendChild(d);
  $('dcalCloseF635').onclick=()=>d.close();
  $('dcalFindF635').onclick=()=>void findAndResolve();
  d.querySelectorAll('[data-pick]').forEach(btn=>btn.onclick=()=>{
    const t=btn.dataset.pick;
    draft=new Set(matches.filter(x=>Number(x.row?.raceNo)>0&&(t==='ALL'||x.type===t)).map(x=>x.row.id));
    d.querySelectorAll('[data-pick]').forEach(x=>x.classList.toggle('active',x===btn));
    renderMatches();
    $('dcalSelectorStatusF635').textContent=`${btn.textContent} seçildi · ${draft.size} yarış işaretlendi.`;
  });
  $('dcalClearF635').onclick=()=>{draft.clear();d.querySelectorAll('[data-pick]').forEach(x=>x.classList.remove('active'));renderMatches();$('dcalSelectorStatusF635').textContent='Seçim temizlendi.'};
  $('dcalApplyF635').onclick=()=>void calculateAndSave();
  d.onchange=e=>{const x=e.target?.closest?.('[data-id]');if(!x)return;x.checked?draft.add(x.dataset.id):draft.delete(x.dataset.id);renderSummary()};
  d.onclick=e=>{if(e.target?.id==='dcalMoreF635'){shown+=PAGE_SIZE;renderMatches()}};
  return d;
}
function renderSummary(){
  const h=$('dcalSelectorSummaryF635');if(!h)return;
  const c={EXACT:0,CONDITION_TWIN:0,RACE_FAMILY:0},resolved=matches.filter(x=>Number(x.row?.raceNo)>0);
  resolved.forEach(x=>c[x.type]++);
  h.textContent=`${resolved.length}/${matches.length} çözümlü eşleşme · Tam ${c.EXACT} · İkiz ${c.CONDITION_TWIN} · Aile ${c.RACE_FAMILY} · ${resolved.filter(x=>draft.has(x.row.id)).length} seçili`;
}
function renderMatches(){
  renderSummary();
  const box=$('dcalSelectorListF635');if(!box)return;
  const rows=matches.slice(0,shown);
  box.innerHTML=rows.length?rows.map(x=>{
    const r=x.row,resolved=Number(r?.raceNo)>0;
    return `<label class="row"><input type="checkbox" data-id="${esc(r.id)}" ${draft.has(r.id)?'checked':''} ${resolved?'':'disabled'}>
<div><div class="title">${esc(displayDate(r.date))} · ${esc(r.city)} · ${esc(r.classRaw)}</div>
<div class="sub">${esc(r.groupRaw)}${r.raceName?' · '+esc(r.raceName):''}</div>
<div class="chips"><span class="chip">Pist: ${esc(r.track)}</span><span class="chip">Mesafe: ${esc(r.distance)} m</span><span class="chip">${resolved?r.raceNo+'.K ✓':'Koşu No çözülemedi'}</span></div>
<div class="sub"><b>${esc(rule(x.type))}</b></div></div>
<div><div class="type">${label(x.type)}</div><div class="sub">uyum %${x.score}</div></div></label>`;
  }).join('')+(matches.length>shown?`<button id="dcalMoreF635" style="width:100%">Daha Fazla Göster · ${fmt(matches.length-shown)} kaldı</button>`:''):'<div class="sub" style="padding:20px">Bu yıl aralığında eşleşme yok.</div>';
}
async function openSelector(){
  if(busy)return;
  contextNow=context();const d=selectorDialog();
  if(!d.open){try{d.showModal()}catch{d.setAttribute('open','')}}
  if(!contextNow){$('dcalSelectorStatusF635').textContent='Önce hedef koşuyu seçin.';return}
  rangeRows=[];matches=[];draft.clear();shown=PAGE_SIZE;
  d.querySelectorAll('[data-pick]').forEach(x=>{x.disabled=true;x.classList.remove('active')});
  $('dcalApplyF635').disabled=true;
  $('dcalSelectorListF635').innerHTML='<div class="sub" style="padding:20px">Yıllık yarış kayıtları henüz yüklenmedi.</div>';
  $('dcalSelectorTargetF635').innerHTML=`<b>${contextNow.raceNo}. Koşu · ${esc(contextNow.city)} · ${esc(contextNow.date)}</b><br>${esc(contextNow.meta.classRaw)} · ${esc(contextNow.meta.ageGroup)} · ${esc(contextNow.meta.distance)} m ${esc(contextNow.meta.track)}`;
  $('dcalSelectorStatusF635').textContent='Yüklü yıl bilgileri okunuyor; yarışlar henüz yüklenmiyor.';
  const years=await readMetaYears();
  const from=$('dcalYearFromF635'),to=$('dcalYearToF635');
  const opts=years.map(y=>`<option value="${y}">${y}</option>`).join('');
  from.innerHTML=opts;to.innerHTML=opts;
  if(years.length){
    const saved=loadYears(contextNow,years);
    from.value=String(saved.from);to.value=String(saved.to);
    $('dcalSelectorStatusF635').textContent=`Yüklü yıllar: ${years[0]}–${years.at(-1)}. Aralığı seçip Bul ve Koşu Numaralarını Çözümle'ye bas.`;
  }else{
    $('dcalSelectorStatusF635').textContent='Yıllık Arşivde tamamlanmış yıl bulunamadı. Önce TJK Yıllık Yarış Arşivinden yıl yükleyin.';
    $('dcalFindF635').disabled=true;
  }
}
async function findAndResolve(){
  if(busy||!contextNow)return;
  const from=Number($('dcalYearFromF635')?.value||0),to=Number($('dcalYearToF635')?.value||0);
  if(!from||!to){$('dcalSelectorStatusF635').textContent='Başlangıç ve bitiş yılını seçin.';return}
  busy=true;$('dcalFindF635').disabled=true;$('dcalApplyF635').disabled=true;
  try{
    saveYears(contextNow,from,to);
    $('dcalSelectorStatusF635').textContent=`${from}–${to} arşivi okunuyor…`;
    rangeRows=await readYearRange(from,to);
    const historical=rangeRows.filter(r=>r?.id&&r?.date&&r.date<contextNow.date);
    matches=historical.map(row=>({row,type:matchType(contextNow,row),score:similarity(contextNow,row)}))
      .filter(x=>x.type)
      .sort((a,b)=>order(a.type)-order(b.type)||b.score-a.score||String(b.row.date).localeCompare(String(a.row.date)));
    if(!matches.length){
      renderMatches();$('dcalSelectorStatusF635').textContent=`${from}–${to} aralığında eşleşme bulunamadı.`;return;
    }
    const groups=new Map();
    for(const row of matches.map(x=>x.row).filter(r=>!Number(r?.raceNo))){
      const k=groupKey(row);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);
    }
    const sets=[...groups.values()];
    if(sets.length)await mapLimit(sets,3,(rows,i)=>resolveGroup(rows,i,sets.length));

    const resolved=new Set(matches.filter(x=>Number(x.row?.raceNo)>0).map(x=>x.row.id));
    const saved=loadSelection(contextNow);draft=new Set([...saved].filter(id=>resolved.has(id)));
    shown=PAGE_SIZE;renderMatches();
    selectorDialog().querySelectorAll('[data-pick]').forEach(x=>x.disabled=false);
    $('dcalApplyF635').disabled=false;
    const missing=matches.length-resolved.size;
    $('dcalSelectorStatusF635').textContent=`${matches.length} eşleşme · ${resolved.size} koşu no çözüldü${missing?` · ${missing} çözülemedi`:''}. Seçimini yap ve Hesapla ve Kaydet'e bas.`;
  }catch(e){
    $('dcalSelectorStatusF635').textContent=e?.message||'Arşiv taraması başarısız.';
  }finally{
    busy=false;$('dcalFindF635').disabled=false;
  }
}
async function calculateAndSave(){
  if(busy||!contextNow)return;
  const rows=matches.filter(x=>draft.has(x.row.id)&&Number(x.row?.raceNo)>0).map(x=>x.row);
  if(!rows.length){$('dcalSelectorStatusF635').textContent='Önce en az bir çözümlenmiş eşleşme seçin.';return}
  busy=true;$('dcalApplyF635').disabled=true;
  try{
    const ids=new Set(rows.map(r=>r.id));
    const annualSet=window.ATAnnualArchiveV13?.selectionSet||window.__AT_AA_SELECTED_IDS_V134__;
    if(!annualSet?.clear||!annualSet?.add)throw new Error('Yıllık Arşiv seçim kümesi bulunamadı.');
    annualSet.clear();ids.forEach(id=>annualSet.add(id));
    const legacySet=window.__AT_AA_SELECTED_IDS_V134__;
    if(legacySet&&legacySet!==annualSet&&legacySet?.clear&&legacySet?.add){legacySet.clear();ids.forEach(id=>legacySet.add(id))}
    saveSelection(contextNow,ids);
    syncLegacyRace(contextNow.raceNo);
    try{window.dispatchEvent(new CustomEvent('at-ai:annual-archive-selection',{detail:{selected:ids.size,targetRaceNo:contextNow.raceNo,source:VERSION}}))}catch{}
    $('dcalSelectorStatusF635').textContent=`${ids.size} geçmiş yarış hazır · 5 Model hesaplanıyor ve kaydediliyor…`;
    const status=$('dcalStatusF635');if(status)status.textContent=`${ids.size} geçmiş yarış · hesaplama başladı…`;
    await wait(50);
    try{$(DIALOG_ID)?.close()}catch{}
    const run=$('xcalRunSelected');
    if(!run)throw new Error('Kalibrasyon motoru bulunamadı.');
    run.click();
  }catch(e){
    $('dcalSelectorStatusF635').textContent=e?.message||'Hesaplama başlatılamadı.';
  }finally{
    busy=false;$('dcalApplyF635').disabled=false;
  }
}

function installRenderPatch(){
  const api=window.ATExactMatchCalibrationV1691F594;
  if(!api||typeof api.render!=='function')return false;
  if(api.__dailyLazyF635)return true;
  const base=api.render.bind(api);
  api.render=function(...args){const out=base(...args);try{buildClean()}catch(e){console.warn('[AT AI]',VERSION,e)}return out};
  api.__dailyLazyF635=VERSION;return true;
}
function wake(){
  installRenderPatch();
  const d=$('analysisDialog');
  if(d?.open&&d.dataset.dailyCalibrationF6018==='1')setTimeout(buildClean,0);
}
if(!installRenderPatch()){
  const timer=setInterval(()=>{if(installRenderPatch())clearInterval(timer)},50);
  setTimeout(()=>clearInterval(timer),5000);
}
try{
  const d=$('analysisDialog');
  if(d)new MutationObserver(wake).observe(d,{attributes:true,attributeFilter:['open','data-view','data-daily-calibration-f6018']});
}catch{}
window.addEventListener('pageshow',()=>setTimeout(wake,50),{passive:true});
setTimeout(wake,100);

window.ATDailyCalibrationLazyV635={version:VERSION,openSelector,findAndResolve,calculateAndSave,refresh:buildClean};
console.info('[AT AI]',VERSION,'active — meta-only open; user selects years before archive scan; grouped race-number resolution; Calculate and Save.');
})();