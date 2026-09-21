/* F60.94.31.21 fast archive resume safety: never skip unfinished parallel query pages. */
(()=>{
'use strict';
if(window.__AT_FAST_ARCHIVE_RESUME_SAFETY_741B__)return;
window.__AT_FAST_ARCHIVE_RESUME_SAFETY_741B__=true;
const DB='at_ai_tjk_real_day_index_v2',STORE='meta',MARK='REAL-ARCHIVE-FAST-MULTI';
function open(){return new Promise(resolve=>{let q;try{q=indexedDB.open(DB)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null)})}
async function resetPartial(){const db=await open();if(!db||!db.objectStoreNames.contains(STORE)){try{db?.close()}catch{}return}await new Promise(resolve=>{try{const tx=db.transaction(STORE,'readwrite'),os=tx.objectStore(STORE),q=os.openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return;const v=c.value;if(v?.status==='partial'&&String(v?.version||'').includes(MARK)){v.nextPage=0;v.resumeSafety='REFETCH_UNFINISHED_PARALLEL_PAGES';v.updatedAt=new Date().toISOString();c.update(v)}c.continue()};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>resolve()}catch{resolve()}});try{db.close()}catch{}}
async function resetSelectedPartial(){const a=Number(document.getElementById('rrFastYearFromF60943121')?.value),b=Number(document.getElementById('rrFastYearToF60943121')?.value);if(!a||!b)return;const db=await open();if(!db||!db.objectStoreNames.contains(STORE)){try{db?.close()}catch{}return}await new Promise(resolve=>{try{const tx=db.transaction(STORE,'readwrite'),os=tx.objectStore(STORE);for(let y=Math.min(a,b);y<=Math.max(a,b);y++){const q=os.get(`year:${y}:scan`);q.onsuccess=()=>{const v=q.result;if(v?.status==='partial'&&String(v?.version||'').includes(MARK)){v.nextPage=0;v.resumeSafety='STOP_REFETCH_FROM_PAGE_ZERO';v.updatedAt=new Date().toISOString();os.put(v)}}tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>resolve()}catch{resolve()}});try{db.close()}catch{}}
function wire(){const b=document.getElementById('rrFastStopF60943121');if(b&&!b.dataset.resumeSafety741b){b.dataset.resumeSafety741b='1';b.addEventListener('click',()=>{void resetSelectedPartial()},true)}}
function install(){void resetPartial();wire();const o=new MutationObserver(wire);o.observe(document.documentElement,{childList:true,subtree:true});for(const ms of[100,500,1500])setTimeout(wire,ms)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATFastArchiveResumeSafety741B={resetPartial,resetSelectedPartial};
})();
