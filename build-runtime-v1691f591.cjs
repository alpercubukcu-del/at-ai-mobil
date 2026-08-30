const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f59.cjs');
const PATCH = path.join(ROOT, 'five-model-byfinish-cache-migration-v1691f591.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F59.1] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F59.1] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('FIVE-MODEL-BYFINISH-CACHE-MIGRATION-V16.9.1F59.1')) {
  app += '\n\n' + patch + '\n';
}
for (const token of [
  'FIVE-MODEL-BYFINISH-CACHE-MIGRATION-V16.9.1F59.1',
  'FIVE-MODEL-COOPERATIVE-PODIUM-V16.9.1F59',
  'ANNUAL-CURRENT-RACE-LOADORDER-V16.9.1F58',
  'MODEL-ROADMAP-RECOVERY-V12.0'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F59.1] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169164');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169164')) throw new Error('[V16.9.1F59.1] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F59.1 build complete: stale session rows without byFinish are selectively discarded; F59 real podium schema preserved.');
