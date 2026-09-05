/* AT AI Mobil — V16.9.1F60.35 Daily Calibration staged annual-archive flow
   Flow:
   1) choose target race
   2) open selector (only year metadata is read)
   3) choose start/end year
   4) "Bul ve Koşu Numaralarını Çözümle" reads only selected years, builds Career-style matches,
      resolves race numbers locally from annual archive date/city row order, and persists them
   5) bulk/manual select
   6) "Hesapla ve Kaydet" sends resolved rows to the hidden F59.4 five-model backtest engine
*/
(() => {
'use strict';
if (window.__AT_DAILY_CALIBRATION_STAGED_V1691F635__) return;
window.__AT_DAILY_CALIBRATION_STAGED_V1691F635__ = true;

const VERSION='DAILY-CALIBRATION-STAGED-V16.9.1F60.35';
const DB='at_ai_tjk_annual_archive_v13';
const STORE='races';
const META='meta';
const PAGE_ID='dailyCalibrationPageF635';
const DIALOG_ID='dailyCalibrationSelectorF635';
const PAGE_SIZE=100;
const MODEL_IDS=['composite','exact','twin','family','career'];
const MODEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};

let dbPromise=null;
let selectedYearRows=[];
let matches=[];
let draft=new Set();
let contextNow=null;
let shown=PAGE_SIZE;
let busy=false;
let statusObserver=null;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
const key=v=>upper(v).replace(/[^A-Z0-9]+/g,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('tr-TR');

function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||{}}
function currentDate(){return clean(st()?.date||$('raceDate')?.value)}
function currentCityId(){return clean(st()?.city||$('citySelect')?.value)}
function currentCity(){
  const s=st(),id=currentCityId();
  try{if(typeof getCityName==='function')return clean(getCityName())}catch{}
  return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id;
}
function programRaces(){return (Array.isArray(st()?.races)?st().races:[]).filter(Boolean).sort((a,b)=>Number(a?.no||a?.raceNo||0)-Number(b?.no||b?.raceNo||0))}
function raceNo(r){return Number(r?.no??r?.raceNo??0)||0}
function sameClass(a,b){try{if(typeof window.canonicalClassKeyV125==='function')return window.canonicalClassKeyV125(a)===window.canonicalClassKeyV125(b)}catch{}return key(a)===key(b)}
function sameAge(a,b){return key(a)===key(b)}
function trackKey(v){const t=upper(v);if(t.includes('CIM'))return'CIM';if(t.includes('KUM'))return'KUM';if(t.includes('SENTETIK'))return'SENTETIK';return key(v)}
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
  const own=Number($('dcalRaceF635')?.value||0);
  if(own)return own;
  const saved=Number(st()?.selectedRace||0);
  if(saved)return saved;
  return raceNo(programRaces()[0]);
}
function selectedRace(){const n=selectedRaceNo();return programRaces().find(r=>raceNo(r)===n)||null}
function context(){
  const race=selectedRace();if(!race)return null;
  const date=currentDate(),city=currentCity(),cityId=currentCityId(),n=raceNo(race);
  if(!date||!n)return null;
  return{race,raceNo:n,date,city,cityId,meta:metaOf(race)};
}
function targetKey(c){return `${c.date}|${key(c.city)}|${c.raceNo}`}
function savedSelectionKey(c){return `at_ai_daily_calibration_selection_v635|${targetKey(c)}`}
function savedYearsKey(c){return `at_ai_daily_calibration_years_v635|${targetKey(c)}`}
function loadSavedSelection(c){try{const a=JSON.parse(localStorage.getItem(savedSelectionKey(c))||'[]');return new Set(Array.isArray(a)?a:[])}catch{return new Set()}}
function saveSelection(c,set){try{localStorage.setItem(savedSelectionKey(c),JSON.stringify([...set]))}catch{}}
function saveYears(c,from,to){try{localStorage.setItem(savedYearsKey(c),JSON.stringify({from,to}))}catch{}}
function loadYears(c,years){
  const min=years[0]||0,max=years.at(-1)||0;
  try{
    const x=JSON.parse(localStorage.getItem(savedYearsKey(c))||'null');
    let from=Number(x?.from)||min,to=Number(x?.to)||max;
    if(!years.includes(from))from=min;if(!years.includes(to))to=max;
    if(from>to)[from,to]=[to,from];
    return{from,to};
  }catch{return{from:min,to:max}}
}

