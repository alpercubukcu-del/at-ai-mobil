/* AT AI Mobil — Podium Similarity Rankings V11.5
   Mevcut V11 5-model motorunu dereceye duyarlı hale getirir.

   Her koşuda:
   - 1.lik yalnız tarihsel 1.lerle,
   - 2.lik yalnız tarihsel 2.lerle,
   - 3.lük yalnız tarihsel 3.lerle karşılaştırılır.

   Her derece için ayrı sıralamalar:
   Bileşik / Tam / İkiz / Aile / Kariyer.

   Korunan V11 kuralları:
   - Yıllar ortalanmaz; kanalın ham skoru en güçlü yıllık yoldur.
   - WIN_PATH ve PREPARATION_PATH ham yüzdeleri doğrudan karşılaştırılmaz.
     Önce her mod kendi içinde sıralanır; ortak sıralama karar puanıyla yapılır.
   - Bileşik: %40 Tam + %25 İkiz + %20 Aile + %15 Kariyer.
   - Eksik kanal sıfır sayılmaz; mevcut kanallar yeniden normalize edilir.
*/

const PODIUM_SIMILARITY_V115 = 'PODIUM-SIMILARITY-V11.5';
const horseModelScoresBeforeV115 = horseModelScoresV11;
const prepareRaceModelsBeforeV115 = prepareRaceModelsV11;
const renderCareerAnalysisBeforeV115 = renderCareerAnalysis;
let podiumRenderTokenV115 = 0;

function finitePodiumV115(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampPodiumV115(value, lo = 0, hi = 100) {
  const n = finitePodiumV115(value);
  return n === null ? null : Math.max(lo, Math.min(hi, n));
}

function modePodiumV115(career = {}) {
  if (career?.analysisMode === 'WIN_PATH' || career?.analysisMode === 'PREPARATION_PATH' || career?.analysisMode === 'DEBUT') {
    return career.analysisMode;
  }
  if (typeof analysisModeV11 === 'function') return analysisModeV11(career);
  const path = Array.isArray(career?.roadmap) ? career.roadmap : [];
  if (!path.length) return 'DEBUT';
  return path.some(row => Number(row?.finish ?? row?.rank ?? row?.sira) === 1) ? 'WIN_PATH' : 'PREPARATION_PATH';
}

function modeLabelPodiumV115(mode) {
  if (typeof modeLabelV11 === 'function') return modeLabelV11(mode);
  if (mode === 'WIN_PATH') return 'Galibiyet Yolu';
  if (mode === 'PREPARATION_PATH') return 'Hazırlık / İlk 5';
  return 'Debut';
}

function referencePathPodiumV115(ref, mode) {
  if (typeof referencePathV11 === 'function') return referencePathV11(ref, mode);
  if (typeof adaptiveReferencePath === 'function') return adaptiveReferencePath(ref, mode);
  if (mode === 'WIN_PATH') {
    return Array.isArray(ref?.career?.winsBefore)
      ? ref.career.winsBefore.filter(row => Number(row?.finish ?? row?.rank ?? row?.sira) === 1)
      : [];
  }
  const top5 = Array.isArray(ref?.career?.top5Before) ? ref.career.top5Before : [];
  return top5.length ? top5 : (Array.isArray(ref?.career?.preparationPathBefore) ? ref.career.preparationPathBefore : []);
}

function orderedPathScorePodiumV115(currentPath, historicalPath) {
  if (!Array.isArray(currentPath) || !currentPath.length || !Array.isArray(historicalPath) || !historicalPath.length) return null;
  if (typeof orderedPathSimilarity !== 'function') return null;
  const raw = Number(orderedPathSimilarity(currentPath, historicalPath));
  if (!Number.isFinite(raw)) return null;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

function scoreFinishRowsPodiumV115(career, historicalRaces, targetFinish, useCondition = true) {
  const path = Array.isArray(career?.roadmap) ? career.roadmap : [];
  const mode = modePodiumV115(career);
  if (!path.length || mode === 'DEBUT') {
    return {
      score:null, rawScore:null, strongest:null, rows:[], mode, targetFinish,
      strongYears:0, supportYears:0, latestScore:null, coverageYears:0,
      yearAggregation:'NONE'
    };
  }

  const byYear = new Map();
  for (const race of Array.isArray(historicalRaces) ? historicalRaces : []) {
    if (race?.ok === false) continue;
    const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4)) || null;
    if (!year) continue;

    const conditionScore = useCondition
      ? clampPodiumV115(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) ?? 0
      : 100;

    let best = null;
    for (const ref of Array.isArray(race?.top3) ? race.top3 : []) {
      if (Number(ref?.finish || 0) !== Number(targetFinish)) continue;
      const refPath = referencePathPodiumV115(ref, mode);
      if (!refPath.length) continue;
      const pathScore = orderedPathScorePodiumV115(path, refPath);
      if (pathScore === null) continue;
      const effectiveScore = Math.round(pathScore * conditionScore / 100);
      const candidate = {
        year,
        score:effectiveScore,
        pathScore,
        conditionScore,
        historicalHorse:ref?.horseName || '',
        historicalHorseId:ref?.horseId || '',
        historicalFinish:Number(ref?.finish || 0) || null,
        raceDate:race?.date || '',
        raceCity:race?.city || '',
        raceNo:race?.raceNo || '',
        referenceType:race?.referenceType || '',
        referenceLabel:race?.referenceLabel || '',
        calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
        targetFinish:Number(targetFinish)
      };
      if (!best || candidate.score > best.score ||
          (candidate.score === best.score && candidate.pathScore > best.pathScore)) {
        best = candidate;
      }
    }

    if (!best) continue;
    const previous = byYear.get(year);
    if (!previous || best.score > previous.score ||
        (best.score === previous.score && best.pathScore > previous.pathScore)) {
      byYear.set(year, best);
    }
  }

  const rows = [...byYear.values()].sort((a, b) => b.year - a.year);
  if (!rows.length) {
    return {
      score:null, rawScore:null, strongest:null, rows:[], mode, targetFinish,
      strongYears:0, supportYears:0, latestScore:null, coverageYears:0,
      yearAggregation:'NONE'
    };
  }

  const strongest = [...rows].sort((a, b) =>
    b.score - a.score || b.pathScore - a.pathScore || b.year - a.year
  )[0];

  return {
    score:strongest.score,
    rawScore:strongest.score,
    strongest,
    rows,
    mode,
    targetFinish,
    strongYears:rows.filter(row => row.score >= 85).length,
    supportYears:rows.filter(row => row.score >= 70).length,
    latestScore:rows[0]?.score ?? null,
    coverageYears:rows.length,
    yearAggregation:'NONE'
  };
}

