/* DEGREE-HISTORY-CORE-V17.4.6: pre-race comparable performance; evidence scores are not probabilities. */
(()=>{
'use strict';
const version='DEGREE-HISTORY-CORE-V17.4.6';
const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const fold=v=>String(v??'').toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
const median=a=>{const x=a.filter(Number.isFinite).sort((a,b)=>a-b);return x.length?(x[Math.floor((x.length-1)/2)]+x[Math.floor(x.length/2)])/2:null};
const spread=a=>{const m=median(a);return m===null?null:median(a.map(x=>Math.abs(x-m)))*1.4826};
const days=(a,b)=>(Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000;
const sec=v=>{if(typeof v==='number')return finite(v);const p=String(v??'').replace(/[:,]/g,'.').match(/^(\d+)\.(\d{2})\.(\d{1,2})$/);return p&&Number(p[2])<60?Number(p[1])*60+Number(p[2])+Number(p[3])/100:null};
const text=v=>Number.isFinite(v)?`${Math.floor(v/60)}.${(v%60).toFixed(2).padStart(5,'0')}`:'—';
const distance=r=>finite(r?.distance??r?.mesafe??r?.mes);
const surface=v=>{const x=fold(v);return x.includes('SENTETIK')?'SENTETIK':x.includes('KUM')?'KUM':x.includes('CIM')?'CIM':x};
const level=r=>fold(r?.class||r?.raceClass||r?.yaradi1||'');
const group=r=>fold(r?.ageGroup||r?.yaradi2||'');
function reference(records,race,city,cutoff){
 const d=distance(race),s=surface(race.track||race.pist),l=level(race),g=group(race);
 if(!(d>0&&s&&g))return {sec:null,dispersion:null,n:0,exact:false,dates:[]};
 const all=records.filter(x=>x.date&&x.date<cutoff&&fold(x.city)===fold(city)&&distance(x.race)===d&&surface(x.race?.track||x.race?.pist)===s&&sec(x.race?.winner?.degree)>0);
 const exact=all.filter(x=>(!l||level(x.race)===l)&&(!g||group(x.race)===g));
 // Do not mix breed/age groups; class fallback is explicitly uncertain.
 const relaxed=all.filter(x=>!g||group(x.race)===g);
 const selected=(exact.length>=3?exact:relaxed).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);
 const values=selected.map(x=>sec(x.race.winner.degree));
 return {sec:median(values),dispersion:spread(values),n:values.length,exact:exact.length>=3&&!!l&&!!g,dates:selected.map(x=>x.date)};
}
function workoutsAt(workout,cutoff){const seen=new Set();return [...(workout?.workouts||[]),...(workout?.archiveWorkouts||[])].filter(w=>w.date&&w.date<cutoff).sort((a,b)=>a.date.localeCompare(b.date)).filter(w=>{const k=JSON.stringify([w.date,w.city||w.hippodrome||w.hipodrome,w.track,w.type,w.splits]);if(seen.has(k))return false;seen.add(k);return true})}
function workoutChange(workouts,from,to){
 const changes=[];
 for(const latest of workouts.filter(w=>w.date>from&&w.date<to&&w.city&&w.track&&w.type))for(const [d,raw]of Object.entries(latest.splits||{})){
  const now=finite(raw);if(!(now>0))continue;
  const prior=workouts.filter(w=>w.date<=from&&days(w.date,from)<=60&&fold(w.track)===fold(latest.track)&&fold(w.city||w.hippodrome||w.hipodrome)===fold(latest.city||latest.hippodrome||latest.hipodrome)&&fold(w.type)===fold(latest.type)&&finite(w.splits?.[d])>0);
  if(prior.length){const before=median(prior.map(w=>finite(w.splits[d])));changes.push({distance:Number(d),fraction:(before-now)/before,from:prior.at(-1).date,to:latest.date})}
 }
 return {fraction:median(changes.map(x=>x.fraction)),comparisons:changes.length,changes};
}
function weighted(a){const total=a.reduce((s,x)=>s+x.weight,0);return total?a.reduce((s,x)=>s+x.value*x.weight,0)/total:null}
function weightEvidence(records,cutoff){
 const horses=new Map();
 for(const rec of records.filter(r=>r.date&&r.date<cutoff))for(const row of rec.race?.rows||[]){const id=row.horseId||fold(row.horseName),own=sec(row.degree),win=sec(rec.race.winner?.degree),kg=finite(row.actualWeight??row.weight);if(!id||!(own>0&&win>0&&kg>0))continue;const key=[id,fold(rec.city),surface(rec.race.track),distance(rec.race),level(rec.race),group(rec.race)].join('|');if(!horses.has(key))horses.set(key,[]);horses.get(key).push({date:rec.date,value:own-win,kg,id})}
 const pairs=[];
 for(const rows of horses.values()){rows.sort((a,b)=>a.date.localeCompare(b.date));for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],delta=b.kg-a.kg;if(days(a.date,b.date)>0&&days(a.date,b.date)<=45&&Math.abs(delta)>=1&&Math.abs(delta)<=5)pairs.push({value:(b.value-a.value)/delta,id:b.id})}}
 const identities=new Set(pairs.map(x=>x.id)).size;
 const raw=median(pairs.map(x=>x.value));
 // Only positive, stable cohort evidence can activate a bounded kg adjustment.
 const active=pairs.length>=30&&identities>=10&&raw>0&&raw<=.5&&spread(pairs.map(x=>x.value))<.6;
 return {active,coefficient:active?raw*Math.min(1,pairs.length/100):0,pairs:pairs.length,horses:identities};
}
function predict({row,program,race,records,city,date,workout,weightModel}){
 records=records.filter(x=>x.date&&x.date<date);
 const target=reference(records,race,city,date),d=distance(race),s=surface(race.track||race.pist),kg=finite(program.weight??program.kilo);
 const samples=(row.history?.degreeSamples||[]).filter(x=>x.date&&x.date<date&&finite(x.sec)>0&&distance(x)>0&&Math.abs(distance(x)-d)<=200&&surface(x.track||x.pist)===s).sort((a,b)=>a.date.localeCompare(b.date));
 const ws=workoutsAt(workout,date),wm=weightModel||weightEvidence(records,date),converted=[];
 for(const h of samples){
  const historic=records.find(r=>r.date===h.date&&fold(r.city)===fold(h.city)&&Number(r.race?.no||r.raceNo)===Number(h.raceNo));const historicalRace={distance:distance(h),track:h.track,class:h.class||historic?.race?.class,ageGroup:h.ageGroup||historic?.race?.ageGroup||race.ageGroup};
  // A historical par uses only results preceding that historical race, never its outcome.
  const par=reference(records,historicalRace,h.city,h.date);
  if(!(target.sec>0&&par.sec>0&&par.n>=3))continue;
  const value=target.sec+(h.sec-par.sec)*d/distance(h);
  const priorKg=finite(h.weight),weightSec=wm.active&&kg!==null&&priorKg!==null?Math.max(-1.5,Math.min(1.5,(kg-priorKg)*wm.coefficient)):0;
  converted.push({date:h.date,value:value+weightSec,weight:Math.exp(-days(h.date,date)/60)*(par.exact?1:.5),weightSec,parSamples:par.n,sourceCity:h.city,sourceDistance:distance(h)})
 }
 let predicted=weighted(converted),method='NORMALIZE_AT_GECMISI',growthSec=0;
 if(converted.length>=3){const slopes=[];for(let i=0;i<converted.length;i++)for(let j=i+1;j<converted.length;j++){const elapsed=days(converted[i].date,converted[j].date);if(elapsed>=7&&elapsed<=120)slopes.push((converted[j].value-converted[i].value)/elapsed)}const slope=median(slopes);if(slope!==null){const latest=converted.at(-1);growthSec=Math.max(-1.5,Math.min(1.5,slope*Math.min(30,days(latest.date,date))))*Math.min(.6,converted.length/10);predicted+=growthSec}}
 let fallback=false;
 if(predicted===null){const same=samples.filter(h=>fold(h.city)===fold(city)&&distance(h)===d).slice(-6);if(same.length){predicted=median(same.map(h=>h.sec));method='AT_HAM_MEDYAN';fallback=true}else if(samples.length){predicted=median(samples.slice(-6).map(h=>h.sec*d/distance(h)));method='AT_YAKIN_MESAFE_HIZ_FALLBACK';fallback=true}else method='KISISEL_VERI_YOK'}
 const training=samples.length?workoutChange(ws,samples.at(-1).date,date):{fraction:null,comparisons:0,changes:[]};
 training.history=samples.slice(1).map((h,i)=>({from:samples[i].date,to:h.date,...workoutChange(ws,samples[i].date,h.date)}));
 // Workout effort/tempo is unknown: observed improvement supports uncertainty, not invented seconds.
 const n=converted.length||samples.length,transfer=converted.some(x=>fold(x.sourceCity)!==fold(city));
 const dispersion=spread(converted.map(x=>x.value));
 const half=Math.max(1.5,(dispersion??1.5)*1.5)+3/Math.sqrt(Math.max(1,n))+(transfer?1:0)+(fallback?2:0)+(!target.exact?1.5:0)+(training.fraction!==null?Math.min(1,Math.abs(training.fraction)*20):.5);
 const evidence=Math.min(85,Math.round(n*8+Math.min(25,target.n)+(target.exact?10:0)-(fallback?15:0)));
 return {version,personalPrediction:predicted!==null,referenceOnly:predicted===null,fallback,method,predictedSec:predicted,uncalibratedSec:predicted,predictedText:text(predicted),rangeText:predicted===null?'—':`${text(Math.max(0,predicted-half))}–${text(predicted+half)}`,uncertaintySec:half,confidence:Math.max(0,evidence),confidenceKind:'EVIDENCE_SCORE_NOT_PROBABILITY',baselineSec:target.sec,baselineText:text(target.sec),baselineSamples:target.n,horseSamples:n,horseResidual:null,normalization:{reference:target,samples:converted,transfer},development:{growthSec,youngHorse:finite(program.age)<=4},weightEffect:{...wm,currentKg:kg,seconds:weighted(converted.map(x=>({...x,value:x.weightSec})))},workoutDevelopment:training,tempo:{available:false,seconds:0},cutoff:date};
}
window.ATDegreeHistoryV1746={version,predict,reference,workoutsAt,workoutChange,weightEvidence};
})();
