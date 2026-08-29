const FIVE_MODEL_COOPERATIVE_UI_VERSION_V1691F57 = 'FIVE-MODEL-COOPERATIVE-UI-V16.9.1F57';
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
  return { exact, twin, family, career:careerPath, composite, analysisMode:analysisModeV11(career) };
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

  try { progress?.(`Koşu ${race.no}: 5 Model puanlaması tamamlandı; ekran serbest.`); } catch {}
  return {
    no:race.no,
    roadmapOk:Boolean(roadmap?.ok),
    roadmapError:roadmap?.error || null,
    modelCounts:roadmap?.counts || {},
    horses,
    cooperativeUiVersion:FIVE_MODEL_COOPERATIVE_UI_VERSION_V1691F57
  };
}