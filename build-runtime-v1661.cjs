const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1660.cjs');
const PATCH=path.join(ROOT,'model-roadmap-transport-fix-v1661.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

for(const file of [BASE,PATCH]) if(!fs.existsSync(file)) throw new Error(`[V16.6.1] Eksik dosya: ${path.basename(file)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX)) throw new Error('[V16.6.1] Production bundle/index oluşmadı.');

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('MODEL-ROADMAP-TRANSPORT-V16.6.1')) app += `\n\n${patch}\n`;
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16610');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.6.1 build tamamlandı: 5 Model mobil istek süresi uzatıldı, 3x erken retry yerine tek istek + Exact geri dönüş eklendi.');
