/* AT AI Mobil — V16.9.1F59.7 KESIN KAZANAN SIRALARI
   - 4. Model Kalibrasyonu ekraninda Top1/Top2/Top3/Top5/ortalama ozetini gizler.
   - Her gecmis yaris icin gercek kazananin Bilesik/Tam/Ikiz/Aile/Kariyer kesin sirasini mevcut backtest cache'inden okur.
   - Kesin sira dizileri kalibrasyon kaydina hafif rankRows alani olarak eklenir; 5 Model yeniden hesaplanmaz.
   - Gunluk/Yillik Arsiv degismez; yeni timeout/watchdog yoktur.
*/
(() => {
'use strict';
if (window.__AT_EXACT_RANK_CALIBRATION_V1691F597__) return;
window.__AT_EXACT_RANK_CALIBRATION_V1691F597__ = true;

const VERSION='EXACT-RANK-CALIBRATION-V16.9.1F59.7';
const DB_NAME='at_ai_5model_calibration_v1';
const STORE_ENTRIES='entries';
const STORE_BACKTESTS='backtests';
const MODEL_IDS=['composite','exact','twin','family','career'];
const MODEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
let observer=null;
let decorateBusy=false;
let queued=false;

function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function cityName(){try{if(typeof getCityName==='function')return clean(getCityName())}catch{}const s=st(),id=clean(s?.city);return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id}
function currentDate(){return clean(st()?.date||$('raceDate')?.value)}
function selectedRaceNo(){return Number($('xcalRace')?.value||st()?.selectedRace||0)||0}
function targetKey(date,city,no){return [date,fold(city),Number(no)||0].join('|')}
function backtestIdentity(t){return clean(t?.annualArchiveId)||`${clean(t?.date)}|${fold(t?.city)}|${Number(t?.raceNo)||0}`}

async function openDb(){if(!('indexedDB'in window))return null;return new Promise(resolve=>{let q;try{q=indexedDB.open(DB_NAME)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve(null)})}
async function dbAll(store){const db=await openDb();if(!db||!db.objectStoreNames.contains(store))return[];return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([])}catch{resolve([])}})}
async function dbPut(store,value){const db=await openDb();if(!db||!db.objectStoreNames.contains(store))return false;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}

function rankRowsForEntry(entry,tests){
  if(Array.isArray(entry?.rankRows)&&entry.rankRows.length)return entry.rankRows;
  const wanted=new Set((entry?.selectedHistoricalIds||[]).map(clean).filter(Boolean));
  let rows=(tests||[]).filter(t=>t?.ok!==false&&t?.ranks);
  if(wanted.size)rows=rows.filter(t=>wanted.has(clean(t?.annualArchiveId)));
  else {
    const t=entry?.target||{};
    rows=rows.filter(x=>fold(x?.city)===fold(t?.city)&&clean(x?.date)<clean(t?.date));
  }
  rows.sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))||Number(a?.raceNo||99)-Number(b?.raceNo||99));
  return rows.map(t=>({
    id:backtestIdentity(t),date:clean(t?.date),city:clean(t?.city),raceNo:Number(t?.raceNo)||null,
    winner:{no:t?.winner?.no??null,name:clean(t?.winner?.name)},
    ranks:Object.fromEntries(MODEL_IDS.map(id=>[id,Number.isInteger(Number(t?.ranks?.[id]))&&Number(t.ranks[id])>0?Number(t.ranks[id]):null]))
  }));
}

function exactLines(rows){
  if(!rows.length)return '<div class="xrank-empty">Kesin kazanan sırası henüz yok. Bu koşuyu yeniden kalibre ettiğinizde mevcut backtest kayıtlarından otomatik oluşur.</div>';
  return `<div class="xrank-lines">${MODEL_IDS.map(id=>{const vals=rows.map(r=>r?.ranks?.[id]).filter(v=>Number.isInteger(v)&&v>0);return `<div class="xrank-line"><b>${MODEL_LABELS[id]}</b><span>${vals.length?vals.map(v=>`${v}.`).join(' · '):'—'}</span></div>`}).join('')}</div>`;
}

function exactHistory(rows){
  if(!rows.length)return'';
  return `<details class="xrank-history"><summary>${rows.length} geçerli geçmiş yarış</summary>${rows.map(r=>`<div class="xrank-hrow"><span>${esc(r.date)} · ${esc(r.city)} · ${r.raceNo?`${r.raceNo}.K`:'?.K'}${r.winner?.name?` · ${esc(r.winner.name)}`:''}</span><small>${MODEL_IDS.map(id=>`${MODEL_LABELS[id]} ${r.ranks?.[id]??'—'}`).join(' · ')}</small></div>`).join('')}</details>`;
}

