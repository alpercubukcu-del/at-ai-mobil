import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../archive-program-v1742.js', import.meta.url), 'utf8');
const date = '2026-09-30';
const cities = [{id: '3', name: 'İstanbul'}, {id: '4', name: 'Bursa'}];
const race = id => ({no: 1, horses: [{id, name: 'TEST', originRefs: {sire: {id: '42', url: 'https://www.tjk.org/sire'}}}]});
function runtime({state, saved, respond} = {}) {
  const calls = [], timers = [];
  const window = {state};
  const context = vm.createContext({window, localStorage: {getItem: k => JSON.stringify(saved?.[k] || null)}, URLSearchParams, AbortController, Date,
    setTimeout: (fn, ms) => {timers.push(ms); return setTimeout(fn, ms);}, clearTimeout,
    fetch: async (input, options) => {const url = new URL(input, 'https://test.invalid'); calls.push(url); return {ok: true, json: async () => respond ? respond(url, options) : {ok: true, date, cities, scope: 'city', racesByCity: {'4': [race('200')]}}};}
  });
  vm.runInContext(source, context);
  return {api: window.ATArchiveProgramV1742, calls, timers, window};
}
test('loaded city opens offline and preserves IDs and official origin links', async () => {
  const r = runtime({state: {date, city: '3', cities, races: [race('100')]}, respond: () => {throw Error('offline');}});
  assert.equal(r.api.peekCatalog(date)[0].id, '3');
  const catalog = await r.api.catalog(date), data = await r.api.load(date, '3');
  assert.equal(catalog.length, 2);
  assert.equal(catalog[1].races, null);
  assert.equal(data.racesByCity['3'][0].horses[0].originRefs.sire.id, '42');
  assert.equal(r.calls.length, 0);
});
test('saved program can be restored after a page reload', async () => {
  const r = runtime({saved: {at_ai_mobil_state_v2: {date, city: '3', cities, races: [race('100')]}}});
  assert.equal((await r.api.load(date, '3')).source, 'loaded-program');
  assert.equal(r.calls.length, 0);
});
test('a loaded city is never used as the whole-day program', async () => {
  const r = runtime({state: {date, city: '3', cities, races: [race('100')]}, respond: () => ({ok: true, date, cities, scope: 'all', racesByCity: {'3': [race('100')], '4': [race('200')]}})});
  const data = await r.api.load(date);
  assert.equal(Object.keys(data.racesByCity).length, 2);
  assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0].searchParams.has('cityId'), false);
  assert.equal(r.timers[0], 65000);
});
test('another city fetches only its scope and concurrent consumers share one request', async () => {
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  const r = runtime({state: {date, city: '3', cities, races: [race('100')]}, respond: async () => {await gate; return {ok: true, date, cities, scope: 'city', racesByCity: {'4': [race('200')]}};}});
  const first = r.api.load(date, '4'), second = r.api.load(date, '4');
  assert.equal(r.calls.length, 1); release();
  assert.equal(await first, await second);
  assert.equal(r.calls[0].searchParams.get('cityId'), '4');
  assert.equal(r.timers[0], 30000);
  await r.api.load(date, '4'); assert.equal(r.calls.length, 1);
});
test('city catalog fetch does not request horse pages', async () => {
  const r = runtime({respond: () => ({ok: true, date, cities, catalogOnly: true, scope: 'catalog', racesByCity: {}})});
  assert.equal((await r.api.catalog(date)).length, 2);
  assert.equal(r.calls[0].searchParams.get('catalog'), '1');
  await r.api.catalog(date); assert.equal(r.calls.length, 1);
});
test('main page full payload is reused for the day and all tabs', async () => {
  const r = runtime();
  r.api.remember({ok: true, date, cities, scope: 'all', racesByCity: {'3': [race('100')], '4': [race('200')]}});
  await r.api.load(date); await r.api.load(date, '3'); await r.api.load(date, '4'); await r.api.catalog(date);
  assert.equal(r.calls.length, 0);
});
test('old dates, wrong provenance and partial skeletons are rejected as local sources', async () => {
  for (const state of [
    {date: '2026-09-29', city: '3', cities, races: [race('100')]},
    {date, city: '4', cities, races: [race('100')], programDate: date, programCity: '3'},
    {date, city: '4', cities, races: [{no: 1, horses: []}]}
  ]) {
    const r = runtime({state}); await r.api.load(date, '4'); assert.equal(r.calls.length, 1);
  }
});
test('a catalog refresh invalidates old horse lists but never stores a catalog as a day', async () => {
  const r = runtime({state: {date, city: '3', cities, races: [race('100')]}, respond: url => url.searchParams.has('catalog') ? {ok: true, date, cities, catalogOnly: true, scope: 'catalog', racesByCity: {}} : {ok: true, date, cities, scope: 'city', racesByCity: {'3': [race('101')]}}});
  await r.api.load(date, '3');
  await r.api.catalog(date, {refresh: true});
  assert.equal((await r.api.load(date, '3')).racesByCity['3'][0].horses[0].id, '101');
  assert.equal(r.calls.length, 2);
});
test('failed and partially loaded responses are retryable and not cached', async () => {
  let failures = 1;
  const r = runtime({respond: () => failures-- > 0 ? {ok: true, date, cities, scope: 'all', racesByCity: {'3': [race('100')]}, audit: {failedCityCount: 1, errors: [{city: 'Bursa'}]}} : {ok: true, date, cities, scope: 'all', racesByCity: {'3': [race('100')], '4': [race('200')]}}});
  await assert.rejects(r.api.load(date), /Program eksik alındı: Bursa/);
  await r.api.load(date); assert.equal(r.calls.length, 2);
});
test('server responses must match the requested date and city', async () => {
  const wrongDate = runtime({respond: () => ({ok: true, date: '2026-09-29', cities})});
  await assert.rejects(wrongDate.api.load(date), /tarihi/);
  const wrongCity = runtime({respond: () => ({ok: true, date, cities, racesByCity: {'3': [race('100')]}})});
  await assert.rejects(wrongCity.api.load(date, '4'), /şehrin/);
});
