(() => {
'use strict';
const V='CAREER-EXPORT-V12.2', MIN_YEAR=2000, cache={hist:null,careers:new Map()}, $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const city=()=>typeof getCityName==='function'?getCityName():'';
const dist=v=>{const m=clean(v).match(/\d{3,4}/);return m?Number(m[0]):num(v)};
const safe=(v,f='AT')=>(clean(v).replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_').replace(/^_+|_+$/g,'')||f).slice(0,70);
const label=t=>t==='EXACT'?'Tam':t==='CONDITION_TWIN'?'Koşul İkizi':t==='RACE_FAMILY'?'Yarış Ailesi':clean(t);
const rowsOf=o=>{const c=[o?.comparisonPath,o?.fullPath,o?.history,o?.fullPathBefore,o?.historyBefore,o?.roadmapBefore,o?.roadmap,o?.races],a=c.find(x=>Array.isArray(x)&&x.length)||c.find(Array.isArray)||[];return [...a].sort((x,y)=>clean(x?.isoDate||x?.date).localeCompare(clean(y?.isoDate||y?.date)))};
let xlsxPromise=null;
async function xlsx(){
  if(window.XLSX?.utils?.json_to_sheet)return window.XLSX;
  if(!xlsxPromise)xlsxPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=()=>resolve(window.XLSX);s.onerror=()=>reject(new Error('Excel kitaplığı yüklenemedi.'));document.head.appendChild(s)});
  return xlsxPromise;
}
function widths(rows){if(!rows.length)return[];return Object.keys(rows[0]).map(k=>({wch:Math.min(42,Math.max(10,k.length+2,...rows.slice(0,200).map(r=>String(r?.[k]??'').length+2)))}))}
async function book(file,sheets){const X=await xlsx(),wb=X.utils.book_new();for(const s of sheets){const data=s.rows?.length?s.rows:[{Bilgi:'Kayıt yok'}],ws=X.utils.json_to_sheet(data);ws['!cols']=widths(data);X.utils.book_append_sheet(wb,ws,safe(s.name,'Sayfa').slice(0,31))}wb.Props={Title:file,Author:'AT AI SYSTEM',Comments:V};X.writeFile(wb,file,{compression:true})}
function race(){const n=$('ceRace')?.value;return (state?.races||[]).find(r=>String(r.no)===String(n))||null}
function meta(r){return{date:clean(state?.date),cityId:clean(state?.city),city:clean(city()),raceNo:num(r?.no),class:clean(r?.class||r?.yaradi1),age:clean(r?.ageGroup||r?.yaradi2),distance:dist(r?.distance||r?.mesafe),track:clean(r?.track||r?.pist)}}
function audit(r){const m=meta(r);return[{Alan:'Export_Sürümü',Değer:V},{Alan:'Hedef_Tarih',Değer:m.date},{Alan:'Hedef_Şehir',Değer:m.city},{Alan:'Hedef_Şehir_ID',Değer:m.cityId},{Alan:'Hedef_Koşu_No',Değer:m.raceNo},{Alan:'Hedef_Sınıf',Değer:m.class},{Alan:'Hedef_Yaş_Grubu',Değer:m.age},{Alan:'Hedef_Mesafe',Değer:m.distance},{Alan:'Hedef_Pist',Değer:m.track},{Alan:'Cutoff_Kuralı',Değer:'Yalnız hedef/referans yarış tarihinden ÖNCEKİ tüm kariyer koşuları'},{Alan:'Fark_Kuralı',Değer:'TJK sonuçlarındaki Fark zinciri ilk 5 için kümülatif toplanır; <=1 boy yakın mücadele'}]}
function careerRow(x,i,ctx={}){return{
 'Kariyer_Sıra_No':i+1,'Tarih_ISO':clean(x?.isoDate),'Tarih':clean(x?.date),'Şehir':clean(x?.city||x?.sehir),'Koşu_Sınıfı':clean(x?.class||x?.raceClass),'Koşu_Sınıfı_Raw':clean(x?.classRaw||x?.kcins),'Yaş_Grubu':clean(x?.ageGroup),'Grup_Raw':clean(x?.groupRaw),'Mesafe':num(x?.distance??x?.mesafe??x?.msf),'Pist':clean(x?.track||x?.pist),'Pist_Raw':clean(x?.trackRaw),'Pist_Durumu':clean(x?.trackCondition),'Bitiriş':num(x?.finish??x?.rank??x?.sira),'Fark_Ham_TJK':clean(x?.marginRawToNext||x?.marginRaw||x?.fark),'Öndeki_Alta_Fark_Boy_Yaklaşık':num(x?.marginToNextApprox),'Kazanana_Fark_Boy_Yaklaşık':num(x?.winnerGapApprox),'Kazanana_Fark_Zinciri':clean(x?.winnerGapChain),'Yakın_Mücadele':x?.closeFinish===true?'EVET':x?.closeFinish===false?'HAYIR':'','Yakınlık_Sınıfı':clean(x?.closeFinishLabel),'Fark_Kaynağı':clean(x?.marginSource),'Fark_Sonuç_URL':clean(x?.marginResultUrl||x?.resultUrl),'Derece':clean(x?.degree||x?.derece),'Sıklet':num(x?.weight??x?.siklet),'Takı':clean(x?.equipment||x?.taki),'Jokey':clean(x?.jockey||x?.jokey),'St_Kulvar':num(x?.startNo??x?.st),'Ganyan':num(x?.odds??x?.ganyan),'HP':num(x?.hp),'S20':num(x?.s20),'Antrenör':clean(x?.trainer||x?.antrenor),'Sahip':clean(x?.owner||x?.sahip),'İkramiye':num(x?.prize||x?.ikramiye),'At_ID':clean(x?.horseId||ctx.id),'At_Adı':clean(x?.horseName||ctx.name),'Kaynak_URL':clean(x?.sourceUrl),'Unique_Key':clean(x?.uniqueKey)
}}
async function json(url,timeout=180000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:c.signal});let d;try{d=await r.json()}catch{throw new Error(`API ${r.status}: JSON okunamadı`)}if(!r.ok||!d?.ok)throw new Error(d?.error||`API ${r.status}`);return d}catch(e){if(e?.name==='AbortError')throw new Error('İstek zaman aşımına uğradı.');throw e}finally{clearTimeout(t)}}
function status(s,k=''){const e=$('ceStatus');if(e){e.textContent=s;e.dataset.kind=k}}
function programRows(r){const m=meta(r);return(r?.horses||[]).map(h=>({'Hedef_Tarih':m.date,'Hedef_Şehir':m.city,'Hedef_Koşu_No':m.raceNo,'Hedef_Sınıf':m.class,'Hedef_Yaş_Grubu':m.age,'Hedef_Mesafe':m.distance,'Hedef_Pist':m.track,'Program_No':num(h?.no),'At_ID':clean(h?.id),'At_Adı':clean(h?.name),'Yaş':clean(h?.age),'Orijin':clean(h?.origin),'Sıklet':num(h?.weight),'Jokey':clean(h?.jockey),'Sahip':clean(h?.owner),'Antrenör':clean(h?.trainer),'St_Kulvar':num(h?.st),'HP':num(h?.hp),'Son_6':clean(h?.last6),'KGS':num(h?.kgs),'S20':num(h?.s20),'En_İyi_Derece':clean(h?.best),'Ganyan':num(h?.odds),'AGF':num(h?.agf)}))}
async function currentCareer(h,force=false){if(!h?.id)throw new Error(`${clean(h?.name)||'At'} için TJK At ID yok.`);const k=`${h.id}|${state.date}`;if(!force&&cache.careers.has(k))return cache.careers.get(k);const p=new URLSearchParams({horseId:String(h.id),before:String(state.date),t:String(Date.now())}),base=await json(`/api/tjk-career-v10?${p}`,90000),d=typeof window.enrichCareerMarginsV122==='function'?await window.enrichCareerMarginsV122(base,{maxRows:6}):base,z={horse:h,data:d,path:rowsOf(d)};cache.careers.set(k,z);return z}
async function downloadHorse(h,btn){const r=race();if(!r)return;const old=btn?.textContent;try{if(btn){btn.disabled=true;btn.textContent='Hazırlanıyor…'}status(`${h.name} tam kariyeri ve bitiriş farkları alınıyor…`);const z=await currentCareer(h,true),pr=programRows(r).find(x=>String(x.At_ID)===String(h.id))||{};await book(`${safe(state.date)}_${safe(city())}_${r.no}K_${safe(h.no)}_${safe(h.name)}_KARIYER.xlsx`,[{name:'Denetim',rows:[...audit(r),{Alan:'At_Adı',Değer:h.name},{Alan:'At_ID',Değer:h.id},{Alan:'Kariyer_Satır_Sayısı',Değer:z.path.length},{Alan:'Fark_Zenginleştirilen',Değer:num(z.data?.marginAudit?.enrichedRows)??0}]},{name:'Program',rows:[pr]},{name:'Tum_Kariyer',rows:z.path.map((x,i)=>careerRow(x,i,{id:h.id,name:h.name}))}]);status(`${h.name}: ${z.path.length} geçmiş koşu Excel'e aktarıldı.`,'ok')}catch(e){status(`${h.name}: ${e?.message||'Kariyer alınamadı.'}`,'error')}finally{if(btn){btn.disabled=false;btn.textContent=old||'Excel indir'}}}
function renderCurrent(){const r=race(),b=$('ceCurrent');if(!b)return;const hs=r?.horses||[];b.innerHTML=hs.length?hs.map((h,i)=>`<div class="ce-row"><div><b>${esc(h.no)}. ${esc(h.name)}</b><small>At ID ${esc(h.id||'yok')} · hedef tarih öncesi tüm kariyer · ilk 5 bitiriş farkı denetimi</small></div><button class="secondary small ce-one" data-i="${i}" ${h.id?'':'disabled'}>Excel indir</button></div>`).join(''):'<div class="ce-empty">At bulunamadı.</div>';b.querySelectorAll('.ce-one').forEach(x=>x.onclick=()=>downloadHorse(hs[Number(x.dataset.i)],x))}
function winnerSummary(ws){return ws.map((w,i)=>({No:i+1,'Referans_Tipi':label(w.type),'Referans_Tipi_Kod':w.type,'Yıl':w.year,'Referans_Tarih':w.date,'Referans_Şehir':w.city,'Referans_Koşu_No':w.raceNo,'Referans_Sınıf':w.class,'Referans_Yaş_Grubu':w.age,'Referans_Mesafe':w.distance,'Referans_Pist':w.track,'Kazanan_At':w.name,'Kazanan_At_ID':w.id,'Program_No':w.no,'Cutoff_Exclusive':w.cutoff,'Galibiyet_Öncesi_Tüm_Koşu_Sayısı':w.path.length,'Kariyer_OK':w.ok?'EVET':'HAYIR','Kariyer_Hata':w.error}))}
function winnerFlat(ws){const a=[];for(const w of ws)w.path.forEach((x,i)=>a.push({'Referans_Tipi':label(w.type),'Referans_Tipi_Kod':w.type,'Referans_Yıl':w.year,'Referans_Tarih':w.date,'Referans_Şehir':w.city,'Referans_Koşu_No':w.raceNo,'Referans_Sınıf':w.class,'Referans_Yaş_Grubu':w.age,'Referans_Mesafe':w.distance,'Referans_Pist':w.track,'Kazanan_At':w.name,'Kazanan_At_ID':w.id,'Kazanan_Program_No':w.no,'Galibiyet_Öncesi_Kariyer_Satırı':w.path.length,...careerRow(x,i,{id:w.id,name:w.name})}));return a}
async function historical(force=true){const r=race(),m=meta(r);if(!r||!m.date||!m.city||!m.class||!m.age||!m.distance||!m.track)throw new Error('Seçili koşunun şart bilgileri eksik.');const key=[m.date,m.city,m.raceNo,m.class,m.age,m.distance,m.track].join('|');if(!force&&cache.hist?.key===key)return cache.hist;const p=new URLSearchParams({date:m.date,city:m.city,class:m.class,ageGroup:m.age,track:m.track,distance:String(m.distance),minYear:String(MIN_YEAR),t:String(Date.now())}),d=await json(`/api/tjk-model-roadmap-v11?${p}`),ws=[],seen=new Set();for(const type of['EXACT','CONDITION_TWIN','RACE_FAMILY'])for(const rr of(d?.models?.[type]||[])){const w=(rr?.top3||[]).find(x=>Number(x?.finish)===1);if(!w)continue;const k=[type,rr.date,rr.city,rr.raceNo,w.horseId||w.horseName].join('|');if(seen.has(k))continue;seen.add(k);ws.push({type,year:num(rr.sourceYear)||num(String(rr.date||'').slice(0,4)),date:clean(rr.date),city:clean(rr.city),raceNo:num(rr.raceNo),class:clean(rr?.condition?.class||rr.authoritativeClass||rr.class),age:clean(rr?.condition?.ageGroup||rr.ageGroup),distance:num(rr?.condition?.distance??rr.distance),track:clean(rr?.condition?.track||rr.track),id:clean(w.horseId),name:clean(w.horseName),no:num(w.programNo),cutoff:clean(w?.career?.cutoffExclusive||rr.date),ok:Boolean(w?.career?.ok),error:clean(w?.career?.error),path:rowsOf(w?.career||{})})}ws.sort((a,b)=>(b.year||0)-(a.year||0)||a.type.localeCompare(b.type));cache.hist={key,data:d,winners:ws};return cache.hist}
async function winnerBook(w){const r=race();if(typeof window.enrichCareerMarginsV122==='function'){const e=await window.enrichCareerMarginsV122({ok:true,history:w.path},{maxRows:6});w.path=rowsOf(e)}await book(`${safe(state.date)}_${safe(city())}_${r.no}K_${safe(w.year)}_${safe(w.name)}_KAZANMADAN_ONCE.xlsx`,[{name:'Denetim',rows:[...audit(r),{Alan:'Referans_Tipi',Değer:label(w.type)},{Alan:'Referans_Tarih',Değer:w.date},{Alan:'Referans_Şehir',Değer:w.city},{Alan:'Referans_Koşu_No',Değer:w.raceNo},{Alan:'Kazanan_At',Değer:w.name},{Alan:'Kazanan_At_ID',Değer:w.id},{Alan:'Galibiyet_Öncesi_Kariyer_Satırı',Değer:w.path.length}]},{name:'Kazanan_Ozet',rows:winnerSummary([w])},{name:'Galibiyet_Oncesi',rows:winnerFlat([w])}])}
function renderWinners(ws=[]){const b=$('ceWinners'),all=$('ceAllWinners');if(all)all.disabled=!ws.length;if(!b)return;b.innerHTML=ws.length?ws.map((w,i)=>`<div class="ce-row"><div><b>${esc(w.year||'')} · ${esc(w.name||'Kazanan')}</b><small>${esc(label(w.type))} · ${esc(w.date)} ${esc(w.city)} ${esc(w.raceNo)}. Koşu · galibiyet öncesi ${esc(w.path.length)} koşu</small></div><button class="secondary small ce-winner" data-i="${i}" ${w.path.length?'':'disabled'}>Excel indir</button></div>`).join(''):'<div class="ce-empty">Henüz hazırlanmadı.</div>';b.querySelectorAll('.ce-winner').forEach(x=>x.onclick=async()=>{try{const w=ws[Number(x.dataset.i)];x.disabled=true;await winnerBook(w);status(`${w.name}: ${w.path.length} galibiyet öncesi koşu aktarıldı.`,'ok')}catch(e){status(e?.message||'Excel indirilemedi.','error')}finally{x.disabled=false}})}
async function prepare(){const btn=$('cePrepare'),old=btn?.textContent;try{if(btn){btn.disabled=true;btn.textContent='Taranıyor…'}status('Tam · İkiz · Aile tarihsel yarışları ve kazananların galibiyet öncesi yolları hazırlanıyor…');const z=await historical(true);renderWinners(z.winners);status(`${z.winners.length} tarihsel kazanan · ${z.winners.reduce((n,w)=>n+w.path.length,0)} galibiyet öncesi kariyer satırı hazır.`,'ok')}catch(e){renderWinners([]);status(e?.message||'Tarihsel kazananlar hazırlanamadı.','error')}finally{if(btn){btn.disabled=false;btn.textContent=old||'Geçmiş kazananları hazırla'}}}
async function allWinners(){const r=race(),ws=cache.hist?.winners||[];if(!r||!ws.length)return status('Önce geçmiş kazananları hazırlayın.','error');try{await book(`${safe(state.date)}_${safe(city())}_${r.no}K_GECMIS_KAZANANLAR_GALIBIYET_ONCESI.xlsx`,[{name:'Denetim',rows:[...audit(r),{Alan:'Tarihsel_Kazanan_Sayısı',Değer:ws.length},{Alan:'Toplam_Kariyer_Satırı',Değer:ws.reduce((n,w)=>n+w.path.length,0)},{Alan:'Not',Değer:'Toplu geçmiş kazanan dosyasında fark alanı yalnız daha önce zenginleştirilen satırlarda doludur; tek kazanan Excel indirmesi farkı ayrıca doğrular.'}]},{name:'Kazananlar',rows:winnerSummary(ws)},{name:'Tum_Galibiyet_Oncesi',rows:winnerFlat(ws)}]);status(`${ws.length} geçmiş kazanan tek Excel dosyasına aktarıldı.`,'ok')}catch(e){status(e?.message||'Excel indirilemedi.','error')}}
async function allCurrent(){const r=race(),hs=r?.horses||[],btn=$('ceAllCurrent'),old=btn?.textContent;if(!hs.length)return status('Bu koşuda at yok.','error');try{if(btn){btn.disabled=true;btn.textContent='Hazırlanıyor…'}const good=[],bad=[];let done=0;for(const h of hs){try{good.push(await currentCareer(h,true))}catch(e){bad.push({At:h.name,At_ID:h.id,Hata:e?.message||String(e)})}done++;status(`Koşacak atların kariyerleri ve ilk 5 farkları alınıyor… ${done}/${hs.length}`)}const flat=[];for(const z of good)z.path.forEach((x,i)=>flat.push({'Program_No':num(z.horse.no),'Güncel_At':z.horse.name,'Güncel_At_ID':z.horse.id,...careerRow(x,i,{id:z.horse.id,name:z.horse.name})}));await book(`${safe(state.date)}_${safe(city())}_${r.no}K_KOSACAK_ATLAR_TUM_KARIYER.xlsx`,[{name:'Denetim',rows:[...audit(r),{Alan:'At_Sayısı',Değer:hs.length},{Alan:'Başarılı_Kariyer',Değer:good.length},{Alan:'Hatalı_Kariyer',Değer:bad.length}]},{name:'Program_Atlari',rows:programRows(r)},{name:'Tum_Kariyerler',rows:flat},...(bad.length?[{name:'Hatalar',rows:bad}]:[])]);status(`${good.length}/${hs.length} atın kariyeri tek Excel'e aktarıldı${bad.length?` · ${bad.length} hata Hatalar sayfasında`:''}.`,bad.length?'warn':'ok')}catch(e){status(e?.message||'Toplu Excel hazırlanamadı.','error')}finally{if(btn){btn.disabled=false;btn.textContent=old||'Tüm koşacak atları tek Excel indir'}}}
function context(){const r=race(),m=meta(r),b=$('ceContext');if(b)b.innerHTML=r?`<b>${esc(m.city)} · ${esc(m.date)} · ${esc(m.raceNo)}. Koşu</b><small>${esc(m.class||'-')} · ${esc(m.age||'-')} · ${esc(m.distance||'-')} ${esc(m.track||'')}</small>`:'Koşu seçilmedi.'}
function sync(){const s=$('ceRace'),rs=state?.races||[],pref=String(state?.selectedRace||'')!=='all'?String(state.selectedRace):String(rs[0]?.no||'');s.innerHTML=rs.length?rs.map(r=>`<option value="${esc(r.no)}">${esc(r.no)}. Koşu · ${esc(r.class||'')} · ${esc(r.distance||'')} ${esc(r.track||'')}</option>`).join(''):'<option value="">Önce programı yükleyin</option>';if(rs.some(r=>String(r.no)===pref))s.value=pref;cache.hist=null;context();renderCurrent();renderWinners([]);status(rs.length?'Koşuyu seçin. Excel dosyaları modelin görmesi gereken ham kariyer ve bitiriş farkı satırlarını içerecek.':'Önce TJK programını yükleyin.')}
function inject(){
 const note=document.querySelector('#drawer .drawer-note');if(note&&!$('careerExportMenuBtn')){const b=document.createElement('button');b.id='careerExportMenuBtn';b.textContent='6. Kariyer Excel Denetimi';note.before(b)}
 if(!$('careerExportDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="careerExportDialog"><div class="dialog-head"><div><div class="eyebrow">HAM VERİ DENETİMİ</div><h2>Kariyer Excel Dışa Aktarım</h2></div><button id="ceClose" class="icon-btn">✕</button></div><div class="ce-body"><label>Koşu seç<select id="ceRace"></select></label><div id="ceContext" class="ce-context"></div><section class="ce-block"><h3>Geçmiş kazananlar · galibiyet öncesi</h3><p>Seçili koşunun Tam, Koşul İkizi ve Yarış Ailesi referanslarında kazanan atların, kazandıkları yarıştan önceki TÜM koşuları.</p><div class="ce-actions"><button id="cePrepare" class="primary small">Geçmiş kazananları hazırla</button><button id="ceAllWinners" class="secondary small" disabled>Tümünü tek Excel indir</button></div><div id="ceWinners" class="ce-list"></div></section><section class="ce-block"><h3>Koşacak atlar · tam kariyer</h3><p>Her atı ayrı Excel indirebilir veya seçili koşudaki tüm atları tek denetim dosyasında toplayabilirsin. İlk 5 bitirişlerde TJK Fark zinciri ayrıca doğrulanır.</p><div class="ce-actions"><button id="ceAllCurrent" class="secondary small">Tüm koşacak atları tek Excel indir</button></div><div id="ceCurrent" class="ce-list"></div></section><div id="ceStatus" class="ce-status"></div></div></dialog>`);
 if(!$('ceStyle')){const s=document.createElement('style');s.id='ceStyle';s.textContent=`#careerExportDialog{width:min(760px,calc(100vw - 24px));max-height:88vh;padding:0;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:#071522;color:#eef7ff;overflow:hidden}#careerExportDialog::backdrop{background:rgba(0,0,0,.72)}.ce-body{padding:14px;overflow:auto;max-height:calc(88vh - 68px)}.ce-context,.ce-status,.ce-block{border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.035)}.ce-context{padding:10px 12px;margin:10px 0}.ce-context b,.ce-context small{display:block}.ce-context small{opacity:.72;margin-top:4px}.ce-block{padding:12px;margin-top:12px}.ce-block h3{margin:0 0 5px;font-size:15px}.ce-block p{margin:0 0 10px;font-size:12px;opacity:.74;line-height:1.5}.ce-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}.ce-list{display:grid;gap:8px}.ce-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}.ce-row b,.ce-row small{display:block}.ce-row small{margin-top:3px;opacity:.7;line-height:1.35}.ce-empty{padding:10px;opacity:.68;font-size:12px}.ce-status{margin-top:12px;padding:10px 12px;font-size:12px;line-height:1.45}.ce-status[data-kind=ok]{border-color:rgba(74,222,128,.38)}.ce-status[data-kind=warn]{border-color:rgba(251,191,36,.42)}.ce-status[data-kind=error]{border-color:rgba(248,113,113,.48)}#ceRace{width:100%}@media(max-width:560px){.ce-row{align-items:flex-start;flex-direction:column}.ce-row button,.ce-actions button{width:100%}}`;document.head.appendChild(s)}
 $('careerExportMenuBtn').onclick=()=>{if(typeof closeDrawer==='function')closeDrawer();sync();$('careerExportDialog').showModal()};$('ceClose').onclick=()=>$('careerExportDialog').close();$('ceRace').onchange=()=>{cache.hist=null;context();renderCurrent();renderWinners([]);status('Koşu değişti. Geçmiş kazananları yeniden hazırlayın.')};$('cePrepare').onclick=prepare;$('ceAllWinners').onclick=allWinners;$('ceAllCurrent').onclick=allCurrent;
}
inject();window.AT_AI_CAREER_EXPORT={version:V,open:()=>{$('careerExportMenuBtn')?.click()},prepare};
})();

