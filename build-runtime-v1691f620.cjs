const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f619.cjs');
const EXTRA = path.join(ROOT, 'career-five-model-live-progress-v1691f620.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.20] Missing F60.19 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.20] Missing live progress bridge.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');
const extra = fs.readFileSync(EXTRA, 'utf8');
if (!app.includes('__AT_CAREER_FIVE_MODEL_LIVE_PROGRESS_V1691F620__')) {
  app += `\n\n/* V16.9.1F60.20 Career 5 Model visible progress */\n${extra}\n`;
}

for (const token of [
  'CAREER-MATCH-APPLY-F60.19',
  '__AT_DAILY_CALIBRATION_SELECTION_BRIDGE_V618__',
  '__AT_CAREER_FIVE_MODEL_LIVE_PROGRESS_V1691F620__',
  'Geçmiş yarış ${m[1]}/${m[2]}',
  'Bugünkü at kariyerleri ${m[1]}/${m[2]}',
  'geçen süre ${elapsed}'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.20] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169220');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.20 build complete: Career 5 Model live stage/count/elapsed progress is visible; scoring and matching unchanged.');
