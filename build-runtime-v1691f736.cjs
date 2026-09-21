const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f735.cjs');
const PATCH=path.join(ROOT,'calibration-ui-fixes-v1691f736.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.16] missing '+path.basename(BASE));
if(!fs.existsSync(PATCH))throw new Error('[F60.94.31.16] missing '+path.basename(PATCH));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/* Canonical drawer labels. Several older guards run at different times; update every exact
   numbered label in the generated bundle so they agree instead of visibly fighting. */
const scenarioOld=(app.match(/5\. Koşu Senaryosu/g)||[]).length;
const annualOld=(app.match(/7\. Tarihsel Sonuç Arşivi/g)||[]).length;
if(!scenarioOld)throw new Error('[F60.94.31.16] scenario label source not found');
if(!annualOld)throw new Error('[F60.94.31.16] annual label source not found');
app=app.split('5. Koşu Senaryosu').join('5. Günün Koşu Kalibrasyonu');
app=app.split('7. Tarihsel Sonuç Arşivi').join('7. Yıllık Yarış Arşivi');
app=app.split('Kalibrasyon → Senaryo → Kupon').join('Kalibrasyon → Günün Koşu Kalibrasyonu → Kupon');

app+='\n'+fs.readFileSync(PATCH,'utf8')+'\n';
for(const token of[
 'CALIBRATION-UI-FIXES-V16.9.1F60.94.31.16',
 'FOGD-COLUMN-ALIGN-V16.9.1F60.94.31.15',
 'FOGD-HISTORY-CALIBRATION-V16.9.1F60.94.31.11',
 '5. Günün Koşu Kalibrasyonu',
 '7. Yıllık Yarış Arşivi'
])if(!app.includes(token))throw new Error('[F60.94.31.16] bundle invariant missing '+token);
if(app.includes('5. Koşu Senaryosu'))throw new Error('[F60.94.31.16] stale scenario menu label remains');
if(app.includes('7. Tarihsel Sonuç Arşivi'))throw new Error('[F60.94.31.16] stale annual menu label remains');
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692986');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692986'))throw new Error('[F60.94.31.16] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.16 build complete: calibration list expanded; FOGD errors are drill-down; menu labels unified.');
