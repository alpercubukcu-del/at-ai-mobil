const FIVE_MODEL_COOPERATIVE_UI_VERSION_V1691F57 = 'FIVE-MODEL-COOPERATIVE-UI-V16.9.1F57';
const FIVE_MODEL_COOPERATIVE_PODIUM_VERSION_V1691F59 = 'FIVE-MODEL-COOPERATIVE-PODIUM-V16.9.1F59';
const FIVE_MODEL_SCORE_CHUNK_V1691F57 = 2;

function yieldUiV1691F57() {
  try {
    if (globalThis.scheduler && typeof globalThis.scheduler.yield === 'function') {
      return globalThis.scheduler.yield();
    }
  } catch {}
  return new Promise(resolve => setTimeout(resolve, 0));
}

function scoreRowBetterV1691F57(candidate, current) {
  if (!current) return true;
  const cs = Number(candidate?.score ?? -1);
  const ps = Number(current?.score ?? -1);
  if (cs !== ps) return cs > ps;

  const f18 = candidate?.baseScore !== undefined || current?.baseScore !== undefined ||
    candidate?.partialSupportScore !== undefined || current?.partialSupportScore !== undefined;
  if (f18) {
    const cb = Number(candidate?.baseScore || 0);
    const pb = Number(current?.baseScore || 0);
    if (cb !== pb) return cb > pb;
    const cp = Number(candidate?.partialSupportScore || 0);
    const pp = Number(current?.partialSupportScore || 0);
    if (cp !== pp) return cp > pp;
    return Number(candidate?.historicalFinish || 99) < Number(current?.historicalFinish || 99);
  }

  const cpath = Number(candidate?.pathScore || 0);
  const ppath = Number(current?.pathScore || 0);
  if (cpath !== ppath) return cpath > ppath;
  return Number(candidate?.historicalFinish || 99) < Number(current?.historicalFinish || 99);
}

function strongestScoreRowV1691F57(rows) {
  return [...rows].sort((a, b) => {
    const dScore = Number(b?.score || 0) - Number(a?.score || 0);
    if (dScore) return dScore;
    const f18 = a?.baseScore !== undefined || b?.baseScore !== undefined ||
      a?.partialSupportScore !== undefined || b?.partialSupportScore !== undefined;
    if (f18) {
      const dBase = Number(b?.baseScore || 0) - Number(a?.baseScore || 0);
      if (dBase) return dBase;
      const dPartial = Number(b?.partialSupportScore || 0) - Number(a?.partialSupportScore || 0);
      if (dPartial) return dPartial;
    }
    const dPath = Number(b?.pathScore || 0) - Number(a?.pathScore || 0);
    if (dPath) return dPath;
    return Number(b?.year || 0) - Number(a?.year || 0);
  })[0] || null;
}

async function scoreRowsCooperativeV1691F57(currentCareer, historicalRaces, useCondition = true) {
  const list = Array.isArray(historicalRaces) ? historicalRaces : [];
  if (!list.length) return scoreRowsV11(currentCareer, [], useCondition);

  const byYear = new Map();
  let seed = null;
  for (let i = 0; i < list.length; i += FIVE_MODEL_SCORE_CHUNK_V1691F57) {
    const part = scoreRowsV11(
      currentCareer,
      list.slice(i, i + FIVE_MODEL_SCORE_CHUNK_V1691F57),
      useCondition
    );
    if (!seed && part && typeof part === 'object') seed = part;
    for (const row of Array.isArray(part?.rows) ? part.rows : []) {
      const year = Number(row?.year || 0);
      if (!year) continue;
      const previous = byYear.get(year);
      if (scoreRowBetterV1691F57(row, previous)) byYear.set(year, row);
    }
    if (i + FIVE_MODEL_SCORE_CHUNK_V1691F57 < list.length) await yieldUiV1691F57();
  }

  if (!seed) seed = scoreRowsV11(currentCareer, [], useCondition);
  const rows = [...byYear.values()].sort((a, b) => Number(b?.year || 0) - Number(a?.year || 0));
  if (!rows.length) {
    return {
      ...(seed || {}),
      score:null,
      rawScore:seed?.rawScore ?? null,
      strongest:null,
      rows:[],
      strongYears:0,
      supportYears:0,
      latestScore:null,
      coverageYears:0
    };
  }

  const strongest = strongestScoreRowV1691F57(rows);
  return {
    ...(seed || {}),
    score:strongest?.score ?? null,
    rawScore:strongest?.score ?? seed?.rawScore ?? null,
    strongest,
    rows,
    strongYears:rows.filter(row => Number(row?.score || 0) >= 85).length,
    supportYears:rows.filter(row => Number(row?.score || 0) >= 70).length,
    latestScore:rows[0]?.score ?? null,
    coverageYears:rows.length
  };
}

