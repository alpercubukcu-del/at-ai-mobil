/* AT AI Mobil — V16.9.1F59.7 KAZANAN KESIN SIRA GORUNUMU
   - Model Kalibrasyonu ekraninda Top1/Top2/Top3/Top5 ve ortalama sira tablosunu gizler.
   - Zaten hesaplanmis backtest kayitlarindan gercek kazananin 5 Modeldeki KESIN sirasini gosterir.
   - Yeni hesap, timeout, watchdog veya arsiv temizligi eklemez.
   - Mevcut kalibrasyon istatistikleri kupon uyumlulugu icin arka planda korunur; ekranda yalniz kesin siralar gorunur.
*/
(() => {
'use strict';
if (window.__AT_WINNER_EXACT_RANK_VIEW_V1691F597__) return;
window.__AT_WINNER_EXACT_RANK_VIEW_V1691F597__ = true;

const VERSION='WINNER-EXACT-RANK-VIEW-V16.9.1F59.7';
const DB_NAME='at_ai_5model_calibration_v1';
const STORE_BACKTESTS='backtests';
const MODEL_IDS=['composite','exact','twin','family','career'];
const MODEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'').trim();

function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function cityName(){try{if(typeof getCityName==='function')return clean(getCityName())}catch{}const s=st(),id=clean(s?.city);return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id}
function currentDate(){return clean(st()?.date||$('raceDate')?.value)}
function selectedRaceNo(){return Number($('xcalRace')?.value||st()?.selectedRace||0)||0}

async function allBacktests(){
  if(!('indexedDB' in window))return[];
  const db=await new Promise(resolve=>{let q;try{q=indexedDB.open(DB_NAME)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve(null)});
  if(!db||!db.objectStoreNames.contains(STORE_BACKTESTS))return[];
  return new Promise(resolve=>{try{const q=db.transaction(STORE_BACKTESTS,'readonly').objectStore(STORE_BACKTESTS).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([])}catch{resolve([])}});
}

function ensureStyle(){
  if($('xrankStyleF597'))return;
  const s=document.createElement('style');s.id='xrankStyleF597';s.textContent=`
  #xcalCurrentResult .xcal-scroll{display:none!important}
  .xrank-wrap-f597{margin-top:10px;border-top:1px solid rgba(255,255,255,.08);padding-top:10px}
  .xrank-title-f597{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12px;font-weight:900;margin-bottom:7px}
  .xrank-title-f597 span{font-size:10px;font-weight:700;color:#a9bdd0}
  .xrank-list-f597{display:grid;gap:7px}
  .xrank-race-f597{border:1px solid rgba(114,213,255,.13);border-radius:11px;padding:8px;background:rgba(255,255,255,.025)}
  .xrank-race-head-f597{font-size:10px;line-height:1.35;color:#b8cada;margin-bottom:6px}
  .xrank-race-head-f597 b{color:#e8f4ff}
  .xrank-chips-f597{display:flex;flex-wrap:wrap;gap:5px}
  .xrank-chip-f597{font-size:10px;border:1px solid rgba(114,213,255,.16);border-radius:999px;padding:5px 7px;color:#d8ecfb;white-space:nowrap}
  .xrank-chip-f597 b{font-size:11px;color:#fff}
  .xrank-empty-f597{font-size:10px;color:#9eb1c3;line-height:1.45;padding:5px 0}
  `;document.head.appendChild(s);
}

function rankText(v){const n=Number(v);return Number.isInteger(n)&&n>0?`${n}.`:'—'}
function testIdentity(t){return clean(t?.annualArchiveId)||`${clean(t?.date)}|${fold(t?.city)}|${Number(t?.raceNo)||0}`}

async function renderExactRanks(){
  ensureStyle();
  const host=$('xcalCurrentResult');
  if(!host)return;
  const api=window.ATExactMatchCalibrationV1691F594;
  const no=selectedRaceNo(),date=currentDate(),city=cityName();
  if(!api?.getForRace||!no||!date||!city)return;
  let entry=null;try{entry=await api.getForRace(date,city,no)}catch{}
  host.querySelector('#xrankExactF597')?.remove();
  if(!entry)return;

  const selected=Array.isArray(entry.selectedHistoricalIds)?entry.selectedHistoricalIds.map(clean).filter(Boolean):[];
  const order=new Map(selected.map((id,i)=>[id,i]));
  const all=await allBacktests();
  let tests=(all||[]).filter(t=>t?.ok&&t?.ranks);
  if(selected.length)tests=tests.filter(t=>order.has(clean(t?.annualArchiveId)));
  tests=[...new Map(tests.map(t=>[testIdentity(t),t])).values()];
  tests.sort((a,b)=>{
    const ai=order.has(clean(a?.annualArchiveId))?order.get(clean(a?.annualArchiveId)):9999;
    const bi=order.has(clean(b?.annualArchiveId))?order.get(clean(b?.annualArchiveId)):9999;
    return ai-bi||String(b?.date||'').localeCompare(String(a?.date||''))||Number(a?.raceNo||99)-Number(b?.raceNo||99);
  });

  const wrap=document.createElement('div');wrap.id='xrankExactF597';wrap.className='xrank-wrap-f597';
  const valid=Number(entry.validCount)||tests.length,total=Number(entry.historicalCount)||selected.length||tests.length,errors=Number(entry.errorCount)||0;
  wrap.innerHTML=`<div class="xrank-title-f597"><b>Kazanan Kesin Sıraları</b><span>${valid}/${total} yarış${errors?` · ${errors} hata`:''}</span></div>${tests.length?`<div class="xrank-list-f597">${tests.map(t=>`<div class="xrank-race-f597"><div class="xrank-race-head-f597"><b>${esc(t.date||'-')} · ${esc(t.city||'-')} · ${esc(t.raceNo||'?')}.K</b>${clean(t?.winner?.name)?` · Kazanan: ${esc(t.winner.name)}`:''}</div><div class="xrank-chips-f597">${MODEL_IDS.map(id=>`<span class="xrank-chip-f597">${MODEL_LABELS[id]} <b>${rankText(t?.ranks?.[id])}</b></span>`).join('')}</div></div>`).join('')}</div>`:`<div class="xrank-empty-f597">Başarıyla hesaplanmış geçmiş yarış sırası bulunamadı.</div>`}`;
  const card=host.querySelector('.xcal-entry');
  (card||host).appendChild(wrap);

  const topCard=document.querySelector('#analysisContent .xcal-wrap > .xcal-card:first-child');
  if(topCard){
    const lastChip=[...topCard.querySelectorAll('.xcal-chips i')].find(i=>/Top1|Top2|Top3|Top5/i.test(i.textContent||''));
    if(lastChip)lastChip.textContent='Kazanan kesin sıraları';
  }
  if($('dialogEyebrow'))$('dialogEyebrow').textContent='KAZANAN SIRA BACKTEST';
}

function scheduleRender(){requestAnimationFrame(()=>void renderExactRanks())}
const api=window.ATExactMatchCalibrationV1691F594;
if(api?.render){const prev=api.render.bind(api);api.render=function(...args){const r=prev(...args);scheduleRender();return r}}
window.addEventListener('change',e=>{if(e.target?.closest?.('#xcalRace'))scheduleRender()},true);
window.addEventListener('click',e=>{if(e.target?.closest?.('#xcalRunSelected,#xcalRunAll,#xcalApplyCandidates'))setTimeout(scheduleRender,0)},true);
window.addEventListener('at-ai:annual-archive-selection',scheduleRender);
if(document.querySelector('#analysisContent .xcal-wrap'))scheduleRender();

window.ATWinnerExactRankViewV1691F597={version:VERSION,render:renderExactRanks};
console.info('[AT AI]',VERSION,'aktif — Kalibrasyon ekraninda yalniz gercek kazananin kesin 5 Model siralari gosterilir; yeni hesap/timeout yok.');
})();