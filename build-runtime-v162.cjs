const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v161.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.2] build-runtime-v161.cjs bulunamadı.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.2] Production bundle/index oluşmadı.');

let app = fs.readFileSync(APP, 'utf8');

// Kariyer Excel menüsündeki görünür "Geçmiş kazananları hazırla" listesi.
// Bu katman V16.1 tam paket exporter'ından ayrıdır ve hâlâ 2000'den tarıyordu.
const visibleOld = "const V='CAREER-EXPORT-V12.2', MIN_YEAR=2000, cache=";
const visibleNew = "const V='CAREER-EXPORT-V12.2.1-2023', MIN_YEAR=2023, cache=";
if (!app.includes(visibleOld)) {
  throw new Error('[V16.2] career-export-v121 görünür liste MIN_YEAR kalıbı bulunamadı.');
}
app = app.replace(visibleOld, visibleNew);

// Aynı menüdeki "tüm geçmiş kazananlar" Excel yolu career-margin-v124 içinde
// ayrı bir istek kuruyor; onu da aynı 2023+ kapsamına getir.
const bulkOld = "const q=new URLSearchParams({date:meta.date,city:meta.city,class:meta.class,ageGroup:meta.age,track:meta.track,distance:String(meta.distance),minYear:'2000',t:String(Date.now())});";
const bulkNew = "const q=new URLSearchParams({date:meta.date,city:meta.city,class:meta.class,ageGroup:meta.age,track:meta.track,distance:String(meta.distance),minYear:'2023',t:String(Date.now())});";
if (!app.includes(bulkOld)) {
  throw new Error('[V16.2] career-margin-v124 toplu kazanan MIN_YEAR kalıbı bulunamadı.');
}
app = app.replace(bulkOld, bulkNew);

fs.writeFileSync(APP, app, 'utf8');
new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16200');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.2 build tamamlandı: Kariyer Excel görünür geçmiş-kazanan listesi ve toplu kazanan Excel yolu 2023+ tarıyor; analiz/5 Model/Kariyer-Hazırlık formülleri değişmedi.');
