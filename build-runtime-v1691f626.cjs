const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f624.cjs');
const EXTRA = path.join(ROOT, 'coupon-career-only-final-v1691f626.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.26] Missing F60.24 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.26] Missing Career-only coupon module.');
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

let app = fs.readFileSync(APP, 'utf8');
const oldCall = 'void buildDualTicketsF6018();';
const oldCallCount = app.split(oldCall).length - 1;
if (oldCallCount !== 3) {
  throw new Error(`[V16.9.1F60.26] Coupon route target count=${oldCallCount}; expected 3.`);
}
app = app.split(oldCall).join('void window.ATCouponCareerOnlyFinalV626?.route?.(event);');

const oldBuilderExport = 'build:buildDualTicketsF6018,';
const oldBuilderExportCount = app.split(oldBuilderExport).length - 1;
if (oldBuilderExportCount !== 1) {
  throw new Error(`[V16.9.1F60.26] Career builder export target count=${oldBuilderExportCount}; expected 1.`);
}
app = app.replace(
  oldBuilderExport,
  'build:buildDualTicketsF6018,buildCareerOnly:buildCalibratedTickets,'
);
app += '\n\n' + fs.readFileSync(EXTRA, 'utf8').trim() + '\n';

for (const token of [
  'COUPON-CAREER-ONLY-FINAL-V16.9.1F60.26',
  "mode:'CAREER_ONLY_NO_FIVE_MODEL'",
  'fiveModelUsed:false',
  'buildCareerOnly:buildCalibratedTickets',
  'Kupon yalnız Kariyer Yol Haritasındaki Kanıt sırasından oluşturulur.',
  'window.ATCouponCareerOnlyFinalV626?.route?.(event)'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.26] Verification failed: ' + token);
}
if (app.includes(oldCall)) {
  throw new Error('[V16.9.1F60.26] Legacy dual coupon click route is still active.');
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169226');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169226')) {
  throw new Error('[V16.9.1F60.26] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.26 build complete: coupon audit hydrates Career/Preparation only; ticket uses raw Career Roadmap evidence order; Five Model coupon route is disabled.');
