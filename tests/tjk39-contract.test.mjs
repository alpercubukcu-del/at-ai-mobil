import test from 'node:test';
import assert from 'node:assert/strict';
import {ORIGINAL_FIELDS,AGF_FIELDS,ALL_FIELDS,normalizeAgf,toCanonical39,inspect39} from '../validation/tjk39-contract.mjs';

const expected35='der,pno,kilo,ganyan,tarih,mes,ikramiye,yarrno,yas,kno,hpu,hsi,gsi,hpo,ghpo,g2hpo,sno,atadi,akses,orjin,jokey,jimi,sahip,antrenor,muddet,sehir,yaradi1,yaradi2,yaradi3,pist,irk,pdurum,uyr,ci,yaradi4'.split(',');
const valid39 = () => toCanonical39({der:1,pno:7,tarih:'2026-11-04',yarrno:6,atadi:'ÖRNEK',agfs1:3,agfo1:'%12,50'});

test('Orijinal 35 sütun doğru sıralamayla korunur',()=>assert.deepEqual(ORIGINAL_FIELDS,expected35));
test('AGF sütunları 36–39 sıradadır ve adları doğrudur',()=>{
  assert.equal(ALL_FIELDS.length,39);
  assert.equal(new Set(ALL_FIELDS).size,39);
  assert.deepEqual(AGF_FIELDS,['agfs1','agfo1','agfs2','agfo2']);
  assert.deepEqual(ALL_FIELDS.slice(35),AGF_FIELDS);
});
test('39 sütun eksiksiz ve orijinal sıradadır',()=>{
  const row=valid39();
  assert.deepEqual(Object.keys(row),ALL_FIELDS);
  assert.equal(row.der,1);
  assert.equal(row.pno,7);
  assert.equal(row.atadi,'ÖRNEK');
  assert.deepEqual(inspect39(row).errors,[]);
});
test('AGF1 sıra, AGF1 oran olarak ayrılır; virgül ve yüzde işlenir',()=>{
  assert.deepEqual(normalizeAgf({agfs1:'1',agfo1:'%35,75'}),{agfs1:1,agfo1:35.75,agfs2:null,agfo2:null});
});
test('AGF2 yoksa alanlar null kalır, AGF1 kopyalanmaz',()=>{
  const row=valid39();
  assert.equal(row.agfs2,null);
  assert.equal(row.agfo2,null);
  assert.equal(inspect39(row,{raceNo:6,secondSixStartRaceNo:5}).ok,true);
});
test('Gerçek ikinci altılı 4. koşudan başlarsa koşu 4 için AGF2 doğrulanır',()=>{
  const row=toCanonical39({agfs1:1,agfo1:33,agfs2:2,agfo2:22});
  assert.equal(inspect39(row,{raceNo:4,secondSixStartRaceNo:4}).ok,true);
});
test('Gerçek ikinci altılı 5. koşudan başlarsa koşu 4 için AGF2 reddedilir',()=>{
  const row=toCanonical39({agfs1:1,agfo1:33,agfs2:2,agfo2:22});
  const audit=inspect39(row,{raceNo:4,secondSixStartRaceNo:5});
  assert.equal(audit.ok,false);
  assert.match(audit.errors.join(' '),/başlamadan önce/);
});
test('Gerçek ikinci altılı 6. koşudan başlarsa koşu 6 kabul edilir',()=>{
  const row=toCanonical39({agfs2:2,agfo2:15});
  assert.equal(inspect39(row,{raceNo:6,secondSixStartRaceNo:6}).ok,true);
});
test('Başlangıç metaverisi yoksa AGF2 korunur ve uyarılır',()=>{
  const row=toCanonical39({agfs2:2,agfo2:15});
  const audit=inspect39(row,{raceNo:6});
  assert.equal(audit.ok,true);
  assert.match(audit.warnings.join(' '),/doğrulanmadı/);
  assert.equal(row.agfo2,15);
});
test('Eksik AGF2 sıra/oran çifti geçersizdir',()=>{
  const row=toCanonical39({agfs2:2});
  assert.equal(inspect39(row,{raceNo:6,secondSixStartRaceNo:5}).ok,false);
});
test('AGF sıra tamsayı, AGF oran 0–100 aralığıdır',()=>{
  assert.throws(()=>normalizeAgf({agfs1:1.5,agfo1:20}),/tamsayı/);
  assert.throws(()=>normalizeAgf({agfs1:1,agfo1:120}),/0–100/);
  assert.equal(normalizeAgf({agfo1:0}).agfo1,0);
});
test('Kaynak satır değişmez; mevcut alanlar kaybolmaz',()=>{
  const src={der:1,pno:2,atadi:'AT',agfs1:1,agfo1:40};
  const copy=JSON.stringify(src);
  const row=toCanonical39(src);
  assert.equal(JSON.stringify(src),copy);
  assert.equal(row.der,1);
  assert.equal(row.atadi,'AT');
});
