/* AT AI Mobil — Podium Similarity Rankings V11.5
   Her koşuda 1.lik / 2.lik / 3.lük için ayrı tarihsel yol sıralaması üretir.
   Kanallar: Bileşik, Tam, İkiz, Aile, Kariyer.

   Temel kurallar:
   - 1.lik yalnız geçmiş yarışların 1.leriyle, 2.lik yalnız 2.leriyle,
     3.lük yalnız 3.leriyle karşılaştırılır.
   - Kaynak yıllar birbirine ortalanmaz; kanal skoru en güçlü yıllık yoldur.
   - WIN_PATH ve PREPARATION_PATH ham yüzdeleri doğrudan karşılaştırılmaz.
     Her kanal/mod önce kendi içinde sıralanır; ortak sıralama mod-içi karar puanıyla yapılır.
   - Bileşik ağırlıkları V11 ile aynıdır: %40 Tam + %25 İkiz + %20 Aile + %15 Kariyer.
   - Eksik kanal sıfır değildir; mevcut kanallar yeniden normalize edilir.
*/

const PODIUM_SIMILARITY_V115 = 'PODIUM-SIMILARITY-V11.5';
const calculateGalibiyetBenzerligiBeforeV115 = calculateGalibiyetBenzerligi;
const runCareerAnalysisBeforeV115 = runCareerAnalysis;
const isValidCareerCacheBeforeV115 = isValidCareerCache;
const careerRaceAccordionHtmlBeforeV115 = careerRaceAccordionHtml;

