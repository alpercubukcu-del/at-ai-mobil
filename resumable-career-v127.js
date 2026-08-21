/* AT AI Mobil — V12.7 Resumable Career Analysis
   - Başarılı kariyer/tarihsel/model API cevaplarını IndexedDB'de parça parça checkpoint olarak saklar.
   - İnternet koparsa tamamlanan atlar korunur; yeniden çalıştırmada yalnız eksik ağ çağrıları yapılır.
   - Sayfa yenilense bile yarım kalan Kariyer analizi için "Devam et" kontrolü gösterilir.
   - Büyük analiz state'i localStorage'a kopyalanmaz; checkpointler IndexedDB'dedir.
*/
(() => {
'use strict';
if (window.__AT_RESUMABLE_CAREER_V127__) return;
window.__AT_RESUMABLE_CAREER_V127__ = true;

const VERSION = 'RESUMABLE-CAREER-ANALYSIS-V12.7';
const DB_NAME = 'at_ai_resume_v127';
const DB_VERSION = 1;
const STORE = 'entries';
const SESSION_KEY = 'session|career';
const CACHE_PREFIX = `http|${VERSION}|`;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TARGET_PATHS = new Set([
  '/api/tjk-career-v10',
  '/api/tjk-career',
  '/api/tjk-career-fallback-v1113',
  '/api/tjk-roadmap',
  '/api/tjk-model-roadmap-v11',
  '/api/tjk-adaptive-roadmap-v10',
  '/api/tjk-adaptive-roadmap-v101',
  '/api/tjk-adaptive-roadmap-v102'
]);

let dbPromise = null;
let activeSession = null;
let networkWasOffline = !navigator.onLine;
const inFlight = new Map();

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); }
    catch { return resolve(null); }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath:'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function idbPut(key, kind, value) {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key, kind, value, updatedAt:Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function idbDelete(key) {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function pruneOldEntries() {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const row = cursor.value || {};
      const age = Date.now() - Number(row.updatedAt || 0);
      const limit = row.key === SESSION_KEY ? SESSION_MAX_AGE_MS : MAX_AGE_MS;
      if (!row.updatedAt || age > limit) cursor.delete();
      cursor.continue();
    };
  } catch {}
}

function clean(v) {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function stable(v) {
  return clean(v).toLocaleUpperCase('tr-TR');
}

function canonicalUrlKey(input) {
  try {
    const raw = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input || ''));
    const url = new URL(raw, location.href);
    if (url.origin !== location.origin || !TARGET_PATHS.has(url.pathname)) return null;
    const pairs = [...url.searchParams.entries()]
      .filter(([k]) => k !== 't')
      .sort((a,b) => a[0].localeCompare(b[0]) || String(a[1]).localeCompare(String(b[1])));
    const qs = new URLSearchParams();
    for (const [k,v] of pairs) qs.append(k,v);
    return `${url.pathname}?${qs.toString()}`;
  } catch { return null; }
}

function cacheKeyForRequest(input) {
  const key = canonicalUrlKey(input);
  return key ? `${CACHE_PREFIX}${key}` : null;
}

function responseFromCache(row) {
  const payload = row?.value || {};
  return new Response(payload.body || '', {
    status:Number(payload.status || 200),
    statusText:payload.statusText || 'OK',
    headers:payload.headers || { 'content-type':'application/json; charset=utf-8', 'x-at-ai-checkpoint':'1' }
  });
}

function isFresh(row) {
  return Boolean(row && row.updatedAt && (Date.now() - Number(row.updatedAt)) <= MAX_AGE_MS);
}

function validJsonResponse(res, text) {
  if (!res?.ok || !text) return false;
  try { return JSON.parse(text)?.ok === true; }
  catch { return false; }
}

