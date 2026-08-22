const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v157.cjs');
const ANNUAL = path.join(ROOT, 'tjk-annual-archive-v13.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, ANNUAL]) {
  if (!fs.existsSync(file)) throw new Error(`[V15.8] Eksik dosya: ${path.basename(file)}`);
}

/*
  V15.8 — Yıllık Yarış Arşivi Ek Şart filtresi.
  TJK aynı yamak bilgisini H3/Y2, H3/Y-2, H3Y2 veya H3Y-2 biçimlerinde yazabiliyor.
  Daha önce IndexedDB'ye kaydedilmiş satırlar yeniden indirilmeden classRaw üzerinden
  filtre anında tekrar parçalanır. Analiz/puan formüllerine dokunulmaz.
*/
let annual = fs.readFileSync(ANNUAL, 'utf8');

const tokenLabelMarker = `function tokenLabel(t = '') { return t === 'DISI' ? 'Dişi' : t === 'ERKEK' ? 'Erkek' : t; }`;
const helper = `${tokenLabelMarker}\nfunction annualFilterTokensV158(raw = '') {\n  const parts = clean(raw).replace(/\\s*\\/\\s*/g, '/').split('/').map(clean).filter(Boolean);\n  if (parts.length) parts.shift();\n  const out = [];\n  for (const part of parts) {\n    const compact = upper(part).replace(/\\s+/g, '').replace(/^\\/+|\\/+$/g, '').replace(/İ/g, 'I');\n    if (!compact) continue;\n    const m = compact.match(/^(.*?)(Y-?[0-3])$/);\n    if (m && m[1]) {\n      const left = canonicalToken(m[1]);\n      const y = canonicalToken(m[2]);\n      if (left) out.push(left);\n      if (y) out.push(y);\n      continue;\n    }\n    const token = canonicalToken(part);\n    if (token) out.push(token);\n  }\n  return [...new Set(out)].sort((a, b) => a.localeCompare(b, 'tr', { numeric:true }));\n}\nfunction rowFilterTokensV158(row = {}) { return annualFilterTokensV158(row.classRaw || ''); }`;
if (!annual.includes('function annualFilterTokensV158')) {
  if (!annual.includes(tokenLabelMarker)) throw new Error('[V15.8] tokenLabel ekleme noktası bulunamadı.');
  annual = annual.replace(tokenLabelMarker, helper);
}

const universeOld = `tokenUniverse = [...new Set(rows.flatMap(x => x.extraTokens || []))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));`;
const universeNew = `tokenUniverse = [...new Set(rows.flatMap(rowFilterTokensV158))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));`;
if (annual.includes(universeOld)) annual = annual.replace(universeOld, universeNew);
else if (!annual.includes(universeNew)) throw new Error('[V15.8] tokenUniverse filtresi bulunamadı.');

const searchOld = `tokens.every(t => (r.extraTokens || []).includes(t))`;
const searchNew = `tokens.every(t => rowFilterTokensV158(r).includes(t))`;
if (annual.includes(searchOld)) annual = annual.replace(searchOld, searchNew);
else if (!annual.includes(searchNew)) throw new Error('[V15.8] Ek Şart arama filtresi bulunamadı.');

/* Sonuç kartındaki Kanonik satır da yeni ayrıştırmayı göstersin. */
const renderOld = `r.extraTokens?.length ? ' · ' + r.extraTokens.map(tokenLabel).map(esc).join(' · ') : ''`;
const renderNew = `rowFilterTokensV158(r).length ? ' · ' + rowFilterTokensV158(r).map(tokenLabel).map(esc).join(' · ') : ''`;
if (annual.includes(renderOld)) annual = annual.replace(renderOld, renderNew);

fs.writeFileSync(ANNUAL, annual, 'utf8');
execFileSync(process.execPath, ['--check', ANNUAL], { cwd:ROOT, stdio:'inherit' });

/* V15.7 zinciri: Y aliasları + hızlandırma + mevcut arşiv/PDF özellikleri korunur. */
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V15.8] Production bundle/index oluşmadı.');

fs.appendFileSync(APP, `\n;window.__AT_ANNUAL_FILTER_YAMAK_V158__='ANNUAL-FILTER-YAMAK-V15.8';\n`, 'utf8');
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15800');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V15.8 build tamamlandı: Yıllık Arşiv Ek Şart filtresi H3/Y2, H3/Y-2, H3Y2 ve H3Y-2 biçimlerini aynı görür; eski IndexedDB kayıtları yeniden indirilmez.');
