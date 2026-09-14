const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f661.cjs');
const EXTRAS=[
  'calendar-multifilter-core-v1691f662.js',
  'calendar-multifilter-repair-v1691f662.js'
].map(name=>path.join(ROOT,name));
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const TEST=path.join(ROOT,'test-f6062.cjs');
if(!fs.existsSync(BASE))throw new Error('[F60.62] Missing F60.61 baseline builder.');
for(const file of EXTRAS)if(!fs.existsSync(file))throw new Error('[F60.62] Missing module: '+path.basename(file));
if(!fs.existsSync(TEST))throw new Error('[F60.62] Missing regression test.');
execFileSync(process.execPath,[TEST],{cwd:ROOT,stdio:'inherit'});
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
for(const file of EXTRAS)app+='\n\n'+fs.readFileSync(file,'utf8').trim()+'\n';
for(const token of[
  'PERFORMANCE-SAFE-V16.9.1F60.61',
  'ANNUAL-RESULTS-ARCHIVE-V16.9.1F60.61',
  'EXACT-RANK-COUPON-GUARD-V16.9.1F60.61',
  'CALENDAR-MULTIFILTER-CORE-V16.9.1F60.62',
  'CALENDAR-MULTIFILTER-REPAIR-V16.9.1F60.62',
  'const CAREER_CONCURRENCY = 4;'
])if(!app.includes(token))throw new Error('[F60.62] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169263');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169263'))throw new Error('[F60.62] Cache bust failed.');
console.log('[AT AI] V16.9.1F60.62 build complete: F60.61 calculation/save preserved; calendar date range + OR-within/AND-between multi filters + Career/Calibration selectors + date-scoped domestic results update + missing-race repair center.');
