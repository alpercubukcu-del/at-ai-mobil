const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f657.cjs');
const EXTRA=path.join(ROOT,'career-daily-archive-cache-bridge-v1691f658.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE))throw new Error('[F60.58] Missing F60.57 per-race archive builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.58] Missing Career archive cache-hit bridge.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';

for(const token of[
  'CAREER-DAILY-ARCHIVE-PER-RACE-V16.9.1F60.57',
  'CAREER-DAILY-ARCHIVE-CACHE-BRIDGE-V16.9.1F60.58',
  'DAILY-CAREER-ARCHIVE-V14.6'
])if(!app.includes(token))throw new Error('[F60.58] Verification failed: '+token);

new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169259');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169259'))throw new Error('[F60.58] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.58 build complete: cached or already-rendered Career results are also persisted per race to Daily Archive.');
