import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./five-model-main-thread-yield-v16912.js', import.meta.url), 'utf8');
const build = fs.readFileSync(new URL('./build-runtime-v16912.cjs', import.meta.url), 'utf8');

assert.match(build, /yieldFiveModelV16912/);
assert.match(build, /new Promise\(resolve=>setTimeout\(resolve,0\)\)/);
assert.match(build, /for\(const finish of \[1,2,3\]\)/);
assert.match(build, /scoreFinishRowsPodiumV115\(career/);
assert.match(build, /function persisted\(k\)\{return null;\}/);
assert.match(build, /function schedulePersist\(k,d\)\{return false;\}/);
assert.match(build, /JSON\.parse\(sessionStorage\.getItem\(storageKey\(k\)\)/);
assert.match(source, /pointerdown/);
assert.match(source, /data-fmr-background-v1697/);
assert.match(source, /sessionStorage\.key\(index\)/);
assert.doesNotMatch(source, /sessionStorage\.getItem/);

const calls = [];
const horseCount = 16;
const stepsPerHorse = 16;
for (let horse = 0; horse < horseCount; horse++) {
  for (let step = 0; step < stepsPerHorse; step++) calls.push([horse, step]);
}
assert.equal(calls.length, 256, '16 at için 256 küçük puanlama/yield adımı oluşmalı');

const listeners = new Map();
const dialog = {
  open:true,
  closed:false,
  close(){ this.open=false; this.closed=true; }
};
const progressNodes = {
  percent:{textContent:''},
  fill:{style:{width:''}},
  phase:{textContent:''}
};
const progressHost = {
  querySelector(selector) {
    if (selector === '.fmr-progress-percent-v1697') return progressNodes.percent;
    if (selector === '.fmr-progress-fill-v1697') return progressNodes.fill;
    if (selector === '.fmr-progress-phase-v1697') return progressNodes.phase;
    return null;
  }
};
const document = {
  addEventListener(type, handler) {
    const group = listeners.get(type) || [];
    group.push(handler);
    listeners.set(type, group);
  },
  dispatchEvent(event) {
    for (const handler of listeners.get(event.type) || []) handler(event);
    return true;
  },
  getElementById(id) { return id === 'analysisDialog' ? dialog : null; },
  querySelector(selector) { return selector === '.fmr-progress-v1697' ? progressHost : null; }
};
let repairCalls = 0;
const sessionKeys = [
  'at_ai_five_model_compact_v1699:izmir|7',
  'at_ai_five_model_compact_index_v1699',
  'unrelated'
];
const sessionStorage = {
  get length(){ return sessionKeys.length; },
  key(index){ return sessionKeys[index] ?? null; },
  removeItem(key){
    const index = sessionKeys.indexOf(key);
    if (index >= 0) sessionKeys.splice(index, 1);
  },
  getItem(){ throw new Error('V16.9.12 eski sessionStorage değerini okumamalı'); }
};
class CustomEvent {
  constructor(type, init={}) { this.type=type; this.detail=init.detail; }
}
const timer = (handler, delay=0) => delay >= 900 ? 0 : setTimeout(handler, delay);
const context = {
  window:{ATFiveModelRepairV1697:{repair(){ repairCalls++; }}},
  document,
  sessionStorage,
  CustomEvent,
  setTimeout:timer,
  console:{info(){}}
};
context.window.window = context.window;
vm.runInNewContext(source, context);

function backgroundEvent() {
  return {
    type:'pointerdown',
    target:{closest:selector => selector === '[data-fmr-background-v1697]' ? {} : null},
    prevented:false,
    stopped:false,
    preventDefault(){ this.prevented=true; },
    stopPropagation(){ this.stopped=true; }
  };
}
const directEvent = backgroundEvent();
document.dispatchEvent(directEvent);
assert.equal(dialog.closed, true);
assert.equal(directEvent.prevented, true);
assert.equal(directEvent.stopped, true);
assert.equal(repairCalls, 1);

await context.window.ATFiveModelMainThreadYieldV16912.clearLegacySessionWithoutReading();
assert.deepEqual(sessionKeys, ['unrelated']);
assert.equal(context.window.ATFiveModelMainThreadYieldV16912.stats().legacyKeysRemoved, 2);

const bundle = fs.readFileSync(new URL('./public/at-ai-app-v142.js', import.meta.url), 'utf8');
const prepareMatch = bundle.match(/function notifyFiveModelChunkV16912[\s\S]*?\nfunction scoreObjectForModelV11/);
assert.ok(prepareMatch, 'Üretilmiş pakette parçalı prepareRaceModelsV11 bulunmalı');
const prepareSource = prepareMatch[0].replace(/\nfunction scoreObjectForModelV11$/, '');

let chunkCount = 0;
let scoringChunkCount = 0;
let backgroundScheduled = false;
let backgroundHandledBeforeDone = false;
let runSettled = false;
dialog.open = true;
dialog.closed = false;
document.addEventListener('at-five-model-chunk-v16912', event => {
  chunkCount++;
  if (event.detail?.phase !== 'scoring') return;
  scoringChunkCount++;
  if (backgroundScheduled) return;
  backgroundScheduled = true;
  setTimeout(() => {
    document.dispatchEvent(backgroundEvent());
    backgroundHandledBeforeDone = !runSettled;
  }, 0);
});

const score = () => {
  const until = Date.now() + 1;
  while (Date.now() < until) {}
  return {score:50};
};
Object.assign(context, {
  fetchModelRoadmapV11:async () => ({
    ok:true,
    models:{EXACT:[{}],CONDITION_TWIN:[{}],RACE_FAMILY:[{}]},
    counts:{}
  }),
  mapLimitV11:async (items, _limit, worker) => Promise.all(items.map(worker)),
  loadCareerForHorseV11:async () => ({ok:true,roadmap:[{}],analysisMode:'NORMAL'}),
  uniqueHistoricalRacesV11:() => [{}],
  scoreRowsV11:score,
  compositeScoreV11:parts => ({score:50,present:Object.keys(parts),missing:[]}),
  scoreFinishRowsPodiumV115:score,
  weightedCompositePodiumV115:() => ({score:50}),
  modePodiumV115:() => 'NORMAL',
  analysisModeV11:() => 'NORMAL',
  PODIUM_SIMILARITY_V115:'test'
});
vm.runInNewContext(prepareSource, context);
const race = {no:7,horses:Array.from({length:16},(_,index)=>({name:'At '+(index+1)}))};
const run = context.prepareRaceModelsV11(race);
run.then(() => { runSettled=true; });
const result = await run;
await new Promise(resolve => setTimeout(resolve, 5));

assert.equal(result.horses.length, 16);
assert.equal(scoringChunkCount, 256);
assert.equal(chunkCount, 257, 'ağ aşamasıyla birlikte toplam 257 ilerleme olayı beklenir');
assert.equal(dialog.closed, true);
assert.equal(backgroundHandledBeforeDone, true, 'arka plan dokunuşu tüm hesap bitmeden işlenmeli');

console.log('V16.9.12 5 Model ana iş parçacığı yield testi geçti.');
