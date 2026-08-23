const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1655.cjs');
const SIMILAR = path.join(ROOT, 'api', 'tjk-similar.js');
const ROADMAP = path.join(ROOT, 'api', 'tjk-roadmap.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, SIMILAR, ROADMAP]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.5.6] Eksik dosya: ${path.basename(file)}`);
}

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

function mustReplace(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`[V16.5.6] Yama uygulanamadı: ${label}`);
  return text.replace(from, to);
}

/*
  TJK Koşu Sorgulama bazı POST cevaplarında istenen yıl penceresinin dışındaki satırları da
  döndürebiliyor. Bu nedenle yalnız form filtresine güvenmek roadmap'e onlarca eski yıl
  taşıyordu. Aday satırını ayrıca kod tarafında ±45 günlük gerçek ISO tarih aralığına kilitle.
*/
let similar = fs.readFileSync(SIMILAR, 'utf8');
similar = similar.replace("const VERSION = 'TJK-EXACT-HISTORY-V7.4.0';", "const VERSION = 'TJK-EXACT-HISTORY-V7.4.1';");
const candidateOld = `      const candidates = rows.filter(row =>\n        normalizeCity(row.city) === normalizeCity(target.city) &&\n        ageKey(row.ageGroup) === ageKey(target.ageGroup) &&\n        queryClassKey(row.class) === queryClassKey(target.class) &&\n        normalizeTrack(row.track) === normalizeTrack(target.track) &&\n        Number(row.distance) === Number(target.distance)\n      );`;
const candidateNew = `      const candidates = rows.filter(row =>\n        String(row.isoDate || '') >= beginIso &&\n        String(row.isoDate || '') <= endIso &&\n        String(row.isoDate || '') < target.date &&\n        normalizeCity(row.city) === normalizeCity(target.city) &&\n        ageKey(row.ageGroup) === ageKey(target.ageGroup) &&\n        queryClassKey(row.class) === queryClassKey(target.class) &&\n        normalizeTrack(row.track) === normalizeTrack(target.track) &&\n        Number(row.distance) === Number(target.distance)\n      );`;
similar = mustReplace(similar, candidateOld, candidateNew, 'local ISO date window');
fs.writeFileSync(SIMILAR, similar, 'utf8');
execFileSync(process.execPath, ['--check', SIMILAR], { cwd: ROOT, stdio: 'inherit' });

/*
  Koşu sorgu tablosu DHÖ/DHÖW gibi bazı dekoratörleri eksik gösterebildiği için geniş aday
  bulma korunur; fakat seçilen yarışın gerçek sonuç başlığı /api/tjk-history'den geldikten sonra
  HEDEF koşulla tam sınıf + yaş + mesafe + pist doğrulaması zorunludur. Böylece 2023'teki
  DHÖW yarışı, 2026 hedefi DHÖ olduğu için referans olamaz. Yanlış koşulda at kariyerlerini
  hiç çağırmayarak hem doğruluk hem süre iyileşir.
*/
let roadmap = fs.readFileSync(ROADMAP, 'utf8');
roadmap = roadmap.replace("const VERSION = 'TJK-ROADMAP-EXACT-V4.3';", "const VERSION = 'TJK-ROADMAP-EXACT-V4.4';");

const helperMarker = `function normalizeHistoricalCandidate(raw) {`;
const helperCode = `function exactTextKey(value) {\n  return cleanText(value)\n    .toLocaleUpperCase('tr-TR')\n    .normalize('NFKD')\n    .replace(/[\\u0300-\\u036f]/g, '')\n    .replace(/\\s*\\/\\s*/g, '/')\n    .replace(/\\s+/g, ' ')\n    .trim();\n}\n\nfunction exactClassKey(value) {\n  return exactTextKey(value)\n    .replace(/\\s*-\\s*/g, '-')\n    .replace(/\\s+/g, '');\n}\n\nfunction exactTrackKey(value) {\n  const key = exactTextKey(value).replace(/\\s+/g, '');\n  if (key.includes('SENTETIK')) return 'SENTETIK';\n  if (key.includes('CIM')) return 'CIM';\n  if (key.includes('KUM')) return 'KUM';\n  return key;\n}\n\nfunction exactAgeKey(value) {\n  return exactTextKey(normalizeAgeGroup(value)).replace(/\\s+/g, '');\n}\n\nfunction normalizeHistoricalCandidate(raw) {`;
roadmap = mustReplace(roadmap, helperMarker, helperCode, 'exact condition helpers');

