import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../degree-history-core-v1746.js',import.meta.url),'utf8'),{window});
const core=window.ATDegreeHistoryV1746;
const race={distance:1400,track:'Kum',class:'ŞARTLI 4',ageGroup:'3 Yaşlı Araplar'};
const record=(date,city,d,time,cl='ŞARTLI 4')=>({date,city,race:{distance:d,track:'Kum',class:cl,ageGroup:race.ageGroup,winner:{degree:time},rows:[]}});
const records=[];
for(const date of ['2026-06-01','2026-06-02','2026-06-03']){records.push(record(date,'Ankara',1500,'1.45.00'),record(date,'Kocaeli',1400,'1.35.00'))}
const input={row:{history:{degreeSamples:[{date:'2026-09-10',city:'Ankara',distance:1500,track:'Kum',class:race.class,ageGroup:race.ageGroup,sec:109.63,weight:56.5}]}},program:{weight:52.5,age:3},race,records,city:'Kocaeli',date:'2026-10-01'};
const copy=x=>JSON.parse(JSON.stringify(x));
test('city distance and full class reference normalize own performance rather than winner gap',()=>{const m=core.predict(input);assert.ok(Math.abs(m.predictedSec-(95+4.63*1400/1500))<1e-9);assert.equal(m.normalization.samples[0].sourceCity,'Ankara');assert.equal(m.tempo.available,false);assert.equal(m.weightEffect.active,false);assert.equal(m.weightEffect.seconds,0)});
test('same-day future and undated outcomes cannot change historical prediction',()=>{const a=core.predict(input),b=core.predict({...input,records:[...records,record('2026-10-01','Kocaeli',1400,'1.20.00'),record('2026-10-02','Kocaeli',1400,'1.20.00'),record(null,'Kocaeli',1400,'1.20.00')]});assert.deepEqual(a,b)});
test('historical par excludes results after the historical performance',()=>{const a=core.predict(input),b=core.predict({...input,records:[...records,...['2026-09-11','2026-09-12','2026-09-13'].map(d=>record(d,'Ankara',1500,'1.20.00'))]});assert.equal(a.predictedSec,b.predictedSec)});
test('no history retains shared reference separately and has no personal forecast or rank',()=>{const m=core.predict({...input,row:{history:{degreeSamples:[]}}});assert.equal(m.predictedSec,null);assert.equal(m.baselineSec,95);assert.equal(m.referenceOnly,true);assert.equal(m.rank,undefined)});
test('sparse or unnormalized history has wider uncertainty and lower evidence',()=>{const sparse=core.predict(input),many=copy(input);many.row.history.degreeSamples=Array.from({length:6},(_,i)=>({...input.row.history.degreeSamples[0],date:`2026-09-${String(10+i).padStart(2,'0')}`}));const dense=core.predict(many);assert.ok(sparse.uncertaintySec>dense.uncertaintySec);assert.ok(sparse.confidence<dense.confidence);assert.equal(sparse.confidenceKind,'EVIDENCE_SCORE_NOT_PROBABILITY')});
test('race-day and future horse history cannot enter estimate',()=>{const a=core.predict(input),x=copy(input);x.row.history.degreeSamples.push({...x.row.history.degreeSamples[0],date:x.date,sec:80},{...x.row.history.degreeSamples[0],date:'2026-10-02',sec:75});assert.deepEqual(a,core.predict(x))});
test('KIZIL ARYA workout improvement is observed without inventing tempo or a seconds coefficient',()=>{const workouts=[['2026-09-04',{600:41.5,400:27.5}],['2026-09-06',{800:56.5,400:28.8}],['2026-09-20',{800:56,400:28.4}],['2026-09-25',{600:41,400:27.2}]].map(([date,splits])=>({date,splits,city:'Ankara',track:'Kum',type:'Galop'}));const m=core.predict({...input,workout:{workouts}});assert.ok(m.workoutDevelopment.fraction>0);assert.ok(m.workoutDevelopment.comparisons>=3);assert.equal(m.predictedSec,core.predict(input).predictedSec);assert.equal(m.tempo.seconds,0);const future={date:'2026-10-01',splits:{600:30},city:'Ankara',track:'Kum',type:'Galop'};assert.deepEqual(m,core.predict({...input,workout:{workouts:[...workouts,future]}}))});
test('different workout surface or city is not treated as improvement',()=>{const x=[{date:'2026-09-05',city:'Ankara',track:'Kum',type:'Galop',splits:{600:42}},{date:'2026-09-25',city:'Kocaeli',track:'Kum',type:'Galop',splits:{600:40}}];assert.equal(core.workoutChange(x,'2026-09-10','2026-10-01').fraction,null)});
test('surface and breed groups are not mixed into a reference',()=>{const x=copy(records);x.forEach(r=>{r.race.track='Çim'});assert.equal(core.reference(x,race,'Kocaeli',input.date).sec,null);x.forEach(r=>{r.race.track='Kum';r.race.ageGroup='3 Yaşlı İngilizler'});assert.equal(core.reference(x,race,'Kocaeli',input.date).sec,null)});
test('full class level separates ŞARTLI 3 from ŞARTLI 5',()=>{const x=[...records,...['2026-08-01','2026-08-02','2026-08-03'].map(d=>record(d,'Kocaeli',1400,'1.20.00','ŞARTLI 5'))];assert.equal(core.reference(x,race,'Kocaeli',input.date).sec,95)});
test('empirical kilo effect activates only with enough distinct comparable horses',()=>{const x=[];for(let i=0;i<12;i++)for(let j=0;j<4;j++){const r=record(`2026-07-${String(j+1).padStart(2,'0')}`,'Ankara',1500,'1.45.00');r.race.rows=[{horseId:String(i+1),horseName:'AT'+i,degree:105+1+j*.2,weight:53+j}];x.push(r)}const w=core.weightEvidence(x,input.date);assert.equal(w.active,true);assert.ok(w.coefficient>0);assert.equal(core.weightEvidence(x.slice(0,4),input.date).active,false);const m=core.predict({...input,weightModel:w});assert.ok(m.predictedSec<core.predict(input).predictedSec);assert.ok(m.weightEffect.seconds<0)});
test('bounded development uses past normalized performances for every horse',()=>{const x=copy(input);x.row.history.degreeSamples=[['2026-08-01',113],['2026-08-20',110],['2026-09-10',109]].map(([date,sec])=>({...input.row.history.degreeSamples[0],date,sec}));const m=core.predict(x);assert.ok(m.development.growthSec<0);assert.ok(m.development.growthSec>=-.9);x.row.name='ANOTHER HORSE';assert.equal(m.predictedSec,core.predict(x).predictedSec)});

