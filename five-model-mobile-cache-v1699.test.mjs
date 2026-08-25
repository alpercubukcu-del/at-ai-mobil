import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./five-model-shared-cache-v1685.js', import.meta.url), 'utf8');
const legacyKey = 'at_ai_five_model_compact_v1687';
const storage = new Map([[legacyKey, JSON.stringify({ huge:'x'.repeat(2_000_000) })]]);
const gets = [];
const removes = [];
const idle = [];
const model = { no:7, horses:[{ horse:{ no:1, id:'1', name:'TEST' }, scores:{} }] };

const sessionStorage = {
  get length(){ return storage.size; },
  key(i){ return [...storage.keys()][i] ?? null; },
  getItem(k){ gets.push(k); return storage.get(k) ?? null; },
  setItem(k,v){ storage.set(k,String(v)); },
  removeItem(k){ removes.push(k); storage.delete(k); }
};
const document = {
  getElementById(id){
    if(id==='raceDate')return{value:'2026-08-23'};
    if(id==='citySelect')return{value:'35'};
    return null;
  },
  querySelector(){ return { textContent:'İzmir' }; },
  addEventListener(){}
};
const window = {
  state:{ date:'2026-08-23', races:[{no:7}], analyses:{} },
  manualTicketV117:{ raceDataMap:new Map([[7,model]]) },
  addEventListener(){},
  requestIdleCallback(fn){ idle.push(fn); }
};
const context = vm.createContext({
  window, document, sessionStorage,
  requestIdleCallback:window.requestIdleCallback,
  setTimeout, clearTimeout, console,
  getCityName:()=> 'İzmir',
  prepareRaceModelsV11:async()=>model,
  Map, Set, Promise, JSON, Date, Number, String, Array, Object, Math
});

vm.runInContext(source, context);
assert.ok(removes.includes(legacyKey), 'eski büyük paket okunmadan silinmeli');
assert.ok(!gets.includes(legacyKey), 'eski büyük paket getItem ile ana iş parçacığına alınmamalı');

const api = window.ATFiveModelSharedCacheV1685;
assert.equal(api.get(7), model, 'yalnız istenen koşunun açık oturum sonucu dönmeli');
assert.ok(!gets.includes(legacyKey), 'get çağrısı eski paketi ayrıştırmamalı');
assert.equal(idle.length, 1, 'kalıcı yazma arayüzden sonra idle kuyruğuna bırakılmalı');

idle.shift()();
const perRaceKey = [...storage.keys()].find(k=>k.startsWith('at_ai_five_model_compact_v1699:'));
assert.ok(perRaceKey, 'koşu-bazlı küçük kayıt yazılmalı');
assert.ok(!storage.has(legacyKey), 'eski tek-parça kayıt yeniden oluşmamalı');
assert.equal(api.stats().perRaceStorage, true);

console.log('V16.9.9 mobil cache testi geçti.');
