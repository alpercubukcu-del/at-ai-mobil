/* AT AI Mobil — Full Historical Path & Raw Similarity V11.9
   - Bugünkü at: hedef tarihten önceki TÜM yarışları.
   - Tarihsel 1./2./3.: referans yarıştan önceki TÜM yarışları.
   - 1↔1, 2↔2, 3↔3 kuralı korunur.
   - Ham tarihsel benzerlik sıralamanın ana değeridir; mod-içi karar puanı ham skoru ezmez.
*/

const HISTORICAL_PATH_V119 = 'HISTORICAL-FULL-PATH-V11.9';

function dateKeyPathV119(row = {}) {
  const iso = String(row?.isoDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const raw = String(row?.date || '').trim();
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : raw;
}

function chronologicalPathV119(rows) {
  return (Array.isArray(rows) ? [...rows] : [])
    .filter(Boolean)
    .sort((a,b) => dateKeyPathV119(a).localeCompare(dateKeyPathV119(b)));
}

function fullCurrentPathV119(career = {}) {
  const candidates = [
    career?.comparisonPath,
    career?.history,
    career?.fullPath,
    career?.roadmap
  ];
  for (const rows of candidates) {
    if (Array.isArray(rows) && rows.length) return chronologicalPathV119(rows);
  }
  return [];
}

function fullReferencePathV119(ref = {}) {
  const c = ref?.career || {};
  const candidates = [
    c?.fullPathBefore,
    c?.historyBefore,
    c?.roadmapBefore,
    c?.comparisonPathBefore,
    c?.history
  ];
  for (const rows of candidates) {
    if (Array.isArray(rows) && rows.length) return chronologicalPathV119(rows);
  }
  return [];
}

function normalizeCareerFullPathV119(career) {
  if (!career || typeof career !== 'object') return career;
  if (career?.ok === false) return career;
  const full = fullCurrentPathV119(career);
  const wins = Array.isArray(career?.wins)
    ? chronologicalPathV119(career.wins)
    : full.filter(row => Number(row?.finish ?? row?.rank ?? row?.sira) === 1);
  const top5 = Array.isArray(career?.top5)
    ? chronologicalPathV119(career.top5)
    : full.filter(row => {
        const f = Number(row?.finish ?? row?.rank ?? row?.sira);
        return f >= 1 && f <= 5;
      });
  const mode = wins.length ? 'WIN_PATH' : full.length ? 'PREPARATION_PATH' : 'DEBUT';
  return {
    ...career,
    history:Array.isArray(career?.history) ? chronologicalPathV119(career.history) : full,
    roadmap:full,
    races:full,
    comparisonPath:full,
    wins,
    top5,
    analysisMode:mode,
    fullPathVersion:HISTORICAL_PATH_V119,
    pathRule:'Hedef tarihten önceki tüm yarışlar karşılaştırılır.'
  };
}

/* Güncel at kariyerini wins-only/prep-only yoluna daraltma. */
if (typeof fetchCareer === 'function') {
  const fetchCareerBeforeV119 = fetchCareer;
  fetchCareer = async function(...args) {
    return normalizeCareerFullPathV119(await fetchCareerBeforeV119(...args));
  };
}

if (typeof loadCareerForHorseV11 === 'function') {
  const loadCareerBeforeV119 = loadCareerForHorseV11;
  loadCareerForHorseV11 = async function(...args) {
    return normalizeCareerFullPathV119(await loadCareerBeforeV119(...args));
  };
}

/* Tarihsel referansta yalnız winsBefore/top5Before değil tüm yarış öncesi yol kullanılır. */
const adaptiveReferencePathBeforeV119 = typeof adaptiveReferencePath === 'function' ? adaptiveReferencePath : null;
adaptiveReferencePath = function(ref, mode) {
  const full = fullReferencePathV119(ref);
  if (full.length) return full;
  return adaptiveReferencePathBeforeV119 ? adaptiveReferencePathBeforeV119(ref, mode) : [];
};

if (typeof referencePathV11 === 'function') {
  const referencePathBeforeV119 = referencePathV11;
  referencePathV11 = function(ref, mode) {
    const full = fullReferencePathV119(ref);
    if (full.length) return full;
    return referencePathBeforeV119(ref, mode);
  };
}

if (typeof referencePathPodiumV115 === 'function') {
  const referencePathPodiumBeforeV119 = referencePathPodiumV115;
  referencePathPodiumV115 = function(ref, mode) {
    const full = fullReferencePathV119(ref);
    if (full.length) return full;
    return referencePathPodiumBeforeV119(ref, mode);
  };
}

/*
 * Eski mode-aware katmanı ham benzerliği 60–100 arası karar puanına çeviriyordu.
 * Artık modeRank/decisionScore sadece tanı bilgisidir; sıralama score = ham benzerliktir.
 */
if (typeof applyModeAwareScoresV11 === 'function') {
  applyModeAwareScoresV11 = function(horses) {
    const list = Array.isArray(horses) ? horses : [];
    for (const modelId of ['exact','twin','family','career']) {
      for (const mode of ['WIN_PATH','PREPARATION_PATH']) {
        const group = list
          .filter(item => item?.scores?.analysisMode === mode && finiteV11(item?.scores?.[modelId]?.score) !== null)
          .sort((a,b) => rawSortV11(a,b,modelId));
        group.forEach((item,index) => {
          const ch = item.scores[modelId];
          const raw = finiteV11(ch?.rawScore ?? ch?.score);
          ch.rawScore = raw;
          ch.score = raw;
          ch.modeRank = index + 1;
          ch.modeSize = group.length;
          ch.decisionScore = typeof decisionScoreFromModeRankV11 === 'function'
            ? decisionScoreFromModeRankV11(index, group.length, ch.coverageYears)
            : null;
          ch.modeAware = true;
          ch.rankingBasis = 'RAW_FULL_HISTORICAL_PATH';
        });
      }
      for (const item of list.filter(x => x?.scores?.analysisMode === 'DEBUT')) {
        const ch = item?.scores?.[modelId];
        if (!ch) continue;
        ch.rawScore = finiteV11(ch?.rawScore ?? ch?.score);
        ch.score = null;
        ch.decisionScore = null;
        ch.rankingBasis = 'NO_CAREER_PATH';
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
        modeAware:true,
        rankingBasis:'RAW_FULL_HISTORICAL_PATH'
      };
      item.scores.fullHistoricalPathVersion = HISTORICAL_PATH_V119;
    }
    return list;
  };
}

if (typeof applyModeAwarePodiumV115 === 'function') {
  applyModeAwarePodiumV115 = function(horses) {
    const list = Array.isArray(horses) ? horses : [];
    for (const finish of [1,2,3]) {
      for (const modelId of ['exact','twin','family','career']) {
        for (const mode of ['WIN_PATH','PREPARATION_PATH']) {
          const group = list
            .filter(item => {
              const placement = item?.scores?.byFinish?.[finish];
              const channel = placement?.[modelId];
              return placement?.analysisMode === mode && finitePodiumV115(channel?.score) !== null;
            })
            .sort((a,b) => rawSortPodiumV115(a,b,finish,modelId));
          group.forEach((item,index) => {
            const ch = item.scores.byFinish[finish][modelId];
            const raw = finitePodiumV115(ch?.rawScore ?? ch?.score);
            ch.rawScore = raw;
            ch.score = raw;
            ch.modeRank = index + 1;
            ch.modeSize = group.length;
            ch.decisionScore = typeof decisionScorePodiumV115 === 'function'
              ? decisionScorePodiumV115(index, group.length, ch.coverageYears)
              : null;
            ch.modeAware = true;
            ch.rankingBasis = 'RAW_FULL_HISTORICAL_PATH';
          });
        }
        for (const item of list) {
          const placement = item?.scores?.byFinish?.[finish];
          if (!placement || placement.analysisMode !== 'DEBUT') continue;
          const ch = placement?.[modelId];
          if (!ch) continue;
          ch.rawScore = finitePodiumV115(ch?.rawScore ?? ch?.score);
          ch.score = null;
          ch.decisionScore = null;
          ch.rankingBasis = 'NO_CAREER_PATH';
        }
      }
      for (const item of list) {
        const p = item?.scores?.byFinish?.[finish];
        if (!p) continue;
        const rawComposite = weightedCompositePodiumV115({ exact:p.exact, twin:p.twin, family:p.family, career:p.career }, true);
        p.composite = {
          ...rawComposite,
          score:rawComposite.score,
          rawScore:rawComposite.score,
          analysisMode:p.analysisMode,
          modeAware:true,
          rankingBasis:'RAW_FULL_HISTORICAL_PATH'
        };
      }
    }
    return list;
  };
}

/* Eski sonuçların yeni algoritmayla karışmasını önle. */
try {
  if (typeof state === 'object' && state && state.historicalPathVersion !== HISTORICAL_PATH_V119) {
    state.historicalPathVersion = HISTORICAL_PATH_V119;
    if (state.analyses && typeof state.analyses === 'object') {
      state.analyses.career = {};
      state.analyses.calibration = {};
      state.analyses.historical = {};
    }
    if (typeof save === 'function') save();
  }
} catch (e) {
  console.warn('[AT AI] V11.9 cache yenileme uyarısı:', e?.message || e);
}

console.info('[AT AI]', HISTORICAL_PATH_V119, 'aktif — tam yarış öncesi yol + ham benzerlik sıralaması');