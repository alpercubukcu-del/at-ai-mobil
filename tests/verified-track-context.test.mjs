import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const window={},env={window,Date,setTimeout};
for(const f of ['verified-track-context-v17413.js','degree-history-core-v1746.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),env);
const api=window.ATVerifiedTrackV17413,core=window.ATDegreeHistoryV1746;
const date='2026-10-01',city='Kocaeli',race={distance:1400,track:'Kum',class:'ŞARTLI 4',ageGroup:'3 Yaşlı Araplar',time:'18:00'};
const report={date,city,time:'15:00',temperature:25,humidity:50,pressure:1015,windSpeedKmh:10,maintenance:{bySurface:{sand:{watering:true,observationKind:'DOCUMENTED_SCHEDULE',events:[{operation:'watering',date,time:'13:00'}]},grass:{mowing:true,observationKind:'DOCUMENTED_SCHEDULE',events:[{operation:'mowing',date,time:'13:00'}]},trainingSand:{roller:true,observationKind:'DOCUMENTED_SCHEDULE',events:[{operation:'roller',date,time:'13:00'}]}}}};
const index=rows=>api.index(rows,new Date('2026-10-01T13:00:00Z'));
const clone=x=>JSON.parse(JSON.stringify(x));
test('same-day measurement is strictly before race and before calculation time',()=>{
 assert.equal(api.context(index([report]),date,city,race).weather.temperature,25);
 for(const time of ['18:00','19:00','',null])assert.deepEqual(clone(api.context(index([{...report,time}]),date,city,race).weather),{});
 assert.deepEqual(clone(api.context(index([{...report,time:'17:00'}]),date,city,race).weather),{});
 assert.deepEqual(clone(api.context(index([report]),date,city,{...race,time:''}).weather),{});
});
test('missing weather does not become zero or borrow another day or city',()=>{
 const x=api.context(index([{...report,temperature:null,humidity:'',pressure:undefined,windSpeedKmh:0}]),date,city,race);assert.deepEqual(clone(x.weather),{windSpeedKmh:0});
 for(const r of [{...report,date:'2026-09-30'},{...report,city:'Ankara'}])assert.deepEqual(clone(api.context(index([r]),date,city,race).weather),{});
 assert.equal(api.similarity({weather:{temperature:null}},{weather:{temperature:20}}).weight,1);
});
test('maintenance requires availability evidence and is strictly scoped to the racing surface',()=>{
 assert.equal(api.context(index([report]),date,city,race).maintenance,null);
 const r={...report,maintenanceAvailableAt:'2026-10-01T14:00:00+03:00'},map=index([r]);
 assert.equal(api.context(map,date,city,race).maintenance.watering,true);assert.equal(api.context(map,date,city,{...race,track:'Çim'}).maintenance.mowing,true);
 assert.equal(api.context(index([{...r,maintenanceAvailableAt:'2026-10-01T18:00:00+03:00'}]),date,city,race).maintenance,null);
 assert.equal(api.context(index([{...r,maintenance:{bySurface:{trainingSand:{roller:true}}}}]),date,city,race).maintenance,null);
});
test('archived daily weather is labeled retrospective and cannot enter before its date',()=>{
 const r={...report,date:'2026-09-01',time:'19:00'};assert.equal(api.context(index([r]),r.date,city,{},'reference',date).source,'ARCHIVED_DAILY_OBSERVATION');assert.equal(api.context(index([report]),date,city,{},'reference',date).weather.temperature,undefined);
});
const records=Array.from({length:6},(_,i)=>({date:`2026-09-0${i+1}`,city,race:{...race,winner:{degree:i<3?'1.30.00':'1.40.00'}}}));
const rows=records.map((r,i)=>({...report,date:r.date,temperature:i<3?25:50}));
const input={row:{history:{degreeSamples:[{date:'2026-09-20',city,distance:1400,track:'Kum',sec:97}]}},program:{weight:55},race,records,city,date};
test('verified conditions weight comparable references, missing conditions stay neutral and uncertain',()=>{
 const plain=core.predict({...input,conditions:index([])}),matched=core.predict({...input,conditions:index([...rows,report])});assert.equal(plain.baselineSec,95);assert.equal(matched.baselineSec,90);assert.equal(matched.normalization.reference.conditions.matched,6);assert.equal(matched.normalization.reference.conditions.active,true);assert.ok(plain.uncertaintySec>matched.uncertaintySec);
 const after=core.predict({...input,conditions:index([...rows,{...report,time:'19:00'}])});assert.equal(after.baselineSec,95);assert.equal(after.normalization.reference.conditions.active,false);
 assert.equal(core.predict({...input,row:{history:{degreeSamples:[]}},conditions:index([...rows,report])}).predictedSec,null);
});
test('indexed and nonindexed conditions yield identical models and future outcomes stay excluded',()=>{
 const conditions=index([...rows,report]),a=core.predict({...input,conditions});assert.deepEqual(clone(a),clone(core.predict({...input,conditions,referenceIndex:core.createReferenceIndex(records)})));
 assert.equal(core.predict({...input,records:[...records,{...records[0],date,winnerSec:1,race:{...race,winner:{degree:'1.10.00'}}}],conditions}).baselineSec,a.baselineSec);
});
test('legacy history bridge cannot overwrite modern D or promote missing personal history',async()=>{
 window.AT_AI_LOCAL_ARCHIVE={horseHistory:async()=>({record:{races:[{date:'2026-09-20',finish:1,degree:'1.20.00',distance:1400,track:'Kum',city},{date:null,finish:1},{date,finish:1}]}})};
 vm.runInNewContext(fs.readFileSync(new URL('../history-form-bridge-f60943211.js',import.meta.url),'utf8'),env);
 const rows=[{program:{id:1},D:55,analysis:{degreeModel:{version:core.version}},historyDegreeNormSec:80},{program:{id:2},D:null,analysis:{degreeModel:{version:core.version,referenceOnly:true}},historyDegreeNormSec:70}];await window.ATHistoryFormBridge.apply(rows,{date,city,distance:1400,track:'Kum'});assert.equal(rows[0].D,55);assert.equal(rows[1].D,null);assert.equal(rows[0].F,100);assert.equal(rows[1].historyDegreeRank,undefined);
});

test('documented maintenance after the race is excluded even when its PDF was available before race',()=>{const r={...report,maintenanceAvailableAt:'2026-10-01T14:00:00+03:00',maintenance:{bySurface:{sand:{observationKind:'DOCUMENTED_SCHEDULE',events:[{operation:'watering',date,time:'13:00'},{operation:'harrow',date,time:'18:00'},{operation:'roller',date,time:'19:00'},{operation:'mowing',date:'2026-10-02',time:'10:00'}]}}}};const m=api.context(index([r]),date,city,race).maintenance;assert.equal(m.watering,true);assert.equal(m.harrow,null);assert.equal(m.roller,null);assert.equal(m.mowing,null);assert.equal(m.events.length,1)});
