;(() => {
'use strict';
if (window.__AT_CAREER_DAILY_ARCHIVE_CACHE_BRIDGE_V1691F658__) return;
window.__AT_CAREER_DAILY_ARCHIVE_CACHE_BRIDGE_V1691F658__ = true;

const VERSION = 'CAREER-DAILY-ARCHIVE-CACHE-BRIDGE-V16.9.1F60.58';
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function appState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

async function syncVisibleCareerResult(reason='unknown') {
  try {
    const dialog = document.getElementById('analysisDialog');
    if (dialog?.dataset?.view !== 'career') return false;
    const api = window.ATCareerDailyArchivePerRaceV657;
    if (!api?.savePerRace) return false;

    const st = appState();
    const result = st?.analyses?.career;
    if (!result || !Array.isArray(result.races) || !result.races.length) return false;

    if (clean(result.date) && clean(st?.date) && clean(result.date) !== clean(st.date)) return false;
    if (clean(result.city) && clean(st?.city) && clean(result.city) !== clean(st.city)) return false;

    const raceValue = clean(document.getElementById('analysisRace')?.value || result.calculatedRace || 'all') || 'all';
    const selectedRaces = raceValue === 'all'
      ? (Array.isArray(st?.races) ? st.races : [])
      : (Array.isArray(st?.races) ? st.races.filter(r => String(r?.no) === String(raceValue)) : []);

    const out = await api.savePerRace(result, selectedRaces, raceValue);
    console.info('[AT AI]', VERSION, reason, out);
    return Boolean(out?.saved || out?.failed === 0);
  } catch (error) {
    console.warn('[AT AI]', VERSION, 'Günlük Arşiv senkronu başarısız:', error);
    return false;
  }
}

try {
  if (typeof runAnalysis === 'function') {
    const baseRunAnalysisV658 = runAnalysis;
    runAnalysis = async function(...args) {
      const out = await baseRunAnalysisV658.apply(this, args);
      await syncVisibleCareerResult('runAnalysis-complete');
      return out;
    };
    const btn = document.getElementById('runAnalysis');
    if (btn) btn.onclick = runAnalysis;
  }
} catch (error) {
  console.warn('[AT AI]', VERSION, 'runAnalysis bridge kurulamadı:', error);
}

try {
  const dlg = document.getElementById('analysisDialog');
  if (dlg) {
    const observer = new MutationObserver(() => {
      if (dlg.open && dlg.dataset?.view === 'career') {
        setTimeout(() => syncVisibleCareerResult('career-dialog-open'), 0);
      }
    });
    observer.observe(dlg, { attributes:true, attributeFilter:['open','data-view'] });
  }
} catch {}

setTimeout(() => syncVisibleCareerResult('boot-existing-result'), 0);

window.ATCareerDailyArchiveCacheBridgeV658 = { sync:syncVisibleCareerResult, version:VERSION };
console.info('[AT AI]', VERSION, 'active - cache-hit ve ekranda hazır Kariyer sonuçları da koşu bazında Günlük Arşive yazılır.');
})();