function emptyFinishScoreV1691F59(currentCareer, targetFinish) {
  let mode = 'DEBUT';
  try {
    mode = typeof modePodiumV115 === 'function' ? modePodiumV115(currentCareer) : analysisModeV11(currentCareer);
  } catch {}
  return {
    score:null,
    rawScore:null,
    strongest:null,
    rows:[],
    mode,
    targetFinish:Number(targetFinish),
    strongYears:0,
    supportYears:0,
    latestScore:null,
    coverageYears:0,
    yearAggregation:'NONE'
  };
}

async function scoreFinishRowsCooperativeV1691F59(currentCareer, historicalRaces, targetFinish, useCondition = true) {
  const scorer = typeof scoreFinishRowsPodiumV115 === 'function' ? scoreFinishRowsPodiumV115 : null;
  if (!scorer) return emptyFinishScoreV1691F59(currentCareer, targetFinish);

  const list = Array.isArray(historicalRaces) ? historicalRaces : [];
  if (!list.length) return scorer(currentCareer, [], targetFinish, useCondition);

  const byYear = new Map();
  let seed = null;
  for (let i = 0; i < list.length; i += FIVE_MODEL_SCORE_CHUNK_V1691F57) {
    const part = scorer(
      currentCareer,
      list.slice(i, i + FIVE_MODEL_SCORE_CHUNK_V1691F57),
      targetFinish,
      useCondition
    );
    if (!seed && part && typeof part === 'object') seed = part;
    for (const row of Array.isArray(part?.rows) ? part.rows : []) {
      const year = Number(row?.year || 0);
      if (!year) continue;
      const previous = byYear.get(year);
      if (scoreRowBetterV1691F57(row, previous)) byYear.set(year, row);
    }
    if (i + FIVE_MODEL_SCORE_CHUNK_V1691F57 < list.length) await yieldUiV1691F57();
  }

  if (!seed) seed = scorer(currentCareer, [], targetFinish, useCondition);
  const rows = [...byYear.values()].sort((a, b) => Number(b?.year || 0) - Number(a?.year || 0));
  if (!rows.length) {
    return {
      ...(seed || emptyFinishScoreV1691F59(currentCareer, targetFinish)),
      score:null,
      rawScore:null,
      strongest:null,
      rows:[],
      targetFinish:Number(targetFinish),
      strongYears:0,
      supportYears:0,
      latestScore:null,
      coverageYears:0
    };
  }

  const strongest = strongestScoreRowV1691F57(rows);
  return {
    ...(seed || {}),
    score:strongest?.score ?? null,
    rawScore:strongest?.rawScore ?? strongest?.score ?? null,
    strongest,
    rows,
    targetFinish:Number(targetFinish),
    strongYears:rows.filter(row => Number(row?.score || 0) >= 85).length,
    supportYears:rows.filter(row => Number(row?.score || 0) >= 70).length,
    latestScore:rows[0]?.score ?? null,
    coverageYears:rows.length
  };
}

function podiumCompositeRawV1691F59(channels) {
  try {
    if (typeof weightedCompositePodiumV115 === 'function') {
      const raw = weightedCompositePodiumV115(channels, true) || {};
      return { ...raw, rawScore:raw.score ?? null };
    }
  } catch {}
  const fallback = compositeScoreV11(channels) || {};
  return { ...fallback, rawScore:fallback.score ?? null };
}

async function placementScoresCooperativeV1691F59(career, roadmap, targetFinish) {
  const exact = await scoreFinishRowsCooperativeV1691F59(career, roadmap?.models?.EXACT || [], targetFinish, true);
  await yieldUiV1691F57();
  const twin = await scoreFinishRowsCooperativeV1691F59(career, roadmap?.models?.CONDITION_TWIN || [], targetFinish, true);
  await yieldUiV1691F57();
  const family = await scoreFinishRowsCooperativeV1691F59(career, roadmap?.models?.RACE_FAMILY || [], targetFinish, true);
  await yieldUiV1691F57();
  const allHistorical = uniqueHistoricalRacesV11(roadmap?.models || {});
  const careerScore = await scoreFinishRowsCooperativeV1691F59(career, allHistorical, targetFinish, false);
  const composite = podiumCompositeRawV1691F59({ exact, twin, family, career:careerScore });
  let analysisMode = analysisModeV11(career);
  try { if (typeof modePodiumV115 === 'function') analysisMode = modePodiumV115(career); } catch {}
  return {
    targetFinish:Number(targetFinish),
    analysisMode,
    exact,
    twin,
    family,
    career:careerScore,
    composite
  };
}

