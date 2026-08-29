const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f53.cjs');
const PATCH = path.join(ROOT, 'career-mobile-post-render-scroll-v1691f54.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F54] Missing file: ' + path.relative(ROOT, file));
}

/* Keep the F53 fast Career path + persist-only 5 Model behavior intact. */
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F54] Previous build output missing: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
app += '\n' + fs.readFileSync(PATCH, 'utf8') + '\n';

for (const token of [
  'CAREER-MOBILE-POST-RENDER-SCROLL-V16.9.1F54',
  'ATCareerMobilePostRenderScrollV1691F54',
  'CAREER-FIVE-MODEL-PERSIST-ONLY-V16.9.1F53',
  'CAREER-STABILITY-ROLLBACK-V16.9.1F51',
  'CAREER-FIVE-MODEL-PANEL-STARTER-V16.9.1F47',
  'CAREER-FAST-PROGRESS-V16.9.1F31'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F54] Verification failed: ' + token);
}

for (const forbidden of [
  'DAILY-FIVE-MODEL-ARCHIVE-FIRST-V16.9.1F48',
  'DAILY-FIVE-MODEL-PREP-UX-V16.9.1F49',
  'DAILY-FIVE-MODEL-PREP-STALE-BREAKER-V16.9.1F50',
  'TJK-MODEL-ROADMAP-V11.17-FAST',
  'FULL_HORSE_ONCE_LOCAL_FREEZE'
]) {
  if (app.includes(forbidden)) throw new Error('[V16.9.1F54] Forbidden regression layer present: ' + forbidden);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169155');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169155')) throw new Error('[V16.9.1F54] Cache bust update failed.');

console.log('[AT AI] V16.9.1F54 build complete: F53 calculation/data path preserved; Android Career modal scroll is explicitly restored after render.');
