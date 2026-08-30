const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f591.cjs');
const PATCH = path.join(ROOT, 'career-five-model-idb-schema-recovery-v1691f60.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F60] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F60] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('CAREER-FIVE-MODEL-IDB-SCHEMA-RECOVERY-V16.9.1F60')) {
  app += '\n\n' + patch + '\n';
}
for (const token of [
  'CAREER-FIVE-MODEL-IDB-SCHEMA-RECOVERY-V16.9.1F60',
  'FIVE-MODEL-BYFINISH-CACHE-MIGRATION-V16.9.1F59.1',
  'FIVE-MODEL-COOPERATIVE-PODIUM-V16.9.1F59',
  'MODEL-ROADMAP-RECOVERY-V12.0',
  'DAILY-CAREER-ARCHIVE-V14.6'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169165');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169165')) throw new Error('[V16.9.1F60] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F60 build complete: Career 5 Model rejects stale byFinish-missing daily IndexedDB rows and recomputes only that race; annual archive preserved; no new timeout added.');
