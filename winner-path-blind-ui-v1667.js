/* AT AI Mobil — V16.6.7 Kazanan Yolu Kör Testi UI
   Menü 2'deki eski ham JSON çıktısını gerçek kör test ekranına dönüştürür.
   Tahmin sırasında sonuç API'si çağrılmaz. Sonuç yalnız kullanıcı "Sonucu Aç" dediğinde alınır.
*/
(() => {
'use strict';
if (window.__AT_WINNER_PATH_BLIND_UI_V1667__) return;
window.__AT_WINNER_PATH_BLIND_UI_V1667__ = true;

const VERSION='WINNER-PATH-BLIND-UI-V16.6.7';
let historicalActive=false;
let running=false;
let lastBlind=null;
let lastContext=null;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
const pct=v=>n(v)===null?'—':`${n(v).toFixed(1)}%`;
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');

function ensureStyle(){
  if ($('winnerPathBlindStyleV1667')) return;
  const s=document.createElement('style');
  s.id='winnerPathBlindStyleV1667';
  s.textContent=`
    .wpb-wrap{display:grid;gap:12px;padding-bottom:20px}
    .wpb-card{border:1px solid rgba(125,190,255,.22);background:rgba(8,24,39,.72);border-radius:16px;padding:14px}
    .wpb-card h3{margin:0 0 8px;font-size:16px}.wpb-card p{margin:5px 0;color:#b9cbe0;line-height:1.45}
    .wpb-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.wpb-chip{border:1px solid rgba(111,191,255,.24);border-radius:999px;padding:5px 9px;font-size:12px;color:#d8ebff;background:rgba(42,109,164,.13)}
    .wpb-ok{color:#78e0a5}.wpb-warn{color:#ffbd82}.wpb-bad{color:#ff8c8c}
    .wpb-rank{display:grid;gap:8px}.wpb-row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;border:1px solid rgba(120,180,235,.14);border-radius:13px;padding:10px;background:rgba(4,16,28,.55)}
    .wpb-pos{font-size:19px;font-weight:800;text-align:center}.wpb-horse b{display:block}.wpb-horse small{display:block;color:#9fb4c9;margin-top:3px}.wpb-score{text-align:right;font-weight:800}.wpb-score small{display:block;color:#9fb4c9;font-weight:500;margin-top:2px}
    .wpb-ref{display:grid;grid-template-columns:92px 1fr;gap:8px;padding:8px 0;border-bottom:1px solid rgba(120,180,235,.10)}.wpb-ref:last-child{border-bottom:0}.wpb-ref span{color:#9fb4c9}
    .wpb-progress{height:6px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08);margin-top:10px}.wpb-progress i{display:block;width:55%;height:100%;background:linear-gradient(90deg,#32b5ff,#5977ff);animation:wpbmove 1.1s ease-in-out infinite alternate}@keyframes wpbmove{from{transform:translateX(-55%)}to{transform:translateX(135%)}}
    .wpb-result{border-color:rgba(111,230,157,.35)}
    @media(max-width:560px){.wpb-row{grid-template-columns:30px 1fr auto}.wpb-score{font-size:14px}.wpb-ref{grid-template-columns:82px 1fr}}
  `;
  document.head.appendChild(s);
}

function context(){
  const raceSel=$('analysisRace');
  const raceNo=Number(raceSel?.value);
  const date=clean($('raceDate')?.value);
  const citySel=$('citySelect');
  const city=clean(citySel?.selectedOptions?.[0]?.textContent);
  return {date,city,raceNo};
}
function isHistoricalView(){
  if (historicalActive) return true;
  const title=clean($('dialogTitle')?.textContent);
  return /Kazanan Yolu|Tarihsel Benzerlik/i.test(title);
}
function introHtml(){
  const c=context();
  const raceText=Number.isFinite(c.raceNo)?`${c.raceNo}. Koşu`:'Önce tek koşu seçin';
  return `<div class="wpb-wrap">
    <div class="wpb-card">
      <h3>🏁 Kazanan Yolu Kör Testi</h3>
      <p>Yalnız geçmiş yarışların <b>1. olan atlarının</b>, kazandıkları tarihten önceki kariyer yolları referans alınır.</p>
      <div class="wpb-chips"><span class="wpb-chip">${esc(c.date||'Tarih seçilmedi')}</span><span class="wpb-chip">${esc(c.city||'Şehir seçilmedi')}</span><span class="wpb-chip">${esc(raceText)}</span></div>
    </div>
    <div class="wpb-card"><h3>Körlük kuralı</h3><p>Tahmin üretilirken hedef yarışın sonucu yüklenmez. Kariyer kayıtları hedef tarihten önce kesilir. Gerçek sonuç ancak <b>Sonucu Aç</b> düğmesine basıldıktan sonra çağrılır.</p></div>
    <div class="wpb-card"><h3>Telefon hafızası</h3><p>Güncel at kariyerleri kalıcı saklanmaz. Kazanan yolu önbelleği yalnız kompakt özet tutar ve 8 MB ile sınırlıdır.</p></div>
  </div>`;
}
function configureDialog(reset=false){
  if (!isHistoricalView()) return;
  ensureStyle();
  historicalActive=true;
  const title=$('dialogTitle'), eyebrow=$('dialogEyebrow'), run=$('runAnalysis'), second=$('ticketFromAnalysis'), content=$('analysisContent');
  if(title) title.textContent='Kazanan Yolu Kör Testi';
  if(eyebrow) eyebrow.textContent='KÖR TEST · SADECE KAZANANLAR';
  if(run){run.textContent=running?'Kör Test Çalışıyor…':'Kör Testi Çalıştır';run.disabled=running;}
  if(second){second.textContent='Sonucu Aç';second.style.display='';second.disabled=!lastBlind||running;second.title='Tahmin dondurulduktan sonra gerçek kazananı aç';}
  if(content && (reset || !lastBlind)){
    content.classList.remove('empty');
    content.innerHTML=introHtml();
  }
}
function loadingHtml(c){
  return `<div class="wpb-wrap"><div class="wpb-card"><h3>Kör test hazırlanıyor…</h3><p>${esc(c.date)} · ${esc(c.city)} · ${esc(c.raceNo)}. Koşu</p><p>Koşacak atların hedef tarihten önceki kariyerleri ve geçmiş <b>1. olanların</b> yolları karşılaştırılıyor. Gerçek sonuç çağrılmıyor.</p><div class="wpb-progress"><i></i></div></div></div>`;
}
function rowName(r){return clean(r?.At_Adı??r?.At_Adi??r?.horseName??r?.name)||'At';}
function rowNo(r){return n(r?.Program_No??r?.programNo??r?.no);}
function rankHtml(data){
  const rows=Array.isArray(data?.rows)?data.rows:[];
  const refs=Array.isArray(data?.referenceWinners)?data.referenceWinners:[];
  const leak=data?.leakAudit||{};
  const passed=leak?.passed===true;
  const roadmapOk=data?.roadmapOk!==false;
  const target=data?.target||{};
  const topRows=rows.map((r,i)=>`<div class="wpb-row">
    <div class="wpb-pos">${i+1}</div>
    <div class="wpb-horse"><b>${rowNo(r)??''}${rowNo(r)!==null?'. ':''}${esc(rowName(r))}</b><small>${esc(r?.ADAY_TIPI||'')} · A:${r?.A_SIRA??'—'} · B:${r?.B_SIRA??'—'} · Kariyer:${r?.KARIYER??'—'}</small></div>
    <div class="wpb-score">${n(r?.V5_SKOR)===null?'—':n(r.V5_SKOR).toFixed(1)}<small>Kazanan yolu</small></div>
  </div>`).join('');
  const refRows=refs.slice().sort((a,b)=>clean(a?.Referans_Tarih).localeCompare(clean(b?.Referans_Tarih))).map(r=>`<div class="wpb-ref"><span>${esc(r?.Referans_Tarih||'')}</span><div><b>${esc(r?.Kazanan||'Kazanan')}</b><div style="color:#9fb4c9;font-size:12px;margin-top:2px">${esc(r?.Referans_Şehir||'')} · ${r?.Kariyer_Satırı??0} yarış · ${esc(r?.Tipler||'')}</div></div></div>`).join('');
  return `<div class="wpb-wrap">
    <div class="wpb-card"><h3>${esc(target?.city||lastContext?.city||'')} · ${esc(target?.date||lastContext?.date||'')} · ${target?.raceNo||lastContext?.raceNo}. Koşu</h3><p>${esc(target?.class||'')} · ${esc(target?.ageGroup||'')} · ${target?.distance||''} ${esc(target?.track||'')}</p><div class="wpb-chips"><span class="wpb-chip">Referans kazanan: ${refs.length}</span><span class="wpb-chip">Referans kalitesi: ${pct(data?.referenceSetQuality)}</span><span class="wpb-chip ${passed?'wpb-ok':'wpb-bad'}">Tarih sızıntısı: ${passed?'0':'VAR'}</span><span class="wpb-chip ${roadmapOk?'wpb-ok':'wpb-warn'}">Referans hattı: ${roadmapOk?'Hazır':'Kısmi'}</span></div></div>
    <div class="wpb-card"><h3>🔒 Dondurulmuş kör sıralama</h3><p>Bu sıralama gerçek sonuç açılmadan üretildi.</p><div class="wpb-rank">${topRows||'<p>At sıralaması üretilemedi.</p>'}</div></div>
    <div class="wpb-card"><h3>🏆 Kullanılan geçmiş kazananlar</h3>${refRows||'<p class="wpb-warn">Geçmiş kazanan referansı bulunamadı. Model yalnız güncel kariyer kanıtına düşmüş olabilir.</p>'}</div>
    ${data?.roadmapError?`<div class="wpb-card"><h3 class="wpb-warn">Referans uyarısı</h3><p>${esc(data.roadmapError)}</p></div>`:''}
  </div>`;
}
async function fetchJson(url,timeout=235000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal:c.signal});
    const text=await r.text(); let d;
    try{d=JSON.parse(text);}catch{throw new Error('Sunucu JSON döndürmedi.');}
    if(!r.ok||d?.ok===false) throw new Error(d?.error||`HTTP ${r.status}`);
    return d;
  }finally{clearTimeout(t);}
}
async function runBlind(){
  if(running) return;
  const c=context();
  if(!c.date||!c.city||!Number.isFinite(c.raceNo)||c.raceNo<1){
    const content=$('analysisContent'); if(content) content.innerHTML='<div class="wpb-card"><h3 class="wpb-warn">Tek koşu seçin</h3><p>Kör test için üstteki listeden bir koşu seçmeniz gerekiyor.</p></div>';
    return;
  }
  running=true;lastBlind=null;lastContext=c;configureDialog(false);
  const content=$('analysisContent'); if(content){content.classList.remove('empty');content.innerHTML=loadingHtml(c);}
  try{
    const q=new URLSearchParams({date:c.date,city:c.city,raceNo:String(c.raceNo)});
    const data=await fetchJson(`/api/tjk-conditional-v4-blind?${q.toString()}`);
    if(data?.resultApiCalled||data?.resultDataLoaded) throw new Error('Körlük denetimi başarısız: sonuç verisi tahminden önce açılmış.');
    lastBlind=data;
    window.__AT_WINNER_PATH_LAST_BLIND_V1667__={context:c,data,createdAt:new Date().toISOString()};
    if(content) content.innerHTML=rankHtml(data);
  }catch(e){
    if(content) content.innerHTML=`<div class="wpb-wrap"><div class="wpb-card"><h3 class="wpb-bad">Kör test alınamadı</h3><p>${esc(e?.name==='AbortError'?'İstek süre sınırını aştı.':e?.message||e)}</p><p>Tahmin oluşturulmadığı için gerçek sonuç açılmadı.</p></div></div>`;
  }finally{running=false;configureDialog(false);}
}
function winnerFromHistory(d){
  const list=Array.isArray(d?.top3)?d.top3:Array.isArray(d?.rows)?d.rows:[];
  if(!list.length) return null;
  const w=list.find(x=>Number(x?.finish??x?.rank??x?.sira??x?.Bitiriş??x?.bitiris)===1)||list[0];
  return {name:clean(w?.horseName??w?.At_Adı??w?.At_Adi??w?.name??w?.atAdi),id:clean(w?.horseId??w?.At_ID??w?.id),no:n(w?.programNo??w?.Program_No??w?.no)};
}
async function revealResult(){
  if(!lastBlind||!lastContext||running) return;
  const second=$('ticketFromAnalysis'); if(second){second.disabled=true;second.textContent='Sonuç Açılıyor…';}
  try{
    const q=new URLSearchParams({date:lastContext.date,city:lastContext.city,raceNo:String(lastContext.raceNo)});
    const history=await fetchJson(`/api/tjk-history?${q.toString()}`,90000);
    const winner=winnerFromHistory(history);
    if(!winner?.name) throw new Error('Gerçek kazanan henüz sonuç verisinde bulunamadı.');
    const rows=Array.isArray(lastBlind?.rows)?lastBlind.rows:[];
    let index=rows.findIndex(r=>(winner.id&&clean(r?.At_ID)===winner.id)||fold(rowName(r))===fold(winner.name));
    const rank=index>=0?index+1:null;
    const content=$('analysisContent');
    if(content){
      const box=document.createElement('div');box.className='wpb-card wpb-result';
      box.innerHTML=`<h3>✅ Gerçek sonuç açıldı</h3><p><b>${winner.no??''}${winner.no!==null?'. ':''}${esc(winner.name)}</b> yarışı kazandı.</p><div class="wpb-chips"><span class="wpb-chip">Kör model sırası: <b>${rank??'Eşleşmedi'}</b></span><span class="wpb-chip ${rank===1?'wpb-ok':rank&&rank<=3?'wpb-warn':''}">${rank===1?'1. sıradan bildi':rank&&rank<=3?`İlk 3 içinde (${rank}.)`:rank?`${rank}. sırada`:'Sıralamada eşleşmedi'}</span></div>`;
      content.prepend(box);
      content.scrollTop=0;
    }
    window.__AT_WINNER_PATH_LAST_RESULT_V1667__={context:lastContext,winner,blindRank:rank,revealedAt:new Date().toISOString()};
    if(second){second.textContent='Sonuç Açıldı';second.disabled=true;}
  }catch(e){
    const content=$('analysisContent'); if(content){const box=document.createElement('div');box.className='wpb-card';box.innerHTML=`<h3 class="wpb-warn">Sonuç alınamadı</h3><p>${esc(e?.message||e)}</p>`;content.prepend(box);}
    if(second){second.textContent='Sonucu Aç';second.disabled=false;}
  }
}

/* Menü 2 aktifliğini izler; eski dialog açılışı çalışmaya devam eder, ardından görünümü biz düzenleriz. */
document.addEventListener('click',event=>{
  const view=event.target?.closest?.('[data-view]');
  if(view){historicalActive=view.getAttribute('data-view')==='historical';if(historicalActive)setTimeout(()=>configureDialog(true),0);return;}
  const run=event.target?.closest?.('#runAnalysis');
  if(run&&isHistoricalView()){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    void runBlind();return;
  }
  const second=event.target?.closest?.('#ticketFromAnalysis');
  if(second&&isHistoricalView()){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    void revealResult();
  }
},true);

document.addEventListener('change',event=>{
  if(event.target?.id==='analysisRace'&&isHistoricalView()&&!running){lastBlind=null;lastContext=null;configureDialog(true);}
},true);

window.addEventListener('load',()=>{ensureStyle();setTimeout(()=>{if(isHistoricalView())configureDialog(false);},50);});
ensureStyle();
window.ATWinnerPathBlindUIV1667={VERSION,run:runBlind,reveal:revealResult,getLast:()=>lastBlind};
console.info('[AT AI]',VERSION,'aktif — Menü 2 gerçek kör test ekranı.');
})();
