const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v150.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const SIMILAR = path.join(ROOT, 'api', 'tjk-similar.js');
const RACE_META = path.join(ROOT, 'api', 'tjk-race-meta.js');
const Y_INC = path.join(ROOT, 'tjk-similar-y-annual-v153.inc.js');
const ANNUAL_ARCHIVE = path.join(ROOT, 'tjk-annual-archive-v13.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const f of [BASE,SIMILAR,RACE_META,Y_INC,ANNUAL_ARCHIVE,INDEX]) {
  if (!fs.existsSync(f)) throw new Error(`[V15.4] Eksik dosya: ${path.basename(f)}`);
}

/*
  V15.4 — TJK sınıf yazım toleransı.
  TJK yıllık tabloda aynı KV sınıfını KV-6, KV-6 / ve KV-6 /KV olarak yazabiliyor.
  Kaynak dosyayı bundle üretilmeden önce yamalıyoruz; böylece minify/compact aşamasına bağımlı değiliz.
*/
let annual = fs.readFileSync(ANNUAL_ARCHIVE, 'utf8');
function mustAnnualReplace(label, from, to) {
  if (!annual.includes(from)) throw new Error(`[V15.4] Yıllık arşiv yaması uygulanamadı: ${label}`);
  annual = annual.replace(from, to);
}

mustAnnualReplace(
  'redundant KV decorator normalization',
  `function parseClass(raw = '') {\n  const parts = clean(raw).replace(/\\s*\\/\\s*/g, '/').split('/').map(clean).filter(Boolean);\n  const base = parts.shift() || '';\n  const tokens = parts.map(canonicalToken).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));\n  const fallback = \`${'${normKey(base)}'}${'${tokens.length ? \'/\' + tokens.join(\'/\') : \'\'}'}\`;\n  let key = fallback;\n  try { if (typeof window.canonicalClassKeyV125 === 'function') key = window.canonicalClassKeyV125(raw) || fallback; } catch {}\n  return { base, tokens, key };\n}`,
  `function parseClass(raw = '') {\n  const parts = clean(raw).replace(/\\s*\\/\\s*/g, '/').split('/').map(clean).filter(Boolean);\n  const base = parts.shift() || '';\n  const baseKey = normKey(base);\n  let tokens = parts.map(canonicalToken).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));\n  if (/^KV\\d+$/.test(baseKey)) tokens = tokens.filter(t => t !== 'KV');\n  const fallback = \`${'${baseKey}'}${'${tokens.length ? \'/\' + tokens.join(\'/\') : \'\'}'}\`;\n  const canonicalInput = [base, ...tokens].filter(Boolean).join('/');\n  let key = fallback;\n  try { if (typeof window.canonicalClassKeyV125 === 'function') key = window.canonicalClassKeyV125(canonicalInput) || fallback; } catch {}\n  return { base, tokens, key };\n}`
);

mustAnnualReplace(
  'tolerant race number resolution',
  `function matchRaceCandidates(row, day) {\n  return (Array.isArray(day?.races) ? day.races : []).filter(r => {\n    const ci = parseClass(r.class || r.yaradi1 || '');\n    return ci.key === row.classKey && ageKey(r.ageGroup || r.yaradi2 || '') === ageKey(row.groupRaw) &&\n      Number(r.distance || r.mesafe || 0) === Number(row.distance) && trackKey(r.track || r.pist || '') === row.trackKey;\n  }).map(r => Number(r.no)).filter(Boolean).sort((a, b) => a - b);\n}`,
  `function matchRaceCandidates(row, day) {\n  const races = Array.isArray(day?.races) ? day.races : [];\n  const sameConditions = r => ageKey(r.ageGroup || r.yaradi2 || '') === ageKey(row.groupRaw) &&\n    Number(r.distance || r.mesafe || 0) === Number(row.distance) && trackKey(r.track || r.pist || '') === row.trackKey;\n\n  const exact = races.filter(r => {\n    const ci = parseClass(r.class || r.yaradi1 || '');\n    return ci.key === row.classKey && sameConditions(r);\n  }).map(r => Number(r.no)).filter(Boolean).sort((a, b) => a - b);\n  if (exact.length) return exact;\n\n  /* Eski IndexedDB kayıtlarında classKey KV-6/KV olarak kalmış olabilir.\n     Yalnız tam eşleşme yoksa temel sınıf + yaş + mesafe + pist ile güvenli fallback yap. */\n  const rowBaseKey = normKey(row.classBase || parseClass(row.classRaw || '').base);\n  return races.filter(r => {\n    const ci = parseClass(r.class || r.yaradi1 || '');\n    return normKey(ci.base) === rowBaseKey && sameConditions(r);\n  }).map(r => Number(r.no)).filter(Boolean).sort((a, b) => a - b);\n}`
);

