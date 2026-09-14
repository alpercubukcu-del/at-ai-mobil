const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f662.cjs');
const EXTRA=path.join(ROOT,'compact-filter-dropdown-v1691f663.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.63] Missing F60.62 baseline builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.63] Missing compact dropdown runtime.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';
for(const token of[
  'CALENDAR-MULTIFILTER-REPAIR-V16.9.1F60.62',
  'COMPACT-FILTER-DROPDOWN-V16.9.1F60.63',
  'PERFORMANCE-SAFE-V16.9.1F60.61',
  'const CAREER_CONCURRENCY = 4;'
])if(!app.includes(token))throw new Error('[F60.63] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169264');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169264'))throw new Error('[F60.63] Cache bust failed.');
console.log('[AT AI] V16.9.1F60.63 build complete: F60.62 filters preserved; multi-select groups start collapsed, open one at a time, show compact selected summaries; calculation/archive logic unchanged.');
