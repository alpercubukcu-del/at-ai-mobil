const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v16910.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PATCH = path.join(ROOT, 'five-model-archive-compact-v16911.js');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.11] Eksik dosya: ${path.basename(file)}`);
}
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.11] Build sonrası eksik dosya: ${path.relative(ROOT,file)}`);
}

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8');
function mustReplacePattern(label, pattern, replacement) {
  if (!pattern.test(app)) throw new Error(`[V16.9.11] Fonksiyon yaması uygulanamadı: ${label}`);
  app = app.replace(pattern, replacement);
}

mustReplacePattern(
  'model arşivi kompakt yazma',
  /async function idbPutA\(value\) \{[\s\S]*?\n\}\n\nasync function idbDeleteA/,
  `async function idbPutA(value) {
  const db = await openArchiveDbA();
  if (!db) return false;
  const compactApi = window.ATFiveModelArchiveCompactV16911;
  const prepared = value?.kind === 'model' ? (compactApi?.prepareRecord?.(value) || value) : value;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(prepared);
      tx.oncomplete = () => {
        if (prepared?.kind === 'model' && prepared?.compactArchiveV16911) compactApi?.mark?.(prepared.key);
        resolve(true);
      };
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function idbDeleteA`
);

mustReplacePattern(
  'model arşiv işaretini silme',
  /async function idbDeleteA\(key\) \{[\s\S]*?\n\}\n\nasync function listDateA/,
  `async function idbDeleteA(key) {
  const db = await openArchiveDbA();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => {
        if (String(key || '').startsWith('model|')) window.ATFiveModelArchiveCompactV16911?.forget?.(key);
        resolve(true);
      };
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function listDateA`
);

mustReplacePattern(
  'eski ham model kaydını okumadan silme',
  /async function readArchive\(race\) \{[\s\S]*?\n\}\nfunction sharedModel/,
  `async function readArchive(race) {
  const key = archiveKey(race);
  const compactApi = window.ATFiveModelArchiveCompactV16911;
  if (!compactApi?.canRead?.(key)) {
    try { await compactApi?.discardLegacy?.(key); } catch {}
    return null;
  }
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      request.onsuccess = () => {
        const record = request.result;
        const safe = record?.compactArchiveV16911 === true
          && record?.kind === 'model'
          && validModel(record?.data);
        if (!safe) compactApi?.forget?.(key);
        resolve(safe ? record.data : null);
      };
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
function sharedModel`
);

const oldPhase = 'Arşiv ve istek onarımı denetleniyor';
const phaseCount = app.split(oldPhase).length - 1;
if (phaseCount !== 2) throw new Error(`[V16.9.11] İlerleme aşaması beklenmedik sayıda: ${phaseCount}`);
app = app.split(oldPhase).join('Hafif önbellek ve tek istek denetleniyor');
const oldNote = 'İstek Onarımı: günlük arşiv → oturum önbelleği → tek ağ isteği sırasıyla kontrol edilir; yinelenen işler engellenir.';
if (!app.includes(oldNote)) throw new Error('[V16.9.11] İstek onarım açıklaması bulunamadı.');
app = app.replace(oldNote, 'İstek Onarımı: eski büyük 5 Model kaydı okunmadan temizlenir; hafif önbellek → tek ağ isteği kullanılır.');

const sourceTextOld = "if (source === 'archive') return 'Günlük arşivden hazırlandı';";
const sourceTextNew = "if (source === 'archive') return 'Kayıtlı sonuç · siz temizleyene kadar kullanılacak';";
if (!app.includes(sourceTextOld)) throw new Error('[V16.9.11] Kayıtlı sonuç kaynak metni bulunamadı.');
app = app.replace(sourceTextOld, sourceTextNew);
const readyTextOld = "if (small) small.textContent = 'Hazır · sekmeleri açabilirsiniz';";
const readyTextNew = "if (small) small.textContent = 'Kayıtlı · Bileşik · Tam · İkiz · Aile · Kariyer';";
if (!app.includes(readyTextOld)) throw new Error('[V16.9.11] 5 Model hazır başlığı bulunamadı.');
app = app.replace(readyTextOld, readyTextNew);

app += `\n${patch}\n`;
for (const token of [
  'FIVE-MODEL-ARCHIVE-COMPACT-V16.9.11',
  'compactApi?.discardLegacy?.(key)',
  "prepared?.kind === 'model' && prepared?.compactArchiveV16911",
  'Hafif önbellek ve tek istek denetleniyor',
  'eski büyük 5 Model kaydı okunmadan temizlenir',
  'persistentUntilClear:true',
  'Kayıtlı sonuç açılıyor…',
  'Kayıtlı · Bileşik · Tam · İkiz · Aile · Kariyer',
  'Kayıtlı sonuç · siz temizleyene kadar kullanılacak',
  'Günlük Arşiv açılıyor…',
  'FIVE-MODEL-MOBILE-CACHE-V16.9.9'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.11] Runtime doğrulaması başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169110');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169110')) throw new Error('[V16.9.11] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.11 build tamamlandı: 5 Model kompakt sonucu temizlenene kadar Bileşik/Tam/İkiz/Aile/Kariyer altında kalıcıdır.');
