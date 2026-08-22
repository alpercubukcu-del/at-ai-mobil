const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v149-fixed.cjs');
const PUBLIC = path.join(ROOT, 'public');
const APP = path.join(PUBLIC, 'at-ai-app-v142.js');
const STYLE = path.join(PUBLIC, 'at-ai-styles-v141.css');
const INDEX = path.join(PUBLIC, 'index.html');
const ARCHIVE_JS = path.join(ROOT, 'daily-career-archive-v146.js');
const ARCHIVE_FIX_JS = path.join(ROOT, 'daily-career-archive-v1461-fix.js');
const PDF_V147_JS = path.join(ROOT, 'daily-career-pdf-v147.js');
const PDF_DIRECT_JS = path.join(ROOT, 'daily-career-pdf-v1471-fix.js');
const MODEL_AUTOARCHIVE_JS = path.join(ROOT, 'daily-career-model-autoarchive-v149.js');
const ARCHIVE_CSS = path.join(ROOT, 'daily-career-archive-v146.css');

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

for (const file of [APP, STYLE, INDEX, ARCHIVE_JS, ARCHIVE_FIX_JS, PDF_V147_JS, PDF_DIRECT_JS, MODEL_AUTOARCHIVE_JS, ARCHIVE_CSS]) {
  if (!fs.existsSync(file)) throw new Error(`[V15.0] Gerekli dosya bulunamadı: ${path.basename(file)}`);
}

fs.appendFileSync(APP, '\n;/* ===== daily-career-archive-v146.js ===== */\n' + fs.readFileSync(ARCHIVE_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-archive-v1461-fix.js ===== */\n' + fs.readFileSync(ARCHIVE_FIX_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-pdf-v147.js ===== */\n' + fs.readFileSync(PDF_V147_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-pdf-v1471-fix.js (V14.10 compact direct PDF runtime) ===== */\n' + fs.readFileSync(PDF_DIRECT_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-model-autoarchive-v149.js ===== */\n' + fs.readFileSync(MODEL_AUTOARCHIVE_JS, 'utf8') + '\n', 'utf8');

/* V15.1 — Aynı tarihte birden fazla hipodrom olduğunda günlük arşiv/PDF şehir bazında izole edilir. */
let appText = fs.readFileSync(APP, 'utf8');
function mustReplace(label, from, to) {
  if (!appText.includes(from)) throw new Error(`[V15.1] Şehir izolasyon yaması uygulanamadı: ${label}`);
  appText = appText.replace(from, to);
}

mustReplace(
  'archive delete city scope',
  `async function deleteDateA(date) {\n  const rows = await listDateA(date);\n  await Promise.all(rows.map(row => idbDeleteA(row.key)));\n  return rows.length;\n}`,
  `async function deleteDateA(date) {\n  const city = cleanA(typeof state !== 'undefined' ? state?.city : '');\n  const rows = (await listDateA(date)).filter(row => cleanA(row.city) === city);\n  await Promise.all(rows.map(row => idbDeleteA(row.key)));\n  return rows.length;\n}`
);

mustReplace(
  'archive dialog city scope',
  `  const all = await listDateA(date);\n  const races = all.filter(r => r.kind === 'race').sort((a,b) => cleanA(a.cityName).localeCompare(cleanA(b.cityName),'tr') || Number(a.raceNo)-Number(b.raceNo));`,
  `  const all = await listDateA(date);\n  const city = cleanA(typeof state !== 'undefined' ? state?.city : '');\n  const races = all.filter(r => r.kind === 'race' && cleanA(r.city) === city).sort((a,b) => Number(a.raceNo)-Number(b.raceNo));`
);

mustReplace(
  'archive delete confirmation city scope',
  `    $a('careerArchiveDeleteDayV146').onclick = async () => {\n      const date = cleanA(state?.date);\n      if (!date || !confirm(\`${'${date}'} tarihindeki tüm kariyer arşivini silmek istiyor musunuz?\`)) return;\n      const n = await deleteDateA(date);`,
  `    $a('careerArchiveDeleteDayV146').onclick = async () => {\n      const date = cleanA(state?.date), city = cleanA(state?.city);\n      const cityName = currentCityNameA() || city;\n      if (!date || !city || !confirm(\`${'${date}'} / ${'${cityName}'} için tüm kariyer arşivini silmek istiyor musunuz?\`)) return;\n      const n = await deleteDateA(date);`
);

mustReplace(
  'direct pdf buildPairs city parameter',
  `async function buildPairs(date,onlyKey='') {\n  const rows = await listDate(date);\n  let races = rows.filter(r => r.kind === 'race');\n  if (onlyKey) races = races.filter(r => r.key === onlyKey);`,
  `async function buildPairs(date,onlyKey='',onlyCity='') {\n  const rows = await listDate(date);\n  let races = rows.filter(r => r.kind === 'race');\n  if (onlyCity) races = races.filter(r => clean(r.city) === clean(onlyCity));\n  if (onlyKey) races = races.filter(r => r.key === onlyKey);`
);

mustReplace(
  'direct pdf daily export city scope',
  `async function exportDay(date=currentDate()) {\n  const pairs=await buildPairs(date);\n  return downloadPdf(date,pairs,'GUNLUK_5_MODEL_KARIYER');\n}`,
  `async function exportDay(date=currentDate()) {\n  const city=clean(typeof state !== 'undefined' ? state?.city : '');\n  if (!city) { alert('Günün PDF’i için önce şehir programını seçin.'); return; }\n  const pairs=await buildPairs(date,'',city);\n  const cityName=clean(pairs[0]?.race?.cityName || city);\n  return downloadPdf(date,pairs,\`${'${cityName}'}_GUNLUK_5_MODEL_KARIYER\`);\n}`
);

mustReplace(
  'direct pdf one-race city guard',
  `  const pairs=await buildPairs(rec.date,key);`,
  `  const pairs=await buildPairs(rec.date,key,rec.city);`
);

mustReplace(
  'direct pdf header city label',
  `    {text:\`${'${clean(date)}'} · ${'${pairs.length}'} koşu\`,fontSize:10,color:'#666666',margin:[0,0,0,10]},`,
  `    {text:\`${'${clean(date)}'} · ${'${clean(pairs[0]?.race?.cityName || pairs[0]?.race?.city)}'} · ${'${pairs.length}'} koşu\`,fontSize:10,color:'#666666',margin:[0,0,0,10]},`
);

fs.writeFileSync(APP, appText, 'utf8');
new Function(appText);
fs.appendFileSync(STYLE, '\n/* ===== daily-career-archive-v146.css ===== */\n' + fs.readFileSync(ARCHIVE_CSS, 'utf8') + '\n', 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html
  .replace(/\/at-ai-styles-v141\.css\?v=\d+/, '/at-ai-styles-v141.css?v=14100')
  .replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15101');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V15.1 build tamamlandı: günlük kariyer arşivi/PDF şehir bazında izole + kalıcı/otomatik 5 Model arşivi + V14.10 kompakt doğrudan PDF + güvenli yeniden hesaplama.');
