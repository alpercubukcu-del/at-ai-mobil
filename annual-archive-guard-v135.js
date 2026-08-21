/* AT AI Mobil — Annual Archive Guard V13.5
   Standalone guard for the separate TJK annual archive.
   Career analysis source files are not modified.
   - keeps annual candidates strictly before the selected current race date
   - requires exact extra-condition token equality while a current race is active
   - bulk-selects only eligible rows once (no render loop)
   - clears stale selections when filters/current race change
   - runs analysis only with selected rows whose raceNo is already resolved
   - bridges the annual module's legacy window.state lookup to the live app state
*/
(() => {
  'use strict';
  if (window.__AT_ANNUAL_ARCHIVE_GUARD_V135__) return;
  window.__AT_ANNUAL_ARCHIVE_GUARD_V135__ = true;

  const VERSION = 'TJK-ANNUAL-ARCHIVE-V13.5';
  const STORAGE_KEY = 'at_ai_mobil_state_v2';
  const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const fold = v => clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

  let activeRaceNo = 0;
  let activeCutoff = '';
  let processQueued = false;
  let passThroughRun = false;
  let controlsBound = false;

  const lexicalStateGetter = (() => {
    try {
      if (typeof state !== 'undefined') return () => state;
    } catch {}
    return null;
  })();

  function readMainState() {
    try {
      const s = lexicalStateGetter?.();
      if (s && typeof s === 'object') return s;
    } catch {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function installStateBridge() {
    try {
      const desc = Object.getOwnPropertyDescriptor(window, 'state');
      if (desc && !desc.configurable) return;
      Object.defineProperty(window, 'state', {
        configurable: true,
        enumerable: false,
        get() {
          const s = readMainState();
          if (!s || !activeRaceNo) return s;
          return { ...s, selectedRace: String(activeRaceNo) };
        }
      });
    } catch {}
  }

  function selectionSet() {
    const s = window.__AT_AA_SELECTED_IDS_V134__;
    return s && typeof s.add === 'function' && typeof s.delete === 'function' && typeof s.clear === 'function' ? s : null;
  }

  function canonicalToken(v = '') {
    const t = fold(v).replace(/\s+/g, '');
    if (!t) return '';
    if (t === 'D' || t === 'DISI') return 'DISI';
    if (t === 'E' || t === 'ERKEK') return 'ERKEK';
    const y = t.match(/^Y-?(\d+)$/); if (y) return `Y${y[1]}`;
    const h = t.match(/^H-?(\d+)$/); if (h) return `H${h[1]}`;
    return t;
  }

  function classParts(raw = '') {
    const p = clean(raw).replace(/\s*\/\s*/g, '/').split('/').map(clean).filter(Boolean);
    return { base: p.shift() || '', tokens: p.map(canonicalToken).filter(Boolean).sort() };
  }

  function currentContext(raceNo) {
    const s = readMainState();
    const races = Array.isArray(s?.races) ? s.races : [];
    const race = races.find(r => Number(r?.no ?? r?.raceNo ?? r?.kosuNo) === Number(raceNo));
    if (!race) return null;
    const cityId = clean(s?.city);
    const city = clean((Array.isArray(s?.cities) ? s.cities : []).find(c => clean(c?.id) === cityId)?.name)
      || clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent)
      || cityId;
    const rawDistance = clean(race?.distance || race?.mesafe);
    return {
      raceNo: Number(race?.no || race?.raceNo || raceNo),
      date: clean(s?.date || document.getElementById('raceDate')?.value),
      city,
      group: clean(race?.ageGroup || race?.yaradi2 || race?.group || race?.age_group),
      classRaw: clean(race?.class || race?.yaradi1),
      distance: rawDistance.match(/\d+/)?.[0] || rawDistance,
      track: clean(race?.track || race?.pist)
    };
  }

  function setSelect(id, value) {
    const el = document.getElementById(id);
    if (!el || !clean(value)) return false;
    const wanted = fold(value);
    const option = [...el.options].find(o => clean(o.value) === clean(value))
      || [...el.options].find(o => fold(o.value) === wanted)
      || [...el.options].find(o => fold(o.textContent) === wanted);
    if (!option) return false;
    el.value = option.value;
    return true;
  }

  function selectedTokenKeys() {
    return [...document.querySelectorAll('#aaTokens input[type="checkbox"]:checked')]
      .map(x => canonicalToken(x.value))
      .filter(Boolean)
      .sort();
  }

  function rowTokenKeys(row) {
    const sub = clean(row.querySelector('.aa-row-sub')?.textContent);
    const m = sub.match(/Kanonik:\s*(.+)$/i);
    if (!m) return [];
    const parts = m[1].split('·').map(clean).filter(Boolean);
    parts.shift();
    return parts.map(canonicalToken).filter(Boolean).sort();
  }

  function sameTokens(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function rowIso(row) {
    const text = clean(row.querySelector('.aa-row-title')?.textContent);
    const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }

  function rowId(row) {
    return clean(row.querySelector('[data-select]')?.dataset?.select);
  }

  function rowResolved(row) {
    if (row.querySelector('.aa-resolved')) return true;
    return /\b\d+\.K\s*✓/i.test(clean(row.textContent));
  }

  function rowEligible(row) {
    if (!row || !row.querySelector('[data-select]')) return false;
    if (activeCutoff) {
      const iso = rowIso(row);
      if (iso && iso >= activeCutoff) return false;
    }
    if (activeRaceNo) {
      const wanted = selectedTokenKeys();
      const actual = rowTokenKeys(row);
      if (!sameTokens(wanted, actual)) return false;
    }
    return true;
  }

  function allResultRows() {
    return [...document.querySelectorAll('#aaResults .aa-row')];
  }

  function eligibleRows() {
    return allResultRows().filter(rowEligible);
  }

  function selectedEligibleRows() {
    return eligibleRows().filter(row => row.querySelector('[data-select]')?.checked);
  }

  function clearSelectionSet() {
    const set = selectionSet();
    set?.clear();
    document.querySelectorAll('#aaResults [data-select]').forEach(x => { x.checked = false; });
  }

  function updateVersionLabel() {
    const eyebrow = document.querySelector('#tjkAnnualArchiveDialog .aa-eyebrow');
    if (eyebrow && eyebrow.textContent !== `AT AI SYSTEM · ${VERSION}`) {
      eyebrow.textContent = `AT AI SYSTEM · ${VERSION}`;
    }
  }

  function ensureControls() {
    const results = document.getElementById('aaResults');
    const head = results?.closest('.aa-section')?.querySelector('.aa-results-head');
    if (!results || !head) return;

    let controls = document.getElementById('aaBulkSelectControls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'aaBulkSelectControls';
      controls.className = 'aa-actions';
      controls.style.margin = '8px 0';
      head.insertAdjacentElement('afterend', controls);
    }
    if (controls.dataset.v135 !== '1') {
      controls.dataset.v135 = '1';
      controls.innerHTML = `
        <button type="button" class="aa-btn secondary" id="aaSelectAllVisible">Gösterilenleri Seç</button>
        <button type="button" class="aa-btn secondary" id="aaClearVisibleSelection">Listedeki Seçimi Temizle</button>
        <span class="aa-status" id="aaBulkSelectStatus" style="margin:0"></span>`;
      document.getElementById('aaSelectAllVisible')?.addEventListener('click', event => {
        event.preventDefault();
        bulkSet(true);
      });
      document.getElementById('aaClearVisibleSelection')?.addEventListener('click', event => {
        event.preventDefault();
        bulkSet(false);
      });
      controlsBound = true;
    }
  }

  function refreshCounts() {
    const rows = eligibleRows();
    const selected = rows.filter(r => r.querySelector('[data-select]')?.checked).length;
    const excluded = allResultRows().length - rows.length;
    const count = document.getElementById('aaResultCount');
    const text = `${rows.length} geçmiş yarış gösteriliyor · ${selected} seçili${excluded > 0 ? ` · ${excluded} uygun olmayan dışlandı` : ''}`;
    if (count && count.textContent !== text) count.textContent = text;
    const all = document.getElementById('aaSelectAllVisible');
    if (all) all.textContent = `Gösterilenleri Seç (${rows.length})`;
    const status = document.getElementById('aaBulkSelectStatus');
    if (status) status.textContent = `${selected}/${rows.length} seçili`;
  }

  function processRows() {
    updateVersionLabel();
    ensureControls();
    const set = selectionSet();
    for (const row of allResultRows()) {
      const eligible = rowEligible(row);
      row.hidden = !eligible;
      const input = row.querySelector('[data-select]');
      if (!eligible && input) {
        input.checked = false;
        if (input.dataset.select) set?.delete(input.dataset.select);
      }
    }
    refreshCounts();
  }

  function queueProcess() {
    if (processQueued) return;
    processQueued = true;
    requestAnimationFrame(() => {
      processQueued = false;
      processRows();
    });
  }

  function bulkSet(checked) {
    processRows();
    const set = selectionSet();
    const rows = eligibleRows();
    for (const row of rows) {
      const input = row.querySelector('[data-select]');
      const id = clean(input?.dataset?.select);
      if (!input || !id) continue;
      input.checked = checked;
      checked ? set?.add(id) : set?.delete(id);
    }
    refreshCounts();
  }

  function applyCurrentRace(raceNo) {
    const ctx = currentContext(raceNo);
    if (!ctx) return;
    activeRaceNo = ctx.raceNo;
    activeCutoff = ctx.date;
    clearSelectionSet();
    const cp = classParts(ctx.classRaw);

    const apply = () => {
      setSelect('aaCity', ctx.city);
      setSelect('aaGroup', ctx.group);
      setSelect('aaClassBase', cp.base);
      setSelect('aaDistance', ctx.distance);
      setSelect('aaTrack', ctx.track);
      const wanted = new Set(cp.tokens);
      document.querySelectorAll('#aaTokens input[type="checkbox"]').forEach(input => {
        input.checked = wanted.has(canonicalToken(input.value));
      });
      const yearTo = document.getElementById('aaYearTo');
      const y = Number(ctx.date.slice(0, 4));
      if (yearTo && [...yearTo.options].some(o => Number(o.value) === y)) yearTo.value = String(y);
      const trigger = document.getElementById('aaTrack') || document.getElementById('aaClassBase');
      trigger?.dispatchEvent(new Event('change', { bubbles: true }));
      queueProcess();
    };
    setTimeout(apply, 0);
    setTimeout(apply, 120);
  }

  function deactivateCurrentContext() {
    activeRaceNo = 0;
    activeCutoff = '';
    clearSelectionSet();
    queueProcess();
  }

  function prepareAndRun(button) {
    processRows();
    const chosen = selectedEligibleRows();
    const output = document.getElementById('aaAnalysis');
    if (!chosen.length) {
      if (output) output.innerHTML = '<div class="aa-note" style="color:#ffbd82">Önce en az bir geçmiş yarış seçin.</div>';
      return;
    }

    const resolved = chosen.filter(rowResolved);
    const unresolved = chosen.filter(row => !rowResolved(row));
    const set = selectionSet();
    set?.clear();
    for (const row of chosen) {
      const input = row.querySelector('[data-select]');
      if (!input) continue;
      if (rowResolved(row)) {
        input.checked = true;
        if (input.dataset.select) set?.add(input.dataset.select);
      } else {
        input.checked = false;
      }
    }
    refreshCounts();

    if (!resolved.length) {
      if (output) output.innerHTML = '<div class="aa-note" style="color:#ffbd82">Seçilen yarışların hiçbirinde Koşu No kesinleşmiş değil. Önce “Seçilenlerin Koşu No’sunu Çöz” düğmesini kullanın.</div>';
      return;
    }

    if (unresolved.length) {
      const status = document.getElementById('aaUpdateStatus');
      if (status) status.textContent = `${unresolved.length} seçili yarışın Koşu No'su çözülemedi; ${resolved.length} kesinleşmiş yarışla analiz başlatılıyor.`;
    }

    passThroughRun = true;
    button.click();
  }

  installStateBridge();

  document.addEventListener('click', event => {
    const raceChoice = event.target?.closest?.('[data-aa-race]');
    if (raceChoice) {
      const no = Number(raceChoice.dataset.aaRace || 0);
      if (no) applyCurrentRace(no);
      return;
    }

    if (event.target?.closest?.('#aaClearFilters')) {
      deactivateCurrentContext();
      return;
    }

    const run = event.target?.closest?.('#aaRunSelected');
    if (run) {
      if (passThroughRun) {
        passThroughRun = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      prepareAndRun(run);
    }
  }, true);

  const filterIds = new Set(['aaYearFrom','aaYearTo','aaCity','aaGroup','aaClassBase','aaDistance','aaTrack']);
  document.addEventListener('change', event => {
    const target = event.target;
    if (!target) return;
    if (filterIds.has(target.id) || target.closest?.('#aaTokens')) {
      clearSelectionSet();
      queueProcess();
    }
  }, true);

  document.addEventListener('input', event => {
    if (event.target?.id === 'aaRaceName') {
      clearSelectionSet();
      queueProcess();
    }
  }, true);

  const observer = new MutationObserver(() => queueProcess());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', () => queueProcess());
  queueProcess();

  console.info('[AT AI]', VERSION, 'aktif — strict tarihsel seçim ve güvenli toplu seçim');
})();
