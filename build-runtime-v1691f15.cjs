const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f14.cjs');
const PATCH = path.join(ROOT, 'career-result-performance-v1691f15.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
for (const f of [BASE, PATCH]) {
  if (!fs.existsSync(f)) throw new Error(`[V16.9.1F15] Eksik dosya: ${path.basename(f)}`);
}
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F15] Onceki build ciktisi bulunamadi.');
let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;
for (const token of [
  'CAREER-RESULT-PERFORMANCE-V16.9.1F15',
  'finishPerformanceFactorV1691F15',
  'careerResultAdjustmentV1691F15',
  'EXACT_CLASS + EXACT_AGE_GROUP + CARRIED_WEIGHT + FINISH_RESULT + HP_DELTA',
  'CAREER-PATH-EXPLAIN-STATE-FIX-V16.9.1F14',
  'CAREER-STRICT-CLASS-GROUP-WEIGHT-V16.9.1F12'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.1F15] Dogrulama basarisiz: ${token}`);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');
let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169117');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169117')) throw new Error('[V16.9.1F15] cache-bust guncellenemedi.');
console.log('[AT AI] V16.9.1F15 build tamamlandi: Kariyer eslesmelerinde bitiris derecesi ve HP farki performans katsayisi olarak puana eklendi.');
