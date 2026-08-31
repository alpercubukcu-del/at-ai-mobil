/* AT AI Mobil — V16.9.1F59.8 KALIBRASYON HATA AYRINTISI
   - Kalibrasyon Arsivi kartinda yalniz "1 hata" sayisi yerine hangi tarih/kosu ve gercek hata metnini gosterir.
   - Mevcut IndexedDB entry.errors alanini salt-okunur kullanir; 5 Model/backtest yeniden hesaplamaz.
   - Gunluk/Yillik Arsiv veya kalibrasyon kaydi silmez/degistirmez; yeni timeout/watchdog yoktur.
*/
(() => {
'use strict';
if (window.__AT_CALIBRATION_ERROR_DETAIL_V1691F598__) return;
window.__AT_CALIBRATION_ERROR_DETAIL_V1691F598__ = true;

const VERSION='CALIBRATION-ERROR-DETAIL-V16.9.1F59.8';
const DB_NAME='at_ai_5model_calibration_v1';
const STORE='entries';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
let busy=false,queued=false,observer=null;

async function allEntries(){
  if(!('indexedDB' in window)) return [];
  return new Promise(resolve=>{
    let q;try{q=indexedDB.open(DB_NAME)}catch{return resolve([])}
    q.onerror=()=>resolve([]);
    q.onsuccess=()=>{
      const db=q.result;if(!db.objectStoreNames.contains(STORE))return resolve([]);
      try{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>resolve([])}catch{resolve([])}
    };
  });
}

function ensureStyle(){
  if($('xcalErrorStyleF598'))return;
  const s=document.createElement('style');s.id='xcalErrorStyleF598';s.textContent=`
    .xcal-error-detail-f598{margin-top:9px;padding:8px 9px;border:1px solid rgba(255,171,71,.28);border-radius:10px;background:rgba(255,140,40,.055)}
    .xcal-error-title-f598{font-size:10px;font-weight:900;color:#ffd2a1;margin-bottom:6px}
    .xcal-error-row-f598{padding:6px 0;border-top:1px solid rgba(255,255,255,.06)}
    .xcal-error-row-f598:first-of-type{border-top:0;padding-top:0}
    .xcal-error-where-f598{display:block;font-size:10px;font-weight:800;color:#f4f8fb;margin-bottom:2px}
    .xcal-error-msg-f598{display:block;font-size:10px;line-height:1.4;color:#ffc786;overflow-wrap:anywhere}
  `;document.head.appendChild(s);
}

function entryCard(entry){
  const t=entry?.target||{};
  const cards=[...document.querySelectorAll('#analysisContent .xcal-entry')];
  return cards.find(card=>{
    const txt=clean(card.textContent);
    return (!t.raceNo||txt.includes(`${t.raceNo}.K`))&&(!t.city||txt.includes(clean(t.city)))&&(!t.date||txt.includes(clean(t.date)));
  })||null;
}

function errorHtml(errors){
  return `<div class="xcal-error-title-f598">Hata ayrıntısı · ${errors.length}</div>${errors.slice(0,8).map((e,i)=>{
    const where=[clean(e?.date)||'Tarih ?',clean(e?.city),e?.raceNo?`${Number(e.raceNo)}.K`:'Koşu ?'].filter(Boolean).join(' · ');
    return `<div class="xcal-error-row-f598"><span class="xcal-error-where-f598">${esc(where)}</span><span class="xcal-error-msg-f598">${esc(clean(e?.error)||'Bilinmeyen kalibrasyon hatası')}</span></div>`;
  }).join('')}${errors.length>8?`<div class="xcal-error-msg-f598">+${errors.length-8} hata daha</div>`:''}`;
}

async function decorate(){
  if(busy){queued=true;return}
  if(!document.querySelector('#analysisContent .xcal-wrap'))return;
  busy=true;
  try{
    ensureStyle();
    const entries=await allEntries();
    for(const entry of entries){
      const card=entryCard(entry);if(!card)continue;
      const errors=Array.isArray(entry?.errors)?entry.errors.filter(Boolean):[];
      let box=card.querySelector(':scope > .xcal-error-detail-f598');
      if(!errors.length){box?.remove();continue}
      if(!box){box=document.createElement('div');box.className='xcal-error-detail-f598';card.appendChild(box)}
      const html=errorHtml(errors);if(box.innerHTML!==html)box.innerHTML=html;
    }
  }finally{
    busy=false;if(queued){queued=false;requestAnimationFrame(()=>void decorate())}
  }
}

function observe(){
  if(observer){observer.disconnect();observer=null}
  const host=$('analysisContent');if(!host)return;
  observer=new MutationObserver(()=>{if(document.querySelector('#analysisContent .xcal-wrap'))requestAnimationFrame(()=>void decorate())});
  observer.observe(host,{childList:true,subtree:true});
}

window.addEventListener('click',e=>{if(e.target?.closest?.('[data-view="calibration"]'))requestAnimationFrame(()=>{observe();void decorate()})},true);
window.addEventListener('change',e=>{if(e.target?.closest?.('#xcalRace'))requestAnimationFrame(()=>void decorate())},true);
observe();requestAnimationFrame(()=>void decorate());
window.ATCalibrationErrorDetailV1691F598={version:VERSION,refresh:decorate};
console.info('[AT AI]',VERSION,'aktif — kalibrasyon hata nedeni salt-okunur gosterilir; yeniden hesaplama/timeout/arsiv temizleme yok.');
})();
