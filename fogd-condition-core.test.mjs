import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHorseHistory} from './api/tjk-horse-history-v1.js';

const sandbox={};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('./fogd-condition-core.js',import.meta.url),'utf8'),sandbox);
const core=sandbox.ATFogdConditionCoreV1;
const json=value=>JSON.parse(JSON.stringify(value));
const race={no:6,distance:1500,track:'Sentetik',class:'ŞARTLI 4/DHÖW'};
const context=core.contextFor(race,'2026-09-29','Adana');
function history(date,city,distance,track,finish,degree,weight=58){return{date,city,distance,track,finish,degree,weight}}
const emsidiHistory=[
  history('2026-09-29','Adana',1500,'S:Normal',1,'1.43.40',59.5),
  history('2026-09-13','Adana',1500,'K:Normal',9,'1.52.24',56.5),
  history('2026-09-06','Adana',1200,'S:Normal',4,'1.22.68',56),
  history('2026-08-26','Elazığ',1700,'K:Normal',16,'2.40.58',56),
  history('2026-01-31','İstanbul',1500,'S:Normal',4,'1.42.00',58),
  history('2026-01-03','İstanbul',1500,'S:Normal',1,'1.41.95',57),
  history('2024-10-20','İstanbul',1400,'S:Normal',3,'1.34.66',58.5),
  history('2024-08-28','İstanbul',1300,'S:Normal',2,'1.27.52',60)
];
function preparedScores(values,key='F'){
  return{context,rows:values.map((value,index)=>({row:{no:index+1,name:`At ${index+1}`},scores:Object.fromEntries(core.KEYS.map(k=>[k,k===key?value:null])),
    history:{protectedCandidate:false},degree:{},historyAvailable:true,formSource:'KOŞUL GEÇMİŞİ'}))};
}

