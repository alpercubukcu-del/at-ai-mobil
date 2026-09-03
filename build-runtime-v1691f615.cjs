const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f614.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const UI=path.join(ROOT,'daily-calibration-career-ui-v1691f615.js');
if(!fs.existsSync(BASE))throw new Error('[V16.9.1F60.15] Missing F60.14 base build.');
if(!fs.existsSync(UI))throw new Error('[V16.9.1F60.15] Missing Daily Calibration Career UI module.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(UI,'utf8').trim()+'\n';
for(const token of[
  'DAILY-CALIBRATION-CAREER-UI-V16.9.1F60.15',
  'Kalibrasyon Eşleşmelerini Seç',
  'uyum %',
  'İl + pist + mesafe aynı',
  'Pist + mesafe aynı · il değişebilir',
  'İl aynı · pist / mesafe değişebilir',
  'Kayıtları Temizle',
  'Kayıtları Sil',
  'ATCalibrationCleanupV1691F599',
  'FIVE-MODEL-CALIBRATED-COUPONS-V16.9.1F60.13',
  'MODEL-ROADMAP-RESILIENCE-V16.9.1F60.13'
])if(!app.includes(token))throw new Error('[V16.9.1F60.15] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169215');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V16.9.1F60.15 build complete: Daily Calibration match selector mirrors Career UI including uyum/rule rows; cleanup controls restored; calibration/coupon/roadmap engines unchanged.');