annual = annual.replace(`const VERSION = 'TJK-ANNUAL-ARCHIVE-V14.0';`, `const VERSION = 'TJK-ANNUAL-ARCHIVE-V14.1';`);
fs.writeFileSync(ANNUAL_ARCHIVE, annual, 'utf8');
execFileSync(process.execPath, ['--check', ANNUAL_ARCHIVE], { cwd:ROOT, stdio:'inherit' });

/* Ana production bundle. */
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP)) throw new Error('[V15.4] Production app bundle oluşmadı.');

/* Canlı bundle üzerinde sürüm işareti; işlevsel kod kaynak aşamasında eklendi. */
fs.appendFileSync(APP, `\n;window.__AT_KV_CLASS_ALIAS_V154__='KV-CLASS-ALIAS-V15.4';\n`, 'utf8');
new Function(fs.readFileSync(APP,'utf8'));

/* Yeni serverless function oluşturmadan günlük program parserını exact-history içinde yeniden kullan. */
let raceMeta = fs.readFileSync(RACE_META,'utf8');
if (!raceMeta.includes('export async function fetchHtml(')) {
  if (!raceMeta.includes('async function fetchHtml(')) throw new Error('[V15.4] race-meta fetchHtml bulunamadı.');
  raceMeta = raceMeta.replace('async function fetchHtml(', 'export async function fetchHtml(');
}
if (!raceMeta.includes('export function parseRaces(')) {
  if (!raceMeta.includes('function parseRaces(')) throw new Error('[V15.4] race-meta parseRaces bulunamadı.');
  raceMeta = raceMeta.replace('function parseRaces(', 'export function parseRaces(');
}
fs.writeFileSync(RACE_META,raceMeta,'utf8');

let similar = fs.readFileSync(SIMILAR,'utf8');
const importLine = `import * as cheerio from 'cheerio';`;
if (!similar.includes(`from './tjk-race-meta.js'`)) {
  if (!similar.includes(importLine)) throw new Error('[V15.4] tjk-similar import satırı bulunamadı.');
  similar = similar.replace(importLine, `${importLine}\nimport { fetchHtml as fetchProgramHtmlV153, parseRaces as parseProgramRacesV153 } from './tjk-race-meta.js';`);
}
similar = similar.replace(`const VERSION = 'TJK-EXACT-HISTORY-V7.2.2';`,`const VERSION = 'TJK-EXACT-HISTORY-V7.3.2';`);

/*
  Normal Kariyer tarihsel doğrulaması:
  KV ailesinde sondaki tekrar "KV" anlam taşımıyor. Diğer gerçek dekoratörler korunur.
  Böylece KV-6, KV-6 / ve KV-6 /KV eşdeğerdir; KV-7 vb. asla eşleşmez.
*/
const stableOld = `  const stableA = ta.filter(x => !/^Y\\d+$/.test(x));\n  const stableB = tb.filter(x => !/^Y\\d+$/.test(x));`;
const stableNew = `  const stableA = ta.filter(x => !/^Y\\d+$/.test(x) && !(fa.family === 'KV' && x === 'KV'));\n  const stableB = tb.filter(x => !/^Y\\d+$/.test(x) && !(fb.family === 'KV' && x === 'KV'));`;
if (!similar.includes(stableOld)) throw new Error('[V15.4] tjk-similar classCoreCompatible bulunamadı.');
similar = similar.replace(stableOld,stableNew);

