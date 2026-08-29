/* AT AI Mobil - V16.9.1F45 CAREER ARCHIVE FRESHNESS GUARD
   - Eski esnek sinif/grup kuraliyla kaydedilen gunluk Kariyer arsivlerini otomatik bayat sayar.
   - Bayat race + 5 Model kaydini siler; Analizi Hesapla yeniden canli hesaba duser.
   - Uyari gorunen ekrana tek dokunusluk Eski Arsivi Yenile dugmesi ekler.
*/
(() => {
'use strict';
if (window.__AT_CAREER_ARCHIVE_FRESHNESS_GUARD_V1691F45__) return;
window.__AT_CAREER_ARCHIVE_FRESHNESS_GUARD_V1691F45__ = true;

const VERSION = 'CAREER-ARCHIVE-FRESHNESS-GUARD-V16.9.1F45';
const STRICT_VERSION = 'CAREER-STRICT-CLASS-GROUP-WEIGHT-V16.9.1F12';
const STRICT_RULE = 'EXACT_CLASS + EXACT_AGE_GROUP + CARRIED_WEIGHT';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const IDB_TIMEOUT_MS = 1800;

let dbPromise = null;
let pruning = false;
let wrappingDone = false;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function currentState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

function toast(text) {
  try {
    let el = document.getElementById('careerArchiveToastV146');
    if (!el) {
      el = document.createElement('div');
      el.id = 'careerArchiveToastV146';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
  } catch {}
}

function safeSave() {
  try { if (typeof save === 'function') save(); } catch {}
}

function currentRace(raceNo) {
  const st = currentState();
  return (Array.isArray(st?.races) ? st.races : []).find(r => String(r?.no) === String(raceNo)) || null;
}

function selectedRaceValue() {
  return clean(document.getElementById('analysisRace')?.value || 'all') || 'all';
}

function selectedRaceNos() {
  const st = currentState();
  const selected = selectedRaceValue();
  if (selected && selected !== 'all') return [selected];
  return (Array.isArray(st?.races) ? st.races : []).map(r => clean(r?.no)).filter(Boolean);
}

function raceKey(date, city, raceNo) {
  return 'race|' + clean(date) + '|' + clean(city) + '|' + clean(raceNo);
}

function modelKey(date, city, raceNo) {
  return 'model|' + clean(date) + '|' + clean(city) + '|' + clean(raceNo);
}

function horseRef(row) {
  return row?.horse && typeof row.horse === 'object' ? row.horse : row;
}

function raceFingerprint(race) {
  if (!race) return '';
  const horses = (Array.isArray(race.horses) ? race.horses : [])
    .map(row => {
      const horse = horseRef(row);
      return [clean(horse?.no), clean(horse?.id), clean(horse?.name).toLocaleUpperCase('tr-TR')].join(':');
    })
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

function recordMatchesProgram(record) {
  const st = currentState();
  if (!record || record.kind !== 'race') return false;
  if (clean(record.date) !== clean(st?.date) || clean(record.city) !== clean(st?.city)) return false;
  const programRace = currentRace(record.raceNo);
  if (!programRace) return false;
  return Boolean(record.fingerprint && record.fingerprint === raceFingerprint(programRace));
}

function simIsStrict(sim) {
  return Boolean(
    sim && typeof sim === 'object' &&
    (sim.strictRowMatchVersion === STRICT_VERSION || clean(sim.rowMatchRule) === STRICT_RULE)
  );
}

function raceIsFresh(race) {
  if (!race || !Array.isArray(race.horses) || !race.horses.length) return false;
  return race.horses.some(item => simIsStrict(item?.galibiyetBenzerligi));
}

function recordIsFresh(record) {
  if (!record || record.kind !== 'race') return false;
  if (record.archiveFreshnessGuardVersionF45 === VERSION && raceIsFresh(record.race)) return true;
  if (record.meta?.strictRowMatchVersion === STRICT_VERSION) return true;
  return raceIsFresh(record.race);
}

function shouldPurgeRecord(record) {
  if (!record || record.kind !== 'race') return false;
  if (!recordMatchesProgram(record)) return false;
  return !recordIsFresh(record);
}

function withTimeout(work, fallback) {
  return new Promise(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, IDB_TIMEOUT_MS);
    work(value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    });
  });
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = withTimeout(done => {
    if (!('indexedDB' in window)) return done(null);
    let req = null;
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
    req.onsuccess = () => done(req.result || null);
    req.onerror = () => done(null);
  }, null);
  return dbPromise;
}

async function getRecord(key) {
  const db = await openDb();
  if (!db) return null;
  return withTimeout(done => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => done(req.result || null);
      req.onerror = () => done(null);
    } catch { done(null); }
  }, null);
}

