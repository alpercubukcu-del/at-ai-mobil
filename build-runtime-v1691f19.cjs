const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f18.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) {
  throw new Error('[V16.9.1F19] Eksik dosya: build-runtime-v1691f18.cjs');
}

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F19] Onceki build ciktisi bulunamadi.');
}

let app = fs.readFileSync(APP, 'utf8');
for (const token of [
  'ANNUAL-PARTIAL-SUPPORT-V16.9.1F19',
  'ANNUAL_TOP3_YEAR_BEST_WITH_PARTIAL_V19',
  'ANNUAL_FINISH_',
  'careerPartialSupportV1691F18',
  'PODIUM-PARTIAL-SUPPORT-V16.9.1F18'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F19] Dogrulama basarisiz: ${token}`);
  }
}

new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169122');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169122')) {
  throw new Error('[V16.9.1F19] cache-bust guncellenemedi.');
}

console.log('[AT AI] V16.9.1F19 build tamamlandi: Yillik arsiv 5-model F18 parca destek hesabina baglandi.');
