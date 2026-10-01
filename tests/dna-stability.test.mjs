import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const dnaSource = fs.readFileSync(new URL('../fogd-score-center-v1691f721.js', import.meta.url), 'utf8');
const degreeSource = fs.readFileSync(new URL('../degree-speed-shadow-v1691f690.js', import.meta.url), 'utf8');
const surfaceSource = fs.readFileSync(new URL('../degree-speed-surface-fix-v1691f691.js', import.meta.url), 'utf8');
const date = '2026-09-30', city = 'İstanbul';
const copy = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let release; const promise = new Promise(resolve => { release = resolve; }); return {promise, release}; }
function fixture() {
  const horses = [1, 2, 3].map(no => ({no, id: String(no), name: `AT ${no}`, last6: '333333', origin: ''}));
  const race = {no: 1, distance: 1400, track: 'Sentetik', class: 'ŞARTLI 4', horses};
  const current = {date, city: '3', cityName: city, races: [{no: 1, horses: horses.map((h, i) => ({...h, history: {degreeSamples: []}, degreeModel: {predictedSec: 90 + i}}))}]};
  return {date, city: '3', cityName: city, races: [race], analyses: {current}};
}
function runtime({state = fixture(), enrich, run, track, fetchContext, loadDegree = false, loadSurface = false, loadCore = false, calibration = []} = {}) {
  const saved = [], messages = [], elements = new Map();
  elements.set('fogdStatusF609431', {set textContent(value) {messages.push(value);}});
  elements.set('analysisRace', {value: 'all', options: [{value: 'all'}, {value: '1'}]});
  const window = {
    addEventListener() {}, dispatchEvent() {},
    AT_AI_LOCAL_ARCHIVE: {ready: () => false, saveFogdAnalysis: async value => {saved.push(copy(value)); return true;}}
  };
  if (enrich) window.ATDegreeSpeedF6090 = {enrichCurrent: () => enrich(state.analyses.current, state)};
  if (track) window.ATTrackMaintenanceV1 = {infer: track};
  const context = vm.createContext({window, state, getCityName: () => state.cityName,
    document: {readyState: 'loading', addEventListener() {}, getElementById: id => elements.get(id) || null},
    indexedDB: {open(name) {
      if (name !== 'at_ai_degree_calibration_v1') throw Error('storage unavailable');
      const q = {}; queueMicrotask(() => {q.result = {objectStoreNames: {contains: () => true}, close() {}, transaction: () => ({objectStore: () => ({getAll: () => {const request = {}; queueMicrotask(() => {request.result = copy(calibration); request.onsuccess();}); return request;}})})}; q.onsuccess();}); return q;
    }},
    URL, AbortController, structuredClone, Date, console: {info() {}, warn() {}},
    setTimeout: (fn, ms) => {const timer = setTimeout(fn, ms); if (ms >= 1000) timer.unref(); return timer;}, clearTimeout,
    save() {}, gRenderCurrentV1657() {},
    gRunCurrentV1657: run ? () => run(state) : async () => {},
    fetch: async input => {
      const url = new URL(input, 'https://test.invalid');
      const data = url.pathname.includes('fog-horse') ? await (fetchContext?.(url) || {ok: true, connections: {attempted: true}, origin: null, workout: null}) : {ok: true, races: []};
      return {ok: true, json: async () => data};
    }, location: {origin: 'https://test.invalid'}
  });
  if (loadCore) vm.runInContext(fs.readFileSync(new URL('../degree-history-core-v1746.js', import.meta.url), 'utf8'), context);
  if (loadDegree) vm.runInContext(degreeSource, context);
  if (loadSurface) vm.runInContext(surfaceSource, context);
  vm.runInContext(dnaSource, context);
  return {state, window, api: window.ATFogdScoreCenterF609431, saved, messages, elements, context};
}
const predictions = snapshot => snapshot.rows.map(({no, F, O, G, D, J, S, A, E, T, predictedSec, degreeRank, totalRank}) => ({no, F, O, G, D, J, S, A, E, T, predictedSec, degreeRank, totalRank}));

