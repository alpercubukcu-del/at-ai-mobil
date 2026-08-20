/* AT AI Mobil — V12.5 Full Historical Reference Path + Class Aliases
   - Güncel at ile tarihsel 1./2./3. referansların karşılaştırmasında referans yarıştan önceki TÜM yarışlar kullanılır.
   - TJK yıllık/günlük yazım farkları kanonikleştirilir: E=Erkek, D=Dişi, Y-1=Y1, H-2=H2.
   - Kariyer ekranının tarihsel kaynağı, adayları geniş sorgudan bulup tam sınıfı TJK sonuç sayfasından doğrulayan V11 model-roadmap servisine bağlanır.
*/
(() => {
'use strict';
if (window.__AT_HISTORICAL_REFERENCE_V125__) return;
window.__AT_HISTORICAL_REFERENCE_V125__ = true;

const VERSION = 'HISTORICAL-REFERENCE-FULLPATH-V12.5';
const MODEL_TYPES = ['EXACT', 'CONDITION_TWIN', 'RACE_FAMILY'];
const TYPE_PRIORITY = { EXACT:3, CONDITION_TWIN:2, RACE_FAMILY:1 };
const careerPromiseCache = new Map();
const roadmapPromiseCache = new Map();

const cleanV125 = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const upperV125 = v => cleanV125(v)
  .toLocaleUpperCase('tr-TR')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '');

function canonicalDecoratorV125(value) {
  const raw = cleanV125(value);
  const token = upperV125(raw).replace(/\s+/g, '');
  if (token === 'D' || token === 'DISI') return { key:'DISI', display:'Dişi' };
  if (token === 'E' || token === 'ERKEK') return { key:'ERKEK', display:'Erkek' };
  let m = token.match(/^Y-?(\d+)$/);
  if (m) return { key:`Y${Number(m[1])}`, display:`Y${Number(m[1])}` };
  m = token.match(/^H-?(\d+)$/);
  if (m) return { key:`H${Number(m[1])}`, display:`H${Number(m[1])}` };
  return { key:token, display:raw };
}

function canonicalClassKeyV125(value) {
  const parts = cleanV125(value).split('/').map(cleanV125).filter(Boolean);
  if (!parts.length) return '';
  const head = upperV125(parts.shift()).replace(/\s+/g, ' ').trim();
  const suffix = parts
    .map(x => canonicalDecoratorV125(x).key)
    .filter(Boolean)
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .sort();
  return [head, ...suffix].join('/');
}

function canonicalClassDisplayV125(value) {
  const parts = cleanV125(value).split('/').map(cleanV125).filter(Boolean);
  if (!parts.length) return cleanV125(value);
  const head = parts.shift();
  const suffix = parts.map(x => canonicalDecoratorV125(x).display).filter(Boolean);
  return [head, ...suffix].join('/');
}

window.canonicalClassKeyV125 = canonicalClassKeyV125;
window.canonicalClassDisplayV125 = canonicalClassDisplayV125;

/* Programdan gelen tek başına E, TJK anlamında Erkek'tir. D de Dişi'dir. */
if (typeof programRaceMeta === 'function') {
  const programRaceMetaBeforeV125 = programRaceMeta;
  programRaceMeta = function(...args) {
    const meta = programRaceMetaBeforeV125(...args);
    if (!meta || typeof meta !== 'object') return meta;
    return { ...meta, class:canonicalClassDisplayV125(meta.class || '') };
  };
}

/* Satır bazlı sınıf benzerliğinde de aynı kısaltmalar birebir eş kabul edilir. */
if (typeof classSimilarity === 'function') {
  const classSimilarityBeforeV125 = classSimilarity;
  classSimilarity = function(a, b) {
    const ka = canonicalClassKeyV125(a);
    const kb = canonicalClassKeyV125(b);
    if (ka && kb && ka === kb) return 1;
    return classSimilarityBeforeV125(a, b);
  };
}

function isoV125(row = {}) {
  const iso = cleanV125(row?.isoDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const raw = cleanV125(row?.date);
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : raw;
}

function chronologicalV125(rows) {
  return (Array.isArray(rows) ? [...rows] : [])
    .filter(Boolean)
    .sort((a, b) => isoV125(a).localeCompare(isoV125(b)));
}

function firstArrayV125(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function normalizeReferenceCareerV125(career = {}, fallbackBefore = '') {
  if (!career || typeof career !== 'object') return career;
  const full = chronologicalV125(firstArrayV125(
    career.fullPathBefore,
    career.historyBefore,
    career.roadmapBefore,
    career.comparisonPathBefore,
    career.history,
    career.fullPath,
    career.comparisonPath,
    career.races,
    career.roadmap
  ));
  const wins = chronologicalV125(
    Array.isArray(career.winsBefore) && career.winsBefore.length
      ? career.winsBefore
      : (Array.isArray(career.wins) && career.wins.length
          ? career.wins
          : full.filter(r => Number(r?.finish ?? r?.rank ?? r?.sira) === 1))
  );
  const top5 = chronologicalV125(
    Array.isArray(career.top5Before) && career.top5Before.length
      ? career.top5Before
      : (Array.isArray(career.top5) && career.top5.length
          ? career.top5
          : full.filter(r => {
              const f = Number(r?.finish ?? r?.rank ?? r?.sira);
              return f >= 1 && f <= 5;
            }))
  );
  const prep = chronologicalV125(firstArrayV125(
    career.preparationPathBefore,
    career.preparationPath,
    top5
  ));
  const cutoff = cleanV125(career.cutoffExclusive || career.before || fallbackBefore);
  const mode = full.length ? 'FULL_PATH' : (career.analysisMode || 'DEBUT');
  return {
    ...career,
    ok:career.ok !== false,
    cutoffExclusive:cutoff,
    fullPathBefore:full,
    historyBefore:full,
    roadmapBefore:full,
    comparisonPathBefore:full,
    fullPathBeforeCount:full.length,
    winsBefore:wins,
    winsBeforeCount:wins.length,
    top5Before:top5,
    top5BeforeCount:top5.length,
    preparationPathBefore:prep,
    preparationPathBeforeCount:prep.length,
    analysisMode:mode,
    fullReferencePathVersion:VERSION,
    pathRule:'Referans yarıştan önceki tüm yarış sonuçları kronolojik olarak kullanılır.'
  };
}

async function fetchReferenceCareerV125(horseId, before) {
  const id = cleanV125(horseId);
  const cutoff = cleanV125(before);
  if (!id || !cutoff) return null;
  const key = `${id}|${cutoff}`;
  if (careerPromiseCache.has(key)) return careerPromiseCache.get(key);
  const promise = (async () => {
    const url = `/api/tjk-career-v10?horseId=${encodeURIComponent(id)}&before=${encodeURIComponent(cutoff)}&t=${Date.now()}`;
    const res = await fetch(url, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || `Kariyer API ${res.status}`);
    return normalizeReferenceCareerV125(data, cutoff);
  })();
  careerPromiseCache.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    careerPromiseCache.delete(key);
    throw e;
  }
}

async function mapLimitV125(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const i = cursor++;
      if (i >= list.length) return;
      out[i] = await worker(list[i], i);
    }
  }
  await Promise.all(Array.from({ length:Math.min(Math.max(1, limit), list.length || 1) }, () => run()));
  return out;
}

