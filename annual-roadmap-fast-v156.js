/* AT AI Mobil — V15.6 Annual Archive Fast Roadmap
   - Analiz formüllerini değiştirmez.
   - Tamamlanmış yıllık arşiv yıllarında aday yarışı IndexedDB'den seçer.
   - Yerel tarihsel yarış/ilk-3/kariyer çağrılarını tarayıcı cache'i ile hazırlar.
   - Arşiv kapsamı dışındaki sourceYear'ları mevcut V10 API'ye yalnız o yıllar için bırakır.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_ROADMAP_FAST_V156__) return;
window.__AT_ANNUAL_ROADMAP_FAST_V156__ = true;

const VERSION = 'ANNUAL-ROADMAP-FAST-V15.6';
const ARCHIVE_DB = 'at_ai_tjk_annual_archive_v13';
const ARCHIVE_RACES = 'races';
const ARCHIVE_META = 'meta';
const ARCHIVE_DAY = 'daycache';
const TOP3_DB = 'at_ai_tjk_annual_top3_v137';
const TOP3_STORE = 'top3';
const ADAPTIVE_PATH = '/api/tjk-adaptive-roadmap-v10';
const DAY_WINDOW = 45;
const DEFAULT_MIN_YEAR = 2000;
const LOCAL_RACE_CONCURRENCY = 3;
const LOCAL_CAREER_CONCURRENCY = 2;
const previousFetch = window.fetch.bind(window);

let archiveDbPromise = null;
let top3DbPromise = null;
const activeFast = new Map();

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
function normalizeClass(v = '') { return upper(v).replace(/\s*\/\s*/g, '/').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim(); }
function normalizeCity(v = '') { return upper(v).replace(/[^A-Z0-9]/g, ''); }
function normalizeTrack(v = '') {
  const t = upper(v);
  if (t.includes('SENTETIK')) return 'SENTETIK';
  if (t.includes('CIM')) return 'CIM';
  if (t.includes('KUM')) return 'KUM';
  return t;
}
function normalizeDistance(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  const m = clean(v).match(/\d{3,4}/);
  return m ? Number.parseInt(m[0], 10) : 0;
}
function parseAge(v = '') {
  const t = upper(v).replace(/\s+/g, ' ');
  let breed = '';
  if (t.includes('INGILIZ')) breed = 'I';
  else if (t.includes('ARAP')) breed = 'A';
  let m = t.match(/(\d+)\s*VE\s*YUKARI/);
  if (m) return { breed, min:Number(m[1]), max:99 };
  m = t.match(/(\d+)\s*YASLI/);
  if (m) return { breed, min:Number(m[1]), max:Number(m[1]) };
  m = t.replace(/\s+/g, '').match(/^(\d+)(\+)?([IA])$/);
  if (m) return { breed:m[3], min:Number(m[1]), max:m[2] ? 99 : Number(m[1]) };
  return { breed, min:null, max:null };
}
function ageKey(v = '') {
  const a = parseAge(v);
  if (a.breed && a.min !== null && a.max !== null) return `${a.breed}:${a.min}:${a.max}`;
  return upper(v).replace(/\s+/g, '');
}
function parseRaceFamily(v = '') {
  const t = normalizeClass(v);
  let m = t.match(/HANDIKAP\s*(\d+)/); if (m) return { family:'HANDIKAP', level:Number(m[1]) };
  m = t.match(/SARTLI\s*(\d+)/); if (m) return { family:'SARTLI', level:Number(m[1]) };
  m = t.match(/\bKV[- ]*(\d+)\b/); if (m) return { family:'KV', level:Number(m[1]) };
  m = t.match(/\bG([123])\b/); if (m) return { family:'GROUP', level:Number(m[1]) };
  if (t.includes('MAIDEN')) return { family:'MAIDEN', level:0 };
  if (t.includes('SATIS')) return { family:'SATIS', level:0 };
  return { family:t.split('/')[0], level:null };
}
function classCoreKey(v = '') {
  const normalized = normalizeClass(v);
  const family = parseRaceFamily(normalized);
  const suffix = normalized.split('/').slice(1)
    .map(x => clean(x).replace(/\s+/g, ''))
    .filter(Boolean)
    .filter(x => !/^Y-?\d+$/.test(x));
  return `${family.family}:${family.level ?? ''}|${suffix.join('/')}`;
}
function parseIso(v = '') {
  const m = clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { year:Number(m[1]), month:Number(m[2]), day:Number(m[3]) } : null;
}
function anchorIso(targetIso, year) {
  const p = parseIso(targetIso); if (!p) return null;
  const maxDay = new Date(Date.UTC(year, p.month, 0)).getUTCDate();
  const day = Math.min(p.day, maxDay);
  return `${year}-${String(p.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function daysBetween(a, b) {
  const x = parseIso(a), y = parseIso(b); if (!x || !y) return null;
  return Math.round(Math.abs(Date.UTC(x.year,x.month-1,x.day)-Date.UTC(y.year,y.month-1,y.day))/86400000);
}
function sourceYearFor(targetDate, historicalIso, minYear) {
  const target = parseIso(targetDate), historical = parseIso(historicalIso);
  if (!target || !historical || historicalIso >= targetDate) return null;
  let best = null;
  for (const year of [historical.year-1,historical.year,historical.year+1]) {
    if (year >= target.year || year < minYear) continue;
    const anchorDate = anchorIso(targetDate, year);
    const diff = daysBetween(anchorDate, historicalIso);
    if (diff === null || diff > DAY_WINDOW) continue;
    if (!best || diff < best.dayDifference) best = { sourceYear:year, anchorDate, dayDifference:diff };
  }
  return best;
}
function calendarPenalty(days) { return days <= 7 ? 0 : days <= 21 ? 3 : 6; }
function classifyCandidate(target, row, annual) {
  const rowClass = row.classRaw || row.class || '';
  const rowAge = row.groupRaw || row.ageGroup || '';
  const coreClass = classCoreKey(target.class) === classCoreKey(rowClass);
  const age = ageKey(target.ageGroup) === ageKey(rowAge);
  if (!coreClass || !age) return null;
  const city = normalizeCity(target.city) === normalizeCity(row.city);
  const distance = Number(target.distance) === Number(row.distance);
  const track = normalizeTrack(target.track) === normalizeTrack(row.track);
  let referenceType = null;
  if (city && distance && track) referenceType = 'EXACT';
  else if (city) referenceType = 'RACE_FAMILY';
  else if (distance && track) referenceType = 'CONDITION_TWIN';
  else return null;

  const distanceDiff = Math.abs(Number(target.distance)-Number(row.distance));
  const distanceDiffPct = target.distance ? distanceDiff/Number(target.distance) : 1;
  let score = 100;
  if (!city) score -= 15;
  score -= Math.min(45, Math.round(distanceDiffPct*100));
  if (!track) score -= 35;
  score -= calendarPenalty(annual.dayDifference);
  score = Math.max(0, Math.min(100, score));
  const tier = score >= 85 ? 'HIGH' : score >= 70 ? 'MEDIUM' : score >= 50 ? 'SUPPORT' : 'LOW';
  const color = tier === 'HIGH' ? 'GREEN' : tier === 'MEDIUM' ? 'YELLOW' : tier === 'SUPPORT' ? 'ORANGE' : 'RED';
  const label = referenceType === 'EXACT' ? 'TAM TARİHSEL EŞLEŞME' : referenceType === 'CONDITION_TWIN' ? 'KOŞUL İKİZİ' : 'AYNI YARIŞ AİLESİ';
  const explanation = [
    label,
    city ? 'aynı hipodrom' : `hipodrom farklı (${row.city})`,
    distance ? `mesafe aynı ${row.distance} m` : `mesafe ${row.distance} m → hedef ${target.distance} m (fark %${Math.round(distanceDiffPct*100)})`,
    track ? 'pist aynı' : `pist farklı (${row.track} → ${target.track})`,
    `takvim farkı ${annual.dayDifference} gün`
  ].join(' · ');
  return {
    referenceType, referenceLabel:label, transferabilityScore:score, transferabilityTier:tier, transferabilityColor:color,
    explanation, exactConditionMatch:referenceType === 'EXACT',
    exactFields:{ city, class:coreClass, ageGroup:age, distance, track },
    distanceDifference:distanceDiff, distanceDifferencePct:Math.round(distanceDiffPct*100)
  };
}
function candidateSort(a, b) {
  const priority = { EXACT:3, CONDITION_TWIN:2, RACE_FAMILY:1 };
  return b.transferabilityScore-a.transferabilityScore ||
    (priority[b.referenceType]-priority[a.referenceType]) ||
    a.calendarDayDifference-b.calendarDayDifference ||
    b.date.localeCompare(a.date);
}
function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length); let cursor = 0;
  async function run() {
    while (true) {
      const i = cursor++; if (i >= list.length) return;
      out[i] = await worker(list[i], i);
    }
  }
  return Promise.all(Array.from({ length:Math.min(Math.max(1,limit),list.length || 1) }, run)).then(() => out);
}

function openArchiveDb() {
  if (archiveDbPromise) return archiveDbPromise;
  archiveDbPromise = new Promise(resolve => {
    try {
      const q = indexedDB.open(ARCHIVE_DB);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return archiveDbPromise;
}
function openTop3Db() {
  if (top3DbPromise) return top3DbPromise;
  top3DbPromise = new Promise(resolve => {
    try {
      const q = indexedDB.open(TOP3_DB, 1);
      q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(TOP3_STORE)) q.result.createObjectStore(TOP3_STORE, { keyPath:'key' }); };
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return top3DbPromise;
}
async function dbGet(dbPromiseFn, storeName, key) {
  const db = await dbPromiseFn(); if (!db || !db.objectStoreNames.contains(storeName)) return null;
  return new Promise(resolve => {
    try {
      const q = db.transaction(storeName,'readonly').objectStore(storeName).get(key);
      q.onsuccess = () => resolve(q.result?.value ?? null);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function dbPut(dbPromiseFn, storeName, key, value) {
  const db = await dbPromiseFn(); if (!db || !db.objectStoreNames.contains(storeName)) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(storeName,'readwrite');
      tx.objectStore(storeName).put({ key, value, updatedAt:Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function allMeta() {
  const db = await openArchiveDb(); if (!db || !db.objectStoreNames.contains(ARCHIVE_META)) return [];
  return new Promise(resolve => {
    try {
      const q = db.transaction(ARCHIVE_META,'readonly').objectStore(ARCHIVE_META).getAll();
      q.onsuccess = () => resolve((q.result || []).map(x => x.value).filter(Boolean));
      q.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}
async function rowsForYears(years) {
  const set = years instanceof Set ? years : new Set(years || []);
  if (!set.size) return [];
  const db = await openArchiveDb(); if (!db || !db.objectStoreNames.contains(ARCHIVE_RACES)) return [];
  const sorted = [...set].map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  const lo = sorted[0], hi = sorted[sorted.length-1];
  return new Promise(resolve => {
    const out = [];
    try {
      const tx = db.transaction(ARCHIVE_RACES,'readonly');
      const store = tx.objectStore(ARCHIVE_RACES);
      const index = store.indexNames.contains('year') ? store.index('year') : null;
      const q = index ? index.openCursor(IDBKeyRange.bound(lo,hi)) : store.openCursor();
      q.onsuccess = e => {
        const c = e.target.result;
        if (!c) return;
        const row = c.value?.value;
        if (row && set.has(Number(row.year))) out.push(row);
        c.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = tx.onabort = () => resolve([]);
    } catch { resolve([]); }
  });
}
function yearsTouchedByWindow(targetDate, sourceYear, minYear) {
  const anchor = anchorIso(targetDate, sourceYear); if (!anchor) return new Set();
  const p = parseIso(anchor); if (!p) return new Set();
  const center = Date.UTC(p.year,p.month-1,p.day);
  const targetTs = (() => { const t=parseIso(targetDate); return t ? Date.UTC(t.year,t.month-1,t.day) : Infinity; })();
  const minTs = Date.UTC(minYear,0,1);
  const out = new Set();
  for (const delta of [-DAY_WINDOW, DAY_WINDOW]) {
    const ts = Math.min(targetTs-86400000, Math.max(minTs, center + delta*86400000));
    out.add(new Date(ts).getUTCFullYear());
  }
  out.add(sourceYear);
  return out;
}
function requiredSourceYears(targetDate, minYear) {
  const p = parseIso(targetDate); if (!p) return [];
  const out = [];
  for (let y=p.year-1; y>=minYear; y--) out.push(y);
  return out;
}

function parseAdaptiveRequest(input, init) {
  try {
    const method = clean(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase() || 'GET';
    if (method !== 'GET') return null;
    const url = new URL(input instanceof Request ? input.url : String(input || ''), location.origin);
    if (url.origin !== location.origin || url.pathname !== ADAPTIVE_PATH) return null;
    if (url.searchParams.has('years') || url.searchParams.has('_v156remote')) return null;
    const target = {
      date:clean(url.searchParams.get('date')),
      city:clean(url.searchParams.get('city')),
      class:clean(url.searchParams.get('class')),
      ageGroup:clean(url.searchParams.get('ageGroup')),
      track:clean(url.searchParams.get('track')),
      distance:normalizeDistance(url.searchParams.get('distance'))
    };
    const p = parseIso(target.date);
    if (!p || !target.city || !target.class || !target.ageGroup || !target.track || !target.distance) return null;
    const reqMin = Number(url.searchParams.get('minYear') || DEFAULT_MIN_YEAR);
    const minYear = Math.min(p.year-1, Math.max(1950, Number.isFinite(reqMin) ? reqMin : DEFAULT_MIN_YEAR));
    return { url, target, minYear };
  } catch { return null; }
}
function fastKey(req) {
  const t = req.target;
  return [t.date,normalizeCity(t.city),classCoreKey(t.class),ageKey(t.ageGroup),normalizeTrack(t.track),t.distance,req.minYear].join('|');
}

async function fetchDay(row) {
  const key = `${clean(row.date)}|${clean(row.cityId)}|${clean(row.city)}`;
  const cached = await dbGet(openArchiveDb, ARCHIVE_DAY, key);
  if (cached?.races) return cached;
  const url = `/api/tjk-race-meta?date=${encodeURIComponent(row.date)}&cityId=${encodeURIComponent(row.cityId || '')}&cityName=${encodeURIComponent(row.city || '')}`;
  const response = await previousFetch(url, { cache:'no-store' });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Koşu No API ${response.status}`);
  await dbPut(openArchiveDb, ARCHIVE_DAY, key, data);
  return data;
}
function sameRowCondition(a, b) {
  return normalizeCity(a.city) === normalizeCity(b.city) &&
    clean(a.date) === clean(b.date) &&
    classCoreKey(a.classRaw || a.class || '') === classCoreKey(b.classRaw || b.class || '') &&
    ageKey(a.groupRaw || a.ageGroup || '') === ageKey(b.groupRaw || b.ageGroup || '') &&
    Number(a.distance) === Number(b.distance) &&
    normalizeTrack(a.track) === normalizeTrack(b.track);
}
async function resolveRaceNo(candidate, archiveRows) {
  if (Number(candidate.raceNo)) return Number(candidate.raceNo);
  const row = candidate._archiveRow || candidate;
  const day = await fetchDay(row);
  const matches = (Array.isArray(day?.races) ? day.races : []).filter(r =>
    classCoreKey(r.class || r.yaradi1 || '') === classCoreKey(row.classRaw || row.class || '') &&
    ageKey(r.ageGroup || r.yaradi2 || '') === ageKey(row.groupRaw || row.ageGroup || '') &&
    Number(r.distance || r.mesafe || 0) === Number(row.distance) &&
    normalizeTrack(r.track || r.pist || '') === normalizeTrack(row.track)
  ).map(r => Number(r.no)).filter(Boolean).sort((a,b)=>a-b);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const same = archiveRows.filter(x => sameRowCondition(x,row)).sort((a,b)=>Number(a.occurrenceIndex||0)-Number(b.occurrenceIndex||0)||Number(a.rowIndex||0)-Number(b.rowIndex||0));
    const idx = Math.max(0, same.findIndex(x => clean(x.id) === clean(row.id)));
    if (matches[idx]) return matches[idx];
  }
  return 0;
}

