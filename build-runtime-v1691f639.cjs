const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f638.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.39] Missing F60.38 base build.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

const app=fs.readFileSync(APP,'utf8');
for(const token of[
  'TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.2-TIMEOUT-GUARD',
  'function withTimeout',
  'fetchJsonTimed',
  '45000',
  '25000',
  'İşleniyor:',
  'Bugünkü atlar:',
  'TJK-ANNUAL-ARCHIVE-V14.1-BATCH-WRITE',
  'DAILY-CALIBRATION-STAGED-V16.9.1F60.35'
]){
  if(!app.includes(token)) throw new Error('[V16.9.1F60.39] Verification failed: '+token);
}
new Function(app);

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169239');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169239')) throw new Error('[V16.9.1F60.39] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.39 build complete: annual Top3 reference race and career requests have hard timeouts; one stuck reference cannot block completion.');