function uniqueHistoricalPodiumV115(models = {}) {
  if (typeof uniqueHistoricalRacesV11 === 'function') return uniqueHistoricalRacesV11(models);
  const map = new Map();
  for (const type of ['EXACT', 'CONDITION_TWIN', 'RACE_FAMILY']) {
    for (const race of Array.isArray(models?.[type]) ? models[type] : []) {
      const key = [race?.date, race?.city, race?.raceNo].join('|');
      if (!map.has(key)) map.set(key, race);
    }
  }
  return [...map.values()];
}

function weightedCompositePodiumV115(channels, raw = false) {
  const weights = { exact:0.40, twin:0.25, family:0.20, career:0.15 };
  let weighted = 0;
  let usedWeight = 0;
  const present = [];

  for (const [id, weight] of Object.entries(weights)) {
    const channel = channels?.[id] || {};
    const value = raw
      ? finitePodiumV115(channel.rawScore ?? channel.score)
      : finitePodiumV115(channel.score);
    if (value === null) continue;
    weighted += value * weight;
    usedWeight += weight;
    present.push(id);
  }

  return {
    score:usedWeight > 0 ? Math.round(weighted / usedWeight) : null,
    usedWeight,
    present,
    missing:Object.keys(weights).filter(id => !present.includes(id))
  };
}

function placementScoresPodiumV115(career, roadmap, targetFinish) {
  const exact = scoreFinishRowsPodiumV115(career, roadmap?.models?.EXACT || [], targetFinish, true);
  const twin = scoreFinishRowsPodiumV115(career, roadmap?.models?.CONDITION_TWIN || [], targetFinish, true);
  const family = scoreFinishRowsPodiumV115(career, roadmap?.models?.RACE_FAMILY || [], targetFinish, true);
  const allHistorical = uniqueHistoricalPodiumV115(roadmap?.models || {});
  const careerScore = scoreFinishRowsPodiumV115(career, allHistorical, targetFinish, false);
  const composite = weightedCompositePodiumV115({ exact, twin, family, career:careerScore }, true);

  return {
    targetFinish:Number(targetFinish),
    analysisMode:modePodiumV115(career),
    exact,
    twin,
    family,
    career:careerScore,
    composite:{ ...composite, rawScore:composite.score }
  };
}

