/* AT AI Mobil - V16.9.1F26 HANDICAP WEIGHT LEVERAGE HP BAND FIX
   - F25 checked the field HP band before reading proven handicap evidence.
   - F26 lets a recent/similar win at comparable HP and heavier carried weight override that band.
   - General rule only; no horse-specific names or exceptions.
*/
(() => {
'use strict';
if (window.__AT_CAREER_HANDICAP_WEIGHT_LEVERAGE_V1691F26__) return;
window.__AT_CAREER_HANDICAP_WEIGHT_LEVERAGE_V1691F26__ = true;

const VERSION = 'CAREER-HANDICAP-WEIGHT-LEVERAGE-V16.9.1F26';
const SCORE_RULE = 'HANDICAP_PROVEN_WEIGHT_EDGE_HP_BAND_V26';

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

function stateDate(race = {}) {
  try {
    if (typeof state !== 'undefined' && state?.date) return clean(state.date);
  } catch {}
  return clean(race?.date || '');
}

function iso(row = {}) {
  const x = clean(row?.isoDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const raw = clean(row?.date);
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : raw;
}

function dayDiff(fromIso, toIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromIso) || !/^\d{4}-\d{2}-\d{2}$/.test(toIso)) return null;
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
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
  if ((row === 'KUM' && target === 'SENTETIK') || (row === 'SENTETIK' && target === 'KUM')) return 0.55;
  return 0.20;
}

function distanceScore(rowValue, targetValue) {
  const row = finite(rowValue);
  const target = finite(targetValue);
  if (row === null || target === null || !target) return 0.70;
  const diff = Math.abs(row - target);
  if (diff <= 100) return 1;
  if (diff <= 200) return 0.94;
  if (diff <= 400) return 0.78;
  return clamp(1 - diff / 1600, 0.35, 1);
}

function ageScore(rowValue, targetValue) {
  const row = key(rowValue);
  const target = key(targetValue);
  if (!row || !target) return 0.78;
  if (row === target) return 1;
  const sameBreed = (row.includes('ARAPLAR') && target.includes('ARAPLAR')) || (row.includes('INGILIZLER') && target.includes('INGILIZLER'));
  return sameBreed ? 0.78 : 0.42;
}

function classBridgeScore(rowValue, targetValue) {
  const row = classInfo(rowValue);
  const target = classInfo(targetValue);
  let score = 0.45;
  if (row.kind && row.kind === target.kind) {
    score = 1;
    if (row.no && target.no) {
      const delta = Math.abs(row.no - target.no);
      if (delta === 0) score = 1;
      else if (delta <= 2) score = 0.92;
      else if (delta <= 4) score = 0.84;
      else score = 0.70;
    }
  } else if (target.kind === 'HANDIKAP' && row.kind === 'KV') {
    score = 0.90;
  } else if (target.kind === 'HANDIKAP' && row.kind === 'GROUP') {
    score = 0.88;
  } else if (target.kind === 'HANDIKAP' && row.kind === 'SARTLI') {
    score = 0.78;
  } else if (target.kind === 'HANDIKAP' && row.kind === 'MAIDEN') {
    score = 0.60;
  }
  return clamp(score);
}

function recencyScore(days) {
  if (days === null) return 0.74;
  if (days <= 45) return 1;
  if (days <= 75) return 0.96;
  if (days <= 120) return 0.88;
  if (days <= 180) return 0.76;
  if (days <= 365) return 0.58;
  return 0.36;
}

function currentHorseWeight(horse = {}) {
  return finite(horse.weight ?? horse.weightText ?? horse.kilo ?? horse.siklet ?? horse.sıklet);
}

function normalizeRaceMeta(race = {}) {
  return {
    class:clean(race.class || race.raceClass || race.yaradi1 || race?.meta?.class || ''),
    ageGroup:clean(race.ageGroup || race.yaradi2 || race.age || race?.meta?.ageGroup || ''),
    distance:finite(race.distance ?? race.mesafe ?? race.mes ?? race?.meta?.distance),
    track:clean(race.track || race.pist || race?.meta?.track || ''),
    city:clean(race.city || race.cityName || '')
  };
}

function careerRows(career = {}) {
  for (const rows of [career.roadmap, career.wins, career.fullPathBefore, career.historyBefore, career.history, career.top5, career.races]) {
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}

function fieldTopHp(race = {}) {
  const hps = (Array.isArray(race?.horses) ? race.horses : [])
    .map(item => finite(item?.horse?.hp ?? item?.hp))
    .filter(n => n !== null);
  return hps.length ? Math.max(...hps) : null;
}

function leverageRow(row, target, horse) {
  const curHp = finite(horse?.hp);
  const curWeight = currentHorseWeight(horse);
  const rowHp = finite(row?.hp ?? row?.hpu);
  const rowWeight = currentHorseWeight(row);
  const days = dayDiff(iso(row), clean(target.date || ''));
  const hpDelta = curHp !== null && rowHp !== null ? curHp - rowHp : null;
  const weightAdvantage = curWeight !== null && rowWeight !== null ? rowWeight - curWeight : null;
  const cls = classBridgeScore(rowClass(row), target.class);
  const trk = trackScore(row?.track ?? row?.pist, target.track);
  const dst = distanceScore(row?.distance ?? row?.mesafe ?? row?.mes, target.distance);
  const age = ageScore(row?.ageGroup ?? row?.yaradi2 ?? row?.age, target.ageGroup);
  const rec = recencyScore(days);
  const hpComparable = hpDelta !== null && hpDelta <= 3 && hpDelta >= -5;
  const weightStrong = weightAdvantage !== null && weightAdvantage >= 1.5;
  const strong = finish(row) === 1 && hpComparable && weightStrong && trk >= 0.95 && dst >= 0.94 && age >= 0.76 && cls >= 0.70 && rec >= 0.58;
  const condition = cls * 0.17 + trk * 0.21 + dst * 0.20 + age * 0.14 + rec * 0.12 + (hpComparable ? 0.09 : 0) + (weightStrong ? 0.07 : 0);
  const raw = Math.round(clamp(condition) * 100);
  return {
    score:raw,
    strong,
    date:row?.date || row?.isoDate || '',
    city:row?.city || row?.sehir || '',
    class:rowClass(row),
    distance:finite(row?.distance ?? row?.mesafe ?? row?.mes),
    track:row?.track ?? row?.pist ?? '',
    finish:finish(row),
    hp:rowHp,
    weight:rowWeight,
    currentHp:curHp,
    currentWeight:curWeight,
    hpDelta,
    weightAdvantage,
    days,
    classPct:Math.round(cls * 100),
    trackPct:Math.round(trk * 100),
    distancePct:Math.round(dst * 100),
    agePct:Math.round(age * 100),
    recencyPct:Math.round(rec * 100)
  };
}

function handicapWeightLeverageScoreF26(item = {}, race = {}) {
  const horse = item?.horse || {};
  const target = { ...normalizeRaceMeta(race), date:stateDate(race) };
  if (classInfo(target.class).kind !== 'HANDIKAP') {
    return { score:null, used:false, reason:'NOT_HANDICAP_TARGET', target };
  }
  const curHp = finite(horse?.hp);
  const curWeight = currentHorseWeight(horse);
  if (curHp === null || curWeight === null) {
    return { score:null, used:false, reason:'NO_CURRENT_HP_OR_WEIGHT', target };
  }

  const topHp = fieldTopHp(race);
  const hpBandGap = topHp !== null ? topHp - curHp : null;
  const outsideHpBand = hpBandGap !== null && hpBandGap > 9;
  const rows = careerRows(item?.career || {}).filter(row => finish(row) === 1);
  if (!rows.length) {
    return { score:null, used:false, reason:'NO_WIN_PATH', target, curHp, curWeight, topHp, hpBandGap, outsideHpBand };
  }

  const evidence = rows.map(row => leverageRow(row, target, horse));
  const strong = evidence.filter(row => row.strong).sort((a, b) =>
    b.weightAdvantage - a.weightAdvantage || b.recencyPct - a.recencyPct || b.score - a.score
  );
  if (!strong.length) {
    return {
      score:null,
      used:false,
      reason:outsideHpBand ? 'HP_TOO_LOW_WITHOUT_PROVEN_WEIGHT_EDGE' : 'NO_HANDICAP_WEIGHT_ADVANTAGE',
      target,
      curHp,
      curWeight,
      topHp,
      hpBandGap,
      outsideHpBand,
      rows:evidence
    };
  }

  const best = strong[0];
  let score = 90;
  score += Math.min(5, Math.round(best.weightAdvantage * 1.2));
  if (best.days !== null && best.days <= 75) score += 1;
  if (best.hpDelta !== null && Math.abs(best.hpDelta) <= 1) score += 1;
  if (strong.length >= 2) score += 1;
  const cap = best.weightAdvantage >= 4 && best.days !== null && best.days <= 75 ? 97 : best.weightAdvantage >= 3 ? 96 : 94;
  score = Math.min(cap, score);

  return {
    score,
    used:false,
    target,
    best,
    strong,
    strongCount:strong.length,
    currentHp:curHp,
    currentWeight:curWeight,
    topHp,
    hpBandGap,
    outsideHpBand,
    hpBandOverride:outsideHpBand,
    cap,
    rule:SCORE_RULE,
    version:VERSION,
    note:outsideHpBand
      ? 'HP bandi dusuk gorunse de benzer sart galibiyeti ve bugunku kilo avantaji kariyer skorunu destekledi.'
      : 'Handikap yarista benzer sart galibiyetine gore bugunku siklet avantaji kariyer skorunu destekledi.'
  };
}

function applyHandicapLeverageToCareerF26(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.races)) return false;
  let changed = false;
  for (const race of result.races) {
    const horses = Array.isArray(race?.horses) ? race.horses : [];
    for (const item of horses) {
      const sim = item?.galibiyetBenzerligi || {};
      const leverage = handicapWeightLeverageScoreF26(item, race);
      const currentScore = finite(sim.score);
      const leverageScore = finite(leverage.score);
      const replaceOlderLeverage = sim.handicapWeightLeverageVersion && sim.handicapWeightLeverageVersion !== VERSION;
      const apply = leverageScore !== null && (currentScore === null || leverageScore >= currentScore || replaceOlderLeverage);
      if (apply) leverage.used = true;
      item.galibiyetBenzerligi = {
        ...sim,
        score:apply ? leverageScore : sim.score,
        handicapWeightLeverageScore:leverageScore,
        handicapWeightLeverage:leverage,
        handicapWeightLeverageApplied:apply,
        handicapWeightLeverageVersion:VERSION,
        handicapWeightLeverageRule:SCORE_RULE,
        scoreSource:apply ? 'HANDICAP_WEIGHT_LEVERAGE' : (sim.scoreSource || 'HISTORICAL_CAREER_PATH'),
        method:apply ? `${sim.method || ''}+${SCORE_RULE}`.replace(/^\+/, '') : sim.method,
        evidenceCalibrationVersion:sim.evidenceCalibrationVersion || 'CAREER-EVIDENCE-CALIBRATION-V16.9.1F24'
      };
      if (apply || sim.handicapWeightLeverageVersion !== VERSION) changed = true;
    }
  }
  result.handicapWeightLeverageVersion = VERSION;
  result.handicapWeightLeverageRule = SCORE_RULE;
  return changed;
}

