/* AT AI Mobil — V16.9.1F60.33 Clean Daily Calibration = Career selector flow
   Visible flow:
   1) choose today's race
   2) Eşleşmeleri Gör ve Seç
   3) same Career-style annual archive selector: Tümü/Tam/İkiz/Aile + manual checkboxes
   4) Seçimi Uygula ve Hesapla
   Legacy F59.4 engine stays hidden in DOM and performs the historical five-model winner backtest.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CALIBRATION_CAREER_FLOW_V1691F633__) return;
window.__AT_DAILY_CALIBRATION_CAREER_FLOW_V1691F633__ = true;

const VERSION='DAILY-CALIBRATION-CAREER-FLOW-V16.9.1F60.32';
const DB='at_ai_tjk_annual_archive_v13';
const STORE='races';
const PAGE_ID='dailyCalibrationPageF633';
const DIALOG_ID='dailyCalibrationSelectorF633';
const PAGE_SIZE=100;
const MODEL_IDS=['composite','exact','twin','family','career'];
const MODEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};
let dbPromise=null;
let allRows=[];
let allMatches=[];
let matches=[];
let availableYears=[];
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
function sameTrack(a,b){const A=upper(a),B=upper(b);for(const t of['CIM','KUM','SENTETIK'])if(A.includes(t)&&B.includes(t))return true;return key(a)===key(b)}
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
  const own=Number($('dcalRaceF633')?.value||0);
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
function savedKey(c){return `at_ai_daily_calibration_selection_v632|${targetKey(c)}`}
function loadSaved(c){try{const a=JSON.parse(localStorage.getItem(savedKey(c))||'[]');return new Set(Array.isArray(a)?a:[])}catch{return new Set()}}
function saveSelected(c,set){try{localStorage.setItem(savedKey(c),JSON.stringify([...set]))}catch{}}

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

function rowYear(row){return Number(row?.year||String(row?.date||'').slice(0,4))||0}
function yearRangeKey(c){return `at_ai_daily_calibration_year_range_v633|${targetKey(c)}`}
function loadYearRange(c,years){
  const min=years[0]||0,max=years.at(-1)||0;
  try{
    const raw=JSON.parse(localStorage.getItem(yearRangeKey(c))||'null');
    let from=Number(raw?.from)||min,to=Number(raw?.to)||max;
    if(!years.includes(from))from=min;if(!years.includes(to))to=max;
    if(from>to)[from,to]=[to,from];
    return{from,to};
  }catch{return{from:min,to:max}}
}
function saveYearRange(c,from,to){try{localStorage.setItem(yearRangeKey(c),JSON.stringify({from,to}))}catch{}}
function selectedYearRange(){
  let from=Number($('dcalYearFromF633')?.value||availableYears[0]||0);
  let to=Number($('dcalYearToF633')?.value||availableYears.at(-1)||0);
  if(from&&to&&from>to)[from,to]=[to,from];
  return{from,to};
}
function fillYearRangeControls(years,c){
  const fromEl=$('dcalYearFromF633'),toEl=$('dcalYearToF633');
  if(!fromEl||!toEl)return;
  const options=years.map(y=>`<option value="${y}">${y}</option>`).join('');
  fromEl.innerHTML=options;toEl.innerHTML=options;
  const saved=loadYearRange(c,years);
  if(saved.from)fromEl.value=String(saved.from);
  if(saved.to)toEl.value=String(saved.to);
}
function applyYearRange(pruneDraft=true){
  const range=selectedYearRange();
  matches=allMatches.filter(x=>{
    const y=rowYear(x.row);
    return (!range.from||y>=range.from)&&(!range.to||y<=range.to);
  });
  if(pruneDraft){
    const allowed=new Set(matches.map(x=>x.row.id));
    draft=new Set([...draft].filter(id=>allowed.has(id)));
  }
  shown=PAGE_SIZE;
  const d=$(DIALOG_ID);d?.querySelectorAll?.('[data-pick]')?.forEach?.(x=>x.classList.remove('active'));
  if(contextNow)saveYearRange(contextNow,range.from,range.to);
  renderMatches();
}

function openArchiveDb(){
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
async function readAll(){
  const db=await openArchiveDb();
  if(!db||!db.objectStoreNames.contains(STORE))return[];
  return new Promise(resolve=>{
    try{
      const q=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
      q.onsuccess=()=>resolve((q.result||[]).map(x=>x?.value??x).filter(Boolean));
      q.onerror=()=>resolve([]);
    }catch{resolve([])}
  });
}
async function putAnnual(row){
  const db=await openArchiveDb();
  if(!db||!row?.id||!db.objectStoreNames.contains(STORE))return false;
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(STORE,'readwrite');
      const store=tx.objectStore(STORE);
      let value=row;
      try{
        const kp=store.keyPath;
        if(kp==='key') value={key:row.id,value:row,updatedAt:Date.now()};
      }catch{}
      store.put(value);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=tx.onabort=()=>resolve(false);
    }catch{resolve(false)}
  });
}
async function mapLimit(xs,n,fn){
  const list=Array.isArray(xs)?xs:[],out=new Array(list.length);let cursor=0;
  async function worker(){while(true){const i=cursor++;if(i>=list.length)return;out[i]=await fn(list[i],i)}}
  await Promise.all(Array.from({length:Math.min(Math.max(1,n),list.length||1)},worker));
  return out;
}
async function resolveRaceNo(row){
  if(Number(row?.raceNo)>0)return Number(row.raceNo);
  try{
    const q=await fetch(`/api/tjk-race-meta?date=${encodeURIComponent(row.date)}&cityId=${encodeURIComponent(row.cityId||'')}&cityName=${encodeURIComponent(row.city||'')}`,{cache:'no-store'});
    const d=await q.json();
    const nums=(Array.isArray(d?.races)?d.races:[])
      .filter(x=>sameClass(x?.class||x?.yaradi1,row.classRaw)&&sameAge(x?.ageGroup||x?.yaradi2,row.groupRaw)&&Number(x?.distance||x?.mesafe||0)===Number(row.distance)&&sameTrack(x?.track||x?.pist,row.track))
      .map(x=>Number(x?.no||x?.raceNo)).filter(Boolean).sort((a,b)=>a-b);
    if(q.ok&&nums.length){
      const occ=Math.max(1,Number(row?.occurrenceIndex||1));
      return nums[Math.min(occ-1,nums.length-1)];
    }
  }catch{}
  const same=allRows.filter(x=>x?.date===row?.date&&key(x?.city)===key(row?.city))
    .sort((a,b)=>Number(a?.page||0)-Number(b?.page||0)||Number(a?.rowIndex||0)-Number(b?.rowIndex||0));
  const idx=same.findIndex(x=>x?.id===row?.id);
  return idx>=0?idx+1:0;
}
async function resolveRows(rows){
  let done=0;
  return (await mapLimit(rows,3,async row=>{
    const n=await resolveRaceNo(row);done++;
    const status=$('dcalSelectorStatusF633');if(status)status.textContent=`Koşu numaraları doğrulanıyor: ${done}/${rows.length}`;
    if(!n)return null;
    if(Number(row.raceNo)!==n){
      row.raceNo=n;
      row.permanentKey=`${row.date}|${row.cityId||''}|${n}`;
      row.resolutionMethod=row.resolutionMethod||'DAILY_CALIBRATION_CAREER_FLOW_F633';
      await putAnnual(row);
    }
    return row;
  })).filter(Boolean);
}

function injectStyle(){
  if($('dailyCalibrationStyleF633'))return;
  const style=document.createElement('style');
  style.id='dailyCalibrationStyleF633';
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
#${PAGE_ID} .dc-result-grid{display:grid;gap:6px}
#${PAGE_ID} .dc-result-row{display:grid;grid-template-columns:72px repeat(5,minmax(0,1fr));gap:5px;align-items:center;font-size:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)}
#${PAGE_ID} .dc-result-row b{font-size:11px}
#${PAGE_ID} .dc-result-row span{text-align:center}
#${PAGE_ID} .dc-note{font-size:10px;line-height:1.45;color:#8fa4b8;margin-top:7px}
#${DIALOG_ID}{width:min(960px,100vw);height:min(92vh,900px);max-width:none;max-height:none;padding:0;border:1px solid #315d7c;border-radius:16px;background:#071522;color:#eef7ff}
#${DIALOG_ID}::backdrop{background:#000b}
#${DIALOG_ID} .shell{height:100%;display:flex;flex-direction:column}
#${DIALOG_ID} header,#${DIALOG_ID} footer{padding:12px;border-bottom:1px solid #ffffff18}
#${DIALOG_ID} footer{border-top:1px solid #ffffff18;border-bottom:0}
#${DIALOG_ID} .head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
#${DIALOG_ID} h2{margin:0;font-size:18px}
#${DIALOG_ID} .target,#${DIALOG_ID} .tools{padding:10px 12px;border-bottom:1px solid #ffffff18;font-size:11px;line-height:1.5}
#${DIALOG_ID} .years{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px}
#${DIALOG_ID} .years label{display:grid;gap:4px;font-size:10px;color:#9fb2c5}
#${DIALOG_ID} .years select{width:100%;min-height:40px;border-radius:9px;border:1px solid #ffffff24;background:#0b1d2d;color:#eef7ff;padding:0 9px;font-weight:800}
#${DIALOG_ID} .tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
#${DIALOG_ID} .actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#${DIALOG_ID} button{min-height:40px;border-radius:9px;border:1px solid #ffffff24;background:#ffffff0d;color:#eef7ff;font-weight:800}
#${DIALOG_ID} button.active,#${DIALOG_ID} .apply{background:#276f9f}
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
 #${PAGE_ID} .dc-card{padding:11px}
 #${PAGE_ID} .dc-result-row{grid-template-columns:64px repeat(5,46px);overflow-x:auto}
 #${DIALOG_ID}{width:100vw;height:100dvh;border-radius:0;border:0}
 #${DIALOG_ID} .tabs{grid-template-columns:repeat(3,1fr)}
 #${DIALOG_ID} .actions{grid-template-columns:1fr 1fr}
 #${DIALOG_ID} .apply{grid-column:1/-1}
}`;
  document.head.appendChild(style);
}

function syncLegacyRace(no){
  const n=String(no||selectedRaceNo());
  if(!n)return;
  try{st().selectedRace=n;if(typeof save==='function')save()}catch{}
  const legacy=$('xcalRace');
  if(legacy&&[...legacy.options].some(o=>String(o.value)===n))legacy.value=n;
  const main=$('analysisRace');
  if(main&&[...main.options].some(o=>String(o.value)===n))main.value=n;
}

async function resultHtml(){
  const c=context();
  if(!c)return '<div class="dc-copy">Koşu seçildiğinde kalibrasyon sonucu burada görünür.</div>';
  let entry=null;
  try{entry=await window.ATExactMatchCalibrationV1691F594?.getForRace?.(c.date,c.city,c.raceNo)}catch{}
  if(!entry)return '<div class="dc-copy">Bu koşu için henüz kalibrasyon kaydı yok. Eşleşmeleri seçip hesaplayın.</div>';
  const stats=entry?.stats||{};
  const head='<div class="dc-result-row"><b>Model</b><span>Top1</span><span>Top2</span><span>Top3</span><span>Top5</span><span>Ort.</span></div>';
  const rows=MODEL_IDS.map(id=>{
    const m=stats[id]||{},cov=Number(m.coverage)||0;
    const cell=(k,rk)=>cov?`${Number(m[k]||0)}/${cov} · %${Math.round(Number(m[rk]||0)*100)}`:'—';
    return `<div class="dc-result-row"><b>${MODEL_LABELS[id]}</b><span>${cell('top1','top1Rate')}</span><span>${cell('top2','top2Rate')}</span><span>${cell('top3','top3Rate')}</span><span>${cell('top5','top5Rate')}</span><span>${m.averageRank??'—'}</span></div>`;
  }).join('');
  return `<div class="dc-copy"><b>${entry.validCount??0}/${entry.historicalCount??0}</b> geçmiş yarış geçerli · ${entry.mode==='MANUAL_SELECTED'?'Manuel seçim':'Otomatik'}</div><div class="dc-result-grid">${head}${rows}</div>`;
}
async function refreshResult(){const host=$('dcalResultF633');if(host)host.innerHTML=await resultHtml()}

function page(){
  const content=$('analysisContent');if(!content)return null;
  let p=$(PAGE_ID);
  if(p)return p;
  p=document.createElement('div');p.id=PAGE_ID;
  p.innerHTML=`
<section class="dc-card">
  <div class="dc-title">Günün 5 Model Kalibrasyonu</div>
  <div class="dc-copy">Bugünkü hedef koşuyu seç. Geçmiş yarışları Kariyer Yol Haritasındaki aynı <b>Tümü / Tam / İkiz / Aile</b> seçim ekranından belirle.</div>
  <select id="dcalRaceF633" class="dc-select"></select>
  <div id="dcalTargetF633" class="dc-target"></div>
  <button id="dcalOpenF633" type="button" class="primary dc-open">Eşleşmeleri Gör ve Seç</button>
  <div class="dc-note">Yıllık Arşiv yalnız bu düğmeye basınca okunur. Seçimi Uygula ve Hesapla sonrası gerçek kazananın 5 model sırası kalibrasyon kaydına yazılır.</div>
</section>
<div id="dcalStatusF633" class="dc-status">Hazır.</div>
<section class="dc-card">
  <div class="dc-title">5 Model Kalibrasyon Sonucu</div>
  <div id="dcalResultF633"></div>
</section>`;
  content.prepend(p);
  $('dcalRaceF633').addEventListener('change',()=>{
    const n=selectedRaceNo();syncLegacyRace(n);
    const annual=window.ATAnnualArchiveV13;
    try{annual?.selectionSet?.clear?.()}catch{}
    try{window.__AT_AA_SELECTED_IDS_V134__?.clear?.()}catch{}
    updateTarget();
    refreshResult();
    const s=$('dcalStatusF633');if(s)s.textContent=`${n}. Koşu seçildi. Eşleşmeleri Gör ve Seç ile geçmiş yarışları belirleyin.`;
  });
  $('dcalOpenF633').onclick=e=>{e.preventDefault();void openSelector()};
  return p;
}

function fillRaceSelect(){
  const select=$('dcalRaceF633');if(!select)return;
  const races=programRaces();
  const preferred=Number(st()?.selectedRace||0);
  const initial=races.some(r=>raceNo(r)===preferred)?preferred:raceNo(races[0]);
  select.innerHTML=races.map(r=>{const m=metaOf(r),n=raceNo(r);return `<option value="${n}" ${n===initial?'selected':''}>${n}. Koşu · ${esc(m.classRaw)} · ${esc(m.ageGroup)} · ${m.distance?esc(m.distance)+' m ':''}${esc(m.track)}</option>`}).join('');
  if(initial)syncLegacyRace(initial);
}
function updateTarget(){
  const host=$('dcalTargetF633'),c=context();
  if(!host)return;
  host.innerHTML=c
    ? `<b>${c.raceNo}. Koşu · ${esc(c.city)} · ${esc(c.date)}</b><br>${esc(c.meta.classRaw)} · ${esc(c.meta.ageGroup)} · ${c.meta.distance?esc(c.meta.distance)+' m ':''}${esc(c.meta.track)}`
    : '<b>Günün programı yüklenmedi.</b>';
}

function mirrorLegacyStatus(){
  const src=$('xcalStatus'),dst=$('dcalStatusF633');
  if(dst&&src){
    const text=clean(src.textContent);
    if(text)dst.textContent=text
  }
  void refreshResult();
}
function attachLegacyStatus(){
  statusObserver?.disconnect?.();
  const src=$('xcalStatus');if(!src)return;
  statusObserver=new MutationObserver(()=>mirrorLegacyStatus());
  statusObserver.observe(src,{childList:true,subtree:true,characterData:true,attributes:true});
}

function buildClean(){
  const dialog=$('analysisDialog');
  if(!dialog||dialog.dataset.dailyCalibrationF6018!=='1')return false;
  injectStyle();
  if($('dialogEyebrow'))$('dialogEyebrow').textContent='SEÇİLMİŞ GEÇMİŞ YARIŞ BACKTESTİ';
  if($('dialogTitle'))$('dialogTitle').textContent='Günün Koşu Kalibrasyonu';
  const content=$('analysisContent');if(!content)return false;
  const legacy=content.querySelector(':scope > .xcal-wrap')||content.querySelector('.xcal-wrap');
  if(legacy)legacy.style.display='none';
  const p=page();
  if(!p)return false;
  fillRaceSelect();
  updateTarget();
  attachLegacyStatus();
  void refreshResult();
  return true;
}

function selectorDialog(){
  let d=$(DIALOG_ID);if(d)return d;
  d=document.createElement('dialog');d.id=DIALOG_ID;
  d.innerHTML=`<div class="shell">
<header><div class="head"><div><small>AT AI SYSTEM · ${VERSION}</small><h2>Kalibrasyon Eşleşmelerini Seç</h2></div><button id="dcalCloseF633">✕</button></div></header>
<div id="dcalSelectorTargetF633" class="target"></div>
<div class="tools">
<div class="years"><label>Başlangıç Yılı<select id="dcalYearFromF633"></select></label><label>Bitiş Yılı<select id="dcalYearToF633"></select></label></div>
<div class="tabs">
  <button data-pick="ALL">Tümü</button><button data-pick="EXACT">Tam</button><button data-pick="CONDITION_TWIN">İkiz</button><button data-pick="RACE_FAMILY">Aile</button>
</div><div id="dcalSelectorSummaryF633" class="sub" style="margin-top:7px"></div></div>
<div id="dcalSelectorListF633" class="list"></div>
<footer><div class="actions"><button id="dcalClearF633">Seçimi Temizle</button><button id="dcalApplyF633" class="apply">Seçimi Uygula ve Hesapla</button></div><div id="dcalSelectorStatusF633" class="status"></div></footer>
</div>`;
  document.body.appendChild(d);
  $('dcalCloseF633').onclick=()=>d.close();
  d.querySelectorAll('[data-pick]').forEach(btn=>btn.onclick=()=>{
    const t=btn.dataset.pick;
    draft=new Set(matches.filter(x=>t==='ALL'||x.type===t).map(x=>x.row.id));
    d.querySelectorAll('[data-pick]').forEach(x=>x.classList.toggle('active',x===btn));
    renderMatches();
    $('dcalSelectorStatusF633').textContent=`${btn.textContent} seçildi · ${draft.size} yarış işaretlendi.`;
  });
  $('dcalClearF633').onclick=()=>{
    draft.clear();d.querySelectorAll('[data-pick]').forEach(x=>x.classList.remove('active'));renderMatches();
    $('dcalSelectorStatusF633').textContent='Seçim temizlendi.';
  };
  $('dcalApplyF633').onclick=()=>void applySelection();
  d.onchange=e=>{
    if(e.target?.matches?.('#dcalYearFromF633,#dcalYearToF633')){
      let from=Number($('dcalYearFromF633')?.value||0),to=Number($('dcalYearToF633')?.value||0);
      if(from&&to&&from>to){
        if(e.target.id==='dcalYearFromF633')$('dcalYearToF633').value=String(from);
        else $('dcalYearFromF633').value=String(to);
      }
      applyYearRange(true);
      const range=selectedYearRange();
      $('dcalSelectorStatusF633').textContent=`Tarih aralığı ${range.from}–${range.to} · ${matches.length} eşleşme.`;
      return;
    }
    const x=e.target?.closest?.('[data-id]');if(!x)return;
    x.checked?draft.add(x.dataset.id):draft.delete(x.dataset.id);renderSummary();
  };
  d.onclick=e=>{if(e.target?.id==='dcalMoreF633'){shown+=PAGE_SIZE;renderMatches()}};
  return d;
}
function renderSummary(){
  const host=$('dcalSelectorSummaryF633');if(!host)return;
  const c={EXACT:0,CONDITION_TWIN:0,RACE_FAMILY:0};matches.forEach(x=>c[x.type]++);
  const range=selectedYearRange();
  host.textContent=`${range.from||'—'}–${range.to||'—'} · ${matches.length} eşleşme · Tam ${c.EXACT} · İkiz ${c.CONDITION_TWIN} · Aile ${c.RACE_FAMILY} · ${matches.filter(x=>draft.has(x.row.id)).length} seçili`;
}
function renderMatches(){
  renderSummary();
  const box=$('dcalSelectorListF633');if(!box)return;
  const rows=matches.slice(0,shown);
  box.innerHTML=rows.length?rows.map(x=>{
    const r=x.row,cd=key(contextNow.city)!==key(r.city),dd=Number(contextNow.meta.distance)!==Number(r.distance),td=!sameTrack(contextNow.meta.track,r.track);
    return `<label class="row"><input type="checkbox" data-id="${esc(r.id)}" ${draft.has(r.id)?'checked':''}>
<div><div class="title">${esc(displayDate(r.date))} · ${esc(r.city)} · ${esc(r.classRaw)}</div>
<div class="sub">${esc(r.groupRaw)}${r.raceName?' · '+esc(r.raceName):''}</div>
<div class="chips"><span class="chip">İl: ${esc(r.city)}${cd?' ↔':''}</span><span class="chip">Pist: ${esc(r.track)}${td?' ↔':''}</span><span class="chip">Mesafe: ${esc(r.distance)} m${dd?' ↔':''}</span>${r.raceNo?`<span class="chip">${r.raceNo}.K</span>`:''}</div>
<div class="sub"><b>${esc(rule(x.type))}</b></div></div>
<div><div class="type">${label(x.type)}</div><div class="sub">uyum %${x.score}</div></div></label>`;
  }).join('')+(matches.length>shown?`<button id="dcalMoreF633" style="width:100%">Daha Fazla Göster · ${fmt(matches.length-shown)} kaldı</button>`:'')
  :'<div class="sub" style="padding:20px">Yüklü yıllarda Tam / İkiz / Aile eşleşmesi yok.</div>';
}

async function openSelector(){
  if(busy)return;
  contextNow=context();
  const d=selectorDialog();
  if(!d.open){try{d.showModal()}catch{d.setAttribute('open','')}}
  if(!contextNow){$('dcalSelectorStatusF633').textContent='Önce hedef koşuyu seçin.';return}
  busy=true;
  $('dcalSelectorStatusF633').textContent='Yüklü Yıllık Arşiv taranıyor…';
  try{
    allRows=await readAll();
    const historical=allRows.filter(r=>r?.id&&r?.date&&r.date<contextNow.date);
    availableYears=[...new Set(historical.map(rowYear).filter(Boolean))].sort((a,b)=>a-b);
    allMatches=historical
      .map(row=>({row,type:matchType(contextNow,row),score:similarity(contextNow,row)}))
      .filter(x=>x.type)
      .sort((a,b)=>order(a.type)-order(b.type)||b.score-a.score||String(b.row.date).localeCompare(String(a.row.date)));
    fillYearRangeControls(availableYears,contextNow);
    const allowedAll=new Set(allMatches.map(x=>x.row.id));
    const saved=loadSaved(contextNow);
    const global=window.ATAnnualArchiveV13?.selectionSet;
    draft=new Set([...saved,...(global&&typeof global.values==='function'?[...global]:[])].filter(id=>allowedAll.has(id)));
    applyYearRange(true);
    d.querySelectorAll('[data-pick]').forEach(x=>x.classList.remove('active'));
    $('dcalSelectorTargetF633').innerHTML=`<b>${contextNow.raceNo}. Koşu · ${esc(contextNow.city)} · ${esc(contextNow.date)}</b><br>${esc(contextNow.meta.classRaw)} · ${esc(contextNow.meta.ageGroup)} · ${esc(contextNow.meta.distance)} m ${esc(contextNow.meta.track)}<br>Yüklü arşiv: ${availableYears.length?availableYears[0]+'–'+availableYears.at(-1):'yıl yok'} · ${fmt(allRows.length)} yarış.`;
    renderMatches();
    $('dcalSelectorStatusF633').textContent=matches.length?'Üstten Tümü / Tam / İkiz / Aile seçebilir veya yarışları tek tek işaretleyebilirsin.':'Yüklü yıllarda Tam / İkiz / Aile eşleşmesi yok.';
  }catch(e){
    $('dcalSelectorStatusF633').textContent=e?.message||'Yıllık Arşiv okunamadı.';
  }finally{busy=false}
}

async function applySelection(){
  if(busy||!contextNow)return;
  const selected=matches.filter(x=>draft.has(x.row.id));
  if(!selected.length){$('dcalSelectorStatusF633').textContent='En az bir eşleşme seçin.';return}
  busy=true;$('dcalApplyF633').disabled=true;
  try{
    const requestedIds=new Set(selected.map(x=>x.row.id).filter(Boolean));
    const annualApi=window.ATAnnualArchiveV13;
    const annualSet=annualApi?.selectionSet||window.__AT_AA_SELECTED_IDS_V134__;
    if(!annualSet?.clear||!annualSet?.add)throw new Error('Yıllık Arşiv seçim kümesi bulunamadı.');
    annualSet.clear();requestedIds.forEach(id=>annualSet.add(id));
    const legacySet=window.__AT_AA_SELECTED_IDS_V134__;
    if(legacySet&&legacySet!==annualSet&&legacySet?.clear&&legacySet?.add){legacySet.clear();requestedIds.forEach(id=>legacySet.add(id))}

    $('dcalSelectorStatusF633').textContent=`${requestedIds.size} seçili yarış Yıllık Arşiv çözücüsüyle doğrulanıyor…`;
    let rows=[];
    if(typeof annualApi?.resolveSelected==='function'){
      try{rows=await annualApi.resolveSelected()||[]}catch(e){console.warn('[AT AI]',VERSION,'native annual resolver warning',e)}
    }
    if(!Array.isArray(rows)||!rows.length)rows=await resolveRows(selected.map(x=>x.row));
    const resolved=rows.filter(r=>Number(r?.raceNo)>0);
    if(!resolved.length)throw new Error('Seçilen yarışların koşu numarası çözülemedi.');
    const ids=new Set(resolved.map(r=>r.id).filter(Boolean));
    const unresolvedCount=Math.max(0,requestedIds.size-ids.size);
    annualSet.clear();ids.forEach(id=>annualSet.add(id));
    if(legacySet&&legacySet!==annualSet&&legacySet?.clear&&legacySet?.add){legacySet.clear();ids.forEach(id=>legacySet.add(id))}
    saveSelected(contextNow,ids);
    syncLegacyRace(contextNow.raceNo);
    try{window.dispatchEvent(new CustomEvent('at-ai:annual-archive-selection',{detail:{selected:ids.size,targetRaceNo:contextNow.raceNo,source:VERSION}}))}catch{}
    $('dcalSelectorStatusF633').textContent=`${ids.size} geçmiş yarış hazır${unresolvedCount?` · ${unresolvedCount} çözülemeyen kayıt dışarıda bırakıldı`:''} · 5 Model kalibrasyonu başlatılıyor…`;
    const status=$('dcalStatusF633');if(status)status.textContent=`${ids.size} geçmiş yarış hazır${unresolvedCount?` · ${unresolvedCount} çözülemedi`:''} · kalibrasyon başlatılıyor…`;
    setTimeout(()=>{
      try{$(DIALOG_ID)?.close()}catch{}
      syncLegacyRace(contextNow.raceNo);
      const run=$('xcalRunSelected');
      if(run)run.click();
      else if(status)status.textContent='Kalibrasyon motoru düğmesi bulunamadı.';
    },80);
  }catch(e){
    $('dcalSelectorStatusF633').textContent=e?.message||'Seçim uygulanamadı.';
  }finally{
    busy=false;$('dcalApplyF633').disabled=false;
  }
}

function installRenderPatch(){
  const api=window.ATExactMatchCalibrationV1691F594;
  if(!api||typeof api.render!=='function')return false;
  if(api.__dailyCleanF633)return true;
  const base=api.render.bind(api);
  api.render=function(...args){
    const out=base(...args);
    try{buildClean()}catch(e){console.warn('[AT AI]',VERSION,'clean build warning',e)}
    return out;
  };
  api.__dailyCleanF633=VERSION;
  return true;
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
  if(d){
    const obs=new MutationObserver(wake);
    obs.observe(d,{attributes:true,attributeFilter:['open','data-view','data-daily-calibration-f6018'],childList:true,subtree:false});
  }
}catch{}
document.addEventListener('change',e=>{
  if(e.target?.matches?.('#xcalRace')&&$('analysisDialog')?.dataset.dailyCalibrationF6018==='1'){
    const own=$('dcalRaceF633');if(own&&[...own.options].some(o=>o.value===e.target.value)){own.value=e.target.value;updateTarget();void refreshResult()}
  }
},true);
window.addEventListener('pageshow',()=>setTimeout(wake,50),{passive:true});
setTimeout(wake,100);

window.ATDailyCalibrationCareerFlowV632={version:VERSION,openSelector,refresh:buildClean};
console.info('[AT AI]',VERSION,'active — year-range Career-style Daily Calibration; native Annual Archive race-number resolver; F59.4 engine hidden.');
})();