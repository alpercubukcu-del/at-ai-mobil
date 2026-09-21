const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f738.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.19] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app=app.replaceAll('F60.94.31.18','F60.94.31.19');
app=app.replace('F60.94.31.19 · LOCAL-FIRST','F60.94.31.19 · LOCAL-FIRST + RESULT-FALLBACK');
if(!app.includes('F60.94.31.19'))throw new Error('[F60.94.31.19] app version bump failed');
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8')
  .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692989')
  .replaceAll('F60.94.31.18','F60.94.31.19');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692989'))throw new Error('[F60.94.31.19] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.19 build complete: local-first FOGD + TJK day-result fallback release.');
