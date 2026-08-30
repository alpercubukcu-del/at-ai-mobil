const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f56.cjs');
const ENGINE_PATCH = path.join(ROOT, 'five-model-cooperative-podium-v1691f59.inc.js');
const ANNUAL_PATCH = path.join(ROOT, 'annual-current-race-loadorder-v1691f58.js');
const SOURCE = path.join(ROOT, 'ticket-models-v11.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, ENGINE_PATCH, ANNUAL_PATCH, SOURCE]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F59] Missing file: ' + path.basename(file));
}

const originalSource = fs.readFileSync(SOURCE, 'utf8');
const startToken = 'async function prepareRaceModelsV11(race, progress) {';
const endToken = '\nfunction scoreObjectForModelV11(item, modelId) {';
const start = originalSource.indexOf(startToken);
const end = start >= 0 ? originalSource.indexOf(endToken, start) : -1;
if (start < 0 || end < 0) throw new Error('[V16.9.1F59] Source prepareRaceModelsV11 block not found.');

const enginePatch = fs.readFileSync(ENGINE_PATCH, 'utf8').trim();
const patchedSource = originalSource.slice(0, start) + enginePatch + '\n\n' + originalSource.slice(end + 1);

try {
  fs.writeFileSync(SOURCE, patchedSource, 'utf8');
  execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
} finally {
  fs.writeFileSync(SOURCE, originalSource, 'utf8');
}

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F59] Build output not found: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
const annualPatch = fs.readFileSync(ANNUAL_PATCH, 'utf8').trim();
if (!app.includes('ANNUAL-CURRENT-RACE-LOADORDER-V16.9.1F58')) {
  app += '\n\n' + annualPatch + '\n';
}

for (const token of [
  'FIVE-MODEL-COOPERATIVE-PODIUM-V16.9.1F59',
  'FIVE-MODEL-COOPERATIVE-UI-V16.9.1F57',
  'scoreFinishRowsCooperativeV1691F59',
  'byFinish',
  'ANNUAL-CURRENT-RACE-LOADORDER-V16.9.1F58',
  'MODEL-ROADMAP-RECOVERY-V12.0',
  'PODIUM-SIMILARITY-V11.5',
  'PODIUM-PARTIAL-SUPPORT-V16.9.1F18',
  'DAILY-FIVE-MODEL-ARCHIVE-PREP-V16.9.1F3+F56-NONBLOCKING-STORAGE',
  'FIVE-MODEL-SHARED-CACHE-V16.8.7'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F59] Verification failed: ' + token);
}
if (!app.includes('byFinish[finish] = await placementScoresCooperativeV1691F59')) {
  throw new Error('[V16.9.1F59] Cooperative 1./2./3. placement loop verification failed.');
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169163');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169163')) {
  throw new Error('[V16.9.1F59] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F59 build complete: cooperative 5 Model now also produces real byFinish 1/2/3 podium schema; F58 annual load-order fix preserved; no new timeout added.');
