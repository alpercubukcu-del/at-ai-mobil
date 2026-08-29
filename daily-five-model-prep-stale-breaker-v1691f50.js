/* AT AI Mobil - V16.9.1F50 Daily 5 Model Stale Breaker
   - F49 hazirlama ekranini korur, fakat butonlari window capture'da once yakalar.
   - Gunluk toplu hazirlamada eski in-flight/cache zincirini komple temizleyip kalici arsivi korur.
   - Model API 15 sn icinde baslamazsa dogrudan prepare zincirini dener.
   - Toplu hazirlamada tek kosu 90 sn'yi gecerse atlar; secili kosu tek basina daha uzun bekleyebilir.
*/
(() => {
'use strict';
if (window.__AT_DAILY_FIVE_MODEL_PREP_STALE_BREAKER_V1691F50__) return;
window.__AT_DAILY_FIVE_MODEL_PREP_STALE_BREAKER_V1691F50__ = true;

const VERSION = 'DAILY-FIVE-MODEL-PREP-STALE-BREAKER-V16.9.1F50';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const SESSION_KEY = 'at_ai_five_model_compact_v1687';
const IDB_TIMEOUT_MS = 2200;
const API_START_GRACE_MS = 15000;
const BATCH_RACE_TIMEOUT_MS = 90000;
const SINGLE_RACE_TIMEOUT_MS = 240000;

let dbPromise = null;
let running = false;
let stopRequested = false;
let skipCurrent = null;
let tickTimer = null;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function currentDate() {
  return clean(window.state?.date || document.getElementById('raceDate')?.value);
}

function currentCityKey() {
  return clean(window.state?.city || document.getElementById('citySelect')?.value);
}

function currentCityName() {
  try {
    return clean(typeof getCityName === 'function' ? getCityName() : document.querySelector('#citySelect option:checked')?.textContent);
  } catch {
    return currentCityKey();
  }
}

function programRaces() {
  return (Array.isArray(window.state?.races) ? window.state.races : [])
    .filter(r => r && r.no !== null && r.no !== undefined && r.no !== '')
    .sort((a, b) => Number(a.no || 0) - Number(b.no || 0));
}

function selectedRace() {
  const n = clean(document.getElementById('ceRace')?.value || document.getElementById('analysisRace')?.value || window.state?.selectedRace);
  return programRaces().find(r => clean(r?.no) === n) || null;
}

function modelKey(raceNo) {
  return `model|${currentDate()}|${currentCityKey()}|${clean(raceNo)}`;
}

function raceFingerprint(race) {
  if (!race) return '';
  const horses = (Array.isArray(race.horses) ? race.horses : [])
    .map(h => [clean(h?.no), clean(h?.id), clean(h?.name).toLocaleUpperCase('tr-TR')].join(':'))
    .sort();
  return [
    clean(race.no),
    clean(race.class || race.yaradi1),
    clean(race.ageGroup || race.yaradi2),
    clean(race.distance || race.mesafe),
    clean(race.track || race.pist),
    horses.join('|')
  ].join('||');
}

function validModelData(data, race) {
  if (!data || data.roadmapOk === false || data.ok === false) return false;
  if (Number(data.no || race?.no || 0) <= 0) return false;
  const horses = Array.isArray(data.horses) ? data.horses : [];
  const expected = Array.isArray(race?.horses) ? race.horses.length : 0;
  if (!horses.length) return false;
  if (expected && horses.length !== expected) return false;
  return true;
}

function recordMatches(record, race) {
  if (!record || record.kind !== 'model' || !race) return false;
  if (clean(record.date) !== currentDate() || clean(record.city) !== currentCityKey()) return false;
  if (clean(record.raceNo) !== clean(race.no)) return false;
  return Boolean(record.fingerprint && record.fingerprint === raceFingerprint(race) && validModelData(record.data, race));
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req = null;
    let settled = false;
    let timer = null;
    const done = value => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value || null);
    };
    timer = setTimeout(() => done(null), IDB_TIMEOUT_MS);
    try { req = indexedDB.open(DB_NAME, 1); } catch { return done(null); }
    req.onupgradeneeded = () => {
      try {
        const db = req.result;
        const store = db.objectStoreNames.contains(STORE)
          ? req.transaction.objectStore(STORE)
          : db.createObjectStore(STORE, { keyPath:'key' });
        if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
        if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
      } catch {}
    };
    req.onsuccess = () => done(req.result);
    req.onerror = req.onblocked = () => done(null);
  });
  return dbPromise;
}

async function dbGet(key) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return null;
  return new Promise(resolve => {
    let settled = false;
    let timer = null;
    const done = value => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value || null);
    };
    timer = setTimeout(() => done(null), IDB_TIMEOUT_MS);
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => done(req.result || null);
      req.onerror = () => done(null);
    } catch {
      done(null);
    }
  });
}

