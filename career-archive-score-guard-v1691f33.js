/* AT AI Mobil - V16.9.1F33 CAREER ARCHIVE SCORE GUARD
   - Replaces the F32 daily archive bridge.
   - Archives Career races only when at least one horse has a numeric score.
   - Prevents a scoreless browser restore/state from overwriting a scored archive row.
   - Removes stale all-scoreless race rows before archive/PDF restore paths can use them.
*/
(() => {
'use strict';
if (window.__AT_CAREER_ARCHIVE_SCORE_GUARD_V1691F33__) return;
window.__AT_CAREER_ARCHIVE_SCORE_GUARD_V1691F33__ = true;

const VERSION = 'CAREER-ARCHIVE-SCORE-GUARD-V16.9.1F33';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const ENGINE = typeof CAREER_UI_VERSION !== 'undefined' ? CAREER_UI_VERSION : 'CAREER-UI';
let dbPromise = null;
let replayingArchiveClick = false;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function finite(v) {
  if (v === null || v === undefined || v === '') return null;
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

function currentRace(raceNo) {
  const st = currentState();
  return (Array.isArray(st?.races) ? st.races : []).find(r => String(r?.no) === String(raceNo)) || null;
}

function recordMatchesProgram(record) {
  const st = currentState();
  if (!record || record.kind !== 'race') return false;
  if (clean(record.date) !== clean(st?.date) || clean(record.city) !== clean(st?.city)) return false;
  const programRace = currentRace(record.raceNo);
  if (!programRace) return false;
  return Boolean(record.fingerprint && record.fingerprint === raceFingerprint(programRace));
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
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function getRecord(key) {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
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
    } catch { resolve(false); }
  });
}

async function deleteRecord(key) {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
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
    } catch { resolve(out); }
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
  sim.scoreSource = sim.scoreSource || 'ARCHIVE_SCORE_GUARD_FALLBACK';
  sim.archiveScoreGuardNormalizedBy = VERSION;
  return { score:sim.score, normalized:true };
}

