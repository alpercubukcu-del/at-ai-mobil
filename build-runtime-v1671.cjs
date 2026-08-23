const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1670.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'coupon-decision-gate-v1671.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.1] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.1] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('COUPON-DECISION-GATE-V16.7.1')) app += `\n${patch}\n`;
for(const token of ['Kupon Veri Denetimi','Tüm Eksikleri Otomatik Tamamla','Karar Motoru · Tüm Veriler','BANKO zorunlu değildir']) {
  if(!app.includes(token)) throw new Error(`[V16.7.1] production bundle doğrulaması başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16710');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V16.7.1 build tamamlandı: Kupon öncesi tüm veri denetimi, eksik-tamamlama butonları, ayaklar arası BANKO/genişlik ve bütçe kararı aktif.');
