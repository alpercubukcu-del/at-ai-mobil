/* AT AI Mobil — F60.74 doğru tarih + ertelenmiş yarış + yerel koşu no kurtarma */
(() => {
'use strict';
if(window.__AT_F6070_POSTPONED_REPAIR__) return;
window.__AT_F6070_POSTPONED_REPAIR__=true;
const VERSION='POSTPONED-RACE-REPAIR-V16.9.1F60.74';
const MODE='DATE_DRIVEN_REPAIR_F6072';
const PERF='NO_GLOBAL_MUTATION_OBSERVER_F6072';
const CONFIRMED='POSTPONED_CONFIRMED_SAME_NO_F6073';
const NO_RECOVERY='ARCHIVE_RACE_NO_RECOVERY_F6074';
const REPAIR_DB='at_ai_race_repair_v1',REPAIR_STORE='repairs',RESULTS_DB='at_ai_tjk_annual_results_v1',RESULTS_STORE='races';
const A=window.ATF6062,C=A?.core;
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>C?.fold?C.fold(v):clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'');
const track=v=>C?.trackKey?C.trackKey(v):fold(v);
const iso=v=>C?.isoDate?C.isoDate(v):clean(v);
const dayCache=new Map();
let decorateTimer=0;

function openDb(name,version){return new Promise(resolve=>{let q;try{q=indexedDB.open(name,version)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null);});}
async function getRepair(key){const db=await openDb(REPAIR_DB,1);if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(REPAIR_STORE,'readonly').objectStore(REPAIR_STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function putRepair(rec){const db=await openDb(REPAIR_DB,1);if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(REPAIR_STORE,'readwrite');tx.objectStore(REPAIR_STORE).put(rec);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function deleteResultAlias(rec){const db=await openDb(RESULTS_DB);if(!db)return false;const key=`result|${iso(rec.scheduledDate)}|${fold(rec.city)}|${Number(rec.raceNo)||0}`;return new Promise(resolve=>{try{const tx=db.transaction(RESULTS_STORE,'readwrite');tx.objectStore(RESULTS_STORE).delete(key);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function dayResults(date,city){
  const k=`${date}|${fold(city)}`;if(dayCache.has(k))return dayCache.get(k);
  const p=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);try{const u=new URL('/api/tjk-day-results-v1',location.origin);u.searchParams.set('date',date);u.searchParams.set('city',city);const r=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'},signal:c.signal}),j=await r.json();if(!r.ok||j?.ok===false)throw new Error(j?.error||`API ${r.status}`);return Array.isArray(j?.races)?j.races:[]}finally{clearTimeout(t)}})();
  dayCache.set(k,p);try{return await p}catch(e){dayCache.delete(k);throw e}
}
function horseNames(x){const arr=x?.horses||x?.rows||x?.top5||[];return (Array.isArray(arr)?arr:[]).map(h=>fold(h?.name??h?.horseName??h?.atAdi??h?.['At Adı'])).filter(Boolean)}
function overlap(a,b){const aa=[...new Set(horseNames(a))],bb=[...new Set(horseNames(b))];if(!aa.length||!bb.length)return{common:0,ratio:null,a:aa.length,b:bb.length};const s=new Set(bb),common=aa.filter(x=>s.has(x)).length,ratio=common/Math.max(1,Math.min(aa.length,bb.length));return{common,ratio,a:aa.length,b:bb.length}}
function meta(rec,cand){
  const a=rec?.programRow||{},b=cand||{};
  const checks={
    class:!clean(a.classRaw||a.classKey)||fold(a.classRaw||a.classKey)===fold(b.class||b.yaradi1),
    group:!clean(a.groupRaw)||fold(a.groupRaw)===fold(b.ageGroup||b.yaradi2),
    distance:!Number(a.distance)||Number(a.distance)===Number(b.distance||b.mesafe||0),
    track:!clean(a.track)||track(a.track)===track(b.track||b.pist)
  };
  const known=[clean(a.classRaw||a.classKey),clean(a.groupRaw),Number(a.distance)||'',clean(a.track)].filter(Boolean).length;
  const passed=Object.values(checks).filter(Boolean).length;
  return{checks,known,passed};
}
function signatureCandidate(rec,cand){
  const m=meta(rec,cand),o=overlap(rec?.programRow,cand);
  const exactMeta=m.known>=3&&m.passed===m.known;
  const rosterAvailable=o.ratio!==null;
  const rosterStrong=rosterAvailable&&o.common>=2&&o.ratio>=0.45;
  // Program satırında at kadrosu yoksa 3-4 bilinen yapısal alanın tamamı eşleşmek zorunda.
  // Kadro varsa yapısal tam eşleşmeye ek olarak kadro örtüşmesi de aranır.
  const safe=exactMeta&&(!rosterAvailable||rosterStrong);
  const score=Math.min(100,m.passed*20+(rosterAvailable?Math.round(o.ratio*20):0));
  return{safe,score,m,o,exactMeta,rosterAvailable,rosterStrong,raceNo:Number(cand?.no||cand?.raceNo||0)};
}

async function evidence(rec,date,city,cand){
  const no=Number(cand?.no||cand?.raceNo||0),sameNo=no===Number(rec?.raceNo||0),m=meta(rec,cand),o=overlap(rec?.programRow,cand),scheduled=iso(rec?.scheduledDate),actual=iso(date);let postponed=false,originalMax=0,originalHasTarget=false;
  if(actual&&scheduled&&actual!==scheduled&&fold(city)===fold(rec.city)){
    try{
      const originalDay=await dayResults(scheduled,rec.city);
      const nos=originalDay.map(r=>Number(r?.no||r?.raceNo||0)).filter(Boolean);
      originalMax=Math.max(0,...nos);originalHasTarget=nos.includes(Number(rec.raceNo||0));
      postponed=!originalHasTarget&&(originalMax===0||originalMax<Number(rec.raceNo||0));
    }catch{}
  }
  const structural=m.known?m.passed>=Math.min(4,m.known):true;
  const rosterStrong=o.ratio!==null&&o.common>=2&&o.ratio>=0.45;
  const postponedConfirmed=sameNo&&postponed&&actual!==scheduled&&fold(city)===fold(rec.city);
  const safe=sameNo&&(postponedConfirmed||(structural&&rosterStrong));
  const rawScore=Math.min(100,(sameNo?20:0)+m.passed*15+(o.ratio===null?0:Math.round(o.ratio*20))+(postponedConfirmed?20:0));
  return{safe,score:Math.max(rawScore,safe?95:0),sameNo,structural,rosterStrong,postponed,postponedConfirmed,originalMax,originalHasTarget,overlap:o,checks:m.checks};
}
function statusOf(card){return [...(card?.querySelectorAll?.('.f62-status')||[])].at(-1)||null}
function refresh(){setTimeout(()=>document.getElementById('f62RepairRefresh')?.click(),120)}

async function findEnteredDate(rec,card){
  const date=iso(card.querySelector('[data-manual-date]')?.value),city=clean(card.querySelector('[data-manual-city]')?.value)||rec.city,targetNo=Number(rec.raceNo)||0;
  if(!date)throw new Error('Gerçek tarihi girin.');if(!city)throw new Error('Şehir bilgisi bulunamadı.');if(!targetNo)throw new Error('Hedef koşu numarası bulunamadı.');
  const rows=await dayResults(date,city);
  const same=rows.find(r=>Number(r?.no||r?.raceNo||0)===targetNo)||null;
  if(same){
    const ev=await evidence(rec,date,city,same);
    if(ev.safe)return{date,city,raceNo:targetNo,cand:same,ev,archiveRaceNoRecovered:false};
  }

  // F60.74: aynı koşu numarası bulunuyor ama şartlar bambaşka ise, yerel yıllık arşivde
  // koşu numarası kaymış olabilir. Girilen tarihteki tüm koşular içinde tek ve güçlü yarış
  // imzası aranır. Farklı numara yalnız açık kullanıcı tarih girişiyle ve benzersiz tam imzayla kabul edilir.
  const strong=rows.map(cand=>({cand,...signatureCandidate(rec,cand)})).filter(x=>x.safe&&x.raceNo>0&&x.raceNo!==targetNo).sort((a,b)=>b.score-a.score||a.raceNo-b.raceNo);
  if(strong.length===1){
    const hit=strong[0];
    const ev=await evidence(rec,date,city,hit.cand);
    return{date,city,raceNo:hit.raceNo,cand:hit.cand,ev:{...ev,safe:true,archiveRaceNoRecovered:true,signature:hit},archiveRaceNoRecovered:true,scheduledRaceNo:targetNo};
  }
  if(strong.length>1){
    throw new Error(`Yerel arşiv koşu numarası şüpheli. ${date} · ${city} tarihinde birden fazla güçlü koşu imzası bulundu; otomatik eşleştirme yapılmadı.`);
  }
  if(same)throw new Error(`Aynı ${targetNo}. Koşu bulundu fakat koşul/kadro eşleşmiyor; ayrıca aynı gün içinde güvenli başka karşılık bulunamadı.`);
  throw new Error(`${date} · ${city} tarihinde ${targetNo}. Koşu sonucu bulunamadı ve güçlü bir koşu imzası da bulunamadı.`);
}

async function dateDrivenBind(button,card){
  const s=statusOf(card),rec=await getRepair(button.dataset.key);if(!rec)throw new Error('Onarım kaydı bulunamadı.');
  if(s)s.textContent=`Girilen tarihte ${rec.city} için koşu doğrulanıyor…`;
  const hit=await findEnteredDate(rec,card);
  const source=hit.archiveRaceNoRecovered?'DATE_ENTERED_ARCHIVE_RACE_NO_RECOVERED':(hit.ev.postponedConfirmed?'DATE_ENTERED_POSTPONED_SAME_RACE_NO':'DATE_ENTERED_SAME_RACE_NO');
  await A.bindRepair(rec,hit.date,hit.city,hit.raceNo,source);
  await putRepair({...rec,actualResultDate:hit.date,actualCity:hit.city,actualRaceNo:hit.raceNo,repairStatus:'MANUAL_MATCH',repairType:hit.date===rec.scheduledDate?'NORMAL':'RESCHEDULED',repairSource:source,candidate:null,matchGuard:hit.archiveRaceNoRecovered?NO_RECOVERY:(hit.ev.postponedConfirmed?CONFIRMED:'DATE_ENTERED_SAME_NO_VERIFIED'),archiveRaceNoMismatch:hit.archiveRaceNoRecovered?{scheduled:Number(rec.raceNo)||0,actual:hit.raceNo}:null,updatedAt:new Date().toISOString()});
  if(hit.archiveRaceNoRecovered){
    if(s)s.textContent=`Doğrulandı: yerel arşiv koşu no hatası bulundu · kayıt ${rec.raceNo}.K → gerçek ${hit.raceNo}.K · ${hit.date} ${hit.city}.`;
  }else{
    const warn=hit.ev.structural&&hit.ev.rosterStrong?'':' · koşul/kadro farkı uyarı olarak kaydedildi';
    if(s)s.textContent=`Doğrulandı: ${rec.scheduledDate} ${rec.raceNo}.K → ${hit.date} ${hit.city} ${hit.raceNo}.K${hit.ev.postponedConfirmed?' · ertelenmiş aynı koşu':''}${warn}.`;
  }
  refresh();
}
async function safeConfirm(button,card){
  const s=statusOf(card),rec=await getRepair(button.dataset.key);if(!rec?.candidate)throw new Error('Doğrulanmış aday bulunamadı.');const c=rec.candidate;
  if(Number(c.raceNo)!==Number(rec.raceNo))throw new Error('Eski aday farklı koşu numarası. Tarihi girip “Bu Tarihte Bul ve Eşleştir” kullanın.');
  const rows=await dayResults(c.date,c.city),cand=rows.find(r=>Number(r?.no||r?.raceNo||0)===Number(rec.raceNo));if(!cand)throw new Error('Aday koşu sonuçlarda bulunamadı.');
  const ev=await evidence(rec,c.date,c.city,cand);if(!ev.safe)throw new Error('Eşleştirme reddedildi: aynı koşu numarası için yeterli doğrulama yok.');
  await A.bindRepair(rec,c.date,c.city,rec.raceNo,ev.postponedConfirmed?'AUTO_VERIFIED_POSTPONED':'AUTO_VERIFIED_SAME_NO');
  await putRepair({...rec,actualResultDate:c.date,actualCity:c.city,actualRaceNo:Number(rec.raceNo),repairStatus:'MANUAL_MATCH',repairType:c.date===rec.scheduledDate?'NORMAL':'RESCHEDULED',repairSource:ev.postponedConfirmed?'AUTO_VERIFIED_POSTPONED':'AUTO_VERIFIED_SAME_NO',candidate:null,matchGuard:ev.postponedConfirmed?CONFIRMED:'AUTO_SAME_NO_VERIFIED',updatedAt:new Date().toISOString()});
  if(s)s.textContent=`Kalıcı eşleştirme: ${rec.raceNo}.K → ${c.date} ${rec.raceNo}.K doğrulandı.`;refresh();
}
async function undoManual(button,card){const rec=await getRepair(button.dataset.key);if(!rec)return;if(!confirm(`${rec.scheduledDate} · ${rec.city} · ${rec.raceNo}.K eşleşmesi geri alınsın mı?`))return;await deleteResultAlias(rec);await putRepair({...rec,actualResultDate:null,actualCity:null,actualRaceNo:null,repairStatus:'MISSING',repairType:'NORMAL',repairSource:'F6074_UNDO',candidate:null,archiveRaceNoMismatch:null,updatedAt:new Date().toISOString()});const s=statusOf(card);if(s)s.textContent='Yanlış eşleşme geri alındı.';refresh()}

function decorate(){
  const list=document.getElementById('f62RepairList');if(!list)return;
  for(const card of list.querySelectorAll('.f62-repair')){
    const key=card.querySelector('[data-key]')?.dataset?.key||card.querySelector('[data-repair-action]')?.dataset?.key;if(!key)continue;
    const manual=card.querySelector('[data-repair-action="manual"]'),auto=card.querySelector('[data-repair-action="auto"]'),no=card.querySelector('[data-manual-no]'),url=card.querySelector('[data-manual-url]'),candidateBtn=card.querySelector('[data-repair-action="candidate"]');
    if(manual){manual.textContent='Bu Tarihte Bul ve Eşleştir';manual.dataset.f6072Date='1'}
    if(auto)auto.style.display='none';
    if(no){no.readOnly=true;no.title='Bu, yerel arşivdeki koşu numarasıdır; yazılım gerekirse gerçek koşu numarasını imzadan bulur.';no.placeholder='Arşiv koşu no'}
    if(url){url.style.display='none';url.value=''}
    if(candidateBtn&&no){const box=candidateBtn.closest('.f62-status'),m=clean(box?.textContent).match(/Aday:.*?·\s*(\d+)\.K/i),candidateNo=m?Number(m[1]):0,targetNo=Number(no.value||0);if(candidateNo&&targetNo&&candidateNo!==targetNo){if(box)box.style.display='none';candidateBtn.disabled=true;}}
    const text=clean(card.textContent);if(/MANUAL_MATCH/i.test(text)&&!card.querySelector('[data-f6070-undo]')){const b=document.createElement('button');b.className='f62-btn';b.dataset.f6070Undo='1';b.dataset.key=key;b.textContent='Yanlış Eşleşmeyi Geri Al';b.style.cssText='width:100%;margin-top:7px';card.appendChild(b)}
  }
}
function scheduleDecorate(delay=120){clearTimeout(decorateTimer);decorateTimer=setTimeout(decorate,delay)}
document.addEventListener('click',e=>{
  const undo=e.target.closest?.('[data-f6070-undo]');if(undo){e.preventDefault();e.stopImmediatePropagation();void undoManual(undo,undo.closest('.f62-repair')).catch(err=>{const s=statusOf(undo.closest('.f62-repair'));if(s)s.textContent=err?.message||String(err)});return}
  const b=e.target.closest?.('[data-repair-action]');if(b){const action=b.dataset.repairAction;if(action==='manual'||action==='auto'){e.preventDefault();e.stopImmediatePropagation();b.disabled=true;const card=b.closest('.f62-repair');void dateDrivenBind(b,card).catch(err=>{const s=statusOf(card);if(s)s.textContent=err?.name==='AbortError'?'TJK yanıtı 15 saniyede gelmedi. Tekrar deneyin.':(err?.message||String(err))}).finally(()=>{b.disabled=false});return}if(action==='candidate'){e.preventDefault();e.stopImmediatePropagation();const card=b.closest('.f62-repair');void safeConfirm(b,card).catch(err=>{const s=statusOf(card);if(s)s.textContent=err?.message||String(err)});return}}
  if(e.target.closest?.('#f62rRepair,#f62RepairRefresh')){scheduleDecorate(120);setTimeout(()=>scheduleDecorate(0),450)}
},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scheduleDecorate(250),{once:true});else scheduleDecorate(250);
window.ATF6070PostponedRepair={version:VERSION,mode:MODE,perf:PERF,confirmed:CONFIRMED,noRecovery:NO_RECOVERY,evidence,dayResults,findEnteredDate,signatureCandidate};
console.info('[AT AI]',VERSION,MODE,PERF,CONFIRMED,NO_RECOVERY,'aktif — aynı numara uymazsa yalnız benzersiz tam yarış imzasıyla yerel koşu no kayması kurtarılır.');
})();
