const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1654.cjs');
const SIMILAR = path.join(ROOT, 'api', 'tjk-similar.js');
const ROADMAP = path.join(ROOT, 'api', 'tjk-roadmap.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, SIMILAR, ROADMAP]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.5.5] Eksik dosya: ${path.basename(file)}`);
}

/* Önce mevcut V16.5.4 production ağacını üret. */
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

function mustReplace(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`[V16.5.5] Yama uygulanamadı: ${label}`);
  return text.replace(from, to);
}

/*
  Normal (Y-0/Y-1/Y-2/Y-3 olmayan) yarışlarda TJK Koşu Sorgulama satırı zaten
  şehir + sınıf dekoratörleri + yaş + mesafe + pist ile yerelde tam eşleşmeden geçiyor.
  Eski akış buna rağmen her adayı tekrar Günlük Sonuç sayfasından doğruluyor, aynı günlük
  sayfayı çok kez çağırıyor ve /api/tjk-roadmap'i timeout'a sürüklüyordu.

  Y sınıfları ayrı yıllık-program doğrulama dalında kalır. Normal dalda yalnız yerelde
  tam koşul eşleşmesini kabul ediyoruz; seçilen geçmiş yarışın gerçek ilk 3'ü daha sonra
  /api/tjk-history üzerinden yine yarış tarihine göre alınır. Sonuç sızıntısı eklenmez.
*/
let similar = fs.readFileSync(SIMILAR, 'utf8');
similar = similar.replace("const VERSION = 'TJK-EXACT-HISTORY-V7.3.2';", "const VERSION = 'TJK-EXACT-HISTORY-V7.4.0';");

const verifyOld = `      const verified = await mapLimit(candidates, VERIFY_CONCURRENCY, row => verifyRace(row, target));\n      for (const row of verified) {\n        if (row?.exactCondition) {\n          all.push(row);\n          yearFound++;\n          diagnostics.verifiedRows++;\n        } else diagnostics.rejectedRows++;\n      }`;
const verifyNew = `      /* V16.5.5: normal dalda aday zaten tam alan eşleşmesinden geçti.\n         Tekrar günlük sonuç sayfasına yüzlerce GET atma; gerçek yarış sonucu/top3\n         doğrulaması roadmap aşamasında /api/tjk-history ile yapılır. */\n      const verified = candidates.map(row => ({\n        ...row,\n        classText: row.class || '',\n        exactCondition: true,\n        verification: {\n          source: 'TJK_QUERY_EXACT_FILTER_V1655',\n          classMatch: true,\n          ageMatch: true,\n          distanceMatch: true,\n          trackMatch: true,\n          url: null\n        }\n      }));\n      for (const row of verified) {\n        all.push(row);\n        yearFound++;\n        diagnostics.verifiedRows++;\n      }`;
similar = mustReplace(similar, verifyOld, verifyNew, 'tjk-similar redundant verification');
fs.writeFileSync(SIMILAR, similar, 'utf8');
execFileSync(process.execPath, ['--check', SIMILAR], { cwd: ROOT, stdio: 'inherit' });

/*
  Kariyer ekranı eski istemcilerden minYear=2000 gönderebiliyor. 26 yıllık tarama canlı
  ekranda gereksiz ve timeout üretiyor. Kör modelde de kullanılan yakın dönem mantığıyla
  hedef yıldan önceki son 3 takvim yılına sınırla (2026 için 2023-2025).
*/
let roadmap = fs.readFileSync(ROADMAP, 'utf8');
roadmap = roadmap.replace("const VERSION = 'TJK-ROADMAP-EXACT-V4.2';", "const VERSION = 'TJK-ROADMAP-EXACT-V4.3';");
roadmap = mustReplace(
  roadmap,
  `    const minYear = Math.max(1950, toInteger(req.query?.minYear) || 2000);`,
  `    const requestedMinYear = Math.max(1950, toInteger(req.query?.minYear) || 2000);\n    const targetYear = Number(targetDateIso.slice(0, 4));\n    const recentMinYear = Number.isFinite(targetYear) ? targetYear - 3 : requestedMinYear;\n    const minYear = Math.max(requestedMinYear, recentMinYear);`,
  'roadmap recent-year clamp'
);
roadmap = roadmap.replace(`    setParam(similarUrl, 'maxPages', req.query?.maxPages || 40);`, `    setParam(similarUrl, 'maxPages', req.query?.maxPages || 12);`);
fs.writeFileSync(ROADMAP, roadmap, 'utf8');
execFileSync(process.execPath, ['--check', ROADMAP], { cwd: ROOT, stdio: 'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.5.5] Production bundle/index bulunamadı.');

/* Cache kır: V16.5.3 kariyer hazırlık fallback'i mevcut bundle içinde yeniden yüklensin. */
let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16550');
fs.writeFileSync(INDEX, html, 'utf8');

let app = fs.readFileSync(APP, 'utf8');
if (!app.includes('__AT_ROADMAP_SCORE_FIX_V1655__')) {
  app += `\n;window.__AT_ROADMAP_SCORE_FIX_V1655__='ROADMAP-SCORE-FIX-V16.5.5';\n`;
  fs.writeFileSync(APP, app, 'utf8');
}
new Function(fs.readFileSync(APP, 'utf8'));

console.log('[AT AI] V16.5.5 build tamamlandı: roadmap timeout azaltıldı, exact referans puan akışı hızlandırıldı.');
