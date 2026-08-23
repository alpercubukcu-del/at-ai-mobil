const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1672.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'winner-calibration-v1673.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.3] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.3] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('WINNER-CALIBRATION-V16.7.3')) app += `\n${patch}\n`;
if(!app.includes('WINNER-CALIBRATION-V16.7.3')||!app.includes('Kazanan Kalibrasyonu')||!app.includes('Kör Kazanan Testini Çalıştır')) throw new Error('[V16.7.3] dinamik kazanan kalibrasyonu production bundle içine girmedi.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16730');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.3 build tamamlandı: Kalibrasyon yüklü herhangi bir geçmiş tarih/şehirde yalnız gerçek kazananı; 5 Model + Kazanan Yolu kör sıralamasıyla ölçer.');