test('DNA waits for degree enrichment and cold/warm runs have identical scores and order', async () => {
  const gate = deferred(); let starts = 0;
  const r = runtime({enrich: async current => {starts++; await gate.promise; current.races[0].horses.forEach((h, i) => {h.degreeModel.predictedSec = 92 - i;});}});
  const first = r.api.compute(1); await tick();
  assert.equal(starts, 1);
  assert.equal(r.saved.length, 0, 'no provisional degree may be saved as a final prediction');
  gate.release(); await first;
  await r.api.compute(1); await r.api.compute(1);
  assert.equal(r.saved.length, 3);
  assert.deepEqual(r.saved[0].rows.map(h => h.no), [3, 2, 1]);
  assert.deepEqual(predictions(r.saved[0]), predictions(r.saved[1]));
  assert.deepEqual(predictions(r.saved[1]), predictions(r.saved[2]));
});

test('a newly published current result is not used until the full current-analysis run finishes', async () => {
  const state = fixture(), current = state.analyses.current; state.analyses.current = null;
  const gate = deferred();
  const r = runtime({state, run: async state => {state.analyses.current = current; await gate.promise; current.races[0].horses.forEach((h, i) => {h.degreeModel.predictedSec = 92 - i;});}});
  const pending = r.api.compute(1); await tick(); await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(r.saved.length, 0, 'publishing the base result does not complete its degree model');
  assert.equal(r.elements.get('analysisRace').value, '1');
  gate.release(); await pending;
  assert.equal(r.saved.length, 1);
  assert.deepEqual(r.saved[0].rows.map(h => h.no), [3, 2, 1]);
  assert.equal(r.elements.get('analysisRace').value, 'all');
});

test('degree failures stop the run instead of saving a provisional or stale final prediction', async () => {
  const r = runtime({enrich: async () => {throw Error('degree data unavailable');}});
  await r.api.compute(1);
  assert.equal(r.saved.length, 0);
  assert.match(r.messages.at(-1), /degree data unavailable/);
});

test('local degree fallbacks do not mutate the shared current result', async () => {
  const state = fixture(); delete state.analyses.current.races[0].horses[0].degreeModel;
  const original = copy(state.analyses.current);
  const r = runtime({state}); await r.api.compute(1);
  assert.equal(r.saved.length, 1);
  assert.deepEqual(state.analyses.current, original);
});

test('an in-flight DNA run rejects a changed program and never saves under the previous city', async () => {
  const gate = deferred();
  const r = runtime({enrich: async () => {await gate.promise;}});
  const pending = r.api.compute(1); await tick();
  r.state.city = '4'; r.state.cityName = 'Bursa'; gate.release(); await pending;
  assert.equal(r.saved.length, 0);
  assert.match(r.messages.at(-1), /Program.*değişti/i);
});

test('D uses the same captured track context as the completed degree model', async () => {
  let calls = 0;
  const context = {source: 'EXACT_TJK', confidence: 1, weather: {temperatureAnomaly: 0}, maintenance: {signalCount: 5}};
  const r = runtime({enrich: async current => {current.degreeSpeed = {trackContext: context};}, track: async () => {calls++; return null;}});
  await r.api.compute(1); await r.api.compute(1);
  assert.equal(r.saved.length, 2);
  assert.equal(calls, 0, 'degree and FOGD must not independently resolve different track contexts');
  assert.equal(r.saved[0].rows[0].dMeta.trackSource, 'EXACT_TJK');
  assert.deepEqual(predictions(r.saved[0]), predictions(r.saved[1]));
});

test('genuine changes to degree inputs are recalculated rather than pinning the previous order', async () => {
  const r = runtime(); await r.api.compute(1);
  r.state.analyses.current.races[0].horses.forEach((h, i) => {h.degreeModel.predictedSec = 92 - i;});
  await r.api.compute(1);
  assert.deepEqual(r.saved[0].rows.map(h => h.no), [1, 2, 3]);
  assert.deepEqual(r.saved[1].rows.map(h => h.no), [3, 2, 1]);
});

