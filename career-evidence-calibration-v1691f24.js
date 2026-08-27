/* AT AI Mobil - V16.9.1F24 EVIDENCE CALIBRATION
   - Prevents one loose winner-path match from producing 97-100 confidence.
   - Proven target-condition wins from F23 become the upper confidence anchor.
   - This is general calibration, not a horse-specific override.
*/
(() => {
'use strict';
if (window.__AT_CAREER_EVIDENCE_CALIBRATION_V1691F24__) return;
window.__AT_CAREER_EVIDENCE_CALIBRATION_V1691F24__ = true;

const VERSION = 'CAREER-EVIDENCE-CALIBRATION-V16.9.1F24';
const SCORE_RULE = 'LOW_EVIDENCE_OVERCONFIDENCE_CAP_V24';

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = v => {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/);
  const n = Number((m ? m[0] : v).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function classKind(value) {
  const u = upper(value);
  if (/MAIDEN/.test(u)) return 'MAIDEN';
  if (/HANDIKAP/.test(u)) return 'HANDIKAP';
  if (/SARTLI/.test(u)) return 'SARTLI';
  if (/\bKV\b|KV\s*-?\s*[0-9]/.test(u)) return 'KV';
  if (/\bG\s*-?\s*[0-9]/.test(u)) return 'GROUP';
  return u.replace(/[^A-Z0-9]+/g, '');
}

function normalizeTargetMeta(meta = {}) {
  const target = meta?.currentRaceMetaF23 || meta?.currentRaceMetaF22 || meta?.currentRaceMetaF21 || meta?.targetMeta || meta?.raceMeta || meta?.meta || meta || {};
  return {
    class:clean(target.class || target.raceClass || target.yaradi1 || ''),
    ageGroup:clean(target.ageGroup || target.yaradi2 || target.age || ''),
    distance:finite(target.distance ?? target.mesafe ?? target.mes),
    track:clean(target.track || target.pist || ''),
    city:clean(target.city || target.cityName || '')
  };
}

function evidenceCapF24(path0, target0, sim0) {
  const score = finite(sim0?.score);
  if (score === null) return { applied:false, score:null, finalScore:score, reason:'NO_SCORE' };
  const target = normalizeTargetMeta(target0);
  if (classKind(target.class) === 'MAIDEN') {
    return { applied:false, score:null, finalScore:score, reason:'MAIDEN_TARGET_USES_F22', target };
  }

  const pathCount = Array.isArray(path0) ? path0.length : 0;
  const proofScore = finite(sim0?.provenConditionWinScore);
  const proof = sim0?.provenConditionWin || {};
  const exactCount = Number(proof.exactCount || 0);
  const strongCount = Number(proof.strongCount || 0);
  const priorWins = Number(proof.priorWins || pathCount || 0);

  let cap = null;
  let reason = '';

  if (proofScore !== null) {
    cap = proofScore;
    reason = 'PROVEN_CONDITION_WIN_ANCHOR';
  } else if (score >= 95 && pathCount <= 2) {
    cap = 86;
    reason = 'ONE_OR_TWO_WIN_PATH_WITHOUT_TARGET_PROOF';
  } else if (score >= 95 && pathCount <= 4 && strongCount === 0) {
    cap = 88;
    reason = 'SHORT_WIN_PATH_WITHOUT_STRONG_TARGET_PROOF';
  }

  if (cap === null) {
    return {
      applied:false,
      score:null,
      finalScore:score,
      target,
      pathCount,
      proofScore,
      exactCount,
      strongCount,
      priorWins,
      reason:'NO_CAP_NEEDED'
    };
  }

  const finalScore = Math.min(score, cap);
  return {
    applied:finalScore < score,
    score:cap,
    finalScore,
    originalScore:score,
    target,
    pathCount,
    proofScore,
    exactCount,
    strongCount,
    priorWins,
    reason,
    rule:SCORE_RULE,
    version:VERSION,
    note:'Az kanıtla oluşan çok yüksek kariyer puanı, kanıtlanmış koşu şartı gücüne göre tavanlandı.'
  };
}

const calculateBeforeF24 = typeof calculateGalibiyetBenzerligi === 'function' ? calculateGalibiyetBenzerligi : null;
if (calculateBeforeF24) {
  calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
    const out = calculateBeforeF24(currentPath, roadmapData) || {};
    const cap = evidenceCapF24(currentPath, roadmapData, out);
    const strongest = out.strongest && typeof out.strongest === 'object'
      ? {
          ...out.strongest,
          evidenceCalibrationScore:cap.score,
          evidenceCalibrationApplied:cap.applied,
          score:cap.applied ? cap.finalScore : out.strongest.score
        }
      : out.strongest;
    return {
      ...out,
      score:cap.applied ? cap.finalScore : out.score,
      strongest,
      evidenceCalibrationScore:cap.score,
      evidenceCalibration:cap,
      evidenceCalibrationApplied:cap.applied,
      evidenceCalibrationVersion:VERSION,
      evidenceCalibrationRule:SCORE_RULE,
      scoreSource:cap.applied ? 'EVIDENCE_CALIBRATED_CAREER_SCORE' : (out.scoreSource || 'HISTORICAL_CAREER_PATH'),
      method:cap.applied ? `${out.method || ''}+${SCORE_RULE}`.replace(/^\+/, '') : out.method,
      provenConditionWinVersion:out.provenConditionWinVersion || 'CAREER-PROVEN-CONDITION-WIN-V16.9.1F23'
    };
  };
}

const cacheBeforeF24 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
function hasF24Career(career) {
  const races = Array.isArray(career?.races) ? career.races : [];
  if (!races.length) return false;
  return races.every(race => (race?.horses || []).every(item =>
    item?.galibiyetBenzerligi?.evidenceCalibrationVersion === VERSION
  ));
}

if (cacheBeforeF24) {
  isValidCareerCache = function(cached) {
    return Boolean(cacheBeforeF24(cached) && hasF24Career(cached));
  };
}

function clearStaleCareerF24(reason) {
  try {
    if (typeof state === 'undefined' || !state?.analyses?.career) return false;
    if (hasF24Career(state.analyses.career)) return false;
    state.analyses.career = {};
    state.careerEvidenceCalibrationVersion = VERSION;
    state.careerEvidenceCalibrationInvalidatedBy = reason || VERSION;
    if (typeof save === 'function') save();
    return true;
  } catch {
    return false;
  }
}

clearStaleCareerF24('startup');
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

const runCareerAnalysisBeforeF24 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerAnalysisBeforeF24) {
  runCareerAnalysis = async function(...args) {
    await runCareerAnalysisBeforeF24(...args);
    try {
      if (state?.analyses?.career) {
        state.analyses.career.evidenceCalibrationVersion = VERSION;
        state.analyses.career.evidenceCalibrationRule = SCORE_RULE;
        state.careerEvidenceCalibrationVersion = VERSION;
        if (typeof save === 'function') save();
      }
    } catch {}
  };
}

try {
  const archive = window.ATCouponDailyArchiveV1691;
  if (archive?.hydrateCurrent && !archive.__evidenceCalibrationF24) {
    const beforeHydrate = archive.hydrateCurrent.bind(archive);
    archive.hydrateCurrent = async function(...args) {
      const out = await beforeHydrate(...args);
      clearStaleCareerF24('archive-hydrate');
      return out;
    };
    archive.__evidenceCalibrationF24 = VERSION;
  }
} catch {}

const yearBeforeF24 = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBeforeF24) {
  yearSimilarityHtml = function(sim) {
    const html = yearBeforeF24(sim);
    if (sim?.evidenceCalibrationVersion !== VERSION) return html;
    const cap = sim?.evidenceCalibration || {};
    const finalScore = finite(sim?.score);
    const capScore = finite(sim?.evidenceCalibrationScore);
    const label = cap.applied
      ? `F24 az kanıt aşırı güven tavanı uygulandı · önce %${cap.originalScore ?? '-'} · final %${finalScore ?? '-'} · tavan %${capScore ?? '-'}`
      : `F24 az kanıt aşırı güven tavanı kontrol edildi · final %${finalScore ?? '-'} · tavan ${capScore === null ? 'yok' : '%' + capScore}`;
    const detail = cap.reason ? ` · ${esc(cap.reason)}` : '';
    const badge = `<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:rgba(255,183,77,.08);border:1px solid rgba(255,183,77,.22)"><b>${esc(label)}${detail}</b></div>`;
    return badge + html;
  };
}

window.__AT_CAREER_EVIDENCE_CALIBRATION_VERSION__ = VERSION;
window.ATCareerEvidenceCalibrationV1691F24 = {
  version:VERSION,
  scoreRule:SCORE_RULE,
  cap:evidenceCapF24
};
console.info('[AT AI]', VERSION, 'aktif - az kanitla uretilen asiri yuksek kariyer puani tavanlanir.');
})();
