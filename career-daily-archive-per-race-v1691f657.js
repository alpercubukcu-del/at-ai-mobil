;(() => {
'use strict';
if (window.__AT_CAREER_DAILY_ARCHIVE_PER_RACE_V1691F657__) return;
window.__AT_CAREER_DAILY_ARCHIVE_PER_RACE_V1691F657__ = true;

const VERSION = 'CAREER-DAILY-ARCHIVE-PER-RACE-V16.9.1F60.58';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function appState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

function setupStore(db, tx) {
  const store = db.objectStoreNames.contains(STORE)
    ? tx.objectStore(STORE)
    : db.createObjectStore(STORE, { keyPath:'key' });
  if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
  if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
}

function openDb() {
  return new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME); } catch { return resolve(null); }
    req.onupgradeneeded = () => {
      try { setupStore(req.result, req.transaction); } catch {}
    };
    req.onsuccess = () => {
      const db = req.result;
      try { db.onversionchange = () => { try { db.close(); } catch {} }; } catch {}
      if (db.objectStoreNames.contains(STORE)) return resolve(db);
      const nextVersion = Number(db.version || 1) + 1;
      try { db.close(); } catch {}
      let repair;
      try { repair = indexedDB.open(DB_NAME, nextVersion); } catch { return resolve(null); }
      repair.onupgradeneeded = () => {
        try { setupStore(repair.result, repair.transaction); } catch {}
      };
      repair.onsuccess = () => resolve(repair.result);
      repair.onerror = repair.onblocked = () => resolve(null);
    };
    req.onerror = req.onblocked = () => resolve(null);
  });
}

function horseRef(row) {
  return row?.horse && typeof row.horse === 'object' ? row.horse : row;
}

function raceFingerprint(race) {
  if (!race) return '';
  const horses = (Array.isArray(race.horses) ? race.horses : [])
    .map(row => {
      const h = horseRef(row);
      return [clean(h?.no), clean(h?.id), clean(h?.name).toLocaleUpperCase('tr-TR')].join(':');
    })
    .sort();
  return [
    clean(race.no), clean(race.class || race.yaradi1), clean(race.ageGroup || race.yaradi2),
    clean(race.distance || race.mesafe), clean(race.track || race.pist), horses.join('|')
  ].join('||');
}

function programRace(st, raceNo) {
  return (Array.isArray(st?.races) ? st.races : []).find(r => String(r?.no) === String(raceNo)) || null;
}

function cityName() {
  try { if (typeof getCityName === 'function') return clean(getCityName()); } catch {}
  try { return clean(document.querySelector('#citySelect option:checked')?.textContent); } catch {}
  return '';
}

function raceKey(date, city, raceNo) {
  return `race|${clean(date)}|${clean(city)}|${clean(raceNo)}`;
}

function scoreOf(item) {
  const sim = item?.galibiyetBenzerligi || {};
  for (const v of [sim.rankingRawScore, sim.score, sim.evidenceScore, sim.finalScore, sim.displayScore, sim?.strongest?.rankingRawScore, sim?.strongest?.score]) {
    const n = Number(v);
    if (v !== null && v !== undefined && v !== '' && Number.isFinite(n)) return n;
  }
  return null;
}

function makeRecord(result, race, st) {
  const date = clean(result?.date || st?.date);
  const city = clean(result?.city || st?.city);
  const current = programRace(st, race?.no);
  const horses = Array.isArray(race?.horses) ? race.horses : [];
  const scoredHorseCount = horses.reduce((n, item) => n + (scoreOf(item) === null ? 0 : 1), 0);
  const now = new Date().toISOString();
  return {
    key: raceKey(date, city, race?.no),
    kind: 'race',
    schemaVersion: 'DAILY-CAREER-ARCHIVE-V14.6',
    engine: result?.version || (typeof CAREER_UI_VERSION !== 'undefined' ? CAREER_UI_VERSION : 'CAREER-UI'),
    date,
    city,
    cityName: clean(result?.cityName || cityName()),
    raceNo: String(race?.no ?? ''),
    fingerprint: raceFingerprint(current || race),
    meta: {
      type: result?.type || 'career',
      version: result?.version || null,
      fastProgressVersion: result?.fastProgressVersion || null,
      careerApiVersion: result?.careerApiVersion || null,
      roadmapApiVersion: result?.roadmapApiVersion || null,
      raceMetaApiVersion: result?.raceMetaApiVersion || null,
      date,
      city,
      cityName: clean(result?.cityName || cityName()),
      rule: result?.rule || null,
      similarityMethod: result?.similarityMethod || null,
      similarityNote: result?.similarityNote || null,
      scoreQuality: { horseCount:horses.length, scoredHorseCount }
    },
    scoreQuality: { horseCount:horses.length, scoredHorseCount },
    race,
    generatedAt: result?.generatedAt || now,
    archivedAt: now,
    savedBy: VERSION
  };
}