async function archiveSummary() {
  const cached = [];
  const missing = [];
  for (const race of programRaces()) {
    const rec = await dbGet(modelKey(race.no));
    if (recordMatches(rec, race)) cached.push(race);
    else missing.push(race);
  }
  return { cached, missing, total: cached.length + missing.length };
}

function fmt(ms) {
  const sec = Math.max(0, Math.round(Number(ms || 0) / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function setStatus(text, kind = '') {
  const el = document.getElementById('ceDaily5StatusV1691F3');
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.style.color = kind === 'error' ? '#ff8c98' : kind === 'ok' ? '#7ee2a8' : kind === 'warn' ? '#ffbd82' : '';
}

function setArchiveLine(summary) {
  const el = document.getElementById('ceDaily5ArchiveStatusV1691F48');
  if (!el || !summary) return;
  el.textContent = `${currentDate() || 'Tarih'} / ${currentCityName() || 'Şehir'} kalıcı 5 Model arşivi: ${summary.cached.length}/${summary.total} kayıt. Panel önce bu kaydı okuyacak; eksik koşu varsa onu hesaplayacak.`;
}

function ensureProgressBox() {
  const section = document.getElementById('ceDaily5ArchiveV1691F3');
  if (!section) return null;
  let box = document.getElementById('ceDaily5ProgressV1691F49');
  if (!box) {
    box = document.createElement('div');
    box.id = 'ceDaily5ProgressV1691F49';
    const status = document.getElementById('ceDaily5StatusV1691F3');
    (status || section).insertAdjacentElement(status ? 'afterend' : 'beforeend', box);
  }
  box.style.cssText = 'margin-top:8px;padding:8px 9px;border-radius:8px;background:rgba(114,213,255,.08);border:1px solid rgba(114,213,255,.22);font-size:12px;line-height:1.45;display:none';
  box.innerHTML = [
    '<span data-f50-text></span>',
    '<button type="button" class="secondary small" data-f50-skip style="margin-left:6px;padding:5px 8px;font-size:11px">Bu Koşuyu Atla</button>',
    '<button type="button" class="secondary small" data-f50-stop style="margin-left:6px;padding:5px 8px;font-size:11px">Durdur</button>'
  ].join(' ');
  box.querySelector('[data-f50-skip]').onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    if (skipCurrent) skipCurrent('Bu koşu atlandı.');
  };
  box.querySelector('[data-f50-stop]').onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    stopRequested = true;
    if (skipCurrent) skipCurrent('Hazırlama durduruldu.');
    setStatus('Hazırlama durduruluyor.', 'warn');
  };
  return box;
}

function updateProgress(text, runningNow = false) {
  const box = ensureProgressBox();
  if (!box) return;
  box.style.display = text ? 'block' : 'none';
  const label = box.querySelector('[data-f50-text]');
  if (label) label.textContent = text || '';
  for (const btn of box.querySelectorAll('button')) btn.style.display = runningNow ? 'inline-flex' : 'none';
}

function setPrepButtons(disabled) {
  for (const id of ['ceDaily5AllV1691F3', 'ceDaily5OneV1691F3']) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  }
}

function stopTicker() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

function startTicker(fn) {
  stopTicker();
  tickTimer = setInterval(() => { try { fn(); } catch {} }, 1000);
  try { fn(); } catch {}
}

function preserveSession(fn) {
  let saved = null;
  try { saved = sessionStorage.getItem(SESSION_KEY); } catch {}
  try { fn?.(); } catch {}
  if (saved !== null) {
    try { sessionStorage.setItem(SESSION_KEY, saved); } catch {}
  }
}

function clearRuntimeCaches(race) {
  preserveSession(() => {
    try { window.ATFiveModelSharedCacheV1685?.clear?.(); } catch {}
    try { window.ATFiveModelSharedCacheV1687?.clear?.(); } catch {}
  });
  try { window.ATCareerFiveModelFreshStartRecoveryV1691F41?.resetRace?.(race); } catch {}
  try { window.ATCareerFiveModelStaleRecoveryV1691F40?.resetRace?.(race); } catch {}
  try {
    if (typeof careerModelCacheV112 !== 'undefined') {
      if (careerModelCacheV112?.clear) careerModelCacheV112.clear();
      else if (typeof careerModelKeyV112 === 'function' && careerModelCacheV112?.delete) careerModelCacheV112.delete(careerModelKeyV112(race));
    }
  } catch {}
}

