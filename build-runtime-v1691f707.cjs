const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f705.cjs');
const DOOR=path.join(ROOT,'track-maintenance-real-door-v1691f707.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.16] F60.94.14 base builder missing');
if(!fs.existsSync(DOOR))throw new Error('[F60.94.16] restored maintenance door missing');
const door=fs.readFileSync(DOOR,'utf8');
for(const token of[
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 'ATTrackMaintenanceRealDoorF609416',
 "at-ai:track-maintenance-status",
 'backfillYears',
 'waitForEngine'
])if(!door.includes(token))throw new Error('[F60.94.16] door invariant missing: '+token);
new Function(door);

/* Build the last known-good menu shell first. F60.94.15 is deliberately not used as base,
   because it appended the broken door and could leave duplicate capture listeners behind. */
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/* Hard proof that the real F60.89 downloader survived the full build chain.
   These checks are against the GENERATED bundle, not the new UI source. */
for(const token of[
 'TRACK-MAINT-ARCHIVE-V16.9.1F60.89',
 "window.ATTrackMaintenanceV1={version:VERSION,get:getReport,profile,infer,syncRange,backfillYears,autoSync,detailedSurface,windParts,getLastContext:()=>lastContext,isBusy:()=>busy};",
 "window.dispatchEvent(new CustomEvent('at-ai:track-maintenance-status'",
 'async function syncYear(year)',
 'async function backfillYears(from,to)',
 'sayfa alınıyor…'
])if(!app.includes(token))throw new Error('[F60.94.16] REAL archive engine missing from generated bundle: '+token);

/* F60.94.15 door must not be present: otherwise its document capture listener can win the tap. */
if(app.includes('TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.15'))throw new Error('[F60.94.16] obsolete F60.94.15 door leaked into base bundle');

app+='\n\n'+door.trim()+'\n';
for(const token of[
 'FINAL-DRAWER-ORDER-V16.9.1F60.94.14',
 'TRACK-MAINT-ARCHIVE-V16.9.1F60.89',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 'ATTrackMaintenanceRealDoorF609416',
 'at-ai:track-maintenance-status',
 'DEGREE-SPEED-TOP5-V16.9.1F60.94.5'
])if(!app.includes(token))throw new Error('[F60.94.16] final bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692957');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692957'))throw new Error('[F60.94.16] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.16 build complete: real F60.89 archive engine hard-verified and live progress door restored.');
