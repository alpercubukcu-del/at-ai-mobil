/* AT AI Mobil - V16.9.1F53 5 MODEL PERSIST ONLY
   - Kariyer ana/ham siralama akisini degistirmez ve toplu 5 Model hazirlamasi baslatmaz.
   - 5 Model yalniz kullanici paneli actiginda normal F47 motoruyla hesaplanir.
   - Tamamlanan kosu sonucu IndexedDB'ye kalici yazilir; ayni tarih/sehir/kosu tekrar acilinca yeniden tarihsel tarama yapilmaz.
   - Sayfa acilisinda arsiv taramasi, arka plan precompute, MutationObserver veya tum kosular dongusu yoktur.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_PERSIST_ONLY_V1691F53__) return;
window.__AT_CAREER_FIVE_MODEL_PERSIST_ONLY_V1691F53__ = true;

const VERSION = 'CAREER-FIVE-MODEL-PERSIST-ONLY-V16.9.1F53';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const IDB_TIMEOUT_MS = 900;
const WRITE_TIMEOUT_MS = 1400;
let dbPromise = null;
let bypassUntil = 0;
let wrappedPrepare = false;
let wrappedGet = false;
const stats = { hits:0, misses:0, saves:0, saveErrors:0, invalid:0, bypasses:0 };

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const finite = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function currentDate() {
  return clean(window.state?.date || document.getElementById('raceDate')?.value || '');
}

function currentCity() {
  return clean(window.state?.city || document.getElementById('citySelect')?.value || '');
}

function raceNoOf(race) {
  return clean(race?.no ?? race?.raceNo ?? '');
}

function raceKey(race) {
  return `model|${currentDate()}|${currentCity()}|${raceNoOf(race)}`;
}

function horseToken(h = {}) {
  return [
    clean(h?.no ?? h?.programNo ?? h?.Program_No ?? ''),
    clean(h?.id ?? h?.horseId ?? h?.atId ?? h?.At_ID ?? ''),
    clean(h?.name ?? h?.horseName ?? h?.At_Adi ?? h?.At_Adı ?? '').toLocaleUpperCase('tr-TR')
  ].join(':');
}

function fingerprint(race) {
  const horses = (Array.isArray(race?.horses) ? race.horses : []).map(horseToken).sort();
  return [
    raceNoOf(race),
    clean(race?.class ?? race?.yaradi1 ?? ''),
    clean(race?.ageGroup ?? race?.yaradi2 ?? ''),
    clean(race?.distance ?? race?.mesafe ?? ''),
    clean(race?.track ?? race?.pist ?? ''),
    horses.join('|')
  ].join('||');
}

function modelHorseToken(item = {}) {
  const h = item?.horse || item || {};
  return horseToken(h);
}

function validModelData(data, race) {
  if (!data || typeof data !== 'object') return false;
  if (data?.ok === false || data?.roadmapOk === false) return false;
  const rows = Array.isArray(data?.horses) ? data.horses : [];
  const expected = Array.isArray(race?.horses) ? race.horses : [];
  if (!rows.length || !expected.length || rows.length !== expected.length) return false;

  const expectedTokens = expected.map(horseToken).sort();
  const actualTokens = rows.map(modelHorseToken).sort();
  const exactIdentity = expectedTokens.every((token, i) => token === actualTokens[i]);
  if (exactIdentity) return true;

  /* Bazi eski model paketleri at id/no alanlarinin bir kismini tasimiyordu.
     Bu durumda isim bazli tam sayi eslesmesine izin ver; eksik/yarim kosu kabul etme. */
  const expectedNames = expected.map(h => clean(h?.name ?? h?.horseName ?? '').toLocaleUpperCase('tr-TR')).sort();
  const actualNames = rows.map(item => clean(item?.horse?.name ?? item?.horse?.horseName ?? item?.name ?? '').toLocaleUpperCase('tr-TR')).sort();
  return expectedNames.every((name, i) => Boolean(name) && name === actualNames[i]);
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let settled = false;
    let request = null;
    const done = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value || null);
    };
    const timer = setTimeout(() => done(null), IDB_TIMEOUT_MS);
    try {
      request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          const store = db.objectStoreNames.contains(STORE)
            ? request.transaction.objectStore(STORE)
            : db.createObjectStore(STORE, { keyPath:'key' });
          if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
          if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
        } catch {}
      };
      request.onsuccess = () => done(request.result);
      request.onerror = () => done(null);
      request.onblocked = () => done(null);
    } catch {
      done(null);
    }
  });
  return dbPromise;
}

async function dbGet(key) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return null;
  return new Promise(resolve => {
    let settled = false;
    const done = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value || null);
    };
    const timer = setTimeout(() => done(null), IDB_TIMEOUT_MS);
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
    const done = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(Boolean(ok));
    };
    const timer = setTimeout(() => done(false), WRITE_TIMEOUT_MS);
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

async function dbDelete(key) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return false;
  return new Promise(resolve => {
    let settled = false;
    const done = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(Boolean(ok));
    };
    const timer = setTimeout(() => done(false), WRITE_TIMEOUT_MS);
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => done(true);
      tx.onerror = tx.onabort = () => done(false);
    } catch {
      done(false);
    }
  });
}

function hydrateRuntime(race, data) {
  try {
    if (typeof careerModelCacheV112 !== 'undefined' && typeof careerModelKeyV112 === 'function' && careerModelCacheV112?.set) {
      careerModelCacheV112.set(careerModelKeyV112(race), data);
    }
  } catch {}
  try {
    const map = window.manualTicketV117?.raceDataMap;
    if (map instanceof Map) map.set(String(raceNoOf(race)), data);
  } catch {}
}

