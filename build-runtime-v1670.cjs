const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1669.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'annual-archive-export-v1670.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.0] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.0] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('ANNUAL-ARCHIVE-EXPORT-V16.7.0')) app += `\n${patch}\n`;
if(!app.includes('Tüm Arşivi JSON Dışa Aktar')||!app.includes('AT_AI_ANNUAL_ARCHIVE_EXPORT_V1')) throw new Error('[V16.7.0] yıllık arşiv dışa aktarım katmanı production bundle içine girmedi.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16700');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.0 build tamamlandı: Yıllık Arşiv ekranında telefondaki mevcut yılları kompakt JSON dışa aktarma aktif.');
