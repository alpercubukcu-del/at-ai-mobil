const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f16.cjs');
const PATCH = path.join(ROOT, 'career-partial-support-v1691f17.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
for (const f of [BASE, PATCH]) {
  if (!fs.existsSync(f)) throw new Error(`[V16.9.1F17] Eksik dosya: ${path.basename(f)}`);
}
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F17] Onceki build ciktisi bulunamadi.');
let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;
for (const token of [
  'CAREER-PARTIAL-SUPPORT-V16.9.1F17',
  'careerPairSupportFloorV1691F17',
  'partialSupportScore',
  'YEAR_BY_YEAR_ADAPTIVE_WIN_PATH_WITH_PARTIAL_SUPPORT_V17',
  'CAREER-RESULT-PERFORMANCE-V16.9.1F15',
  'Katı sınıf/yaş kuralını geçen gerçek koşu çifti bulunamadı'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.1F17] Dogrulama basarisiz: ${token}`);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');
let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169119');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169119')) throw new Error('[V16.9.1F17] cache-bust guncellenemedi.');
console.log('[AT AI] V16.9.1F17 build tamamlandi: Tam kariyer yolu zayif olsa bile guclu katı parca eslesmeleri dusuk guvenli sinirli destek puani uretir.');