/* V15.3 — Y-0/Y-1/Y-2/Y-3 yıllık katalog + günlük program doğrulaması. */
const queryMarker = `export async function queryExactHistoricalMatchesV9(targetInput = {}) {`;
if (!similar.includes('queryExactYAnnualV153(')) {
  if (!similar.includes(queryMarker)) throw new Error('[V15.4] exact-history query marker bulunamadı.');
  similar = similar.replace(queryMarker, fs.readFileSync(Y_INC,'utf8') + `\n${queryMarker}`);
}

const missingLine = `  if (missing.length) throw new Error(\`Eksik hedef koşu alanı: ${'${missing.join(\', \')}'}\`);`;
const branchLine = `${missingLine}\n\n  /* Y-0/Y-1/Y-2/Y-3: TJK yıllık katalogdaki tam sınıf + günlük programdaki yarış no ile doğrula. */\n  if (classTokens(target.class).some(x => /^Y\\d+$/.test(x))) {\n    return queryExactYAnnualV153(target);\n  }`;
if (!similar.includes('return queryExactYAnnualV153(target);')) {
  if (!similar.includes(missingLine)) throw new Error('[V15.4] exact-history Y dalı eklenemedi.');
  similar = similar.replace(missingLine, branchLine);
}

/* Y yolu için geçici tanılama; eşleştirme puanlarını/formüllerini değiştirmez. */
const annualReturn = `  return { anchor, beginIso, endIso, pagesScanned:pageLimit, rows:exact };`;
if (similar.includes(annualReturn)) {
  similar = similar.replace(annualReturn, `  const debugSamples = rows.filter(row => Number(row.distance) === Number(target.distance)).slice(0, 16).map(row => ({\n    date:row.date, city:row.city, ageGroup:row.ageGroup, class:row.class, distance:row.distance, track:row.track,\n    cityKey:normalizeCity(row.city), targetCityKey:normalizeCity(target.city),\n    ageKey:ageKey(row.ageGroup), targetAgeKey:ageKey(target.ageGroup),\n    classKey:classCoreKey(row.class), targetClassKey:classCoreKey(target.class),\n    trackKey:normalizeTrack(row.track), targetTrackKey:normalizeTrack(target.track)\n  }));\n  return { anchor, beginIso, endIso, pagesScanned:pageLimit, rows:exact, parsedRows:rows.length, debugSamples };`);
}
const annualDiag = `      diagnostics.pagesScanned += annual.pagesScanned;\n      diagnostics.candidateRows += annual.rows.length;`;
if (similar.includes(annualDiag)) {
  similar = similar.replace(annualDiag, `      diagnostics.pagesScanned += annual.pagesScanned;\n      diagnostics.parsedRows = Number(diagnostics.parsedRows || 0) + Number(annual.parsedRows || 0);\n      if (annual.debugSamples?.length && !diagnostics.debugSamples?.length) diagnostics.debugSamples = annual.debugSamples;\n      diagnostics.candidateRows += annual.rows.length;`);
}

fs.writeFileSync(SIMILAR,similar,'utf8');
execFileSync(process.execPath, ['--check', RACE_META], { cwd:ROOT, stdio:'inherit' });
execFileSync(process.execPath, ['--check', SIMILAR], { cwd:ROOT, stdio:'inherit' });

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15410');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V15.4.1 build tamamlandı: KV-6 / KV aliası kaynakta normalize edildi; eski yıllık arşiv kayıtları için güvenli Koşu No fallback eklendi.');
