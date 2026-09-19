/* AT AI Mobil - V16.9.1F60.94.27 real race parser/storage repair */
(()=>{
'use strict';
if(window.__AT_REAL_RACE_REPAIR_F609427__)return;
window.__AT_REAL_RACE_REPAIR_F609427__=true;
const VERSION='REAL-RACE-REPAIR-V16.9.1F60.94.27';
const INDEX_DB='at_ai_tjk_real_race_index_v1';
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let busy=false;
function currentYear(){return new Date().getFullYear()}
function range(){const a=Number($('rrYearFromF6093')?.value),b=Number($('rrYearToF6093')?.value),y=currentYear();if(!Number.isInteger(a)||!Number.isInteger(b)||a<1800||b<1800||a>y||b>y)return null;return[Math.min(a,b),Math.max(a,b)]}
function setStatus(text,pct=null){const s=$('rrStatusF6093');if(s)s.textContent=String(text||'');const bar=$('rrBarF6093');if(bar&&pct!==null){const n=Math.max(0,Math.min(100,Number(pct)||0));bar.style.width=n+'%';bar.setAttribute('aria-valuenow',String(n))}}
function setBusy(on){busy=!!on;for(const id of['rrDownloadFixedF609427','rrUpdateFixedF609427','rrApplyAnalysisF609418']){const b=$(id);if(b)b.disabled=!!on}}
async function openDb(){return new Promise(resolve=>{let q;try{q=indexedDB.open(INDEX_DB)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null)})}
function validRaceNo(v){const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=30}
async function purgeMalformedIndex(){const db=await openDb();if(!db||!db.objectStoreNames.contains('races')){try{db?.close?.()}catch{}return 0}return new Promise(resolve=>{let removed=0;try{const tx=db.transaction(['races','meta'].filter(x=>db.objectStoreNames.contains(x)),'readwrite'),os=tx.objectStore('races'),q=os.openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return;const row=c.value;if(!validRaceNo(row?.raceNo)){c.delete();removed++}c.continue()};tx.oncomplete=()=>{try{db.close()}catch{}resolve(removed)};tx.onerror=tx.onabort=()=>{try{db.close()}catch{}resolve(removed)}}catch{try{db.close()}catch{}resolve(removed)}})}
async function waitEngine(ms=10000){const t=Date.now();while(Date.now()-t<ms){const api=window.ATRealRaceArchiveF6093;if(api?.syncYears)return api;await sleep(100)}return null}
async function totals(a,b){let index=0,results=0,days=0,pending=0;const inv=window.ATArchiveYearInventoryF609425;for(let y=a;y<=b;y++){const s=await inv?.realYearStats?.(y);if(s){index+=Number(s.indexCount)||0;results+=Number(s.raceCount)||0;days+=Number(s.dayCount)||0;pending+=Number(s.pending)||0}}return{index,results,days,pending}}
async function refresh(){try{await window.ATArchiveYearInventoryF609425?.refresh?.()}catch{}try{await window.ATRealRaceArchiveF6093?.refresh?.()}catch{}}
async function run(mode='update'){
 if(busy)return;const yr=range();if(!yr){setStatus(`Yıl aralığı 1800-${currentYear()} arasında olmalı.`,0);return}const api=await waitEngine();if(!api){setStatus('Gerçek Yarış Arşivi motoru yüklenemedi.',0);return}
 const[a,b]=yr;window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__=true;setBusy(true);
 try{
  const removed=await purgeMalformedIndex();
  setStatus(`${a}-${b} Koşu Sorgulama taraması başlıyor${removed?` · ${removed} eski hatalı indeks temizlendi`:''}. Yarış numaraları doğrulanacak, mevcut tam günler atlanacak…`,0);
  await api.syncYears(a,b);
  await refresh();const t=await totals(a,b);
  if(t.results>0){const state=t.pending>0?'Kısmi arşiv':'Arşiv hazır';setStatus(`${state} · ${a}-${b}: ${t.index} geçerli indeks · ${t.results} tam yarış sonucu · ${t.days} gün/şehir · ${t.pending} bekleyen. Pist/Bakım/Hava çalıştırılmadı.`,100)}
  else setStatus(`Arşiv hazır değil · ${a}-${b}: ${t.index} geçerli indeks bulundu fakat 0 tam yarış sonucu var · ${t.pending} bekleyen. Analizlere bağlanmadı.`,100);
 }catch(e){setStatus('Gerçek yarış arşivi hatası: '+(e?.message||e),0)}finally{window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__=false;setBusy(false);await refresh()}
}
function ownButton(oldId,newId,mode){let b=$(newId)||$(oldId);if(!b)return false;if(b.id!==newId)b.id=newId;b.dataset.realRaceRepair='F60.94.27';b.onclick=e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();void run(mode);return false};return true}
function claim(){const a=ownButton('rrDownloadF6093','rrDownloadFixedF609427','download'),b=ownButton('rrUpdateF6093','rrUpdateFixedF609427','update');return a||b}
function wrapHub(){const hub=window.ATArchiveHubMenu8F609418;if(!hub||typeof hub.open!=='function'||hub.open.__realRaceRepairF609427)return false;const old=hub.open;const wrapped=function(...args){const out=old.apply(this,args);for(const ms of[0,60,180,450])setTimeout(claim,ms);return out};wrapped.__realRaceRepairF609427=true;hub.open=wrapped;return true}
function install(){claim();wrapHub();window.addEventListener('at-ai:archive-hub-ready',()=>{claim();wrapHub()},{passive:true});for(const ms of[80,250,700,1500])setTimeout(()=>{claim();wrapHub()},ms)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATRealRaceRepairF609427={version:VERSION,run,purgeMalformedIndex,claim};
console.info('[AT AI]',VERSION,'active - invalid decimal race numbers are purged; both real-race actions use validated full-year archive flow.');
})();
