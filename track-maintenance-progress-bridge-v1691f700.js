/* AT AI Mobil — V16.9.1F60.94.8 maintenance progress bridge
   Receives real progress emitted by the F60.89 maintenance engine and mirrors it to the lightweight dialog.
*/
(()=>{
'use strict';
if(window.__AT_TRACK_MAINT_PROGRESS_F60948__)return;
window.__AT_TRACK_MAINT_PROGRESS_F60948__=true;
const VERSION='TRACK-MAINT-PROGRESS-V16.9.1F60.94.8';
const $=id=>document.getElementById(id);
let last={text:'Hazır.',pct:0,at:0};
function apply(detail=last){
  if(!detail)return;
  last={...last,...detail,at:Date.now()};
  window.__AT_TRACK_MAINT_STATUS_F60948__=last;
  const s=$('tmQuickStatusF60947');if(s&&last.text)s.textContent=String(last.text);
  const b=$('tmQuickBarF60947');if(b&&last.pct!==null&&last.pct!==undefined){const p=Math.max(0,Math.min(100,Number(last.pct)||0));b.style.width=`${p}%`;b.setAttribute('aria-valuenow',String(p));}
}
window.addEventListener('at-ai:track-maintenance-status',e=>apply(e.detail||{}),{passive:true});
const mo=new MutationObserver(()=>{if($('tmQuickDialogF60947'))apply(last)});
try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch{}
window.ATTrackMaintenanceProgressF60948={version:VERSION,apply,getLast:()=>({...last})};
console.info('[AT AI]',VERSION,'active — real maintenance progress is mirrored to quick dialog.');
})();
