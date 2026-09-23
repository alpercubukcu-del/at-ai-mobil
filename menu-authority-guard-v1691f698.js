/* AT AI Mobil — V16.9.1F60.94.6 canonical drawer authority guard
   - The F60.45 Process Flow Planner still owns data preparation, but no longer gets the last word on drawer labels/order.
   - Repairs only when the canonical eight-item drawer is actually out of sync.
   - Watches #drawer only; observer is disconnected while repairing to avoid mutation loops/main-thread churn.
*/
(()=>{
'use strict';
if(window.__AT_MENU_AUTHORITY_GUARD_F60946__) return;
window.__AT_MENU_AUTHORITY_GUARD_F60946__=true;

const VERSION='MENU-AUTHORITY-GUARD-V16.9.1F60.94.6';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let observer=null;
let observedDrawer=null;
let repairQueued=false;
let repairing=false;

function refs(){
  const drawer=$('drawer');
  if(!drawer) return {drawer:null};
  return {
    drawer,
    guide:$('programGuideBtnV661')||[...drawer.querySelectorAll('button')].find(b=>/Kullanım Talimatı/i.test(clean(b.textContent))),
    current:drawer.querySelector('[data-view="current"]'),
    career:drawer.querySelector('[data-view="career"]'),
    calibration:drawer.querySelector('[data-view="calibration"]'),
    scenario:drawer.querySelector('[data-view="scenario"]'),
    coupon:$('couponMenuBtn'),
    annual:$('annualArchiveBtn'),
    maintenance:$('trackMaintenanceMenuBtnF60944'),
    exportBtn:$('careerExportMenuBtn'),
    note:drawer.querySelector('.drawer-note')
  };
}

const LABELS=[
  ['guide','1. Kullanım Talimatı'],
  ['current','2. Güncel Analiz'],
  ['career','3. Kariyer Yol Haritası'],
  ['calibration','4. Model Kalibrasyonu'],
  ['scenario','5. Günlük Koşu Kalibrasyonu'],
  ['coupon','6. Kupon Oluştur'],
  ['annual','7. Tarihsel Sonuç Arşivi'],
  ['maintenance','8. Pist / Bakım / Hava Arşivi']
];
const NOTE='Sabit sıra: Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon. Arşiv ve Pist/Bakım/Hava verileri ayrı menülerden yönetilir.';

function needsRepair(r=refs()){
  if(!r.drawer) return false;
  if(LABELS.some(([key,label])=>r[key]&&clean(r[key].textContent)!==label)) return true;
  if(r.exportBtn&&r.exportBtn.style.display!=='none') return true;
  if(r.note&&clean(r.note.textContent)!==NOTE) return true;
  const nodes=LABELS.map(([key])=>r[key]).filter(Boolean);
  if(nodes.length<7) return true;
  const positions=nodes.map(n=>[...r.drawer.children].indexOf(n));
  for(let i=1;i<positions.length;i++) if(positions[i]<=positions[i-1]) return true;
  return false;
}

function connectObserver(){
  const drawer=$('drawer');
  if(!drawer) return;
  if(observer&&observedDrawer===drawer) return;
  try{observer?.disconnect()}catch{}
  observer=new MutationObserver(()=>{
    if(repairing||repairQueued) return;
    if(!needsRepair()) return;
    repairQueued=true;
    queueMicrotask(()=>{repairQueued=false;repair('drawer-mutation')});
  });
  observer.observe(drawer,{subtree:true,childList:true,characterData:true});
  observedDrawer=drawer;
}

function repair(reason='manual'){
  if(repairing) return false;
  const before=refs();
  if(!before.drawer) return false;
  if(!needsRepair(before)) { connectObserver(); return true; }
  repairing=true;
  try{
    try{observer?.disconnect()}catch{}
    /* Reuse the already-tested F60.94.4 canonical builder. It creates the maintenance entry if needed. */
    const stable=window.ATStableAnalysisMenuF60944?.apply;
    if(typeof stable==='function') stable();
    const r=refs();
    if(r.exportBtn){r.exportBtn.style.display='none';r.exportBtn.setAttribute('aria-hidden','true');}
    if(r.note&&clean(r.note.textContent)!==NOTE) r.note.textContent=NOTE;
    if(r.drawer) r.drawer.dataset.menuAuthorityVersion=VERSION;
    return true;
  }catch(e){
    console.warn('[AT AI]',VERSION,'drawer repair failed',reason,e);
    return false;
  }finally{
    repairing=false;
    setTimeout(connectObserver,0);
  }
}

function scheduleAfterLegacy(){
  /* F60.45 schedules its menu rewrite 40 ms after #menuBtn clicks. Run once after it. */
  setTimeout(()=>repair('menu-open-55ms'),55);
  setTimeout(()=>repair('menu-open-120ms'),120);
}

for(const name of ['at-ai:annual-archive-created','at-ai:annual-archive-open','at-ai:annual-archive-render','at-ai:annual-archive-ready']){
  window.addEventListener(name,()=>setTimeout(()=>repair(name),0),{passive:true});
}
/* MOBILE.CLEAN.5 menu-open repair disabled */
/* MOBILE.CLEAN.5 pageshow repair disabled */
/* MOBILE.CLEAN.5 foreground repair disabled */

/* MOBILE.CLEAN.5: do not install another drawer observer/timer authority.
   F60.94.24 is the single label/order writer. */

window.ATMenuAuthorityGuardF60946={version:VERSION,repair,needsRepair};
console.info('[AT AI]',VERSION,'active — canonical eight-item drawer owns labels/order; F60.45 menu rewrites are auto-repaired.');
})();
