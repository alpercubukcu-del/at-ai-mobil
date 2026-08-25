const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1697.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PATCH = path.join(ROOT, 'career-run-background-progress-v1698.js');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.8] Eksik dosya: ${path.basename(file)}`);
}
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.8] Build sonrası eksik dosya: ${path.relative(ROOT,file)}`);
}

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8');
if (!app.includes('CAREER-RUN-BACKGROUND-PROGRESS-V16.9.8')) app += `\n${patch}\n`;
for (const token of [
  'CAREER-RUN-BACKGROUND-PROGRESS-V16.9.8',
  'Arka planda sürdür ve menüye dön',
  'Yaklaşık ilerleme · tek işlem koruması aktif',
  'runAnalysisBeforeV1698',
  'FIVE-MODEL-REPAIR-PROGRESS-V16.9.7',
  'CAREER-MOBILE-SINGLE-FLIGHT-V16.9.6'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.8] Runtime doğrulaması başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16980');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=16980')) {
  throw new Error('[V16.9.8] cache-bust güncellenemedi.');
}

console.log('[AT AI] V16.9.8 build tamamlandı: Ana Kariyer yüzde/aşama/süre; hesap sürerken arka planda menüye dönüş.');
