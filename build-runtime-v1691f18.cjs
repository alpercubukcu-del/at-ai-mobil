const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f17.cjs');
const PATCH = path.join(ROOT, 'podium-partial-support-v1691f18.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.1F18] Eksik dosya: ${path.basename(file)}`);
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F18] Onceki build ciktisi bulunamadi.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'PODIUM-PARTIAL-SUPPORT-V16.9.1F18',
  'careerPartialSupportV1691F18',
  'scoreRowsV11',
  'scoreFinishRowsPodiumV115',
  'CAPPED_PARTIAL_SUPPORT',
  'CAREER-PARTIAL-SUPPORT-V16.9.1F17',
  'CAREER-RESULT-PERFORMANCE-V16.9.1F15',
  'strictCareerCompatibleV1691F12'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.1F18] Dogrulama basarisiz: ${token}`);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169121');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169121')) {
  throw new Error('[V16.9.1F18] cache-bust guncellenemedi.');
}

console.log('[AT AI] V16.9.1F18 build tamamlandi: Detaydaki parca destek 5-model ve podium ham siralama hesabina baglandi.');
