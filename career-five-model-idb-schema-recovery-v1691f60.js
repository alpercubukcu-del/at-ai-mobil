/* AT AI Mobil — V16.9.1F60 CAREER 5 MODEL IDB SCHEMA RECOVERY
   - Kariyer Yol Haritasi 5 Model panelinde eski byFinish'siz gunluk IndexedDB modeli kullanilmaz.
   - Yalniz secili tarih/sehir/kosu model kaydi ve ayni kosunun eski session 5-model kaydi gecersizlestirilir.
   - Kariyer sonucu, Yillik Arsiv ve diger kosularin kalici verisi korunur.
   - Eksik sema tespitinde mevcut F59 motoru bir kez yeniden cagrilir; yeni timeout/formul/fallback eklenmez.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_IDB_SCHEMA_RECOVERY_V1691F60__) return;
window.__AT_CAREER_FIVE_MODEL_IDB_SCHEMA_RECOVERY_V1691F60__ = true;

const VERSION = 'CAREER-FIVE-MODEL-IDB-SCHEMA-RECOVERY-V16.9.1F60';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const SESSION_KEY = 'at_ai_five_model_compact_v1687';

if (typeof getCareerRaceModelsV112 !== 'function') {
  console.warn('[AT AI]', VERSION, 'getCareerRaceModelsV112 bulunamadi.');
  return;
}

const beforeGetModelsV1691F60 = getCareerRaceModelsV112;
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I').replace(/[^A-Z0-9]+/g, '');

function currentDate() {
  try { return clean(state?.date || document.getElementById('raceDate')?.value); } catch { return ''; }
}
function currentCityKey() {
  try { return clean(state?.city || document.getElementById('citySelect')?.value); } catch { return ''; }
}
function currentCityName() {
  try { return clean(typeof getCityName === 'function' ? getCityName() : document.querySelector('#citySelect option:checked')?.textContent); }
  catch { return currentCityKey(); }
}
function modelKey(raceNo) {
  return `model|${currentDate()}|${currentCityKey()}|${clean(raceNo)}`;
}
function sharedKey(raceNo) {
  return [currentDate(), fold(currentCityName()), Number(raceNo) || 0].join('|');
}
function podiumExpected() {
  try { return typeof PODIUM_SIMILARITY_V115 !== 'undefined'; } catch { return false; }
}
function hasByFinishSchema(data) {
  if (!podiumExpected()) return true;
  const horses = Array.isArray(data?.horses) ? data.horses : [];
  if (!horses.length) return false;
  return horses.every(item => {
    const by = item?.scores?.byFinish;
    return Boolean(by?.[1] && by?.[2] && by?.[3]);
  });
}

async function deleteDailyModel(raceNo) {
  if (!('indexedDB' in window)) return false;
  return new Promise(resolve => {
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch { return resolve(false); }
    req.onupgradeneeded = () => {
      try {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath:'key' });
      } catch {}
    };
    req.onerror = req.onblocked = () => resolve(false);
    req.onsuccess = () => {
      const db = req.result;
      try {
        if (!db.objectStoreNames.contains(STORE)) { db.close(); return resolve(false); }
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(modelKey(raceNo));
        tx.oncomplete = () => { try { db.close(); } catch {} resolve(true); };
        tx.onerror = tx.onabort = () => { try { db.close(); } catch {} resolve(false); };
      } catch {
        try { db.close(); } catch {}
        resolve(false);
      }
    };
  });
}

function clearCareerModelCache(race) {
  try {
    const key = typeof careerModelKeyV112 === 'function' ? careerModelKeyV112(race) : null;
    if (key && typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.delete(key);
  } catch {}
}

function clearSelectedSharedCache(raceNo) {
  let store = {};
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    if (parsed && typeof parsed === 'object') store = parsed;
  } catch {}
  delete store[sharedKey(raceNo)];

  // In-memory resolved/inflight map private oldugu icin clear() ile sifirlanir;
  // diger kosularin session kayitlari hemen geri yazilarak korunur.
  try { window.ATFiveModelSharedCacheV1687?.clear?.(); }
  catch { try { window.ATFiveModelSharedCacheV1685?.clear?.(); } catch {} }
  try {
    if (Object.keys(store).length) sessionStorage.setItem(SESSION_KEY, JSON.stringify(store));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

async function purgeStaleRace(race) {
  clearCareerModelCache(race);
  clearSelectedSharedCache(race?.no);
  const deleted = await deleteDailyModel(race?.no);
  console.info('[AT AI]', VERSION, 'byFinish eksik eski gunluk 5 Model kaydi gecersizlestirildi.', {
    raceNo:race?.no,
    dailyModelDeleted:deleted
  });
}

getCareerRaceModelsV112 = async function(race) {
  const first = await beforeGetModelsV1691F60(race);
  if (hasByFinishSchema(first)) return first;
  if (!podiumExpected()) return first;

  await purgeStaleRace(race);

  const second = await beforeGetModelsV1691F60(race);
  if (hasByFinishSchema(second)) {
    if (second && typeof second === 'object') {
      second.modelSchemaOk = true;
      second.modelSchemaRecoveredBy = VERSION;
    }
    return second;
  }

  console.warn('[AT AI]', VERSION, 'yeniden hesap sonrasi byFinish semasi halen eksik.', { raceNo:race?.no });
  return second;
};

window.ATCareerFiveModelIdbSchemaRecoveryV1691F60 = {
  VERSION,
  hasByFinishSchema,
  purgeRace:purgeStaleRace
};

console.info('[AT AI]', VERSION, 'aktif — Kariyer 5 Model eski IndexedDB semasi secili kosuda otomatik yenilenir.');
})();
