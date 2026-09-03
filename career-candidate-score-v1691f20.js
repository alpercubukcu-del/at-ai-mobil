/* AT AI Mobil - V16.9.1F20 CAREER CANDIDATE SCORE
   - Main career ranking uses model-roadmap references when exact roadmap is empty.
   - Short/weak full-path alignment no longer means the horse is automatically bad.
   - Strict class + age gate remains; only real comparable row pairs can lift a score.
*/
(() => {
'use strict';
if (window.__AT_CAREER_CANDIDATE_SCORE_V1691F20__) return;
window.__AT_CAREER_CANDIDATE_SCORE_V1691F20__ = true;

const VERSION = 'CAREER-CANDIDATE-SCORE-V16.9.1F20';
const SCORE_RULE = 'HYBRID_WIN_PREP_FULL_PATH_WITH_CANDIDATE_SUPPORT_V20';
const ROADMAP_RULE = 'MODEL_ROADMAP_PRIMARY_FOR_CAREER_F20';
const MODEL_TYPES = ['EXACT', 'CONDITION_TWIN', 'RACE_FAMILY'];
const TYPE_PRIORITY = { EXACT:3, CONDITION_TWIN:2, RACE_FAMILY:1 };
const GAP = -0.18;
const MATCH_BASE = 0.35;
const PAIR_SUPPORT_FLOOR = 0.60;
const MAX_TOP_PAIRS = 5;
const SUPPORT_FACTOR = 0.82;

const careerCacheF20 = new Map();
const roadmapCacheF20 = new Map();

const finite = v => {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/);
  const n = Number((m ? m[0] : v).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(v) || 0));
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finish = r => finite(r?.finish ?? r?.rank ?? r?.sira ?? r?.der);
const avg = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;

function iso(row = {}) {
  const x = clean(row?.isoDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const raw = clean(row?.date);
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : raw;
}

function chronological(rows) {
  return (Array.isArray(rows) ? [...rows] : []).filter(Boolean).sort((a, b) => iso(a).localeCompare(iso(b)));
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function normalizeReferenceCareerF20(career = {}, fallbackBefore = '') {
  if (!career || typeof career !== 'object') return {
    ok:false,
    fullPathBefore:[],
    historyBefore:[],
    roadmapBefore:[],
    winsBefore:[],
    top5Before:[],
    preparationPathBefore:[]
  };
  const full = chronological(firstArray(
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
  const wins = chronological(firstArray(
    career.winsBefore,
    career.wins,
    full.filter(row => finish(row) === 1)
  ));
  const top5 = chronological(firstArray(
    career.top5Before,
    career.top5,
    full.filter(row => {
      const f = finish(row);
      return f !== null && f >= 1 && f <= 5;
    })
  ));
  const prep = chronological(firstArray(
    career.preparationPathBefore,
    career.preparationPath,
    top5
  ));
  return {
    ...career,
    ok:career.ok !== false,
    cutoffExclusive:clean(career.cutoffExclusive || career.before || fallbackBefore),
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
    analysisMode:full.length ? 'FULL_PATH' : 'DEBUT',
    candidateScoreVersion:VERSION
  };
}

async function fetchReferenceCareerF20(horseId, before) {
  const id = clean(horseId);
  const cutoff = clean(before);
  if (!id || !cutoff) return null;
  const key = `${id}|${cutoff}`;
  if (careerCacheF20.has(key)) return careerCacheF20.get(key);
  const promise = (async () => {
    const url = `/api/tjk-career-v10?horseId=${encodeURIComponent(id)}&before=${encodeURIComponent(cutoff)}&t=${Date.now()}`;
    const response = await fetch(url, { cache:'no-store' });
    const data = await response.json();
    if (!response.ok || !data?.ok) throw new Error(data?.error || `Career API ${response.status}`);
    return normalizeReferenceCareerF20(data, cutoff);
  })();
  careerCacheF20.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    careerCacheF20.delete(key);
    throw e;
  }
}

async function mapLimitF20(items, limit, worker) {
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

async function enrichTop3F20(top3, raceDate) {
  return mapLimitF20(top3, 3, async ref => {
    if (!ref) return ref;
    let career = normalizeReferenceCareerF20(ref.career || {}, raceDate);
    if (!career?.fullPathBefore?.length && ref?.horseId) {
      try {
        career = await fetchReferenceCareerF20(ref.horseId, raceDate) || career;
      } catch (e) {
        career = { ...career, ok:false, fullPathError:e?.message || 'Reference career could not be loaded.' };
      }
    }
    return { ...ref, career };
  });
}

async function enrichRaceF20(race) {
  if (!race || race.ok === false) return race;
  const top3 = await enrichTop3F20(Array.isArray(race.top3) ? race.top3 : [], race.date);
  return {
    ...race,
    top3,
    top3Count:top3.length,
    candidateScoreVersion:VERSION,
    fullReferencePathF20:true
  };
}

function currentCityNameF20() {
  try {
    if (typeof getCityName === 'function') return clean(getCityName());
  } catch {}
  try {
    const id = clean(state?.city);
    const city = (Array.isArray(state?.cities) ? state.cities : []).find(x => clean(x?.id) === id);
    return clean(city?.name || document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent || id);
  } catch {
    return '';
  }
}

function canonicalClassF20(value) {
  try {
    if (typeof window.canonicalClassDisplayV125 === 'function') return clean(window.canonicalClassDisplayV125(value || ''));
  } catch {}
  return clean(value);
}

function modelRaceListF20(data) {
  if (Array.isArray(data?.historicalRaces) && data.historicalRaces.length) {
    return data.historicalRaces.filter(race => race?.ok !== false);
  }
  const rows = [];
  for (const type of MODEL_TYPES) {
    for (const race of data?.models?.[type] || []) {
      if (!race || race.ok === false) continue;
      rows.push({ ...race, referenceType:race.referenceType || type });
    }
  }
  return rows;
}

function bestRacePerYearF20(data) {
  const byYear = new Map();
  for (const race of modelRaceListF20(data)) {
    const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4)) || null;
    if (!year) continue;
    const score = Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 0) || 0;
    const priority = TYPE_PRIORITY[race?.referenceType] || 0;
    const day = Number(race?.calendarDayDifference ?? 999);
    const prev = byYear.get(year);
    const prevScore = Number(prev?.transferabilityScore ?? prev?.raceConditionSimilarity ?? -1) || -1;
    const prevPriority = TYPE_PRIORITY[prev?.referenceType] || 0;
    const prevDay = Number(prev?.calendarDayDifference ?? 999);
    if (!prev || score > prevScore || (score === prevScore && priority > prevPriority) || (score === prevScore && priority === prevPriority && day < prevDay)) {
      byYear.set(year, race);
    }
  }
  return [...byYear.values()].sort((a, b) => Number(b?.sourceYear || String(b?.date || '').slice(0, 4) || 0) - Number(a?.sourceYear || String(a?.date || '').slice(0, 4) || 0));
}

function shapeCareerRoadmapF20(data) {
  const historicalRaces = bestRacePerYearF20(data);
  return {
    ...data,
    ok:data?.ok !== false,
    version:`${data?.version || 'TJK-MODEL-ROADMAP'}+${VERSION}`,
    historicalRaces,
    byYear:historicalRaces.map(race => ({
      year:race.sourceYear || Number(String(race.date || '').slice(0, 4)) || null,
      ok:race.ok !== false,
      date:race.date,
      city:race.city,
      raceNo:race.raceNo,
      referenceType:race.referenceType,
      transferabilityScore:race.transferabilityScore ?? race.raceConditionSimilarity ?? 100,
      top3:race.top3,
      error:race.error || null
    })),
    yearResults:historicalRaces.map(race => ({
      year:race.sourceYear || Number(String(race.date || '').slice(0, 4)) || null,
      anchorDate:race.anchorDate || null,
      windowDays:45,
      matchCount:1,
      best:race,
      matches:[race]
    })),
    f20ModelRoadmapSource:true,
    candidateScoreVersion:VERSION,
    careerRoadmapRule:ROADMAP_RULE
  };
}

async function fetchModelRoadmapForCareerF20(meta) {
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Race conditions are missing.' };
  const classText = canonicalClassF20(meta.class || '');
  const city = currentCityNameF20();
  const date = clean(state?.date);
  const key = [date, city, classText, meta.ageGroup, meta.track, meta.distance].map(clean).join('|');
  if (roadmapCacheF20.has(key)) return roadmapCacheF20.get(key);

  const promise = (async () => {
    const url =
      `/api/tjk-model-roadmap-v11` +
      `?date=${encodeURIComponent(date)}` +
      `&city=${encodeURIComponent(city)}` +
      `&class=${encodeURIComponent(classText)}` +
      `&ageGroup=${encodeURIComponent(clean(meta.ageGroup || ''))}` +
      `&track=${encodeURIComponent(clean(meta.track || ''))}` +
      `&distance=${encodeURIComponent(clean(meta.distance || ''))}` +
      `&minYear=2000&t=${Date.now()}`;
    const response = await fetch(url, { cache:'no-store' });
    const data = await response.json();
    if (!response.ok || !data?.ok) throw new Error(data?.error || `Model roadmap API ${response.status}`);
    const shaped = shapeCareerRoadmapF20(data);
    shaped.historicalRaces = await mapLimitF20(shaped.historicalRaces, 3, enrichRaceF20);
    shaped.byYear = shaped.historicalRaces.map(race => ({
      year:race.sourceYear || Number(String(race.date || '').slice(0, 4)) || null,
      ok:race.ok !== false,
      date:race.date,
      city:race.city,
      raceNo:race.raceNo,
      referenceType:race.referenceType,
      transferabilityScore:race.transferabilityScore ?? race.raceConditionSimilarity ?? 100,
      top3:race.top3,
      error:race.error || null
    }));
    return shaped;
  })();

  roadmapCacheF20.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    roadmapCacheF20.delete(key);
    throw e;
  }
}

const fetchHistoricalRoadmapBeforeF20 = typeof fetchHistoricalRoadmap === 'function' ? fetchHistoricalRoadmap : null;
if (fetchHistoricalRoadmapBeforeF20) {
  fetchHistoricalRoadmap = async function(meta) {
    if (!meta?.ok) return fetchHistoricalRoadmapBeforeF20(meta);
    try {
      const model = await fetchModelRoadmapForCareerF20(meta);
      if (Array.isArray(model?.historicalRaces) && model.historicalRaces.length) {
        return model;
      }
    } catch (e) {
      console.warn('[AT AI]', VERSION, 'model-roadmap career source failed:', e?.message || e);
    }
    const fallback = await fetchHistoricalRoadmapBeforeF20({ ...meta, class:canonicalClassF20(meta.class || '') });
    if (fallback && typeof fallback === 'object') {
      fallback.candidateScoreVersion = VERSION;
      fallback.careerRoadmapRule = `${fallback.careerRoadmapRule || ''} ${ROADMAP_RULE}_FALLBACK`.trim();
    }
    return fallback;
  };
}

function strictCompatibleF20(a, b) {
  try {
    if (typeof strictCareerCompatibleV1691F12 === 'function') return Boolean(strictCareerCompatibleV1691F12(a, b));
  } catch {
    return false;
  }
  try {
    if (typeof careerRowSimilarity === 'function') {
      const s = Number(careerRowSimilarity(a, b));
      return Number.isFinite(s) && s >= MATCH_BASE;
    }
  } catch {}
  return false;
}

function localScoreF20(a, b) {
  try {
    if (!strictCompatibleF20(a, b)) return -1;
    if (typeof careerRowSimilarity !== 'function') return -1;
    const s = Number(careerRowSimilarity(a, b));
    return Number.isFinite(s) ? clamp(s) : -1;
  } catch {
    return -1;
  }
}

function tracePairsF20(a0, b0) {
  const a = Array.isArray(a0) ? a0 : [];
  const b = Array.isArray(b0) ? b0 : [];
  const n = a.length, m = b.length;
  if (!n || !m) return { pairs:[], gaps:n + m };
  const dp = Array.from({ length:n + 1 }, () => Array(m + 1).fill(0));
  const act = Array.from({ length:n + 1 }, () => Array(m + 1).fill(''));
  for (let i = 1; i <= n; i++) { dp[i][0] = i * GAP; act[i][0] = 'D'; }
  for (let j = 1; j <= m; j++) { dp[0][j] = j * GAP; act[0][j] = 'I'; }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const local = localScoreF20(a[i - 1], b[j - 1]);
      const match = local >= MATCH_BASE ? dp[i - 1][j - 1] + local - MATCH_BASE : -Infinity;
      const del = dp[i - 1][j] + GAP;
      const ins = dp[i][j - 1] + GAP;
      if (match >= del && match >= ins) { dp[i][j] = match; act[i][j] = 'M'; }
      else if (del >= ins) { dp[i][j] = del; act[i][j] = 'D'; }
      else { dp[i][j] = ins; act[i][j] = 'I'; }
    }
  }
  const pairs = [];
  let i = n, j = m, gaps = 0;
  while (i || j) {
    const z = act[i][j];
    if (z === 'M') {
      pairs.push({ a:a[i - 1], b:b[j - 1], local:localScoreF20(a[i - 1], b[j - 1]) });
      i--; j--;
    } else if (z === 'D') {
      i--; gaps++;
    } else {
      j--; gaps++;
    }
  }
  return { pairs:pairs.reverse(), gaps };
}

