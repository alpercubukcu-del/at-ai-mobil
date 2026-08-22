/* AT AI Mobil — V15.9 Career Roadmap Watchdog
   - Analiz formüllerini değiştirmez.
   - Tarayıcıdaki yıllık-arşiv hızlı yol 45 sn içinde dönmezse aynı koşu için doğrudan sunucu fallback'ini başlatır.
   - İlk doğru sonuç kullanılır; hiçbir koşu sonsuza kadar beklemez.
*/
(() => {
'use strict';
if (window.__AT_CAREER_ROADMAP_WATCHDOG_V159__) return;
window.__AT_CAREER_ROADMAP_WATCHDOG_V159__ = true;

const VERSION = 'CAREER-ROADMAP-WATCHDOG-V15.9';
const FAST_GRACE_MS = 45000;
const REMOTE_TIMEOUT_MS = 70000;
const HARD_TIMEOUT_MS = 120000;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function clean(v) { return String(v ?? '').replace(/\s+/g, ' ').trim(); }
function validRoadmap(data) {
  return Boolean(data && data.ok !== false && (Array.isArray(data.historicalRaces) || Array.isArray(data.yearResults) || data.models));
}
function currentCityNameV159() {
  try { if (typeof getCityName === 'function') return clean(getCityName()); } catch {}
  try {
    const id = clean(state?.city);
    const city = (Array.isArray(state?.cities) ? state.cities : []).find(x => clean(x?.id) === id);
    return clean(city?.name || document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent || id);
  } catch { return ''; }
}

async function directRemoteV159(meta) {
  const url = new URL('/api/tjk-adaptive-roadmap-v10', location.origin);
  url.searchParams.set('date', clean(state?.date));
  url.searchParams.set('city', currentCityNameV159());
  url.searchParams.set('class', clean(meta?.class));
  url.searchParams.set('ageGroup', clean(meta?.ageGroup));
  url.searchParams.set('track', clean(meta?.track));
  url.searchParams.set('distance', clean(meta?.distance));
  url.searchParams.set('minYear', '2000');
  /* V15.6 tarayıcı hızlı yolunu bilinçli olarak atla; gerçek sunucu fallback'i. */
  url.searchParams.set('_v156remote', '1');
  url.searchParams.set('_v159watchdog', '1');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await window.fetch(url.pathname + url.search, { cache:'no-store', signal:controller.signal });
    const data = await response.json();
    if (!response.ok || !validRoadmap(data)) throw new Error(data?.error || `Roadmap fallback API ${response.status}`);
    return { ...data, watchdogV159:true, watchdogSource:'REMOTE_FALLBACK' };
  } finally {
    clearTimeout(timer);
  }
}

if (typeof fetchHistoricalRoadmap === 'function') {
  const baseFetchHistoricalRoadmapV159 = fetchHistoricalRoadmap;
  fetchHistoricalRoadmap = async function(meta) {
    if (!meta?.ok) return baseFetchHistoricalRoadmapV159(meta);

    let kickFallback;
    const fallbackKick = new Promise(resolve => { kickFallback = resolve; });
    let fallbackPromise = null;
    const startFallback = () => {
      if (!fallbackPromise) {
        console.warn('[AT AI]', VERSION, 'hızlı yol bekledi; doğrudan fallback başlatıldı:', meta?.class || '');
        fallbackPromise = directRemoteV159(meta);
      }
      return fallbackPromise;
    };

    const primary = Promise.resolve()
      .then(() => baseFetchHistoricalRoadmapV159(meta))
      .then(data => {
        if (!validRoadmap(data)) throw new Error(data?.error || 'Hızlı roadmap geçerli sonuç döndürmedi.');
        return { ...data, watchdogV159:true, watchdogSource:'PRIMARY' };
      })
      .catch(err => {
        try { kickFallback(); } catch {}
        throw err;
      });

    const fallback = Promise.race([delay(FAST_GRACE_MS), fallbackKick]).then(startFallback);
    const firstGood = Promise.any([primary, fallback]);
    const hardTimeout = delay(HARD_TIMEOUT_MS).then(() => {
      throw new Error('Tarihsel roadmap 120 saniyede tamamlanamadı. Bu koşuyu tek başına yeniden deneyin.');
    });

    try {
      return await Promise.race([firstGood, hardTimeout]);
    } catch (e) {
      console.warn('[AT AI]', VERSION, 'roadmap zaman aşımı/başarısız:', e?.message || e);
      return { ok:false, watchdogV159:true, error:e?.message || 'Tarihsel roadmap tamamlanamadı.' };
    }
  };
}

window.ATCareerRoadmapWatchdogV159 = {
  version:VERSION,
  fastGraceMs:FAST_GRACE_MS,
  remoteTimeoutMs:REMOTE_TIMEOUT_MS,
  hardTimeoutMs:HARD_TIMEOUT_MS
};
})();
