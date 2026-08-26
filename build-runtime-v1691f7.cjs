const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f6.cjs');
const PATCH=path.join(ROOT,'calibration-learning-mobile-v1691f6.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
for(const f of [BASE,PATCH])if(!fs.existsSync(f))throw new Error(`[V16.9.1F7] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1F7] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
app+=`\n${fs.readFileSync(PATCH,'utf8')}\n`;
for(const token of [
  'CALIBRATION-LEARNING-MOBILE-V16.9.1F6',
  'CALIBRATION_ONLY_TICKET_BREADTH',
  'CAREER_ORDER_UNCHANGED',
  'CAREER-COUPON-V16.9.1F6-CALIBRATED-WIDTH',
  'ANNUAL-FIVE-MODEL-FINISH-SPLITS-V14.2',
  'CAREER-RACE-SELECTION-SYNC-V16.9.1F4',
  'V16.9.1F-MANUAL-FIVE-MODEL-NO-BOOT-RESUME'
]){
  if(!app.includes(token))throw new Error(`[V16.9.1F7] Doğrulama başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169108');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169108'))throw new Error('[V16.9.1F7] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.1F7 build tamamlandı: F6 kupon uyumluluğu korunur; Kazanan Kalibrasyonu güven profili kuponun tek/dar/geniş kararına bağlanır; Kariyer/Hazırlık sırası değişmez; Kalibrasyon mobil tam ekrandır.');
