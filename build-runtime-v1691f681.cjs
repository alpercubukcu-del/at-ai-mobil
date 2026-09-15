const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f672.cjs');
const EXTRA=path.join(ROOT,'annual-results-yg-continuation-v1691f681.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.81] F60.74 builder missing');
if(!fs.existsSync(EXTRA))throw new Error('[F60.81] persistent Y.G. runtime missing');
const src=fs.readFileSync(EXTRA,'utf8');
for(const token of[
  'ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.81',
  'loadSavedGroup',
  'readDaysRange',
  'showSavedProgress',
  'Güncelle yalnız eksikleri tamamlar',
  'window.ATF6081YGResults'
])if(!src.includes(token))throw new Error('[F60.81] invariant missing: '+token);
new Function(src);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+src.trim()+'\n';
for(const token of[
  'ANNUAL-RESULTS-RESUME-V16.9.1F60.68',
  'POSTPONED-RACE-REPAIR-V16.9.1F60.74',
  'ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.81',
  'showSavedProgress'
])if(!app.includes(token))throw new Error('[F60.81] bundle verification failed: '+token);
if(app.includes('ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.79'))throw new Error('[F60.81] obsolete F60.79 runtime must not be bundled');
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169287');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169287'))throw new Error('[F60.81] cache bust failed');
console.log('[AT AI] V16.9.1F60.81 build complete: Y.G. result races are persisted immediately, partial meetings reload from IndexedDB after menu/page reopen, and only missing race numbers are fetched.');