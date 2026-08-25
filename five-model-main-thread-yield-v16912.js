/* AT AI Mobil — V16.9.12 5 Model Ana İş Parçacığı Yield Onarımı
   - 5 Model puanlama parçaları arasında tarayıcıya sıra verir.
   - Arka planda sürdür düğmesini pointerdown aşamasında işler.
   - Eski koşu-bazlı sessionStorage model kayıtlarını değerlerini okumadan temizler.
   - Puanlama ve sıralama formüllerine dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_MAIN_THREAD_YIELD_V16912__) return;
window.__AT_FIVE_MODEL_MAIN_THREAD_YIELD_V16912__ = true;

const VERSION = 'FIVE-MODEL-MAIN-THREAD-YIELD-V16.9.12';
const SESSION_PREFIX = 'at_ai_five_model_compact_v1699:';
const SESSION_INDEX = 'at_ai_five_model_compact_index_v1699';
const LEGACY_SESSION = 'at_ai_five_model_compact_v1687';
const stats = { chunks:0, backgroundExits:0, legacyKeysRemoved:0, lastPhase:'idle' };

function closeFiveModelToBackground(event) {
  const button = event?.target?.closest?.('[data-fmr-background-v1697]');
  if (!button) return;
  event.preventDefault?.();
  event.stopPropagation?.();
  const dialog = document.getElementById('analysisDialog');
  try { if (dialog?.open) dialog.close(); } catch {}
  try { window.ATFiveModelRepairV1697?.repair?.(); } catch {}
  stats.backgroundExits++;
}

function updateProgress(event) {
  const detail = event?.detail || {};
  stats.chunks++;
  stats.lastPhase = String(detail.phase || 'scoring');
  const host = document.querySelector('.fmr-progress-v1697');
  if (!host) return;
  const done = Math.max(0, Number(detail.done) || 0);
  const total = Math.max(1, Number(detail.total) || 1);
  const pct = detail.phase === 'scoring'
    ? Math.min(96, 18 + Math.round((done / total) * 78))
    : 12;
  const percent = host.querySelector('.fmr-progress-percent-v1697');
  const fill = host.querySelector('.fmr-progress-fill-v1697');
  const phase = host.querySelector('.fmr-progress-phase-v1697');
  if (percent) percent.textContent = pct + '%';
  if (fill) fill.style.width = pct + '%';
  if (phase) phase.textContent = detail.label || (detail.phase === 'scoring'
    ? 'Model puanları parça parça hesaplanıyor'
    : 'Tarihsel veriler bekleniyor; arayüz kullanılabilir');
}

async function clearLegacySessionWithoutReading() {
  let keys = [];
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key && (key.startsWith(SESSION_PREFIX) || key === SESSION_INDEX || key === LEGACY_SESSION)) keys.push(key);
    }
  } catch { keys = []; }
  for (const key of keys) {
    try { sessionStorage.removeItem(key); stats.legacyKeysRemoved++; } catch {}
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

document.addEventListener('pointerdown', closeFiveModelToBackground, true);
document.addEventListener('at-five-model-chunk-v16912', updateProgress);
setTimeout(() => { void clearLegacySessionWithoutReading(); }, 900);

window.ATFiveModelMainThreadYieldV16912 = {
  VERSION,
  stats:() => ({ ...stats }),
  clearLegacySessionWithoutReading
};
console.info('[AT AI]', VERSION, 'aktif — 5 Model puanlama parçalı; menü dokunuşu ana iş parçacığına bırakılır.');
})();
