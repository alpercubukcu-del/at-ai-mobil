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
for(const token of ['COUPON-GATE-ROUTING-V16.7.8','ATCouponDecisionV1671','Kupon Oluştur yalnız Kupon Veri Denetimini açar','V16.7.9 HOTFIX']) {
  if(!app.includes(token)) throw new Error(`[V16.7.9] production bundle doğrulaması başarısız: ${token}`);
}
if(app.includes("attributeFilter:['class','style','aria-hidden']")) {
  throw new Error('[V16.7.9] Kupon overlay observer hala style mutasyonunu izliyor; freeze riski devam ediyor.');
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16790');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.9 hotfix build tamamlandı: kupon overlay MutationObserver/style sonsuz döngüsü kaldırıldı; cache v=16790.');
