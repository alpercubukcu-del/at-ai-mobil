/* AT AI Mobil - V16.9.1F27 CAREER STUCK GUARD
   - A slow TJK career/fallback response must not hold the whole Career window.
   - A slow historical roadmap response is converted to an explicit data error.
   - Scoring formulas are not changed; only request lifetime and UI failure handling are guarded.
*/
(() => {
'use strict';
if (window.__AT_CAREER_STUCK_GUARD_V1691F27__) return;
window.__AT_CAREER_STUCK_GUARD_V1691F27__ = true;

const VERSION = 'CAREER-STUCK-GUARD-V16.9.1F27';
const CAREER_TIMEOUT_MS = 22000;
const ROADMAP_TIMEOUT_MS = 32000;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => {
  try { return typeof escapeHtml === 'function' ? escapeHtml(v) : clean(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  catch { return clean(v); }
};

function raceNoFromMeta(meta = {}) {
  return clean(meta?.raceNo ?? meta?.no ?? meta?.race?.no ?? '');
}

function timeoutCareer(horseId, error) {
  const message = error?.message || `Kariyer istegi ${Math.round(CAREER_TIMEOUT_MS / 1000)} saniyede tamamlanmadi.`;
  return {
    ok:false,
    dataState:'ERROR',
    errorType:'TIMEOUT_GUARD',
    error:message,
    analysisMode:'DATA_ERROR',
    guardVersion:VERSION,
    horseId:clean(horseId),
    roadmap:[],
    wins:[],
    top5:[],
    preparationPath:[],
    history:[],
    recentForm:[],
    races:[],
    summary:{ totalTop5:0, totalWins:0, first:0, second:0, third:0, fourth:0, fifth:0 }
  };
}

function timeoutRoadmap(meta, error) {
  const raceNo = raceNoFromMeta(meta);
  const prefix = raceNo ? `${raceNo}. kosu tarihsel yol` : 'Tarihsel yol';
  return {
    ok:false,
    dataState:'ERROR',
    errorType:'TIMEOUT_GUARD',
    error:error?.message || `${prefix} istegi ${Math.round(ROADMAP_TIMEOUT_MS / 1000)} saniyede tamamlanmadi.`,
    guardVersion:VERSION,
    historicalRaces:[],
    byYear:[],
    timeoutGuard:true
  };
}

function guarded(task, timeoutMs, fallback) {
  let settled = false;
  let timer = null;
  return new Promise(resolve => {
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback());
    }, timeoutMs);

    Promise.resolve()
      .then(task)
      .then(
        value => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        error => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(fallback(error));
        }
      );
  }).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

if (typeof fetchCareer === 'function') {
  const fetchCareerBeforeF27 = fetchCareer;
  fetchCareer = async function(horseId, before, ...rest) {
    return guarded(
      () => fetchCareerBeforeF27(horseId, before, ...rest),
      CAREER_TIMEOUT_MS,
      error => timeoutCareer(horseId, error)
    );
  };
}

if (typeof fetchHistoricalRoadmap === 'function') {
  const fetchHistoricalRoadmapBeforeF27 = fetchHistoricalRoadmap;
  fetchHistoricalRoadmap = async function(meta, ...rest) {
    return guarded(
      () => fetchHistoricalRoadmapBeforeF27(meta, ...rest),
      ROADMAP_TIMEOUT_MS,
      error => timeoutRoadmap(meta, error)
    );
  };
}

if (typeof fetchModelRoadmapV11 === 'function') {
  const fetchModelRoadmapBeforeF27 = fetchModelRoadmapV11;
  fetchModelRoadmapV11 = async function(race, ...rest) {
    return guarded(
      () => fetchModelRoadmapBeforeF27(race, ...rest),
      ROADMAP_TIMEOUT_MS,
      error => timeoutRoadmap({ raceNo:race?.no }, error)
    );
  };
}

function setGuardNote(text) {
  try {
    const content = document.getElementById('analysisContent');
    if (!content) return;
    let note = document.getElementById('careerStuckGuardF27');
    if (!note) {
      note = document.createElement('div');
      note.id = 'careerStuckGuardF27';
      note.style.cssText = 'margin:10px 15px 0;padding:9px 10px;border-radius:10px;background:rgba(114,213,255,.08);border:1px solid rgba(114,213,255,.18);font-size:11px;line-height:1.45;color:#dff6ff;';
      content.appendChild(note);
    }
    note.innerHTML = esc(text);
  } catch {}
}

function clearGuardNote() {
  try { document.getElementById('careerStuckGuardF27')?.remove(); } catch {}
}

if (typeof runCareerAnalysis === 'function') {
  const runCareerAnalysisBeforeF27 = runCareerAnalysis;
  runCareerAnalysis = async function(selectedRaces, raceValue, ...rest) {
    const startedAt = Date.now();
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setGuardNote(`Analiz devam ediyor (${seconds} sn). Yavas TJK cevabi olursa o at/kosu veri hatasi olarak gecilecek; pencere kilitlenmeyecek.`);
      try {
        if (typeof status === 'function' && ticks % 3 === 0) {
          status(`Kariyer analizi suruyor... ${seconds} sn`);
        }
      } catch {}
    }, 5000);

    try {
      const out = await runCareerAnalysisBeforeF27(selectedRaces, raceValue, ...rest);
      return out;
    } catch (error) {
      try {
        const content = document.getElementById('analysisContent');
        if (content) {
          content.classList.remove('empty');
          content.innerHTML = `<div style="padding:15px;"><b>Kariyer analizi tamamlanamadi.</b><br><br>${esc(error?.message || 'Bilinmeyen hata')}<br><br><small>F27 korumasi aktif: tekrar denediginde yavas TJK cevaplari veri hatasi olarak atlanacak.</small></div>`;
        }
        if (typeof status === 'function') status(`Kariyer analizi durdu: ${error?.message || 'Bilinmeyen hata'}`);
      } catch {}
      return null;
    } finally {
      clearInterval(timer);
      clearGuardNote();
    }
  };
}

window.ATCareerStuckGuardV1691F27 = {
  version:VERSION,
  careerTimeoutMs:CAREER_TIMEOUT_MS,
  roadmapTimeoutMs:ROADMAP_TIMEOUT_MS
};
console.info('[AT AI]', VERSION, 'active - slow career/roadmap requests no longer block the Career window.');
})();