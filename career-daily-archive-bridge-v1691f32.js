/* AT AI Mobil - V16.9.1F32 CAREER DAILY ARCHIVE BRIDGE
   - F31 replaces runCareerAnalysis after the original daily archive hook.
   - Persist finished Career results back into the daily archive DB for archive/PDF.
   - Also repairs already calculated localStorage results after a browser reload.
*/
(() => {
'use strict';
if (window.__AT_CAREER_DAILY_ARCHIVE_BRIDGE_V1691F32__) return;
window.__AT_CAREER_DAILY_ARCHIVE_BRIDGE_V1691F32__ = true;

const VERSION = 'CAREER-DAILY-ARCHIVE-BRIDGE-V16.9.1F32';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const ENGINE = typeof CAREER_UI_VERSION !== 'undefined' ? CAREER_UI_VERSION : 'CAREER-UI';
let dbPromise = null;
let lastWriteKey = '';

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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

function currentRace(raceNo) {
  const st = currentState();
  return (Array.isArray(st?.races) ? st.races : []).find(r => String(r?.no) === String(raceNo)) || null;
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
    archiveBridgeVersion:VERSION
  };
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

function updateVisibleArchiveCount(date, city) {
  setTimeout(async () => {
    try {
      const rows = (await listDate(date)).filter(r => r?.kind === 'race' && clean(r?.city) === clean(city));
      const count = document.getElementById('careerArchiveCountV146');
      if (count) count.textContent = rows.length ? `(${rows.length})` : '';
    } catch {}
  }, 0);
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

  const writeKey = [date, city, raceValue || career.calculatedRace || 'all', races.map(r => clean(r?.no)).join(',')].join('|');
  if (writeKey === lastWriteKey && reason !== 'repair') {
    updateVisibleArchiveCount(date, city);
    return { saved:0, reason, skipped:'duplicate' };
  }

  let saved = 0;
  for (const race of races) {
    if (!race?.no) continue;
    const programRace = currentRace(race.no);
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
      meta:resultMeta(career),
      race,
      generatedAt:career.generatedAt || new Date().toISOString(),
      archivedAt:new Date().toISOString(),
      archiveBridgeVersion:VERSION,
      archiveBridgeReason:reason
    };
    if (await putRecord(record)) saved += 1;
  }

  lastWriteKey = writeKey;
  updateVisibleArchiveCount(date, city);
  try {
    window.dispatchEvent(new CustomEvent('at-ai:daily-career-archive-updated', { detail:{ version:VERSION, date, city, saved, reason } }));
  } catch {}
  if (saved && typeof console !== 'undefined') console.info('[AT AI]', VERSION, `${saved} kariyer kosusu gunluk arsive yazildi`, { reason, date, city });
  return { saved, reason, date, city };
}

async function repairFromState(reason = 'repair') {
  const st = currentState();
  const career = st?.analyses?.career;
  if (!career?.races?.length) return { saved:0, reason, skipped:'empty-state' };
  return archiveCareerResult(career, career.races, career.calculatedRace || 'all', reason);
}

if (typeof runCareerAnalysis === 'function') {
  const baseRun = runCareerAnalysis;
  runCareerAnalysis = async function(selectedRaces, raceValue, ...rest) {
    const out = await baseRun.call(this, selectedRaces, raceValue, ...rest);
    try { await archiveCareerResult(currentState()?.analyses?.career, selectedRaces, raceValue, 'runCareerAnalysis'); }
    catch (error) { console.warn('[AT AI]', VERSION, 'archive failed', error); }
    return out;
  };
}

document.addEventListener('click', event => {
  const target = event.target?.closest?.('#careerArchiveOpenV146,#careerArchivePdfV146,#careerArchiveDayPdfV146');
  if (!target) return;
  repairFromState('archive-button').catch(error => console.warn('[AT AI]', VERSION, 'button repair failed', error));
}, true);

window.addEventListener('pageshow', () => setTimeout(() => repairFromState('pageshow'), 350), { passive:true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') setTimeout(() => repairFromState('visible'), 350);
}, { passive:true });
setTimeout(() => repairFromState('startup'), 800);

window.ATCareerDailyArchiveBridgeV1691F32 = {
  version:VERSION,
  archive:archiveCareerResult,
  repair:repairFromState,
  listDate
};
console.info('[AT AI]', VERSION, 'active - F31 Career results are persisted to daily archive for PDF.');
})();

