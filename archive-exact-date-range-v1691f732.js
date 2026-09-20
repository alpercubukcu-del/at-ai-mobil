/* AT AI Mobil - V16.9.1F60.94.31.12 exact-date archive controls */
(()=>{
'use strict';
if(window.__AT_ARCHIVE_EXACT_DATE_F60943112__)return;
window.__AT_ARCHIVE_EXACT_DATE_F60943112__=true;
const VERSION='ARCHIVE-EXACT-DATE-V16.9.1F60.94.31.12';
const INDEX_DB='at_ai_tjk_real_race_index_v1';
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let realBusy=false,trackBusy=false;
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function validIso(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))}
function trDate(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:String(v||'')}
function exactRange(kind){
 const fromId=kind==='real'?'rrDateFromF609428':'tmDateFromF609428';
 const toId=kind==='real'?'rrDateToF609428':'tmDateToF609428';
 const min=kind==='real'?'1800-01-01':'2000-01-01',max=todayIso();
 let a=$(fromId)?.value||'',b=$(toId)?.value||'';
 if(!validIso(a)||!validIso(b))return null;
 if(a>b)[a,b]=[b,a];
 if(a<min||b<min||a>max)return null;
 if(b>max)b=max;
 return[a,b];
}
function setRealStatus(text,pct=null){const s=$('rrStatusF6093');if(s)s.textContent=String(text||'');const b=$('rrBarF6093');if(b&&pct!==null){const n=Math.max(0,Math.min(100,Number(pct)||0));b.style.width=n+'%';b.setAttribute('aria-valuenow',String(n))}}
function setTrackStatus(text,pct=null){const s=$('tmRealStatusF609416');if(s)s.textContent=String(text||'');const b=$('tmRealBarF609416');if(b&&pct!==null){const n=Math.max(0,Math.min(100,Number(pct)||0));b.style.width=n+'%';b.setAttribute('aria-valuenow',String(n))}}
function setRealBusy(on){realBusy=!!on;for(const id of['rrDownloadResumeF609428','rrDownloadFixedF609427','rrDownloadF6093','rrUpdateResumeF609428','rrUpdateFixedF609427','rrUpdateF6093','rrApplyAnalysisF609418']){const b=$(id);if(b)b.disabled=!!on}}
function setTrackBusy(on){trackBusy=!!on;for(const id of['tmRealBackfillF609416','tmRangeUpdateF609426','tmRealNowF609416','tmRealApplyF609416']){const b=$(id);if(b)b.disabled=!!on}}
async function waitReal(ms=10000){const t=Date.now();while(Date.now()-t<ms){const a=window.ATRealRaceArchiveF6093;if(typeof a?.syncRange==='function')return a;await sleep(100)}return null}
async function waitTrack(ms=10000){const t=Date.now();while(Date.now()-t<ms){const a=window.ATTrackMaintenanceV1;if(typeof a?.syncRange==='function')return a;await sleep(100)}return null}
async function refreshAll(){try{await window.ATArchiveYearInventoryF609425?.refresh?.()}catch{}try{await window.ATRealRaceArchiveF6093?.refresh?.()}catch{}try{await window.ATAnnualResultsArchiveV661?.refresh?.()}catch{}}
function openIndexDb(){return new Promise(resolve=>{let q;try{q=indexedDB.open(INDEX_DB)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null)})}
async function metaGet(key){const db=await openIndexDb();if(!db||!db.objectStoreNames.contains('meta')){try{db?.close?.()}catch{}return null}return new Promise(resolve=>{try{const q=db.transaction('meta','readonly').objectStore('meta').get(key);q.onsuccess=()=>{const v=q.result||null;try{db.close()}catch{}resolve(v)};q.onerror=()=>{try{db.close()}catch{}resolve(null)}}catch{try{db.close()}catch{}resolve(null)}})}
async function showExactCheckpoint(){
 const r=exactRange('real');let el=$('rrResumeInfoF609428');const anchor=$('rrCalendarHintF609428')||$('rrDownloadResumeF609428')||$('rrDownloadF6093');if(!anchor)return;
 if(!el){el=document.createElement('div');el.id='rrResumeInfoF609428';el.className='tmr416-status';el.style.margin='6px 0';anchor.insertAdjacentElement('afterend',el)}
 if(!r){el.textContent='Devam kaydı: geçerli başlangıç ve bitiş tarihi seçin.';return}
 const[a,b]=r,m=await metaGet(`range:${a}:${b}`);if(!m){el.textContent=`Devam kaydı: ${trDate(a)} → ${trDate(b)} henüz taranmadı.`;return}
 const total=Number(m.total||0),pages=total?Math.max(1,Math.ceil(total/50)):Math.max(0,Number(m.lastPage||-1)+1);
 if(m.status==='complete')el.textContent=`Devam kaydı: ${trDate(a)} → ${trDate(b)} · Koşu Sorgulama taraması ${pages}/${pages} sayfa tamam.`;
 else el.textContent=`Devam kaydı: ${trDate(a)} → ${trDate(b)} · Koşu Sorgulama ${Math.min(pages,Number(m.nextPage||0))}/${pages||'?'} sayfa.`;
}
async function runReal(mode){
 if(realBusy)return;const r=exactRange('real');if(!r){setRealStatus('Geçerli bir başlangıç ve bitiş tarihi seçin. Gelecek tarih kullanılamaz.',0);return}
 const api=await waitReal();if(!api){setRealStatus('Gerçek Yarış Arşivi exact-date motoru yüklenemedi. Sayfayı yenileyin.',0);return}
 const[a,b]=r;window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__=true;setRealBusy(true);
 setRealStatus(`${trDate(a)} → ${trDate(b)} ${mode==='update'?'eksikleri kontrol ediliyor':'indiriliyor'}; yıl başına dönülmeyecek. Tamamlanmış gün/şehir kayıtları atlanacak…`,0);
 try{
  const out=await api.syncRange(a,b,{mode,label:mode==='update'?'Seçili tarih eksik kontrolü':'Seçili tarih arşivi'});
  await refreshAll();await showExactCheckpoint();
  const races=Number(out?.races||0),groups=Number(out?.groups||0),errors=Number(out?.errors||0),skipped=Number(out?.skipped||0);
  setRealStatus(`${trDate(a)} → ${trDate(b)} tamamlandı · ${races} indeks yarışı · ${groups} gün/şehir · ${skipped} tamamlanmış gün atlandı${errors?` · ${errors} hata`:''}.`,100);
  try{await window.ATArchiveHubMenu8F609418?.applyToAnalyses?.(false)}catch{}
 }catch(e){setRealStatus('Gerçek yarış tarih aralığı hatası: '+(e?.message||e),0)}finally{window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__=false;setRealBusy(false);await refreshAll()}
}
async function runTrack(mode){
 if(trackBusy)return;const r=exactRange('track');if(!r){setTrackStatus('Geçerli bir başlangıç ve bitiş tarihi seçin. Gelecek tarih kullanılamaz.',0);return}
 const api=await waitTrack();if(!api){setTrackStatus('Pist/Bakım/Hava tarih motoru yüklenemedi. Sayfayı yenileyin.',0);return}
 const[a,b]=r;setTrackBusy(true);setTrackStatus(`${trDate(a)} → ${trDate(b)} Pist/Bakım/Hava ${mode==='update'?'eksikleri kontrol ediliyor':'indiriliyor'}; yıl başına dönülmeyecek…`,0);
 try{const rows=await api.syncRange(a,b,{loadReports:true,label:mode==='update'?'Seçili tarih eksik kontrolü':'Seçili tarih arşivi'});await refreshAll();setTrackStatus(`${trDate(a)} → ${trDate(b)} tamamlandı · ${Array.isArray(rows)?rows.length:0} gün/hipodrom kaydı kontrol edildi. Mevcut rapor ayrıntıları tekrar indirilmedi.`,100)}catch(e){setTrackStatus('Pist/Bakım/Hava tarih aralığı hatası: '+(e?.message||e),0)}finally{setTrackBusy(false);await refreshAll()}
}
function bindCapture(el,tag,handler){if(!el||el.dataset.exactDateF60943112===tag)return false;el.dataset.exactDateF60943112=tag;el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void handler();return false},true);return true}
function setText(ids,text){for(const id of ids){const b=$(id);if(b){b.textContent=text;return b}}return null}
function dateChanged(){void showExactCheckpoint()}
function claim(){
 try{window.ATArchiveCalendarResumeF609428?.claim?.()}catch{}
 const rh=$('rrCalendarHintF609428');if(rh)rh.textContent='Seçtiğiniz başlangıç ve bitiş tarihleri aynen kullanılır. Aynı gün seçilirse yalnız o gün indirilir; yıl başına dönülmez.';
 const th=$('tmCalendarHintF609428');if(th)th.textContent='Seçtiğiniz tarih aralığı aynen kullanılır. Mevcut Pist/Bakım/Hava kayıtları korunur; eksik/değişen raporlar tamamlanır.';
 const rd=setText(['rrDownloadResumeF609428','rrDownloadFixedF609427','rrDownloadF6093'],'Seçili Tarih Aralığını İndir / Kaldığı Yerden Devam Et');
 const ru=setText(['rrUpdateResumeF609428','rrUpdateFixedF609427','rrUpdateF6093'],'Seçili Tarih Aralığındaki Eksikleri Güncelle');
 const td=setText(['tmRealBackfillF609416'],'Seçili Tarih Aralığını Bir Kez İndir');
 const tu=setText(['tmRangeUpdateF609426','tmRealNowF609416'],'Seçili Tarih Aralığındaki Eksikleri Güncelle');
 bindCapture(rd,'real-download',()=>runReal('download'));bindCapture(ru,'real-update',()=>runReal('update'));bindCapture(td,'track-download',()=>runTrack('download'));bindCapture(tu,'track-update',()=>runTrack('update'));
 for(const id of['rrDateFromF609428','rrDateToF609428']){const x=$(id);if(x&&x.dataset.exactCheckpointF60943112!=='1'){x.dataset.exactCheckpointF60943112='1';x.addEventListener('change',dateChanged);x.addEventListener('input',dateChanged)}}
 void showExactCheckpoint();return !!(rd||ru||td||tu)
}
function wrapHub(){const hub=window.ATArchiveHubMenu8F609418;if(!hub||typeof hub.open!=='function'||hub.open.__exactDateF60943112)return false;const old=hub.open;const wrapped=function(...args){const out=old.apply(this,args);for(const ms of[20,180,500,900,1550,2200])setTimeout(claim,ms);return out};wrapped.__exactDateF60943112=true;hub.open=wrapped;return true}
function install(){claim();wrapHub();window.addEventListener('at-ai:archive-hub-ready',()=>{for(const ms of[20,250,800,1600])setTimeout(()=>{claim();wrapHub()},ms)},{passive:true});for(const ms of[100,450,1000,1800,2600])setTimeout(()=>{claim();wrapHub()},ms)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATArchiveExactDateF60943112={version:VERSION,claim,runReal,runTrack,showExactCheckpoint};
console.info('[AT AI]',VERSION,'active - menu 8 uses exact inclusive dates for real results and track/maintenance/weather; year normalization disabled.');
})();
