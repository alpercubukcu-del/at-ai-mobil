/* AT AI Mobil — V16.9.1F58 ANNUAL CURRENT RACE LOAD-ORDER FIX
   - Current-race picker waits for the selected local annual range before applying filters.
   - Uses ATAnnualArchiveV13.search(), which reads the already stored IndexedDB range.
   - Does not download/update a year and does not delete annual archive data.
*/
(() => {
  'use strict';
  if (window.__AT_ANNUAL_CURRENT_RACE_LOADORDER_F58__) return;
  window.__AT_ANNUAL_CURRENT_RACE_LOADORDER_F58__ = true;

  const VERSION = 'ANNUAL-CURRENT-RACE-LOADORDER-V16.9.1F58';
  let bypassButton = null;
  let loading = false;

  const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

  function readMainState() {
    try {
      if (typeof state !== 'undefined' && state && typeof state === 'object') return state;
    } catch {}
    try {
      const raw = localStorage.getItem('at_ai_mobil_state_v2');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function selectedRaceYear(button) {
    const no = Number(button?.dataset?.aaRace || 0);
    const s = readMainState();
    const races = Array.isArray(s?.races) ? s.races : [];
    const race = races.find(r => Number(r?.no || r?.raceNo || r?.kosuNo || 0) === no);
    const candidates = [
      s?.date,
      race?.date,
      race?.tarih,
      document.getElementById('raceDate')?.value
    ].map(clean).filter(Boolean);
    for (const value of candidates) {
      const m = value.match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  function setYearSelect(id, year) {
    const el = document.getElementById(id);
    if (!el || !year) return false;
    const wanted = String(year);
    const option = [...el.options].find(o => clean(o.value) === wanted || clean(o.textContent) === wanted);
    if (!option) return false;
    el.value = option.value;
    return true;
  }

  async function loadLocalRange(button) {
    const year = selectedRaceYear(button);
    if (year) {
      setYearSelect('aaYearFrom', year);
      setYearSelect('aaYearTo', year);
    }

    const api = window.ATAnnualArchiveV13;
    if (!api || typeof api.search !== 'function') return;

    const status = document.getElementById('aaUpdateStatus');
    if (status && year) status.textContent = `${year} yerel arşivi filtreler için yükleniyor…`;

    // search() first calls ensureRangeLoaded() -> rowsForYearRange() -> populateFilters().
    // This is a local IndexedDB read. It does not call updateYear()/TJK download.
    await api.search();
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('.aa-current-race-choice[data-aa-race]');
    if (!button) return;

    // Re-fired click after the local catalog is ready: let the original V14.1
    // button handler execute applyRace() normally.
    if (bypassButton === button) {
      bypassButton = null;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (loading) return;
    loading = true;
    const wasDisabled = !!button.disabled;
    button.disabled = true;

    Promise.resolve().then(async () => {
      try {
        await loadLocalRange(button);
      } catch (e) {
        console.warn('[AT AI]', VERSION, 'yerel arşiv ön yükleme uyarısı:', e);
      } finally {
        loading = false;
        button.disabled = wasDisabled;
        bypassButton = button;
        // Re-run the same selection only after filter options exist.
        button.click();
        setTimeout(() => {
          if (bypassButton === button) bypassButton = null;
        }, 0);
      }
    });
  }, true);

  console.info('[AT AI]', VERSION, 'aktif — bugünkü koşu filtreleri yerel yıl kataloğundan sonra uygulanır');
})();
