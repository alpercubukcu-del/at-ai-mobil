const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f15.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F16] Eksik dosya: build-runtime-v1691f15.cjs');
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F16] Onceki build ciktisi bulunamadi.');
const app = fs.readFileSync(APP, 'utf8');
for (const token of [
  'CAREER-RESULT-PERFORMANCE-V16.9.1F15',
  'CAREER-PATH-MATCH-EXPLAIN-V16.9.1F11',
  'Katı sınıf/yaş kuralını geçen gerçek koşu çifti bulunamadı',
  'strictCareerCompatibleV1691F12'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.1F16] Dogrulama basarisiz: ${token}`);
}
new Function(app);
let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169118');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169118')) throw new Error('[V16.9.1F16] cache-bust guncellenemedi.');
console.log('[AT AI] V16.9.1F16 build tamamlandi: Sifir puanli ve kati sinif/yas kuralini gecmeyen kosu ciftleri aciklamada eslesme olarak gosterilmez.');
