import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../track-maintenance-archive-v1741.js',import.meta.url),'utf8');
function harness({database=null,fetchImpl=async()=>({ok:false,status:502,json:async()=>({ok:false,error:'TJK HTTP 502'})})}={}){
 const warnings=[],window={};if(database)window.indexedDB=database;
 const context=vm.createContext({window,indexedDB:database,fetch:fetchImpl,location:{origin:'http://localhost'},URL,document:{getElementById:()=>null},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,AbortController,console:{info(){},warn:(...v)=>warnings.push(v)},Error});
 vm.runInContext(source,context);return{api:window.ATTrackMaintenanceV1,warnings};
}
test('Track initialization upgrades a previously empty database and retains existing stores',async()=>{
 const stores=new Set(['meta']),created=[],versions=[];
 const db={objectStoreNames:{contains:name=>stores.has(name)},createObjectStore(name){created.push(name);stores.add(name);return{indexNames:{contains:()=>false},createIndex(){}}},close(){}};
 const database={open(name,version){versions.push(version);const q={result:db,transaction:{objectStore(){return{indexNames:{contains:()=>true}}}}};queueMicrotask(()=>{q.onupgradeneeded();q.onsuccess()});return q}};
 const h=harness({database});await h.api.initialize();assert.deepEqual(versions,[2]);assert.deepEqual(created,['reports']);assert.ok(stores.has('meta'));
});
test('Manual track API failures reach the archive UI while automatic errors remain logged',async()=>{
 const h=harness();await assert.rejects(h.api.autoSync('2026-09-30',{throwOnError:true}),/502/);assert.equal(h.api.isBusy(),false);await h.api.autoSync('2026-09-30');assert.equal(h.warnings.length,2);
});
test('A manual track update cannot silently succeed while another sync is running',async()=>{
 let release;const h=harness({fetchImpl:()=>new Promise(resolve=>{release=resolve})});const first=h.api.autoSync('2026-09-30');
 for(let i=0;i<10&&!release;i++)await Promise.resolve();assert.equal(h.api.isBusy(),true);await assert.rejects(h.api.autoSync('2026-09-30',{throwOnError:true}),/zaten güncelleniyor/);
 release({ok:false,status:502,json:async()=>({ok:false,error:'TJK HTTP 502'})});await first;assert.equal(h.api.isBusy(),false);
});
// Exercise the actual pagination loop without requiring browser IndexedDB.
function paginationHarness(pages){
 const writes=[],window={},context=vm.createContext({window,location:{origin:'http://localhost'},URL,document:{getElementById:()=>null},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,AbortController,console:{info(){},warn(){}},Error,
 fetch:async url=>{const page=Number(new URL(url,'http://localhost').searchParams.get('page'));return{ok:true,json:async()=>pages[page]}}});
 const isolated=source.replace('window.ATTrackMaintenanceV1={','saveRows=async rows=>{window.saved=rows;return rows.length};window.syncWindow=syncWindow;window.ATTrackMaintenanceV1={');vm.runInContext(isolated,context);return window;
}
test('same-day observations are retained and counted without mistaking them for repeated pages',async()=>{
 const base={date:'2026-10-01',city:'Ankara'};const h=paginationHarness([{total:3,rows:[{...base,time:'09:00'},{...base,time:'10:00'}]},{total:3,rows:[{date:'2026-10-02',city:'Ankara',time:'09:00'}]}]);
 const rows=await h.syncWindow('2026-10-01','2026-10-02',{loadReports:false});assert.equal(rows.length,2);assert.equal(rows[0].time,'10:00');assert.equal(rows[0].observations.length,2);assert.equal(h.saved.length,2);
});
test('a genuine repeated page still stops before saving or reporting success',async()=>{
 const page={total:2,rows:[{date:'2026-10-01',city:'Ankara',time:'09:00'}]};const h=paginationHarness([page,page]);await assert.rejects(h.syncWindow('2026-10-01','2026-10-02'),/aynı pist sayfasını/);assert.equal(h.saved,undefined);
});
test('persistent window write finishes before its resume checkpoint; a disk failure keeps that window resumable',async()=>{
 const window={calls:[]},row={date:'2026-10-01',city:'Ankara'};
 const isolated=source.replace('window.ATTrackMaintenanceV1={',`dbGet=async(store,key)=>store==='reports'?${JSON.stringify(row)}:null;dbPut=async(store,data)=>{window.calls.push('checkpoint:'+data.key);return true};allRows=async()=>[];syncWindow=async()=>[${JSON.stringify(row)}];window.ATTrackMaintenanceV1={`);
 vm.runInNewContext(isolated,{window,document:{getElementById:()=>null},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,console:{info(){},warn(){}},Error});
 await assert.rejects(window.ATTrackMaintenanceV1.syncRange('2026-10-01','2026-10-01',{loadReports:false,onWindowSaved:async()=>{window.calls.push('disk');throw Error('disk full')}}),/disk full/);
 assert.deepEqual(Array.from(window.calls),['disk']);
 await window.ATTrackMaintenanceV1.syncRange('2026-10-01','2026-10-01',{loadReports:false,onWindowSaved:async()=>{window.calls.push('disk')}});
 assert.equal(window.calls[1],'disk');assert.ok(window.calls[2].startsWith('checkpoint:verified-range:'));assert.equal(window.ATTrackMaintenanceV1.isBusy(),false);
});
