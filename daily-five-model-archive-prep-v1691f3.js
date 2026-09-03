/* AT AI Mobil — V16.9.1F56 Günlük 5 Model Arşiv Hazırlayıcı
   - Manuel 5 Model hazırlama, günlük IndexedDB arşiv wrapper'ını beklemez.
   - Mevcut prepareRaceModelsV11 motorunu doğrudan kullanır; puan/formül değiştirmez.
   - V16.8.7 paylaşılan cache/session katmanı yine kullanılır.
   - Takılmış shared inflight varsa F40 resetRace ile beklemeden temizlenir.
   - Hesap sonucu doğrulanır doğrulanmaz UI tamamlanır; IndexedDB yazımı arka planda yapılır.
   - Yeni timeout/watchdog eklenmez.
*/
(() => {
'use strict';
if (window.__AT_DAILY_FIVE_MODEL_ARCHIVE_PREP_V1691F3__) return;
window.__AT_DAILY_FIVE_MODEL_ARCHIVE_PREP_V1691F3__ = true;

const VERSION = 'DAILY-FIVE-MODEL-ARCHIVE-PREP-V16.9.1F3+F56-NONBLOCKING-STORAGE';
const RULE = 'YEAR_BY_YEAR_2000_PLUS';
const SOURCE = 'TOP3_PRE_RACE_FULL_CAREER';
const READ_MODE = 'MODEL_COMPUTE_FIRST_ARCHIVE_ASYNC';
const EXECUTION_MODE = 'PREPARE_RACE_MODELS_DIRECT';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
let busy = false;
let dbPromise = null;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

function currentDate() { return clean(state?.date || document.getElementById('raceDate')?.value); }
function currentCityKey() { return clean(state?.city || document.getElementById('citySelect')?.value); }
function currentCityName() {
  try { return clean(typeof getCityName === 'function' ? getCityName() : document.querySelector('#citySelect option:checked')?.textContent); }
  catch { return currentCityKey(); }
}
function programRaces() {
  return (Array.isArray(state?.races) ? state.races : [])
    .filter(r => r && r.no !== null && r.no !== undefined && r.no !== '')
    .sort((a,b) => Number(a.no || 0) - Number(b.no || 0));
}
function selectedRace() {
  const n = clean(document.getElementById('ceRace')?.value || state?.selectedRace || document.getElementById('analysisRace')?.value);
  return programRaces().find(r => String(r.no) === String(n)) || null;
}
function modelKey(raceNo) { return `model|${currentDate()}|${currentCityKey()}|${clean(raceNo)}`; }
function modelEngine() {
  try { return typeof CAREER_MODEL_TABS_VERSION !== 'undefined' ? CAREER_MODEL_TABS_VERSION : 'CAREER-MODEL'; }
  catch { return 'CAREER-MODEL'; }
}
function raceFingerprint(race) {
  if (!race) return '';
  const horses = (Array.isArray(race.horses) ? race.horses : [])
    .map(h => [clean(h?.no), clean(h?.id), clean(h?.name).toLocaleUpperCase('tr-TR')].join(':'))
    .sort();
  return [
    clean(race.no),
    clean(race.class || race.yaradi1),
    clean(race.ageGroup || race.yaradi2),
    clean(race.distance || race.mesafe),
    clean(race.track || race.pist),
    horses.join('|')
  ].join('||');
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let q;
    try { q = indexedDB.open(DB_NAME, 1); } catch { return resolve(null); }
    q.onupgradeneeded = () => {
      try {
        const db = q.result;
        const store = db.objectStoreNames.contains(STORE)
          ? q.transaction.objectStore(STORE)
          : db.createObjectStore(STORE, { keyPath:'key' });
        if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
        if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
      } catch {}
    };
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => { dbPromise = null; resolve(null); };
    q.onblocked = () => { dbPromise = null; resolve(null); };
  });
  return dbPromise;
}
async function dbPut(record) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function dbDelete(key) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

