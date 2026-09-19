const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f718.cjs');
const MOD=path.join(ROOT,'real-race-index-match-v1691f719.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.29] F60.94.28 base builder missing');
if(!fs.existsSync(MOD))throw new Error('[F60.94.29] real-race index matcher missing');
const mod=fs.readFileSync(MOD,'utf8');
for(const token of[
 'REAL-RACE-INDEX-MATCH-V16.9.1F60.94.29',
 "QUERY_SCHEMA='F60.94.29'",
 'matchIndex',
 'WINNER_DEGREE_F60.94.29',
 'migrateYearIndex',
 'matchedRaceCount'
])if(!mod.includes(token))throw new Error('[F60.94.29] module invariant missing: '+token);
for(const bad of['new MutationObserver','setInterval(','document.addEventListener(\'touchend\'','document.addEventListener(\'pointerup\''])if(mod.includes(bad))throw new Error('[F60.94.29] forbidden reactive/global loop: '+bad);
new Function(mod);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+mod.trim()+'\n';
for(const token of[
 'ARCHIVE-CALENDAR-RESUME-V16.9.1F60.94.28',
 'REAL-RACE-INDEX-MATCH-V16.9.1F60.94.29',
 'WINNER_DEGREE_F60.94.29',
 'KOSU_SORGULAMA_REAL_ARCHIVE'
])if(!app.includes(token))throw new Error('[F60.94.29] bundle invariant missing: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692969');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692969'))throw new Error('[F60.94.29] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.29 build complete: Koşu Sorgulama index no longer depends on fake race numbers; day results supply the real race numbers and winner+degree performs deterministic matching.');
