import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function textNode(initial=''){let value=initial,writes=0;return{get textContent(){return value},set textContent(v){writes++;value=v},get writes(){return writes}}}
function runtime(file,ids={},extras={}){const observers=[],listeners={},timers=[];const document={readyState:'loading',documentElement:{},getElementById:id=>ids[id]||null,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners['document:'+type]=fn,...extras.document};const window={addEventListener:(type,fn)=>listeners[type]=fn,...extras.window};const c=vm.createContext({window,document,state:{date:'2026-10-01'},getCityName:()=> 'Kocaeli',Date,console:{info(){},warn(){}},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},MutationObserver:class{constructor(cb){observers.push(cb)}observe(){}},...extras.context});vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);return{window,document,observers,listeners,timers};}
test('closed maintenance dialog does not feed its own status back into a document-wide loop',()=>{
 const status=textNode('Hazır.'),bar={style:{width:'0%'},attrs:{},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v}};const r=runtime('track-maintenance-progress-bridge-v1691f700.js',{tmQuickDialogF60947:{open:false},tmQuickStatusF60947:status,tmQuickBarF60947:bar});
 for(let i=0;i<100;i++)r.observers[0]([{addedNodes:[{nodeType:3}],target:status}]);assert.equal(status.writes,0);
 r.listeners['at-ai:track-maintenance-status']({detail:{text:'7 / 11 tamamlandı',pct:64}});assert.equal(status.textContent,'7 / 11 tamamlandı');assert.equal(bar.style.width,'64%');assert.equal(bar.attrs['aria-valuenow'],'64');
 r.window.ATTrackMaintenanceProgressF60948.apply({text:'7 / 11 tamamlandı',pct:64});assert.equal(status.writes,1);
});
test('maintenance controls inserted later receive the last real status once',()=>{
 const ids={},r=runtime('track-maintenance-progress-bridge-v1691f700.js',ids);r.listeners['at-ai:track-maintenance-status']({detail:{text:'Tamamlandı',pct:100}});ids.tmQuickStatusF60947=textNode();ids.tmQuickDialogF60947={open:false};r.observers[0]([{addedNodes:[{id:'tmQuickStatusF60947'}]}]);assert.equal(ids.tmQuickStatusF60947.textContent,'Tamamlandı');assert.equal(ids.tmQuickStatusF60947.writes,1);
});
test('annual selection installer is idempotent and ignores unrelated menu updates',()=>{
 const status=textNode(),run={...textNode(),classList:{add(){}}}; // retain accessors rather than spreading
 Object.defineProperties(run,{textContent:{get:()=>run.label||'',set:v=>{run.label=v;run.writes=(run.writes||0)+1}}});
 const sec={dataset:{},addEventListener(){}},r=runtime('annual-career-ui-dedupe-v1691f688.js',{f62ArchiveSearch:sec,f62aaRun:run,f6088SelectionTools:{},f6088BatchState:status});
 r.window.ATF6088AnnualCareerUi.install();r.window.ATF6088AnnualCareerUi.install();assert.equal(status.writes,1);assert.equal(run.writes,1);const timers=r.timers.length;for(let i=0;i<100;i++)r.observers[0]([{target:{closest:()=>null},addedNodes:[{nodeType:3}]}]);assert.equal(r.timers.length,timers);
});
test('maintenance metadata is read once on installation and refreshed on an actual context change',async()=>{
 let reads=0;const meta=textNode(),ids={tmRealMetaF609416:meta};for(const id of ['tmRealBackfillF609416','tmRealNowF609416','tmRealApplyF609416'])ids[id]={dataset:{}};
 const r=runtime('track-maintenance-stage-fix-v1691f708.js',ids,{window:{ATTrackMaintenanceV1:{version:'test',get:async()=>{reads++;return null}}}});r.listeners['document:DOMContentLoaded']();r.timers.find(x=>x.ms===0).fn();await Promise.resolve();await Promise.resolve();assert.equal(reads,1);
 for(let i=0;i<100;i++)r.observers[0]([]);await Promise.resolve();assert.equal(reads,1);assert.equal(meta.writes,1);r.listeners['document:change']({target:{matches:()=>true}});await Promise.resolve();await Promise.resolve();assert.equal(reads,2);assert.equal(meta.writes,1);
});
