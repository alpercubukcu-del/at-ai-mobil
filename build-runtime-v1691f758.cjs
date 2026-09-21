const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f757.cjs');
const PATCH=path.join(ROOT,'menu7-f18-query-bridge-v1691f758.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
for(const f of[BASE,PATCH])if(!fs.existsSync(f))throw new Error('[F60.94.31.38] missing '+path.basename(f));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
for(const token of[
 'F60.94.31.38 · MENU7-F18-QUERY',
 'Günlük Veri Arşivi ve TJK Yıllık Arşivi',
 'TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.1-TOP3-YEARBEST',
 'TJK_KOSU_SORGULAMA',
 'ATAnnualQuerySourceF60943134',
 'at_ai_tjk_annual_archive_v13'
])if(!patch.includes(token))throw new Error('[F60.94.31.38] patch invariant missing '+token);
new Function(patch);
app+='\n\n'+patch.trim()+'\n';
for(const token of[
 'window.ATAnnualArchiveV13',
 '/api/tjk-race-query-v1',
 'TJK_KOSU_SORGULAMA',
 'TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.1-TOP3-YEARBEST',
 'ATMenu7F18QueryBridgeF60943138'
])if(!app.includes(token))throw new Error('[F60.94.31.38] bundle invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8')
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693008')
 .replaceAll('F60.94.31.37','F60.94.31.38');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1693008'))throw new Error('[F60.94.31.38] cache bust failed');
console.log('[AT AI] F60.94.31.38 build complete: Menu 7 F60.94.31.18 görünümü korunur; seçili yıllar yalnız TJK Koşu Sorgulama kaynağından aynı annual archive DB’ye yazılır.');