async function enrichTop3V125(top3, raceDate) {
  return mapLimitV125(top3, 3, async ref => {
    if (!ref) return ref;
    let career = normalizeReferenceCareerV125(ref.career || {}, raceDate);
    if (!career?.fullPathBefore?.length && ref?.horseId) {
      try {
        career = await fetchReferenceCareerV125(ref.horseId, raceDate) || career;
      } catch (e) {
        career = { ...career, fullPathError:e?.message || 'Tam tarihsel kariyer alınamadı.' };
      }
    }
    return { ...ref, career };
  });
}

async function enrichRaceV125(race) {
  if (!race || race.ok === false) return race;
  const top3 = await enrichTop3V125(Array.isArray(race.top3) ? race.top3 : [], race.date);
  return {
    ...race,
    top3,
    top3Count:top3.length,
    fullReferencePathV125:true,
    pathRule:'Tarihsel ilk 3 atın referans yarıştan önceki TÜM yarışları kullanılır.'
  };
}

async function enrichModelRoadmapV125(data) {
  if (!data?.ok || !data?.models) return data;
  const models = { ...data.models };
  for (const type of MODEL_TYPES) {
    models[type] = await mapLimitV125(models[type] || [], 3, enrichRaceV125);
  }
  return { ...data, models, fullReferencePathV125:true, fullReferencePathVersion:VERSION };
}

