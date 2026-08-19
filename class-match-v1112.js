/* AT AI Mobil — V11.12 GENERIC CLASS MATCH
   - Yalnız G2/DHT için değil tüm yarış aileleri için orijinal TJK sınıfı önce denenir.
   - Orijinal gösterimde eşleşme yoksa kanonik alias fallback kullanılır.
   - Null skorlu atlar program numarasına göre model sırası gibi gösterilmez. */

const CLASS_MATCH_V1112 = 'GENERIC-CLASS-MATCH-V11.12';

fetchHistoricalRoadmap = async function(meta) {
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu koşulları eksik.' };
  try {
    const url =
      `/api/tjk-adaptive-roadmap-v103` +
      `?date=${encodeURIComponent(state.date)}` +
      `&city=${encodeURIComponent(getCityName())}` +
      `&class=${encodeURIComponent(meta.class || '')}` +
      `&ageGroup=${encodeURIComponent(meta.ageGroup || '')}` +
      `&track=${encodeURIComponent(meta.track || '')}` +
      `&distance=${encodeURIComponent(meta.distance || '')}` +
      `&minYear=2000`;
    const res = await fetch(url, { cache:'no-store', headers:{ accept:'application/json' } });
    const data = await res.json();
    if (!res.ok || !data?.ok) return { ok:false, error:data?.error || `API ${res.status}` };
    return data;
  } catch (e) {
    return { ok:false, error:e?.message || 'Genel sınıf eşleştirmeli tarihsel yol alınamadı.' };
  }
};

fetchModelRoadmapV11 = async function(race) {
  const meta = typeof programRaceMeta === 'function'
    ? programRaceMeta(race)
    : { ok:true, class:race.class, ageGroup:race.ageGroup, track:race.track, distance:race.distance };
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu şartları eksik.' };

  const url =
    `/api/tjk-model-roadmap-v1112` +
    `?date=${encodeURIComponent(state.date)}` +
    `&city=${encodeURIComponent(getCityName())}` +
    `&class=${encodeURIComponent(meta.class || race.class || '')}` +
    `&ageGroup=${encodeURIComponent(meta.ageGroup || race.ageGroup || '')}` +
    `&track=${encodeURIComponent(meta.track || race.track || '')}` +
    `&distance=${encodeURIComponent(meta.distance || race.distance || '')}` +
    `&minYear=2000`;

  try {
    if (typeof atAiFetchJsonV1111 === 'function') {
      return await atAiFetchJsonV1111(url, 70000, `Koşu ${race.no} tarihsel model`);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 70000);
    try {
      const res = await fetch(url, { cache:'no-store', headers:{ accept:'application/json' }, signal:controller.signal });
      const data = await res.json();
      if (!res.ok || !data?.ok) return { ok:false, error:data?.error || `API ${res.status}` };
      return data;
    } finally { clearTimeout(timer); }
  } catch (e) {
    return { ok:false, error:e?.name === 'AbortError' ? 'Tarihsel model zaman aşımına uğradı.' : (e?.message || 'V11.12 model yol haritası alınamadı.') };
  }
};

const rankRaceForModelBeforeV1112 = rankRaceForModelV11;
rankRaceForModelV11 = function(raceData, modelId) {
  const ranking = rankRaceForModelBeforeV1112(raceData, modelId);
  // Null = model bu at için karar puanı üretemedi. Böyle bir satırın at numarasıyla
  // 1., 2., 3. diye görünmesi model sıralaması değildir ve kullanıcıyı yanıltır.
  return (Array.isArray(ranking) ? ranking : []).filter(row => Number.isFinite(Number(row?.score)));
};

console.info('[AT AI]', CLASS_MATCH_V1112, 'aktif');
