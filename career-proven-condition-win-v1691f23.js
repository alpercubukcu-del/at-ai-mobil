/* AT AI Mobil - V16.9.1F23 PROVEN CONDITION WIN
   - A horse with verified wins under today's core conditions should not fall to the bottom.
   - This adds a capped floor for same-age, same-surface, near-distance winning evidence.
   - Historical path matching stays intact; this layer only separates proven condition winners.
*/
(() => {
'use strict';
if (window.__AT_CAREER_PROVEN_CONDITION_WIN_V1691F23__) return;
window.__AT_CAREER_PROVEN_CONDITION_WIN_V1691F23__ = true;

const VERSION = 'CAREER-PROVEN-CONDITION-WIN-V16.9.1F23';
const SCORE_RULE = 'PROVEN_TARGET_CONDITION_WIN_FLOOR_V23';

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

function currentCityNameF23() {
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
  const target = meta?.currentRaceMetaF23 || meta?.currentRaceMetaF22 || meta?.currentRaceMetaF21 || meta?.targetMeta || meta?.raceMeta || meta?.meta || meta || {};
  return {
    class:clean(target.class || target.raceClass || target.yaradi1 || ''),
    ageGroup:clean(target.ageGroup || target.yaradi2 || target.age || ''),
    distance:finite(target.distance ?? target.mesafe ?? target.mes),
    track:clean(target.track || target.pist || ''),
    city:clean(target.city || target.cityName || currentCityNameF23()),
    date:clean(target.date || state?.date || '')
  };
}

function targetMetaReady(meta) {
  return Boolean(clean(meta?.class) && clean(meta?.ageGroup) && clean(meta?.track) && finite(meta?.distance) !== null);
}

function surfaceKey(value) {
  const u = upper(value);
  if (u.includes('CIM')) return 'CIM';
  if (u.includes('SENTETIK')) return 'SENTETIK';
  if (u.includes('KUM')) return 'KUM';
  return key(value);
}

function classBridgeScore(rowValue, targetValue) {
  const row = classInfo(rowValue);
  const target = classInfo(targetValue);
  let score = 0.35;
  if (row.kind && row.kind === target.kind) {
    score = 1;
    if (row.no && target.no) {
      const delta = Math.abs(row.no - target.no);
      if (delta === 0) score = 1;
      else if (delta === 1) score = 0.92;
      else if (delta === 2) score = 0.84;
      else if (delta === 3) score = 0.76;
      else score = 0.64;
    }
  } else if (target.kind === 'HANDIKAP' && row.kind === 'SARTLI') {
    score = 0.84;
  } else if (target.kind === 'HANDIKAP' && row.kind === 'MAIDEN') {
    score = 0.74;
  } else if (target.kind === 'SARTLI' && row.kind === 'HANDIKAP') {
    score = 0.82;
  } else if (target.kind === 'SARTLI' && row.kind === 'MAIDEN') {
    score = 0.78;
  } else if (row.kind === 'KV' || target.kind === 'KV') {
    score = 0.58;
  }
  if (row.female && !target.female) score *= 0.92;
  if (target.female && !row.female) score *= 0.94;
  return clamp(score);
}

function trackScore(rowValue, targetValue) {
  const row = surfaceKey(rowValue);
  const target = surfaceKey(targetValue);
  if (!row || !target) return 0.65;
  if (row === target) return 1;
  if ((row === 'KUM' && target === 'SENTETIK') || (row === 'SENTETIK' && target === 'KUM')) return 0.58;
  return 0.26;
}

function distanceScore(rowValue, targetValue) {
  const row = finite(rowValue);
  const target = finite(targetValue);
  if (row === null || target === null || !target) return 0.70;
  const diff = Math.abs(row - target);
  if (diff <= 100) return 1;
  if (diff <= 200) return 0.96;
  if (diff <= 400) return 0.82;
  return clamp(1 - diff / 1700, 0.42, 1);
}

function ageScore(rowValue, targetValue) {
  const row = key(rowValue);
  const target = key(targetValue);
  if (!row || !target) return 0.78;
  return row === target ? 1 : 0.55;
}

function cityScore(rowValue, targetValue) {
  const row = key(rowValue);
  const target = key(targetValue);
  if (!row || !target) return 0.82;
  return row === target ? 1 : 0.78;
}

function provenWinRowScore(row, target, index) {
  const cls = classBridgeScore(rowClass(row), target.class);
  const trk = trackScore(row?.track ?? row?.pist, target.track);
  const dst = distanceScore(row?.distance ?? row?.mesafe ?? row?.mes, target.distance);
  const age = ageScore(row?.ageGroup ?? row?.yaradi2 ?? row?.age, target.ageGroup);
  const city = cityScore(row?.city ?? row?.sehir, target.city);
  const recency = clamp(1 - index * 0.02, 0.88, 1);
  const base = cls * 0.20 + trk * 0.24 + dst * 0.24 + age * 0.17 + city * 0.10 + 0.05;
  const score = Math.round(clamp(base * recency) * 100);
  const exactCore = age >= 0.95 && trk >= 0.95 && dst >= 0.99 && city >= 0.95;
  const strong = age >= 0.95 && trk >= 0.95 && dst >= 0.96 && cls >= 0.66;
  return {
    score,
    strong,
    exactCore,
    classPct:Math.round(cls * 100),
    trackPct:Math.round(trk * 100),
    distancePct:Math.round(dst * 100),
    agePct:Math.round(age * 100),
    cityPct:Math.round(city * 100),
    finish:finish(row),
    date:row?.date || row?.isoDate || '',
    city:row?.city || row?.sehir || '',
    class:rowClass(row),
    distance:finite(row?.distance ?? row?.mesafe ?? row?.mes),
    track:row?.track ?? row?.pist ?? ''
  };
}

function capForProvenWins(best, strongCount, exactCount) {
  if (!best) return 0;
  if (exactCount >= 2) return 94;
  if (exactCount >= 1 && strongCount >= 2) return 92;
  if (strongCount >= 2) return 91;
  if (exactCount >= 1) return 90;
  return 88;
}

function provenConditionWinScoreF23(path0, target0) {
  const target = normalizeTargetMeta(target0);
  if (!targetMetaReady(target)) {
    return { score:null, used:false, reason:'NO_TARGET_META', target };
  }
  if (classInfo(target.class).kind === 'MAIDEN') {
    return { score:null, used:false, reason:'MAIDEN_TARGET_USES_F22_OR_BASE_READINESS', target };
  }
  const rows = chronologicalDesc(path0);
  if (!rows.length) {
    return { score:null, used:false, reason:'NO_CURRENT_PATH', target };
  }
  const winRows = rows.filter(row => finish(row) === 1);
  if (!winRows.length) {
    return { score:null, used:false, reason:'NO_PRIOR_WIN', target, currentPathCount:rows.length };
  }
  const evidence = winRows.map((row, index) => provenWinRowScore(row, target, index));
  const strongWins = evidence.filter(row => row.strong).sort((a, b) => b.score - a.score);
  const exactWins = strongWins.filter(row => row.exactCore);
  if (!strongWins.length) {
    return {
      score:null,
      used:false,
      reason:'NO_STRONG_CONDITION_WIN',
      target,
      rows:evidence,
      priorWins:winRows.length,
      currentPathCount:rows.length
    };
  }
  const topTwo = strongWins.slice(0, 2);
  const best = strongWins[0];
  let boost = 0;
  if (exactWins.length >= 1) boost += 2;
  if (exactWins.length >= 2) boost += 2;
  if (strongWins.length >= 2) boost += 2;
  if (rows.length <= 8 && strongWins.length >= 1) boost += 1;
  const base = Math.round(avg(topTwo.map(row => row.score)));
  const cap = capForProvenWins(best, strongWins.length, exactWins.length);
  const score = Math.min(cap, Math.round(base + boost));
  return {
    score,
    used:false,
    target,
    best,
    strongWins,
    exactWins,
    strongCount:strongWins.length,
    exactCount:exactWins.length,
    priorWins:winRows.length,
    currentPathCount:rows.length,
    base,
    boost,
    cap,
    rule:SCORE_RULE,
    version:VERSION,
    note:'Bugünkü çekirdek koşu şartlarında kanıtlanmış galibiyet kariyer sıralamasında taban destek olarak kullanıldı.'
  };
}

const fetchHistoricalRoadmapBeforeF23 = typeof fetchHistoricalRoadmap === 'function' ? fetchHistoricalRoadmap : null;
if (fetchHistoricalRoadmapBeforeF23) {
  fetchHistoricalRoadmap = async function(meta) {
    const data = await fetchHistoricalRoadmapBeforeF23(meta);
    if (data && typeof data === 'object') {
      const target = normalizeTargetMeta({
        ...meta,
        city:currentCityNameF23(),
        date:clean(state?.date)
      });
      return {
        ...data,
        currentRaceMetaF23:target,
        provenConditionWinVersion:VERSION,
        provenConditionWinRule:SCORE_RULE
      };
    }
    return data;
  };
}

const calculateBeforeF23 = typeof calculateGalibiyetBenzerligi === 'function' ? calculateGalibiyetBenzerligi : null;
if (calculateBeforeF23) {
  calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
    const out = calculateBeforeF23(currentPath, roadmapData) || {};
    const proof = provenConditionWinScoreF23(currentPath, roadmapData);
    const currentScore = finite(out.score);
    const proofScore = finite(proof.score);
    const applyProof = proofScore !== null && (currentScore === null || proofScore > currentScore);
    if (applyProof) proof.used = true;
    const strongest = out.strongest && typeof out.strongest === 'object'
      ? {
          ...out.strongest,
          provenConditionWinScore:proofScore,
          provenConditionWinApplied:applyProof,
          score:applyProof ? proofScore : out.strongest.score
        }
      : out.strongest;
    return {
      ...out,
      score:applyProof ? proofScore : currentScore,
      strongest,
      provenConditionWinScore:proofScore,
      provenConditionWin:proof,
      provenConditionWinApplied:applyProof,
      provenConditionWinVersion:VERSION,
      provenConditionWinRule:SCORE_RULE,
      scoreSource:applyProof ? 'PROVEN_TARGET_CONDITION_WIN' : (out.scoreSource || 'HISTORICAL_CAREER_PATH'),
      method:applyProof ? `${out.method || ''}+${SCORE_RULE}`.replace(/^\+/, '') : out.method,
      juvenileMaidenReadinessVersion:out.juvenileMaidenReadinessVersion || 'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22'
    };
  };
}

const cacheBeforeF23 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
function hasF23Career(career) {
  const races = Array.isArray(career?.races) ? career.races : [];
  if (!races.length) return false;
  return races.every(race => (race?.horses || []).every(item =>
    item?.galibiyetBenzerligi?.provenConditionWinVersion === VERSION
  ));
}

if (cacheBeforeF23) {
  isValidCareerCache = function(cached) {
    return Boolean(cacheBeforeF23(cached) && hasF23Career(cached));
  };
}

function clearStaleCareerF23(reason) {
  try {
    if (typeof state === 'undefined' || !state?.analyses?.career) return false;
    if (hasF23Career(state.analyses.career)) return false;
    state.analyses.career = {};
    state.careerProvenConditionWinVersion = VERSION;
    state.careerProvenConditionWinInvalidatedBy = reason || VERSION;
    if (typeof save === 'function') save();
    return true;
  } catch {
    return false;
  }
}

clearStaleCareerF23('startup');
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

const runCareerAnalysisBeforeF23 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerAnalysisBeforeF23) {
  runCareerAnalysis = async function(...args) {
    await runCareerAnalysisBeforeF23(...args);
    try {
      if (state?.analyses?.career) {
        state.analyses.career.provenConditionWinVersion = VERSION;
        state.analyses.career.provenConditionWinRule = SCORE_RULE;
        state.careerProvenConditionWinVersion = VERSION;
        if (typeof save === 'function') save();
      }
    } catch {}
  };
}