const nativeFetch = window.fetch.bind(window);
window.fetch = async function(input, init = undefined) {
  const method = clean(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase() || 'GET';
  const cacheKey = method === 'GET' ? cacheKeyForRequest(input) : null;
  if (!cacheKey) return nativeFetch(input, init);

  const cached = await idbGet(cacheKey);
  if (isFresh(cached)) return responseFromCache(cached);

  if (inFlight.has(cacheKey)) {
    const shared = await inFlight.get(cacheKey);
    return shared.clone();
  }

  const promise = (async () => {
    const res = await nativeFetch(input, init);
    try {
      const copy = res.clone();
      const text = await copy.text();
      if (validJsonResponse(res, text)) {
        const headers = { 'content-type':res.headers.get('content-type') || 'application/json; charset=utf-8', 'x-at-ai-checkpoint':'1' };
        await idbPut(cacheKey, 'http', { body:text, status:res.status, statusText:res.statusText, headers });
      }
    } catch {}
    return res;
  })();

  inFlight.set(cacheKey, promise);
  try {
    const res = await promise;
    return res.clone();
  } finally {
    inFlight.delete(cacheKey);
  }
};

function careerToken(horseId, before) {
  return `${clean(horseId)}|${clean(before)}`;
}

function roadmapToken(meta = {}) {
  return [
    clean(state?.date),
    clean(state?.city),
    stable(typeof getCityName === 'function' ? getCityName() : ''),
    stable(meta?.class || ''),
    stable(meta?.ageGroup || ''),
    stable(meta?.track || ''),
    clean(meta?.distance || '')
  ].join('|');
}

function sessionSerializable(session) {
  if (!session) return null;
  return {
    version:VERSION,
    date:session.date,
    city:session.city,
    cityName:session.cityName,
    raceValue:session.raceValue,
    raceNos:[...(session.raceNos || [])],
    expectedCareer:[...(session.expectedCareer || [])],
    doneCareer:[...(session.doneCareer || [])],
    expectedRoadmap:[...(session.expectedRoadmap || [])],
    doneRoadmap:[...(session.doneRoadmap || [])],
    status:session.status || 'partial',
    startedAt:session.startedAt || Date.now(),
    updatedAt:Date.now()
  };
}

function sessionFromRow(row) {
  const s = row?.value;
  if (!s || s.version !== VERSION) return null;
  if (Date.now() - Number(s.updatedAt || s.startedAt || 0) > SESSION_MAX_AGE_MS) return null;
  return {
    ...s,
    raceNos:new Set(Array.isArray(s.raceNos) ? s.raceNos.map(String) : []),
    expectedCareer:new Set(Array.isArray(s.expectedCareer) ? s.expectedCareer : []),
    doneCareer:new Set(Array.isArray(s.doneCareer) ? s.doneCareer : []),
    expectedRoadmap:new Set(Array.isArray(s.expectedRoadmap) ? s.expectedRoadmap : []),
    doneRoadmap:new Set(Array.isArray(s.doneRoadmap) ? s.doneRoadmap : [])
  };
}

async function saveSession(session = activeSession) {
  if (!session) return;
  await idbPut(SESSION_KEY, 'session', sessionSerializable(session));
}

async function clearSession() {
  activeSession = null;
  await idbDelete(SESSION_KEY);
  renderResumeBanner(null);
}

function remaining(session) {
  if (!session) return { careers:0, roadmaps:0, total:0 };
  let careers = 0, roadmaps = 0;
  for (const key of session.expectedCareer) if (!session.doneCareer.has(key)) careers++;
  for (const key of session.expectedRoadmap) if (!session.doneRoadmap.has(key)) roadmaps++;
  return { careers, roadmaps, total:careers + roadmaps };
}

function ensureBanner() {
  let box = document.getElementById('atAiResumeV127');
  if (box) return box;
  const style = document.createElement('style');
  style.textContent = `
    #atAiResumeV127{position:fixed;z-index:99999;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));display:none;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-radius:12px;background:rgba(7,17,31,.96);border:1px solid rgba(114,213,255,.35);box-shadow:0 10px 28px rgba(0,0,0,.38);font-size:12px;line-height:1.35;color:#eef7ff}
    #atAiResumeV127.show{display:flex}
    #atAiResumeV127.offline{border-color:rgba(255,173,102,.55)}
    #atAiResumeV127 .at-resume-text{min-width:0}
    #atAiResumeV127 .at-resume-text b{display:block;margin-bottom:2px}
    #atAiResumeV127 button{flex:0 0 auto;border:0;border-radius:9px;padding:8px 10px;font-weight:800;background:#72d5ff;color:#07111f}
  `;
  document.head.appendChild(style);
  box = document.createElement('div');
  box.id = 'atAiResumeV127';
  box.innerHTML = `<div class="at-resume-text"><b></b><span></span></div><button type="button">Devam et</button>`;
  box.querySelector('button').addEventListener('click', resumeCurrentSession);
  document.body.appendChild(box);
  return box;
}

function renderResumeBanner(session = activeSession, override = '') {
  const box = ensureBanner();
  const title = box.querySelector('b');
  const detail = box.querySelector('span');
  const button = box.querySelector('button');
  if (!session) {
    box.classList.remove('show','offline');
    return;
  }
  const rem = remaining(session);
  box.classList.add('show');
  box.classList.toggle('offline', !navigator.onLine);
  if (!navigator.onLine) {
    title.textContent = 'İnternet bağlantısı kesildi';
    detail.textContent = override || `${session.doneCareer.size}/${session.expectedCareer.size} at korunuyor. Bağlantı gelince yalnız eksikler devam edecek.`;
    button.style.display = 'none';
    return;
  }
  title.textContent = networkWasOffline ? 'Bağlantı geri geldi' : 'Yarım kalan analiz bulundu';
  detail.textContent = override || (rem.total
    ? `${rem.careers} at${rem.roadmaps ? ` · ${rem.roadmaps} tarihsel yol` : ''} eksik. Tamamlananlar yeniden indirilmeyecek.`
    : 'Checkpoint tamamlandı.');
  button.style.display = rem.total ? '' : 'none';
}

async function loadSession() {
  const row = await idbGet(SESSION_KEY);
  const session = sessionFromRow(row);
  if (!session) {
    if (row) await idbDelete(SESSION_KEY);
    return null;
  }
  return session;
}

async function resumeCurrentSession() {
  const session = activeSession || await loadSession();
  if (!session || !navigator.onLine) return;
  if (String(state?.date || '') !== String(session.date || '') || String(state?.city || '') !== String(session.city || '')) {
    renderResumeBanner(session, 'Program değişti. Önce aynı tarih ve şehri yükleyin; checkpoint silinmedi.');
    return;
  }
  activeSession = session;
  session.status = 'resuming';
  await saveSession(session);
  try {
    if (typeof openAnalysis === 'function') openAnalysis('career');
    await new Promise(resolve => setTimeout(resolve, 0));
    const select = document.getElementById('analysisRace');
    if (select && [...select.options].some(o => String(o.value) === String(session.raceValue))) select.value = String(session.raceValue);
    const btn = document.getElementById('runAnalysis');
    if (btn) btn.click();
  } catch (e) {
    renderResumeBanner(session, e?.message || 'Analiz devam ettirilemedi.');
  }
}

const fetchCareerBeforeV127 = typeof fetchCareer === 'function' ? fetchCareer : null;
if (fetchCareerBeforeV127) {
  fetchCareer = async function(horseId, before) {
    const result = await fetchCareerBeforeV127(horseId, before);
    if (result?.ok && activeSession) {
      const key = careerToken(horseId, before);
      if (activeSession.expectedCareer.has(key) && !activeSession.doneCareer.has(key)) {
        activeSession.doneCareer.add(key);
        await saveSession(activeSession);
        renderResumeBanner(activeSession);
      }
    }
    return result;
  };
}

function roadmapCompleteV127(data) {
  if (!data?.ok) return false;
  const races = Array.isArray(data?.historicalRaces) ? data.historicalRaces : [];
  for (const race of races) {
    for (const ref of Array.isArray(race?.top3) ? race.top3 : []) {
      if (!ref?.horseId) continue;
      if (ref?.career?.ok === false || ref?.career?.fullPathError) return false;
    }
  }
  return true;
}

const fetchHistoricalBeforeV127 = typeof fetchHistoricalRoadmap === 'function' ? fetchHistoricalRoadmap : null;
if (fetchHistoricalBeforeV127) {
  fetchHistoricalRoadmap = async function(meta) {
    const result = await fetchHistoricalBeforeV127(meta);
    if (roadmapCompleteV127(result) && activeSession) {
      const key = roadmapToken(meta);
      if (activeSession.expectedRoadmap.has(key) && !activeSession.doneRoadmap.has(key)) {
        activeSession.doneRoadmap.add(key);
        await saveSession(activeSession);
        renderResumeBanner(activeSession);
      }
    }
    return result;
  };
}

const runCareerBeforeV127 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runCareerBeforeV127) {
  runCareerAnalysis = async function(selectedRaces, raceValue) {
    const races = Array.isArray(selectedRaces) ? selectedRaces : [];
    const expectedCareer = new Set();
    const expectedRoadmap = new Set();
    const raceNos = new Set();
    for (const race of races) {
      raceNos.add(String(race?.no ?? ''));
      for (const horse of Array.isArray(race?.horses) ? race.horses : []) {
        if (horse?.id) expectedCareer.add(careerToken(horse.id, state.date));
      }
      try {
        const meta = typeof programRaceMeta === 'function' ? programRaceMeta(race) : null;
        if (meta?.ok) expectedRoadmap.add(roadmapToken(meta));
      } catch {}
    }

    const previous = await loadSession();
    const sameRun = previous &&
      String(previous.date) === String(state?.date || '') &&
      String(previous.city) === String(state?.city || '') &&
      String(previous.raceValue) === String(raceValue ?? 'all');

    activeSession = {
      version:VERSION,
      date:state?.date || '',
      city:String(state?.city || ''),
      cityName:typeof getCityName === 'function' ? getCityName() : '',
      raceValue:String(raceValue ?? 'all'),
      raceNos,
      expectedCareer,
      doneCareer:sameRun ? new Set([...previous.doneCareer].filter(x => expectedCareer.has(x))) : new Set(),
      expectedRoadmap,
      doneRoadmap:sameRun ? new Set([...previous.doneRoadmap].filter(x => expectedRoadmap.has(x))) : new Set(),
      status:'running',
      startedAt:sameRun ? previous.startedAt : Date.now(),
      updatedAt:Date.now()
    };
    await saveSession(activeSession);
    renderResumeBanner(activeSession, 'Analiz checkpointi açık. Bağlantı koparsa tamamlananlar korunacak.');

    try {
      const out = await runCareerBeforeV127(selectedRaces, raceValue);
      const rem = remaining(activeSession);
      if (rem.total === 0) {
        await clearSession();
      } else {
        activeSession.status = navigator.onLine ? 'partial' : 'offline';
        await saveSession(activeSession);
        renderResumeBanner(activeSession);
      }
      return out;
    } catch (e) {
      if (activeSession) {
        activeSession.status = navigator.onLine ? 'partial' : 'offline';
        await saveSession(activeSession);
        renderResumeBanner(activeSession, e?.message || 'Analiz yarıda kaldı; tamamlananlar korundu.');
      }
      throw e;
    }
  };
}

window.addEventListener('offline', async () => {
  networkWasOffline = true;
  const session = activeSession || await loadSession();
  if (!session) return;
  activeSession = session;
  activeSession.status = 'offline';
  await saveSession(activeSession);
  renderResumeBanner(activeSession);
});

window.addEventListener('online', async () => {
  const session = activeSession || await loadSession();
  if (!session) { networkWasOffline = false; return; }
  activeSession = session;
  activeSession.status = 'partial';
  await saveSession(activeSession);
  renderResumeBanner(activeSession);
  networkWasOffline = false;
});

(async function initResumeV127() {
  await pruneOldEntries();
  const session = await loadSession();
  if (!session) return;
  if (String(session.date) !== String(state?.date || '') || String(session.city) !== String(state?.city || '')) return;
  activeSession = session;
  renderResumeBanner(activeSession);
})();

console.info('[AT AI]', VERSION, 'aktif — bağlantı kopmasında checkpoint + eksikten devam');
})();
