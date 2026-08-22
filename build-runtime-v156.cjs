const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v155.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const ADAPTIVE_API = path.join(ROOT, 'api', 'tjk-adaptive-roadmap-v10.js');
const FAST_RUNTIME = path.join(ROOT, 'annual-roadmap-fast-v156.js');

for (const file of [BASE, ADAPTIVE_API, FAST_RUNTIME]) {
  if (!fs.existsSync(file)) throw new Error(`[V15.6] Eksik dosya: ${path.basename(file)}`);
}

/* Önce V15.5 production bundle'ını aynen üret. */
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V15.6] Production bundle/index oluşmadı.');

/*
  V15.6 server tarafı:
  Eksik yıllar için mevcut V10 sorgusunu kullanmaya devam eder, fakat `years=` verilirse
  pahalı geçmiş yarış + ilk3 + kariyer hazırlığını yalnız istenen sourceYear'larda yapar.
  Aday bulma, sınıflandırma ve puan formülleri değiştirilmez.
*/
let api = fs.readFileSync(ADAPTIVE_API, 'utf8');
const oldBlock = `    const selected=selectBestPerYear(candidates);\n    const baseUrl=getBaseUrl(req);\n    const historicalRaces=await mapLimit(selected,RACE_CONCURRENCY,candidate=>buildHistoricalRace({baseUrl,candidate}));`;
const newBlock = `    const selectedAll=selectBestPerYear(candidates);\n    const requestedYears=new Set(clean(req.query.years||'').split(',').map(x=>Number(x)).filter(y=>Number.isFinite(y)&&y>=minYear&&y<targetParts.year));\n    const selected=requestedYears.size?selectedAll.filter(candidate=>requestedYears.has(Number(candidate.sourceYear))):selectedAll;\n    const baseUrl=getBaseUrl(req);\n    const historicalRaces=await mapLimit(selected,RACE_CONCURRENCY,candidate=>buildHistoricalRace({baseUrl,candidate}));`;
if (!api.includes(oldBlock)) throw new Error('[V15.6] adaptive API selected bloğu bulunamadı.');
api = api.replace(oldBlock, newBlock);
api = api.replace(`const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.0';`, `const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.0-V156';`);
fs.writeFileSync(ADAPTIVE_API, api, 'utf8');

/* Runtime hızlı yol en sona eklenir; mevcut fetch/career checkpoint katmanlarını alt katmanda kullanır. */
fs.appendFileSync(APP, '\n;/* ===== annual-roadmap-fast-v156.js ===== */\n' + fs.readFileSync(FAST_RUNTIME, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, `\n;window.__AT_CAREER_PERF_V156__='ANNUAL-ROADMAP-FAST-V15.6';\n`, 'utf8');
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15600');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V15.6 build tamamlandı: yıllık arşiv hızlı yol + yalnız eksik sourceYear fallback; analiz formülleri değişmedi.');
