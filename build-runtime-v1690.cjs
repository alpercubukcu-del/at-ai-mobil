const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1689.cjs');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE)) throw new Error('[V16.9.0] build-runtime-v1689.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(INDEX)) throw new Error('[V16.9.0] public/index.html bulunamadı.');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\s*<button data-view="historical">[^<]*<\/button>/,'');
html=html.replace('<button data-view="scenario">3. Koşu Senaryosu</button>','<button data-view="scenario">2. Koşu Senaryosu</button>');
html=html.replace('<button data-view="career">4. Kariyer Yol Haritası</button>','<button data-view="career">3. Kariyer Yol Haritası</button>');
html=html.replace('<button data-view="calibration">5. Model Kalibrasyonu</button>','<button data-view="calibration">4. Model Kalibrasyonu</button>');
html=html.replace('<button id="couponMenuBtn" type="button">6. Kupon Oluştur</button>','<button id="couponMenuBtn" type="button">5. Kupon Oluştur</button>');
html=html.replace(/yalnız “6\. Kupon Oluştur” bölümünde çalışır\./g,'yalnız “5. Kupon Oluştur” bölümünde çalışır.');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16900');

if(html.includes('data-view="historical"')) throw new Error('[V16.9.0] Eski 2. menü HTML’den kaldırılamadı.');
for(const token of ['1. Güncel Analiz','2. Koşu Senaryosu','3. Kariyer Yol Haritası','4. Model Kalibrasyonu','5. Kupon Oluştur']){
  if(!html.includes(token)) throw new Error(`[V16.9.0] Menü doğrulaması başarısız: ${token}`);
}
if(!html.includes('/at-ai-app-v142.js?v=16900')) throw new Error('[V16.9.0] cache-bust güncellenemedi.');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V16.9.0 build tamamlandı: eski Menü 2 HTML’den fiziksel olarak kaldırıldı; görünür sıra 1–7 ile uyumlu.');
