const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f662.cjs');
const EXTRA=path.join(ROOT,'current-analysis-multifilter-bridge-v1691f663.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.63] Missing F60.62 baseline builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.63] Missing current-analysis multifilter bridge.');
const source=fs.readFileSync(EXTRA,'utf8');
for(const token of[
  "CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63",
  "indexedDB.open(DB_NAME, DB_VERSION)",
  "d.dataset.view==='current'",
  "filterCareerPayload",
  "Takvim ve Çoklu Filtre ile Eşleşmeleri Seç"
])if(!source.includes(token))throw new Error('[F60.63] Required invariant missing: '+token);
if(source.includes('deleteDatabase('))throw new Error('[F60.63] Archive deletion is forbidden.');
new Function(source);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+source.trim()+'\n';
for(const token of[
  'PERFORMANCE-SAFE-V16.9.1F60.61',
  'CALENDAR-MULTIFILTER-CORE-V16.9.1F60.62',
  'CALENDAR-MULTIFILTER-REPAIR-V16.9.1F60.62',
  'CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63',
  'const CAREER_CONCURRENCY = 4;'
])if(!app.includes(token))throw new Error('[F60.63] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169264');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169264'))throw new Error('[F60.63] Cache bust failed.');
console.log('[AT AI] V16.9.1F60.63 build complete: Güncel Analiz first-open calendar/multifilter panel + DB v3 option loading + selected-reference career filtering.');
