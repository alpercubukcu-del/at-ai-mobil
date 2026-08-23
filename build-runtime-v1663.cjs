const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1662.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.6.3] build-runtime-v1662.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX)) throw new Error('[V16.6.3] Production bundle/index oluşmadı.');

const app=fs.readFileSync(APP,'utf8');
if(!app.includes('ANNUAL-ARCHIVE-MENU-FIX-V16.6.3')) throw new Error('[V16.6.3] Yıllık arşiv mobil düzeltmesi bundle içinde bulunamadı.');
new Function(app);

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16630');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.6.3 build tamamlandı: Yıllık Arşiv Android mobilde tam ekran açılır; drawer/focus ve yatay kayma önce temizlenir.');
