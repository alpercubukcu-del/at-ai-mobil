import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./five-model-archive-compact-v16911.js', import.meta.url), 'utf8');
const storage = new Map();
const deleted = [];
let getCalls = 0;
let tx;
const db = {
  objectStoreNames:{ contains:() => true },
  transaction() {
    tx = {
      objectStore:() => ({
        delete(key) { deleted.push(key); },
        get() { getCalls++; throw new Error('Eski ham kayıt okunmamalı'); }
      })
    };
    queueMicrotask(() => tx.oncomplete?.());
    return tx;
  }
};
const indexedDB = {
  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = db;
      request.onsuccess?.();
    });
    return request;
  }
};
const localStorage = {
  getItem:key => storage.get(key) ?? null,
  setItem:(key,value) => storage.set(key,String(value)),
  removeItem:key => storage.delete(key)
};
const window = { indexedDB };
const context = vm.createContext({
  window, indexedDB, localStorage, console,
  Map, Promise, String, Number, Array, Object, Boolean,
  queueMicrotask
});
vm.runInContext(source, context);
const api = window.ATFiveModelArchiveCompactV16911;

const hugeHistory = 'x'.repeat(2_000_000);
const raw = {
  key:'model|2026-08-23|35|7', kind:'model', data:{
    no:7,
    rawHistory:hugeHistory,
    horses:[{
      horse:{id:'1',no:1,name:'TEST',rawHistory:hugeHistory},
      careerOk:true,
      scores:{ composite:{score:81,rawHistory:hugeHistory}, exact:{score:70} }
    }]
  }
};
const compact = api.prepareRecord(raw);
assert.equal(compact.compactArchiveV16911, true);
assert.equal(compact.data.horses[0].scores.composite.score, 81);
assert.equal(compact.data.rawHistory, undefined, 'ham geçmiş kompakt arşive girmemeli');
assert.equal(compact.data.horses[0].horse.rawHistory, undefined, 'ham at geçmişi kompakt arşive girmemeli');
assert.ok(JSON.stringify(compact).length < 10_000, 'kompakt kayıt küçük kalmalı');

assert.equal(api.canRead(raw.key), false, 'işaretsiz eski kayıt okunmamalı');
assert.equal(await api.discardLegacy(raw.key), true, 'eski kayıt anahtar üzerinden silinmeli');
assert.deepEqual(deleted, [raw.key]);
assert.equal(getCalls, 0, 'silme sırasında IndexedDB get çağrısı yapılmamalı');

api.mark(raw.key);
assert.equal(api.canRead(raw.key), true, 'yalnız yeni kompakt kayıt okunabilir olmalı');
api.forget(raw.key);
assert.equal(api.canRead(raw.key), false);

const build = fs.readFileSync(new URL('./build-runtime-v16911.cjs', import.meta.url), 'utf8');
assert.ok(build.includes('compactApi?.discardLegacy?.(key)'), 'okuyucu eski kaydı get öncesi atmalı');
assert.ok(build.indexOf('compactApi?.discardLegacy?.(key)') < build.indexOf("objectStore(STORE).get(key)"), 'silme koruması get çağrısından önce olmalı');
assert.ok(build.includes("compactApi?.prepareRecord?.(value)"), 'yeni model kaydı yazılmadan önce kompaktlaşmalı');
assert.ok(!build.includes("fingerprint === raceFingerprint(race)"), 'kayıt kullanıcı temizleyene kadar program parmak iziyle geçersizleşmemeli');
assert.ok(source.includes('persistentUntilClear:true'), 'kalıcı sonuç davranışı API üzerinde görünür olmalı');
assert.ok(source.includes('hasRace'), 'başlık seçili koşunun kayıtlı sonucunu hafif işaretten okuyabilmeli');
assert.ok(build.includes('hasRace?.(selected)'), 'Kariyer başlığı kayıtlı sonucu yeniden hesaplamadan göstermeli');
assert.ok(build.includes('Kayıtlı · açmak için dokunun'), 'başlık kayıtlı sonucu açıkça belirtmeli');
assert.ok(!source.includes('box.open = true'), 'kayıtlı sonuç paneli kullanıcı istemeden genişlememeli');

console.log('V16.9.11 kompakt 5 Model arşiv onarım testi geçti.');
