const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f654.cjs');
const EXTRA=path.join(ROOT,'career-daily-archive-idb-version-fix-v1691f655.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE))throw new Error('[F60.55] Missing F60.54 Career runtime.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.55] Missing Daily Archive IndexedDB version fix.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';

for(const token of[
  'CAREER-SEP4-EFFECTIVE-RUNTIME-V16.9.1F60.54',
  'CAREER-DAILY-ARCHIVE-IDB-VERSION-FIX-V16.9.1F60.55',
  'DAILY-CAREER-ARCHIVE-V14.6',
  'CAREER-ARCHIVE-SCORE-GUARD-V16.9.1F33+F60.52-CALC-FIRST-EVIDENCE-ONLY'
])if(!app.includes(token))throw new Error('[F60.55] Verification failed: '+token);

new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169256');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169256'))throw new Error('[F60.55] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.55 build complete: Daily Career Archive opens current IndexedDB version; Sep 4 scoring flow unchanged.');
