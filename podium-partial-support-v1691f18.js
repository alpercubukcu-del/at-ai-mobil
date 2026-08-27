/* AT AI Mobil - V16.9.1F18 MODEL / PODIUM PARTIAL SUPPORT
   - Detay kartindaki parca destek artik 5-model ve podium siralamasina da girer.
   - Tam kariyer yolu skoru korunur; sadece kati kurali gecen guclu parca eslesmeleri sinirli destek verir.
   - Tek kosu ciftinden yuksek aday uretilmez; coklu sinyal gerekir.
*/
(() => {
'use strict';
if (window.__AT_PODIUM_PARTIAL_SUPPORT_V1691F18__) return;
window.__AT_PODIUM_PARTIAL_SUPPORT_V1691F18__ = true;

const VERSION = 'PODIUM-PARTIAL-SUPPORT-V16.9.1F18';
const GAP = -0.18;
const MATCH_BASE = 0.35;
const PAIR_SUPPORT_FLOOR = (() => {
  try {
    const floor = typeof careerPairSupportFloorV1691F17 === 'function'
      ? Number(careerPairSupportFloorV1691F17())
      : 0.60;
    return Number.isFinite(floor) ? Math.max(0.50, Math.min(0.90, floor)) : 0.60;
  } catch {
    return 0.60;
  }
})();
const MAX_TOP_PAIRS = 5;
const PARTIAL_FACTOR = 0.72;
const PARTIAL_CAP = 68;

const finite = value => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  const match = String(value).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/);
  const n = Number((match ? match[0] : value).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(value) || 0));
const avg = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const finish = row => finite(row?.finish ?? row?.rank ?? row?.sira ?? row?.der);

function currentPathV1691F18(career = {}) {
  for (const path of [
    career.roadmap,
    career.fullPathBefore,
    career.historyBefore,
    career.comparisonPathBefore,
    career.roadmapBefore,
    career.history,
    career.comparisonPath,
    career.top5,
    career.preparationPath,
    career.fullHistory,
    career.recentForm
  ]) {
    if (Array.isArray(path) && path.length) return path;
  }
  return [];
}

function modeOfCareerV1691F18(career = {}, path = []) {
  if (career?.analysisMode === 'WIN_PATH' || career?.analysisMode === 'PREPARATION_PATH' || career?.analysisMode === 'DEBUT') {
    return career.analysisMode;
  }
  try {
    if (typeof analysisModeV11 === 'function') return analysisModeV11(career);
  } catch {}
  try {
    if (typeof adaptiveCurrentMode === 'function') return adaptiveCurrentMode(path);
  } catch {}
  if (!path.length) return 'DEBUT';
  return path.some(row => finish(row) === 1) ? 'WIN_PATH' : 'PREPARATION_PATH';
}

function referencePathV1691F18(ref, mode) {
  try {
    if (typeof referencePathPodiumV115 === 'function') {
      const path = referencePathPodiumV115(ref, mode);
      if (Array.isArray(path) && path.length) return path;
    }
  } catch {}
  try {
    if (typeof referencePathV11 === 'function') {
      const path = referencePathV11(ref, mode);
      if (Array.isArray(path) && path.length) return path;
    }
  } catch {}
  try {
    if (typeof adaptiveReferencePath === 'function') {
      const path = adaptiveReferencePath(ref, mode);
      if (Array.isArray(path) && path.length) return path;
    }
  } catch {}

  const career = ref?.career || ref || {};
  if (mode === 'WIN_PATH') {
    const wins = career.winsBefore || career.wins || currentPathV1691F18(career).filter(row => finish(row) === 1);
    return Array.isArray(wins) ? wins.filter(row => finish(row) === 1) : [];
  }
  for (const path of [
    career.top5Before,
    career.top5,
    career.preparationPathBefore,
    career.preparationPath,
    career.comparisonPathBefore,
    career.roadmapBefore,
    career.historyBefore,
    career.fullPathBefore,
    career.roadmap
  ]) {
    if (Array.isArray(path) && path.length) return path;
  }
  return [];
}

