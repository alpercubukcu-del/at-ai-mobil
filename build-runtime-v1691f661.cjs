const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f660.cjs');
const EXTRAS=[
  'performance-safe-v1691f661.js',
  'current-analysis-daily-archive-v1691f661.js',
  'annual-results-archive-v1691f661.js',
  'exact-rank-coupon-guard-v1691f661.js',
  'program-workflow-guide-v1691f661.js'
].map(name=>path.join(ROOT,name));
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE))throw new Error('[F60.61] Missing F60.60 baseline builder.');
for(const file of EXTRAS)if(!fs.existsSync(file))throw new Error('[F60.61] Missing additive module: '+path.basename(file));

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
for(const file of EXTRAS)app+='\n\n'+fs.readFileSync(file,'utf8').trim()+'\n';
for(const token of[
  'CAREER-FETCH-TIMEOUT-RETRY-V16.9.1F60.60',
  'PERFORMANCE-SAFE-V16.9.1F60.61',
  'CURRENT-ANALYSIS-DAILY-ARCHIVE-V16.9.1F60.61',
  'ANNUAL-RESULTS-ARCHIVE-V16.9.1F60.61',
  'EXACT-RANK-COUPON-GUARD-V16.9.1F60.61',
  'PROGRAM-WORKFLOW-GUIDE-V16.9.1F60.61',
  'const CAREER_CONCURRENCY = 4;'
])if(!app.includes(token))throw new Error('[F60.61] Verification failed: '+token);

new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169262');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169262'))throw new Error('[F60.61] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.61 build complete: calculation/save methods preserved; dialog-time live refresh pause + race-meta coalescing + real Career abort; Current Analysis daily archive; domestic yearly results archive with local-first history fallback; exact-winner-rank coupon widening guard; workflow guide/menu order.');
