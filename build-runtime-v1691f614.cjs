const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f613.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const CLEAN=path.join(ROOT,'daily-calibration-clean-page-v1691f614.js');
if(!fs.existsSync(BASE))throw new Error('[V16.9.1F60.14] Missing F60.13 base build.');
if(!fs.existsSync(CLEAN))throw new Error('[V16.9.1F60.14] Missing clean Daily Calibration module.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(CLEAN,'utf8').trim()+'\n';
for(const token of[
  'DAILY-CALIBRATION-CLEAN-PAGE-V16.9.1F60.14',
  'dailyCalibrationCleanPageF614',
  'Günlük Kalibrasyon Eşleşmeleri',
  'Kazananın 5 Model Sıraları',
  "panel=$('careerMatchSelectorV610')",
  "wrap.style.display='none'",
  'FIVE-MODEL-CALIBRATED-COUPONS-V16.9.1F60.13',
  'MODEL-ROADMAP-RESILIENCE-V16.9.1F60.13'
])if(!app.includes(token))throw new Error('[V16.9.1F60.14] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169214');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V16.9.1F60.14 build complete: Daily Calibration is one clean Career-style manual page; legacy calibration UI hidden but engine preserved; Career selector leak removed.');