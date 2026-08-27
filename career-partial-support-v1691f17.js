/* AT AI Mobil - V16.9.1F17 PARTIAL CAREER SUPPORT
   - Tam kariyer yolu zayifsa skoru dogrudan sifira gommez.
   - Katı sınıf/yaş kuralını geçen güçlü parça eşleşmelerinden sınırlı destek üretir.
   - Parça destek aday üretir; banko seviyesi güven üretmez.
*/
(() => {
'use strict';
if (window.__AT_CAREER_PARTIAL_SUPPORT_V1691F17__) return;
window.__AT_CAREER_PARTIAL_SUPPORT_V1691F17__ = true;

const VERSION = 'CAREER-PARTIAL-SUPPORT-V16.9.1F17';
const GAP = -0.18;
const MATCH_BASE = 0.35;
const PAIR_SUPPORT_FLOOR = 0.60;
const MAX_TOP_PAIRS = 5;
const PARTIAL_FACTOR = 0.55;
const PARTIAL_CAP = 42;

const finite = v => {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/);
  const n = Number((m ? m[0] : v).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(v) || 0));
const finish = r => finite(r?.finish ?? r?.rank ?? r?.sira ?? r?.der);
const avg = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;

window.careerPairSupportFloorV1691F17 = () => PAIR_SUPPORT_FLOOR;

function modeOf(path) {
  try { if (typeof adaptiveCurrentMode === 'function') return adaptiveCurrentMode(path); } catch {}
  const rows = Array.isArray(path) ? path : [];
  if (!rows.length) return 'DEBUT';
  return rows.some(x => finish(x) === 1) ? 'WIN_PATH' : 'PREPARATION_PATH';
}

function refPathOf(ref, mode) {
  try {
    if (typeof adaptiveReferencePath === 'function') {
      const p = adaptiveReferencePath(ref, mode);
      if (Array.isArray(p) && p.length) return p;
    }
  } catch {}
  const career = ref?.career || ref || {};
  if (mode === 'WIN_PATH') {
    return (career.winsBefore || career.wins || []).filter(x => finish(x) === 1);
  }
  const top5 = career.top5Before || career.top5 || [];
  if (top5.length) return top5;
  return career.preparationPathBefore || career.preparationPath || career.roadmapBefore || career.roadmap || [];
}

function localScore(a, b) {
  try {
    if (typeof strictCareerCompatibleV1691F12 === 'function' && !strictCareerCompatibleV1691F12(a, b)) return -1;
    if (typeof careerRowSimilarity !== 'function') return -1;
    const s = Number(careerRowSimilarity(a, b));
    return Number.isFinite(s) ? clamp(s) : -1;
  } catch {
    return -1;
  }
}

function tracePairs(a0, b0) {
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
      const local = localScore(a[i - 1], b[j - 1]);
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
      pairs.push({ a:a[i - 1], b:b[j - 1], local:localScore(a[i - 1], b[j - 1]) });
      i--; j--;
    } else if (z === 'D') {
      i--; gaps++;
    } else {
      j--; gaps++;
    }
  }
  return { pairs:pairs.reverse(), gaps };
}

function partialSupport(path, refPath, conditionScore) {
  const trace = tracePairs(path, refPath);
  const valid = trace.pairs
    .filter(p => p.local >= PAIR_SUPPORT_FLOOR)
    .sort((a, b) => b.local - a.local);
  if (!valid.length) {
    return {
      score:0, used:false, pairCount:0, topPairAvg:0, coveragePct:0,
      alignedPairs:trace.pairs.length, gaps:trace.gaps
    };
  }
  const top = valid.slice(0, MAX_TOP_PAIRS);
  const topAvg = avg(top.map(p => p.local));
  const coverage = clamp(valid.length / Math.max(1, (Array.isArray(path) ? path.length : 0)));
  let cap = PARTIAL_CAP;
  if (valid.length === 1) cap = 18;
  else if (valid.length === 2) cap = 25;
  else if (valid.length === 3) cap = 33;
  else if (valid.length === 4) cap = 38;
  const raw = topAvg * 100 * Math.sqrt(coverage) * PARTIAL_FACTOR * clamp((Number(conditionScore) || 0) / 100);
  const score = Math.round(Math.min(cap, raw));
  return {
    score, used:false, pairCount:valid.length,
    topPairAvg:Math.round(topAvg * 100),
    coveragePct:Math.round(coverage * 100),
    alignedPairs:trace.pairs.length,
    gaps:trace.gaps,
    factor:PARTIAL_FACTOR,
    cap,
    floorPct:Math.round(PAIR_SUPPORT_FLOOR * 100)
  };
}

