const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f646.cjs');
const EXTRA=path.join(ROOT,'career-sep4-calc-restore-v1691f653.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE))throw new Error('[F60.53] Missing g6cjjybha F60.52 baseline builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.53] Missing 04.09 Career calculation restore module.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';

for(const token of[
  'CAREER-SEP4-CALC-RESTORE-V16.9.1F60.53',
  'CAREER-ARCHIVE-SCORE-GUARD-V16.9.1F33+F60.52-CALC-FIRST-EVIDENCE-ONLY',
  'PROCESS-FLOW-PLANNER-V16.9.1F60.45',
  'SELECTED-PACKAGE-20-MODEL-MATRIX-V16.9.1F60.46'
])if(!app.includes(token))throw new Error('[F60.53] Verification failed: '+token);

new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169254');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169254'))throw new Error('[F60.53] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.53 build complete: g6cjjybha baseline + exact 04.09 Career calculation route restored last.');
