/* AT AI Mobil — Annual Archive Select All V13.4
   Standalone UI helper for the separate annual archive.
   Does not modify Career analysis source files.
*/
(() => {
  'use strict';
  if (window.__AT_ANNUAL_SELECT_ALL_V134__) return;
  window.__AT_ANNUAL_SELECT_ALL_V134__ = true;

  const $ = id => document.getElementById(id);
  let busy = false;
  let refreshTimer = 0;

  function parseFoundCount() {
    const text = $('aaResultCount')?.textContent || '';
    const m = text.match(/([\d.]+)\s+yarış\s+bulundu/i);
    return m ? Number(m[1].replace(/\./g, '')) : 0;
  }

  function parseSelectedCount() {
    const text = $('aaResultCount')?.textContent || '';
    const m = text.match(/([\d.]+)\s+seçili/i);
    return m ? Number(m[1].replace(/\./g, '')) : 0;
  }

  function ensureControls() {
    const results = $('aaResults');
    const head = results?.closest('.aa-section')?.querySelector('.aa-results-head');
    if (!results || !head) return;

    let controls = $('aaBulkSelectControls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'aaBulkSelectControls';
      controls.className = 'aa-actions';
      controls.style.margin = '8px 0';
      controls.innerHTML = `
        <button type="button" class="aa-btn secondary" id="aaSelectAllVisible">Tümünü Seç</button>
        <button type="button" class="aa-btn secondary" id="aaClearVisibleSelection">Listedeki Seçimi Temizle</button>
        <span class="aa-status" id="aaBulkSelectStatus" style="margin:0"></span>`;
      head.insertAdjacentElement('afterend', controls);

      $('aaSelectAllVisible')?.addEventListener('click', () => bulkSet(true));
      $('aaClearVisibleSelection')?.addEventListener('click', () => bulkSet(false));
    }
    refreshLabels();
  }

  function refreshLabels() {
    if (busy) return;
    const found = parseFoundCount();
    const shown = document.querySelectorAll('#aaResults [data-select]').length;
    const selected = parseSelectedCount();
    const allBtn = $('aaSelectAllVisible');
    const clearBtn = $('aaClearVisibleSelection');
    const status = $('aaBulkSelectStatus');
    if (allBtn) allBtn.textContent = found && found <= shown ? `Tümünü Seç (${found})` : `Gösterilenleri Seç (${shown})`;
    if (clearBtn) clearBtn.textContent = 'Listedeki Seçimi Temizle';
    if (status) {
      status.textContent = found > shown
        ? `${found} eşleşmenin ilk ${shown} tanesi ekranda. Filtreyi daraltırsan kalanları da topluca seçebilirsin.`
        : `${selected}/${found || shown} seçili`;
    }
  }

  function scheduleRefresh(delay = 40) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      ensureControls();
      refreshLabels();
    }, delay);
  }

  async function bulkSet(checked) {
    if (busy) return;
    busy = true;
    const allBtn = $('aaSelectAllVisible');
    const clearBtn = $('aaClearVisibleSelection');
    const status = $('aaBulkSelectStatus');
    if (allBtn) allBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;

    try {
      let changed = 0;
      while (true) {
        const inputs = [...document.querySelectorAll('#aaResults [data-select]')]
          .filter(x => x.checked !== checked);
        if (!inputs.length) break;

        const batch = inputs.slice(0, 12);
        for (const input of batch) {
          input.checked = checked;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          changed++;
        }
        if (status) status.textContent = checked
          ? `${changed} yarış seçildi…`
          : `${changed} seçim kaldırıldı…`;
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    } finally {
      busy = false;
      if (allBtn) allBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
      scheduleRefresh(0);
    }
  }

  for (const type of ['click', 'change', 'input']) {
    document.addEventListener(type, () => scheduleRefresh(type === 'input' ? 120 : 40), true);
  }
  window.addEventListener('load', () => scheduleRefresh(80));
  scheduleRefresh(0);
})();
