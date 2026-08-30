const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f60.cjs');
const PATCH = path.join(ROOT, 'career-five-model-byfinish-runtime-repair-v1691f61.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F61] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.9.1F61] Base build output missing.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8').trim();
if (!app.includes('CAREER-FIVE-MODEL-BYFINISH-RUNTIME-REPAIR-V16.9.1F61')) {
  app += '\n\n' + patch + '\n';
}
for (const token of [
  'CAREER-FIVE-MODEL-BYFINISH-RUNTIME-REPAIR-V16.9.1F61',
  'CAREER-FIVE-MODEL-IDB-SCHEMA-RECOVERY-V16.9.1F60',
  'FIVE-MODEL-BYFINISH-CACHE-MIGRATION-V16.9.1F59.1',
  'FIVE-MODEL-COOPERATIVE-PODIUM-V16.9.1F59',
  'MODEL-ROADMAP-RECOVERY-V12.0',
  'PODIUM-SIMILARITY-V11.5'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F61] Verification failed: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169166');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169166')) throw new Error('[V16.9.1F61] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F61 build complete: final Career 5 Model result repairs missing byFinish using existing Podium scorer; no new timeout or score formula added.');
