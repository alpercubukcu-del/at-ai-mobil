const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1657.cjs');
const PATCH=path.join(ROOT,'mobile-menu-transition-fix-v1660.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

for(const file of [BASE,PATCH]) if(!fs.existsSync(file)) throw new Error(`[V16.6.0] Eksik dosya: ${path.basename(file)}`);

/* V16.5.8 ve V16.5.9 bilinçli olarak zincire dahil edilmez. */
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX)) throw new Error('[V16.6.0] Production bundle/index oluşmadı.');

let app=fs.readFileSync(APP,'utf8');
app += `\n\n${fs.readFileSync(PATCH,'utf8')}\n`;
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16600');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.6.0 build tamamlandı: V16.5.8/5.9 hard-lock kaldırıldı; Android mobil menü tıklaması önce çalışır, drawer sonra kapanır.');
