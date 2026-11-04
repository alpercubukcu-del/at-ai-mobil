/**
 * Klasik Analiz V3.2 — yalnız sonuç/AGF veri görüntüleme adaptörü.
 * Canlı tahmin motoru değildir; eksik 39-alan verisini uydurmaz.
 */
export const CITIES = Object.freeze([
  {id:1,name:"Adana"},{id:2,name:"İzmir"},{id:3,name:"İstanbul"},
  {id:4,name:"Bursa"},{id:5,name:"Ankara"},{id:6,name:"Şanlıurfa"},
  {id:7,name:"Elazığ"},{id:8,name:"Diyarbakır"},{id:9,name:"Kocaeli"},
  {id:10,name:"Antalya"}
]);
export const FIELDS = Object.freeze(
  "der,pno,kilo,ganyan,tarih,mes,ikramiye,yarrno,yas,kno,hpu,hsi,gsi,hpo,ghpo,g2hpo,sno,atadi,akses,orjin,jokey,jimi,sahip,antrenor,muddet,sehir,yaradi1,yaradi2,yaradi3,pist,irk,pdurum,uyr,ci,yaradi4,agfs1,agfo1,agfs2,agfo2".split(",")
);
export const NEARBY_DISTANCE = Object.freeze([0,100,200,300,400]);

const hasValue = v => v !== null && v !== undefined && String(v).trim() !== "";
function optional(v) {return hasValue(v) ? v : null;}
function numberOrNull(v) {if (!hasValue(v)) return null; const n=Number(String(v).replace("%","").replace(",","."));return Number.isFinite(n)?n:null;}
function findPoolShare(pool,raceNo,horseNo) {
  if (!pool || typeof pool !== "object" || pool.error || !Number.isInteger(Number(pool.startRace))) return null;
  if (Number(raceNo) < Number(pool.startRace)) return null;
  const map=pool.byRace?.[String(raceNo)];
  return map && Object.prototype.hasOwnProperty.call(map,String(horseNo)) ? numberOrNull(map[String(horseNo)]) : null;
}
export function distanceMatches(historyDistance,targetDistance,tolerance) {
  const h=Number(historyDistance),t=Number(targetDistance),d=Number(tolerance);
  return NEARBY_DISTANCE.includes(d) && Number.isFinite(h) && Number.isFinite(t) &&
    hasValue(historyDistance) && hasValue(targetDistance) && Math.abs(h-t)<=d;
}
export function canonical39({date,city,race,horse,agf} = {}) {
  if (!race || !horse || !date || !city) throw new TypeError("Tarih, şehir, koşu ve at gerekli");
  const row=Object.fromEntries(FIELDS.map(field=>[field,null]));
  const no=numberOrNull(horse.programNo ?? horse.no);
  row.der=numberOrNull(horse.finish);
  row.pno=no;
  row.kilo=numberOrNull(horse.actualWeight ?? horse.weight);
  row.ganyan=numberOrNull(horse.gny ?? horse.odds);
  row.tarih=date;
  row.mes=numberOrNull(race.distance ?? race.mesafe);
  row.ikramiye=optional(race.prize);
  row.yarrno=null; // TJK kimlik alanı henüz doğrulanmadı
  const ageMatch=String(horse.age??"").match(/^(\d{1,2})\b/);
  row.yas=ageMatch?Number(ageMatch[1]):null;
  row.kno=numberOrNull(horse.st ?? horse.startGate ?? horse.gate ?? horse.kno); // KN = kulvar, koşu no değildir
  row.hpu=numberOrNull(horse.hp);
  // hsi/gsi/hpo/ghpo/g2hpo/sno resmi kaynaktan doğrulanmadan hesaplanmaz
  row.atadi=optional(horse.horseName ?? horse.name);
  row.akses=optional(horse.accessories);
  row.orjin=optional(horse.origin);
  row.jokey=optional(horse.jockey);
  row.jimi=horse.apprentice===true?"Apranti":null;
  row.sahip=optional(horse.owner);
  row.antrenor=optional(horse.trainer);
  row.muddet=optional(horse.degree);
  row.sehir=city;
  row.yaradi1=optional(race.yaradi1??race.class);
  row.yaradi2=optional(race.yaradi2??race.ageGroup);
  row.yaradi3=optional(race.yaradi3);
  row.pist=optional(race.pist??race.track);
  const ageText=String(race.ageGroup??"").toLocaleUpperCase("tr-TR");
  row.irk=ageText.includes("ARAP")?"Arap":ageText.includes("İNGİLİZ")?"İngiliz":null;
  row.pdurum=optional(race.trackCondition); // yoksa Normal kabul edilmez
  row.uyr=optional(horse.nationality);
  row.ci=optional(horse.gender);
  row.yaradi4=optional(race.yaradi4);
  // Resmi sıra bulunmadığı sürece türetilmiş yüzde sırasını resmî gibi kaydetme.
  row.agfs1=null;row.agfs2=null;
  row.agfo1=findPoolShare(agf?.pool1,race.no ?? race.raceNo,row.pno);
  row.agfo2=findPoolShare(agf?.pool2,race.no ?? race.raceNo,row.pno);
  return row;
}
/**
 * Koşu no 39 resmî sütunun içinde yer almaz: KN kulvardır.
 * Yarış numaraları JSON meta dizisinde satır indisiyle paralel korunur.
 */
export function flattenResultDayWithRaceNumbers(results,agf=null) {
  if (!results?.ok || !Array.isArray(results.races)) throw new TypeError("Doğrulanabilir sonuç dizisi yok");
  const rows=[],raceNumbers=[];
  for(const race of results.races) {
    const raceNo=Number(race.no ?? race.raceNo);
    if (!Number.isInteger(raceNo)||raceNo<1||!Array.isArray(race.rows)) continue;
    for(const horse of race.rows) {
      rows.push(canonical39({date:results.date,city:results.city,race,horse,agf}));
      raceNumbers.push(raceNo);
    }
  }
  return {rows,raceNumbers};
}
export function flattenResultDay(results,agf=null) {
  return flattenResultDayWithRaceNumbers(results,agf).rows;
}
export function audit39(rows,{raceNumbers=[]}={}) {
  const seen=new Set(),errors=[],warnings=[];
  if (!Array.isArray(rows)) return {ok:false,errors:["Satırlar dizi değil"],warnings};
  for(let i=0;i<rows.length;i++) {
    const r=rows[i];
    if (FIELDS.some(f=>!Object.prototype.hasOwnProperty.call(r,f))) errors.push("Eksik alan: satır "+(i+1));
    if (!r.tarih || !r.sehir || !r.pno || !r.atadi) errors.push("Eksik at kimliği: satır "+(i+1));
    if (raceNumbers.length && (!Number.isInteger(Number(raceNumbers[i])) || Number(raceNumbers[i])<1)) errors.push("Eksik koşu numarası metaverisi: satır "+(i+1));
    if (r.agfo2!==null && r.agfs2===null) warnings.push("AGF2 yüzdesi var, resmî sıra eksik: satır "+(i+1));
    if (r.agfo1!==null && r.agfs1===null) warnings.push("AGF1 yüzdesi var, resmî sıra eksik: satır "+(i+1));
    const key=[r.tarih,r.sehir,raceNumbers.length?raceNumbers[i]:"?",r.pno||"",r.atadi].join("|");
    if (seen.has(key)) errors.push("Mükerrer at: "+key);
    seen.add(key);
  }
  return {ok:errors.length===0,errors,warnings};
}
