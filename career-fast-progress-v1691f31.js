/* AT AI Mobil - V16.9.1F31 CAREER FAST PROGRESS
   - The old all-races Career run fetched roadmaps 2 at a time and then scored each race in one long UI block.
   - This version keeps the same scoring function, but raises safe concurrency and yields between horse scores.
   - It also saves/render-unlocks a fresh cache version so stale slow runs do not get reused.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FAST_PROGRESS_V1691F31__) return;
window.__AT_CAREER_FAST_PROGRESS_V1691F31__ = true;

const VERSION = 'CAREER-FAST-PROGRESS-V16.9.1F31';
const CAREER_CONCURRENCY = 6;
const ROADMAP_CONCURRENCY = 4;
const SCORE_YIELD_EVERY = 1;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const nextFrame = () => new Promise(resolve => {
  try {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
  } catch {}
  setTimeout(resolve, 0);
});

function contentEl() {
  try { return document.getElementById('analysisContent'); } catch { return null; }
}

function setProgress(title, detail) {
  const content = contentEl();
  if (!content) return;
  content.classList.remove('empty');
  content.innerHTML = `
    <div style="padding:15px;line-height:1.55;">
      <div style="font-size:18px;font-weight:800;margin-bottom:12px;">${title}</div>
      <div style="font-size:15px;">${detail}</div>
      <div style="margin-top:12px;font-size:11px;opacity:.68;">F31 hizli ilerleme aktif: istekler paralel, puanlama at at isleniyor.</div>
    </div>
  `;
}

function safeAdaptiveMode(career) {
  try {
    if (career?.analysisMode) return career.analysisMode;
    if (typeof adaptiveCurrentMode === 'function') {
      return adaptiveCurrentMode(career?.roadmap || []);
    }
  } catch {}
  return Array.isArray(career?.roadmap) && career.roadmap.length ? 'PREPARATION_PATH' : 'DEBUT';
}

function emptySimilarity(career, roadmap) {
  return {
    score:null,
    strongest:null,
    byYear:[],
    matchedHistoricalHorse:null,
    matchedHistoricalRace:null,
    referenceCount:0,
    analysisMode:safeAdaptiveMode(career),
    method:'F31_DATA_ERROR',
    error:roadmap?.error || 'Tarihsel referans bulunamadi.'
  };
}

function applyFinalFlags(result) {
  if (!result || typeof result !== 'object') return result;
  result.exactHistoryV9 = true;
  result.adaptiveHistoryV10 = true;
  result.adaptiveHistoryV101 = true;
  result.adaptiveHistoryV102 = true;
  result.fastProgressVersion = VERSION;
  result.patchVersion = 'ADAPTIVE-HISTORY-UI-V10.2+F31';
  result.roadmapApiVersion = 'TJK-MODEL-ROADMAP-V11+FULLPATH';
  result.careerAccordionVersion = 'CAREER-HORSE-ACCORDION-V10.4';
  result.careerRankingVersion = 'CAREER-MODE-RANK-V10.4';
  result.similarityNote = 'Galibiyet ve hazirlik yollari ayri analiz olcekleridir; F31 istekleri paralel, puanlamayi at at ilerletir.';

  try {
    if (window.ATCareerJuvenileMaidenMarketConfirmationV1691F28?.apply) {
      window.ATCareerJuvenileMaidenMarketConfirmationV1691F28.apply(result);
    }
  } catch {}

  return result;
}

function makeCareerResult(races, raceValue, selectedRaces, previous) {
  return applyFinalFlags({
    type:'career',
    version:typeof CAREER_UI_VERSION !== 'undefined' ? CAREER_UI_VERSION : 'CAREER-UI-V5.1',
    date:state?.date || '',
    city:state?.city || '',
    cityName:typeof getCityName === 'function' ? getCityName() : '',
    coverage:raceValue === 'all' ? 'all' : previous?.coverage === 'all' ? 'all' : 'partial',
    calculatedRace:raceValue,
    calculatedRaceCount:Array.isArray(selectedRaces) ? selectedRaces.length : races.length,
    rule:'YEAR_BY_YEAR_PM45_EXACT_FAMILY_TWIN_WITH_WIN_OR_PREPARATION_PATH',
    similarityMethod:'YEAR_BY_YEAR_EFFECTIVE_SUPPORT_V10',
    races,
    generatedAt:new Date().toISOString()
  });
}

function mergeWithPrevious(calculatedRaces, raceValue, previous) {
  if (raceValue === 'all') return calculatedRaces;
  try {
    if (typeof isValidCareerCache === 'function' && isValidCareerCache(previous)) {
      const raceMap = new Map(previous.races.map(race => [String(race.no), race]));
      for (const race of calculatedRaces) raceMap.set(String(race.no), race);
      return Array.from(raceMap.values()).sort((a, b) => Number(a.no) - Number(b.no));
    }
  } catch {}
  return calculatedRaces;
}

const cacheBeforeF31 = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
if (cacheBeforeF31) {
  isValidCareerCache = function(cached) {
    return Boolean(cacheBeforeF31(cached) && cached?.fastProgressVersion === VERSION);
  };
}

function clearStaleF31(reason) {
  try {
    if (!state?.analyses?.career?.races?.length) return;
    if (state.analyses.career.fastProgressVersion === VERSION) return;
    state.analyses.career = {};
    state.careerFastProgressInvalidatedBy = reason || VERSION;
    state.careerFastProgressVersion = VERSION;
    if (typeof save === 'function') save();
  } catch {}
}

clearStaleF31('startup');

if (typeof runCareerAnalysis === 'function') {
  runCareerAnalysis = async function(selectedRaces, raceValue) {
    const content = contentEl();
    if (!content) return;

    const racesToRun = Array.isArray(selectedRaces) ? selectedRaces : [];
    const horsesToLoad = [];

    for (const race of racesToRun) {
      for (const horse of Array.isArray(race?.horses) ? race.horses : []) {
        horsesToLoad.push({ raceNo:race.no, horse });
      }
    }

    if (!horsesToLoad.length) {
      content.innerHTML = 'Secilen kosularda at bulunamadi.';
      return;
    }

    setProgress(
      'Kariyer yollari aliniyor...',
      `<b>${horsesToLoad.length}</b> at hazirlaniyor · ${CAREER_CONCURRENCY} paralel istek`
    );

    let completed = 0;
    const loaded = await mapLimit(horsesToLoad, CAREER_CONCURRENCY, async item => {
      const career = await fetchCareer(item.horse.id, state.date);
      completed += 1;
      if (completed === horsesToLoad.length || completed % 2 === 0) {
        setProgress(
          'Kariyer yollari aliniyor...',
          `${completed} / ${horsesToLoad.length} at tamamlandi`
        );
      }
      return { ...item, career };
    });

    setProgress(
      'Tarihsel kosular hazirlaniyor...',
      `${racesToRun.length} kosu · ${ROADMAP_CONCURRENCY} paralel istek`
    );

    let roadmapCompleted = 0;
    const roadmapRows = await mapLimit(racesToRun, ROADMAP_CONCURRENCY, async race => {
      const meta = typeof programRaceMeta === 'function'
        ? programRaceMeta(race)
        : { ok:true, class:race?.class || '', ageGroup:race?.ageGroup || '', distance:race?.distance || '', track:race?.track || '' };
      const roadmap = meta?.ok
        ? await fetchHistoricalRoadmap(meta)
        : { ok:false, error:meta?.error || 'Gunluk programda bu kosunun sartlari eksik.' };

      roadmapCompleted += 1;
      setProgress(
        'Tarihsel kosular hazirlaniyor...',
        `${roadmapCompleted} / ${racesToRun.length} kosu tamamlandi`
      );
      return { race, meta, roadmap };
    });

    const calculatedRaces = [];
    const totalScoreHorses = loaded.filter(Boolean).length;
    let scoredHorses = 0;
    let raceCompleted = 0;

    for (const row of roadmapRows) {
      const race = row.race;
      const meta = row.meta;
      const roadmap = row.roadmap;
      const currentRaceLoaded = loaded.filter(x => x && Number(x.raceNo) === Number(race.no));
      const raceHorses = [];

      setProgress(
        'Tarihsel veriler puanlaniyor...',
        `${raceCompleted + 1} / ${racesToRun.length} kosu · ${scoredHorses} / ${totalScoreHorses} at`
      );
      await nextFrame();

      for (const x of currentRaceLoaded) {
        const career = typeof normalizeCareerResponse === 'function'
          ? normalizeCareerResponse(x.career || {})
          : (x.career || {});

        const similarity = roadmap?.ok && typeof calculateGalibiyetBenzerligi === 'function'
          ? calculateGalibiyetBenzerligi(career.roadmap || [], roadmap)
          : emptySimilarity(career, roadmap);

        raceHorses.push({
          horse:x.horse,
          career,
          galibiyetBenzerligi:similarity
        });

        scoredHorses += 1;
        if (scoredHorses % SCORE_YIELD_EVERY === 0) {
          setProgress(
            'Tarihsel veriler puanlaniyor...',
            `${raceCompleted + 1} / ${racesToRun.length} kosu · ${scoredHorses} / ${totalScoreHorses} at`
          );
          await nextFrame();
        }
      }

      calculatedRaces.push({
        no:race.no,
        class:race.class || meta?.class || '',
        ageGroup:race.ageGroup || meta?.ageGroup || '',
        distance:race.distance || meta?.distance || '',
        track:race.track || meta?.track || '',
        meta:meta?.ok ? meta : null,
        roadmapVersion:roadmap?.version || null,
        historicalRaceCount:Array.isArray(roadmap?.historicalRaces) ? roadmap.historicalRaces.length : 0,
        historicalYears:Array.isArray(roadmap?.historicalRaces) ? roadmap.historicalRaces.map(x => x?.sourceYear).filter(Boolean) : [],
        roadmapError:roadmap?.ok ? null : (roadmap?.error || 'Tarihsel referans bulunamadi.'),
        horses:raceHorses
      });

      raceCompleted += 1;
      await sleep(0);
    }

    const previous = state?.analyses?.career;
    const mergedRaces = mergeWithPrevious(calculatedRaces, raceValue, previous);
    const result = makeCareerResult(mergedRaces, raceValue, racesToRun, previous);

    state.analyses.career = result;
    state.careerFastProgressVersion = VERSION;
    if (typeof save === 'function') save();
    if (typeof renderCareerAnalysis === 'function') renderCareerAnalysis(result, raceValue);

    return result;
  };
}

try {
  const archive = window.ATCouponDailyArchiveV1691;
  if (archive?.hydrateCurrent && !archive.__careerFastProgressF31) {
    const beforeHydrate = archive.hydrateCurrent.bind(archive);
    archive.hydrateCurrent = async function(...args) {
      const out = await beforeHydrate(...args);
      clearStaleF31('archive-hydrate');
      return out;
    };
    archive.__careerFastProgressF31 = VERSION;
  }
} catch {}

window.ATCareerFastProgressV1691F31 = {
  version:VERSION,
  careerConcurrency:CAREER_CONCURRENCY,
  roadmapConcurrency:ROADMAP_CONCURRENCY
};
console.info('[AT AI]', VERSION, 'active - all-race Career analysis runs with faster progress and UI yields.');
})();
