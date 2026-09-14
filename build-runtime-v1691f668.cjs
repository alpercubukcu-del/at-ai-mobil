const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f663.cjs');
const EXTRA=path.join(ROOT,'annual-results-resume-v1691f668.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.68] Missing F60.67/F60.66 builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.68] Missing annual results resume runtime.');
const src=fs.readFileSync(EXTRA,'utf8');
for(const token of[
  'ANNUAL-RESULTS-RESUME-V16.9.1F60.68',
  'f6068:results-download-job',
  'await saveRace(group,race)',
  'saveDayState',
  'Kayıtlı ilerleme:',
  'kaldığı yerden devam eder',
  'window.ATF6068ResultsResume'
])if(!src.includes(token))throw new Error('[F60.68] Resume invariant missing: '+token);
new Function(src);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+src.trim()+'\n';
for(const token of[
  'ANNUAL-RESULTS-RESUME-V16.9.1F60.68',
  'HOME-MARKET-MANUAL-REFRESH-V16.9.1F60.66',
  'CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63',
  'Aşırı Sapma Gösteren Yarışları At',
  '<option value="all" selected>Tümü</option>',
  '<option value="10">Son 10</option>'
])if(!app.includes(token))throw new Error('[F60.68] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169274');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169274'))throw new Error('[F60.68] Cache bust failed.');
console.log('[AT AI] V16.9.1F60.68 build complete: domestic annual results are persisted race-by-race with day/job checkpoints; menu/page interruption resumes from actual IndexedDB records instead of restarting downloaded work.');
