const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f758.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.41] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

// F18 Menü 7 kendi annual-archive-menu-fix akışıyla açılır.
// Eski mobil layer-lock guard'ı final bundle'da hâlâ varsa annualArchiveBtn muafiyetini ekle.
const oldCond="if(!b || b.id==='closeMenu')return;";
const newCond="if(!b || b.id==='closeMenu' || b.id==='annualArchiveBtn')return;";
const oldHits=app.split(oldCond).length-1;
if(oldHits>0)app=app.replaceAll(oldCond,newCond);
const newHits=app.split(newCond).length-1;
if(newHits<1)throw new Error('[F60.94.31.41] annualArchiveBtn mobile layer exemption not present in final bundle');

// F40'ın çalışan F18 açılışı ve Koşu Sorgulama veri yolu korunmalı.
for(const token of[
 'window.ATAnnualArchiveV13',
 '/api/tjk-race-query-v1',
 'TJK_KOSU_SORGULAMA',
 'ATMenu7F18QueryBridgeF60943138'
])if(!app.includes(token))throw new Error('[F60.94.31.41] invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8')
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693011')
 .replaceAll('F60.94.31.40','F60.94.31.41');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1693011'))throw new Error('[F60.94.31.41] cache bust failed');
console.log('[AT AI] F60.94.31.41 build complete: Menu 7 generic mobile layer lock muafiyeti final bundle üzerinde doğrulandı; F18 opener ve Koşu Sorgulama source korunuyor.');
