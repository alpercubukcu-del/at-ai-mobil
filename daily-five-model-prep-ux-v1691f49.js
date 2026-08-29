/* AT AI Mobil - V16.9.1F49 Daily 5 Model Prep UX + Mobile Resume
   - Gunluk 5 Model hazirlamada yalniz eksik/gecersiz kosulari hesaplar.
   - Hazir kayitlari tekrar motorun icine sokmadan atlar.
   - Ekranda toplam ve mevcut kosu gecen suresini gosterir.
   - Android/Firefox uygulamadan cik-don sonrasi acik pencereyi geri yukler.
*/
(() => {
'use strict';
if (window.__AT_DAILY_FIVE_MODEL_PREP_UX_V1691F49__) return;
window.__AT_DAILY_FIVE_MODEL_PREP_UX_V1691F49__ = true;

const VERSION = 'DAILY-FIVE-MODEL-PREP-UX-V16.9.1F49';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const RESUME_KEY = 'at_ai_mobile_resume_state_v1691f49';
const IDB_TIMEOUT_MS = 2200;
const LONG_WARN_MS = 60000;
const RACE_TIMEOUT_MS = 240000;

let dbPromise = null;
let running = false;
let stopRequested = false;
let tickTimer = null;
let currentTick = null;
let restoring = false;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = value => clean(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
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
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
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
    box.style.cssText = 'margin-top:8px;padding:8px 9px;border-radius:8px;background:rgba(114,213,255,.08);border:1px solid rgba(114,213,255,.22);font-size:12px;line-height:1.45;display:none';
    box.innerHTML = '<span data-f49-text></span> <button type="button" class="secondary small" data-f49-stop style="margin-left:6px;padding:5px 8px;font-size:11px">Durdur</button>';
    const status = document.getElementById('ceDaily5StatusV1691F3');
    (status || section).insertAdjacentElement(status ? 'afterend' : 'beforeend', box);
    box.querySelector('[data-f49-stop]').onclick = event => {
      event.preventDefault();
      stopRequested = true;
      const btn = event.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Durduruluyor';
      setStatus('Mevcut koşu bitince günlük hazırlama durdurulacak.', 'warn');
    };
  }
  return box;
}

function updateProgress(text, runningNow = false) {
  const box = ensureProgressBox();
  if (!box) return;
  box.style.display = text ? 'block' : 'none';
  const label = box.querySelector('[data-f49-text]');
  if (label) label.textContent = text || '';
  const stop = box.querySelector('[data-f49-stop]');
  if (stop) {
    stop.style.display = runningNow ? 'inline-flex' : 'none';
    stop.disabled = false;
    stop.textContent = 'Durdur';
  }
}

function setPrepButtons(disabled) {
  for (const id of ['ceDaily5AllV1691F3', 'ceDaily5OneV1691F3']) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  }
}

function startTicker(fn) {
  stopTicker();
  currentTick = fn;
  tickTimer = setInterval(() => {
    try { currentTick?.(); } catch {}
  }, 1000);
  try { currentTick?.(); } catch {}
}

function stopTicker() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
  currentTick = null;
}

async function computeRace(race, index, total, overallStarted) {
  if (typeof getCareerRaceModelsV112 !== 'function') throw new Error('5 Model motoru bulunamadı.');
  const raceStarted = performance.now();
  const label = () => {
    const raceMs = performance.now() - raceStarted;
    const allMs = performance.now() - overallStarted;
    const long = raceMs > LONG_WARN_MS ? ' · uzun sürüyor, tarihsel yarış ve at kariyerleri bekleniyor' : '';
    const text = `${index}/${total} eksik · ${race.no}. Koşu hazırlanıyor · bu koşu ${fmt(raceMs)} · toplam ${fmt(allMs)}${long}`;
    setStatus(text);
    updateProgress(text, true);
  };
  startTicker(label);

  const timeout = wait(RACE_TIMEOUT_MS).then(() => {
    throw new Error(`${race.no}. Koşu 4 dakikayı geçti; işlem arka planda kalmış olabilir. Sayfayı yenileyip yalnız eksikleri tekrar deneyin.`);
  });
  const data = await Promise.race([getCareerRaceModelsV112(race), timeout]);
  stopTicker();
  if (!validModelData(data, race)) {
    const count = Array.isArray(data?.horses) ? data.horses.length : 0;
    const expected = Array.isArray(race?.horses) ? race.horses.length : 0;
    throw new Error(data?.roadmapError || `${race.no}. Koşu 5 Model eksik (${count}/${expected}).`);
  }
  await wait(120);
  return data;
}

