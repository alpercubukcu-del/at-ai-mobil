const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f27.cjs');
const PATCH = path.join(ROOT, 'career-juvenile-maiden-market-confirmation-v1691f28.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F28] Missing file: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F28] Previous build output was not found.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-JUVENILE-MAIDEN-MARKET-CONFIRMATION-V16.9.1F28',
  'JUVENILE_MAIDEN_PRE_RACE_MARKET_CONFIRMATION_V28',
  'ATCareerJuvenileMaidenMarketConfirmationV1691F28',
  'CAREER-STUCK-GUARD-V16.9.1F27',
  'TIMEOUT_GUARD',
  'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F26',
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F28] Verification failed: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169131');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169131')) {
  throw new Error('[V16.9.1F28] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F28 build complete: juvenile Maiden short-career horses use pre-race market confirmation.');
