const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f592.cjs');
const PATCH = path.join(ROOT, 'career-five-model-main-display-v1691f593.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F59.3] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F59.3] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('CAREER-FIVE-MODEL-MAIN-DISPLAY-V16.9.1F59.3')) app += '\n\n' + patch + '\n';
for (const token of [
  'CAREER-FIVE-MODEL-MAIN-DISPLAY-V16.9.1F59.3',
  'CAREER-FIVE-MODEL-ARCHIVE-DISPLAY-V16.9.1F59.2',
  'MODEL-ROADMAP-RECOVERY-V12.0'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F59.3] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169168');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169168')) throw new Error('[V16.9.1F59.3] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F59.3 build complete: archived main 5 Model scores remain visible in Career even if an old byFinish schema flag is false; Podium/schema checks unchanged; no recalculation or archive mutation.');
