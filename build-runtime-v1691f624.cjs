const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f623.cjs');
const EXTRA = path.join(ROOT, 'five-model-archive-only-coupons-v1691f624.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.24] Missing F60.23 base build.');
if (!fs.existsSync(EXTRA)) throw new Error('[V16.9.1F60.24] Missing archive-only coupon bridge.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio:'inherit' });

let app = fs.readFileSync(APP, 'utf8');
app += '\n\n' + fs.readFileSync(EXTRA, 'utf8').trim() + '\n';

for (const token of [
  'FIVE-MODEL-ARCHIVE-ONLY-COUPONS-V16.9.1F60.24',
  'DAILY_5MODEL_ARCHIVE_ONLY_V624',
  'READ_ONLY_INDEXEDDB',
  'Kupon Oluştur hiçbir 5 Model hesabı veya TJK isteği başlatmaz.',
  'CAREER_ROADMAP_RANKING_RAW_EVIDENCE_F6023',
  '1. Kalibresiz · Kariyer Yol Haritası'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.24] Verification failed: ' + token);
}

if (!app.includes('LEGACY_API.build = buildArchiveOnly')) {
  throw new Error('[V16.9.1F60.24] Archive-only build was not wired.');
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=1692241');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=1692241')) {
  throw new Error('[V16.9.1F60.24] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.24 build complete: coupon is read-only for 5 Model; exact daily archive records only; no coupon-time 5 Model calculation/network fallback.');
