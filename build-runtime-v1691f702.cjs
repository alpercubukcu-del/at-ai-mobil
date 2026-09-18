const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f701.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.10] F60.94.9 base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

function replaceIife(startMarker,replacement,label){
  const start=app.indexOf(startMarker);
  if(start<0)throw new Error(`[F60.94.10] ${label} start marker not found`);
  const close=app.indexOf('\n})();',start);
  if(close<0)throw new Error(`[F60.94.10] ${label} close marker not found`);
  app=app.slice(0,start)+replacement.trim()+'\n'+app.slice(close+'\n})();'.length);
}

/*
 * F60.94.9 created menu 8 before buttons 1-7 were guaranteed to exist.
 * On slower Android startup that produced exactly: 8, then 1..7.
 * F60.94.10 performs ZERO drawer mutations until all seven existing buttons are ready.
 * It then installs menu 8 and canonical order exactly once.
 */
const readyOnce=`/* AT AI Mobil — V16.9.1F60.94.10 ready-once analysis drawer */
(()=>{
'use strict';
if(window.__AT_READY_ONCE_MENU_F609410__)return;
window.__AT_READY_ONCE_MENU_F609410__=true;
const VERSION='READY-ONCE-MENU-V16.9.1F60.94.10';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\\s+/g,' ').trim();
let installed=false;
let attempts=0;
function findButton(drawer,re){return [...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null}
function refs(){
 const drawer=$('drawer');
 if(!drawer)return null;
 const r={
  drawer,
  guide:$('programGuideBtnV661')||findButton(drawer,/Kullanım Talimatı/i),
  current:drawer.querySelector('[data-view="current"]')||findButton(drawer,/Güncel Analiz/i),
  career:drawer.querySelector('[data-view="career"]')||findButton(drawer,/Kariyer Yol Haritası/i),
  calibration:drawer.querySelector('[data-view="calibration"]')||findButton(drawer,/Model Kalibrasyonu/i),
  scenario:drawer.querySelector('[data-view="scenario"]')||findButton(drawer,/Koşu Senaryosu/i),
  coupon:$('couponMenuBtn')||findButton(drawer,/Kupon Oluştur/i),
  annual:$('annualArchiveBtn')||findButton(drawer,/Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i)
 };
 return r
}
function allReady(r){return !!(r&&r.drawer&&r.guide&&r.current&&r.career&&r.calibration&&r.scenario&&r.coupon&&r.annual)}
function setLabel(btn,label){if(clean(btn.textContent)!==label)btn.textContent=label;btn.style.display='';btn.removeAttribute('aria-hidden')}
function closeDrawer(){try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}
function openMaintenance(){closeDrawer();const fn=window.ATTrackMaintenanceQuickF60947?.open;if(typeof fn==='function')return fn();return false}
function neutralizeLegacy(){
 try{const old=window.ATDrawerMenuNumberingV1682?.fix;if(old){window.removeEventListener('load',old);window.removeEventListener('pageshow',old)}if(window.ATDrawerMenuNumberingV1682)window.ATDrawerMenuNumberingV1682.fix=()=>false}catch{}
 try{const guide=window.ATProgramWorkflowGuideV661?.applyMenu;if(guide){window.removeEventListener('load',guide);window.removeEventListener('pageshow',guide)}if(window.ATProgramWorkflowGuideV661)window.ATProgramWorkflowGuideV661.applyMenu=()=>false}catch{}
 try{if(window.ATMenuAuthorityGuardF60946)window.ATMenuAuthorityGuardF60946.repair=()=>true}catch{}
}
function install(){
 if(installed)return true;
 const r=refs();
 /* CRITICAL: do not create/move/change ANY drawer node before all 1-7 exist. */
 if(!allReady(r))return false;
 neutralizeLegacy();
 let maintenance=$('trackMaintenanceMenuBtnF60944');
 if(!maintenance){maintenance=document.createElement('button');maintenance.id='trackMaintenanceMenuBtnF60944';maintenance.type='button'}
 maintenance.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openMaintenance()};
 setLabel(r.guide,'1. Kullanım Talimatı');
 setLabel(r.current,'2. Güncel Analiz');
 setLabel(r.career,'3. Kariyer Yol Haritası');
 setLabel(r.calibration,'4. Model Kalibrasyonu');
 setLabel(r.scenario,'5. Koşu Senaryosu');
 setLabel(r.coupon,'6. Kupon Oluştur');
 setLabel(r.annual,'7. Yıllık Yarış Arşivi');
 setLabel(maintenance,'8. Pist / Bakım / Hava Arşivi');
 const note=r.drawer.querySelector('.drawer-note');
 const ordered=[r.guide,r.current,r.career,r.calibration,r.scenario,r.coupon,r.annual,maintenance];
 for(const node of ordered){if(note)r.drawer.insertBefore(node,note);else r.drawer.appendChild(node)}
 const exportBtn=$('careerExportMenuBtn');if(exportBtn){exportBtn.style.display='none';exportBtn.setAttribute('aria-hidden','true')}
 if(note)note.textContent='Sabit sıra: Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon. Arşiv ve Pist/Bakım/Hava verileri ayrı menülerden yönetilir.';
 r.drawer.dataset.readyOnceMenuVersion=VERSION;
 installed=true;
 console.info('[AT AI]',VERSION,'installed after all 1-7 were ready; no later reorder.');
 return true
}
function boot(){
 if(install())return;
 attempts+=1;
 if(attempts>=80){console.warn('[AT AI]',VERSION,'drawer prerequisites not ready; menu 8 was NOT created');return}
 setTimeout(boot,100)
}
boot();
window.ATReadyOnceMenuF609410={version:VERSION,install:()=>installed||install(),isInstalled:()=>installed};
})();`;
replaceIife('/* AT AI Mobil — V16.9.1F60.94.9 static analysis drawer */',readyOnce,'F60.94.9 static drawer runtime');

/* Stop the older Process Flow Planner from ever rewriting drawer labels/order later. */
const processStart=app.indexOf('function applyProcessMenu() {');
const processEnd=processStart>=0?app.indexOf('\nfunction ensureAll()',processStart):-1;
if(processStart<0||processEnd<0)throw new Error('[F60.94.10] applyProcessMenu block not found');
app=app.slice(0,processStart)+`function applyProcessMenu() {\n  /* F60.94.10: planner owns data only; drawer DOM is immutable after ready-once install. */\n  return false;\n}\n`+app.slice(processEnd);

/* F60.94.8/F60.94.9 quick-dialog bind may run before menu 8 exists. The ready-once button opens it directly, so no polling/rebind is required. */
for(const bad of[
 'MENU-AUTHORITY-GUARD-V16.9.1F60.94.6',
 'cloneNode(true)',
 'replaceWith(b)',
 'for(const ms of[0,80,300,900,1800])setTimeout(bind,ms)',
 'for(const ms of [50,350,1200,2550,3300]) setTimeout(applyStableMenu,ms)'
])if(app.includes(bad))throw new Error('[F60.94.10] forbidden drawer mutation mechanism survived: '+bad);
for(const token of[
 'READY-ONCE-MENU-V16.9.1F60.94.10',
 'drawer prerequisites not ready; menu 8 was NOT created',
 'F60.94.10: planner owns data only',
 'TRACK-MAINT-PROGRESS-V16.9.1F60.94.8',
 'DEGREE-SPEED-TOP5-V16.9.1F60.94.5'
])if(!app.includes(token))throw new Error('[F60.94.10] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692950');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692950'))throw new Error('[F60.94.10] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.10 build complete: no menu mutation before 1-7 are ready; one final install only; legacy planner menu writer disabled.');
