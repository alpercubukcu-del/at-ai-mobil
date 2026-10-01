import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const window={addEventListener(){}};
vm.runInNewContext(fs.readFileSync(new URL('../degree-calibration-v1744.js',import.meta.url),'utf8'),{window,document:{readyState:'loading',addEventListener(){}},console,setTimeout,clearTimeout,setInterval:()=>0});
const api=window.ATDegreeCalibrationV1744;
const program={no:1,time:'16:00',track:'Sentetik',distance:1400,class:'ŞARTLI 4'};
const result={degreeSpeed:{trackContext:{weather:{temperature:20}}},races:[{no:1,horses:[{no:1,name:'EMSİDİ',degreeModel:{predictedSec:92,uncalibratedSec:90,rank:1,autoCalibration:{active:true,seconds:2}}}]}]};
const make=()=>api.forecast(result,result.races[0],program,{date:'2026-10-01',city:'Adana',now:new Date('2026-10-01T12:00:00Z')});
const actual={date:'2026-10-01',city:'Adana',raceNo:1,race:{rows:[{programNo:1,horseName:'EMSİDİ',degree:'1.33.00',finish:1}]}};
function samples(n=68,races=10){return Array.from({length:n},(_,i)=>({schema:1744,date:'2026-09-29',city:'Adana',raceKey:`race${i%races}`,trackContext:{surface:'Sentetik',distance:1400,weather:{}},rawErrorSec:2,timeErrorSec:0}))}
test('pre-race gate uses Istanbul time and rejects past races, known results and missing times',()=>{
 assert.equal(api.eligible('2026-10-01',program,new Date('2026-10-01T12:00:00Z')),true);
 assert.equal(api.eligible('2026-10-01',program,new Date('2026-10-01T13:00:00Z')),false);
 assert.equal(api.eligible('2026-09-30',program,new Date('2026-10-01T12:00:00Z')),false);
 assert.equal(api.eligible('2026-10-02',program,new Date('2026-10-01T12:00:00Z'),true),false);
 assert.equal(api.eligible('2026-10-01',{},new Date('2026-10-01T12:00:00Z')),false);
});
test('forecast stores race-specific surface, distance and the uncorrected prediction',()=>{const p=make();assert.equal(p.locked,true);assert.equal(p.trackContext.surface,'SENTETIK');assert.equal(p.trackContext.distance,1400);assert.equal(p.horses[0].uncalibratedSec,90);assert.equal(result.degreeSpeed.trackContext.surface,undefined)});
test('result join measures published and raw errors separately',()=>{const s=api.buildSamples([make()],[actual]);assert.equal(s.length,1);assert.equal(s[0].timeErrorSec,1);assert.equal(s[0].rawErrorSec,3);assert.equal(s[0].actualFinish,1)});
test('post-result analyses, legacy forecasts and fallback degrees never become training samples',()=>{const p=make();for(const change of [{schema:1},{eligibleForCalibration:false},{horses:[{...p.horses[0],fallback:true}]}])assert.equal(api.buildSamples([{...p,...change}],[actual]).length,0)});
test('horse numbers cannot join a different horse into training data',()=>{const wrong=structuredClone(actual);wrong.race.rows[0].horseName='OTHER HORSE';assert.equal(api.buildSamples([make()],[wrong]).length,0)});
test('one race with many horses cannot activate calibration',()=>{assert.equal(api.adjustment(samples(30,1),'Adana',program,{},'2026-10-01').active,false);assert.equal(api.adjustment(samples(11,3),'Adana',program,{},'2026-10-01').active,false)});
test('only earlier dates and comparable city, surface and distances contribute',()=>{const valid=samples(),bad=valid.map(s=>({...s,date:'2026-10-01',rawErrorSec:-100}));bad.push(...valid.map(s=>({...s,city:'İstanbul'})),...valid.map(s=>({...s,trackContext:{surface:'Kum',distance:1400}})),...valid.map(s=>({...s,trackContext:{surface:'Sentetik',distance:2100}})));const a=api.adjustment([...valid,...bad],'Adana',program,{},'2026-10-01');assert.equal(a.samples,68);assert.equal(a.seconds,2)});
test('learning the raw error prevents oscillation after a correction already worked',()=>{const a=api.adjustment(samples(),'Adana',program,{},'2026-10-01');assert.equal(a.seconds,2);assert.equal(a.active,true)});
test('sparse evidence dampens correction and large errors are bounded',()=>{const a=api.adjustment(samples(12,3),'Adana',program,{},'2026-10-01');assert.equal(a.seconds,.133);const b=api.adjustment(samples().map(s=>({...s,rawErrorSec:100})),'Adana',program,{},'2026-10-01');assert.equal(b.seconds,3)});
test('a result without a valid time is excluded',()=>{const bad=structuredClone(actual);bad.race.rows[0].degree='Derecesiz';assert.equal(api.buildSamples([make()],[bad]).length,0)});

test('legacy forecasts remain intact after results and are backed up before a new eligible forecast',()=>{const old={schema:1,horses:[{predictedSec:85}]},fresh=make();assert.equal(api.chooseForecast(old,{...fresh,eligibleForCalibration:false}),old);const upgraded=api.chooseForecast(old,fresh);assert.equal(upgraded.legacyForecast,old);assert.equal(upgraded.schema,1744);assert.equal(api.chooseForecast(fresh,{...fresh,horses:[]}),fresh)});
