const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f36.cjs');
const PATCH = path.join(ROOT, 'istanbul-outcome-calibration-v1691f37.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F37] Missing file: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F37] Previous build output was not found.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'ISTANBUL-OUTCOME-CALIBRATION-V16.9.1F37',
  'ATIstanbulOutcomeCalibrationV1691F37',
  'CAREER-LEGACY-WARNING-BRIDGE-V16.9.1F36',
  'COUPON-MISSING-CAREER-BATCH-FIX-V16.9.1F35',
  'CAREER-CHRONO-RISK-CALIBRATION-V16.9.1F34',
  'CAREER-ARCHIVE-SCORE-GUARD-V16.9.1F33',
  'CAREER-FAST-PROGRESS-V16.9.1F31',
  'COUPON-CAREER-DEBUT-CURRENT-V16.9.1F8',
  'COUPON-CAREER-ONLY-V16.9.1F1',
  'CAREER-STUCK-GUARD-V16.9.1F27'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F37] Verification failed: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169138');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169138')) {
  throw new Error('[V16.9.1F37] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F37 build complete: Istanbul outcome calibration is active for coupon coverage.');
