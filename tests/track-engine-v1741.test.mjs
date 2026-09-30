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
