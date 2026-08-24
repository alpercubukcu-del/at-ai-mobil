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

for(const token of [
  'COUPON-GATE-ROUTING-V16.7.8',
  'ATCouponDecisionV1671',
  'V16.7.9 HOTFIX',
  'V16.8.0 MOBILE NATIVE FIX',
  'document.body.appendChild(el)'
]) {
  if(!app.includes(token)) throw new Error(`[V16.8.0] production bundle doğrulaması başarısız: ${token}`);
}
if(app.includes("attributeFilter:['class','style','aria-hidden']")) {
  throw new Error('[V16.8.0] Kupon overlay observer hala style mutasyonunu izliyor; freeze riski devam ediyor.');
}
if(app.includes("set('width','100dvw')")) {
  throw new Error('[V16.8.0] Mobil kupon overlay hala 100dvw ile zorlanıyor.');
}
if(app.includes("document.body.style.setProperty('position','fixed','important')")) {
  throw new Error('[V16.8.0] Mobil kupon overlay hala body position:fixed kilidi kullanıyor.');
}
if(app.includes('document.documentElement.appendChild(el)')) {
  throw new Error('[V16.8.0] Kupon overlay hala HTML köküne taşınıyor.');
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16800');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.8.0 build tamamlandı: Android mobil kupon ekranı BODY içinde fixed+inset:0 native viewport kullanıyor; cache v=16800.');