function finitePodiumV115(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampPodiumV115(value, lo = 0, hi = 100) {
  const n = finitePodiumV115(value);
  return n === null ? null : Math.max(lo, Math.min(hi, n));
}

function modePodiumV115(path) {
  const rows = Array.isArray(path) ? path : [];
  if (typeof adaptiveCurrentMode === 'function') return adaptiveCurrentMode(rows);
  if (!rows.length) return 'DEBUT';
  return rows.some(row => Number(row?.finish ?? row?.rank ?? row?.sira) === 1)
    ? 'WIN_PATH'
    : 'PREPARATION_PATH';
}

function modeLabelPodiumV115(mode) {
  if (mode === 'WIN_PATH') return 'Galibiyet Yolu';
  if (mode === 'PREPARATION_PATH') return 'Hazırlık / İlk 5';
  return 'Debut';
}

function referencePathPodiumV115(ref, mode) {
  if (typeof adaptiveReferencePath === 'function') return adaptiveReferencePath(ref, mode);
  if (mode === 'WIN_PATH') {
    return Array.isArray(ref?.career?.winsBefore)
      ? ref.career.winsBefore.filter(row => Number(row?.finish ?? row?.rank ?? row?.sira) === 1)
      : [];
  }
  const top5 = Array.isArray(ref?.career?.top5Before) ? ref.career.top5Before : [];
  if (top5.length) return top5;
  return Array.isArray(ref?.career?.preparationPathBefore) ? ref.career.preparationPathBefore : [];
}

function orderedPathScorePodiumV115(currentPath, historicalPath) {
  if (!Array.isArray(currentPath) || !currentPath.length || !Array.isArray(historicalPath) || !historicalPath.length) return null;
  if (typeof orderedPathSimilarity !== 'function') return null;
  const raw = Number(orderedPathSimilarity(currentPath, historicalPath));
  if (!Number.isFinite(raw)) return null;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

function scoreFinishRowsPodiumV115(currentPath, historicalRaces, targetFinish, useCondition = true) {
  const path = Array.isArray(currentPath) ? [...currentPath] : [];
  const mode = modePodiumV115(path);
  if (!path.length || mode === 'DEBUT') {
    return {
      score:null,
      strongest:null,
      rows:[],
      mode,
      targetFinish,
      strongYears:0,
      supportYears:0,
      latestScore:null,
      coverageYears:0
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
      score:null,
      strongest:null,
      rows:[],
      mode,
      targetFinish,
      strongYears:0,
      supportYears:0,
      latestScore:null,
      coverageYears:0
    };
  }

  const strongest = [...rows].sort((a, b) =>
    b.score - a.score || b.pathScore - a.pathScore || b.year - a.year
  )[0];

  return {
    score:strongest.score,
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

function weightedCompositePodiumV115(channels, preferRaw = false) {
  const weights = { exact:0.40, twin:0.25, family:0.20, career:0.15 };
  let weighted = 0;
  let usedWeight = 0;
  const present = [];

  for (const [id, weight] of Object.entries(weights)) {
    const channel = channels?.[id] || {};
    const value = preferRaw
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

function placementChannelsPodiumV115(currentPath, roadmapData, targetFinish) {
  const all = Array.isArray(roadmapData?.historicalRaces)
    ? roadmapData.historicalRaces.filter(race => race?.ok !== false)
    : [];
  const exactRaces = all.filter(race => String(race?.referenceType || 'EXACT') === 'EXACT');
  const twinRaces = all.filter(race => String(race?.referenceType || '') === 'CONDITION_TWIN');
  const familyRaces = all.filter(race => String(race?.referenceType || '') === 'RACE_FAMILY');

  const exact = scoreFinishRowsPodiumV115(currentPath, exactRaces, targetFinish, true);
  const twin = scoreFinishRowsPodiumV115(currentPath, twinRaces, targetFinish, true);
  const family = scoreFinishRowsPodiumV115(currentPath, familyRaces, targetFinish, true);
  const career = scoreFinishRowsPodiumV115(currentPath, all, targetFinish, false);
  const composite = weightedCompositePodiumV115({ exact, twin, family, career });

  return {
    targetFinish:Number(targetFinish),
    analysisMode:modePodiumV115(currentPath),
    exact,
    twin,
    family,
    career,
    composite:{ ...composite, rawScore:composite.score }
  };
}

calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
  const base = calculateGalibiyetBenzerligiBeforeV115(currentPath, roadmapData);
  return {
    ...base,
    podiumSimilarityVersion:PODIUM_SIMILARITY_V115,
    byFinish:{
      1:placementChannelsPodiumV115(currentPath, roadmapData, 1),
      2:placementChannelsPodiumV115(currentPath, roadmapData, 2),
      3:placementChannelsPodiumV115(currentPath, roadmapData, 3)
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
  const sa = a?.galibiyetBenzerligi?.byFinish?.[finish]?.[modelId] || {};
  const sb = b?.galibiyetBenzerligi?.byFinish?.[finish]?.[modelId] || {};
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
            const placement = item?.galibiyetBenzerligi?.byFinish?.[finish];
            const channel = placement?.[modelId];
            return placement?.analysisMode === mode && finitePodiumV115(channel?.score) !== null;
          })
          .sort((a, b) => rawSortPodiumV115(a, b, finish, modelId));

        group.forEach((item, index) => {
          const channel = item.galibiyetBenzerligi.byFinish[finish][modelId];
          channel.rawScore = finitePodiumV115(channel.rawScore ?? channel.score);
          channel.modeRank = index + 1;
          channel.modeSize = group.length;
          channel.decisionScore = decisionScorePodiumV115(index, group.length, channel.coverageYears);
          channel.score = channel.decisionScore;
          channel.modeAware = true;
        });
      }

      for (const item of list) {
        const placement = item?.galibiyetBenzerligi?.byFinish?.[finish];
        if (!placement || placement.analysisMode !== 'DEBUT') continue;
        if (placement[modelId]) {
          placement[modelId].rawScore = finitePodiumV115(placement[modelId].rawScore ?? placement[modelId].score);
          placement[modelId].score = null;
          placement[modelId].decisionScore = null;
          placement[modelId].modeAware = true;
        }
      }
    }

    for (const item of list) {
      const placement = item?.galibiyetBenzerligi?.byFinish?.[finish];
      if (!placement) continue;
      const rawComposite = weightedCompositePodiumV115({
        exact:{ score:placement.exact?.rawScore ?? placement.exact?.score },
        twin:{ score:placement.twin?.rawScore ?? placement.twin?.score },
        family:{ score:placement.family?.rawScore ?? placement.family?.score },
        career:{ score:placement.career?.rawScore ?? placement.career?.score }
      });
      const decisionComposite = weightedCompositePodiumV115({
        exact:placement.exact,
        twin:placement.twin,
        family:placement.family,
        career:placement.career
      });
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

isValidCareerCache = function(cached) {
  return Boolean(
    isValidCareerCacheBeforeV115(cached) &&
    cached?.podiumSimilarityV115 === true &&
    Array.isArray(cached?.races) &&
    cached.races.every(race =>
      Array.isArray(race?.horses) &&
      race.horses.every(item => {
        const byFinish = item?.galibiyetBenzerligi?.byFinish;
        return byFinish && byFinish[1] && byFinish[2] && byFinish[3];
      })
    )
  );
};

if (state?.analyses?.career && !state.analyses.career.podiumSimilarityV115) {
  state.analyses.career = {};
  save();
}

runCareerAnalysis = async function(selectedRaces, raceValue) {
  await runCareerAnalysisBeforeV115(selectedRaces, raceValue);
  const careerAnalysis = state?.analyses?.career;
  if (!careerAnalysis || !Array.isArray(careerAnalysis.races)) return;

  for (const race of careerAnalysis.races) {
    race.horses = applyModeAwarePodiumV115(race.horses);
    race.podiumSimilarityVersion = PODIUM_SIMILARITY_V115;
  }

  careerAnalysis.podiumSimilarityV115 = true;
  careerAnalysis.podiumSimilarityVersion = PODIUM_SIMILARITY_V115;
  careerAnalysis.podiumRule = '1.lik yalnız tarihsel 1.lerle; 2.lik yalnız tarihsel 2.lerle; 3.lük yalnız tarihsel 3.lerle. Her sıra için Bileşik/Tam/İkiz/Aile/Kariyer ayrı sıralanır.';
  save();
};

const PODIUM_MODEL_LABELS_V115 = {
  composite:'Bileşik',
  exact:'Tam',
  twin:'İkiz',
  family:'Aile',
  career:'Kariyer'
};

function modelRankingPodiumV115(race, finish, modelId) {
  const rows = (Array.isArray(race?.horses) ? race.horses : [])
    .map(item => ({
      item,
      channel:item?.galibiyetBenzerligi?.byFinish?.[finish]?.[modelId] || null,
      placement:item?.galibiyetBenzerligi?.byFinish?.[finish] || null
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
  return rows;
}

function scoreMetaPodiumV115(row, modelId) {
  const channel = row?.channel || {};
  const placement = row?.placement || {};
  const raw = finitePodiumV115(channel.rawScore);
  const coverage = modelId === 'composite'
    ? (Array.isArray(channel.present) ? channel.present.length : 0)
    : Number(channel.coverageYears || 0);
  const bits = [];
  bits.push(modeLabelPodiumV115(placement.analysisMode));
  if (raw !== null) bits.push(`ham %${raw}`);
  if (modelId === 'composite') {
    if (coverage) bits.push(`${coverage}/4 kanal`);
  } else if (coverage) {
    bits.push(`${coverage} yıl`);
  }
  return bits.join(' · ');
}

function modelBlockPodiumV115(race, finish, modelId, open = false) {
  const rows = modelRankingPodiumV115(race, finish, modelId);
  const label = PODIUM_MODEL_LABELS_V115[modelId] || modelId;
  const emptyCount = (Array.isArray(race?.horses) ? race.horses.length : 0) - rows.length;

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
        `).join('') : `
          <div class="podium-empty-v115">Bu modelde ${escapeHtml(finish)}. sıra için karşılaştırılabilir tarihsel yol bulunamadı.</div>
        `}
        ${emptyCount > 0 && rows.length ? `<div class="podium-missing-v115">${escapeHtml(emptyCount)} atta bu model için yeterli veri yok.</div>` : ''}
      </div>
    </details>`;
}

function finishLeaderPodiumV115(race, finish) {
  return modelRankingPodiumV115(race, finish, 'composite')[0] || null;
}

function finishBlockPodiumV115(race, finish, open = false) {
  const leader = finishLeaderPodiumV115(race, finish);
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
        ${modelBlockPodiumV115(race, finish, 'composite', true)}
        ${modelBlockPodiumV115(race, finish, 'exact')}
        ${modelBlockPodiumV115(race, finish, 'twin')}
        ${modelBlockPodiumV115(race, finish, 'family')}
        ${modelBlockPodiumV115(race, finish, 'career')}
      </div>
    </details>`;
}

function podiumRaceHtmlV115(race) {
  const hasPodium = (Array.isArray(race?.horses) ? race.horses : []).some(item =>
    item?.galibiyetBenzerligi?.byFinish?.[1] ||
    item?.galibiyetBenzerligi?.byFinish?.[2] ||
    item?.galibiyetBenzerligi?.byFinish?.[3]
  );
  if (!hasPodium) return '';

  return `
    <section class="podium-panel-v115">
      <div class="podium-panel-head-v115">
        <div>
          <b>İLK 3 BENZERLİK SIRALAMASI</b>
          <small>Geçmişteki aynı dereceyle karşılaştırılır: 1↔1, 2↔2, 3↔3.</small>
        </div>
        <span>5 MODEL</span>
      </div>
      <div class="podium-note-v115">
        Ana sıra, Galibiyet Yolu ile Hazırlık/İlk 5 yüzdelerini doğrudan karıştırmaz; önce mod-içi sıra ortak karar puanına çevrilir. Ham yüzde detayda korunur. Yıllar ortalanmaz.
      </div>
      ${finishBlockPodiumV115(race, 1, true)}
      ${finishBlockPodiumV115(race, 2, false)}
      ${finishBlockPodiumV115(race, 3, false)}
    </section>`;
}

careerRaceAccordionHtml = function(race, forceOpen) {
  const baseHtml = careerRaceAccordionHtmlBeforeV115(race, forceOpen);
  const podiumHtml = podiumRaceHtmlV115(race);
  if (!podiumHtml) return baseHtml;

  const marker = '<div class="career-race-body-v104">';
  if (String(baseHtml).includes(marker)) {
    return String(baseHtml).replace(marker, `${marker}${podiumHtml}`);
  }
  return `${baseHtml}${podiumHtml}`;
};

console.info('[AT AI]', PODIUM_SIMILARITY_V115, 'aktif');
