const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f757.cjs');
const PATCH=path.join(ROOT,'menu7-f18-query-bridge-v1691f758.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
for(const f of[BASE,PATCH])if(!fs.existsSync(f))throw new Error('[F60.94.31.40] missing '+path.basename(f));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
let patch=fs.readFileSync(PATCH,'utf8');

// F18 production ekranında görülen başlık aynen korunur. F38'in yeniden adlandırmasını uygulama.
patch=patch
 .replaceAll('F60.94.31.38 · MENU7-F18-QUERY','F60.94.31.40 · MENU7-F18-EXACT-QUERY')
 .replace("if(h2)h2.textContent = 'Günlük Veri Arşivi ve TJK Yıllık Arşivi';","if(h2)h2.textContent = 'Yıllık Yarış Arşivi';");

for(const token of[
 'F60.94.31.40 · MENU7-F18-EXACT-QUERY',
 "if(h2)h2.textContent = 'Yıllık Yarış Arşivi';",
 'TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.1-TOP3-YEARBEST',
 'TJK_KOSU_SORGULAMA',
 'ATAnnualQuerySourceF60943134',
 'at_ai_tjk_annual_archive_v13'
])if(!patch.includes(token))throw new Error('[F60.94.31.40] patch invariant missing '+token);
new Function(patch);
app+='\n\n'+patch.trim()+'\n';
for(const token of[
 'window.ATAnnualArchiveV13',
 'ANNUAL-ARCHIVE-MENU-FIX-V16.6.3',
 "setLabel(annual,'7. Yıllık Yarış Arşivi')",
 '<h3>1 · Yıllık Arşiv Yönetimi</h3>',
 '<h3>2 · Günlük Analiz Veri Paketi</h3>',
 'Tarihsel Yarış Seçimi',
 'Yıllık 5 Model Analiz Arşivi',
 'Pist / Bakım / Hava Arşivi',
 '/api/tjk-race-query-v1',
 'TJK_KOSU_SORGULAMA',
 'TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.1-TOP3-YEARBEST',
 'ATMenu7F18QueryBridgeF60943138'
])if(!app.includes(token))throw new Error('[F60.94.31.40] bundle invariant missing '+token);
if(app.includes("b.textContent='7. Tarihsel Sonuç Arşivi · Koşu Sorgulama'"))throw new Error('[F60.94.31.40] Menu 7 result-archive redirect survived');
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8')
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693010')
 .replaceAll('F60.94.31.37','F60.94.31.40');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1693010'))throw new Error('[F60.94.31.40] cache bust failed');
console.log('[AT AI] F60.94.31.40 build complete: exact F60.94.31.18 Menu 7 UI preserved; selected years use only TJK Koşu Sorgulama.');