const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f710.cjs');
const ORDER=path.join(ROOT,'drawer-order-only-v1691f714.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.24] F60.94.19 base builder missing');
if(!fs.existsSync(ORDER))throw new Error('[F60.94.24] order-only module missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const order=fs.readFileSync(ORDER,'utf8');
for(const token of[
 'DRAWER-ORDER-ONLY-V16.9.1F60.94.24',
 "label(r.annual,'7. Tarihsel Sonuç Arşivi')",
 "label(r.maintenance,'8. Gerçek Yarış Arşivi + Pist / Bakım / Hava')"
])if(!order.includes(token))throw new Error('[F60.94.24] order module invariant missing: '+token);
new Function(order);
app+='\n\n'+order.trim()+'\n';
for(const token of[
 'STATIC-DRAWER-COMPAT-V16.9.1F60.94.19',
 "directMenu8Only='F60.94.19'",
 "archiveHubDirectBind='F60.94.19'",
 'DRAWER-ORDER-ONLY-V16.9.1F60.94.24',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 'KOSU_SORGULAMA_REAL_ARCHIVE'
])if(!app.includes(token))throw new Error('[F60.94.24] final bundle verification failed: '+token);
for(const bad of[
 'drawer.__AT_FINAL_DRAWER_OBSERVER_F609414__=new MutationObserver',
 "setInterval(()=>{installPreviewChromeGuard();if($('drawer')?.classList.contains('open'))applyFinalOrder('open-interval')},2000)",
 "for(const type of['pointerup','touchend','click'])document.addEventListener(type,interceptMaintenanceTap,true)"
])if(app.includes(bad))throw new Error('[F60.94.24] forbidden old reactive menu loop survived: '+bad);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692964');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692964'))throw new Error('[F60.94.24] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.24 build complete: F60.94.19 preserved; fixed 1..8 order uses Tarihsel Sonuç Arşivi at menu 7.');
