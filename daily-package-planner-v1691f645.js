/* AT AI Mobil - V16.9.1F60.45 Process Flow Planner
   - Annual archive: start/end year queue, stop/resume, per-year status/delete.
   - Daily package: stage 2 scans local annual catalog first, then downloads only the user-selected references.
   - Menu order follows the data -> model -> calibration -> coupon workflow.
*/
(() => {
'use strict';
if (window.__AT_PROCESS_FLOW_PLANNER_V1691F645__) return;
window.__AT_PROCESS_FLOW_PLANNER_V1691F645__ = true;

const VERSION = 'PROCESS-FLOW-PLANNER-V16.9.1F60.45';
const DAILY_DB = 'at_ai_daily_source_archive_v642';
const DAILY_STORE = 'resources';
const ANNUAL_DB = 'at_ai_tjk_annual_archive_v13';
const ANNUAL_VERSION = 3;
const ANNUAL_RACES = 'races';
const ANNUAL_META = 'meta';
const ANNUAL_DAY = 'daycache';
const PAGE_SIZE = 50;
const FETCH_CONCURRENCY = 4;
const ANNUAL_SOURCE = '/tjk-annual-source';
const CURRENT_YEAR = new Date().getFullYear();
const QUEUE_KEY = 'at_ai_annual_archive_queue_v645';

let dailyDbPromise = null;
let annualDbPromise = null;
let dailyRunning = false;
let dailyController = null;
let lastPlan = null;
let annualRunning = false;
let annualStopRequested = false;

const $ = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
const fold = v => upper(v).replace(/[^A-Z0-9]+/g, '');
const norm = v => upper(v).replace(/[^A-Z0-9]+/g, ' ').trim();
const normKey = v => norm(v).replace(/\s+/g, '');
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
const sleep = () => new Promise(resolve => setTimeout(resolve, 0));

function installPlannerStyle() {
  if (document.getElementById('processFlowPlannerF645Style')) return;
  const style = document.createElement('style');
  style.id = 'processFlowPlannerF645Style';
  style.textContent = `
    .aa-year-tools-f645,.dsa-row-f645{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .aa-year-tools-f645 select,.dsa-row-f645 select,.dsa-row-f645 input{min-height:34px}
    .aa-year-hint-f645{margin:10px 0;padding:10px;border-radius:10px;background:rgba(56,189,248,.10);border:1px solid rgba(125,190,255,.24);line-height:1.4}
    .aa-year-table-f645{width:100%;font-size:13px}
    .aa-year-head-f645,.aa-year-row-f645{display:grid;grid-template-columns:62px minmax(0,1fr) 76px 72px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(148,163,184,.25)}
    .aa-year-head-f645{font-size:12px;letter-spacing:.04em;opacity:.75}
    .aa-year-row-f645 small{display:block;font-size:11px;line-height:1.25;margin-top:3px;opacity:.8;overflow-wrap:anywhere}
    .aa-year-row-f645 span:nth-child(3){text-align:right}
    .aa-year-table-f645 button{min-height:30px;padding:4px 9px}
    .dsa-counts-f645{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
    .dsa-count-f645{border:1px solid rgba(148,163,184,.3);border-radius:8px;padding:9px;background:rgba(15,23,42,.03)}
    .dsa-count-f645 b{display:block;font-size:17px;line-height:1.1}
    .dsa-count-f645 span{display:block;font-size:12px;opacity:.75;margin-top:3px}
    .dsa-limits-f645{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:8px}
    .dsa-limit-f645{border:1px solid rgba(148,163,184,.3);border-radius:8px;padding:9px}
    .dsa-limit-f645 strong{display:block;margin-bottom:6px}
    .dsa-pills-f645{display:flex;gap:6px;flex-wrap:wrap}
    .dsa-pills-f645 button{min-height:30px;padding:4px 9px}
    .dsa-pills-f645 button.active{background:#111827;color:white;border-color:#111827}
    .dsa-selected-f645{margin-top:10px;padding:10px;border-radius:8px;background:rgba(16,185,129,.08)}
    .dsa-dist-grid-f645{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
    .dsa-dist-grid-f645 th,.dsa-dist-grid-f645 td{padding:6px;border-bottom:1px solid rgba(148,163,184,.22);text-align:right}
    .dsa-dist-grid-f645 th:first-child,.dsa-dist-grid-f645 td:first-child{text-align:left}
    @media (max-width:720px){
      .dsa-counts-f645{grid-template-columns:repeat(2,minmax(0,1fr))}
      .dsa-limits-f645{grid-template-columns:1fr}
      .aa-year-table-f645{font-size:12px}
      .aa-year-head-f645,.aa-year-row-f645{grid-template-columns:52px minmax(0,1fr) 40px 62px;gap:6px}
    }
  `;
  document.head.appendChild(style);
}

function yearsDescending() {
  const years = [];
  for (let y = CURRENT_YEAR; y >= 2000; y--) years.push(y);
  return years;
}
function yearOptions(selected) {
  return yearsDescending().map(y => `<option value="${y}" ${Number(selected) === y ? 'selected' : ''}>${y}</option>`).join('');
}
function yearRange(from, to) {
  const a = Number(from) || CURRENT_YEAR;
  const b = Number(to) || a;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}
function isoDate(v = '') {
  const raw = clean(v);
  let m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? raw : '';
}
function displayDate(v = '') {
  const m = clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : clean(v);
}
function parseMoney(v = '') {
  const n = Number(clean(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function canonicalToken(v = '') {
  const t = upper(v).replace(/\s+/g, '').replace(/^\/+|\/+$/g, '');
  if (!t) return '';
  if (t === 'D' || t === 'DISI') return 'DISI';
  if (t === 'E' || t === 'ERKEK') return 'ERKEK';
  let m = t.match(/^Y-?(\d+)$/); if (m) return `Y${m[1]}`;
  m = t.match(/^H-?(\d+)$/); if (m) return `H${m[1]}`;
  return t;
}
function parseClass(raw = '') {
  const parts = clean(raw).replace(/\s*\/\s*/g, '/').split('/').map(clean).filter(Boolean);
  const base = parts.shift() || '';
  const tokens = parts.map(canonicalToken).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
  const fallback = `${normKey(base)}${tokens.length ? '/' + tokens.join('/') : ''}`;
  let key = fallback;
  try { if (typeof window.canonicalClassKeyV125 === 'function') key = window.canonicalClassKeyV125(raw) || fallback; } catch {}
  return { base, tokens, key };
}
function classKey(v) {
  try { if (typeof window.canonicalClassKeyV125 === 'function') return clean(window.canonicalClassKeyV125(v)); } catch {}
  return parseClass(v).key || fold(v);
}
function groupKey(v) { return fold(v); }
function trackKey(v) {
  const x = fold(v);
  if (x.includes('SENTETIK')) return 'SENTETIK';
  if (x.includes('CIM')) return 'CIM';
  if (x.includes('KUM')) return 'KUM';
  return x;
}
function baseIdentity(r) {
  return [r.date, r.cityId, groupKey(r.groupRaw), normKey(r.classRaw), r.distance, trackKey(r.track), clean(r.prizeRaw), normKey(r.raceName)].join('|');
}
function raceId(r, occurrence) { return `${baseIdentity(r)}|${occurrence}`; }
function parseAnnualHtml(html, page = 0) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = [];
  [...doc.querySelectorAll('tr')].forEach((tr, rowIndex) => {
    if (tr.classList.contains('hidable')) return;
    const cells = [...tr.querySelectorAll('td')];
    if (cells.length < 8) return;
    const date = isoDate(cells[0].textContent);
    const city = clean(cells[1].textContent);
    const groupRaw = clean(cells[2].textContent);
    const classRaw = clean(cells[3].textContent);
    const distance = Number(clean(cells[4].textContent).match(/\d+/)?.[0] || 0);
    const track = clean(cells[5].textContent);
    const prizeRaw = clean(cells[6].textContent);
    const raceName = clean(cells[7].textContent);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !city || !classRaw || !distance) return;
    const href = cells[0].querySelector('a')?.getAttribute('href') || cells[1].querySelector('a')?.getAttribute('href') || '';
    let cityId = '';
    try { cityId = new URL(href, 'https://www.tjk.org').searchParams.get('SehirId') || ''; } catch {}
    const ci = parseClass(classRaw);
    rows.push({
      date, year: Number(date.slice(0, 4)), city, cityId, groupRaw, classRaw,
      classBase: ci.base, classBaseKey: normKey(ci.base), classKey: ci.key, extraTokens: ci.tokens,
      distance, track, trackKey: trackKey(track), prizeRaw, prize: parseMoney(prizeRaw), raceName,
      annualProgramUrl: href ? new URL(href, 'https://www.tjk.org').toString() : '',
      page, rowIndex, raceNo: null, permanentKey: null, resolutionMethod: null, candidateRaceNos: []
    });
  });
  const text = clean(doc.body?.textContent || '');
  const m = text.match(/Toplam\s+([\d.]+)\s+sonuçtan/i);
  return { rows, total: m ? Number(m[1].replace(/\./g, '')) : rows.length };
}
function finalizeAnnualRows(rows, year) {
  const count = new Map(), out = [];
  for (const row of rows) {
    if (Number(row.year) !== Number(year)) continue;
    const base = baseIdentity(row);
    const occurrence = (count.get(base) || 0) + 1;
    count.set(base, occurrence);
    out.push({ ...row, occurrenceIndex: occurrence, id: raceId(row, occurrence) });
  }
  return out;
}

function openDailyDb() {
  if (dailyDbPromise) return dailyDbPromise;
  dailyDbPromise = new Promise(resolve => {
    try {
      const q = indexedDB.open(DAILY_DB, 1);
      q.onupgradeneeded = () => {
        const db = q.result;
        const s = db.objectStoreNames.contains(DAILY_STORE)
          ? q.transaction.objectStore(DAILY_STORE)
          : db.createObjectStore(DAILY_STORE, { keyPath: 'key' });
        if (!s.indexNames.contains('kind')) s.createIndex('kind', 'kind', { unique: false });
        if (!s.indexNames.contains('packageId')) s.createIndex('packageId', 'packageId', { unique: false });
      };
      q.onsuccess = () => resolve(q.result);
      q.onerror = q.onblocked = () => { dailyDbPromise = null; resolve(null); };
    } catch { resolve(null); }
  });
  return dailyDbPromise;
}
function openAnnualDb() {
  if (annualDbPromise) return annualDbPromise;
  annualDbPromise = new Promise(resolve => {
    try {
      const q = indexedDB.open(ANNUAL_DB, ANNUAL_VERSION);
      q.onupgradeneeded = () => {
        const db = q.result;
        let races;
        if (!db.objectStoreNames.contains(ANNUAL_RACES)) races = db.createObjectStore(ANNUAL_RACES, { keyPath: 'key' });
        else races = q.transaction.objectStore(ANNUAL_RACES);
        if (!db.objectStoreNames.contains(ANNUAL_META)) db.createObjectStore(ANNUAL_META, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(ANNUAL_DAY)) db.createObjectStore(ANNUAL_DAY, { keyPath: 'key' });
        if (races && !races.indexNames.contains('year')) races.createIndex('year', 'value.year', { unique: false });
        if (races && !races.indexNames.contains('date')) races.createIndex('date', 'value.date', { unique: false });
      };
      q.onsuccess = () => {
        const db = q.result;
        db.onversionchange = () => { try { db.close(); } catch {} annualDbPromise = null; };
        resolve(db);
      };
      q.onerror = q.onblocked = () => { annualDbPromise = null; resolve(null); };
    } catch { resolve(null); }
  });
  return annualDbPromise;
}
async function dailyGet(key) {
  const db = await openDailyDb(); if (!db) return null;
  return new Promise(resolve => {
    try {
      const q = db.transaction(DAILY_STORE, 'readonly').objectStore(DAILY_STORE).get(key);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function dailyPut(rec) {
  const db = await openDailyDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(DAILY_STORE, 'readwrite');
      tx.objectStore(DAILY_STORE).put(rec);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function dailyAll() {
  const db = await openDailyDb(); if (!db) return [];
  return new Promise(resolve => {
    try {
      const q = db.transaction(DAILY_STORE, 'readonly').objectStore(DAILY_STORE).getAll();
      q.onsuccess = () => resolve(q.result || []);
      q.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}
async function dailyDeletePackage(packageId) {
  const db = await openDailyDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(DAILY_STORE, 'readwrite');
      const idx = tx.objectStore(DAILY_STORE).index('packageId');
      const q = idx.openCursor(IDBKeyRange.only(packageId));
      q.onsuccess = e => {
        const c = e.target.result;
        if (!c) return;
        c.delete();
        c.continue();
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function dailyClearAll() {
  const db = await openDailyDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(DAILY_STORE, 'readwrite');
      tx.objectStore(DAILY_STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function annualMetaAll() {
  const db = await openAnnualDb(); if (!db || !db.objectStoreNames.contains(ANNUAL_META)) return [];
  return new Promise(resolve => {
    try {
      const q = db.transaction(ANNUAL_META, 'readonly').objectStore(ANNUAL_META).getAll();
      q.onsuccess = () => resolve((q.result || []).map(x => x?.value || x).filter(Boolean));
      q.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}
async function annualMetaPut(key, value) {
  const db = await openAnnualDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(ANNUAL_META, 'readwrite');
      tx.objectStore(ANNUAL_META).put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function annualRowsAll() {
  const db = await openAnnualDb(); if (!db || !db.objectStoreNames.contains(ANNUAL_RACES)) return [];
  return new Promise(resolve => {
    try {
      const q = db.transaction(ANNUAL_RACES, 'readonly').objectStore(ANNUAL_RACES).getAll();
      q.onsuccess = () => resolve((q.result || []).map(x => x?.value || x).filter(Boolean));
      q.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}
async function annualRowsForRange(from, to) {
  const db = await openAnnualDb(); if (!db || !db.objectStoreNames.contains(ANNUAL_RACES)) return [];
  const lo = Math.min(Number(from) || 0, Number(to) || 9999);
  const hi = Math.max(Number(from) || 0, Number(to) || 9999);
  return new Promise(resolve => {
    const out = [];
    try {
      const tx = db.transaction(ANNUAL_RACES, 'readonly');
      const store = tx.objectStore(ANNUAL_RACES);
      const index = store.indexNames.contains('year') ? store.index('year') : null;
      const req = index ? index.openCursor(IDBKeyRange.bound(lo, hi)) : store.openCursor();
      req.onsuccess = e => {
        const c = e.target.result;
        if (!c) return;
        const row = c.value?.value || c.value;
        if (row && Number(row.year) >= lo && Number(row.year) <= hi) out.push(row);
        c.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = tx.onabort = () => resolve([]);
    } catch { resolve([]); }
  });
}
function annualCompleteMetasInRange(metas, from, to) {
  const lo = Math.min(Number(from) || 0, Number(to) || 9999);
  const hi = Math.max(Number(from) || 0, Number(to) || 9999);
  return (Array.isArray(metas) ? metas : [])
    .filter(x => x?.status === 'complete' && Number(x.year) >= lo && Number(x.year) <= hi)
    .sort((a, b) => Number(a.year) - Number(b.year));
}
function yearListLabel(items) {
  const years = (Array.isArray(items) ? items : [])
    .map(x => Number(x?.year ?? x))
    .filter(Boolean)
    .sort((a, b) => a - b);
  if (!years.length) return 'yıl yok';
  if (years.length <= 6) return years.join(', ');
  return `${years[0]}-${years.at(-1)} (${years.length} yıl)`;
}
function showDailyPlanNotice(message) {
  const host = $('dsaPlanF645');
  if (host) host.innerHTML = `<div class="aa-note">${esc(message)}</div>`;
}
async function deleteAnnualYear(year) {
  const db = await openAnnualDb(); if (!db || !db.objectStoreNames.contains(ANNUAL_RACES)) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction([ANNUAL_RACES, ANNUAL_META], 'readwrite');
      const store = tx.objectStore(ANNUAL_RACES);
      const index = store.indexNames.contains('year') ? store.index('year') : null;
      const req = index ? index.openCursor(IDBKeyRange.only(Number(year))) : store.openCursor();
      req.onsuccess = e => {
        const c = e.target.result;
        if (!c) return;
        const row = c.value?.value || c.value;
        if (index || Number(row?.year) === Number(year)) c.delete();
        c.continue();
      };
      tx.objectStore(ANNUAL_META).delete(`year:${year}`);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function writeAnnualBatch(rows) {
  const db = await openAnnualDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(ANNUAL_RACES, 'readwrite');
      const store = tx.objectStore(ANNUAL_RACES);
      const now = Date.now();
      for (const row of rows) store.put({ key: row.id, value: row, updatedAt: now });
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
function annualUrl(year, page, bust) {
  const u = new URL(ANNUAL_SOURCE, location.origin);
  u.searchParams.set('QueryParameter_Tarih_Start', `01/01/${year}`);
  u.searchParams.set('QueryParameter_Tarih_End', `31/12/${year}`);
  if (page > 0) u.searchParams.set('PageNumber', String(page));
  u.searchParams.set('_at', bust);
  return u.pathname + u.search;
}
async function fetchText(url, retries = 2) {
  let last;
  for (let i = 0; i <= retries; i++) {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 30000);
    try {
      const r = await fetch(url, { cache: 'no-store', signal: c.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      last = e;
      if (!navigator.onLine) throw new Error('İnternet bağlantısı kesildi.');
      if (i < retries) await new Promise(resolve => setTimeout(resolve, 700 * (i + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw last || new Error('Veri alınamadı.');
}
function setAnnualStatus(text, pct = null) {
  const el = $('aaBatchStatusF645') || $('aaUpdateStatus');
  const bar = $('aaBatchProgressF645') || $('aaProgressBar');
  if (el) el.textContent = text;
  if (bar && pct !== null) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
async function updateYearQueued(year) {
  const bust = String(Date.now());
  await annualMetaPut(`year:${year}`, { year, status: 'running', updatedAt: new Date().toISOString(), version: VERSION });
  renderAnnualYearTable();
  setAnnualStatus(`${year} ilk sayfa TJK'dan alınıyor...`, 2);
  const first = parseAnnualHtml(await fetchText(annualUrl(year, 0, bust)), 0);
  if (!first.rows.length) throw new Error('TJK yıllık programı boş döndü.');
  const pages = Math.max(1, Math.ceil(Number(first.total || first.rows.length) / PAGE_SIZE));
  const pageNos = Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 1);
  let done = 1;
  const rest = await mapLimit(pageNos, FETCH_CONCURRENCY, async page => {
    if (annualStopRequested) throw new Error('İndirme durduruldu.');
    const parsed = parseAnnualHtml(await fetchText(annualUrl(year, page, bust)), page);
    done++;
    setAnnualStatus(`${year}: ${done}/${pages} sayfa alındı...`, Math.round(done / pages * 88));
    return parsed;
  });
  const final = finalizeAnnualRows([...first.rows, ...rest.flatMap(x => x.rows)], year);
  const expected = Number(first.total || 0);
  if (expected > 0 && final.length < Math.min(expected, Math.floor(expected * .9))) {
    throw new Error(`TJK sayfalama doğrulaması başarısız (${final.length}/${expected}).`);
  }
  setAnnualStatus(`${year}: eski kayıtlar temizleniyor...`, 90);
  if (!await deleteAnnualYear(year)) throw new Error('Yerel yıl temizlenemedi.');
  const BATCH = 250;
  let written = 0;
  for (let i = 0; i < final.length; i += BATCH) {
    if (annualStopRequested) throw new Error('İndirme durduruldu.');
    const batch = final.slice(i, i + BATCH);
    if (!await writeAnnualBatch(batch)) throw new Error('Yerel arşiv yazılamadı.');
    written += batch.length;
    setAnnualStatus(`${year}: ${written}/${final.length} yarış yerel arşive yazıldı...`, 92 + Math.round(written / Math.max(1, final.length) * 7));
    await nextFrame();
  }
  await annualMetaPut(`year:${year}`, {
    year, status: 'complete', recordCount: final.length, totalReported: expected,
    updatedAt: new Date().toISOString(), version: VERSION
  });
  setAnnualStatus(`${year} tamamlandı: ${final.length} yarış.`, 100);
  try { await window.ATAnnualArchiveV13?.refreshMeta?.(true); } catch {}
  renderAnnualYearTable();
  return final.length;
}
function loadQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}');
    return Array.isArray(q.years) ? q : { years: [], index: 0, running: false, stopped: false };
  } catch {
    return { years: [], index: 0, running: false, stopped: false };
  }
}
function saveQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify({ ...q, updatedAt: new Date().toISOString() })); } catch {}
}
async function runAnnualQueue(mode = 'start') {
  if (annualRunning) return;
  annualRunning = true;
  annualStopRequested = false;
  setAnnualButtons(true);
  let queue = loadQueue();
  if (mode === 'start' || !queue.years.length || queue.index >= queue.years.length) {
    queue = {
      years: yearRange($('aaBatchFromF645')?.value, $('aaBatchToF645')?.value),
      index: 0,
      running: true,
      stopped: false
    };
  } else {
    queue.running = true;
    queue.stopped = false;
  }
  saveQueue(queue);
  try {
    for (; queue.index < queue.years.length; queue.index++) {
      const year = queue.years[queue.index];
      saveQueue(queue);
      if (annualStopRequested) break;
      try {
        await updateYearQueued(year);
      } catch (e) {
        await annualMetaPut(`year:${year}`, { year, status: annualStopRequested ? 'paused' : 'error', error: e?.message || String(e), updatedAt: new Date().toISOString(), version: VERSION });
        setAnnualStatus(`${year}: ${e?.message || e}`, 0);
        if (annualStopRequested) break;
      }
    }
    queue.running = false;
    queue.stopped = annualStopRequested || queue.index < queue.years.length;
    if (!queue.stopped) queue.index = queue.years.length;
    saveQueue(queue);
    setAnnualStatus(queue.stopped ? 'Yıllık indirme durduruldu. Devam Et ile kaldığı yıldan sürebilir.' : 'Seçili yıllar tamamlandı.', queue.stopped ? null : 100);
  } finally {
    annualRunning = false;
    setAnnualButtons(false);
    renderAnnualYearTable();
  }
}
function setAnnualButtons(disabled) {
  const start = $('aaBatchStartF645'), resume = $('aaBatchResumeF645'), stop = $('aaBatchStopF645');
  if (start) start.disabled = disabled;
  if (resume) resume.disabled = disabled;
  if (stop) stop.disabled = !disabled;
}
async function renderAnnualYearTable() {
  const host = $('aaYearTableF645');
  if (!host) return;
  const metas = await annualMetaAll();
  const metaMap = new Map(metas.filter(x => Number(x.year)).map(x => [Number(x.year), x]));
  const queue = loadQueue();
  const selected = yearRange($('aaBatchFromF645')?.value, $('aaBatchToF645')?.value);
  const years = queue?.years?.length && queue.index < queue.years.length ? queue.years : selected;
  const complete = annualCompleteMetasInRange(metas, selected[0], selected.at(-1));
  const hint = complete.length
    ? `Hazır yıllar: ${yearListLabel(complete)}. 2/3 yerel katalog taraması yalnız bu hazır yılları kullanır.`
    : `${selected[0]}-${selected.at(-1)} yıllık arşiv telefonda hazır değil. Önce "Seçili Yılları Sırayla İndir" düğmesine basın; yıllar Hazır olduktan sonra 2/3 çalışır.`;
  host.innerHTML = `<div class="aa-year-hint-f645">${esc(hint)}</div><div class="aa-year-table-f645">
    <div class="aa-year-head-f645"><b>Yıl</b><b>Durum</b><b>Yarış</b><b>İşlem</b></div>
    ${years.map(year => {
      const meta = metaMap.get(Number(year));
      const isCurrent = annualRunning && queue.years?.[queue.index] === year;
      const isWaiting = queue.years?.includes(year) && queue.index < queue.years.indexOf(year);
      const status = isCurrent ? 'İndiriliyor' : meta?.status === 'complete' ? 'Hazır' : meta?.status === 'error' ? 'Hata' : meta?.status === 'paused' ? 'Durdu' : isWaiting ? 'Bekliyor' : 'Bekliyor';
      const cls = meta?.status === 'complete' ? 'ok' : meta?.status === 'error' ? 'bad' : isCurrent ? 'run' : '';
      const count = meta?.recordCount ? Number(meta.recordCount).toLocaleString('tr-TR') : '—';
      return `<div class="aa-year-row-f645 ${cls}">
        <span>${year}</span>
        <span>${esc(status)}${meta?.error ? `<small>${esc(meta.error)}</small>` : ''}</span>
        <span>${count}</span>
        <span><button class="aa-btn secondary" data-aa-delete-year-f645="${year}" ${annualRunning ? 'disabled' : ''}>Sil</button></span>
      </div>`;
    }).join('')}
  </div>`;
  host.querySelectorAll('[data-aa-delete-year-f645]').forEach(btn => {
    btn.onclick = async () => {
      const year = Number(btn.dataset.aaDeleteYearF645);
      if (!confirm(`${year} yılı yerel yıllık arşivden silinsin mi? Diğer yıllar etkilenmez.`)) return;
      setAnnualStatus(`${year} siliniyor...`, null);
      await deleteAnnualYear(year);
      setAnnualStatus(`${year} silindi.`, 0);
      try { await window.ATAnnualArchiveV13?.refreshMeta?.(true); } catch {}
      renderAnnualYearTable();
    };
  });
}
function installAnnualManager() {
  const dialog = $('tjkAnnualArchiveDialog');
  const body = dialog?.querySelector('.aa-body');
  if (!body || $('annualBatchManagerF645')) return;
  const old = $('aaUpdateYearSelect')?.closest?.('.aa-section');
  if (old) old.style.display = 'none';
  const section = document.createElement('section');
  section.id = 'annualBatchManagerF645';
  section.className = 'aa-section';
  section.innerHTML = `
    <h3>1 · Yıllık Arşiv Yönetimi</h3>
    <div class="aa-note">Yıllar bağımsız saklanır. Bir yılı silmek diğer yılları ve günlük paketleri bozmaz.</div>
    <div class="aa-grid two">
      <label>Başlangıç yılı<select id="aaBatchFromF645">${yearOptions(2015)}</select></label>
      <label>Bitiş yılı<select id="aaBatchToF645">${yearOptions(CURRENT_YEAR)}</select></label>
    </div>
    <div class="aa-actions">
      <button class="aa-btn" id="aaBatchStartF645">Seçili Yılları Sırayla İndir</button>
      <button class="aa-btn secondary" id="aaBatchResumeF645">Devam Et</button>
      <button class="aa-btn secondary" id="aaBatchStopF645" disabled>Durdur</button>
    </div>
    <div id="aaBatchStatusF645" class="aa-status">Yıl aralığını seçip indirmeyi başlatın.</div>
    <div class="aa-progress"><i id="aaBatchProgressF645"></i></div>
    <div id="aaYearTableF645"></div>`;
  body.insertBefore(section, body.firstChild);
  $('aaBatchStartF645').onclick = () => void runAnnualQueue('start');
  $('aaBatchResumeF645').onclick = () => void runAnnualQueue('resume');
  $('aaBatchStopF645').onclick = () => { annualStopRequested = true; setAnnualStatus('Durdurma istendi. Açık sayfa/yazma işlemi bitince duracak.', null); };
  $('aaBatchFromF645').onchange = renderAnnualYearTable;
  $('aaBatchToF645').onchange = renderAnnualYearTable;
  renderAnnualYearTable();
}

async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const i = cursor++;
      if (i >= list.length) return;
      out[i] = await worker(list[i], i);
      await sleep();
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), list.length || 1) }, run));
  return out;
}
function mainState() {
  try { return typeof state === 'object' && state ? state : (window.state || {}); }
  catch { return window.state || {}; }
}
function context() {
  const s = mainState();
  const date = clean(s?.date || $('raceDate')?.value);
  const cityId = clean(s?.city || $('citySelect')?.value);
  const city = clean(s?.cities?.find(x => String(x.id) === cityId)?.name || document.querySelector('#citySelect option:checked')?.textContent || cityId);
  const races = Array.isArray(s?.races) ? s.races : [];
  return { date, cityId, city, races };
}
function assertContext(ctx) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ctx.date) || !ctx.city || !ctx.races.length) {
    throw new Error('Önce günün TJK programını ve şehri yükleyin.');
  }
}
function careerKey(id, before) { return `career|${clean(id)}|${clean(before)}`; }
function historyKey(date, city, raceNo) { return `history|${clean(date)}|${fold(city)}|${Number(raceNo) || 0}`; }
function metaKey(date, city) { return `meta|${clean(date)}|${fold(city)}`; }
function packageKey(date, city) { return `package|${clean(date)}|${fold(city)}`; }
function packageId(ctx) { return `${ctx.date}|${fold(ctx.city)}`; }
function setDailyStatus(text, pct = null) {
  const e = $('dsaStatusF642');
  const b = $('dsaBarF642');
  if (e) e.textContent = text;
  if (b && pct !== null) b.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
function cutoffRows(data, before) {
  if (!data || typeof data !== 'object') return data;
  const copy = structuredClone(data);
  const cut = clean(before);
  for (const name of ['history','roadmap','fullPathBefore','historyBefore','comparisonPathBefore','roadmapBefore','wins','winsBefore','top5','top5Before','preparationPath','preparationPathBefore']) {
    if (Array.isArray(copy[name])) copy[name] = copy[name].filter(r => clean(r?.isoDate || r?.date || r?.tarih) < cut);
  }
  copy.cutoffExclusive = cut;
  copy.leakageGuardVersion = VERSION;
  return copy;
}
async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store', signal: dailyController?.signal });
  const d = await r.json();
  if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);
  return d;
}
async function savePackage(pkg) {
  await dailyPut({ key: packageKey(pkg.date, pkg.city), kind: 'package', packageId: pkg.id, data: pkg, updatedAt: new Date().toISOString() });
  await renderDailyPackages();
  return pkg;
}
async function currentPackage(ctx = context()) {
  const rec = await dailyGet(packageKey(ctx.date, ctx.city));
  return rec?.data || {
    id: packageId(ctx), date: ctx.date, city: ctx.city, cityId: ctx.cityId,
    createdAt: new Date().toISOString(), stages: {}, counts: {}, version: VERSION
  };
}
function normalizeRace(r) {
  return {
    no: Number(r?.no || r?.raceNo || r?.kosuNo || 0),
    class: clean(r?.class || r?.yaradi1),
    ageGroup: clean(r?.ageGroup || r?.yaradi2),
    distance: Number(r?.distance || r?.mesafe || 0) || null,
    track: clean(r?.track || r?.pist),
    horses: (Array.isArray(r?.horses) ? r.horses : []).map(h => ({
      id: clean(h?.id || h?.horseId || h?.atId),
      no: Number(h?.no || h?.number || h?.pno) || null,
      name: clean(h?.name || h?.horseName || h?.atadi),
      hp: Number(h?.hp || h?.HP) || null
    }))
  };
}
async function stage1(pkg, ctx) {
  pkg.program = ctx.races.map(normalizeRace);
  const jobs = [];
  for (const race of ctx.races) {
    for (const horse of (Array.isArray(race?.horses) ? race.horses : [])) {
      const id = clean(horse?.id || horse?.horseId || horse?.atId);
      if (id) jobs.push({ raceNo: Number(race?.no || race?.raceNo), id, name: clean(horse?.name || horse?.horseName) });
    }
  }
  let done = 0, cached = 0, failed = 0;
  await mapLimit(jobs, 2, async job => {
    const key = careerKey(job.id, ctx.date);
    const old = await dailyGet(key);
    if (old?.data) {
      cached++; done++;
      setDailyStatus(`1/3 Günün at kariyerleri: ${done}/${jobs.length} · yerel ${cached} · hata ${failed}`, done / Math.max(1, jobs.length) * 100);
      return;
    }
    try {
      const d = cutoffRows(await fetchJson(`/api/tjk-career-v10?horseId=${encodeURIComponent(job.id)}&before=${encodeURIComponent(ctx.date)}`), ctx.date);
      await dailyPut({ key, kind: 'career', packageId: pkg.id, before: ctx.date, horseId: job.id, horseName: job.name, raceNo: job.raceNo, data: d, updatedAt: new Date().toISOString() });
    } catch { failed++; }
    done++;
    setDailyStatus(`1/3 Günün at kariyerleri: ${done}/${jobs.length} · yerel ${cached} · hata ${failed}`, done / Math.max(1, jobs.length) * 100);
  });
  pkg.stages.currentCareers = { complete: true, done: jobs.length - failed, total: jobs.length, failed, at: new Date().toISOString() };
  pkg.counts.currentCareers = jobs.length - failed;
  return savePackage(pkg);
}
function selectedTargetRaces(ctx) {
  const val = clean($('dsaRaceScopeF645')?.value || 'all');
  const list = ctx.races.map(normalizeRace).filter(r => r.no);
  if (val === 'all') return list;
  const no = Number(val);
  return list.filter(r => Number(r.no) === no);
}
function rowDistance(row) { return Number(row?.distance || row?.mesafe || row?.msf || 0) || 0; }
function matchReference(ctx, target, row) {
  if (clean(row?.date) >= ctx.date) return null;
  if (classKey(row?.classRaw || row?.class) !== classKey(target.class)) return null;
  if (groupKey(row?.groupRaw || row?.ageGroup) !== groupKey(target.ageGroup)) return null;
  const cityMatch = fold(row?.city) === fold(ctx.city);
  const dist = rowDistance(row);
  const diff = Math.abs(Number(target.distance || 0) - dist);
  const distanceMatch = Number(target.distance || 0) > 0 && diff === 0;
  const trackMatch = trackKey(row?.track || row?.pist) === trackKey(target.track);
  let type = 'RACE_FAMILY';
  if (cityMatch && distanceMatch && trackMatch) type = 'EXACT';
  else if (distanceMatch && trackMatch) type = 'CONDITION_TWIN';
  const distanceScore = Math.max(0, 1 - diff / 800);
  const trackScore = trackMatch ? 1 : .25;
  const cityScore = cityMatch ? 1 : .55;
  const structural = type === 'EXACT' ? 100 : type === 'CONDITION_TWIN' ? 86 : Math.round((.45 + distanceScore * .24 + trackScore * .21 + cityScore * .10) * 100);
  return {
    type,
    targetRaceNo: target.no,
    transferabilityScore: Math.max(0, Math.min(100, structural)),
    distanceDiff: diff,
    cityMatch,
    trackMatch,
    distanceMatch
  };
}
function betterMatch(a, b) {
  if (!b) return true;
  const pr = { EXACT: 3, CONDITION_TWIN: 2, RACE_FAMILY: 1 };
  if (Number(a.transferabilityScore) !== Number(b.transferabilityScore)) return Number(a.transferabilityScore) > Number(b.transferabilityScore);
  if ((pr[a.type] || 0) !== (pr[b.type] || 0)) return (pr[a.type] || 0) > (pr[b.type] || 0);
  return clean(a.row?.date) > clean(b.row?.date);
}
function scanReferences(ctx, rows, targets, fromYear, toYear) {
  const map = new Map();
  const lo = Math.min(Number(fromYear) || 0, Number(toYear) || 9999);
  const hi = Math.max(Number(fromYear) || 0, Number(toYear) || 9999);
  for (const row of rows) {
    const year = Number(row?.year || String(row?.date || '').slice(0, 4));
    if (year < lo || year > hi) continue;
    let best = null;
    for (const target of targets) {
      const m = matchReference(ctx, target, row);
      if (!m) continue;
      const item = { ...m, row };
      if (betterMatch(item, best)) best = item;
    }
    if (!best) continue;
    const id = row?.id || [row?.date, row?.city, row?.classRaw, row?.groupRaw, row?.distance, row?.track, row?.occurrenceIndex].join('|');
    const prev = map.get(id);
    if (betterMatch(best, prev)) map.set(id, best);
  }
  const byType = { EXACT: [], CONDITION_TWIN: [], RACE_FAMILY: [] };
  for (const item of map.values()) byType[item.type].push(item);
  for (const type of Object.keys(byType)) {
    byType[type].sort((a, b) =>
      Number(b.transferabilityScore) - Number(a.transferabilityScore) ||
      clean(b.row.date).localeCompare(clean(a.row.date)) ||
      Number(a.row.raceNo || 999) - Number(b.row.raceNo || 999)
    );
  }
  return { byType, unique: [...map.values()] };
}
function planLimit(id, total) {
  const value = clean($(id)?.value || '');
  if (value === 'all') return total;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(total, Math.trunc(n)) : 0;
}
function selectedFromPlan(plan = lastPlan) {
  if (!plan?.byType) return [];
  const types = [
    ['EXACT', planLimit('dsaExactLimitF645', plan.byType.EXACT.length)],
    ['CONDITION_TWIN', planLimit('dsaTwinLimitF645', plan.byType.CONDITION_TWIN.length)],
    ['RACE_FAMILY', planLimit('dsaFamilyLimitF645', plan.byType.RACE_FAMILY.length)]
  ];
  const map = new Map();
  for (const [type, limit] of types) {
    for (const item of plan.byType[type].slice(0, limit)) {
      const id = item.row?.id || [item.row?.date, item.row?.city, item.row?.raceNo].join('|');
      map.set(id, item);
    }
  }
  return [...map.values()].sort((a, b) =>
    Number(b.transferabilityScore) - Number(a.transferabilityScore) ||
    clean(b.row.date).localeCompare(clean(a.row.date))
  );
}
function typeLabel(type) {
  return type === 'EXACT' ? 'Tam' : type === 'CONDITION_TWIN' ? 'İkiz' : 'Aile';
}
function renderDistribution(plan) {
  const years = new Map();
  for (const type of ['EXACT','CONDITION_TWIN','RACE_FAMILY']) {
    for (const item of plan.byType[type]) {
      const y = Number(item.row?.year || String(item.row?.date || '').slice(0, 4));
      if (!years.has(y)) years.set(y, { EXACT: 0, CONDITION_TWIN: 0, RACE_FAMILY: 0 });
      years.get(y)[type]++;
    }
  }
  const rows = [...years.entries()].sort((a, b) => b[0] - a[0]);
  return rows.length ? `<details class="dsa-dist-f645"><summary>Yıllara Göre Dağılım</summary>
    <div class="dsa-dist-grid-f645"><b>Yıl</b><b>Tam</b><b>İkiz</b><b>Aile</b>
    ${rows.map(([year, c]) => `<span>${year}</span><span>${c.EXACT}</span><span>${c.CONDITION_TWIN}</span><span>${c.RACE_FAMILY}</span>`).join('')}
    </div></details>` : '';
}
function renderPlan(plan) {
  const host = $('dsaPlanF645');
  if (!host) return;
  const selected = selectedFromPlan(plan);
  const c = plan.counts;
  host.innerHTML = `<div class="dsa-counts-f645">
      <span>Tam <b>${c.EXACT}</b></span>
      <span>İkiz <b>${c.CONDITION_TWIN}</b></span>
      <span>Aile <b>${c.RACE_FAMILY}</b></span>
      <span>Kariyer havuzu <b>${c.UNIQUE}</b></span>
    </div>
    <div class="dsa-selected-f645">
      Seçilen toplam: <b>${selected.length}</b> benzersiz yarış ·
      Tam ${Math.min(planLimit('dsaExactLimitF645', c.EXACT), c.EXACT)}/${c.EXACT} ·
      İkiz ${Math.min(planLimit('dsaTwinLimitF645', c.CONDITION_TWIN), c.CONDITION_TWIN)}/${c.CONDITION_TWIN} ·
      Aile ${Math.min(planLimit('dsaFamilyLimitF645', c.RACE_FAMILY), c.RACE_FAMILY)}/${c.RACE_FAMILY}
    </div>
    ${renderDistribution(plan)}`;
}
async function scanDailyPlan() {
  const ctx = context();
  assertContext(ctx);
  const targets = selectedTargetRaces(ctx);
  if (!targets.length) throw new Error('Seçilen koşu programda bulunamadı.');
  const from = Number($('dsaYearFromF645')?.value || 2019);
  const to = Number($('dsaYearToF645')?.value || CURRENT_YEAR);
  const metas = await annualMetaAll();
  const complete = annualCompleteMetasInRange(metas, from, to);
  if (!complete.length) {
    const message = `${from}-${to} yıllık arşiv telefonda hazır değil. Üstte 1. Yıllık Arşiv Yönetimi bölümünden "Seçili Yılları Sırayla İndir" ile yılları indir; durum Hazır olduktan sonra 2/3 çalışır.`;
    showDailyPlanNotice(message);
    setDailyStatus(message, 0);
    throw new Error(message);
  }
  setDailyStatus(`2/3 Yerel yıllık katalog taranıyor. TJK isteği yapılmıyor. Hazır yıllar: ${yearListLabel(complete)}...`, 0);
  const rows = await annualRowsForRange(from, to);
  if (!rows.length) {
    const message = `${from}-${to} aralığında Hazır yıl kaydı var ama yarış satırı okunamadı. İlgili yılı Sil deyip yeniden indir; sonra 2/3 Yerel Katalogu Say düğmesine tekrar bas.`;
    showDailyPlanNotice(message);
    setDailyStatus(message, 0);
    throw new Error(message);
  }
  const plan = scanReferences(ctx, rows, targets, from, to);
  plan.ctxKey = `${ctx.date}|${fold(ctx.city)}|${clean($('dsaRaceScopeF645')?.value || 'all')}`;
  plan.date = ctx.date;
  plan.city = ctx.city;
  plan.range = { from, to };
  plan.raceScope = clean($('dsaRaceScopeF645')?.value || 'all');
  plan.counts = {
    EXACT: plan.byType.EXACT.length,
    CONDITION_TWIN: plan.byType.CONDITION_TWIN.length,
    RACE_FAMILY: plan.byType.RACE_FAMILY.length,
    UNIQUE: plan.unique.length
  };
  lastPlan = plan;
  renderPlan(plan);
  setDailyStatus(`Yerel katalog hazır: Tam ${plan.counts.EXACT} · İkiz ${plan.counts.CONDITION_TWIN} · Aile ${plan.counts.RACE_FAMILY}. Şimdi indireceğin sayıyı seç.`, 100);
  return plan;
}
async function dayProgram(row) {
  const key = metaKey(row.date, row.city);
  const cached = await dailyGet(key);
  if (cached?.data) return cached.data;
  const data = await fetchJson(`/api/tjk-race-meta?date=${encodeURIComponent(row.date)}&cityId=${encodeURIComponent(row.cityId || '')}&cityName=${encodeURIComponent(row.city || '')}`);
  await dailyPut({ key, kind: 'meta', packageId: 'shared-meta', data, updatedAt: new Date().toISOString() });
  return data;
}
function matchRaceCandidates(row, day) {
  return (Array.isArray(day?.races) ? day.races : []).filter(r => {
    const ci = parseClass(r.class || r.yaradi1 || '');
    return ci.key === classKey(row.classRaw || row.class) &&
      groupKey(r.ageGroup || r.yaradi2 || '') === groupKey(row.groupRaw || row.ageGroup) &&
      Number(r.distance || r.mesafe || 0) === Number(row.distance) &&
      trackKey(r.track || r.pist || '') === trackKey(row.track);
  }).map(r => Number(r.no || r.raceNo)).filter(Boolean).sort((a, b) => a - b);
}
async function annualOrderRaceNo(row) {
  const rows = await annualRowsForRange(row.year || String(row.date || '').slice(0, 4), row.year || String(row.date || '').slice(0, 4));
  const sameDay = rows.filter(x => x.date === row.date && (clean(x.cityId) === clean(row.cityId) || norm(x.city) === norm(row.city)))
    .sort((a, b) => Number(a.page || 0) - Number(b.page || 0) || Number(a.rowIndex || 0) - Number(b.rowIndex || 0));
  const idx = sameDay.findIndex(x => x.id === row.id);
  return idx >= 0 ? idx + 1 : 0;
}
async function resolveRaceNo(row) {
  if (Number(row?.raceNo) > 0) return Number(row.raceNo);
  try {
    const candidates = matchRaceCandidates(row, await dayProgram(row));
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      const i = Math.max(0, Number(row?.occurrenceIndex || 1) - 1);
      return candidates[Math.min(i, candidates.length - 1)] || 0;
    }
  } catch {}
  return annualOrderRaceNo(row);
}
async function downloadSelectedReferences(pkg, ctx, plan = lastPlan) {
  if (!plan || plan.date !== ctx.date || fold(plan.city) !== fold(ctx.city)) plan = await scanDailyPlan();
  const selected = selectedFromPlan(plan);
  if (!selected.length) throw new Error('İndirilecek benzer yarış seçilmedi. Tam/İkiz/Aile limitlerinden en az birini artırın.');
  let done = 0, ok = 0, failed = 0;
  const refs = (await mapLimit(selected, 2, async item => {
    const row = item.row;
    try {
      const raceNo = await resolveRaceNo(row);
      if (!raceNo) throw new Error('Koşu No çözülemedi');
      const key = historyKey(row.date, row.city, raceNo);
      const old = await dailyGet(key);
      let data = old?.data;
      if (!data) {
        data = await fetchJson(`/api/tjk-history?date=${encodeURIComponent(row.date)}&city=${encodeURIComponent(row.city)}&raceNo=${raceNo}`);
        await dailyPut({
          key, kind: 'history', packageId: pkg.id, date: row.date, city: row.city, raceNo,
          data,
          source: {
            referenceType: item.type,
            referenceLabel: typeLabel(item.type),
            transferabilityScore: item.transferabilityScore,
            targetRaceNo: item.targetRaceNo,
            classRaw: row.classRaw,
            groupRaw: row.groupRaw,
            distance: row.distance,
            track: row.track
          },
          updatedAt: new Date().toISOString()
        });
      }
      ok++;
      return { date: row.date, city: row.city, raceNo, key, type: item.type, transferabilityScore: item.transferabilityScore, targetRaceNo: item.targetRaceNo };
    } catch {
      failed++;
      return null;
    } finally {
      done++;
      setDailyStatus(`2/3 Seçili benzer sonuçlar: ${done}/${selected.length} · hazır ${ok} · hata ${failed}`, done / Math.max(1, selected.length) * 100);
    }
  })).filter(Boolean);
  pkg.referenceKeys = refs.map(x => x.key);
  pkg.referencePlan = {
    version: VERSION,
    range: plan.range,
    raceScope: plan.raceScope,
    strategy: 'transferability_desc_then_recent_date',
    localCatalogCounts: plan.counts,
    selectedCounts: refs.reduce((acc, x) => { acc[x.type] = (acc[x.type] || 0) + 1; return acc; }, { EXACT: 0, CONDITION_TWIN: 0, RACE_FAMILY: 0 }),
    selectedUnique: refs.length
  };
  pkg.stages.similarResults = { complete: true, done: ok, total: selected.length, failed, at: new Date().toISOString() };
  pkg.counts.similarResults = ok;
  return savePackage(pkg);
}
async function stage3(pkg) {
  const refs = Array.isArray(pkg.referenceKeys) ? pkg.referenceKeys : [];
  if (!refs.length) throw new Error('Önce 2. aşamada seçili benzer koşu sonuçlarını indirin.');
  const jobs = [];
  for (const key of refs) {
    const rec = await dailyGet(key);
    const date = clean(rec?.date || rec?.data?.date);
    const top3 = (Array.isArray(rec?.data?.top3) ? rec.data.top3 : []).slice(0, 3);
    for (const h of top3) {
      const id = clean(h?.horseId || h?.id || h?.atId);
      if (id) jobs.push({ id, date, name: clean(h?.horseName || h?.name), sourceKey: key });
    }
  }
  const unique = [...new Map(jobs.map(x => [careerKey(x.id, x.date), x])).values()];
  let done = 0, ok = 0, cached = 0, failed = 0;
  await mapLimit(unique, 2, async job => {
    const key = careerKey(job.id, job.date);
    const old = await dailyGet(key);
    if (old?.data) {
      cached++; ok++; done++;
      setDailyStatus(`3/3 Geçmiş ilk 3 yarış öncesi kariyer: ${done}/${unique.length} · yerel ${cached} · hata ${failed}`, done / Math.max(1, unique.length) * 100);
      return;
    }
    try {
      const d = cutoffRows(await fetchJson(`/api/tjk-career-v10?horseId=${encodeURIComponent(job.id)}&before=${encodeURIComponent(job.date)}`), job.date);
      await dailyPut({ key, kind: 'career', packageId: pkg.id, before: job.date, horseId: job.id, horseName: job.name, sourceKey: job.sourceKey, data: d, updatedAt: new Date().toISOString() });
      ok++;
    } catch { failed++; }
    done++;
    setDailyStatus(`3/3 Geçmiş ilk 3 yarış öncesi kariyer: ${done}/${unique.length} · hazır ${ok} · hata ${failed}`, done / Math.max(1, unique.length) * 100);
  });
  pkg.stages.referenceCareers = { complete: true, done: ok, total: unique.length, failed, at: new Date().toISOString() };
  pkg.counts.referenceCareers = ok;
  pkg.complete = !!pkg.stages.currentCareers?.complete && !!pkg.stages.similarResults?.complete && !!pkg.stages.referenceCareers?.complete;
  return savePackage(pkg);
}
async function runDaily(which) {
  if (dailyRunning) return;
  dailyRunning = true;
  dailyController = new AbortController();
  toggleDailyButtons(true);
  try {
    const ctx = context();
    assertContext(ctx);
    let pkg = await currentPackage(ctx);
    if (which === 1) await stage1(pkg, ctx);
    else if (which === 'scan') await scanDailyPlan();
    else if (which === 2) await downloadSelectedReferences(pkg, ctx);
    else if (which === 3) await stage3(pkg);
    else if (which === 'all') {
      pkg = await stage1(pkg, ctx);
      const plan = lastPlan || await scanDailyPlan();
      pkg = await downloadSelectedReferences(pkg, ctx, plan);
      await stage3(pkg);
    }
    setDailyStatus('Günlük veri paketi hazır. Kariyer, 20 model, kalibrasyon ve kupon önce bu paketi kullanacak.', 100);
  } catch (e) {
    setDailyStatus(e?.name === 'AbortError' ? 'İndirme durduruldu.' : `Hata: ${clean(e?.message || e)}`, 0);
  } finally {
    dailyRunning = false;
    dailyController = null;
    toggleDailyButtons(false);
    await renderDailyPackages();
  }
}
function toggleDailyButtons(disabled) {
  document.querySelectorAll('[data-dsa-v645]').forEach(b => { b.disabled = disabled; });
  const stop = $('dsaStopF642');
  if (stop) stop.disabled = !disabled;
}
async function estimate() {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e) return '';
    return `${(Number(e.usage || 0) / 1048576).toFixed(1)} MB / ${(Number(e.quota || 0) / 1073741824).toFixed(1)} GB`;
  } catch { return ''; }
}
async function renderDailyPackages() {
  const host = $('dsaPackagesF642');
  if (!host) return;
  const rows = (await dailyAll()).filter(x => x.kind === 'package').map(x => x.data).sort((a, b) => clean(b.createdAt).localeCompare(clean(a.createdAt)));
  const usage = await estimate();
  const u = $('dsaUsageF642');
  if (u) u.textContent = usage ? `Tarayıcı depolaması: ${usage}` : '';
  host.innerHTML = rows.length ? rows.map(p => `<div class="aa-row" style="display:flex;justify-content:space-between;gap:8px;align-items:center">
    <div><b>${esc(p.date)} · ${esc(p.city)}</b>
    <div class="aa-row-sub">Güncel kariyer ${esc(p.counts?.currentCareers || 0)} · benzer sonuç ${esc(p.counts?.similarResults || 0)} · ilk 3 kariyer ${esc(p.counts?.referenceCareers || 0)}${p.referencePlan ? `<br>Seçim: Tam ${esc(p.referencePlan.selectedCounts?.EXACT || 0)} · İkiz ${esc(p.referencePlan.selectedCounts?.CONDITION_TWIN || 0)} · Aile ${esc(p.referencePlan.selectedCounts?.RACE_FAMILY || 0)}` : ''}</div></div>
    <button class="aa-btn secondary" data-dsa-delete-v645="${esc(p.id)}">Sil</button>
  </div>`).join('') : '<div class="aa-note">Henüz günlük veri paketi yok.</div>';
  host.querySelectorAll('[data-dsa-delete-v645]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Bu günlük veri paketi telefon hafızasından silinsin mi?')) return;
      await dailyDeletePackage(b.dataset.dsaDeleteV645);
      await renderDailyPackages();
    };
  });
}
async function fillDailyYears() {
  const metas = (await annualMetaAll()).filter(x => x?.status === 'complete' && Number(x.year)).sort((a, b) => a.year - b.year);
  const years = metas.length ? metas.map(x => Number(x.year)) : yearsDescending().reverse();
  const from = $('dsaYearFromF645'), to = $('dsaYearToF645');
  if (!from || !to) return;
  const optionHtml = years.map(y => `<option value="${y}">${y}</option>`).join('');
  from.innerHTML = optionHtml;
  to.innerHTML = optionHtml;
  from.value = String(years.includes(2019) ? 2019 : years[0] || CURRENT_YEAR);
  to.value = String(years[years.length - 1] || CURRENT_YEAR);
}
function fillRaceScope() {
  const ctx = context();
  const el = $('dsaRaceScopeF645');
  if (!el) return;
  const current = el.value || 'all';
  const races = ctx.races.map(normalizeRace).filter(r => r.no);
  el.innerHTML = `<option value="all">Tüm Koşular</option>${races.map(r => `<option value="${r.no}">${r.no}. Koşu</option>`).join('')}`;
  el.value = [...el.options].some(o => o.value === current) ? current : 'all';
}
function installDailyPlanner() {
  const section = $('dailySourceArchiveF642');
  if (!section || section.dataset.v1691f645 === '1') return;
  section.dataset.v1691f645 = '1';
  section.innerHTML = `
    <h3>2 · Günlük Analiz Veri Paketi</h3>
    <div class="aa-note">Günün verisini bir kez telefona hazırlar. 2. aşama önce sadece yerel Yıllık Arşivi sayar; TJK indirmesi yalnız seçtiğin Tam/İkiz/Aile referansları için başlar. Kariyer havuzu Tam + İkiz + Aile birleşimidir, ayrıca yarış indirmez.</div>
    <div class="aa-actions">
      <button class="aa-btn secondary" data-dsa-v645="1">1 · Günün At Kariyerleri</button>
      <button class="aa-btn warn" data-dsa-v645="all">Seçili Paketi Sırayla Hazırla</button>
      <button class="aa-btn secondary" id="dsaStopF642" disabled>Durdur</button>
      <button class="aa-btn secondary" id="dsaClearAllF642">Günlük Paketi Sil</button>
    </div>
    <div class="aa-section dsa-planner-box-f645">
      <h3>2 · Benzer Koşu Sonuçları</h3>
      <div class="aa-grid">
        <label>Koşu<select id="dsaRaceScopeF645"><option value="all">Tüm Koşular</option></select></label>
        <label>Başlangıç<select id="dsaYearFromF645"></select></label>
        <label>Bitiş<select id="dsaYearToF645"></select></label>
      </div>
      <div class="aa-actions"><button class="aa-btn" data-dsa-v645="scan">Yerel Katalogu Say</button></div>
      <div id="dsaPlanF645" class="aa-note">Önce yerel kataloğu sayın. Bu aşamada TJK'ya gidilmez.</div>
      <div class="dsa-limits-f645">
        <label>Tam<select id="dsaExactLimitF645"><option value="all">Tümünü Al</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
        <label>İkiz<select id="dsaTwinLimitF645"><option value="25">25</option><option value="50">50</option><option value="100" selected>100</option><option value="all">Tümü</option></select></label>
        <label>Aile<select id="dsaFamilyLimitF645"><option value="25">25</option><option value="50">50</option><option value="100" selected>100</option><option value="250">250</option><option value="all">Tümü</option></select></label>
      </div>
      <div class="aa-actions"><button class="aa-btn" data-dsa-v645="2">Seçilen Benzer Yarışları İndir</button></div>
    </div>
    <div class="aa-actions"><button class="aa-btn secondary" data-dsa-v645="3">3 · İlk 3 Yarış Öncesi Kariyer</button></div>
    <div class="aa-progress"><span id="dsaBarF642" style="width:0%"></span></div>
    <div id="dsaStatusF642" class="aa-status">Hazır</div>
    <div id="dsaUsageF642" class="aa-status"></div>
    <h3>Telefondaki Günlük Paketler</h3>
    <div id="dsaPackagesF642"></div>`;
  fillRaceScope();
  fillDailyYears();
  section.querySelectorAll('[data-dsa-v645]').forEach(btn => {
    btn.onclick = () => void runDaily(btn.dataset.dsaV645 === 'scan' ? 'scan' : btn.dataset.dsaV645 === 'all' ? 'all' : Number(btn.dataset.dsaV645));
  });
  for (const id of ['dsaExactLimitF645','dsaTwinLimitF645','dsaFamilyLimitF645']) {
    $(id)?.addEventListener('change', () => { if (lastPlan) renderPlan(lastPlan); });
  }
  $('dsaRaceScopeF645')?.addEventListener('change', () => { lastPlan = null; $('dsaPlanF645').innerHTML = 'Koşu değişti. Yerel kataloğu tekrar sayın.'; });
  $('dsaYearFromF645')?.addEventListener('change', () => { lastPlan = null; $('dsaPlanF645').innerHTML = 'Yıl aralığı değişti. Yerel kataloğu tekrar sayın.'; });
  $('dsaYearToF645')?.addEventListener('change', () => { lastPlan = null; $('dsaPlanF645').innerHTML = 'Yıl aralığı değişti. Yerel kataloğu tekrar sayın.'; });
  $('dsaStopF642').onclick = () => dailyController?.abort();
  $('dsaClearAllF642').onclick = async () => {
    if (!confirm('Telefondaki tüm Günlük Veri Paketi silinsin mi? Yıllık katalog etkilenmez.')) return;
    await dailyClearAll();
    setDailyStatus('Tüm günlük veri paketleri silindi.', 0);
    await renderDailyPackages();
  };
  renderDailyPackages();
}
function applyProcessMenu() {
  const drawer = $('drawer');
  if (!drawer) return;
  const note = drawer.querySelector('.drawer-note');
  const historical = [...drawer.querySelectorAll('[data-view="historical"],button')].filter(btn => /Tarihsel Benzerlik|Kazanan Yolu/i.test(clean(btn.textContent || '')));
  historical.forEach(btn => btn.remove());
  const annual = $('annualArchiveBtn');
  const career = drawer.querySelector('[data-view="career"]');
  const calibration = drawer.querySelector('[data-view="calibration"]');
  const coupon = $('couponMenuBtn');
  const current = drawer.querySelector('[data-view="current"]');
  const scenario = drawer.querySelector('[data-view="scenario"]');
  const exportBtn = $('careerExportMenuBtn');
  const ordered = [
    [annual, '1. Günlük Veri Paketi'],
    [career, '2. Kariyer Yol Haritası'],
    [calibration, '3. Günlük Koşu Kalibrasyonu'],
    [coupon, '4. Kupon Oluştur'],
    [current, '5. Güncel Analiz'],
    [scenario, '6. Koşu Senaryosu'],
    [exportBtn, '7. Kariyer Excel Paketi']
  ];
  for (const [btn, label] of ordered) {
    if (!btn) continue;
    if (clean(btn.textContent) !== label) btn.textContent = label;
    if (note && btn.parentElement === drawer) drawer.insertBefore(btn, note);
  }
  if (note) note.textContent = 'İşlem sırası: yıllık arşiv ve günlük paket hazırla, kariyer/20 model/kalibrasyon üret, sonra kupon oluştur.';
}
function ensureAll() {
  installPlannerStyle();
  installAnnualManager();
  installDailyPlanner();
  fillRaceScope();
  applyProcessMenu();
}

for (const name of ['at-ai:annual-archive-created','at-ai:annual-archive-open','at-ai:annual-archive-render','at-ai:annual-archive-ready']) {
  window.addEventListener(name, () => setTimeout(ensureAll, 0));
}
document.addEventListener('click', e => {
  if (e.target?.closest?.('#annualArchiveBtn,#menuBtn')) setTimeout(ensureAll, 40);
}, true);
// Menu reconciliation runs only on app lifecycle events and menu opens; an observer here
// re-fired during drawer updates on mobile and kept the main thread busy.

setTimeout(ensureAll, 100);
setTimeout(ensureAll, 600);

const previous = window.ATDailySourceArchiveV642 || {};
window.ATDailySourceArchiveV642 = {
  ...previous,
  version: `${previous.version || 'DAILY-SOURCE-ARCHIVE'}+${VERSION}`,
  scanReferences: scanDailyPlan,
  runAll: () => runDaily('all'),
  stop: () => dailyController?.abort(),
  plannerVersion: VERSION
};
window.ATAnnualArchiveBatchV645 = {
  version: VERSION,
  start: () => runAnnualQueue('start'),
  resume: () => runAnnualQueue('resume'),
  stop: () => { annualStopRequested = true; },
  deleteYear: deleteAnnualYear
};
console.info('[AT AI]', VERSION, 'aktif - önce say, sonra seçilen referansları indir; yıllık sıra kuyruğu ve işlem menüsü hazır.');
})();
