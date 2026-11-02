import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../annual-results-archive-v1691f661.js',import.meta.url),'utf8');
const hook=source.slice(source.indexOf('const upstreamFetch='),source.indexOf('\nfunction installHooks()'));
function run(rec){let calls=0;const window={fetch:async()=>{calls++;return new Response(JSON.stringify({ok:true,top3:[{finish:1,horseId:'999',horseName:'ŞUBAR'}]}))}};vm.runInNewContext(hook,{window,Request,Response,URL,location:{href:'http://127.0.0.1:18743/',origin:'http://127.0.0.1:18743'},clean:v=>String(v??'').trim(),getLocalResult:async()=>rec,VERSION:'test',console});return {window,get calls(){return calls}};}
test('winner-only query archive cannot masquerade as a full result; network resolves the winner',async()=>{const r=run({race:{winner:{horseName:'ŞUBAR'},rows:[]}}),data=await(await r.window.fetch('/api/tjk-history?date=2017-08-08&city=Kocaeli&raceNo=2')).json();assert.equal(r.calls,1);assert.equal(data.top3[0].horseId,'999')});
test('full result with an identified winner is reused locally',async()=>{const r=run({race:{rows:[{finish:1,horseId:'999',horseName:'ŞUBAR'}]}}),data=await(await r.window.fetch('/api/tjk-history?date=2017-08-08&city=Kocaeli&raceNo=2')).json();assert.equal(r.calls,0);assert.equal(data.top3[0].horseId,'999')});
test('partial results without a winner or horse ID are retried remotely',async()=>{for(const rows of [[{finish:2,horseId:'1',horseName:'OTHER'}],[{finish:1,horseName:'ŞUBAR'}]]){const r=run({race:{rows}});await r.window.fetch('/api/tjk-history?date=2017-08-08&city=Kocaeli&raceNo=2');assert.equal(r.calls,1)}});
test('verified-winner downloads bypass incomplete legacy career response caches',async()=>{
 const files=['daily-source-archive-v1691f642.js','resumable-career-v127.js'];for(const file of files){const s=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),start=s.indexOf('function requestKey('),end=s.indexOf(file.startsWith('daily-')?'\nwindow.fetch':'\nfunction cachedResponse',start),code=s.slice(start,end);const c=vm.createContext({URL,URLSearchParams,Request,location:{href:'http://127.0.0.1/',origin:'http://127.0.0.1'},PATHS:new Set(['/api/tjk-career-v10']),VERSION:'test',careerKey:()=> 'cached'});vm.runInContext(code,c);assert.ok(!c.requestKey('/api/tjk-career-v10?horseId=999&complete=1'));assert.ok(c.requestKey('/api/tjk-career-v10?horseId=999'))}
});
