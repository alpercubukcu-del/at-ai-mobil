const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f631.cjs');
const EXTRA = path.join(ROOT, 'daily-calibration-career-flow-v1691f632.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.32] Missing F60.31 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.32] Missing clean Daily Calibration module.');

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

let app = fs.readFileSync(APP, 'utf8');
app += '\n\n' + fs.readFileSync(EXTRA, 'utf8').trim() + '\n';

const tokens = [
  'DAILY-CALIBRATION-CAREER-FLOW-V16.9.1F60.32',
  "if(!button || button.id==='analysisDialog') return;",
  'Günün 5 Model Kalibrasyonu',
  'Eşleşmeleri Gör ve Seç',
  'Kalibrasyon Eşleşmelerini Seç',
  'data-pick="ALL"',
  'data-pick="EXACT"',
  'data-pick="CONDITION_TWIN"',
  'data-pick="RACE_FAMILY"',
  'Seçimi Temizle',
  'Seçimi Uygula ve Hesapla',
  'Yüklü Yıllık Arşiv taranıyor',
  "const run=$('xcalRunSelected')",
  '5 Model Kalibrasyon Sonucu',
  'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31'
];
for (const token of tokens) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.32] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169232');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169232')) {
  throw new Error('[V16.9.1F60.32] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.32 build complete: old stacked F59.4 UI hidden; Daily Calibration is choose race -> Career-style selector -> Apply -> five-model backtest.');
