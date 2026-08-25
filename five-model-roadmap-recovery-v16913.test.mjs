import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./five-model-roadmap-recovery-v16913.js', import.meta.url), 'utf8');
const build = fs.readFileSync(new URL('./build-runtime-v16913.cjs', import.meta.url), 'utf8');
const bundle = fs.readFileSync(new URL('./public/at-ai-app-v142.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./public/index.html', import.meta.url), 'utf8');

assert.match(source, /FIVE-MODEL-ROADMAP-RECOVERY-V16\.9\.13/);
assert.match(source, /targetYear\(\) - 10/);
assert.match(source, /targetYear\(\) - 5/);
assert.match(source, /PRIMARY_TIMEOUT_MS = 170000/);
assert.match(build, /roadmapOk===true/);
assert.match(build, /roadmapOk === true/);
assert.match(build, /value\?\.data\?\.roadmapOk !== true/);
assert.match(bundle, /FIVE-MODEL-ROADMAP-RECOVERY-V16\.9\.13/);
assert.match(bundle, /function valid\(d\)\{return !!d && d\?\.roadmapOk===true/);
assert.match(bundle, /function validModel\(d\)\{return!!d&&d\?\.roadmapOk===true/);
assert.doesNotMatch(bundle, /function valid\(d\)\{return !!d && Number\(d\?\.no\)>0/);
assert.match(html, /at-ai-app-v142\.js\?v=169130/);

const calls = [];
const window = {state:{date:'2026-08-23'}};
const context = vm.createContext({
  window,
  console:{info(){}},
  Date,
  Number,
  String,
  Math,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch:async()=>{throw new Error('test fetch kullanılmamalı');},
  getCityName:()=> 'İzmir',
  programRaceMeta:race => ({
    ok:true,
    class:race.class,
    ageGroup:race.ageGroup,
    track:race.track,
    distance:race.distance
  }),
  fetchModelRoadmapV11:async()=>({ok:false}),
  atAiFetchJsonV1111:async (url, timeoutMs, label) => {
    calls.push({url,timeoutMs,label});
    return {ok:true,models:{EXACT:[{}],CONDITION_TWIN:[],RACE_FAMILY:[{}]},counts:{EXACT:1,CONDITION_TWIN:0,RACE_FAMILY:1}};
  }
});
window.window = window;
vm.runInContext(source, context);

const yamak = {no:4,class:'ŞARTLI 5/Y2',ageGroup:'3 ve Yukarı İngilizler',track:'Kum',distance:'1400'};
const normal = {no:1,class:'ŞARTLI 5/DHÖW',ageGroup:'4 ve Yukarı Araplar',track:'Kum',distance:'1400'};
const yamakResult = await context.fetchModelRoadmapV11(yamak);
const normalResult = await context.fetchModelRoadmapV11(normal);

assert.equal(new URL(calls[0].url, 'https://test.local').searchParams.get('minYear'), '2016');
assert.equal(calls[0].timeoutMs, 170000);
assert.equal(yamakResult.requestWindowV16913.yamak, true);
assert.equal(yamakResult.requestWindowV16913.fallback, false);
assert.equal(new URL(calls[1].url, 'https://test.local').searchParams.get('minYear'), '2000');
assert.equal(normalResult.requestWindowV16913.yamak, false);

const fallbackCalls = [];
context.atAiFetchJsonV1111 = async (url, timeoutMs) => {
  fallbackCalls.push({url,timeoutMs});
  if (fallbackCalls.length === 1) throw new Error('ana tarama timeout');
  return {ok:true,models:{EXACT:[{}],CONDITION_TWIN:[],RACE_FAMILY:[]},counts:{EXACT:1,CONDITION_TWIN:0,RACE_FAMILY:0}};
};
const fallbackResult = await context.fetchModelRoadmapV11(yamak);
assert.equal(fallbackCalls.length, 2);
assert.equal(new URL(fallbackCalls[0].url, 'https://test.local').searchParams.get('minYear'), '2016');
assert.equal(new URL(fallbackCalls[1].url, 'https://test.local').searchParams.get('minYear'), '2021');
assert.equal(fallbackResult.requestWindowV16913.fallback, true);
assert.equal(fallbackResult.ok, true);

console.log('V16.9.13 tarihsel veri kurtarma ve başarısız cache testi geçti.');
