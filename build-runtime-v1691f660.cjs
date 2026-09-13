const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f659.cjs');
const EXTRA=path.join(ROOT,'career-fetch-timeout-retry-v1691f660.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE))throw new Error('[F60.60] Missing F60.59 baseline builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.60] Missing Career fetch timeout/retry guard.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';
for(const token of[
  'CAREER-DAILY-ARCHIVE-RAW-UI-V16.9.1F60.59',
  'CAREER-FETCH-TIMEOUT-RETRY-V16.9.1F60.60',
  '__AT_CAREER_BACKGROUND_SAFE_V609__',
  'VISIBILITY_SAFE_YIELD',
  'const CAREER_CONCURRENCY = 4;'
])if(!app.includes(token))throw new Error('[F60.60] Verification failed: '+token);

new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169261');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169261'))throw new Error('[F60.60] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.60 build complete: F60.9 background-safe Career flow + stable 4-way concurrency preserved; each horse request gets 15s timeout and one retry so 10/11 cannot wait forever.');
