/* AT AI Mobil - F60.94.31.22 home/menu freeze hotfix */
(()=>{
'use strict';
if(window.__AT_HOME_MENU_FREEZE_HOTFIX_F60943122__)return;
window.__AT_HOME_MENU_FREEZE_HOTFIX_F60943122__=true;
const SAFE_ID='annualArchiveBtnSafeF60943122';
function neutralizeLegacyObserverTarget(){
  const legacy=document.getElementById('annualArchiveBtn');
  const btn=legacy||document.getElementById(SAFE_ID);
  if(!btn)return false;
  if(legacy)legacy.id=SAFE_ID;
  if(btn.textContent!=='7. Tarihsel Sonuç Arşivi · Koşu Sorgulama')btn.textContent='7. Tarihsel Sonuç Arşivi · Koşu Sorgulama';
  if(!btn.dataset.freezeHotfixF60943122){
    btn.dataset.freezeHotfixF60943122='1';
    btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      try{window.closeDrawer?.()}catch{}
      try{window.ATArchiveHubMenu8F609418?.open?.()}catch(err){console.warn('[AT AI F60.94.31.22] archive hub open',err)}
      return false;
    },true);
  }
  return true;
}
function install(){
  neutralizeLegacyObserverTarget();
  for(const ms of[0,50,150,400,1000,2500])setTimeout(neutralizeLegacyObserverTarget,ms);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATHomeMenuFreezeHotfixF60943122={install,neutralizeLegacyObserverTarget};
console.info('[AT AI] F60.94.31.22 hotfix active - legacy annualArchiveBtn mutation target neutralized.');
})();
