const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname,BASE=path.join(ROOT,'build-runtime-v1691f750.cjs'),APP=path.join(ROOT,'public','at-ai-app-v142.js'),INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.31] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const bs=app.indexOf('async function deleteYearBatchF750('),be=app.indexOf('async function deleteStoreYearF750(',bs);
const se=app.indexOf('async function deleteMetaF750(',be);
if(bs<0||be<0||se<0)throw new Error('[F60.94.31.31] delete helpers missing');
function fastBatchSource(){return `async function deleteYearBatchF750(dbName,storeName,year,batch=1500){const y=Number(year),db=await openDbF750(dbName);if(!db||!db.objectStoreNames.contains(storeName)){try{db?.close?.()}catch{}return{ok:true,deleted:0}}return new Promise(resolve=>{let settled=false,deleted=0;const done=(ok,error='')=>{if(settled)return;settled=true;try{db.close()}catch{}resolve({ok,deleted,error})};try{const tx=db.transaction(storeName,'readwrite'),os=tx.objectStore(storeName),idx=os.indexNames.contains('year')?os.index('year'):null;if(idx&&typeof idx.getAllKeys==='function'){const q=idx.getAllKeys(IDBKeyRange.only(y),Math.max(1,Number(batch)||1500));q.onsuccess=()=>{const keys=Array.isArray(q.result)?q.result:[];deleted=keys.length;for(const key of keys)os.delete(key)};q.onerror=()=>{try{tx.abort()}catch{}}}else{const q=os.openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return;const r=c.value||{},ry=Number(r.year||String(r.date||'').slice(0,4));if(ry===y){c.delete();deleted++;if(deleted>=batch)return}c.continue()};q.onerror=()=>{try{tx.abort()}catch{}}}tx.oncomplete=()=>done(true);tx.onerror=tx.onabort=()=>done(false,'transaction error')}catch(e){done(false,e?.message||String(e))}})}`}
function fastStoreSource(){return `async function deleteStoreYearF750(dbName,storeName,year,label,status,btn){const y=Number(year);let total=0,check=await countYearF750(dbName,storeName,y);if(!check.ok)throw new Error(\`${'${label}'} sayılamadı\`);let remaining=check.count;if(remaining===0)return{deleted:0,remaining:0};for(let round=1;round<=50&&remaining>0;round++){if(status)status.textContent=\`${'${y}'} siliniyor · ${'${label}'}: ${'${remaining}'} kayıt kaldı…\`;if(btn)btn.textContent=\`${'${label}'} · ${'${remaining}'}\`;const r=await deleteYearBatchF750(dbName,storeName,y,1500);if(!r.ok)throw new Error(\`${'${label}'} silinemedi${'${r.error?` · ${r.error}`:``}'}\`);if(r.deleted===0)throw new Error(\`${'${label}'} silme ilerlemedi\`);total+=r.deleted;remaining=Math.max(0,remaining-r.deleted);if(status)status.textContent=\`${'${y}'} siliniyor · ${'${label}'}: yaklaşık ${'${remaining}'} kayıt kaldı…\`;await new Promise(x=>requestAnimationFrame(()=>x()));if(remaining===0||round%3===0){check=await countYearF750(dbName,storeName,y);if(!check.ok)throw new Error(\`${'${label}'} doğrulanamadı\`);remaining=check.count}}const finalCheck=await countYearF750(dbName,storeName,y);if(!finalCheck.ok)throw new Error(\`${'${label}'} doğrulanamadı\`);if(finalCheck.count>0)throw new Error(\`${'${label}'}: ${'${finalCheck.count}'} kayıt kaldı\`);return{deleted:total,remaining:0}}`}
app=app.slice(0,bs)+fastBatchSource()+'\n'+fastStoreSource()+'\n'+app.slice(se);
app=app.replace('F60.94.31.30 · CHUNKED-YEAR-DELETE','F60.94.31.31 · FAST-BULK-YEAR-DELETE');
for(const token of["idx.getAllKeys(IDBKeyRange.only(y)",'batch=1500','F60.94.31.31 · FAST-BULK-YEAR-DELETE'])if(!app.includes(token))throw new Error('[F60.94.31.31] invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693001').replaceAll('F60.94.31.30','F60.94.31.31');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1693001'))throw new Error('[F60.94.31.31] cache bust failed');
console.log('[AT AI] F60.94.31.31 build complete: selected year is deleted with IndexedDB getAllKeys bulk batches (1500 keys) and exact final verification.');