const cacheBeforeF26 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
function hasF26Career(career) {
  const races = Array.isArray(career?.races) ? career.races : [];
  if (!races.length) return false;
  return races.every(race => (race?.horses || []).every(item =>
    item?.galibiyetBenzerligi?.handicapWeightLeverageVersion === VERSION
  ));
}

if (cacheBeforeF26) {
  isValidCareerCache = function(cached) {
    return Boolean(cacheBeforeF26(cached) && hasF26Career(cached));
  };
}

function clearStaleCareerF26(reason) {
  try {
    if (typeof state === 'undefined' || !state?.analyses?.career) return false;
    if (hasF26Career(state.analyses.career)) return false;
    state.analyses.career = {};
    state.careerHandicapWeightLeverageVersion = VERSION;
    state.careerHandicapWeightLeverageInvalidatedBy = reason || VERSION;
    if (typeof save === 'function') save();
    return true;
  } catch {
    return false;
  }
}

clearStaleCareerF26('startup');
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

const runCareerAnalysisBeforeF26 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerAnalysisBeforeF26) {
  runCareerAnalysis = async function(selectedRaces, raceValue, ...rest) {
    await runCareerAnalysisBeforeF26(selectedRaces, raceValue, ...rest);
    try {
      if (state?.analyses?.career) {
        const changed = applyHandicapLeverageToCareerF26(state.analyses.career);
        state.careerHandicapWeightLeverageVersion = VERSION;
        if (typeof save === 'function') save();
        if (changed && typeof renderCareerAnalysis === 'function') {
          renderCareerAnalysis(state.analyses.career, raceValue);
        }
      }
    } catch (e) {
      console.warn('[AT AI] F26 handicap weight leverage could not be applied:', e);
    }
  };
}

