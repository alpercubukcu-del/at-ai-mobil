const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f600.cjs');
const PATCH = path.join(ROOT, 'foreign-career-direct-score-v1691f602.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F60.2] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F60.2] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('FOREIGN-DIRECT-CAREER-SCORE-V16.9.1F60.2')) app += '\n\n' + patch + '\n';
for (const token of [
  'FOREIGN-DIRECT-CAREER-SCORE-V16.9.1F60.2',
  'FOREIGN-CAREER-ROADMAP-V16.9.1F60',
  'CALIBRATION-CLEANUP-V16.9.1F59.9',
  'EXACT-RANK-CALIBRATION-V16.9.1F59.7'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.2] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169177');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169177')) throw new Error('[V16.9.1F60.2] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F60.2 build complete: foreign TJK cities use direct full-career scoring when historical model-roadmap is unavailable; debut remains unscored.');
// deploy marker: F60.2 scoring runtime
