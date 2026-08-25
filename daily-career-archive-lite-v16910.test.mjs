import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./daily-career-archive-lite-v16910.js', import.meta.url), 'utf8');
function section(name) {
  const start = `/* V16910:BEGIN ${name} */`;
  const end = `/* V16910:END ${name} */`;
  const from = source.indexOf(start), to = source.indexOf(end);
  assert.ok(from >= 0 && to > from, `${name} bölümü bulunmalı`);
  return source.slice(from + start.length, to).trim();
}

const keys = [
  ...Array.from({length:7}, (_,i) => `race|2026-08-23|35|${i + 1}`),
  ...Array.from({length:7}, (_,i) => `model|2026-08-23|35|${i + 1}`)
];
let keyCursorCalls = 0;
let valueCursorCalls = 0;
let tx;
const index = {
  openKeyCursor() {
    keyCursorCalls++;
    const req = {};
    let position = 0;
    const dispatch = () => {
      if (position >= keys.length) {
        req.result = null;
        req.onsuccess?.();
        queueMicrotask(() => tx.oncomplete?.());
        return;
      }
      req.result = {
        primaryKey:keys[position],
        get value() { throw new Error('Hafif liste tam IndexedDB değerini okumamalı'); },
        continue() { position++; queueMicrotask(dispatch); }
      };
      req.onsuccess?.();
    };
    queueMicrotask(dispatch);
    return req;
  },
  openCursor() { valueCursorCalls++; throw new Error('openCursor kullanılmamalı'); }
};
const db = {
  transaction() {
    tx = { objectStore:() => ({ index:() => index }) };
    return tx;
  }
};
const context = vm.createContext({
  cleanA:value => String(value ?? '').trim(),
  openArchiveDbA:async () => db,
  STORE:'entries',
  IDBKeyRange:{ only:value => value },
  state:{ city:'35' },
  currentCityNameA:() => 'İzmir',
  $a:() => null,
  requestAnimationFrame:callback => callback(),
  setTimeout,
  Promise,
  String
});
vm.runInContext(section('core'), context);

const rows = await context.listDateKeysA('2026-08-23', 'race');
assert.equal(rows.length, 7, 'yalnız yedi yarış özeti dönmeli');
assert.deepEqual(
  JSON.parse(JSON.stringify(rows[6])),
  { key:'race|2026-08-23|35|7', kind:'race', date:'2026-08-23', city:'35', raceNo:'7' }
);
assert.equal(keyCursorCalls, 1, 'tek anahtar imleci kullanılmalı');
assert.equal(valueCursorCalls, 0, 'tam değer imleci hiç kullanılmamalı');

for (const name of ['updateArchiveToolbarA','renderArchiveDialogA']) {
  assert.ok(!section(name).includes('listDateA('), `${name} tam kayıt taraması yapmamalı`);
}
const openSource = section('openArchiveDialogA');
assert.ok(openSource.indexOf('showModal()') < openSource.indexOf('renderArchiveDialogA()'), 'pencere ağır işten önce açılmalı');

console.log('V16.9.10 Günlük Arşiv hafif liste testi geçti.');
