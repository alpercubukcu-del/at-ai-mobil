/* AT AI Mobil — Annual Archive Top3 Cache V14
   Selected-race-only result cache. Event-driven; no global MutationObserver.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_TOP3_CACHE_V14__) return;
window.__AT_ANNUAL_TOP3_CACHE_V14__ = true;

const VERSION = 'ANNUAL-TOP3-CACHE-V14.0';
const ARCHIVE_DB = 'at_ai_tjk_annual_archive_v13';
const ARCHIVE_STORE = 'races';
const CACHE_DB = 'at_ai_tjk_annual_top3_v137';
const CACHE_STORE = 'top3';
const nativeFetch = window.fetch.bind(window);
let archiveDbPromise = null;
let cacheDbPromise = null;
let preparing = false;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I').replace(/[^A-Z0-9]+/g, '').trim();
function selectionSet() {
  const s = window.__AT_AA_SELECTED_IDS_V134__;
  return s && typeof s.values === 'function' ? s : null;
}
function openArchiveDb() {
  if (archiveDbPromise) return archiveDbPromise;
  archiveDbPromise = new Promise(resolve => {
    try {
      const q = indexedDB.open(ARCHIVE_DB);
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
      const q = indexedDB.open(CACHE_DB, 1);
      q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(CACHE_STORE)) q.result.createObjectStore(CACHE_STORE, { keyPath: 'key' }); };
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return cacheDbPromise;
}
async function dbGet(dbFn, store, key) {
  const db = await dbFn(); if (!db) return null;
  return new Promise(resolve => {
    try {
      const q = db.transaction(store, 'readonly').objectStore(store).get(key);
      q.onsuccess = () => resolve(q.result?.value ?? null);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function dbPut(dbFn, store, key, value) {
  const db = await dbFn(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function archiveGet(id) { return dbGet(openArchiveDb, ARCHIVE_STORE, id); }
async function selectedRows() {
  const s = selectionSet(); if (!s?.size) return [];
  const rows = await Promise.all([...s].map(archiveGet));
  return rows.filter(Boolean);
}
function historyKey(date, city, raceNo) { return `${clean(date)}|${fold(city)}|${Number(raceNo || 0)}`; }
function cacheableHistory(data) { return data && data.ok !== false && Array.isArray(data.top3) && data.top3.length > 0; }
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
  if (!document.getElementById('aaPrepareTop3')) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'aaPrepareTop3'; btn.className = 'aa-btn secondary'; btn.textContent = 'Seçilenlerin İlk 3’ünü Hazırla';
    resolve.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', event => { event.preventDefault(); prepareSelectedTop3(); });
  }
  if (!document.getElementById('aaTop3Status')) {
    const status = document.createElement('span');
    status.id = 'aaTop3Status'; status.className = 'aa-status'; status.style.margin = '0';
    actions.appendChild(status);
  }
}
function parseHistoryRequest(input, init) {
  try {
    const method = clean(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase() || 'GET';
    if (method !== 'GET') return null;
    const url = new URL(input instanceof Request ? input.url : String(input || ''), location.origin);
    if (url.origin !== location.origin || url.pathname !== '/api/tjk-history') return null;
    const date = clean(url.searchParams.get('date')), city = clean(url.searchParams.get('city')), raceNo = Number(url.searchParams.get('raceNo') || 0);
    return date && city && raceNo ? { date, city, raceNo, key: historyKey(date, city, raceNo) } : null;
  } catch { return null; }
}
window.fetch = async function annualTop3CachedFetch(input, init) {
  const req = parseHistoryRequest(input, init);
  const open = !!document.getElementById('tjkAnnualArchiveDialog')?.open;
  if (!req || !open) return nativeFetch(input, init);
  const cached = await dbGet(openCacheDb, CACHE_STORE, req.key);
  if (cached?.history) return new Response(JSON.stringify(cached.history), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'x-at-ai-cache': 'annual-top3-v14' } });
  const response = await nativeFetch(input, init);
  try {
    if (response.ok) {
      const data = await response.clone().json();
      if (cacheableHistory(data)) await dbPut(openCacheDb, CACHE_STORE, req.key, { history: data, date: req.date, city: req.city, raceNo: req.raceNo, cachedAt: new Date().toISOString() });
    }
  } catch {}
  return response;
};
async function fetchAndCacheRow(row) {
  const key = historyKey(row?.date, row?.city, row?.raceNo);
  const cached = await dbGet(openCacheDb, CACHE_STORE, key);
  if (cached?.history && cacheableHistory(cached.history)) return { ok: true, cached: true };
  try {
    const r = await nativeFetch(`/api/tjk-history?date=${encodeURIComponent(row.date)}&city=${encodeURIComponent(row.city)}&raceNo=${encodeURIComponent(row.raceNo)}`, { cache: 'no-store' });
    const data = await r.json();
    if (!r.ok || !cacheableHistory(data)) throw new Error(data?.error || `HTTP ${r.status}`);
    await dbPut(openCacheDb, CACHE_STORE, key, { history: data, date: row.date, city: row.city, raceNo: row.raceNo, cachedAt: new Date().toISOString() });
    return { ok: true, cached: false };
  } catch (e) { return { ok: false, error: e?.message || String(e) }; }
}
async function prepareSelectedTop3() {
  if (preparing) return false;
  preparing = true;
  ensureControls();
  const btn = document.getElementById('aaPrepareTop3'); if (btn) btn.disabled = true;
  try {
    let rows = await selectedRows();
    if (!rows.length) { setStatus('Önce en az bir tarihsel yarış seçin.', true); return false; }
    if (rows.some(r => !r.raceNo) && window.ATAnnualArchiveV13?.resolveSelected) {
      setStatus('Seçili yarışların Koşu No’su çözülüyor…');
      await window.ATAnnualArchiveV13.resolveSelected();
      rows = await selectedRows();
    }
    const ready = rows.filter(r => r.raceNo);
    if (!ready.length) { setStatus('Seçilen yarışların Koşu No’su kesinleştirilemedi.', true); return false; }
    let cursor = 0, done = 0, hits = 0, fetched = 0, failed = 0;
    async function worker() {
      while (true) {
        const i = cursor++; if (i >= ready.length) return;
        const result = await fetchAndCacheRow(ready[i]);
        done++; if (!result.ok) failed++; else if (result.cached) hits++; else fetched++;
        setStatus(`İlk 3 hazırlanıyor: ${done}/${ready.length} · yerel ${hits} · TJK ${fetched}${failed ? ` · hata ${failed}` : ''}`);
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
    await Promise.all(Array.from({ length: Math.min(2, ready.length) }, worker));
    setStatus(`İlk 3 hazır: ${hits + fetched}/${ready.length}${failed ? ` · ${failed} alınamadı` : ''}`, failed > 0 && hits + fetched === 0);
    return hits + fetched > 0;
  } finally {
    preparing = false;
    if (btn) btn.disabled = false;
  }
}

document.addEventListener('click', async event => {
  const run = event.target?.closest?.('#aaRunSelected');
  if (!run || !event.isTrusted) return;
  event.preventDefault(); event.stopImmediatePropagation();
  if (await prepareSelectedTop3()) run.click();
}, true);
window.addEventListener('at-ai:annual-archive-created', ensureControls);
window.addEventListener('at-ai:annual-archive-open', ensureControls);
window.addEventListener('at-ai:annual-archive-render', ensureControls);
window.addEventListener('load', ensureControls);
ensureControls();

window.ATAnnualTop3CacheV137 = { version: VERSION, prepareSelected: prepareSelectedTop3, cacheDb: CACHE_DB };
console.info('[AT AI]', VERSION, 'aktif — seçili İlk 3 önbelleği, gözlemcisiz');
})();
