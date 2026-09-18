const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f705.cjs');
const DOOR=path.join(ROOT,'track-maintenance-real-door-v1691f706.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.15] F60.94.14 base builder missing');
if(!fs.existsSync(DOOR))throw new Error('[F60.94.15] real maintenance door missing');
const door=fs.readFileSync(DOOR,'utf8');
for(const token of[
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.15',
 'ATTrackMaintenanceRealDoorF609415',
 'ATTrackMaintenanceV1',
 'ATDegreeSpeedF6090'
])if(!door.includes(token))throw new Error('[F60.94.15] door invariant missing: '+token);
new Function(door);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+door.trim()+'\n';
for(const token of[
 'FINAL-DRAWER-ORDER-V16.9.1F60.94.14',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.15',
 'ATTrackMaintenanceRealDoorF609415',
 'ATTrackMaintenanceV1',
 'ATDegreeSpeedF6090',
 'DEGREE-SPEED-TOP5-V16.9.1F60.94.5'
])if(!app.includes(token))throw new Error('[F60.94.15] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692956');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692956'))throw new Error('[F60.94.15] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.15 build complete: real maintenance archive door and analysis bridge appended.');
