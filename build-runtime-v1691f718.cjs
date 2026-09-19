const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f717.cjs');
const MOD=path.join(ROOT,'archive-calendar-resume-v1691f718.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.28] F60.94.27 base builder missing');
if(!fs.existsSync(MOD))throw new Error('[F60.94.28] calendar/resume module missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const mod=fs.readFileSync(MOD,'utf8');
for(const token of[
 'ARCHIVE-CALENDAR-RESUME-V16.9.1F60.94.28',
 "date.type='date'",
 'rrDateFromF609428',
 'tmDateFromF609428',
 'Devam kaydı:',
 'prepCompletedIndex',
 'kaldığı yerden devam ediyor',
 'tamamlanmış indeks yeniden taranmayacak'
])if(!mod.includes(token))throw new Error('[F60.94.28] module invariant missing: '+token);
for(const bad of['new MutationObserver','setInterval(','document.addEventListener(\'touchend\'','document.addEventListener(\'pointerup\''])if(mod.includes(bad))throw new Error('[F60.94.28] forbidden reactive/global loop: '+bad);
new Function(mod);
app+='\n\n'+mod.trim()+'\n';
for(const token of[
 'DRAWER-ORDER-ONLY-V16.9.1F60.94.24',
 'ARCHIVE-YEAR-INVENTORY-V16.9.1F60.94.25',
 'ARCHIVE-RANGE-UPDATE-V16.9.1F60.94.26',
 'REAL-RACE-REPAIR-V16.9.1F60.94.27',
 'ARCHIVE-CALENDAR-RESUME-V16.9.1F60.94.28'
])if(!app.includes(token))throw new Error('[F60.94.28] bundle invariant missing: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692968');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692968'))throw new Error('[F60.94.28] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.28 build complete: archive year inputs use mobile calendar selectors; partial Koşu Sorgulama checkpoints resume and valid complete indexes are reused.');
