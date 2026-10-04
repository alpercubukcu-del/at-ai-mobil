/* AT AI Mobil - canonical drawer V17.4.16: static DOM, event binding only */
(()=>{
'use strict';
const VERSION='CANONICAL-DRAWER-V17.4.16',$=id=>document.getElementById(id);
function closeDrawer(){try{window.closeDrawer?.()}catch{}$('drawer')?.classList.remove('open');$('overlay')?.classList.remove('show');$('drawer')?.setAttribute('aria-hidden','true')}
function openFogd(){closeDrawer();const open=()=>{const fn=window.ATFogdHistoryCalibrationF60943111?.open;if(typeof fn==='function')return fn();console.warn('[AT AI]',VERSION,'FOGD history center not ready');return false};if(open()===false)setTimeout(open,120)}
function bind(){
 const ids=['programGuideBtnV661','fogdCalibrationMenuBtn','annualArchiveBtn','archiveHubBtnF60943123','fogdScoreMenuBtnV17'];
 const d=$('drawer');if(!d||ids.some(id=>!$(id)))return false;
 const fogd=$('fogdCalibrationMenuBtn');if(fogd.dataset.canonicalBound!==VERSION){fogd.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openFogd()},true);fogd.dataset.canonicalBound=VERSION}
 d.dataset.canonicalDrawer=VERSION;return true
}
function boot(){if(bind())return;let n=0;const t=setInterval(()=>{if(bind()||++n>25)clearInterval(t)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ATCanonicalDrawerV17416={version:VERSION,bind,openFogd};
})();