test('late workout attachment is idempotent and preserves predicted seconds and ranks',()=>{
 const model=core.predict(input);model.rank=3;model.autoCalibration={active:true,seconds:1};model.predictedSec+=1;const before=model.predictedSec;
 const workouts=[{date:'2026-09-05',city:'Ankara',track:'Kum',type:'Galop',splits:{600:42}},{date:'2026-09-25',city:'Ankara',track:'Kum',type:'Galop',splits:{600:41}},{date:'2026-10-01',city:'Ankara',track:'Kum',type:'Galop',splits:{600:30}}];
 core.attachWorkouts(model,input.row.history.degreeSamples,{workouts},input.date);const half=model.uncertaintySec,range=model.rangeText;
 core.attachWorkouts(model,input.row.history.degreeSamples,{workouts},input.date);
 assert.equal(model.predictedSec,before);assert.equal(model.rank,3);assert.equal(model.uncertaintySec,half);assert.equal(model.rangeText,range);assert.equal(model.workoutDevelopment.comparisons,1);assert.equal(model.autoCalibration.seconds,1);
});

test('indexed reference yields the identical forecast and excludes future records at every cutoff',()=>{
 const x={...input,records:[...input.records,record('2026-10-01','Kocaeli',1400,'1.20.00'),record('2026-09-11','Ankara',1500,'1.20.00')]};
 assert.deepEqual(copy(core.predict(x)),copy(core.predict({...x,referenceIndex:core.createReferenceIndex(x.records)})));
 const many=copy(x);many.row.history.degreeSamples.push({...many.row.history.degreeSamples[0],date:'2026-09-20',sec:108});assert.deepEqual(copy(core.predict(many)),copy(core.predict({...many,referenceIndex:core.createReferenceIndex(many.records)})));
});
