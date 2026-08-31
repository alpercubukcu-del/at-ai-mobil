const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f55.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F56] Missing base build: build-runtime-v1691f55.cjs');
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F56] Previous build output not found: ' + path.relative(ROOT, file));
}

const app = fs.readFileSync(APP, 'utf8');
for (const token of [
  'DAILY-FIVE-MODEL-ARCHIVE-PREP-V16.9.1F3+F56-NONBLOCKING-STORAGE',
  'MODEL_COMPUTE_FIRST_ARCHIVE_ASYNC',
  'PREPARE_RACE_MODELS_DIRECT',
  'CAREER-FIVE-MODEL-PREP-CONTROLS-V16.9.1F55',
  'CAREER-FIVE-MODEL-STALE-RECOVERY-V16.9.1F40',
  'FIVE-MODEL-SHARED-CACHE-V16.8.7+F56.1-ROADMAP-GUARD'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F56] Verification failed: ' + token);
}
new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169161');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169161')) throw new Error('[V16.9.1F56] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F56/F56.1 build complete: manual 5 Model compute is independent of IndexedDB archive persistence; failed roadmap results are rejected from session cache; no new timeout added.');
