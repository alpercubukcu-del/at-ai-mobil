const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f714.cjs');
const INVENTORY=path.join(ROOT,'archive-year-inventory-v1691f715.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.25] F60.94.24 base builder missing');
if(!fs.existsSync(INVENTORY))throw new Error('[F60.94.25] archive inventory module missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const inventory=fs.readFileSync(INVENTORY,'utf8');
for(const token of[
 'ARCHIVE-YEAR-INVENTORY-V16.9.1F60.94.25',
 'TELEFONDAKİ YILLIK GERÇEK YARIŞ ARŞİVİ',
 'TELEFONDAKİ YILLIK PİST / BAKIM / HAVA ARŞİVİ',
 'deleteRealYear',
 'deleteTrackYear',
 "setReconnectState(resultCount)"
])if(!inventory.includes(token))throw new Error('[F60.94.25] inventory invariant missing: '+token);
for(const bad of['new MutationObserver','setInterval(','document.addEventListener(\'touchend\'','document.addEventListener(\'pointerup\''])if(inventory.includes(bad))throw new Error('[F60.94.25] reactive/global loop forbidden in inventory module: '+bad);
new Function(inventory);
app+='\n\n'+inventory.trim()+'\n';
for(const token of[
 'STATIC-DRAWER-COMPAT-V16.9.1F60.94.19',
 'DRAWER-ORDER-ONLY-V16.9.1F60.94.24',
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 'KOSU_SORGULAMA_REAL_ARCHIVE',
 'ARCHIVE-YEAR-INVENTORY-V16.9.1F60.94.25'
])if(!app.includes(token))throw new Error('[F60.94.25] final bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692965');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692965'))throw new Error('[F60.94.25] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.25 build complete: per-year real race and track/maintenance/weather inventories added; selective year delete and reconnect readiness enabled.');