roadmap = mustReplace(
  roadmap,
  `async function buildHistoricalRace({ baseUrl, candidate }) {`,
  `async function buildHistoricalRace({ baseUrl, candidate, target }) {`,
  'buildHistoricalRace target arg'
);

const conditionOld = `    output.condition = {\n      class:cleanText(history.class || candidate.class),\n      ageGroup:normalizeAgeGroup(history.ageGroup || candidate.ageGroup),\n      distance:normalizeDistance(history.distance || candidate.distance),\n      track:cleanText(history.track || candidate.track),\n      raw:cleanText(history.conditionRaw) || null\n    };\n\n    const top3 = Array.isArray(history.top3)`;
const conditionNew = `    output.condition = {\n      class:cleanText(history.class || candidate.class),\n      ageGroup:normalizeAgeGroup(history.ageGroup || candidate.ageGroup),\n      distance:normalizeDistance(history.distance || candidate.distance),\n      track:cleanText(history.track || candidate.track),\n      raw:cleanText(history.conditionRaw) || null\n    };\n\n    const checks = {\n      classMatch: exactClassKey(output.condition.class) === exactClassKey(target?.class),\n      ageMatch: exactAgeKey(output.condition.ageGroup) === exactAgeKey(target?.ageGroup),\n      distanceMatch: Number(output.condition.distance) === Number(normalizeDistance(target?.distance)),\n      trackMatch: exactTrackKey(output.condition.track) === exactTrackKey(target?.track)\n    };\n    output.conditionVerification = checks;\n    output.exactConditionMatch = Object.values(checks).every(Boolean);\n    output.raceConditionSimilarity = output.exactConditionMatch ? 100 : 0;\n    if (!output.exactConditionMatch) {\n      output.error = 'Gerçek yarış başlığı hedef koşulla tam eşleşmedi.';\n      return output;\n    }\n\n    const top3 = Array.isArray(history.top3)`;
roadmap = mustReplace(roadmap, conditionOld, conditionNew, 'selected race exact verification');

const mapOld = `      candidate => buildHistoricalRace({ baseUrl, candidate })`;
const mapNew = `      candidate => buildHistoricalRace({\n        baseUrl,\n        candidate,\n        target:{ class:raceClass, ageGroup, track, distance }\n      })`;
roadmap = mustReplace(roadmap, mapOld, mapNew, 'pass target into historical race');

fs.writeFileSync(ROADMAP, roadmap, 'utf8');
execFileSync(process.execPath, ['--check', ROADMAP], { cwd: ROOT, stdio: 'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.5.6] Production bundle/index bulunamadı.');
let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16560');
fs.writeFileSync(INDEX, html, 'utf8');

let app = fs.readFileSync(APP, 'utf8');
if (!app.includes('__AT_EXACT_WINDOW_FIX_V1656__')) {
  app += `\n;window.__AT_EXACT_WINDOW_FIX_V1656__='EXACT-WINDOW-VERIFY-V16.5.6';\n`;
  fs.writeFileSync(APP, app, 'utf8');
}
new Function(fs.readFileSync(APP, 'utf8'));

console.log('[AT AI] V16.5.6 build tamamlandı: ±45 gün ISO kilidi + seçilen geçmiş yarış için gerçek başlık doğrulaması aktif.');
