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
const ARCHIVE_VIEWER_JS = path.join(ROOT, 'daily-career-archive-viewer-v152.js');
const ARCHIVE_CSS = path.join(ROOT, 'daily-career-archive-v146.css');
const SIMILAR_JS = path.join(ROOT, 'api', 'tjk-similar.js');

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

for (const file of [APP, STYLE, INDEX, ARCHIVE_JS, ARCHIVE_FIX_JS, PDF_V147_JS, PDF_DIRECT_JS, MODEL_AUTOARCHIVE_JS, ARCHIVE_VIEWER_JS, ARCHIVE_CSS, SIMILAR_JS]) {
  if (!fs.existsSync(file)) throw new Error(`[V15.2] Gerekli dosya bulunamadı: ${path.basename(file)}`);
}

fs.appendFileSync(APP, '\n;/* ===== daily-career-archive-v146.js ===== */\n' + fs.readFileSync(ARCHIVE_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-archive-v1461-fix.js ===== */\n' + fs.readFileSync(ARCHIVE_FIX_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-pdf-v147.js ===== */\n' + fs.readFileSync(PDF_V147_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-pdf-v1471-fix.js (V14.10 compact direct PDF runtime) ===== */\n' + fs.readFileSync(PDF_DIRECT_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-model-autoarchive-v149.js ===== */\n' + fs.readFileSync(MODEL_AUTOARCHIVE_JS, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, '\n;/* ===== daily-career-archive-viewer-v152.js ===== */\n' + fs.readFileSync(ARCHIVE_VIEWER_JS, 'utf8') + '\n', 'utf8');

let appText = fs.readFileSync(APP, 'utf8');
function mustReplace(label, from, to) {
  if (!appText.includes(from)) throw new Error(`[V15.2] Uygulama yaması uygulanamadı: ${label}`);
  appText = appText.replace(from, to);
}

/* V15.1 — Aynı tarihte birden fazla hipodrom olduğunda günlük arşiv/PDF şehir bazında izole edilir. */
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

/* V15.2 — Arşiv penceresinden program değiştirmeden şehir seçimi. */
mustReplace(
  'archive city tabs holder',
  `      <div class=\"career-archive-actions-v146\">`,
  `      <div id=\"careerArchiveCityTabsV152\" style=\"display:flex;gap:7px;flex-wrap:wrap;margin:0 0 10px\"></div>\n      <div class=\"career-archive-actions-v146\">`
);

mustReplace(
  'archive selected city delete scope',
  `async function deleteDateA(date) {\n  const city = cleanA(typeof state !== 'undefined' ? state?.city : '');\n  const rows = (await listDateA(date)).filter(row => cleanA(row.city) === city);\n  await Promise.all(rows.map(row => idbDeleteA(row.key)));\n  return rows.length;\n}`,
  `async function deleteDateA(date) {\n  const city = cleanA(window.__AT_ARCHIVE_CITY_V152 || (typeof state !== 'undefined' ? state?.city : ''));\n  const rows = (await listDateA(date)).filter(row => cleanA(row.city) === city);\n  await Promise.all(rows.map(row => idbDeleteA(row.key)));\n  return rows.length;\n}`
);

mustReplace(
  'archive city tabs render',
  `  const all = await listDateA(date);\n  const city = cleanA(typeof state !== 'undefined' ? state?.city : '');\n  const races = all.filter(r => r.kind === 'race' && cleanA(r.city) === city).sort((a,b) => Number(a.raceNo)-Number(b.raceNo));`,
  `  const all = await listDateA(date);\n  const cityRows = all.filter(r => r.kind === 'race');\n  const cityGroups = new Map();\n  for (const row of cityRows) {\n    const id = cleanA(row.city);\n    if (!id) continue;\n    const item = cityGroups.get(id) || { name:cleanA(row.cityName || row.city), count:0 };\n    item.count++;\n    cityGroups.set(id,item);\n  }\n  let city = cleanA(window.__AT_ARCHIVE_CITY_V152 || (typeof state !== 'undefined' ? state?.city : ''));\n  if (!cityGroups.has(city)) city = cityGroups.keys().next().value || city;\n  window.__AT_ARCHIVE_CITY_V152 = city;\n  const tabs = $a('careerArchiveCityTabsV152');\n  if (tabs) {\n    tabs.innerHTML = [...cityGroups.entries()]\n      .sort((a,b) => cleanA(a[1].name).localeCompare(cleanA(b[1].name),'tr'))\n      .map(([id,g]) => \`<button type=\"button\" class=\"${'${id === city ? \'primary\' : \'secondary\'}'} small\" data-archive-city-v152=\"${'${escA(id)}'}\">${'${escA(g.name)}'} (${'${g.count}'})</button>\`)\n      .join('');\n    tabs.querySelectorAll('[data-archive-city-v152]').forEach(btn => btn.onclick = async () => {\n      window.__AT_ARCHIVE_CITY_V152 = cleanA(btn.dataset.archiveCityV152);\n      await renderArchiveDialogA();\n    });\n  }\n  const races = cityRows.filter(r => cleanA(r.city) === city).sort((a,b) => Number(a.raceNo)-Number(b.raceNo));`
);

mustReplace(
  'archive selected city delete confirmation',
  `    $a('careerArchiveDeleteDayV146').onclick = async () => {\n      const date = cleanA(state?.date), city = cleanA(state?.city);\n      const cityName = currentCityNameA() || city;\n      if (!date || !city || !confirm(\`${'${date}'} / ${'${cityName}'} için tüm kariyer arşivini silmek istiyor musunuz?\`)) return;\n      const n = await deleteDateA(date);`,
  `    $a('careerArchiveDeleteDayV146').onclick = async () => {\n      const date = cleanA(state?.date), city = cleanA(window.__AT_ARCHIVE_CITY_V152 || state?.city);\n      const sample = (await listDateA(date)).find(r => r.kind === 'race' && cleanA(r.city) === city);\n      const cityName = cleanA(sample?.cityName || city);\n      if (!date || !city || !confirm(\`${'${date}'} / ${'${cityName}'} için tüm kariyer arşivini silmek istiyor musunuz?\`)) return;\n      const n = await deleteDateA(date);`
);

mustReplace(
  'archive delete button wording',
  `>Günün Tümünü Sil</button>`,
  `>Seçili Şehri Sil</button>`
);

mustReplace(
  'direct pdf export city override',
  `async function exportDay(date=currentDate()) {\n  const city=clean(typeof state !== 'undefined' ? state?.city : '');\n  if (!city) { alert('Günün PDF’i için önce şehir programını seçin.'); return; }\n  const pairs=await buildPairs(date,'',city);\n  const cityName=clean(pairs[0]?.race?.cityName || city);\n  return downloadPdf(date,pairs,\`${'${cityName}'}_GUNLUK_5_MODEL_KARIYER\`);\n}`,
  `async function exportDay(date=currentDate(),cityOverride='') {\n  const city=clean(cityOverride || (typeof state !== 'undefined' ? state?.city : ''));\n  if (!city) { alert('Günün PDF’i için arşivden bir şehir seçin.'); return; }\n  const pairs=await buildPairs(date,'',city);\n  const cityName=clean(pairs[0]?.race?.cityName || city);\n  return downloadPdf(date,pairs,\`${'${cityName}'}_GUNLUK_5_MODEL_KARIYER\`);\n}`
);

mustReplace(
  'direct pdf archive selected city event',
  `  const job=target.matches('[data-pdf]')?exportOne(target.dataset.pdf):exportDay(currentDate());`,
  `  const archiveCity=target.closest?.('#careerArchiveDialogV146') ? clean(window.__AT_ARCHIVE_CITY_V152 || '') : '';\n  const job=target.matches('[data-pdf]')?exportOne(target.dataset.pdf):exportDay(currentDate(),archiveCity);`
);

fs.writeFileSync(APP, appText, 'utf8');
new Function(appText);
fs.appendFileSync(STYLE, '\n/* ===== daily-career-archive-v146.css ===== */\n' + fs.readFileSync(ARCHIVE_CSS, 'utf8') + '\n', 'utf8');

/* V15.2 — ŞARTLI 5 /DHÖW/Y-1 gibi sınıflarda TJK sorgu tablosunun dekoratörleri düşürmesine tolerans. */
let similarText = fs.readFileSync(SIMILAR_JS, 'utf8');
function mustReplaceSimilar(label, from, to) {
  if (!similarText.includes(from)) throw new Error(`[V15.2] tjk-similar yaması uygulanamadı: ${label}`);
  similarText = similarText.replace(from, to);
}

mustReplaceSimilar(
  'similar api version',
  `const VERSION = 'TJK-EXACT-HISTORY-V7.2.1';`,
  `const VERSION = 'TJK-EXACT-HISTORY-V7.2.2';`
);

mustReplaceSimilar(
  'query candidate class key',
  `function queryClassKey(v = '') {\n  const family = parseRaceFamily(v);\n  const tokens = classTokens(v).filter(x => !/^Y\\d+$/.test(x));\n  return \`${'${family.family}'}:${'${family.level ?? \'\'}'}|${'${tokens.join(\'/\')}'}\`;\n}`,
  `function queryClassKey(v = '') {\n  const family = parseRaceFamily(v);\n  return \`${'${family.family}'}:${'${family.level ?? \'\'}'}\`;\n}`
);

mustReplaceSimilar(
  'final class compatibility helper',
  `function classCoreKey(v = '') {\n  const family = parseRaceFamily(v);\n  return \`${'${family.family}'}:${'${family.level ?? \'\'}'}|${'${classTokens(v).join(\'/\')}'}\`;\n}`,
  `function classCoreKey(v = '') {\n  const family = parseRaceFamily(v);\n  return \`${'${family.family}'}:${'${family.level ?? \'\'}'}|${'${classTokens(v).join(\'/\')}'}\`;\n}\n\nfunction classCoreCompatible(a = '', b = '') {\n  const fa = parseRaceFamily(a), fb = parseRaceFamily(b);\n  if (fa.family !== fb.family || fa.level !== fb.level) return false;\n  const ta = classTokens(a), tb = classTokens(b);\n  const stableA = ta.filter(x => !/^Y\\d+$/.test(x));\n  const stableB = tb.filter(x => !/^Y\\d+$/.test(x));\n  if (stableA.join('/') !== stableB.join('/')) return false;\n  const ya = ta.find(x => /^Y\\d+$/.test(x)) || '';\n  const yb = tb.find(x => /^Y\\d+$/.test(x)) || '';\n  return !ya || !yb || ya === yb;\n}`
);

mustReplaceSimilar(
  'final verify class comparison',
  `    const classMatch = classCoreKey(parsed.classText) === classCoreKey(target.class);`,
  `    const classMatch = classCoreCompatible(parsed.classText, target.class);`
);

fs.writeFileSync(SIMILAR_JS, similarText, 'utf8');
new Function(similarText.replace(/^import .*$/mg,'').replace(/export default /g,'').replace(/export async function /g,'async function '));

let html = fs.readFileSync(INDEX, 'utf8');
html = html
  .replace(/\/at-ai-styles-v141\.css\?v=\d+/, '/at-ai-styles-v141.css?v=14100')
  .replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15200');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V15.2 build tamamlandı: günlük arşivde şehir sekmeleri + şehirler arası salt-okunur arşiv görüntüleme/PDF + ŞARTLI dekoratör/Y-1 tarihsel eşleştirme toleransı.');