test('concurrent degree consumers share one complete enrichment and commit all races together', async () => {
  const gate = deferred(); let calls = 0;
  const state = fixture(); state.analyses.current.races[0].horses.forEach((h, i) => {h.history.degreeSamples = [{sec: 92 - i, distance: 1400}];});
  const before = copy(state.analyses.current);
  const r = runtime({state, loadDegree: true, track: async () => {calls++; await gate.promise; return null;}});
  const first = r.window.ATDegreeSpeedF6090.enrichCurrent(), second = r.window.ATDegreeSpeedF6090.enrichCurrent();
  await tick(); assert.equal(calls, 1);
  assert.deepEqual(state.analyses.current, before, 'awaiting track data must not publish half-built models');
  gate.release(); await Promise.all([first, second]);
  assert.deepEqual(state.analyses.current.races[0].horses.map(h => h.degreeModel.predictedSec), [92, 91, 90]);
});

test('base and surface enrichment complete before publication and surface runs on every repeat', async () => {
  const gate = deferred(); let calls = 0;
  const state = fixture(); state.analyses.current.races[0].horses.forEach((h, i) => {h.history.degreeSamples = [{sec: 90 + i, distance: 1400}];});
  const original = copy(state.analyses.current), r = runtime({state, loadDegree: true});
  r.window.ATDegreeSpeedSurfaceF6091 = {recalc: async options => {
    calls++; await gate.promise;
    options.result.races[0].horses.forEach((h, i) => {h.degreeModel.predictedSec = 92 - i;});
    options.result.degreeSpeed.surfaceAware = true;
  }};
  const pending = r.api.compute(1); await tick();
  assert.equal(calls, 1); assert.equal(r.saved.length, 0);
  assert.deepEqual(state.analyses.current, original);
  gate.release(); await pending; await r.api.compute(1);
  assert.equal(calls, 2);
  assert.deepEqual(r.saved[0].rows.map(h => h.no), [3, 2, 1]);
  assert.deepEqual(predictions(r.saved[0]), predictions(r.saved[1]));
});

test('the real current-run and surface wrappers produce the same completed model as DNA reruns', async () => {
  const state = fixture(); state.analyses.current.races[0].horses.forEach((h, i) => {h.history.degreeSamples = [{sec: 92 - i, distance: 1400}];});
  const r = runtime({state, loadDegree: true, loadSurface: true});
  await r.context.gRunCurrentV1657();
  assert.equal(state.analyses.current.degreeSpeed.surfaceAware, true);
  await r.api.compute(1); await r.api.compute(1);
  assert.equal(r.saved.length, 2);
  assert.deepEqual(predictions(r.saved[0]), predictions(r.saved[1]));
});

test('current-day, future and undated calibration cannot change a historical race prediction', async () => {
  const state = fixture(); state.analyses.current.races[0].horses.forEach(h => {h.history.degreeSamples = [{sec: 90, distance: 1400}];});
  const samples = stamp => Array.from({length: 16}, () => ({date: stamp, city, trackContext: {surface: 'Sentetik'}, timeErrorSec: 3}));
  const r = runtime({state, loadDegree: true, calibration: [...samples(date), ...samples('2026-10-01'), ...samples(null)]});
  await r.window.ATDegreeSpeedF6090.enrichCurrent();
  assert.equal(state.analyses.current.races[0].horses[0].degreeModel.predictedSec, 90);
  assert.equal(state.analyses.current.races[0].horses[0].degreeModel.autoCalibration.samples, 0);
  const past = runtime({state: copy(state), loadDegree: true, calibration: samples('2026-09-29')});
  await past.window.ATDegreeSpeedF6090.enrichCurrent();
  assert.equal(past.state.analyses.current.races[0].horses[0].degreeModel.predictedSec, 90.4);
});

test('surface correction retains calibration exactly once across repeated calculations', async () => {
  const state=fixture(),r=runtime({state,loadDegree:true,loadSurface:true});
  state.analyses.current.races[0].horses.forEach((h,i)=>{h.degreeModel={predictedSec:93+i,horseResidual:i,autoCalibration:{active:true,seconds:2},fallback:false};});
  const options={result:state.analyses.current,programRaces:state.races,resultRows:[{date:'2026-09-01',city,race:{distance:1400,track:'Sentetik',class:'ŞARTLI 4',winner:{degree:'1.30.00'}}}],trackContext:null,city,date,deferPublish:true};
  await r.window.ATDegreeSpeedSurfaceF6091.recalc(options);
  assert.deepEqual(state.analyses.current.races[0].horses.map(h=>h.degreeModel.predictedSec),[92,93,94]);
  assert.deepEqual(state.analyses.current.races[0].horses.map(h=>h.degreeModel.uncalibratedSec),[90,91,92]);
  await r.window.ATDegreeSpeedSurfaceF6091.recalc(options);
  assert.deepEqual(state.analyses.current.races[0].horses.map(h=>h.degreeModel.predictedSec),[92,93,94]);
});

