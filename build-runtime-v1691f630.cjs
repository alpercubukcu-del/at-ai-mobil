const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f629.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.30] Missing F60.29 base build.');

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

const app = fs.readFileSync(APP, 'utf8');

for (const token of [
  'COUPON-CAREER-ONLY-DIRECT-V16.9.1F60.28',
  'COUPON-CAREER-ARCHIVE-RESTORE-V16.9.1F60.29',
  'CURRENT_ANALYSIS_TRUE_DEBUT_F6030',
  'VERIFIED_ZERO_PREVIOUS_RACES_USES_CURRENT_ANALYSIS_F6030',
  'needsCurrentForTrueDebutF6030',
  'Kariyeri olan atlar Kariyer Yol Haritası Kanıt sırasından; doğrulanmış gerçek debut atlar Güncel Analiz puanından alındı.',
  'fiveModelUsed:false'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.30] Verification failed: ' + token);
}

if (!app.includes('TRUE_DEBUT=CURRENT_ANALYSIS_F6030')) {
  throw new Error('[V16.9.1F60.30] Debut fusion rule missing.');
}

new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169230');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169230')) {
  throw new Error('[V16.9.1F60.30] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.30 build complete: Career evidence stays primary; verified zero-history debut horses use Current Analysis score, especially ŞARTLI 1.');
