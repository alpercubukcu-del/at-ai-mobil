const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f612.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const MODULES = [
  'model-roadmap-resilience-v1691f613.js',
  'daily-calibration-page-v1691f613.js',
  'five-model-calibrated-coupons-v1691f613.js'
].map(x => path.join(ROOT, x));

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.13] Missing F60.12 base build.');
for (const file of MODULES) if (!fs.existsSync(file)) throw new Error('[V16.9.1F60.13] Missing module: ' + path.basename(file));
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');
for (const file of MODULES) app += '\n\n' + fs.readFileSync(file, 'utf8').trim() + '\n';

function replaceRegexOnce(rx, replacement, label) {
  const matches = app.match(new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g')) || [];
  if (matches.length !== 1) throw new Error(`[V16.9.1F60.13] ${label} target count=${matches.length}`);
  app = app.replace(rx, replacement);
}
replaceRegexOnce(
  /const\s+calibrationApi\s*=\s*window\.ATExactMatchCalibrationCouponV1691F595\s*;/,
  'const calibrationApi = window.ATFiveModelCalibratedCouponsV613;',
  'dual calibrated API'
);
replaceRegexOnce(
  /String\(ticket\?\.careerCouponVersion\|\|['"]['"]\)\.includes\(['"]F59\.5-EXACT-CALIBRATED['"]\)\s*\|\|\s*Object\.prototype\.hasOwnProperty\.call\(ticket\|\|\{\},['"]calibratedLegs['"]\)/,
  "(String(ticket?.careerCouponVersion||'').includes('F60.13-5MODEL-CALIBRATED') || String(ticket?.careerCouponVersion||'').includes('F59.5-EXACT-CALIBRATED') || Object.prototype.hasOwnProperty.call(ticket||{},'calibratedLegs'))",
  'calibrated completion rule'
);
replaceRegexOnce(
  /modelLabel\s*:\s*['"]2\. Kalibreli · Seçilen Geçmiş Yarışlar['"]\s*,/,
  "modelLabel:ticket.modelLabel || 'Kalibrasyonlu Model',",
  'calibrated model label'
);
replaceRegexOnce(
  /calibrationVariant\s*:\s*['"]SELECTED_HISTORY_TOP1_TOP2_TOP3_TOP5['"]\s*,/,
  "calibrationVariant:ticket.calibrationVariant || 'SELECTED_HISTORY_5MODEL_F613',",
  'calibrated variant label'
);
{
  const rx = /variants\s*:\s*\[['"]UNCALIBRATED['"]\s*,\s*['"]SELECTED_HISTORY_CALIBRATED['"]\]/;
  if (rx.test(app)) {
    app = app.replace(
      rx,
      "variants:['UNCALIBRATED','CALIBRATED_COMPOSITE','CALIBRATED_EXACT','CALIBRATED_TWIN','CALIBRATED_FAMILY','CALIBRATED_CAREER']"
    );
  }
}

app = app.split("caller:'F60.18-DUAL'").join("caller:'F60.13-FIVE-MODEL'");
app = app.split('2/2 · Seçili geçmiş yarışlarla kalibreli kupon hazırlanıyor…').join('2/2 · Bileşik / Tam / İkiz / Aile / Kariyer kalibreli kuponları hazırlanıyor…');
app = app.split('Hazır · 1 kalibresiz + 1 kalibreli kupon oluşturuldu.').join('Hazır · 1 kalibresiz + 5 model kalibrasyonlu kupon oluşturuldu.');
app = app.split('Kalibresiz + Kalibreli İki Kupon Oluştur').join('Kalibresiz + 5 Kalibrasyonlu Kupon Oluştur');
app = app.split('<b>İki kupon birlikte oluşturulur</b><span>1) Kalibresiz Kariyer Yol Haritası. 2) Günün Koşu Kalibrasyonu menüsünde seçilen geçmiş yarışlarla kalibreli.</span>').join('<b>1 kalibresiz + 5 model kalibrasyonlu kupon</b><span>Kalibresiz kupon Kariyer Yol Haritası Kanıt sırasını kullanır; Güncel Analiz karıştırılmaz. Kalibrasyonlu kuponlar Bileşik / Tam / İkiz / Aile / Kariyer olarak ayrı üretilir.</span>');
app = app.split('5 Model: kupon dışı').join('5 Model: kalibrasyonlu kuponlarda aktif');
app = app.split('İki kupon çıkar').join('1 kalibresiz + 5 kalibreli');

for (const token of [
  'MODEL-ROADMAP-RESILIENCE-V16.9.1F60.13',
  'DAILY-CALIBRATION-FIVE-MODEL-V16.9.1F60.13',
  'FIVE-MODEL-CALIBRATED-COUPONS-V16.9.1F60.13',
  'window.ATFiveModelCalibratedCouponsV613',
  'CALIBRATED_COMPOSITE',
  'CALIBRATED_EXACT',
  'CALIBRATED_TWIN',
  'CALIBRATED_FAMILY',
  'CALIBRATED_CAREER',
  'Bu durum %0 değildir.',
  'Eşleşmeleri Gör ve Seç',
  'Kazananın 5 Model Sırası',
  'Kalibresiz + 5 Kalibrasyonlu Kupon Oluştur',
  'CAREER_ROADMAP_RANKING_RAW_EVIDENCE_F6023',
  'Kalibresiz kupon Kariyer Yol Haritası Kanıt sırasını kullanır; Güncel Analiz karıştırılmaz.'
]) if (!app.includes(token)) throw new Error('[V16.9.1F60.13] Verification failed: ' + token);
if (app.includes('const calibrationApi = window.ATExactMatchCalibrationCouponV1691F595;')) throw new Error('[V16.9.1F60.13] Old single calibrated API still wired in dual builder.');
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169213');
fs.writeFileSync(INDEX, html, 'utf8');
console.log('[AT AI] V16.9.1F60.13 build complete: uncalibrated coupon uses Career Roadmap evidence ranking; 5 model-calibrated coupons remain separate.');
