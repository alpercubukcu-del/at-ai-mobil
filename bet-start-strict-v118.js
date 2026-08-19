/* AT AI Mobil — STRICT OFFICIAL BET STARTS V11.8
   Yanlış başlangıç tahminini tamamen kaldırır.
   Kupon yalnız state.races[].betStarts içinde TJK tarafından doğrulanmış başlangıç varsa kurulur.
*/
const BET_START_STRICT_V118 = 'BET-START-STRICT-V11.8';

resolveBetStartV11 = function(type) {
  const desc = betDescriptorV11(type);
  if (!desc.legs) return { ok:false, error:`Bahis ayak sayısı okunamadı: ${type}`, desc };

  const candidates = [];
  (Array.isArray(state.races) ? state.races : []).forEach((race, index) => {
    for (const label of Array.isArray(race.betStarts) ? race.betStarts : []) {
      if (labelMatchesBetV11(label, desc)) candidates.push({ race, index, label });
    }
  });

  let selected = null;
  if (desc.variant) {
    selected = candidates.find(c => new RegExp(`(^|\\D)${desc.variant}\\s*\\.`).test(String(c.label))) || null;
    // Bazı TJK yabancı/özel programlarında 1./2. etiketi yazmadan iki resmi başlangıç dönebilir.
    // Böyle bir durumda yalnız mevcut resmi adaylar arasındaki kronolojik sıra kullanılır.
    if (!selected && candidates.length >= desc.variant) selected = candidates[desc.variant - 1];
  } else {
    selected = candidates[0] || null;
  }

  if (!selected) {
    return {
      ok:false,
      error:`${type} için TJK resmi başlangıç bilgisi bulunamadı. Başlangıç tahmin edilmeyecek.`,
      desc,
      inferred:false
    };
  }

  const legs = state.races.slice(selected.index, selected.index + desc.legs);
  if (legs.length !== desc.legs) {
    return {
      ok:false,
      error:`${type} ${selected.race.no}. koşudan başlıyor fakat ${desc.legs} ayak tamamlanamıyor.`,
      desc,
      inferred:false
    };
  }

  return {
    ok:true,
    desc,
    startIndex:selected.index,
    startRace:selected.race.no,
    startLabel:selected.label,
    inferred:false,
    official:true,
    legs
  };
};

console.info('[AT AI]', BET_START_STRICT_V118, 'aktif');
