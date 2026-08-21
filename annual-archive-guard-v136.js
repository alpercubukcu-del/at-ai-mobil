/* AT AI Mobil — Annual Archive Guard V13.6
   Free historical selection for the separate TJK annual archive.
   Career analysis source files are not modified.
*/
(() => {
  'use strict';
  if (window.__AT_ANNUAL_ARCHIVE_GUARD_V136__) return;
  window.__AT_ANNUAL_ARCHIVE_GUARD_V136__ = true;

  const VERSION = 'TJK-ANNUAL-ARCHIVE-V13.6';
  const STORAGE_KEY = 'at_ai_mobil_state_v2';
  const DB_NAME = 'at_ai_tjk_annual_archive_v13';
  const DB_VERSION = 1;
  const STORE_RACES = 'races';
  const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I').replace(/[^A-Z0-9]+/g, ' ').trim();

  let activeRaceNo = 0;
  let activeCutoff = '';
  let activeYear = 0;
  let processQueued = false;
  let runPassThrough = false;
  let runBusy = false;
  let dbPromise = null;

  const lexicalStateGetter = (() => {
    try { if (typeof state !== 'undefined') return () => state; } catch {}
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
    } catch { return null; }
  }

  function installStateBridge() {
    try {
      const d = Object.getOwnPropertyDescriptor(window, 'state');
      if (d && !d.configurable) return;
      Object.defineProperty(window, 'state', {
        configurable: true,
        enumerable: false,
        get() {
          const s = readMainState();
          return s && activeRaceNo ? { ...s, selectedRace: String(activeRaceNo) } : s;
        }
      });
    } catch {}
  }

  function selectionSet() {
    const s = window.__AT_AA_SELECTED_IDS_V134__;
    return s && typeof s.add === 'function' && typeof s.delete === 'function' && typeof s.clear === 'function' ? s : null;
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
    return { base: p.shift() || '', tokens: p.map(canonicalToken).filter(Boolean) };
  }

  function setSelect(id, value) {
    const el = document.getElementById(id);
    if (!el || !clean(value)) return false;
    const wanted = fold(value);
    const o = [...el.options].find(x => clean(x.value) === clean(value))
      || [...el.options].find(x => fold(x.value) === wanted)
      || [...el.options].find(x => fold(x.textContent) === wanted);
    if (!o) return false;
    el.value = o.value;
    return true;
  }

  function setAny(id, value = '') {
    const el = document.getElementById(id);
    if (!el) return;
    if ([...el.options].some(o => String(o.value) === String(value))) el.value = String(value);
    else el.value = '';
  }

  function rowIso(row) {
    const text = clean(row.querySelector('.aa-row-title')?.textContent);
    const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }

  function rowEligible(row) {
    if (!row?.querySelector?.('[data-select]')) return false;
    const iso = rowIso(row);
    return !activeCutoff || !iso || iso < activeCutoff;
  }

  function allRows() { return [...document.querySelectorAll('#aaResults .aa-row')]; }
  function visibleRows() { return allRows().filter(rowEligible); }

  function updateVersion() {
    const el = document.querySelector('#tjkAnnualArchiveDialog .aa-eyebrow');
    if (el && el.textContent !== `AT AI SYSTEM · ${VERSION}`) el.textContent = `AT AI SYSTEM · ${VERSION}`;
  }

  function ensureBrowseControls() {
    const picker = document.getElementById('aaCurrentRacePicker');
    if (!picker || !activeCutoff) return;
    let box = document.getElementById('aaFreeBrowseControls');
    if (!box) {
      box = document.createElement('div');
      box.id = 'aaFreeBrowseControls';
      box.className = 'aa-actions';
      box.style.margin = '8px 0 4px';
      picker.insertAdjacentElement('afterend', box);
    }
    box.innerHTML = `
      <button type="button" class="aa-btn secondary" id="aaBrowseCurrentYear">${activeYear} Yılının Önceki Yarışları</button>
      <button type="button" class="aa-btn secondary" id="aaRestoreCurrentFilters">Bugünkü Koşu Filtresine Dön</button>`;
    document.getElementById('aaBrowseCurrentYear')?.addEventListener('click', browseCurrentYear, { once: true });
    document.getElementById('aaRestoreCurrentFilters')?.addEventListener('click', restoreCurrentFilters, { once: true });
  }

  function ensureBulkControls() {
    const results = document.getElementById('aaResults');
    const head = results?.closest('.aa-section')?.querySelector('.aa-results-head');
    if (!results || !head) return;
    let box = document.getElementById('aaBulkSelectControls');
    if (!box) {
      box = document.createElement('div');
      box.id = 'aaBulkSelectControls';
      box.className = 'aa-actions';
      box.style.margin = '8px 0';
      head.insertAdjacentElement('afterend', box);
    }
    if (box.dataset.v136 === '1') return;
    box.dataset.v136 = '1';
    box.innerHTML = `
      <button type="button" class="aa-btn secondary" id="aaSelectVisible">Gösterilenleri Seç</button>
      <button type="button" class="aa-btn secondary" id="aaClearVisible">Gösterilenlerin Seçimini Kaldır</button>
      <button type="button" class="aa-btn secondary" id="aaClearAllSelected">Tüm Seçimleri Kaldır</button>
      <span class="aa-status" id="aaSelectionStatus" style="margin:0"></span>`;
    document.getElementById('aaSelectVisible')?.addEventListener('click', () => bulkSet(true));
    document.getElementById('aaClearVisible')?.addEventListener('click', () => bulkSet(false));
    document.getElementById('aaClearAllSelected')?.addEventListener('click', clearAllSelections);
  }

  function refreshCounts() {
    const rows = visibleRows();
    const selectedVisible = rows.filter(r => r.querySelector('[data-select]')?.checked).length;
    const totalSelected = selectionSet()?.size || 0;
    const excluded = allRows().length - rows.length;
    const count = document.getElementById('aaResultCount');
    if (count) count.textContent = `${rows.length} geçmiş yarış gösteriliyor · ${totalSelected} toplam seçili${excluded ? ` · ${excluded} tarih dışı` : ''}`;
    const sel = document.getElementById('aaSelectVisible');
    if (sel) sel.textContent = `Gösterilenleri Seç (${rows.length})`;
    const status = document.getElementById('aaSelectionStatus');
    if (status) status.textContent = `${selectedVisible}/${rows.length} bu listede seçili · ${totalSelected} toplam`;
  }

  function processRows() {
    updateVersion();
    ensureBrowseControls();
    ensureBulkControls();
    const set = selectionSet();
    for (const row of allRows()) {
      const ok = rowEligible(row);
      row.hidden = !ok;
      if (!ok) {
        const input = row.querySelector('[data-select]');
        if (input) {
          input.checked = false;
          if (input.dataset.select) set?.delete(input.dataset.select);
        }
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
    for (const row of visibleRows()) {
      const input = row.querySelector('[data-select]');
      const id = clean(input?.dataset?.select);
      if (!input || !id) continue;
      input.checked = checked;
      checked ? set?.add(id) : set?.delete(id);
    }
    refreshCounts();
  }

  function clearAllSelections() {
    selectionSet()?.clear();
    document.querySelectorAll('#aaResults [data-select]').forEach(x => { x.checked = false; });
    refreshCounts();
  }

  function triggerSearch() {
    const el = document.getElementById('aaTrack') || document.getElementById('aaClassBase') || document.getElementById('aaYearTo');
    el?.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(queueProcess, 30);
  }

  function browseCurrentYear(event) {
    event?.preventDefault?.();
    if (!activeYear) return;
    setAny('aaYearFrom', activeYear);
    setAny('aaYearTo', activeYear);
    for (const id of ['aaCity','aaGroup','aaClassBase','aaDistance','aaTrack']) setAny(id, '');
    const name = document.getElementById('aaRaceName'); if (name) name.value = '';
    document.querySelectorAll('#aaTokens input[type="checkbox"]').forEach(x => { x.checked = false; });
    triggerSearch();
    const note = document.getElementById('aaHistoricalCutoffNote');
    if (note) note.innerHTML = `<b>Serbest tarihsel seçim</b><br>${activeYear} yılında yalnız <b>${activeCutoff}</b> tarihinden önceki yarışlar gösterilir. İstediğin yarışları tek tek seçebilir, tekrar dokunarak seçimi kaldırabilirsin.`;
  }

  function restoreCurrentFilters(event) {
    event?.preventDefault?.();
    const ctx = currentContext(activeRaceNo);
    if (!ctx) return;
    const cp = classParts(ctx.classRaw);
    setSelect('aaCity', ctx.city);
    setSelect('aaGroup', ctx.group);
    setSelect('aaClassBase', cp.base);
    setSelect('aaDistance', ctx.distance);
    setSelect('aaTrack', ctx.track);
    const wanted = new Set(cp.tokens);
    document.querySelectorAll('#aaTokens input[type="checkbox"]').forEach(x => { x.checked = wanted.has(canonicalToken(x.value)); });
    triggerSearch();
  }

  function activateRace(raceNo) {
    const ctx = currentContext(raceNo);
    if (!ctx) return;
    activeRaceNo = ctx.raceNo;
    activeCutoff = ctx.date;
    activeYear = Number(ctx.date.slice(0, 4)) || 0;
    clearAllSelections();
    setTimeout(queueProcess, 0);
    setTimeout(queueProcess, 180);
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(resolve => {
      try {
        const q = indexedDB.open(DB_NAME, DB_VERSION);
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
    return dbPromise;
  }

  async function selectedRaceRecords() {
    const ids = [...(selectionSet() || [])];
    if (!ids.length) return [];
    const db = await openDb();
    if (!db) return [];
    return new Promise(resolve => {
      try {
        const tx = db.transaction(STORE_RACES, 'readonly');
        const os = tx.objectStore(STORE_RACES);
        const out = [];
        let pending = ids.length;
        for (const id of ids) {
          const q = os.get(id);
          q.onsuccess = () => { if (q.result?.value) out.push(q.result.value); if (!--pending) resolve(out); };
          q.onerror = () => { if (!--pending) resolve(out); };
        }
      } catch { resolve([]); }
    });
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function waitForResolution(maxMs = 90000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      await sleep(500);
      const text = clean(document.getElementById('aaUpdateStatus')?.textContent);
      const m = text.match(/Koşu No çözümleme:\s*(\d+)\s*\/\s*(\d+)/i);
      if (m && Number(m[1]) >= Number(m[2])) return;
    }
  }

  async function prepareAndRun(button) {
    if (runBusy) return;
    runBusy = true;
    try {
      let rows = await selectedRaceRecords();
      const set = selectionSet();
      if (activeCutoff) {
        for (const r of rows) if (clean(r.date) >= activeCutoff) set?.delete(r.id);
        rows = rows.filter(r => clean(r.date) < activeCutoff);
      }
      if (!rows.length) {
        const out = document.getElementById('aaAnalysis');
        if (out) out.innerHTML = '<div class="aa-note" style="color:#ffbd82">Önce en az bir geçmiş yarış seçin.</div>';
        return;
      }

      let unresolved = rows.filter(r => !r.raceNo);
      if (unresolved.length) {
        const out = document.getElementById('aaAnalysis');
        if (out) out.innerHTML = `<div class="aa-note">${unresolved.length} seçili yarışın Koşu No'su çözülüyor…</div>`;
        document.getElementById('aaResolve')?.click();
        await waitForResolution();
        rows = await selectedRaceRecords();
        unresolved = rows.filter(r => !r.raceNo);
      }

      const resolved = rows.filter(r => r.raceNo);
      for (const r of unresolved) set?.delete(r.id);
      if (!resolved.length) {
        const out = document.getElementById('aaAnalysis');
        if (out) out.innerHTML = '<div class="aa-note" style="color:#ffbd82">Seçilen yarışların Koşu No’su kesinleştirilemedi.</div>';
        return;
      }
      if (unresolved.length) {
        const status = document.getElementById('aaUpdateStatus');
        if (status) status.textContent = `${unresolved.length} yarış çözülemedi; ${resolved.length} kesinleşmiş yarışla analiz devam ediyor.`;
      }
      queueProcess();
      runPassThrough = true;
      button.click();
    } finally { runBusy = false; }
  }

  installStateBridge();

  document.addEventListener('click', event => {
    const race = event.target?.closest?.('[data-aa-race]');
    if (race) {
      const no = Number(race.dataset.aaRace || 0);
      if (no) activateRace(no);
      return;
    }
    const run = event.target?.closest?.('#aaRunSelected');
    if (run) {
      if (runPassThrough) { runPassThrough = false; return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      prepareAndRun(run);
    }
  }, true);

  document.addEventListener('change', event => {
    if (event.target?.matches?.('#aaResults [data-select]')) setTimeout(refreshCounts, 0);
    else if (event.target?.closest?.('#tjkAnnualArchiveDialog')) queueProcess();
  }, true);

  const observer = new MutationObserver(queueProcess);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', queueProcess);
  queueProcess();

  console.info('[AT AI]', VERSION, 'aktif — tarih öncesi serbest seçim');
})();
