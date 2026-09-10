const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v161.cjs');
const EXPORT_UI = path.join(ROOT, 'career-export-v121.js');
const MARGIN = path.join(ROOT, 'career-margin-v124.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');

for (const file of [BASE, EXPORT_UI, MARGIN]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.2.1] Eksik dosya: ${path.basename(file)}`);
}

// Bundle üretilmeden ÖNCE gerçek kaynak katmanlarını düzelt.
// Analiz/formül koduna dokunmaz; yalnız Kariyer Excel tarihsel tarama başlangıç yılını daraltır.
let exportUi = fs.readFileSync(EXPORT_UI, 'utf8');
const visibleOld = "const V='CAREER-EXPORT-V12.2', MIN_YEAR=2000, cache=";
const visibleNew = "const V='CAREER-EXPORT-V12.2.1-2023', MIN_YEAR=2023, cache=";
if (!exportUi.includes(visibleOld)) throw new Error('[V16.2.1] career-export-v121 MIN_YEAR kalıbı bulunamadı.');
exportUi = exportUi.replace(visibleOld, visibleNew);
fs.writeFileSync(EXPORT_UI, exportUi, 'utf8');

let margin = fs.readFileSync(MARGIN, 'utf8');
const bulkOld = "const q=new URLSearchParams({date:meta.date,city:meta.city,class:meta.class,ageGroup:meta.age,track:meta.track,distance:String(meta.distance),minYear:'2000',t:String(Date.now())});";
const bulkNew = "const q=new URLSearchParams({date:meta.date,city:meta.city,class:meta.class,ageGroup:meta.age,track:meta.track,distance:String(meta.distance),minYear:'2023',t:String(Date.now())});";
if (!margin.includes(bulkOld)) throw new Error('[V16.2.1] career-margin-v124 toplu kazanan MIN_YEAR kalıbı bulunamadı.');
margin = margin.replace(bulkOld, bulkNew);
fs.writeFileSync(MARGIN, margin, 'utf8');

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.2.1] Production bundle/index oluşmadı.');
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16210');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.2.1 build tamamlandı: görünür Geçmiş Kazananlar listesi + toplu kazanan Excel 2023+ tarıyor; analiz, 5 Model ve Kariyer/Hazırlık formülleri değişmedi.');
