/* AT AI Mobil — F60.70 TJK #yarış-kimliği ile kesin manuel onarım */
(() => {
'use strict';
if(window.__AT_F6070_REPAIR_HASH_RESOLVER__)return;
window.__AT_F6070_REPAIR_HASH_RESOLVER__=true;
const VERSION='REPAIR-MANUAL-HASH-RESOLVER-V16.9.1F60.70';
const DB='at_ai_race_repair_v1',STORE='repairs';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
function parseHashUrl(raw){
  try{const u=new URL(clean(raw));if(!/(^|\.)tjk\.org$/i.test(u.hostname))return null;if(!/GunlukYarisSonuclari/i.test(u.pathname))return null;const anchor=decodeURIComponent(u.hash||'').replace(/^#/,'').trim();return /^\d+$/.test(anchor)?{url:u.toString(),anchor}:null;}catch{return null}
}
function openDb(){return new Promise(resolve=>{let q;try{q=indexedDB.open(DB,1)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null);});}
async function getRepair(key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function resolveAnchor(anchor,rec){
  const u=new URL('/api/tjk-race-anchor-resolve-v1',location.origin);u.searchParams.set('anchor',anchor);u.searchParams.set('date',rec.scheduledDate);u.searchParams.set('city',rec.city);
  const r=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'}});let data=null;try{data=await r.json()}catch{}
  if(!r.ok||data?.ok===false||!data?.match)throw new Error(data?.error||`TJK kimlik doğrulama API ${r.status}`);return data;
}
function setStatus(card,text){const list=[...(card?.querySelectorAll?.('.f62-status')||[])],s=list.at(-1);if(s)s.textContent=text;}
async function handle(btn,card,parsed){
  const key=clean(btn.dataset.key),rec=await getRepair(key);if(!rec)throw new Error('Onarım kaydı telefonda bulunamadı.');
  if(!rec.scheduledDate||!rec.city)throw new Error('Onarım kaydının tarih/şehir bilgisi eksik.');
  setStatus(card,`TJK #${parsed.anchor} yarış kimliği doğrulanıyor…`);
  const data=await resolveAnchor(parsed.anchor,rec),m=data.match;
  if(fold(m.city)!==fold(rec.city))throw new Error(`TJK kimliği ${m.city} şehrine ait; kayıt ${rec.city}. Eşleştirme yapılmadı.`);
  if(!Number(m.raceNo))throw new Error('TJK kimliği bulundu ancak koşu numarası çözülemedi.');
  const dateInput=card.querySelector('[data-manual-date]'),cityInput=card.querySelector('[data-manual-city]'),noInput=card.querySelector('[data-manual-no]');
  if(dateInput)dateInput.value=m.date;if(cityInput)cityInput.value=m.city;if(noInput)noInput.value=String(m.raceNo);
  if(typeof window.ATF6062?.bindRepair!=='function')throw new Error('Onarım motoru hazır değil.');
  await window.ATF6062.bindRepair(rec,m.date,m.city,m.raceNo,'MANUAL_HASH_VERIFIED');
  setStatus(card,`Doğrulandı: #${parsed.anchor} = ${m.date.split('-').reverse().join('/')} · ${m.city} · ${m.raceNo}.K. Kalıcı eşleştirme kaydedildi.`);
  const old=card.querySelector('.f6070-anchor-note')||document.createElement('div');old.className='f62-status f6070-anchor-note';old.textContent=`TJK yarış kimliği: #${parsed.anchor} · kesin koşu ${m.raceNo}.K`;if(!old.isConnected)card.appendChild(old);
  setTimeout(()=>{try{document.getElementById('f62RepairRefresh')?.click()}catch{}},700);
}
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-repair-action="manual"]');if(!btn)return;const card=btn.closest('.f62-repair');if(!card)return;
  const raw=card.querySelector('[data-manual-url]')?.value||'',parsed=parseHashUrl(raw);if(!parsed)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();btn.disabled=true;
  handle(btn,card,parsed).catch(err=>setStatus(card,`Eşleştirme yapılmadı: ${err?.message||String(err)}`)).finally(()=>{btn.disabled=false});
},true);
window.ATF6070RepairHash={version:VERSION,parseHashUrl,resolveAnchor};
console.info('[AT AI]',VERSION,'aktif — TJK #kimliği koşu numarasına doğrulanmadan manuel kayıt yapılamaz.');
})();
