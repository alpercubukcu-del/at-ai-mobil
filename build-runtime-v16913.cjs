const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v16912.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PATCH = path.join(ROOT, 'five-model-roadmap-recovery-v16913.js');
const SKIP_BASE = process.env.AT_V16913_SKIP_BASE === '1';

for (const file of SKIP_BASE ? [PATCH] : [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.13] Eksik dosya: '+path.basename(file));
}
if (!SKIP_BASE) execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.13] Build sonrası eksik dosya: '+path.relative(ROOT,file));
}

let app = fs.readFileSync(APP, 'utf8');
const patchSource = fs.readFileSync(PATCH, 'utf8');
function mustReplaceOnce(label, before, after) {
  const count = app.split(before).length - 1;
  if (count !== 1) throw new Error('[V16.9.13] '+label+' beklenen 1, bulunan '+count);
  app = app.replace(before, after);
}

/* Başarısız roadmap sonucu at listesi taşısa bile kullanılabilir model değildir.
   Dört cache katmanı aynı kesin geçerlilik kuralını kullanır. */
mustReplaceOnce(
  'V16.9.9 paylaşılan bellek geçerliliği',
  'function valid(d){return !!d && Number(d?.no)>0 && Array.isArray(d?.horses) && d.horses.length>0;}',
  'function valid(d){return !!d && d?.roadmapOk===true && Number(d?.no)>0 && Array.isArray(d?.horses) && d.horses.length>0;}'
);
mustReplaceOnce(
  'V16.9.1 günlük arşiv geçerliliği',
  'function validModel(d){return!!d&&Number(d?.no)>0&&Array.isArray(d?.horses)&&d.horses.length>0;}',
  'function validModel(d){return!!d&&d?.roadmapOk===true&&Number(d?.no)>0&&Array.isArray(d?.horses)&&d.horses.length>0;}'
);
mustReplaceOnce(
  'V16.9.7 istek onarımı geçerliliği',
  "function validModel(data) {\n  return Boolean(data && Number(data?.no) > 0 && Array.isArray(data?.horses) && data.horses.length > 0);\n}",
  "function validModel(data) {\n  return Boolean(data && data?.roadmapOk === true && Number(data?.no) > 0 && Array.isArray(data?.horses) && data.horses.length > 0);\n}"
);
mustReplaceOnce(
  'V16.9.11 kompakt arşiv geçerliliği',
  "const valid = data => Boolean(data && Number(data?.no) > 0 && Array.isArray(data?.horses) && data.horses.length);",
  "const valid = data => Boolean(data && data?.roadmapOk === true && Number(data?.no) > 0 && Array.isArray(data?.horses) && data.horses.length);"
);

/* Yeni başarısız sonuç IndexedDB'deki önceki başarılı modeli ezmesin. */
mustReplaceOnce(
  'başarısız model arşiv yazma koruması',
  "async function idbPutA(value) {\n  const db = await openArchiveDbA();",
  "async function idbPutA(value) {\n  if (value?.kind === 'model' && value?.data?.roadmapOk !== true) return false;\n  const db = await openArchiveDbA();"
);

/* Ağ isteği hata nesnesiyle döndüğünde 100% Hazır yerine gerçek hata + Tekrar Dene göster. */
mustReplaceOnce(
  '5 Model hata sonucunu hazır göstermeme',
  "    const data = await getCareerRaceModelsV112(race);\n    const source = stats.archiveHits > before.archiveHits ? 'archive'",
  "    const data = await getCareerRaceModelsV112(race);\n    if (data?.roadmapOk !== true) throw new Error(data?.roadmapError || 'Tarihsel model verisi hazırlanamadı.');\n    const source = stats.archiveHits > before.archiveHits ? 'archive'"
);

app += '\n'+patchSource+'\n';
for (const token of [
  'FIVE-MODEL-ROADMAP-RECOVERY-V16.9.13',
  'd?.roadmapOk===true',
  'data?.roadmapOk === true',
  "value?.data?.roadmapOk !== true",
  "data?.roadmapOk !== true) throw new Error",
  'FIVE-MODEL-MAIN-THREAD-YIELD-V16.9.12',
  'FIVE-MODEL-ARCHIVE-COMPACT-V16.9.11'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.13] Runtime doğrulaması başarısız: '+token);
}
for (const forbidden of [
  'function valid(d){return !!d && Number(d?.no)>0 && Array.isArray(d?.horses) && d.horses.length>0;}',
  'function validModel(d){return!!d&&Number(d?.no)>0&&Array.isArray(d?.horses)&&d.horses.length>0;}'
]) {
  if (app.includes(forbidden)) throw new Error('[V16.9.13] Başarısız sonucu kabul eden eski cache kuralı kaldı.');
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169130');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169130')) throw new Error('[V16.9.13] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.13 build tamamlandı: tarihsel veri kurtarma + başarısız 5 Model cache geçersizleştirme.');
