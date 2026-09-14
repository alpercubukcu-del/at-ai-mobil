/* AT AI Mobil — F60.65 Güncel Analiz kriter görünürlüğü + gerçek aykırı yarış filtresi */
(() => {
'use strict';
if(window.__AT_F6065_CURRENT_OUTLIER__)return;
window.__AT_F6065_CURRENT_OUTLIER__=true;
const VERSION='CURRENT-ANALYSIS-OUTLIER-FILTER-V16.9.1F60.65';
const $=id=>document.getElementById(id);
let runWrapped=false;
let lastStats={horses:0,rows:0,removed:0,invalid:0,outlier:0};

function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
function upper(v=''){return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');}
function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(',','.').match(/-?\d+(?:\.\d+)?/)?.[0]);return Number.isFinite(n)?n:null;}
function iso(v=''){
  const s=clean(v);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:'';
}
function finish(row){const n=num(row?.finish??row?.rank??row?.sira??row?.der??row?.position);return n===null?null:Math.trunc(n);}
function distance(row){return num(row?.distance??row?.mesafe??row?.msf??row?.Mesafe);}
function track(row){return clean(row?.track??row?.pist??row?.Pist??row?.surface);}
function city(row){return clean(row?.city??row?.cityName??row?.sehir??row?.il);}
function degreeRaw(row){return clean(row?.degree??row?.derece??row?.muddet??row?.duration??row?.time);}
function rowKey(row){return clean(row?.uniqueKey)||[iso(row?.isoDate??row?.date??row?.tarih??row?.raceDate),upper(city(row)),distance(row)||'',finish(row)??'',degreeRaw(row),upper(row?.classRaw??row?.class??row?.raceClass??'')].join('|');}
function trackKey(v=''){const x=upper(v);if(x.includes('CIM')||x==='C')return'CIM';if(x.includes('SENTETIK')||x==='S')return'SENTETIK';if(x.includes('KUM')||x==='K')return'KUM';return x;}

function degreeSeconds(v){
  let s=clean(v).replace(/\s/g,'').replace(',', '.');
  if(!s||s==='-'||s==='0')return null;
  let m=s.match(/^(\d{1,2})[:.](\d{1,2})[.:](\d{1,2})$/);
  if(m){const min=Number(m[1]),sec=Number(m[2]),cs=Number(m[3]);if(sec>=60)return null;const total=min*60+sec+cs/100;return total>20&&total<360?total:null;}
  m=s.match(/^(\d{1,3})[.:](\d{1,2})$/);
  if(m){const a=Number(m[1]),b=Number(m[2]);const total=a+b/100;return total>20&&total<360?total:null;}
  const n=Number(s);return Number.isFinite(n)&&n>20&&n<360?n:null;
}
function pace1000(row){const d=distance(row),sec=degreeSeconds(degreeRaw(row));if(!(d>0)||!(sec>0))return null;const p=sec*1000/d;return p>30&&p<140?p:null;}
function median(values){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const mid=Math.floor(a.length/2);return a.length%2?a[mid]:(a[mid-1]+a[mid])/2;}
function mad(values,med){return median(values.map(v=>Math.abs(v-med)));}

function structuralBad(row){
  const f=finish(row),d=distance(row),t=track(row),dt=iso(row?.isoDate??row?.date??row?.tarih??row?.raceDate);
  return !dt||!(d>0)||!t||!(f>=1&&f<=99);
}
function timedRows(rows){return rows.map(row=>({row,pace:pace1000(row),d:distance(row),trk:trackKey(track(row)),ct:upper(city(row))})).filter(x=>Number.isFinite(x.pace)&&x.d>0&&x.trk);}
function outlierKeys(rows){
  const timed=timedRows(rows),bad=new Set();
  for(const x of timed){
    let peers=timed.filter(y=>y!==x&&y.trk===x.trk&&Math.abs(y.d-x.d)<=200&&y.ct===x.ct);
    if(peers.length<5)peers=timed.filter(y=>y!==x&&y.trk===x.trk&&Math.abs(y.d-x.d)<=200);
    if(peers.length<5)continue;
    const vals=peers.map(y=>y.pace),med=median(vals);if(!Number.isFinite(med)||med<=0)continue;
    const m=mad(vals,med),rel=Math.abs(x.pace-med)/med;
    let extreme=false;
    if(Number.isFinite(m)&&m>0){const sigma=1.4826*m,z=Math.abs(x.pace-med)/sigma;extreme=z>4.5&&rel>0.12;}
    else extreme=rel>0.18;
    if(x.pace<38||x.pace>115)extreme=true;
    if(extreme)bad.add(rowKey(x.row));
  }
  return bad;
}
function filterPayload(payload){
  if(!payload||typeof payload!=='object'||payload.ok===false)return {payload,stats:{rows:0,removed:0,invalid:0,outlier:0}};
  const names=['history','preparationPath','top5','roadmap','races'];
  const union=new Map();
  for(const name of names)for(const row of (Array.isArray(payload[name])?payload[name]:[]))union.set(rowKey(row),row);
  const all=[...union.values()],outliers=outlierKeys(all),invalid=new Set(all.filter(structuralBad).map(rowKey));
  const bad=new Set([...outliers,...invalid]);
  if(!bad.size)return {payload:{...payload,f6065Outlier:{enabled:true,rows:all.length,removed:0,invalid:0,outlier:0}},stats:{rows:all.length,removed:0,invalid:0,outlier:0}};
  const out={...payload};
  for(const name of names)if(Array.isArray(payload[name]))out[name]=payload[name].filter(row=>!bad.has(rowKey(row)));
  out.f6065Outlier={enabled:true,rows:all.length,removed:bad.size,invalid:invalid.size,outlier:outliers.size};
  return {payload:out,stats:{rows:all.length,removed:bad.size,invalid:invalid.size,outlier:outliers.size}};
}

function installStyle(){
  if($('f6065CurrentStyle'))return;
  const s=document.createElement('style');s.id='f6065CurrentStyle';s.textContent=`
    .f6065-loading-grid{display:grid;gap:13px}.f6065-loading-label{font-size:12px;font-weight:800;color:#4b5565;margin:0 0 5px}.f6065-loading-box{min-height:54px;border:1px solid #dce3ea;border-radius:16px;background:#fff;display:flex;align-items:center;padding:0 13px;color:#93a0ad;font-size:12px}.f6065-outlier-info{font-size:10px;line-height:1.4;color:#738293;margin-top:5px}
  `;document.head.appendChild(s);
}
function ensureFilterShells(){
  const host=$('f63Picks');if(!host||host.children.length)return;
  host.innerHTML=`<div class="f6065-loading-grid">${['İl','Yaş / Grup','Koşu Cinsi','Mesafe','Pistler'].map(x=>`<div><div class="f6065-loading-label">${x}</div><div class="f6065-loading-box">Seçenekler hazırlanıyor…</div></div>`).join('')}</div>`;
}
function relabelSwitch(){
  const input=$('f63DropBad');if(!input)return;
  const box=input.closest('.f63-rowbox');if(!box)return;
  const title=box.querySelector('.f63-rowbox-title'),note=box.querySelector('.f63-rowbox-note');
  if(title)title.textContent='Aşırı Sapma Gösteren Yarışları At';
  if(note)note.textContent='Derecesiz/bozuk kayıtları ve aynı pist + yakın mesafe geçmişine göre aşırı hızlı/yavaş derece sapmalarını analizden çıkarır.';
  if(!box.querySelector('.f6065-outlier-info')){
    const info=document.createElement('div');info.className='f6065-outlier-info';info.id='f6065OutlierInfo';info.textContent='HP, ganyan veya sırf kötü bitiriş nedeniyle yarış silinmez.';
    box.querySelector('.f63-rowbox-text')?.appendChild(info);
  }
}
function outlierEnabled(){return !!$('f63DropBad')?.checked&&$('analysisDialog')?.dataset?.view==='current';}
function updateInfo(stats=lastStats){const el=$('f6065OutlierInfo');if(!el)return;if(!outlierEnabled()){el.textContent='Kapalı · HP, ganyan veya sırf kötü bitiriş nedeniyle yarış silinmez.';return;}el.textContent=stats.removed?`Açık · ${stats.removed} kariyer satırı çıkarıldı (${stats.invalid} bozuk/derecesiz, ${stats.outlier} aşırı derece sapması).`:'Açık · Aşırı sapma bulunursa yalnız o kariyer satırı çıkarılır; normal kötü performans korunur.';}

function wrapRun(){
  if(runWrapped||typeof runAnalysis!=='function'||typeof fetchCareer!=='function')return;
  const before=runAnalysis;
  runAnalysis=async function(){
    if(!outlierEnabled())return before.apply(this,arguments);
    const originalFetch=fetchCareer;lastStats={horses:0,rows:0,removed:0,invalid:0,outlier:0};
    fetchCareer=async function(){
      const raw=await originalFetch.apply(this,arguments),r=filterPayload(raw);lastStats.horses++;lastStats.rows+=r.stats.rows;lastStats.removed+=r.stats.removed;lastStats.invalid+=r.stats.invalid;lastStats.outlier+=r.stats.outlier;return r.payload;
    };
    try{return await before.apply(this,arguments);}finally{fetchCareer=originalFetch;setTimeout(()=>updateInfo(lastStats),0);}
  };
  runWrapped=true;
}
function reconcile(){installStyle();ensureFilterShells();relabelSwitch();wrapRun();updateInfo();}
function start(){
  reconcile();
  const mo=new MutationObserver(()=>queueMicrotask(reconcile));
  try{mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-view','hidden','open']});}catch{}
  document.addEventListener('change',e=>{if(e.target?.id==='f63DropBad')updateInfo();},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-f63-mode="custom"]'))setTimeout(reconcile,0);},true);
  window.addEventListener('pageshow',reconcile);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ATF6065Outlier={version:VERSION,filterPayload,degreeSeconds,pace1000,outlierKeys,reconcile};
console.info('[AT AI]',VERSION,'aktif — kriterler yükleme sırasında görünür + gerçek derece tabanlı robust outlier filtresi.');
})();
