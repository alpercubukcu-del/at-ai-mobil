/* AT AI Mobil — Annual Archive Guard V14
   Event-driven historical cutoff + bulk selection. No global MutationObserver.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_ARCHIVE_GUARD_V14__) return;
window.__AT_ANNUAL_ARCHIVE_GUARD_V14__ = true;

const VERSION = 'TJK-ANNUAL-ARCHIVE-GUARD-V14.0';
const STORAGE_KEY = 'at_ai_mobil_state_v2';
let activeCutoff = '';
let activeYear = 0;
let activeRaceNo = 0;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
function readState() {
  try { if (typeof state !== 'undefined' && state && typeof state === 'object') return state; } catch {}
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function selectionSet() {
  const s = window.__AT_AA_SELECTED_IDS_V134__;
  return s && typeof s.add === 'function' && typeof s.delete === 'function' && typeof s.clear === 'function' ? s : null;
}
function currentContext(raceNo = 0) {
  const s = readState();
  const races = Array.isArray(s?.races) ? s.races : [];
  const wanted = Number(raceNo || s?.selectedRace || 0);
  const race = races.find(r => Number(r?.no ?? r?.raceNo ?? r?.kosuNo) === wanted) || (races.length === 1 ? races[0] : null);
  if (!race) return null;
  const no = Number(race?.no ?? race?.raceNo ?? race?.kosuNo ?? 0);
  const date = clean(s?.date || document.getElementById('raceDate')?.value);
  return { raceNo: no, date, year: Number(date.slice(0, 4)) || 0 };
}
function activateRace(raceNo = 0) {
  const ctx = currentContext(raceNo);
  if (!ctx?.date) return;
  activeRaceNo = ctx.raceNo;
  activeCutoff = ctx.date;
  activeYear = ctx.year;
  applyCutoff();
}
function visibleRows() {
  return [...document.querySelectorAll('#aaResults .aa-row')].filter(row => !row.hidden);
}
function updateCounts() {
  const rows = visibleRows();
  const totalSelected = selectionSet()?.size || 0;
  const count = document.getElementById('aaResultCount');
  if (count) count.textContent = `${rows.length} geçmiş yarış gösteriliyor · ${totalSelected} seçili`;
  const select = document.getElementById('aaSelectVisible');
  if (select) select.textContent = `Gösterilenleri Seç (${rows.length})`;
  const status = document.getElementById('aaSelectionStatus');
  if (status) status.textContent = `${rows.filter(r => r.querySelector('[data-select]')?.checked).length}/${rows.length} bu listede seçili · ${totalSelected} toplam`;
}
function ensureControls() {
  const results = document.getElementById('aaResults');
  const head = results?.closest('.aa-section')?.querySelector('.aa-results-head');
  if (!results || !head) return;
  let box = document.getElementById('aaBulkSelectControls');
  if (!box) {
    box = document.createElement('div');
    box.id = 'aaBulkSelectControls';
    box.className = 'aa-actions';
    box.style.margin = '8px 0';
    box.innerHTML = '<button type="button" class="aa-btn secondary" id="aaSelectVisible">Gösterilenleri Seç</button><button type="button" class="aa-btn secondary" id="aaClearVisible">Gösterilenlerin Seçimini Kaldır</button><button type="button" class="aa-btn secondary" id="aaClearAllSelected">Tüm Seçimleri Kaldır</button><span class="aa-status" id="aaSelectionStatus" style="margin:0"></span>';
    head.insertAdjacentElement('afterend', box);
    document.getElementById('aaSelectVisible')?.addEventListener('click', () => bulkSet(true));
    document.getElementById('aaClearVisible')?.addEventListener('click', () => bulkSet(false));
    document.getElementById('aaClearAllSelected')?.addEventListener('click', clearAll);
  }
  let note = document.getElementById('aaHistoricalCutoffNote');
  if (!note) {
    note = document.createElement('div');
    note.id = 'aaHistoricalCutoffNote';
    note.className = 'aa-note';
    note.style.margin = '8px 0';
    box.insertAdjacentElement('afterend', note);
  }
  note.innerHTML = activeCutoff
    ? `<b>Tarih sınırı:</b> yalnız ${activeCutoff} tarihinden önceki yarışlar seçilebilir.`
    : '<b>Tarih sınırı:</b> bugünkü koşu seçilirse ileri tarihli kayıtlar otomatik dışlanır.';
}
function applyCutoff() {
  ensureControls();
  const set = selectionSet();
  for (const row of document.querySelectorAll('#aaResults .aa-row')) {
    const date = clean(row.dataset.date);
    const eligible = !activeCutoff || !date || date < activeCutoff;
    row.hidden = !eligible;
    if (!eligible) {
      const input = row.querySelector('[data-select]');
      if (input) {
        input.checked = false;
        if (input.dataset.select) set?.delete(input.dataset.select);
      }
    }
  }
  updateCounts();
}
function bulkSet(checked) {
  const set = selectionSet();
  for (const row of visibleRows()) {
    const input = row.querySelector('[data-select]');
    const id = clean(input?.dataset?.select);
    if (!input || !id) continue;
    input.checked = checked;
    checked ? set?.add(id) : set?.delete(id);
  }
  updateCounts();
  try { window.dispatchEvent(new CustomEvent('at-ai:annual-archive-selection', { detail: { selected: set?.size || 0 } })); } catch {}
}
function clearAll() {
  selectionSet()?.clear();
  document.querySelectorAll('#aaResults [data-select]').forEach(input => { input.checked = false; });
  updateCounts();
}
function updateVersion() {
  const el = document.querySelector('#tjkAnnualArchiveDialog .aa-eyebrow');
  if (el) el.textContent = `AT AI SYSTEM · ${VERSION}`;
}

window.addEventListener('at-ai:annual-archive-created', () => { ensureControls(); updateVersion(); activateRace(); });
window.addEventListener('at-ai:annual-archive-open', () => { ensureControls(); updateVersion(); activateRace(activeRaceNo); });
window.addEventListener('at-ai:annual-archive-render', () => { applyCutoff(); });
window.addEventListener('at-ai:annual-archive-selection', updateCounts);
document.addEventListener('change', event => {
  if (event.target?.matches?.('#aaResults [data-select]')) setTimeout(updateCounts, 0);
}, true);
document.addEventListener('click', event => {
  const race = event.target?.closest?.('[data-aa-race]');
  if (race) {
    const no = Number(race.dataset.aaRace || 0);
    if (no) setTimeout(() => activateRace(no), 0);
  }
}, true);

window.ATAnnualArchiveGuardV14 = { version: VERSION, apply: applyCutoff, activateRace };
console.info('[AT AI]', VERSION, 'aktif — gözlemcisiz tarih sınırı ve toplu seçim');
})();
