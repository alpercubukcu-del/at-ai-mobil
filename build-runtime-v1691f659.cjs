const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f658.cjs');
const EXTRA=path.join(ROOT,'career-daily-archive-raw-ui-v1691f659.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE))throw new Error('[F60.59] Missing F60.58 archive baseline builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.59] Missing robust Career archive viewer.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';
for(const token of[
  'CAREER-DAILY-ARCHIVE-CACHE-BRIDGE-V16.9.1F60.58',
  'CAREER-DAILY-ARCHIVE-RAW-UI-V16.9.1F60.59',
  'DAILY-CAREER-ARCHIVE-V14.6'
])if(!app.includes(token))throw new Error('[F60.59] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169260');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169260'))throw new Error('[F60.59] Cache bust failed.');
console.log('[AT AI] V16.9.1F60.59 build complete: Daily Archive saves current Career state on open and displays raw per-race IndexedDB records directly.');
