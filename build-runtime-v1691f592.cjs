const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f591.cjs');
const PATCH = path.join(ROOT, 'career-five-model-archive-display-v1691f592.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F59.2] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F59.2] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('CAREER-FIVE-MODEL-ARCHIVE-DISPLAY-V16.9.1F59.2')) app += '\n\n' + patch + '\n';
for (const token of [
  'CAREER-FIVE-MODEL-ARCHIVE-DISPLAY-V16.9.1F59.2',
  'FIVE-MODEL-BYFINISH-CACHE-MIGRATION-V16.9.1F59.1',
  'DAILY-CAREER-ARCHIVE-V14.6'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F59.2] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169167');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169167')) throw new Error('[V16.9.1F59.2] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F59.2 build complete: Career screen reuses same-race archived 5 Model data only when horse roster matches; no recalculation, timeout, archive mutation, F60 or F61.');
