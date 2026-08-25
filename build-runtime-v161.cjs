const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v159.cjs');
const EXPORT_FULL = path.join(ROOT, 'career-export-full-v160.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, EXPORT_FULL]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.1R] Eksik dosya: ${path.basename(file)}`);
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.1R] Production bundle/index oluşmadı.');

let exportSource = fs.readFileSync(EXPORT_FULL, 'utf8');
const versionNeedle = "const V='CAREER-EXPORT-FULL-V16.0',MIN=2000,";
if (!exportSource.includes(versionNeedle)) throw new Error('[V16.1R] V16.0 export sürüm/minYear kalıbı bulunamadı.');
/* Güncel model-roadmap artık her yılı ayrı ±45 günlük pencereyle tarıyor.
   Bu nedenle eski 2023 daraltması kaldırıldı; 2000+ güvenli şekilde kullanılabilir. */
exportSource = exportSource.replace(versionNeedle, "const V='CAREER-EXPORT-FULL-V16.1R-2000',MIN=2000,");

const auditNeedle = "const audit=[{Alan:'Export_Sürümü',Değer:V},{Alan:'Hedef'";
if (exportSource.includes(auditNeedle)) {
  exportSource = exportSource.replace(
    auditNeedle,
    "const audit=[{Alan:'Export_Sürümü',Değer:V},{Alan:'Referans_Tarama_Başlangıç_Yılı',Değer:MIN},{Alan:'Hedef'"
  );
}

const noteNeedle = 'Tek dosya: Hedef Program · Koşacak Tam Kariyer · Referans Yarışlar · Referans İlk 3 · Geçmiş Kazananlar · Geçmiş Tam Kariyer.';
if (exportSource.includes(noteNeedle)) {
  exportSource = exportSource.replace(
    noteNeedle,
    'Tek dosya: Hedef Program · Koşacak Tam Kariyer · Referans Yarışlar · Referans İlk 3 · Geçmiş Kazananlar · Geçmiş Tam Kariyer. Tarihsel referans taraması 2000 ve sonrasını yıl yıl kapsar.'
  );
}

fs.appendFileSync(
  APP,
  '\n;/* ===== career-export-full-v161r production patch ===== */\n' + exportSource + '\n',
  'utf8'
);
fs.appendFileSync(APP, "\n;window.__AT_CAREER_EXPORT_BUILD_V161R__='CAREER-EXPORT-FULL-V16.1R-2000';\n", 'utf8');
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16101');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.1R build tamamlandı: Tam Kariyer Excel ve referans kaynağı 2000+; güncel model-roadmap yıl yıl ±45 gün tarar; analiz formülleri değişmedi.');