test('gap boundaries are inclusive at 5 and 10 without overlapping bands',()=>{
  assert.equal(core.band(5),1);assert.equal(core.band(5.01),.5);
  assert.equal(core.band(10),.5);assert.equal(core.band(10.01),0);
});
test('40 percent does not saturate; more than 40 percent in either band does',()=>{
  let result=core.assessPrepared(preparedScores([100,96,75,60,45]));
  assert.equal(result.columns.F.saturated,false);assert.equal(result.ranking[1].score,1);
  result=core.assessPrepared(preparedScores([100,99,98,50,40]));
  assert.equal(result.columns.F.saturated,true);assert.equal(result.ranking[0].score,.25);
  result=core.assessPrepared(preparedScores([100,94,93,92,50]));
  assert.equal(result.columns.F.follow,3);assert.equal(result.columns.F.saturated,true);
  assert.equal(result.ranking[1].score,.125);
});
test('combined near bands do not saturate if neither exceeds 40 percent',()=>{
  const result=core.assessPrepared(preparedScores([100,96,94,91,70]));
  assert.equal(result.columns.F.strong,2);assert.equal(result.columns.F.follow,2);
  assert.equal(result.columns.F.saturated,false);
});
test('missing scores are excluded from the saturation denominator, real zero is valid',()=>{
  const result=core.assessPrepared(preparedScores([100,99,null,null,0]));
  assert.equal(result.columns.F.valid,3);assert.equal(result.columns.F.saturated,true);
  assert.equal(core.finite('—'),null);assert.equal(core.finite(null),null);assert.equal(core.finite(0),0);
});
test('surface recognition respects explicit TJK S/K/Ç codes for every city',()=>{
  for(const[track,expected]of[['S:Normal','SENTETIK'],['Sentetik','SENTETIK'],['K:Nemli','KUM'],['Kum','KUM'],['Ç:Ağır 4.6','CIM'],['Çim','CIM']])assert.equal(core.surface(track),expected);
  for(const city of['Adana','İstanbul','Antalya','Elazığ','Ankara','Bursa','İzmir','Şanlıurfa','Diyarbakır','Kocaeli'])assert.equal(core.contextFor(race,'2026-09-29',city).surface,'SENTETIK');
  assert.equal(core.surface('bilinmiyor'),'');
});
test('history excludes race day, future, undated, invalid date and non-runners',()=>{
  const rows=core.normalizeHistory([...emsidiHistory,{...emsidiHistory[4],date:''},{...emsidiHistory[4],date:'2026-02-30'},
    {...emsidiHistory[4],date:'2026-10-01'},{...emsidiHistory[4],date:'2026-09-12',finish:'Koşmaz'}],'2026-09-29');
  assert.equal(rows.length,7);assert.ok(rows.every(r=>r.date<'2026-09-29'));
});
test('cached malformed generic fields are repaired from exact raw TJK headers',()=>{
  const rows=core.normalizeHistory([{distance:'1',finish:'1500',weight:'1',track:'yanlış',date:'2026-01-03',raw:{Tarih:'03.01.2026',Şehir:'İstanbul',Msf:'1500',Pist:'S:Normal',S:'1',Derece:'1.41.95',Sıklet:'57'}}],'2026-09-29');
  assert.equal(rows[0].distance,1500);assert.equal(rows[0].finish,1);assert.equal(rows[0].weight,57);assert.equal(rows[0].surface,'SENTETIK');
});
test('EMSİDİ has four matching top-four records before the target race, not the target win',()=>{
  const result=core.conditionHistory(emsidiHistory,context);
  assert.equal(result.starts,4);assert.equal(result.top4,4);assert.equal(result.wins,1);
  assert.equal(result.protectedCandidate,true);
  assert.ok(result.compatible.every(r=>r.date<'2026-09-29'&&r.surface==='SENTETIK'));
  assert.ok(result.form>70);
});
test('ancient, one-start or mismatched-surface results do not grant protection',()=>{
  assert.equal(core.conditionHistory([emsidiHistory[4]],context).protectedCandidate,false);
  assert.equal(core.conditionHistory(emsidiHistory.slice(6),context).protectedCandidate,false);
  assert.equal(core.conditionHistory(emsidiHistory,{...context,surface:'CIM'}).protectedCandidate,false);
});
test('raw foreign-city degrees are never pooled without learned matching standards',()=>{
  const h=core.conditionHistory(emsidiHistory,context),d=core.degreeEvidence(h,context);
  assert.equal(d.predictedSec,null);assert.equal(d.trusted,false);assert.equal(d.samples,0);
});
test('city conversion requires separate past standards for correct breed and surface',()=>{
  const records=[];
  for(const city of['Adana','İstanbul'])for(let i=1;i<=3;i++)records.push({date:`2026-02-0${i}`,city,race:{no:i,track:'Sentetik',distance:1500,class:'ŞARTLI 4/DHÖW',winner:{degree:city==='Adana'?'1.44.00':'1.42.00'}}});
  records.push({date:'2026-09-29',city:'Adana',race:{no:6,track:'Sentetik',distance:1500,class:'ŞARTLI 4/DHÖW',winner:{degree:'0.50.00'}}});
  const standards=core.buildStandards(records,'2026-09-29');
  const d=core.degreeEvidence(core.conditionHistory(emsidiHistory,context),context,standards);
  assert.equal(d.samples,2);assert.ok(d.predictedSec>103&&d.predictedSec<105);assert.equal(d.trusted,true);
  assert.equal(core.degreeEvidence(core.conditionHistory(emsidiHistory,context),{...context,breed:'INGILIZ'},standards).samples,0);
  assert.equal(core.buildStandards(records.slice(0,2),'2026-09-29').size,0);
});
test('same city exact-distance degree needs two consistent own records',()=>{
  const rows=[history('2026-09-01','Adana',1500,'Sentetik',2,'1.43.40'),history('2026-08-01','Adana',1500,'Sentetik',3,'1.43.90')];
  assert.equal(core.degreeEvidence(core.conditionHistory(rows,context),context).trusted,true);
  assert.equal(core.degreeEvidence(core.conditionHistory(rows.slice(0,1),context),context).trusted,false);
});
test('small time gap remains a small D gap; race min/max cannot exaggerate it',()=>{
  const rows=[103.40,103.86].map((sec,index)=>({no:index+1,F:60,D:99,
    historyRecords:[history('2026-09-01','Adana',1500,'Sentetik',2,sec),history('2026-08-01','Adana',1500,'Sentetik',3,sec)]}));
  const p=core.prepareRows({rows},race,{date:'2026-09-29',city:'Adana'});
  assert.equal(p.rows[0].scores.D,100);assert.ok(p.rows[0].scores.D-p.rows[1].scores.D<2);
  assert.equal(rows[0].D,99);
});
test('fallback raw D is excluded; the source nine-column snapshot stays unchanged',()=>{
  const s={rows:[{no:1,F:58.8,D:86.8,T:66.5,conditionHistoryRecords:emsidiHistory},{no:2,F:76,D:99.7}]};
  const before=JSON.stringify(s),p=core.prepareRows(s,race,{date:'2026-09-29',city:'Adana'});
  assert.equal(p.rows[0].scores.D,null);assert.equal(p.rows[1].scores.D,null);
  assert.equal(JSON.stringify(s),before);
});
test('E and T never add to seven-column score; E needs verified team data',()=>{
  const p=preparedScores([100,70,50,30]);p.rows[0].row.E=100;p.rows[0].row.T=100;
  let result=core.assessPrepared(p);assert.equal(result.ranking[0].score,1);assert.equal(result.ranking[0].confirmations.E,false);assert.equal(result.ranking[0].confirmations.T,true);
  p.rows[0].row.connectionMeta={verified:2};result=core.assessPrepared(p);assert.equal(result.ranking[0].confirmations.E,true);assert.equal(result.ranking[0].score,1);
});
test('main/watch thresholds and corroboration are applied without first-four truncation',()=>{
  const p=preparedScores([100,70,50,30,20]);
  for(const row of p.rows){row.scores.O=0;row.scores.G=0}
  for(const key of['O','G'])p.rows[0].scores[key]=100;
  p.rows[1].scores.O=100;p.rows[1].scores.G=100;p.rows[1].row.T=99;
  p.rows[0].row.T=100;
  const r=core.assessPrepared(p);
  assert.equal(r.ranking.find(x=>x.no===1).group,'main');assert.equal(r.ranking.find(x=>x.no===2).group,'watch');
  assert.equal(r.ranking.length,5);assert.equal(r.singleQualified,false);
});
test('KU v2 never promotes a zero-proximity horse only from historical protection',()=>{
  const emsidi={no:3,name:'EMSİDİ',F:58.8,O:55.4,G:57.5,D:86.8,J:51.4,S:50.9,A:53.5,E:51.9,T:66.5,historyRecords:emsidiHistory};
  const rivals=[1,2,4,5,6].map((no,i)=>({no,name:`Rakip ${no}`,F:100-i*12,O:100-i*12,G:100-i*12,D:99.7,J:100-i*12,S:100-i*12,A:100-i*12,historyRecords:[]}));
  const snapshot={rows:[emsidi,...rivals]},before=JSON.stringify(snapshot);
  const t=core.buildAllRacesTemplate({races:[race],snapshotsByRace:new Map([['6',snapshot]]),date:'2026-09-29',city:'Adana'});
  const row=t.legs[0].ranking.find(x=>x.no===3);assert.ok(row);assert.equal(row.score,0);assert.equal(row.group,'outside');assert.ok(row.history.conditionScore!==null);
  assert.equal(JSON.stringify(snapshot),before);
});

