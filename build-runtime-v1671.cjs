const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1670.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const SHARED_MODEL_CACHE=path.join(ROOT,'five-model-shared-cache-v1685.js');
const PATCH=path.join(ROOT,'coupon-decision-gate-v1671.js');

for(const f of [BASE,SHARED_MODEL_CACHE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.1/V16.8.7] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error('[V16.7.1/V16.8.7] Build sonrası production bundle/index oluşmadı.');

let app=fs.readFileSync(APP,'utf8');
/* V16.8.7 cache MUTLAKA kupon karar kapısından önce yüklenir.
   Böylece kuponun private modelMem wrapper'ı ortak/persisted cache sonucunu kendi belleğine de alır. */
const sharedCache=fs.readFileSync(SHARED_MODEL_CACHE,'utf8');
if(!app.includes('FIVE-MODEL-SHARED-CACHE-V16.8.7')) app += `\n${sharedCache}\n`;
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('COUPON-DECISION-GATE-V16.7.1')) app += `\n${patch}\n`;
for(const token of ['FIVE-MODEL-SHARED-CACHE-V16.8.7','oturumdaki kompakt 5 Model sonucu kullanılıyor','sessionPersistentAcrossReload:true','Kupon Veri Denetimi','Tüm Eksikleri Otomatik Tamamla','Karar Motoru · Tüm Veriler','BANKO zorunlu değildir']) {
  if(!app.includes(token)) throw new Error(`[V16.7.1/V16.8.7] production bundle doğrulaması başarısız: ${token}`);
}
if(app.indexOf('FIVE-MODEL-SHARED-CACHE-V16.8.7')>app.indexOf('COUPON-DECISION-GATE-V16.7.1')) throw new Error('[V16.8.7] ortak 5 Model cache kupon karar kapısından sonra yüklenmiş; private modelMem reuse çalışmaz.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16710');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V16.7.1 + V16.8.7 build tamamlandı: kupon veri kapısı aktif; 5 Model kompakt session cache karar kapısından önce yüklenir ve private modelMem hydrate edilir.');