function bestRacePerYearV125(modelData) {
  const all = [];
  for (const type of MODEL_TYPES) {
    for (const raw of modelData?.models?.[type] || []) {
      if (!raw || raw.ok === false) continue;
      all.push({ ...raw, referenceType:raw.referenceType || type });
    }
  }
  const byYear = new Map();
  for (const race of all) {
    const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4));
    if (!year) continue;
    const prev = byYear.get(year);
    const score = Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 0;
    const prevScore = Number(prev?.transferabilityScore ?? prev?.raceConditionSimilarity ?? -1);
    const priority = TYPE_PRIORITY[race.referenceType] || 0;
    const prevPriority = TYPE_PRIORITY[prev?.referenceType] || 0;
    const day = Number(race?.calendarDayDifference ?? 999);
    const prevDay = Number(prev?.calendarDayDifference ?? 999);
    if (!prev || score > prevScore || (score === prevScore && priority > prevPriority) || (score === prevScore && priority === prevPriority && day < prevDay)) {
      byYear.set(year, race);
    }
  }
  return [...byYear.values()].sort((a, b) => Number(b?.sourceYear || 0) - Number(a?.sourceYear || 0));
}

function shapeCareerRoadmapV125(modelData) {
  const historicalRaces = bestRacePerYearV125(modelData);
  return {
    ...modelData,
    version:`${modelData?.version || 'TJK-MODEL-ROADMAP'}+FULLPATH-V12.5`,
    historicalRaces,
    byYear:historicalRaces.map(r => ({
      year:r.sourceYear,
      ok:r.ok !== false,
      date:r.date,
      city:r.city,
      raceNo:r.raceNo,
      referenceType:r.referenceType,
      transferabilityScore:r.transferabilityScore ?? r.raceConditionSimilarity ?? 100,
      top3:r.top3,
      error:r.error || null
    })),
    yearResults:historicalRaces.map(r => ({
      year:r.sourceYear,
      anchorDate:r.anchorDate || null,
      windowDays:45,
      matchCount:1,
      best:r,
      matches:[r]
    })),
    fullReferencePathV125:true,
    fullReferencePathVersion:VERSION,
    rules:{
      ...(modelData?.rules || {}),
      classAliases:'E=Erkek; D=Dişi; Y-1=Y1; H-2=H2',
      historicalCareer:'referans yarıştan önceki tüm yarışlar',
      historicalPathComparison:'FULL_PRE_RACE_HISTORY'
    }
  };
}

