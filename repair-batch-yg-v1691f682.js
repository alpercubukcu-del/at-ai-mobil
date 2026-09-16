/* AT AI Mobil — F60.82 Eksik Koşu Onarım Merkezi: toplu yarış günü + Y.G. otomatik onarım */
(() => {
'use strict';
if (window.__AT_F6082_REPAIR_BATCH_YG__) return;
window.__AT_F6082_REPAIR_BATCH_YG__ = true;

const VERSION='REPAIR-BATCH-YG-V16.9.1F60.82';
const RESULTS_DB='at_ai_tjk_annual_results_v1', RESULTS_STORE='races';
const REPAIR_DB='at_ai_race_repair_v1', REPAIR_STORE='repairs';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentMap=new Map(), busy=false;

function api(){return window.ATF6062||null}
function yg(){return window.ATF6081YGResults||null}
function iso(v){return api()?.core?.isoDate?.(v)||clean(v)}
function display(v){return api()?.core?.displayDate?.(v)||clean(v)}
function range(){
  const core=api()?.core, fallback=new Date().toISOString().slice(0,10);
  let start=$('f62rStart')?.value||`${fallback.slice(0,4)}-01-01`,end=$('f62rEnd')?.value||fallback;
  if(core?.normalizeRange){const n=core.normalizeRange(start,end,fallback);start=n.start;end=n.end;}
  return{start:iso(start),end:iso(end)};
}
function raceKey(date,city,no){return`result|${iso(date)}|${fold(city)}|${Number(no)||0}`}
function dayKey(date,city){return`day|${iso(date)}|${fold(city)}`}
function resolvedStatus(s){const x=clean(s).toUpperCase();return x==='COMPLETE'||x==='CANCELLED'||x.includes('MANUAL_MATCH')||x.includes('AUTO_CONFIRMED')||x.includes('HASH_VERIFIED')||x.includes('BATCH_DAY_YG')||x.includes('YG_AUTO');}

function openDb(name){return new Promise(resolve=>{let q;try{q=indexedDB.open(name)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null);});}
async function readResultMap(start,end){
  const db=await openDb(RESULTS_DB);if(!db||!db.objectStoreNames.contains(RESULTS_STORE))return new Map();
  return new Promise(resolve=>{const out=new Map();try{const tx=db.transaction(RESULTS_STORE,'readonly'),os=tx.objectStore(RESULTS_STORE),idx=os.indexNames.contains('date')?os.index('date'):null,q=idx?idx.openCursor(IDBKeyRange.bound(start,end)):os.openCursor();q.onsuccess=e=>{const c=e.target.result;if(!c)return;const r=c.value,d=iso(r?.date||r?.scheduledDate);if(d&&d>=start&&d<=end)out.set(r.key||raceKey(d,r.city,r.raceNo),r);c.continue()};tx.oncomplete=()=>{try{db.close()}catch{}resolve(out)};tx.onerror=tx.onabort=()=>{try{db.close()}catch{}resolve(out)}}catch{try{db.close()}catch{}resolve(out)}})}
async function markResolvedFromArchive(recs,start,end){
  const resultMap=await readResultMap(start,end),changed=[];
  for(const rec of recs){
    const key=raceKey(rec.scheduledDate,rec.city,rec.raceNo),hit=resultMap.get(key);
    if(!hit||clean(rec.repairStatus).toUpperCase()==='CANCELLED'||clean(rec.repairStatus).toUpperCase()==='COMPLETE')continue;
    changed.push({...rec,repairStatus:'COMPLETE',actualResultDate:iso(hit.actualResultDate||hit.runDate||rec.actualResultDate||rec.scheduledDate),actualCity:hit.actualCity||rec.city,actualRaceNo:Number(hit.actualRaceNo||hit.raceNo||rec.raceNo),repairSource:hit.repairSource||hit.source||rec.repairSource||'ARCHIVE_SYNC',updatedAt:new Date().toISOString()});
  }
  if(!changed.length)return{changed:0,resultMap};
  const db=await openDb(REPAIR_DB);if(!db||!db.objectStoreNames.contains(REPAIR_STORE))return{changed:0,resultMap};
  await new Promise(resolve=>{try{const tx=db.transaction(REPAIR_STORE,'readwrite'),os=tx.objectStore(REPAIR_STORE);for(const r of changed)os.put(r);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>resolve()}catch{resolve()}});try{db.close()}catch{}
  const byKey=new Map(changed.map(x=>[x.key,x]));for(let i=0;i<recs.length;i++)if(byKey.has(recs[i].key))recs[i]=byKey.get(recs[i].key);
  return{changed:changed.length,resultMap};
}

function parseDayUrl(raw){
  try{
    const u=new URL(clean(raw));if(!/(^|\.)tjk\.org$/i.test(u.hostname)||!/GunlukYarisSonuclari/i.test(u.pathname))return null;
    const date=iso(decodeURIComponent(u.searchParams.get('QueryParameter_Tarih')||u.searchParams.get('Tarih')||''));
    const city=clean(decodeURIComponent(u.searchParams.get('SehirAdi')||u.searchParams.get('city')||''));
    return date&&city?{date,city,url:u.toString()}:null;
  }catch{return null}
}
async function groupFor(date,city){
  const A=api();if(!A?.readProgramRange)return null;
  const rows=(await A.readProgramRange(date,date)).filter(r=>fold(r?.city)===fold(city));if(!rows.length)return null;
  const realCity=clean(rows[0]?.city)||city;return{key:dayKey(date,realCity),date:iso(date),city:realCity,cityId:clean(rows[0]?.cityId),rows};
}
async function processGroup(group){const Y=yg();if(!Y?.processGroup)throw new Error('F60.81 Y.G. motoru hazır değil.');return Y.processGroup(group)}
async function resolveMeeting60(date,city){
  const u=new URL('/api/tjk-meeting-resolve-v1',location.origin);u.searchParams.set('date',date);u.searchParams.set('city',city);u.searchParams.set('forwardDays','60');
  const r=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'}});let d=null;try{d=await r.json()}catch{}if(!r.ok||d?.ok===false)throw new Error(d?.error||`Y.G. API ${r.status}`);return d;
}
function daysBetween(a,b){const x=Date.parse(`${a}T12:00:00Z`),y=Date.parse(`${b}T12:00:00Z`);return Number.isFinite(x)&&Number.isFinite(y)?Math.round((y-x)/86400000):9999}

async function importDayLink(parsed,status){
  status.textContent=`${display(parsed.date)} · ${parsed.city}: yıllık program toplantısı hazırlanıyor…`;
  let group=await groupFor(parsed.date,parsed.city),matchedScheduled=[];
  if(group){
    const r=await processGroup(group);matchedScheduled.push(group.date);
    status.textContent=`✅ ${display(parsed.date)} · ${parsed.city}: ${r.foundNos?.length||0}/${r.exp?.length||group.rows.length} koşu kaydedildi${r.postponedNos?.length?` · ${r.postponedNos.length} ertelenen koşu Y.G. ile bulundu`:''}.`;
    return{groups:1,found:Number(r.foundNos?.length||0),scheduled:matchedScheduled};
  }
  const {start,end}=range(),all=await api().scanRepairs(start,end),dates=[...new Set(all.filter(x=>fold(x.city)===fold(parsed.city)&&iso(x.scheduledDate)<=parsed.date&&daysBetween(iso(x.scheduledDate),parsed.date)>=0&&daysBetween(iso(x.scheduledDate),parsed.date)<=60).map(x=>iso(x.scheduledDate)))].sort().reverse().slice(0,20);
  for(const scheduledDate of dates){
    status.textContent=`${display(parsed.date)} · ${parsed.city}: ertelenmiş Y.G. aranıyor · ${display(scheduledDate)}…`;
    let m;try{m=await resolveMeeting60(scheduledDate,parsed.city)}catch{continue}
    if(!(m?.resultDates||[]).some(x=>iso(x?.date)===parsed.date))continue;
    const g=await groupFor(scheduledDate,parsed.city);if(!g)continue;const r=await processGroup(g);matchedScheduled.push(scheduledDate);
    status.textContent=`✅ ${display(parsed.date)} gerçek sonuç günü, ${display(scheduledDate)} · ${parsed.city} · ${m.meetingNo||'?'} Y.G. toplantısına bağlandı. ${r.foundNos?.length||0}/${r.exp?.length||g.rows.length} koşu kaydedildi.`;
  }
  if(!matchedScheduled.length)throw new Error('Bu yarış günü yıllık programda doğrudan veya son 60 gündeki aynı Y.G. toplantısında bulunamadı.');
  return{groups:matchedScheduled.length,scheduled:matchedScheduled};
}

async function autoOne(rec,status){
  const g=await groupFor(rec.scheduledDate,rec.city);if(!g)throw new Error('Bu kayıt için yıllık program toplantısı bulunamadı.');
  status.textContent=`${display(rec.scheduledDate)} · ${rec.city}: aynı toplantının tüm eksik koşuları Y.G. ile aranıyor…`;
  const r=await processGroup(g),found=new Set((r.foundNos||[]).map(Number));
  if(found.has(Number(rec.raceNo)))status.textContent=`✅ Kaydedildi · program ${display(rec.scheduledDate)} ${rec.city} ${rec.raceNo}.K${(r.postponedNos||[]).includes(Number(rec.raceNo))?' · ertelenmiş gerçek sonuç bulundu':''}.`;
  else status.textContent=`Bu toplantıda ${rec.raceNo}.K henüz bulunamadı. Eksik: ${(r.missing||[]).join(', ')||'—'}.`;
  return r;
}
async function autoAll(status){
  const Y=yg();if(!Y?.updateByYG)throw new Error('F60.81 toplu Y.G. motoru hazır değil.');const {start,end}=range();
  status.textContent=`${display(start)} → ${display(end)}: tamamlanmamış program toplantıları toplu taranıyor…`;
  await Y.updateByYG(start,end);status.textContent='✅ Toplu Y.G. taraması tamamlandı. Kayıtlı sonuçlar eşitleniyor…';
}

function tools(dialog){
  let host=$('f6082BatchTools');if(host)return host;
  host=document.createElement('div');host.id='f6082BatchTools';host.className='f62-card';host.style.margin='10px 0';host.innerHTML=`<h3>⚡ Toplu Onarım · F60.82</h3><div class="f62-note">Tek tek koşu linki girmek yerine TJK yarış günü sonuç linkini yapıştırın. O günün bütün koşuları, gerekirse aynı şehir + Y.G. devam tarihiyle birlikte indirilir.</div><input id="f6082DayUrl" placeholder="TJK yarış günü sonuç linki" style="width:100%;box-sizing:border-box;min-height:42px;margin-top:8px;border-radius:8px;border:1px solid #ffffff20;background:#071522;color:#eef7ff;padding:0 9px"><div class="f62-actions"><button data-f6082-action="day">Bu Yarış Gününü Toplu İndir</button><button data-f6082-action="all">Tüm Eksikleri Y.G. ile Tamamla</button></div><div id="f6082Status" class="f62-status">Hazır.</div>`;
  const summary=$('f62RepairSummary');summary?.parentNode?.insertBefore(host,summary);return host;
}
function cardHtml(r){
  const p=r.programRow||{};return`<div class="f62-repair" data-f6082-key="${esc(r.key)}"><b>${esc(display(r.scheduledDate))} · ${esc(r.city)} · ${Number(r.raceNo)||0}.K</b><div class="f62-note">${esc(p.classRaw||'')} · ${esc(p.groupRaw||'')} · ${esc(p.distance||'')} m ${esc(p.track||'')} · ${esc(r.repairStatus||'MISSING')}</div><div class="f62-actions"><button data-f6082-action="one" data-key="${esc(r.key)}">Y.G. ile Otomatik Bul</button><button data-repair-action="cancel" data-key="${esc(r.key)}">İptal / Yapılmadı</button></div><div class="mini"><input type="date" data-manual-date value="${esc(r.actualResultDate||r.scheduledDate)}"><input data-manual-city placeholder="Şehir" value="${esc(r.city)}"><input type="number" min="1" data-manual-no placeholder="Koşu" value="${Number(r.raceNo)||1}"></div><input data-manual-url placeholder="İsteğe bağlı TJK tek koşu sonuç linki (#ID)" style="margin-top:6px"><button class="f62-btn" data-repair-action="manual" data-key="${esc(r.key)}" style="width:100%;margin-top:6px">Tek Koşuyu Manuel Eşleştir</button><div class="f62-status">Bu koşu henüz sonuç arşivinde yok.</div></div>`;
}
async function decorate(){
  const dialog=$('f62RepairDialog');if(!dialog||!dialog.open||!api()?.scanRepairs)return false;tools(dialog);
  const {start,end}=range();let recs=await api().scanRepairs(start,end);await markResolvedFromArchive(recs,start,end);
  const resolved=recs.filter(r=>resolvedStatus(r.repairStatus)),unresolved=recs.filter(r=>!resolvedStatus(r.repairStatus));currentMap=new Map(unresolved.map(r=>[r.key,r]));
  const sum=$('f62RepairSummary'),list=$('f62RepairList');if(sum)sum.textContent=`${unresolved.length} gerçek eksik koşu · ${resolved.length} eski kayıt artık tamamlanmış olarak temizlendi · ${unresolved.filter(x=>x.repairStatus==='LINK_ERROR').length} bağlantı hatası.`;
  if(list)list.innerHTML=unresolved.length?unresolved.slice(0,250).map(cardHtml).join('')+(unresolved.length>250?`<div class="f62-status">İlk 250 kayıt gösteriliyor. Toplu Y.G. düğmesi tüm ${unresolved.length} eksik kaydı işler.</div>`:''):'<div class="f62-status">✅ Bu tarih aralığında eksik koşu yok.</div>';
  return true;
}
function schedule(){setTimeout(()=>void decorate(),120);setTimeout(()=>void decorate(),700)}

async function action(btn){
  if(busy)return;const kind=btn.dataset.f6082Action,status=$('f6082Status')||btn.closest('.f62-repair')?.querySelector('.f62-status');if(!status)return;busy=true;btn.disabled=true;
  try{
    if(kind==='day'){const parsed=parseDayUrl($('f6082DayUrl')?.value||'');if(!parsed)throw new Error('Geçerli TJK yarış günü sonuç linkini yapıştırın. Linkte tarih ve SehirAdi bulunmalı.');await importDayLink(parsed,status);}
    else if(kind==='all'){await autoAll(status);}
    else if(kind==='one'){const rec=currentMap.get(btn.dataset.key);if(!rec)throw new Error('Onarım kaydı bulunamadı.');await autoOne(rec,status);}
    await new Promise(r=>setTimeout(r,350));await decorate();window.ATAnnualResultsArchiveV661?.refresh?.();
  }catch(e){status.textContent=`İşlem tamamlanmadı: ${e?.message||String(e)}`;}finally{busy=false;btn.disabled=false;}
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-f6082-action]');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void action(b);},true);
document.addEventListener('click',e=>{if(e.target.closest?.('#f62rRepair,#f62RepairRefresh'))schedule();else if(e.target.closest?.('[data-repair-action="manual"],[data-repair-action="cancel"]'))setTimeout(()=>void decorate(),1100);},true);
window.addEventListener('pageshow',()=>setTimeout(schedule,300));
setTimeout(schedule,1200);
window.ATF6082RepairBatch={version:VERSION,decorate,parseDayUrl,importDayLink,autoOne,autoAll};
console.info('[AT AI]',VERSION,'aktif — eski MANUAL_MATCH kayıtları eksik sayılmaz; yarış günü linki ve Y.G. ile toplu onarım kullanılabilir.');
})();