async function putRecord(record) {
  const db = await openDb();
  if (!db) return false;
  return withTimeout(done => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => done(true);
      tx.onerror = tx.onabort = () => done(false);
    } catch { done(false); }
  }, false);
}

async function deleteRecord(key) {
  const db = await openDb();
  if (!db) return false;
  return withTimeout(done => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => done(true);
      tx.onerror = tx.onabort = () => done(false);
    } catch { done(false); }
  }, false);
}

async function listDate(date) {
  const db = await openDb();
  if (!db) return [];
  return withTimeout(done => {
    const out = [];
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.indexNames.contains('date')
        ? store.index('date').openCursor(IDBKeyRange.only(String(date || '')))
        : store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        if (!store.indexNames.contains('date') && clean(cursor.value?.date) !== clean(date)) {
          cursor.continue();
          return;
        }
        out.push(cursor.value);
        cursor.continue();
      };
      tx.oncomplete = () => done(out);
      tx.onerror = tx.onabort = () => done(out);
    } catch { done(out); }
  }, []);
}

async function updateArchiveCount() {
  try {
    const st = currentState();
    const date = clean(st?.date);
    const city = clean(st?.city);
    if (!date || !city) return;
    const rows = await listDate(date);
    const freshCount = rows.filter(row => (
      row?.kind === 'race' &&
      clean(row.city) === city &&
      (!currentRace(row.raceNo) || recordMatchesProgram(row)) &&
      recordIsFresh(row)
    )).length;
    const count = document.getElementById('careerArchiveCountV146');
    if (count) count.textContent = freshCount ? '(' + freshCount + ')' : '';
  } catch {}
}

function clearStateForRaceNos(raceNos, reason) {
  const st = currentState();
  const career = st?.analyses?.career;
  if (!career || !Array.isArray(career.races) || !career.races.length) return 0;
  const selected = selectedRaceValue();
  let removed = 0;

  if (selected === 'all') {
    const stale = career.races.some(race => !raceIsFresh(race));
    if (stale) {
      removed = career.races.length;
      st.analyses.career = {};
      st.careerArchiveFreshnessInvalidatedByF45 = reason || VERSION;
      safeSave();
    }
    return removed;
  }

  const wanted = new Set((raceNos || []).map(String));
  const kept = [];
  for (const race of career.races) {
    if (wanted.has(String(race?.no)) && !raceIsFresh(race)) {
      removed += 1;
      continue;
    }
    kept.push(race);
  }
  if (removed) {
    career.races = kept;
    if (!career.races.length) st.analyses.career = {};
    st.careerArchiveFreshnessInvalidatedByF45 = reason || VERSION;
    safeSave();
  }
  return removed;
}

async function purgeStaleForSelection(reason, showMessage) {
  if (pruning) return { deleted:0, deletedModels:0, clearedState:0 };
  pruning = true;
  try {
    const st = currentState();
    const date = clean(st?.date);
    const city = clean(st?.city);
    const raceNos = selectedRaceNos();
    if (!date || !city || !raceNos.length) return { deleted:0, deletedModels:0, clearedState:0 };

    let deleted = 0;
    let deletedModels = 0;
    for (const raceNo of raceNos) {
      const key = raceKey(date, city, raceNo);
      const rec = await getRecord(key);
      if (!shouldPurgeRecord(rec)) continue;
      if (await deleteRecord(key)) deleted += 1;
      if (await deleteRecord(modelKey(date, city, raceNo))) deletedModels += 1;
    }

    const clearedState = clearStateForRaceNos(raceNos, reason);
    await updateArchiveCount();

    if (showMessage && (deleted || clearedState)) {
      const suffix = selectedRaceValue() === 'all' ? 'günlük arşiv kaydı' : 'koşu arşiv kaydı';
      toast((deleted || clearedState) + ' eski ' + suffix + ' temizlendi; yeni hesap hazırlanıyor.');
    }
    return { deleted, deletedModels, clearedState };
  } finally {
    pruning = false;
  }
}

