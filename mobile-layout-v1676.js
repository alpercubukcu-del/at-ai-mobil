/* AT AI Mobil — V16.7.6 Android mobil ana sayfa genişlik düzeltmesi
   - Telefon görünümünde masaüstü moduna ihtiyaç bırakmaz.
   - Ana kabuk/paneller viewport dışına taşamaz.
   - Tarih/şehir ve kupon ayarları mobilde tek kolona düşer.
   - Kupon tipleri dar ekranda güvenli şekilde sarılır.
*/
(() => {
'use strict';
if (window.__AT_MOBILE_LAYOUT_V1676__) return;
window.__AT_MOBILE_LAYOUT_V1676__ = true;
const VERSION = 'MOBILE-LAYOUT-V16.7.6';
const CLASS = 'at-mobile-layout-v1676';
const STYLE_ID = 'atMobileLayoutStyleV1676';

function isPhoneLike(){
  const ua = navigator.userAgent || '';
  const vv = window.visualViewport?.width || window.innerWidth || 9999;
  const sw = window.screen?.width || 9999;
  return /Android|iPhone|iPod/i.test(ua) || Math.min(vv, sw) <= 760;
}

function injectStyle(){
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
html.${CLASS}, html.${CLASS} body{
  width:100%!important;max-width:100%!important;min-width:0!important;
  overflow-x:hidden!important;
}
html.${CLASS} body{margin:0!important;}
html.${CLASS} .app-shell{
  width:100%!important;max-width:100%!important;min-width:0!important;
  margin:0!important;padding:10px 10px calc(62px + env(safe-area-inset-bottom))!important;
  overflow-x:hidden!important;box-sizing:border-box!important;
}
html.${CLASS} main,
html.${CLASS} .panel,
html.${CLASS} .compact,
html.${CLASS} .section-title-row,
html.${CLASS} .five-model-note-v11,
html.${CLASS} #betTypes,
html.${CLASS} #betTypeStatusV1675,
html.${CLASS} .ticket-settings-grid-v11,
html.${CLASS} .ticket-rule-v11,
html.${CLASS} .race-list,
html.${CLASS} .race-card,
html.${CLASS} .horse-list,
html.${CLASS} #tickets{
  min-width:0!important;max-width:100%!important;width:auto!important;
  box-sizing:border-box!important;
}
html.${CLASS} .panel{padding:12px!important;border-radius:15px!important;margin-bottom:10px!important;}
html.${CLASS} .topbar{min-width:0!important;max-width:100%!important;padding-left:2px!important;padding-right:2px!important;}
html.${CLASS} .grid2,
html.${CLASS} .ticket-settings-grid-v11{
  display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:9px!important;
}
html.${CLASS} .ticket-settings-grid-v11 label:last-child{grid-column:auto!important;}
html.${CLASS} input,
html.${CLASS} select,
html.${CLASS} button,
html.${CLASS} label{
  min-width:0!important;max-width:100%!important;box-sizing:border-box!important;
}
html.${CLASS} .bet-grid{
  display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:7px!important;min-width:0!important;max-width:100%!important;
}
html.${CLASS} .bet-card{
  min-width:0!important;max-width:100%!important;width:auto!important;
  padding:10px 8px!important;overflow:hidden!important;box-sizing:border-box!important;
}
html.${CLASS} .bet-card span,
html.${CLASS} .bet-card strong{
  min-width:0!important;overflow-wrap:anywhere!important;word-break:break-word!important;
}
html.${CLASS} #betTypeStatusV1675{overflow-wrap:anywhere!important;}
html.${CLASS} .section-title-row{flex-wrap:wrap!important;}
html.${CLASS} .section-title-row > *{min-width:0!important;}
html.${CLASS} .race-tabs{max-width:100%!important;min-width:0!important;overflow-x:auto!important;}
html.${CLASS} .horse,
html.${CLASS} .horse-row{min-width:0!important;max-width:100%!important;}
@media (max-width:390px){
  html.${CLASS} .bet-grid{grid-template-columns:minmax(0,1fr)!important;}
}
`;
  document.head.appendChild(s);
}

function apply(){
  injectStyle();
  document.documentElement.classList.toggle(CLASS, isPhoneLike());
  if (document.documentElement.classList.contains(CLASS)) {
    try { document.documentElement.scrollLeft = 0; document.body.scrollLeft = 0; } catch {}
  }
}

apply();
window.addEventListener('resize', apply, {passive:true});
window.visualViewport?.addEventListener?.('resize', apply, {passive:true});
window.addEventListener('pageshow', apply, {passive:true});
setTimeout(apply, 100);
window.__AT_MOBILE_LAYOUT_VERSION__ = VERSION;
console.info('[AT AI]', VERSION, 'aktif — mobil ana sayfa viewport içine sabitlendi.');
})();