function historyKey(date, city, raceNo) {
  return `${clean(date)}|${normalizeCity(city)}|${Number(raceNo || 0)}`;
}
function cacheableHistory(data) { return data && data.ok !== false && Array.isArray(data.top3) && data.top3.length > 0; }
async function getHistory(candidate) {
  const key = historyKey(candidate.date,candidate.city,candidate.raceNo);
  const cached = await dbGet(openTop3Db, TOP3_STORE, key);
  if (cached?.history && cacheableHistory(cached.history)) return cached.history;
  const url = `/api/tjk-history?date=${encodeURIComponent(candidate.date)}&city=${encodeURIComponent(candidate.city)}&raceNo=${encodeURIComponent(candidate.raceNo)}`;
  const response = await previousFetch(url, { cache:'no-store' });
  const data = await response.json();
  if (!response.ok || !cacheableHistory(data)) throw new Error(data?.error || `Geçmiş yarış API ${response.status}`);
  await dbPut(openTop3Db, TOP3_STORE, key, { history:data, date:candidate.date, city:candidate.city, raceNo:candidate.raceNo, cachedAt:new Date().toISOString() });
  return data;
}
function normalizeTop3Horse(raw) {
  const finish = Number(raw?.finish ?? raw?.rank ?? raw?.sira ?? 0);
  if (!finish || finish < 1 || finish > 3) return null;
  return {
    finish,
    horseId:clean(raw?.horseId ?? raw?.atId ?? raw?.id),
    horseName:clean(raw?.horseName ?? raw?.atAdi ?? raw?.name),
    programNo:Number(raw?.programNo ?? raw?.number ?? raw?.no) || null,
    margin:clean(raw?.margin ?? raw?.fark ?? raw?.distanceBehind ?? raw?.behind) || null
  };
}
async function buildHistoricalHorseCareer(horse, historicalDateIso) {
  const result = {
    finish:horse.finish, horseId:horse.horseId, horseName:horse.horseName, programNo:horse.programNo, margin:horse.margin || null,
    career:{ ok:false, cutoffExclusive:historicalDateIso, winsBefore:[], top5Before:[], preparationPathBefore:[] }
  };
  if (!horse.horseId) { result.career.error = 'At ID bulunamadı.'; return result; }
  try {
    const url = `/api/tjk-career-v10?horseId=${encodeURIComponent(horse.horseId)}&before=${encodeURIComponent(historicalDateIso)}`;
    const response = await previousFetch(url, { cache:'default', headers:{ accept:'application/json' } });
    const career = await response.json();
    if (!response.ok || !career?.ok) throw new Error(career?.error || `Kariyer API ${response.status}`);
    result.career = {
      ok:true, cutoffExclusive:historicalDateIso, careerVersion:career.version || null, analysisMode:career.analysisMode || null,
      winsBefore:Array.isArray(career.wins) ? career.wins : [],
      top5Before:Array.isArray(career.top5) ? career.top5 : [],
      preparationPathBefore:Array.isArray(career.preparationPath) ? career.preparationPath : [],
      audit:career.audit || {}, counts:career.counts || {}
    };
  } catch (e) { result.career.error = e?.message || 'Kariyer hazırlanamadı.'; }
  return result;
}
async function buildHistoricalRace(candidate) {
  const output = {
    ok:false, date:candidate.date, city:candidate.city, raceNo:candidate.raceNo, sourceYear:candidate.sourceYear, anchorDate:candidate.anchorDate,
    calendarDayDifference:candidate.calendarDayDifference, referenceType:candidate.referenceType, referenceLabel:candidate.referenceLabel,
    transferabilityScore:candidate.transferabilityScore, transferabilityTier:candidate.transferabilityTier, transferabilityColor:candidate.transferabilityColor,
    explanation:candidate.explanation, exactConditionMatch:candidate.exactConditionMatch, exactFields:candidate.exactFields,
    raceConditionSimilarity:candidate.transferabilityScore, distanceDifference:candidate.distanceDifference, distanceDifferencePct:candidate.distanceDifferencePct,
    alternatives:candidate.alternatives || [], candidateCondition:{ class:candidate.class, ageGroup:candidate.ageGroup, track:candidate.track, distance:candidate.distance }, top3:[]
  };
  try {
    const history = await getHistory(candidate);
    output.condition = {
      class:clean(history.class || candidate.class), ageGroup:clean(history.ageGroup || candidate.ageGroup),
      distance:normalizeDistance(history.distance || candidate.distance), track:clean(history.track || candidate.track), raw:clean(history.conditionRaw) || null
    };
    const top3 = (Array.isArray(history.top3) ? history.top3 : []).map(normalizeTop3Horse).filter(Boolean).sort((a,b)=>a.finish-b.finish).slice(0,3);
    if (!top3.length) throw new Error('Tarihsel yarışın gerçek ilk 3 verisi bulunamadı.');
    output.top3 = await mapLimit(top3, LOCAL_CAREER_CONCURRENCY, horse => buildHistoricalHorseCareer(horse,candidate.date));
    output.top3Count = output.top3.length;
    output.ok = true;
  } catch (e) { output.error = e?.message || 'Tarihsel yarış hazırlanamadı.'; }
  return output;
}
function getRules(minYear) {
  return {
    targetRaceSource:'TJK Günlük Yarış Programı', historicalRaceSource:'TJK Yıllık Yarış Arşivi + TJK Yarış Sonuçları / Koşu Sorgulama',
    pastDateOnly:true, yearByYear:true, calendarWindowDays:DAY_WINDOW,
    exactReference:'same city + class core + age/breed + distance + track',
    raceFamilyReference:'same city + class core + age/breed; distance/track may differ',
    conditionTwinReference:'different city + same class core + age/breed + distance + track',
    classCoreNote:'Y-1/Y-2 gibi jokey alt şartları yarış ailesi çekirdeğinden çıkarılır',
    transferability:'distance + track + city + calendar penalties', careerWinPath:'finish=1',
    preparationPath:'finish 1..5; no-win horses use preparation path', minYear
  };
}

