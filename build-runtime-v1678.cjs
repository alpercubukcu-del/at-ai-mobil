const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1677.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'coupon-gate-routing-v1678.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.8] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.8] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('COUPON-GATE-ROUTING-V16.7.8')) app += `\n${patch}\n`;
for(const token of ['COUPON-GATE-ROUTING-V16.7.8','ATCouponDecisionV1671','Kupon Oluştur yalnız Kupon Veri Denetimini açar']) {
  if(!app.includes(token)) throw new Error(`[V16.7.8] production bundle doğrulaması başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16780');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.8 build tamamlandı: Kupon Oluştur legacy buildTickets yolundan ayrıldı; veri denetimi Android mobilde kesin olarak tam ekran açılır.');
