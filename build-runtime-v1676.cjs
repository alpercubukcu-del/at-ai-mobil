const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1674.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'mobile-layout-v1676.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.6] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.6] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('MOBILE-LAYOUT-V16.7.6')) app += `\n${patch}\n`;
if(!app.includes('MOBILE-LAYOUT-V16.7.6')||!app.includes('at-mobile-layout-v1676')) throw new Error('[V16.7.6] mobil layout düzeltmesi production bundle içine girmedi.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16760');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.6 build tamamlandı: Android mobil ana sayfa viewport içine sabitlendi; masaüstü görünümüne gerek kalmaz.');
