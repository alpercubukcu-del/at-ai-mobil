import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parseRows} from '../api/tjk-race-query-v1.js';
const window={addEventListener(){}};vm.runInNewContext(fs.readFileSync(new URL('../reference-archive-v17412.js',import.meta.url),'utf8'),{window,Date,setTimeout,clearTimeout});const api=window.ATReferenceArchiveV17412;
const row={date:'2026-09-30',city:'Kocaeli',raceNo:1,group:'3 Yaşlı Araplar',raceType:'Handikap 14 /DHÖ /Dişi /H2',distance:1400,track:'Kum',winner:'AT 1',winnerDegree:'1.36.96'};
const job={start:'2026-09-29',end:'2026-09-30',cursor:'2026-09-29',windowEnd:'2026-09-30',page:0,processed:0,total:0,pageSize:0,seen:0,fingerprints:[]};
test('TJK common CSS prefix cannot turn a date into a race number or winner into age',()=>{const p=parseRows(fs.readFileSync(new URL('fixtures/race-query-columns.html',import.meta.url),'utf8'));assert.deepEqual(p.rows.map(r=>r.raceNo),[1,2]);assert.equal(p.rows[0].winner,'EUROFIGHTER');assert.equal(p.rows[0].age,'3y d e');assert.equal(p.rows[0].hp,48);assert.equal(new Set(p.rows.map(r=>r.key)).size,2)});
test('query summaries use the exact store schema consumed by the degree history model',()=>{const r=api.normalize(row);assert.equal(r.key,'result|2026-09-30|KOCAELI|1');assert.equal(r.race.winner.degree,'1.36.96');assert.equal(r.race.ageGroup,row.group);assert.equal(r.race.class,row.raceType);assert.equal(r.referenceOnly,true);assert.equal(r.race.rows.length,0);assert.throws(()=>api.normalize({...row,raceNo:30.09}));assert.throws(()=>api.normalize({...row,winnerDegree:''}))});
test('importing references preserves existing full results and actual finish data',()=>{const old={key:'old',race:{rows:[{horseName:'AT 1',finish:1}],winner:{degree:'1.36.96'},class:'Handikap 14'}};const merged=api.mergeRecord(old,api.normalize(row));assert.deepEqual(merged.race.rows,old.race.rows);assert.equal(merged.race.class,old.race.class);assert.equal(merged.referenceOnly,false);assert.equal(merged.referenceQuery.winner,row.winner)});
test('page checkpoint advances only with complete distinct and in-range rows',()=>{const a=api.advance(job,{rows:[row],total:2,rawRowCount:1});assert.equal(a.next.page,1);assert.equal(a.next.cursor,job.cursor);assert.throws(()=>api.advance(a.next,{rows:[row],total:2}),/aynı sayfayı/);assert.throws(()=>api.advance(a.next,{rows:[],total:2}),/boş/);assert.throws(()=>api.advance(job,{rows:[row,row],total:2}),/tekrar/);assert.throws(()=>api.advance(job,{rows:[{...row,date:'2026-10-01'}],total:1}),/dışında/);const b=api.advance(a.next,{rows:[{...row,raceNo:2}],total:2,rawRowCount:1});assert.equal(b.next.status,'complete');assert.equal(b.next.processed,2)});
test('free date ranges are validated without fixed historical limits',()=>{assert.equal(api.validRange('2007-02-11','2026-09-30'),true);assert.equal(api.validRange('2026-02-30','2026-03-01'),false);assert.equal(api.validRange('2026-10-01','2026-09-30'),false)});

