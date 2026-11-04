/**
 * Klasik Analiz V3.2: TJK yurt içi takvim taraması, yedekleme ve ZIP.
 * IndexedDB/localStorage/sessionStorage KULLANILMAZ.
 * "O gün yarış yok" ile "erişim hatası" birbirinden ayrılır.
 */
export const DOMESTIC_CITIES=Object.freeze([
  {id:1,name:"Adana"},{id:2,name:"İzmir"},{id:3,name:"İstanbul"},
  {id:4,name:"Bursa"},{id:5,name:"Ankara"},{id:6,name:"Şanlıurfa"},
  {id:7,name:"Elazığ"},{id:8,name:"Diyarbakır"},{id:9,name:"Kocaeli"},
  {id:10,name:"Antalya"}
]);
export const BULK_FORMAT="AT_AI_KLASIK_V32_TJK_TOPLU_V1";
const citiesById=new Map(DOMESTIC_CITIES.map(c=>[String(c.id),c]));
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function toDay(iso){if(!datePattern.test(String(iso)))throw new Error("Tarih YYYY-MM-DD olmalı");const date=new Date(iso+"T00:00:00Z");if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==iso)throw new Error("Geçersiz tarih");return date;}
export function datesBetween(start,end,maxDays=31){
  let first=toDay(start),last=toDay(end),length=Math.floor((last-first)/86400000)+1;
  if(length<1||length>maxDays)throw new Error("Tarih aralığı 1–"+maxDays+" gün arasında olmalı");
  return Array.from({length},(_,i)=>new Date(+first+i*86400000).toISOString().slice(0,10));
}
export function domesticMeetings(catalog){
  if(!catalog || catalog.ok!==true || catalog.catalogOnly!==true || !Array.isArray(catalog.cities)){
    throw new Error("TJK resmi yarış takvimi doğrulanamadı; 'yarış yok' sayılmadı");
  }
  const found=new Map();
  for(const entry of catalog.cities) {
    const city=citiesById.get(String(entry.id));
    if(city)found.set(String(city.id),city);
  }
  return [...found.values()];
}
export function makeArchive(){
  return {format:BULK_FORMAT,createdAt:new Date().toISOString(),days:{},issues:[]};
}
export function ensureDay(archive,date){
  toDay(date);
  if(!archive.days[date])archive.days[date]={scheduledCityIds:null,programs:{},results:{},statuses:{},warnings:[]};
  return archive.days[date];
}
export function setSchedule(archive,date,cities){
  const day=ensureDay(archive,date);
  day.scheduledCityIds=cities.map(c=>Number(c.id));
  for(const c of DOMESTIC_CITIES)if(!day.scheduledCityIds.includes(c.id))day.statuses[String(c.id)]={program:"YARIS_YOK",result:"YARIS_YOK"};
  return day;
}
export function mark(archive,date,cityId,kind,status,message=""){
  const day=ensureDay(archive,date),key=String(cityId);
  if(!day.statuses[key])day.statuses[key]={};
  day.statuses[key][kind]=status;
  if(message)day.warnings.push({cityId:Number(cityId),kind,status,message});
}
export function classifyResultFailure({status,notFound,scheduled=true}={}){
  if(!scheduled)return "YARIS_YOK";
  if(status===404 && notFound===true)return "SONUC_YAYIMLANMADI";
  return "INDIRME_HATASI";
}
export function reportArchive(archive){
  const stats={days:0,scheduledMeetings:0,unplannedCities:0,programs:0,results:0,horses:0,pendingResults:0,errors:0,warnings:0};
  for(const day of Object.values(archive.days||{})){
    stats.days++;
    stats.scheduledMeetings+=(day.scheduledCityIds||[]).length;
    if(day.scheduledCityIds)stats.unplannedCities+=DOMESTIC_CITIES.length-day.scheduledCityIds.length;
    stats.programs+=Object.keys(day.programs||{}).length;
    stats.results+=Object.keys(day.results||{}).length;
    for(const x of Object.values(day.results||{}))stats.horses+=x.rows?.length||0;
    for(const status of Object.values(day.statuses||{}))for(const val of Object.values(status)){
      if(val==="SONUC_YAYIMLANMADI")stats.pendingResults++;
      if(val==="INDIRME_HATASI"||val==="KATALOG_HATASI"||val==="PARSE_BELIRSIZ")stats.errors++;
    }
    stats.warnings+=(day.warnings||[]).length;
  }
  return stats;
}
const encoder=new TextEncoder(),decoder=new TextDecoder();
function crc32(bytes){
  let crc=0xffffffff;
  for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function concat(parts){
  const total=parts.reduce((sum,p)=>sum+p.length,0);
  if(total>=0xffffffff)throw new Error("ZIP çok büyük; daha küçük tarih aralığı seçin");
  const out=new Uint8Array(total);let offset=0;
  for(const p of parts){out.set(p,offset);offset+=p.length;}return out;
}
export function zipFiles(files){
  const locals=[],central=[];let offset=0,count=0;
  for(const [name,content] of Object.entries(files)){
    if(!name || name.includes("..")||name.startsWith("/")||name.includes("\\"))throw Error("Geçersiz ZIP yolu");
    const path=encoder.encode(name),data=encoder.encode(typeof content==="string"?content:JSON.stringify(content,null,2));
    const crc=crc32(data);const local=new Uint8Array(30+path.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);
    lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,path.length,true);
    local.set(path,30);locals.push(local,data);
    const cent=new Uint8Array(46+path.length),cv=new DataView(cent.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
    cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
    cv.setUint16(28,path.length,true);cv.setUint32(42,offset,true);
    cent.set(path,46);central.push(cent);offset+=local.length+data.length;count++;
  }
  if(count>65535)throw Error("Çok fazla ZIP dosyası");
  const centralBytes=concat(central),end=new Uint8Array(22),v=new DataView(end.buffer);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);
  v.setUint32(12,centralBytes.length,true);v.setUint32(16,offset,true);
  return concat([...locals,centralBytes,end]);
}
/** Kendi oluşturduğumuz sıkıştırmasız ZIP'lerin güvenli arşivden-geri-yükleme okuyucusu. */
export function unzipFiles(buffer){
  const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
  if(bytes.length>150*1024*1024)throw Error("ZIP dosyası 150 MB sınırını aşıyor");
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),result={};let at=0,count=0;
  while(at+4<=bytes.length&&view.getUint32(at,true)===0x04034b50){
    if(at+30>bytes.length)throw Error("Eksik ZIP başlığı");
    const method=view.getUint16(at+8,true),flags=view.getUint16(at+6,true),
      crc=view.getUint32(at+14,true),len=view.getUint32(at+18,true),nameLen=view.getUint16(at+26,true),extraLen=view.getUint16(at+28,true);
    if(method!==0||(flags&8))throw Error("Yalnız uygulamanın ürettiği sıkıştırmasız ZIP desteklenir");
    const start=at+30+nameLen+extraLen,end=start+len;
    if(end>bytes.length)throw Error("Eksik ZIP dosyası");
    const name=decoder.decode(bytes.slice(at+30,at+30+nameLen)),data=bytes.slice(start,end);
    if(name.includes("..")||name.startsWith("/")||crc32(data)!==crc)throw Error("ZIP bütünlük hatası");
    result[name]=decoder.decode(data);at=end;if(++count>20000)throw Error("Çok fazla ZIP girdisi");
  }
  if(count===0)throw Error("ZIP içeriği bulunamadı");
  return result;
}
export function archiveFiles(archive){
  const output={};
  for(const [date,day] of Object.entries(archive.days||{})){
    const year=date.slice(0,4),month=date.slice(5,7);
    for(const [id,p] of Object.entries(day.programs||{}))output["Bultenler/"+year+"/"+month+"/"+date+"_Sehir"+id+".json"]=JSON.stringify(p,null,2);
    for(const [id,r] of Object.entries(day.results||{}))output["Sonuclar/"+year+"/"+month+"/"+date+"_Sehir"+id+".json"]=JSON.stringify(r,null,2);
  }
  output["Raporlar/indirme-durumu.json"]=JSON.stringify({format:BULK_FORMAT,summary:reportArchive(archive),archive},null,2);
  return output;
}
export function importArchive(files){
  const json=files["Raporlar/indirme-durumu.json"];
  if(!json)throw Error("Arşivde indirme-durumu.json bulunamadı");
  const document=JSON.parse(json);
  const archive=document.archive;
  if(document.format!==BULK_FORMAT||archive?.format!==BULK_FORMAT||typeof archive.days!=="object")throw Error("Uyumsuz arşiv sürümü");
  return archive;
}