async function horseModelScoresCooperativeV1691F57(career, roadmap, progress, raceNo, horse, horseIndex, horseTotal) {
  const prefix = `Koşu ${raceNo}: ${horseIndex + 1}/${horseTotal} · ${horse?.no || ''}. ${horse?.name || 'At'}`;
  try { progress?.(`${prefix} · Tam Eşleşme puanlanıyor…`); } catch {}
  const exact = await scoreRowsCooperativeV1691F57(career, roadmap?.models?.EXACT || [], true);
  await yieldUiV1691F57();

  try { progress?.(`${prefix} · Koşul İkizi puanlanıyor…`); } catch {}
  const twin = await scoreRowsCooperativeV1691F57(career, roadmap?.models?.CONDITION_TWIN || [], true);
  await yieldUiV1691F57();

  try { progress?.(`${prefix} · Yarış Ailesi puanlanıyor…`); } catch {}
  const family = await scoreRowsCooperativeV1691F57(career, roadmap?.models?.RACE_FAMILY || [], true);
  await yieldUiV1691F57();

  try { progress?.(`${prefix} · Kariyer/Hazırlık puanlanıyor…`); } catch {}
  const allHistorical = uniqueHistoricalRacesV11(roadmap?.models || {});
  const careerPath = await scoreRowsCooperativeV1691F57(career, allHistorical, false);
  const composite = compositeScoreV11({ exact, twin, family, career:careerPath });

  const byFinish = {};
  if (typeof scoreFinishRowsPodiumV115 === 'function') {
    for (const finish of [1, 2, 3]) {
      const label = finish === 1 ? '1.lik' : finish === 2 ? '2.lik' : '3.lük';
      try { progress?.(`${prefix} · ${label} modeli puanlanıyor…`); } catch {}
      byFinish[finish] = await placementScoresCooperativeV1691F59(career, roadmap, finish);
      await yieldUiV1691F57();
    }
  }

  const out = {
    exact,
    twin,
    family,
    career:careerPath,
    composite,
    analysisMode:analysisModeV11(career)
  };
  if (byFinish[1] && byFinish[2] && byFinish[3]) {
    out.byFinish = byFinish;
    try {
      if (typeof PODIUM_SIMILARITY_V115 !== 'undefined') out.podiumSimilarityVersion = PODIUM_SIMILARITY_V115;
    } catch {}
  }
  return out;
}

async function prepareRaceModelsV11(race, progress) {
  if (progress) progress(`Koşu ${race.no}: bağımsız tarihsel modeller hazırlanıyor…`);
  const roadmapPromise = fetchModelRoadmapV11(race);
  const careersPromise = mapLimitV11(
    Array.isArray(race.horses) ? race.horses : [],
    3,
    horse => loadCareerForHorseV11(race.no, horse)
  );
  const [roadmap, careers] = await Promise.all([roadmapPromise, careersPromise]);
  await yieldUiV1691F57();

  const raceHorses = Array.isArray(race.horses) ? race.horses : [];
  const horses = [];
  for (let i = 0; i < raceHorses.length; i++) {
    const horse = raceHorses[i];
    const career = careers[i] || { ok:false, roadmap:[], analysisMode:'DEBUT' };
    const scores = roadmap?.ok
      ? await horseModelScoresCooperativeV1691F57(career, roadmap, progress, race.no, horse, i, raceHorses.length)
      : { exact:{score:null}, twin:{score:null}, family:{score:null}, career:{score:null}, composite:{score:null,present:[],missing:['exact','twin','family','career']}, analysisMode:analysisModeV11(career) };
    horses.push({ horse, careerOk:Boolean(career?.ok), careerError:career?.error || null, scores });
    await yieldUiV1691F57();
  }

  try { progress?.(`Koşu ${race.no}: 5 Model + 1./2./3. derece puanlaması tamamlandı; ekran serbest.`); } catch {}
  return {
    no:race.no,
    roadmapOk:Boolean(roadmap?.ok),
    roadmapError:roadmap?.error || null,
    modelCounts:roadmap?.counts || {},
    horses,
    cooperativeUiVersion:FIVE_MODEL_COOPERATIVE_UI_VERSION_V1691F57,
    cooperativePodiumVersion:FIVE_MODEL_COOPERATIVE_PODIUM_VERSION_V1691F59
  };
}