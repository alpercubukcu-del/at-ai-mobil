/* AT AI Mobil — F60.83 Repair Center late-render/state sync */
(() => {
'use strict';
if (window.__AT_F6083_REPAIR_CENTER_SYNC__) return;
window.__AT_F6083_REPAIR_CENTER_SYNC__ = true;
const VERSION='REPAIR-CENTER-SYNC-V16.9.1F60.83';
let timer=0,running=false,observer=null,lastRun=0;
const $=id=>document.getElementById(id);
function oldUiVisible(){
  const d=$('f62RepairDialog'),list=$('f62RepairList');
  if(!d?.open||!list)return false;
  return !document.getElementById('f6082BatchTools') || !!list.querySelector('[data-repair-action="auto"]') || /Otomatik Ara\s*±7 Gün/i.test(list.textContent||'');
}
function schedule(delay=120){clearTimeout(timer);timer=setTimeout(()=>void sync(),delay);}
async function sync(){
  if(running)return;
  const d=$('f62RepairDialog');if(!d?.open)return;
  const F=window.ATF6082RepairBatch;if(!F?.decorate){schedule(500);return;}
  running=true;
  try{await F.decorate();lastRun=Date.now();}
  catch(e){console.warn('[AT AI]',VERSION,'sync error',e);}
  finally{running=false;}
  if(oldUiVisible())schedule(500);
}
function armObserver(){
  if(observer)return;
  observer=new MutationObserver(muts=>{
    const d=$('f62RepairDialog');if(!d?.open||running)return;
    const relevant=muts.some(m=>m.target?.id==='f62RepairList'||m.target?.closest?.('#f62RepairList')||m.target?.id==='f62RepairDialog'||m.addedNodes?.length);
    if(relevant&&oldUiVisible())schedule(80);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
}
function burst(){[80,250,700,1500,3000,6000].forEach(ms=>setTimeout(()=>{if(oldUiVisible()||!$('f6082BatchTools'))schedule(0)},ms));}
document.addEventListener('click',e=>{
  if(e.target.closest?.('#f62rRepair,#f62RepairRefresh'))burst();
  if(e.target.closest?.('[data-repair-action="manual"],[data-repair-action="candidate"],[data-repair-action="cancel"],[data-f6082-action]'))setTimeout(burst,100);
},true);
window.addEventListener('pageshow',()=>{armObserver();setTimeout(burst,300)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{armObserver();setTimeout(burst,500)},{once:true});else{armObserver();setTimeout(burst,500)}
setInterval(()=>{const d=$('f62RepairDialog');if(d?.open&&oldUiVisible()&&Date.now()-lastRun>1500)schedule(0)},2000);
window.ATF6083RepairCenterSync={version:VERSION,sync,burst,oldUiVisible};
console.info('[AT AI]',VERSION,'aktif — Onarım Merkezi geç render edilse bile F60.82 arşiv senkronu tekrar uygulanır.');
})();