function capByPairCountF20(count) {
  if (count <= 0) return 0;
  if (count === 1) return 34;
  if (count === 2) return 50;
  if (count === 3) return 64;
  if (count === 4) return 74;
  return 82;
}

function candidateSupportF20(path, refPath, conditionScore) {
  const trace = tracePairsF20(path, refPath);
  const valid = trace.pairs
    .filter(pair => pair.local >= PAIR_SUPPORT_FLOOR)
    .sort((a, b) => b.local - a.local);
  if (!valid.length) {
    return {
      score:0,
      used:false,
      pairCount:0,
      topPairAvg:0,
      coveragePct:0,
      alignedPairs:trace.pairs.length,
      gaps:trace.gaps,
      cap:0,
      floorPct:Math.round(PAIR_SUPPORT_FLOOR * 100)
    };
  }
  const top = valid.slice(0, MAX_TOP_PAIRS);
  const topAvg = avg(top.map(pair => pair.local));
  const denom = Math.max(1, Math.min(path.length || 0, refPath.length || 0));
  const coverage = clamp(valid.length / denom);
  const neutralGaps = Math.abs((path.length || 0) - (refPath.length || 0));
  const extraGaps = Math.max(0, trace.gaps - neutralGaps);
  const gapPenalty = clamp(1 - extraGaps * 0.015, 0.78, 1);
  const conditionFactor = clamp(0.50 + clamp((Number(conditionScore) || 0) / 100) / 2, 0.50, 1);
  const cap = capByPairCountF20(valid.length);
  const raw = topAvg * 100 * Math.sqrt(coverage) * SUPPORT_FACTOR * conditionFactor * gapPenalty;
  const rawScore = Math.min(cap, raw);
  const score = Math.round(rawScore);
  return {
    score,
    rawScore,
    used:false,
    pairCount:valid.length,
    topPairAvg:Math.round(topAvg * 100),
    coveragePct:Math.round(coverage * 100),
    alignedPairs:trace.pairs.length,
    gaps:trace.gaps,
    extraGaps,
    gapPenalty:Math.round(gapPenalty * 100),
    conditionFactor:Math.round(conditionFactor * 100),
    factor:SUPPORT_FACTOR,
    cap,
    floorPct:Math.round(PAIR_SUPPORT_FLOOR * 100)
  };
}