/* AT AI Mobil — V12.2 bitiriş sırası + TJK Fark zenginleştirmesi */
(() => {
'use strict';
if(window.__AT_CAREER_MARGIN_V122__) return;
window.__AT_CAREER_MARGIN_V122__=true;
const VERSION='CAREER-MARGIN-V12.2';
const n=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const pathOf=c=>{const a=[c?.comparisonPath,c?.fullPath,c?.history,c?.roadmap,c?.races].find(x=>Array.isArray(x)&&x.length);return a||[]};
function merge(career,margins,audit){
  const map=new Map((margins||[]).filter(x=>x?.uniqueKey).map(x=>[String(x.uniqueKey),x]));
  const patch=row=>{const m=map.get(String(row?.uniqueKey||''));return m?{...row,...m,marginResultUrl:m.resultUrl||null}:row};
  const out={...career,marginAudit:audit||null,marginVersion:VERSION};
  for(const key of ['history','comparisonPath','fullPath','roadmap','races','wins','top5','preparationPath','recentForm']) if(Array.isArray(career?.[key])) out[key]=career[key].map(patch);
  return out;
}
window.enrichCareerMarginsV122=async function(career,{maxRows=6}={}){
  const history=pathOf(career);
  if(!career?.ok||!history.length) return career;
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),65000);
    try{
      const res=await fetch('/api/tjk-margin-enrich-v122',{method:'POST',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({history,maxRows}),signal:controller.signal});
      const data=await res.json();
      if(!res.ok||!data?.ok) throw new Error(data?.error||`API ${res.status}`);
      return merge(career,data.margins,data);
    } finally { clearTimeout(timer); }
  }catch(e){return {...career,marginVersion:VERSION,marginAudit:{ok:false,error:e?.message||String(e),enrichedRows:0}}}
};
function performanceQuality(row={}){
  const f=n(row?.finish??row?.rank??row?.sira);
  if(f===null||f<1) return null;
  if(f===1) return 1;
  const bases={2:.82,3:.66,4:.52,5:.40};
  let q=bases[f]??Math.max(.08,.40-(f-5)*.055);
  const gap=n(row?.winnerGapApprox);
  if(gap!==null&&f<=5){
    if(gap<=.10)q+=.13;else if(gap<=.25)q+=.11;else if(gap<=.50)q+=.09;else if(gap<=1)q+=.07;else if(gap<=2)q+=.04;else if(gap<=3)q+=.02;
  }
  return clamp(Math.min(.98,q));
}
function performanceSimilarity(a,b){const x=performanceQuality(a),y=performanceQuality(b);return x===null||y===null?null:clamp(1-Math.abs(x-y))}
function strict(v){return v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null)}
careerRowSimilarity=function(a,b){
  if(!a||!b)return 0;
  const parts=[
    [typeof classSimilarity==='function'?classSimilarity(a.class||a.raceClass,b.class||b.raceClass):null,.22],
    [typeof ageGroupSimilarity==='function'?ageGroupSimilarity(a.ageGroup||a.group,b.ageGroup||b.group):null,.13],
    [typeof distanceSimilarity==='function'?distanceSimilarity(a.distance||a.mesafe||a.msf,b.distance||b.mesafe||b.msf):null,.15],
    [typeof trackSimilarity==='function'?trackSimilarity(a.track||a.pist,b.track||b.pist):null,.11],
    [typeof citySimilarity==='function'?citySimilarity(a.city,b.city):null,.07],
    [typeof hpSimilarityV11==='function'?hpSimilarityV11(a.hp,b.hp):null,.17],
    [performanceSimilarity(a,b),.15]
  ];
  let sum=0,w=0;
  for(const [value,weight] of parts){const x=strict(value);if(x===null)continue;sum+=clamp(x)*weight;w+=weight}
  return w>0?clamp(sum/w):0;
};
if(typeof fetchCareer==='function'){
  const before=fetchCareer;
  fetchCareer=async function(...args){const c=await before(...args);return c?.ok?window.enrichCareerMarginsV122(c,{maxRows:6}):c};
}
try{
  if(typeof state==='object'&&state&&state.careerMarginVersion!==VERSION){
    state.careerMarginVersion=VERSION;
    if(state.analyses){state.analyses.career={};state.analyses.calibration={};state.analyses.historical={}}
    if(typeof careerModelCacheV112!=='undefined'&&careerModelCacheV112?.clear)careerModelCacheV112.clear();
    if(typeof save==='function')save();
  }
}catch(e){console.warn('[AT AI] margin cache yenileme:',e?.message||e)}
window.AT_AI_CAREER_MARGIN={version:VERSION,performanceQuality};
console.info('[AT AI]',VERSION,'aktif — bitiriş sırası + TJK kümülatif fark');
})();
