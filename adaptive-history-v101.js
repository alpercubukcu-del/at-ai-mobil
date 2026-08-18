/* AT AI Mobil — Adaptive Historical Path V10.1 hotfix
   V10'un geniş sorgudaki TJK 50-satır sınırını aşmak için her yılı kendi ±45 gün penceresinde tarar. */

const ADAPTIVE_HISTORY_HOTFIX_VERSION = 'ADAPTIVE-HISTORY-UI-V10.1';

const runCareerAnalysisV10 = runCareerAnalysis;

fetchHistoricalRoadmap = async function(meta) {
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu koşulları eksik.' };
  try {
    const url =
      `/api/tjk-adaptive-roadmap-v101` +
      `?date=${encodeURIComponent(state.date)}` +
      `&city=${encodeURIComponent(getCityName())}` +
      `&class=${encodeURIComponent(meta.class || '')}` +
      `&ageGroup=${encodeURIComponent(meta.ageGroup || '')}` +
      `&track=${encodeURIComponent(meta.track || '')}` +
      `&distance=${encodeURIComponent(meta.distance || '')}` +
      `&minYear=2000&t=${Date.now()}`;
    const res = await fetch(url, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) return { ok:false, error:data?.error || `API ${res.status}` };
    return data;
  } catch (e) {
    return { ok:false, error:e?.message || 'Yıllık ±45 gün tarihsel yol haritası alınamadı.' };
  }
};

isValidCareerCache = function(cached) {
  return Boolean(
    cached &&
    cached.version === CAREER_UI_VERSION &&
    cached.exactHistoryV9 === true &&
    cached.adaptiveHistoryV10 === true &&
    cached.adaptiveHistoryV101 === true &&
    cached.date === state.date &&
    String(cached.city) === String(state.city) &&
    Array.isArray(cached.races) && cached.races.length &&
    cached.races.every(race => race && Array.isArray(race.horses) && race.horses.every(item => item?.galibiyetBenzerligi && Array.isArray(item.galibiyetBenzerligi.byYear)))
  );
};

if (state?.analyses?.career && !state.analyses.career.adaptiveHistoryV101) {
  state.analyses.career = {};
  save();
}

runCareerAnalysis = async function(selectedRaces, raceValue) {
  await runCareerAnalysisV10(selectedRaces, raceValue);
  if (state?.analyses?.career) {
    state.analyses.career.adaptiveHistoryV101 = true;
    state.analyses.career.patchVersion = ADAPTIVE_HISTORY_HOTFIX_VERSION;
    state.analyses.career.roadmapApiVersion = 'TJK-ADAPTIVE-ROADMAP-V10.1';
    state.analyses.career.similarityNote = 'Her geçmiş yıl hedef gün/ay çevresinde kendi ±45 günlük TJK sorgusuyla taranır. Kariyer yolu yüzdesi ve koşul aktarılabilirliği ayrı hesaplanır; yıllar birbirine ortalanmaz.';
    save();
  }
};

console.info('[AT AI]', ADAPTIVE_HISTORY_HOTFIX_VERSION, 'aktif');
