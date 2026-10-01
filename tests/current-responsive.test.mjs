import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
function careerRuntime(base){const durations=[];const c=vm.createContext({window:{},fetchCareer:base,structuredClone,Date,console:{info(){},warn(){}},setTimeout(fn,ms){durations.push(ms);return setTimeout(fn,ms===45000?90:1)},clearTimeout});vm.runInContext(source('career-fetch-timeout-retry-v1691f660.js'),c);return{c,durations};}
test('career allows a response after the old 15s deadline, deduplicates requests and isolates cached copies',async()=>{
 let calls=0;const{c,durations}=careerRuntime(async()=>{calls++;await new Promise(r=>setTimeout(r,30));return{ok:true,history:[{date:'2026-09-01'}]}});
 const [a,b]=await Promise.all([c.fetchCareer('12','2026-10-01'),c.fetchCareer('12','2026-10-01')]);assert.equal(calls,1);assert.deepEqual(durations,[45000]);a.history.length=0;assert.equal(b.history.length,1);assert.equal((await c.fetchCareer('12','2026-10-01')).history.length,1);await c.fetchCareer('12','2026-09-30');assert.equal(calls,2);
});
test('transient career failures retry once and exhausted errors are never cached',async()=>{
 let calls=0;const{c}=careerRuntime(async()=>{calls++;return{ok:false,error:'API 503'}});
 assert.equal((await c.fetchCareer('12','2026-10-01')).ok,false);assert.equal(calls,2);await c.fetchCareer('12','2026-10-01');assert.equal(calls,4);
});
test('hanging career task has a bounded retry and explicit failure',async()=>{
 let calls=0;const{c}=careerRuntime(()=>{calls++;return new Promise(()=>{})});const out=await c.fetchCareer('12','2026-10-01');assert.equal(calls,2);assert.equal(out.ok,false);assert.equal(out.fetchGuardTimedOut,true);
});
function transport(fetch){const window={fetch};const c=vm.createContext({window,location:{href:'https://test.invalid/',origin:'https://test.invalid'},URL,URLSearchParams,Request,Response,Headers,AbortController,DOMException,Date,console:{info(){},warn(){}},document:{querySelector(){return null}},setTimeout:(fn,ms)=>setTimeout(fn,ms===43000?35:ms),clearTimeout});vm.runInContext(source('performance-safe-v1691f661.js'),c);return window;}
test('career transport aborts even when headers arrive but body hangs',async()=>{
 const w=transport(async(input,init)=>({status:200,statusText:'OK',headers:new Headers(),text:()=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}))}));await assert.rejects(w.fetch('/api/tjk-career?horseId=12&before=2026-10-01&t=123'),/timeout/);
});
test('career transport preserves before cutoff, caller cancellation and omits only t',async()=>{
 let url;const w=transport(async(input,init)=>{url=new URL(input);if(init.signal.aborted)throw init.signal.reason;return new Response(JSON.stringify({ok:true}))});assert.equal((await (await w.fetch('/api/tjk-career?horseId=12&before=2026-10-01&t=123')).json()).ok,true);assert.equal(url.searchParams.get('before'),'2026-10-01');assert.equal(url.searchParams.get('horseId'),'12');assert.equal(url.searchParams.has('t'),false);
 const abort=new AbortController();abort.abort(new Error('caller cancelled'));await assert.rejects(w.fetch('/api/tjk-career?horseId=12',{signal:abort.signal}),/caller cancelled/);
});
