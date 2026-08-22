/* AT AI Mobil — V15.2 Şehirler arası günlük arşiv görüntüleyici
   - Ana programı değiştirmeden başka şehrin arşivlenmiş koşusunu salt-okunur gösterir.
   - Yalnız IndexedDB'deki hesaplanmış Kariyer/Hazırlık ve 5 Model sonuçlarını okur.
   - Analiz/puan formüllerine müdahale etmez.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CAREER_ARCHIVE_VIEWER_V152__) return;
window.__AT_DAILY_CAREER_ARCHIVE_VIEWER_V152__ = true;

const DB_NAME='at_ai_daily_career_archive_v146';
const STORE='entries';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>(v===null||v===undefined||v===''||!Number.isFinite(Number(v)))?null:Number(v);
let dbPromise=null;

function db(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    try{
      const req=indexedDB.open(DB_NAME,1);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>resolve(null);
    }catch{resolve(null);}
  });
  return dbPromise;
}
async function get(key){
  const d=await db(); if(!d)return null;
  return new Promise(resolve=>{
    try{
      const req=d.transaction(STORE,'readonly').objectStore(STORE).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>resolve(null);
    }catch{resolve(null);}
  });
}
function modelKey(r){return `model|${clean(r.date)}|${clean(r.city)}|${clean(r.raceNo)}`;}
function horseKey(h){return String(h?.id||`${h?.no}|${clean(h?.name).toLocaleUpperCase('tr-TR')}`);}
function careerRows(race={}){
  return (Array.isArray(race.horses)?race.horses:[]).map(x=>({horse:x?.horse||{},score:finite(x?.galibiyetBenzerligi?.score)}))
    .sort((a,b)=>(b.score??-1)-(a.score??-1)||Number(a.horse?.no||999)-Number(b.horse?.no||999));
}
function modelRows(data,id){
  return (Array.isArray(data?.horses)?data.horses:[]).map(x=>({horse:x?.horse||{},score:finite(x?.scores?.[id]?.score??x?.scores?.[id]?.rawScore)}))
    .filter(x=>x.score!==null)
    .sort((a,b)=>b.score-a.score||Number(a.horse?.no||999)-Number(b.horse?.no||999));
}
function table(title,rows){
  return `<section class="cav152-card"><h3>${esc(title)}</h3><table><thead><tr><th>Sıra</th><th>At</th><th>Puan</th></tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.horse?.no)}. ${esc(r.horse?.name)}</b></td><td>${r.score===null?'—':'%'+esc(r.score)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">Arşivlenmiş sıralama yok.</td></tr>'}</tbody></table></section>`;
}
function ensureDialog(){
  let dlg=document.getElementById('careerArchiveViewerV152');
  if(dlg)return dlg;
  dlg=document.createElement('dialog');
  dlg.id='careerArchiveViewerV152';
  dlg.innerHTML=`<style>
    #careerArchiveViewerV152{width:min(960px,96vw);max-height:92vh;border:0;border-radius:16px;padding:0;background:#fff;color:#111}
    #careerArchiveViewerV152::backdrop{background:rgba(0,0,0,.72)}
    #careerArchiveViewerV152 .head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 16px;background:#10253a;color:#fff}
    #careerArchiveViewerV152 .body{padding:14px;overflow:auto}
    #careerArchiveViewerV152 .meta{color:#666;margin:3px 0 12px;font-size:12px}
    #careerArchiveViewerV152 .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    #careerArchiveViewerV152 .cav152-card{margin:0 0 10px;break-inside:avoid}
    #careerArchiveViewerV152 .cav152-card.full{grid-column:1/-1}
    #careerArchiveViewerV152 h2,#careerArchiveViewerV152 h3{margin:0 0 6px}
    #careerArchiveViewerV152 h3{font-size:14px}
    #careerArchiveViewerV152 table{width:100%;border-collapse:collapse;font-size:11px}
    #careerArchiveViewerV152 th,#careerArchiveViewerV152 td{border:1px solid #ddd;padding:4px 5px;text-align:left}
    #careerArchiveViewerV152 th{background:#f3f4f6}.empty{text-align:center;color:#777}
    #careerArchiveViewerV152 .close{border:0;border-radius:9px;padding:8px 12px;font-weight:700;cursor:pointer}
    @media(max-width:650px){#careerArchiveViewerV152 .grid{grid-template-columns:1fr}#careerArchiveViewerV152 .cav152-card.full{grid-column:auto}}
  </style><div class="head"><div><b id="cav152Title"></b><div id="cav152Date" style="font-size:11px;opacity:.75"></div></div><button class="close" type="button">Kapat</button></div><div class="body" id="cav152Body"></div>`;
  document.body.appendChild(dlg);
  dlg.querySelector('.close').onclick=()=>dlg.close();
  return dlg;
}
async function showRecord(rec){
  const model=await get(modelKey(rec));
  const race=rec.race||{};
  const dlg=ensureDialog();
  dlg.querySelector('#cav152Title').textContent=`${clean(rec.cityName||rec.city)} · ${clean(rec.raceNo)}. Koşu`;
  dlg.querySelector('#cav152Date').textContent=clean(rec.date);
  const meta=[race.class||race.meta?.class,race.ageGroup||race.meta?.ageGroup,race.distance||race.meta?.distance,race.track||race.meta?.track].filter(Boolean).join(' · ');
  const names={composite:'Bileşik Sıralaması',exact:'Tam Eşleşme Sıralaması',twin:'Koşul İkizi Sıralaması',family:'Yarış Ailesi Sıralaması',career:'Kariyer Sıralaması'};
  const kht=table('Kariyer / Hazırlık Sıralaması',careerRows(race)).replace('class="cav152-card"','class="cav152-card full"');
  dlg.querySelector('#cav152Body').innerHTML=`<div class="meta">${esc(meta)}</div><div class="grid">${kht}${Object.entries(names).map(([id,name])=>table(name,modelRows(model?.data,id))).join('')}</div><div style="margin-top:8px;font-size:10px;color:#777">Salt-okunur günlük arşiv görünümü. Puanlar yeniden hesaplanmadı.</div>`;
  if(!dlg.open)dlg.showModal();
}

document.addEventListener('click',async e=>{
  const btn=e.target?.closest?.('#careerArchiveDialogV146 [data-open]');
  if(!btn)return;
  const rec=await get(btn.dataset.open);
  if(!rec)return;
  let currentCity='';
  try{currentCity=clean(typeof state!=='undefined'?state?.city:'');}catch{}
  if(currentCity&&clean(rec.city)===currentCity)return; // aynı şehirde mevcut detay ekranı çalışsın
  e.preventDefault();
  e.stopImmediatePropagation();
  await showRecord(rec);
},true);

console.info('[AT AI] DAILY-CAREER-ARCHIVE-V15.2 şehirler arası salt-okunur görüntüleyici aktif');
})();
