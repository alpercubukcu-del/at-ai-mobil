const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1699.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PATCH = path.join(ROOT, 'daily-career-archive-lite-v16910.js');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.10] Eksik dosya: ${path.basename(file)}`);
}
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.10] Build sonrası eksik dosya: ${path.relative(ROOT,file)}`);
}

const patch = fs.readFileSync(PATCH, 'utf8');
function section(name) {
  const start = `/* V16910:BEGIN ${name} */`;
  const end = `/* V16910:END ${name} */`;
  const from = patch.indexOf(start), to = patch.indexOf(end);
  if (from < 0 || to < 0 || to <= from) throw new Error(`[V16.9.10] Yama bölümü bulunamadı: ${name}`);
  return patch.slice(from + start.length, to).trim();
}

let app = fs.readFileSync(APP, 'utf8');
function mustReplace(label, from, to) {
  if (!app.includes(from)) throw new Error(`[V16.9.10] Metin yaması uygulanamadı: ${label}`);
  app = app.replace(from, to);
}
function mustReplacePattern(label, pattern, replacement) {
  if (!pattern.test(app)) throw new Error(`[V16.9.10] Fonksiyon yaması uygulanamadı: ${label}`);
  app = app.replace(pattern, replacement);
}

mustReplace(
  'hafif anahtar yardımcıları',
  '\n\nasync function deleteDateA(date)',
  `\n\n${section('core')}\n\nasync function deleteDateA(date)`
);
mustReplacePattern(
  'deleteDateA',
  /async function deleteDateA\(date\) \{[\s\S]*?\n\}\n\nfunction currentCityNameA/,
  `${section('deleteDateA')}\n\nfunction currentCityNameA`
);
mustReplacePattern(
  'updateArchiveToolbarA',
  /async function updateArchiveToolbarA\(\) \{[\s\S]*?\n\}\n\nasync function storageTextA/,
  `${section('updateArchiveToolbarA')}\n\nasync function storageTextA`
);
mustReplacePattern(
  'openArchiveDialogA',
  /async function openArchiveDialogA\(\) \{[\s\S]*?\n\}\n\nasync function renderArchiveDialogA/,
  `${section('openArchiveDialogA')}\n\nasync function renderArchiveDialogA`
);
mustReplacePattern(
  'renderArchiveDialogA',
  /async function renderArchiveDialogA\(\) \{[\s\S]*?\n\}\n\nfunction formatTimeA/,
  `${section('renderArchiveDialogA')}\n\nfunction formatTimeA`
);
mustReplace(
  'yeniden hesapla anahtar bazlı temizlik',
  `    const rows = await listDateA(date);\n    await Promise.all(rows.filter(r => cleanA(r.city) === city).map(r => idbDeleteA(r.key)));`,
  `    const rows = await listDateKeysA(date);\n    await Promise.all(rows.filter(r => cleanA(r.city) === city).map(r => idbDeleteA(r.key)));`
);
mustReplace(
  'şehir silme onayında ağır kayıt okuma',
  `      const sample = (await listDateA(date)).find(r => r.kind === 'race' && cleanA(r.city) === city);\n      const cityName = cleanA(sample?.cityName || city);`,
  `      const cityName = archiveCityLabelA(city);`
);

for (const token of [
  'listDateKeysA(date, kind',
  'index.openKeyCursor(range)',
  'Hafif liste etkin',
  'Günlük Arşiv açılıyor…',
  'await yieldArchivePaintA();\n  await renderArchiveDialogA();',
  'FIVE-MODEL-MOBILE-CACHE-V16.9.9',
  'FIVE-MODEL-REPAIR-PROGRESS-V16.9.7'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.10] Runtime doğrulaması başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169100');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169100')) {
  throw new Error('[V16.9.10] cache-bust güncellenemedi.');
}

console.log('[AT AI] V16.9.10 build tamamlandı: Günlük Arşiv anahtar-bazlı hafif liste; ayrıntılar isteğe bağlı yüklenir.');
