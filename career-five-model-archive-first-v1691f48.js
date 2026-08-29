/* AT AI Mobil - V16.9.1F48 Daily 5 Model Archive First
   - 5 Model paneli ve hazirlayici once kalici IndexedDB gunluk model arsivini okur.
   - Kayit gecerliyse tarihsel tarama/kariyer zinciri yeniden baslatilmaz.
   - Eksik kayit hesaplaninca ayni kalici arsive yazilir.
   - Kariyer Excel disari aktarim menüsüne 5 Model arşiv temizleme kontrolleri eklenir.
*/
(() => {
'use strict';
if (window.__AT_DAILY_FIVE_MODEL_ARCHIVE_FIRST_V1691F48__) return;
window.__AT_DAILY_FIVE_MODEL_ARCHIVE_FIRST_V1691F48__ = true;

const VERSION = 'DAILY-FIVE-MODEL-ARCHIVE-FIRST-V16.9.1F48';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const SESSION_KEY = 'at_ai_five_model_compact_v1687';
const IDB_TIMEOUT_MS = 2200;
const MAX_SESSION_RECORDS = 24;

let dbPromise = null;
let forceArchiveSkipUntil = 0;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = value => clean(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const finite = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const fold = value => clean(value)
  .toLocaleUpperCase('tr-TR')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/İ/g, 'I')
  .replace(/[^A-Z0-9]+/g, '');

function currentDate() {
  return clean(window.state?.date || document.getElementById('raceDate')?.value);
}

function currentCityKey() {
  return clean(window.state?.city || document.getElementById('citySelect')?.value);
}

function currentCityName() {
  try {
    return clean(typeof getCityName === 'function' ? getCityName() : document.querySelector('#citySelect option:checked')?.textContent);
  } catch {
    return currentCityKey();
  }
}

function programRaces() {
  return (Array.isArray(window.state?.races) ? window.state.races : [])
    .filter(r => r && r.no !== null && r.no !== undefined && r.no !== '')
    .sort((a, b) => Number(a.no || 0) - Number(b.no || 0));
}

function currentRace(raceNo) {
  const n = clean(raceNo);
  if (!n) return null;
  return programRaces().find(r => clean(r?.no) === n) || null;
}

function modelKey(raceNo) {
  return `model|${currentDate()}|${currentCityKey()}|${clean(raceNo)}`;
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

function modelRecordMatches(record, race) {
  if (!record || record.kind !== 'model' || !race) return false;
  if (clean(record.date) !== currentDate() || clean(record.city) !== currentCityKey()) return false;
  if (clean(record.raceNo) !== clean(race.no)) return false;
  return Boolean(record.fingerprint && record.fingerprint === raceFingerprint(race));
}

function validModelData(data, race) {
  if (!data || typeof data !== 'object') return false;
  if (data.roadmapOk === false || data.ok === false) return false;
  if (Number(data.no || race?.no || 0) <= 0) return false;
  const horses = Array.isArray(data.horses) ? data.horses : [];
  const expected = Array.isArray(race?.horses) ? race.horses.length : 0;
  if (!horses.length) return false;
  if (expected && horses.length !== expected) return false;
  return true;
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req = null;
    let settled = false;
    let timer = null;
    const done = value => {
      if (settled) {
        if (value && typeof value.close === 'function') {
          try { value.close(); } catch {}
        }
        return;
      }
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value || null);
    };
    timer = setTimeout(() => done(null), IDB_TIMEOUT_MS);
    try { req = indexedDB.open(DB_NAME, 1); } catch { return done(null); }
    req.onupgradeneeded = () => {
      try {
        const db = req.result;
        const store = db.objectStoreNames.contains(STORE)
          ? req.transaction.objectStore(STORE)
          : db.createObjectStore(STORE, { keyPath:'key' });
        if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
        if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
      } catch {}
    };
    req.onblocked = () => done(null);
    req.onsuccess = () => done(req.result);
    req.onerror = () => done(null);
  });
  return dbPromise;
}

