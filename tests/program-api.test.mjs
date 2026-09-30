import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/tjk-program.js';
const date = '2026-09-30';
const root = '<html>' + Array.from({length: 7}, (_, i) => '<a href="/TR/YarisSever/Info/Sehir/GunlukYarisProgrami?SehirId=' + (i + 1) + '&amp;SehirAdi=City' + (i + 1) + '">City' + (i + 1) + '</a>').join('') + '</html>';
async function run(query, fetcher) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  const res = {code: 200, setHeader() {}, status(code) {this.code = code; return this;}, json(body) {this.body = body; return this;}};
  try {await handler({method: 'GET', query: {date, ...query}}, res); return res;} finally {globalThis.fetch = original;}
}
test('catalog reads only the root page and preserves all city choices', async () => {
  const calls = [];
  const res = await run({catalog: '1'}, async input => {calls.push(new URL(input)); return new Response(root);});
  assert.equal(res.code, 200); assert.equal(res.body.catalogOnly, true);
  assert.equal(res.body.cities.length, 7); assert.equal(calls.length, 1);
  assert.deepEqual(res.body.racesByCity, {});
});
test('selected city fetches only the root and that city and labels its scope', async () => {
  const calls = [];
  const res = await run({cityId: '3'}, async input => {const url = new URL(input); calls.push(url); return new Response(url.searchParams.has('SehirId') ? '<html></html>' : root);});
  assert.equal(res.code, 200); assert.equal(calls.length, 2);
  assert.equal(calls[1].searchParams.get('SehirId'), '3');
  assert.equal(res.body.scope, 'city'); assert.equal(res.body.cities.length, 7);
  assert.deepEqual(res.body.loadedCityIds, ['3']); assert.deepEqual(Object.keys(res.body.racesByCity), ['3']);
});
test('whole-day requests use at most three city workers and preserve city order', async () => {
  let active = 0, maximum = 0, cityCalls = 0;
  const res = await run({}, async input => {
    if (!new URL(input).searchParams.has('SehirId')) return new Response(root);
    active++; cityCalls++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 15)); active--;
    return new Response('<html></html>');
  });
  assert.equal(res.code, 200); assert.equal(maximum, 3); assert.equal(cityCalls, 7);
  assert.equal(res.body.scope, 'all');
  assert.deepEqual(res.body.loadedCityIds, ['1', '2', '3', '4', '5', '6', '7']);
  assert.deepEqual(res.body.programs, res.body.racesByCity);
});
test('missing city upstream data is an error for scoped loads and explicit partial data for the day', async () => {
  const fetcher = async input => {
    const url = new URL(input);
    if (!url.searchParams.has('SehirId')) return new Response(root);
    return new Response('<html></html>', {status: url.searchParams.get('SehirId') === '3' ? 503 : 200});
  };
  const selected = await run({cityId: '3'}, fetcher);
  assert.equal(selected.code, 502); assert.equal(selected.body.ok, false);
  const all = await run({}, fetcher);
  assert.equal(all.body.audit.failedCityCount, 1);
  assert.equal(all.body.audit.errors[0].cityId, '3');
  assert.equal(Object.hasOwn(all.body.racesByCity, '3'), false);
  assert.equal(all.body.cities.length, 7);
});
test('invalid or unavailable city IDs never fetch arbitrary upstream city pages', async () => {
  let calls = 0;
  const fetcher = async () => {calls++; return new Response(root);};
  assert.equal((await run({cityId: '../42'}, fetcher)).code, 400); assert.equal(calls, 0);
  assert.equal((await run({cityId: '99'}, fetcher)).code, 404); assert.equal(calls, 1);
});
