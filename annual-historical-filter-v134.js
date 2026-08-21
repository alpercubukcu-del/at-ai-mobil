/* AT AI Mobil — Annual Historical Filter V13.4
   Standalone annual-archive hardening. Does not modify Career analysis files.
   - Re-applies current race city/distance filters reliably.
   - Excludes current-day/future annual rows from historical candidates.
   - Clears stale selections when a new current race is chosen.
   - Resolves selected race numbers first and skips only rows that still cannot resolve.
*/
(() => {
  'use strict';
  if (window.__AT_AA_HISTORICAL_FILTER_V134__) return;
  window.__AT_AA_HISTORICAL_FILTER_V134__ = true;

  const STORAGE_KEY = 'at_ai_mobil_state_v2';
  const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const fold = v => clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

  let activeRaceNo = null;
  let activeCutoff = '';
  let processQueued = false;
  let runPassThrough = false;
  let runBusy = false;

  function readState() {
    try {
      if (typeof state !== 'undefined' && state && typeof state === 'object') return state;
    } catch {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function selectedSet() {
    const s = window.__AT_AA_SELECTED_IDS_V134__;
    return s && typeof s.clear === 'function' && typeof s.delete === 'function' ? s : null;
  }

  function currentContext(raceNo) {
    const s = readState();
    const races = Array.isArray(s?.races) ? s.races : [];
    const race = races.find(r => Number(r?.no ?? r?.raceNo ?? r?.kosuNo) === Number(raceNo));
    if (!race) return null;
    const cityId = clean(s?.city);
    const city = clean((Array.isArray(s?.cities) ? s.cities : []).find(c => clean(c?.id) === cityId)?.name)
      || clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent)
      || cityId;
    const distanceRaw = clean(race.distance || race.mesafe);
    const distance = distanceRaw.match(/\d+/)?.[0] || distanceRaw;
    return {
      raceNo: Number(race?.no || race?.raceNo || raceNo),
      city,
      date: clean(s?.date || document.getElementById('raceDate')?.value),
      classRaw: clean(race.class || race.yaradi1),
      ageGroup: clean(race.ageGroup || race.yaradi2 || race.group || race.age_group),
      distance,
      track: clean(race.track || race.pist)
    };
  }

  function classParts(raw = '') {
    const parts = clean(raw).replace(/\s*\/\s*/g, '/').split('/').map(clean).filter(Boolean);
    const base = parts.shift() || '';
    const tokens = parts.map(v => {
      const t = fold(v).replace(/\s+/g, '');
      if (t === 'D' || t === 'DISI') return 'DISI';
      if (t === 'E' || t === 'ERKEK') return 'ERKEK';
      const y = t.match(/^Y-?(\d+)$/); if (y) return `Y${y[1]}`;
      const h = t.match(/^H-?(\d+)$/); if (h) return `H${h[1]}`;
      return t;
    }).filter(Boolean);
    return { base, tokens };
  }

  function setSelect(id, value) {
    const el = document.getElementById(id);
    if (!el || !clean(value)) return false;
    const wanted = fold(value);
    const opt = [...el.options].find(o => clean(o.value) === clean(value))
      || [...el.options].find(o => fold(o.value) === wanted)
      || [...el.options].find(o => fold(o.textContent) === wanted);
    if (!opt) return false;
    el.value = opt.value;
    return true;
  }

  function clearSelections() {
    const set = selectedSet();
    if (set) set.clear();
    document.querySelectorAll('#aaResults input[data-select]').forEach(x => { x.checked = false; });
    const trigger = document.getElementById('aaTrack') || document.getElementById('aaClassBase');
    trigger?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyStrictFilters(raceNo) {
    const ctx = currentContext(raceNo);
    if (!ctx) return;
    activeRaceNo = ctx.raceNo;
    activeCutoff = ctx.date;
    const cp = classParts(ctx.classRaw);

    const applyOnce = () => {
      setSelect('aaCity', ctx.city);
      setSelect('aaGroup', ctx.ageGroup);
      setSelect('aaClassBase', cp.base);
      setSelect('aaDistance', ctx.distance);
      setSelect('aaTrack', ctx.track);

      const wanted = new Set(cp.tokens);
      document.querySelectorAll('#aaTokens input[type="checkbox"]').forEach(input => {
        const t = fold(input.value).replace(/\s+/g, '');
        input.checked = wanted.has(t === 'D' ? 'DISI' : t === 'E' ? 'ERKEK' : t.replace(/^Y-(\d+)$/, 'Y$1').replace(/^H-(\d+)$/, 'H$1'));
      });

      const yt = document.getElementById('aaYearTo');
      const currentYear = Number(ctx.date.slice(0, 4));
      if (yt && [...yt.options].some(o => Number(o.value) === currentYear)) yt.value = String(currentYear);

      const trigger = document.getElementById('aaTrack') || document.getElementById('aaClassBase');
      trigger?.dispatchEvent(new Event('change', { bubbles: true }));
      annotateSelectedSummary(ctx);
      queueProcessRows();
    };

    applyOnce();
    setTimeout(applyOnce, 120);
    setTimeout(applyOnce, 360);
  }

  function annotateSelectedSummary(ctx) {
    const box = document.getElementById('aaCurrentRacePicker');
    if (!box || !activeCutoff) return;
    let note = document.getElementById('aaHistoricalCutoffNote');
    if (!note) {
      note = document.createElement('div');
      note.id = 'aaHistoricalCutoffNote';
      note.className = 'aa-note';
      note.style.marginTop = '8px';
      box.insertAdjacentElement('afterend', note);
    }
    note.innerHTML = `<b>Tarihsel sınır aktif</b><br>${ctx.city} · ${ctx.raceNo}.K için yalnız <b>${activeCutoff}</b> tarihinden önceki yarışlar kullanılır. Şehir ve mesafe bugünkü koşudan otomatik dolduruldu; istersen sonradan elle değiştirebilirsin.`;
  }

  function rowIso(row) {
    const text = clean(row.querySelector('.aa-row-title')?.textContent);
    const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }

  function processRows() {
    if (!activeCutoff) return;
    const box = document.getElementById('aaResults');
    if (!box) return;
    const rows = [...box.querySelectorAll('.aa-row')];
    let hiddenFuture = 0;
    let shown = 0;
    const set = selectedSet();

    for (const row of rows) {
      const iso = rowIso(row);
      const historical = !iso || iso < activeCutoff;
      row.style.display = historical ? '' : 'none';
      if (historical) {
        shown++;
      } else {
        hiddenFuture++;
        const cb = row.querySelector('input[data-select]');
        if (cb?.dataset?.select && set?.has(cb.dataset.select)) set.delete(cb.dataset.select);
        if (cb) cb.checked = false;
      }
    }

    const count = document.getElementById('aaResultCount');
    if (count) {
      const selectedCount = set?.size ?? [...box.querySelectorAll('input[data-select]:checked')].length;
      count.textContent = `${shown} geçmiş yarış gösteriliyor · ${selectedCount} seçili${hiddenFuture ? ` · ${hiddenFuture} güncel/gelecek dışlandı` : ''}`;
    }
  }

  function queueProcessRows() {
    if (processQueued) return;
    processQueued = true;
    requestAnimationFrame(() => {
      processQueued = false;
      processRows();
    });
  }

  function selectedVisibleRows() {
    return [...document.querySelectorAll('#aaResults .aa-row')].filter(row => {
      const cb = row.querySelector('input[data-select]');
      return cb?.checked && row.style.display !== 'none';
    });
  }

  function unresolvedSelectedRows() {
    return selectedVisibleRows().filter(row => !row.querySelector('.aa-resolved'));
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function waitForResolve(maxMs = 120000) {
    const start = Date.now();
    let sawProgress = false;
    while (Date.now() - start < maxMs) {
      await sleep(350);
      const text = clean(document.getElementById('aaUpdateStatus')?.textContent);
      const m = text.match(/Koşu No çözümleme:\s*(\d+)\s*\/\s*(\d+)/i);
      if (m) {
        sawProgress = true;
        if (Number(m[1]) >= Number(m[2])) {
          await sleep(350);
          return true;
        }
      } else if (sawProgress && unresolvedSelectedRows().length === 0) {
        return true;
      }
    }
    return false;
  }

  async function prepareAndRun(button) {
    if (runBusy) return;
    runBusy = true;
    try {
      processRows();
      const set = selectedSet();
      const out = document.getElementById('aaAnalysis');
      if (!set || set.size === 0) {
        if (out) out.innerHTML = '<div class="aa-note" style="color:#ffbd82">Önce en az bir geçmiş yarış seçin.</div>';
        return;
      }

      let unresolved = unresolvedSelectedRows();
      if (unresolved.length) {
        if (out) out.innerHTML = `<div class="aa-note">${unresolved.length} seçili yarışın Koşu No'su hazırlanıyor…</div>`;
        document.getElementById('aaResolve')?.click();
        await waitForResolve();
        processRows();
        unresolved = unresolvedSelectedRows();
      }

      let removed = 0;
      for (const row of unresolved) {
        const cb = row.querySelector('input[data-select]');
        if (!cb?.dataset?.select) continue;
        if (set.delete(cb.dataset.select)) removed++;
        cb.checked = false;
      }

      processRows();
      if (set.size === 0) {
        if (out) out.innerHTML = `<div class="aa-note" style="color:#ffbd82">Seçilen yarışların Koşu No'su kesinleştirilemedi. ${removed ? `${removed} yarış analizden çıkarıldı.` : ''}</div>`;
        return;
      }

      if (removed) {
        const status = document.getElementById('aaUpdateStatus');
        if (status) status.textContent = `${removed} yarışın Koşu No'su çözülemedi; ${set.size} kesinleşmiş yarışla analiz devam ediyor.`;
      }

      runPassThrough = true;
      button.click();
    } finally {
      runBusy = false;
    }
  }

  document.addEventListener('click', event => {
    const choice = event.target?.closest?.('[data-aa-race]');
    if (choice) {
      const no = Number(choice.dataset.aaRace || 0);
      if (no) {
        clearSelections();
        activeRaceNo = no;
        const ctx = currentContext(no);
        activeCutoff = ctx?.date || '';
        setTimeout(() => applyStrictFilters(no), 0);
      }
      return;
    }

    const run = event.target?.closest?.('#aaRunSelected');
    if (run) {
      if (runPassThrough) {
        runPassThrough = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      prepareAndRun(run);
    }
  }, true);

  const observer = new MutationObserver(() => queueProcessRows());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
