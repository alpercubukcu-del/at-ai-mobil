const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f628.cjs');
const EXTRA = path.join(ROOT, 'coupon-career-archive-restore-v1691f629.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.29] Missing F60.28 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.29] Missing coupon Career archive restore module.');

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

let app = fs.readFileSync(APP, 'utf8');
app += '\n\n' + fs.readFileSync(EXTRA, 'utf8').trim() + '\n';

for (const token of [
  'COUPON-CAREER-ONLY-DIRECT-V16.9.1F60.28',
  'COUPON-CAREER-ARCHIVE-RESTORE-V16.9.1F60.29',
  'couponPostF24Restore:true',
  'restoreCareerForCouponV629',
  'CAREER_ROADMAP_RANKING_RAW_EVIDENCE_F6023',
  'fiveModelUsed:false'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.29] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169229');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169229')) {
  throw new Error('[V16.9.1F60.29] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.29 build complete: coupon restores matching Daily Archive Career ranking after F24 guard, then builds from F60.23 raw evidence order.');
