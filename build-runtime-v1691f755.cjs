const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f754.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.35] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

// F60.94.31.18'de menü 7'nin tek açılış otoritesi annual-archive-menu-fix-v1662 idi.
// Sonraki sürümlerde repurposeAnnualMenu içine eklenen capture click listener aynı tıklamayı
// stopImmediatePropagation ile keserek eski, çalışan iki-frame açılış akışını devre dışı bırakıyordu.
const start=app.indexOf('function repurposeAnnualMenu(){');
const end=app.indexOf('function hideLegacyProgramSections(){',start);
if(start<0||end<0)throw new Error('[F60.94.31.35] repurposeAnnualMenu block missing');
const restored=`function repurposeAnnualMenu(){
 const b=$('annualArchiveBtn');if(!b)return false;
 b.textContent='7. Yıllık Yarış Arşivi';
 // Tıklama bağlama: bilerek yok. F60.94.31.18'deki annual-archive-menu-fix-v1662
 // drawer kapatma + iki animation frame bekleme + ATAnnualArchiveV13.open() akışını yönetir.
 return true;
}
`;
app=app.slice(0,start)+restored+app.slice(end);
app=app.replaceAll('F60.94.31.34 · ANNUAL-QUERY-SOURCE','F60.94.31.35 · F18-ANNUAL-OPEN-RESTORE');

for(const token of[
 'ANNUAL-ARCHIVE-MENU-FIX-V16.6.3',
 'openAnnualArchiveV1663',
 'window.ATAnnualArchiveV13',
 "b.textContent='7. Yıllık Yarış Arşivi'",
 'F60.94.31.35 · F18-ANNUAL-OPEN-RESTORE',
 '/api/tjk-race-query-v1'
])if(!app.includes(token))throw new Error('[F60.94.31.35] invariant missing '+token);
if(app.includes('historicalArchiveMenuF753'))throw new Error('[F60.94.31.35] conflicting F753 menu listener survived');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8')
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693005')
 .replaceAll('F60.94.31.34','F60.94.31.35');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1693005'))throw new Error('[F60.94.31.35] cache bust failed');
console.log('[AT AI] F60.94.31.35 build complete: menu 7 opening authority restored to the exact F60.94.31.18 annual-archive-menu-fix flow; newer duplicate capture listener removed; Koşu Sorgulama source retained.');
