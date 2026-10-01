/* Result-driven degree calibration. Forecasts are captured before the race, never backfilled as training data. */
(()=>{
'use strict';
const VERSION='DEGREE-AUTO-CALIBRATION-V17.4.4',SCHEMA=1744;
if(window.ATDegreeCalibrationV1744)return;
const PRED='at_ai_degree_predictions_v1',ACTUAL='at_ai_tjk_annual_results_v1',CAL='at_ai_degree_calibration_v1';
const clean=v=>String(v??'').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
const finite=v=>v===null||v===undefined||clean(v)===''?null:Number.isFinite(Number(v))?Number(v):null;
const surface=v=>{const s=fold(v);return s.includes('SENTETIK')||s==='S'?'SENTETIK':s.includes('CIM')||s==='C'?'CIM':s.includes('KUM')||s==='K'?'KUM':''};
const key=r=>`${r.date}|${fold(r.city)}|${Number(r.raceNo)||0}`;
const sec=v=>{if(typeof v==='number')return v>0&&Number.isFinite(v)?v:null;const m=clean(v).replace(/,/g,'.').match(/^(\d+)[.:](\d{2})[.:](\d{1,2})$/);return m&&Number(m[2])<60?Number(m[1])*60+Number(m[2])+Number(m[3])/100:null};
function clock(now=new Date()){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));return{date:`${parts.year}-${parts.month}-${parts.day}`,minute:Number(parts.hour)*60+Number(parts.minute)}}
function eligible(date,race,now=new Date(),finished=false){if(finished)return false;const current=clock(now);if(date>current.date)return true;if(date!==current.date)return false;const m=clean(race.time||race.saat||race.raceTime).match(/^(\d{1,2}):(\d{2})/);return !!m&&Number(m[1])<24&&Number(m[2])<60&&current.minute<Number(m[1])*60+Number(m[2])}
function forecast(result,race,program,{date,city,now=new Date(),finished=false}={}){
 const context=JSON.parse(JSON.stringify(result.degreeSpeed?.trackContext||{}));
 context.surface=surface(program.track||program.pist);context.trackCondition=clean(program.trackCondition||program.pistDurumu);context.distance=finite(program.distance||program.mesafe||program.mes);context.raceClass=clean(program.class||program.yaradi1);context.degreeModelVersion=race.horses?.[0]?.degreeModel?.version||'LEGACY';
 const horses=(race.horses||[]).map(h=>{const d=h.degreeModel||{},correction=d.autoCalibration?.active?finite(d.autoCalibration.seconds)||0:0,predicted=finite(d.predictedSec);return{no:h.no,name:h.name,predictedSec:predicted,uncalibratedSec:finite(d.uncalibratedSec)??(predicted===null?null:predicted-correction),rank:finite(d.rank),method:d.method||'',fallback:!!d.fallback||/FALLBACK/.test(d.method||''),predictedText:d.predictedText||'',rangeText:d.rangeText||'',confidence:d.confidence||0}});
 const canTrain=eligible(date,program,now,finished)&&!!context.surface;
 return{key:key({date,city,raceNo:race.no}),date,city,raceNo:Number(race.no),year:Number(date.slice(0,4)),trackContext:context,horses,eligibleForCalibration:canTrain,locked:canTrain,schema:SCHEMA,version:VERSION,generatedAt:now.toISOString(),updatedAt:now.toISOString()};
}
function buildSamples(predictions,results){
 const actuals=new Map(results.map(r=>[key(r),r])),out=[];
 for(const p of predictions){if(p.schema!==SCHEMA||p.eligibleForCalibration!==true||!surface(p.trackContext?.surface))continue;const race=actuals.get(key(p))?.race;if(!race?.rows?.length)continue;
  for(const h of p.horses||[]){if(h.fallback)continue;const byNo=race.rows.find(a=>Number(a.programNo)===Number(h.no));const a=byNo&&fold(byNo.horseName)===fold(h.name)?byNo:race.rows.find(a=>fold(a.horseName)===fold(h.name));const actual=sec(a?.degree),pred=finite(h.predictedSec),raw=finite(h.uncalibratedSec),rank=finite(h.rank),finish=finite(a?.finish);
   if(!(actual>0&&pred>0&&raw>0&&rank>0&&finish>0))continue;
   out.push({key:`${p.key}|${h.no}`,raceKey:p.key,date:p.date,year:p.year,city:p.city,raceNo:p.raceNo,horseNo:h.no,horseName:h.name,predictedSec:pred,actualSec:actual,uncalibratedSec:raw,timeErrorSec:actual-pred,rawErrorSec:actual-raw,degreeRank:rank,actualFinish:finish,rankError:finish-rank,trackContext:p.trackContext,schema:SCHEMA,version:VERSION});
  }
 }return out;
}
function adjustment(samples,city,race,ctx={},cutoff){
 const target=surface(race.track||race.pist),distance=finite(race.distance||race.mesafe||race.mes);
 const rows=samples.filter(s=>(!window.ATDegreeHistoryV1746||s.trackContext?.degreeModelVersion===window.ATDegreeHistoryV1746.version)&&s.schema===SCHEMA&&s.date&&cutoff&&s.date<cutoff&&fold(s.city)===fold(city)&&target&&surface(s.trackContext?.surface)===target&&distance>0&&finite(s.trackContext?.distance)>0&&Math.abs(s.trackContext.distance-distance)<=200&&finite(s.rawErrorSec)!==null);
 const races=new Set(rows.map(s=>s.raceKey)).size,summary={samples:rows.length,races,seconds:0,active:false};if(rows.length<12||races<3)return summary;
 const weighted=rows.map(s=>{let weight=1;for(const [field,scale]of[['temperature',12],['humidity',35],['pressure',25]]){const a=finite(ctx.weather?.[field]),b=finite(s.trackContext?.weather?.[field]);if(a!==null&&b!==null)weight*=Math.exp(-Math.abs(a-b)/scale)}return{value:s.rawErrorSec,weight}}).sort((a,b)=>a.value-b.value);
 const half=weighted.reduce((sum,x)=>sum+x.weight,0)/2;let sum=0,median=0;for(const x of weighted){sum+=x.weight;if(sum>=half){median=x.value;break}}
 const confidence=Math.min(1,(rows.length-8)/60, races/10);return{...summary,active:true,seconds:Number((Math.max(-3,Math.min(3,median))*confidence).toFixed(3))};
}
async function open(name,store,create=false){return new Promise(resolve=>{let q;try{q=indexedDB.open(name)}catch{return resolve(null)}q.onupgradeneeded=()=>{if(!create){q.transaction.abort();return}if(!q.result.objectStoreNames.contains(store))q.result.createObjectStore(store,{keyPath:'key'})};q.onerror=q.onblocked=()=>resolve(null);q.onsuccess=()=>{const db=q.result;if(db.objectStoreNames.contains(store))return resolve(db);if(!create){db.close();return resolve(null)}const version=db.version+1;db.close();const upgrade=indexedDB.open(name,version);upgrade.onupgradeneeded=()=>{if(!upgrade.result.objectStoreNames.contains(store))upgrade.result.createObjectStore(store,{keyPath:'key'})};upgrade.onsuccess=()=>resolve(upgrade.result);upgrade.onerror=upgrade.onblocked=()=>resolve(null)}})}
async function all(name,store){const db=await open(name,store);if(!db)return[];return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),q=tx.objectStore(store).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error);tx.oncomplete=tx.onabort=()=>db.close()})}
function chooseForecast(old,record){if(old?.schema===SCHEMA&&old.locked===true)return old;if(old&&old.schema!==SCHEMA){if(!record.eligibleForCalibration)return old;return{...record,legacyForecast:old}}return record}
async function preserve(record){const db=await open(PRED,'races',true);if(!db)throw Error('Yarış öncesi tahmin kaydedilemedi.');return new Promise((resolve,reject)=>{const tx=db.transaction('races','readwrite'),store=tx.objectStore('races'),get=store.get(record.key);let saved;get.onsuccess=()=>{const old=get.result;saved=chooseForecast(old,record);store.put(saved)};tx.oncomplete=()=>{db.close();resolve(saved)};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('Tahmin kaydı başarısız.'))}})}
async function capture(result,options={}){if(result?.degreeSpeed?.calculationVersion!=='DEGREE-STABLE-INPUTS-V17.4.4'||!result?.races?.length)return[];let st;try{st=typeof state==='object'?state:window.state}catch{st=window.state}const date=options.date||result.date||st?.date,city=options.city||result.cityName||(typeof getCityName==='function'?getCityName():st?.cityName),programs=options.programRaces||st?.races||[];if(!date||!city)return[];const actuals=new Map((await all(ACTUAL,'races')).map(r=>[key(r),r]));const saved=[];for(const r of result.races){const program=programs.find(p=>String(p.no)===String(r.no));if(!program)continue;const finished=(actuals.get(key({date,city,raceNo:r.no}))?.race?.rows||[]).some(a=>Number(a.finish)>0);saved.push(await preserve(forecast(result,r,program,{date,city,now:options.now||new Date(),finished})))}queue();return saved}
let lastSamples=[],pending=null,timer;
async function rebuildSamples(){if(pending)return pending;pending=(async()=>{const [predictions,results]=await Promise.all([all(PRED,'races'),all(ACTUAL,'races')]),samples=buildSamples(predictions,results),db=await open(CAL,'samples',true);if(!db)throw Error('Kalibrasyon arşivi açılamadı.');await new Promise((resolve,reject)=>{const tx=db.transaction('samples','readwrite'),store=tx.objectStore('samples');store.clear();for(const s of samples)store.put(s);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('Kalibrasyon kaydedilemedi.'))}});lastSamples=samples;return samples})().finally(()=>{pending=null});return pending}
function queue(){clearTimeout(timer);timer=setTimeout(()=>void rebuildSamples().catch(e=>console.warn('[AT AI]',VERSION,e)),300)}
const resultJobs=new Map();
async function syncResults(date,city,cityId=''){
 const k=`${date}|${fold(city)}`,prior=resultJobs.get(k);if(prior&&Date.now()-prior.at<300000)return prior.promise;
 if(date>clock().date)return null;
 let st;try{st=typeof state==='object'?state:window.state}catch{st=window.state}
 const selected=typeof getCityName==='function'?getCityName():st?.cityName;
 const id=cityId||(fold(selected)===fold(city)?clean(st?.city):'');
 const promise=(async()=>{const data=await window.ATAnnualResultsArchiveV661?.syncDay?.(date,city,{cityId:id});await rebuildSamples();return data})().catch(e=>{resultJobs.delete(k);throw e});
 resultJobs.set(k,{at:Date.now(),promise});return promise;
}
async function getRace(date,city,no){const local=(await all(ACTUAL,'races')).find(r=>key(r)===key({date,city,raceNo:no}));if(local?.race?.rows?.some(a=>Number(a.finish)>0))return local;void syncResults(date,city).catch(e=>console.warn('[AT AI]',VERSION,e));return null}
const api={version:VERSION,schema:SCHEMA,clock,eligible,forecast,buildSamples,adjustment,capture,preserve,chooseForecast,syncResults,rebuildSamples,autoCalibrate:rebuildSamples,getSamples:()=>lastSamples,queue};
window.ATDegreeCalibrationV1744=api;window.ATDegreeCalibrationF6094315=api;
window.ATArchiveActualAutoCalF6094317={runAutoCalibration:rebuildSamples,getRace,fetchAndSaveDay:async(date,city,cityId)=>{await syncResults(date,city,cityId);return{races:(await all(ACTUAL,'races')).filter(r=>r.date===date&&fold(r.city)===fold(city)).map(r=>r.race)}}};
setInterval(()=>{if(document.visibilityState==='visible')void Promise.resolve(window.ATFogdScoreCenterF609431?.autoSyncActuals?.()).then(queue).catch(e=>console.warn('[AT AI]',VERSION,e))},300000);
window.addEventListener('at-ai:real-race-archive-updated',queue);window.addEventListener('focus',queue);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queue()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
})();
