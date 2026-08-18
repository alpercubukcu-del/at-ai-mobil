/* AT AI Mobil — V11 mode-aware decision layer
   WIN_PATH ile PREPARATION_PATH ham benzerlik yüzdeleri doğrudan karşılaştırılmaz.
   Her kanal önce kendi modunda sıralanır; ortak kupon karar skoru sıra + veri kapsamından üretilir.
*/

const TICKET_MODE_AWARE_VERSION = 'TICKET-MODE-AWARE-V11.0';
const prepareRaceModelsBaseV11 = prepareRaceModelsV11;
const buildOneTicketBaseV11 = buildOneTicketV11;

function rawSortV11(a, b, modelId) {
  const sa = a?.scores?.[modelId] || {};
  const sb = b?.scores?.[modelId] || {};
  const av = finiteV11(sa.score) ?? -1;
  const bv = finiteV11(sb.score) ?? -1;
  return bv-av || Number(sb.strongYears||0)-Number(sa.strongYears||0) ||
    Number(sb.supportYears||0)-Number(sa.supportYears||0) ||
    (finiteV11(sb.latestScore)??-1)-(finiteV11(sa.latestScore)??-1) ||
    Number(a?.horse?.no||999)-Number(b?.horse?.no||999);
}

function decisionScoreFromModeRankV11(index, size, coverageYears) {
  const rankBase = size <= 1 ? 100 : 100 - (index / Math.max(1, size - 1)) * 40;
  const coverage = Math.max(0, Number(coverageYears) || 0);
  const coverageFactor = 0.75 + 0.25 * Math.min(1, coverage / 3);
  return Math.round(rankBase * coverageFactor);
}

function applyModeAwareScoresV11(horses) {
  const list = Array.isArray(horses) ? horses : [];
  for (const modelId of ['exact','twin','family','career']) {
    for (const mode of ['WIN_PATH','PREPARATION_PATH']) {
      const group = list
        .filter(item => item?.scores?.analysisMode === mode && finiteV11(item?.scores?.[modelId]?.score) !== null)
        .sort((a,b) => rawSortV11(a,b,modelId));
      group.forEach((item, index) => {
        const score = item.scores[modelId];
        score.rawScore = score.score;
        score.modeRank = index + 1;
        score.modeSize = group.length;
        score.decisionScore = decisionScoreFromModeRankV11(index, group.length, score.coverageYears);
        score.score = score.decisionScore;
        score.modeAware = true;
      });
    }
    for (const item of list.filter(x => x?.scores?.analysisMode === 'DEBUT')) {
      if (item?.scores?.[modelId]) {
        item.scores[modelId].rawScore = item.scores[modelId].score;
        item.scores[modelId].score = null;
        item.scores[modelId].decisionScore = null;
        item.scores[modelId].modeAware = true;
      }
    }
  }

  for (const item of list) {
    item.scores.composite = {
      ...compositeScoreV11({
        exact:item.scores.exact,
        twin:item.scores.twin,
        family:item.scores.family,
        career:item.scores.career
      }),
      modeAware:true
    };
  }
  return list;
}

prepareRaceModelsV11 = async function(race, progress) {
  const result = await prepareRaceModelsBaseV11(race, progress);
  result.horses = applyModeAwareScoresV11(result.horses);
  result.modeAwareVersion = TICKET_MODE_AWARE_VERSION;
  return result;
};

buildOneTicketV11 = function(plan, model, raceDataMap, budget, unitPrice, requestedSingles) {
  const ticket = buildOneTicketBaseV11(plan, model, raceDataMap, budget, unitPrice, requestedSingles);
  ticket.modeAware = true;
  ticket.modeAwareVersion = TICKET_MODE_AWARE_VERSION;
  ticket.scoreRule = 'WIN_PATH ve PREPARATION_PATH ham yüzdeleri doğrudan karşılaştırılmaz; her modelde mod-içi sıra + veri kapsamı ortak karar skoruna çevrilir.';
  return ticket;
};

console.info('[AT AI]', TICKET_MODE_AWARE_VERSION, 'aktif');