test('surface correction cannot turn a missing residual into a fabricated zero residual',async()=>{
  const state=fixture(),r=runtime({state,loadDegree:true,loadSurface:true});
  state.analyses.current.races[0].horses[0].degreeModel={predictedSec:97,horseResidual:null};
  await r.window.ATDegreeSpeedSurfaceF6091.recalc({result:state.analyses.current,programRaces:state.races,resultRows:[{date:'2026-09-01',city,race:{distance:1400,track:'Sentetik',class:'ŞARTLI 4',winner:{degree:'1.30.00'}}}],trackContext:null,city,date,deferPublish:true});
  assert.equal(state.analyses.current.races[0].horses[0].degreeModel.predictedSec,97);
});

test('first DNA analysis retries temporary workout failures before saving', async () => {
  const attempts = new Map();
  const r = runtime({fetchContext: async url => {
    const name=url.searchParams.get('horse'), n=(attempts.get(name)||0)+1;attempts.set(name,n);
    return {ok:true,connections:{attempted:true},errors:{workout:n<3?'temporary timeout':null},workout:n<3?{workouts:[]}:{workouts:[{date:'2026-09-27',splits:{600:43.6},daysBeforeRace:3}],latest:{date:'2026-09-27',splits:{600:43.6},daysBeforeRace:3},bestByDistance:{600:43.6}}};
  }});
  await r.api.compute(1);
  assert.equal(r.saved.length,1);
  assert.ok(r.saved[0].rows.every(x=>x.gMeta.latest.date==='2026-09-27'));
  assert.ok([...attempts.values()].every(x=>x===3));
});

test('exhausted workout failures do not save a final DNA analysis', async () => {
  const r=runtime({fetchContext:async()=>({ok:true,connections:{attempted:true},errors:{workout:'timeout'},workout:{workouts:[]}})});
  await r.api.compute(1);
  assert.equal(r.saved.length,0);
  assert.ok(r.messages.some(x=>x.includes('Galop alınamadı')));
});

test('successful empty workout response is accepted without invented data', async () => {
  let calls=0;
  const r=runtime({fetchContext:async()=>{calls++;return {ok:true,connections:{attempted:true},errors:{workout:null},workout:{workouts:[],latest:null}};}});
  await r.api.compute(1);
  assert.equal(calls,3);assert.equal(r.saved.length,1);
  assert.ok(r.saved[0].rows.every(x=>x.G===null&&x.gMeta.status==='empty'));
});

test('fresh workout cannot be overwritten by older local archive', () => {
  const r=runtime();
  const result=vm.runInContext(`(()=>{${dnaSource.slice(dnaSource.indexOf('function workoutHasRows'),dnaSource.indexOf('async function requestHorseContext'))}return mergeLocalContext({workout:{workouts:[{}],latest:{date:'2026-09-26'}}},{data:{workout:{workouts:[{}],latest:{date:'2026-08-30'}}}},null)})()`,r.context);
  assert.equal(result.workout.latest.date,'2026-09-26');
});


test('normalized engine and DNA keep missing personal history unranked across repeated runs', async()=>{
 const state=fixture();state.analyses.current.races[0].horses.forEach((h,i)=>{h.history.degreeSamples=i===0?[]:[{date:'2026-09-10',city,distance:1400,track:'Sentetik',sec:92-i}];});
 const r=runtime({state,loadCore:true,loadDegree:true,loadSurface:true});
 await r.api.compute(1);await r.api.compute(1);
 assert.equal(r.saved.length,2);assert.deepEqual(predictions(r.saved[0]),predictions(r.saved[1]));
 const empty=r.saved[0].rows.find(h=>h.no===1);assert.equal(empty.D,null);assert.equal(empty.predictedSec,null);assert.equal(empty.degreeRank,undefined);assert.equal(empty.dMeta.model.referenceOnly,true);
 assert.ok(r.saved[0].rows.filter(h=>h.no!==1).every(h=>h.dMeta.model.version==='DEGREE-HISTORY-CORE-V17.4.6'));
});

