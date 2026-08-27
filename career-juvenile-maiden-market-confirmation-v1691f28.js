/* AT AI Mobil - V16.9.1F28 JUVENILE MAIDEN MARKET CONFIRMATION
   - 2-year-old Maiden races can leave a horse too low when the career path is short.
   - Use only pre-race program fields: Gny/odds, S20, KGS and Son 6.
   - This is a capped confirmation floor, not a post-race winner override.
*/
(() => {
'use strict';
if (window.__AT_CAREER_JUVENILE_MAIDEN_MARKET_CONFIRMATION_V1691F28__) return;
window.__AT_CAREER_JUVENILE_MAIDEN_MARKET_CONFIRMATION_V1691F28__ = true;

const VERSION = 'CAREER-JUVENILE-MAIDEN-MARKET-CONFIRMATION-V16.9.1F28';
const SCORE_RULE = 'JUVENILE_MAIDEN_PRE_RACE_MARKET_CONFIRMATION_V28';

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = v => {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/);
  const n = Number((m ? m[0] : v).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));

function isJuvenileMaidenRace(race = {}) {
  const klass = upper(race.class || race.yaradi1 || race.meta?.class || race.meta?.yaradi1 || '');
  const age = upper(race.ageGroup || race.yaradi2 || race.meta?.ageGroup || race.meta?.yaradi2 || '');
  return klass.includes('MAIDEN') && /2\s*YAS|2YAS|2\s*YAŞ|2YAŞ/.test(age);
}

function horseKey(horse = {}) {
  return clean(horse.id || `${horse.no || ''}|${upper(horse.name || '')}`);
}

function oddsValue(horse = {}) {
  return finite(horse.gny ?? horse.odds ?? horse.ganyan ?? horse.Gny ?? horse.GNY);
}

function s20Value(horse = {}) {
  return finite(horse.s20 ?? horse.S20);
}

function kgsValue(horse = {}) {
  return finite(horse.kgs ?? horse.KGS);
}

function rankBy(items, getter, descending = false) {
  const rows = items
    .map(item => {
      const horse = item?.horse || item || {};
      return {
        key:horseKey(horse),
        value:getter(horse)
      };
    })
    .filter(row => row.key && row.value !== null && row.value !== undefined && Number.isFinite(Number(row.value)))
    .sort((a, b) => descending ? b.value - a.value : a.value - b.value);

  const out = new Map();
  let seen = 0;
  let rank = 0;
  let previous = null;

  for (const row of rows) {
    seen += 1;
    if (previous === null || row.value !== previous) rank = seen;
    previous = row.value;
    out.set(row.key, { rank, value:row.value });
  }

  return out;
}

function raceMarket(race = {}) {
  const horses = Array.isArray(race.horses) ? race.horses : [];
  return {
    odds:rankBy(horses, oddsValue, false),
    s20:rankBy(horses, s20Value, true),
    size:horses.length
  };
}

function last6HasTop3(value) {
  return /[123]/.test(clean(value));
}

function currentPathCount(item = {}) {
  const readiness = item?.galibiyetBenzerligi?.juvenileMaidenReadiness || {};
  const fromReadiness = finite(readiness.currentPathCount);
  if (fromReadiness !== null) return fromReadiness;
  const roadmap = item?.career?.roadmap;
  return Array.isArray(roadmap) ? roadmap.length : 0;
}

function marketFloorFor(item, ranks) {
  const horse = item?.horse || {};
  const key = horseKey(horse);
  const odds = ranks.odds.get(key);
  const s20Rank = ranks.s20.get(key);
  const oddsRank = finite(odds?.rank);
  const oddsVal = finite(odds?.value);
  const s20 = s20Value(horse);
  const kgs = kgsValue(horse);

  if (oddsRank === null || oddsVal === null || oddsVal <= 0) {
    return null;
  }

  let floor = null;
  if (oddsRank <= 1) floor = 86;
  else if (oddsRank <= 3) floor = 84;
  else if (oddsRank <= 5) floor = 81;
  else if (oddsVal <= 7.5) floor = 79;

  if (floor === null) return null;

  if (s20 !== null && s20 >= 19) floor += 1;
  else if (s20 !== null && s20 >= 18) floor += 1;

  if (kgs !== null && kgs <= 7) floor += 2;
  else if (kgs !== null && kgs <= 14) floor += 1;
  else if (kgs !== null && kgs >= 70) floor -= 1;

  if (last6HasTop3(horse.last6)) floor += 1;

  const base = finite(item?.galibiyetBenzerligi?.score);
  const prep = finite(item?.galibiyetBenzerligi?.juvenileMaidenReadinessScore);
  const hasCareerSignal = base !== null || prep !== null || currentPathCount(item) > 0;

  if (!hasCareerSignal) floor = Math.min(floor, 82);
  else if (Math.max(base ?? 0, prep ?? 0) < 65) floor = Math.min(floor, 84);

  return {
    score:Math.round(clamp(floor, 78, 88)),
    oddsRank,
    odds:oddsVal,
    s20,
    s20Rank:s20Rank?.rank ?? null,
    kgs,
    last6:clean(horse.last6),
    rule:SCORE_RULE,
    version:VERSION
  };
}

function applyCareerMarketConfirmationF28(result) {
  const races = Array.isArray(result?.races) ? result.races : [];
  let changed = 0;
  let checked = 0;

  for (const race of races) {
    if (!isJuvenileMaidenRace(race)) continue;
    const ranks = raceMarket(race);

    for (const item of race.horses || []) {
      checked += 1;
      const sim = item?.galibiyetBenzerligi || {};
      const current = finite(sim.score);
      const confirmation = marketFloorFor(item, ranks);

      sim.juvenileMaidenMarketConfirmationVersion = VERSION;
      sim.juvenileMaidenMarketConfirmationRule = SCORE_RULE;
      sim.juvenileMaidenMarketConfirmation = confirmation || {
        used:false,
        reason:'NO_PRE_RACE_MARKET_CONFIRMATION',
        rule:SCORE_RULE,
        version:VERSION
      };

      if (!confirmation) {
        sim.juvenileMaidenMarketConfirmationApplied = false;
        continue;
      }

      const next = confirmation.score;
      const shouldApply = current === null || next > current;
      confirmation.used = shouldApply;
      confirmation.previousScore = current;
      sim.juvenileMaidenMarketConfirmationApplied = shouldApply;
      sim.juvenileMaidenMarketConfirmationScore = next;

      if (!shouldApply) continue;

      changed += 1;
      sim.score = next;
      sim.scoreSource = 'JUVENILE_MAIDEN_PRE_RACE_MARKET_CONFIRMATION';
      sim.method = `${sim.method || 'ORDERED_CAREER_PATH_MATCH_V1'}+${SCORE_RULE}`;

      if (sim.strongest && typeof sim.strongest === 'object') {
        sim.strongest = {
          ...sim.strongest,
          score:next,
          juvenileMaidenMarketConfirmationScore:next,
          juvenileMaidenMarketConfirmationApplied:true
        };
      }
    }
  }

  if (result && typeof result === 'object') {
    result.juvenileMaidenMarketConfirmationVersion = VERSION;
    result.juvenileMaidenMarketConfirmationRule = SCORE_RULE;
    result.juvenileMaidenMarketConfirmationChecked = checked;
    result.juvenileMaidenMarketConfirmationChanged = changed;
  }

  return { checked, changed };
}

const cacheBeforeF28 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
function hasF28Career(career) {
  return career?.juvenileMaidenMarketConfirmationVersion === VERSION;
}

if (cacheBeforeF28) {
  isValidCareerCache = function(cached) {
    return Boolean(cacheBeforeF28(cached) && hasF28Career(cached));
  };
}

function clearStaleCareerF28(reason) {
  try {
    if (typeof state === 'undefined' || !state?.analyses?.career) return false;
    if (!state.analyses.career.races?.length) return false;
    if (hasF28Career(state.analyses.career)) return false;
    state.analyses.career = {};
    state.careerJuvenileMaidenMarketConfirmationVersion = VERSION;
    state.careerJuvenileMaidenMarketConfirmationInvalidatedBy = reason || VERSION;
    if (typeof save === 'function') save();
    return true;
  } catch {
    return false;
  }
}

clearStaleCareerF28('startup');

const runCareerAnalysisBeforeF28 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerAnalysisBeforeF28) {
  runCareerAnalysis = async function(selectedRaces, raceValue, ...rest) {
    const out = await runCareerAnalysisBeforeF28(selectedRaces, raceValue, ...rest);
    try {
      const career = state?.analyses?.career;
      if (career?.races?.length) {
        const applied = applyCareerMarketConfirmationF28(career);
        state.careerJuvenileMaidenMarketConfirmationVersion = VERSION;
        if (typeof save === 'function') save();
        if (applied.changed && typeof renderCareerAnalysis === 'function') {
          renderCareerAnalysis(career, raceValue);
        }
      }
    } catch (error) {
      console.warn('[AT AI]', VERSION, 'apply failed', error);
    }
    return out;
  };
}

