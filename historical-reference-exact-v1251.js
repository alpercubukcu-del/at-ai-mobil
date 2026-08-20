/* AT AI Mobil — V12.5.1 Exact Historical Full-Path Guard
   V12.5 sonrasında yüklenir.
   - Kariyer tarihsel referansını, Y1 gibi TJK sorgu-tablosunda kaybolabilen şartları sonuç sayfasından doğrulayan exact tjk-roadmap servisinde tutar.
   - Tarihsel ilk 3 atın referans yarıştan önceki TÜM kariyerini history alanından yeniden dondurur.
   - E tek başına Erkek; D tek başına Dişi kabul edilir (V12.5 kanonik sınıf katmanı).
*/
(() => {
'use strict';
if (window.__AT_HISTORICAL_REFERENCE_EXACT_V1251__) return;
window.__AT_HISTORICAL_REFERENCE_EXACT_V1251__ = true;

const VERSION = 'HISTORICAL-REFERENCE-EXACT-FULLPATH-V12.5.1';
const beforeV1251 = typeof fetchHistoricalRoadmap === 'function' ? fetchHistoricalRoadmap : null;
const careerCacheV1251 = new Map();

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function iso(row = {}) {
  const x = clean(row?.isoDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const raw = clean(row?.date);
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : raw;
}

function chronological(rows) {
  return (Array.isArray(rows) ? [...rows] : []).filter(Boolean).sort((a,b) => iso(a).localeCompare(iso(b)));
}

function buildEnvelope(data = {}, before = '') {
  const full = chronological(Array.isArray(data.history) ? data.history : (Array.isArray(data.races) ? data.races : []));
  const wins = chronological(Array.isArray(data.wins) ? data.wins : full.filter(r => Number(r?.finish ?? r?.rank ?? r?.sira) === 1));
  const top5 = chronological(Array.isArray(data.top5) ? data.top5 : full.filter(r => {
    const f = Number(r?.finish ?? r?.rank ?? r?.sira);
    return f >= 1 && f <= 5;
  }));
  const prep = chronological(Array.isArray(data.preparationPath) ? data.preparationPath : top5);
  return {
    ok:data.ok !== false,
    cutoffExclusive:clean(data.before || before),
    careerVersion:data.version || null,
    fullPathBefore:full,
    historyBefore:full,
    roadmapBefore:full,
    comparisonPathBefore:full,
    fullPathBeforeCount:full.length,
    winsBefore:wins,
    winsBeforeCount:wins.length,
    top5Before:top5,
    top5BeforeCount:top5.length,
    preparationPathBefore:prep,
    preparationPathBeforeCount:prep.length,
    analysisMode:full.length ? 'FULL_PATH' : 'DEBUT',
    audit:data.audit || null,
    counts:data.counts || null,
    fullReferencePathVersion:VERSION,
    pathRule:'Referans yarıştan önceki TÜM yarışlar kullanılır; yalnız galibiyetlere daraltılmaz.'
  };
}

async function fullCareer(horseId, before) {
  const id = clean(horseId), cutoff = clean(before);
  if (!id || !cutoff) return null;
  const key = `${id}|${cutoff}`;
  if (careerCacheV1251.has(key)) return careerCacheV1251.get(key);
  const promise = (async () => {
    const res = await fetch(`/api/tjk-career-v10?horseId=${encodeURIComponent(id)}&before=${encodeURIComponent(cutoff)}&t=${Date.now()}`, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || `Kariyer API ${res.status}`);
    return buildEnvelope(data, cutoff);
  })();
  careerCacheV1251.set(key, promise);
  try { return await promise; }
  catch (e) { careerCacheV1251.delete(key); throw e; }
}

async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length); let cursor = 0;
  async function run(){ while(true){ const i=cursor++; if(i>=list.length)return; out[i]=await worker(list[i], i); } }
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length||1)},()=>run()));
  return out;
}

async function enrichRace(race) {
  if (!race || race.ok === false) return race;
  const top3 = await mapLimit(race.top3 || [], 3, async ref => {
    if (!ref?.horseId) return ref;
    try {
      return {...ref, career:await fullCareer(ref.horseId, race.date)};
    } catch (e) {
      return {...ref, career:{...(ref.career||{}), ok:false, fullPathError:e?.message||'Tam kariyer alınamadı.'}};
    }
  });
  return {...race, top3, top3Count:top3.length, fullReferencePathV1251:true, pathRule:'İlk 3 atın referans yarıştan önceki TÜM yarışları.'};
}

fetchHistoricalRoadmap = async function(meta) {
  if (!meta?.ok) return {ok:false,error:meta?.error||'Koşu koşulları eksik.'};
  const classText = typeof window.canonicalClassDisplayV125 === 'function'
    ? window.canonicalClassDisplayV125(meta.class || '')
    : clean(meta.class || '');
  const city = typeof getCityName === 'function' ? getCityName() : clean(state?.city);
  try {
    const url =
      `/api/tjk-roadmap` +
      `?date=${encodeURIComponent(state.date)}` +
      `&city=${encodeURIComponent(city)}` +
      `&class=${encodeURIComponent(classText)}` +
      `&ageGroup=${encodeURIComponent(meta.ageGroup || '')}` +
      `&track=${encodeURIComponent(meta.track || '')}` +
      `&distance=${encodeURIComponent(meta.distance || '')}` +
      `&minYear=2000&t=${Date.now()}`;
    const res = await fetch(url, {cache:'no-store'});
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || `Exact roadmap API ${res.status}`);
    const historicalRaces = await mapLimit(data.historicalRaces || [], 3, enrichRace);
    if (historicalRaces.length) {
      return {
        ...data,
        version:`${data.version || 'TJK-ROADMAP'}+FULLPATH-V12.5.1`,
        historicalRaces,
        byYear:historicalRaces.map(r => ({year:r.sourceYear,ok:r.ok!==false,date:r.date,city:r.city,raceNo:r.raceNo,top3:r.top3,error:r.error||null})),
        fullReferencePathV1251:true,
        fullReferencePathVersion:VERSION,
        rules:{...(data.rules||{}),classAliases:'E=Erkek; D=Dişi; Y-1=Y1; H-2=H2',historicalCareer:'FULL_PRE_RACE_HISTORY'}
      };
    }
    if (beforeV1251) return await beforeV1251({...meta,class:classText});
    return data;
  } catch (e) {
    if (beforeV1251) return await beforeV1251({...meta,class:classText});
    return {ok:false,error:e?.message||'Exact tam kariyer yolu alınamadı.'};
  }
};

try {
  if (typeof state === 'object' && state && state.fullReferenceExactVersion !== VERSION) {
    state.fullReferenceExactVersion = VERSION;
    if (state.analyses && typeof state.analyses === 'object') state.analyses.career = {};
    if (typeof save === 'function') save();
  }
} catch (e) {
  console.warn('[AT AI] V12.5.1 cache yenileme uyarısı:', e?.message || e);
}

console.info('[AT AI]', VERSION, 'aktif — exact tarihsel yarış + tüm kariyer yolu');
})();
