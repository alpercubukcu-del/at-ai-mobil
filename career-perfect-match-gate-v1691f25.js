/* AT AI Mobil - V16.9.1F25 PERFECT MATCH GATE
   - %100 is reserved for a verified row pair with identical class, age group,
     city, surface, distance, and finish position.
   - Maiden races use the same gate; no class receives an exception.
*/
(() => {
'use strict';
if (window.__AT_CAREER_PERFECT_MATCH_GATE_V1691F25__) return;
window.__AT_CAREER_PERFECT_MATCH_GATE_V1691F25__ = true;

const VERSION = 'CAREER-PERFECT-MATCH-GATE-V16.9.1F25';
const SCORE_RULE = 'PERFECT_SCORE_REQUIRES_EXACT_ROW_CONDITIONS_V25';
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I').replace(/[^A-Z0-9]+/g, '');
const finite = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/)?.[0] ?? v);
  return Number.isFinite(n) ? n : null;
};
const finish = row => finite(row?.finish ?? row?.rank ?? row?.sira ?? row?.der);
const classOf = row => fold(row?.class ?? row?.raceClass ?? row?.classRaw ?? row?.yaradi1);
const groupOf = row => fold(row?.ageGroup ?? row?.group ?? row?.groupRaw ?? row?.yaradi2 ?? row?.age);
const cityOf = row => fold(row?.city ?? row?.sehir);
const trackOf = row => fold(row?.track ?? row?.pist);
const distanceOf = row => finite(row?.distance ?? row?.mesafe ?? row?.msf ?? row?.mes);
const same = (a, b) => Boolean(a && b && a === b);

function isPerfectRowPair(current, historical) {
  const currentDistance = distanceOf(current);
  const historicalDistance = distanceOf(historical);
  const currentFinish = finish(current);
  const historicalFinish = finish(historical);
  return Boolean(
    same(classOf(current), classOf(historical)) &&
    same(groupOf(current), groupOf(historical)) &&
    same(cityOf(current), cityOf(historical)) &&
    same(trackOf(current), trackOf(historical)) &&
    currentDistance !== null && historicalDistance !== null && currentDistance === historicalDistance &&
    currentFinish !== null && historicalFinish !== null && currentFinish === historicalFinish
  );
}

function rowsOfCareer(career = {}, mode = '') {
  const full = [career.fullPathBefore, career.historyBefore, career.history, career.fullPath, career.races].find(Array.isArray) || [];
  const wins = [career.winsBefore, career.wins].find(Array.isArray) || [];
  const top5 = [career.preparationPathBefore, career.preparationPath, career.top5Before, career.top5].find(Array.isArray) || [];
  if (mode === 'WIN_PATH') return wins;
  if (mode === 'PREPARATION_PATH') return top5;
  return full;
}

function matchingReference(out, roadmapData) {
  const strongest = out?.strongest || {};
  const races = Array.isArray(roadmapData?.historicalRaces) ? roadmapData.historicalRaces : (Array.isArray(roadmapData?.races) ? roadmapData.races : []);
  const race = races.find(row =>
    clean(row?.date) === clean(strongest?.raceDate) &&
    cityOf(row) === cityOf({ city:strongest?.raceCity }) &&
    String(row?.raceNo ?? '') === String(strongest?.raceNo ?? '')
  );
  const refs = Array.isArray(race?.top3) ? race.top3 : [];
  return refs.find(ref => clean(ref?.horseId) === clean(strongest?.historicalHorseId)) || null;
}

function perfectEvidence(currentPath, out, roadmapData) {
  const reference = matchingReference(out, roadmapData);
  const historicalPath = rowsOfCareer(reference?.career || reference || {}, out?.strongest?.analysisMode);
  const current = Array.isArray(currentPath) ? currentPath : [];
  for (const currentRow of current) {
    for (const historicalRow of historicalPath) {
      if (isPerfectRowPair(currentRow, historicalRow)) {
        return { verified:true, current:currentRow, historical:historicalRow };
      }
    }
  }
  return { verified:false, referenceFound:Boolean(reference), currentRows:current.length, historicalRows:historicalPath.length };
}

const calculateBeforeF25 = typeof calculateGalibiyetBenzerligi === 'function' ? calculateGalibiyetBenzerligi : null;
if (calculateBeforeF25) {
  calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
    const out = calculateBeforeF25(currentPath, roadmapData) || {};
    const originalScore = finite(out.score);
    const evidence = perfectEvidence(currentPath, out, roadmapData);
    const finalScore = originalScore !== null && originalScore >= 100 && !evidence.verified ? 99 : originalScore;
    const applied = finalScore !== originalScore;
    return {
      ...out,
      score:finalScore,
      strongest:out?.strongest && typeof out.strongest === 'object' ? { ...out.strongest, score:applied ? finalScore : out.strongest.score } : out.strongest,
      perfectMatchGate:evidence,
      perfectMatchGateApplied:applied,
      perfectMatchGateVersion:VERSION,
      perfectMatchGateRule:SCORE_RULE,
      scoreSource:applied ? 'PERFECT_MATCH_GATE_CAPPED_SCORE' : out.scoreSource,
      method:applied ? `${out.method || ''}+${SCORE_RULE}`.replace(/^\+/, '') : out.method
    };
  };
}

const cacheBeforeF25 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
if (cacheBeforeF25) {
  isValidCareerCache = cached => Boolean(cacheBeforeF25(cached) && Array.isArray(cached?.races) && cached.races.every(race =>
    (race?.horses || []).every(item => item?.galibiyetBenzerligi?.perfectMatchGateVersion === VERSION)
  ));
}

function clearStaleCareerF25(reason) {
  try {
    if (!state?.analyses?.career) return false;
    const races = Array.isArray(state.analyses.career.races) ? state.analyses.career.races : [];
    if (races.length && races.every(race => (race?.horses || []).every(item => item?.galibiyetBenzerligi?.perfectMatchGateVersion === VERSION))) return false;
    state.analyses.career = {};
    state.careerPerfectMatchGateVersion = VERSION;
    state.careerPerfectMatchGateInvalidatedBy = reason || VERSION;
    if (typeof save === 'function') save();
    return true;
  } catch { return false; }
}

clearStaleCareerF25('startup');
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

const runCareerAnalysisBeforeF25 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerAnalysisBeforeF25) {
  runCareerAnalysis = async function(...args) {
    await runCareerAnalysisBeforeF25(...args);
    try {
      if (state?.analyses?.career) {
        state.analyses.career.perfectMatchGateVersion = VERSION;
        state.analyses.career.perfectMatchGateRule = SCORE_RULE;
        if (typeof save === 'function') save();
      }
    } catch {}
  };
}

window.ATCareerPerfectMatchGateV1691F25 = { version:VERSION, isPerfectRowPair, perfectEvidence };
console.info('[AT AI]', VERSION, 'aktif - %100 yalnız tam sınıf/grup/il/pist/mesafe/bitiriş eşleşmesinde verilir.');
})();