try {
  const archive = window.ATCouponDailyArchiveV1691;
  if (archive?.hydrateCurrent && !archive.__juvenileMaidenMarketConfirmationF28) {
    const beforeHydrate = archive.hydrateCurrent.bind(archive);
    archive.hydrateCurrent = async function(...args) {
      const out = await beforeHydrate(...args);
      clearStaleCareerF28('archive-hydrate');
      return out;
    };
    archive.__juvenileMaidenMarketConfirmationF28 = VERSION;
  }
} catch {}

const yearBeforeF28 = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBeforeF28) {
  yearSimilarityHtml = function(sim) {
    const html = yearBeforeF28(sim);
    if (sim?.juvenileMaidenMarketConfirmationVersion !== VERSION) return html;
    const confirmation = sim?.juvenileMaidenMarketConfirmation || {};
    if (!sim?.juvenileMaidenMarketConfirmationApplied) return html;
    const label = `F28 2 yasli Maiden on-yaris piyasa destegi · final %${esc(sim.score)} · Gny ${esc(confirmation.odds)} · Gny sira ${esc(confirmation.oddsRank)} · S20 ${esc(confirmation.s20 ?? '-')}`;
    const badge = `<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22)"><b>${label}</b></div>`;
    return badge + html;
  };
}

window.__AT_CAREER_JUVENILE_MAIDEN_MARKET_CONFIRMATION_VERSION__ = VERSION;
window.ATCareerJuvenileMaidenMarketConfirmationV1691F28 = {
  version:VERSION,
  scoreRule:SCORE_RULE,
  apply:applyCareerMarketConfirmationF28
};
console.info('[AT AI]', VERSION, 'active - juvenile Maiden short career scores use pre-race market confirmation.');
})();
