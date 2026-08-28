const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f31.cjs');
const PATCH = path.join(ROOT, 'career-archive-score-guard-v1691f33.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F33] Missing file: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F33] Previous build output was not found.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-ARCHIVE-SCORE-GUARD-V16.9.1F33',
  'ATCareerArchiveScoreGuardV1691F33',
  'CAREER-FAST-PROGRESS-V16.9.1F31',
  'CAREER-UI-UNLOCK-V16.9.1F30',
  'CAREER-MOBILE-REFRESH-CONTROL-V16.9.1F29',
  'CAREER-JUVENILE-MAIDEN-MARKET-CONFIRMATION-V16.9.1F28',
  'CAREER-STUCK-GUARD-V16.9.1F27',
  'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F26',
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F33] Verification failed: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169134');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169134')) {
  throw new Error('[V16.9.1F33] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F33 build complete: Career archive writes require numeric scores and old scoreless rows are pruned before PDF/restore.');
