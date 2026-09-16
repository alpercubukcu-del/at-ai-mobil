const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f681.cjs');
const EXTRA=path.join(ROOT,'repair-batch-yg-v1691f682.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.82] F60.81 builder missing');
if(!fs.existsSync(EXTRA))throw new Error('[F60.82] batch repair overlay missing');
const src=fs.readFileSync(EXTRA,'utf8');
for(const token of[
  'REPAIR-BATCH-YG-V16.9.1F60.82',
  'Bu Yarış Gününü Toplu İndir',
  'Tüm Eksikleri Y.G. ile Tamamla',
  'Y.G. ile Otomatik Bul',
  'markResolvedFromArchive',
  'window.ATF6082RepairBatch'
])if(!src.includes(token))throw new Error('[F60.82] invariant missing: '+token);
new Function(src);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+src.trim()+'\n';
for(const token of[
  'ANNUAL-RESULTS-YG-CONTINUATION-V16.9.1F60.81',
  'REPAIR-BATCH-YG-V16.9.1F60.82',
  'Bu Yarış Gününü Toplu İndir',
  'Y.G. ile Otomatik Bul'
])if(!app.includes(token))throw new Error('[F60.82] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169288');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169288'))throw new Error('[F60.82] cache bust failed');
console.log('[AT AI] V16.9.1F60.82 build complete: Repair Center hides already-saved/manual matches, accepts one TJK race-day result link for batch import, and uses F60.81 city + Y.G. meeting logic for per-meeting or full-range automatic repair.');