function localScoreV1691F18(a, b) {
  try {
    if (typeof strictCareerCompatibleV1691F12 !== 'function') return -1;
    if (!strictCareerCompatibleV1691F12(a, b)) return -1;
    if (typeof careerRowSimilarity !== 'function') return -1;
    const score = Number(careerRowSimilarity(a, b));
    return Number.isFinite(score) ? clamp(score) : -1;
  } catch {
    return -1;
  }
}

function tracePairsV1691F18(currentPath, referencePath) {
  const a = Array.isArray(currentPath) ? currentPath : [];
  const b = Array.isArray(referencePath) ? referencePath : [];
  const n = a.length;
  const m = b.length;
  if (!n || !m) return { pairs:[], gaps:n + m };

  const dp = Array.from({ length:n + 1 }, () => Array(m + 1).fill(0));
  const act = Array.from({ length:n + 1 }, () => Array(m + 1).fill(''));
  for (let i = 1; i <= n; i++) { dp[i][0] = i * GAP; act[i][0] = 'D'; }
  for (let j = 1; j <= m; j++) { dp[0][j] = j * GAP; act[0][j] = 'I'; }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const local = localScoreV1691F18(a[i - 1], b[j - 1]);
      const match = local >= MATCH_BASE ? dp[i - 1][j - 1] + local - MATCH_BASE : -Infinity;
      const del = dp[i - 1][j] + GAP;
      const ins = dp[i][j - 1] + GAP;
      if (match >= del && match >= ins) { dp[i][j] = match; act[i][j] = 'M'; }
      else if (del >= ins) { dp[i][j] = del; act[i][j] = 'D'; }
      else { dp[i][j] = ins; act[i][j] = 'I'; }
    }
  }

  const pairs = [];
  let i = n;
  let j = m;
  let gaps = 0;
  while (i || j) {
    const action = act[i][j];
    if (action === 'M') {
      const local = localScoreV1691F18(a[i - 1], b[j - 1]);
      pairs.push({ a:a[i - 1], b:b[j - 1], local });
      i--; j--;
    } else if (action === 'D') {
      i--; gaps++;
    } else {
      j--; gaps++;
    }
  }
  return { pairs:pairs.reverse(), gaps };
}

function orderedPathPercentV1691F18(path, refPath) {
  try {
    if (typeof orderedPathSimilarity !== 'function') return 0;
    const raw = Number(orderedPathSimilarity(path, refPath));
    return Number.isFinite(raw) ? Math.round(clamp(raw) * 100) : 0;
  } catch {
    return 0;
  }
}

function partialCapByPairCountV1691F18(pairCount) {
  if (pairCount <= 0) return 0;
  if (pairCount === 1) return 26;
  if (pairCount === 2) return 38;
  if (pairCount === 3) return 50;
  if (pairCount === 4) return 60;
  return PARTIAL_CAP;
}

function partialSupportV1691F18(path, refPath, conditionScore = 100) {
  const trace = tracePairsV1691F18(path, refPath);
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
      floorPct:Math.round(PAIR_SUPPORT_FLOOR * 100),
      cap:0
    };
  }

  const top = valid.slice(0, MAX_TOP_PAIRS);
  const topAvg = avg(top.map(pair => pair.local));
  const minComparablePath = Math.max(1, Math.min(Array.isArray(path) ? path.length : 0, Array.isArray(refPath) ? refPath.length : 0));
  const coverage = clamp(valid.length / minComparablePath);
  const gapPenalty = clamp(1 - (trace.gaps * 0.025), 0.68, 1);
  const conditionFactor = clamp((Number(conditionScore) || 0) / 100);
  const cap = partialCapByPairCountV1691F18(valid.length);
  const raw = topAvg * 100 * Math.sqrt(coverage) * PARTIAL_FACTOR * gapPenalty * conditionFactor;
  const score = Math.round(Math.min(cap, raw));

  return {
    score,
    used:false,
    pairCount:valid.length,
    topPairAvg:Math.round(topAvg * 100),
    coveragePct:Math.round(coverage * 100),
    alignedPairs:trace.pairs.length,
    gaps:trace.gaps,
    factor:PARTIAL_FACTOR,
    gapPenaltyPct:Math.round(gapPenalty * 100),
    conditionFactorPct:Math.round(conditionFactor * 100),
    floorPct:Math.round(PAIR_SUPPORT_FLOOR * 100),
    cap
  };
}

