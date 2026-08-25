/* AT AI Mobil — V16.9.1F 5 Model İsteğe Bağlı Hazırlama
   - Kariyer sayfası açılırken otomatik 5 Model hesabı başlatmaz.
   - Kullanıcı 5 Model panelini açarsa sonuç mevcut günlük IndexedDB arşivine yazılır.
   - Puan formüllerine, tarihsel taramaya ve Kariyer/Hazırlık sıralamasına dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CAREER_MODEL_AUTOARCHIVE_V149__) return;
window.__AT_DAILY_CAREER_MODEL_AUTOARCHIVE_V149__ = true;

const VERSION = 'DAILY-CAREER-MODEL-MANUAL-V16.9.1F';
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
    console.warn('[AT AI] 5 Model isteğe bağlı arşiv uyarısı:', raceNo, e);
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

/* V16.9.1F: Eski otomatik runCareerAnalysis/renderCareerAnalysis hookları yoktur.
   5 Model yalnız kullanıcı paneli açtığında V13.9 lazy renderer üzerinden hazırlanır. */

window.ATDailyCareerModelAutoArchiveV149 = { version:VERSION, enqueue, ensureOne };
console.info('[AT AI]', VERSION, 'aktif — 5 Model yalnız panel açıldığında hazırlanır');
})();