function setStatus(text, kind='') {
  const el = document.getElementById('ceDaily5StatusV1691F3');
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.style.color = kind === 'error' ? '#ff8c98' : kind === 'ok' ? '#7ee2a8' : kind === 'warn' ? '#ffbd82' : '';
}
function setButtons(disabled) {
  for (const id of ['ceDaily5AllV1691F3','ceDaily5OneV1691F3']) {
    const b = document.getElementById(id); if (b) b.disabled = disabled;
  }
}
function archiveFolderLabel(race) {
  return `${currentDate()} / ${currentCityName() || currentCityKey()} / ${race?.no}. Koşu`;
}
function sharedCache() {
  return window.ATFiveModelSharedCacheV1687 || window.ATFiveModelSharedCacheV1685 || null;
}
function sharedReady(raceNo) {
  try { return Boolean(sharedCache()?.has?.(raceNo)); } catch { return false; }
}
function clearOnlyStuckShared(race) {
  try {
    const shared = sharedCache();
    if (!shared?.pending?.(race?.no)) return false;
    if (window.ATCareerFiveModelStaleRecoveryV1691F40?.resetRace) {
      window.ATCareerFiveModelStaleRecoveryV1691F40.resetRace(race);
      console.info('[AT AI]', VERSION, 'takılmış shared 5 Model inflight beklenmeden temizlendi', { raceNo:race?.no });
      return true;
    }
  } catch (e) {
    console.warn('[AT AI]', VERSION, 'shared inflight temizleme uyarısı:', e?.message || e);
  }
  return false;
}
function queueArchiveWrite(race, data) {
  const date = currentDate();
  const city = currentCityKey();
  const key = modelKey(race?.no);
  const record = {
    key,
    kind:'model',
    schemaVersion:'DAILY-CAREER-ARCHIVE-V14.6',
    engine:modelEngine(),
    date,
    city,
    cityName:currentCityName(),
    raceNo:clean(race?.no),
    fingerprint:raceFingerprint(race),
    data,
    archivedAt:new Date().toISOString(),
    asyncArchiveVersion:VERSION
  };
  Promise.resolve()
    .then(() => dbPut(record))
    .then(ok => {
      if (!ok) console.warn('[AT AI]', VERSION, '5 Model hesaplandı fakat kalıcı IndexedDB arşiv yazımı tamamlanamadı.', { raceNo:race?.no });
      else {
        try { window.dispatchEvent(new CustomEvent('at-ai:daily-five-model-archive-updated', { detail:{ version:VERSION, date, city, raceNo:clean(race?.no) } })); } catch {}
      }
    })
    .catch(e => console.warn('[AT AI]', VERSION, 'arka plan arşiv yazımı hata:', e?.message || e));
}

async function prepareOne(race, progressText='') {
  if (!race) throw new Error('Koşu bulunamadı.');
  const direct = typeof prepareRaceModelsV11 === 'function';
  const legacy = typeof getCareerRaceModelsV112 === 'function';
  if (!direct && !legacy) throw new Error('5 Model motoru bulunamadı.');

  const cachedBefore = sharedReady(race.no);
  clearOnlyStuckShared(race);

  const started = performance.now();
  const progress = message => {
    const prefix = progressText ? `${progressText} · ` : '';
    setStatus(`${prefix}${clean(message) || `${race.no}. Koşu 5 Model hesaplanıyor…`}`);
  };

  progress(`${race.no}. Koşu · hesap motoru başlatıldı; arşiv yazımı hesabı bloklamayacak.`);

  /*
    F60.26: Manuel/gunluk hazirlama da Kariyer paneliyle ayni karar kapisindan gecer.
    Boylece Y/Y- sinif aliasi, telefondaki Yillik Arsiv tam eslesmeleri ve basarisiz
    cache korumalari atlanmaz. Yerel yol yoksa bu zincir zaten V11 uzak motora duser.
  */
  const data = legacy
    ? await getCareerRaceModelsV112(race)
    : await prepareRaceModelsV11(race, progress);

  const elapsed = Math.max(0, Math.round((performance.now() - started) / 1000));
  const horseCount = Array.isArray(data?.horses) ? data.horses.length : 0;
  const expected = Array.isArray(race?.horses) ? race.horses.length : 0;

  if (!data || data?.roadmapOk === false || (expected && horseCount !== expected)) {
    void dbDelete(modelKey(race.no));
    try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.delete([currentDate(), currentCityKey(), race.no].join('|')); } catch {}
    throw new Error(data?.roadmapError || `5 Model eksik (${horseCount}/${expected} at).`);
  }

  queueArchiveWrite(race, data);

  return {
    raceNo:String(race.no),
    cachedBefore,
    elapsed,
    modelCounts:data?.modelCounts || {},
    folder:archiveFolderLabel(race),
    archiveQueued:true,
    executionMode:EXECUTION_MODE
  };
}