function matchType(c,r){
  const m=c.meta||{};
  if(!sameClass(m.classRaw,r.classRaw)||!sameAge(m.ageGroup,r.groupRaw))return'';
  const city=key(c.city)===key(r.city);
  const dist=Number(m.distance)===Number(r.distance);
  const track=sameTrack(m.track,r.track);
  if(city&&dist&&track)return'EXACT';
  if(dist&&track)return'CONDITION_TWIN';
  if(city)return'RACE_FAMILY';
  return'';
}
function similarity(c,r){
  try{
    const m=c.meta||{};
    const C=typeof classSimilarity==='function'?classSimilarity(m.classRaw,r.classRaw):1;
    const A=typeof ageGroupSimilarity==='function'?ageGroupSimilarity(m.ageGroup,r.groupRaw):1;
    const D=typeof distanceSimilarity==='function'?distanceSimilarity(m.distance,r.distance):Math.max(0,1-Math.abs(Number(m.distance)-Number(r.distance))/800);
    const T=typeof trackSimilarity==='function'?trackSimilarity(m.track,r.track):(sameTrack(m.track,r.track)?1:.12);
    const I=typeof citySimilarity==='function'?citySimilarity(c.city,r.city):(key(c.city)===key(r.city)?1:.5);
    return Math.round(Math.max(0,Math.min(1,C*.30+A*.25+D*.18+T*.17+I*.10))*100);
  }catch{return 50}
}
const label=t=>t==='EXACT'?'Tam':t==='CONDITION_TWIN'?'İkiz':'Aile';
const rule=t=>t==='EXACT'?'İl + pist + mesafe aynı':t==='CONDITION_TWIN'?'Pist + mesafe aynı · il değişebilir':'İl aynı · pist / mesafe değişebilir';
const order=t=>t==='EXACT'?0:t==='CONDITION_TWIN'?1:2;
function displayDate(v){const m=clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:clean(v)}
function rowYear(r){return Number(r?.year||String(r?.date||'').slice(0,4))||0}

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
async function loadedYears(){
  const db=await openDb();
  if(!db||!db.objectStoreNames.contains(META))return[];
  return new Promise(resolve=>{
    try{
      const q=db.transaction(META,'readonly').objectStore(META).getAll();
      q.onsuccess=()=>{
        const rows=(q.result||[]).map(x=>x?.value??x).filter(Boolean);
        const years=[...new Set(rows.filter(x=>x?.status==='complete'&&Number(x?.year)).map(x=>Number(x.year)))].sort((a,b)=>a-b);
        resolve(years);
      };
      q.onerror=()=>resolve([]);
    }catch{resolve([])}
  });
}
function selectableYears(){
  const current=Math.max(2000,new Date().getFullYear());
  return Array.from({length:current-2000+1},(_,i)=>2000+i);
}
async function rowsForYears(from,to){
  const db=await openDb();
  if(!db||!db.objectStoreNames.contains(STORE))return[];
  const lo=Math.min(Number(from)||0,Number(to)||9999),hi=Math.max(Number(from)||0,Number(to)||9999);
  return new Promise(resolve=>{
    const out=[];
    try{
      const store=db.transaction(STORE,'readonly').objectStore(STORE);
      const index=store.indexNames.contains('year')?store.index('year'):null;
      const q=index?index.openCursor(IDBKeyRange.bound(lo,hi)):store.openCursor();
      q.onsuccess=e=>{
        const cur=e.target.result;if(!cur)return;
        const row=cur.value?.value??cur.value;
        if(row&&rowYear(row)>=lo&&rowYear(row)<=hi)out.push(row);
        cur.continue();
      };
      q.transaction?.addEventListener?.('complete',()=>resolve(out));
      const tx=store.transaction;
      tx.oncomplete=()=>resolve(out);
      tx.onerror=tx.onabort=()=>resolve([]);
    }catch{resolve([])}
  });
}
async function putAnnual(row){
  const db=await openDb();
  if(!db||!row?.id||!db.objectStoreNames.contains(STORE))return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
      store.put({key:row.id,value:row,updatedAt:Date.now()});
      tx.oncomplete=()=>resolve(true);
      tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(false)}
  });
}

