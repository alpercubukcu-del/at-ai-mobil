/* Run only against the isolated local DNA fixture server. */
(async()=>{
if(location.hostname!=='127.0.0.1'||!window.__dnaTest)throw Error('Requires isolated local fixtures');

 const api=window.ATDegreeCalibrationV1744,checks=[];
 const assert=(x,name)=>{if(!x)throw Error(name);checks.push(name)};
 const records=[];for(let no=1;no<=3;no++){
 const program={no,time:'16:00',track:'Sentetik',distance:1400,class:'ŞARTLI 4'};
 const race={no,horses:Array.from({length:4},(_,i)=>({no:i+1,name:`CAL ${no}-${i+1}`,degreeModel:{predictedSec:90+i,uncalibratedSec:90+i,rank:i+1}}))};
 const forecast=api.forecast({degreeSpeed:{trackContext:{weather:{}}}},race,program,{date:'2026-09-25',city:'Adana',now:new Date('2026-09-25T12:00:00Z')});
 await api.preserve(forecast);records.push(forecast);
 const changed={...structuredClone(forecast),horses:forecast.horses.map(h=>({...h,predictedSec:500}))};
 const attempts=await Promise.all([api.preserve(changed),api.preserve(changed)]);
 assert(attempts.every(p=>p.horses[0].predictedSec===90),`atomic locked forecast ${no}`);
 }
 const open=(version)=>new Promise((resolve,reject)=>{const q=version?indexedDB.open('at_ai_tjk_annual_results_v1',version):indexedDB.open('at_ai_tjk_annual_results_v1');q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('races'))q.result.createObjectStore('races',{keyPath:'key'})};q.onerror=()=>reject(q.error);q.onsuccess=()=>resolve(q.result)});
 let db=await open();if(!db.objectStoreNames.contains('races')){const version=db.version+1;db.close();db=await open(version)}
 await new Promise((resolve,reject)=>{const tx=db.transaction('races','readwrite');for(const p of records)tx.objectStore('races').put({key:'result|'+p.key,date:p.date,city:p.city,raceNo:p.raceNo,race:{rows:p.horses.map(h=>({programNo:h.no,horseName:h.name,finish:h.rank,degree:`1.${String(32+h.no-1).padStart(2,'0')}.00`}))}});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
 window.dispatchEvent(new CustomEvent('at-ai:real-race-archive-updated'));
 const samples=await api.rebuildSamples();assert(samples.length===12,'real IndexedDB produces twelve matched samples');
 const adjustment=api.adjustment(samples,'Adana',{track:'Sentetik',distance:1400},{},'2026-09-30');assert(adjustment.active&&adjustment.races===3&&adjustment.seconds===.133,'three races activate damped correction');
 const before=JSON.stringify(records[0]);const post={...records[0],eligibleForCalibration:false,locked:false,horses:[]};
 const kept=await api.preserve(post);assert(JSON.stringify(kept)===before,'post-result analysis cannot overwrite locked forecast');
 const again=await api.rebuildSamples();assert(again.length===12&&again[0].predictedSec===samples[0].predictedSec,'repeated calibration is idempotent');
 const future=api.adjustment(samples,'Adana',{track:'Sentetik',distance:1400},{},'2026-09-25');assert(!future.active&&future.samples===0,'same-day outcomes excluded from prediction');
 return{checks,samples:samples.length,adjustment};

})()
