/* History transport for the tenth method. Does not mutate DNA or nine-model records. */
(()=>{
'use strict';
if(window.ATFogdConditionCouponV174)return;
const core=window.ATFogdConditionCoreV1;
if(!core)return;
const DB='at_ai_condition_history_v174',STORE='history',memory=new Map();
let dbPromise;
function bounded(promise,ms,fallback){
  return new Promise(resolve=>{
    const timer=setTimeout(()=>resolve(fallback),ms);
    Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value)},()=>{clearTimeout(timer);resolve(fallback)});
  });
}
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=bounded(new Promise(resolve=>{
    let q;try{q=indexedDB.open(DB,1)}catch{return resolve(null)}
    q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE,{keyPath:'key'})};
    q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null);
  }),1800,null);return dbPromise;
}
async function cached(key){
  const db=await openDb();if(!db)return null;
  return bounded(new Promise(resolve=>{try{
    const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
    q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null);
  }catch{resolve(null)}}),1800,null);
}
async function cache(key,payload){
  const db=await openDb();if(!db)return;
  try{db.transaction(STORE,'readwrite').objectStore(STORE).put({key,payload,savedAt:new Date().toISOString()})}catch{}
}
function records(payload){
  const record=payload?.record?.data||payload?.record||payload?.data||payload;
  return Array.isArray(record?.races)?record.races:null;
}
async function historyFor(id,date){
  const key=`${date}|${id}`;
  if(memory.has(key))return memory.get(key);
  const task=(async()=>{
    const saved=await cached(key);
    if(records(saved?.payload))return{rows:records(saved.payload),source:'önbellek'};
    // The archive may itself fetch TJK; do not run a second request on its failure.
    if(window.AT_AI_LOCAL_ARCHIVE?.ready?.()&&typeof window.AT_AI_LOCAL_ARCHIVE.horseHistory==='function'){
      const local=await bounded(window.AT_AI_LOCAL_ARCHIVE.horseHistory(id),15000,null);
      if(records(local)){await cache(key,local);return{rows:records(local),source:local.source||'arşiv'}}
      return{rows:null,error:'At geçmişi arşivden alınamadı.'};
    }
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
    try{
      const response=await fetch(`/api/tjk-horse-history-v1?atId=${encodeURIComponent(id)}`,{cache:'no-store',signal:abort.signal});
      const payload=await response.json();
      if(!response.ok||!payload.ok||!records(payload))throw new Error(payload?.error||'TJK geçmişi okunamadı.');
      if(payload.atId&&String(payload.atId)!==id)throw new Error('At geçmişi kimliği eşleşmedi.');
      await cache(key,payload);return{rows:records(payload),source:'TJK'};
    }catch(error){return{rows:null,error:error?.name==='AbortError'?'TJK geçmişi zaman aşımına uğradı.':String(error?.message||error)}}
    finally{clearTimeout(timer)}
  })();
  memory.set(key,task);
  const result=await task;if(!result.rows)memory.delete(key);return result;
}
async function enrichSnapshots(snapshots,races,{date,city,onProgress=()=>{}}={}){
  const map=new Map(),jobs=[];
  for(const race of races||[]){
    const original=snapshots.get(String(race.no));if(!original)continue;
    const snapshot={...original,rows:original.rows.map(row=>({...row}))};map.set(String(race.no),snapshot);
    for(const row of snapshot.rows){
      jobs.push(async()=>{
        if(Array.isArray(row.conditionHistoryRecords)||Array.isArray(row.historyRecords))return;
        const ph=(race.horses||[]).find(h=>String(h.no)===String(row.no));
        const rawId=row?.program?.id??ph?.id??ph?.horseId;
        const id=/^\d+$/.test(String(rawId??''))?String(rawId):'';
        if(!id){row.conditionHistoryError='TJK at kimliği yok.';return}
        const data=await historyFor(id,date);
        if(data.rows){row.conditionHistoryRecords=data.rows;row.conditionHistorySource=data.source}
        else row.conditionHistoryError=data.error;
      });
    }
  }
  let next=0,finished=0;
  await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{
    while(next<jobs.length){const job=jobs[next++];try{await job()}catch{}
      finished++;onProgress(finished,jobs.length);
    }
  }));
  const recordsBefore=await bounded(window.ATDegreeSpeedF6090?.resultRowsBefore?.(date,2)||[],5000,[]);
  const standards=core.buildStandards(recordsBefore,date);
  return{map,standards,date,city};
}
function ku2(template){
  for(const leg of template?.legs||[])for(const row of leg?.ranking||[]){
    const h=row.history||{},parts=[];if(Number.isFinite(h.top4Rate))parts.push(Math.max(0,Math.min(1,h.top4Rate))*2);
    if(Number(h.starts)>0)parts.push(Math.max(0,Math.min(1,Number(h.sameCityStarts||0)/Number(h.starts))));
    if(Number(h.wins)>0)parts.push(Math.min(1,Number(h.wins)/2));
    const score=parts.length?Number((5*parts.reduce((a,b)=>a+b,0)/parts.length/2).toFixed(2)):null;h.conditionScore=score;h.kuVersion='KU-V2';
    if(row.group==='condition'&&(!(Number(row.score)>0)||score===null||score<2.5))row.group='outside';
  }
  for(const leg of template?.legs||[])leg.selections=(leg.ranking||[]).filter(x=>x.group!=='outside');
  template.kuVersion='KU-V2';return template;
}
window.ATFogdConditionCouponV174={version:'FOGD-CONDITION-COUPON-V17.4+KU-V2',enrichSnapshots,
  build:args=>ku2(core.buildAllRacesTemplate(args))};
})();