const calcBefore = typeof calculateGalibiyetBenzerligi === 'function' ? calculateGalibiyetBenzerligi : null;
if (calcBefore) {
  calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
    const original = calcBefore(currentPath, roadmapData) || {};
    const path = Array.isArray(currentPath) ? [...currentPath] : [];
    const races = Array.isArray(roadmapData?.historicalRaces)
      ? roadmapData.historicalRaces.filter(race => race?.ok !== false).sort((a, b) => Number(b?.sourceYear || 0) - Number(a?.sourceYear || 0))
      : [];
    const mode = modeOf(path);
    if (!path.length || !races.length || mode === 'DEBUT') {
      original.partialSupportVersion = VERSION;
      original.partialSupportRule = 'NO_PATH_OR_NO_REFERENCE';
      return original;
    }

    const byYear = [];
    let referenceCount = 0;
    for (const race of races) {
      const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4)) || null;
      const conditionScore = Math.max(0, Math.min(100, Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 0));
      const refs = Array.isArray(race?.top3) ? race.top3 : [];
      let best = null;

      for (const ref of refs) {
        const rp = refPathOf({ career:ref?.career || ref }, mode);
        if (!rp.length) continue;
        referenceCount++;
        let rawPath = 0;
        try { rawPath = typeof orderedPathSimilarity === 'function' ? orderedPathSimilarity(path, rp) : 0; } catch { rawPath = 0; }
        const pathScore = Math.round(clamp(rawPath) * 100);
        const baseScore = Math.round(pathScore * conditionScore / 100);
        const support = partialSupport(path, rp, conditionScore);
        const finalScore = Math.max(baseScore, support.score);
        const candidate = {
          year,
          score:finalScore,
          baseScore,
          pathScore,
          conditionScore,
          partialSupportScore:support.score,
          partialSupportUsed:support.score > baseScore,
          partialSupport:support,
          historicalHorse:ref?.horseName || '',
          historicalHorseId:ref?.horseId || '',
          historicalFinish:Number(ref?.finish || 0) || null,
          historicalPathCount:rp.length,
          currentPathCount:path.length,
          analysisMode:mode,
          raceDate:race?.date || '',
          raceCity:race?.city || '',
          raceNo:race?.raceNo || '',
          calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
          referenceType:race?.referenceType || 'EXACT',
          referenceLabel:race?.referenceLabel || 'TAM TARİHSEL EŞLEŞME',
          transferabilityTier:race?.transferabilityTier || (conditionScore >= 85 ? 'HIGH' : conditionScore >= 70 ? 'MEDIUM' : conditionScore >= 50 ? 'SUPPORT' : 'LOW'),
          transferabilityColor:race?.transferabilityColor || '',
          explanation:race?.explanation || '',
          distanceDifferencePct:Number(race?.distanceDifferencePct ?? 0),
          alternatives:Array.isArray(race?.alternatives) ? race.alternatives : [],
          resultPerformanceVersion:original?.resultPerformanceVersion || 'CAREER-RESULT-PERFORMANCE-V16.9.1F15',
          partialSupportVersion:VERSION,
          rowMatchRule:'EXACT_CLASS + EXACT_AGE_GROUP + CARRIED_WEIGHT + FINISH_RESULT + HP_DELTA + PARTIAL_SUPPORT'
        };
        if (
          !best ||
          candidate.score > best.score ||
          (candidate.score === best.score && candidate.baseScore > best.baseScore) ||
          (candidate.score === best.score && candidate.baseScore === best.baseScore && candidate.partialSupportScore > best.partialSupportScore) ||
          (candidate.score === best.score && candidate.baseScore === best.baseScore && candidate.partialSupportScore === best.partialSupportScore && Number(candidate.historicalFinish || 99) < Number(best.historicalFinish || 99))
        ) {
          best = candidate;
        }
      }

      if (best) {
        byYear.push(best);
      } else {
        byYear.push({
          year, score:null, baseScore:null, pathScore:null, conditionScore,
          partialSupportScore:0, partialSupportUsed:false,
          historicalHorse:null, historicalFinish:null, analysisMode:mode,
          raceDate:race?.date || '', raceCity:race?.city || '', raceNo:race?.raceNo || '',
          calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
          referenceType:race?.referenceType || 'EXACT',
          referenceLabel:race?.referenceLabel || 'Tarihsel referans',
          transferabilityTier:race?.transferabilityTier || 'LOW',
          explanation:race?.explanation || '',
          error: mode === 'WIN_PATH'
            ? 'Geçmiş ilk 3 atının yarış öncesi galibiyet yolu alınamadı.'
            : 'Geçmiş ilk 3 atının yarış öncesi hazırlık/ilk 5 yolu alınamadı.',
          partialSupportVersion:VERSION
        });
      }
    }

    byYear.sort((a, b) => Number(b?.year || 0) - Number(a?.year || 0));
    const scored = byYear.filter(x => Number.isFinite(Number(x?.score)));
    const strongest = scored.length
      ? [...scored].sort((a, b) =>
          Number(b.score) - Number(a.score) ||
          Number(b.baseScore || 0) - Number(a.baseScore || 0) ||
          Number(b.partialSupportScore || 0) - Number(a.partialSupportScore || 0) ||
          Number(b.year || 0) - Number(a.year || 0)
        )[0]
      : null;

    return {
      ...original,
      score:strongest ? strongest.score : null,
      strongestYear:strongest?.year || null,
      strongest:strongest || null,
      byYear,
      matchedHistoricalHorse:strongest?.historicalHorse || null,
      matchedHistoricalFinish:strongest?.historicalFinish || null,
      matchedHistoricalRace:strongest ? `${strongest.raceDate} ${strongest.raceCity} ${strongest.raceNo}. Koşu` : null,
      referenceCount,
      currentPathCount:path.length,
      currentWinCount:path.filter(x => finish(x) === 1).length,
      analysisMode:mode,
      method:mode === 'WIN_PATH' ? 'YEAR_BY_YEAR_ADAPTIVE_WIN_PATH_WITH_PARTIAL_SUPPORT_V17' : 'YEAR_BY_YEAR_PREPARATION_PATH_WITH_PARTIAL_SUPPORT_V17',
      yearAggregation:'NONE',
      historicalRaceRule:'EXACT + SAME_RACE_FAMILY + CONDITION_TWIN; PM45_DAYS',
      partialSupportVersion:VERSION,
      partialSupportRule:'If full ordered career path score is weak, valid exact class/group row pairs can provide capped low-confidence support.'
    };
  };
}

