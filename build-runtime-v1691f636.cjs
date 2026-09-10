const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f635.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.36] Missing F60.35 base build.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

const app=fs.readFileSync(APP,'utf8');
for(const token of[
  'TJK-ANNUAL-ARCHIVE-V14.1-BATCH-WRITE',
  'async function deleteYearRows(year)',
  'async function writeRaceBatch(rows)',
  'BATCH_SIZE=250',
  'yarış yerel arşive yazıldı',
  'DAILY-CALIBRATION-STAGED-V16.9.1F60.35',
  'Bul ve Koşu Numaralarını Çözümle',
  'Hesapla ve Kaydet',
  'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31'
]){
  if(!app.includes(token)) throw new Error('[V16.9.1F60.36] Verification failed: '+token);
}
new Function(app);

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169236');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169236')) throw new Error('[V16.9.1F60.36] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.36 build complete: annual archive writes are split into 250-row IndexedDB transactions with live progress.');
