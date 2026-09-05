const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f624.cjs');
const EXTRA = path.join(ROOT, 'coupon-career-only-final-v1691f628.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.28] Missing F60.24 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.28] Missing direct Career coupon module.');
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

let app = fs.readFileSync(APP, 'utf8');
const oldCall = 'void buildDualTicketsF6018();';
const oldCallCount = app.split(oldCall).length - 1;
if (oldCallCount !== 3) {
  throw new Error(`[V16.9.1F60.28] Coupon route target count=${oldCallCount}; expected 3.`);
}
app = app.split(oldCall).join('void window.ATCouponCareerOnlyFinalV628?.route?.(event);');

const oldBuilderExport = 'build:buildDualTicketsF6018,';
const oldBuilderExportCount = app.split(oldBuilderExport).length - 1;
if (oldBuilderExportCount !== 1) {
  throw new Error(`[V16.9.1F60.28] Career builder export target count=${oldBuilderExportCount}; expected 1.`);
}
app = app.replace(
  oldBuilderExport,
  'build:buildDualTicketsF6018,buildCareerOnly:buildCalibratedTickets,'
);
app += '\n\n' + fs.readFileSync(EXTRA, 'utf8').trim() + '\n';

for (const token of [
  'COUPON-CAREER-ONLY-DIRECT-V16.9.1F60.28',
  "mode:'CAREER_ONLY_DIRECT_NO_FIVE_MODEL'",
  'fiveModelUsed:false',
  'buildCareerOnly:buildCalibratedTickets',
  'Always attempt the Career builder',
  'window.ATCouponCareerOnlyFinalV628?.route?.(event)'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.28] Verification failed: ' + token);
}
if (app.includes(oldCall)) {
  throw new Error('[V16.9.1F60.28] Legacy dual coupon click route is still active.');
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169228');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169228')) {
  throw new Error('[V16.9.1F60.28] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.28 build complete: main coupon button builds Career/Preparation directly; audit is advisory; Five Model coupon route disabled.');
