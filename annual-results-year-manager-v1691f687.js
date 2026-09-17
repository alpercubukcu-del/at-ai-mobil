/* AT AI Mobil — F60.87 yıllara göre sonuç arşivi yöneticisi */
(() => {
'use strict';
if (window.__AT_F6087_ANNUAL_YEAR_MANAGER__) return;
window.__AT_F6087_ANNUAL_YEAR_MANAGER__ = true;

const VERSION='ANNUAL-RESULTS-YEAR-MANAGER-V16.9.1F60.87';
const DB='at_ai_tjk_annual_results_v1', RACES='races', DAYS='days', META='meta';
const JOB_KEY='f6079:yg-results-job', NUMBERING_SOURCE='TJK_RESULTS';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fmt=n=>Number(n||0).toLocaleString('tr-TR');
const yearOf=row=>Number(row?.year||String(row?.date||row?.scheduledDate||'').slice(0,4))||0;
const dateOf=row=>clean(row?.date||row?.scheduledDate);
let observer=null, renderBusy=false, pending=false;

function openDb(){return new Promise(resolve=>{let q;try{q=indexedDB.open(DB)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null);});}
async function scanStore(db,store,onRow){
  if(!db?.objectStoreNames?.contains(store))return;
  await new Promise(resolve=>{try{const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).openCursor();req.onsuccess=e=>{const c=e.target.result;if(!c)return;try{onRow(c.value)}catch{}c.continue()};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>resolve();}catch{resolve();}});
}
async function inventory(){
  const db=await openDb();if(!db)return[];
  const map=new Map();
  const row=y=>{if(!map.has(y))map.set(y,{year:y,races:0,days:0,complete:0,verified:0,legacy:0,partial:0,last:''});return map.get(y)};
  try{
    await scanStore(db,RACES,r=>{const y=yearOf(r);if(!y)return;const s=row(y);s.races++;const d=dateOf(r);if(d&&d>s.last)s.last=d;});
    await scanStore(db,DAYS,d=>{const y=yearOf(d);if(!y)return;const s=row(y);s.days++;const dt=dateOf(d);if(Number(d?.raceCount||0)>0&&dt&&dt>s.last)s.last=dt;if(d?.status==='complete'){s.complete++;if(d?.numberingSource===NUMBERING_SOURCE)s.verified++;else s.legacy++;}else s.partial++;});
  } finally {try{db.close()}catch{}}
  return [...map.values()].filter(x=>x.races||x.days).sort((a,b)=>b.year-a.year);
}
async function storageText(){
  try{const e=await navigator.storage?.estimate?.();if(!e)return'Depolama bilgisi alınamadı.';const mb=n=>`${(Number(n||0)/1048576).toFixed(1)} MB`;const gb=n=>`${(Number(n||0)/1073741824).toFixed(2)} GB`;return`Tarayıcı depolaması: ${mb(e.usage)} kullanılıyor · kota ${e.quota>=1073741824?gb(e.quota):mb(e.quota)}`;}catch{return'Depolama bilgisi alınamadı.';}
}
function prettyDate(v){const s=clean(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}.${m[2]}.${m[1]}`:(s||'—');}
function ensureStyle(){if($('f6087YearManagerStyle'))return;const st=document.createElement('style');st.id='f6087YearManagerStyle';st.textContent=`
#aarMetaV661.f6087-years{display:grid!important;gap:8px!important;margin-top:10px!important}
.f6087-year-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(15,23,42,.38)}
.f6087-year-main{min-width:0;line-height:1.35}.f6087-year-title{font-weight:800;font-size:15px}.f6087-year-detail{font-size:12px;opacity:.88;margin-top:3px;word-break:break-word}
.f6087-year-delete{flex:0 0 auto;min-width:72px;padding:8px 10px!important;font-size:12px!important}.f6087-empty{padding:10px 0;opacity:.8}
@media(max-width:520px){.f6087-year-row{align-items:flex-start}.f6087-year-detail{font-size:11px}.f6087-year-delete{min-width:62px;padding:7px 8px!important}}
`;document.head.appendChild(st);}
function ensureUi(){
  const host=$('aarMetaV661');if(!host)return null;ensureStyle();host.classList.add('f6087-years');host.dataset.f6087='1';
  const oldDelete=$('aarDeleteV661');if(oldDelete){oldDelete.style.display='none';oldDelete.setAttribute('aria-hidden','true');}
  const section=$('annualResultsSectionV661');if(section&&!$('f6087YearNote')){const n=document.createElement('div');n.id='f6087YearNote';n.className='aa-note';n.style.marginTop='9px';n.textContent='Telefondaki sonuç arşivi aşağıda yıl yıl gösterilir. Her yıl bağımsız silinebilir; Program Arşivi silinmez.';host.insertAdjacentElement('beforebegin',n);}
  return host;
}
async function render(){
  if(renderBusy){pending=true;return;}renderBusy=true;
  try{
    const host=ensureUi();if(!host)return;
    const rows=await inventory();
    host.innerHTML=rows.length?rows.map(m=>{
      const missing=Math.max(0,m.days-m.complete),legacy=m.legacy?` · ${fmt(m.legacy)} eski tam kayıt TJK No doğrulanacak`:'';
      return `<div class="f6087-year-row" data-f6087-row="${m.year}"><div class="f6087-year-main"><div class="f6087-year-title">${m.year}</div><div class="f6087-year-detail">${fmt(m.races)} yarış · ${fmt(m.complete)}/${fmt(m.days)} gün tam · ${fmt(m.verified)} TJK Koşu No doğrulandı · son ${prettyDate(m.last)}${missing?` · ${fmt(missing)} eksik`:''}${legacy}</div></div><button type="button" class="aa-btn secondary f6087-year-delete" data-f6087-delete="${m.year}">Yılı Sil</button></div>`;
    }).join(''):'<div class="f6087-empty" data-f6087-empty="1">Telefonda kayıtlı sonuç yılı yok.</div>';
    const stg=$('aarStorageV661');if(stg)stg.textContent=await storageText();
  } finally {renderBusy=false;if(pending){pending=false;setTimeout(()=>void render(),40);}}
}
async function deleteYear(year){
  const y=Number(year);if(!y)return false;const db=await openDb();if(!db)return false;
  const stores=[RACES,DAYS,META].filter(s=>db.objectStoreNames.contains(s));
  const ok=await new Promise(resolve=>{try{const tx=db.transaction(stores,'readwrite');for(const store of [RACES,DAYS]){if(!stores.includes(store))continue;const os=tx.objectStore(store),idx=os.indexNames.contains('year')?os.index('year'):null,req=idx?idx.openCursor(IDBKeyRange.only(y)):os.openCursor();req.onsuccess=e=>{const c=e.target.result;if(!c)return;const r=c.value;if(idx||yearOf(r)===y)c.delete();c.continue();};}if(stores.includes(META)){const os=tx.objectStore(META);os.delete(`year:${y}`);os.delete(JOB_KEY);const req=os.openCursor();req.onsuccess=e=>{const c=e.target.result;if(!c)return;const r=c.value;if(Number(r?.year||0)===y)c.delete();c.continue();};}tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);}catch{resolve(false);}});
  try{db.close()}catch{}
  await render();
  try{window.ATF6084ArchiveProgress?.refresh?.()}catch{}
  return ok;
}
function schedule(){for(const ms of[0,120,450,1200,3000])setTimeout(()=>void render(),ms);}
function bind(){
  const host=ensureUi();if(!host)return false;
  if(!observer){observer=new MutationObserver(()=>{const managed=host.querySelector('[data-f6087-row],[data-f6087-empty]');if(!managed)setTimeout(()=>void render(),25);});observer.observe(host,{childList:true,subtree:true,characterData:true});}
  if(host.dataset.f6087Bound!=='1'){host.dataset.f6087Bound='1';host.addEventListener('click',async e=>{const b=e.target?.closest?.('[data-f6087-delete]');if(!b)return;const y=Number(b.dataset.f6087Delete);if(!y)return;if(!confirm(`${y} sonuç arşivi telefondan silinsin mi? Diğer yıllar ve Program Arşivi korunur.`))return;b.disabled=true;const ok=await deleteYear(y);const status=$('aarStatusV661');if(status)status.textContent=ok?`${y} sonuç arşivi silindi. Diğer yıllar ve Program Arşivi korundu.`:`${y} arşivi silinemedi.`;});}
  return true;
}
function boot(){if(bind())schedule();else{setTimeout(boot,250);}}
window.addEventListener('load',boot);window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
document.addEventListener('click',e=>{if(e.target?.closest?.('#annualArchiveBtn,#aarUpdateV661,#f62rUpdate,#f62rRepair'))schedule();},true);
document.addEventListener('change',e=>{if(e.target?.matches?.('#aarYearFromV661,#aarYearToV661'))schedule();},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('at-ai:annual-archive-open',schedule);
window.ATF6087AnnualYearManager={version:VERSION,render,inventory,deleteYear};
console.info('[AT AI]',VERSION,'aktif — sonuç arşivi tüm kayıtlı yılları ayrı gösterir ve her yıl bağımsız silinebilir.');
})();