function installFetchMonitor() {
  if (window.__AT_F50_FETCH_MONITOR__) return;
  window.__AT_F50_FETCH_MONITOR__ = true;
  window.__AT_F50_FETCH_SEQ__ = Number(window.__AT_F50_FETCH_SEQ__ || 0);
  window.__AT_F50_FETCH_LAST__ = null;
  const baseFetch = window.fetch.bind(window);
  const apiRe = /\/api\/(tjk-career-v10|tjk-career\b|tjk-career-fallback-v1113|tjk-model-roadmap-v11|tjk-roadmap\b|tjk-history\b|tjk-adaptive-roadmap-v10|tjk-adaptive-roadmap-v102)/;
  window.fetch = function(input, init) {
    try {
      const raw = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input || '');
      const url = new URL(raw, location.href);
      if (apiRe.test(url.pathname)) {
        window.__AT_F50_FETCH_SEQ__ = Number(window.__AT_F50_FETCH_SEQ__ || 0) + 1;
        window.__AT_F50_FETCH_LAST__ = { at:Date.now(), method:clean(init?.method || (input instanceof Request ? input.method : 'GET')), path:url.pathname };
      }
    } catch {}
    return baseFetch(input, init);
  };
}

function fetchSeq() {
  return Number(window.__AT_F50_FETCH_SEQ__ || 0);
}

function taggedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function callWithStartWatch(label, runner) {
  const beforeFetch = fetchSeq();
  let settled = false;
  const task = Promise.resolve()
    .then(runner)
    .then(
      value => { settled = true; return { ok:true, value }; },
      error => { settled = true; return { ok:false, error }; }
    );

  const first = await Promise.race([
    task,
    wait(API_START_GRACE_MS).then(() => null)
  ]);
  if (first) {
    if (first.ok) return first.value;
    throw first.error;
  }

  if (!settled && fetchSeq() === beforeFetch) {
    throw taggedError(`${label} 15 sn içinde API isteği başlatmadı; eski bekleme temizlenecek.`, 'AT_F50_NO_API_START');
  }

  const done = await task;
  if (done.ok) return done.value;
  throw done.error;
}

async function modelAttempt(race, progressCb) {
  clearRuntimeCaches(race);
  try {
    return await callWithStartWatch('5 Model normal yol', () => getCareerRaceModelsV112(race));
  } catch (error) {
    if (error?.code !== 'AT_F50_NO_API_START') throw error;
    setStatus(`${race.no}. Koşu eski beklemede kaldı; taze model zinciri başlatılıyor.`, 'warn');
    clearRuntimeCaches(race);
    if (typeof prepareRaceModelsV11 !== 'function') throw error;
    return callWithStartWatch('5 Model taze yol', () => prepareRaceModelsV11(race, progressCb));
  }
}

async function computeRace(race, index, total, overallStarted, maxMs) {
  if (typeof getCareerRaceModelsV112 !== 'function') throw new Error('5 Model motoru bulunamadı.');
  const raceStarted = performance.now();
  const progressCb = message => setStatus(`${index}/${total} eksik · ${race.no}. Koşu · ${clean(message)}`);
  const label = () => {
    const text = `${index}/${total} eksik · ${race.no}. Koşu hazırlanıyor · bu koşu ${fmt(performance.now() - raceStarted)} · toplam ${fmt(performance.now() - overallStarted)}`;
    setStatus(text);
    updateProgress(text, true);
  };
  startTicker(label);

  const skip = new Promise((_, reject) => {
    skipCurrent = message => reject(taggedError(message || 'Bu koşu atlandı.', 'AT_F50_SKIP'));
  });
  const timeout = wait(maxMs).then(() => {
    throw taggedError(`${race.no}. Koşu ${fmt(maxMs)} sınırını geçti; sıradaki koşuya geçildi.`, 'AT_F50_TIMEOUT');
  });

  try {
    const data = await Promise.race([modelAttempt(race, progressCb), skip, timeout]);
    if (!validModelData(data, race)) {
      const count = Array.isArray(data?.horses) ? data.horses.length : 0;
      const expected = Array.isArray(race?.horses) ? race.horses.length : 0;
      throw new Error(data?.roadmapError || `${race.no}. Koşu 5 Model eksik (${count}/${expected}).`);
    }
    return data;
  } finally {
    skipCurrent = null;
    stopTicker();
  }
}

