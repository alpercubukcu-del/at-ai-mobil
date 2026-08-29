const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f48.cjs');
const PATCH = path.join(ROOT, 'daily-five-model-prep-ux-v1691f49.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F49] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F49] Previous build output missing: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
app += '\n' + fs.readFileSync(PATCH, 'utf8') + '\n';

for (const token of [
  'DAILY-FIVE-MODEL-PREP-UX-V16.9.1F49',
  'ATDailyFiveModelPrepUxV1691F49',
  'DAILY-FIVE-MODEL-ARCHIVE-FIRST-V16.9.1F48',
  'ATDailyFiveModelArchiveFirstV1691F48',
  'CAREER-FIVE-MODEL-PANEL-STARTER-V16.9.1F47',
  'ATCareerFiveModelPanelStarterV1691F47',
  'DAILY-CAREER-PDF-V14.11-DYNAMIC-NAME-WIDTH'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F49] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169150');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169150')) throw new Error('[V16.9.1F49] Cache bust update failed.');

console.log('[AT AI] V16.9.1F49 build complete: Daily 5 Model prep skips cached records, shows elapsed time, and restores mobile dialogs.');
