const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f56.cjs');
const PATCH = path.join(ROOT, 'five-model-cooperative-engine-v1691f57.inc.js');
const SOURCE = path.join(ROOT, 'ticket-models-v11.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH, SOURCE]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F57] Missing file: ' + path.basename(file));
}

const originalSource = fs.readFileSync(SOURCE, 'utf8');
const startToken = 'async function prepareRaceModelsV11(race, progress) {';
const endToken = '\nfunction scoreObjectForModelV11(item, modelId) {';
const start = originalSource.indexOf(startToken);
const end = start >= 0 ? originalSource.indexOf(endToken, start) : -1;
if (start < 0 || end < 0) throw new Error('[V16.9.1F57] Source prepareRaceModelsV11 block not found.');

const patch = fs.readFileSync(PATCH, 'utf8').trim();
const patchedSource = originalSource.slice(0, start) + patch + '\n\n' + originalSource.slice(end + 1);

try {
  fs.writeFileSync(SOURCE, patchedSource, 'utf8');
  execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
} finally {
  fs.writeFileSync(SOURCE, originalSource, 'utf8');
}

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F57] Build output not found: ' + path.relative(ROOT, file));
}

const app = fs.readFileSync(APP, 'utf8');
for (const token of [
  'FIVE-MODEL-COOPERATIVE-UI-V16.9.1F57',
  'DAILY-FIVE-MODEL-ARCHIVE-PREP-V16.9.1F3+F56-NONBLOCKING-STORAGE',
  'CAREER-FIVE-MODEL-PREP-CONTROLS-V16.9.1F55',
  'PODIUM-PARTIAL-SUPPORT-V16.9.1F18',
  'FIVE-MODEL-SHARED-CACHE-V16.8.7'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F57] Verification failed: ' + token);
}
if (!app.includes('await scoreRowsCooperativeV1691F57')) {
  throw new Error('[V16.9.1F57] Cooperative score loop verification failed.');
}
new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169161');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169161')) throw new Error('[V16.9.1F57] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F57 build complete: source 5 Model scoring is cooperative; X/menu can run between historical score chunks; no new timeout added.');