const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f700.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.9] F60.94.8 base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

function replaceRuntime(startMarker,endMarker,replacement,label){
  const start=app.indexOf(startMarker);
  if(start<0)throw new Error(`[F60.94.9] ${label} start marker not found`);
  const endToken=app.indexOf(endMarker,start);
  if(endToken<0)throw new Error(`[F60.94.9] ${label} end marker not found`);
  const close=app.indexOf('})();',endToken);
  if(close<0)throw new Error(`[F60.94.9] ${label} IIFE close not found`);
  app=app.slice(0,start)+replacement.trim()+'\n'+app.slice(close+5);
}

/*
 * Root cause of the freeze:
 * F60.94.4 repeatedly reordered the drawer with startup/menu timers,
 * F60.94.6 watched those mutations and repaired again,
 * F60.94.8 replaced menu 8 with cloneNode/replaceWith.
 * Those three layers could continuously invalidate one another on Android.
 * F60.94.9 leaves one static owner: existing buttons are never cloned,
 * order is applied once and only re-applied by the already existing legacy
 * menu-open hook (patched in F60.94.7) when the drawer is opened.
 */
const staticMenu=`/* AT AI Mobil — V16.9.1F60.94.9 static analysis drawer */
(()=>{
'use strict';
if(window.__AT_STATIC_ANALYSIS_MENU_F60949__)return;
window.__AT_STATIC_ANALYSIS_MENU_F60949__=true;
const VERSION='STATIC-ANALYSIS-MENU-V16.9.1F60.94.9';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\\s+/g,' ').trim();
function findButton(drawer,re){return [...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null}
function setLabel(btn,label){if(!btn)return;if(clean(btn.textContent)!==label)btn.textContent=label;btn.style.display='';btn.removeAttribute('aria-hidden')}
function closeDrawer(){try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}
function openMaintenance(){closeDrawer();const fn=window.ATTrackMaintenanceQuickF60947?.open;if(typeof fn==='function')return fn();return false}
function ensureMaintenanceButton(drawer){
 let btn=$('trackMaintenanceMenuBtnF60944');
 if(!btn){btn=document.createElement('button');btn.id='trackMaintenanceMenuBtnF60944';btn.type='button';btn.textContent='8. Pist / Bakım / Hava Arşivi';btn.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openMaintenance()}}
 if(!drawer.contains(btn))drawer.appendChild(btn);
 return btn
}
function apply(){
 const drawer=$('drawer');if(!drawer)return false;
 const guide=$('programGuideBtnV661')||findButton(drawer,/Kullanım Talimatı/i);
 const current=drawer.querySelector('[data-view="current"]')||findButton(drawer,/Güncel Analiz/i);
 const career=drawer.querySelector('[data-view="career"]')||findButton(drawer,/Kariyer Yol Haritası/i);
 const calibration=drawer.querySelector('[data-view="calibration"]')||findButton(drawer,/Model Kalibrasyonu/i);
 const scenario=drawer.querySelector('[data-view="scenario"]')||findButton(drawer,/Koşu Senaryosu/i);
 const coupon=$('couponMenuBtn')||findButton(drawer,/Kupon Oluştur/i);
 const annual=$('annualArchiveBtn')||findButton(drawer,/Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i);
 const maintenance=ensureMaintenanceButton(drawer);
 setLabel(guide,'1. Kullanım Talimatı');setLabel(current,'2. Güncel Analiz');setLabel(career,'3. Kariyer Yol Haritası');setLabel(calibration,'4. Model Kalibrasyonu');setLabel(scenario,'5. Koşu Senaryosu');setLabel(coupon,'6. Kupon Oluştur');setLabel(annual,'7. Yıllık Yarış Arşivi');setLabel(maintenance,'8. Pist / Bakım / Hava Arşivi');
 const exportBtn=$('careerExportMenuBtn');if(exportBtn){exportBtn.style.display='none';exportBtn.setAttribute('aria-hidden','true')}
 const note=drawer.querySelector('.drawer-note');
 const ordered=[guide,current,career,calibration,scenario,coupon,annual,maintenance].filter(Boolean);
 for(const node of ordered){if(note)drawer.insertBefore(node,note);else drawer.appendChild(node)}
 if(note)note.textContent='Sabit sıra: Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon. Arşiv ve Pist/Bakım/Hava verileri ayrı menülerden yönetilir.';
 drawer.dataset.stableMenuVersion=VERSION;
 return true
}
try{const old=window.ATDrawerMenuNumberingV1682?.fix;if(old){window.removeEventListener('load',old);window.removeEventListener('pageshow',old)}const guide=window.ATProgramWorkflowGuideV661?.applyMenu;if(guide)window.removeEventListener('pageshow',guide)}catch{}
apply();
window.ATStableAnalysisMenuF60944={version:VERSION,apply,openMaintenance};
console.info('[AT AI]',VERSION,'active — static drawer order; no menu timers, observers or node cloning.');
})();`;
replaceRuntime(
  '/* AT AI Mobil — V16.9.1F60.94.4 stable analysis drawer + track maintenance entry',
  "console.info('[AT AI]',VERSION,'active — drawer labels fixed and track maintenance entry restored.');",
  staticMenu,
  'stable menu runtime'
);

