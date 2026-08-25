const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f1.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[V16.9.1F2] build-runtime-v1691f1.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1F2] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
for(const token of ['TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.1-TOP3-YEARBEST','TOP3_EACH_RACE_THEN_BEST_PER_YEAR','EACH_HISTORICAL_RACE_TOP3_PRE_RACE_CAREER','ANNUAL_TOP3_YEAR_BEST_V14_1','TOP3_ONLY','COUPON-CAREER-ONLY-V16.9.1F1','V16.9.1F-MANUAL-FIVE-MODEL-NO-BOOT-RESUME']){
  if(!app.includes(token))throw new Error(`[V16.9.1F2] Doğrulama başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169103');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169103'))throw new Error('[V16.9.1F2] cache-bust güncellenemedi.');
console.log('[AT AI] V16.9.1F2 build tamamlandı: Yıllık Arşiv her geçmiş yarışın ilk 3 atını ayrı kariyer yollarıyla karşılaştırır; her yıl yalnız en güçlü referans tutulur.');
