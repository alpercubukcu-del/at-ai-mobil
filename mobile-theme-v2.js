/* AT AI Mobil - Global monochrome/red mobile theme V2
   Rule: white/light surface => black text; every dark/red surface => white text.
   No blue/cyan visual accents. Presentation only.
*/
(()=>{'use strict';
if(window.__AT_MOBILE_THEME_V2__)return;window.__AT_MOBILE_THEME_V2__=true;
const VERSION='MOBILE-THEME-V2.0';
const s=document.createElement('style');s.id='atMobileThemeV2';s.textContent=`
:root{--at-black:#111315;--at-charcoal:#252a2e;--at-charcoal2:#30363b;--at-white:#fff;--at-off:#f7f6f3;--at-line:#d8dcdf;--at-red:#cf3935;--at-disabled:#eceeef;--at-disabledText:#8d949a}
@media(max-width:820px){
 html,body{background:var(--at-charcoal)!important}
 /* remove legacy blue/cyan accents globally */
 .kicker,.eyebrow,[class*="kicker"],[class*="accent"]{color:var(--at-red)!important}
 a{color:var(--at-red)}
 /* LIGHT SURFACES = BLACK TEXT */
 dialog[open] section,dialog[open] .card,dialog[open] [class*="card"],dialog[open] .panel,dialog[open] [class*="body"],dialog[open] [class*="content"],
 #tjkAnnualArchiveDialog,.fogd-body,.fh-body,.tmr416-body{background-color:var(--at-off)!important;color:var(--at-black)!important}
 dialog[open] section *,dialog[open] .card *,dialog[open] [class*="card"] *,dialog[open] .panel *,dialog[open] [class*="body"] *,dialog[open] [class*="content"] *,
 #tjkAnnualArchiveDialog *,#fogdDialogF609431 .fogd-body *,#fogdHistDialogF60943111 .fh-body *,#tmRealDoorF609416 .tmr416-body *{color:var(--at-black)!important;text-shadow:none!important}
 /* white controls */
 input,select,textarea,option{background:var(--at-white)!important;color:var(--at-black)!important;border-color:var(--at-line)!important}
 /* DARK SURFACES = WHITE TEXT */
 header,.header,[class*="headbar"],[class*="-head"],.tmr416-head,.fogd-head,.fh-headbar,
 dialog[open] button:not(:disabled),dialog[open] [role="button"]:not([aria-disabled="true"]){background-color:var(--at-charcoal2);color:var(--at-white)!important}
 header *, .header *,[class*="headbar"] *,[class*="-head"] *,.tmr416-head *,.fogd-head *,.fh-headbar *,
 dialog[open] button:not(:disabled) *,dialog[open] [role="button"]:not([aria-disabled="true"]) *{color:var(--at-white)!important}
 /* ACTION RED = WHITE TEXT */
 button.primary,button[class*="primary"],button[class*="danger"],button[class*="active"],.primary,[aria-current="page"]{background:var(--at-red)!important;color:var(--at-white)!important;border-color:var(--at-red)!important}
 button.primary *,button[class*="primary"] *,button[class*="danger"] *,button[class*="active"] *,.primary *,[aria-current="page"] *{color:var(--at-white)!important}
 /* disabled remains readable */
 button:disabled,[aria-disabled="true"]{background:var(--at-disabled)!important;color:var(--at-disabledText)!important;border-color:var(--at-line)!important;opacity:1!important}
 button:disabled *,[aria-disabled="true"] *{color:var(--at-disabledText)!important}
 /* archive/status/info: no blue */
 .tmr418-intro,.fogd-note,.fogd-status,.fh-note,.fh-status,.fh-empty,.tmr416-status,[class*="notice"],[class*="info"]{background:#f0f1f1!important;color:var(--at-black)!important;border-color:var(--at-line)!important}
 .tmr418-intro *,.fogd-note *,.fogd-status *,.fh-note *,.fh-status *,.fh-empty *,.tmr416-status *{color:var(--at-black)!important}
 /* progress / selection accents */
 progress{accent-color:var(--at-red)!important}
 .tmr416-bar i,[class*="progress"]>i,[class*="progress"]>span{background:var(--at-red)!important}
 /* force known former cyan/blue menu8 labels */
 .tmr418-kicker{color:var(--at-red)!important}
}
`;document.head.appendChild(s);
function classify(){
 document.querySelectorAll('dialog[open] button,[role="dialog"] button').forEach(b=>{if(b.disabled)return;b.style.setProperty('color','#fff','important')});
}
const run=()=>classify();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(run).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class','disabled']});
window.ATMobileThemeV2={version:VERSION,apply:run};console.info('[AT AI]',VERSION,'active');
})();