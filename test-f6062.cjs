const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('./calendar-multifilter-core-v1691f662.js','utf8');
const sandbox={module:{exports:{}},exports:{},console};
vm.runInNewContext(src,sandbox,{filename:'calendar-multifilter-core-v1691f662.js'});
const core=sandbox.module.exports;
const t=core.selfTest();
assert.equal(t.ok,true);
const rows=[
 {date:'2024-01-10',city:'İstanbul',groupRaw:'3 Yaşlı İngilizler',classKey:'SARTLI5',distance:1400,track:'Çim'},
 {date:'2024-01-11',city:'Ankara',groupRaw:'3 Yaşlı İngilizler',classKey:'SARTLI5',distance:1600,track:'Sentetik'},
 {date:'2024-01-12',city:'İzmir',groupRaw:'3 Yaşlı İngilizler',classKey:'SARTLI5',distance:1800,track:'Kum'}
];
const f={startDate:'2024-01-01',endDate:'2024-01-31',cities:['İstanbul','Ankara'],distances:[1400,1600],tracks:['Çim','Sentetik']};
assert.deepEqual(Array.from(rows.filter(r=>core.rowPasses(r,f)).map(r=>r.city)),['İstanbul','Ankara']);
const target={...rows[1]};
assert.equal(core.classify(target,target),'EXACT');
assert.notEqual(core.classify(target,{...target,distance:1400}),'EXACT');
assert.equal(core.normalizeRange('2025-12-31','2024-01-01').start,'2024-01-01');
console.log('[F60.62 TEST] PASS', {core:t.tests,multiFilter:1,exactGuard:1,calendarSwap:1});
