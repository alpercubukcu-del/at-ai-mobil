/* AT AI Mobil - V16.9.1F21 CAREER RACE READINESS
   - Adds a target-race readiness floor to the main career ranking.
   - Short careers are not punished when they contain credible class/track/distance evidence for today's race.
   - Historical path similarity remains active; this layer only lifts a horse when today's-condition evidence is stronger.
*/
(() => {
'use strict';
if (window.__AT_CAREER_RACE_READINESS_V1691F21__) return;
window.__AT_CAREER_RACE_READINESS_V1691F21__ = true;

const VERSION = 'CAREER-RACE-READINESS-V16.9.1F21';
const SCORE_RULE = 'TARGET_CONDITION_READINESS_FLOOR_V21';
const MAX_READINESS_SCORE = 88;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
const key = v => upper(v).replace(/[^A-Z0-9]+/g, '').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = v => {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/);
  const n = Number((m ? m[0] : v).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(v) || 0));
const avg = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
const finish = row => finite(row?.finish ?? row?.rank ?? row?.sira ?? row?.der);

function iso(row = {}) {
  const x = clean(row?.isoDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const raw = clean(row?.date);
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : raw;
}

function chronologicalDesc(rows) {
  return (Array.isArray(rows) ? [...rows] : []).filter(Boolean).sort((a, b) => iso(b).localeCompare(iso(a)));
}

function classInfo(value) {
  const u = upper(value);
  let kind = '', no = null;
  if (/HANDIKAP/.test(u)) {
    kind = 'HANDIKAP';
    no = Number(u.match(/HANDIKAP\s*([0-9]+)/)?.[1]) || null;
  } else if (/SARTLI/.test(u)) {
    kind = 'SARTLI';
    no = Number(u.match(/SARTLI\s*([0-9]+)/)?.[1]) || null;
  } else if (/MAIDEN/.test(u)) {
    kind = 'MAIDEN';
  } else if (/\bKV\b|KV\s*-?\s*[0-9]/.test(u)) {
    kind = 'KV';
    no = Number(u.match(/KV\s*-?\s*([0-9]+)/)?.[1]) || null;
  } else if (/\bG\s*-?\s*[0-9]/.test(u)) {
    kind = 'GROUP';
    no = Number(u.match(/G\s*-?\s*([0-9]+)/)?.[1]) || null;
  } else {
    kind = key(value);
  }
  return { kind, no, female:/DISI|\/D(?:\b|$)/.test(u) };
}

function rowClass(row = {}) {
  return row?.class ?? row?.raceClass ?? row?.sinif ?? row?.yaradi1 ?? '';
}

function classScore(rowValue, targetValue) {
  const row = classInfo(rowValue);
  const target = classInfo(targetValue);
  let score = 0.35;
  if (row.kind && row.kind === target.kind) {
    score = 1;
    if (row.no && target.no) {
      const delta = Math.abs(row.no - target.no);
      if (delta === 0) score = 1;
      else if (delta === 1) score = 0.91;
      else if (delta === 2) score = 0.80;
      else if (delta === 3) score = 0.70;
      else score = 0.58;
    }
  } else if (
    (row.kind === 'SARTLI' && target.kind === 'HANDIKAP') ||
    (row.kind === 'HANDIKAP' && target.kind === 'SARTLI')
  ) {
    score = 0.60;
  } else if (row.kind === 'MAIDEN' || target.kind === 'MAIDEN') {
    score = 0.40;
  } else if (row.kind === 'KV' || target.kind === 'KV') {
    score = 0.48;
  }
  if (row.female && !target.female) score *= 0.92;
  return clamp(score);
}

function surfaceKey(value) {
  const u = upper(value);
  if (u.includes('CIM')) return 'CIM';
  if (u.includes('SENTETIK')) return 'SENTETIK';
  if (u.includes('KUM')) return 'KUM';
  return key(value);
}

function trackScore(rowValue, targetValue) {
  const row = surfaceKey(rowValue);
  const target = surfaceKey(targetValue);
  if (!row || !target) return 0.65;
  if (row === target) return 1;
  if ((row === 'KUM' && target === 'SENTETIK') || (row === 'SENTETIK' && target === 'KUM')) return 0.58;
  return 0.28;
}

function distanceScore(rowValue, targetValue) {
  const row = finite(rowValue);
  const target = finite(targetValue);
  if (row === null || target === null || !target) return 0.70;
  const diff = Math.abs(row - target);
  if (diff <= 200) return 1;
  return clamp(1 - diff / 1800, 0.45, 1);
}

function ageScore(rowValue, targetValue) {
  const row = key(rowValue);
  const target = key(targetValue);
  if (!row || !target) return 0.78;
  return row === target ? 1 : 0.64;
}

function cityScore(rowValue, targetValue) {
  const row = key(rowValue);
  const target = key(targetValue);
  if (!row || !target) return 0.82;
  return row === target ? 1 : 0.78;
}

function finishMultiplier(value) {
  const f = finite(value);
  if (f === null) return 0.84;
  if (f === 1) return 1.14;
  if (f === 2) return 1.07;
  if (f === 3) return 1.02;
  if (f === 4) return 0.96;
  if (f === 5) return 0.91;
  if (f === 6) return 0.84;
  if (f === 7) return 0.78;
  if (f === 8) return 0.72;
  if (f === 9) return 0.66;
  return 0.58;
}

function currentCityNameF21() {
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

function normalizeTargetMeta(meta = {}) {
  const target = meta?.currentRaceMetaF21 || meta?.targetMeta || meta?.raceMeta || meta?.meta || meta || {};
  return {
    class:clean(target.class || target.raceClass || target.yaradi1 || ''),
    ageGroup:clean(target.ageGroup || target.yaradi2 || target.age || ''),
    distance:finite(target.distance ?? target.mesafe ?? target.mes),
    track:clean(target.track || target.pist || ''),
    city:clean(target.city || target.cityName || currentCityNameF21()),
    date:clean(target.date || state?.date || '')
  };
}

function targetMetaReady(meta) {
  return Boolean(clean(meta?.class) && clean(meta?.ageGroup) && clean(meta?.track) && finite(meta?.distance) !== null);
}

function rowReadiness(row, target, index) {
  const cls = classScore(rowClass(row), target.class);
  const trk = trackScore(row?.track ?? row?.pist, target.track);
  const dst = distanceScore(row?.distance ?? row?.mesafe ?? row?.mes, target.distance);
  const age = ageScore(row?.ageGroup ?? row?.yaradi2 ?? row?.age, target.ageGroup);
  const city = cityScore(row?.city ?? row?.sehir, target.city);
  const recency = clamp(1 - index * 0.025, 0.88, 1);
  const finishMult = finishMultiplier(finish(row));
  const base = cls * 0.34 + trk * 0.20 + dst * 0.21 + age * 0.12 + city * 0.05 + 0.08;
  const rawScore = clamp(base * finishMult * recency) * 100;
  const score = Math.round(rawScore);
  return {
    score,
    rawScore,
    classPct:Math.round(cls * 100),
    trackPct:Math.round(trk * 100),
    distancePct:Math.round(dst * 100),
    agePct:Math.round(age * 100),
    cityPct:Math.round(city * 100),
    finish:finish(row),
    finishMultiplier:Math.round(finishMult * 100),
    date:row?.date || row?.isoDate || '',
    city:row?.city || row?.sehir || '',
    class:rowClass(row),
    distance:finite(row?.distance ?? row?.mesafe ?? row?.mes),
    track:row?.track ?? row?.pist ?? ''
  };
}

function raceReadinessScoreF21(path0, target0) {
  const rows = chronologicalDesc(path0);
  const target = normalizeTargetMeta(target0);
  if (!rows.length || !targetMetaReady(target)) {
    return {
      score:null,
      used:false,
      reason:!rows.length ? 'NO_CURRENT_PATH' : 'NO_TARGET_META',
      target
    };
  }
  const evidence = rows.map((row, index) => rowReadiness(row, target, index));
  const topRows = [...evidence].sort((a, b) => Number(b.rawScore ?? b.score) - Number(a.rawScore ?? a.score)).slice(0, 3);
  const bestTwo = topRows.slice(0, 2);
  const wins = rows.filter(row => finish(row) === 1).length;
  const top3 = rows.filter(row => {
    const f = finish(row);
    return f !== null && f >= 1 && f <= 3;
  }).length;
  const strongEvidence = evidence.filter(row => row.score >= 68).length;
  const closeConditionRows = evidence.filter(row => row.classPct >= 80 && row.trackPct >= 95 && row.distancePct >= 70).length;
  const hasCredibleEvidence = strongEvidence >= 2 || closeConditionRows >= 2 || wins > 0 || top3 >= 2;

  if (!hasCredibleEvidence) {
    return {
      score:null,
      used:false,
      reason:'NO_CREDIBLE_TARGET_EVIDENCE',
      target,
      rows:evidence,
      topRows,
      wins,
      top3,
      strongEvidence,
      closeConditionRows
    };
  }

  let boost = 0;
  if (rows.length <= 6 && strongEvidence >= 2) boost += 4;
  if (wins > 0) boost += 3;
  if (top3 >= 2) boost += 3;
  if (closeConditionRows >= 2) boost += 3;
  if (closeConditionRows >= 3) boost += 2;

  const topThreeRawAvg = avg(topRows.map(row => Number(row.rawScore ?? row.score)));
  const topTwoRawAvg = avg(bestTwo.map(row => Number(row.rawScore ?? row.score)));
  const topThreeAvg = Math.round(topThreeRawAvg);
  const topTwoAvg = Math.round(topTwoRawAvg);
  const rawScore = topThreeRawAvg * 0.65 + topTwoRawAvg * 0.35 + boost;
  const score = Math.min(MAX_READINESS_SCORE, Math.round(rawScore));
  return {
    score,
    rawScore,
    used:false,
    target,
    topRows,
    topThreeAvg,
    topTwoAvg,
    boost,
    wins,
    top3,
    strongEvidence,
    closeConditionRows,
    currentPathCount:rows.length,
    rule:SCORE_RULE,
    version:VERSION
  };
}

const fetchHistoricalRoadmapBeforeF21 = typeof fetchHistoricalRoadmap === 'function' ? fetchHistoricalRoadmap : null;
if (fetchHistoricalRoadmapBeforeF21) {
  fetchHistoricalRoadmap = async function(meta) {
    const data = await fetchHistoricalRoadmapBeforeF21(meta);
    if (data && typeof data === 'object') {
      const target = normalizeTargetMeta({
        ...meta,
        city:currentCityNameF21(),
        date:clean(state?.date)
      });
      return {
        ...data,
        currentRaceMetaF21:target,
        raceReadinessVersion:VERSION,
        raceReadinessRule:SCORE_RULE
      };
    }
    return data;
  };
}

const calculateBeforeF21 = typeof calculateGalibiyetBenzerligi === 'function' ? calculateGalibiyetBenzerligi : null;
if (calculateBeforeF21) {
  calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
    const out = calculateBeforeF21(currentPath, roadmapData) || {};
    const readiness = raceReadinessScoreF21(currentPath, roadmapData);
    const currentScore = finite(out.score);
    const readinessScore = finite(readiness.score);
    const currentRawScore = finite(out.rankingRawScore ?? out.score);
    const readinessRawScore = finite(readiness.rawScore ?? readiness.score);
    const applyReadiness = readinessScore !== null && (currentScore === null || readinessScore > currentScore || (readinessScore === currentScore && readinessRawScore !== null && readinessRawScore > (currentRawScore ?? -1)));
    const finalScore = applyReadiness ? readinessScore : currentScore;
    const finalRawScore = applyReadiness ? readinessRawScore : currentRawScore;
    const strongest = out.strongest && typeof out.strongest === 'object'
      ? { ...out.strongest, raceReadinessScore:readinessScore, raceReadinessApplied:applyReadiness, score:applyReadiness ? readinessScore : out.strongest.score }
      : out.strongest;
    if (applyReadiness) readiness.used = true;
    return {
      ...out,
      score:finalScore,
      rankingRawScore:finalRawScore,
      strongest,
      raceReadinessScore:readinessScore,
      raceReadiness:readiness,
      raceReadinessApplied:applyReadiness,
      raceReadinessVersion:VERSION,
      raceReadinessRule:SCORE_RULE,
      scoreSource:applyReadiness ? 'TARGET_RACE_READINESS_FLOOR' : (out.scoreSource || 'HISTORICAL_CAREER_PATH'),
      method:applyReadiness ? `${out.method || ''}+${SCORE_RULE}`.replace(/^\+/, '') : out.method,
      candidateScoreVersion:out.candidateScoreVersion || 'CAREER-CANDIDATE-SCORE-V16.9.1F20'
    };
  };
}

const cacheBeforeF21 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
function hasF21Career(career) {
  const races = Array.isArray(career?.races) ? career.races : [];
  if (!races.length) return false;
  return races.every(race => (race?.horses || []).every(item =>
    item?.galibiyetBenzerligi?.raceReadinessVersion === VERSION &&
    (item?.galibiyetBenzerligi?.score == null || Number.isFinite(Number(item?.galibiyetBenzerligi?.rankingRawScore)))
  ));
}

if (cacheBeforeF21) {
  isValidCareerCache = function(cached) {
    return Boolean(cacheBeforeF21(cached) && hasF21Career(cached));
  };
}

function clearStaleCareerF21(reason) {
  try {
    if (typeof state === 'undefined' || !state?.analyses?.career) return false;
    if (hasF21Career(state.analyses.career)) return false;
    state.analyses.career = {};
    state.careerRaceReadinessVersion = VERSION;
    state.careerRaceReadinessInvalidatedBy = reason || VERSION;
    if (typeof save === 'function') save();
    return true;
  } catch {
    return false;
  }
}

clearStaleCareerF21('startup');
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

const runCareerAnalysisBeforeF21 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerAnalysisBeforeF21) {
  runCareerAnalysis = async function(...args) {
    await runCareerAnalysisBeforeF21(...args);
    try {
      if (state?.analyses?.career) {
        state.analyses.career.raceReadinessVersion = VERSION;
        state.analyses.career.raceReadinessRule = SCORE_RULE;
        state.careerRaceReadinessVersion = VERSION;
        if (typeof save === 'function') save();
      }
    } catch {}
  };
}

try {
  const archive = window.ATCouponDailyArchiveV1691;
  if (archive?.hydrateCurrent && !archive.__careerRaceReadinessF21) {
    const beforeHydrate = archive.hydrateCurrent.bind(archive);
    archive.hydrateCurrent = async function(...args) {
      const out = await beforeHydrate(...args);
      clearStaleCareerF21('archive-hydrate');
      return out;
    };
    archive.__careerRaceReadinessF21 = VERSION;
  }
} catch {}

const yearBeforeF21 = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBeforeF21) {
  yearSimilarityHtml = function(sim) {
    const html = yearBeforeF21(sim);
    if (sim?.raceReadinessVersion !== VERSION) return html;
    const readiness = sim?.raceReadiness || {};
    const score = finite(sim?.score);
    const targetScore = finite(sim?.raceReadinessScore);
    const top = Array.isArray(readiness.topRows) ? readiness.topRows[0] : null;
    const detail = top
      ? ` · en yakın: ${esc(top.date)} ${esc(top.class)} ${esc(top.distance || '')} ${esc(top.track)} ${esc(top.finish || '-')}.`
      : '';
    const label = `${sim.raceReadinessApplied ? 'F21 koşu hazırlık tabanı kullanıldı' : 'F21 koşu hazırlık tabanı kontrol edildi'} · final %${score ?? '-'} · hedef %${targetScore ?? '-'} · kanıt ${readiness.strongEvidence || 0}/${readiness.closeConditionRows || 0}${detail}`;
    const badge = `<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22)"><b>${esc(label)}</b></div>`;
    return badge + html;
  };
}

window.__AT_CAREER_RACE_READINESS_VERSION__ = VERSION;
window.ATCareerRaceReadinessV1691F21 = {
  version:VERSION,
  scoreRule:SCORE_RULE,
  maxReadinessScore:MAX_READINESS_SCORE,
  score:raceReadinessScoreF21
};
console.info('[AT AI]', VERSION, 'aktif - kariyer siralamasi bugunku kosu uygunluk tabanini kullanir.');
})();
