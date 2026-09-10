/* AT AI Mobil — V16.9.1F60 YABANCI TJK KARIYER YOL HARITASI
   - TJK yabanci programlarindaki negatif AtId baglantilarini programa geri kazandirir.
   - Negatif AtId kariyer isteklerini AtKosuBilgileri_Y tabanli yabanci kariyer API'sine yonlendirir.
   - Yalniz TJK'nin gercek gecmis baglantisi sagladigi atlar kariyer yoluna girer; isimden tahmin uretilmez.
*/
(() => {
'use strict';
if (window.__AT_FOREIGN_CAREER_ROADMAP_V1691F600__) return;
window.__AT_FOREIGN_CAREER_ROADMAP_V1691F600__ = true;

const VERSION = 'FOREIGN-CAREER-ROADMAP-V16.9.1F60';
const clean = v => String(v ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
let enrichPromise = null;
const foreignCareerInFlight = new Map();

function stateRef() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}
function cityName() {
  try { if (typeof getCityName === 'function') return clean(getCityName()); } catch {}
  const s = stateRef();
  return clean((Array.isArray(s?.cities) ? s.cities : []).find(c => String(c?.id) === String(s?.city))?.name)
    || clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent);
}
function missingId(h) { return h?.id === null || h?.id === undefined || clean(h?.id) === ''; }
function negativeId(v) {
  const n = Number(v);
  return Number.isFinite(n) && n < 0 ? n : null;
}

async function enrichForeignHorseIdsF60({ quiet = false } = {}) {
  const s = stateRef();
  if (!s?.date || !s?.city || !Array.isArray(s?.races) || !s.races.length) return 0;
  const missing = s.races.reduce((n,r)=>n+(Array.isArray(r?.horses)?r.horses.filter(missingId).length:0),0);
  if (!missing) return 0;
  if (enrichPromise) return enrichPromise;

  enrichPromise = (async () => {
    const city = cityName();
    if (!city) return 0;
    const url = `/api/tjk-foreign-horse-ids-v1?date=${encodeURIComponent(s.date)}&cityId=${encodeURIComponent(s.city)}&cityName=${encodeURIComponent(city)}&t=${Date.now()}`;
    let data;
    try {
      const response = await fetch(url, { cache:'no-store', headers:{ accept:'application/json' } });
      data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || `API ${response.status}`);
    } catch (e) {
      if (!quiet) console.warn('[AT AI]', VERSION, 'yabanci AtId tamamlamasi:', e?.message || e);
      return 0;
    }

    const raceMap = new Map((Array.isArray(data?.races) ? data.races : []).map(r => [String(r?.no), r]));
    let changed = 0;
    for (const race of s.races) {
      const sourceRace = raceMap.get(String(race?.no));
      if (!sourceRace || !Array.isArray(race?.horses)) continue;
      const byNo = new Map((sourceRace.horses || []).map(h => [String(h?.no), h]));
      const byName = new Map((sourceRace.horses || []).map(h => [fold(h?.name), h]));
      for (const horse of race.horses) {
        if (!missingId(horse)) continue;
        const ref = byNo.get(String(horse?.no)) || byName.get(fold(horse?.name));
        const id = negativeId(ref?.id);
        if (id === null) continue;
        horse.id = id;
        horse.foreignNoAtId = false;
        horse.foreignCareerAvailable = true;
        horse.foreignCareerSource = 'TJK_AtKosuBilgileri_Y';
        changed += 1;
      }
    }
    if (changed) {
      try { if (typeof save === 'function') save(); } catch {}
      try { if (typeof renderProgram === 'function') renderProgram(); } catch {}
      try { if (typeof careerModelCacheV112 !== 'undefined' && careerModelCacheV112?.clear) careerModelCacheV112.clear(); } catch {}
      if (!quiet) {
        try { if (typeof status === 'function') status(`${city}: ${changed} yabancı at için TJK kariyer geçmişi bağlandı`); } catch {}
      }
    }
    return changed;
  })();

  try { return await enrichPromise; }
  finally { enrichPromise = null; }
}

