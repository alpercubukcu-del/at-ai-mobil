const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f40.cjs');
const PATCH = path.join(ROOT, 'career-five-model-prep-controls-v1691f55.js');
const LAYOUT = path.join(ROOT, 'career-five-model-prep-layout-v1691f551.js');
const SCROLL = path.join(ROOT, 'career-mobile-scroll-host-v1691f552.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH, LAYOUT, SCROLL]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F55.2] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F55.2] Previous build output not found: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
app += '\n' + fs.readFileSync(PATCH, 'utf8') + '\n';
app += '\n' + fs.readFileSync(LAYOUT, 'utf8') + '\n';
app += '\n' + fs.readFileSync(SCROLL, 'utf8') + '\n';

for (const token of [
  'CAREER-FIVE-MODEL-STALE-RECOVERY-V16.9.1F40',
  'CAREER-FIVE-MODEL-PREP-CONTROLS-V16.9.1F55',
  'CAREER-FIVE-MODEL-PREP-LAYOUT-V16.9.1F55.1',
  'CAREER-MOBILE-SCROLL-HOST-V16.9.1F55.2',
  'Günün Tüm Koşularını Hazırla',
  "Bugünün 5 Model Arşivini Temizle",
  'Tüm 5 Model Arşivini Temizle',
  'CAREER-FAST-PROGRESS-V16.9.1F31'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F55.2] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169158');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169158')) throw new Error('[V16.9.1F55.2] Cache bust could not be updated.');

console.log('[AT AI] V16.9.1F55.2 build complete: Career Roadmap has one Android-safe vertical scroll host; calculation paths unchanged.');
