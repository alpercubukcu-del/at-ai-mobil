import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../winner-preparation-v18.js',import.meta.url),'utf8');
const heading={class:'ŞARTLI 3/Dişi',group:'3 ve Yukarı İngilizler',distance:1700,track:'Kum'};
const ref={date:'2017-08-08',city:'Kocaeli',raceNo:2,winner:'ŞUBAR',sourceYear:2017,heading};
function harness({peek=async()=>null,get,fetcher,scope='all',dates=[]}={}){
 const calls=[],saved=[],elements=new Map(),state={date:'2026-10-03',city:'8',cities:[{id:'9',name:'Kocaeli'}],analyses:{},races:[{no:5,horses:[{id:'104248',name:'PROMISE ME DELIGHT',no:6}]}]};
 const window={ATWinnerJourneyMenuV1:{heading:r=>r,hsim:(a,b)=>a.class===b.class&&a.group===b.group&&a.distance===b.distance&&a.track===b.track?1:0,findHistoricalDays:async()=>dates,winnerFromPermanent:async day=>day.ref},ATArchiveDirectoryV1741:{getHandle:()=>state},ATWinnerCareerArchiveV18:{refKey:r=>[r.date,r.city,r.raceNo,r.winner].join('|'),peek,get:get||(async(r,deps)=>{const winner=await deps.resolveWinner(r);return {source:'tjk',winner,career:await deps.fetchCareer(winner.horseId)}})}};
 const context=vm.createContext({window,state,URL,location:{origin:'http://127.0.0.1'},AbortController,console,Date,setTimeout,clearTimeout,localStorage:{getItem:()=>scope,setItem(){}},MutationObserver:class{observe(){}},document:{body:{},getElementById:id=>elements.get(id)||null},fetch:async(url,opts)=>{calls.push(url);return {ok:true,status:200,json:async()=>fetcher(new URL(url,'http://127.0.0.1'),opts)}},runCareerAnalysis(){},normalizeCareerResponse:d=>({...d,roadmap:d.history||[]}),fetchCareer:async()=>{calls.push('current');return{history:[{finish:3}]}},calculateGalibiyetBenzerligi:(path,roadmap)=>({score:roadmap.ok?50:null,method:'test',byYear:roadmap.failures||[],referenceCount:roadmap.historicalRaces.length}),renderCareerAnalysis:r=>saved.push(r),save(){}});
 vm.runInContext(src,context);return {api:window.ATWinnerPreparationV18,context,calls,saved,state};
}
const cached={source:'phone',winner:{horseId:'999',horseName:'ŞUBAR',finish:1},career:{history:[{isoDate:'2017-07-11',finish:3}]}};
test('ready winner preparation has no requests, survives a new runtime, and stays independent of menu 6 scope',async()=>{
 for(const scope of ['all','same']){const r=harness({scope,peek:async()=>cached,get:async()=>{throw Error('must not redownload')}});const result=await r.api.prepareReferences([ref,ref]);assert.equal(result.preparation.total,1);assert.equal(result.preparation.ready,1);assert.equal(result.ok,true);assert.equal(r.calls.length,0);assert.equal(r.api.scope(),scope)}
});
test('old query winners resolve by canonical day results once per city/date and fetch careers without a cutoff',async()=>{
 const second={...ref,raceNo:3,winner:'SLEVEN'},r=harness({fetcher:async u=>u.pathname.includes('day-results')?{ok:true,races:[{no:2,...heading,rows:[{finish:1,horseId:'999',horseName:'ŞUBAR'}]},{no:3,...heading,rows:[{finish:1,horseId:'888',horseName:'SLEVEN'}]}]}:{ok:true,history:[]}});
 const result=await r.api.prepareReferences([ref,second]);assert.equal(result.preparation.downloaded,2);assert.equal(r.calls.filter(u=>u.includes('day-results')).length,1);assert.equal(r.calls.filter(u=>u.includes('career')).length,2);assert.ok(r.calls.every(u=>!u.includes('before=')));assert.equal(result.historicalRaces[0].top3[0].horseName,'ŞUBAR');
});
test('wrong winner or different race heading stops before career download',async()=>{
 for(const race of [{no:2,...heading,rows:[{finish:1,horseId:'999',horseName:'WRONG'}]},{no:2,...heading,distance:1900,rows:[{finish:1,horseId:'999',horseName:'ŞUBAR'}]}]){const r=harness({fetcher:async()=>({ok:true,races:[race]})});const result=await r.api.prepareReferences([ref]);assert.equal(result.ok,false);assert.equal(result.failures.length,1);assert.equal(r.calls.length,1)}
});
test('failed day request retries rather than poisoning the winner cache',async()=>{
 let attempts=0;const r=harness({fetcher:async u=>{if(u.pathname.includes('day-results')){if(++attempts===1)throw Error('offline');return {ok:true,races:[{no:2,...heading,rows:[{finish:1,horseId:'999',horseName:'ŞUBAR'}]}]}}return {ok:true,history:[]}}});assert.equal((await r.api.prepareReferences([ref])).ok,false);assert.equal((await r.api.prepareReferences([ref])).ok,true);assert.equal(attempts,2);
});
test('single career selection prepares the selected race then compares, without menu 6 interaction',async()=>{
 const r=harness({dates:[{ref,audit:{targetPair:{historical:heading}}}],peek:async()=>cached});const result=await r.context.runCareerAnalysis(r.state.races,'5');assert.equal(result.winnerScope,'all');assert.equal(result.races[0].historicalRaceCount,1);assert.equal(result.races[0].horses[0].galibiyetBenzerligi.score,50);assert.deepEqual(r.calls,['current']);assert.equal(r.saved.length,1);
});
test('no historical reference avoids fetching every current horse and retains a useful failure',async()=>{
 const r=harness();const result=await r.context.runCareerAnalysis(r.state.races,'5');assert.equal(r.calls.length,0);assert.match(result.races[0].roadmapError,/geçmiş kazanan/);assert.equal(result.races[0].horses[0].galibiyetBenzerligi.score,null);
});
test('partial preparation preserves successful winners and individual errors',async()=>{
 const r=harness({peek:async r=>r.winner==='ŞUBAR'?cached:null,get:async()=>{throw Error('SLEVEN: incomplete career')}});const result=await r.api.prepareReferences([ref,{...ref,winner:'SLEVEN'}]);assert.equal(result.ok,true);assert.equal(result.historicalRaces.length,1);assert.equal(result.failures[0].winner,'SLEVEN');assert.equal(result.preparation.failed,1);
});
test('pause aborts pending requests and does not mark an unfinished winner ready',async()=>{
 let started;const begun=new Promise(r=>started=r);const r=harness({fetcher:async(u,{signal})=>{started();await new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true})})}});const pending=r.api.prepareReferences([ref]);await begun;r.api.pause();const result=await pending;assert.equal(result.preparation.paused,true);assert.equal(result.preparation.ready,0);assert.equal(result.historicalRaces.length,0);
});
