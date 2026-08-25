const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f4.cjs');
const PATCH=path.join(ROOT,'annual-career-finish-splits-v142.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
for(const f of [BASE,PATCH])if(!fs.existsSync(f))throw new Error(`[V16.9.1F5] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1F5] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
app+=`\n${fs.readFileSync(PATCH,'utf8')}\n`;
for(const token of [
  'ANNUAL-FIVE-MODEL-FINISH-SPLITS-V14.2',
  'TOP3_YEARBEST_PLUS_FINISH_1_2_3_SPLITS',
  'CAREER-RACE-SELECTION-SYNC-V16.9.1F4',
  'DAILY-FIVE-MODEL-ARCHIVE-PREP-V16.9.1F3',
  'ANNUAL_TOP3_YEAR_BEST_V14_1',
  'COUPON-CAREER-ONLY-V16.9.1F1',
  'V16.9.1F-MANUAL-FIVE-MODEL-NO-BOOT-RESUME'
]){
  if(!app.includes(token))throw new Error(`[V16.9.1F5] Doğrulama başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169106');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169106'))throw new Error('[V16.9.1F5] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.1F5 build tamamlandı: TJK Yıllık Arşiv 5 Model ana sıralaması korunur; Bileşik/Tam/İkiz/Aile/Kariyer altında 1.-2.-3. referans alt sıralamaları ayrı gösterilir.');
