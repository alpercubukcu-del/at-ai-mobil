const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f633.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.34] Missing F60.33 base build.');

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

const app = fs.readFileSync(APP, 'utf8');

for (const token of [
  'DAILY-CALIBRATION-CAREER-FLOW-V16.9.1F60.33',
  'Başlangıç Yılı',
  'Bitiş Yılı',
  'async function annualRowsForDate(row)',
  'EXACT_OCCURRENCE_INDEX_DB_INDEPENDENT',
  'const fallbackNo = await annualOrderRaceNo(row);',
  'yarış numarası çözümü ekran durumundan bağımsız IndexedDB fallback kullanır.',
  'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.34] Verification failed: ' + token);
}

new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169234');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169234')) {
  throw new Error('[V16.9.1F60.34] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.34 build complete: Annual Archive race-number resolution no longer depends on archive screen loadedRows/currentRows; IndexedDB date fallback and occurrenceIndex are active.');
