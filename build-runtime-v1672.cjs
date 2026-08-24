const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1671.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'coupon-decision-mobile-fullscreen-v1672.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.2] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.2] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('COUPON-DECISION-FULLSCREEN-V16.7.2')) app += `\n${patch}\n`;
if(!app.includes('COUPON-DECISION-FULLSCREEN-V16.7.2')||!app.includes('V16.8.0 MOBILE NATIVE FIX')||!app.includes('document.body.appendChild(el)')) {
  throw new Error('[V16.8.0] mobil tam ekran düzeltmesi production bundle içine girmedi.');
}
if(app.includes('document.documentElement.appendChild(el)')) {
  throw new Error('[V16.8.0] kupon overlay hala HTML köküne taşınıyor.');
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16720');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.2/V16.8.0 build tamamlandı: Kupon Veri Denetimi Android mobilde BODY içinde fixed+inset:0 açılır.');
