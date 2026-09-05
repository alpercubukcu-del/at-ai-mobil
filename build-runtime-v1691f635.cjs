const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f631.cjs');
const EXTRA=path.join(ROOT,'daily-calibration-staged-v1691f635.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.35] Missing F60.31 base build.');
if(!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.35] Missing staged Daily Calibration module.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';

for(const token of[
  'DAILY-CALIBRATION-STAGED-V16.9.1F60.35',
  'Başlangıç Yılı',
  'Bitiş Yılı',
  'Bul ve Koşu Numaralarını Çözümle',
  'Hesapla ve Kaydet',
  'ANNUAL_ROW_ORDER_F635',
  'Yarış arşivi henüz okunmadı.',
  'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31',
  "if(!button || button.id==='analysisDialog') return;"
]){
  if(!app.includes(token)) throw new Error('[V16.9.1F60.35] Verification failed: '+token);
}
if(app.includes('DAILY-CALIBRATION-CAREER-FLOW-V16.9.1F60.33')) throw new Error('[V16.9.1F60.35] Old F60.33 visible flow unexpectedly bundled.');

new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169235');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169235')) throw new Error('[V16.9.1F60.35] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.35 build complete: year metadata only on selector open; selected-year archive load + local raceNo resolution on Find; Calculate/Save last.');