horseModelScoresV11 = function(career, roadmap) {
  const base = horseModelScoresBeforeV115(career, roadmap);
  return {
    ...base,
    podiumSimilarityVersion:PODIUM_SIMILARITY_V115,
    byFinish:{
      1:placementScoresPodiumV115(career, roadmap, 1),
      2:placementScoresPodiumV115(career, roadmap, 2),
      3:placementScoresPodiumV115(career, roadmap, 3)
    }
  };
};

function decisionScorePodiumV115(index, size, coverageYears) {
  if (typeof decisionScoreFromModeRankV11 === 'function') {
    return decisionScoreFromModeRankV11(index, size, coverageYears);
  }
  const rankBase = size <= 1 ? 100 : 100 - (index / Math.max(1, size - 1)) * 40;
  const coverage = Math.max(0, Number(coverageYears) || 0);
  const coverageFactor = 0.75 + 0.25 * Math.min(1, coverage / 3);
  return Math.round(rankBase * coverageFactor);
}

function rawSortPodiumV115(a, b, finish, modelId) {
  const sa = a?.scores?.byFinish?.[finish]?.[modelId] || {};
  const sb = b?.scores?.byFinish?.[finish]?.[modelId] || {};
  const av = finitePodiumV115(sa.rawScore ?? sa.score) ?? -1;
  const bv = finitePodiumV115(sb.rawScore ?? sb.score) ?? -1;
  return bv - av ||
    Number(sb?.strongYears || 0) - Number(sa?.strongYears || 0) ||
    Number(sb?.supportYears || 0) - Number(sa?.supportYears || 0) ||
    (finitePodiumV115(sb?.latestScore) ?? -1) - (finitePodiumV115(sa?.latestScore) ?? -1) ||
    Number(a?.horse?.no || 999) - Number(b?.horse?.no || 999);
}

function applyModeAwarePodiumV115(horses) {
  const list = Array.isArray(horses) ? horses : [];

  for (const finish of [1, 2, 3]) {
    for (const modelId of ['exact', 'twin', 'family', 'career']) {
      for (const mode of ['WIN_PATH', 'PREPARATION_PATH']) {
        const group = list
          .filter(item => {
            const placement = item?.scores?.byFinish?.[finish];
            const channel = placement?.[modelId];
            return placement?.analysisMode === mode && finitePodiumV115(channel?.score) !== null;
          })
          .sort((a, b) => rawSortPodiumV115(a, b, finish, modelId));

        group.forEach((item, index) => {
          const channel = item.scores.byFinish[finish][modelId];
          channel.rawScore = finitePodiumV115(channel.rawScore ?? channel.score);
          channel.modeRank = index + 1;
          channel.modeSize = group.length;
          channel.decisionScore = decisionScorePodiumV115(index, group.length, channel.coverageYears);
          channel.score = channel.decisionScore;
          channel.modeAware = true;
        });
      }

      for (const item of list) {
        const placement = item?.scores?.byFinish?.[finish];
        if (!placement || placement.analysisMode !== 'DEBUT') continue;
        const channel = placement?.[modelId];
        if (!channel) continue;
        channel.rawScore = finitePodiumV115(channel.rawScore ?? channel.score);
        channel.score = null;
        channel.decisionScore = null;
        channel.modeAware = true;
      }
    }

    for (const item of list) {
      const placement = item?.scores?.byFinish?.[finish];
      if (!placement) continue;
      const rawComposite = weightedCompositePodiumV115({
        exact:placement.exact,
        twin:placement.twin,
        family:placement.family,
        career:placement.career
      }, true);
      const decisionComposite = weightedCompositePodiumV115({
        exact:placement.exact,
        twin:placement.twin,
        family:placement.family,
        career:placement.career
      }, false);
      placement.composite = {
        ...decisionComposite,
        rawScore:rawComposite.score,
        analysisMode:placement.analysisMode,
        modeAware:true
      };
    }
  }
  return list;
}

prepareRaceModelsV11 = async function(race, progress) {
  const result = await prepareRaceModelsBeforeV115(race, progress);
  result.horses = applyModeAwarePodiumV115(result?.horses || []);
  result.podiumSimilarityVersion = PODIUM_SIMILARITY_V115;
  result.podiumRule = '1↔1, 2↔2, 3↔3; her derece için Bileşik/Tam/İkiz/Aile/Kariyer.';
  return result;
};

