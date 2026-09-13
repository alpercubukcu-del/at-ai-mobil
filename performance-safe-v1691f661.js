;(() => {
'use strict';
if (window.__AT_PERFORMANCE_SAFE_V1691F661__) return;
window.__AT_PERFORMANCE_SAFE_V1691F661__ = true;

const VERSION = 'PERFORMANCE-SAFE-V16.9.1F60.61';
const RACE_META_TTL_MS = 10 * 60 * 1000;
const CAREER_ABORT_MS = 14500;
const raceMetaInFlight = new Map();
const raceMetaCache = new Map();

const clean = v => String(v ?? '').trim();

function anyDialogOpen() {
  try { return Boolean(document.querySelector('dialog[open]')); }
  catch { return false; }
}

function responseFromSnapshot(snap) {
  const headers = new Headers(snap.headers || {});
  headers.set('x-at-ai-local-cache', 'performance-v661');
  return new Response(snap.body, {
    status:snap.status,
    statusText:snap.statusText,
    headers
  });
}

function requestParts(input, init = {}) {
  try {
    const raw = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input || ''));
    const url = new URL(raw, location.href);
    const method = clean(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase() || 'GET';
    return { url, method };
  } catch { return null; }
}

function raceMetaKey(url) {
  const q = new URLSearchParams();
  for (const key of ['date','cityId','cityName','city']) {
    const value = url.searchParams.get(key);
    if (value !== null) q.set(key, value);
  }
  return `${url.pathname}?${q.toString()}`;
}

function combineSignal(original, timeoutMs) {
  const controller = new AbortController();
  let timer = setTimeout(() => {
    try { controller.abort(new DOMException('AT AI career timeout', 'AbortError')); }
    catch { controller.abort(); }
  }, timeoutMs);
  const abortFromOriginal = () => {
    try { controller.abort(original?.reason); }
    catch { controller.abort(); }
  };
  if (original) {
    if (original.aborted) abortFromOriginal();
    else original.addEventListener('abort', abortFromOriginal, { once:true });
  }
  return {
    signal:controller.signal,
    clear() {
      if (timer) clearTimeout(timer);
      timer = null;
      try { original?.removeEventListener?.('abort', abortFromOriginal); } catch {}
    }
  };
}

const upstreamFetch = window.fetch.bind(window);
window.fetch = async function(input, init = {}) {
  const parts = requestParts(input, init);
  if (!parts || parts.url.origin !== location.origin || parts.method !== 'GET') {
    return upstreamFetch(input, init);
  }

  if (parts.url.pathname === '/api/tjk-race-meta') {
    const key = raceMetaKey(parts.url);
    const cached = raceMetaCache.get(key);
    if (cached && Date.now() - cached.at < RACE_META_TTL_MS) {
      return responseFromSnapshot(cached);
    }
    if (raceMetaInFlight.has(key)) {
      const snap = await raceMetaInFlight.get(key);
      return responseFromSnapshot(snap);
    }
    const task = (async () => {
      const res = await upstreamFetch(input, init);
      const body = await res.clone().text();
      const snap = {
        at:Date.now(),
        body,
        status:res.status,
        statusText:res.statusText,
        headers:{ 'content-type':res.headers.get('content-type') || 'application/json; charset=utf-8' }
      };
      if (res.ok) raceMetaCache.set(key, snap);
      return snap;
    })();
    raceMetaInFlight.set(key, task);
    try { return responseFromSnapshot(await task); }
    finally { raceMetaInFlight.delete(key); }
  }

  if (parts.url.pathname === '/api/tjk-career-v10' || parts.url.pathname === '/api/tjk-career') {
    const originalSignal = init?.signal || (input instanceof Request ? input.signal : null);
    const combined = combineSignal(originalSignal, CAREER_ABORT_MS);
    try {
      return await upstreamFetch(input, { ...init, signal:combined.signal });
    } finally {
      combined.clear();
    }
  }

  return upstreamFetch(input, init);
};

try {
  if (typeof refreshLiveMarketV113 === 'function') {
    const baseRefreshLiveMarketV661 = refreshLiveMarketV113;
    refreshLiveMarketV113 = async function(force = false, ...rest) {
      if (!force && anyDialogOpen()) {
        return { ok:true, skipped:true, reason:'dialog-open', version:VERSION };
      }
      return baseRefreshLiveMarketV661.call(this, force, ...rest);
    };
  }
} catch (error) {
  console.warn('[AT AI]', VERSION, 'live market pause hook warning', error);
}

window.ATPerformanceSafeV1691F661 = {
  version:VERSION,
  raceMetaTtlMs:RACE_META_TTL_MS,
  careerAbortMs:CAREER_ABORT_MS,
  clearRaceMetaMemory() { raceMetaCache.clear(); }
};
console.info('[AT AI]', VERSION, 'aktif — açık analiz penceresinde canlı piyasa yenilemesi durur; race-meta eş istekleri birleştirilir; Kariyer ağ isteği timeoutta gerçekten iptal edilir.');
})();
