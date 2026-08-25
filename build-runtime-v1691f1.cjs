const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'coupon-career-only-v1691f1.js');
for(const f of [BASE,PATCH])if(!fs.existsSync(f))throw new Error(`[V16.9.1F1] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1F1] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
app+=`\n${patch}\n`;

for(const token of [
  'ARCHIVE-FIRST-V16.9.1',
  'V16.9.1F-MANUAL-FIVE-MODEL-NO-BOOT-RESUME',
  'COUPON-CAREER-ONLY-V16.9.1F1',
  'CAREER_PREPARATION_RANKING',
  'tek yalnız açık üstünlükte'
]){
  if(!app.includes(token))throw new Error(`[V16.9.1F1] Doğrulama başarısız: ${token}`);
}
if(app.includes('COUPON-CAREER-RANKING-ONLY-V16.9.15'))throw new Error('[V16.9.1F1] Eski V16.9.15 kupon katmanı yanlışlıkla bundle içinde.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169102');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169102'))throw new Error('[V16.9.1F1] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.1F1 build tamamlandı: V16.9.1F sıralama/tarihsel tarama korunur; kupon yalnız Kariyer/Hazırlık sıralamasından ve adaptif 1/2/3/4/5+ at kuralıyla üretilir.');
