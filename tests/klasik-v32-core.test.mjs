import test from "node:test";
import assert from "node:assert/strict";
import {CITIES,FIELDS,NEARBY_DISTANCE,distanceMatches,canonical39,flattenResultDay,flattenResultDayWithRaceNumbers,audit39} from "../klasik-v32/core.mjs";

const race={no:5,distance:1400,class:"SATIŞ 2",ageGroup:"3 Yaşlı Araplar",pist:"Çim",trackCondition:"Normal"};
const horse={programNo:7,horseName:"AT 7",finish:2,actualWeight:57.5,gny:6.5,hp:45,st:11,degree:"1.35.21",age:"3 y a e"};
const agf={pool1:{startRace:1,byRace:{"5":{"7":28.4}}},pool2:{startRace:5,byRace:{"5":{"7":12.3}}}};
const record=(extra={})=>canonical39({date:"2026-08-14",city:"Bursa",race,horse,agf,...extra});

test("39 sütun ve orijinal 35+4 sıra aynı",()=>{
  assert.equal(FIELDS.length,39);
  assert.equal(new Set(FIELDS).size,39);
  assert.equal(FIELDS[16],"sno");
  assert.deepEqual(FIELDS.slice(35),["agfs1","agfo1","agfs2","agfo2"]);
});
test("10 resmi hipodromun tamamı",()=>assert.deepEqual(CITIES.map(c=>c.id),[1,2,3,4,5,6,7,8,9,10]));
test("5 mesafe filtresi ve ±0 aynı mesafe",()=>{
  assert.deepEqual(NEARBY_DISTANCE,[0,100,200,300,400]);
  assert.equal(distanceMatches(1200,1200,0),true);
  assert.equal(distanceMatches(1300,1200,0),false);
  assert.equal(distanceMatches(1300,1200,100),true);
  assert.equal(distanceMatches(1601,1200,400),false);
});
test("TJK sonuç at bilgisi canonical39'a doğru geçer",()=>{
  const r=record();
  assert.deepEqual(Object.keys(r),FIELDS);
  assert.deepEqual([r.der,r.pno,r.kilo,r.ganyan,r.mes,r.kno,r.hpu],[2,7,57.5,6.5,1400,11,45]);
  assert.equal(r.muddet,"1.35.21");
  assert.equal(r.atadi,"AT 7");
  assert.equal(r.irk,"Arap");
});
test("AGF1 ve AGF2 yüzde havuzları ayrı; resmi sıra uydurulmaz",()=>{
  const r=record();
  assert.equal(r.agfo1,28.4);
  assert.equal(r.agfo2,12.3);
  assert.equal(r.agfs1,null);
  assert.equal(r.agfs2,null);
});
test("2. altılı koşu 6'da başlıyorsa koşu 5 AGF2 boş",()=>{
  const x=record({agf:{...agf,pool2:{...agf.pool2,startRace:6}}});
  assert.equal(x.agfo1,28.4);
  assert.equal(x.agfo2,null);
});
test("AGF2 indirilemezse AGF1 kopyalanmaz",()=>{
  const x=record({agf:{pool1:agf.pool1,pool2:{startRace:5,error:"503",byRace:{}}}});
  assert.equal(x.agfo1,28.4);
  assert.equal(x.agfo2,null);
});
test("Eksik pist durumu asla Normal yapılmaz",()=>{
  const r=record({race:{...race,trackCondition:""}});
  assert.equal(r.pdurum,null);
});
test("Doğrulanmamış yarrno ve sno uydurulmaz",()=>{
  const r=record();
  assert.equal(r.yarrno,null);
  assert.equal(r.sno,null);
});
test("Gerçek yarış sonuçları her at için ayrı satır üretir",()=>{
  const d={ok:true,date:"2026-08-14",city:"Bursa",races:[{...race,rows:[horse,{...horse,horseName:"AT 8",programNo:8,finish:1}]}]};
  const rows=flattenResultDay(d,agf);
  assert.equal(rows.length,2);
  assert.equal(rows[1].der,1);
  assert.equal(audit39(rows,{raceNumbers:[5,5]}).ok,true);
});
test("Mükerrer yarış atı işaretlenir; silinmez",()=>{
  const r=record();
  const check=audit39([r,r]);
  assert.equal(check.ok,false);
  assert.match(check.errors.join(" " ),/Mükerrer/);
});
test("Resmi AGF sırası eksikliği uyarı olarak raporlanır",()=>{
  const a=audit39([record()]);
  assert.equal(a.ok,true);
  assert.equal(a.warnings.length,2);
});

test("KN resmî kulvardır; koşu no ayrı metaveri olarak saklanır",()=>{
  const d={ok:true,date:"2026-08-14",city:"Bursa",races:[
    {...race,no:5,rows:[horse]},
    {...race,no:6,rows:[{...horse,horseName:"AT 8",programNo:8,st:11}]}
  ]};
  const output=flattenResultDayWithRaceNumbers(d,agf);
  assert.deepEqual(output.raceNumbers,[5,6]);
  assert.deepEqual(output.rows.map(x=>x.kno),[11,11]);
  assert.equal(output.rows[0].agfo1,28.4);
  assert.equal(output.rows[0].agfo2,12.3);
  assert.equal(output.rows[1].agfo2,null);
  assert.equal(audit39(output.rows,{raceNumbers:output.raceNumbers}).ok,true);
});
test("Aynı kulvar numarası farklı koşularda mükerrer at değildir",()=>{
  const rows=[record(),record({race:{...race,no:6}})];
  const data=audit39(rows,{raceNumbers:[5,6]});
  assert.equal(data.ok,true);
});
