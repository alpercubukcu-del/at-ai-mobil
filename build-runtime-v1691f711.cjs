const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f710.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.20] F60.94.19 base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/*
 * Keep F60.94.19's non-reactive drawer. The only remaining race is that an old
 * archive module can replace/move menu 7 after the ready-once install, leaving
 * menu 8 visually above it. Do one synchronous, idempotent order check on the
 * real hamburger button BEFORE the drawer becomes visible. No observer, no
 * interval, no reorder timer and no document-wide pointer/touch capture hook.
 */
const bootNeedle='function boot(){';
if(!app.includes(bootNeedle))throw new Error('[F60.94.20] ready-once boot marker not found');
const preOpenGuard=`function enforceCanonicalOrder(){
 const r=refs();
 const maintenance=$('trackMaintenanceMenuBtnF60944');
 if(!allReady(r)||!maintenance)return false;
 const desired=[r.guide,r.current,r.career,r.calibration,r.scenario,r.coupon,r.annual,maintenance];
 const present=[...r.drawer.children].filter(node=>desired.includes(node));
 const alreadyCorrect=present.length===desired.length&&desired.every((node,i)=>present[i]===node);
 if(alreadyCorrect)return true;
 const note=r.drawer.querySelector('.drawer-note');
 for(const node of desired){if(note)r.drawer.insertBefore(node,note);else r.drawer.appendChild(node)}
 r.drawer.dataset.lastCanonicalOrderFix='F60.94.20';
 return true;
}
function bindPreOpenOrderCheck(){
 const menu=$('menuBtn');if(!menu)return false;
 if(menu.dataset.readyOnceOrderCheck==='F60.94.20')return true;
 menu.dataset.readyOnceOrderCheck='F60.94.20';
 menu.addEventListener('click',()=>{try{enforceCanonicalOrder()}catch{}},true);
 return true;
}
`;
app=app.replace(bootNeedle,preOpenGuard+bootNeedle);

const installedOld=" r.drawer.dataset.readyOnceMenuVersion=VERSION;\n installed=true;";
const installedNew=" r.drawer.dataset.readyOnceMenuVersion=VERSION;\n bindPreOpenOrderCheck();\n installed=true;";
if(!app.includes(installedOld))throw new Error('[F60.94.20] ready-once install completion marker not found');
app=app.replace(installedOld,installedNew);

const apiOld="window.ATReadyOnceMenuF609410={version:VERSION,install:()=>installed||install(),isInstalled:()=>installed};";
const apiNew="window.ATReadyOnceMenuF609410={version:VERSION,install:()=>installed?(enforceCanonicalOrder(),true):install(),ensureOrder:enforceCanonicalOrder,isInstalled:()=>installed};";
if(!app.includes(apiOld))throw new Error('[F60.94.20] ready-once public API marker not found');
app=app.replace(apiOld,apiNew);

for(const bad of[
 'drawer.__AT_FINAL_DRAWER_OBSERVER_F609414__=new MutationObserver',
 "for(const type of['pointerup','touchend','click'])document.addEventListener(type,interceptMaintenanceTap,true)",
 "setInterval(()=>{installPreviewChromeGuard();if($('drawer')?.classList.contains('open'))applyFinalOrder('open-interval')},2000)"
])if(app.includes(bad))throw new Error('[F60.94.20] forbidden reactive drawer loop survived: '+bad);
for(const token of[
 'READY-ONCE-MENU-V16.9.1F60.94.10',
 'STATIC-DRAWER-COMPAT-V16.9.1F60.94.19',
 "readyOnceOrderCheck='F60.94.20'",
 "lastCanonicalOrderFix='F60.94.20'",
 'ensureOrder:enforceCanonicalOrder',
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 'KOSU_SORGULAMA_REAL_ARCHIVE'
])if(!app.includes(token))throw new Error('[F60.94.20] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692961');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692961'))throw new Error('[F60.94.20] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.20 build complete: menu 8 is rechecked synchronously before drawer open; no reactive reorder loops.');