function candidateV1691F18({ race, ref, year, path, mode, conditionScore, targetFinish }) {
  const refPath = referencePathV1691F18(ref, mode);
  if (!refPath.length) return null;
  const pathScore = orderedPathPercentV1691F18(path, refPath);
  const baseScore = Math.round(pathScore * conditionScore / 100);
  const support = partialSupportV1691F18(path, refPath, conditionScore);
  const score = Math.max(baseScore, support.score);

  return {
    year,
    score,
    rawScore:score,
    baseScore,
    pathScore,
    conditionScore,
    partialSupportScore:support.score,
    partialSupportUsed:support.score > baseScore,
    partialSupport:support,
    historicalHorse:ref?.horseName || '',
    historicalHorseId:ref?.horseId || '',
    historicalFinish:Number(ref?.finish || 0) || null,
    historicalPathCount:refPath.length,
    currentPathCount:path.length,
    raceDate:race?.date || '',
    raceCity:race?.city || '',
    raceNo:race?.raceNo || '',
    referenceType:race?.referenceType || '',
    referenceLabel:race?.referenceLabel || '',
    calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
    targetFinish:Number(targetFinish || 0) || null,
    analysisMode:mode,
    yearAggregation:'NONE',
    partialSupportVersion:VERSION,
    rowMatchRule:'EXACT_CLASS + EXACT_AGE_GROUP + CARRIED_WEIGHT + FINISH_RESULT + HP_DELTA + CAPPED_PARTIAL_SUPPORT'
  };
}

function betterCandidateV1691F18(candidate, currentBest) {
  if (!currentBest) return true;
  return Number(candidate.score) > Number(currentBest.score) ||
    (Number(candidate.score) === Number(currentBest.score) && Number(candidate.baseScore || 0) > Number(currentBest.baseScore || 0)) ||
    (Number(candidate.score) === Number(currentBest.score) && Number(candidate.baseScore || 0) === Number(currentBest.baseScore || 0) && Number(candidate.partialSupportScore || 0) > Number(currentBest.partialSupportScore || 0)) ||
    (Number(candidate.score) === Number(currentBest.score) && Number(candidate.baseScore || 0) === Number(currentBest.baseScore || 0) && Number(candidate.partialSupportScore || 0) === Number(currentBest.partialSupportScore || 0) && Number(candidate.historicalFinish || 99) < Number(currentBest.historicalFinish || 99));
}

