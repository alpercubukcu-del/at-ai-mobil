/* AT AI Mobil — V16.9.1F60.20 Career 5 Model live progress bridge
   - Mirrors the Annual Archive 5 Model engine's existing progress into the visible Career Roadmap card.
   - Shows elapsed time and current stage while selected-race 5 Model preparation is running.
   - Read-only UI bridge: no scoring, matching, archive, timeout or request behavior changes.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_LIVE_PROGRESS_V1691F620__) return;
window.__AT_CAREER_FIVE_MODEL_LIVE_PROGRESS_V1691F620__ = true;

const VERSION = 'CAREER-FIVE-MODEL-LIVE-PROGRESS-V16.9.1F60.20';
const STATUS_ID = 'ceDaily5StatusV1691F3';
const BUTTON_ID = 'ceDaily5OneV1691F3';
let startedAt = 0;
let lastActiveAt = 0;
let originalButtonText = '';

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
function st(){
  try { if (typeof state === 'object' && state) return state; } catch {}
  return window.state || {};
}
function raceNo(){
  return clean(document.getElementById('analysisRace')?.value || st()?.selectedRace || document.getElementById('ceRace')?.value) || '?';
}
function careerOpen(){ return document.getElementById('analysisDialog')?.dataset?.view === 'career'; }
function enginePending(){
  try { if (window.ATAnnualCareerFiveModelV138?.pending?.()) return true; } catch {}
  const button = document.getElementById(BUTTON_ID);
  const status = document.getElementById(STATUS_ID);
  const bt = clean(button?.textContent).toLocaleLowerCase('tr-TR');
  const stx = clean(status?.textContent).toLocaleLowerCase('tr-TR');
  return Boolean(button?.disabled && bt.includes('hazırl')) || stx.includes('hesap motoru başlatıldı') || stx.includes('5 model hazırlanıyor');
}
function annualProgress(){
  const text = clean(document.getElementById('aaAnalysis')?.textContent);
  if (!text) return '';
  if (/Yıllık arşivdeki tam eşleşmeler otomatik aranıyor/i.test(text)) return 'Tarihsel eşleşmeler hazırlanıyor';
  let m = text.match(/İlk 3 referans yarışları:\s*(\d+)\s*\/\s*(\d+)(?:\s*·\s*(\d+)\s*atlandı)?/i);
  if (m) return `Geçmiş yarış ${m[1]}/${m[2]}${m[3] ? ` · ${m[3]} atlandı` : ''}`;
  m = text.match(/Bugünkü atlar:\s*(\d+)\s*\/\s*(\d+)/i);
  if (m) return `Bugünkü at kariyerleri ${m[1]}/${m[2]}`;
  if (/Seçilen yarışların ilk 3 atı ve yarış öncesi kariyerleri hazırlanıyor/i.test(text)) return 'İlk 3 atların yarış öncesi kariyerleri hazırlanıyor';
  return '';
}
function elapsedLabel(){
  if (!startedAt) return '0 sn';
  const sec = Math.max(0, Math.floor((performance.now() - startedAt) / 1000));
  if (sec < 60) return `${sec} sn`;
  const min = Math.floor(sec / 60), rem = sec % 60;
  return `${min} dk ${String(rem).padStart(2,'0')} sn`;
}
function resetButton(){
  const button = document.getElementById(BUTTON_ID);
  if (button && originalButtonText && !button.disabled && /Geçmiş yarış|Bugünkü at kariyerleri|Tarihsel eşleşmeler|kariyerleri hazırlanıyor/i.test(clean(button.textContent))) {
    button.textContent = originalButtonText;
  }
  originalButtonText = '';
}
function tick(){
  if (!careerOpen()) return;
  const active = enginePending();
  if (!active) {
    if (startedAt && performance.now() - lastActiveAt > 1800) {
      startedAt = 0;
      resetButton();
    }
    return;
  }
  lastActiveAt = performance.now();
  if (!startedAt) startedAt = performance.now();

  const step = annualProgress() || '5 Model hesaplanıyor';
  const elapsed = elapsedLabel();
  const status = document.getElementById(STATUS_ID);
  if (status) {
    status.textContent = `${raceNo()}. Koşu · ${step} · geçen süre ${elapsed}`;
    status.dataset.kind = '';
    status.style.color = '';
  }
  const button = document.getElementById(BUTTON_ID);
  if (button && button.disabled) {
    if (!originalButtonText) originalButtonText = clean(button.textContent) || 'Seçili Koşuyu Hazırla';
    button.textContent = `${step} · ${elapsed}`;
  }
}

setInterval(tick, 500);
window.addEventListener('pageshow', () => setTimeout(tick, 0), { passive:true });
window.addEventListener('at-ai:daily-five-model-archive-updated', () => setTimeout(tick, 0));
console.info('[AT AI]', VERSION, 'aktif — Career 5 Model canlı ilerleme görünür');
})();
