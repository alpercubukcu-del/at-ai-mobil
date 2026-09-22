const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f758.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.42] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

// The active bundle uses V16.6.0's deferred drawer transition. The freeze was
// the F741C MutationObserver rewriting Menu 7, not the retired V16.5.9 lock.
if(app.includes('actualGuard741c'))throw new Error('[F60.94.31.42] retired Menu 7 observer survived');
for(const token of['MOBILE-MENU-TRANSITION-V16.6.0','ANNUAL-ARCHIVE-MENU-FIX-V16.6.3','TJK_KOSU_SORGULAMA','rrFastRunF60943121']){
 if(!app.includes(token))throw new Error('[F60.94.31.42] required capability missing '+token);
}
app=app.replaceAll('F60.94.31.37 · MENU7-SINGLE-GATE','F60.94.31.42 · STARTUP-STABLE');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8')
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693012')
 .replaceAll('F60.94.31.40','F60.94.31.42');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] F60.94.31.42 build complete; recursive Menu 7 mutation removed; F18 UI and Koşu Sorgulama preserved; cache=1693012');
