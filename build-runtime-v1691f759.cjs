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

// F18 Menü 7 tek açılış otoritesi: annual-archive-menu-fix-v1662.
// Genel V16.5.9 drawer layer lock annualArchiveBtn'i pointerdown/click aşamasında sahiplenmemeli.
const exempt="if(!b || b.id==='closeMenu' || b.id==='annualArchiveBtn')return;";
const hits=app.split(exempt).length-1;
if(hits<2)throw new Error('[F60.94.31.41] annualArchiveBtn mobile-layer-lock exemption missing: '+hits);
for(const token of[
 'ANNUAL-ARCHIVE-MENU-FIX-V16.6.3',
 'openAnnualArchiveV1663',
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
console.log('[AT AI] F60.94.31.41 build complete: Menu 7 bypasses generic early mobile layer lock and is opened only by the F18 annual archive opener.');
