const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f3.cjs');
const PATCH=path.join(ROOT,'career-race-selection-sync-v1691f4.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
for(const f of [BASE,PATCH])if(!fs.existsSync(f))throw new Error(`[V16.9.1F4] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1F4] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
app+=`\n${fs.readFileSync(PATCH,'utf8')}\n`;
for(const token of [
  'CAREER-RACE-SELECTION-SYNC-V16.9.1F4',
  'DAILY-FIVE-MODEL-ARCHIVE-PREP-V16.9.1F3',
  'ANNUAL_TOP3_YEAR_BEST_V14_1',
  'COUPON-CAREER-ONLY-V16.9.1F1',
  'V16.9.1F-MANUAL-FIVE-MODEL-NO-BOOT-RESUME'
]){
  if(!app.includes(token))throw new Error(`[V16.9.1F4] Doğrulama başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169105');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169105'))throw new Error('[V16.9.1F4] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.1F4 build tamamlandı: Kariyer koşu seçicisi input/change ile görünür sonucu senkronlar; eski koşu DOMu bırakılmaz.');
