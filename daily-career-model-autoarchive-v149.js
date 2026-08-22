/* AT AI Mobil — V14.9 5 Model Otomatik Arşiv
   - Kariyer analizi tamamlanınca seçili koşunun 5 Model verisini arka planda bir kez hazırlar.
   - Sonuç mevcut günlük IndexedDB arşivine yazılır; sonraki açılışlarda yeniden hesaplama gerekmez.
   - Puan formüllerine ve sıralama mantığına dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CAREER_MODEL_AUTOARCHIVE_V149__) return;
window.__AT_DAILY_CAREER_MODEL_AUTOARCHIVE_V149__ = true;

const VERSION = 'DAILY-CAREER-MODEL-AUTOARCHIVE-V14.9';
const queue = [];
const queued = new Set();
let running = false;

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const keyOf = raceNo => [clean(state?.date), clean(state?.city), clean(raceNo)].join('|');

function currentRace(raceNo) {
  try {
    return (Array.isArray(state?.races) ? state.races : []).find(r => String(r?.no) === String(raceNo)) || null;
  } catch { return null; }
}

function panelStatus(text) {
  try {
    const box = document.getElementById('careerFiveModelV139');
    const small = box?.querySelector?.('summary small');
    if (small) small.textContent = text;
  } catch {}
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function ensureOne(raceNo) {
  const race = currentRace(raceNo);
  if (!race || typeof getCareerRaceModelsV112 !== 'function') return;
  const selected = String(document.getElementById('analysisRace')?.value || '');
  if (selected === String(raceNo)) panelStatus('5 Model arka planda hazırlanıyor…');
  try {
    await getCareerRaceModelsV112(race);
    if (selected === String(raceNo)) panelStatus('Arşivde hazır · açmak için dokunun');
  } catch (e) {
    console.warn('[AT AI] 5 Model otomatik arşiv uyarısı:', raceNo, e);
    if (selected === String(raceNo)) panelStatus('5 Model hazır değil · açınca tekrar denenecek');
  }
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const raceNo = queue.shift();
      const key = keyOf(raceNo);
      try { await ensureOne(raceNo); }
      finally { queued.delete(key); }
      await delay(180);
    }
  } finally {
    running = false;
  }
}

function enqueue(raceNo) {
  if (raceNo === null || raceNo === undefined || raceNo === '' || raceNo === 'all') return;
  const key = keyOf(raceNo);
  if (queued.has(key)) return;
  queued.add(key);
  queue.push(String(raceNo));
  setTimeout(() => { pump().catch(() => {}); }, 120);
}

function enqueueFromResult(result, raceValue) {
  const races = Array.isArray(result?.races) ? result.races : [];
  if (!races.length) return;
  if (String(raceValue) !== 'all') {
    if (races.some(r => String(r?.no) === String(raceValue))) enqueue(raceValue);
    return;
  }
  for (const race of races) enqueue(race?.no);
}

/* Yeni kariyer hesabı tamamlandıktan sonra 5 Model arka planda hazırlanır. */
try {
  if (typeof runCareerAnalysis === 'function') {
    const baseRun = runCareerAnalysis;
    runCareerAnalysis = async function(selectedRaces, raceValue) {
      const out = await baseRun(selectedRaces, raceValue);
      try { enqueueFromResult(state?.analyses?.career, raceValue); } catch {}
      return out;
    };
  }
} catch (e) {
  console.warn('[AT AI] V14.9 runCareerAnalysis hook kurulamadı:', e);
}

/* Arşivden açılan eski kariyer kaydında 5 Model eksikse, paneli tıklamayı beklemeden tamamla. */
try {
  if (typeof renderCareerAnalysis === 'function') {
    const baseRender = renderCareerAnalysis;
    renderCareerAnalysis = function(result, raceFilter = null) {
      const out = baseRender(result, raceFilter);
      try {
        const selected = String(raceFilter ?? document.getElementById('analysisRace')?.value ?? 'all');
        if (selected !== 'all') enqueue(selected);
      } catch {}
      return out;
    };
  }
} catch (e) {
  console.warn('[AT AI] V14.9 render hook kurulamadı:', e);
}

window.ATDailyCareerModelAutoArchiveV149 = { version:VERSION, enqueue, ensureOne };
console.info('[AT AI]', VERSION, 'aktif — 5 Model otomatik arşiv');
})();
