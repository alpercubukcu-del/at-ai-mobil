/* AT AI Mobil — V11.4 AtId bağımsız program fallback
   Yabancı merkezlerde TJK AtId linki olmayabilir.
   Yarış/at listesini resmi tablo başlıklarından alır; kariyer AtId yoksa ayrıca devre dışı kalır.
*/

const FOREIGN_PROGRAM_VERSION_V114 = 'FOREIGN-PROGRAM-V11.4';
const loadProgramBaseV114 = loadProgram;
const changeCityBaseV114 = changeCity;

function totalHorseCountV114(races) {
  return (Array.isArray(races) ? races : []).reduce((sum, r) => sum + (Array.isArray(r?.horses) ? r.horses.length : 0), 0);
}

function mergeFallbackRacesV114(baseRaces, fallbackRaces) {
  const fb = new Map((Array.isArray(fallbackRaces) ? fallbackRaces : []).map(r => [String(r.no), r]));
  const allNos = new Set([
    ...(Array.isArray(baseRaces) ? baseRaces : []).map(r => String(r.no)),
    ...fb.keys()
  ]);

  const baseMap = new Map((Array.isArray(baseRaces) ? baseRaces : []).map(r => [String(r.no), r]));
  const merged = [];

  for (const no of allNos) {
    const base = baseMap.get(no) || {};
    const extra = fb.get(no) || {};
    const baseHorses = Array.isArray(base.horses) ? base.horses : [];
    const extraHorses = Array.isArray(extra.horses) ? extra.horses : [];
    merged.push({
      ...base,
      ...extra,
      no:Number(base.no || extra.no || no),
      time:base.time || extra.time || '',
      class:base.class || extra.class || '',
      ageGroup:base.ageGroup || extra.ageGroup || '',
      distance:base.distance || extra.distance || '',
      track:base.track || extra.track || '',
      betStarts:Array.isArray(base.betStarts) ? base.betStarts : (extra.betStarts || []),
      horses:extraHorses.length > baseHorses.length ? extraHorses : baseHorses,
      foreignFallbackUsed:extraHorses.length > baseHorses.length
    });
  }

  return merged.sort((a,b) => Number(a.no) - Number(b.no));
}

async function enrichAtIdIndependentV114() {
  if (!state?.date || !state?.city) return false;
  const cityName = getCityName();
  if (!cityName) return false;

  const baseCount = totalHorseCountV114(state.races);
  const hasEmptyRace = (Array.isArray(state.races) ? state.races : []).some(r => !Array.isArray(r.horses) || r.horses.length === 0);

  if (baseCount > 0 && !hasEmptyRace) return false;

  try {
    status(`${cityName} at listesi AtId bağımsız olarak tamamlanıyor…`);
    const res = await fetch(
      `/api/tjk-race-meta?date=${encodeURIComponent(state.date)}&cityId=${encodeURIComponent(state.city)}&cityName=${encodeURIComponent(cityName)}&t=${Date.now()}`,
      { cache:'no-store', headers:{ accept:'application/json' } }
    );
    if (!res.ok) throw new Error(`Yabancı program API ${res.status}`);
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.races) || !data.races.length) {
      throw new Error(data?.error || 'AtId bağımsız yarış tablosu bulunamadı.');
    }

    const before = totalHorseCountV114(state.races);
    state.races = mergeFallbackRacesV114(state.races, data.races);
    const after = totalHorseCountV114(state.races);
    save();
    renderProgram();

    if (after > before) {
      status(`${cityName}: ${state.races.length} koşu · ${after} at (yabancı/AtId bağımsız parser)`);
      if (typeof refreshLiveMarketV113 === 'function') setTimeout(() => refreshLiveMarketV113(true), 100);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[AT AI] yabancı program fallback:', e);
    status(`${cityName} programı var; at tablosu ayrıştırılamadı: ${e?.message || e}`);
    return false;
  }
}

loadProgram = async function() {
  await loadProgramBaseV114();
  await enrichAtIdIndependentV114();
};

changeCity = async function(cityId) {
  await changeCityBaseV114(cityId);
  await enrichAtIdIndependentV114();
};

if ($('loadProgramBtn')) $('loadProgramBtn').onclick = loadProgram;
if ($('citySelect')) $('citySelect').onchange = e => changeCity(e.target.value);

setTimeout(() => enrichAtIdIndependentV114(), 700);
console.info('[AT AI]', FOREIGN_PROGRAM_VERSION_V114, 'aktif');