const PODIUM_MODEL_LABELS_V115 = {
  composite:'Bileşik', exact:'Tam', twin:'İkiz', family:'Aile', career:'Kariyer'
};

function modelRankingPodiumV115(data, finish, modelId) {
  return (Array.isArray(data?.horses) ? data.horses : [])
    .map(item => ({
      item,
      placement:item?.scores?.byFinish?.[finish] || null,
      channel:item?.scores?.byFinish?.[finish]?.[modelId] || null
    }))
    .filter(row => finitePodiumV115(row?.channel?.score) !== null)
    .sort((a, b) => {
      const as = finitePodiumV115(a.channel.score) ?? -1;
      const bs = finitePodiumV115(b.channel.score) ?? -1;
      const ar = finitePodiumV115(a.channel.rawScore) ?? -1;
      const br = finitePodiumV115(b.channel.rawScore) ?? -1;
      return bs - as || br - ar ||
        Number(b.channel?.coverageYears || 0) - Number(a.channel?.coverageYears || 0) ||
        Number(a.item?.horse?.no || 999) - Number(b.item?.horse?.no || 999);
    });
}

function scoreMetaPodiumV115(row, modelId) {
  const channel = row?.channel || {};
  const raw = finitePodiumV115(channel.rawScore);
  const bits = [modeLabelPodiumV115(row?.placement?.analysisMode || 'DEBUT')];
  if (raw !== null) bits.push(`ham %${raw}`);
  if (modelId === 'composite') {
    const coverage = Array.isArray(channel.present) ? channel.present.length : 0;
    if (coverage) bits.push(`${coverage}/4 kanal`);
  } else {
    const coverageYears = Number(channel.coverageYears || 0);
    if (coverageYears) bits.push(`${coverageYears} yıl`);
  }
  return bits.join(' · ');
}

function modelBlockPodiumV115(data, finish, modelId, open = false) {
  const rows = modelRankingPodiumV115(data, finish, modelId);
  const label = PODIUM_MODEL_LABELS_V115[modelId] || modelId;
  const total = Array.isArray(data?.horses) ? data.horses.length : 0;
  const missing = Math.max(0, total - rows.length);

  return `
    <details class="podium-model-v115" ${open ? 'open' : ''}>
      <summary>
        <span>${escapeHtml(label)}</span>
        <span class="podium-model-leader-v115">${rows.length
          ? `${escapeHtml(rows[0].item?.horse?.no || '')}. ${escapeHtml(rows[0].item?.horse?.name || '')} · ${escapeHtml(rows[0].channel.score)} puan`
          : 'veri yok'}</span>
      </summary>
      <div class="podium-ranking-list-v115">
        ${rows.length ? rows.map((row, index) => `
          <div class="podium-ranking-row-v115">
            <div class="podium-rank-v115">${index + 1}</div>
            <div class="podium-horse-v115">
              <b>${escapeHtml(row.item?.horse?.no || '')}. ${escapeHtml(row.item?.horse?.name || '-')}</b>
              <small>${escapeHtml(scoreMetaPodiumV115(row, modelId))}</small>
            </div>
            <div class="podium-score-v115">${escapeHtml(row.channel.score)}<small>puan</small></div>
          </div>
        `).join('') : `<div class="podium-empty-v115">Bu modelde ${escapeHtml(finish)}. sıra için karşılaştırılabilir tarihsel yol bulunamadı.</div>`}
        ${missing > 0 && rows.length ? `<div class="podium-missing-v115">${escapeHtml(missing)} atta bu model için yeterli veri yok.</div>` : ''}
      </div>
    </details>`;
}

function finishBlockPodiumV115(data, finish, open = false) {
  const leader = modelRankingPodiumV115(data, finish, 'composite')[0] || null;
  const medal = finish === 1 ? '🥇' : finish === 2 ? '🥈' : '🥉';
  const label = finish === 1 ? '1.LİK' : finish === 2 ? '2.LİK' : '3.LÜK';

  return `
    <details class="podium-finish-v115" ${open ? 'open' : ''}>
      <summary>
        <span>${medal} ${label}</span>
        <span class="podium-finish-leader-v115">${leader
          ? `Bileşik: ${escapeHtml(leader.item?.horse?.no || '')}. ${escapeHtml(leader.item?.horse?.name || '')} · ${escapeHtml(leader.channel.score)}`
          : 'Bileşik veri yok'}</span>
      </summary>
      <div class="podium-finish-body-v115">
        ${modelBlockPodiumV115(data, finish, 'composite', true)}
        ${modelBlockPodiumV115(data, finish, 'exact')}
        ${modelBlockPodiumV115(data, finish, 'twin')}
        ${modelBlockPodiumV115(data, finish, 'family')}
        ${modelBlockPodiumV115(data, finish, 'career')}
      </div>
    </details>`;
}

