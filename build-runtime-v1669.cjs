const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1668.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'winner-path-blind-dedicated-v1669.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.6.9] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.6.9] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('WINNER-PATH-DEDICATED-V16.6.9')) app += `\n${patch}\n`;
if(!app.includes('winnerPathBlindMenuV1669')||!app.includes('Kör test başladı')||!app.includes('/api/tjk-conditional-v4-blind')) throw new Error('[V16.6.9] bağımsız kör test katmanı production bundle içine girmedi.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16690');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.6.9 build tamamlandı: Menü 2 eski Tarihsel Benzerlik handlerından ayrıldı; bağımsız kör test ekranı ve görünür istek ilerlemesi aktif.');