function normalizeRaceScores(race) {
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

function recordScoreQuality(record) {
  if (!record?.race) {
    return { horseCount:0, scoredHorseCount:0, scorelessHorseCount:0, normalizedScoreCount:0, hasAnyScore:false };
  }
  return normalizeRaceScores(record.race);
}

function updateVisibleArchiveCount(date, city) {
  setTimeout(async () => {
    try {
      const rows = (await listDate(date)).filter(r => {
        if (r?.kind !== 'race' || clean(r?.city) !== clean(city)) return false;
        return recordScoreQuality(r).scoredHorseCount > 0;
      });
      const count = document.getElementById('careerArchiveCountV146');
      if (count) count.textContent = rows.length ? `(${rows.length})` : '';
    } catch {}
  }, 0);
}

function resultMeta(result) {
  const st = currentState();
  return {
    type:result?.type || 'career',
    version:result?.version || ENGINE,
    careerApiVersion:result?.careerApiVersion || null,
    roadmapApiVersion:result?.roadmapApiVersion || null,
    raceMetaApiVersion:result?.raceMetaApiVersion || null,
    date:result?.date || st?.date || '',
    city:result?.city || st?.city || '',
    cityName:result?.cityName || currentCityName(),
    rule:result?.rule || null,
    similarityMethod:result?.similarityMethod || null,
    similarityNote:result?.similarityNote || null,
    fastProgressVersion:result?.fastProgressVersion || null,
    archiveBridgeVersion:VERSION,
    archiveScoreGuardVersion:VERSION
  };
}

function selectedWanted(result, selectedRaces, raceValue) {
  if (raceValue === 'all') {
    const fromSelection = (Array.isArray(selectedRaces) ? selectedRaces : []).map(r => String(r?.no)).filter(Boolean);
    if (fromSelection.length) return new Set(fromSelection);
  }
  if (raceValue && raceValue !== 'all') return new Set([String(raceValue)]);
  if (result?.calculatedRace && result.calculatedRace !== 'all') return new Set([String(result.calculatedRace)]);
  return null;
}

function selectedRaceNosForCurrentView() {
  const st = currentState();
  const selected = clean(document.getElementById('analysisRace')?.value || '');
  if (selected && selected !== 'all') return [selected];
  const races = Array.isArray(st?.races) ? st.races : [];
  return races.map(r => clean(r?.no)).filter(Boolean);
}

async function archiveCareerResult(result, selectedRaces = [], raceValue = 'all', reason = 'manual') {
  const st = currentState();
  const career = result || st?.analyses?.career;
  if (!career || !Array.isArray(career.races) || !career.races.length) return { saved:0, reason, skipped:'empty-career' };

  const date = clean(career.date || st?.date);
  const city = clean(career.city || st?.city);
  if (!date || !city) return { saved:0, reason, skipped:'missing-date-city' };

  const wanted = selectedWanted(career, selectedRaces, raceValue);
  const races = career.races.filter(r => wanted ? wanted.has(String(r?.no)) : true);
  if (!races.length) return { saved:0, reason, skipped:'no-selected-races' };

  let saved = 0;
  let skippedScoreless = 0;
  let keptScoredExisting = 0;
  let skippedWorseThanExisting = 0;
  let deletedScoreless = 0;
  let normalizedScoreCount = 0;

  for (const race of races) {
    if (!race?.no) continue;
    const programRace = currentRace(race.no);
    const key = raceKey(date, city, race.no);
    const existing = await getRecord(key);
    const existingQuality = recordScoreQuality(existing);
    const scoreQuality = normalizeRaceScores(race);
    normalizedScoreCount += scoreQuality.normalizedScoreCount;

    if (scoreQuality.horseCount <= 0 || scoreQuality.scoredHorseCount <= 0) {
      skippedScoreless += 1;
      if (existingQuality.scoredHorseCount > 0) {
        keptScoredExisting += 1;
      } else if (existing?.key && await deleteRecord(existing.key)) {
        deletedScoreless += 1;
      }
      continue;
    }

    const fingerprint = raceFingerprint(programRace || race);
    if (existingQuality.scoredHorseCount > scoreQuality.scoredHorseCount && existing?.fingerprint === fingerprint) {
      skippedWorseThanExisting += 1;
      continue;
    }

    const meta = {
      ...resultMeta(career),
      scoreQuality,
      archiveBridgeReason:reason
    };
    const record = {
      key,
      kind:'race',
      schemaVersion:'DAILY-CAREER-ARCHIVE-V14.6',
      engine:ENGINE,
      date,
      city,
      cityName:clean(career.cityName || currentCityName()),
      raceNo:String(race.no),
      fingerprint,
      meta,
      race,
      scoreQuality,
      generatedAt:career.generatedAt || new Date().toISOString(),
      archivedAt:new Date().toISOString(),
      archiveBridgeVersion:VERSION,
      archiveScoreGuardVersion:VERSION,
      archiveBridgeReason:reason
    };
    if (await putRecord(record)) saved += 1;
  }

  if (normalizedScoreCount && st?.analyses?.career === career && typeof save === 'function') {
    try { save(); } catch {}
  }

  updateVisibleArchiveCount(date, city);
  try {
    window.dispatchEvent(new CustomEvent('at-ai:daily-career-archive-updated', {
      detail:{ version:VERSION, date, city, saved, skippedScoreless, keptScoredExisting, skippedWorseThanExisting, deletedScoreless, reason }
    }));
  } catch {}
  if ((saved || skippedScoreless || deletedScoreless) && typeof console !== 'undefined') {
    console.info('[AT AI]', VERSION, 'career archive score guard', {
      reason, date, city, saved, skippedScoreless, keptScoredExisting, skippedWorseThanExisting, deletedScoreless
    });
  }
  return { saved, reason, date, city, skippedScoreless, keptScoredExisting, skippedWorseThanExisting, deletedScoreless };
}

async function repairFromState(reason = 'repair') {
  const st = currentState();
  const career = st?.analyses?.career;
  if (!career?.races?.length) return { saved:0, reason, skipped:'empty-state' };
  return archiveCareerResult(career, career.races, career.calculatedRace || 'all', reason);
}

async function pruneScorelessForDate(date, city = '') {
  const rows = await listDate(date);
  let deleted = 0;
  let normalized = 0;
  for (const row of rows) {
    if (row?.kind !== 'race') continue;
    if (city && clean(row.city) !== clean(city)) continue;
    const quality = recordScoreQuality(row);
    if (quality.normalizedScoreCount && quality.scoredHorseCount > 0) {
      row.scoreQuality = quality;
      row.archiveScoreGuardVersion = VERSION;
      row.meta = { ...(row.meta || {}), scoreQuality:quality, archiveScoreGuardVersion:VERSION };
      if (await putRecord(row)) normalized += 1;
      continue;
    }
    if (quality.scoredHorseCount > 0) continue;
    if (quality.horseCount <= 0 || recordMatchesProgram(row) || !city) {
      if (await deleteRecord(row.key)) deleted += 1;
    }
  }
  return { deleted, normalized };
}

async function pruneScorelessForCurrentSelection() {
  const st = currentState();
  const date = clean(st?.date);
  const city = clean(st?.city);
  if (!date || !city) return { deleted:0, normalized:0 };

  const raceNos = selectedRaceNosForCurrentView();
  if (!raceNos.length) return pruneScorelessForDate(date, city);

  let deleted = 0;
  let normalized = 0;
  for (const raceNo of raceNos) {
    const rec = await getRecord(raceKey(date, city, raceNo));
    if (!rec) continue;
    const quality = recordScoreQuality(rec);
    if (quality.normalizedScoreCount && quality.scoredHorseCount > 0) {
      rec.scoreQuality = quality;
      rec.archiveScoreGuardVersion = VERSION;
      rec.meta = { ...(rec.meta || {}), scoreQuality:quality, archiveScoreGuardVersion:VERSION };
      if (await putRecord(rec)) normalized += 1;
      continue;
    }
    if (quality.scoredHorseCount > 0) continue;
    if (quality.horseCount <= 0 || recordMatchesProgram(rec)) {
      if (await deleteRecord(rec.key)) deleted += 1;
    }
  }
  updateVisibleArchiveCount(date, city);
  return { deleted, normalized };
}

async function prepareArchiveAction(reason = 'archive-action') {
  const st = currentState();
  const date = clean(st?.date);
  const city = clean(st?.city);
  const repaired = await repairFromState(reason);
  const pruned = await pruneScorelessForCurrentSelection();
  updateVisibleArchiveCount(date, city);
  return { repaired, pruned };
}

async function prepareRecordAction(key, reason = 'record-action') {
  await repairFromState(reason);
  let rec = await getRecord(key);
  if (!rec) return true;
  let quality = recordScoreQuality(rec);
  if (quality.normalizedScoreCount && quality.scoredHorseCount > 0) {
    rec.scoreQuality = quality;
    rec.archiveScoreGuardVersion = VERSION;
    rec.meta = { ...(rec.meta || {}), scoreQuality:quality, archiveScoreGuardVersion:VERSION };
    await putRecord(rec);
    return true;
  }
  if (quality.scoredHorseCount > 0) return true;

  const st = currentState();
  const raceNo = clean(rec.raceNo);
  const careerRace = (Array.isArray(st?.analyses?.career?.races) ? st.analyses.career.races : [])
    .find(r => clean(r?.no) === raceNo);
  if (careerRace) {
    await archiveCareerResult(st.analyses.career, [careerRace], raceNo, `${reason}-state-race`);
    rec = await getRecord(key);
    quality = recordScoreQuality(rec);
    if (quality.scoredHorseCount > 0) return true;
  }

  if (rec?.key && await deleteRecord(rec.key)) {
    updateVisibleArchiveCount(rec.date, rec.city);
  }
  try { alert('Bu arsiv kaydi puansiz oldugu icin kaldirildi. Lutfen bu kosuyu Yeniden Hesapla ile tekrar olusturun.'); } catch {}
  return false;
}

if (typeof runCareerAnalysis === 'function') {
  const baseRunCareerF33 = runCareerAnalysis;
  runCareerAnalysis = async function(selectedRaces, raceValue, ...rest) {
    const out = await baseRunCareerF33.call(this, selectedRaces, raceValue, ...rest);
    try { await archiveCareerResult(currentState()?.analyses?.career, selectedRaces, raceValue, 'runCareerAnalysis'); }
    catch (error) { console.warn('[AT AI]', VERSION, 'archive failed', error); }
    return out;
  };
}

if (typeof runAnalysis === 'function') {
  const baseRunAnalysisF33 = runAnalysis;
  runAnalysis = async function(...args) {
    try { await prepareArchiveAction('runAnalysis-before-restore'); }
    catch (error) { console.warn('[AT AI]', VERSION, 'pre-run archive guard failed', error); }
    return baseRunAnalysisF33.apply(this, args);
  };
  try {
    const btn = document.getElementById('runAnalysis');
    if (btn) btn.onclick = runAnalysis;
  } catch {}
}

document.addEventListener('click', event => {
  const target = event.target?.closest?.('#careerArchiveOpenV146,#careerArchivePdfV146,#careerArchiveDayPdfV146,[data-open],[data-pdf]');
  if (!target || replayingArchiveClick) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const key = target.dataset?.open || target.dataset?.pdf || '';
  const task = key
    ? prepareRecordAction(key, 'archive-row-click')
    : prepareArchiveAction(target.id || 'archive-button');

  task.then(allow => {
    if (allow === false) return;
    replayingArchiveClick = true;
    try { target.click(); }
    finally { setTimeout(() => { replayingArchiveClick = false; }, 0); }
  }).catch(error => {
    replayingArchiveClick = false;
    console.warn('[AT AI]', VERSION, 'archive click guard failed', error);
  });
}, true);

window.addEventListener('pageshow', () => setTimeout(() => prepareArchiveAction('pageshow'), 350), { passive:true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') setTimeout(() => prepareArchiveAction('visible'), 350);
}, { passive:true });
setTimeout(() => prepareArchiveAction('startup'), 800);

window.ATCareerArchiveScoreGuardV1691F33 = {
  version:VERSION,
  archive:archiveCareerResult,
  repair:repairFromState,
  prepare:prepareArchiveAction,
  pruneScorelessForDate,
  listDate
};
console.info('[AT AI]', VERSION, 'active - scoreless Career archive rows are blocked before restore/PDF.');
})();