try {
  const archive = window.ATCouponDailyArchiveV1691;
  if (archive?.hydrateCurrent && !archive.__handicapWeightLeverageF26) {
    const beforeHydrate = archive.hydrateCurrent.bind(archive);
    archive.hydrateCurrent = async function(...args) {
      const out = await beforeHydrate(...args);
      clearStaleCareerF26('archive-hydrate');
      return out;
    };
    archive.__handicapWeightLeverageF26 = VERSION;
  }
} catch {}

const yearBeforeF26 = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBeforeF26) {
  yearSimilarityHtml = function(sim) {
    const html = yearBeforeF26(sim);
    if (sim?.handicapWeightLeverageVersion !== VERSION) return html;
    const leverage = sim?.handicapWeightLeverage || {};
    const best = leverage.best || {};
    const score = finite(sim?.score);
    const levScore = finite(sim?.handicapWeightLeverageScore);
    const hpText = leverage.hpBandOverride ? ' · HP bandi kanitla asildi' : '';
    const label = sim?.handicapWeightLeverageApplied
      ? `F26 handikap siklet avantaji kullanildi · final %${score ?? '-'} · avantaj %${levScore ?? '-'}${hpText}`
      : `F26 handikap siklet avantaji kontrol edildi · avantaj ${levScore === null ? 'yok' : '%' + levScore}`;
    const detail = best?.date
      ? ` · ${esc(best.date)} ${esc(best.city)} ${esc(best.class)} ${esc(best.distance || '')} ${esc(best.track)} · ${esc(best.weightAdvantage || 0)} kg hafif`
      : '';
    const badge = `<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22)"><b>${esc(label)}${detail}</b></div>`;
    return badge + html;
  };
}

window.__AT_CAREER_HANDICAP_WEIGHT_LEVERAGE_VERSION__ = VERSION;
window.ATCareerHandicapWeightLeverageV1691F26 = {
  version:VERSION,
  scoreRule:SCORE_RULE,
  score:handicapWeightLeverageScoreF26,
  apply:applyHandicapLeverageToCareerF26
};
console.info('[AT AI]', VERSION, 'active - proven weight edge can override the handicap HP band.');
})();
