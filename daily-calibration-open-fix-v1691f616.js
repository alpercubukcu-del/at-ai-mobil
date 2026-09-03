/* AT AI Mobil — V16.9.1F60.16 Daily Calibration selector open fix
   - Fixes Android tap/click not reaching the F60.13 selector engine.
   - Directly binds the visible F60.14 button to the calibration selector API.
   - Keeps the selector/cleanup/calibration/coupon formulas unchanged.
*/
(() => {
'use strict';
if(window.__AT_DAILY_CALIBRATION_OPEN_FIX_V616__)return;
window.__AT_DAILY_CALIBRATION_OPEN_FIX_V616__=true;
const VERSION='DAILY-CALIBRATION-OPEN-FIX-V16.9.1F60.16';
const BTN='dcpOpenF614',DIALOG='dailyCalibrationMatchDialogF613';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
let opening=false,lastTap=0,observer=null;
function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function status(text){const el=$('dcpStatusF614');if(el)el.textContent=text}
function syncRace(){
  const main=$('analysisRace'),legacy=$('xcalRace');if(!legacy)return;
  let wanted=clean(main?.value);if(!wanted||wanted==='all')wanted=clean(st()?.selectedRace);
  if(!wanted||wanted==='all')return;
  if(legacy.value!==wanted&&[...legacy.options].some(o=>o.value===wanted)){
    legacy.value=wanted;
    try{legacy.dispatchEvent(new Event('change',{bubbles:true}))}catch{}
  }
}
async function forceOpen(){
  if(opening)return;
  const api=window.ATDailyCalibrationPageV613;
  if(typeof api?.openSelector!=='function'){
    status('Kalibrasyon eşleşme motoru hazır değil. Sayfayı bir kez yenileyip tekrar deneyin.');
    return;
  }
  opening=true;syncRace();status('Yüklü Yıllık Arşiv açılıyor…');
  try{
    const p=api.openSelector();
    // openSelector dialogu ilk await'ten önce açmalıdır; Android'de görünürlüğü ayrıca doğrula.
    const d=$(DIALOG);
    if(d&&!d.open){try{d.showModal()}catch{try{d.setAttribute('open','')}catch{}}}
    await p;
    const after=$(DIALOG);
    if(after&&!after.open){try{after.showModal()}catch{try{after.setAttribute('open','')}catch{}}}
    if(!after)status('Kalibrasyon eşleşme penceresi oluşturulamadı.');
  }catch(e){
    status(`Eşleşmeler açılamadı: ${clean(e?.message||e)}`);
    console.error('[AT AI]',VERSION,'open failed',e);
  }finally{opening=false}
}
function trigger(e){
  const now=Date.now();if(now-lastTap<450)return;lastTap=now;
  try{e?.preventDefault?.();e?.stopPropagation?.()}catch{}
  void forceOpen();
}
function bind(){
  const b=$(BTN);if(!b||b.dataset.f616==='1')return;
  b.dataset.f616='1';
  // Remove the fragile previous inline handler and bind directly for Android + desktop.
  b.onclick=null;
  b.addEventListener('pointerup',trigger,{passive:false});
  b.addEventListener('click',trigger,false);
  b.setAttribute('aria-haspopup','dialog');
  b.setAttribute('aria-controls',DIALOG);
}
function watch(){
  bind();observer?.disconnect?.();
  observer=new MutationObserver(()=>bind());
  observer.observe(document.body,{childList:true,subtree:true});
}
watch();
window.addEventListener('pageshow',()=>setTimeout(bind,40),{passive:true});
window.ATDailyCalibrationOpenFixV616={version:VERSION,open:forceOpen,refresh:bind};
console.info('[AT AI]',VERSION,'active — Daily Calibration selector button directly bound for Android click/pointerup.');
})();
