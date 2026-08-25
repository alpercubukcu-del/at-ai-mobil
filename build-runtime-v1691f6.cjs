const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f5.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[V16.9.1F6] Eksik dosya: build-runtime-v1691f5.cjs');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1F6] Önceki build çıktısı bulunamadı.');

const app=fs.readFileSync(APP,'utf8');
const compatible=(app.match(/version:TICKET_V11_VERSION,careerCouponVersion:'CAREER-COUPON-V16\.9\.1F1'/g)||[]).length;
if(compatible!==3)throw new Error(`[V16.9.1F6] Sonuç çizicisiyle uyumlu kupon dönüşümleri beklenen 3, bulunan ${compatible}.`);
if(/return\{version:'CAREER-COUPON-V16\.9\.1F1'/.test(app))throw new Error('[V16.9.1F6] Görünmez eski bilet sürümü kaldı.');
for(const token of [
  'COUPON-CAREER-ONLY-V16.9.1F1',
  'CAREER_PREPARATION_RANKING',
  'ANNUAL-FIVE-MODEL-FINISH-SPLITS-V14.2',
  'CAREER-RACE-SELECTION-SYNC-V16.9.1F4'
]){
  if(!app.includes(token))throw new Error(`[V16.9.1F6] Doğrulama başarısız: ${token}`);
}

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169107');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169107'))throw new Error('[V16.9.1F6] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.1F6 build tamamlandı: Kariyer/Hazırlık kuponu mevcut sonuç çizicisiyle uyumlu ve görünür.');