function ensureStyle(){
  if($('xrankStyleF597'))return;
  const s=document.createElement('style');s.id='xrankStyleF597';s.textContent=`
  #analysisContent .xcal-entry>.xcal-scroll{display:none!important}
  .xrank-box{margin-top:10px;border-top:1px solid rgba(255,255,255,.08);padding-top:9px}
  .xrank-title{font-size:11px;font-weight:900;margin-bottom:7px;color:#d9efff}
  .xrank-lines{display:grid;gap:5px}.xrank-line{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:6px 8px;border:1px solid rgba(114,213,255,.12);border-radius:10px;background:rgba(255,255,255,.025)}
  .xrank-line b{font-size:11px}.xrank-line span{font-size:11px;text-align:right;font-variant-numeric:tabular-nums;color:#f3fbff}
  .xrank-empty{font-size:11px;line-height:1.45;color:#9fb2c5}.xrank-history{margin-top:8px}.xrank-history summary{cursor:pointer;font-size:10px;color:#9fc8e3}.xrank-hrow{padding:7px 2px;border-bottom:1px solid rgba(255,255,255,.06)}.xrank-hrow span,.xrank-hrow small{display:block;font-size:9px;line-height:1.4;color:#aebfd0}.xrank-hrow small{margin-top:2px;color:#d5e5f1}
  `;document.head.appendChild(s);
}

function findEntryElement(entry){
  const t=entry?.target||{},cards=[...document.querySelectorAll('#analysisContent .xcal-entry')];
  return cards.find(card=>{const txt=clean(card.textContent);return txt.includes(`${t.raceNo}.K`)&&txt.includes(clean(t.city))&&txt.includes(clean(t.date))})||null;
}

async function enrichEntries(entries,tests){
  let changed=0;
  for(const entry of entries){
    if(Array.isArray(entry?.rankRows)&&entry.rankRows.length)continue;
    const rows=rankRowsForEntry(entry,tests);
    if(!rows.length)continue;
    const next={...entry,rankRows:rows,rankRowsVersion:VERSION,rankRowsUpdatedAt:new Date().toISOString()};
    if(await dbPut(STORE_ENTRIES,next)){Object.assign(entry,next);changed++}
  }
  return changed;
}

async function decorateExactRanks(){
  if(decorateBusy){queued=true;return}
  const wrap=document.querySelector('#analysisContent .xcal-wrap');if(!wrap)return;
  decorateBusy=true;
  try{
    ensureStyle();
    const [entries,tests]=await Promise.all([dbAll(STORE_ENTRIES),dbAll(STORE_BACKTESTS)]);
    await enrichEntries(entries,tests);
    for(const entry of entries){
      const card=findEntryElement(entry);if(!card)continue;
      let box=card.querySelector(':scope > .xrank-box');if(!box){box=document.createElement('div');box.className='xrank-box';card.appendChild(box)}
      const rows=rankRowsForEntry(entry,tests);
      const html=`<div class="xrank-title">Kazananın kesin 5 Model sıraları</div>${exactLines(rows)}${exactHistory(rows)}`;if(box.innerHTML!==html)box.innerHTML=html;
    }
    const no=selectedRaceNo(),key=targetKey(currentDate(),cityName(),no),current=entries.find(e=>clean(e?.key)===key);
    const status=$('xcalStatus');
    if(status&&current&&!status.dataset.xrankF597){status.dataset.xrankF597='1';status.textContent='Hazır. Kalibrasyonda ortalama ve Top1/Top2/Top3/Top5 yerine kazananın kesin 5 Model sıraları gösterilir.'}
    const bridge=$('xcalCouponBridgeF595');if(bridge&&!bridge.dataset.xrankF597){bridge.dataset.xrankF597='1';const p=bridge.querySelector('p');if(p)p.innerHTML='<b>Kalibrasyon verisi sadeleştirildi.</b> Ekranda artık kazananın kesin model sıraları esas gösterimdir. Kupon sırasında 5 Model yeniden hesaplanmaz.'}
  }finally{decorateBusy=false;if(queued){queued=false;requestAnimationFrame(()=>void decorateExactRanks())}}
}

function observeCurrent(){
  if(observer){observer.disconnect();observer=null}
  const host=$('analysisContent');if(!host)return;
  observer=new MutationObserver(()=>{if(document.querySelector('#analysisContent .xcal-wrap'))requestAnimationFrame(()=>void decorateExactRanks())});
  observer.observe(host,{childList:true,subtree:true});
}

const baseApi=window.ATExactMatchCalibrationV1691F594;
if(baseApi?.render){const prev=baseApi.render.bind(baseApi);baseApi.render=function(...args){const r=prev(...args);observeCurrent();requestAnimationFrame(()=>void decorateExactRanks());return r}}
window.addEventListener('change',event=>{if(event.target?.closest?.('#xcalRace'))requestAnimationFrame(()=>void decorateExactRanks())},true);
window.addEventListener('click',event=>{if(event.target?.closest?.('[data-view="calibration"]'))requestAnimationFrame(()=>{observeCurrent();void decorateExactRanks()})},true);

window.ATExactRankCalibrationV1691F597={version:VERSION,refresh:decorateExactRanks};
console.info('[AT AI]',VERSION,'aktif — kalibrasyon ekrani kesin kazanan 5 Model siralarina sadeleştirildi; yeniden 5 Model hesap yok; timeout yok.');
})();