/* AT AI Mobil — V16.6.1 5 Model Transport Recovery
   - 5 Model puanlama formüllerini değiştirmez.
   - /api/tjk-model-roadmap-v11 için mobilde 55 sn erken kesilmeyi kaldırır.
   - Tek uzun istek kullanır; eski 3x yeniden deneme yükünü devreden çıkarır.
   - Ana model servisi başarısızsa mevcut EXACT yolunu tam kariyer ile geri kurar.
*/
(() => {
'use strict';
if (window.__AT_MODEL_TRANSPORT_FIX_V1661__) return;
window.__AT_MODEL_TRANSPORT_FIX_V1661__ = true;

const VERSION_V1661 = 'MODEL-ROADMAP-TRANSPORT-V16.6.1';
const MODEL_TIMEOUT_V1661 = 130000;
const EXACT_TIMEOUT_V1661 = 100000;
const CAREER_TIMEOUT_V1661 = 45000;
const exactCareerCacheV1661 = new Map();

const cleanV1661 = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function isoV1661(row = {}) {
  const x = cleanV1661(row?.isoDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const raw = cleanV1661(row?.date);
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : raw;
}

function chronologicalV1661(rows) {
  return (Array.isArray(rows) ? [...rows] : []).filter(Boolean).sort((a,b) => isoV1661(a).localeCompare(isoV1661(b)));
}

async function fetchJsonV1661(url, timeoutMs, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'default',
      headers: { accept: 'application/json' },
      signal: controller.signal
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw new Error(`${label}: JSON olmayan cevap (API ${res.status}).`); }
    if (!res.ok || !data?.ok) throw new Error(data?.error || `${label}: API ${res.status}`);
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error(`${label}: ${Math.round(timeoutMs/1000)} sn içinde tamamlanamadı.`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimitV1661(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const i = cursor++;
      if (i >= list.length) return;
      out[i] = await worker(list[i], i);
    }
  }
  await Promise.all(Array.from({length:Math.min(Math.max(1, limit), list.length || 1)}, () => run()));
  return out;
}

async function fullCareerV1661(horseId, before) {
  const id = cleanV1661(horseId), cutoff = cleanV1661(before);
  if (!id || !cutoff) return null;
  const key = `${id}|${cutoff}`;
  if (exactCareerCacheV1661.has(key)) return exactCareerCacheV1661.get(key);
  const promise = (async () => {
    const data = await fetchJsonV1661(
      `/api/tjk-career-v10?horseId=${encodeURIComponent(id)}&before=${encodeURIComponent(cutoff)}`,
      CAREER_TIMEOUT_V1661,
      'Tarihsel at kariyeri'
    );
    const full = chronologicalV1661(Array.isArray(data?.history) ? data.history : []);
    return {
      ...data,
      analysisMode: full.length ? 'FULL_PATH' : 'DEBUT',
      fullPathBefore: full,
      historyBefore: full,
      comparisonPathBefore: full,
      roadmapBefore: full,
      fullPathBeforeCount: full.length,
      fullReferencePathVersion: VERSION_V1661
    };
  })();
  exactCareerCacheV1661.set(key, promise);
  try { return await promise; }
  catch (e) { exactCareerCacheV1661.delete(key); throw e; }
}

async function enrichExactV1661(race) {
  if (!race || race.ok === false) return race;
  const top3 = await mapLimitV1661(race.top3 || [], 4, async ref => {
    if (!ref?.horseId) return ref;
    try { return { ...ref, career: await fullCareerV1661(ref.horseId, race.date) }; }
    catch (e) {
      return {
        ...ref,
        career: { ...(ref.career || {}), ok:false, fullPathError:e?.message || 'Tam kariyer alınamadı.' }
      };
    }
  });
  return {
    ...race,
    referenceType: 'EXACT',
    referenceLabel: 'TAM TARİHSEL EŞLEŞME',
    transferabilityScore: Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 100,
    top3,
    top3Count: top3.length,
    transportFallbackV1661: true
  };
}

function buildModelUrlV1661(race) {
  const meta = typeof programRaceMeta === 'function'
    ? programRaceMeta(race)
    : { ok:true, class:race?.class, ageGroup:race?.ageGroup, track:race?.track, distance:race?.distance };
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu şartları eksik.' };
  const city = typeof getCityName === 'function' ? getCityName() : cleanV1661(state?.city);
  const classText = typeof window.canonicalClassDisplayV125 === 'function'
    ? window.canonicalClassDisplayV125(meta.class || race?.class || '')
    : cleanV1661(meta.class || race?.class || '');
  const qs = new URLSearchParams({
    date: cleanV1661(state?.date),
    city: cleanV1661(city),
    class: classText,
    ageGroup: cleanV1661(meta.ageGroup || race?.ageGroup || ''),
    track: cleanV1661(meta.track || race?.track || ''),
    distance: cleanV1661(meta.distance || race?.distance || ''),
    minYear: '2000'
  });
  return { ok:true, meta, city, classText, url:`/api/tjk-model-roadmap-v11?${qs.toString()}` };
}

async function exactFallbackV1661(race, built, primaryError) {
  const qs = new URLSearchParams({
    date: cleanV1661(state?.date),
    city: cleanV1661(built.city),
    class: cleanV1661(built.classText),
    ageGroup: cleanV1661(built.meta?.ageGroup || race?.ageGroup || ''),
    track: cleanV1661(built.meta?.track || race?.track || ''),
    distance: cleanV1661(built.meta?.distance || race?.distance || ''),
    minYear: '2000'
  });
  const exact = await fetchJsonV1661(`/api/tjk-roadmap?${qs.toString()}`, EXACT_TIMEOUT_V1661, 'Exact tarihsel model');
  const historical = Array.isArray(exact?.historicalRaces) ? exact.historicalRaces : [];
  if (!historical.length) throw new Error('Exact tarihsel eşleşme servisi boş döndü.');
  const exactRaces = await mapLimitV1661(historical, 3, enrichExactV1661);
  return {
    ok: true,
    version: `${exact?.version || 'TJK-ROADMAP'}+${VERSION_V1661}`,
    target: exact?.target || null,
    models: { EXACT:exactRaces, CONDITION_TWIN:[], RACE_FAMILY:[] },
    counts: { EXACT:exactRaces.length, CONDITION_TWIN:0, RACE_FAMILY:0 },
    transportRecoveryV1661: true,
    transportPrimaryErrorV1661: primaryError?.message || String(primaryError || '')
  };
}

fetchModelRoadmapV11 = async function(race) {
  const built = buildModelUrlV1661(race);
  if (!built.ok) return { ok:false, error:built.error };

  try {
    const data = await fetchJsonV1661(built.url, MODEL_TIMEOUT_V1661, `Koşu ${race?.no || ''} 5-model`);
    data.transportFixV1661 = true;
    return data;
  } catch (primaryError) {
    try {
      return await exactFallbackV1661(race, built, primaryError);
    } catch (fallbackError) {
      return {
        ok:false,
        transportFixV1661:true,
        error:`5-model servisi alınamadı: ${primaryError?.message || primaryError}. Exact geri dönüş de başarısız: ${fallbackError?.message || fallbackError}`
      };
    }
  }
};

try {
  if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear();
  if (typeof state === 'object' && state) {
    state.modelTransportVersion = VERSION_V1661;
    if (state.analyses && typeof state.analyses === 'object') state.analyses.historical = {};
    if (typeof save === 'function') save();
  }
} catch {}

console.info('[AT AI]', VERSION_V1661, 'aktif — 5 Model mobil timeout düzeltmesi + Exact geri dönüş');
})();
