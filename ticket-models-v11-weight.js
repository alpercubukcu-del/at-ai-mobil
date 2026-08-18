/* AT AI Mobil — V11.2 KİLO / SIKLET / IRK BENZERLİĞİ
   Kariyer / Hazırlık yolunda:
   - İl
   - Sınıf
   - Yaş grubu
   - Irk
   - Mesafe
   - Pist
   - HP
   - Kilo şartı (kaynakta bulunabiliyorsa)
   - Atın fiilen taşıdığı sıklet
   ayrı sinyaller olarak kullanılır.
   Galibiyet/İlk-5 kronolojik sırası orderedPathSimilarity tarafından korunur.
   Eksik veri sıfır sayılmaz; mevcut kriterler yeniden normalize edilir.
*/

const TICKET_WEIGHT_VERSION = 'CAREER-WEIGHT-BREED-SIMILARITY-V11.2';

function numericWeightV111(v) {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function carriedWeightSimilarityV111(a, b) {
  const x = numericWeightV111(a);
  const y = numericWeightV111(b);
  if (x === null || y === null) return null;
  const d = Math.abs(x - y);
  if (d <= 0.5) return 1.00;
  if (d <= 1.5) return 0.90;
  if (d <= 3.0) return 0.75;
  if (d <= 5.0) return 0.50;
  return 0.25;
}

function weightConditionValueV111(row = {}) {
  const direct = [
    row.weightCondition,
    row.kiloCondition,
    row.kgCondition,
    row.raceWeightCondition,
    row.kiloSarti,
    row.kilo_sarti
  ].find(v => v !== null && v !== undefined && String(v).trim());
  if (direct !== undefined) return String(direct).trim();

  // TJK bazı tablolarda kilo şartını ayrı sütun yerine yarış/grup metnine gömebiliyor.
  const text = [
    row.classRaw,
    row.raceClass,
    row.class,
    row.raceNoName,
    row.groupRaw,
    row.ageGroup
  ].filter(Boolean).join(' | ');
  const matches = [...text.matchAll(/(\d{2}(?:[.,]\d+)?)\s*KG\b/gi)];
  if (!matches.length) return null;
  return matches.map(m => m[1].replace(',', '.')).join('/');
}

function weightConditionSimilarityV111(a, b) {
  const av = weightConditionValueV111(a);
  const bv = weightConditionValueV111(b);
  if (!av || !bv) return null;

  const an = numericWeightV111(av);
  const bn = numericWeightV111(bv);
  if (an !== null && bn !== null) {
    const d = Math.abs(an - bn);
    if (d <= 0.5) return 1.00;
    if (d <= 1.5) return 0.85;
    if (d <= 3.0) return 0.60;
    return 0.30;
  }

  const na = typeof normalizeTextV11 === 'function' ? normalizeTextV11(av) : String(av).toUpperCase();
  const nb = typeof normalizeTextV11 === 'function' ? normalizeTextV11(bv) : String(bv).toUpperCase();
  return na === nb ? 1.00 : 0.40;
}

function breedValueV112(row = {}) {
  const direct = [row.breed, row.irk, row.raceBreed, row.horseBreed]
    .find(v => v !== null && v !== undefined && String(v).trim());
  const raw = direct !== undefined
    ? String(direct)
    : [row.ageGroup, row.group, row.groupRaw, row.classRaw, row.raceClass, row.class]
        .filter(Boolean).join(' ');
  const n = typeof normalizeTextV11 === 'function'
    ? normalizeTextV11(raw)
    : String(raw).toUpperCase();
  if (n.includes('ARAP')) return 'Arap';
  if (n.includes('INGILIZ')) return 'İngiliz';
  return null;
}

function breedSimilarityV112(a, b) {
  const x = breedValueV112(a || {});
  const y = breedValueV112(b || {});
  if (!x || !y) return null;
  return x === y ? 1.00 : 0.00;
}

/*
  V11.2 kriter dağılımı (veri varsa):
  Sınıf        %18
  Yaş          %10
  Irk          %08
  Mesafe       %13
  Pist         %10
  Şehir        %07
  HP           %14
  Kilo şartı   %10
  Taşınan kg   %10

  Kronolojik sıra ayrı bir sabit yüzde değildir: orderedPathSimilarity,
  galibiyet/ilk-5 dizisini sırasını bozmadan hizalar ve gap cezası uygular.

  Eksik kriterlerin ağırlığı toplamdan çıkarılır; at eksik veri nedeniyle 0'a çekilmez.
*/
careerRowSimilarity = function(a, b) {
  if (!a || !b) return 0;

  const parts = [
    [classSimilarity(a.class || a.raceClass, b.class || b.raceClass), 0.18],
    [ageGroupSimilarity(a.ageGroup || a.group, b.ageGroup || b.group), 0.10],
    [distanceSimilarity(a.distance || a.mesafe || a.msf, b.distance || b.mesafe || b.msf), 0.13],
    [trackSimilarity(a.track || a.pist, b.track || b.pist), 0.10],
    [citySimilarity(a.city, b.city), 0.07]
  ];

  const breed = breedSimilarityV112(a, b);
  if (breed !== null) parts.push([breed, 0.08]);

  const hp = typeof hpSimilarityV11 === 'function' ? hpSimilarityV11(a.hp, b.hp) : null;
  if (hp !== null) parts.push([hp, 0.14]);

  const kiloSarti = weightConditionSimilarityV111(a, b);
  if (kiloSarti !== null) parts.push([kiloSarti, 0.10]);

  const tasinan = carriedWeightSimilarityV111(
    a.weight ?? a.siklet ?? a.carriedWeight,
    b.weight ?? b.siklet ?? b.carriedWeight
  );
  if (tasinan !== null) parts.push([tasinan, 0.10]);

  let sum = 0;
  let weight = 0;
  for (const [value, w] of parts) {
    const n = typeof finiteV11 === 'function' ? finiteV11(value) : Number(value);
    if (!Number.isFinite(n)) continue;
    sum += Math.max(0, Math.min(1, n)) * w;
    weight += w;
  }
  return weight > 0 ? Math.max(0, Math.min(1, sum / weight)) : 0;
};

function careerRowSimilarityBreakdownV111(a, b) {
  return {
    breed: breedSimilarityV112(a || {}, b || {}),
    currentBreed: breedValueV112(a || {}),
    historicalBreed: breedValueV112(b || {}),
    hp: typeof hpSimilarityV11 === 'function' ? hpSimilarityV11(a?.hp, b?.hp) : null,
    weightCondition: weightConditionSimilarityV111(a || {}, b || {}),
    carriedWeight: carriedWeightSimilarityV111(
      a?.weight ?? a?.siklet ?? a?.carriedWeight,
      b?.weight ?? b?.siklet ?? b?.carriedWeight
    ),
    currentCarriedWeight: numericWeightV111(a?.weight ?? a?.siklet ?? a?.carriedWeight),
    historicalCarriedWeight: numericWeightV111(b?.weight ?? b?.siklet ?? b?.carriedWeight),
    currentWeightCondition: weightConditionValueV111(a || {}),
    historicalWeightCondition: weightConditionValueV111(b || {})
  };
}
