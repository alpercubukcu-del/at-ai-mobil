/* AT AI Mobil — V16.9.1F59.9 KALIBRASYON TEMIZLEME
   - Tam Eslesme Kalibrasyonu ekranina iki guvenli temizlik secenegi ekler.
   - "Eski Kalibrasyonlari Temizle" yalniz secili tarih + sehir disindaki kalibrasyon ozetlerini siler.
   - "Kalibrasyonu Tamamen Sifirla" entries + backtests depolarini temizler.
   - Gunluk/Yillik TJK arsivi, kariyer verisi ve program verisi kesinlikle silinmez.
*/
(() => {
'use strict';
if (window.__AT_CALIBRATION_CLEANUP_V1691F599__) return;
window.__AT_CALIBRATION_CLEANUP_V1691F599__ = true;

const VERSION='CALIBRATION-CLEANUP-V16.9.1F59.9';
const DB_NAME='at_ai_5model_calibration_v1';
const STORE_ENTRIES='entries';
const STORE_BACKTESTS='backtests';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
let working=false,observer=null;

function stateRef(){
  try{if(typeof state==='object'&&state)return state}catch{}
  try{if(window.state&&typeof window.state==='object')return window.state}catch{}
  return null;
}
function currentContext(){
  const st=stateRef();
  let city='';
  try{if(typeof getCityName==='function')city=clean(getCityName())}catch{}
  if(!city) city=clean($('citySelect')?.selectedOptions?.[0]?.textContent);
  return {date:clean(st?.date||$('raceDate')?.value),city};
}
function entryContext(entry){
  const t=entry?.target||entry?.context||{};
  return {date:clean(t?.date||entry?.date),city:clean(t?.city||entry?.city)};
}
function sameContext(a,b){return Boolean(a?.date&&b?.date&&a.date===b.date&&fold(a.city)===fold(b.city));}

async function openDb(){
  if(!('indexedDB' in window)) return null;
  return new Promise(resolve=>{
    let q;try{q=indexedDB.open(DB_NAME)}catch{return resolve(null)}
    q.onerror=()=>resolve(null);
    q.onsuccess=()=>resolve(q.result);
  });
}
async function getAll(store){
  const db=await openDb();if(!db||!db.objectStoreNames.contains(store))return[];
  return new Promise(resolve=>{
    try{const q=db.transaction(store,'readonly').objectStore(store).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([])}catch{resolve([])}
  });
}
async function clearStore(store){
  const db=await openDb();if(!db||!db.objectStoreNames.contains(store))return 0;
  const before=await new Promise(resolve=>{
    try{const q=db.transaction(store,'readonly').objectStore(store).count();q.onsuccess=()=>resolve(Number(q.result)||0);q.onerror=()=>resolve(0)}catch{resolve(0)}
  });
  await new Promise((resolve,reject)=>{
    try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).clear();tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||new Error('IndexedDB temizleme hatasi'))}catch(e){reject(e)}
  });
  return before;
}
async function deleteOldEntries(ctx){
  const db=await openDb();if(!db||!db.objectStoreNames.contains(STORE_ENTRIES))return{deleted:0,kept:0};
  return new Promise(resolve=>{
    let deleted=0,kept=0;
    try{
      const tx=db.transaction(STORE_ENTRIES,'readwrite');
      const store=tx.objectStore(STORE_ENTRIES);
      const q=store.openCursor();
      q.onsuccess=()=>{
        const cur=q.result;if(!cur)return;
        if(sameContext(entryContext(cur.value),ctx))kept++;else{cur.delete();deleted++;}
        cur.continue();
      };
      tx.oncomplete=()=>resolve({deleted,kept});
      tx.onerror=tx.onabort=()=>resolve({deleted,kept,error:tx.error||new Error('IndexedDB temizleme hatasi')});
    }catch(e){resolve({deleted,kept,error:e})}
  });
}

