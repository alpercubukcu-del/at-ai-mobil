const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v16913.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PATCH = path.join(ROOT, 'five-model-date-context-v16914.js');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.14] Eksik dosya: ' + path.basename(file));
}
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.14] Build sonrasi eksik dosya: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
const patchSource = fs.readFileSync(PATCH, 'utf8');
app += '\n' + patchSource + '\n';
for (const token of [
  'FIVE-MODEL-DATE-CONTEXT-V16.9.14',
  'prepareRaceModelsV11 = async function',
  'getCareerRaceModelsV112 = async function',
  'canonicalDate',
  'FIVE-MODEL-ROADMAP-RECOVERY-V16.9.13'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.14] Runtime dogrulamasi basarisiz: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169140');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169140')) throw new Error('[V16.9.14] cache-bust guncellenemedi.');

console.log('[AT AI] V16.9.14 build tamamlandi: 5 Model tarih baglami otomatik normalize ediliyor.');
