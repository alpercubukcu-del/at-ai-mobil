import test from "node:test";
import assert from "node:assert/strict";
import {datesBetween,domesticMeetings,makeArchive,ensureDay,setSchedule,mark,classifyResultFailure,
  reportArchive,archiveFiles,zipFiles,unzipFiles,importArchive,DOMESTIC_CITIES} from "../klasik-v32/bulk.mjs";

test("10 hipodrom ülke listesi sabittir",()=>assert.deepEqual(DOMESTIC_CITIES.map(c=>c.id),[1,2,3,4,5,6,7,8,9,10]));
test("TJK takvimi yalnız 2 yarış şehri gösterirse diğer 8 hata değildir",()=>{
  const meetings=domesticMeetings({ok:true,catalogOnly:true,cities:[{id:"3",name:"İstanbul"},{id:"4",name:"Bursa"}]});
  const archive=makeArchive();
  const day=setSchedule(archive,"2026-11-04",meetings);
  assert.deepEqual(day.scheduledCityIds,[3,4]);
  assert.equal(day.statuses["1"].program,"YARIS_YOK");
  assert.equal(day.statuses["10"].result,"YARIS_YOK");
  assert.equal(reportArchive(archive).unplannedCities,8);
  assert.equal(reportArchive(archive).errors,0);
});
test("0 yurt içi yarış takvimine sahip gün normaldir",()=>{
  const archive=makeArchive();
  setSchedule(archive,"2026-11-04",domesticMeetings({ok:true,catalogOnly:true,cities:[]}));
  assert.equal(reportArchive(archive).unplannedCities,10);
  assert.equal(reportArchive(archive).errors,0);
});
test("yurt dışı yarış şehirleri yurt içi takvime girmez",()=>{
  const c=domesticMeetings({ok:true,catalogOnly:true,cities:[{id:"99",name:"Newmarket"},{id:"3",name:"İstanbul"}]});
  assert.deepEqual(c.map(x=>x.name),["İstanbul"]);
});
test("bozuk TJK takvimi yarışsız gün gibi gösterilmez",()=>{
  assert.throws(()=>domesticMeetings({ok:false,catalogOnly:true,cities:[]}),/doğrulanamadı/);
  assert.throws(()=>domesticMeetings({ok:true,catalogOnly:false,cities:[]}),/doğrulanamadı/);
});
test("yapılmamış veya yayımlanmamış sonuç 404: ayrı rapor, bağlantı sorunu 503: hata",()=>{
  assert.equal(classifyResultFailure({status:404,notFound:true}),"SONUC_YAYIMLANMADI");
  assert.equal(classifyResultFailure({status:503}),"INDIRME_HATASI");
  assert.equal(classifyResultFailure({scheduled:false,status:503}),"YARIS_YOK");
});
test("yarım kalan gün ve şehir durumu silinmeden korunur",()=>{
  const archive=makeArchive();
  setSchedule(archive,"2026-11-04",[{id:3},{id:4}]);
  const day=ensureDay(archive,"2026-11-04");
  day.programs["3"]={races:[{no:1}]};
  mark(archive,"2026-11-04",3,"program","INDIRILDI");
  mark(archive,"2026-11-04",4,"result","SONUC_YAYIMLANMADI","TJK henüz sonuç yayımlamadı");
  assert.equal(day.programs["3"].races.length,1);
  assert.equal(reportArchive(archive).pendingResults,1);
  assert.equal(reportArchive(archive).errors,0);
});
test("365 gün dahil tarih aralığı ve geçersiz takvim",()=>{
  assert.equal(datesBetween("2026-01-01","2026-12-31",366).length,365);
  assert.deepEqual(datesBetween("2026-12-31","2027-01-02"),["2026-12-31","2027-01-01","2027-01-02"]);
  assert.throws(()=>datesBetween("2026-02-30","2026-03-01"),/Geçersiz tarih/);
  assert.throws(()=>datesBetween("2026-11-05","2026-11-04"),/gün arasında/);
});
test("Bültenler / Sonuçlar / Raporlar ayrı klasörlü gerçek ZIP",()=>{
  const a=makeArchive();setSchedule(a,"2026-11-04",[{id:3}]);
  a.days["2026-11-04"].programs["3"]={date:"2026-11-04",cityName:"İstanbul",races:[{no:1}]};
  a.days["2026-11-04"].results["3"]={rows:[{atadi:"ŞAHAN",der:1}],raceNumbers:[1]};
  const files=archiveFiles(a);
  assert.ok(Object.keys(files).some(k=>k.startsWith("Bultenler/2026/11/")));
  assert.ok(Object.keys(files).some(k=>k.startsWith("Sonuclar/2026/11/")));
  assert.ok(Object.keys(files).some(k=>k.startsWith("Raporlar/")));
  const zip=zipFiles(files);
  assert.equal(zip[0],0x50);assert.equal(zip[1],0x4b);
  const imported=importArchive(unzipFiles(zip));
  assert.deepEqual(imported.days["2026-11-04"].results["3"].raceNumbers,[1]);
  assert.equal(imported.days["2026-11-04"].results["3"].rows[0].atadi,"ŞAHAN");
});
test("ZIP bütünlük denetimi bozulan içeriği reddeder",()=>{
  const zip=zipFiles({"Bultenler/örnek.json":'{"ad":"Yıldız"}'});
  zip[30+new TextEncoder().encode("Bultenler/örnek.json").length]^=0x40;
  assert.throws(()=>unzipFiles(zip));
});
