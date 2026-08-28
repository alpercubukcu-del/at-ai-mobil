const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f34.cjs');
const PATCH = path.join(ROOT, 'coupon-missing-career-batch-fix-v1691f35.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F35] Missing file: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F35] Previous build output was not found.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'COUPON-MISSING-CAREER-BATCH-FIX-V16.9.1F35',
  'ATCouponMissingCareerBatchFixV1691F35',
  'COUPON-CAREER-ONLY-V16.9.1F1',
  'CAREER-CHRONO-RISK-CALIBRATION-V16.9.1F34',
  'ATCareerChronoRiskCalibrationV1691F34',
  'CAREER-ARCHIVE-SCORE-GUARD-V16.9.1F33',
  'ATCareerArchiveScoreGuardV1691F33',
  'CAREER-FAST-PROGRESS-V16.9.1F31',
  'CAREER-UI-UNLOCK-V16.9.1F30',
  'CAREER-MOBILE-REFRESH-CONTROL-V16.9.1F29',
  'CAREER-JUVENILE-MAIDEN-MARKET-CONFIRMATION-V16.9.1F28',
  'CAREER-STUCK-GUARD-V16.9.1F27',
  'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F26',
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F35] Verification failed: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169136');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169136')) {
  throw new Error('[V16.9.1F35] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F35 build complete: coupon missing Career legs are completed as one batch.');
