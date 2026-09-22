/* AT AI Mobil - Mobile Fullscreen UI V1
   Presentation-only layer. Analysis/archive/calibration engines are untouched.
*/
(()=>{
'use strict';
if(window.__AT_MOBILE_FULLSCREEN_UI_V1__)return;
window.__AT_MOBILE_FULLSCREEN_UI_V1__=true;
const VERSION='MOBILE-FULLSCREEN-UI-V1';
const style=document.createElement('style');
style.id='atMobileFullscreenUiV1';
style.textContent=`
:root{--at-bg:#252a2e;--at-panel:#f7f6f3;--at-card:#fff;--at-ink:#252b31;--at-muted:#667078;--at-line:#d8dcdf;--at-red:#c53b36;--at-red-soft:#f5e5e2}
@media(max-width:820px){
 body{background:var(--at-bg)!important}
 dialog#tjkAnnualArchiveDialog,dialog#fogdDialogF609431,dialog#fogdHistDialogF60943111,#tmRealDoorF609416 dialog,.tmr416-panel{
  position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;
  margin:0!important;border:0!important;border-radius:0!important;padding:0!important;background:var(--at-panel)!important;color:var(--at-ink)!important;
 }
 dialog#tjkAnnualArchiveDialog[open],dialog#fogdDialogF609431[open],dialog#fogdHistDialogF60943111[open]{display:flex!important;flex-direction:column!important}
 dialog#tjkAnnualArchiveDialog::backdrop,dialog#fogdDialogF609431::backdrop,dialog#fogdHistDialogF60943111::backdrop{background:var(--at-bg)!important}
 #tjkAnnualArchiveDialog>*,#fogdDialogF609431>*,#fogdHistDialogF60943111>*{max-width:100%!important}
 .fogd-head,.fh-headbar,.tmr416-head{position:sticky!important;top:0!important;z-index:20!important;background:#30363b!important;color:#fff!important;border-radius:0!important}
 .fogd-body,.fh-body,.tmr416-body{flex:1!important;max-height:none!important;overflow:auto!important;-webkit-overflow-scrolling:touch;padding:14px!important;background:var(--at-panel)!important;color:var(--at-ink)!important}
 .fogd-card,.fh-table,.tmr418-card,.tmr416-card,.aa-section{background:var(--at-card)!important;color:var(--at-ink)!important;border:1px solid var(--at-line)!important;box-shadow:none!important}
 button.primary,.tmr416-primary{background:var(--at-red)!important;color:#fff!important;border-color:var(--at-red)!important}
 input,select{background:#fff!important;color:var(--at-ink)!important;border-color:var(--at-line)!important}
 .fh-note,.fh-status,.fh-empty,.tmr418-note{color:var(--at-muted)!important}
}
`;
document.head.appendChild(style);
function fullscreen(d){
 if(!d)return;
 d.classList.add('at-mobile-fullscreen-v1');
}
function apply(){
 ['tjkAnnualArchiveDialog','fogdDialogF609431','fogdHistDialogF60943111'].forEach(id=>fullscreen(document.getElementById(id)));
 const real=document.getElementById('tmRealDoorF609416');if(real)fullscreen(real);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
const obs=new MutationObserver(apply);obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>obs.disconnect(),12000);
window.ATMobileFullscreenUIV1={version:VERSION,apply};
console.info('[AT AI]',VERSION,'active');
})();