async function runBatch(races, button) {
  if (running) {
    setStatus('Günlük 5 Model hazırlama zaten çalışıyor.', 'warn');
    return;
  }
  if (!currentDate() || !currentCityKey()) {
    setStatus('Önce tarih ve şehir programını yükleyin.', 'error');
    return;
  }
  const input = (Array.isArray(races) ? races : []).filter(Boolean);
  if (!input.length) {
    setStatus('Hazırlanacak koşu bulunamadı.', 'error');
    return;
  }

  running = true;
  stopRequested = false;
  const oldText = button?.textContent || '';
  const overallStarted = performance.now();
  let ok = 0;
  let failed = 0;
  const errors = [];

  try {
    setPrepButtons(true);
    const before = await archiveSummary();
    setArchiveLine(before);
    const missingSet = new Set(before.missing.map(r => clean(r.no)));
    const todo = input.filter(r => missingSet.has(clean(r.no)));
    const skipped = input.length - todo.length;

    if (!todo.length) {
      const msg = `Günlük 5 Model arşivi hazır: ${before.cached.length}/${before.total} kayıt. Yeniden tarihsel tarama yapılmadı.`;
      setStatus(msg, 'ok');
      updateProgress(msg, false);
      return;
    }

    setStatus(`${before.cached.length}/${before.total} kayıt hazır; ${todo.length} eksik koşu sırayla hazırlanacak.`);
    updateProgress(`${skipped ? `${skipped} koşu arşivden atlandı · ` : ''}${todo.length} eksik koşu hazırlanacak.`, true);

    for (let i = 0; i < todo.length; i++) {
      if (stopRequested) break;
      const race = todo[i];
      if (button) button.textContent = `${i + 1}/${todo.length} eksik hazırlanıyor...`;
      try {
        await computeRace(race, i + 1, todo.length, overallStarted);
        ok++;
        const after = await archiveSummary();
        setArchiveLine(after);
        setStatus(`${race.no}. Koşu hazır · arşiv ${after.cached.length}/${after.total} kayıt · toplam ${fmt(performance.now() - overallStarted)}`, 'ok');
      } catch (error) {
        failed++;
        errors.push(`${race.no}.K: ${error?.message || error}`);
        setStatus(`${race.no}. Koşu tamamlanamadı: ${error?.message || error}`, 'warn');
      }
      await wait(180);
    }

    const finalSummary = await archiveSummary();
    setArchiveLine(finalSummary);
    const suffix = stopRequested ? ' · kullanıcı durdurdu' : '';
    const msg = `Günlük 5 Model arşivi: ${finalSummary.cached.length}/${finalSummary.total} kayıt · bu tur ${ok} yeni${skipped ? ` · ${skipped} zaten hazır` : ''}${failed ? ` · ${failed} hata` : ''}${suffix} · süre ${fmt(performance.now() - overallStarted)}.`;
    setStatus(msg, failed ? 'warn' : stopRequested ? 'warn' : 'ok');
    updateProgress(msg, false);
    if (errors.length) console.warn('[AT AI]', VERSION, 'hazırlama uyarıları:', errors);
  } finally {
    stopTicker();
    running = false;
    setPrepButtons(false);
    if (button) button.textContent = oldText || button.textContent;
  }
}

function enhancePrepUi() {
  const section = document.getElementById('ceDaily5ArchiveV1691F3');
  if (!section) return false;
  ensureProgressBox();
  archiveSummary().then(setArchiveLine).catch(() => {});
  return true;
}

function bindPrepClicks() {
  document.addEventListener('click', event => {
    const all = event.target?.closest?.('#ceDaily5AllV1691F3');
    const one = event.target?.closest?.('#ceDaily5OneV1691F3');
    if (!all && !one) return;
    const button = all || one;
    if (button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (all) runBatch(programRaces(), button);
    else {
      const race = selectedRace();
      if (!race) setStatus('Önce üstten bir koşu seçin.', 'error');
      else runBatch([race], button);
    }
  }, true);
}

function dialogScroll(id) {
  return Number(document.getElementById(id)?.querySelector?.('.ce-body,#analysisContent')?.scrollTop || 0);
}

function activeSnapshot() {
  const careerExport = document.getElementById('careerExportDialog');
  const analysis = document.getElementById('analysisDialog');
  const anyOpen = Boolean(careerExport?.open || analysis?.open);
  if (!anyOpen) return null;
  return {
    ts: Date.now(),
    url: location.pathname + location.search,
    date: currentDate(),
    city: currentCityKey(),
    cityName: currentCityName(),
    selectedRace: clean(document.getElementById('analysisRace')?.value || document.getElementById('ceRace')?.value || window.state?.selectedRace),
    scrollY: window.scrollY || 0,
    careerExportOpen: Boolean(careerExport?.open),
    careerExportScroll: dialogScroll('careerExportDialog'),
    analysisOpen: Boolean(analysis?.open),
    analysisView: clean(analysis?.dataset?.view),
    analysisRace: clean(document.getElementById('analysisRace')?.value),
    analysisScroll: dialogScroll('analysisDialog'),
    fiveModelOpen: Boolean(document.getElementById('careerFiveModelV139')?.open)
  };
}

function saveResume(reason = '') {
  if (restoring) return;
  try {
    const snap = activeSnapshot();
    if (!snap) return;
    snap.reason = reason;
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(snap));
  } catch {}
}

function clearResumeSoon() {
  if (document.visibilityState !== 'visible') return;
  setTimeout(() => {
    if (activeSnapshot()) return;
    try { sessionStorage.removeItem(RESUME_KEY); } catch {}
  }, 120);
}

