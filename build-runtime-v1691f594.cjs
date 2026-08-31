const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f593.cjs');
const PATCH = path.join(ROOT, 'exact-match-calibration-menu-v1691f594.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F59.4] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F59.4] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('EXACT-MATCH-CALIBRATION-MENU-V16.9.1F59.4')) app += '\n\n' + patch + '\n';
for (const token of [
  'EXACT-MATCH-CALIBRATION-MENU-V16.9.1F59.4',
  'CAREER-FIVE-MODEL-MAIN-DISPLAY-V16.9.1F59.3',
  'FIVE-MODEL-SHARED-CACHE-V16.8.7+F56.1-ROADMAP-GUARD',
  'TJK-ANNUAL-ARCHIVE-V14.0'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F59.4] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169170');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169170')) throw new Error('[V16.9.1F59.4] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F59.4 build complete: Menu 4 uses Annual Archive exact-match 5 Model backtests with Top1/Top2/Top3/Top5 archive; coupon logic unchanged; no new timeout.');