const fetchHistoricalRoadmapBeforeV125 = typeof fetchHistoricalRoadmap === 'function' ? fetchHistoricalRoadmap : null;
fetchHistoricalRoadmap = async function(meta) {
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu koşulları eksik.' };
  const fixedMeta = { ...meta, class:canonicalClassDisplayV125(meta.class || '') };
  const cityName = typeof getCityName === 'function' ? getCityName() : cleanV125(state?.city);
  const key = [state?.date, cityName, fixedMeta.class, fixedMeta.ageGroup, fixedMeta.track, fixedMeta.distance].join('|');
  if (roadmapPromiseCache.has(key)) return roadmapPromiseCache.get(key);

  const promise = (async () => {
    try {
      const url =
        `/api/tjk-model-roadmap-v11` +
        `?date=${encodeURIComponent(state.date)}` +
        `&city=${encodeURIComponent(cityName)}` +
        `&class=${encodeURIComponent(fixedMeta.class || '')}` +
        `&ageGroup=${encodeURIComponent(fixedMeta.ageGroup || '')}` +
        `&track=${encodeURIComponent(fixedMeta.track || '')}` +
        `&distance=${encodeURIComponent(fixedMeta.distance || '')}` +
        `&minYear=2000&t=${Date.now()}`;
      const res = await fetch(url, { cache:'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `V11 roadmap API ${res.status}`);
      return shapeCareerRoadmapV125(await enrichModelRoadmapV125(data));
    } catch (primaryError) {
      if (!fetchHistoricalRoadmapBeforeV125) throw primaryError;
      const fallback = await fetchHistoricalRoadmapBeforeV125(fixedMeta);
      if (!fallback?.ok) return fallback;
      const historicalRaces = await mapLimitV125(fallback.historicalRaces || [], 3, enrichRaceV125);
      return {
        ...fallback,
        historicalRaces,
        fullReferencePathV125:true,
        fullReferencePathVersion:VERSION,
        primaryRoadmapError:primaryError?.message || String(primaryError)
      };
    }
  })();

  roadmapPromiseCache.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    roadmapPromiseCache.delete(key);
    return { ok:false, error:e?.message || 'Tam tarihsel kariyer yolu alınamadı.' };
  }
};

/* 5-model/podyum servisinde fullPathBefore zaten varsa koru; eksik eski cevap gelirse tamamla. */
if (typeof fetchModelRoadmapV11 === 'function') {
  const fetchModelRoadmapBeforeV125 = fetchModelRoadmapV11;
  fetchModelRoadmapV11 = async function(...args) {
    const data = await fetchModelRoadmapBeforeV125(...args);
    return data?.ok ? await enrichModelRoadmapV125(data) : data;
  };
}

/* Ekrandaki yol etiketi artık wins-only izlenimi vermesin. */
if (typeof adaptiveModeLabel === 'function') {
  adaptiveModeLabel = function(mode) {
    if (mode === 'DEBUT') return 'Debut';
    return 'Tam Kariyer Yolu';
  };
}

/* Eski wins-only referans cache'i yeni sonuçlarla karışmasın. */
if (typeof isValidCareerCache === 'function') {
  const isValidCareerCacheBeforeV125 = isValidCareerCache;
  isValidCareerCache = function(cached) {
    return Boolean(cached?.fullReferencePathV125 === true && isValidCareerCacheBeforeV125(cached));
  };
}

if (typeof runCareerAnalysis === 'function') {
  const runCareerAnalysisBeforeV125 = runCareerAnalysis;
  runCareerAnalysis = async function(...args) {
    await runCareerAnalysisBeforeV125(...args);
    if (state?.analyses?.career) {
      state.analyses.career.fullReferencePathV125 = true;
      state.analyses.career.fullReferencePathVersion = VERSION;
      state.analyses.career.rule = 'FULL_PRE_RACE_HISTORY_WITH_TJK_FULL_CLASS_VERIFY';
      state.analyses.career.similarityMethod = 'YEAR_BY_YEAR_ORDERED_FULL_CAREER_PATH';
      state.analyses.career.similarityNote = 'Bugünkü at ve tarihsel referans atlar, karşılaştırma tarihinden önceki tüm yarış sonuç dizileriyle karşılaştırılır. E=Erkek, D=Dişi, Y-1=Y1, H-2=H2 kabul edilir.';
      if (typeof save === 'function') save();
    }
  };
}

try {
  if (typeof state === 'object' && state && state.fullReferencePathVersion !== VERSION) {
    state.fullReferencePathVersion = VERSION;
    if (state.analyses && typeof state.analyses === 'object') {
      state.analyses.career = {};
      state.analyses.historical = {};
      state.analyses.calibration = {};
    }
    try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}
    if (typeof save === 'function') save();
  }
} catch (e) {
  console.warn('[AT AI] V12.5 cache yenileme uyarısı:', e?.message || e);
}

console.info('[AT AI]', VERSION, 'aktif — tam tarihsel kariyer + E=Erkek sınıf eşleştirmesi');
})();
