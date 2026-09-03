/* AT AI Mobil — TJK Annual Race Archive V14
   Clean annual-archive runtime: immediate dialog open, indexed year reads, no global DOM observers.
*/
(() => {
'use strict';
if (window.__AT_TJK_ANNUAL_ARCHIVE_V14__) return;
window.__AT_TJK_ANNUAL_ARCHIVE_V14__ = true;

const VERSION = 'TJK-ANNUAL-ARCHIVE-V14.0';
const DB_NAME = 'at_ai_tjk_annual_archive_v13';
const DB_VERSION = 2;
const STORE_RACES = 'races';
const STORE_META = 'meta';
const STORE_DAY = 'daycache';
const PAGE_SIZE = 50;
const FETCH_CONCURRENCY = 4;
const API_ANNUAL = '/tjk-annual-source';
const CURRENT_YEAR = new Date().getFullYear();
const MAX_RENDER = 250;

let dbPromise = null;
let loadedRows = [];
let currentRows = [];
let loadedRangeKey = '';
let tokenUniverse = [];
let activeUpdate = false;
let activeSearch = false;
const selectedIds = window.__AT_AA_SELECTED_IDS_V134__ instanceof Set
  ? window.__AT_AA_SELECTED_IDS_V134__
  : new Set();
window.__AT_AA_SELECTED_IDS_V134__ = selectedIds;

const $ = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const norm = v => upper(v).replace(/İ/g, 'I').replace(/[^A-Z0-9]+/g, ' ').trim();
const normKey = v => norm(v).replace(/\s+/g, '');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

function emit(name, detail = {}) {
  try { window.dispatchEvent(new CustomEvent(name, { detail: { version: VERSION, ...detail } })); } catch {}
}
function isoDate(v = '') {
  const m = clean(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : clean(v);
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
  const t = upper(v).replace(/\s+/g, '').replace(/^\/+|\/+$/g, '').replace(/İ/g, 'I');
  if (!t) return '';
  if (t === 'D' || t === 'DISI') return 'DISI';
  if (t === 'E' || t === 'ERKEK') return 'ERKEK';
  const y = t.match(/^Y-?(\d+)$/); if (y) return `Y${y[1]}`;
  const h = t.match(/^H-?(\d+)$/); if (h) return `H${h[1]}`;
  return t;
}
function tokenLabel(t = '') { return t === 'DISI' ? 'Dişi' : t === 'ERKEK' ? 'Erkek' : t; }
function parseClass(raw = '') {
  const parts = clean(raw).replace(/\s*\/\s*/g, '/').split('/').map(clean).filter(Boolean);
  const base = parts.shift() || '';
  const tokens = parts.map(canonicalToken).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
  const fallback = `${normKey(base)}${tokens.length ? '/' + tokens.join('/') : ''}`;
  let key = fallback;
  try { if (typeof window.canonicalClassKeyV125 === 'function') key = window.canonicalClassKeyV125(raw) || fallback; } catch {}
  return { base, tokens, key };
}
function trackKey(v = '') {
  const t = upper(v);
  if (t.includes('CIM')) return 'CIM';
  if (t.includes('KUM')) return 'KUM';
  if (t.includes('SENTETIK')) return 'SENTETIK';
  return normKey(v);
}
function ageKey(v = '') { return normKey(v); }
function baseIdentity(r) {
  return [r.date, r.cityId, ageKey(r.groupRaw), normKey(r.classRaw), r.distance, trackKey(r.track), clean(r.prizeRaw), normKey(r.raceName)].join('|');
}
function raceId(r, occurrence) { return `${baseIdentity(r)}|${occurrence}`; }

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch { return resolve(null); }
    req.onupgradeneeded = () => {
      const db = req.result;
      let races;
      if (!db.objectStoreNames.contains(STORE_RACES)) races = db.createObjectStore(STORE_RACES, { keyPath: 'key' });
      else races = req.transaction.objectStore(STORE_RACES);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORE_DAY)) db.createObjectStore(STORE_DAY, { keyPath: 'key' });
      if (races && !races.indexNames.contains('year')) races.createIndex('year', 'value.year', { unique: false });
      if (races && !races.indexNames.contains('date')) races.createIndex('date', 'value.date', { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; resolve(null); };
    req.onblocked = () => console.warn('[AT AI]', VERSION, 'IndexedDB upgrade blocked');
  });
  return dbPromise;
}
async function dbGet(store, key) {
  const db = await openDb(); if (!db) return null;
  return new Promise(resolve => {
    try {
      const q = db.transaction(store, 'readonly').objectStore(store).get(key);
      q.onsuccess = () => resolve(q.result?.value ?? null);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function dbGetAll(store) {
  const db = await openDb(); if (!db) return [];
  return new Promise(resolve => {
    try {
      const q = db.transaction(store, 'readonly').objectStore(store).getAll();
      q.onsuccess = () => resolve((q.result || []).map(x => x.value));
      q.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}
async function dbPut(store, key, value) {
  const db = await openDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function rowsForYearRange(fromYear, toYear) {
  const db = await openDb(); if (!db) return [];
  const lo = Math.min(Number(fromYear) || 0, Number(toYear) || 9999);
  const hi = Math.max(Number(fromYear) || 0, Number(toYear) || 9999);
  return new Promise(resolve => {
    const out = [];
    try {
      const tx = db.transaction(STORE_RACES, 'readonly');
      const store = tx.objectStore(STORE_RACES);
      const index = store.indexNames.contains('year') ? store.index('year') : null;
      const req = index ? index.openCursor(IDBKeyRange.bound(lo, hi)) : store.openCursor();
      req.onsuccess = e => {
        const c = e.target.result;
        if (!c) return;
        const row = c.value?.value;
        if (row && Number(row.year) >= lo && Number(row.year) <= hi) out.push(row);
        c.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = tx.onabort = () => resolve([]);
    } catch { resolve([]); }
  });
}
async function replaceYear(year, rows) {
  const db = await openDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_RACES, 'readwrite');
      const store = tx.objectStore(STORE_RACES);
      const index = store.indexNames.contains('year') ? store.index('year') : null;
      const req = index ? index.openCursor(IDBKeyRange.only(Number(year))) : store.openCursor();
      req.onsuccess = e => {
        const c = e.target.result;
        if (c) {
          const row = c.value?.value;
          if (!index && Number(row?.year) !== Number(year)) { c.continue(); return; }
          c.delete(); c.continue(); return;
        }
        for (const row of rows) store.put({ key: row.id, value: row, updatedAt: Date.now() });
      };
      tx.oncomplete = () => { loadedRangeKey = ''; loadedRows = []; currentRows = []; resolve(true); };
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [], out = new Array(list.length); let cursor = 0;
  async function run() { while (true) { const i = cursor++; if (i >= list.length) return; out[i] = await worker(list[i], i); } }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), list.length || 1) }, run));
  return out;
}
async function fetchText(url, retries = 2) {
  let last;
  for (let i = 0; i <= retries; i++) {
    const c = new AbortController(), timer = setTimeout(() => c.abort(), 30000);
    try {
      const r = await fetch(url, { cache: 'no-store', signal: c.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      last = e;
      if (!navigator.onLine) throw new Error('İnternet bağlantısı kesildi.');
      if (i < retries) await new Promise(r => setTimeout(r, 700 * (i + 1)));
    } finally { clearTimeout(timer); }
  }
  throw last || new Error('Veri alınamadı.');
}
async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const d = await r.json();
  if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);
  return d;
}
function annualUrl(year, page, bust) {
  const u = new URL(API_ANNUAL, location.origin);
  u.searchParams.set('QueryParameter_Tarih_Start', `01/01/${year}`);
  u.searchParams.set('QueryParameter_Tarih_End', `31/12/${year}`);
  if (page > 0) u.searchParams.set('PageNumber', String(page));
  u.searchParams.set('_at', bust);
  return u.pathname + u.search;
}
function parseAnnualHtml(html, page = 0) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = [];
  [...doc.querySelectorAll('tr')].forEach((tr, rowIndex) => {
    if (tr.classList.contains('hidable')) return;
    const cells = [...tr.querySelectorAll('td')]; if (cells.length < 8) return;
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
    let cityId = ''; try { cityId = new URL(href, 'https://www.tjk.org').searchParams.get('SehirId') || ''; } catch {}
    const ci = parseClass(classRaw);
    rows.push({
      date, year: Number(date.slice(0, 4)), city, cityId, groupRaw, classRaw,
      classBase: ci.base, classBaseKey: normKey(ci.base), classKey: ci.key, extraTokens: ci.tokens,
      distance, track, trackKey: trackKey(track), prizeRaw, prize: parseMoney(prizeRaw), raceName,
      annualProgramUrl: href ? new URL(href, 'https://www.tjk.org').toString() : '', page, rowIndex,
      raceNo: null, permanentKey: null, resolutionMethod: null, candidateRaceNos: []
    });
  });
  const text = clean(doc.body?.textContent || '');
  const m = text.match(/Toplam\s+([\d.]+)\s+sonuçtan/i);
  return { rows, total: m ? Number(m[1].replace(/\./g, '')) : rows.length };
}
function finalizeRows(rows, year) {
  const count = new Map(), out = [];
  for (const r of rows) {
    if (Number(r.year) !== Number(year)) continue;
    const base = baseIdentity(r), occurrence = (count.get(base) || 0) + 1;
    count.set(base, occurrence);
    out.push({ ...r, occurrenceIndex: occurrence, id: raceId(r, occurrence) });
  }
  return out;
}
function setStatus(text, pct = null) {
  const el = $('aaUpdateStatus'); if (el) el.textContent = text;
  const bar = $('aaProgressBar'); if (bar && pct !== null) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
async function updateYear(year) {
  if (activeUpdate) return;
  activeUpdate = true;
  const btn = $('aaUpdateYear'); if (btn) btn.disabled = true;
  const bust = String(Date.now());
  try {
    setStatus(`${year} ilk sayfa TJK'dan alınıyor…`, 2);
    const first = parseAnnualHtml(await fetchText(annualUrl(year, 0, bust)), 0);
    if (!first.rows.length) throw new Error('TJK yıllık programı boş döndü.');
    const pages = Math.max(1, Math.ceil(Number(first.total || first.rows.length) / PAGE_SIZE));
    const pageNos = Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 1);
    let done = 1;
    const rest = await mapLimit(pageNos, FETCH_CONCURRENCY, async page => {
      const parsed = parseAnnualHtml(await fetchText(annualUrl(year, page, bust)), page);
      done++;
      setStatus(`${year}: ${done}/${pages} sayfa alındı…`, Math.round(done / pages * 88));
      return parsed;
    });
    const final = finalizeRows([...first.rows, ...rest.flatMap(x => x.rows)], year);
    const expected = Number(first.total || 0);
    if (expected > 0 && final.length < Math.min(expected, Math.floor(expected * .9))) {
      throw new Error(`TJK sayfalama doğrulaması başarısız (${final.length}/${expected}).`);
    }
    setStatus(`${year}: ${final.length} yarış yerel arşive yazılıyor…`, 92);
    if (!await replaceYear(year, final)) throw new Error('Yerel arşiv yazımı başarısız.');
    await dbPut(STORE_META, `year:${year}`, { year, status: 'complete', recordCount: final.length, totalReported: expected, updatedAt: new Date().toISOString(), version: VERSION });
    setStatus(`${year} tamamlandı: ${final.length} yarış.`, 100);
    await loadMetaOnly(true);
  } catch (e) {
    await dbPut(STORE_META, `year:${year}`, { year, status: 'error', error: e?.message || String(e), updatedAt: new Date().toISOString() });
    setStatus(`${year} güncellenemedi: ${e?.message || e}`, 0);
  } finally {
    activeUpdate = false;
    if (btn) btn.disabled = false;
  }
}

function unique(rows, field) {
  return [...new Set(rows.map(x => clean(x[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
}
function fillSelect(id, values, allLabel = 'Tümü') {
  const el = $(id); if (!el) return;
  const current = el.value;
  el.innerHTML = `<option value="">${esc(allLabel)}</option>` + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if (values.includes(current)) el.value = current;
}
function renderTokenPills(selected = null) {
  const box = $('aaTokens'); if (!box) return;
  const old = selected || new Set([...box.querySelectorAll('input:checked')].map(x => x.value));
  box.innerHTML = tokenUniverse.length
    ? tokenUniverse.map(t => `<label class="aa-token"><input type="checkbox" value="${esc(t)}" ${old.has(t) ? 'checked' : ''}>${esc(tokenLabel(t))}</label>`).join('')
    : '<span class="aa-pill">Ek şart yok</span>';
}
function populateFilters(rows) {
  fillSelect('aaCity', unique(rows, 'city'));
  fillSelect('aaGroup', unique(rows, 'groupRaw'));
  fillSelect('aaClassBase', unique(rows, 'classBase'));
  fillSelect('aaDistance', unique(rows, 'distance').map(String));
  fillSelect('aaTrack', unique(rows, 'track'));
  tokenUniverse = [...new Set(rows.flatMap(x => x.extraTokens || []))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  renderTokenPills();
}
async function loadMetaOnly(preserve = false) {
  const metas = (await dbGetAll(STORE_META)).filter(x => x?.status === 'complete' && Number(x.year)).sort((a, b) => a.year - b.year);
  const yp = $('aaYearPills');
  if (yp) yp.innerHTML = metas.length
    ? metas.map(m => `<span class="aa-pill"><b>${m.year}</b> · ${m.recordCount} yarış</span>`).join('')
    : '<span class="aa-pill">Henüz yıllık arşiv yok</span>';
  const years = metas.map(m => String(m.year));
  fillSelect('aaYearFrom', years, 'İlk yıl');
  fillSelect('aaYearTo', years, 'Son yıl');
  if (!preserve && years.length) {
    const latest = years[years.length - 1];
    $('aaYearFrom').value = latest;
    $('aaYearTo').value = latest;
  }
  if (!metas.length) setStatus('Arşiv boş. Önce yukarıdan bir yılı güncelleyin.', null);
  else setStatus('Arşiv hazır. Yıl aralığını seçip “Arşivde Bul”a dokunun.', null);
  emit('at-ai:annual-archive-ready', { years });
}
function selectedTokens() { return [...document.querySelectorAll('#aaTokens input:checked')].map(x => x.value); }
function selectedRange() {
  const from = Number($('aaYearFrom')?.value || 0), to = Number($('aaYearTo')?.value || 0);
  if (!from && !to) return null;
  return { from: from || to, to: to || from };
}
async function ensureRangeLoaded() {
  const range = selectedRange();
  if (!range) { loadedRows = []; loadedRangeKey = ''; return []; }
  const key = `${Math.min(range.from, range.to)}|${Math.max(range.from, range.to)}`;
  if (key === loadedRangeKey) return loadedRows;
  setStatus(`${key.replace('|', '–')} arşivi okunuyor…`, null);
  await nextFrame();
  loadedRows = await rowsForYearRange(range.from, range.to);
  loadedRangeKey = key;
  populateFilters(loadedRows);
  return loadedRows;
}
async function searchArchive() {
  if (activeSearch) return;
  activeSearch = true;
  const btn = $('aaSearch'); if (btn) btn.disabled = true;
  try {
    const rows = await ensureRangeLoaded();
    const yf = Number($('aaYearFrom')?.value || 0), yt = Number($('aaYearTo')?.value || 9999);
    const city = clean($('aaCity')?.value), group = clean($('aaGroup')?.value), base = clean($('aaClassBase')?.value);
    const distance = Number($('aaDistance')?.value || 0), track = clean($('aaTrack')?.value), name = norm($('aaRaceName')?.value);
    const tokens = selectedTokens();
    currentRows = rows.filter(r =>
      Number(r.year) >= yf && Number(r.year) <= yt &&
      (!city || r.city === city) && (!group || r.groupRaw === group) && (!base || r.classBase === base) &&
      (!distance || Number(r.distance) === distance) && (!track || r.track === track) &&
      (!name || norm(r.raceName).includes(name)) && tokens.every(t => (r.extraTokens || []).includes(t))
    ).sort((a, b) => b.date.localeCompare(a.date) || a.city.localeCompare(b.city, 'tr') || Number(a.rowIndex) - Number(b.rowIndex));
    renderResults();
    setStatus(`${currentRows.length} yarış bulundu.`, null);
  } finally {
    activeSearch = false;
    if (btn) btn.disabled = false;
  }
}
function renderResults() {
  const box = $('aaResults'), count = $('aaResultCount');
  if (count) count.textContent = `${currentRows.length} yarış bulundu · ${selectedIds.size} seçili`;
  if (!box) return;
  const rows = currentRows.slice(0, MAX_RENDER);
  box.innerHTML = rows.length ? rows.map(r => {
    const checked = selectedIds.has(r.id) ? 'checked' : '';
    let status = r.raceNo ? `<span class="aa-resolved">${esc(r.raceNo)}.K ✓</span>` : '<span class="aa-unresolved">Koşu No çözülmedi</span>';
    if (!r.raceNo && Array.isArray(r.candidateRaceNos) && r.candidateRaceNos.length > 1) {
      status = `<select class="aa-candidate" data-candidate="${esc(r.id)}"><option value="">Koşu seç…</option>${r.candidateRaceNos.map(n => `<option value="${n}">${n}. Koşu</option>`).join('')}</select>`;
    }
    return `<div class="aa-row" data-date="${esc(r.date)}"><input type="checkbox" data-select="${esc(r.id)}" ${checked}><div class="aa-row-main"><div class="aa-row-title">${esc(displayDate(r.date))} · ${esc(r.city)} · ${esc(r.classRaw)} · ${esc(r.distance)} ${esc(r.track)}</div><div class="aa-row-sub">${esc(r.groupRaw)}${r.raceName ? ` · ${esc(r.raceName)}` : ''} · ${esc(r.prizeRaw)}<br>Kanonik: ${esc(r.classBase)}${r.extraTokens?.length ? ' · ' + r.extraTokens.map(tokenLabel).map(esc).join(' · ') : ''}</div></div><div>${status}</div></div>`;
  }).join('') : '<div class="aa-note">Bu filtrelerle yerel arşivde yarış bulunamadı.</div>';
  emit('at-ai:annual-archive-render', { total: currentRows.length, shown: rows.length });
}
async function dayProgram(row) {
  const key = `${row.date}|${row.cityId}|${row.city}`;
  const cached = await dbGet(STORE_DAY, key); if (cached) return cached;
  const data = await fetchJson(`/api/tjk-race-meta?date=${encodeURIComponent(row.date)}&cityId=${encodeURIComponent(row.cityId)}&cityName=${encodeURIComponent(row.city)}`);
  await dbPut(STORE_DAY, key, data); return data;
}
function matchRaceCandidates(row, day) {
  return (Array.isArray(day?.races) ? day.races : []).filter(r => {
    const ci = parseClass(r.class || r.yaradi1 || '');
    return ci.key === row.classKey && ageKey(r.ageGroup || r.yaradi2 || '') === ageKey(row.groupRaw) &&
      Number(r.distance || r.mesafe || 0) === Number(row.distance) && trackKey(r.track || r.pist || '') === row.trackKey;
  }).map(r => Number(r.no ?? r.raceNo ?? r.kosuNo ?? r.yarrno ?? 0)).filter(Boolean).sort((a, b) => a - b);
}
async function resolveRows(rows) {
  const unresolved = rows.filter(r => !r.raceNo);
  if (!unresolved.length) return rows;
  let done = 0;
  await mapLimit(unresolved, 3, async row => {
    try {
      const candidates = matchRaceCandidates(row, await dayProgram(row));
      row.candidateRaceNos = candidates;
      if (candidates.length === 1) {
        row.raceNo = candidates[0]; row.permanentKey = `${row.date}|${row.cityId}|${row.raceNo}`; row.resolutionMethod = 'EXACT_DAILY_PROGRAM';
      } else if (candidates.length > 1) {
        const same = currentRows.filter(x => x.date === row.date && x.cityId === row.cityId && x.classKey === row.classKey && ageKey(x.groupRaw) === ageKey(row.groupRaw) && Number(x.distance) === Number(row.distance) && x.trackKey === row.trackKey).sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);
        const idx = Math.max(0, same.findIndex(x => x.id === row.id));
        if (candidates[idx]) { row.raceNo = candidates[idx]; row.permanentKey = `${row.date}|${row.cityId}|${row.raceNo}`; row.resolutionMethod = 'EXACT_OCCURRENCE_INDEX'; }
      }
      await dbPut(STORE_RACES, row.id, row);
    } catch (e) {
      row.resolveError = e?.message || String(e); await dbPut(STORE_RACES, row.id, row);
    } finally { done++; setStatus(`Koşu No çözümleme: ${done}/${unresolved.length}`, null); }
  });
  renderResults();
  return rows;
}
async function resolveSelected() {
  const ids = [...selectedIds];
  if (!ids.length) { setStatus('Önce en az bir yarış seçin.', null); return; }
  const rows = (await Promise.all(ids.map(id => dbGet(STORE_RACES, id)))).filter(Boolean);
  return await resolveRows(rows);
}

function createDialog() {
  if ($('tjkAnnualArchiveDialog')) return $('tjkAnnualArchiveDialog');
  const d = document.createElement('dialog');
  d.id = 'tjkAnnualArchiveDialog';
  d.innerHTML = `<div class="aa-shell"><div class="aa-head"><div><div class="aa-eyebrow">AT AI SYSTEM · ${esc(VERSION)}</div><h2>TJK Yıllık Yarış Arşivi</h2></div><button class="aa-close" id="aaClose">✕</button></div><div class="aa-body">
    <div class="aa-section"><h3>Yıllık katalog yönetimi</h3><div class="aa-grid two"><label>Yıl<select id="aaUpdateYearSelect">${Array.from({ length: CURRENT_YEAR - 1999 }, (_, i) => CURRENT_YEAR - i).map(y => `<option ${y === CURRENT_YEAR ? 'selected' : ''}>${y}</option>`).join('')}</select></label><label>Yerel arşiv<div id="aaYearPills" class="aa-year-pills"><span class="aa-pill">Yükleniyor…</span></div></label></div><div class="aa-actions"><button class="aa-btn" id="aaUpdateYear">Seçili Yılı Güncelle</button></div><div id="aaUpdateStatus" class="aa-status">Arşiv açıldı.</div><div class="aa-progress"><i id="aaProgressBar"></i></div></div>
    <div class="aa-section"><h3>Tarihsel yarış seçimi</h3><div class="aa-actions" style="margin-top:0"><button class="aa-btn secondary" id="aaFillCurrent">Bugünkü Koşudan Doldur</button><button class="aa-btn secondary" id="aaClearFilters">Filtreleri Temizle</button></div><div class="aa-grid" style="margin-top:10px"><label>Yıl başlangıç<select id="aaYearFrom"></select></label><label>Yıl bitiş<select id="aaYearTo"></select></label><label>Şehir<select id="aaCity"><option value="">Tümü</option></select></label><label>Grup<select id="aaGroup"><option value="">Tümü</option></select></label><label>Koşu Cinsi<select id="aaClassBase"><option value="">Tümü</option></select></label><label>Mesafe<select id="aaDistance"><option value="">Tümü</option></select></label><label>Pist<select id="aaTrack"><option value="">Tümü</option></select></label><label>Koşu İsmi<input id="aaRaceName" placeholder="Tümü"></label></div><div class="aa-status">Ek Şartlar</div><div id="aaTokens" class="aa-token-pills"><span class="aa-pill">Önce yıl aralığını yükleyin</span></div><div class="aa-actions"><button class="aa-btn" id="aaSearch">Arşivde Bul</button><button class="aa-btn secondary" id="aaResolve">Seçilenlerin Koşu No'sunu Çöz</button></div></div>
    <div class="aa-section"><div class="aa-results-head"><b>Bulunan tarihsel yarışlar</b><span id="aaResultCount">0 yarış</span></div><div id="aaResults" class="aa-list"><div class="aa-note">Yıl seçip “Arşivde Bul”a dokunun.</div></div><div class="aa-status">Aynı anda en fazla ${MAX_RENDER} kayıt gösterilir.</div><div class="aa-actions"><button class="aa-btn warn" id="aaRunSelected">Seçilen Yarışlarla Kariyer Analizi</button></div></div>
    <div id="aaAnalysis" class="aa-analysis"></div>
  </div></div>`;
  document.body.appendChild(d);
  $('aaClose').addEventListener('click', () => d.close());
  $('aaUpdateYear').addEventListener('click', () => updateYear(Number($('aaUpdateYearSelect').value)));
  $('aaSearch').addEventListener('click', searchArchive);
  $('aaResolve').addEventListener('click', resolveSelected);
  $('aaClearFilters').addEventListener('click', () => {
    for (const id of ['aaCity','aaGroup','aaClassBase','aaDistance','aaTrack']) if ($(id)) $(id).value = '';
    if ($('aaRaceName')) $('aaRaceName').value = '';
    document.querySelectorAll('#aaTokens input').forEach(x => { x.checked = false; });
    if (loadedRangeKey) searchArchive();
  });
  for (const id of ['aaCity','aaGroup','aaClassBase','aaDistance','aaTrack']) $(id)?.addEventListener('change', () => { if (loadedRangeKey) searchArchive(); });
  $('aaTokens')?.addEventListener('change', () => { if (loadedRangeKey) searchArchive(); });
  $('aaRaceName')?.addEventListener('input', () => {
    clearTimeout(window.__aaNameTimerV14);
    window.__aaNameTimerV14 = setTimeout(() => { if (loadedRangeKey) searchArchive(); }, 250);
  });
  for (const id of ['aaYearFrom','aaYearTo']) $(id)?.addEventListener('change', () => { loadedRangeKey = ''; loadedRows = []; currentRows = []; });
  $('aaResults')?.addEventListener('change', async event => {
    const select = event.target?.closest?.('[data-select]');
    if (select) {
      select.checked ? selectedIds.add(select.dataset.select) : selectedIds.delete(select.dataset.select);
      const count = $('aaResultCount'); if (count) count.textContent = `${currentRows.length} yarış bulundu · ${selectedIds.size} seçili`;
      emit('at-ai:annual-archive-selection', { selected: selectedIds.size });
      return;
    }
    const candidate = event.target?.closest?.('[data-candidate]');
    if (candidate) {
      const id = candidate.dataset.candidate, raceNo = Number(candidate.value || 0);
      if (!id || !raceNo) return;
      const row = await dbGet(STORE_RACES, id); if (!row) return;
      row.raceNo = raceNo; row.permanentKey = `${row.date}|${row.cityId}|${raceNo}`; row.resolutionMethod = 'MANUAL_CANDIDATE'; row.candidateRaceNos = [];
      await dbPut(STORE_RACES, row.id, row);
      const local = loadedRows.find(x => x.id === id); if (local) Object.assign(local, row);
      renderResults();
    }
  });
  emit('at-ai:annual-archive-created');
  return d;
}
function openArchive() {
  const d = createDialog();
  if (!d.open) d.showModal();
  emit('at-ai:annual-archive-open');
  setTimeout(() => loadMetaOnly(false).catch(e => setStatus(`Arşiv bilgisi okunamadı: ${e?.message || e}`, null)), 0);
}
function installMenu() {
  const drawer = $('drawer'); if (!drawer || $('annualArchiveBtn')) return;
  const note = drawer.querySelector('.drawer-note');
  const b = document.createElement('button');
  b.id = 'annualArchiveBtn'; b.type = 'button'; b.textContent = '6. TJK Yıllık Yarış Arşivi';
  b.addEventListener('click', event => {
    event.preventDefault();
    try { if (typeof window.closeDrawer === 'function') window.closeDrawer(); } catch {}
    openArchive();
  });
  note ? drawer.insertBefore(b, note) : drawer.appendChild(b);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installMenu, { once: true }); else installMenu();

window.ATAnnualArchiveV13 = {
  version: VERSION,
  open: openArchive,
  search: searchArchive,
  resolveSelected,
  selectionSet: selectedIds,
  getSelectedIds: () => [...selectedIds],
  getRow: id => dbGet(STORE_RACES, id),
  refreshMeta: loadMetaOnly
};
console.info('[AT AI]', VERSION, 'aktif — temiz yıllık arşiv, gözlemcisiz ve yıl indeksli');
})();