async function purgeCurrentCitySilently() {
  try {
    const st = currentState();
    const date = clean(st?.date);
    const city = clean(st?.city);
    if (!date || !city || !Array.isArray(st?.races) || !st.races.length) return;
    const rows = await listDate(date);
    let deleted = 0;
    let deletedModels = 0;
    for (const row of rows) {
      if (row?.kind !== 'race' || clean(row.city) !== city) continue;
      if (!shouldPurgeRecord(row)) continue;
      if (await deleteRecord(row.key)) deleted += 1;
      if (await deleteRecord(modelKey(row.date, row.city, row.raceNo))) deletedModels += 1;
    }
    if (deleted) {
      clearStateForRaceNos(st.races.map(r => clean(r?.no)).filter(Boolean), 'auto-prune');
      toast(deleted + ' eski kariyer arşiv kaydı yenileme için temizlendi.');
    }
    await updateArchiveCount();
    return { deleted, deletedModels };
  } catch {
    return { deleted:0, deletedModels:0 };
  }
}

function ensureRefreshButton() {
  const toolbar = document.getElementById('careerArchiveToolbarV146');
  if (!toolbar || document.getElementById('careerArchiveRefreshOldV1691F45')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'careerArchiveRefreshOldV1691F45';
  btn.className = 'secondary small';
  btn.textContent = 'Eski Arşivi Yenile';
  btn.title = 'Eski esnek sınıf/grup kuralıyla hesaplanan kayıtları silip yeniden hesaplar';
  btn.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    const result = await purgeStaleForSelection('manual-refresh-button', true);
    if (!result.deleted && !result.clearedState) {
      toast('Bu seçimde eski arşiv kaydı bulunmadı.');
      return;
    }
    if (typeof runAnalysis === 'function') await runAnalysis();
  });
  toolbar.appendChild(btn);
}

function enhanceStrictWarnings() {
  try {
    document.querySelectorAll('[data-strict-old-warning]').forEach(node => {
      if (node.querySelector('[data-f45-refresh-warning]')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-f45-refresh-warning', '1');
      btn.textContent = 'Bu koşuyu şimdi yenile';
      btn.style.cssText = 'display:block;margin-top:8px;border:1px solid rgba(126,226,168,.35);background:rgba(126,226,168,.13);color:#eef7ff;border-radius:8px;padding:7px 9px;font-weight:800;font-size:11px;';
      btn.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        const result = await purgeStaleForSelection('strict-warning-button', true);
        if (!result.deleted && !result.clearedState) clearStateForRaceNos(selectedRaceNos(), 'strict-warning-state-only');
        if (typeof runAnalysis === 'function') await runAnalysis();
      });
      node.appendChild(btn);
    });
  } catch {}
}

function wrapRunAnalysis() {
  if (typeof runAnalysis !== 'function' || runAnalysis.__archiveFreshnessF45) return;
  const before = runAnalysis;
  const wrapped = async function(...args) {
    await purgeStaleForSelection('runAnalysis-before-restore', true);
    return before.apply(this, args);
  };
  wrapped.__archiveFreshnessF45 = true;
  runAnalysis = wrapped;
  try {
    const btn = document.getElementById('runAnalysis');
    if (btn) btn.onclick = wrapped;
  } catch {}
}

function wrapRenderCareer() {
  if (typeof renderCareerAnalysis !== 'function' || renderCareerAnalysis.__archiveFreshnessF45) return;
  const before = renderCareerAnalysis;
  renderCareerAnalysis = function(...args) {
    const out = before.apply(this, args);
    setTimeout(() => {
      ensureRefreshButton();
      enhanceStrictWarnings();
      updateArchiveCount();
    }, 0);
    return out;
  };
  renderCareerAnalysis.__archiveFreshnessF45 = true;
}

function boot() {
  wrapRunAnalysis();
  wrapRenderCareer();
  ensureRefreshButton();
  enhanceStrictWarnings();
  setTimeout(() => {
    wrapRunAnalysis();
    wrapRenderCareer();
    ensureRefreshButton();
    enhanceStrictWarnings();
    purgeCurrentCitySilently();
  }, 700);
  setInterval(() => {
    ensureRefreshButton();
    enhanceStrictWarnings();
    updateArchiveCount();
  }, 2500);
}

document.addEventListener('click', () => setTimeout(() => {
  ensureRefreshButton();
  enhanceStrictWarnings();
}, 0), true);
window.addEventListener('pageshow', () => setTimeout(() => purgeCurrentCitySilently(), 500), { passive:true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') setTimeout(() => purgeCurrentCitySilently(), 500);
}, { passive:true });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATCareerArchiveFreshnessGuardV1691F45 = {
  version:VERSION,
  strictVersion:STRICT_VERSION,
  purge:purgeStaleForSelection,
  pruneCurrent:purgeCurrentCitySilently,
  isFresh:recordIsFresh,
  listDate
};

console.info('[AT AI]', VERSION, 'active - old flexible Career archive rows are refreshed before reuse.');
})();