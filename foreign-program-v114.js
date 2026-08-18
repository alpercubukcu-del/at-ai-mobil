/* AT AI Mobil — V11.4 AtId bağımsız program fallback
   Yabancı merkezlerde TJK AtId linki olmayabilir.
   Her şehir yüklemesinde resmi tabloyu bir kez doğrular;
   fallback daha fazla at getirirse onu kullanır, aksi halde çalışan ana parser korunur.
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
    const useExtraHorses = extraHorses.length > baseHorses.length;

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
      horses:useExtraHorses ? extraHorses : baseHorses,
      foreignFallbackUsed:useExtraHorses
    });
  }

  return merged.sort((a,b) => Number(a.no) - Number(b.no));
}

async function enrichAtIdIndependentV114() {
  if (!state?.date || !state?.city) return false;
  const cityName = getCityName();
  if (!cityName) return false;

  try {
    const before = totalHorseCountV114(state.races);
    status(`${cityName} at listesi resmi tabloyla doğrulanıyor…`);

    const res = await fetch(
      `/api/tjk-race-meta?date=${encodeURIComponent(state.date)}&cityId=${encodeURIComponent(state.city)}&cityName=${encodeURIComponent(cityName)}&t=${Date.now()}`,
      { cache:'no-store', headers:{ accept:'application/json' } }
    );
    if (!res.ok) throw new Error(`Program doğrulama API ${res.status}`);
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.races) || !data.races.length) {
      throw new Error(data?.error || 'AtId bağımsız yarış tablosu bulunamadı.');
    }

    state.races = mergeFallbackRacesV114(state.races, data.races);
    const after = totalHorseCountV114(state.races);
    const usedFallback = state.races.some(r => r.foreignFallbackUsed);

    save();
    renderProgram();

    if (usedFallback || after > before) {
      status(`${cityName}: ${state.races.length} koşu · ${after} at (AtId bağımsız resmi tablo tamamlaması)`);
      if (typeof refreshLiveMarketV113 === 'function') setTimeout(() => refreshLiveMarketV113(true), 100);
      return true;
    }

    status(`${cityName}: ${state.races.length} koşu · ${after} at doğrulandı`);
    return false;
  } catch (e) {
    console.warn('[AT AI] AtId bağımsız program doğrulama:', e);
    const currentCount = totalHorseCountV114(state.races);
    if (currentCount > 0) {
      status(`${cityName}: mevcut ${currentCount} at korundu · ek tablo doğrulaması alınamadı`);
    } else {
      status(`${cityName} programı var; at tablosu ayrıştırılamadı: ${e?.message || e}`);
    }
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