test('automatic permanent writes preserve existing full results and commit the job after data',async()=>{
 const files=new Map(),writes=[];
 const dir={async getFileHandle(name,opts){if(!files.has(name)&&!opts?.create){const e=Error('missing');e.name='NotFoundError';throw e}return{async getFile(){return{text:async()=>files.get(name)}},async createWritable(){let data;return{async write(s){data=s},async close(){files.set(name,data);writes.push(name)},async abort(){}}}}}};
 window.ATArchiveDirectoryV1741={ensure:async()=>({getDirectoryHandle:async()=>dir})};
 const normalized=api.normalize(row),full={...normalized,race:{...normalized.race,rows:[{finish:1,horseName:'AT 1'}]}};
 files.set('Kosu-Sorgulama-2026.json',JSON.stringify({rows:[full]}));
 await api.savePermanentPage([normalized],{cursor:'2026-10-01'});
 const data=JSON.parse(files.get('Kosu-Sorgulama-2026.json'));assert.equal(data.rows.length,1);assert.equal(data.rows[0].race.rows.length,1);
 assert.deepEqual(writes,['Kosu-Sorgulama-2026-09-30.json','Kosu-Sorgulama-ISLEM.json']);assert.equal(JSON.parse(files.get('Kosu-Sorgulama-2026-09-30.json')).rows.length,1);assert.equal(JSON.parse(files.get('Kosu-Sorgulama-ISLEM.json')).job.cursor,'2026-10-01');
});
test('folder write failure cannot be reported as a completed checkpoint',async()=>{
 let checkpoint=false;window.ATArchiveDirectoryV1741={ensure:async()=>({getDirectoryHandle:async()=>({async getFileHandle(name,opts){if(!opts){const e=Error('missing');e.name='NotFoundError';throw e}if(name.includes('ISLEM'))checkpoint=true;return{createWritable:async()=>({write:async()=>{throw Error('disk full')},abort:async()=>{}})}}})})};
 await assert.rejects(api.savePermanentPage([api.normalize(row)],{cursor:'2026-10-01'}),e=>e.code==='PERMANENT_ARCHIVE_WRITE');assert.equal(checkpoint,false);
});
test('historical comparison requires the selected class, group, track and distance and excludes target/future dates',()=>{
 const target={date:'2026-10-04',city:'Adana',raceType:'Maiden/Dişi',group:'2 Yaşlı İngilizler',distance:1400,track:'Sentetik'};
 const r=api.normalize({...row,date:'2025-10-04',city:'Adana',raceType:'Maiden /Dişi',group:target.group,distance:1400,track:'Sentetik',hp:0,winnerWeight:55.5,origin:'BABA - ANNE',age:'2y d d'});
 assert.equal(api.comparisonMatches(r,target,{city:'Adana'}),true);
 for(const patch of [{date:'2026-10-04'},{date:'2027-10-04'},{referenceQuery:{...r.referenceQuery,group:'3 Yaşlı İngilizler'}},{referenceQuery:{...r.referenceQuery,track:'Kum'}},{referenceQuery:{...r.referenceQuery,distance:1500}},{referenceQuery:{...r.referenceQuery,raceType:'ŞARTLI 3/Dişi'}}])assert.equal(api.comparisonMatches({...r,...patch},target,{city:'Adana'}),false);
 assert.equal(api.comparisonMatches({...r,city:'İzmir'},target,{city:'Adana'}),false);assert.equal(api.comparisonMatches({...r,city:'İzmir'},target,{city:''}),true);
 assert.equal(api.comparisonMatches(r,target,{start:'2025-10-05'}),false);
 const output=api.comparisonRow(r);assert.equal(output.hp,0);assert.equal(output.winnerWeight,55.5);assert.equal(output.age,'2y d d');assert.equal(output.origin,'BABA - ANNE');
});
test('all TJK comparison columns render, unsafe links and markup cannot enter the table',()=>{
 const output=api.comparisonRow(api.normalize({...row,date:'2025-10-04',origin:'<img src=x>',hp:0,age:'4y d k',winnerWeight:56,prize:280000,resultUrl:'javascript:alert(1)',winnerUrl:'https://evil.test/'}));
 const html=api.comparisonTable([output]);assert.equal((html.match(/<th scope=/g)||[]).length,15);for(const label of ['Apr. Koş. Cinsi','Sıklet','Orijin (Baba-Anne)','İkramiye','Birinci','Yaş','H. Puanı'])assert.ok(html.includes(label));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('javascript:'));assert.ok(!html.includes('evil.test'));assert.ok(html.includes('GunlukYarisSonuclari'));
});
test('full results supply the actual winning horse fields; a conflicting query winner cannot inherit another horse\'s HP or weight',()=>{
 const r={date:'2025-10-04',city:'Adana',raceNo:1,race:{class:'Maiden/Dişi',ageGroup:'2 Yaşlı İngilizler',distance:1400,track:'Sentetik',winner:{horseName:'KAZANAN',degree:'1.26.62'},rows:[{finish:2,horseName:'İKİNCİ',hp:80,weight:60},{finish:1,horseName:'KAZANAN',hp:0,actualWeight:54.5,age:'2y d d',origin:'BABA - ANNE',degree:'1.26.62'}]}};
 const output=api.comparisonRow(r);assert.equal(output.hp,0);assert.equal(output.winnerWeight,54.5);assert.equal(output.origin,'BABA - ANNE');
 const conflict=api.comparisonRow({...r,referenceQuery:{winner:'BAŞKA AT',winnerDegree:'1.28.00'}});assert.equal(conflict.winner,'BAŞKA AT');assert.equal(conflict.hp,null);assert.equal(conflict.winnerWeight,null);
});
test('comparison initially orders historical winners by newest date',()=>{
 const rows=api.sortComparison([{date:'2025-10-04',raceNo:2},{date:'2024-10-04',raceNo:1},{date:'2026-10-03',raceNo:3}]);assert.deepEqual(Array.from(rows,r=>r.date),['2026-10-03','2025-10-04','2024-10-04']);
});

test('condition flags match in either order without dropping female or handicap qualifiers',()=>{const target={date:'2026-10-04',group:'3 ve Yukarı İngilizler',distance:1700,track:'Kum',raceType:'Handikap 14 /Dişi /H2'};const r=api.normalize({...row,date:'2025-10-04',group:target.group,distance:1700,track:'Kum',raceType:'Handikap 14/H2/Dişi'});assert.equal(api.comparisonMatches(r,target),true);assert.equal(api.comparisonMatches({...r,referenceQuery:{...r.referenceQuery,raceType:'Handikap 14/H2'}},target),false)});