const cacheBefore = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
if (cacheBefore) {
  isValidCareerCache = function(cached) {
    if (!cacheBefore(cached)) return false;
    return (cached.races || []).every(race =>
      (race.horses || []).every(item =>
        item?.galibiyetBenzerligi?.partialSupportVersion === VERSION
      )
    );
  };
}
function hasF17(career) {
  return (career?.races || []).some(race =>
    (race?.horses || []).some(item =>
      item?.galibiyetBenzerligi?.partialSupportVersion === VERSION
    )
  );
}
if (state?.analyses?.career && !hasF17(state.analyses.career)) {
  state.analyses.career = {};
  try { save(); } catch {}
}
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

const yearBefore = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBefore) {
  yearSimilarityHtml = function(sim) {
    const html = yearBefore(sim);
    const rows = Array.isArray(sim?.byYear) ? sim.byYear : [];
    const used = rows.filter(r => r?.partialSupportUsed && Number.isFinite(Number(r?.partialSupportScore)));
    if (!used.length) return html;
    const best = [...used].sort((a, b) => Number(b.partialSupportScore) - Number(a.partialSupportScore))[0];
    const p = best?.partialSupport || {};
    const badge = `<div style="margin:7px 0;padding:8px 9px;border-radius:8px;font-size:10px;line-height:1.45;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.24)"><b>✓ F17 parça destek hesabı aktif</b><br>${best?.historicalHorse || '-'}: final <b>%${best?.score}</b> · tam yol <b>%${best?.baseScore}</b> · parça destek <b>%${best?.partialSupportScore}</b> · güçlü çift <b>${p.pairCount || 0}</b> · ort. <b>%${p.topPairAvg || 0}</b> · doluluk <b>%${p.coveragePct || 0}</b>. Bu destek düşük güvenlidir; banko sinyali sayılmaz.</div>`;
    return badge + html;
  };
}

window.__AT_CAREER_PARTIAL_SUPPORT_VERSION__ = VERSION;
console.info('[AT AI]', VERSION, 'aktif - zayif tam kariyer yolunda guclu parca eslesmeleri sinirli destek puani uretir.');
})();
