/* AT AI Mobil — F60.70 Ertelenen koşu + TJK sonuç linki güvenli onarımı */
(() => {
'use strict';
if(window.__AT_F6070_POSTPONED_REPAIR__) return;
window.__AT_F6070_POSTPONED_REPAIR__=true;
const VERSION='POSTPONED-RACE-REPAIR-V16.9.1F60.70';
const REPAIR_DB='at_ai_race_repair_v1',REPAIR_STORE='repairs',RESULTS_DB='at_ai_tjk_annual_results_v1',RESULTS_STORE='races';
const A=window.ATF6062,C=A?.core;
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>C?.fold?C.fold(v):clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'');
const track=v=>C?.trackKey?C.trackKey(v):fold(v);
const iso=v=>C?.isoDate?C.isoDate(v):clean(v);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const dayCache=new Map();

function openDb(name,version){return new Promise(resolve=>{let q;try{q=indexedDB.open(name,version)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null);});}
async function getRepair(key){const db=await openDb(REPAIR_DB,1);if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(REPAIR_STORE,'readonly').objectStore(REPAIR_STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function putRepair(rec){const db=await openDb(REPAIR_DB,1);if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(REPAIR_STORE,'readwrite');tx.objectStore(REPAIR_STORE).put(rec);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function deleteResultAlias(rec){const db=await openDb(RESULTS_DB);if(!db)return false;const key=`result|${iso(rec.scheduledDate)}|${fold(rec.city)}|${Number(rec.raceNo)||0}`;return new Promise(resolve=>{try{const tx=db.transaction(RESULTS_STORE,'readwrite');tx.objectStore(RESULTS_STORE).delete(key);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
function addDays(v,n){const d=new Date(`${iso(v)}T12:00:00`);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
async function dayResults(date,city){const k=`${date}|${fold(city)}`;if(dayCache.has(k))return dayCache.get(k);const p=(async()=>{const u=new URL('/api/tjk-day-results-v1',location.origin);u.searchParams.set('date',date);u.searchParams.set('city',city);const r=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'}}),j=await r.json();if(!r.ok||j?.ok===false)throw new Error(j?.error||`API ${r.status}`);return Array.isArray(j?.races)?j.races:[];})();dayCache.set(k,p);try{return await p}catch(e){dayCache.delete(k);throw e}}
function horseNames(x){const arr=x?.horses||x?.rows||x?.top5||[];return (Array.isArray(arr)?arr:[]).map(h=>fold(h?.name??h?.horseName??h?.atAdi??h?.['At Adı'])).filter(Boolean)}
function overlap(a,b){const A=[...new Set(horseNames(a))],B=[...new Set(horseNames(b))];if(!A.length||!B.length)return{common:0,ratio:null,a:A.length,b:B.length};const S=new Set(B),common=A.filter(x=>S.has(x)).length,ratio=common/Math.max(1,Math.min(A.length,B.length));return{common,ratio,a:A.length,b:B.length}}
function meta(rec,cand){const a=rec?.programRow||{},b=cand||{};const checks={
  class:!clean(a.classRaw||a.classKey)||fold(a.classRaw||a.classKey)===fold(b.class||b.yaradi1),
  group:!clean(a.groupRaw)||fold(a.groupRaw)===fold(b.ageGroup||b.yaradi2),
  distance:!Number(a.distance)||Number(a.distance)===Number(b.distance||b.mesafe||0),
  track:!clean(a.track)||track(a.track)===track(b.track||b.pist)
};
  const known=[clean(a.classRaw||a.classKey),clean(a.groupRaw),Number(a.distance)||'',clean(a.track)].filter(Boolean).length,passed=Object.values(checks).filter(Boolean).length;
  return{checks,known,passed};
}
async function evidence(rec,date,city,cand){
  const no=Number(cand?.no||cand?.raceNo||0),sameNo=no===Number(rec?.raceNo||0),m=meta(rec,cand),o=overlap(rec?.programRow,cand),scheduled=iso(rec?.scheduledDate),actual=iso(date);let postponed=false;
  if(actual&&scheduled&&actual!==scheduled&&fold(city)===fold(rec.city)&&sameNo){
    try{const s=await dayResults(scheduled,rec.city),max=Math.max(0,...s.map(r=>Number(r?.no||0)));postponed=max>0&&max<Number(rec.raceNo||0);}catch{}
  }
  const structural=m.known?m.passed>=Math.min(4,m.known):true,rosterStrong=o.ratio!==null&&o.common>=2&&o.ratio>=0.45;
  const safe=sameNo&&structural&&(rosterStrong||postponed);
  const score=Math.min(100,(sameNo?20:0)+m.passed*15+(o.ratio===null?0:Math.round(o.ratio*20))+(postponed?20:0));
  return{safe,score:Math.max(score,safe?95:0),sameNo,structural,rosterStrong,postponed,overlap:o,checks:m.checks};
}
function statusOf(card){return [...(card?.querySelectorAll?.('.f62-status')||[])].at(-1)||null}
function refresh(){setTimeout(()=>document.getElementById('f62RepairRefresh')?.click(),120)}
async function resolveLink(url,date,city){const u=new URL('/api/tjk-result-link-resolve-v1',location.origin);u.searchParams.set('url',url);u.searchParams.set('date',date);u.searchParams.set('city',city);const r=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'}}),j=await r.json();if(!r.ok||!j?.resolved)throw new Error(j?.error||'TJK linki koşu numarasına çözülemedi.');return j}

async function safeAuto(button,card){
  const s=statusOf(card),key=button.dataset.key,rec=await getRepair(key);if(!rec)throw new Error('Onarım kaydı bulunamadı.');
  if(s)s.textContent='Ertelenen yarış aynı koşu numarasıyla aranıyor…';
  let best=null;
  for(const off of [1,-1,2,-2,3,-3,7,-7]){
    const date=addDays(rec.scheduledDate,off);let rows;try{rows=await dayResults(date,rec.city)}catch{continue}
    const cand=rows.find(r=>Number(r?.no||r?.raceNo||0)===Number(rec.raceNo));if(!cand)continue;
    const ev=await evidence(rec,date,rec.city,cand);if(ev.safe&&(!best||ev.score>best.score))best={date,city:rec.city,raceNo:Number(rec.raceNo),score:ev.score,evidence:ev};
    if(best?.evidence?.postponed&&best.score>=95)break;
  }
  if(!best){if(s)s.textContent='Güvenli ertelenmiş yarış bulunamadı. Farklı koşu numarası otomatik bağlanmadı.';return}
  await putRepair({...rec,repairStatus:'CANDIDATE',candidate:{date:best.date,city:best.city,raceNo:best.raceNo,score:best.score,reason:best.evidence.postponed?'POSTPONED_SAME_RACE_NO':'SAME_RACE_NO_VERIFIED',horseOverlap:best.evidence.overlap},matchGuard:'F6070_SAME_RACE_NO',updatedAt:new Date().toISOString()});
  if(s)s.textContent=`Aday doğrulandı: ${best.date} · ${best.raceNo}.K · ${best.score}/100 · aynı koşu numarası.`;refresh();
}
async function safeConfirm(button,card){
  const s=statusOf(card),rec=await getRepair(button.dataset.key);if(!rec?.candidate)throw new Error('Doğrulanmış aday bulunamadı.');const c=rec.candidate;
  const rows=await dayResults(c.date,c.city),cand=rows.find(r=>Number(r?.no||0)===Number(c.raceNo));if(!cand)throw new Error('Aday koşu gerçek sonuç sayfasında bulunamadı.');
  const ev=await evidence(rec,c.date,c.city,cand);if(!ev.safe)throw new Error('Eşleştirme reddedildi: aynı koşu numarası + koşul/kadro doğrulaması geçmedi.');
  await A.bindRepair(rec,c.date,c.city,c.raceNo,'AUTO_VERIFIED_POSTPONED');if(s)s.textContent=`Kalıcı eşleştirme: ${rec.raceNo}.K → ${c.date} ${c.raceNo}.K doğrulandı.`;refresh();
}
async function safeManual(button,card){
  const s=statusOf(card),rec=await getRepair(button.dataset.key);if(!rec)throw new Error('Onarım kaydı bulunamadı.');
  let date=iso(card.querySelector('[data-manual-date]')?.value),city=clean(card.querySelector('[data-manual-city]')?.value),no=Number(card.querySelector('[data-manual-no]')?.value||0),url=clean(card.querySelector('[data-manual-url]')?.value);
  if(!date||!city)throw new Error('Gerçek tarih ve şehir gerekli.');
  if(url){if(s)s.textContent='TJK linkindeki koşu kimliği doğrulanıyor…';const r=await resolveLink(url,date,city);no=Number(r.raceNo)||0;const inp=card.querySelector('[data-manual-no]');if(inp)inp.value=String(no);}
  if(!no)throw new Error('Gerçek koşu numarası gerekli.');
  const rows=await dayResults(date,city),cand=rows.find(r=>Number(r?.no||r?.raceNo||0)===no);if(!cand)throw new Error(`${date} · ${city} · ${no}.K sonuçlarda bulunamadı.`);
  const ev=await evidence(rec,date,city,cand);if(!ev.safe)throw new Error(`Eşleştirme reddedildi. Hedef ${rec.raceNo}.K; seçilen ${no}.K. Ertelenen yarışlarda aynı koşu numarası ve koşul/kadro doğrulaması zorunlu.`);
  await A.bindRepair(rec,date,city,no,url?'MANUAL_LINK_VERIFIED':'MANUAL_FIELDS_VERIFIED');if(s)s.textContent=`Doğrulandı: ${rec.scheduledDate} ${rec.raceNo}.K → ${date} ${no}.K.`;refresh();
}
async function undoManual(button,card){
  const rec=await getRepair(button.dataset.key);if(!rec)return;if(!confirm(`${rec.scheduledDate} · ${rec.city} · ${rec.raceNo}.K manuel eşleşmesi geri alınsın mı?`))return;
  await deleteResultAlias(rec);await putRepair({...rec,actualResultDate:null,actualCity:null,actualRaceNo:null,repairStatus:'MISSING',repairType:'NORMAL',repairSource:'F6070_UNDO',candidate:null,updatedAt:new Date().toISOString()});
  const s=statusOf(card);if(s)s.textContent='Yanlış manuel eşleşme geri alındı. Kayıt yeniden eşleştirilebilir.';refresh();
}
function decorate(){document.querySelectorAll('#f62RepairList .f62-repair').forEach(card=>{const text=clean(card.textContent),key=card.querySelector('[data-key]')?.dataset?.key;if(!key)return;if(/MANUAL_MATCH/i.test(text)&&!card.querySelector('[data-f6070-undo]')){const b=document.createElement('button');b.className='f62-btn';b.dataset.f6070Undo='1';b.dataset.key=key;b.textContent='Yanlış Eşleşmeyi Geri Al';b.style.cssText='width:100%;margin-top:7px';card.appendChild(b);}})}
document.addEventListener('click',e=>{
  const undo=e.target.closest?.('[data-f6070-undo]');if(undo){e.preventDefault();e.stopImmediatePropagation();void undoManual(undo,undo.closest('.f62-repair')).catch(err=>{const s=statusOf(undo.closest('.f62-repair'));if(s)s.textContent=err?.message||String(err)});return;}
  const b=e.target.closest?.('[data-repair-action]');if(!b)return;const action=b.dataset.repairAction;if(!['auto','candidate','manual'].includes(action))return;
  e.preventDefault();e.stopImmediatePropagation();const card=b.closest('.f62-repair'),run=action==='auto'?safeAuto:action==='candidate'?safeConfirm:safeManual;void run(b,card).catch(err=>{const s=statusOf(card);if(s)s.textContent=err?.message||String(err)});
},true);
const mo=new MutationObserver(()=>queueMicrotask(decorate));try{mo.observe(document.documentElement,{subtree:true,childList:true});}catch{}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
window.ATF6070PostponedRepair={version:VERSION,evidence,dayResults,resolveLink};
console.info('[AT AI]',VERSION,'aktif — ertelenen koşular farklı koşu numarasına otomatik bağlanmaz; TJK hash linki çözümlenmeden manuel eşleşme yapılmaz.');
})();
