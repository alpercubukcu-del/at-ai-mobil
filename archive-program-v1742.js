/* Menu 8: reuse the loaded city; fetch the catalog separately from race pages. */
(() => {
  'use strict';
  if (window.ATArchiveProgramV1742) return;
  const VERSION = 'ARCHIVE-PROGRAM-V17.4.2';
  const TTL = 5 * 60 * 1000, cache = new Map(), pending = new Map(), refreshed = new Set();
  const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(String(date));
  const key = (date, scope) => date + '|' + scope;
  const read = name => { try { return JSON.parse(localStorage.getItem(name) || 'null'); } catch { return null; } };
  function cached(k) {
    const entry = cache.get(k);
    if (!entry || entry.until <= Date.now()) { cache.delete(k); return null; }
    return entry.value;
  }
  function keep(k, value) {
    cache.set(k, {value, until: Date.now() + TTL});
    while (cache.size > 40) cache.delete(cache.keys().next().value);
    return value;
  }
  function snapshot(date) {
    if (refreshed.has(date)) return null;
    let live;
    try { live = typeof state === 'object' ? state : window.state; } catch { live = window.state; }
    const candidates = [live, read('at_ai_mobil_state_v2'), read('at_ai_active_program_v1')];
    // A live state with another date must not fall back to an older saved program.
    if (live?.date && live.date !== date) return null;
    for (const s of candidates) {
      if (s?.date !== date || !s.city || !Array.isArray(s.races) || !s.races.length) continue;
      if (s.programDate && (s.programDate !== date || String(s.programCity) !== String(s.city))) continue;
      // Skeletons / partly loaded races cannot establish a complete horse list.
      if (!s.races.every(r => Array.isArray(r.horses) && r.horses.length && r.horses.every(h => /^\d+$/.test(String(h?.id || ''))))) continue;
      const cities = Array.isArray(s.cities) && s.cities.length ? s.cities : [{id: String(s.city), name: s.cityName || ''}];
      if (!cities.some(c => String(c.id) === String(s.city))) continue;
      return {ok: true, date, cities, racesByCity: {[String(s.city)]: s.races}, loadedCityIds: [String(s.city)], scope: 'city', source: 'loaded-program'};
    }
    return null;
  }
  function asCities(data) {
    return (data.cities || []).map(c => ({...c, id: String(c.id), races: data.racesByCity?.[String(c.id)] ?? null}));
  }
  function remember(data) {
    if (!data?.ok || !validDate(data.date) || data.catalogOnly || data.audit?.failedCityCount) return data;
    const byCity = data.racesByCity || data.programs || {};
    for (const [id, races] of Object.entries(byCity)) {
      keep(key(data.date, 'city:' + id), {...data, scope: 'city', racesByCity: {[id]: races}, loadedCityIds: [id]});
    }
    if (data.scope !== 'city' && data.scope !== 'catalog') keep(key(data.date, 'all'), data);
    keep(key(data.date, 'catalog'), asCities({...data, racesByCity: byCity}));
    return data;
  }
  async function request(date, scope, params, timeout) {
    const k = key(date, scope);
    if (pending.has(k)) return pending.get(k);
    const job = (async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
      try {
        const query = new URLSearchParams({date, ...params});
        const response = await fetch('/api/tjk-program?' + query, {cache: 'no-store', signal: controller.signal});
        const data = await response.json();
        if (!response.ok || !data.ok) throw Error(data.error || 'Günlük program alınamadı.');
        if (data.date !== date) throw Error('Program tarihi istenen tarihle eşleşmiyor.');
        if (data.audit?.failedCityCount) throw Error('Program eksik alındı: ' + (data.audit.errors || []).map(x => x.city || x.cityId).join(', ') + '. Günlük Programı Bul düğmesiyle tekrar deneyin.');
        if (params.cityId && !Array.isArray((data.racesByCity || data.programs || {})[params.cityId])) throw Error('Seçilen şehrin programı alınamadı.');
        return data;
      } catch (error) {
        if (error?.name === 'AbortError') throw Error('Günlük program isteği zaman aşımına uğradı. Günlük Programı Bul düğmesiyle tekrar deneyin.');
        throw error;
      } finally { clearTimeout(timer); }
    })();
    pending.set(k, job);
    try { return await job; } finally { if (pending.get(k) === job) pending.delete(k); }
  }
  function peekCatalog(date) {
    const hit = cached(key(date, 'catalog'));
    if (hit) return hit;
    const loaded = snapshot(date);
    return loaded ? keep(key(date, 'catalog'), asCities(loaded)) : null;
  }
  async function catalog(date, {refresh = false} = {}) {
    if (!validDate(date)) throw Error('Geçerli bir program tarihi seçin.');
    if (refresh) {
      for (const k of cache.keys()) if (k.startsWith(date + '|')) cache.delete(k);
      refreshed.add(date);
    } else {
      const hit = peekCatalog(date);
      if (hit) return hit;
    }
    const data = await request(date, 'catalog', {catalog: '1'}, 20000);
    return keep(key(date, 'catalog'), asCities(data));
  }
  async function load(date, cityId = '') {
    if (!validDate(date)) throw Error('Geçerli bir program tarihi seçin.');
    cityId = String(cityId || '');
    if (cityId && !/^\d+$/.test(cityId)) throw Error('Geçerli bir şehir seçin.');
    const scope = cityId ? 'city:' + cityId : 'all';
    const hit = cached(key(date, scope));
    if (hit) return hit;
    if (cityId) {
      const loaded = snapshot(date);
      if (loaded?.racesByCity[cityId]) return keep(key(date, scope), loaded);
    }
    const data = await request(date, scope, cityId ? {cityId} : {}, cityId ? 30000 : 65000);
    remember(data);
    return keep(key(date, scope), data);
  }
  window.ATArchiveProgramV1742 = {version: VERSION, peekCatalog, catalog, load, remember};
})();
