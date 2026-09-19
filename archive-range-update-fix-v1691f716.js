/* AT AI Mobil - V16.9.1F60.94.26 selected-range archive update fix */
(()=>{
'use strict';
if(window.__AT_ARCHIVE_RANGE_UPDATE_F609426__)return;
window.__AT_ARCHIVE_RANGE_UPDATE_F609426__=true;
const VERSION='ARCHIVE-RANGE-UPDATE-V16.9.1F60.94.26';
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let realBusy=false,trackBusy=false,trackWrapped=false;

function currentYear(){return new Date().getFullYear()}
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function validRange(fromId,toId,minYear){const a=Number($(fromId)?.value),b=Number($(toId)?.value),y=currentYear();if(!Number.isInteger(a)||!Number.isInteger(b)||a<minYear||b<minYear||a>y||b>y)return null;return[Math.min(a,b),Math.max(a,b)]}
function yearBounds(y){const now=currentYear();return[`${y}-01-01`,y===now?todayIso():`${y}-12-31`]}
function setRealStatus(text,pct=null){const s=$('rrStatusF6093');if(s)s.textContent=String(text||'');const b=$('rrBarF6093');if(b&&pct!==null){const n=Math.max(0,Math.min(100,Number(pct)||0));b.style.width=n+'%';b.setAttribute('aria-valuenow',String(n))}}
function setTrackStatus(text,pct=null){const s=$('tmRealStatusF609416');if(s)s.textContent=String(text||'');const b=$('tmRealBarF609416');if(b&&pct!==null){const n=Math.max(0,Math.min(100,Number(pct)||0));b.style.width=n+'%';b.setAttribute('aria-valuenow',String(n))}}
function setRealBusy(on){realBusy=!!on;for(const id of['rrDownloadF6093','rrUpdateF6093','rrApplyAnalysisF609418']){const b=$(id);if(b)b.disabled=!!on}}
function setTrackBusy(on){trackBusy=!!on;for(const id of['tmRealBackfillF609416','tmRangeUpdateF609426','tmRealApplyF609416']){const b=$(id);if(b)b.disabled=!!on}}
async function waitReal(ms=10000){const t=Date.now();while(Date.now()-t<ms){const a=window.ATRealRaceArchiveF6093;if(a?.syncYears)return a;await sleep(100)}return null}
async function waitTrack(ms=10000){const t=Date.now();while(Date.now()-t<ms){const a=window.ATTrackMaintenanceV1;if(a?.syncRange&&a?.autoSync)return a;await sleep(100)}return null}
async function refreshInventory(){try{await window.ATArchiveYearInventoryF609425?.refresh?.()}catch{}try{await window.ATRealRaceArchiveF6093?.refresh?.()}catch{}}

function wrapTrackAutoSync(){
 const api=window.ATTrackMaintenanceV1;if(!api?.autoSync)return false;
 if(api.autoSync.__rangeGuardF609426){trackWrapped=true;return true}
 const old=api.autoSync;
 const wrapped=async function(...args){
  if(window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__){console.info('[AT AI]',VERSION,'track autoSync skipped while real-race range update is active');return false}
  return old.apply(this,args)
 };
 wrapped.__rangeGuardF609426=true;wrapped.__rangeGuardOriginal=old;api.autoSync=wrapped;trackWrapped=true;return true;
}

async function realTotals(a,b){let index=0,results=0,days=0,pending=0;const inv=window.ATArchiveYearInventoryF609425;for(let y=a;y<=b;y++){try{const s=await inv?.realYearStats?.(y);if(s){index+=Number(s.indexCount)||0;results+=Number(s.raceCount)||0;days+=Number(s.dayCount)||0;pending+=Number(s.pending)||0}}catch{}}return{index,results,days,pending}}
async function trackTotals(a,b){let count=0;const inv=window.ATArchiveYearInventoryF609425;for(let y=a;y<=b;y++){try{const s=await inv?.trackYearStats?.(y);count+=Number(s?.count)||0}catch{}}return{count}}

async function runRealRangeUpdate(){
 if(realBusy)return;const yr=validRange('rrYearFromF6093','rrYearToF6093',1800);if(!yr){setRealStatus(`Yıl aralığı 1800-${currentYear()} arasında olmalı.`,0);return}
 const api=await waitReal();if(!api){setRealStatus('Gerçek Yarış Arşivi motoru yüklenemedi. Sayfayı yenileyin.',0);return}
 const[a,b]=yr,[firstStart]=yearBounds(a),[,lastEnd]=yearBounds(b);
 wrapTrackAutoSync();window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__=true;setRealBusy(true);setRealStatus(`${a}-${b} tam aralık kontrol ediliyor: ${firstStart} → ${lastEnd}. Mevcut tamamlanmış günler atlanacak, yalnız eksikler indirilecek…`,0);
 try{
  await api.syncYears(a,b);
  await refreshInventory();
  const t=await realTotals(a,b);
  if(t.results>0)setRealStatus(`${a}-${b} kontrolü tamamlandı · ${t.index} indeks · ${t.results} tam yarış sonucu · ${t.days} gün/şehir · ${t.pending} bekleyen. Pist/Bakım/Hava bu işlemde çalıştırılmadı.`,100);
  else setRealStatus(`${a}-${b} taraması tamamlandı ancak telefonda tam yarış sonucu oluşmadı · ${t.index} indeks · ${t.pending} bekleyen. Arşiv henüz analiz kaynağına hazır değil.`,100);
 }catch(e){setRealStatus('Gerçek yarış eksik güncelleme hatası: '+(e?.message||e),0)}
 finally{window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__=false;setRealBusy(false);await refreshInventory()}
}

async function runTrackRangeUpdate(){
 if(trackBusy)return;const yr=validRange('tmRealFromF609416','tmRealToF609416',2000);if(!yr){setTrackStatus(`Yıl aralığı 2000-${currentYear()} arasında olmalı.`,0);return}
 const api=await waitTrack();if(!api){setTrackStatus('Pist/Bakım/Hava arşiv motoru yüklenemedi. Sayfayı yenileyin.',0);return}
 const[a,b]=yr,[firstStart]=yearBounds(a),[,lastEnd]=yearBounds(b);setTrackBusy(true);setTrackStatus(`${a}-${b} Pist/Bakım/Hava eksikleri kontrol ediliyor: ${firstStart} → ${lastEnd}. Var olan raporlar korunacak; eksik/değişen raporlar tamamlanacak…`,0);
 try{
  for(let y=a;y<=b;y++){const[start,end]=yearBounds(y);await api.syncRange(start,end,{loadReports:true,label:`${y} eksik kontrolü`})}
  await refreshInventory();const t=await trackTotals(a,b);setTrackStatus(`${a}-${b} Pist/Bakım/Hava kontrolü tamamlandı · telefonda ${t.count} gün/hipodrom kaydı var. Gerçek Yarış Sonuçları bu işlemde çalıştırılmadı.`,100)
 }catch(e){setTrackStatus('Pist/Bakım/Hava eksik güncelleme hatası: '+(e?.message||e),0)}
 finally{setTrackBusy(false);await refreshInventory()}
}

function bindButtons(){
 wrapTrackAutoSync();
 const real=$('rrUpdateF6093');if(real&&real.dataset.rangeUpdateF609426!=='1'){
  real.dataset.rangeUpdateF609426='1';real.onclick=e=>{e.preventDefault();e.stopPropagation();void runRealRangeUpdate()};
 }
 const oldTrack=$('tmRealNowF609416');if(oldTrack){
  /* F60.94.17 owns the old ID through a document-capture listener. Rename the
     button so that legacy 7-day autoSync cannot consume this user action. */
  oldTrack.id='tmRangeUpdateF609426';oldTrack.dataset.rangeUpdateF609426='1';oldTrack.onclick=e=>{e.preventDefault();e.stopPropagation();void runTrackRangeUpdate()};
 }
 const track=$('tmRangeUpdateF609426');if(track&&track.dataset.rangeUpdateF609426!=='1'){track.dataset.rangeUpdateF609426='1';track.onclick=e=>{e.preventDefault();e.stopPropagation();void runTrackRangeUpdate()}}
 return !!(real||track)
}
function wrapHubOpen(){const hub=window.ATArchiveHubMenu8F609418;if(!hub||typeof hub.open!=='function'||hub.open.__rangeUpdateF609426)return false;const old=hub.open;const wrapped=function(...args){const out=old.apply(this,args);for(const ms of[0,80,250])setTimeout(bindButtons,ms);return out};wrapped.__rangeUpdateF609426=true;hub.open=wrapped;return true}
function install(){bindButtons();wrapHubOpen();window.addEventListener('at-ai:archive-hub-ready',()=>{bindButtons();wrapHubOpen()},{passive:true});for(const ms of[100,400,1000,1800])setTimeout(()=>{bindButtons();wrapHubOpen()},ms)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATArchiveRangeUpdateF609426={version:VERSION,runRealRangeUpdate,runTrackRangeUpdate,bind:bindButtons};
console.info('[AT AI]',VERSION,'active - selected year range is fully checked to today; real-race and track-maintenance updates are isolated.');
})();
