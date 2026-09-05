const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f622.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.23] Missing F60.22 base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio:'inherit' });

const app = fs.readFileSync(APP, 'utf8');

for (const token of [
  'CAREER_ROADMAP_RANKING_RAW_EVIDENCE_F6023',
  'careerRoadmapRowsF6023',
  '1. Kalibresiz · Kariyer Yol Haritası',
  'Kalibresiz kupon Kariyer Yol Haritası Kanıt sırasını kullanır; Güncel Analiz karıştırılmaz.',
  'FIVE-MODEL-CALIBRATED-COUPONS-V16.9.1F60.13',
  'CAREER-COUPON-V16.9.1F60.25-ARCHIVE-SAFE',
  'usableCalibratedTicketF6025',
  'calibratedAvailable'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.23] Verification failed: ' + token);
}

if (app.includes('ranking:calibratedScoreRows(race.no)')) {
  throw new Error('[V16.9.1F60.23] Uncalibrated coupon still uses fused Current Analysis ranking.');
}

new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169224');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169224')) {
  throw new Error('[V16.9.1F60.23R] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F60.23R build complete: uncalibrated coupon follows Career Roadmap evidence order only; Current Analysis is excluded; calibrated 5-model coupons unchanged.');
