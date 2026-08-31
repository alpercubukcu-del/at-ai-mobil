const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f596.cjs');
const PATCH = path.join(ROOT, 'exact-rank-calibration-v1691f597.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F59.7] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F59.7] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('EXACT-RANK-CALIBRATION-V16.9.1F59.7')) app += '\n\n' + patch + '\n';
for (const token of [
  'EXACT-RANK-CALIBRATION-V16.9.1F59.7',
  'EXACT-MATCH-CALIBRATION-FALLBACK-V16.9.1F59.6',
  'EXACT-MATCH-CALIBRATION-COUPON-V16.9.1F59.5',
  'EXACT-MATCH-CALIBRATION-MENU-V16.9.1F59.4'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F59.7] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169173');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169173')) throw new Error('[V16.9.1F59.7] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F59.7 build complete: calibration UI shows exact winner model ranks from existing backtest cache; Top/average table hidden; no recalculation/timeout/archive clear.');