const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f636.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.37] Missing F60.36 base build.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

const app=fs.readFileSync(APP,'utf8');
for(const token of[
  'function selectableYears()',
  '2000–',
  'Yıl aralığını seçebilirsiniz. Yüklü olmayan yıllar aramada veri üretmez.',
  'arşivde olmayan yıllar',
  'Bul ve Koşu Numaralarını Çözümle',
  'Hesapla ve Kaydet',
  'TJK-ANNUAL-ARCHIVE-V14.1-BATCH-WRITE',
  'DAILY-CALIBRATION-STAGED-V16.9.1F60.35'
]){
  if(!app.includes(token)) throw new Error('[V16.9.1F60.37] Verification failed: '+token);
}
new Function(app);

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169237');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169237')) throw new Error('[V16.9.1F60.37] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.37 build complete: calibration year dropdowns are free 2000-current; missing local years are reported but no longer constrain selection.');