function scoreHistoricalRowsV1691F18(career, historicalRaces, useCondition, targetFinish = null) {
  const path = currentPathV1691F18(career);
  const mode = modeOfCareerV1691F18(career, path);
  const finishNumber = targetFinish === null ? null : Number(targetFinish);

  if (!path.length || mode === 'DEBUT') {
    return {
      score:null, rawScore:null, strongest:null, rows:[], mode, targetFinish:finishNumber,
      strongYears:0, supportYears:0, latestScore:null, coverageYears:0, yearAggregation:'NONE',
      partialSupportVersion:VERSION
    };
  }

  const byYear = new Map();
  for (const race of Array.isArray(historicalRaces) ? historicalRaces : []) {
    if (race?.ok === false) continue;
    const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4)) || null;
    if (!year) continue;
    const conditionScore = useCondition
      ? Math.max(0, Math.min(100, Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 0))
      : 100;

    let best = null;
    for (const ref of Array.isArray(race?.top3) ? race.top3 : []) {
      if (finishNumber !== null && Number(ref?.finish || 0) !== finishNumber) continue;
      const candidate = candidateV1691F18({ race, ref, year, path, mode, conditionScore, targetFinish:finishNumber });
      if (!candidate) continue;
      if (betterCandidateV1691F18(candidate, best)) best = candidate;
    }

    if (!best) continue;
    const previous = byYear.get(year);
    if (!previous || betterCandidateV1691F18(best, previous)) byYear.set(year, best);
  }

  const rows = [...byYear.values()].sort((a, b) => Number(b.year) - Number(a.year));
  if (!rows.length) {
    return {
      score:null, rawScore:null, strongest:null, rows:[], mode, targetFinish:finishNumber,
      strongYears:0, supportYears:0, latestScore:null, coverageYears:0, yearAggregation:'NONE',
      partialSupportVersion:VERSION
    };
  }

  const strongest = [...rows].sort((a, b) =>
    Number(b.score) - Number(a.score) ||
    Number(b.baseScore || 0) - Number(a.baseScore || 0) ||
    Number(b.partialSupportScore || 0) - Number(a.partialSupportScore || 0) ||
    Number(b.pathScore || 0) - Number(a.pathScore || 0) ||
    Number(b.year || 0) - Number(a.year || 0)
  )[0];

  return {
    score:strongest.score,
    rawScore:strongest.score,
    strongest,
    rows,
    mode,
    targetFinish:finishNumber,
    strongYears:rows.filter(row => row.score >= 85).length,
    supportYears:rows.filter(row => row.score >= 70).length,
    latestScore:rows[0]?.score ?? null,
    coverageYears:rows.length,
    baseScore:strongest.baseScore,
    pathScore:strongest.pathScore,
    partialSupportScore:strongest.partialSupportScore,
    partialSupportUsed:Boolean(strongest.partialSupportUsed),
    partialSupport:strongest.partialSupport,
    yearAggregation:'NONE',
    partialSupportVersion:VERSION,
    partialSupportRule:'Tam kariyer yolu zayifsa, F12/F15 kati satir kurallarini gecen coklu guclu kosu ciftleri sinirli destek puani verir.'
  };
}

const scoreRowsBeforeV1691F18 = typeof scoreRowsV11 === 'function' ? scoreRowsV11 : null;
if (scoreRowsBeforeV1691F18) {
  scoreRowsV11 = function(currentCareer, historicalRaces, useCondition = true) {
    try {
      return scoreHistoricalRowsV1691F18(currentCareer, historicalRaces, useCondition, null);
    } catch (err) {
      const fallback = scoreRowsBeforeV1691F18(currentCareer, historicalRaces, useCondition);
      if (fallback && typeof fallback === 'object') {
        fallback.partialSupportVersion = VERSION;
        fallback.partialSupportError = err?.message || String(err);
      }
      return fallback;
    }
  };
}

const scoreFinishBeforeV1691F18 = typeof scoreFinishRowsPodiumV115 === 'function' ? scoreFinishRowsPodiumV115 : null;
if (scoreFinishBeforeV1691F18) {
  scoreFinishRowsPodiumV115 = function(career, historicalRaces, targetFinish, useCondition = true) {
    try {
      return scoreHistoricalRowsV1691F18(career, historicalRaces, useCondition, targetFinish);
    } catch (err) {
      const fallback = scoreFinishBeforeV1691F18(career, historicalRaces, targetFinish, useCondition);
      if (fallback && typeof fallback === 'object') {
        fallback.partialSupportVersion = VERSION;
        fallback.partialSupportError = err?.message || String(err);
      }
      return fallback;
    }
  };
}

const scoreMetaBeforeV1691F18 = typeof scoreMetaPodiumV115 === 'function' ? scoreMetaPodiumV115 : null;
if (scoreMetaBeforeV1691F18) {
  scoreMetaPodiumV115 = function(row, modelId) {
    const text = scoreMetaBeforeV1691F18(row, modelId);
    const channel = row?.channel || {};
    if (modelId === 'composite' || !channel.partialSupportUsed) return text;
    return `${text} - parca destek %${channel.partialSupportScore || 0}; tam yol %${channel.baseScore ?? channel.pathScore ?? '-'}`;
  };
}

