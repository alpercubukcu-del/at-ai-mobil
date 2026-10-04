import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../archive-directory-v1741.js',import.meta.url),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
function folder(name='Arşiv',permission='granted'){
 return{name,queryPermission:async()=>permission,requestPermission:async()=>{permission='granted';return permission}};
}
function harness({stored=null,picker=async()=>folder(),blocked=false,readGate=null}={}){
 const events=[],warnings=[];let openCount=0,pickerCount=0,closed=0;
 const indexedDB={open(){openCount++;const q={};queueMicrotask(()=>{
  if(blocked){q.onblocked?.();return}
  q.result={objectStoreNames:{contains:()=>true},close(){closed++},transaction(){const tx={objectStore(){return{
   get(){const request={};(readGate?.promise||Promise.resolve()).then(()=>{request.result=stored;request.onsuccess?.()});return request},
   put(value){stored=value;queueMicrotask(()=>tx.oncomplete?.())}
  }}};return tx}};q.onsuccess?.()
 });return q}};
 const window={showDirectoryPicker(options){pickerCount++;events.push('picker');return picker(options)}};
 const context=vm.createContext({window,indexedDB,setTimeout,clearTimeout,console:{warn:(...v)=>warnings.push(v)},Error});
 vm.runInContext(source,context);
 return{api:window.ATArchiveDirectoryV1741,events,warnings,counts:()=>({openCount,pickerCount,closed}),stored:()=>stored,window};
}
test('Repeated folder taps share a single outstanding native picker',async()=>{
 const gate=deferred(),h=harness({picker:()=>gate.promise});
 const first=h.api.select(),second=h.api.select();assert.equal(first,second);assert.equal(h.counts().pickerCount,1);assert.equal(h.api.picking(),true);
 const chosen=folder();gate.resolve(chosen);assert.equal(await first,chosen);assert.equal(h.api.picking(),false);assert.equal(h.stored(),chosen);
});
test('Cancelled selection releases the picker and allows a subsequent selection',async()=>{
 let attempts=0;const h=harness({picker:async()=>{if(!attempts++){const e=Error('cancelled');e.name='AbortError';throw e}return folder()}});
 await assert.rejects(h.api.select(),/iptal edildi/);assert.equal(h.api.picking(),false);await h.api.select();assert.equal(h.api.ready(),true);
});
test('A picker already active outside the app produces a recoverable message',async()=>{
 const h=harness({picker:async()=>{throw Error('File picker already active.')}});
 await assert.rejects(h.api.select(),/Açık klasör seçim penceresini/);assert.equal(h.api.picking(),false);
});
test('First update opens the picker before any asynchronous database work',async()=>{
 const h=harness(),task=h.api.ensure({pick:true});assert.deepEqual(h.events,['picker']);assert.equal(h.counts().openCount,0);await task;assert.equal(h.api.ready(),true);
});
test('Persisted handles needing renewed permission are restored for the update button',async()=>{
 const chosen=folder('Kayıtlı','prompt'),h=harness({stored:chosen});await h.api.restore();assert.equal(h.api.getHandle(),chosen);assert.equal(h.api.ready(),false);
 await h.api.ensure();assert.equal(h.api.ready(),true);assert.equal(h.counts().pickerCount,0);
});
test('Concurrent restoration requests read the saved handle only once',async()=>{
 const gate=deferred(),h=harness({stored:folder(),readGate:gate});const first=h.api.restore(),second=h.api.restore();assert.equal(first,second);gate.resolve();await first;assert.equal(h.counts().openCount,1);
});
test('Late restore cannot replace an explicitly chosen newer folder',async()=>{
 const gate=deferred(),old=folder('Eski'),next=folder('Yeni'),h=harness({stored:old,readGate:gate,picker:async()=>next});const restoring=h.api.restore();await h.api.select();gate.resolve();await restoring;assert.equal(h.api.getHandle(),next);
});
test('Denied write permission does not accept a new folder',async()=>{
 const chosen=folder();chosen.queryPermission=chosen.requestPermission=async()=> 'denied';const h=harness({picker:async()=>chosen});await assert.rejects(h.api.select(),/izni verilmedi/);assert.equal(h.api.ready(),false);assert.equal(h.api.getHandle(),null);
});
test('Blocked persistence does not prevent use of the selected writable folder',async()=>{
 const h=harness({blocked:true});await h.api.select();assert.equal(h.api.ready(),true);assert.equal(h.warnings.length,1);
});
test('Unavailable file picker reports an actionable browser message',async()=>{
 const h=harness();delete h.window.showDirectoryPicker;await assert.rejects(h.api.select(),/Chrome/);
});
test('shared child cache coalesces directory opens and retries rejected opens',async()=>{
 const h=harness();let calls=0;const child={name:'Yıl'},parent={async getDirectoryHandle(){calls++;if(calls===1)throw Error('disk');return child}};
 await assert.rejects(h.api.child(parent,'2026'));assert.equal(await h.api.child(parent,'2026'),child);await Promise.all(Array.from({length:20},()=>h.api.child(parent,'2026')));assert.equal(calls,2);
});
test('shared disk queue releases failed writers and limits all menus together',async()=>{
 const h=harness();let active=0,max=0,closed=0;
 const file={async createWritable(){active++;max=Math.max(max,active);return{async write(){},async close(){await new Promise(r=>setTimeout(r,2));active--;closed++},async abort(){active--}}}};
 await Promise.all(Array.from({length:12},async()=>{const w=await h.api.writer(file);await w.write('{}');await w.close()}));assert.equal(max,2);assert.equal(closed,12);assert.equal(h.api.diskStats().active,0);
 await assert.rejects(h.api.writer({createWritable:async()=>{throw Error('disk')}}));assert.equal(h.api.diskStats().active,0);
 const broken=await h.api.writer({createWritable:async()=>({write:async()=>{throw Error('full')},abort:async()=>{}})});await assert.rejects(broken.write('x'));assert.equal(h.api.diskStats().active,0);
});
