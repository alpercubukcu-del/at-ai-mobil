/* AT AI Mobil - F60.94.31.22 home/menu freeze hotfix
   F60.94.31.40: F60.94.31.18 productiondaki annualArchiveBtn kimliği ve açılışı korunur.
   legacy annualArchiveBtn mutation target neutralized davranışı artık düğmeyi başka arşive yönlendirmez.
*/
(()=>{
'use strict';
if(window.__AT_HOME_MENU_FREEZE_HOTFIX_F60943122__)return;
window.__AT_HOME_MENU_FREEZE_HOTFIX_F60943122__=true;
const SAFE_ID='annualArchiveBtnSafeF60943122';
function neutralizeLegacyObserverTarget(){
  const legacy=document.getElementById('annualArchiveBtn');
  const safe=document.getElementById(SAFE_ID);
  const btn=legacy||safe;
  if(!btn)return false;
  if(safe&&!legacy)safe.id='annualArchiveBtn';
  if(btn.textContent!=='7. Yıllık Yarış Arşivi')btn.textContent='7. Yıllık Yarış Arşivi';
  // F18'in annual-archive-menu-fix click akışına dokunma; capture listener ekleme.
  return true;
}
function install(){
  neutralizeLegacyObserverTarget();
  for(const ms of[0,50,150,400,1000,2500])setTimeout(neutralizeLegacyObserverTarget,ms);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATHomeMenuFreezeHotfixF60943122={install,neutralizeLegacyObserverTarget};
console.info('[AT AI] F60.94.31.22 hotfix active - legacy annualArchiveBtn mutation target neutralized; F18 Menu 7 opening preserved.');
})();