try {
  const archive = window.ATCouponDailyArchiveV1691;
  if (archive?.hydrateCurrent && !archive.__provenConditionWinF23) {
    const beforeHydrate = archive.hydrateCurrent.bind(archive);
    archive.hydrateCurrent = async function(...args) {
      const out = await beforeHydrate(...args);
      clearStaleCareerF23('archive-hydrate');
      return out;
    };
    archive.__provenConditionWinF23 = VERSION;
  }
} catch {}

const yearBeforeF23 = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBeforeF23) {
  yearSimilarityHtml = function(sim) {
    const html = yearBeforeF23(sim);
    if (sim?.provenConditionWinVersion !== VERSION) return html;
    const proof = sim?.provenConditionWin || {};
    const best = proof.best || {};
    const score = finite(sim?.score);
    const proofScore = finite(sim?.provenConditionWinScore);
    const label = sim?.provenConditionWinApplied
      ? `F23 kanıtlanmış şart galibiyeti kullanıldı · final %${score ?? '-'} · şart %${proofScore ?? '-'} · güçlü ${proof.strongCount || 0} · tam ${proof.exactCount || 0}`
      : `F23 kanıtlanmış şart galibiyeti kontrol edildi · şart %${proofScore ?? '-'} · güçlü ${proof.strongCount || 0} · tam ${proof.exactCount || 0}`;
    const detail = best?.date
      ? ` · en iyi: ${esc(best.date)} ${esc(best.city)} ${esc(best.class)} ${esc(best.distance || '')} ${esc(best.track)} ${esc(best.finish || '-')}.`
      : '';
    const badge = `<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22)"><b>${esc(label)}${detail}</b></div>`;
    return badge + html;
  };
}

window.__AT_CAREER_PROVEN_CONDITION_WIN_VERSION__ = VERSION;
window.ATCareerProvenConditionWinV1691F23 = {
  version:VERSION,
  scoreRule:SCORE_RULE,
  score:provenConditionWinScoreF23
};
console.info('[AT AI]', VERSION, 'aktif - bugunku sartta kazanmis at kariyer siralamasinda dibe dusmez.');
})();
