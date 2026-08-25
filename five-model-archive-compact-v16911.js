/* AT AI Mobil — V16.9.11 Kompakt 5 Model IndexedDB Onarımı
   - Eski ham 5 Model arşivini ana iş parçacığına almadan siler.
   - Yeni 5 Model kayıtlarında yalnız sıralama için gereken kompakt alanları saklar.
   - Kariyer arşivine ve puanlama formüllerine dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_ARCHIVE_COMPACT_V16911__) return;
window.__AT_FIVE_MODEL_ARCHIVE_COMPACT_V16911__ = true;

const VERSION = 'FIVE-MODEL-ARCHIVE-COMPACT-V16.9.11';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const MARK_PREFIX = 'at_ai_model_archive_compact_v16911:';
let dbPromise = null;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const finite = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const valid = data => Boolean(data && Number(data?.no) > 0 && Array.isArray(data?.horses) && data.horses.length);
const markerKey = key => MARK_PREFIX + clean(key);

function compactChannel(source = {}) {
  const out = {};
  const scalarKeys = [
    'score','rawScore','decisionScore','coverageYears','strongYears','supportYears',
    'latestScore','mode','analysisMode','modeRank','modeSize','coverage','usedWeight',
    'modeAware','targetFinish'
  ];
  for (const key of scalarKeys) {
    const value = source?.[key];
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(Number(value))) {
      out[key] = value;
    }
  }
  if (Array.isArray(source?.present)) out.present = source.present.map(clean).filter(Boolean);
  if (Array.isArray(source?.missing)) out.missing = source.missing.map(clean).filter(Boolean);
  return out;
}

function compactPlacement(source = {}) {
  const out = {};
  for (const key of ['targetFinish','analysisMode']) if (source?.[key] !== undefined) out[key] = source[key];
  for (const id of ['exact','twin','family','career','composite']) out[id] = compactChannel(source?.[id] || {});
  return out;
}

function compactScores(source = {}) {
  const out = { analysisMode:source?.analysisMode || null };
  if (source?.podiumSimilarityVersion) out.podiumSimilarityVersion = source.podiumSimilarityVersion;
  for (const id of ['exact','twin','family','career','composite']) out[id] = compactChannel(source?.[id] || {});
  if (source?.byFinish && typeof source.byFinish === 'object') {
    out.byFinish = {};
    for (const finish of ['1','2','3']) {
      const placement = source.byFinish[finish] || source.byFinish[Number(finish)];
      if (placement) out.byFinish[finish] = compactPlacement(placement);
    }
  }
  return out;
}

function compactHorse(horse = {}) {
  return {
    id:clean(horse?.id ?? horse?.horseId ?? horse?.At_ID ?? horse?.atId),
    horseId:clean(horse?.horseId ?? horse?.id ?? horse?.At_ID ?? horse?.atId),
    atId:clean(horse?.atId ?? horse?.id ?? horse?.horseId ?? horse?.At_ID),
    no:finite(horse?.no ?? horse?.Program_No ?? horse?.programNo),
    name:clean(horse?.name ?? horse?.horseName ?? horse?.At_Adı ?? horse?.At_Adi),
    hp:finite(horse?.hp ?? horse?.HP)
  };
}

function compactModel(data = {}) {
  return {
    no:Number(data?.no) || 0,
    roadmapOk:data?.roadmapOk !== false,
    roadmapError:clean(data?.roadmapError),
    modelCounts:data?.modelCounts && typeof data.modelCounts === 'object' ? data.modelCounts : {},
    compactArchive:true,
    compactArchiveVersion:VERSION,
    horses:(Array.isArray(data?.horses) ? data.horses : []).map(item => ({
      horse:compactHorse(item?.horse || {}),
      careerOk:item?.careerOk !== false,
      careerError:clean(item?.careerError),
      scores:compactScores(item?.scores || {})
    }))
  };
}

function prepareRecord(record) {
  if (record?.kind !== 'model' || !valid(record?.data)) return record;
  return {
    ...record,
    data:compactModel(record.data),
    compactArchiveV16911:true,
    compactArchiveVersion:VERSION
  };
}

function canRead(key) {
  try { return localStorage.getItem(markerKey(key)) === '1'; }
  catch { return false; }
}
function mark(key) {
  try { localStorage.setItem(markerKey(key), '1'); return true; }
  catch { return false; }
}
function forget(key) {
  try { localStorage.removeItem(markerKey(key)); }
  catch {}
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let request;
    try { request = indexedDB.open(DB_NAME, 1); } catch { return resolve(null); }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath:'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function discardLegacy(key) {
  const modelKey = clean(key);
  if (!modelKey || canRead(modelKey)) return false;
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(modelKey);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = transaction.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

function currentModelContext() {
  try {
    const raceNo = clean(document.getElementById('analysisRace')?.value);
    if (!raceNo || raceNo === 'all') return null;
    const race = (Array.isArray(window.state?.races) ? window.state.races : [])
      .find(item => String(item?.no) === String(raceNo));
    if (!race) return null;
    const key = ['model', clean(window.state?.date), clean(window.state?.city), raceNo].join('|');
    return { key, race, raceNo };
  } catch { return null; }
}

function markSavedPanel() {
  if (typeof document === 'undefined') return false;
  const dialog = document.getElementById('analysisDialog');
  const box = document.getElementById('careerFiveModelV139');
  if (!dialog?.open || dialog?.dataset?.view !== 'career' || !box || box.dataset.loaded === '1') return false;
  const context = currentModelContext();
  if (!context || !canRead(context.key)) return false;
  const small = box.querySelector?.('summary small');
  if (small) small.textContent = 'Kayıtlı · açmak için dokunun';
  return true;
}

let restoreTimer = null;
function scheduleSavedRestore() {
  clearTimeout(restoreTimer);
  restoreTimer = setTimeout(markSavedPanel, 70);
}

function observeSavedPanel() {
  if (typeof document === 'undefined') return;
  const dialog = document.getElementById('analysisDialog');
  if (dialog && typeof MutationObserver === 'function') {
    const observer = new MutationObserver(scheduleSavedRestore);
    observer.observe(dialog, { childList:true, subtree:true, attributes:true, attributeFilter:['data-view','open'] });
  }
  document.addEventListener('change', event => {
    if (event.target?.matches?.('#analysisRace')) scheduleSavedRestore();
  });
  window.addEventListener?.('pageshow', scheduleSavedRestore, { passive:true });
  scheduleSavedRestore();
}

window.ATFiveModelArchiveCompactV16911 = {
  VERSION,
  prepareRecord,
  canRead,
  mark,
  forget,
  discardLegacy,
  compactModel,
  markSavedPanel,
  persistentUntilClear:true
};
observeSavedPanel();
console.info('[AT AI]', VERSION, 'aktif — 5 Model sonucu siz temizleyene kadar sekmeleri altında kalıcıdır.');
})();
