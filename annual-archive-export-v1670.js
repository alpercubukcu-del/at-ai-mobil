/* AT AI Mobil — V16.7.0 Annual Archive Export
   Telefonda zaten bulunan yıllık arşivi ikinci kez kopyalamadan,
   yalnız analiz için gerekli alanlarla kompakt JSON olarak dışa aktarır.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_ARCHIVE_EXPORT_V1670__) return;
window.__AT_ANNUAL_ARCHIVE_EXPORT_V1670__ = true;

const VERSION='ANNUAL-ARCHIVE-EXPORT-V16.7.0';
const DB_NAME='at_ai_tjk_annual_archive_v13';
const DB_VERSION=2;
const STORE='races';
const BTN_ID='aaExportAllV1670';
const STATUS_ID='aaExportStatusV1670';
let exporting=false;

function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
function openDb(){return new Promise(resolve=>{if(!('indexedDB' in window))return resolve(null);let r;try{r=indexedDB.open(DB_NAME,DB_VERSION);}catch{return resolve(null);}r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);r.onblocked=()=>resolve(null);});}
function readAllRows(){return openDb().then(db=>new Promise(resolve=>{if(!db)return resolve([]);const out=[];try{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).openCursor();req.onsuccess=e=>{const c=e.target.result;if(!c)return;const r=c.value?.value;if(r)out.push(r);c.continue();};tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>resolve([]);}catch{resolve([]);}}));}
function compact(r){return {
  date:clean(r?.date),year:Number(r?.year)||null,city:clean(r?.city),cityId:clean(r?.cityId),
  ageGroup:clean(r?.groupRaw),class:clean(r?.classRaw),classBase:clean(r?.classBase),
  extraTokens:Array.isArray(r?.extraTokens)?r.extraTokens.map(clean).filter(Boolean):[],
  distance:Number(r?.distance)||null,track:clean(r?.track),prizeRaw:clean(r?.prizeRaw),
  raceName:clean(r?.raceName),raceNo:Number.isFinite(Number(r?.raceNo))?Number(r.raceNo):null,
  occurrenceIndex:Number(r?.occurrenceIndex)||null,permanentKey:clean(r?.permanentKey),
  resolutionMethod:clean(r?.resolutionMethod)
};}
function setStatus(text){const el=document.getElementById(STATUS_ID);if(el)el.textContent=text;}
function fileName(years){const min=years.length?Math.min(...years):'bos';const max=years.length?Math.max(...years):'bos';return `AT_AI_YILLIK_ARSIV_${min}-${max}_${new Date().toISOString().slice(0,10)}.json`;}
async function exportAll(){if(exporting)return;exporting=true;const btn=document.getElementById(BTN_ID);if(btn){btn.disabled=true;btn.textContent='Arşiv Hazırlanıyor…';}setStatus('Telefondaki yıllık arşiv okunuyor…');try{
  const rows=await readAllRows();
  if(!rows.length)throw new Error('Telefonda dışa aktarılacak yıllık arşiv bulunamadı. Önce en az bir yılı indir.');
  const data=rows.map(compact).filter(r=>r.date&&r.city&&r.class&&r.distance);
  data.sort((a,b)=>a.date.localeCompare(b.date)||a.city.localeCompare(b.city,'tr')||(a.raceNo??99)-(b.raceNo??99));
  const years=[...new Set(data.map(r=>r.year).filter(Number.isFinite))].sort((a,b)=>a-b);
  const payload={
    schema:'AT_AI_ANNUAL_ARCHIVE_EXPORT_V1',version:VERSION,exportedAt:new Date().toISOString(),
    sourceDb:DB_NAME,recordCount:data.length,years,fields:['date','year','city','cityId','ageGroup','class','classBase','extraTokens','distance','track','prizeRaw','raceName','raceNo','occurrenceIndex','permanentKey','resolutionMethod'],
    races:data
  };
  const blob=new Blob([JSON.stringify(payload)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName(years);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  const mb=(blob.size/1024/1024).toFixed(2);setStatus(`${data.length} yarış · ${years.length} yıl · ${mb} MB JSON hazırlandı.`);
}catch(e){setStatus(`Dışa aktarım olmadı: ${e?.message||e}`);}finally{exporting=false;if(btn){btn.disabled=false;btn.textContent='Tüm Arşivi JSON Dışa Aktar';}}}
function install(){const d=document.getElementById('tjkAnnualArchiveDialog');if(!d)return false;if(document.getElementById(BTN_ID))return true;const update=document.getElementById('aaUpdateYear');const actions=update?.closest('.aa-actions');if(!actions)return false;const btn=document.createElement('button');btn.className='aa-btn secondary';btn.id=BTN_ID;btn.type='button';btn.textContent='Tüm Arşivi JSON Dışa Aktar';btn.addEventListener('click',exportAll);actions.appendChild(btn);const st=document.createElement('div');st.id=STATUS_ID;st.className='aa-status';st.textContent='Dışa aktarım yalnız telefonda zaten bulunan yılları kullanır; yeni veri indirmez.';actions.insertAdjacentElement('afterend',st);return true;}
const obs=new MutationObserver(()=>install());try{obs.observe(document.documentElement,{subtree:true,childList:true});}catch{}
window.addEventListener('load',()=>setTimeout(install,80));setTimeout(install,0);
window.ATAnnualArchiveExportV1670={VERSION,exportAll,install};
console.info('[AT AI]',VERSION,'aktif — yıllık arşiv kompakt JSON dışa aktarım.');
})();