function podiumRaceShellV115(race, open = false) {
  return `<details class="podium-race-v115" data-podium-race="${escapeHtml(race?.no)}" ${open ? 'open' : ''}>
    <summary>
      <div><b>${escapeHtml(race?.no)}. Koşu</b><small>${escapeHtml(race?.class || '')} · ${escapeHtml(race?.ageGroup || '')} · ${escapeHtml(race?.distance || '')} ${escapeHtml(race?.track || '')}</small></div>
      <span>1 · 2 · 3 ▾</span>
    </summary>
    <div class="podium-loading-v115">1.lik / 2.lik / 3.lük için 5 model sıralamaları hazırlanıyor…</div>
  </details>`;
}

function podiumRaceBodyV115(data) {
  return `
    <div class="podium-note-v115">
      1.lik adayı yalnız geçmiş 1.lerle; 2.lik adayı yalnız geçmiş 2.lerle; 3.lük adayı yalnız geçmiş 3.lerle karşılaştırılır.
      Ana sıra mod-içi karar puanıdır; ham benzerlik yüzdesi korunur ve yıllar ortalanmaz.
    </div>
    ${finishBlockPodiumV115(data, 1, true)}
    ${finishBlockPodiumV115(data, 2, false)}
    ${finishBlockPodiumV115(data, 3, false)}`;
}

async function hydratePodiumV115(races, token) {
  for (const race of races) {
    if (token !== podiumRenderTokenV115) return;
    const selector = `[data-podium-race="${String(race?.no).replace(/"/g, '\\"')}"]`;
    const shell = document.querySelector(selector);
    if (!shell) continue;
    try {
      const data = typeof getCareerRaceModelsV112 === 'function'
        ? await getCareerRaceModelsV112(race)
        : await prepareRaceModelsV11(race);
      if (token !== podiumRenderTokenV115) return;
      shell.innerHTML = `<summary>
          <div><b>${escapeHtml(race?.no)}. Koşu</b><small>${escapeHtml(race?.class || '')} · ${escapeHtml(race?.ageGroup || '')} · ${escapeHtml(race?.distance || '')} ${escapeHtml(race?.track || '')}</small></div>
          <span>1 · 2 · 3 ▾</span>
        </summary>${podiumRaceBodyV115(data)}`;
    } catch (e) {
      shell.innerHTML = `<summary><div><b>${escapeHtml(race?.no)}. Koşu</b></div><span>1 · 2 · 3 ▾</span></summary>
        <div class="podium-empty-v115">⚠ ${escapeHtml(e?.message || 'İlk 3 benzerlik sıralaması hazırlanamadı.')}</div>`;
    }
  }
}

renderCareerAnalysis = function(result, raceFilter = null) {
  renderCareerAnalysisBeforeV115(result, raceFilter);
  const content = $('analysisContent');
  if (!content) return;

  const filter = raceFilter || $('analysisRace')?.value || 'all';
  const races = filter === 'all'
    ? (Array.isArray(state.races) ? state.races : [])
    : (Array.isArray(state.races) ? state.races.filter(race => String(race?.no) === String(filter)) : []);
  if (!races.length) return;

  const old = $('careerPodiumV115');
  if (old) old.remove();

  const section = document.createElement('section');
  section.id = 'careerPodiumV115';
  section.className = 'podium-panel-v115';
  section.innerHTML = `
    <div class="podium-panel-head-v115">
      <div><b>1. · 2. · 3. BENZERLİK SIRALAMALARI</b><small>Her derece için Bileşik · Tam · İkiz · Aile · Kariyer</small></div>
      <span>V11.5</span>
    </div>
    <div class="podium-races-v115">
      ${races.map((race, index) => podiumRaceShellV115(race, races.length === 1 || index === 0)).join('')}
    </div>`;

  const fiveModelSection = $('careerFiveModelV112');
  if (fiveModelSection && fiveModelSection.parentNode === content) fiveModelSection.after(section);
  else content.prepend(section);

  const token = ++podiumRenderTokenV115;
  hydratePodiumV115(races, token);
};

console.info('[AT AI]', PODIUM_SIMILARITY_V115, 'aktif');