async function runBatch(inputRaces, button, singleMode) {
  if (running) {
    setStatus('Günlük 5 Model hazırlama zaten çalışıyor.', 'warn');
    return;
  }
  if (!currentDate() || !currentCityKey()) {
    setStatus('Önce tarih ve şehir programını yükleyin.', 'error');
    return;
  }
  const input = (Array.isArray(inputRaces) ? inputRaces : []).filter(Boolean);
  if (!input.length) {
    setStatus('Hazırlanacak koşu bulunamadı.', 'error');
    return;
  }

  installFetchMonitor();
  running = true;
  stopRequested = false;
  const oldText = button?.textContent || '';
  const overallStarted = performance.now();
  const maxMs = singleMode ? SINGLE_RACE_TIMEOUT_MS : BATCH_RACE_TIMEOUT_MS;
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  try {
    setPrepButtons(true);
    clearRuntimeCaches(null);
    const before = await archiveSummary();
    setArchiveLine(before);
    const missingSet = new Set(before.missing.map(r => clean(r.no)));
    const todo = input.filter(r => missingSet.has(clean(r.no)));
    const readySkipped = input.length - todo.length;

    if (!todo.length) {
      const msg = `Günlük 5 Model arşivi hazır: ${before.cached.length}/${before.total} kayıt. Yeniden tarihsel tarama yapılmadı.`;
      setStatus(msg, 'ok');
      updateProgress(msg, false);
      return;
    }

    const startMsg = `${before.cached.length}/${before.total} kayıt hazır; ${todo.length} eksik koşu sırayla hazırlanacak. Toplu modda bir koşu en fazla ${fmt(maxMs)} bekler.`;
    setStatus(startMsg);
    updateProgress(startMsg, true);

    for (let i = 0; i < todo.length; i++) {
      if (stopRequested) break;
      const race = todo[i];
      if (button) button.textContent = `${i + 1}/${todo.length} eksik hazırlanıyor...`;
      try {
        await computeRace(race, i + 1, todo.length, overallStarted, maxMs);
        ok++;
        const after = await archiveSummary();
        setArchiveLine(after);
        setStatus(`${race.no}. Koşu hazır · arşiv ${after.cached.length}/${after.total} kayıt · toplam ${fmt(performance.now() - overallStarted)}`, 'ok');
      } catch (error) {
        if (error?.code === 'AT_F50_SKIP' || error?.code === 'AT_F50_TIMEOUT' || error?.code === 'AT_F50_NO_API_START') skipped++;
        else failed++;
        errors.push(`${race.no}.K: ${error?.message || error}`);
        setStatus(`${race.no}. Koşu atlandı: ${error?.message || error}`, 'warn');
        clearRuntimeCaches(race);
      }
      await wait(180);
    }

    const finalSummary = await archiveSummary();
    setArchiveLine(finalSummary);
    const msg = `Günlük 5 Model arşivi: ${finalSummary.cached.length}/${finalSummary.total} kayıt · bu tur ${ok} yeni${readySkipped ? ` · ${readySkipped} zaten hazır` : ''}${skipped ? ` · ${skipped} atlandı` : ''}${failed ? ` · ${failed} hata` : ''}${stopRequested ? ' · durduruldu' : ''} · süre ${fmt(performance.now() - overallStarted)}.`;
    setStatus(msg, failed || skipped || stopRequested ? 'warn' : 'ok');
    updateProgress(msg, false);
    if (errors.length) console.warn('[AT AI]', VERSION, 'hazırlama notları:', errors);
  } finally {
    stopTicker();
    skipCurrent = null;
    running = false;
    setPrepButtons(false);
    if (button) button.textContent = oldText || button.textContent;
  }
}

function enhanceUi() {
  ensureProgressBox();
  archiveSummary().then(setArchiveLine).catch(() => {});
}

function bind() {
  installFetchMonitor();
  window.addEventListener('click', event => {
    const all = event.target?.closest?.('#ceDaily5AllV1691F3');
    const one = event.target?.closest?.('#ceDaily5OneV1691F3');
    if (!all && !one) return;
    const button = all || one;
    if (button.disabled && !running) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (all) runBatch(programRaces(), button, false);
    else {
      const race = selectedRace();
      if (!race) setStatus('Önce üstten bir koşu seçin.', 'error');
      else runBatch([race], button, true);
    }
  }, true);
  document.addEventListener('click', event => {
    if (event.target?.closest?.('#careerExportMenuBtn')) setTimeout(enhanceUi, 80);
  }, true);
  window.addEventListener('pageshow', () => setTimeout(enhanceUi, 250), { passive:true });
  setTimeout(enhanceUi, 250);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
else bind();

window.ATDailyFiveModelPrepStaleBreakerV1691F50 = {
  version: VERSION,
  summary: archiveSummary,
  clearRuntimeCaches,
  runAll: () => runBatch(programRaces(), document.getElementById('ceDaily5AllV1691F3'), false),
  runSelected: () => {
    const race = selectedRace();
    return race ? runBatch([race], document.getElementById('ceDaily5OneV1691F3'), true) : Promise.resolve(false);
  },
  skip: () => { if (skipCurrent) skipCurrent('Bu koşu atlandı.'); },
  stop: () => { stopRequested = true; if (skipCurrent) skipCurrent('Hazırlama durduruldu.'); }
};

console.info('[AT AI]', VERSION, 'aktif - gunluk 5 Model hazirlama stale in-flight temizler ve uzun kosuyu atlar.');
})();
