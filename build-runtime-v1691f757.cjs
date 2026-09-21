const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f755.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const ANNUAL=path.join(ROOT,'public','annual-archive.js');

if(!fs.existsSync(BASE))throw new Error('[F60.94.31.37] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
let html=fs.readFileSync(INDEX,'utf8');
let annual=fs.readFileSync(ANNUAL,'utf8');

// F60.94.31.36 yeniden global capture-click kapısı ekleyerek F60.94.31.18'in
// çalışan annual-archive-menu-fix açılış akışıyla çakıştı. Bu sürüm F60.94.31.35'in
// tek-yetkili açılışını temel alır; ikinci bir click listener EKLEMEZ.
app=app.replaceAll('F60.94.31.35 · F18-ANNUAL-OPEN-RESTORE','F60.94.31.37 · MENU7-SINGLE-GATE');
app=app.replaceAll('F60.94.31.35','F60.94.31.37');
html=html
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693007')
 .replaceAll('F60.94.31.35','F60.94.31.37');

// Açılış tek kapı olmalı; F60.94.31.36'nın capture listener/bridge'i burada bulunmamalı.
for(const forbidden of[
 'F60.94.31.36 · F18-UI-REAL-QUERY-SOURCE',
 '__AT_F60943136_F18_REAL_QUERY__',
 'ATAnnualArchiveMenuF60943136',
 'historicalArchiveMenuF753'
])if(app.includes(forbidden))throw new Error('[F60.94.31.37] conflicting menu 7 opener survived: '+forbidden);

// Eski tam Yıllık Yarış Arşivi arayüzü + F18 açılışı korunmalı.
for(const required of[
 'ANNUAL-ARCHIVE-MENU-FIX-V16.6.3',
 'openAnnualArchiveV1663',
 'window.ATAnnualArchiveV13',
 "b.textContent='7. Yıllık Yarış Arşivi'"
])if(!app.includes(required))throw new Error('[F60.94.31.37] annual archive UI/open invariant missing: '+required);

// Veri kaynağı yıllık plan/program değil; F60.94.31.34 Koşu Sorgulama adaptörü kalmalı.
for(const required of[
 'ANNUAL-ARCHIVE-SOURCE-V16.9.1F60.94.31.34',
 'window.ATAnnualArchiveV13.updateYear=updateYearFromRaceQuery',
 'at_ai_tjk_real_day_index_v2',
 'at_ai_tjk_annual_results_v1',
 '/api/tjk-race-query-v1'
])if(!annual.includes(required))throw new Error('[F60.94.31.37] Koşu Sorgulama source invariant missing: '+required);

new Function(app);
new Function(annual);
fs.writeFileSync(APP,app,'utf8');
fs.writeFileSync(INDEX,html,'utf8');

if(!html.includes('/at-ai-app-v142.js?v=1693007'))throw new Error('[F60.94.31.37] cache bust failed');
console.log('[AT AI] F60.94.31.37 build complete: menu 7 uses one F60.94.31.18 opener only; full annual archive UI preserved; Koşu Sorgulama + real results source preserved.');
