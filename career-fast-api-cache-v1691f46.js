/* AT AI Mobil - V16.9.1F46 CAREER FAST API CACHE
   - Reuses identical Career/History/5 Model GET calls in the same mobile session.
   - Removes no-store from stable TJK proxy GET calls so Vercel CDN can serve repeats.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FAST_API_CACHE_V1691F46__) return;
window.__AT_CAREER_FAST_API_CACHE_V1691F46__ = true;

const VERSION = 'CAREER-FAST-API-CACHE-V16.9.1F46';
const HOUR = 60 * 60 * 1000;
const MAX_ITEMS = 420;
const MAX_BODY_CHARS = 900000;
const originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
if (!originalFetch || typeof URL !== 'function' || typeof Response !== 'function') return;

const RULES = [
  { path: '/api/tjk-career-v10', ttlMs: 6 * HOUR },
  { path: '/api/tjk-career', ttlMs: 6 * HOUR },
  { path: '/api/tjk-career-fallback-v1113', ttlMs: 6 * HOUR },
  { path: '/api/tjk-history', ttlMs: 12 * HOUR },
  { path: '/api/tjk-model-roadmap-v11', ttlMs: 6 * HOUR },
  { path: '/api/tjk-adaptive-roadmap-v102', ttlMs: 6 * HOUR },
  { path: '/api/tjk-adaptive-roadmap-v10', ttlMs: 6 * HOUR }
];
const memory = new Map();
const pending = new Map();
const stats = { hits: 0, joins: 0, misses: 0, stores: 0, bypasses: 0, errors: 0 };

function requestUrl(input) {
  try {
    if (typeof input === 'string') return input;
    if (input && typeof input.href === 'string') return input.href;
    if (input && typeof input.url === 'string') return input.url;
  } catch {}
  return '';
}

function methodFor(input, init) {
  return String(init?.method || input?.method || 'GET').toUpperCase();
}

function matchRule(url) {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.origin !== window.location.origin) return null;
    return RULES.find(rule => parsed.pathname === rule.path) || null;
  } catch {
    return null;
  }
}

function normalizedKey(url) {
  const parsed = new URL(url, window.location.href);
  const params = [...parsed.searchParams.entries()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const query = params.map(pair => encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1])).join('&');
  return parsed.pathname + (query ? '?' + query : '');
}

function responseFrom(pack, cacheState) {
  if (pack?.passthrough) return pack.passthrough;
  const headers = new Headers(pack?.headers || []);
  headers.set('X-AT-AI-Client-Cache', cacheState);
  headers.set('X-AT-AI-Client-Cache-Version', VERSION);
  return new Response(pack?.body || '', {
    status: pack?.status || 200,
    statusText: pack?.statusText || 'OK',
    headers
  });
}

function shouldLoosenCache(mode) {
  return mode === 'no-store' || mode === 'no-cache' || mode === 'reload';
}

function normalizedInit(input, init) {
  const out = init && typeof init === 'object' ? { ...init } : {};
  const requestCache = input && typeof Request !== 'undefined' && input instanceof Request ? input.cache : '';
  if (shouldLoosenCache(out.cache) || shouldLoosenCache(requestCache)) out.cache = 'default';

  try {
    const headers = new Headers(out.headers || (input && typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined));
    let changed = false;
    if (headers.has('cache-control')) { headers.delete('cache-control'); changed = true; }
    if (headers.has('pragma')) { headers.delete('pragma'); changed = true; }
    if (changed || out.headers) out.headers = headers;
  } catch {}
  return out;
}

function prune() {
  const now = Date.now();
  for (const [key, pack] of memory) {
    if (!pack || pack.expires <= now) memory.delete(key);
  }
  while (memory.size > MAX_ITEMS) {
    const first = memory.keys().next().value;
    if (!first) break;
    memory.delete(first);
  }
}

function remember(key, pack) {
  prune();
  memory.set(key, pack);
}

async function packNetworkResponse(input, init, key, rule) {
  const response = await originalFetch(input, normalizedInit(input, init));
  let body = '';
  try {
    body = await response.clone().text();
  } catch {
    stats.bypasses++;
    return { passthrough: response };
  }
  const headers = [];
  try { response.headers.forEach((value, name) => headers.push([name, value])); } catch {}
  const pack = {
    body,
    headers,
    status: response.status,
    statusText: response.statusText,
    expires: response.ok && body.length <= MAX_BODY_CHARS ? Date.now() + rule.ttlMs : 0,
    storedAt: Date.now()
  };
  if (pack.expires) {
    remember(key, pack);
    stats.stores++;
  }
  return pack;
}

window.fetch = function atAiCachedFetch(input, init) {
  try {
    if (methodFor(input, init) !== 'GET') {
      stats.bypasses++;
      return originalFetch(input, init);
    }
    const url = requestUrl(input);
    const rule = matchRule(url);
    if (!rule) {
      stats.bypasses++;
      return originalFetch(input, init);
    }
    const key = normalizedKey(url);
    const cached = memory.get(key);
    if (cached && cached.expires > Date.now()) {
      stats.hits++;
      return Promise.resolve(responseFrom(cached, 'HIT'));
    }
    if (cached) memory.delete(key);

    const running = pending.get(key);
    if (running) {
      stats.joins++;
      return running.then(pack => responseFrom(pack, 'JOIN'));
    }

    stats.misses++;
    const job = packNetworkResponse(input, init, key, rule).finally(() => pending.delete(key));
    pending.set(key, job);
    return job.then(pack => responseFrom(pack, pack?.expires ? 'MISS-STORE' : 'MISS'));
  } catch (error) {
    stats.errors++;
    return originalFetch(input, init);
  }
};

window.ATCareerFastApiCacheV1691F46 = {
  version: VERSION,
  stats: () => ({ ...stats, memorySize: memory.size, pendingSize: pending.size }),
  clear: () => { memory.clear(); pending.clear(); }
};

console.info('[AT AI]', VERSION, 'active - Career API calls reuse mobile session and CDN cache.');
})();
