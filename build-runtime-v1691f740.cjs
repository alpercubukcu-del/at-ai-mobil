const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f739.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.20] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const oldApi='/api/tjk-day-results-v1',newApi='/api/tjk-day-results-v17';
const hits=app.split(oldApi).length-1;
if(hits<1)throw new Error('[F60.94.31.20] day-results API target missing');
app=app.replaceAll(oldApi,newApi);
app=app.replaceAll('F60.94.31.19','F60.94.31.20');
app=app.replace('F60.94.31.20 · LOCAL-FIRST + RESULT-FALLBACK','F60.94.31.20 · LOCAL-FIRST + 4-ERA');
if(!app.includes(newApi))throw new Error('[F60.94.31.20] four-era API route not wired');
if(!app.includes('F60.94.31.20'))throw new Error('[F60.94.31.20] version bump failed');
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8')
  .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692990')
  .replaceAll('F60.94.31.19','F60.94.31.20');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692990'))throw new Error('[F60.94.31.20] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.20 build complete: four-era cityId result engine wired. API refs replaced:',hits);
