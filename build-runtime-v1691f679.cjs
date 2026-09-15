const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f672.cjs');
const EXTRA=path.join(ROOT,'annual-results-yg-continuation-v1691f679.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.79] F60.74 builder missing');
if(!fs.existsSync(EXTRA))throw new Error('[F60.79] Y.G. continuation runtime missing');
const src=fs.readFileSync(EXTRA,'utf8');
for(const token of[
  'ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.79',
  '/api/tjk-meeting-resolve-v1',
  'Y.G. ile Sonuçları Güncelle',
  'scheduledDate',
  'runDate',
  'meetingNo',
  'postponedRaceNos',
  'window.ATF6079YGResults'
])if(!src.includes(token))throw new Error('[F60.79] invariant missing: '+token);
new Function(src);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+src.trim()+'\n';
for(const token of[
  'ANNUAL-RESULTS-RESUME-V16.9.1F60.68',
  'POSTPONED-RACE-REPAIR-V16.9.1F60.74',
  'ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.79',
  'Y.G. ile Sonuçları Güncelle'
])if(!app.includes(token))throw new Error('[F60.79] bundle verification failed: '+token);
if(app.includes('ANNUAL-RESULTS-PROGRAM-REALIZED-V16.9.1F60.78'))throw new Error('[F60.79] obsolete F60.78 same-day-only runtime must not be bundled');
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169285');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169285'))throw new Error('[F60.79] cache bust failed');
console.log('[AT AI] V16.9.1F60.79 build complete: annual program is the baseline; incomplete/short domestic meetings are resolved by city + TJK season Y.G. number, and continuation races are downloaded from later dates with the same race number while preserving scheduledDate and runDate.');