function ensureStyle(){
  if($('xcalCleanupStyleF599'))return;
  const s=document.createElement('style');s.id='xcalCleanupStyleF599';s.textContent=`
    .xcal-cleanup-f599{border:1px solid rgba(92,183,255,.25);background:rgba(26,83,124,.09)}
    .xcal-cleanup-actions-f599{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .xcal-cleanup-actions-f599 button{min-height:44px;white-space:normal}
    .xcal-cleanup-danger-f599{border-color:rgba(255,108,108,.38)!important;color:#ffd1d1!important}
    .xcal-cleanup-status-f599{margin-top:9px;font-size:11px;line-height:1.45;color:#b8cadc}
    @media(max-width:560px){.xcal-cleanup-actions-f599{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}
function cardHtml(stats,ctx){
  const label=ctx.date&&ctx.city?`${ctx.date} · ${ctx.city}`:'Secili program yok';
  return `<h3>🧹 Kalibrasyon Temizleme</h3>
    <p>Yalniz <b>Tam Eslesme Kalibrasyonu</b> kayitlarini yonetir. Gunluk/Yillik TJK arsivi ve kariyer verileri silinmez.</p>
    <div class="wcal-chips"><span class="wcal-chip">Kalibrasyon ${stats.entries}</span><span class="wcal-chip">Backtest ${stats.backtests}</span><span class="wcal-chip">Korunacak: ${label}</span></div>
    <div class="xcal-cleanup-actions-f599">
      <button id="xcalCleanupOldF599">Eski Kalibrasyonlari Temizle</button>
      <button id="xcalCleanupAllF599" class="xcal-cleanup-danger-f599">Kalibrasyonu Tamamen Sifirla</button>
    </div>
    <div id="xcalCleanupStatusF599" class="xcal-cleanup-status-f599">Eski temizleme, secili tarih + sehir kayitlarini korur. Tam sifirlama entries ve backtest onbellegini siler.</div>`;
}
async function stats(){
  const [entries,backtests]=await Promise.all([getAll(STORE_ENTRIES),getAll(STORE_BACKTESTS)]);
  return{entries:entries.length,backtests:backtests.length};
}
async function decorate(){
  const wrap=document.querySelector('#analysisContent .xcal-wrap');if(!wrap)return;
  if($('analysisDialog')?.dataset?.dailyCalibrationF6018==='1'){
    const existing=$('xcalCleanupCardF599');if(existing)existing.style.display='none';
    return;
  }
  ensureStyle();
  let card=$('xcalCleanupCardF599');
  if(!card){card=document.createElement('div');card.id='xcalCleanupCardF599';card.className='xcal-card xcal-cleanup-f599';wrap.prepend(card);}
  const st=await stats();card.innerHTML=cardHtml(st,currentContext());
}
function setStatus(text){const el=$('xcalCleanupStatusF599');if(el)el.textContent=text;}
function refreshScreen(){
  try{$('xcalRace')?.dispatchEvent(new Event('change',{bubbles:true}))}catch{}
  try{window.ATCalibrationErrorDetailV1691F598?.refresh?.()}catch{}
  setTimeout(()=>void decorate(),80);
}
async function cleanOld(){
  if(working)return;
  const ctx=currentContext();
  if(!ctx.date||!ctx.city){setStatus('Once ana ekranda tarih ve sehir programini yukle. Eski kayitlar hangi programa gore korunacak belirlenemedi.');return;}
  if(!confirm(`${ctx.date} · ${ctx.city} disindaki kalibrasyon ozetleri silinsin mi?\n\nBacktest onbellegi ve TJK arsivleri korunacak.`))return;
  working=true;setStatus('Eski kalibrasyon kayitlari temizleniyor...');
  try{
    const r=await deleteOldEntries(ctx);
    if(r.error)throw r.error;
    setStatus(`${r.deleted} eski kalibrasyon kaydi silindi. ${r.kept} guncel kayit korundu. Backtest onbellegi ve TJK arsivleri degismedi.`);
    refreshScreen();
  }catch(e){setStatus(`Temizleme hatasi: ${clean(e?.message||e)}`)}finally{working=false}
}
async function resetAll(){
  if(working)return;
  if(!confirm('Tum Tam Eslesme Kalibrasyonu kayitlari ve backtest onbellegi silinsin mi?\n\nGunluk/Yillik TJK arsivi, kariyer verileri ve program verileri SILINMEYECEK.'))return;
  if(!confirm('Bu islem geri alinamaz. Kalibrasyonu tamamen sifirlamak istiyor musun?'))return;
  working=true;setStatus('Kalibrasyon tamamen sifirlaniyor...');
  try{
    const a=await clearStore(STORE_ENTRIES);
    const b=await clearStore(STORE_BACKTESTS);
    setStatus(`${a} kalibrasyon kaydi ve ${b} backtest onbellek kaydi silindi. TJK arsivleri ve kariyer verileri korundu.`);
    document.querySelectorAll('#analysisContent .xcal-entry').forEach(x=>x.remove());
    refreshScreen();
  }catch(e){setStatus(`Sifirlama hatasi: ${clean(e?.message||e)}`)}finally{working=false}
}

document.addEventListener('click',e=>{
  if(e.target?.closest?.('#xcalCleanupOldF599')){e.preventDefault();void cleanOld();}
  if(e.target?.closest?.('#xcalCleanupAllF599')){e.preventDefault();void resetAll();}
  if(e.target?.closest?.('[data-view="calibration"]'))setTimeout(()=>void decorate(),40);
},true);

function observe(){
  if(observer){observer.disconnect();observer=null}
  const host=$('analysisContent');if(!host)return;
  observer=new MutationObserver(()=>{if(document.querySelector('#analysisContent .xcal-wrap')&&!$('xcalCleanupCardF599'))requestAnimationFrame(()=>void decorate())});
  observer.observe(host,{childList:true,subtree:true});
}
observe();requestAnimationFrame(()=>void decorate());
window.ATCalibrationCleanupV1691F599={version:VERSION,refresh:decorate,cleanOld,resetAll,stats};
console.info('[AT AI]',VERSION,'aktif — kalibrasyon temizleme secenekleri eklendi; TJK/Kariyer arsivlerine dokunulmaz.');
})();