function showArchiveHit(race) {
  try {
    const selected = clean(document.getElementById('analysisRace')?.value || '');
    if (selected && selected !== raceNoOf(race)) return;
    const box = document.getElementById('careerFiveModelV139');
    const small = box?.querySelector?.('summary small');
    if (small) small.textContent = 'Kayıtlı 5 Model sonucu açıldı';
  } catch {}
}

async function readModel(race) {
  if (!race || Date.now() < bypassUntil) {
    stats.bypasses++;
    return null;
  }
  const record = await dbGet(raceKey(race));
  if (!record) {
    stats.misses++;
    return null;
  }
  if (record.kind !== 'model' || clean(record.date) !== currentDate() || clean(record.city) !== currentCity() || clean(record.raceNo) !== raceNoOf(race) || clean(record.fingerprint) !== fingerprint(race) || !validModelData(record.data, race)) {
    stats.invalid++;
    try { await dbDelete(raceKey(race)); } catch {}
    return null;
  }
  stats.hits++;
  hydrateRuntime(race, record.data);
  showArchiveHit(race);
  return record.data;
}

async function saveModel(race, data, source) {
  if (!race || !validModelData(data, race)) return false;
  const record = {
    key:raceKey(race),
    kind:'model',
    schemaVersion:VERSION,
    engine:data?.version || data?.roadmapVersion || null,
    date:currentDate(),
    city:currentCity(),
    raceNo:raceNoOf(race),
    fingerprint:fingerprint(race),
    data,
    source:source || 'five-model-panel',
    savedAt:new Date().toISOString()
  };
  const ok = await dbPut(record);
  if (ok) {
    stats.saves++;
    hydrateRuntime(race, data);
  } else {
    stats.saveErrors++;
  }
  return ok;
}

function wrapPrepare() {
  if (wrappedPrepare || typeof prepareRaceModelsV11 !== 'function') return false;
  const base = prepareRaceModelsV11;
  if (base.__atPersistOnlyF53) { wrappedPrepare = true; return true; }
  const wrapped = async function(race, progressCb, ...rest) {
    const cached = await readModel(race);
    if (validModelData(cached, race)) {
      try { progressCb?.(`Koşu ${raceNoOf(race)}: kayıtlı 5 Model sonucu kullanılıyor.`); } catch {}
      return cached;
    }
    const data = await base.call(this, race, progressCb, ...rest);
    try { await saveModel(race, data, 'prepareRaceModelsV11'); } catch {}
    return data;
  };
  wrapped.__atPersistOnlyF53 = true;
  prepareRaceModelsV11 = wrapped;
  wrappedPrepare = true;
  return true;
}

function wrapGet() {
  if (wrappedGet || typeof getCareerRaceModelsV112 !== 'function') return false;
  const base = getCareerRaceModelsV112;
  if (base.__atPersistOnlyF53) { wrappedGet = true; return true; }
  const wrapped = async function(race, ...rest) {
    const cached = await readModel(race);
    if (validModelData(cached, race)) return cached;
    const data = await base.call(this, race, ...rest);
    try { await saveModel(race, data, 'getCareerRaceModelsV112'); } catch {}
    return data;
  };
  wrapped.__atPersistOnlyF53 = true;
  getCareerRaceModelsV112 = wrapped;
  wrappedGet = true;
  return true;
}

function installWrappers() {
  wrapPrepare();
  wrapGet();
  if (wrappedPrepare && wrappedGet) return;
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    wrapPrepare();
    wrapGet();
    if ((wrappedPrepare && wrappedGet) || attempts >= 20) clearInterval(timer);
  }, 250);
}

function currentRaceFromUi() {
  const no = clean(document.getElementById('analysisRace')?.value || '');
  return (Array.isArray(window.state?.races) ? window.state.races : []).find(r => raceNoOf(r) === no) || null;
}

function armExplicitRecomputeBypass() {
  document.addEventListener('click', event => {
    const target = event.target?.closest?.('button');
    if (!target) return;
    const id = clean(target.id);
    const text = clean(target.textContent).toLocaleUpperCase('tr-TR');
    const explicit = id === 'careerArchiveRecalcV146' || /YENİDEN HESAPLA|ESKİ ARŞİVİ YENİLE/.test(text);
    if (!explicit) return;
    bypassUntil = Date.now() + 90000;
    const race = currentRaceFromUi();
    if (race) dbDelete(raceKey(race)).catch(() => {});
    try {
      if (typeof careerModelCacheV112 !== 'undefined' && typeof careerModelKeyV112 === 'function') {
        careerModelCacheV112.delete(careerModelKeyV112(race));
      }
    } catch {}
  }, true);
}

function boot() {
  installWrappers();
  armExplicitRecomputeBypass();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATCareerFiveModelPersistOnlyV1691F53 = {
  version:VERSION,
  stats:() => ({ ...stats, wrappedPrepare, wrappedGet }),
  get:readModel,
  save:saveModel,
  clearRace:async race => dbDelete(raceKey(race)),
  bypass:ms => { bypassUntil = Date.now() + Math.max(0, finite(ms) || 60000); }
};

console.info('[AT AI]', VERSION, 'aktif - ham Kariyer akisi degismedi; yalniz tamamlanan 5 Model kosu sonucu kalici saklanir.');
})();
