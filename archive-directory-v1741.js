/* Shared Menu 8 folder access. Keeps the existing persisted directory handle. */
(()=>{'use strict';
if(window.ATArchiveDirectoryV1741)return;
const VERSION='ARCHIVE-DIRECTORY-V17.4.1',DB='at_ai_m8_dir_v1';
let handle=null,permissionState='',restoring=null,selecting=null,generation=0;
const listeners=new Set();
function notify(){for(const fn of listeners)try{fn({handle,picking:!!selecting,permission:permissionState})}catch{}}
function deadline(task,label,ms=8000){let timer;return Promise.race([Promise.resolve(task),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' zaman aşımına uğradı. Tekrar deneyin.')),ms)})]).finally(()=>clearTimeout(timer))}
function openDb(){return new Promise((resolve,reject)=>{let q,done=false,timer;const finish=(error,db)=>{if(done){try{db?.close()}catch{}return}done=true;clearTimeout(timer);error?reject(error):resolve(db)};try{q=indexedDB.open(DB,1)}catch(e){return finish(e)}timer=setTimeout(()=>finish(Error('Klasör kaydı açılamadı')),5000);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('h'))q.result.createObjectStore('h')};q.onsuccess=()=>finish(null,q.result);q.onerror=()=>finish(q.error||Error('Klasör kaydı açılamadı'));q.onblocked=()=>finish(Error('Klasör kaydı başka pencerede kullanılıyor'))})}
async function storedHandle(){const db=await openDb();try{return await deadline(new Promise((resolve,reject)=>{const q=db.transaction('h').objectStore('h').get('root');q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)}),'Klasör kaydı')}finally{db.close()}}
async function remember(h){const db=await openDb();try{await deadline(new Promise((resolve,reject)=>{const tx=db.transaction('h','readwrite');tx.objectStore('h').put(h,'root');tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('Klasör kaydı saklanamadı'))}),'Klasör kaydı')}finally{db.close()}}
function setHandle(h,permission=''){handle=h;permissionState=permission;notify();return h}
function restore(){
 if(handle)return Promise.resolve(handle);if(restoring)return restoring;
 const start=generation;
 restoring=(async()=>{try{const h=await storedHandle();if(!h)return null;const p=await deadline(h.queryPermission({mode:'readwrite'}),'Klasör izni');if(start!==generation||handle)return handle;return setHandle(h,p)}catch(e){console.warn('[AT AI]',VERSION,'Klasör kaydı okunamadı:',e?.message||e);return handle}})().finally(()=>{restoring=null});return restoring
}
function pickerError(error){
 if(error?.name==='AbortError')return Error('Klasör seçimi iptal edildi. Tekrar seçebilirsiniz.');
 if(/picker.*active|already active/i.test(String(error?.message||'')))return Error('Açık klasör seçim penceresini tamamlayın veya kapatın; ardından tekrar seçin.');
 if(error?.name==='SecurityError')return Error('Klasör erişimi başlatılamadı. Klasör Seç düğmesini kullanın; gerekirse sayfayı Chrome’da açın.');
 return error instanceof Error?error:Error(String(error))
}
function select(){
 if(selecting)return selecting;
 if(typeof window.showDirectoryPicker!=='function')return Promise.reject(Error('Bu tarayıcı klasör erişimini desteklemiyor. Sayfayı Chrome’da açıp tekrar deneyin.'));
 generation++;let native;
 // Open directly from the button gesture, before database or network work.
 try{native=window.showDirectoryPicker({mode:'readwrite',id:'at-ai-mobil'})}catch(e){native=Promise.reject(e)}
 selecting=Promise.resolve(native).then(async h=>{
  let p=await deadline(h.queryPermission({mode:'readwrite'}),'Klasör izni');
  if(p!=='granted')p=await deadline(h.requestPermission({mode:'readwrite'}),'Klasör yazma izni');
  if(p!=='granted')throw Error('Klasör yazma izni verilmedi. Klasörü yeniden seçip erişime izin verin.');
  setHandle(h,p);try{await remember(h)}catch(e){console.warn('[AT AI]',VERSION,'Klasör seçildi; yeniden açılış kaydı saklanamadı:',e?.message||e)}return h
 }).catch(e=>{throw pickerError(e)}).finally(()=>{selecting=null;notify()});notify();return selecting
}
async function ensure({pick=false}={}){
 // select() must run before an asynchronous restore when no handle is ready.
 let h=handle;if(!h&&pick)h=await select();if(!h)h=await restore();
 if(!h)throw Error('Önce arşiv klasörünü seçin.');
 let p=await deadline(h.queryPermission({mode:'readwrite'}),'Klasör izni');
 if(p!=='granted')p=await deadline(h.requestPermission({mode:'readwrite'}),'Klasör yazma izni');
 permissionState=p;notify();if(p!=='granted')throw Error('Klasör yazma izni yok. Arşiv Klasörünü Seç düğmesiyle erişime izin verin.');return h
}
// One shared disk queue for every archive menu; native handles remain persistable.
const childCaches=new WeakMap();let diskActive=0;const diskWaiters=[];
async function child(parent,name,options={}){
 let cache=childCaches.get(parent);if(!cache){cache=new Map();childCaches.set(parent,cache)}
 const key=String(name);if(cache.has(key))return cache.get(key);
 const pending=parent.getDirectoryHandle(name,options);cache.set(key,pending);
 try{return await pending}catch(e){if(cache.get(key)===pending)cache.delete(key);throw e}
}
async function writer(file){
 if(diskActive<2)diskActive++;else await new Promise(resolve=>diskWaiters.push(resolve));
 let released=false;const release=()=>{if(released)return;released=true;const next=diskWaiters.shift();if(next)next();else diskActive--};
 let native;try{native=await file.createWritable()}catch(e){release();throw e}
 return {async write(value){try{return await native.write(value)}catch(e){try{await native.abort()}catch{}release();throw e}},async close(){try{return await native.close()}finally{release()}},async abort(){try{return await native.abort()}finally{release()}}};
}
window.ATArchiveDirectoryV1741={version:VERSION,child,writer,diskStats:()=>({active:diskActive,waiting:diskWaiters.length}),select,restore,ensure,getHandle:()=>handle,ready:()=>!!handle&&permissionState==='granted',picking:()=>!!selecting,subscribe(fn){listeners.add(fn);fn({handle,picking:!!selecting,permission:permissionState});return()=>listeners.delete(fn)}};
})();