function readResume() {
  try {
    const snap = JSON.parse(sessionStorage.getItem(RESUME_KEY) || 'null');
    if (!snap || !snap.ts || Date.now() - Number(snap.ts) > 3 * 60 * 60 * 1000) return null;
    return snap;
  } catch {
    return null;
  }
}

function restoreCareerExport(snap) {
  const dlg = document.getElementById('careerExportDialog');
  if (!dlg) return false;
  try {
    if (!dlg.open && typeof dlg.showModal === 'function') dlg.showModal();
    else if (!dlg.open) dlg.setAttribute('open', '');
  } catch {
    try { dlg.setAttribute('open', ''); } catch {}
  }
  setTimeout(() => {
    try {
      document.getElementById('careerExportMenuBtn')?.classList?.add('active');
      const select = document.getElementById('ceRace');
      if (select && snap.selectedRace) select.value = snap.selectedRace;
      const body = dlg.querySelector('.ce-body');
      if (body) body.scrollTop = Number(snap.careerExportScroll || 0);
      enhancePrepUi();
    } catch {}
  }, 120);
  return true;
}

function restoreAnalysis(snap) {
  const view = snap.analysisView || 'career';
  try {
    if (typeof openAnalysis === 'function') openAnalysis(view);
  } catch {}
  setTimeout(() => {
    try {
      const sel = document.getElementById('analysisRace');
      if (sel && snap.analysisRace && [...sel.options].some(o => clean(o.value) === clean(snap.analysisRace))) {
        sel.value = snap.analysisRace;
      }
      if (view === 'career' && typeof renderCareerAnalysis === 'function' && window.state?.analyses?.career?.races?.length) {
        renderCareerAnalysis(window.state.analyses.career, sel?.value || snap.analysisRace || 'all');
      }
      const content = document.getElementById('analysisContent');
      if (content) content.scrollTop = Number(snap.analysisScroll || 0);
      if (snap.fiveModelOpen) {
        const box = document.getElementById('careerFiveModelV139');
        if (box) {
          box.open = true;
          try { window.ATCareerFiveModelPanelStarterV1691F47?.start?.(); } catch {}
        }
      }
    } catch {}
  }, 350);
}

function restoreResume(reason = '') {
  const snap = readResume();
  if (!snap) return false;
  if (restoring) return false;
  restoring = true;
  try {
    if (snap.date && currentDate() && snap.date !== currentDate()) return false;
    if (snap.city && currentCityKey() && snap.city !== currentCityKey()) return false;
    if (snap.careerExportOpen) restoreCareerExport(snap);
    if (snap.analysisOpen) restoreAnalysis(snap);
    setTimeout(() => {
      try { window.scrollTo(0, Number(snap.scrollY || 0)); } catch {}
      if (snap.careerExportOpen || snap.analysisOpen) {
        try { if (typeof status === 'function') status('Mobil dönüş konumu geri yüklendi.'); } catch {}
      }
    }, 700);
    console.info('[AT AI]', VERSION, 'mobile resume restored', reason, snap);
    return true;
  } finally {
    setTimeout(() => { restoring = false; }, 1000);
  }
}

function boot() {
  bindPrepClicks();
  enhancePrepUi();
  setTimeout(enhancePrepUi, 400);
  setTimeout(() => restoreResume('startup'), 800);

  document.addEventListener('click', event => {
    if (event.target?.closest?.('#careerExportMenuBtn')) setTimeout(enhancePrepUi, 80);
    setTimeout(() => saveResume('click'), 160);
  }, true);
  document.addEventListener('toggle', () => setTimeout(() => saveResume('toggle'), 80), true);
  document.addEventListener('close', clearResumeSoon, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveResume('hidden');
    else setTimeout(() => restoreResume('visible'), 500);
  }, { passive:true });
  window.addEventListener('pagehide', () => saveResume('pagehide'), { passive:true });
  window.addEventListener('beforeunload', () => saveResume('beforeunload'), { passive:true });
  window.addEventListener('pageshow', () => {
    setTimeout(enhancePrepUi, 200);
    setTimeout(() => restoreResume('pageshow'), 650);
  }, { passive:true });

  const mo = new MutationObserver(() => enhancePrepUi());
  try { mo.observe(document.documentElement, { childList:true, subtree:true }); } catch {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATDailyFiveModelPrepUxV1691F49 = {
  version: VERSION,
  summary: archiveSummary,
  runAll: () => runBatch(programRaces(), document.getElementById('ceDaily5AllV1691F3')),
  runSelected: () => {
    const race = selectedRace();
    return race ? runBatch([race], document.getElementById('ceDaily5OneV1691F3')) : Promise.resolve(false);
  },
  saveResume,
  restoreResume,
  clearResume: () => { try { sessionStorage.removeItem(RESUME_KEY); } catch {} }
};

console.info('[AT AI]', VERSION, 'aktif - 5 Model hazirlama eksik kayit odakli ve mobil geri donus korumali.');
})();
