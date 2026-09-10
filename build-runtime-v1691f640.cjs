const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f639.cjs');
const EXTRA=path.join(ROOT,'annual-five-model-analysis-archive-v1691f640.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.40] Missing F60.39 base build.');
if(!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.40] Missing annual analysis archive module.');

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});

let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';

for(const token of[
  'ANNUAL-FIVE-MODEL-ANALYSIS-ARCHIVE-V16.9.1F60.40',
  'Yıllık 5 Model Analiz Arşivi',
  'Eksikleri Yeniden Dene',
  'annualFiveModelAnalysisSourceF640',
  'at_ai_annual_five_model_analysis_v640',
  'at_ai_daily_career_archive_v146',
  'ANNUAL-REFERENCE-TIMEOUT-GUARD-V16.9.1F60.39',
  'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31'
]){
  if(!app.includes(token)) throw new Error('[V16.9.1F60.40] Verification failed: '+token);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169240');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169240')) throw new Error('[V16.9.1F60.40] Cache bust failed.');

console.log('[AT AI] V16.9.1F60.40 build complete: annual 5-model archive + retry-missing + delete + coupon mirror.');
