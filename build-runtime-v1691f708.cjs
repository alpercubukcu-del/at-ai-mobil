const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f707.cjs');
const FIX=path.join(ROOT,'track-maintenance-stage-fix-v1691f708.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.17] F60.94.16 base builder missing');
if(!fs.existsSync(FIX))throw new Error('[F60.94.17] staged maintenance fix missing');
const fix=fs.readFileSync(FIX,'utf8');
for(const token of[
 'TRACK-MAINT-STAGE-FIX-V16.9.1F60.94.17',
 'ATTrackMaintenanceStageFixF609417',
 'archive completion no longer waits for analysis',
 'Güncel Analize Yeniden Uygula',
 'setButtons(false)'
])if(!fix.includes(token))throw new Error('[F60.94.17] staged-flow invariant missing: '+token);
new Function(fix);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
for(const token of[
 'TRACK-MAINT-ARCHIVE-V16.9.1F60.89',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 'ATTrackMaintenanceRealDoorF609416',
 'sayfa alınıyor…'
])if(!app.includes(token))throw new Error('[F60.94.17] required F60.94.16/F60.89 base missing: '+token);
if(app.includes('TRACK-MAINT-STAGE-FIX-V16.9.1F60.94.17'))throw new Error('[F60.94.17] staged fix already present before append');
app+='\n\n'+fix.trim()+'\n';
for(const token of[
 'TRACK-MAINT-ARCHIVE-V16.9.1F60.89',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 'TRACK-MAINT-STAGE-FIX-V16.9.1F60.94.17',
 'ATTrackMaintenanceStageFixF609417',
 'DEGREE-SPEED-TOP5-V16.9.1F60.94.5'
])if(!app.includes(token))throw new Error('[F60.94.17] final bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692958');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692958'))throw new Error('[F60.94.17] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.17 build complete: archive, missing-update and analysis-apply stages unlock independently.');
