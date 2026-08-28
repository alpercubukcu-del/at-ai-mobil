const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f38.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) {
  throw new Error('[V16.9.1F39] Missing file: build-runtime-v1691f38.cjs');
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) {
    throw new Error('[V16.9.1F39] Previous build output was not found: ' + path.relative(ROOT, file));
  }
}

const app = fs.readFileSync(APP, 'utf8');
for (const token of [
  'DAILY-CAREER-PDF-V14.11-DYNAMIC-NAME-WIDTH',
  'function modelGridConfig',
  'columnsPerRow',
  'CAREER-STUCK-GUARD-V16.9.1F27',
  'const ROADMAP_TIMEOUT_MS = 90000;'
]) {
  if (!app.includes(token)) {
    throw new Error('[V16.9.1F39] Verification failed: ' + token);
  }
}
new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169140');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169140')) {
  throw new Error('[V16.9.1F39] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F39 build complete: daily career PDF packs 5 model tables by dynamic horse-name width.');
