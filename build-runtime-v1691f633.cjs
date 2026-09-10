const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f631.cjs');
const EXTRA = path.join(ROOT, 'daily-calibration-career-flow-v1691f633.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.33] Missing F60.31 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.33] Missing year-range Daily Calibration module.');

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

let app = fs.readFileSync(APP, 'utf8');
app += '\n\n' + fs.readFileSync(EXTRA, 'utf8').trim() + '\n';

for (const token of [
  'DAILY-CALIBRATION-CAREER-FLOW-V16.9.1F60.33',
  'Başlangıç Yılı',
  'Bitiş Yılı',
  'dcalYearFromF633',
  'dcalYearToF633',
  'applyYearRange',
  "typeof annualApi?.resolveSelected==='function'",
  'unresolvedCount',
  'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31',
  "if(!button || button.id==='analysisDialog') return;"
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.33] Verification failed: ' + token);
}

if (app.includes('DAILY-CALIBRATION-CAREER-FLOW-V16.9.1F60.32')) {
  throw new Error('[V16.9.1F60.33] Old F60.32 visible Daily Calibration module unexpectedly present.');
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169233');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169233')) {
  throw new Error('[V16.9.1F60.33] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.33 build complete: calibration selector has start/end year range; native Annual Archive resolver is primary; partial unresolved rows no longer cancel all.');