async function dbGet(key) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return null;
  return new Promise(resolve => {
    let settled = false;
    let timer = null;
    const done = value => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value || null);
    };
    timer = setTimeout(() => done(null), IDB_TIMEOUT_MS);
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => done(req.result || null);
      req.onerror = () => done(null);
    } catch {
      done(null);
    }
  });
}

async function dbPut(record) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return false;
  return new Promise(resolve => {
    let settled = false;
    let timer = null;
    const done = value => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(Boolean(value));
    };
    timer = setTimeout(() => done(false), IDB_TIMEOUT_MS);
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => done(true);
      tx.onerror = tx.onabort = () => done(false);
    } catch {
      done(false);
    }
  });
}

async function listModelRecords({ currentOnly = false } = {}) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return [];
  return new Promise(resolve => {
    const rows = [];
    let settled = false;
    let timer = null;
    const done = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(rows);
    };
    timer = setTimeout(done, IDB_TIMEOUT_MS);
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = currentOnly && store.indexNames.contains('date')
        ? store.index('date').openCursor(IDBKeyRange.only(currentDate()))
        : store.openCursor();
      req.onsuccess = () => {
        if (settled) return;
        const cursor = req.result;
        if (!cursor) return;
        const row = cursor.value;
        if (row?.kind === 'model' && (!currentOnly || clean(row.city) === currentCityKey())) rows.push(row);
        cursor.continue();
      };
      tx.oncomplete = done;
      tx.onerror = tx.onabort = done;
    } catch {
      done();
    }
  });
}

async function deleteModelRecords({ currentOnly = false } = {}) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return 0;
  return new Promise(resolve => {
    let count = 0;
    let settled = false;
    let timer = null;
    const done = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(count);
    };
    timer = setTimeout(done, IDB_TIMEOUT_MS * 2);
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = currentOnly && store.indexNames.contains('date')
        ? store.index('date').openCursor(IDBKeyRange.only(currentDate()))
        : store.openCursor();
      req.onsuccess = () => {
        if (settled) return;
        const cursor = req.result;
        if (!cursor) return;
        const row = cursor.value;
        if (row?.kind === 'model' && (!currentOnly || clean(row.city) === currentCityKey())) {
          cursor.delete();
          count++;
        }
        cursor.continue();
      };
      tx.oncomplete = done;
      tx.onerror = tx.onabort = done;
    } catch {
      done();
    }
  });
}

function compactHorse(h = {}) {
  return {
    id: clean(h?.id ?? h?.horseId ?? h?.At_ID ?? h?.atId),
    horseId: clean(h?.horseId ?? h?.id ?? h?.At_ID ?? h?.atId),
    atId: clean(h?.atId ?? h?.id ?? h?.horseId ?? h?.At_ID),
    no: finite(h?.no ?? h?.Program_No ?? h?.programNo),
    name: clean(h?.name ?? h?.horseName ?? h?.At_Adı ?? h?.At_Adi),
    hp: finite(h?.hp ?? h?.HP)
  };
}

function compactChannel(src = {}) {
  const out = {};
  for (const k of ['score','rawScore','decisionScore','coverageYears','strongYears','supportYears','latestScore','mode','analysisMode','modeRank','modeSize','coverage','usedWeight','modeAware','targetFinish']) {
    const value = src?.[k];
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(Number(value))) out[k] = value;
  }
  if (Array.isArray(src?.present)) out.present = src.present.map(clean).filter(Boolean);
  if (Array.isArray(src?.missing)) out.missing = src.missing.map(clean).filter(Boolean);
  return out;
}