const disabledGuard=`/* AT AI Mobil — V16.9.1F60.94.9 disabled mutation repair guard */
(()=>{
'use strict';
const VERSION='MENU-AUTHORITY-GUARD-DISABLED-V16.9.1F60.94.9';
window.__AT_MENU_AUTHORITY_GUARD_F60946__=true;
window.ATMenuAuthorityGuardF60946={version:VERSION,repair:()=>true,needsRepair:()=>false};
console.info('[AT AI]',VERSION,'active — MutationObserver repair loop removed.');
})();`;
replaceRuntime(
  '/* AT AI Mobil — V16.9.1F60.94.6 canonical drawer authority guard',
  "console.info('[AT AI]',VERSION,'active — canonical eight-item drawer owns labels/order; F60.45 menu rewrites are auto-repaired.');",
  disabledGuard,
  'menu authority guard'
);

/* Keep the lightweight maintenance dialog, but never clone/replace menu 8 and never poll-bind it. */
const bindStart=app.indexOf("function bind(){\n const old=$('trackMaintenanceMenuBtnF60944')");
const bindEnd=bindStart>=0?app.indexOf('\nfor(const ms of[0,80,300,900,1800])',bindStart):-1;
if(bindStart<0||bindEnd<0)throw new Error('[F60.94.9] F60.94.8 maintenance bind block not found');
const bindBlock=`function bind(){\n const b=$('trackMaintenanceMenuBtnF60944');if(!b)return false;\n if(b.dataset.quickMaintenanceBound==='F60.94.9')return true;\n b.dataset.quickMaintenanceVersion=VERSION;b.dataset.quickMaintenanceBound='F60.94.9';\n b.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openQuick()};\n return true\n}`;
app=app.slice(0,bindStart)+bindBlock+app.slice(bindEnd);
const bindLoop="for(const ms of[0,80,300,900,1800])setTimeout(bind,ms);\ndocument.addEventListener('click',e=>{if(e.target?.closest?.('#menuBtn'))setTimeout(bind,0)},true);";
if(!app.includes(bindLoop))throw new Error('[F60.94.9] maintenance bind timer loop not found');
app=app.replace(bindLoop,'bind();');

/* Verify that the problematic drawer mechanisms are gone from the final browser bundle. */
const stablePos=app.indexOf('STATIC-ANALYSIS-MENU-V16.9.1F60.94.9');
const quickPos=app.indexOf('TRACK-MAINT-QUICK-V16.9.1F60.94.7');
if(stablePos<0||quickPos<0)throw new Error('[F60.94.9] static/quick runtime missing');
const quickTail=app.slice(quickPos,app.indexOf('})();',quickPos)+5);
if(quickTail.includes('cloneNode(true)')||quickTail.includes('replaceWith('))throw new Error('[F60.94.9] node cloning survived in quick menu');
if(app.includes('MENU-AUTHORITY-GUARD-V16.9.1F60.94.6'))throw new Error('[F60.94.9] old mutation guard survived');
for(const token of['STATIC-ANALYSIS-MENU-V16.9.1F60.94.9','MENU-AUTHORITY-GUARD-DISABLED-V16.9.1F60.94.9',"quickMaintenanceBound='F60.94.9'",'8. Pist / Bakım / Hava Arşivi','DEGREE-SPEED-TOP5-V16.9.1F60.94.5'])if(!app.includes(token))throw new Error('[F60.94.9] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692949');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692949'))throw new Error('[F60.94.9] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.9 build complete: drawer is static, menu 8 stays last, and click handlers are not cloned/replaced.');
