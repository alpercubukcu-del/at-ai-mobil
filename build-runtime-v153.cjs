const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v150.cjs');
const SIMILAR = path.join(ROOT, 'api', 'tjk-similar.js');
const RACE_META = path.join(ROOT, 'api', 'tjk-race-meta.js');
const Y_INC = path.join(ROOT, 'tjk-similar-y-annual-v153.inc.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
for (const f of [SIMILAR,RACE_META,Y_INC,INDEX]) if (!fs.existsSync(f)) throw new Error(`[V15.3] Eksik dosya: ${path.basename(f)}`);

/* Yeni serverless function oluşturmadan, günlük program parserını exact-history içinde yeniden kullan. */
let raceMeta = fs.readFileSync(RACE_META,'utf8');
if (!raceMeta.includes('export async function fetchHtml(')) {
  if (!raceMeta.includes('async function fetchHtml(')) throw new Error('[V15.3] race-meta fetchHtml bulunamadı.');
  raceMeta = raceMeta.replace('async function fetchHtml(', 'export async function fetchHtml(');
}
if (!raceMeta.includes('export function parseRaces(')) {
  if (!raceMeta.includes('function parseRaces(')) throw new Error('[V15.3] race-meta parseRaces bulunamadı.');
  raceMeta = raceMeta.replace('function parseRaces(', 'export function parseRaces(');
}
fs.writeFileSync(RACE_META,raceMeta,'utf8');

let similar = fs.readFileSync(SIMILAR,'utf8');
const importLine = `import * as cheerio from 'cheerio';`;
if (!similar.includes(`from './tjk-race-meta.js'`)) {
  if (!similar.includes(importLine)) throw new Error('[V15.3] tjk-similar import satırı bulunamadı.');
  similar = similar.replace(importLine, `${importLine}\nimport { fetchHtml as fetchProgramHtmlV153, parseRaces as parseProgramRacesV153 } from './tjk-race-meta.js';`);
}
similar = similar.replace(`const VERSION = 'TJK-EXACT-HISTORY-V7.2.2';`,`const VERSION = 'TJK-EXACT-HISTORY-V7.3.1';`);

const queryMarker = `export async function queryExactHistoricalMatchesV9(targetInput = {}) {`;
if (!similar.includes('queryExactYAnnualV153(')) {
  if (!similar.includes(queryMarker)) throw new Error('[V15.3] exact-history query marker bulunamadı.');
  similar = similar.replace(queryMarker, fs.readFileSync(Y_INC,'utf8') + `\n${queryMarker}`);
}

const missingLine = `  if (missing.length) throw new Error(\`Eksik hedef koşu alanı: ${'${missing.join(\', \')}'}\`);`;
const branchLine = `${missingLine}\n\n  /* Y-0/Y-1/Y-2/Y-3: TJK yıllık katalogdaki tam sınıf + günlük programdaki yarış no ile doğrula. */\n  if (classTokens(target.class).some(x => /^Y\\d+$/.test(x))) {\n    return queryExactYAnnualV153(target);\n  }`;
if (!similar.includes('return queryExactYAnnualV153(target);')) {
  if (!similar.includes(missingLine)) throw new Error('[V15.3] exact-history Y dalı eklenemedi.');
  similar = similar.replace(missingLine, branchLine);
}

/* Geçici ama zararsız tanılama: doğru satırın hangi eşleşme alanında elendiğini görünür kılar. */
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
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15310');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V15.3.1 build tamamlandı: arşiv şehir sekmeleri + Y-1/Y1 yıllık katalog doğrulaması + eşleşme tanılaması.');
