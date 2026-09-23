const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f708.cjs');
const HUB=path.join(ROOT,'archive-hub-menu8-v1691f709.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.18] F60.94.17 base builder missing');
if(!fs.existsSync(HUB))throw new Error('[F60.94.18] menu 8 archive hub runtime missing');
const hub=fs.readFileSync(HUB,'utf8');
for(const token of[
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 'Gerçek Yarış Arşivi · Koşu Sorgulama',
 'at_ai_tjk_real_race_index_v1',
 'at_ai_tjk_annual_results_v1',
 'KOSU_SORGULAMA_REAL_ARCHIVE',
 'rrDownloadF6093',
 'tmDailyDownloadF609418',
 'ATArchiveHubMenu8F609418'
])if(!hub.includes(token))throw new Error('[F60.94.18] archive hub invariant missing: '+token);
new Function(hub);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
for(const token of[
 'REAL-RACE-ARCHIVE-V16.9.1F60.93',
 'TRACK-MAINT-ARCHIVE-V16.9.1F60.89',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 'TRACK-MAINT-STAGE-FIX-V16.9.1F60.94.17',
 'ATRealRaceArchiveF6093',
 'ATAnnualResultsArchiveV661'
])if(!app.includes(token))throw new Error('[F60.94.18] required archive base missing: '+token);
if(app.includes('ARCHIVE-HUB-MENU8-V16.9.1F60.94.18'))throw new Error('[F60.94.18] archive hub already present before append');
app=app.replaceAll('8. Pist / Bakım / Hava Arşivi','8. Gerçek Yarış Arşivi + Pist / Bakım / Hava');
app=app.replaceAll('Arşiv → Pist/Bakım/Hava.','Arşiv → Gerçek Yarış + Pist/Bakım/Hava.');
app+='\n\n'+hub.trim()+'\n';
for(const token of[
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 '8. Gerçek Yarış Arşivi + Pist / Bakım / Hava',
 'at_ai_tjk_real_race_index_v1',
 'at_ai_tjk_annual_results_v1',
 'KOSU_SORGULAMA_REAL_ARCHIVE',
 'ATArchiveHubMenu8F609418',
 'TRACK-MAINT-STAGE-FIX-V16.9.1F60.94.17',
 'DEGREE-SPEED-TOP5-V16.9.1F60.94.5'
])if(!app.includes(token))throw new Error('[F60.94.18] final bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692959');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692959'))throw new Error('[F60.94.18] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.18 build complete: menu 8 now owns real race results plus track/maintenance/weather archives and exposes the shared result DB to analyses.');
