const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f731.cjs');
const FRAG=path.join(ROOT,'real-race-exact-range-inline-v1691f732.js');
const MOD=path.join(ROOT,'archive-exact-date-range-v1691f732.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
for(const f of[BASE,FRAG,MOD])if(!fs.existsSync(f))throw new Error('[F60.94.31.12] missing '+path.basename(f));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const anchor="window.ATRealRaceArchiveF6093={version:VERSION,syncYear,syncYears,syncRecent,refresh:refreshUi,cityId};";
if(!app.includes(anchor))throw new Error('[F60.94.31.12] real-race export anchor missing');
const frag=fs.readFileSync(FRAG,'utf8').trim();
new Function(frag);
const exported="window.ATRealRaceArchiveF6093={version:VERSION,syncYear,syncYears,syncRange:syncRangeExactF60943112,syncRecent,refresh:refreshUi,cityId};";
app=app.replace(anchor,frag+'\n'+exported);
const mod=fs.readFileSync(MOD,'utf8').trim();
new Function(mod);
if(app.includes('__AT_ARCHIVE_EXACT_DATE_F60943112__'))throw new Error('[F60.94.31.12] exact-date patch already present');
app+='\n\n'+mod+'\n';
for(const token of[
 'FOGD-HISTORY-CALIBRATION-V16.9.1F60.94.31.11',
 'syncRange:syncRangeExactF60943112',
 'ARCHIVE-EXACT-DATE-V16.9.1F60.94.31.12',
 'Seçili Tarih Aralığını İndir / Kaldığı Yerden Devam Et',
 'Seçili Tarih Aralığındaki Eksikleri Güncelle',
 'Seçili Tarih Aralığını Bir Kez İndir',
 'Koşu Sorgulama taraması',
 'yıl başına dönülmeyecek'
])if(!app.includes(token))throw new Error('[F60.94.31.12] bundle invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692982');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692982'))throw new Error('[F60.94.31.12] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.12 build complete: exact inclusive date ranges for real results and track/maintenance/weather.');
