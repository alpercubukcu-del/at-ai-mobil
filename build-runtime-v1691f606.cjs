const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f605.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.6] Missing base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F60.6] Base build output missing.');
}

let app = fs.readFileSync(APP, 'utf8');
const fast = 'const CAREER_CONCURRENCY = 6;';
const stable = 'const CAREER_CONCURRENCY = 4;';

if (!app.includes(fast) && !app.includes(stable)) {
  throw new Error('[V16.9.1F60.6] F31 Career concurrency marker not found.');
}

if (app.includes(fast)) app = app.replace(fast, stable);

if (!app.includes(stable)) {
  throw new Error('[V16.9.1F60.6] Career concurrency could not be restored to 4.');
}
if (!app.includes('CAREER-FAST-PROGRESS-V16.9.1F31')) {
  throw new Error('[V16.9.1F60.6] F31 runtime missing after patch.');
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169180');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169180')) {
  throw new Error('[V16.9.1F60.6] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.6 build complete: Career horse concurrency restored from F31 6-way burst to stable 4-way throughput; scoring, matching, roadmap cache and checkpoint logic unchanged.');
