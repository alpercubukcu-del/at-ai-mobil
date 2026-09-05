const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f630.cjs');
const EXTRA = path.join(ROOT, 'coupon-five-model-calibrated-v1691f631.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.31] Missing F60.30 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.31] Missing calibrated coupon orchestrator.');

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

let app = fs.readFileSync(APP, 'utf8');
app += '\n\n' + fs.readFileSync(EXTRA, 'utf8').trim() + '\n';

for (const token of [
  'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31',
  'BASELINE_PLUS_FIVE_CALIBRATED_ARCHIVE_ONLY',
  'CALIBRATED_COMPOSITE',
  'CALIBRATED_EXACT',
  'CALIBRATED_TWIN',
  'CALIBRATED_FAMILY',
  'CALIBRATED_CAREER',
  'CURRENT_ANALYSIS_TRUE_DEBUT_IN_5MODEL_F6031',
  'DAILY_5MODEL_ARCHIVE+DAILY_CALIBRATION_F6031',
  'ATFiveModelArchiveOnlyCouponsV624',
  'FIVE-MODEL-CALIBRATED-COUPONS-V16.9.1F60.13',
  'COUPON-CAREER-ARCHIVE-RESTORE-V16.9.1F60.29'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.31] Verification failed: ' + token);
}

if (!app.includes('typeof five === \'function\') void five();')) {
  throw new Error('[V16.9.1F60.31] F60.28 capture delegation to F60.31 is missing.');
}
if (!app.includes('veri yoksa 0 değildir') && !app.includes('veri yoksa 0')) {
  throw new Error('[V16.9.1F60.31] no-data-not-zero protection text missing.');
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169231');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169231')) {
  throw new Error('[V16.9.1F60.31] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.31 build complete: 1 Career/debut baseline + five independent Daily-Calibration 5 Model coupons, archive-only, no-data != 0.');
