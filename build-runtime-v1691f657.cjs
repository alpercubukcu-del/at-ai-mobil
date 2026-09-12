const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f655.cjs');
const EXTRA=path.join(ROOT,'career-daily-archive-per-race-v1691f657.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE))throw new Error('[F60.57] Missing F60.55 Career baseline builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.57] Missing per-race Career daily archive writer.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';

for(const token of[
  'CAREER-SEP4-EFFECTIVE-RUNTIME-V16.9.1F60.54',
  'CAREER-DAILY-ARCHIVE-IDB-VERSION-FIX-V16.9.1F60.55',
  'CAREER-DAILY-ARCHIVE-PER-RACE-V16.9.1F60.57',
  'DAILY-CAREER-ARCHIVE-V14.6'
])if(!app.includes(token))throw new Error('[F60.57] Verification failed: '+token);

new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169258');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169258'))throw new Error('[F60.57] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.57 build complete: each calculated Career race is saved and verified as a separate Daily Archive record.');