function compactScores(src = {}) {
  const out = { analysisMode: src?.analysisMode || null };
  if (src?.podiumSimilarityVersion) out.podiumSimilarityVersion = src.podiumSimilarityVersion;
  for (const id of ['exact','twin','family','career','composite']) out[id] = compactChannel(src?.[id] || {});
  if (src?.byFinish && typeof src.byFinish === 'object') {
    out.byFinish = {};
    for (const f of ['1','2','3']) {
      const value = src.byFinish[f] || src.byFinish[Number(f)];
      if (value) out.byFinish[f] = {
        targetFinish: value?.targetFinish,
        analysisMode: value?.analysisMode,
        exact: compactChannel(value?.exact || {}),
        twin: compactChannel(value?.twin || {}),
        family: compactChannel(value?.family || {}),
        career: compactChannel(value?.career || {}),
        composite: compactChannel(value?.composite || {})
      };
    }
  }
  return out;
}

function compactModel(data = {}, race = {}) {
  return {
    no: Number(data?.no || race?.no) || 0,
    roadmapOk: data?.roadmapOk !== false,
    roadmapError: clean(data?.roadmapError),
    modelCounts: data?.modelCounts && typeof data.modelCounts === 'object' ? data.modelCounts : {},
    compactSession: true,
    compactVersion: VERSION,
    horses: (Array.isArray(data?.horses) ? data.horses : []).map(item => ({
      horse: compactHorse(item?.horse || {}),
      careerOk: item?.careerOk !== false,
      careerError: clean(item?.careerError),
      scores: compactScores(item?.scores || {})
    }))
  };
}

function sessionLoad() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function sessionSave(store) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

function sharedSessionKey(raceNo) {
  try {
    if (window.ATFiveModelSharedCacheV1685?.key) return window.ATFiveModelSharedCacheV1685.key(raceNo);
  } catch {}
  return [currentDate(), fold(currentCityName()), Number(raceNo) || 0].join('|');
}

function hydrateSession(race, data) {
  try {
    const key = sharedSessionKey(race?.no);
    if (!key || !validModelData(data, race)) return false;
    const store = sessionLoad();
    store[key] = { savedAt: Date.now(), source:'daily-model-archive-f48', data: compactModel(data, race) };
    const keys = Object.keys(store);
    if (keys.length > MAX_SESSION_RECORDS) {
      keys.sort((a, b) => (Number(store[a]?.savedAt) || 0) - (Number(store[b]?.savedAt) || 0));
      for (const old of keys.slice(0, keys.length - MAX_SESSION_RECORDS)) delete store[old];
    }
    return sessionSave(store);
  } catch {
    return false;
  }
}

function hydrateRuntimeCaches(race, data) {
  hydrateSession(race, data);
  try {
    if (typeof careerModelCacheV112 !== 'undefined' && typeof careerModelKeyV112 === 'function' && careerModelCacheV112?.set) {
      careerModelCacheV112.set(careerModelKeyV112(race), data);
    }
  } catch {}
  try {
    const map = window.manualTicketV117?.raceDataMap;
    if (map instanceof Map && race?.no) map.set(String(race.no), data);
  } catch {}
}

