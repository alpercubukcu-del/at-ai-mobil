/* AT AI Mobil — Annual Archive Top3 Cache V13.7
   Selected-race-only TJK result cache for the standalone annual archive.
   Purpose: avoid loading thousands of result/career records and remove repeat network work.
   Existing Career analysis source files are not modified.
*/
(() => {
  'use strict';
  if (window.__AT_ANNUAL_TOP3_CACHE_V137__) return;
  window.__AT_ANNUAL_TOP3_CACHE_V137__ = true;

  const VERSION = 'ANNUAL-TOP3-CACHE-V13.7';
  const ARCHIVE_DB = 'at_ai_tjk_annual_archive_v13';
  const ARCHIVE_DB_VERSION = 1;
  const ARCHIVE_STORE = 'races';
  const CACHE_DB = 'at_ai_tjk_annual_top3_v137';
  const CACHE_DB_VERSION = 1;
  const CACHE_STORE = 'top3';
  const nativeFetch = window.fetch.bind(window);
  let archiveDbPromise = null;
  let cacheDbPromise = null;
  let preparing = false;

  const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const fold = v => clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/[^A-Z0-9]+/g, '')
    .trim();

  function selectionSet() {
    const s = window.__AT_AA_SELECTED_IDS_V134__;
    return s && typeof s.values === 'function' ? s : null;
  }

  function openArchiveDb() {
    if (archiveDbPromise) return archiveDbPromise;
    archiveDbPromise = new Promise(resolve => {
      try {
        const q = indexedDB.open(ARCHIVE_DB, ARCHIVE_DB_VERSION);
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
    return archiveDbPromise;
  }

  function openCacheDb() {
    if (cacheDbPromise) return cacheDbPromise;
    cacheDbPromise = new Promise(resolve => {
      try {
        const q = indexedDB.open(CACHE_DB, CACHE_DB_VERSION);
        q.onupgradeneeded = () => {
          const db = q.result;
          if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        };
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
    return cacheDbPromise;
  }

  async function archiveGet(id) {
    const db = await openArchiveDb();
    if (!db) return null;
    return new Promise(resolve => {
      try {
        const q = db.transaction(ARCHIVE_STORE, 'readonly').objectStore(ARCHIVE_STORE).get(id);
        q.onsuccess = () => resolve(q.result?.value || null);
        q.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  async function cacheGet(key) {
    const db = await openCacheDb();
    if (!db) return null;
    return new Promise(resolve => {
      try {
        const q = db.transaction(CACHE_STORE, 'readonly').objectStore(CACHE_STORE).get(key);
        q.onsuccess = () => resolve(q.result?.value || null);
        q.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  async function cachePut(key, value) {
    const db = await openCacheDb();
    if (!db) return false;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(CACHE_STORE, 'readwrite');
        tx.objectStore(CACHE_STORE).put({ key, value, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch { resolve(false); }
    });
  }

  function historyKey(date, city, raceNo) {
    return `${clean(date)}|${fold(city)}|${Number(raceNo || 0)}`;
  }

  function historyKeyFromRow(row) {
    return historyKey(row?.date, row?.city, row?.raceNo);
  }

  async function selectedRows() {
    const set = selectionSet();
    if (!set?.size) return [];
    const ids = [...set];
    const out = [];
    const concurrency = 12;
    let cursor = 0;
    async function worker() {
      while (true) {
        const i = cursor++;
        if (i >= ids.length) return;
        const row = await archiveGet(ids[i]);
        if (row) out.push(row);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length || 1) }, worker));
    return out;
  }

  function setStatus(text, warn = false) {
    const el = document.getElementById('aaTop3Status');
    if (!el) return;
    el.textContent = text;
    el.style.color = warn ? '#ffbd82' : '';
  }

  function ensureControls() {
    const resolve = document.getElementById('aaResolve');
    const actions = resolve?.closest('.aa-actions');
    if (!actions) return;
    let btn = document.getElementById('aaPrepareTop3');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'aaPrepareTop3';
      btn.className = 'aa-btn secondary';
      btn.textContent = 'Seçilenlerin İlk 3’ünü Hazırla';
      resolve.insertAdjacentElement('afterend', btn);
      btn.addEventListener('click', async event => {
        event.preventDefault();
        await prepareSelectedTop3();
      });
    }
    let status = document.getElementById('aaTop3Status');
    if (!status) {
      status = document.createElement('span');
      status.id = 'aaTop3Status';
      status.className = 'aa-status';
      status.style.margin = '0';
      actions.appendChild(status);
    }
  }

  function parseHistoryRequest(input, init) {
    try {
      const method = clean(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase() || 'GET';
      if (method !== 'GET') return null;
      const raw = input instanceof Request ? input.url : String(input || '');
      const url = new URL(raw, location.origin);
      if (url.origin !== location.origin || url.pathname !== '/api/tjk-history') return null;
      const date = clean(url.searchParams.get('date'));
      const city = clean(url.searchParams.get('city'));
      const raceNo = Number(url.searchParams.get('raceNo') || 0);
      if (!date || !city || !raceNo) return null;
      return { date, city, raceNo, key: historyKey(date, city, raceNo) };
    } catch { return null; }
  }

  function cacheableHistory(data) {
    return data && data.ok !== false && Array.isArray(data.top3) && data.top3.length > 0;
  }

  async function cachedResponse(req) {
    const cached = await cacheGet(req.key);
    if (!cached?.history) return null;
    return new Response(JSON.stringify(cached.history), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-at-ai-cache': 'annual-top3-v137' }
    });
  }

  window.fetch = async function annualTop3CachedFetch(input, init) {
    const req = parseHistoryRequest(input, init);
    const archiveOpen = !!document.getElementById('tjkAnnualArchiveDialog')?.open;
    if (!req || !archiveOpen) return nativeFetch(input, init);

    const hit = await cachedResponse(req);
    if (hit) return hit;

    const response = await nativeFetch(input, init);
    try {
      if (response.ok) {
        const data = await response.clone().json();
        if (cacheableHistory(data)) {
          await cachePut(req.key, {
            date: req.date,
            city: req.city,
            raceNo: req.raceNo,
            top3: data.top3.slice(0, 3),
            history: data,
            source: 'TJK_HISTORY_API',
            cachedAt: new Date().toISOString()
          });
        }
      }
    } catch {}
    return response;
  };

  async function fetchAndCacheRow(row) {
    const key = historyKeyFromRow(row);
    const cached = await cacheGet(key);
    if (cached?.history && cacheableHistory(cached.history)) return { ok: true, cached: true, row, data: cached.history };

    const url = `/api/tjk-history?date=${encodeURIComponent(row.date)}&city=${encodeURIComponent(row.city)}&raceNo=${encodeURIComponent(row.raceNo)}`;
    try {
      const response = await nativeFetch(url, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !cacheableHistory(data)) throw new Error(data?.error || `HTTP ${response.status}`);
      await cachePut(key, {
        date: row.date,
        city: row.city,
        raceNo: row.raceNo,
        top3: data.top3.slice(0, 3),
        history: data,
        source: 'TJK_HISTORY_API',
        cachedAt: new Date().toISOString()
      });
      return { ok: true, cached: false, row, data };
    } catch (error) {
      return { ok: false, cached: false, row, error: error?.message || String(error) };
    }
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function waitForResolution(maxMs = 90000) {
    const start = Date.now();
    let sawProgress = false;
    while (Date.now() - start < maxMs) {
      await sleep(400);
      const text = clean(document.getElementById('aaUpdateStatus')?.textContent);
      const m = text.match(/Koşu No çözümleme:\s*(\d+)\s*\/\s*(\d+)/i);
      if (m) {
        sawProgress = true;
        if (Number(m[1]) >= Number(m[2])) { await sleep(300); return true; }
      } else if (sawProgress) return true;
    }
    return false;
  }

  async function prepareSelectedTop3() {
    if (preparing) return false;
    preparing = true;
    const btn = document.getElementById('aaPrepareTop3');
    if (btn) btn.disabled = true;
    try {
      let rows = await selectedRows();
      if (!rows.length) {
        setStatus('Önce en az bir tarihsel yarış seçin.', true);
        return false;
      }

      let unresolved = rows.filter(r => !r.raceNo);
      if (unresolved.length) {
        setStatus(`${unresolved.length} seçili yarışın Koşu No’su çözülüyor…`);
        document.getElementById('aaResolve')?.click();
        await waitForResolution();
        rows = await selectedRows();
        unresolved = rows.filter(r => !r.raceNo);
      }

      const readyRows = rows.filter(r => r.raceNo);
      if (!readyRows.length) {
        setStatus('Seçilen yarışların Koşu No’su kesinleştirilemedi.', true);
        return false;
      }

      let cursor = 0;
      let done = 0;
      let cacheHits = 0;
      let fetched = 0;
      let failed = 0;
      const concurrency = Math.min(2, readyRows.length);
      async function worker() {
        while (true) {
          const i = cursor++;
          if (i >= readyRows.length) return;
          const result = await fetchAndCacheRow(readyRows[i]);
          done++;
          if (result.ok && result.cached) cacheHits++;
          else if (result.ok) fetched++;
          else failed++;
          setStatus(`İlk 3 hazırlanıyor: ${done}/${readyRows.length} · yerel ${cacheHits} · TJK ${fetched}${failed ? ` · hata ${failed}` : ''}`);
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      }
      await Promise.all(Array.from({ length: concurrency }, worker));

      const skipped = unresolved.length;
      const prepared = cacheHits + fetched;
      setStatus(`İlk 3 hazır: ${prepared}/${readyRows.length}${cacheHits ? ` · ${cacheHits} yerelden` : ''}${fetched ? ` · ${fetched} TJK’dan` : ''}${skipped ? ` · ${skipped} Koşu No çözülemedi` : ''}${failed ? ` · ${failed} alınamadı` : ''}`, failed > 0 && prepared === 0);
      return prepared > 0;
    } finally {
      preparing = false;
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener('click', async event => {
    const run = event.target?.closest?.('#aaRunSelected');
    if (!run || !event.isTrusted) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const ok = await prepareSelectedTop3();
    if (ok) run.click();
  }, true);

  const observer = new MutationObserver(() => ensureControls());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', ensureControls);
  ensureControls();

  window.ATAnnualTop3CacheV137 = {
    version: VERSION,
    prepareSelected: prepareSelectedTop3,
    cacheDb: CACHE_DB
  };

  console.info('[AT AI]', VERSION, 'aktif — yalnız seçilen tarihsel yarışların İlk 3 verisi yerelde tutulur');
})();
