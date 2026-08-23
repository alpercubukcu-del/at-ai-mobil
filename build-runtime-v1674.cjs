const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1673.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'coupon-missing-data-recovery-v1674.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.4] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.4] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('COUPON-MISSING-RECOVERY-V16.7.4')) app += `\n${patch}\n`;
if(!app.includes('COUPON-MISSING-RECOVERY-V16.7.4')||!app.includes('robustCategory')||!app.includes('tek hata zinciri durdurmaz')) throw new Error('[V16.7.4] eksik veri recovery production bundle içine girmedi.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16740');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.4 build tamamlandı: Kariyer, 5 Model ve Kazanan Yolu eksikleri ayak ayak tamamlanır; bir yarış hatası diğerlerini durdurmaz.');
