/* AT AI Mobil — V16.9.1F60.21 Daily Calibration race selector bridge
   - Keeps the middle Daily Calibration race selector (#xcalRace) independently usable on Android.
   - Synchronizes the chosen race to analysisRace/state/ceRace without dispatching recursive change events.
   - Does not change matching, calibration scoring, Career Roadmap, or five-model formulas.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CALIBRATION_RACE_SELECTOR_V621__) return;
window.__AT_DAILY_CALIBRATION_RACE_SELECTOR_V621__ = true;

const VERSION = 'DAILY-CALIBRATION-RACE-SELECTOR-V16.9.1F60.21';
const clean = v => String(v ?? '').trim();
const $ = id => document.getElementById(id);

function hasOption(select, value) {
  if (!select) return false;
  const n = clean(value);
  return [...select.options].some(o => clean(o.value) === n);
}

function enableSelector(select) {
  if (!select) return;
  if (select.disabled) select.disabled = false;
  if (select.hasAttribute('disabled')) select.removeAttribute('disabled');
  select.setAttribute('aria-disabled', 'false');
  select.style.pointerEvents = 'auto';
  select.style.touchAction = 'manipulation';
  select.style.userSelect = 'auto';
  select.style.webkitUserSelect = 'auto';
}

function syncRace(value) {
  const n = clean(value);
  if (!n) return;
  try {
    if (typeof state === 'object' && state) state.selectedRace = n;
  } catch {}
  try {
    const main = $('analysisRace');
    if (hasOption(main, n)) main.value = n;
  } catch {}
  try {
    const legacy = $('ceRace');
    if (hasOption(legacy, n)) legacy.value = n;
  } catch {}
}

function restoreRace(value) {
  const n = clean(value);
  if (!n) return;
  const select = $('xcalRace');
  if (!select) return;
  enableSelector(select);
  if (hasOption(select, n)) select.value = n;
  syncRace(n);
}

function commitSelection(select) {
  if (!select) return;
  enableSelector(select);
  const n = clean(select.value);
  if (!n) return;
  syncRace(n);
  try { queueMicrotask(() => restoreRace(n)); } catch { Promise.resolve().then(() => restoreRace(n)); }
  setTimeout(() => restoreRace(n), 0);
  setTimeout(() => restoreRace(n), 80);
  setTimeout(() => restoreRace(n), 220);
}

function bindSelector() {
  const select = $('xcalRace');
  if (!select) return false;
  enableSelector(select);
  if (select.dataset.f621Bound === '1') return true;
  select.dataset.f621Bound = '1';
  select.addEventListener('input', () => commitSelection(select), true);
  select.addEventListener('change', () => commitSelection(select), true);
  select.addEventListener('pointerdown', () => enableSelector(select), true);
  select.addEventListener('touchstart', () => enableSelector(select), { capture:true, passive:true });
  return true;
}

const observer = new MutationObserver(() => bindSelector());
try { observer.observe(document.documentElement, { childList:true, subtree:true }); } catch {}

document.addEventListener('pointerdown', event => {
  const select = event.target?.closest?.('#xcalRace');
  if (select) enableSelector(select);
}, true);

document.addEventListener('focusin', event => {
  const select = event.target?.closest?.('#xcalRace');
  if (select) enableSelector(select);
}, true);

window.addEventListener('pageshow', () => setTimeout(bindSelector, 0), { passive:true });
window.addEventListener('at-ai:exact-calibration-open', () => setTimeout(bindSelector, 0));
window.addEventListener('at-ai:daily-calibration-open', () => setTimeout(bindSelector, 0));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(bindSelector, 0), { once:true });
} else {
  setTimeout(bindSelector, 0);
}

console.info('[AT AI]', VERSION, 'aktif — ortadaki Günlük Kalibrasyon koşu seçicisi kullanıcı tarafından değiştirilebilir.');
})();
