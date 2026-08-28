const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f28.cjs');
const PATCHES = [
  path.join(ROOT, 'career-mobile-refresh-control-v1691f29.js'),
  path.join(ROOT, 'career-ui-unlock-v1691f30.js'),
  path.join(ROOT, 'career-fast-progress-v1691f31.js')
];
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, ...PATCHES]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F31] Missing file: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F31] Previous build output was not found.');
}

let app = fs.readFileSync(APP, 'utf8');
for (const patch of PATCHES) {
  app += `\n${fs.readFileSync(patch, 'utf8')}\n`;
}

for (const token of [
  'CAREER-FAST-PROGRESS-V16.9.1F31',
  'CAREER-UI-UNLOCK-V16.9.1F30',
  'CAREER-MOBILE-REFRESH-CONTROL-V16.9.1F29',
  'CAREER-JUVENILE-MAIDEN-MARKET-CONFIRMATION-V16.9.1F28',
  'CAREER-STUCK-GUARD-V16.9.1F27',
  'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F26',
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F31] Verification failed: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169132');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169132')) {
  throw new Error('[V16.9.1F31] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F31 build complete: Career all-race analysis uses faster progress, unlock, and refresh controls.');
