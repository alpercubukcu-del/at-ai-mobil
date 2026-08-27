const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f24.cjs');
const PATCH = path.join(ROOT, 'career-handicap-weight-leverage-v1691f25.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F25] Eksik dosya: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F25] Onceki build ciktisi bulunamadi.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F25',
  'HANDICAP_SAME_HP_LOWER_WEIGHT_LEVERAGE_V25',
  'handicapWeightLeverageScore',
  'HANDICAP_WEIGHT_LEVERAGE',
  'CAREER-EVIDENCE-CALIBRATION-V16.9.1F24',
  'CAREER-PROVEN-CONDITION-WIN-V16.9.1F23',
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F25] Dogrulama basarisiz: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169128');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169128')) {
  throw new Error('[V16.9.1F25] cache-bust guncellenemedi.');
}

console.log('[AT AI] V16.9.1F25 build tamamlandi: handikap kilo/HP avantajı kariyer skoruna eklenir.');
