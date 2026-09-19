const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f720.cjs');
const MOD=path.join(ROOT,'fogd-score-center-v1691f721.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
for(const f of[BASE,MOD])if(!fs.existsSync(f))throw new Error('[F60.94.31.3] missing '+path.basename(f));
let mod=fs.readFileSync(MOD,'utf8');
mod=mod
  .replace("const API='/api/tjk-fog-horse-v1';","const API='/api/tjk-fog-horse-v12';")
  .replace(/\breturn(?=\d)/g,'return ');
for(const t of['FOGD-SCORE-CENTER-V16.9.1F60.94.31','9. F / O / G / D Toplam Puan','F · Form (%30)','O · Orijin (%20)','G · Galop (%20)','D · Derece (%30)','at_ai_fogd_cache_v1','at_ai_fogd_scores_v1','/api/tjk-fog-horse-v12','return 46','return 90'])if(!mod.includes(t))throw new Error('[F60.94.31.3] invariant missing: '+t);
if(/\breturn\d/.test(mod))throw new Error('[F60.94.31.3] compact numeric return token survived');
for(const bad of['new MutationObserver','setInterval(','document.addEventListener(\'touchend\'','document.addEventListener(\'pointerup\''])if(mod.includes(bad))throw new Error('[F60.94.31.3] forbidden reactive/global loop: '+bad);
new Function(mod);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+mod.trim()+'\n';
for(const t of['REAL-DAY-HISTORY-V16.9.1F60.94.30','DEGREE-PREDICTION-AUDIT-V16.9.1F60.94.30','FOGD-SCORE-CENTER-V16.9.1F60.94.31','/api/tjk-fog-horse-v12','return 46','return 90'])if(!app.includes(t))throw new Error('[F60.94.31.3] bundle invariant missing: '+t);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692973');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692973'))throw new Error('[F60.94.31.3] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.3 build complete: all compact numeric return tokens fixed; cache bust 1692973.');
