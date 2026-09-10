/* AT AI Mobil - V16.9.1F60.47 CAREER ARCHIVE RENDER AUTOSAVE
   - V13.9 intentionally keeps Career results out of localStorage.
   - Persist the visible Career result to the daily IndexedDB archive after
     runAnalysis/renderCareerAnalysis so a phone refresh does not force recalc.
   - Does not change scoring, ranking, annual archive, PDF, or coupon rules.
*/
(() => {
'use strict';
if (window.__AT_CAREER_ARCHIVE_RENDER_AUTOSAVE_V1691F647__) return;
window.__AT_CAREER_ARCHIVE_RENDER_AUTOSAVE_V1691F647__ = true;

const VERSION = 'CAREER-ARCHIVE-RENDER-AUTOSAVE-V16.9.1F60.47';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const ENGINE = typeof CAREER_UI_VERSION !== 'undefined' ? CAREER_UI_VERSION : 'CAREER-UI';
const FAST_VERSION = 'CAREER-FAST-PROGRESS-V16.9.1F31';
let dbPromise = null;
let lastWriteSignature = '';
let pendingTimer = 0;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function finite(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const text = clean(v).replace(/%/g, '').replace(',', '.');
  if (!text) return null;
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function currentState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

function currentCityName() {
  try { if (typeof getCityName === 'function') return clean(getCityName()); } catch {}
  try { return clean(document.querySelector('#citySelect option:checked')?.textContent); } catch {}
  return '';
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

function currentProgramRace(raceNo) {
  const st = currentState();
  return (Array.isArray(st?.races) ? st.races : []).find(r => String(r?.no) === String(raceNo)) || null;
}

function raceKey(date, city, raceNo) {
  return `race|${clean(date)}|${clean(city)}|${clean(raceNo)}`;
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch { return resolve(null); }
    req.onupgradeneeded = () => {
      const db = req.result;
      const store = db.objectStoreNames.contains(STORE)
        ? req.transaction.objectStore(STORE)
        : db.createObjectStore(STORE, { keyPath:'key' });
      if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
      if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

async function putRecord(record) {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function listDate(date) {
  const db = await openDb();
  if (!db) return [];
  return new Promise(resolve => {
    const out = [];
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.indexNames.contains('date')
        ? store.index('date').openCursor(IDBKeyRange.only(String(date || '')))
        : store.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        if (!store.indexNames.contains('date') && clean(c.value?.date) !== clean(date)) {
          c.continue();
          return;
        }
        out.push(c.value);
        c.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = tx.onabort = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

function firstFinite(values) {
  for (const value of values) {
    const n = finite(value);
    if (n !== null) return n;
  }
  return null;
}

function normalizeHorseScore(item) {
  const sim = item?.galibiyetBenzerligi;
  if (!sim || typeof sim !== 'object') return { score:null, normalized:false };
  const current = finite(sim.score);
  if (current !== null) return { score:current, normalized:false };

  const fallback = firstFinite([
    sim.strongest?.score,
    sim.rankingRawScore,
    sim.juvenileMaidenMarketConfirmationScore,
    sim.juvenileMaidenReadinessScore,
    sim.handicapWeightLeverageScore,
    sim.provenConditionWinScore,
    sim.evidenceScore,
    sim.candidateCareerScore,
    sim.partialSupportScore,
    sim.supportScore,
    sim.finalScore,
    item?.score,
    item?.displayScore
  ]);

  if (fallback === null) return { score:null, normalized:false };
  sim.score = Math.round(fallback * 100) / 100;
  sim.scoreSource = sim.scoreSource || 'ARCHIVE_RENDER_AUTOSAVE_FALLBACK';
  sim.archiveRenderAutosaveNormalizedBy = VERSION;
  return { score:sim.score, normalized:true };
}

function scoreQuality(race) {
  const horses = Array.isArray(race?.horses) ? race.horses : [];
  let scoredHorseCount = 0;
  let normalizedScoreCount = 0;
  for (const item of horses) {
    const result = normalizeHorseScore(item);
    if (result.score !== null) scoredHorseCount += 1;
    if (result.normalized) normalizedScoreCount += 1;
  }
  return {
    horseCount:horses.length,
    scoredHorseCount,
    scorelessHorseCount:Math.max(0, horses.length - scoredHorseCount),
    normalizedScoreCount,
    hasAnyScore:scoredHorseCount > 0
  };
}

function selectedRaceValue(raceFilter) {
  const explicit = clean(raceFilter);
  if (explicit) return explicit;
  try { return clean(document.getElementById('analysisRace')?.value || 'all') || 'all'; } catch {}
  return 'all';
}

function racesToArchive(career, raceFilter) {
  const races = Array.isArray(career?.races) ? career.races : [];
  const value = selectedRaceValue(raceFilter);
  if (value && value !== 'all') {
    const found = races.filter(r => String(r?.no) === String(value));
    if (found.length) return { value, races:found };
  }
  if (career?.calculatedRace && career.calculatedRace !== 'all') {
    const found = races.filter(r => String(r?.no) === String(career.calculatedRace));
    if (found.length) return { value:String(career.calculatedRace), races:found };
  }
  return { value:'all', races };
}

function resultMeta(career) {
  const st = currentState();
  return {
    type:career?.type || 'career',
    version:career?.version || ENGINE,
    careerApiVersion:career?.careerApiVersion || null,
    roadmapApiVersion:career?.roadmapApiVersion || null,
    raceMetaApiVersion:career?.raceMetaApiVersion || null,
    date:career?.date || st?.date || '',
    city:career?.city || st?.city || '',
    cityName:career?.cityName || currentCityName(),
    rule:career?.rule || null,
    similarityMethod:career?.similarityMethod || null,
    similarityNote:career?.similarityNote || null,
    fastProgressVersion:career?.fastProgressVersion || window.ATCareerFastProgressV1691F31?.version || FAST_VERSION,
    archiveRenderAutosaveVersion:VERSION
  };
}

function writeSignature(date, city, raceValue, races) {
  return [
    date,
    city,
    raceValue,
    races.map(r => {
      const q = scoreQuality(r);
      return [clean(r?.no), q.horseCount, q.scoredHorseCount, clean(r?.generatedAt || '')].join(':');
    }).join(',')
  ].join('|');
}

async function updateArchiveCount(date, city) {
  try {
    const rows = (await listDate(date)).filter(r => r?.kind === 'race' && clean(r?.city) === clean(city));
    const count = document.getElementById('careerArchiveCountV146');
    if (count) count.textContent = rows.length ? `(${rows.length})` : '';
  } catch {}
}

async function archiveVisible(result, raceFilter = '', reason = 'manual') {
  const st = currentState();
  const career = result?.races ? result : st?.analyses?.career;
  if (!career || !Array.isArray(career.races) || !career.races.length) {
    return { saved:0, skipped:'empty-career', reason };
  }

  const date = clean(career.date || st?.date);
  const city = clean(career.city || st?.city);
  if (!date || !city) return { saved:0, skipped:'missing-date-city', reason };

  const picked = racesToArchive(career, raceFilter);
  const races = picked.races.filter(Boolean);
  if (!races.length) return { saved:0, skipped:'no-races', reason };

  const signature = writeSignature(date, city, picked.value, races);
  if (signature === lastWriteSignature && reason !== 'startup') {
    await updateArchiveCount(date, city);
    return { saved:0, skipped:'duplicate', reason, date, city };
  }

  let saved = 0;
  let skippedScoreless = 0;
  for (const race of races) {
    if (!race?.no) continue;
    const quality = scoreQuality(race);
    if (!quality.scoredHorseCount) {
      skippedScoreless += 1;
      continue;
    }

    const programRace = currentProgramRace(race.no);
    const meta = {
      ...resultMeta(career),
      scoreQuality:quality,
      archiveBridgeReason:reason
    };
    const record = {
      key:raceKey(date, city, race.no),
      kind:'race',
      schemaVersion:'DAILY-CAREER-ARCHIVE-V14.6',
      engine:ENGINE,
      date,
      city,
      cityName:clean(career.cityName || currentCityName()),
      raceNo:String(race.no),
      fingerprint:raceFingerprint(programRace || race),
      meta,
      race,
      scoreQuality:quality,
      generatedAt:career.generatedAt || new Date().toISOString(),
      archivedAt:new Date().toISOString(),
      archiveRenderAutosaveVersion:VERSION,
      archiveBridgeReason:reason
    };
    if (await putRecord(record)) saved += 1;
  }

  lastWriteSignature = signature;
  await updateArchiveCount(date, city);
  try {
    window.dispatchEvent(new CustomEvent('at-ai:daily-career-archive-updated', {
      detail:{ version:VERSION, date, city, saved, skippedScoreless, reason }
    }));
  } catch {}
  if (saved && typeof console !== 'undefined') {
    console.info('[AT AI]', VERSION, `${saved} gorunur kariyer kosusu gunluk arsive yazildi`, { reason, date, city });
  }
  return { saved, skippedScoreless, reason, date, city };
}

function scheduleArchive(result, raceFilter, reason) {
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    archiveVisible(result, raceFilter, reason).catch(error => {
      console.warn('[AT AI]', VERSION, 'autosave failed', error);
    });
  }, 60);
}

if (typeof renderCareerAnalysis === 'function') {
  const baseRenderCareerAnalysisF647 = renderCareerAnalysis;
  renderCareerAnalysis = function(result, raceFilter = null, ...rest) {
    const out = baseRenderCareerAnalysisF647.call(this, result, raceFilter, ...rest);
    scheduleArchive(result, raceFilter, 'renderCareerAnalysis');
    return out;
  };
}

if (typeof runAnalysis === 'function') {
  const baseRunAnalysisF647 = runAnalysis;
  runAnalysis = async function(...args) {
    const out = await baseRunAnalysisF647.apply(this, args);
    try { await archiveVisible(currentState()?.analyses?.career, selectedRaceValue(), 'runAnalysis-after'); }
    catch (error) { console.warn('[AT AI]', VERSION, 'post run autosave failed', error); }
    return out;
  };
  try {
    const btn = document.getElementById('runAnalysis');
    if (btn) btn.onclick = runAnalysis;
  } catch {}
}

window.addEventListener('pageshow', () => {
  scheduleArchive(currentState()?.analyses?.career, selectedRaceValue(), 'pageshow');
}, { passive:true });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    archiveVisible(currentState()?.analyses?.career, selectedRaceValue(), 'visibility-hidden').catch(() => {});
  }
  if (document.visibilityState === 'visible') {
    scheduleArchive(currentState()?.analyses?.career, selectedRaceValue(), 'visibility-visible');
  }
}, { passive:true });

setTimeout(() => {
  try { if (navigator.storage?.persist) navigator.storage.persist().catch(() => {}); } catch {}
  scheduleArchive(currentState()?.analyses?.career, selectedRaceValue(), 'startup');
}, 1000);

window.ATCareerArchiveRenderAutosaveV1691F647 = {
  version:VERSION,
  archive:archiveVisible,
  listDate
};
console.info('[AT AI]', VERSION, 'active - visible Career results are persisted to daily IndexedDB archive.');
})();