const modelRankingBeforeV1691F18 = typeof modelRankingV112 === 'function' ? modelRankingV112 : null;
if (modelRankingBeforeV1691F18) {
  modelRankingV112 = function(data, id) {
    return (Array.isArray(data?.horses) ? data.horses : [])
      .map(item => {
        const detail = item?.scores?.[id] || {};
        const score = typeof modelScoreV112 === 'function'
          ? modelScoreV112(item, id)
          : (typeof finiteV11 === 'function' ? finiteV11(detail.score) : finite(detail.score));
        return {
          ...item,
          displayScore:score,
          rawScore:typeof finiteV11 === 'function' ? finiteV11(detail.rawScore) : finite(detail.rawScore),
          coverageYears:Number(detail.coverageYears || 0),
          strongYears:Number(detail.strongYears || 0),
          supportYears:Number(detail.supportYears || 0),
          partialSupportUsed:Boolean(detail.partialSupportUsed),
          partialSupportScore:Number(detail.partialSupportScore || 0)
        };
      })
      .filter(item => item.displayScore !== null)
      .sort((a, b) =>
        Number(b.displayScore) - Number(a.displayScore) ||
        Number(b.strongYears) - Number(a.strongYears) ||
        Number(b.supportYears) - Number(a.supportYears) ||
        Number(b.rawScore ?? -1) - Number(a.rawScore ?? -1) ||
        Number(b.partialSupportScore || 0) - Number(a.partialSupportScore || 0) ||
        Number(a?.horse?.no || 999) - Number(b?.horse?.no || 999)
      );
  };
}

const prepareRaceModelsBeforeV1691F18 = typeof prepareRaceModelsV11 === 'function' ? prepareRaceModelsV11 : null;
if (prepareRaceModelsBeforeV1691F18) {
  prepareRaceModelsV11 = async function(...args) {
    const result = await prepareRaceModelsBeforeV1691F18(...args);
    if (result && typeof result === 'object') {
      result.partialSupportVersion = VERSION;
      result.scoreRule = `${result.scoreRule || ''} F18: Detay parca destek puani 5-model ve podium ham siralama hesabina dahildir.`.trim();
    }
    return result;
  };
}

const modelSchemaBeforeV1691F18 = typeof modelSchemaVersionV120 === 'function' ? modelSchemaVersionV120 : null;
if (modelSchemaBeforeV1691F18) {
  modelSchemaVersionV120 = function() {
    const base = String(modelSchemaBeforeV1691F18() || '');
    return base.includes(VERSION) ? base : `${base}+${VERSION}`;
  };
}

if (typeof careerModelKeyV112 === 'function') {
  careerModelKeyV112 = function(race) {
    const city = typeof getCityName === 'function' ? getCityName() : (typeof state !== 'undefined' ? state?.city : '');
    const schema = typeof modelSchemaVersionV120 === 'function' ? modelSchemaVersionV120() : VERSION;
    return [typeof state !== 'undefined' ? state?.date : '', city, race?.no, schema].join('|');
  };
}

try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

function staleTicketModelsV1691F18() {
  if (typeof state === 'undefined') return false;
  const ticketResult = state?.analyses?.ticketV11;
  if (ticketResult && ticketResult.partialSupportVersion !== VERSION) return true;
  return Array.isArray(state?.tickets) && state.tickets.some(ticket => ticket && ticket.partialSupportVersion !== VERSION);
}

try {
  if (staleTicketModelsV1691F18()) {
    if (state?.analyses) state.analyses.ticketV11 = {};
    if (Array.isArray(state?.tickets)) state.tickets = [];
    if (typeof save === 'function') save();
  }
} catch {}

window.careerPartialSupportV1691F18 = partialSupportV1691F18;
window.__AT_PODIUM_PARTIAL_SUPPORT_VERSION__ = VERSION;
console.info('[AT AI]', VERSION, 'aktif - parca destek 5-model ve podium ham siralama hesabina baglandi.');
})();