function resolveLocally(row,universe){
  if(Number(row?.raceNo)>0)return Number(row.raceNo);
  const sameDay=universe.filter(x=>x?.date===row?.date&&(clean(x?.cityId)===clean(row?.cityId)||key(x?.city)===key(row?.city)))
    .sort((a,b)=>Number(a?.page||0)-Number(b?.page||0)||Number(a?.rowIndex||0)-Number(b?.rowIndex||0));
  const idx=sameDay.findIndex(x=>x?.id===row?.id);
  return idx>=0?idx+1:0;
}
async function resolveMatchRows(list,universe){
  let done=0;
  const out=[];
  for(const x of list){
    const r=x.row;
    const n=resolveLocally(r,universe);
    if(n){
      r.raceNo=n;
      r.permanentKey=`${r.date}|${r.cityId||''}|${n}`;
      r.resolutionMethod=r.resolutionMethod||'ANNUAL_ROW_ORDER_F635';
      await putAnnual(r);
      out.push({...x,row:r,resolved:true});
    }else out.push({...x,resolved:false});
    done++;
    const s=$('dcalSelectorStatusF635');if(s)s.textContent=`Koşu numaraları çözümleniyor: ${done}/${list.length}`;
    if(done%20===0)await new Promise(r=>setTimeout(r,0));
  }
  return out;
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
#${PAGE_ID} .dc-copy,#${PAGE_ID} .dc-note{font-size:11px;line-height:1.5;color:#aebfd0}
#${PAGE_ID} .dc-select{width:100%;min-height:48px;margin-top:10px}
#${PAGE_ID} .dc-open{width:100%;min-height:50px;margin-top:10px;font-weight:900}
#${PAGE_ID} .dc-target,#${PAGE_ID} .dc-status{margin-top:9px;padding:10px;border:1px solid rgba(255,255,255,.09);border-radius:11px;font-size:11px;line-height:1.45}
#${PAGE_ID} .dc-result-row{display:grid;grid-template-columns:72px repeat(5,minmax(0,1fr));gap:5px;align-items:center;font-size:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)}
#${DIALOG_ID}{width:min(960px,100vw);height:min(92vh,900px);max-width:none;max-height:none;padding:0;border:1px solid #315d7c;border-radius:16px;background:#071522;color:#eef7ff}
#${DIALOG_ID}::backdrop{background:#000b}
#${DIALOG_ID} .shell{height:100%;display:flex;flex-direction:column}
#${DIALOG_ID} header,#${DIALOG_ID} footer{padding:12px;border-bottom:1px solid #ffffff18}
#${DIALOG_ID} footer{border-top:1px solid #ffffff18;border-bottom:0}
#${DIALOG_ID} .head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
#${DIALOG_ID} h2{margin:0;font-size:18px}
#${DIALOG_ID} .target,#${DIALOG_ID} .tools{padding:10px 12px;border-bottom:1px solid #ffffff18;font-size:11px;line-height:1.5}
#${DIALOG_ID} .years{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#${DIALOG_ID} .years label{display:grid;gap:4px;color:#9fb2c5;font-size:10px}
#${DIALOG_ID} select{min-height:40px;border-radius:9px;border:1px solid #ffffff24;background:#0b1d2d;color:#eef7ff;padding:0 9px}
#${DIALOG_ID} .find{width:100%;margin-top:9px;background:#257eb5!important}
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
#${DIALOG_ID} .bad{color:#ff9cab}
#${DIALOG_ID} .status{font-size:10px;margin-top:7px;opacity:.85}
@media(max-width:560px){
 #${DIALOG_ID}{width:100vw;height:100dvh;border-radius:0;border:0}
 #${DIALOG_ID} .tabs{grid-template-columns:repeat(3,1fr)}
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
  const c=context();if(!c)return '<div class="dc-copy">Koşu seçildiğinde kalibrasyon sonucu burada görünür.</div>';
  let entry=null;try{entry=await window.ATExactMatchCalibrationV1691F594?.getForRace?.(c.date,c.city,c.raceNo)}catch{}
  if(!entry)return '<div class="dc-copy">Bu koşu için henüz kalibrasyon kaydı yok. Eşleşmeleri seçip hesaplayın.</div>';
  const stats=entry?.stats||{};
  const head='<div class="dc-result-row"><b>Model</b><span>Top1</span><span>Top2</span><span>Top3</span><span>Top5</span><span>Ort.</span></div>';
  const rows=MODEL_IDS.map(id=>{const m=stats[id]||{},cov=Number(m.coverage)||0;const cell=(k,r)=>cov?`${Number(m[k]||0)}/${cov} · %${Math.round(Number(m[r]||0)*100)}`:'—';return `<div class="dc-result-row"><b>${MODEL_LABELS[id]}</b><span>${cell('top1','top1Rate')}</span><span>${cell('top2','top2Rate')}</span><span>${cell('top3','top3Rate')}</span><span>${cell('top5','top5Rate')}</span><span>${m.averageRank??'—'}</span></div>`}).join('');
  return `<div class="dc-copy"><b>${entry.validCount??0}/${entry.historicalCount??0}</b> geçmiş yarış geçerli · ${entry.mode==='MANUAL_SELECTED'?'Manuel seçim':'Otomatik'}</div>${head}${rows}`;
}
async function refreshResult(){const host=$('dcalResultF635');if(host)host.innerHTML=await resultHtml()}

function page(){
  const content=$('analysisContent');if(!content)return null;
  let p=$(PAGE_ID);if(p)return p;
  p=document.createElement('div');p.id=PAGE_ID;
  p.innerHTML=`
<section class="dc-card">
 <div class="dc-title">Günün 5 Model Kalibrasyonu</div>
 <div class="dc-copy">Hedef koşuyu seç. Yıllık Arşiv, ikinci ekranda yıl aralığını seçip <b>Bul ve Koşu Numaralarını Çözümle</b> dediğinde okunur.</div>
 <select id="dcalRaceF635" class="dc-select"></select>
 <div id="dcalTargetF635" class="dc-target"></div>
 <button id="dcalOpenF635" type="button" class="primary dc-open">Eşleşmeleri Gör ve Seç</button>
</section>
<div id="dcalStatusF635" class="dc-status">Hazır.</div>
<section class="dc-card"><div class="dc-title">5 Model Kalibrasyon Sonucu</div><div id="dcalResultF635"></div></section>`;
  content.prepend(p);
  $('dcalRaceF635').addEventListener('change',()=>{
    const n=selectedRaceNo();syncLegacyRace(n);updateTarget();void refreshResult();
    const s=$('dcalStatusF635');if(s)s.textContent=`${n}. Koşu seçildi.`;
  });
  $('dcalOpenF635').onclick=e=>{e.preventDefault();void openSelector()};
  return p;
}
function fillRaceSelect(){
  const select=$('dcalRaceF635');if(!select)return;
  const races=programRaces(),preferred=Number(st()?.selectedRace||0);
  const initial=races.some(r=>raceNo(r)===preferred)?preferred:raceNo(races[0]);
  select.innerHTML=races.map(r=>{const m=metaOf(r),n=raceNo(r);return `<option value="${n}" ${n===initial?'selected':''}>${n}. Koşu · ${esc(m.classRaw)} · ${esc(m.ageGroup)} · ${m.distance?esc(m.distance)+' m ':''}${esc(m.track)}</option>`}).join('');
  if(initial)syncLegacyRace(initial);
}
function updateTarget(){
  const h=$('dcalTargetF635'),c=context();if(!h)return;
  h.innerHTML=c?`<b>${c.raceNo}. Koşu · ${esc(c.city)} · ${esc(c.date)}</b><br>${esc(c.meta.classRaw)} · ${esc(c.meta.ageGroup)} · ${esc(c.meta.distance)} m ${esc(c.meta.track)}`:'Günün programı yüklenmedi.';
}
function mirrorLegacyStatus(){const src=$('xcalStatus'),dst=$('dcalStatusF635');if(dst&&src&&clean(src.textContent))dst.textContent=clean(src.textContent);void refreshResult()}
function attachLegacyStatus(){statusObserver?.disconnect?.();const src=$('xcalStatus');if(!src)return;statusObserver=new MutationObserver(mirrorLegacyStatus);statusObserver.observe(src,{childList:true,subtree:true,characterData:true,attributes:true})}
function buildClean(){
  const dialog=$('analysisDialog');if(!dialog||dialog.dataset.dailyCalibrationF6018!=='1')return false;
  injectStyle();
  if($('dialogEyebrow'))$('dialogEyebrow').textContent='SEÇİLMİŞ GEÇMİŞ YARIŞ BACKTESTİ';
  if($('dialogTitle'))$('dialogTitle').textContent='Günün Koşu Kalibrasyonu';
  const content=$('analysisContent');if(!content)return false;
  const legacy=content.querySelector(':scope > .xcal-wrap')||content.querySelector('.xcal-wrap');if(legacy)legacy.style.display='none';
  if(!page())return false;fillRaceSelect();updateTarget();attachLegacyStatus();void refreshResult();return true;
}

function selectorDialog(){
  let d=$(DIALOG_ID);if(d)return d;
  d=document.createElement('dialog');d.id=DIALOG_ID;
  d.innerHTML=`<div class="shell">
<header><div class="head"><div><small>AT AI SYSTEM · ${VERSION}</small><h2>Kalibrasyon Eşleşmelerini Seç</h2></div><button id="dcalCloseF635">✕</button></div></header>
<div id="dcalSelectorTargetF635" class="target"></div>
<div class="tools">
 <div class="years"><label>Başlangıç Yılı<select id="dcalYearFromF635"></select></label><label>Bitiş Yılı<select id="dcalYearToF635"></select></label></div>
 <button id="dcalFindResolveF635" class="find">Bul ve Koşu Numaralarını Çözümle</button>
 <div class="tabs"><button data-pick="ALL" disabled>Tümü</button><button data-pick="EXACT" disabled>Tam</button><button data-pick="CONDITION_TWIN" disabled>İkiz</button><button data-pick="RACE_FAMILY" disabled>Aile</button></div>
 <div id="dcalSelectorSummaryF635" class="sub" style="margin-top:7px">Önce yıl aralığını seçip bul/çözümle düğmesine basın.</div>
</div>
<div id="dcalSelectorListF635" class="list"><div class="sub" style="padding:20px">Yıllık yarış kayıtları henüz okunmadı.</div></div>
<footer><div class="actions"><button id="dcalClearF635">Seçimi Temizle</button><button id="dcalApplyF635" class="apply" disabled>Hesapla ve Kaydet</button></div><div id="dcalSelectorStatusF635" class="status">Yıl seçimini bekliyor.</div></footer>
</div>`;
  document.body.appendChild(d);
  $('dcalCloseF635').onclick=()=>d.close();
  $('dcalFindResolveF635').onclick=()=>void findAndResolve();
  d.querySelectorAll('[data-pick]').forEach(btn=>btn.onclick=()=>{
    const t=btn.dataset.pick;
    draft=new Set(matches.filter(x=>x.resolved&&(t==='ALL'||x.type===t)).map(x=>x.row.id));
    d.querySelectorAll('[data-pick]').forEach(x=>x.classList.toggle('active',x===btn));
    renderMatches();
  });
  $('dcalClearF635').onclick=()=>{draft.clear();d.querySelectorAll('[data-pick]').forEach(x=>x.classList.remove('active'));renderMatches()};
  $('dcalApplyF635').onclick=()=>void applyAndSave();
  d.onchange=e=>{const x=e.target?.closest?.('[data-id]');if(!x)return;x.checked?draft.add(x.dataset.id):draft.delete(x.dataset.id);renderSummary()};
  d.onclick=e=>{if(e.target?.id==='dcalMoreF635'){shown+=PAGE_SIZE;renderMatches()}};
  return d;
}
function fillYears(years){
  const a=$('dcalYearFromF635'),b=$('dcalYearToF635');if(!a||!b)return;
  const html=years.map(y=>`<option value="${y}">${y}</option>`).join('');
  a.innerHTML=html;b.innerHTML=html;
  const saved=loadYears(contextNow,years);
  if(saved.from)a.value=String(saved.from);
  if(saved.to)b.value=String(saved.to);
}
function selectedYears(){
  let from=Number($('dcalYearFromF635')?.value||0),to=Number($('dcalYearToF635')?.value||0);
  if(from&&to&&from>to)[from,to]=[to,from];
  return{from,to};
}
function renderSummary(){
  const h=$('dcalSelectorSummaryF635');if(!h)return;
  const c={EXACT:0,CONDITION_TWIN:0,RACE_FAMILY:0};matches.filter(x=>x.resolved).forEach(x=>c[x.type]++);
  const resolved=matches.filter(x=>x.resolved).length,unresolved=matches.length-resolved;
  h.textContent=`${matches.length} eşleşme · ${resolved} koşu no çözüldü${unresolved?` · ${unresolved} çözülemedi`:''} · Tam ${c.EXACT} · İkiz ${c.CONDITION_TWIN} · Aile ${c.RACE_FAMILY} · ${[...draft].filter(id=>matches.some(x=>x.resolved&&x.row.id===id)).length} seçili`;
}
function renderMatches(){
  renderSummary();
  const box=$('dcalSelectorListF635');if(!box)return;
  const rows=matches.slice(0,shown);
  box.innerHTML=rows.length?rows.map(x=>{
    const r=x.row,disabled=x.resolved?'':'disabled',checked=draft.has(r.id)&&x.resolved?'checked':'';
    const cd=key(contextNow.city)!==key(r.city),dd=Number(contextNow.meta.distance)!==Number(r.distance),td=!sameTrack(contextNow.meta.track,r.track);
    return `<label class="row"><input type="checkbox" data-id="${esc(r.id)}" ${checked} ${disabled}>
<div><div class="title">${esc(displayDate(r.date))} · ${esc(r.city)} · ${esc(r.classRaw)}</div>
<div class="sub">${esc(r.groupRaw)}${r.raceName?' · '+esc(r.raceName):''}</div>
<div class="chips"><span class="chip">İl: ${esc(r.city)}${cd?' ↔':''}</span><span class="chip">Pist: ${esc(r.track)}${td?' ↔':''}</span><span class="chip">Mesafe: ${esc(r.distance)} m${dd?' ↔':''}</span><span class="chip ${x.resolved?'':'bad'}">${x.resolved?esc(r.raceNo)+'.K':'Koşu No yok'}</span></div>
<div class="sub"><b>${esc(rule(x.type))}</b></div></div>
<div><div class="type">${label(x.type)}</div><div class="sub">uyum %${x.score}</div></div></label>`;
  }).join('')+(matches.length>shown?`<button id="dcalMoreF635" style="width:100%">Daha Fazla Göster · ${fmt(matches.length-shown)} kaldı</button>`:'')
  :'<div class="sub" style="padding:20px">Seçilen yıl aralığında eşleşme bulunamadı.</div>';
}

async function openSelector(){
  if(busy)return;
  contextNow=context();const d=selectorDialog();if(!d.open){try{d.showModal()}catch{d.setAttribute('open','')}}
  if(!contextNow){$('dcalSelectorStatusF635').textContent='Önce hedef koşuyu seçin.';return}
  busy=true;
  try{
    $('dcalSelectorStatusF635').textContent='Yıl seçimi hazırlanıyor…';
    const years=selectableYears();
    const loaded=await loadedYears();
    fillYears(years);
    selectedYearRows=[];matches=[];draft.clear();shown=PAGE_SIZE;
    d.querySelectorAll('[data-pick]').forEach(x=>{x.disabled=true;x.classList.remove('active')});
    $('dcalApplyF635').disabled=true;
    $('dcalFindResolveF635').disabled=false;
    $('dcalSelectorTargetF635').innerHTML=`<b>${contextNow.raceNo}. Koşu · ${esc(contextNow.city)} · ${esc(contextNow.date)}</b><br>${esc(contextNow.meta.classRaw)} · ${esc(contextNow.meta.ageGroup)} · ${esc(contextNow.meta.distance)} m ${esc(contextNow.meta.track)}<br>Seçilebilir yıl: 2000–${years.at(-1)} · Yerel arşivde hazır: ${loaded.length?loaded.join(', '):'yok'}`;
    $('dcalSelectorListF635').innerHTML='<div class="sub" style="padding:20px">Başlangıç ve bitiş yılını serbestçe seçin. Yarış arşivi henüz okunmadı.</div>';
    $('dcalSelectorSummaryF635').textContent='Önce yıl aralığını seçip Bul ve Koşu Numaralarını Çözümle düğmesine basın.';
    $('dcalSelectorStatusF635').textContent='Yıl aralığını seçebilirsiniz. Yüklü olmayan yıllar aramada veri üretmez.';
  }finally{busy=false}
}

async function findAndResolve(){
  if(busy||!contextNow)return;
  const {from,to}=selectedYears();
  if(!from||!to){$('dcalSelectorStatusF635').textContent='Başlangıç ve bitiş yılını seçin.';return}
  busy=true;$('dcalFindResolveF635').disabled=true;$('dcalApplyF635').disabled=true;
  try{
    saveYears(contextNow,from,to);
    const loaded=await loadedYears();
    const requested=Array.from({length:to-from+1},(_,i)=>from+i);
    const missing=requested.filter(y=>!loaded.includes(y));
    $('dcalSelectorStatusF635').textContent=`${from}–${to} arşivi okunuyor${missing.length?` · yüklü olmayan: ${missing.join(', ')}`:''}…`;
    selectedYearRows=await rowsForYears(from,to);
    const raw=selectedYearRows.filter(r=>r?.id&&r?.date&&r.date<contextNow.date)
      .map(row=>({row,type:matchType(contextNow,row),score:similarity(contextNow,row)}))
      .filter(x=>x.type)
      .sort((a,b)=>order(a.type)-order(b.type)||b.score-a.score||String(b.row.date).localeCompare(String(a.row.date)));
    $('dcalSelectorStatusF635').textContent=`${raw.length} eşleşme bulundu · koşu numaraları çözümleniyor…`;
    matches=await resolveMatchRows(raw,selectedYearRows);
    const allowed=new Set(matches.filter(x=>x.resolved).map(x=>x.row.id));
    const saved=loadSavedSelection(contextNow);
    draft=new Set([...saved].filter(id=>allowed.has(id)));
    shown=PAGE_SIZE;
    const hasResolved=allowed.size>0;
    $(DIALOG_ID).querySelectorAll('[data-pick]').forEach(x=>x.disabled=!hasResolved);
    $('dcalApplyF635').disabled=!hasResolved;
    renderMatches();
    const unresolved=matches.filter(x=>!x.resolved).length;
    $('dcalSelectorStatusF635').textContent=hasResolved
      ? `${allowed.size} koşu numarası hazır${unresolved?` · ${unresolved} çözülemedi`:''}${missing.length?` · arşivde olmayan yıllar: ${missing.join(', ')}`:''}. Seçimleri yapıp Hesapla ve Kaydet'e basın.`
      : (selectedYearRows.length ? 'Eşleşme bulundu ancak koşu numarası çözülemedi.' : `Seçilen aralıkta yerel arşiv verisi yok${missing.length?` · eksik yıllar: ${missing.join(', ')}`:''}.`);
  }catch(e){
    $('dcalSelectorStatusF635').textContent=e?.message||'Arşiv okunamadı.';
  }finally{busy=false;$('dcalFindResolveF635').disabled=false}
}

async function applyAndSave(){
  if(busy||!contextNow)return;
  const chosen=matches.filter(x=>x.resolved&&draft.has(x.row.id));
  if(!chosen.length){$('dcalSelectorStatusF635').textContent='En az bir çözümlenmiş eşleşme seçin.';return}
  busy=true;$('dcalApplyF635').disabled=true;
  try{
    const ids=new Set(chosen.map(x=>x.row.id));
    const annualSet=window.ATAnnualArchiveV13?.selectionSet||window.__AT_AA_SELECTED_IDS_V134__;
    if(!annualSet?.clear||!annualSet?.add)throw new Error('Yıllık Arşiv seçim kümesi bulunamadı.');
    annualSet.clear();ids.forEach(id=>annualSet.add(id));
    const legacySet=window.__AT_AA_SELECTED_IDS_V134__;
    if(legacySet&&legacySet!==annualSet&&legacySet?.clear&&legacySet?.add){legacySet.clear();ids.forEach(id=>legacySet.add(id))}
    saveSelection(contextNow,ids);syncLegacyRace(contextNow.raceNo);
    try{window.dispatchEvent(new CustomEvent('at-ai:annual-archive-selection',{detail:{selected:ids.size,targetRaceNo:contextNow.raceNo,source:VERSION}}))}catch{}
    $('dcalSelectorStatusF635').textContent=`${ids.size} geçmiş yarış seçildi · hesaplama ve kayıt başlatılıyor…`;
    const s=$('dcalStatusF635');if(s)s.textContent=`${ids.size} geçmiş yarış · 5 Model kalibrasyonu hesaplanıyor ve kaydediliyor…`;
    setTimeout(()=>{
      try{$(DIALOG_ID)?.close()}catch{}
      syncLegacyRace(contextNow.raceNo);
      const run=$('xcalRunSelected');
      if(run)run.click();
      else if(s)s.textContent='Kalibrasyon motoru bulunamadı.';
    },80);
  }catch(e){$('dcalSelectorStatusF635').textContent=e?.message||'Hesaplama başlatılamadı.'}
  finally{busy=false;$('dcalApplyF635').disabled=false}
}

function installRenderPatch(){
  const api=window.ATExactMatchCalibrationV1691F594;
  if(!api||typeof api.render!=='function')return false;
  if(api.__dailyStagedF635)return true;
  const base=api.render.bind(api);
  api.render=function(...args){const out=base(...args);try{buildClean()}catch(e){console.warn('[AT AI]',VERSION,e)}return out};
  api.__dailyStagedF635=VERSION;return true;
}
function wake(){installRenderPatch();const d=$('analysisDialog');if(d?.open&&d.dataset.dailyCalibrationF6018==='1')setTimeout(buildClean,0)}
if(!installRenderPatch()){const t=setInterval(()=>{if(installRenderPatch())clearInterval(t)},50);setTimeout(()=>clearInterval(t),5000)}
try{const d=$('analysisDialog');if(d){const o=new MutationObserver(wake);o.observe(d,{attributes:true,attributeFilter:['open','data-view','data-daily-calibration-f6018'],childList:true,subtree:false})}}catch{}
window.addEventListener('pageshow',()=>setTimeout(wake,50),{passive:true});setTimeout(wake,100);

window.ATDailyCalibrationStagedV635={version:VERSION,openSelector,findAndResolve,refresh:buildClean};
console.info('[AT AI]',VERSION,'active — free 2000-current year range; annual races load only after Find/Resolve; local race-number resolution; Calculate/Save last.');
})();