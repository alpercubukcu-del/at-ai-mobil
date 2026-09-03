const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f615.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const FIX=path.join(ROOT,'daily-calibration-direct-selector-v1691f616.js');
if(!fs.existsSync(BASE))throw new Error('[V16.9.1F60.16] Missing F60.15 base build.');
if(!fs.existsSync(FIX))throw new Error('[V16.9.1F60.16] Missing direct Daily Calibration selector module.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(FIX,'utf8').trim()+'\n';
for(const token of[
  'DAILY-CALIBRATION-DIRECT-SELECTOR-V16.9.1F60.16',
  'dailyCalibrationDirectSelectorF616',
  '#dcpOpenF614,#dcalOpenMatchesF613',
  'stopImmediatePropagation',
  'Kalibrasyon Eşleşmelerini Seç',
  'uyum %',
  'İl + pist + mesafe aynı',
  'Pist + mesafe aynı · il değişebilir',
  'İl aynı · pist / mesafe değişebilir',
  'Seçimi Uygula ve Hesapla',
  'xcalRunSelected',
  'DAILY-CALIBRATION-CAREER-UI-V16.9.1F60.15',
  'FIVE-MODEL-CALIBRATED-COUPONS-V16.9.1F60.13',
  'MODEL-ROADMAP-RESILIENCE-V16.9.1F60.13'
])if(!app.includes(token))throw new Error('[V16.9.1F60.16] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692161');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V16.9.1F60.16 build complete: Daily Calibration click is intercepted before legacy handlers and opens an independent Career-style full-screen race selector; calibration/coupon engines preserved.');