async function putAndVerify(db, record) {
  const written = await new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
  if (!written) return false;
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(record.key);
      req.onsuccess = () => resolve(Boolean(req.result && req.result.key === record.key));
      req.onerror = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function countCurrent(db, date, city) {
  return new Promise(resolve => {
    let count = 0;
    try {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE);
      const req = store.indexNames.contains('date')
        ? store.index('date').openCursor(IDBKeyRange.only(String(date || '')))
        : store.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        const v = c.value;
        if (v?.kind === 'race' && clean(v?.date) === clean(date) && clean(v?.city) === clean(city)) count += 1;
        c.continue();
      };
      req.onerror = () => resolve(count);
      req.transaction.oncomplete = () => resolve(count);
      req.transaction.onerror = req.transaction.onabort = () => resolve(count);
    } catch { resolve(count); }
  });
}

function toast(text) {
  let el = document.getElementById('careerArchiveAutosaveToastV657');
  if (!el) {
    el = document.createElement('div');
    el.id = 'careerArchiveAutosaveToastV657';
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;background:#123b2d;color:#fff;border:1px solid #2d7a5c;border-radius:999px;padding:9px 14px;font:600 13px system-ui;box-shadow:0 8px 28px #0007;opacity:0;transition:opacity .18s';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

async function savePerRace(result, selectedRaces, raceValue) {
  const st = appState();
  if (!result || !Array.isArray(result.races) || !result.races.length || !st) return {saved:0, failed:0};

  const uiRace = clean(document.getElementById('analysisRace')?.value || '');
  const requested = uiRace && uiRace !== 'all' ? uiRace : clean(raceValue || 'all');
  let races = result.races.slice();
  if (requested && requested !== 'all') {
    races = races.filter(r => String(r?.no) === requested);
  } else if (Array.isArray(selectedRaces) && selectedRaces.length) {
    const wanted = new Set(selectedRaces.map(r => String(r?.no)));
    const filtered = races.filter(r => wanted.has(String(r?.no)));
    if (filtered.length) races = filtered;
  }
  if (!races.length) return {saved:0, failed:0};

  const db = await openDb();
  if (!db) throw new Error('Günlük Arşiv veritabanı açılamadı.');
  let saved = 0;
  let failed = 0;
  for (const race of races) {
    const record = makeRecord(result, race, st);
    if (!record.raceNo) { failed += 1; continue; }
    if (await putAndVerify(db, record)) saved += 1;
    else failed += 1;
  }

  const count = await countCurrent(db, clean(result?.date || st?.date), clean(result?.city || st?.city));
  const badge = document.getElementById('careerArchiveCountV146');
  if (badge) badge.textContent = count ? `(${count})` : '';
  try { db.close(); } catch {}

  if (saved) toast(`${saved} koşu Günlük Arşiv'e kaydedildi.`);
  if (failed) console.warn('[AT AI]', VERSION, failed, 'koşu arşiv kaydı doğrulanamadı.');
  return {saved, failed};
}

try {
  if (typeof runCareerAnalysis === 'function') {
    const baseRunCareerV657 = runCareerAnalysis;
    runCareerAnalysis = async function(selectedRaces, raceValue) {
      const out = await baseRunCareerV657.apply(this, arguments);
      try {
        const st = appState();
        const result = out && Array.isArray(out?.races) ? out : st?.analyses?.career;
        await savePerRace(result, selectedRaces, raceValue);
      } catch (error) {
        console.warn('[AT AI]', VERSION, 'Kariyer sonucu Günlük Arşive kaydedilemedi:', error);
        toast('Günlük Arşiv kaydı yapılamadı.');
      }
      return out;
    };
  }
} catch (error) {
  console.warn('[AT AI]', VERSION, 'runCareerAnalysis hook kurulamadı:', error);
}

/* `runAnalysis`, bellekten tamamlanmış sonucu doğrudan ekrana basabilir ve
   `runCareerAnalysis` çağrısını atlar. Bu durumda da IndexedDB arşivini güncelle. */
try {
  if (typeof runAnalysis === 'function') {
    const baseRunAnalysisV657 = runAnalysis;
    runAnalysis = async function(...args) {
      const out = await baseRunAnalysisV657.apply(this, args);
      try {
        const st = appState();
        const raceValue = clean(document.getElementById('analysisRace')?.value || 'all') || 'all';
        await savePerRace(st?.analyses?.career, [], raceValue);
      } catch (error) {
        console.warn('[AT AI]', VERSION, 'Görünen Kariyer sonucu Günlük Arşive kaydedilemedi:', error);
      }
      return out;
    };
    const button = document.getElementById('runAnalysis');
    if (button) button.onclick = runAnalysis;
  }
} catch (error) {
  console.warn('[AT AI]', VERSION, 'runAnalysis hook kurulamadı:', error);
}

window.ATCareerDailyArchivePerRaceV657 = { savePerRace, version:VERSION };
console.info('[AT AI]', VERSION, 'aktif — her Kariyer koşusu ayrı Günlük Arşiv kaydı olarak saklanır.');
})();