function orderedPathScoreF20(path, refPath) {
  try {
    if (typeof orderedPathSimilarity === 'function') return Math.round(clamp(orderedPathSimilarity(path, refPath)) * 100);
  } catch {}
  const support = candidateSupportF20(path, refPath, 100);
  return support.pairCount ? Math.round(support.topPairAvg * Math.sqrt(clamp(support.coveragePct / 100))) : 0;
}

function currentVariantsF20(path0) {
  const full = chronological(path0);
  const wins = full.filter(row => finish(row) === 1);
  const top5 = full.filter(row => {
    const f = finish(row);
    return f !== null && f >= 1 && f <= 5;
  });
  const variants = [];
  if (wins.length) variants.push({ mode:'WIN_PATH', label:'galibiyet yolu', path:wins });
  if (top5.length) variants.push({ mode:'PREPARATION_PATH', label:'ilk 5/hazirlik yolu', path:top5 });
  if (full.length) variants.push({ mode:'FULL_PATH', label:'tam kariyer yolu', path:full });
  const seen = new Set();
  return variants.filter(v => {
    const key = `${v.mode}|${v.path.length}|${v.path.map(iso).join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function referenceVariantsF20(ref, mode) {
  const career = normalizeReferenceCareerF20(ref?.career || ref || {});
  const full = career.fullPathBefore || [];
  const wins = career.winsBefore || [];
  const top5 = career.top5Before || [];
  const prep = career.preparationPathBefore || [];
  if (mode === 'WIN_PATH') return wins.length ? [{ mode, label:'referans galibiyet yolu', path:wins }] : [];
  if (mode === 'PREPARATION_PATH') {
    const path = prep.length ? prep : top5;
    return path.length ? [{ mode, label:'referans ilk 5/hazirlik yolu', path }] : [];
  }
  return full.length ? [{ mode:'FULL_PATH', label:'referans tam kariyer yolu', path:full }] : [];
}

function conditionScoreF20(race) {
  return Math.max(0, Math.min(100, Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 0));
}

function candidateBetterF20(a, b) {
  if (!b) return true;
  return Number(a?.score ?? -1) > Number(b?.score ?? -1) ||
    (Number(a?.score ?? -1) === Number(b?.score ?? -1) && Number(a?.baseScore || 0) > Number(b?.baseScore || 0)) ||
    (Number(a?.score ?? -1) === Number(b?.score ?? -1) && Number(a?.baseScore || 0) === Number(b?.baseScore || 0) && Number(a?.candidateSupportScore || 0) > Number(b?.candidateSupportScore || 0)) ||
    (Number(a?.score ?? -1) === Number(b?.score ?? -1) && Number(a?.baseScore || 0) === Number(b?.baseScore || 0) && Number(a?.candidateSupportScore || 0) === Number(b?.candidateSupportScore || 0) && Number(a?.historicalFinish || 99) < Number(b?.historicalFinish || 99));
}

function buildCandidateF20(race, ref, currentVariant, refVariant) {
  const conditionScore = conditionScoreF20(race);
  const pathScore = orderedPathScoreF20(currentVariant.path, refVariant.path);
  const baseRawScore = pathScore * conditionScore / 100;
  const baseScore = Math.round(baseRawScore);
  const support = candidateSupportF20(currentVariant.path, refVariant.path, conditionScore);
  const finalRawScore = Math.max(baseRawScore, Number(support.rawScore || 0));
  const finalScore = Math.round(finalRawScore);
  const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4)) || null;
  return {
    year,
    score:finalScore,
    rankingRawScore:finalRawScore,
    baseRawScore,
    baseScore,
    pathScore,
    conditionScore,
    candidateSupportScore:support.score,
    candidateSupportUsed:support.score > baseScore,
    partialSupportScore:support.score,
    partialSupportUsed:support.score > baseScore,
    partialSupport:support,
    candidateSupport:support,
    historicalHorse:ref?.horseName || ref?.name || '',
    historicalHorseId:ref?.horseId || '',
    historicalFinish:Number(ref?.finish || ref?.rank || ref?.sira || 0) || null,
    historicalPathCount:refVariant.path.length,
    currentPathCount:currentVariant.path.length,
    analysisMode:currentVariant.mode,
    candidateMode:currentVariant.mode,
    candidateModeLabel:currentVariant.label,
    referenceModeLabel:refVariant.label,
    raceDate:race?.date || '',
    raceCity:race?.city || '',
    raceNo:race?.raceNo || '',
    calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
    referenceType:race?.referenceType || 'EXACT',
    referenceLabel:race?.referenceLabel || 'Tarihsel referans',
    transferabilityTier:race?.transferabilityTier || (conditionScore >= 85 ? 'HIGH' : conditionScore >= 70 ? 'MEDIUM' : conditionScore >= 50 ? 'SUPPORT' : 'LOW'),
    transferabilityColor:race?.transferabilityColor || '',
    explanation:race?.explanation || '',
    distanceDifferencePct:Number(race?.distanceDifferencePct ?? 0),
    alternatives:Array.isArray(race?.alternatives) ? race.alternatives : [],
    candidateScoreVersion:VERSION,
    resultPerformanceVersion:'CAREER-RESULT-PERFORMANCE-V16.9.1F15',
    partialSupportVersion:'CAREER-PARTIAL-SUPPORT-V16.9.1F17',
    rowMatchRule:'EXACT_CLASS + EXACT_AGE_GROUP + CARRIED_WEIGHT + FINISH_RESULT + HP_DELTA + CANDIDATE_SUPPORT',
    scoreRule:SCORE_RULE
  };
}

function historicalRacesForCalcF20(roadmapData) {
  const races = bestRacePerYearF20(roadmapData);
  return races.filter(race => race?.ok !== false);
}

const calculateBeforeF20 = typeof calculateGalibiyetBenzerligi === 'function' ? calculateGalibiyetBenzerligi : null;
if (calculateBeforeF20) {
  calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
    const original = calculateBeforeF20(currentPath, roadmapData) || {};
    const path = chronological(Array.isArray(currentPath) ? currentPath : []);
    const races = historicalRacesForCalcF20(roadmapData);
    const baseOut = {
      ...original,
      candidateScoreVersion:VERSION,
      candidateScoreRule:SCORE_RULE,
      careerRoadmapRule:roadmapData?.careerRoadmapRule || (roadmapData?.f20ModelRoadmapSource ? ROADMAP_RULE : original?.careerRoadmapRule || ''),
      method:original?.method || SCORE_RULE
    };

    if (!path.length || !races.length) {
      return {
        ...baseOut,
        candidateScoreReason:!path.length ? 'NO_CURRENT_PATH' : 'NO_HISTORICAL_REFERENCE'
      };
    }

    const variants = currentVariantsF20(path);
    const byYear = [];
    let referenceCount = 0;
    for (const race of races) {
      const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4)) || null;
      const refs = Array.isArray(race?.top3) ? race.top3 : [];
      let best = null;
      for (const ref of refs) {
        for (const currentVariant of variants) {
          for (const refVariant of referenceVariantsF20(ref, currentVariant.mode)) {
            if (!refVariant.path.length) continue;
            referenceCount++;
            const candidate = buildCandidateF20(race, ref, currentVariant, refVariant);
            if (candidateBetterF20(candidate, best)) best = candidate;
          }
        }
      }
      if (best) {
        byYear.push(best);
      } else {
        byYear.push({
          year,
          score:null,
          baseScore:null,
          pathScore:null,
          conditionScore:conditionScoreF20(race),
          candidateSupportScore:0,
          candidateSupportUsed:false,
          partialSupportScore:0,
          partialSupportUsed:false,
          historicalHorse:null,
          historicalFinish:null,
          raceDate:race?.date || '',
          raceCity:race?.city || '',
          raceNo:race?.raceNo || '',
          calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
          referenceType:race?.referenceType || 'EXACT',
          referenceLabel:race?.referenceLabel || 'Tarihsel referans',
          transferabilityTier:race?.transferabilityTier || 'LOW',
          explanation:race?.explanation || '',
          error:'Katı sınıf/yaş kuralını geçen aday kariyer çifti bulunamadı.',
          candidateScoreVersion:VERSION,
          scoreRule:SCORE_RULE
        });
      }
    }
    byYear.sort((a, b) => Number(b?.year || 0) - Number(a?.year || 0));
    const scored = byYear.filter(row => Number.isFinite(Number(row?.score)));
    const candidateStrongest = scored.length ? [...scored].sort((a, b) =>
      Number(b.rankingRawScore ?? b.score) - Number(a.rankingRawScore ?? a.score) ||
      Number(b.score) - Number(a.score) ||
      Number(b.baseScore || 0) - Number(a.baseScore || 0) ||
      Number(b.candidateSupportScore || 0) - Number(a.candidateSupportScore || 0) ||
      Number(b.year || 0) - Number(a.year || 0)
    )[0] : null;

    const originalScore = finite(original.score);
    const candidateScore = finite(candidateStrongest?.score);
    const useCandidate = candidateScore !== null && (originalScore === null || candidateScore > originalScore);
    const finalScore = useCandidate ? candidateScore : originalScore;
    const strongest = useCandidate ? candidateStrongest : (original.strongest || candidateStrongest || null);

    return {
      ...baseOut,
      score:finalScore,
      rankingRawScore:useCandidate ? Number(candidateStrongest?.rankingRawScore ?? candidateScore) : Number(original?.rankingRawScore ?? originalScore),
      strongestYear:strongest?.year || null,
      strongest:strongest || null,
      byYear:useCandidate || byYear.length ? byYear : original.byYear,
      matchedHistoricalHorse:strongest?.historicalHorse || original?.matchedHistoricalHorse || null,
      matchedHistoricalFinish:strongest?.historicalFinish || original?.matchedHistoricalFinish || null,
      matchedHistoricalRace:strongest?.raceDate ? `${strongest.raceDate} ${strongest.raceCity} ${strongest.raceNo}. Koşu` : (original?.matchedHistoricalRace || null),
      referenceCount,
      currentPathCount:path.length,
      currentWinCount:path.filter(row => finish(row) === 1).length,
      currentTop5Count:path.filter(row => {
        const f = finish(row);
        return f !== null && f >= 1 && f <= 5;
      }).length,
      analysisMode:useCandidate ? strongest?.analysisMode : (original?.analysisMode || strongest?.analysisMode || 'FULL_PATH'),
      method:SCORE_RULE,
      yearAggregation:'NONE',
      historicalRaceRule:'EXACT + CONDITION_TWIN + RACE_FAMILY; PM45_DAYS; MODEL_ROADMAP_PRIMARY_FOR_CAREER',
      candidateCareerScore:candidateScore,
      candidateSupportVersion:VERSION,
      candidateSupportRule:'Short or weak full-path alignment can be lifted by capped strict row-pair evidence; missing path support lowers confidence, not the horse itself.'
    };
  };
}

const cacheBeforeF20 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
function hasF20Career(career) {
  const races = Array.isArray(career?.races) ? career.races : [];
  if (!races.length) return false;
  return races.every(race => (race?.horses || []).every(item =>
    item?.galibiyetBenzerligi?.candidateScoreVersion === VERSION &&
    (item?.galibiyetBenzerligi?.score == null || Number.isFinite(Number(item?.galibiyetBenzerligi?.rankingRawScore)))
  ));
}

if (cacheBeforeF20) {
  isValidCareerCache = function(cached) {
    return Boolean(cacheBeforeF20(cached) && hasF20Career(cached));
  };
}

function clearStaleCareerF20(reason) {
  try {
    if (typeof state === 'undefined' || !state?.analyses?.career) return false;
    if (hasF20Career(state.analyses.career)) return false;
    state.analyses.career = {};
    state.careerCandidateScoreVersion = VERSION;
    state.careerCandidateScoreInvalidatedBy = reason || VERSION;
    if (typeof save === 'function') save();
    return true;
  } catch {
    return false;
  }
}

clearStaleCareerF20('startup');
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

const runCareerAnalysisBeforeF20 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerAnalysisBeforeF20) {
  runCareerAnalysis = async function(...args) {
    await runCareerAnalysisBeforeF20(...args);
    try {
      if (state?.analyses?.career) {
        state.analyses.career.candidateScoreVersion = VERSION;
        state.analyses.career.candidateScoreRule = SCORE_RULE;
        state.analyses.career.careerRoadmapRule = ROADMAP_RULE;
        state.careerCandidateScoreVersion = VERSION;
        if (typeof save === 'function') save();
      }
    } catch {}
  };
}

try {
  const archive = window.ATCouponDailyArchiveV1691;
  if (archive?.hydrateCurrent && !archive.__careerCandidateScoreF20) {
    const beforeHydrate = archive.hydrateCurrent.bind(archive);
    archive.hydrateCurrent = async function(...args) {
      const out = await beforeHydrate(...args);
      clearStaleCareerF20('archive-hydrate');
      return out;
    };
    archive.__careerCandidateScoreF20 = VERSION;
  }
} catch {}

const yearBeforeF20 = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBeforeF20) {
  yearSimilarityHtml = function(sim) {
    const html = yearBeforeF20(sim);
    if (sim?.candidateScoreVersion !== VERSION) return html;
    const support = sim?.candidateSupport || sim?.partialSupport || {};
    const supportScore = finite(sim?.candidateSupportScore ?? sim?.partialSupportScore);
    const baseScore = finite(sim?.baseScore);
    const mode = clean(sim?.candidateModeLabel || sim?.analysisMode || '');
    const note = `F20 aday destek aktif · mod ${esc(mode || 'hibrit')} · tam yol ${baseScore ?? 0} · aday ${supportScore ?? 0} · çift ${support.pairCount || 0}`;
    const badge = `<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22)"><b>${esc(note)}</b></div>`;
    return badge + html;
  };
}

window.__AT_CAREER_CANDIDATE_SCORE_VERSION__ = VERSION;
window.ATCareerCandidateScoreV1691F20 = {
  version:VERSION,
  scoreRule:SCORE_RULE,
  roadmapRule:ROADMAP_RULE,
  supportFloor:PAIR_SUPPORT_FLOOR,
  supportFactor:SUPPORT_FACTOR,
  capByPairCount:capByPairCountF20,
  candidateSupport:candidateSupportF20
};
console.info('[AT AI]', VERSION, 'aktif - ana kariyer siralamasi model-roadmap kaynakli aday destek skoru kullanir.');
})();
