/* AT AI Mobil — 5 MODEL KUPON MOTORU V11
   1) Tam Eşleşme
   2) Koşul İkizi
   3) Aynı Yarış Ailesi
   4) Kariyer / Hazırlık Yolu
   5) Bileşik

   Kurallar:
   - Model kanalları birbirinden bağımsızdır.
   - Veri olmayan kanal sıfır sayılmaz; bileşikte mevcut kanallar yeniden normalize edilir.
   - Saf modelde veri yoksa başka modelle gizli fallback yapılmaz.
   - Tek sayısı 0 ise her ayakta en az 2 at zorunludur.
   - HP benzerliği kariyer yolu satır karşılaştırmasına eklenir.
*/

const TICKET_V11_VERSION = 'FIVE-TICKET-MODELS-V11.0';
const TICKET_SCORE_VERSION = 'CAREER-HP-SIMILARITY-V11.0';

const TICKET_MODELS_V11 = [
  { id:'composite', label:'Bileşik', short:'Bileşik', weight:0 },
  { id:'exact', label:'Tam Eşleşme', short:'Tam', weight:0.40 },
  { id:'twin', label:'Koşul İkizi', short:'İkiz', weight:0.25 },
  { id:'family', label:'Yarış Ailesi', short:'Aile', weight:0.20 },
  { id:'career', label:'Kariyer / Hazırlık', short:'Kariyer', weight:0.15 }
];

const MODEL_TYPE_MAP_V11 = {
  exact:'EXACT',
  twin:'CONDITION_TWIN',
  family:'RACE_FAMILY'
};

