const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f598.cjs');
const PATCH = path.join(ROOT, 'calibration-cleanup-v1691f599.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F59.9] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F59.9] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('CALIBRATION-CLEANUP-V16.9.1F59.9')) app += '\n\n' + patch + '\n';
for (const token of [
  'CALIBRATION-CLEANUP-V16.9.1F59.9',
  'CALIBRATION-ERROR-DETAIL-V16.9.1F59.8',
  'EXACT-RANK-CALIBRATION-V16.9.1F59.7',
  'EXACT-MATCH-CALIBRATION-FALLBACK-V16.9.1F59.6',
  'EXACT-MATCH-CALIBRATION-COUPON-V16.9.1F59.5',
  'EXACT-MATCH-CALIBRATION-MENU-V16.9.1F59.4'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F59.9] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169175');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169175')) throw new Error('[V16.9.1F59.9] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F59.9 build complete: calibration cleanup controls added; TJK annual/daily archive and career data remain untouched.');
