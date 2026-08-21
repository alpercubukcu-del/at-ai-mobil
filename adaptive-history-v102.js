/* AT AI Mobil — Adaptive Historical Path V10.4 (compact runtime)
   V14.10 cleanup:
   - V12.5+ owns the final fetchHistoricalRoadmap implementation.
   - V13.9 owns the final Career renderer/openAnalysis implementation.
   - Keep only cache/version wiring, Career mode semantics and page lock helpers
     still consumed by later layers. */

const ADAPTIVE_HISTORY_ALIAS_VERSION = 'ADAPTIVE-HISTORY-UI-V10.2';
const CAREER_HORSE_ACCORDION_VERSION = 'CAREER-HORSE-ACCORDION-V10.4';
const CAREER_MODE_RANK_VERSION = 'CAREER-MODE-RANK-V10.4';
const ANALYSIS_DIALOG_VERSION = 'ANALYSIS-DIALOG-FULLSCREEN-V10.4-COMPACT';
const runCareerAnalysisV101 = runCareerAnalysis;

isValidCareerCache = function(cached) {
  return Boolean(
    cached &&
    cached.version === CAREER_UI_VERSION &&
    cached.exactHistoryV9 === true &&
    cached.adaptiveHistoryV10 === true &&
    cached.adaptiveHistoryV101 === true &&
    cached.adaptiveHistoryV102 === true &&
    cached.date === state.date &&
    String(cached.city) === String(state.city) &&
    Array.isArray(cached.races) && cached.races.length &&
    cached.races.every(race =>
      race &&
      Array.isArray(race.horses) &&
      race.horses.every(item =>
        item?.galibiyetBenzerligi &&
        Array.isArray(item.galibiyetBenzerligi.byYear)
      )
    )
  );
};

if (state?.analyses?.career && !state.analyses.career.adaptiveHistoryV102) {
  state.analyses.career = {};
  save();
}

runCareerAnalysis = async function(selectedRaces, raceValue) {
  await runCareerAnalysisV101(selectedRaces, raceValue);
  if (state?.analyses?.career) {
    state.analyses.career.adaptiveHistoryV102 = true;
    state.analyses.career.patchVersion = ADAPTIVE_HISTORY_ALIAS_VERSION;
    state.analyses.career.roadmapApiVersion = 'TJK-MODEL-ROADMAP-V11+FULLPATH';
    state.analyses.career.careerAccordionVersion = CAREER_HORSE_ACCORDION_VERSION;
    state.analyses.career.careerRankingVersion = CAREER_MODE_RANK_VERSION;
    state.analyses.career.similarityNote = 'Galibiyet ve hazırlık yolları ayrı analiz ölçekleridir; tarihsel referans son V12.5+ tam-yol katmanından alınır.';
    save();
  }
};

/* Later data-state fixes still wrap these two helpers. */
function careerModeV104(item) {
  const explicit = item?.galibiyetBenzerligi?.analysisMode || item?.career?.analysisMode;
  if (
    explicit === 'WIN_PATH' ||
    explicit === 'PREPARATION_PATH' ||
    explicit === 'DEBUT' ||
    explicit === 'DATA_ERROR' ||
    explicit === 'FULL_PATH'
  ) return explicit;
  const roadmap = Array.isArray(item?.career?.roadmap) ? item.career.roadmap : [];
  return typeof adaptiveCurrentMode === 'function' ? adaptiveCurrentMode(roadmap) : 'DEBUT';
}

function modeLabelV104(mode) {
  if (mode === 'FULL_PATH') return 'Tam Kariyer Yolu';
  if (mode === 'WIN_PATH') return 'Galibiyet Yolu';
  if (mode === 'PREPARATION_PATH') return 'Hazırlık / İlk 5 Yolu';
  if (mode === 'DATA_ERROR') return 'Veri alınamadı';
  return 'Debut';
}

/* V13.9 replaces openAnalysis, but deliberately calls this lock helper. */
let analysisScrollYV104 = 0;

function lockAnalysisPageV104() {
  if (!document.body || document.body.dataset.analysisLockV104 === '1') return;
  analysisScrollYV104 = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add('analysis-lock-v104');
  document.body.classList.add('analysis-lock-v104');
  document.body.dataset.analysisLockV104 = '1';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${analysisScrollYV104}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockAnalysisPageV104() {
  if (!document.body || document.body.dataset.analysisLockV104 !== '1') return;
  const restoreY = analysisScrollYV104;
  document.documentElement.classList.remove('analysis-lock-v104');
  document.body.classList.remove('analysis-lock-v104');
  delete document.body.dataset.analysisLockV104;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, restoreY);
}

const analysisDialogV104 = document.getElementById('analysisDialog');
if (analysisDialogV104 && analysisDialogV104.dataset.lockHandlerV104 !== '1') {
  analysisDialogV104.dataset.lockHandlerV104 = '1';
  analysisDialogV104.addEventListener('close', unlockAnalysisPageV104);
}

console.info('[AT AI]', ADAPTIVE_HISTORY_ALIAS_VERSION, 'compact aktif');
console.info('[AT AI]', ANALYSIS_DIALOG_VERSION, 'aktif');