function clearRuntimeCaches() {
  try { window.ATFiveModelSharedCacheV1685?.clear?.(); } catch {}
  try { window.ATFiveModelSharedCacheV1687?.clear?.(); } catch {}
  try { if (typeof careerModelCacheV112 !== 'undefined' && careerModelCacheV112?.clear) careerModelCacheV112.clear(); } catch {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

function markPanelArchiveHit(race) {
  try {
    const box = document.getElementById('careerFiveModelV139');
    const small = box?.querySelector?.('summary small');
    if (small && (!race || clean(race.no) === clean(document.getElementById('analysisRace')?.value))) {
      small.textContent = 'Kalıcı 5 Model arşivinden açıldı';
    }
  } catch {}
}

async function getArchivedModel(race) {
  if (!race || Date.now() < forceArchiveSkipUntil) return null;
  const record = await dbGet(modelKey(race.no));
  if (!modelRecordMatches(record, race) || !validModelData(record?.data, race)) return null;
  hydrateRuntimeCaches(race, record.data);
  markPanelArchiveHit(race);
  return record.data;
}

async function saveArchivedModel(race, data, reason) {
  if (!race || !validModelData(data, race)) return false;
  const record = {
    key: modelKey(race.no),
    kind: 'model',
    schemaVersion: VERSION,
    engine: VERSION,
    date: currentDate(),
    city: currentCityKey(),
    cityName: currentCityName(),
    raceNo: String(race.no),
    fingerprint: raceFingerprint(race),
    data,
    archiveSource: 'career-five-model',
    archiveRule: 'YEAR_BY_YEAR_2000_PLUS_TOP3_PRE_RACE_FULL_CAREER',
    archiveReason: reason || '',
    archivedAt: new Date().toISOString()
  };
  const ok = await dbPut(record);
  if (ok) hydrateRuntimeCaches(race, data);
  return ok;
}

function wrapPrepareRaceModels() {
  if (typeof prepareRaceModelsV11 !== 'function' || prepareRaceModelsV11.__atArchiveFirstF48) return false;
  const basePrepare = prepareRaceModelsV11;
  const wrapped = async function(race, progressCb, ...rest) {
    const archived = await getArchivedModel(race);
    if (validModelData(archived, race)) {
      try { progressCb?.(`Koşu ${race?.no}: kalıcı günlük 5 Model arşivi kullanılıyor; tarihsel tarama yapılmıyor.`); } catch {}
      return archived;
    }
    const data = await basePrepare.call(this, race, progressCb, ...rest);
    try { await saveArchivedModel(race, data, 'prepareRaceModelsV11'); } catch {}
    return data;
  };
  wrapped.__atArchiveFirstF48 = true;
  prepareRaceModelsV11 = wrapped;
  return true;
}

function wrapGetCareerRaceModels() {
  if (typeof getCareerRaceModelsV112 !== 'function' || getCareerRaceModelsV112.__atArchiveFirstF48) return false;
  const baseGet = getCareerRaceModelsV112;
  const wrapped = async function(race, ...rest) {
    const archived = await getArchivedModel(race);
    if (validModelData(archived, race)) return archived;
    const data = await baseGet.call(this, race, ...rest);
    try { await saveArchivedModel(race, data, 'getCareerRaceModelsV112'); } catch {}
    return data;
  };
  wrapped.__atArchiveFirstF48 = true;
  getCareerRaceModelsV112 = wrapped;
  return true;
}

async function hydrateCurrent() {
  let count = 0;
  for (const race of programRaces()) {
    try {
      const data = await getArchivedModel(race);
      if (validModelData(data, race)) count++;
    } catch {}
  }
  return count;
}

function countText(records) {
  const expected = programRaces().length;
  const count = Array.isArray(records) ? records.length : 0;
  return `${currentDate() || 'Tarih'} / ${currentCityName() || 'Şehir'} kalıcı 5 Model arşivi: ${count}${expected ? `/${expected}` : ''} kayıt.`;
}

async function refreshPrepUiStatus() {
  const el = document.getElementById('ceDaily5ArchiveStatusV1691F48');
  if (!el) return;
  const rows = await listModelRecords({ currentOnly:true });
  el.textContent = countText(rows) + ' Panel önce bu kaydı okuyacak; eksik koşu varsa onu hesaplayacak.';
}

function makeButton(id, text, className) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = id;
  btn.className = className || 'secondary small';
  btn.textContent = text;
  return btn;
}

function enhancePrepUi() {
  const section = document.getElementById('ceDaily5ArchiveV1691F3');
  if (!section) return false;
  const actions = section.querySelector('.ce-actions') || section;
  if (!document.getElementById('ceDaily5ClearCurrentV1691F48')) {
    const clearCurrent = makeButton('ceDaily5ClearCurrentV1691F48', 'Bugünün 5 Model Arşivini Temizle', 'secondary small');
    clearCurrent.onclick = async () => {
      if (!confirm(`${currentDate() || 'Bugün'} / ${currentCityName() || currentCityKey()} için 5 Model arşivi temizlensin mi?`)) return;
      forceArchiveSkipUntil = Date.now() + 12000;
      const n = await deleteModelRecords({ currentOnly:true });
      clearRuntimeCaches();
      await refreshPrepUiStatus();
      try { alert(`${n} adet 5 Model arşiv kaydı temizlendi.`); } catch {}
    };
    actions.appendChild(clearCurrent);
  }
  if (!document.getElementById('ceDaily5ClearAllV1691F48')) {
    const clearAll = makeButton('ceDaily5ClearAllV1691F48', 'Tüm 5 Model Arşivini Temizle', 'danger-ghost');
    clearAll.onclick = async () => {
      if (!confirm('Tarayıcıdaki tüm 5 Model arşiv kayıtları temizlensin mi? Kariyer arşiv PDF kayıtlarına dokunulmaz.')) return;
      forceArchiveSkipUntil = Date.now() + 12000;
      const n = await deleteModelRecords({ currentOnly:false });
      clearRuntimeCaches();
      await refreshPrepUiStatus();
      try { alert(`${n} adet 5 Model arşiv kaydı temizlendi.`); } catch {}
    };
    actions.appendChild(clearAll);
  }
  if (!document.getElementById('ceDaily5ArchiveStatusV1691F48')) {
    const line = document.createElement('small');
    line.id = 'ceDaily5ArchiveStatusV1691F48';
    line.style.display = 'block';
    line.style.marginTop = '8px';
    line.style.opacity = '.82';
    section.appendChild(line);
  }
  refreshPrepUiStatus().catch(() => {});
  return true;
}

function armRecomputeCacheGuard() {
  document.addEventListener('click', event => {
    if (!event.target?.closest?.('#careerArchiveRecalcV146')) return;
    forceArchiveSkipUntil = Date.now() + 60000;
    clearRuntimeCaches();
  }, true);
}

function boot() {
  wrapPrepareRaceModels();
  wrapGetCareerRaceModels();
  enhancePrepUi();
  setTimeout(enhancePrepUi, 300);
  setTimeout(() => hydrateCurrent().catch(() => {}), 600);
  const mo = new MutationObserver(() => enhancePrepUi());
  try { mo.observe(document.documentElement, { childList:true, subtree:true }); } catch {}
  document.addEventListener('click', event => {
    if (event.target?.closest?.('#careerExportMenuBtn')) setTimeout(enhancePrepUi, 80);
  }, true);
  armRecomputeCacheGuard();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATDailyFiveModelArchiveFirstV1691F48 = {
  version: VERSION,
  dbName: DB_NAME,
  store: STORE,
  key: modelKey,
  get: raceNo => getArchivedModel(currentRace(raceNo)),
  hydrateCurrent,
  stats: async () => ({
    version: VERSION,
    currentDate: currentDate(),
    currentCity: currentCityKey(),
    currentModels: (await listModelRecords({ currentOnly:true })).length,
    allModels: (await listModelRecords({ currentOnly:false })).length
  }),
  clearCurrent: async () => {
    forceArchiveSkipUntil = Date.now() + 12000;
    const n = await deleteModelRecords({ currentOnly:true });
    clearRuntimeCaches();
    await refreshPrepUiStatus();
    return n;
  },
  clearAll: async () => {
    forceArchiveSkipUntil = Date.now() + 12000;
    const n = await deleteModelRecords({ currentOnly:false });
    clearRuntimeCaches();
    await refreshPrepUiStatus();
    return n;
  }
};

console.info('[AT AI]', VERSION, 'aktif - 5 Model kalici gunluk arsiv once okunur; eksik kayit hesaplanip saklanir.');
})();
