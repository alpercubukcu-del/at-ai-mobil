import {CITIES,FIELDS,flattenResultDayWithRaceNumbers,audit39} from "./core.mjs";

const id = key => document.getElementById(key);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => (
  {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]
));
const state={program:[],results:null,agf:null,rows:[],rowRaceNos:[]};
const DB_NAME="at_ai_klasik_v32_readonly_archive_v1";
const KEY_RESULTS="results",KEY_PROGRAM="programs";

function currentDate(){
  const d=new Date(),p=n=>String(n).padStart(2,"0");
  return [d.getFullYear(),p(d.getMonth()+1),p(d.getDate())].join("-");
}
function city(){return CITIES.find(c=>String(c.id)===id("city").value)||CITIES[0];}
function selection(){return{id:city().id,name:city().name,date:id("date").value};}
function setStatus(message,type=""){
  const el=id("notice");el.textContent=message;el.className="notice"+(type?" "+type:"");
}
async function json(endpoint,query){
  const u=new URL(endpoint,window.location.origin);
  Object.entries(query).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  const response=await fetch(u.pathname+u.search,{headers:{accept:"application/json"},cache:"no-store"});
  const data=await response.json().catch(()=>null);
  if (!response.ok || !data || data.ok===false) throw new Error(data?.error||"TJK servisi hata verdi (HTTP "+response.status+")");
  return data;
}
function openDb(){
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in window)) return reject(new Error("Bu tarayıcıda IndexedDB yok"));
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      for(const store of [KEY_RESULTS,KEY_PROGRAM]){
        if(!db.objectStoreNames.contains(store))db.createObjectStore(store,{keyPath:"key"});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error("Arşiv açılamadı"));
  });
}
async function dbAction(store,mode,method,payload){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode),obj=tx.objectStore(store),req=obj[method](payload);
    let result;
    req.onsuccess=()=>{result=req.result;};
    req.onerror=()=>reject(req.error||new Error("Arşiv isteği hatası"));
    tx.oncomplete=()=>{db.close();resolve(result);};
    tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error("Arşiv işlemi tamamlanmadı"));};
  });
}
function key(){const s=selection();return s.date+"|"+s.id;}
function visibleRaceNos(){
  const val=id("race").value;return val==="all"?null:Number(val);
}
function updateSelect(){
  const current=id("race").value;
  const all=new Map();
  for(const race of state.program)if(Number(race.no)>0)all.set(Number(race.no),true);
  for(const race of state.results?.races||[])if(Number(race.no)>0)all.set(Number(race.no),true);
  const races=[...all.keys()].sort((a,b)=>a-b);
  id("race").innerHTML='<option value="all">Tüm Koşular</option>'+races.map(x=>'<option value="'+x+'">'+x+". Koşu</option>").join("");
  id("race").value=races.some(x=>String(x)===current)?current:"all";
}
function renderProgram(){
  const filtered=state.program.filter(r=>visibleRaceNos()===null||Number(r.no)===visibleRaceNos());
  id("raceCount").textContent=state.program.length+" koşu";
  id("races").innerHTML=filtered.length?filtered.map(r=>{
    const count=Array.isArray(r.horses)?r.horses.length:0;
    const info=[r.ageGroup,r.class||r.yaradi1,r.mesafe||r.distance,r.pist||r.track].filter(Boolean).map(escapeHtml).join(" · ");
    const active=String(r.no)===id("race").value;
    return '<button class="race-card'+(active?" active":"")+'" data-race="'+Number(r.no)+'" type="button"><b>'+Number(r.no)+'. Koşu</b><small>'+info+'</small><small>'+count+" at</small></button>";
  }).join(""):'<p class="empty">Bu seçimde yarış programı yok.</p>';
}
function renderResults(){
  const raceNo=visibleRaceNos();
  const pairs=state.rows.map((row,i)=>({row,raceNo:state.rowRaceNos[i]}))
    .filter(x=>raceNo===null||Number(x.raceNo)===raceNo);
  const raceNos=[...new Set(pairs.map(x=>Number(x.raceNo)).filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
  id("resultCount").textContent=pairs.length+" at";
  if(!pairs.length){id("results").innerHTML='<p class="empty">Bu tarih ve koşuda kaydedilmiş gerçek sonuç bulunmuyor.</p>';return;}
  id("results").innerHTML=raceNos.map(no=>{
    const horses=pairs.filter(x=>Number(x.raceNo)===no).map(x=>x.row)
      .sort((a,b)=>(a.der??999)-(b.der??999));
    const horseRows=horses.map(r=>{
      return '<div class="horse-row"><span class="number">'+escapeHtml(r.der??"—")+'</span><b>'+escapeHtml(r.atadi??"—")+
        '</b><span class="result-time">'+escapeHtml(r.muddet??"—")+
        '</span><span>AGF1 '+escapeHtml(r.agfo1===null?"—":"%"+r.agfo1)+'</span><span class="agf2">AGF2 '+escapeHtml(r.agfo2===null?"—":"%"+r.agfo2)+'</span></div>';
    }).join("");
    return '<div class="result-group"><h3>'+no+". Koşu · "+horses.length+" at</h3>"+horseRows+"</div>";
  }).join("");
}
function renderAudit(){
  const audit=audit39(state.rows,{raceNumbers:state.rowRaceNos});
  id("audit").textContent=state.rows.length
    ?state.rows.length+" satır · "+audit.errors.length+" hata · "+audit.warnings.length+
     " uyarı. AGF yüzdeleri alınsa bile resmî sırası doğrulanmadıysa null kalır."+
     (audit.errors.length?" Hatalar: "+audit.errors.slice(0,3).join("; "):"")
    :"Henüz sonuç satırı yüklenmedi.";
}
function resetForSelection(){
  state.program=[];state.results=null;state.agf=null;state.rows=[];state.rowRaceNos=[];
  updateSelect();renderProgram();renderResults();renderAudit();
}
async function loadProgram(){
  const s=selection();if(!s.date)throw new Error("Tarih seçin");
  const data=await json("/api/tjk-program",{date:s.date,cityId:s.id});
  const rows=data.programs?.[String(s.id)]||data.racesByCity?.[String(s.id)]||[];
  if(!Array.isArray(rows))throw new Error("Bülten verisi beklenen yapıda değil");
  state.program=rows;
  updateSelect();renderProgram();
  setStatus(s.name+" · "+s.date+" · "+rows.length+" koşu TJK programından alındı.","ok");
}
function rebuildRows(){
  const converted=state.results?flattenResultDayWithRaceNumbers(state.results,state.agf):{rows:[],raceNumbers:[]};
  state.rows=converted.rows;state.rowRaceNos=converted.raceNumbers;
  updateSelect();renderResults();renderAudit();
}
async function loadResults(){
  const s=selection();if(!s.date)throw new Error("Tarih seçin");
  const data=await json("/api/tjk-day-results-v1",{date:s.date,city:s.name,cityId:s.id});
  if(!Array.isArray(data.races)||!data.races.length)throw new Error("Doğrulanabilir sonuç koşusu bulunamadı");
  state.results=data;rebuildRows();
  const audit=audit39(state.rows,{raceNumbers:state.rowRaceNos});
  setStatus(s.name+" · "+data.races.length+" koşu · "+state.rows.length+" at sonucu. "+
    (audit.errors.length?"Arşiv hatası: "+audit.errors.join(" ; "):"Satırlar incelenebilir."),audit.errors.length?"error":"ok");
}
async function loadAgf(){
  const s=selection();if(!s.date)throw new Error("Tarih seçin");
  const data=await json("/api/tjk-bet-starts-v11",{date:s.date,cityId:s.id,cityName:s.name});
  state.agf=data.agf||null;rebuildRows();
  const first=data.agf?.pool1?.horseValueCount||0,second=data.agf?.pool2?.horseValueCount||0;
  setStatus("Resmî bahis başlangıçları kontrol edildi: AGF1 "+first+", AGF2 "+second+
    " yüzde değeri. AGF sırası kaynaktan henüz gelmediği için boş tutuldu.","ok");
}
async function saveArchive(){
  if(!state.results||!state.rows.length)throw new Error("Önce sonuçları indirin");
  const audit=audit39(state.rows,{raceNumbers:state.rowRaceNos});
  if(!audit.ok)throw new Error("Arşiv denetimi başarısız: "+audit.errors.slice(0,2).join("; "));
  const k=key(),old=await dbAction(KEY_RESULTS,"readonly","get",k);
  if(old)throw new Error("Bu gün/şehir zaten kayıtlı. Güvenlik için mevcut arşiv üzerine yazılmadı.");
  await dbAction(KEY_RESULTS,"readwrite","add",{key:k,results:state.results,agf:state.agf,rows:state.rows,raceNumbers:state.rowRaceNos,createdAt:new Date().toISOString()});
  if(state.program.length) {
    const existing=await dbAction(KEY_PROGRAM,"readonly","get",k);
    if(!existing)await dbAction(KEY_PROGRAM,"readwrite","add",{key:k,date:selection().date,city:selection().name,races:state.program,createdAt:new Date().toISOString()});
  }
  await refreshCount();setStatus("39 alanlı gün kaydı bu tarayıcıya eklendi. Mevcut kayıtlar silinmedi.","ok");
}
async function openArchive(){
  const r=await dbAction(KEY_RESULTS,"readonly","get",key());
  if(!r)throw new Error("Seçili tarih ve şehir için kayıt yok");
  const p=await dbAction(KEY_PROGRAM,"readonly","get",key());
  state.results=r.results||null;state.agf=r.agf||null;state.program=p?.races||[];
  rebuildRows();renderProgram();setStatus("Kayıtlı veri açıldı: "+state.rows.length+" at. Kaynak: bu tarayıcının IndexedDB arşivi.","ok");
}
async function refreshCount(){
  try{
    const db=await openDb(),tx=db.transaction(KEY_RESULTS,"readonly"),req=tx.objectStore(KEY_RESULTS).count();
    req.onsuccess=()=>id("archiveStatus").textContent=req.result+" gün";
    tx.oncomplete=()=>db.close();
  }catch{id("archiveStatus").textContent="Depolama yok";}
}
function exportJson(){
  if(!state.rows.length)throw new Error("Dışa aktarılacak sonuç verisi yok");
  const audit=audit39(state.rows,{raceNumbers:state.rowRaceNos}),s=selection();
  if(!audit.ok)throw new Error("Dosya dışa aktarılmadı: "+audit.errors.slice(0,2).join("; "));
  const payload={format:"AT_AI_KLASIK_V32_39_FIELD_DRAFT",date:s.date,city:s.name,
    fieldOrder:FIELDS,source:"TJK gün sonuçları + TJK resmî AGF yüzdeleri (varsa)",
    warning:"Eksik alanlar null. Resmî AGF sırası doğrulanmadan doldurulmaz. Tahmin verisi değildir.",
    audit,raceNumbers:state.rowRaceNos,rows:state.rows};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="klasik-v32-"+s.date+"-"+s.id+"-39-alan.json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  setStatus("39 sütunlu JSON dışa aktarıldı. Eksikler null olarak korundu.","ok");
}
function handle(button,action){
  id(button).addEventListener("click",async()=>{
    const el=id(button);
    el.disabled=true;setStatus("TJK / yerel arşiv işlemi sürüyor...");
    try{await action();}catch(e){setStatus(e?.message||String(e),"error");}
    finally{el.disabled=false;}
  });
}
function init(){
  id("city").innerHTML=CITIES.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+"</option>").join("");
  id("city").value="4";id("date").value=currentDate();
  id("city").addEventListener("change",resetForSelection);
  id("date").addEventListener("change",resetForSelection);
  id("race").addEventListener("change",()=>{renderProgram();renderResults();});
  id("races").addEventListener("click",e=>{
    const button=e.target.closest("[data-race]");if(!button)return;
    id("race").value=button.dataset.race;renderProgram();renderResults();
  });
  handle("loadProgram",loadProgram);
  handle("loadResults",loadResults);
  handle("loadAgf",loadAgf);
  handle("saveArchive",saveArchive);
  handle("openArchive",openArchive);
  handle("exportJson",exportJson);
  refreshCount();
}
init();
