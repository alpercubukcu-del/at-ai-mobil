const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f31.cjs');
const PATCH = path.join(ROOT, 'career-daily-archive-bridge-v1691f32.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F32] Missing file: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F32] Previous build output was not found.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-DAILY-ARCHIVE-BRIDGE-V16.9.1F32',
  'CAREER-FAST-PROGRESS-V16.9.1F31',
  'CAREER-UI-UNLOCK-V16.9.1F30',
  'CAREER-MOBILE-REFRESH-CONTROL-V16.9.1F29',
  'CAREER-JUVENILE-MAIDEN-MARKET-CONFIRMATION-V16.9.1F28',
  'CAREER-STUCK-GUARD-V16.9.1F27'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F32] Verification failed: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169133');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169133')) {
  throw new Error('[V16.9.1F32] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F32 build complete: F31 Career results are saved to daily archive for archive view and PDF.');

