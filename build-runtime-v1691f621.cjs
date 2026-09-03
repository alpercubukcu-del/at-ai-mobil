const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f620.cjs');
const EXTRA = path.join(ROOT, 'daily-calibration-race-selector-v1691f621.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.21] Missing F60.20 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.21] Missing Daily Calibration selector bridge.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');
const extra = fs.readFileSync(EXTRA, 'utf8');
if (!app.includes('__AT_DAILY_CALIBRATION_RACE_SELECTOR_V621__')) {
  app += `\n\n/* V16.9.1F60.21 Daily Calibration race selector bridge */\n${extra}\n`;
}

for (const token of [
  'DAILY-RACE-CALIBRATION-V16.9.1F60.18',
  '__AT_DAILY_CALIBRATION_SELECTION_BRIDGE_V618__',
  '__AT_CAREER_FIVE_MODEL_LIVE_PROGRESS_V1691F620__',
  'CAREER-MATCH-SELECTOR-V16.9.1F60.12-BULK',
  '__AT_DAILY_CALIBRATION_RACE_SELECTOR_V621__',
  'DAILY-CALIBRATION-RACE-SELECTOR-V16.9.1F60.21',
  "$('xcalRace')"
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.21] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169221');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.21 build complete: middle Daily Calibration race selector is interactive on Android; Career Roadmap and scoring unchanged.');
