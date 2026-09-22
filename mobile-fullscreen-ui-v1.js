/* AT AI Mobil - Mobile Fullscreen UI V1
   Presentation-only layer. Analysis/archive/calibration engines are untouched.
*/
(()=>{
'use strict';
if(window.__AT_MOBILE_FULLSCREEN_UI_V1__)return;
window.__AT_MOBILE_FULLSCREEN_UI_V1__=true;
const VERSION='MOBILE-FULLSCREEN-UI-V1.3';
const style=document.createElement('style');
style.id='atMobileFullscreenUiV1';
style.textContent=`
:root{--at-bg:#252a2e;--at-panel:#f7f6f3;--at-card:#fff;--at-ink:#252b31;--at-muted:#667078;--at-line:#d8dcdf;--at-red:#c53b36;--at-red-soft:#f5e5e2}
@media(max-width:820px){
 /* Global mobile contrast authority: legacy modules may carry dark-theme text colors. */
 body{--at-mobile-text:#252b31;--at-mobile-muted:#667078}
 dialog[open]:not(#drawer),[role="dialog"],.modal,.sheet{color:var(--at-mobile-text)}
 dialog[open] .card,dialog[open] section,dialog[open] .panel,dialog[open] .box{color:var(--at-mobile-text)}
 dialog[open] p,dialog[open] label,dialog[open] h1,dialog[open] h2,dialog[open] h3,dialog[open] h4,dialog[open] td,dialog[open] th,dialog[open] li,dialog[open] small{color:inherit}
 dialog[open] input,dialog[open] select,dialog[open] textarea{background:#fff!important;color:#252b31!important;border-color:#d8dcdf!important}
 dialog[open] option{background:#fff!important;color:#111!important}
 dialog[open] button:disabled{opacity:.42!important}
 dialog[open] [style*="color:#fff"],dialog[open] [style*="color: #fff"]{color:inherit}
 dialog[open] button[style*="color:#fff"],dialog[open] button[style*="color: #fff"]{color:#fff!important}

 body{background:var(--at-bg)!important}
 dialog#tjkAnnualArchiveDialog,dialog#fogdDialogF609431,dialog#fogdHistDialogF60943111,#tmRealDoorF609416 dialog,.tmr416-panel{
  position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;
  margin:0!important;border:0!important;border-radius:0!important;padding:0!important;background:var(--at-panel)!important;color:var(--at-ink)!important;
 }
 dialog#tjkAnnualArchiveDialog[open],dialog#fogdDialogF609431[open],dialog#fogdHistDialogF60943111[open]{display:flex!important;flex-direction:column!important}
 dialog#tjkAnnualArchiveDialog::backdrop,dialog#fogdDialogF609431::backdrop,dialog#fogdHistDialogF60943111::backdrop{background:var(--at-bg)!important}
 #tjkAnnualArchiveDialog>*,#fogdDialogF609431>*,#fogdHistDialogF60943111>*{max-width:100%!important}
 .fogd-head,.fh-headbar,.tmr416-head{position:sticky!important;top:0!important;z-index:20!important;background:#30363b!important;color:#fff!important;border-radius:0!important}
 #tmRealDoorF609416 .tmr416-panel{display:flex!important;flex-direction:column!important}
 #tmRealDoorF609416 .tmr416-head{padding:18px 16px!important}
 #tmRealDoorF609416 .tmr416-head h2{font-size:23px!important;line-height:1.15!important;margin:4px 0!important}
 #tmRealDoorF609416 .tmr416-body{display:block!important}
 #tmRealDoorF609416 .tmr418-intro{background:var(--at-red-soft)!important;color:var(--at-ink)!important;border:0!important;border-radius:14px!important;margin:0 0 14px!important;padding:12px 14px!important}
 #tmRealDoorF609416 .tmr418-card{margin:0 0 16px!important;padding:18px!important;border-radius:18px!important}
 #tmRealDoorF609416 .tmr418-kicker{color:var(--at-red)!important;font-size:12px!important}
 #tmRealDoorF609416 .tmr418-card h3{font-size:21px!important;color:var(--at-ink)!important}
 #tmRealDoorF609416 .tmr418-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important}
 #tmRealDoorF609416 .tmr418-grid label{color:var(--at-muted)!important;font-size:13px!important}
 #tmRealDoorF609416 .tmr418-card button{width:100%!important;min-height:52px!important;margin:8px 0 0!important;border-radius:13px!important;font-size:15px!important;font-weight:750!important}
 #tmRealDoorF609416 .tmr416-status{color:var(--at-muted)!important;background:#f0f1f1!important;border-radius:10px!important;padding:10px!important;margin-top:8px!important}
 #tmRealDoorF609416 .tmr416-bar{background:#e4e5e5!important}
 #tmRealDoorF609416 .tmr416-bar i{background:var(--at-red)!important}
 .fogd-body,.fh-body,.tmr416-body{flex:1!important;max-height:none!important;overflow:auto!important;-webkit-overflow-scrolling:touch;padding:14px!important;background:var(--at-panel)!important;color:var(--at-ink)!important}
 .fogd-card,.fh-table,.tmr418-card,.tmr416-card,.aa-section{background:var(--at-card)!important;color:var(--at-ink)!important;border:1px solid var(--at-line)!important;box-shadow:none!important}
 #fogdDialogF609431 .fogd-body,#fogdHistDialogF60943111 .fh-body{color:var(--at-ink)!important}
 #fogdDialogF609431 .fogd-body *:not(button):not(input):not(select):not(option),#fogdHistDialogF60943111 .fh-body *:not(button):not(input):not(select):not(option){color:var(--at-ink)!important;text-shadow:none!important}
 #fogdDialogF609431 .fogd-card,#fogdDialogF609431 .fogd-note,#fogdDialogF609431 .fogd-status,#fogdHistDialogF60943111 .fh-note,#fogdHistDialogF60943111 .fh-status{background:#fff!important;color:var(--at-ink)!important;border-color:var(--at-line)!important}
 #fogdDialogF609431 button,#fogdHistDialogF60943111 button{color:#fff!important}
 #fogdDialogF609431 input,#fogdDialogF609431 select,#fogdHistDialogF60943111 input,#fogdHistDialogF60943111 select{color:var(--at-ink)!important;background:#fff!important}
 #fogdDialogF609431 option,#fogdHistDialogF60943111 option{color:#111!important;background:#fff!important}
 /* Known full-screen legacy pages */
 #tjkAnnualArchiveDialog{background:#f7f6f3!important;color:#252b31!important}
 #tjkAnnualArchiveDialog .aa-section,#tjkAnnualArchiveDialog .card,#tjkAnnualArchiveDialog section{background:#fff!important;color:#252b31!important;border-color:#d8dcdf!important}
 #tjkAnnualArchiveDialog .muted,#tjkAnnualArchiveDialog .hint,#tjkAnnualArchiveDialog small{color:#667078!important}
 #tjkAnnualArchiveDialog button:not(:disabled){color:#fff}
 #tjkAnnualArchiveDialog button:not(.primary):not([class*="danger"]){background:#394147!important;color:#fff!important}
 #tjkAnnualArchiveDialog button:disabled{background:#eef0f1!important;color:#9aa1a6!important}
 #tjkAnnualArchiveDialog [style*="color:#e"],#tjkAnnualArchiveDialog [style*="color: #e"]{color:#667078!important}
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