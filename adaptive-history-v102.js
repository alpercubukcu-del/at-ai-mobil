/* AT AI Mobil — Adaptive Historical Path V10.2
   TJK Günlük Programı ile Koşu Sorgulama arasındaki sınıf adı aliaslarını eşitler. */

const ADAPTIVE_HISTORY_ALIAS_VERSION = 'ADAPTIVE-HISTORY-UI-V10.2';
const runCareerAnalysisV101 = runCareerAnalysis;

fetchHistoricalRoadmap = async function(meta) {
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu koşulları eksik.' };
  try {
    const url =
      `/api/tjk-adaptive-roadmap-v102` +
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
    return { ok:false, error:e?.message || 'TJK sınıf aliaslarıyla yıllık tarihsel yol haritası alınamadı.' };
  }
};

isValidCareerCache = function(cached) {
  return Boolean(
    cached &&
    cached.version === CAREER_UI_VERSION &&
    cached.exactHistoryV9 === true &&
    cached.adaptiveHistoryV10 === true &&
    cached.adaptiveHistoryV101 === true &&
    cached.adaptiveHistoryV102 === true &&
    cached.date === state.date &&
    String(cached.city) === String(state.city) &&
    Array.isArray(cached.races) && cached.races.length &&
    cached.races.every(race => race && Array.isArray(race.horses) && race.horses.every(item => item?.galibiyetBenzerligi && Array.isArray(item.galibiyetBenzerligi.byYear)))
  );
};

if (state?.analyses?.career && !state.analyses.career.adaptiveHistoryV102) {
  state.analyses.career = {};
  save();
}

runCareerAnalysis = async function(selectedRaces, raceValue) {
  await runCareerAnalysisV101(selectedRaces, raceValue);
  if (state?.analyses?.career) {
    state.analyses.career.adaptiveHistoryV102 = true;
    state.analyses.career.patchVersion = ADAPTIVE_HISTORY_ALIAS_VERSION;
    state.analyses.career.roadmapApiVersion = 'TJK-ADAPTIVE-ROADMAP-V10.2';
    state.analyses.career.similarityNote = 'Her yıl ayrı ±45 gün taranır. TJK Günlük Programı ve Koşu Sorgulama arasındaki sınıf adı aliasları kanonikleştirilir. Kariyer yolu ve koşul aktarılabilirliği ayrı hesaplanır; yıllar birbirine ortalanmaz.';
    save();
  }
};

console.info('[AT AI]', ADAPTIVE_HISTORY_ALIAS_VERSION, 'aktif');