test('normalized enrichment retries workout failure and includes only historical workout comparisons',async()=>{
 const state=fixture();state.analyses.current.races[0].horses.forEach(h=>{h.history.degreeSamples=[{date:'2026-09-10',city,distance:1400,track:'Sentetik',sec:92}];});let count=0;
 const r=runtime({state,loadCore:true,loadDegree:true,fetchContext:async()=>{count++;return{ok:true,connections:{attempted:true},errors:{workout:count===1?'temporary':null},workout:{workouts:[{date:'2026-09-05',city,track:'Sentetik',type:'Galop',splits:{600:42}},{date:'2026-09-25',city,track:'Sentetik',type:'Galop',splits:{600:41}}]}}}});
 await r.api.compute(1);assert.equal(r.saved.length,1);assert.ok(count>=4);assert.ok(r.saved[0].rows.every(h=>h.dMeta.model.workoutDevelopment.fraction>0));
});


test('later local archive workouts cannot leak into historical G or D inputs',()=>{
 const r=runtime();const safe=vm.runInContext(`(()=>{${dnaSource.slice(dnaSource.indexOf('function beforeRaceContext'),dnaSource.indexOf('async function horseContext'))}return beforeRaceContext({workout:{workouts:[{date:'2026-09-25',splits:{600:42}},{date:'2026-10-01',splits:{600:30}}],latest:{date:'2026-10-01',splits:{600:30}},bestByDistance:{600:30}}},'2026-10-01')})()`,r.context);
 assert.equal(safe.workout.latest.date,'2026-09-25');assert.equal(safe.workout.bestByDistance[600],42);assert.equal(safe.workout.archiveWorkouts.length,1);
});

test('degree enrichment never waits on network workout requests from any race',async()=>{
 const state=fixture();const other=copy(state.races[0]);other.no=2;other.horses=other.horses.map(h=>({...h,no:h.no,name:'OTHER '+h.name,id:'OTHER'+h.id}));state.races.push(other);state.analyses.current.races.push({no:2,horses:other.horses.map(h=>({...h,history:{degreeSamples:[]}}))});
 const requests=[];const r=runtime({state,loadCore:true,loadDegree:true,fetchContext:async url=>{requests.push(url.searchParams.get('horse'));return{ok:true,connections:{attempted:true},workout:null}}});
 let calls=0;r.api.horseContext=async()=>{calls++;return new Promise(()=>{})};
 await Promise.race([r.window.ATDegreeSpeedF6090.enrichCurrent(),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('degree must not await workouts')),500);timer.unref()})]);
 assert.equal(calls,0);assert.equal(requests.length,0);
 await r.api.compute(1);assert.equal(r.saved.length,1);assert.equal(requests.length,3);assert.ok(requests.every(name=>!name.startsWith('OTHER')));
});


test('background parser provenance refresh does not cancel the same race', async () => {
  const gate=deferred(),r=runtime({enrich:async()=>{await gate.promise;}});
  r.state.races[0].source='TJK HTML TABLE LOCK';
  const pending=r.api.compute(1);await tick();
  r.state.races[0].source='TJK bağımsız tablo parserı';r.state.races[0].foreignFallbackUsed=false;
  gate.release();await pending;assert.equal(r.saved.length,1);
});

for(const change of ['weight','horseId','distance'])test(`an in-flight ${change} change still cancels DNA`,async()=>{
  const gate=deferred(),r=runtime({enrich:async()=>{await gate.promise;}});
  const pending=r.api.compute(1);await tick();
  if(change==='distance')r.state.races[0].distance=1500;
  else if(change==='weight')r.state.races[0].horses[0].weight=58;
  else r.state.races[0].horses[0].id='another-horse';
  gate.release();await pending;assert.equal(r.saved.length,0);assert.match(r.messages.at(-1),/Program.*değişti/i);
});