function foreignCareerUrlF60(horseId, before = '') {
  return `/api/tjk-career-foreign-v1?horseId=${encodeURIComponent(horseId)}&before=${encodeURIComponent(before || '')}&t=${Date.now()}`;
}
async function fetchForeignCareerF60(horseId, before = '') {
  const id = negativeId(horseId);
  if (id === null) throw new Error('Negatif TJK yabancı AtId gerekli.');
  const key = `${id}|${clean(before)}`;
  if (foreignCareerInFlight.has(key)) return foreignCareerInFlight.get(key);
  const task = (async () => {
    const url = foreignCareerUrlF60(id, before);
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 30000);
    try {
      const response = await fetch(url, { cache:'no-store', headers:{ accept:'application/json' }, signal:controller.signal });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || `Yabancı kariyer API ${response.status}`);
      let out = data;
      try { if (typeof normalizeCareerResponse === 'function') out = normalizeCareerResponse(out); } catch {}
      try { if (typeof repairCareerModeV1113 === 'function') out = repairCareerModeV1113(out); } catch {}
      out.foreignCareer = true;
      out.foreignCareerVersion = VERSION;
      return out;
    } finally { clearTimeout(timer); }
  })();
  foreignCareerInFlight.set(key, task);
  try { return await task; }
  finally { foreignCareerInFlight.delete(key); }
}

/* Ana kariyer fonksiyonunda negatif AtId'yi dogrudan yabanci TJK gecmisine gonder. */
if (typeof fetchCareer === 'function') {
  const baseFetchCareerF60 = fetchCareer;
  fetchCareer = async function(horseId, before) {
    if (negativeId(horseId) !== null) {
      try { return await fetchForeignCareerF60(horseId, before); }
      catch (e) {
        if (typeof emptyCareerErrorV1113 === 'function') return emptyCareerErrorV1113(e?.message || 'Yabancı TJK kariyer geçmişi alınamadı.');
        return { ok:false, error:e?.message || 'Yabancı TJK kariyer geçmişi alınamadı.', analysisMode:'DATA_ERROR', history:[], roadmap:[], wins:[], top5:[], preparationPath:[] };
      }
    }
    return baseFetchCareerF60(horseId, before);
  };
}

/* Dogrudan /api/tjk-career-v10 kullanan tarihsel referans kodlarini da kapsa. */
const fetchBeforeForeignRouteF60 = window.fetch.bind(window);
window.fetch = function(input, init) {
  try {
    const raw = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input || ''));
    const url = new URL(raw, location.href);
    const careerPaths = new Set(['/api/tjk-career-v10','/api/tjk-career','/api/tjk-career-fallback-v1113']);
    const id = negativeId(url.searchParams.get('horseId') || url.searchParams.get('id'));
    if (url.origin === location.origin && careerPaths.has(url.pathname) && id !== null) {
      url.pathname = '/api/tjk-career-foreign-v1';
      url.searchParams.set('horseId', String(id));
      url.searchParams.delete('id');
      if (input instanceof Request) {
        const next = new Request(url.toString(), input);
        return fetchBeforeForeignRouteF60(next, init);
      }
      return fetchBeforeForeignRouteF60(url.toString(), init);
    }
  } catch {}
  return fetchBeforeForeignRouteF60(input, init);
};

/* Program yuklendikten sonra TJK'nin verdigi negatif AtId'leri eksiksiz bagla. */
if (typeof loadProgram === 'function') {
  const baseLoadProgramF60 = loadProgram;
  loadProgram = async function(...args) {
    const out = await baseLoadProgramF60.apply(this, args);
    await enrichForeignHorseIdsF60();
    return out;
  };
  const btn = document.getElementById('loadProgramBtn');
  if (btn) btn.onclick = loadProgram;
}
if (typeof changeCity === 'function') {
  const baseChangeCityF60 = changeCity;
  changeCity = async function(...args) {
    const out = await baseChangeCityF60.apply(this, args);
    await enrichForeignHorseIdsF60();
    return out;
  };
  const sel = document.getElementById('citySelect');
  if (sel) sel.onchange = e => changeCity(e.target.value);
}

setTimeout(()=>void enrichForeignHorseIdsF60({ quiet:true }), 900);
window.ATForeignCareerRoadmapV1691F60 = { version:VERSION, enrich:enrichForeignHorseIdsF60, fetchCareer:fetchForeignCareerF60 };
console.info('[AT AI]', VERSION, 'aktif — negatif AtId + AtKosuBilgileri_Y kariyer yolu.');
})();
