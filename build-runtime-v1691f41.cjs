const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f40.cjs');
const PATCH = path.join(ROOT, 'career-five-model-fresh-start-recovery-v1691f41.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error('[V16.9.1F41] Missing file: ' + path.basename(file));
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) {
    throw new Error('[V16.9.1F41] Previous build output was not found: ' + path.relative(ROOT, file));
  }
}

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8');
app += `\n${patch}\n`;

for (const token of [
  'CAREER-FIVE-MODEL-FRESH-START-RECOVERY-V16.9.1F41',
  'ATCareerFiveModelFreshStartRecoveryV1691F41',
  'CAREER-FIVE-MODEL-STALE-RECOVERY-V16.9.1F40',
  'CAREER-STUCK-GUARD-V16.9.1F27',
  'DAILY-CAREER-PDF-V14.11-DYNAMIC-NAME-WIDTH'
]) {
  if (!app.includes(token)) {
    throw new Error('[V16.9.1F41] Verification failed: ' + token);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169142');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169142')) {
  throw new Error('[V16.9.1F41] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F41 build complete: fresh Career 5 Model requests bypass a stalled archive/IndexedDB startup layer.');
