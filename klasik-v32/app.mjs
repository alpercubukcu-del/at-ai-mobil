import {CITIES,FIELDS,flattenResultDayWithRaceNumbers,audit39} from "./core.mjs";
import {DOMESTIC_CITIES,datesBetween,domesticMeetings,makeArchive,ensureDay,setSchedule,mark,
  classifyResultFailure,reportArchive,archiveFiles,zipFiles,unzipFiles,importArchive} from "./bulk.mjs";

// BİLİNÇLİ KARAR: IndexedDB, localStorage, sessionStorage kullanılmaz.
// İndirme TJK takviminden başlar; dosyalar kullanıcı ZIP'ine veya seçilen klasöre kaydedilir.
const id = key => document.getElementById(key);
const esc = value => String(value ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const state={program:[],results:null,agf:null,rows:[],rowRaceNos:[],
  archive:makeArchive(),directory:null,busy:false,abort:null};
const CITY_BY_ID=new Map(DOMESTIC_CITIES.map(x=>[String(x.id),x]));
function dateNow(){
  const d=new Date(),pad=n=>String(n).padStart(2,"0");
  return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join("-");
}
function city(){return CITIES.find(c=>String(c.id)===id("city").value)||CITIES[0];}
function selection(){return{id:city().id,name:city().name,date:id("date").value};}
function status(message,type=""){const el=id("notice");el.textContent=message;el.className="notice"+(type?" "+type:"");}
function batchProgress(message,pct=null){
  id("batchAudit").textContent=message;
  id("bulkProgress").textContent=pct===null?"Devam":"%"+Math.round(pct);
  if(pct!==null)id("bulkBar").value=pct;
}
async function requestApi(route,query,signal){
  const url=new URL(route,location.origin);
  for(const [key,val] of Object.entries(query))url.searchParams.set(key,String(val));
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),80000);
  const cancel=()=>controller.abort();
  if(signal?.aborted)controller.abort();
  else signal?.addEventListener("abort",cancel,{once:true});
  try{
    const response=await fetch(url.pathname+url.search,{headers:{accept:"application/json"},cache:"no-store",signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data||data.ok===false){
      const error=new Error(data?.error||"TJK servisi yanıt vermedi (HTTP "+response.status+")");
      error.status=response.status;error.notFound=data?.notFound===true;throw error;
    }
    return data;
  }finally{clearTimeout(timer);signal?.removeEventListener("abort",cancel);}
}
function dayOf(date){return ensureDay(state.archive,date);}
function userDownload(bytes,name,type){
  const blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function contentPath(kind,date,cityId){
  return (kind==="program"?"Bultenler/":"Sonuclar/")+date.slice(0,4)+"/"+date.slice(5,7)+"/"+date+"_Sehir"+cityId+".json";
}
async function writeFile(relativePath,text){
  if(!state.directory)return;
  let folder=state.directory,parts=relativePath.split("/");
  for(const part of parts.slice(0,-1))folder=await folder.getDirectoryHandle(part,{create:true});
  const handle=await folder.getFileHandle(parts.at(-1),{create:true}),stream=await handle.createWritable();
  try{await stream.write(text);await stream.close();}catch(e){await stream.abort().catch(()=>{});throw e;}
}
async function persistReport(){
  if(!state.directory)return;
  await writeFile("Raporlar/indirme-durumu.json",JSON.stringify({
    format:state.archive.format,summary:reportArchive(state.archive),archive:state.archive
  },null,2));
}
async function persistRecord(kind,date,cityId,data){
  if(!state.directory)return;
  try{await writeFile(contentPath(kind,date,cityId),JSON.stringify(data,null,2));await persistReport();}
  catch(e){
    state.directory=null;
    id("folderStatus").textContent="Klasöre yazılamadı: "+String(e?.message||e)+". Kayıtlar bu oturumda tutuluyor; ZIP indirerek koruyun.";
  }
}
async function chooseFolder(){
  if(typeof window.showDirectoryPicker!=="function"){
    status("Bu tarayıcı klasöre doğrudan yazmayı desteklemiyor. Toplu işlemi çalıştırıp ZIP arşivini indirebilirsiniz.","error");return;
  }
  const selected=await window.showDirectoryPicker({mode:"readwrite",id:"at-ai-klasik-v32"});
  state.directory=selected;
  try{
    const reports=await selected.getDirectoryHandle("Raporlar");
    const file=await reports.getFileHandle("indirme-durumu.json");
    const obj=JSON.parse(await (await file.getFile()).text());
    if(obj.format===state.archive.format && obj.archive?.days){
      state.archive=obj.archive;refreshArchiveUI();openSelectedFromArchive();
      status("Mevcut klasör arşivi okundu; daha önce indirilen şehir ve günler tekrar indirilmeden devam edilebilir.","ok");
    }
  }catch(e){if(e.name!=="NotFoundError")status("Klasörde eski rapor okunamadı: "+String(e.message),"error");}
  id("folderStatus").textContent="Seçili klasör: "+selected.name+". Her tamamlanan şehir dosyaya yazılır.";
}
function selectedRace(){const value=id("race").value;return value==="all"?null:Number(value);}
function updateSelect(){
  const current=id("race").value,keys=new Set();
  for(const r of state.program)if(Number.isInteger(Number(r.no))&&Number(r.no)>0)keys.add(Number(r.no));
  for(const r of state.results?.races||[])if(Number.isInteger(Number(r.no))&&Number(r.no)>0)keys.add(Number(r.no));
  const values=[...keys].sort((a,b)=>a-b);
  id("race").innerHTML='<option value="all">Tüm Koşular</option>'+values.map(n=>'<option value="'+n+'">'+n+'. Koşu</option>').join("");
  id("race").value=values.some(n=>String(n)===current)?current:"all";
}
function renderProgram(){
  const chosen=selectedRace(),races=state.program.filter(r=>chosen===null||Number(r.no)===chosen);
  id("raceCount").textContent=state.program.length+" koşu";
  id("races").innerHTML=races.length?races.map(r=>{
    const n=Array.isArray(r.horses)?r.horses.length:0;
    const meta=[r.ageGroup,r.class||r.yaradi1,r.mesafe||r.distance,r.pist||r.track].filter(Boolean).map(esc).join(" · ");
    return '<button type="button" class="race-card'+(Number(r.no)===chosen?" active":"")+'" data-race="'+Number(r.no)+'">'+
      '<b>'+Number(r.no)+'. Koşu</b><small>'+meta+'</small><small>'+n+' at</small></button>';
  }).join(""):'<p class="empty">Bu seçimde kayıtlı yarış programı yok.</p>';
}
function renderResults(){
  const chosen=selectedRace(),pairs=state.rows.map((row,i)=>({row,raceNo:state.rowRaceNos[i]}))
    .filter(x=>chosen===null||Number(x.raceNo)===chosen);
  const races=[...new Set(pairs.map(x=>Number(x.raceNo)).filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
  id("resultCount").textContent=pairs.length+" at";
  if(!pairs.length){id("results").innerHTML='<p class="empty">Seçilen gün ve koşuda gerçek sonuç yok.</p>';return;}
  id("results").innerHTML=races.map(no=>{
    const horses=pairs.filter(x=>Number(x.raceNo)===no).map(x=>x.row).sort((a,b)=>(a.der??999)-(b.der??999));
    return '<div class="result-group"><h3>'+no+'. Koşu · '+horses.length+' at</h3>'+
      horses.map(r=>'<div class="horse-row"><span class="number">'+esc(r.der??"—")+'</span><b>'+esc(r.atadi??"—")+
      '</b><span class="result-time">'+esc(r.muddet??"—")+'</span><span>AGF1 '+esc(r.agfo1===null?"—":"%"+r.agfo1)+
      '</span><span class="agf2">AGF2 '+esc(r.agfo2===null?"—":"%"+r.agfo2)+'</span></div>').join("")+'</div>';
  }).join("");
}
function rebuildRows(){
  const x=state.results?flattenResultDayWithRaceNumbers(state.results,state.agf):{rows:[],raceNumbers:[]};
  state.rows=x.rows;state.rowRaceNos=x.raceNumbers;updateSelect();renderResults();renderAudit();
}
function renderAudit(){
  const result=audit39(state.rows,{raceNumbers:state.rowRaceNos});
  id("audit").textContent=state.rows.length
    ?state.rows.length+" at · "+result.errors.length+" hata · "+result.warnings.length+
    " uyarı. Eksik veriler null, resmî olmayan AGF sırası boş tutulur."+
    (result.errors.length?" Hatalar: "+result.errors.slice(0,3).join("; "):"")
    :"Seçili gün için henüz sonuç satırı yok.";
}
function refreshArchiveUI(){
  const stats=reportArchive(state.archive);
  id("archiveStatus").textContent=stats.days+" gün";
  id("batchAudit").textContent="Arşiv: "+stats.days+" gün, "+stats.programs+" şehir bülteni, "+
    stats.results+" şehir sonucu, "+stats.horses+" at sonucu, "+stats.unplannedCities+
    " yarış düzenlenmeyen şehir/gün. "+stats.pendingResults+" sonuç yayımlanmamış, "+stats.errors+" gerçek sorun.";
}
function openSelectedFromArchive(){
  const s=selection(),day=state.archive.days[s.date],key=String(s.id);
  const p=day?.programs?.[key],r=day?.results?.[key];
  state.program=p?.races||[];state.results=r?.raw||null;state.agf=r?.agf||null;
  if(r?.rows && r?.raceNumbers){
    state.rows=r.rows;state.rowRaceNos=r.raceNumbers;updateSelect();renderResults();renderAudit();
  }else rebuildRows();
  renderProgram();
}
function resetForSelection(){openSelectedFromArchive();}
async function loadProgram(){
  const s=selection();if(!s.date)throw Error("Tarih seçin");
  const data=await requestApi("/api/tjk-program",{date:s.date,cityId:s.id});
  const races=data.programs?.[String(s.id)]||data.racesByCity?.[String(s.id)]||[];
  if(!Array.isArray(races))throw Error("TJK bülten veri biçimi hatalı");
  state.program=races;updateSelect();renderProgram();
  dayOf(s.date).programs[String(s.id)]={date:s.date,cityId:s.id,cityName:s.name,races,sourceUrl:data.sourceUrl||null};
  await persistRecord("program",s.date,s.id,dayOf(s.date).programs[String(s.id)]);
  refreshArchiveUI();status(s.name+" · "+races.length+" koşu listelendi.","ok");
}
async function loadResults(){
  const s=selection();if(!s.date)throw Error("Tarih seçin");
  const data=await requestApi("/api/tjk-day-results-v1",{date:s.date,cityId:s.id,city:s.name});
  if(!Array.isArray(data.races)||!data.races.length)throw Error("Bu gün/şehir için sonuç bulunamadı");
  state.results=data;rebuildRows();
  const audit=audit39(state.rows,{raceNumbers:state.rowRaceNos});
  if(!audit.ok)throw Error("39 sütun denetimi: "+audit.errors.slice(0,2).join("; "));
  const rec={date:s.date,cityId:s.id,cityName:s.name,raw:data,rows:state.rows,raceNumbers:state.rowRaceNos,agf:state.agf,audit};
  dayOf(s.date).results[String(s.id)]=rec;
  mark(state.archive,s.date,s.id,"result","INDIRILDI");
  await persistRecord("result",s.date,s.id,rec);
  refreshArchiveUI();status(s.name+": "+state.rows.length+" gerçek at sonucu alındı.","ok");
}
async function loadAgf(){
  const s=selection();if(!s.date)throw Error("Tarih seçin");
  const data=await requestApi("/api/tjk-bet-starts-v11",{date:s.date,cityId:s.id,cityName:s.name});
  state.agf=data.agf||null;rebuildRows();
  const rec=dayOf(s.date).results[String(s.id)];
  if(rec){
    rec.agf=state.agf;rec.rows=state.rows;rec.raceNumbers=state.rowRaceNos;
    rec.audit=audit39(state.rows,{raceNumbers:state.rowRaceNos});
    await persistRecord("result",s.date,s.id,rec);
  }
  refreshArchiveUI();status("AGF1: "+(data.agf?.pool1?.horseValueCount||0)+
    " yüzde, AGF2: "+(data.agf?.pool2?.horseValueCount||0)+
    " yüzde. Resmî sıra bilinmiyorsa boş.","ok");
}
function refreshProgress(date,index,total,cityName=""){
  const p=Math.round(((index+1)/total)*100);
  batchProgress((index+1)+"/"+total+" gün · "+date+(cityName?" · "+cityName:"")+
    " · "+formatSummary(reportArchive(state.archive)),p);
  refreshArchiveCountOnly();
}
function refreshArchiveCountOnly(){
  id("archiveStatus").textContent=reportArchive(state.archive).days+" gün";
}
function formatSummary(s){return s.programs+" bülten, "+s.results+" sonuç, "+s.horses+
  " at; "+s.unplannedCities+" yarışsız şehir, "+s.pendingResults+" bekleyen, "+s.errors+" gerçek sorun";}
async function bulkScan(mode){
  if(state.busy)throw Error("Zaten toplu indirme sürüyor");
  const dates=datesBetween(id("dateStart").value,id("dateEnd").value,366);
  state.busy=true;state.abort=new AbortController();
  for(const key of ["bulkPrograms","bulkResults","bulkBoth"])id(key).disabled=true;
  id("bulkCancel").disabled=false;
  id("bulkBar").value=0;
  let stopped=false,failedDays=0;
  try{
    for(let dayIndex=0;dayIndex<dates.length;dayIndex++){
      const date=dates[dayIndex],record=dayOf(date);
      if(state.abort.signal.aborted){stopped=true;break;}
      if(!Array.isArray(record.scheduledCityIds)){
        try{
          const catalog=await requestApi("/api/tjk-program",{date,catalog:1},state.abort.signal);
          setSchedule(state.archive,date,domesticMeetings(catalog));
        }catch(e){
          if(state.abort.signal.aborted){stopped=true;break;}
          failedDays++;
          mark(state.archive,date,0,"program","KATALOG_HATASI",e.message);
          refreshProgress(date,dayIndex,dates.length,"Takvim okunamadı");
          await persistReport().catch(()=>{state.directory=null;});
          continue;
        }
      }
      const scheduled=record.scheduledCityIds||[];
      if(!scheduled.length){
        refreshProgress(date,dayIndex,dates.length,"Türkiye'de yarış günü yok");
        await persistReport().catch(()=>{state.directory=null;});
        continue;
      }
      for(const cityId of scheduled){
        if(state.abort.signal.aborted){stopped=true;break;}
        const c=CITY_BY_ID.get(String(cityId));if(!c)continue;
        const key=String(cityId);
        batchProgress(date+" · "+c.name+" programı/sonucu işleniyor",((dayIndex)/dates.length)*100);
        if(!record.programs[key]){
          try{
            const data=await requestApi("/api/tjk-program",{date,cityId:c.id},state.abort.signal);
            const races=data.programs?.[key]||data.racesByCity?.[key]||[];
            if(!Array.isArray(races))throw Error("Koşu dizisi bulunamadı");
            if(!races.length){
              mark(state.archive,date,cityId,"program","PROGRAM_BOS_KONTROL","TJK takviminde şehir var ama koşu tablosu boş; yarışsız gün ile ayrıştırıcı sorunu henüz ayrıştırılamadı");
              continue;
            }
            const program={date,cityId:c.id,cityName:c.name,races,sourceUrl:data.sourceUrl||null};
            record.programs[key]=program;
            mark(state.archive,date,cityId,"program","INDIRILDI");
            await persistRecord("program",date,c.id,program);
          }catch(e){
            if(state.abort.signal.aborted){stopped=true;break;}
            mark(state.archive,date,cityId,"program","INDIRME_HATASI",e.message);
            continue;
          }
        }
        if(mode==="program")continue;
        if(record.results[key])continue;
        try{
          const result=await requestApi("/api/tjk-day-results-v1",{date,cityId:c.id,city:c.name},state.abort.signal);
          if(!Array.isArray(result.races)||!result.races.length)throw Error("TJK sonuçları boş");
          let agf=null;
          try{
            const agfResponse=await requestApi("/api/tjk-bet-starts-v11",{date,cityId:c.id,cityName:c.name},state.abort.signal);
            agf=agfResponse.agf||null;
          }catch(e){
            if(state.abort.signal.aborted){stopped=true;break;}
            record.warnings.push({cityId:c.id,kind:"agf",status:"AGF_ERISIM",message:String(e.message||e)});
          }
          const converted=flattenResultDayWithRaceNumbers(result,agf);
          const audit=audit39(converted.rows,{raceNumbers:converted.raceNumbers});
          if(!audit.ok)throw Error("39 sütun: "+audit.errors.slice(0,2).join("; "));
          const data={date,cityId:c.id,cityName:c.name,raw:result,agf,rows:converted.rows,
            raceNumbers:converted.raceNumbers,audit};
          record.results[key]=data;
          const officialCount=record.programs[key]?.races?.length||0;
          if(officialCount && result.races.length < officialCount){
            mark(state.archive,date,c.id,"result","KISMEN_SONUCLANDI",
              "Programda "+officialCount+" koşu, sonuçlarda "+result.races.length+" gerçekleşen koşu. Eksik/iptal koşular hata sayılmadı.");
          }else mark(state.archive,date,c.id,"result","INDIRILDI");
          await persistRecord("result",date,c.id,data);
        }catch(e){
          if(state.abort.signal.aborted){stopped=true;break;}
          mark(state.archive,date,c.id,"result",
            classifyResultFailure({status:e.status,notFound:e.notFound,scheduled:true}),
            String(e.message||e));
        }
      }
      refreshProgress(date,dayIndex,dates.length,stopped?"Duraklatıldı":"tamamlandı");
      await persistReport().catch(()=>{state.directory=null;});
      if(stopped)break;
      // UI'nin iptal/durum güncellemelerine fırsat ver.
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }finally{
    state.busy=false;state.abort=null;
    for(const key of ["bulkPrograms","bulkResults","bulkBoth"])id(key).disabled=false;
    id("bulkCancel").disabled=true;
    refreshArchiveUI();openSelectedFromArchive();
    const r=reportArchive(state.archive);
    status((stopped?"İşlem durduruldu; ":"Toplu tarama tamamlandı; ")+formatSummary(r)+
      (failedDays?" · "+failedDays+" gün takvim hatası.":"")+
      (state.directory?" Dosyalar seçilen klasörde.":" ZIP yedeğini indirip saklayın."),
      r.errors?"error":"ok");
    if(!state.directory && Object.keys(state.archive.days).length>0){
      try{exportZip();}catch(e){status("ZIP otomatik indirilemedi: "+e.message+"; 'Arşivi ZIP İndir' düğmesini kullanın.","error");}
    }
  }
}
function exportZip(){
  const files=archiveFiles(state.archive);
  if(Object.keys(files).length<2)throw Error("Henüz indirilen yarış kaydı yok");
  const bytes=zipFiles(files);
  userDownload(bytes,"AT_AI_Klasik_V32_Bulten_Sonuc_"+dateNow()+".zip","application/zip");
}
async function uploadZip(file){
  if(!file||file.size>150*1024*1024)throw Error("Arşiv 150 MB sınırını aşıyor veya dosya seçilmedi");
  const contents=unzipFiles(await file.arrayBuffer());
  state.archive=importArchive(contents);
  refreshArchiveUI();openSelectedFromArchive();
  status("ZIP arşivi geri yüklendi. Tamamlanan günler ve şehirler yeniden indirilmez.","ok");
}
function exportJson(){
  const s=selection(),d=dayOf(s.date),row=d.results[String(s.id)];
  if(!row||!Array.isArray(row.rows))throw Error("Seçilen gün/şehir için indirilen sonuç yok");
  const audit=audit39(row.rows,{raceNumbers:row.raceNumbers});
  if(!audit.ok)throw Error("Sonuçlar hatalı, dışa aktarma durduruldu: "+audit.errors.slice(0,2).join("; "));
  const data={format:"AT_AI_KLASIK_V32_39_FIELD_DRAFT",date:s.date,city:s.name,
    fieldOrder:FIELDS,raceNumbers:row.raceNumbers,rows:row.rows,source:row.raw?.resultUrl||null,
    note:"KN=kulvar; koşu no raceNumbers metaverisinde. Boş alanlar null. Tahmini derece değil."};
  userDownload(JSON.stringify(data,null,2),"klasik-v32-"+s.date+"-"+s.id+"-39-alan.json","application/json;charset=utf-8");
}
function handle(button,action){
  id(button).addEventListener("click",async ()=>{
    const b=id(button);b.disabled=true;
    try{await action();}catch(e){if(e?.name!=="AbortError")status(String(e?.message||e),"error");}
    finally{if(!state.busy)b.disabled=false;}
  });
}
function init(){
  id("city").innerHTML=CITIES.map(c=>'<option value="'+c.id+'">'+esc(c.name)+"</option>").join("");
  id("city").value="4";id("date").value=dateNow();
  id("dateStart").value=dateNow();id("dateEnd").value=dateNow();
  id("city").addEventListener("change",resetForSelection);id("date").addEventListener("change",resetForSelection);
  id("race").addEventListener("change",()=>{renderProgram();renderResults();});
  id("races").addEventListener("click",e=>{const b=e.target.closest("[data-race]");if(!b)return;
    id("race").value=b.dataset.race;renderProgram();renderResults();});
  handle("loadProgram",loadProgram);handle("loadResults",loadResults);handle("loadAgf",loadAgf);
  handle("chooseFolder",chooseFolder);handle("downloadZip",()=>exportZip());
  handle("exportJson",()=>exportJson());
  handle("importZip",()=>id("zipFile").click());
  id("zipFile").addEventListener("change",async e=>{
    try{await uploadZip(e.target.files?.[0]);}catch(err){status("ZIP yükleme hatası: "+err.message,"error");}
    finally{e.target.value="";}
  });
  handle("bulkPrograms",()=>bulkScan("program"));
  handle("bulkResults",()=>bulkScan("result"));
  handle("bulkBoth",()=>bulkScan("both"));
  id("bulkCancel").addEventListener("click",()=>state.abort?.abort());
  refreshArchiveUI();renderAudit();
}
init();
