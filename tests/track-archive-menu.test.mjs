import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../track-longterm-archive-f609448.js',import.meta.url),'utf8');
function harness({ensureError=null,syncError=null,metaDate='2026-09-30',rows=[]}={}){
 const calls=[],written=[],root={name:'Gerçek Yarış Arşivi',async getDirectoryHandle(name){return directory(name)}};
 function directory(name){return{async getDirectoryHandle(child){return directory(child)},async getFileHandle(file){return{async createWritable(){return{async write(data){written.push({file,data:JSON.parse(data)})},async close(){}}}}}}}
 const engine={setProgressListener(fn){this.progress=fn},async backfillYears(...args){calls.push({kind:'backfill',args});if(syncError)throw Error(syncError);this.progress?.({text:'1/2 sayfa alındı',pct:50})},async autoSync(...args){calls.push({kind:'sync',args});if(syncError)throw Error(syncError);this.progress?.({text:'1/2 rapor alındı',pct:50})}};
 const shared={subscribe(fn){fn({handle:root})},async ensure(){if(ensureError)throw Error(ensureError);return root},async select(){return root}};
 const window={ATArchiveDirectoryV1741:shared,ATTrackMaintenanceV1:engine};
 const indexedDB={open(){const q={};queueMicrotask(()=>{q.result={objectStoreNames:{contains:()=>true},close(){},transaction(){return{objectStore(){return{get(){const request={};queueMicrotask(()=>{request.result={lastDate:metaDate};request.onsuccess?.()});return request},getAll(){const request={};queueMicrotask(()=>{request.result=rows;request.onsuccess?.()});return request}}}}}};q.onsuccess?.()});return q}};
 const context=vm.createContext({window,indexedDB,console:{info(){}},Error});vm.runInContext(source,context);
 return{api:window.ATTrackLongterm48,engine,calls,written,root};
}
test('Track permission is checked before fetching or marking an archive as updated',async()=>{
 const h=harness({ensureError:'Klasör izni yok'});await assert.rejects(h.api.backfillYears(2026,2026),/Klasör izni/);assert.equal(h.calls.length,0);assert.equal(h.written.length,0);
});
test('Track tab uses the shared folder and receives the engine progress',async()=>{
 const h=harness(),progress=[];h.api.setProgressListener(p=>progress.push(p));assert.equal(h.api.ready(),true);await h.api.backfillYears(2026,2026);assert.ok(progress.some(p=>p.text==='1/2 sayfa alındı'&&p.pct===50));assert.equal(h.calls[0].args[2].throwIfBusy,true);
});
test('Manual track update propagates errors instead of displaying false success',async()=>{
 const h=harness({syncError:'TJK HTTP 502'}),progress=[];h.api.setProgressListener(p=>progress.push(p));await assert.rejects(h.api.resumeTo('2026-10-01'),/502/);assert.equal(h.calls[0].args[1].throwOnError,true);assert.equal(h.written.length,0);assert.ok(!progress.some(p=>p.text.startsWith('✓')));
});
test('Resuming across a month boundary exports the next calendar day',async()=>{
 const h=harness({rows:[{date:'2026-09-30',city:'İstanbul'},{date:'2026-10-01',city:'Adana'}]});await h.api.resumeTo('2026-10-01');assert.equal(h.written.length,1);assert.equal(h.written[0].file,'2026-10-01_Adana.json');
});