async function buildFastData(req) {
  const target = req.target, minYear = req.minYear;
  const sourceYears = requiredSourceYears(target.date,minYear);
  if (!sourceYears.length) return null;
  const metas = (await allMeta()).filter(x => x?.status === 'complete' && Number(x.year));
  const completeCalendarYears = new Set(metas.map(x => Number(x.year)));
  if (!completeCalendarYears.size) return null;

  const localSourceYears = new Set(sourceYears.filter(sourceYear => {
    const touched = yearsTouchedByWindow(target.date,sourceYear,minYear);
    return touched.size && [...touched].every(y => completeCalendarYears.has(y));
  }));
  if (!localSourceYears.size) return null;

  const calendarYearsNeeded = new Set();
  for (const sourceYear of localSourceYears) for (const y of yearsTouchedByWindow(target.date,sourceYear,minYear)) calendarYearsNeeded.add(y);
  const archiveRows = await rowsForYears(calendarYearsNeeded);
  if (!archiveRows.length) return null;

  const grouped = new Map();
  for (const row of archiveRows) {
    const historicalIso = clean(row.date || row.isoDate);
    const annual = sourceYearFor(target.date,historicalIso,minYear);
    if (!annual || !localSourceYears.has(annual.sourceYear)) continue;
    const cls = classifyCandidate(target,row,annual);
    if (!cls) continue;
    const candidate = {
      date:historicalIso,
      dateDisplay:historicalIso,
      city:clean(row.city),
      cityId:clean(row.cityId),
      raceNo:Number(row.raceNo || 0) || null,
      class:clean(row.classRaw || row.class),
      ageGroup:clean(row.groupRaw || row.ageGroup),
      distance:Number(row.distance || 0), track:clean(row.track),
      sourceYear:annual.sourceYear, anchorDate:annual.anchorDate, calendarDayDifference:annual.dayDifference,
      _archiveRow:row, ...cls
    };
    if (!grouped.has(candidate.sourceYear)) grouped.set(candidate.sourceYear,[]);
    grouped.get(candidate.sourceYear).push(candidate);
  }

  const selectedLocal = [];
  const failedResolutionYears = new Set();
  await mapLimit([...localSourceYears], 5, async year => {
    const rows = (grouped.get(year) || []).sort(candidateSort);
    if (!rows.length) return;
    const best = rows[0];
    best.alternatives = rows.slice(1,4).map(x => ({ date:x.date, city:x.city, raceNo:x.raceNo, referenceType:x.referenceType, transferabilityScore:x.transferabilityScore, distance:x.distance, track:x.track }));
    try {
      const raceNo = await resolveRaceNo(best,archiveRows);
      if (!raceNo) { failedResolutionYears.add(year); return; }
      best.raceNo = raceNo;
      selectedLocal.push(best);
    } catch { failedResolutionYears.add(year); }
  });
  for (const year of failedResolutionYears) localSourceYears.delete(year);

  const missingYears = sourceYears.filter(y => !localSourceYears.has(y));
  let remote = null;
  if (missingYears.length) {
    const url = new URL(ADAPTIVE_PATH,location.origin);
    url.searchParams.set('date',target.date);
    url.searchParams.set('city',target.city);
    url.searchParams.set('class',target.class);
    url.searchParams.set('ageGroup',target.ageGroup);
    url.searchParams.set('track',target.track);
    url.searchParams.set('distance',String(target.distance));
    url.searchParams.set('minYear',String(Math.min(...missingYears)));
    url.searchParams.set('years',missingYears.join(','));
    url.searchParams.set('_v156remote','1');
    const response = await previousFetch(url.pathname + url.search,{cache:'no-store'});
    remote = await response.json();
    if (!response.ok || !remote?.ok) throw new Error(remote?.error || `Eksik yıllar API ${response.status}`);
  }

  const localHistoricalRaces = await mapLimit(
    selectedLocal.filter(x => localSourceYears.has(x.sourceYear)).sort((a,b)=>b.sourceYear-a.sourceYear),
    LOCAL_RACE_CONCURRENCY,
    buildHistoricalRace
  );
  const remoteHistorical = Array.isArray(remote?.historicalRaces) ? remote.historicalRaces.filter(x => missingYears.includes(Number(x?.sourceYear))) : [];
  const historicalRaces = [...localHistoricalRaces,...remoteHistorical].sort((a,b)=>Number(b?.sourceYear||0)-Number(a?.sourceYear||0));

  const remoteYearMap = new Map((Array.isArray(remote?.yearResults) ? remote.yearResults : []).map(x => [Number(x.year),x]));
  const yearResults = sourceYears.map(year => {
    if (!localSourceYears.has(year)) return remoteYearMap.get(year) || { year, anchorDate:anchorIso(target.date,year), windowDays:DAY_WINDOW, matchCount:0, best:null, matches:[] };
    const rows = (grouped.get(year) || []).sort(candidateSort);
    return { year, anchorDate:anchorIso(target.date,year), windowDays:DAY_WINDOW, matchCount:rows.length, best:rows[0] || null, matches:rows.slice(0,5) };
  });

  const acceptedLocal = [...grouped.entries()].filter(([y])=>localSourceYears.has(Number(y))).reduce((n,[,rows])=>n+rows.length,0);
  const selectedLocalCount = selectedLocal.filter(x=>localSourceYears.has(x.sourceYear)).length;
  const selectedRemoteCount = remoteHistorical.length;
  return {
    ok:true,
    version:`TJK-ADAPTIVE-ROADMAP-V10.0+${VERSION}`,
    target,
    rules:remote?.rules || getRules(minYear),
    diagnostics:{
      annualArchiveFastPath:true,
      annualArchiveVersion:window.ATAnnualArchiveV13?.version || null,
      archivedCalendarYearCount:completeCalendarYears.size,
      localSourceYearCount:localSourceYears.size,
      remoteSourceYearCount:missingYears.length,
      localCandidateCount:acceptedLocal,
      localSelectedYearCount:selectedLocalCount,
      remoteSelectedYearCount:selectedRemoteCount,
      failedRaceNoYears:[...failedResolutionYears].sort((a,b)=>b-a),
      remoteDiagnostics:remote?.diagnostics || null
    },
    yearResults,
    historicalRaces,
    byYear:historicalRaces.map(r=>({ year:r.sourceYear, ok:r.ok, date:r.date, city:r.city, raceNo:r.raceNo, referenceType:r.referenceType, transferabilityScore:r.transferabilityScore, top3:r.top3, error:r.error || null })),
    warning:historicalRaces.length ? '' : '±45 gün içinde tam eşleşme, aynı yarış ailesi veya koşul ikizi bulunamadı.'
  };
}

window.fetch = async function annualRoadmapFastFetchV156(input, init) {
  const req = parseAdaptiveRequest(input,init);
  if (!req) return previousFetch(input,init);
  const key = fastKey(req);
  if (activeFast.has(key)) {
    try {
      const data = await activeFast.get(key);
      return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json; charset=utf-8','x-at-ai-fastpath':VERSION}});
    } catch { return previousFetch(input,init); }
  }
  const task = buildFastData(req);
  activeFast.set(key,task);
  try {
    const data = await task;
    if (!data?.ok) return previousFetch(input,init);
    console.info('[AT AI]',VERSION,'kullanıldı',data.diagnostics);
    return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json; charset=utf-8','x-at-ai-fastpath':VERSION}});
  } catch (e) {
    console.warn('[AT AI]',VERSION,'fallback:',e?.message || e);
    return previousFetch(input,init);
  } finally {
    activeFast.delete(key);
  }
};

window.ATAnnualRoadmapFastV156 = { version:VERSION };
console.info('[AT AI]',VERSION,'aktif — yıllık arşiv hızlı yol + eksik yıl fallback');
})();