function finiteV11(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampV11(v, lo = 0, hi = 100) {
  const n = finiteV11(v);
  return n === null ? null : Math.max(lo, Math.min(hi, n));
}

function normalizeTextV11(v = '') {
  return String(v ?? '')
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function horseKeyV11(h = {}) {
  return String(h.id || h.horseId || h.atId || `${h.no || ''}|${normalizeTextV11(h.name || '')}`);
}

function hpSimilarityV11(a, b) {
  const x = finiteV11(a);
  const y = finiteV11(b);
  if (x === null || y === null) return null;
  const d = Math.abs(x - y);
  if (d <= 3) return 1.00;
  if (d <= 7) return 0.85;
  if (d <= 12) return 0.65;
  if (d <= 20) return 0.40;
  return 0.15;
}

/*
  Eski 5 alan korunur, HP altıncı alan olarak eklenir.
  HP yoksa sıfır cezası verilmez; mevcut ağırlıklar yeniden normalize edilir.
*/
careerRowSimilarity = function(a, b) {
  if (!a || !b) return 0;
  const parts = [
    [classSimilarity(a.class || a.raceClass, b.class || b.raceClass), 0.25],
    [ageGroupSimilarity(a.ageGroup || a.group, b.ageGroup || b.group), 0.15],
    [distanceSimilarity(a.distance || a.mesafe || a.msf, b.distance || b.mesafe || b.msf), 0.17],
    [trackSimilarity(a.track || a.pist, b.track || b.pist), 0.13],
    [citySimilarity(a.city, b.city), 0.10]
  ];
  const hp = hpSimilarityV11(a.hp, b.hp);
  if (hp !== null) parts.push([hp, 0.20]);

  let sum = 0;
  let weight = 0;
  for (const [value, w] of parts) {
    const n = finiteV11(value);
    if (n === null) continue;
    sum += Math.max(0, Math.min(1, n)) * w;
    weight += w;
  }
  return weight > 0 ? Math.max(0, Math.min(1, sum / weight)) : 0;
};

function analysisModeV11(career = {}) {
  if (career.analysisMode === 'WIN_PATH' || career.analysisMode === 'PREPARATION_PATH' || career.analysisMode === 'DEBUT') {
    return career.analysisMode;
  }
  const path = Array.isArray(career.roadmap) ? career.roadmap : [];
  return typeof adaptiveCurrentMode === 'function' ? adaptiveCurrentMode(path) : 'DEBUT';
}

function modeLabelV11(mode) {
  if (mode === 'WIN_PATH') return 'Galibiyet Yolu';
  if (mode === 'PREPARATION_PATH') return 'Hazırlık / İlk 5';
  return 'Debut';
}

function referencePathV11(ref, mode) {
  if (typeof adaptiveReferencePath === 'function') return adaptiveReferencePath(ref, mode);
  if (mode === 'WIN_PATH') return Array.isArray(ref?.career?.winsBefore) ? ref.career.winsBefore : [];
  const top5 = Array.isArray(ref?.career?.top5Before) ? ref.career.top5Before : [];
  return top5.length ? top5 : (Array.isArray(ref?.career?.preparationPathBefore) ? ref.career.preparationPathBefore : []);
}

function scoreRowsV11(currentCareer, historicalRaces, useCondition = true) {
  const path = Array.isArray(currentCareer?.roadmap) ? currentCareer.roadmap : [];
  const mode = analysisModeV11(currentCareer);
  if (!path.length || mode === 'DEBUT') {
    return { score:null, rows:[], mode, strongYears:0, supportYears:0, latestScore:null, coverageYears:0 };
  }

  const byYear = new Map();
  for (const race of Array.isArray(historicalRaces) ? historicalRaces : []) {
    if (race?.ok === false) continue;
    const year = Number(race?.sourceYear || String(race?.date || '').slice(0,4)) || null;
    if (!year) continue;
    const conditionScore = useCondition
      ? Math.max(0, Math.min(100, Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 0))
      : 100;
    let best = null;
    for (const ref of Array.isArray(race?.top3) ? race.top3 : []) {
      const refPath = referencePathV11(ref, mode);
      if (!refPath.length) continue;
      const raw = typeof orderedPathSimilarity === 'function' ? orderedPathSimilarity(path, refPath) : 0;
      const pathScore = Math.round(Math.max(0, Math.min(1, Number(raw) || 0)) * 100);
      const effective = Math.round(pathScore * conditionScore / 100);
      const candidate = {
        year,
        score:effective,
        pathScore,
        conditionScore,
        historicalHorse:ref?.horseName || '',
        historicalFinish:Number(ref?.finish || 0) || null,
        raceDate:race?.date || '',
        raceCity:race?.city || '',
        raceNo:race?.raceNo || '',
        referenceType:race?.referenceType || '',
        referenceLabel:race?.referenceLabel || '',
        calendarDayDifference:Number(race?.calendarDayDifference ?? 0)
      };
      if (!best || candidate.score > best.score ||
          (candidate.score === best.score && candidate.pathScore > best.pathScore) ||
          (candidate.score === best.score && candidate.pathScore === best.pathScore && Number(candidate.historicalFinish || 99) < Number(best.historicalFinish || 99))) {
        best = candidate;
      }
    }
    if (!best) continue;
    const previous = byYear.get(year);
    if (!previous || best.score > previous.score || (best.score === previous.score && best.pathScore > previous.pathScore)) byYear.set(year, best);
  }

  const rows = [...byYear.values()].sort((a,b) => b.year - a.year);
  if (!rows.length) return { score:null, rows:[], mode, strongYears:0, supportYears:0, latestScore:null, coverageYears:0 };
  const strongest = [...rows].sort((a,b) => b.score-a.score || b.pathScore-a.pathScore || b.year-a.year)[0];
  return {
    score:strongest.score,
    strongest,
    rows,
    mode,
    strongYears:rows.filter(x => x.score >= 85).length,
    supportYears:rows.filter(x => x.score >= 70).length,
    latestScore:rows[0]?.score ?? null,
    coverageYears:rows.length
  };
}

function uniqueHistoricalRacesV11(models = {}) {
  const map = new Map();
  for (const type of ['EXACT','CONDITION_TWIN','RACE_FAMILY']) {
    for (const race of Array.isArray(models[type]) ? models[type] : []) {
      const key = [race?.date, normalizeTextV11(race?.city), race?.raceNo].join('|');
      if (!map.has(key)) map.set(key, race);
    }
  }
  return [...map.values()];
}

function compositeScoreV11(channels) {
  const weights = { exact:0.40, twin:0.25, family:0.20, career:0.15 };
  let weighted = 0;
  let used = 0;
  const present = [];
  for (const id of Object.keys(weights)) {
    const score = finiteV11(channels?.[id]?.score);
    if (score === null) continue;
    weighted += score * weights[id];
    used += weights[id];
    present.push(id);
  }
  return {
    score:used > 0 ? Math.round(weighted / used) : null,
    usedWeight:used,
    present,
    missing:Object.keys(weights).filter(id => !present.includes(id))
  };
}

function horseModelScoresV11(career, roadmap) {
  const exact = scoreRowsV11(career, roadmap?.models?.EXACT || [], true);
  const twin = scoreRowsV11(career, roadmap?.models?.CONDITION_TWIN || [], true);
  const family = scoreRowsV11(career, roadmap?.models?.RACE_FAMILY || [], true);
  const allHistorical = uniqueHistoricalRacesV11(roadmap?.models || {});
  const careerPath = scoreRowsV11(career, allHistorical, false);
  const composite = compositeScoreV11({ exact, twin, family, career:careerPath });
  return { exact, twin, family, career:careerPath, composite, analysisMode:analysisModeV11(career) };
}

async function mapLimitV11(items, limit, worker) {
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
  await Promise.all(Array.from({ length:Math.min(Math.max(1, limit), list.length || 1) }, () => run()));
  return out;
}

function cachedCareerV11(raceNo, horse) {
  const races = Array.isArray(state?.analyses?.career?.races) ? state.analyses.career.races : [];
  const race = races.find(r => String(r?.no) === String(raceNo));
  if (!race) return null;
  const key = horseKeyV11(horse);
  const item = (Array.isArray(race.horses) ? race.horses : []).find(x => horseKeyV11(x?.horse || {}) === key);
  return item?.career || null;
}

async function loadCareerForHorseV11(raceNo, horse) {
  const cached = cachedCareerV11(raceNo, horse);
  if (cached && (cached.ok || cached.error)) return cached;
  if (!horse?.id) return { ok:false, error:'TJK At ID yok.', roadmap:[], analysisMode:'DEBUT' };
  if (typeof fetchCareer !== 'function') return { ok:false, error:'Kariyer API fonksiyonu bulunamadı.', roadmap:[], analysisMode:'DEBUT' };
  return fetchCareer(horse.id, state.date);
}

async function fetchModelRoadmapV11(race) {
  const meta = typeof programRaceMeta === 'function'
    ? programRaceMeta(race)
    : { ok:true, class:race.class, ageGroup:race.ageGroup, track:race.track, distance:race.distance };
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu şartları eksik.' };
  const url =
    `/api/tjk-model-roadmap-v11` +
    `?date=${encodeURIComponent(state.date)}` +
    `&city=${encodeURIComponent(getCityName())}` +
    `&class=${encodeURIComponent(meta.class || race.class || '')}` +
    `&ageGroup=${encodeURIComponent(meta.ageGroup || race.ageGroup || '')}` +
    `&track=${encodeURIComponent(meta.track || race.track || '')}` +
    `&distance=${encodeURIComponent(meta.distance || race.distance || '')}` +
    `&minYear=2000&t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) return { ok:false, error:data?.error || `API ${res.status}` };
    return data;
  } catch (e) {
    return { ok:false, error:e?.message || 'V11 model yol haritası alınamadı.' };
  }
}

async function prepareRaceModelsV11(race, progress) {
  if (progress) progress(`Koşu ${race.no}: bağımsız tarihsel modeller hazırlanıyor…`);
  const roadmapPromise = fetchModelRoadmapV11(race);
  const careersPromise = mapLimitV11(Array.isArray(race.horses) ? race.horses : [], 3, horse => loadCareerForHorseV11(race.no, horse));
  const [roadmap, careers] = await Promise.all([roadmapPromise, careersPromise]);

  const horses = (Array.isArray(race.horses) ? race.horses : []).map((horse, i) => {
    const career = careers[i] || { ok:false, roadmap:[], analysisMode:'DEBUT' };
    const scores = roadmap?.ok
      ? horseModelScoresV11(career, roadmap)
      : { exact:{score:null}, twin:{score:null}, family:{score:null}, career:{score:null}, composite:{score:null,present:[],missing:['exact','twin','family','career']}, analysisMode:analysisModeV11(career) };
    return { horse, careerOk:Boolean(career?.ok), careerError:career?.error || null, scores };
  });

  return {
    no:race.no,
    roadmapOk:Boolean(roadmap?.ok),
    roadmapError:roadmap?.error || null,
    modelCounts:roadmap?.counts || {},
    horses
  };
}

function scoreObjectForModelV11(item, modelId) {
  if (modelId === 'composite') {
    const c = item?.scores?.composite || {};
    return {
      score:finiteV11(c.score),
      coverage:Array.isArray(c.present) ? c.present.length : 0,
      strongYears:Math.max(
        item?.scores?.exact?.strongYears || 0,
        item?.scores?.twin?.strongYears || 0,
        item?.scores?.family?.strongYears || 0,
        item?.scores?.career?.strongYears || 0
      ),
      supportYears:(item?.scores?.exact?.supportYears || 0)+(item?.scores?.twin?.supportYears || 0)+(item?.scores?.family?.supportYears || 0),
      latestScore:Math.max(
        finiteV11(item?.scores?.exact?.latestScore) ?? -1,
        finiteV11(item?.scores?.twin?.latestScore) ?? -1,
        finiteV11(item?.scores?.family?.latestScore) ?? -1,
        finiteV11(item?.scores?.career?.latestScore) ?? -1
      ),
      missing:c.missing || []
    };
  }
  const s = item?.scores?.[modelId] || {};
  return {
    score:finiteV11(s.score),
    coverage:Number(s.coverageYears || 0),
    strongYears:Number(s.strongYears || 0),
    supportYears:Number(s.supportYears || 0),
    latestScore:finiteV11(s.latestScore),
    mode:s.mode || item?.scores?.analysisMode || null
  };
}

function rankRaceForModelV11(raceData, modelId) {
  return (Array.isArray(raceData?.horses) ? raceData.horses : [])
    .map(item => ({
      horse:item.horse,
      ...scoreObjectForModelV11(item, modelId),
      analysisMode:item?.scores?.analysisMode || null
    }))
    .sort((a,b) => {
      const as = a.score === null ? -1 : a.score;
      const bs = b.score === null ? -1 : b.score;
      return bs-as || b.strongYears-a.strongYears || b.supportYears-a.supportYears ||
        (finiteV11(b.latestScore) ?? -1)-(finiteV11(a.latestScore) ?? -1) ||
        Number(a?.horse?.no || 999)-Number(b?.horse?.no || 999);
    });
}

function betDescriptorV11(type = '') {
  const raw = String(type || '');
  const normalized = normalizeTextV11(raw);
  const legMatch = normalized.match(/([34567])\s*L[IU]/) || normalized.match(/([34567])L[IU]/);
  const variantMatch = raw.match(/^\s*([12])\s*\./);
  return {
    type:raw,
    legs:legMatch ? Number(legMatch[1]) : null,
    variant:variantMatch ? Number(variantMatch[1]) : null,
    kind:/PLASE/i.test(normalized) ? 'PLASE' : 'GANYAN'
  };
}

function labelMatchesBetV11(label, desc) {
  const n = normalizeTextV11(label).replace(/\s+/g, '');
  if (!desc.legs || !new RegExp(`${desc.legs}L[IU]`).test(n)) return false;
  if (!n.includes(desc.kind)) return false;
  return true;
}

function resolveBetStartV11(type) {
  const desc = betDescriptorV11(type);
  if (!desc.legs) return { ok:false, error:`Bahis ayak sayısı okunamadı: ${type}`, desc };
  const candidates = [];
  state.races.forEach((race, index) => {
    for (const label of Array.isArray(race.betStarts) ? race.betStarts : []) {
      if (labelMatchesBetV11(label, desc)) candidates.push({ race, index, label });
    }
  });

  let selected = null;
  if (desc.variant) {
    selected = candidates.find(c => new RegExp(`(^|\\D)${desc.variant}\\s*\\.`).test(String(c.label))) || candidates[desc.variant - 1] || null;
  } else {
    selected = candidates[0] || null;
  }

  let inferred = false;
  if (!selected) {
    inferred = true;
    const index = desc.variant === 2
      ? Math.max(0, state.races.length - desc.legs)
      : 0;
    if (state.races[index]) selected = { race:state.races[index], index, label:'TJK başlangıcı okunamadı; sıra tahmini' };
  }
  if (!selected) return { ok:false, error:`${type} başlangıç koşusu bulunamadı.`, desc };
  const legs = state.races.slice(selected.index, selected.index + desc.legs);
  if (legs.length !== desc.legs) return { ok:false, error:`${type} için ${desc.legs} ayak tamamlanamadı.`, desc };
  return { ok:true, desc, startIndex:selected.index, startRace:selected.race.no, startLabel:selected.label, inferred, legs };
}

function productV11(values) {
  return values.reduce((a,b) => a * Math.max(0, Number(b) || 0), 1);
}

function ticketCostV11(counts, unitPrice) {
  const combinations = productV11(counts);
  return { combinations, cost:Number((combinations * unitPrice).toFixed(2)) };
}

function confidenceV11(ranking) {
  const scored = ranking.filter(x => x.score !== null);
  if (!scored.length) return -1;
  const top = scored[0].score;
  const second = scored[1]?.score ?? 0;
  return top + Math.max(0, top - second) * 1.5 + Math.min(20, scored[0].strongYears * 2);
}

function buildOneTicketV11(plan, model, raceDataMap, budget, unitPrice, requestedSingles) {
  const legRankings = plan.legs.map(race => ({ race, ranking:rankRaceForModelV11(raceDataMap.get(String(race.no)), model.id) }));
  const noDataLegs = legRankings.filter(x => !x.ranking.some(h => h.score !== null));
  if (noDataLegs.length) {
    return {
      version:TICKET_V11_VERSION,
      type:plan.desc.type,
      modelId:model.id,
      modelLabel:model.label,
      available:false,
      city:getCityName(), date:state.date,
      startRace:plan.startRace,
      error:`${noDataLegs.map(x => `${x.race.no}. koşu`).join(', ')} için ${model.label} model verisi yok.`,
      legs:noDataLegs.map(x => ({ raceNo:x.race.no, selections:[], noData:true }))
    };
  }

  const maxSingles = Math.min(Math.max(0, requestedSingles), legRankings.length);
  const singleCandidates = legRankings
    .map((x, i) => ({ i, confidence:confidenceV11(x.ranking), horseCount:x.ranking.length }))
    .filter(x => x.confidence >= 0 && x.horseCount >= 1)
    .sort((a,b) => b.confidence-a.confidence)
    .slice(0, maxSingles);
  const singleIndexes = new Set(singleCandidates.map(x => x.i));

  const counts = legRankings.map((x, i) => {
    if (singleIndexes.has(i)) return 1;
    return Math.min(2, x.ranking.length);
  });

  const structuralWarnings = [];
  if (requestedSingles === 0 && counts.some((c, i) => c < 2 && legRankings[i].ranking.length >= 2)) {
    structuralWarnings.push('Tek=0 kuralı uygulanamadı.');
  }
  if (requestedSingles > singleIndexes.size) structuralWarnings.push(`İstenen ${requestedSingles} tekten yalnız ${singleIndexes.size} tanesi model verisiyle güvenli seçilebildi.`);

  let money = ticketCostV11(counts, unitPrice);
  const overBudget = money.cost > budget;

  if (!overBudget) {
    while (true) {
      let best = null;
      for (let i = 0; i < legRankings.length; i++) {
        const ranking = legRankings[i].ranking;
        if (counts[i] >= ranking.length) continue;
        const trial = [...counts];
        trial[i] += 1;
        const nextMoney = ticketCostV11(trial, unitPrice);
        if (nextMoney.cost > budget) continue;
        const next = ranking[counts[i]];
        const nextScore = next?.score ?? 0;
        const extraCost = Math.max(0.0001, nextMoney.cost - money.cost);
        const value = (nextScore + Math.min(15, next?.supportYears || 0)) / extraCost;
        if (!best || value > best.value || (value === best.value && nextScore > best.nextScore)) {
          best = { i, value, nextScore, nextMoney };
        }
      }
      if (!best) break;
      counts[best.i] += 1;
      money = best.nextMoney;
    }
  }

  const legs = legRankings.map((x, i) => ({
    raceNo:x.race.no,
    raceClass:x.race.class || '',
    distance:x.race.distance || '',
    track:x.race.track || '',
    single:counts[i] === 1,
    selections:x.ranking.slice(0, counts[i]).map((row, rankIndex) => ({
      no:row.horse?.no,
      name:row.horse?.name,
      id:row.horse?.id || null,
      score:row.score,
      modelRank:rankIndex + 1,
      coverage:row.coverage,
      analysisMode:row.analysisMode || row.mode || null
    })),
    ranking:x.ranking.map((row, rankIndex) => ({ no:row.horse?.no, name:row.horse?.name, score:row.score, rank:rankIndex+1 }))
  }));

  return {
    version:TICKET_V11_VERSION,
    scoreVersion:TICKET_SCORE_VERSION,
    type:plan.desc.type,
    modelId:model.id,
    modelLabel:model.label,
    available:true,
    city:getCityName(), date:state.date,
    startRace:plan.startRace,
    startLabel:plan.startLabel,
    startInferred:plan.inferred,
    budget, unitPrice,
    requestedSingles,
    actualSingles:legs.filter(x => x.single).length,
    combinations:money.combinations,
    cost:money.cost,
    overBudget,
    minimumCostExceeded:overBudget,
    warnings:[...structuralWarnings, ...(plan.inferred ? ['Bahis başlangıcı TJK etiketinden doğrulanamadı; sıra tahmini kullanıldı.'] : [])],
    legs,
    generatedAt:new Date().toISOString()
  };
}

async function buildTicketsV11() {
  const button = $('buildAllBtn');
  const selectedTypes = [...document.querySelectorAll('.bet-check:checked')].map(x => x.value);
  if (!selectedTypes.length) { status('En az bir bahis türü seç.'); return; }
  if (!Array.isArray(state.races) || !state.races.length) { status('Önce TJK programını yükle.'); return; }

  const budget = Math.max(1, numberValue($('budget')?.value, 500));
  const unitPrice = Math.max(0.01, numberValue($('unitPrice')?.value, 1));
  const requestedSingles = Math.max(0, Math.min(7, Math.floor(numberValue($('singleCount')?.value, 1))));
  const plans = selectedTypes.map(resolveBetStartV11);
  const validPlans = plans.filter(x => x.ok);
  if (!validPlans.length) {
    state.tickets = plans.map((p, i) => ({ version:TICKET_V11_VERSION, type:selectedTypes[i], modelId:'composite', modelLabel:'Bileşik', available:false, error:p.error || 'Bahis planı kurulamadı.' }));
    save(); renderTicketsV11(); status('Bahis başlangıçları kurulamadı.'); return;
  }

  const raceNos = new Set();
  validPlans.forEach(plan => plan.legs.forEach(r => raceNos.add(String(r.no))));
  const racesToPrepare = state.races.filter(r => raceNos.has(String(r.no)));

  if (button) { button.disabled = true; button.textContent = '5 model hesaplanıyor…'; }
  try {
    const raceData = [];
    for (let i = 0; i < racesToPrepare.length; i++) {
      const race = racesToPrepare[i];
      status(`V11 · ${i+1}/${racesToPrepare.length} koşu · Tam/İkiz/Aile/Kariyer hazırlanıyor…`);
      raceData.push(await prepareRaceModelsV11(race));
    }
    const raceDataMap = new Map(raceData.map(r => [String(r.no), r]));

    const tickets = [];
    for (const plan of plans) {
      const type = plan?.desc?.type || selectedTypes[tickets.length] || 'Bahis';
      if (!plan.ok) {
        for (const model of TICKET_MODELS_V11) tickets.push({
          version:TICKET_V11_VERSION, type, modelId:model.id, modelLabel:model.label,
          available:false, city:getCityName(), date:state.date, error:plan.error || 'Bahis başlangıcı bulunamadı.'
        });
        continue;
      }
      for (const model of TICKET_MODELS_V11) {
        tickets.push(buildOneTicketV11(plan, model, raceDataMap, budget, unitPrice, requestedSingles));
      }
    }

    state.tickets = tickets;
    state.analyses.ticketV11 = {
      version:TICKET_V11_VERSION,
      scoreVersion:TICKET_SCORE_VERSION,
      date:state.date,
      city:state.city,
      generatedAt:new Date().toISOString(),
      races:raceData.map(r => ({
        no:r.no,
        roadmapOk:r.roadmapOk,
        roadmapError:r.roadmapError,
        modelCounts:r.modelCounts,
        horses:r.horses.map(item => ({
          horse:{ id:item.horse?.id || null, no:item.horse?.no, name:item.horse?.name },
          analysisMode:item.scores?.analysisMode || null,
          scores:Object.fromEntries(['exact','twin','family','career','composite'].map(id => [id, {
            score:item.scores?.[id]?.score ?? null,
            strongYears:item.scores?.[id]?.strongYears ?? 0,
            supportYears:item.scores?.[id]?.supportYears ?? 0,
            coverageYears:item.scores?.[id]?.coverageYears ?? 0,
            present:item.scores?.[id]?.present || undefined,
            missing:item.scores?.[id]?.missing || undefined
          }]))
        }))
      }))
    };
    save();
    renderTicketsV11();
    status(`${selectedTypes.length} bahis × 5 model = ${tickets.length} model kuponu hazır.`);
  } catch (e) {
    console.error('[AT AI V11] ticket build error', e);
    status(`V11 kupon hatası: ${e?.message || 'Bilinmeyen hata'}`);
  } finally {
    if (button) { button.disabled = false; button.textContent = '5 Model Kuponlarını Oluştur'; }
  }
}

function ticketLegHtmlV11(leg) {
  const picks = Array.isArray(leg?.selections) ? leg.selections : [];
  return `
    <div class="ticket-leg-v11">
      <div class="ticket-leg-head-v11">
        <b>${escapeHtml(leg.raceNo)}. Koşu</b>
        ${leg.single ? '<span class="ticket-single-v11">TEK</span>' : `<span>${picks.length} at</span>`}
      </div>
      <div class="ticket-picks-v11">
        ${picks.map(p => `
          <span class="ticket-pick-v11">
            <b>${escapeHtml(p.no)}</b> ${escapeHtml(p.name || '')}
            ${p.score !== null && p.score !== undefined ? `<small>%${escapeHtml(p.score)}</small>` : ''}
          </span>`).join('') || '<span class="ticket-warning-v11">Seçim yok</span>'}
      </div>
    </div>`;
}

function ticketPanelHtmlV11(ticket, active = false) {
  if (!ticket.available) {
    return `<div class="ticket-model-panel-v11 ${active?'active':''}" data-ticket-model-panel="${escapeHtml(ticket.modelId)}">
      <div class="ticket-model-title-v11"><b>${escapeHtml(ticket.modelLabel)}</b></div>
      <div class="ticket-warning-v11">⚠ ${escapeHtml(ticket.error || 'Bu model için kupon üretilemedi.')}</div>
    </div>`;
  }
  return `<div class="ticket-model-panel-v11 ${active?'active':''}" data-ticket-model-panel="${escapeHtml(ticket.modelId)}">
    <div class="ticket-model-title-v11">
      <div><b>${escapeHtml(ticket.modelLabel)}</b><small>${escapeHtml(ticket.startRace)}. koşudan başlar</small></div>
      <div class="ticket-money-v11"><b>${escapeHtml(ticket.cost.toFixed(2))} ₺</b><small>${escapeHtml(ticket.combinations)} kolon</small></div>
    </div>
    ${ticket.overBudget ? `<div class="ticket-warning-v11">⚠ Yapısal minimum kupon ${escapeHtml(ticket.cost.toFixed(2))} ₺; ${escapeHtml(ticket.budget)} ₺ bütçeyi aşıyor. Tek/2-at kuralı bozulmadı.</div>` : ''}
    ${(ticket.warnings || []).map(w => `<div class="ticket-warning-v11">⚠ ${escapeHtml(w)}</div>`).join('')}
    <div class="ticket-meta-v11">Birim ${escapeHtml(ticket.unitPrice)} ₺ · Tek ${escapeHtml(ticket.actualSingles)}/${escapeHtml(ticket.requestedSingles)} · Bütçe ${escapeHtml(ticket.budget)} ₺</div>
    ${(ticket.legs || []).map(ticketLegHtmlV11).join('')}
  </div>`;
}

function renderTicketsV11() {
  const box = $('tickets');
  if (!box) return;
  const tickets = Array.isArray(state.tickets) ? state.tickets : [];
  const v11 = tickets.filter(t => t?.version === TICKET_V11_VERSION);
  if (!v11.length) {
    box.classList.add('empty');
    box.innerHTML = 'Henüz V11 model kuponu oluşturulmadı.';
    return;
  }
  box.classList.remove('empty');

  const groups = new Map();
  for (const ticket of v11) {
    if (!groups.has(ticket.type)) groups.set(ticket.type, []);
    groups.get(ticket.type).push(ticket);
  }

  box.innerHTML = [...groups.entries()].map(([type, rows], groupIndex) => {
    const ordered = TICKET_MODELS_V11.map(m => rows.find(r => r.modelId === m.id)).filter(Boolean);
    return `<details class="ticket-group-v11" ${groupIndex===0?'open':''}>
      <summary class="ticket-group-summary-v11">
        <div><b>${escapeHtml(type)}</b><small>5 model karşılaştırması</small></div>
        <span>${ordered.filter(x=>x.available).length}/5 hazır ▾</span>
      </summary>
      <div class="ticket-group-body-v11" data-ticket-group="${escapeHtml(type)}">
        <div class="ticket-model-tabs-v11">
          ${ordered.map((t,i) => `<button class="ticket-model-tab-v11 ${i===0?'active':''}" data-ticket-model="${escapeHtml(t.modelId)}">${escapeHtml(TICKET_MODELS_V11.find(m=>m.id===t.modelId)?.short || t.modelLabel)}</button>`).join('')}
        </div>
        ${ordered.map((t,i) => ticketPanelHtmlV11(t, i===0)).join('')}
      </div>
    </details>`;
  }).join('');

  box.querySelectorAll('.ticket-group-body-v11').forEach(group => {
    group.querySelectorAll('[data-ticket-model]').forEach(btn => {
      btn.addEventListener('click', () => {
        const model = btn.getAttribute('data-ticket-model');
        group.querySelectorAll('.ticket-model-tab-v11').forEach(x => x.classList.toggle('active', x === btn));
        group.querySelectorAll('[data-ticket-model-panel]').forEach(panel => panel.classList.toggle('active', panel.getAttribute('data-ticket-model-panel') === model));
      });
    });
  });
}

/* V11 yüklenince eski stub motorunu ve daha önce bağlanan onclick referanslarını değiştir. */
buildTickets = buildTicketsV11;
renderTickets = renderTicketsV11;
if ($('buildAllBtn')) $('buildAllBtn').onclick = buildTicketsV11;
if ($('ticketFromAnalysis')) $('ticketFromAnalysis').onclick = buildTicketsV11;

/* Eski taslak kartları V11 ekranında göstermeyelim. */
if (Array.isArray(state.tickets) && state.tickets.length && !state.tickets.some(t => t?.version === TICKET_V11_VERSION)) {
  state.tickets = [];
  save();
}
renderTicketsV11();

console.info('[AT AI]', TICKET_V11_VERSION, 'aktif');
console.info('[AT AI]', TICKET_SCORE_VERSION, 'aktif');
