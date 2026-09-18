const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f702.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.11] F60.94.10 base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/*
 * ROOT CAUSE confirmed from the Android screenshot:
 * PROGRAM-WORKFLOW-GUIDE-V16.9.1F60.61 still keeps closed-over timers at
 * 300/1100/2400 ms and a pageshow listener. Reassigning window.applyMenu later
 * cannot cancel those closures. Each late call moves ONLY buttons 1..7 before
 * .drawer-note, leaving menu 8 behind; this transforms 1..8 into 8,1..7.
 *
 * Preserve the Kullanım Talimatı dialog/button, but make its menu hook creation-only.
 * It must never relabel/reorder 2..8 or rewrite drawer-note after startup.
 */
const guideMarker="const VERSION='PROGRAM-WORKFLOW-GUIDE-V16.9.1F60.61';";
const guideStart=app.indexOf(guideMarker);
if(guideStart<0)throw new Error('[F60.94.11] program workflow guide marker not found');
const applyStart=app.indexOf('function applyMenu(){',guideStart);
const applyEnd=applyStart>=0?app.indexOf('\n}\n\nif(document.readyState',applyStart):-1;
if(applyStart<0||applyEnd<0)throw new Error('[F60.94.11] legacy guide applyMenu block not found');
const safeApply=`function applyMenu(){
  const drawer=$('drawer');if(!drawer)return false;
  let guide=$('programGuideBtnV661');
  if(!guide){
    guide=document.createElement('button');
    guide.id='programGuideBtnV661';
    guide.type='button';
    guide.textContent='1. Kullanım Talimatı';
    guide.onclick=()=>{try{if(typeof closeDrawer==='function')closeDrawer()}catch{}const d=ensureDialog();if(!d.open)d.showModal()};
    const note=drawer.querySelector('.drawer-note');
    if(note)drawer.insertBefore(guide,note);else drawer.appendChild(guide);
  }
  label(guide,'1. Kullanım Talimatı');
  guide.style.display='';guide.removeAttribute('aria-hidden');
  const historical=drawer.querySelector('[data-view="historical"]');
  if(historical)historical.style.display='none';
  const oldExport=findByText(drawer,/Kariyer Excel/i);
  if(oldExport){oldExport.style.display='none';oldExport.setAttribute('aria-hidden','true');}
  return true;
}`;
app=app.slice(0,applyStart)+safeApply+app.slice(applyEnd+2);

/* Remove the closed-over late writers completely. Initial boot call remains and only creates guide. */
const legacySchedule="setTimeout(applyMenu,300);setTimeout(applyMenu,1100);setTimeout(applyMenu,2400);\nwindow.addEventListener('pageshow',applyMenu,{passive:true});";
if(!app.includes(legacySchedule))throw new Error('[F60.94.11] legacy guide timer/pageshow block not found');
app=app.replace(legacySchedule,"/* F60.94.11: late workflow-guide drawer rewrites removed. */");

/* Defensive: the old note text is the visible fingerprint of the stale writer in the reported screenshot. */
const staleNote='Önerilen sıra: Arşiv → Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon. Geçmiş yerli sonuçlarda yerel arşiv önceliklidir; eksikte TJK fallback kullanılır.';
if(app.includes(staleNote))throw new Error('[F60.94.11] stale workflow-guide drawer note survived');
for(const bad of[
  'setTimeout(applyMenu,300);setTimeout(applyMenu,1100);setTimeout(applyMenu,2400)',
  "window.addEventListener('pageshow',applyMenu,{passive:true})"
])if(app.includes(bad))throw new Error('[F60.94.11] legacy guide drawer writer survived: '+bad);
for(const token of[
  'READY-ONCE-MENU-V16.9.1F60.94.10',
  'F60.94.11: late workflow-guide drawer rewrites removed.',
  'TRACK-MAINT-PROGRESS-V16.9.1F60.94.8',
  'DEGREE-SPEED-TOP5-V16.9.1F60.94.5'
])if(!app.includes(token))throw new Error('[F60.94.11] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692951');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692951'))throw new Error('[F60.94.11] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.11 build complete: stale workflow-guide timers/pageshow writer removed; menu 8 can no longer be pushed ahead of 1..7 by that legacy closure.');
