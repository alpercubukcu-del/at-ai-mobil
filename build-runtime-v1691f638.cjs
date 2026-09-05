const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f637.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.38] Missing F60.37 base build.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

const app=fs.readFileSync(APP,'utf8');
for(const token of[
  'const upper=current+10;',
  'free 2000 to current+10 year range',
  'Bul ve Koşu Numaralarını Çözümle',
  'Hesapla ve Kaydet',
  'TJK-ANNUAL-ARCHIVE-V14.1-BATCH-WRITE',
  'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31'
]){
  if(!app.includes(token)) throw new Error('[V16.9.1F60.38] Verification failed: '+token);
}
new Function(app);

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169238');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169238')) throw new Error('[V16.9.1F60.38] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.38 build complete: calibration year calendar auto-extends to current year + 10.');
