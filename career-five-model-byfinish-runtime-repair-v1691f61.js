/* AT AI Mobil — V16.9.1F61 CAREER 5 MODEL BYFINISH RUNTIME REPAIR
   - Final prepareRaceModelsV11 sonucunda byFinish eksikse yalniz eksik derece semasini tamamlar.
   - Mevcut Podium V11.5 / F18 derece skorlama fonksiyonlarini kullanir; yeni puan formulu/fallback uretmez.
   - Hesap parcalara bolunur ve UI'ya kontrol verilir; yeni timeout eklenmez.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_BYFINISH_RUNTIME_REPAIR_V1691F61__) return;
window.__AT_CAREER_FIVE_MODEL_BYFINISH_RUNTIME_REPAIR_V1691F61__ = true;

const VERSION = 'CAREER-FIVE-MODEL-BYFINISH-RUNTIME-REPAIR-V16.9.1F61';
const CHUNK = 2;

if (typeof prepareRaceModelsV11 !== 'function') {
  console.warn('[AT AI]', VERSION, 'prepareRaceModelsV11 bulunamadi.');
  return;
}

const beforePrepareV1691F61 = prepareRaceModelsV11;

function yieldUiV1691F61() {
  try {
    if (globalThis.scheduler && typeof globalThis.scheduler.yield === 'function') return globalThis.scheduler.yield();
  } catch {}
  return new Promise(resolve => setTimeout(resolve, 0));
}

function hasByFinishV1691F61(data) {
  const horses = Array.isArray(data?.horses) ? data.horses : [];
  if (!horses.length) return false;
  return horses.every(item => {
    const by = item?.scores?.byFinish;
    return Boolean(by?.[1] && by?.[2] && by?.[3]);
  });
}

function betterRowV1691F61(candidate, current) {
  if (!current) return true;
  const cs = Number(candidate?.score ?? -1), ps = Number(current?.score ?? -1);
  if (cs !== ps) return cs > ps;
  const cb = Number(candidate?.baseScore || 0), pb = Number(current?.baseScore || 0);
  if (cb !== pb) return cb > pb;
  const cp = Number(candidate?.partialSupportScore || 0), pp = Number(current?.partialSupportScore || 0);
  if (cp !== pp) return cp > pp;
  const cpath = Number(candidate?.pathScore || 0), ppath = Number(current?.pathScore || 0);
  if (cpath !== ppath) return cpath > ppath;
  return Number(candidate?.historicalFinish || 99) < Number(current?.historicalFinish || 99);
}

function strongestRowV1691F61(rows) {
  return [...rows].sort((a, b) => {
    const ds = Number(b?.score || 0) - Number(a?.score || 0); if (ds) return ds;
    const db = Number(b?.baseScore || 0) - Number(a?.baseScore || 0); if (db) return db;
    const dp = Number(b?.partialSupportScore || 0) - Number(a?.partialSupportScore || 0); if (dp) return dp;
    const dpath = Number(b?.pathScore || 0) - Number(a?.pathScore || 0); if (dpath) return dpath;
    return Number(b?.year || 0) - Number(a?.year || 0);
  })[0] || null;
}

async function scoreFinishCoopV1691F61(career, historicalRaces, targetFinish, useCondition = true) {
  const scorer = typeof scoreFinishRowsPodiumV115 === 'function' ? scoreFinishRowsPodiumV115 : null;
  if (!scorer) return null;
  const list = Array.isArray(historicalRaces) ? historicalRaces : [];
  if (!list.length) return scorer(career, [], targetFinish, useCondition);

  const byYear = new Map();
  let seed = null;
  for (let i = 0; i < list.length; i += CHUNK) {
    const part = scorer(career, list.slice(i, i + CHUNK), targetFinish, useCondition);
    if (!seed && part && typeof part === 'object') seed = part;
    for (const row of Array.isArray(part?.rows) ? part.rows : []) {
      const year = Number(row?.year || 0);
      if (!year) continue;
      const prev = byYear.get(year);
      if (betterRowV1691F61(row, prev)) byYear.set(year, row);
    }
    if (i + CHUNK < list.length) await yieldUiV1691F61();
  }

  if (!seed) seed = scorer(career, [], targetFinish, useCondition);
  const rows = [...byYear.values()].sort((a, b) => Number(b?.year || 0) - Number(a?.year || 0));
  if (!rows.length) {
    return {
      ...(seed || {}), score:null, rawScore:null, strongest:null, rows:[], targetFinish:Number(targetFinish),
      strongYears:0, supportYears:0, latestScore:null, coverageYears:0
    };
  }
  const strongest = strongestRowV1691F61(rows);
  return {
    ...(seed || {}),
    score:strongest?.score ?? null,
    rawScore:strongest?.rawScore ?? strongest?.score ?? null,
    strongest,
    rows,
    targetFinish:Number(targetFinish),
    strongYears:rows.filter(r => Number(r?.score || 0) >= 85).length,
    supportYears:rows.filter(r => Number(r?.score || 0) >= 70).length,
    latestScore:rows[0]?.score ?? null,
    coverageYears:rows.length
  };
}

function allHistoricalV1691F61(models = {}) {
  try {
    if (typeof uniqueHistoricalRacesV11 === 'function') return uniqueHistoricalRacesV11(models);
  } catch {}
  const map = new Map();
  for (const type of ['EXACT','CONDITION_TWIN','RACE_FAMILY']) {
    for (const race of Array.isArray(models?.[type]) ? models[type] : []) {
      const key = [race?.date, race?.city, race?.raceNo].join('|');
      if (!map.has(key)) map.set(key, race);
    }
  }
  return [...map.values()];
}

function compositeRawV1691F61(channels) {
  try {
    if (typeof weightedCompositePodiumV115 === 'function') {
      const out = weightedCompositePodiumV115(channels, true) || {};
      return { ...out, rawScore:out.score ?? null };
    }
  } catch {}
  try {
    if (typeof compositeScoreV11 === 'function') {
      const out = compositeScoreV11(channels) || {};
      return { ...out, rawScore:out.score ?? null };
    }
  } catch {}
  return { score:null, rawScore:null, present:[], missing:['exact','twin','family','career'] };
}

async function placementV1691F61(career, roadmap, targetFinish) {
  const exact = await scoreFinishCoopV1691F61(career, roadmap?.models?.EXACT || [], targetFinish, true);
  await yieldUiV1691F61();
  const twin = await scoreFinishCoopV1691F61(career, roadmap?.models?.CONDITION_TWIN || [], targetFinish, true);
  await yieldUiV1691F61();
  const family = await scoreFinishCoopV1691F61(career, roadmap?.models?.RACE_FAMILY || [], targetFinish, true);
  await yieldUiV1691F61();
  const careerScore = await scoreFinishCoopV1691F61(career, allHistoricalV1691F61(roadmap?.models || {}), targetFinish, false);
  const composite = compositeRawV1691F61({ exact, twin, family, career:careerScore });
  let analysisMode = null;
  try { if (typeof modePodiumV115 === 'function') analysisMode = modePodiumV115(career); } catch {}
  try { if (!analysisMode && typeof analysisModeV11 === 'function') analysisMode = analysisModeV11(career); } catch {}
  return { targetFinish:Number(targetFinish), analysisMode:analysisMode || 'DEBUT', exact, twin, family, career:careerScore, composite };
}

async function repairByFinishV1691F61(race, result, progress) {
  if (!result || result?.roadmapOk === false || hasByFinishV1691F61(result)) return result;
  const raceHorses = Array.isArray(race?.horses) ? race.horses : [];
  const resultHorses = Array.isArray(result?.horses) ? result.horses : [];
  if (!raceHorses.length || !resultHorses.length) return result;
  if (typeof scoreFinishRowsPodiumV115 !== 'function') {
    console.warn('[AT AI]', VERSION, 'Podium derece scorer runtime kapsaminda bulunamadi.');
    result.byFinishRepairError = 'PODIUM_SCORER_NOT_VISIBLE';
    return result;
  }
  if (typeof fetchModelRoadmapV11 !== 'function' || typeof loadCareerForHorseV11 !== 'function') {
    result.byFinishRepairError = 'ROADMAP_OR_CAREER_LOADER_MISSING';
    return result;
  }

  let roadmap, careers;
  try {
    const careerPromise = typeof mapLimitV11 === 'function'
      ? mapLimitV11(raceHorses, 3, horse => loadCareerForHorseV11(race.no, horse))
      : Promise.all(raceHorses.map(horse => loadCareerForHorseV11(race.no, horse)));
    [roadmap, careers] = await Promise.all([fetchModelRoadmapV11(race), careerPromise]);
  } catch (e) {
    result.byFinishRepairError = e?.message || 'F61 derece onarim verisi alinamadi.';
    return result;
  }
  if (!roadmap?.ok) {
    result.byFinishRepairError = roadmap?.error || 'F61 roadmap alinamadi.';
    return result;
  }

  for (let i = 0; i < Math.min(raceHorses.length, resultHorses.length); i++) {
    const item = resultHorses[i];
    item.scores = item?.scores && typeof item.scores === 'object' ? item.scores : {};
    const existing = item.scores.byFinish || {};
    if (existing?.[1] && existing?.[2] && existing?.[3]) continue;
    const horse = raceHorses[i];
    const career = careers?.[i] || { ok:false, roadmap:[], analysisMode:'DEBUT' };
    const byFinish = { ...existing };
    for (const finish of [1,2,3]) {
      if (byFinish[finish]) continue;
      try { progress?.(`Koşu ${race?.no}: ${horse?.no || ''}. ${horse?.name || 'At'} · ${finish}. derece modeli tamamlanıyor…`); } catch {}
      byFinish[finish] = await placementV1691F61(career, roadmap, finish);
      await yieldUiV1691F61();
    }
    item.scores.byFinish = byFinish;
    try { if (typeof PODIUM_SIMILARITY_V115 !== 'undefined') item.scores.podiumSimilarityVersion = PODIUM_SIMILARITY_V115; } catch {}
  }

  try {
    if (typeof applyModeAwarePodiumV115 === 'function') result.horses = applyModeAwarePodiumV115(resultHorses);
  } catch (e) {
    console.warn('[AT AI]', VERSION, 'mode-aware podium son islemi atlandi:', e?.message || e);
  }

  if (hasByFinishV1691F61(result)) {
    result.modelSchemaOk = true;
    delete result.modelSchemaError;
    delete result.byFinishRepairError;
    result.modelSchemaRecoveredBy = VERSION;
    result.byFinishRuntimeRepairVersion = VERSION;
    try { progress?.(`Koşu ${race?.no}: 1./2./3. derece model seması tamamlandı.`); } catch {}
  }
  return result;
}

prepareRaceModelsV11 = async function(race, progress) {
  const result = await beforePrepareV1691F61(race, progress);
  return repairByFinishV1691F61(race, result, progress);
};

window.ATCareerFiveModelByFinishRuntimeRepairV1691F61 = {
  VERSION,
  hasByFinish:hasByFinishV1691F61,
  repair:repairByFinishV1691F61
};

console.info('[AT AI]', VERSION, 'aktif — final 5 Model sonucunda eksik 1./2./3. derece semasi mevcut Podium scorer ile tamamlanir.');
})();
