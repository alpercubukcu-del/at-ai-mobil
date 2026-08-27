const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f26.cjs');
const PATCH = path.join(ROOT, 'career-stuck-guard-v1691f27.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F27] Missing file: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F27] Previous build output was not found.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-STUCK-GUARD-V16.9.1F27',
  'TIMEOUT_GUARD',
  'ATCareerStuckGuardV1691F27',
  'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F26',
  'HANDICAP_PROVEN_WEIGHT_EDGE_HP_BAND_V26',
  'CAREER-EVIDENCE-CALIBRATION-V16.9.1F24',
  'CAREER-PROVEN-CONDITION-WIN-V16.9.1F23',
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F27] Verification failed: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169130');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169130')) {
  throw new Error('[V16.9.1F27] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F27 build complete: slow career/roadmap requests no longer block Career analysis.');