async function prepareList(races, button) {
  if (busy) return;
  if (!currentDate() || !currentCityKey()) return setStatus('Önce tarih ve şehir programını yükleyin.','error');
  const list = (Array.isArray(races) ? races : []).filter(Boolean);
  if (!list.length) return setStatus('Hazırlanacak koşu bulunamadı.','error');
  busy = true;
  setButtons(true);
  const old = button?.textContent;
  let ok = 0, hit = 0, failed = 0;
  const errors = [];
  try {
    for (let i=0; i<list.length; i++) {
      const race = list[i];
      if (button) button.textContent = `${i+1}/${list.length} hazırlanıyor…`;
      const stage = `${i+1}/${list.length} · ${race.no}. Koşu`;
      setStatus(`${stage} · 2000+ tarihsel ilk 3/kariyer modeli hesaplanıyor…`);
      try {
        const r = await prepareOne(race, stage);
        ok++;
        if (r.cachedBefore) hit++;
        setStatus(`${stage} hazır${r.cachedBefore?' · cache kullanıldı':' · yeni hesap'} · ${r.elapsed} sn · arşiv yazımı arka planda`, 'ok');
      } catch (e) {
        failed++;
        errors.push(`${race.no}.K: ${e?.message || e}`);
        setStatus(`${stage} alınamadı; sıradaki koşuya geçiliyor…`,'warn');
      }
      await frame();
      await wait(180);
    }
    const fresh = ok - hit;
    const msg = `Günlük 5 Model: ${ok}/${list.length} hesap hazır · ${hit} cache · ${fresh} yeni${failed?` · ${failed} hata`:''}. Kalıcı arşiv yazımı hesabı bekletmez.`;
    setStatus(msg, failed && !ok ? 'error' : failed ? 'warn' : 'ok');
    if (errors.length) console.warn('[AT AI]', VERSION, 'hazırlama hataları:', errors);
  } finally {
    busy = false;
    setButtons(false);
    if (button) button.textContent = old || button.textContent;
  }
}

function inject() {
  const dialog = document.getElementById('careerExportDialog');
  const body = dialog?.querySelector('.ce-body');
  if (!body || document.getElementById('ceDaily5ArchiveV1691F3')) return false;
  const section = document.createElement('section');
  section.id = 'ceDaily5ArchiveV1691F3';
  section.className = 'ce-block';
  section.innerHTML = `
    <h3>⚡ Günlük 5 Model Arşivi · 2000+</h3>
    <p>Koşu programındaki 5 Model kaynaklarını <b>bir kez</b> hazırlar. Tarihsel tarama 2000’den hedef tarihe kadar <b>yıl yıl</b> yapılır; her geçmiş yarışın gerçek <b>ilk 3 atı</b> ve bu atların yarıştan önceki <b>tam kariyeri</b> kullanılır.</p>
    <div class="ce-actions" style="display:flex;flex-wrap:wrap;gap:8px">
      <button id="ceDaily5AllV1691F3" class="primary small">Günün Tüm Koşularını Hazırla</button>
      <button id="ceDaily5OneV1691F3" class="secondary small">Seçili Koşuyu Hazırla</button>
    </div>
    <small>F56: hesap motoru kalıcı arşiv yazımından ayrıldı. Model sonucu hazır olduğunda işlem tamamlanır; IndexedDB kaydı arka planda yapılır. Yeni bir zaman aşımı eklenmemiştir.</small>
    <div id="ceDaily5StatusV1691F3" style="margin-top:10px;font-size:12px;line-height:1.45;opacity:.9"></div>`;
  const full = document.getElementById('ceFullAnalysisV160')?.closest?.('.ce-block');
  if (full?.parentNode === body) full.insertAdjacentElement('afterend', section); else body.appendChild(section);
  document.getElementById('ceDaily5AllV1691F3').onclick = e => prepareList(programRaces(), e.currentTarget);
  document.getElementById('ceDaily5OneV1691F3').onclick = e => {
    const r = selectedRace();
    if (!r) return setStatus('Önce üstten bir koşu seçin.','error');
    prepareList([r], e.currentTarget);
  };
  setStatus(`${currentDate() || 'Tarih'} · ${currentCityName() || 'Şehir'} · ${programRaces().length} koşu programda. F60.26 ortak Kariyer/Yıllık Arşiv hesap yolu aktif.`);
  return true;
}

document.addEventListener('click', event => {
  if (event.target?.closest?.('#careerExportMenuBtn')) setTimeout(inject, 40);
}, true);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(inject, 250));
else setTimeout(inject, 250);
window.addEventListener('load', () => setTimeout(inject, 300));

window.ATDailyFiveModelArchivePrepV1691F3 = {
  version:VERSION,
  rule:RULE,
  source:SOURCE,
  readMode:READ_MODE,
  executionMode:EXECUTION_MODE,
  prepareAll:() => prepareList(programRaces(), document.getElementById('ceDaily5AllV1691F3')),
  prepareSelected:() => {
    const r=selectedRace();
    return r ? prepareList([r], document.getElementById('ceDaily5OneV1691F3')) : Promise.resolve(false);
  }
};
console.info('[AT AI]', VERSION, 'aktif — 5 Model hesap motoru doğrudan; IndexedDB arşiv yazımı non-blocking');
})();
