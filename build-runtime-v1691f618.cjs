const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f617.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.18] Missing F60.17 base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');

const bridge = String.raw`
;(() => {
'use strict';
if (window.__AT_DAILY_CALIBRATION_SELECTION_BRIDGE_V618__) return;
window.__AT_DAILY_CALIBRATION_SELECTION_BRIDGE_V618__ = true;
const VERSION = 'DAILY-CALIBRATION-SELECTION-BRIDGE-V16.9.1F60.18';
const remembered = new Set();
const clean = v => String(v ?? '').trim();
const add = (set, id) => { id = clean(id); if (id) set.add(id); };

function checkedArchiveIds() {
  const out = new Set();
  document.querySelectorAll('[data-select]:checked').forEach(el => add(out, el.dataset?.select));
  return out;
}

function legacyIds() {
  const out = new Set();
  const api = window.ATAnnualArchiveV13;
  try { (api?.getSelectedIds?.() || []).forEach(id => add(out, id)); } catch {}
  try {
    const set = window.__AT_AA_SELECTED_IDS_V134__;
    if (set && typeof set.values === 'function') [...set.values()].forEach(id => add(out, id));
  } catch {}
  return out;
}

function collect() {
  const direct = new Set(remembered);
  checkedArchiveIds().forEach(id => direct.add(id));
  if (direct.size) return [...direct];
  return [...legacyIds()];
}

function syncLegacySelection() {
  const ids = collect();
  if (!ids.length) return [];
  remembered.clear();
  ids.forEach(id => remembered.add(id));
  const sets = [];
  const apiSet = window.ATAnnualArchiveV13?.selectionSet;
  const hookSet = window.__AT_AA_SELECTED_IDS_V134__;
  if (apiSet && typeof apiSet.clear === 'function' && typeof apiSet.add === 'function') sets.push(apiSet);
  if (hookSet && hookSet !== apiSet && typeof hookSet.clear === 'function' && typeof hookSet.add === 'function') sets.push(hookSet);
  sets.forEach(set => { set.clear(); ids.forEach(id => set.add(id)); });
  return ids;
}

document.addEventListener('change', event => {
  const select = event.target?.closest?.('[data-select]');
  if (select) {
    const id = clean(select.dataset?.select);
    if (id) select.checked ? remembered.add(id) : remembered.delete(id);
    return;
  }
  if (event.target?.matches?.('#xcalRace')) remembered.clear();
}, true);

window.addEventListener('at-ai:annual-archive-selection', () => {
  checkedArchiveIds().forEach(id => remembered.add(id));
});

document.addEventListener('click', event => {
  if (event.target?.closest?.('#xcalOpenAnnual')) {
    remembered.clear();
    return;
  }
  if (!event.target?.closest?.('#xcalRunSelected')) return;
  const ids = syncLegacySelection();
  if (ids.length) {
    const status = document.getElementById('xcalStatus');
    if (status) status.textContent = ids.length + ' seçili geçmiş yarış kalibrasyona aktarılıyor…';
  }
}, true);

window.ATDailyCalibrationSelectionBridgeV618 = {
  version: VERSION,
  getSelectedIds: collect,
  sync: syncLegacySelection
};
console.info('[AT AI]', VERSION, 'active — Daily Calibration selection is bridged to F60.18.10 legacy annual selection.');
})();
`;

app += '\n\n' + bridge + '\n';

for (const token of [
  '__AT_DAILY_RACE_CALIBRATION_V6018__',
  'DAILY-RACE-CALIBRATION-V16.9.1F60.18',
  'CAREER-MATCH-SELECTOR-V16.9.1F60.12-BULK',
  '__AT_DAILY_CALIBRATION_SELECTION_BRIDGE_V618__',
  'DAILY-CALIBRATION-SELECTION-BRIDGE-V16.9.1F60.18',
  "event.target?.closest?.('#xcalRunSelected')",
  'syncLegacySelection'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.18] Verification failed: ' + token);
}
for (const forbidden of [
  '__AT_DAILY_CALIBRATION_MATCH_SELECTOR_V613__',
  '__AT_DAILY_CALIBRATION_MATCH_SELECTOR_V614__',
  '__AT_DAILY_CALIBRATION_ALL_VARIANTS_V615__',
  '__AT_DAILY_CALIBRATION_DIRECT_V616__'
]) {
  if (app.includes(forbidden)) throw new Error('[V16.9.1F60.18] Forbidden post-F60.18.10 Daily Calibration UI layer present: ' + forbidden);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169218');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.18 build complete: F60.18.10 Daily Calibration selection bridge fixed; Career Roadmap untouched.');
