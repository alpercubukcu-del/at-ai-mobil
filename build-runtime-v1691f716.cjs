const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f715.cjs');
const RANGE_FIX=path.join(ROOT,'archive-range-update-fix-v1691f716.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.26] F60.94.25 base builder missing');
if(!fs.existsSync(RANGE_FIX))throw new Error('[F60.94.26] archive range update module missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/* The original track-maintenance engine calls its lexical autoSync() directly
 * after program load. Guard that exact local function as well, otherwise a
 * real-race archive update can appear to start both archive engines at once. */
const autoSyncNeedle="async function autoSync(targetDate){\n  if(busy||!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(targetDate||'')))return;";
const autoSyncGuard="async function autoSync(targetDate){\n  if(window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__)return;\n  if(busy||!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(targetDate||'')))return;";
if(!app.includes(autoSyncNeedle))throw new Error('[F60.94.26] track autoSync source marker missing');
app=app.replace(autoSyncNeedle,autoSyncGuard);

const mod=fs.readFileSync(RANGE_FIX,'utf8');
for(const token of[
 'ARCHIVE-RANGE-UPDATE-V16.9.1F60.94.26',
 'runRealRangeUpdate',
 'runTrackRangeUpdate',
 '__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__',
 "oldTrack.id='tmRangeUpdateF609426'",
 'Pist/Bakım/Hava bu işlemde çalıştırılmadı.'
])if(!mod.includes(token))throw new Error('[F60.94.26] range update invariant missing: '+token);
for(const bad of['new MutationObserver','setInterval(','document.addEventListener(\'touchend\'','document.addEventListener(\'pointerup\''])if(mod.includes(bad))throw new Error('[F60.94.26] forbidden reactive/global loop in range fix: '+bad);
new Function(mod);
app+='\n\n'+mod.trim()+'\n';
for(const token of[
 'DRAWER-ORDER-ONLY-V16.9.1F60.94.24',
 'ARCHIVE-YEAR-INVENTORY-V16.9.1F60.94.25',
 'ARCHIVE-RANGE-UPDATE-V16.9.1F60.94.26',
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 'KOSU_SORGULAMA_REAL_ARCHIVE',
 'if(window.__AT_REAL_RANGE_UPDATE_ACTIVE_F609426__)return;'
])if(!app.includes(token))throw new Error('[F60.94.26] final bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692966');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692966'))throw new Error('[F60.94.26] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.26 build complete: selected archive years are fully checked to today; real-race and track-maintenance update actions are isolated, including the legacy program-load autoSync path.');
