const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1667.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'winner-path-progress-v1668.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.6.8] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.6.8] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('WINNER-PATH-PROGRESS-V16.6.8')) app += `\n${patch}\n`;
if(!app.includes('Yaklaşık ilerleme')||!app.includes('100% · Kör test tamamlandı')) throw new Error('[V16.6.8] ilerleme katmanı production bundle içine girmedi.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16680');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.6.8 build tamamlandı: Kör Testi Çalıştır tek başlangıç düğmesi; yaklaşık yüzde, aktif aşama ve geçen süre görünür.');
