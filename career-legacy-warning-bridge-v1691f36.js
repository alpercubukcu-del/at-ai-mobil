/* AT AI Mobil - V16.9.1F36 CAREER LEGACY WARNING BRIDGE
   - F14/F15 warning badges can misread F31/F34 no-match rows as stale scores.
   - Keeps the score math unchanged and only removes stale warning badges from current Career results.
   - Re-saves/re-archives the current Career result after marking it display-current.
*/
(() => {
'use strict';
if (window.__AT_CAREER_LEGACY_WARNING_BRIDGE_V1691F36__) return;
window.__AT_CAREER_LEGACY_WARNING_BRIDGE_V1691F36__ = true;

const VERSION = 'CAREER-LEGACY-WARNING-BRIDGE-V16.9.1F36';
const FAST_VERSION = 'CAREER-FAST-PROGRESS-V16.9.1F31';
const CHRONO_VERSION = 'CAREER-CHRONO-RISK-CALIBRATION-V16.9.1F34';

let repairQueued = false;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(clean(value).replace('%', '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  return clean(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function esc(value) {
  try {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
  } catch {}
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function currentState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

function isCurrentCareerResult(result) {
  const st = currentState();
  if (!result || typeof result !== 'object') return false;
  return (
    result.fastProgressVersion === FAST_VERSION ||
    st?.careerFastProgressVersion === FAST_VERSION ||
    clean(result.patchVersion).includes('F31') ||
    result.chronoRiskCalibrationVersion === CHRONO_VERSION
  );
}

function hasCurrentRaceMarker(race) {
  return Boolean(
    race?.chronoRiskCalibrationF34?.version === CHRONO_VERSION ||
    race?.legacyWarningBridgeVersionF36 === VERSION
  );
}

function hasCurrentSimMarker(sim) {
  return Boolean(
    sim?.legacyWarningBridgeVersionF36 === VERSION ||
    sim?.legacyWarningBridgeCurrentF36 === true
  );
}

function markRaceCurrent(race, forceCurrent) {
  if (!race || !Array.isArray(race.horses)) return false;
  let changed = false;
  const raceCurrent = Boolean(forceCurrent || hasCurrentRaceMarker(race));

  if (raceCurrent && race.legacyWarningBridgeVersionF36 !== VERSION) {
    race.legacyWarningBridgeVersionF36 = VERSION;
    changed = true;
  }

  for (const item of race.horses) {
    const sim = item?.galibiyetBenzerligi;
    if (!sim || typeof sim !== 'object') continue;
    const simCurrent = raceCurrent || hasCurrentSimMarker(sim);
    if (!simCurrent) continue;
    if (sim.legacyWarningBridgeVersionF36 !== VERSION) {
      sim.legacyWarningBridgeVersionF36 = VERSION;
      sim.legacyWarningBridgeCurrentF36 = true;
      sim.legacyWarningBridgeReasonF36 = finite(sim.score) === null
        ? 'current-analysis-no-full-match'
        : 'current-analysis-score';
      changed = true;
    }
  }

  return changed;
}

function markCareerCurrent(result) {
  if (!result || !Array.isArray(result.races)) return false;
  let changed = false;
  const resultCurrent = isCurrentCareerResult(result);

  for (const race of result.races) {
    if (markRaceCurrent(race, resultCurrent)) changed = true;
  }

  if (resultCurrent && result.legacyWarningBridgeVersionF36 !== VERSION) {
    result.legacyWarningBridgeVersionF36 = VERSION;
    changed = true;
  }

  return changed;
}

function stripLegacyBadges(html) {
  if (!html || typeof document === 'undefined') return { html, removed:false };
  const holder = document.createElement('div');
  holder.innerHTML = html;
  let removed = false;
  const legacyNeedles = [
    'eski performanssiz kariyer puani',
    'eski performanssiz kariyer puani yeni matematik',
    'eski arsiv puani',
    'yeni matematik icin yeniden hesapla',
    'yeni kurala gecirmek icin yeniden hesapla'
  ];

  for (const node of Array.from(holder.querySelectorAll('div'))) {
    const text = normalizeText(node.textContent || '');
    const compactWarning = text.length <= 260 && !node.querySelector('button,[data-cpm-token]');
    if (compactWarning && legacyNeedles.some(needle => text.includes(needle))) {
      node.remove();
      removed = true;
    }
  }

  return { html:holder.innerHTML, removed };
}

function currentBadge(sim) {
  const scored = finite(sim?.score) !== null;
  const label = scored ? 'Guncel kariyer puani' : 'Guncel kariyer analizi';
  const detail = scored
    ? 'F31/F34 kural uyumu aktif; yeniden hesaplama zorunlu degil.'
    : 'Bu at icin tam eslesme bulunamadi; eski kayit hatasi degil.';
  return `<div data-at-career-legacy-bridge-f36="1" style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22)"><b>${esc(label)}</b> · ${esc(detail)}</div>`;
}

function queueArchiveRepair(reason) {
  if (repairQueued) return;
  repairQueued = true;
  setTimeout(async () => {
    repairQueued = false;
    try {
      const st = currentState();
      if (markCareerCurrent(st?.analyses?.career) && typeof save === 'function') save();
    } catch {}
    try {
      await window.ATCareerArchiveScoreGuardV1691F33?.repair?.(`legacy-warning-bridge-${reason || 'repair'}`);
    } catch (error) {
      console.warn('[AT AI]', VERSION, 'archive repair failed', error);
    }
  }, 450);
}

if (typeof yearSimilarityHtml === 'function') {
  const baseYearSimilarityHtmlF36 = yearSimilarityHtml;
  yearSimilarityHtml = function(sim, ...rest) {
    const html = baseYearSimilarityHtmlF36.call(this, sim, ...rest);
    if (!hasCurrentSimMarker(sim)) return html;
    const stripped = stripLegacyBadges(html);
    if (!stripped.removed) return html;
    if (clean(stripped.html).includes('data-at-career-legacy-bridge-f36')) return stripped.html;
    return currentBadge(sim) + stripped.html;
  };
}

if (typeof careerRaceAccordionHtml === 'function') {
  const baseCareerRaceAccordionHtmlF36 = careerRaceAccordionHtml;
  careerRaceAccordionHtml = function(race, ...args) {
    try { markRaceCurrent(race, false); } catch {}
    return baseCareerRaceAccordionHtmlF36.call(this, race, ...args);
  };
}

if (typeof renderCareerAnalysis === 'function') {
  const baseRenderCareerAnalysisF36 = renderCareerAnalysis;
  renderCareerAnalysis = function(result, ...args) {
    try {
      const changed = markCareerCurrent(result);
      const st = currentState();
      if (changed && st?.analyses?.career === result && typeof save === 'function') save();
      queueArchiveRepair('render');
    } catch (error) {
      console.warn('[AT AI]', VERSION, 'render bridge failed', error);
    }
    return baseRenderCareerAnalysisF36.call(this, result, ...args);
  };
}

if (typeof runCareerAnalysis === 'function') {
  const baseRunCareerAnalysisF36 = runCareerAnalysis;
  runCareerAnalysis = async function(...args) {
    const out = await baseRunCareerAnalysisF36.apply(this, args);
    try {
      const st = currentState();
      const career = st?.analyses?.career || out;
      if (markCareerCurrent(career) && typeof save === 'function') save();
      queueArchiveRepair('run');
    } catch (error) {
      console.warn('[AT AI]', VERSION, 'post-run bridge failed', error);
    }
    return out;
  };
}

setTimeout(() => {
  try {
    const st = currentState();
    if (markCareerCurrent(st?.analyses?.career) && typeof save === 'function') save();
    queueArchiveRepair('startup');
  } catch {}
}, 900);

window.ATCareerLegacyWarningBridgeV1691F36 = {
  version:VERSION,
  mark:markCareerCurrent,
  stripLegacyBadges
};
console.info('[AT AI]', VERSION, 'active - current Career results no longer show stale F14/F15 warning badges.');
})();
