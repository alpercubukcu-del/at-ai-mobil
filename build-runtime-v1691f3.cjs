const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f2.cjs');
const PATCH=path.join(ROOT,'daily-five-model-archive-prep-v1691f3.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
for(const f of [BASE,PATCH])if(!fs.existsSync(f))throw new Error(`[V16.9.1F3] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1F3] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
app+=`\n${patch}\n`;

for(const token of [
  'CAREER-EXPORT-FULL-V16.1R-2000',
  'DAILY-FIVE-MODEL-ARCHIVE-PREP-V16.9.1F3',
  'YEAR_BY_YEAR_2000_PLUS',
  'TOP3_PRE_RACE_FULL_CAREER',
  'MODEL_ARCHIVE_FIRST',
  'COUPON-CAREER-ONLY-V16.9.1F1',
  'ANNUAL_TOP3_YEAR_BEST_V14_1',
  'V16.9.1F-MANUAL-FIVE-MODEL-NO-BOOT-RESUME'
]){
  if(!app.includes(token))throw new Error(`[V16.9.1F3] Doğrulama başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169104');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169104'))throw new Error('[V16.9.1F3] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.1F3 build tamamlandı: Tam Analiz/5 Model 2000+ yıl yıl kaynak kullanır; Excel ekranından günün 5 Model arşivi önceden hazırlanır; 5 Model archive-first açılır.');