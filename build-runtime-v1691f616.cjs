const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f615.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const CLONE=path.join(ROOT,'daily-calibration-career-clone-v1691f616.js');
if(!fs.existsSync(BASE))throw new Error('[V16.9.1F60.16] Missing F60.15 base build.');
if(!fs.existsSync(CLONE))throw new Error('[V16.9.1F60.16] Missing Career-path Daily Calibration clone.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(CLONE,'utf8').trim()+'\n';
for(const token of[
  'DAILY-CALIBRATION-CAREER-CLONE-V16.9.1F60.16',
  "sel=clean($('analysisRace')?.value||s.selectedRace)",
  'indexedDB.open(DB)',
  'objectStore(STORE).getAll()',
  "if(city&&dist&&track)return'EXACT'",
  "if(dist&&track)return'CONDITION_TWIN'",
  "if(city)return'RACE_FAMILY'",
  'Kalibrasyon Eşleşmelerini Seç',
  'Tümü',
  'Seçimi Temizle',
  'Seçimi Uygula ve Hesapla',
  "const run=$('xcalRunSelected')",
  'FIVE-MODEL-CALIBRATED-COUPONS-V16.9.1F60.13',
  'MODEL-ROADMAP-RESILIENCE-V16.9.1F60.13'
])if(!app.includes(token))throw new Error('[V16.9.1F60.16] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692162');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V16.9.1F60.16 build complete: Daily Calibration uses the same Career selector context/readAll/match/dialog/resolve path; only Apply launches calibration.');
