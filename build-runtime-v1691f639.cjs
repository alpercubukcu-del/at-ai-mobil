const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f638.cjs');
const EXTRA=path.join(ROOT,'annual-reference-timeout-guard-v1691f639.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.39] Missing F60.38 base build.');
if(!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.39] Missing annual timeout guard.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';

for(const token of[
  'TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.1-TOP3-YEARBEST',
  'ANNUAL-REFERENCE-TIMEOUT-GUARD-V16.9.1F60.39',
  'TIMEOUT_MS=30000',
  'one stuck reference cannot block the run',
  'TJK-ANNUAL-ARCHIVE-V14.1-BATCH-WRITE',
  'DAILY-CALIBRATION-STAGED-V16.9.1F60.35'
]){
  if(!app.includes(token)) throw new Error('[V16.9.1F60.39] Verification failed: '+token);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169239');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169239')) throw new Error('[V16.9.1F60.39] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.39 build complete: stable annual V14.1 source retained; external 30s request timeout guard appended.');
