const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f25.cjs');
const PATCH = path.join(ROOT, 'career-handicap-weight-leverage-v1691f26.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F26] Missing file: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F26] Previous build output was not found.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F26',
  'HANDICAP_PROVEN_WEIGHT_EDGE_HP_BAND_V26',
  'hpBandOverride',
  'HP_TOO_LOW_WITHOUT_PROVEN_WEIGHT_EDGE',
  'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F25',
  'CAREER-EVIDENCE-CALIBRATION-V16.9.1F24',
  'CAREER-PROVEN-CONDITION-WIN-V16.9.1F23',
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F26] Verification failed: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169129');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169129')) {
  throw new Error('[V16.9.1F26] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F26 build complete: proven handicap weight edge can override HP band.');