test('empty automatic group remains manually reviewable and never manufactures a single',()=>{
  const t=core.buildAllRacesTemplate({races:[race],snapshotsByRace:new Map([['6',{rows:[{no:1,F:100},{no:2,F:100}]}]]),date:'2026-09-29',city:'Adana'});
  assert.equal(t.legs[0].available,true);assert.equal(t.legs[0].selections.length,0);assert.equal(t.legs[0].single,false);assert.equal(t.complete,false);
  assert.equal(t.legs[0].conditionSummary.uncertainty,'yüksek');
});
test('single needs score and independent sources plus complete matching-condition history',()=>{
  const p=preparedScores([100,60,40,20]);
  for(const[index,row]of p.rows.entries()){
    row.history.starts=2;for(const key of core.KEYS)row.scores[key]=index?20:100;
  }
  let r=core.assessPrepared(p);assert.equal(r.singleQualified,true);assert.equal(r.ranking[0].strongSources,7);
  p.rows[1].history.starts=0;r=core.assessPrepared(p);assert.equal(r.singleQualified,false);assert.equal(r.uncertainty,'yüksek');
  p.rows[1].history.starts=2;p.rows[0].historyAvailable=false;r=core.assessPrepared(p);assert.equal(r.singleQualified,false);
});
test('withdrawn horses are omitted only from the tenth template',()=>{
  const t=core.buildAllRacesTemplate({races:[{...race,horses:[{no:1,withdrawn:true},{no:2}]}],snapshotsByRace:new Map([['6',{rows:[{no:1,F:100},{no:2,F:70}]}]]),date:'2026-09-29',city:'Adana'});
  assert.deepEqual(json(t.legs[0].ranking.map(x=>x.no)),[2]);
});
test('TJK parser matches the real short headers and ignores summary tables',()=>{
  const source=`<h2>EMSİDİ</h2><table><tr><th>TOPLAM</th><th>K.</th></tr><tr><td>33</td><td>6</td></tr></table>
    <table><thead><tr><th></th><th>Tarih</th><th>Şehir</th><th>Msf</th><th>Pist</th><th>S</th><th>Derece</th><th>Sıklet</th><th>Gny</th><th>Grup</th><th>K. No-K. Adı</th><th>Kcins</th><th>HP</th></tr></thead>
    <tbody><tr><td></td><td>03.01.2026</td><td>İstanbul</td><td>1500</td><td>S:Normal</td><td>1</td><td>1.41.95</td><td>57</td><td>12,2</td><td>4+A</td><td>8</td><td>Handikap 17</td><td>79</td></tr></tbody></table>`;
  const parsed=parseHorseHistory(source);assert.equal(parsed.races.length,1);
  const row=parsed.races[0];assert.equal(row.distance,'1500');assert.equal(row.finish,'1');assert.equal(row.weight,'57');assert.equal(row.odds,'12,2');assert.equal(row.raceType,'Handikap 17');assert.equal(row.raceNo,'8');
});
