/* AT AI Mobil - V16.9.1F22 JUVENILE MAIDEN READINESS
   - 2-year-old Maiden races often have 0-1 race careers; full historical path matching is too sparse.
   - A single strong same-age, same-surface, near-distance prep race can lift the main career score.
   - This is a capped readiness signal, not a fake historical winner match.
*/
(() => {
'use strict';
if (window.__AT_CAREER_JUVENILE_MAIDEN_READINESS_V1691F22__) return;
window.__AT_CAREER_JUVENILE_MAIDEN_READINESS_V1691F22__ = true;

const VERSION = 'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22';
const SCORE_RULE = 'JUVENILE_MAIDEN_SINGLE_PREP_READINESS_V22';

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
  if (/MAIDEN/.test(u)) {
    kind = 'MAIDEN';
  } else if (/SARTLI/.test(u)) {
    kind = 'SARTLI';
    no = Number(u.match(/SARTLI\s*([0-9]+)/)?.[1]) || null;
  } else if (/HANDIKAP/.test(u)) {
    kind = 'HANDIKAP';
    no = Number(u.match(/HANDIKAP\s*([0-9]+)/)?.[1]) || null;
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

function surfaceKey(value) {
  const u = upper(value);
  if (u.includes('CIM')) return 'CIM';
  if (u.includes('SENTETIK')) return 'SENTETIK';
  if (u.includes('KUM')) return 'KUM';
  return key(value);
}

function currentCityNameF22() {
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
  const target = meta?.currentRaceMetaF22 || meta?.currentRaceMetaF21 || meta?.targetMeta || meta?.raceMeta || meta?.meta || meta || {};
  return {
    class:clean(target.class || target.raceClass || target.yaradi1 || ''),
    ageGroup:clean(target.ageGroup || target.yaradi2 || target.age || ''),
    distance:finite(target.distance ?? target.mesafe ?? target.mes),
    track:clean(target.track || target.pist || ''),
    city:clean(target.city || target.cityName || currentCityNameF22()),
    date:clean(target.date || state?.date || '')
  };
}

function isJuvenileMaidenTarget(target) {
  return /MAIDEN/.test(upper(target?.class)) && /2\s*YAS|2YAS|2\s*YAŞ|2YAŞ/.test(upper(target?.ageGroup));
}

function classBridgeScore(rowValue, targetValue) {
  const row = classInfo(rowValue);
  const target = classInfo(targetValue);
  let score = 0.30;
  if (row.kind === target.kind) score = 1;
  else if (target.kind === 'MAIDEN' && row.kind === 'SARTLI') score = 0.88;
  else if (target.kind === 'MAIDEN' && row.kind === 'KV') score = 0.78;
  else if (target.kind === 'MAIDEN' && row.kind === 'GROUP') score = 0.76;
  else if (target.kind === 'MAIDEN' && row.kind === 'HANDIKAP') score = 0.58;
  if (target.female && !row.female) score *= 0.94;
  if (row.female && !target.female) score *= 0.94;
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
  if (diff <= 200) return 1;
  if (diff <= 400) return 0.88;
  return clamp(1 - diff / 1600, 0.42, 1);
}

function ageScore(rowValue, targetValue) {
  const row = key(rowValue);
  const target = key(targetValue);
  if (!row || !target) return 0.76;
  return row === target ? 1 : 0.55;
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
  if (f === 1) return 1.16;
  if (f === 2) return 1.10;
  if (f === 3) return 1.04;
  if (f === 4) return 0.96;
  if (f === 5) return 0.90;
  if (f === 6) return 0.82;
  if (f === 7) return 0.74;
  return 0.62;
}

function evidenceRowScore(row, target, index) {
  const cls = classBridgeScore(rowClass(row), target.class);
  const trk = trackScore(row?.track ?? row?.pist, target.track);
  const dst = distanceScore(row?.distance ?? row?.mesafe ?? row?.mes, target.distance);
  const age = ageScore(row?.ageGroup ?? row?.yaradi2 ?? row?.age, target.ageGroup);
  const city = cityScore(row?.city ?? row?.sehir, target.city);
  const recency = clamp(1 - index * 0.03, 0.88, 1);
  const fin = finish(row);
  const base = cls * 0.27 + trk * 0.23 + dst * 0.22 + age * 0.16 + city * 0.05 + 0.07;
  const score = Math.round(clamp(base * finishMultiplier(fin) * recency) * 100);
  const strong = age >= 0.95 && trk >= 0.95 && dst >= 0.88 && fin !== null && fin <= 3 && cls >= 0.70;
  return {
    score,
    strong,
    classPct:Math.round(cls * 100),
    trackPct:Math.round(trk * 100),
    distancePct:Math.round(dst * 100),
    agePct:Math.round(age * 100),
    cityPct:Math.round(city * 100),
    finish:fin,
    date:row?.date || row?.isoDate || '',
    city:row?.city || row?.sehir || '',
    class:rowClass(row),
    distance:finite(row?.distance ?? row?.mesafe ?? row?.mes),
    track:row?.track ?? row?.pist ?? ''
  };
}

function capForEvidenceF22(best, count) {
  if (!best) return 0;
  if (count <= 1) {
    if (best.finish === 1) return 84;
    if (best.finish === 2) return 82;
    if (best.finish === 3) return 78;
    return 70;
  }
  return 88;
}

function juvenileMaidenReadinessF22(path0, target0) {
  const path = chronologicalDesc(path0);
  const target = normalizeTargetMeta(target0);
  if (!path.length || !isJuvenileMaidenTarget(target)) {
    return {
      score:null,
      used:false,
      reason:!path.length ? 'NO_CURRENT_PATH' : 'NOT_JUVENILE_MAIDEN',
      target
    };
  }
  const rows = path.map((row, index) => evidenceRowScore(row, target, index));
  const strongRows = rows.filter(row => row.strong).sort((a, b) => b.score - a.score);
  if (!strongRows.length) {
    return {
      score:null,
      used:false,
      reason:'NO_STRONG_SINGLE_PREP',
      target,
      rows,
      strongCount:0,
      currentPathCount:path.length
    };
  }
  const best = strongRows[0];
  const base = Math.round(strongRows.slice(0, 2).reduce((sum, row) => sum + row.score, 0) / Math.min(2, strongRows.length));
  let boost = 0;
  if (path.length <= 2) boost += 3;
  if (best.finish === 1) boost += 3;
  else if (best.finish === 2) boost += 2;
  if (best.cityPct >= 95) boost += 1;
  const cap = capForEvidenceF22(best, strongRows.length);
  const score = Math.min(cap, Math.round(base + boost));
  return {
    score,
    used:false,
    target,
    best,
    strongRows,
    strongCount:strongRows.length,
    currentPathCount:path.length,
    base,
    boost,
    cap,
    rule:SCORE_RULE,
    version:VERSION,
    note:'2 yaşlı Maiden koşuda tek güçlü hazırlık yarışı skor tabanı olarak kullanıldı.'
  };
}

const fetchHistoricalRoadmapBeforeF22 = typeof fetchHistoricalRoadmap === 'function' ? fetchHistoricalRoadmap : null;
if (fetchHistoricalRoadmapBeforeF22) {
  fetchHistoricalRoadmap = async function(meta) {
    const data = await fetchHistoricalRoadmapBeforeF22(meta);
    if (data && typeof data === 'object') {
      const target = normalizeTargetMeta({
        ...meta,
        city:currentCityNameF22(),
        date:clean(state?.date)
      });
      return {
        ...data,
        currentRaceMetaF22:target,
        juvenileMaidenReadinessVersion:VERSION,
        juvenileMaidenReadinessRule:SCORE_RULE
      };
    }
    return data;
  };
}

const calculateBeforeF22 = typeof calculateGalibiyetBenzerligi === 'function' ? calculateGalibiyetBenzerligi : null;
if (calculateBeforeF22) {
  calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
    const out = calculateBeforeF22(currentPath, roadmapData) || {};
    const readiness = juvenileMaidenReadinessF22(currentPath, roadmapData);
    const currentScore = finite(out.score);
    const readinessScore = finite(readiness.score);
    const applyReadiness = readinessScore !== null && (currentScore === null || readinessScore > currentScore);
    if (applyReadiness) readiness.used = true;
    const strongest = out.strongest && typeof out.strongest === 'object'
      ? {
          ...out.strongest,
          juvenileMaidenReadinessScore:readinessScore,
          juvenileMaidenReadinessApplied:applyReadiness,
          score:applyReadiness ? readinessScore : out.strongest.score
        }
      : out.strongest;
    return {
      ...out,
      score:applyReadiness ? readinessScore : currentScore,
      strongest,
      juvenileMaidenReadinessScore:readinessScore,
      juvenileMaidenReadiness:readiness,
      juvenileMaidenReadinessApplied:applyReadiness,
      juvenileMaidenReadinessVersion:VERSION,
      juvenileMaidenReadinessRule:SCORE_RULE,
      scoreSource:applyReadiness ? 'JUVENILE_MAIDEN_SINGLE_PREP_READINESS' : (out.scoreSource || 'HISTORICAL_CAREER_PATH'),
      method:applyReadiness ? `${out.method || ''}+${SCORE_RULE}`.replace(/^\+/, '') : out.method,
      raceReadinessVersion:out.raceReadinessVersion || 'CAREER-RACE-READINESS-V16.9.1F21'
    };
  };
}

const cacheBeforeF22 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
function hasF22Career(career) {
  const races = Array.isArray(career?.races) ? career.races : [];
  if (!races.length) return false;
  return races.every(race => (race?.horses || []).every(item =>
    item?.galibiyetBenzerligi?.juvenileMaidenReadinessVersion === VERSION
  ));
}

if (cacheBeforeF22) {
  isValidCareerCache = function(cached) {
    return Boolean(cacheBeforeF22(cached) && hasF22Career(cached));
  };
}

function clearStaleCareerF22(reason) {
  try {
    if (typeof state === 'undefined' || !state?.analyses?.career) return false;
    if (hasF22Career(state.analyses.career)) return false;
    state.analyses.career = {};
    state.careerJuvenileMaidenReadinessVersion = VERSION;
    state.careerJuvenileMaidenReadinessInvalidatedBy = reason || VERSION;
    if (typeof save === 'function') save();
    return true;
  } catch {
    return false;
  }
}

clearStaleCareerF22('startup');
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

const runCareerAnalysisBeforeF22 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerAnalysisBeforeF22) {
  runCareerAnalysis = async function(...args) {
    await runCareerAnalysisBeforeF22(...args);
    try {
      if (state?.analyses?.career) {
        state.analyses.career.juvenileMaidenReadinessVersion = VERSION;
        state.analyses.career.juvenileMaidenReadinessRule = SCORE_RULE;
        state.careerJuvenileMaidenReadinessVersion = VERSION;
        if (typeof save === 'function') save();
      }
    } catch {}
  };
}

try {
  const archive = window.ATCouponDailyArchiveV1691;
  if (archive?.hydrateCurrent && !archive.__juvenileMaidenReadinessF22) {
    const beforeHydrate = archive.hydrateCurrent.bind(archive);
    archive.hydrateCurrent = async function(...args) {
      const out = await beforeHydrate(...args);
      clearStaleCareerF22('archive-hydrate');
      return out;
    };
    archive.__juvenileMaidenReadinessF22 = VERSION;
  }
} catch {}

const yearBeforeF22 = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBeforeF22) {
  yearSimilarityHtml = function(sim) {
    const html = yearBeforeF22(sim);
    if (sim?.juvenileMaidenReadinessVersion !== VERSION) return html;
    const readiness = sim?.juvenileMaidenReadiness || {};
    const best = readiness.best || {};
    const score = finite(sim?.score);
    const prep = finite(sim?.juvenileMaidenReadinessScore);
    const label = sim?.juvenileMaidenReadinessApplied
      ? `F22 2 yaşlı Maiden tek hazırlık desteği kullanıldı · final %${score ?? '-'} · hazırlık %${prep ?? '-'}`
      : `F22 2 yaşlı Maiden hazırlık desteği kontrol edildi · hazırlık %${prep ?? '-'}`;
    const detail = best?.date
      ? ` · ${esc(best.date)} ${esc(best.city)} ${esc(best.class)} ${esc(best.distance || '')} ${esc(best.track)} ${esc(best.finish || '-')}.`
      : '';
    const badge = `<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22)"><b>${esc(label)}${detail}</b></div>`;
    return badge + html;
  };
}

window.__AT_CAREER_JUVENILE_MAIDEN_READINESS_VERSION__ = VERSION;
window.ATCareerJuvenileMaidenReadinessV1691F22 = {
  version:VERSION,
  scoreRule:SCORE_RULE,
  score:juvenileMaidenReadinessF22
};
console.info('[AT AI]', VERSION, 'aktif - 2 yasli Maiden tek guclu hazirlik kosusu kariyer skorunu dibe dusurmez.');
})();
