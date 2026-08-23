/* AT AI Mobil — V16.7.3 Dinamik Kazanan Kalibrasyonu
   - Sabit 18.08.2026 Kocaeli testi yerine yüklü herhangi bir geçmiş tarih/şehirde çalışır.
   - Yalnız gerçek kazananı ölçer; 2. ve 3. dereceler kalibrasyondan çıkarılmıştır.
   - 5 Model (Bileşik/Tam/İkiz/Aile/Kariyer) + Kazanan Yolu kör sıralaması, gerçek sonuç açılmadan önce dondurulur.
   - Gerçek sonuç ancak bütün kör sıralamalar üretildikten sonra /api/tjk-history ile alınır.
   - Sonuçlar kompakt tutulur; tam kariyer/model payload'ları telefonda saklanmaz.
*/
(() => {
'use strict';
if (window.__AT_WINNER_CALIBRATION_V1673__) return;
window.__AT_WINNER_CALIBRATION_V1673__ = true;

const VERSION='WINNER-CALIBRATION-V16.7.3';
const CACHE_KEY='at_ai_winner_calibration_v1673';
const MAX_RECORDS=300;
const MODEL_IDS=['composite','exact','twin','family','career','winner'];
const MODEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer',winner:'Kazanan Yolu'};
let busy=false;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));

function cityName(){
  try{return typeof getCityName==='function'?clean(getCityName()):clean($('citySelect')?.selectedOptions?.[0]?.textContent);}catch{return clean($('citySelect')?.selectedOptions?.[0]?.textContent);}
}
function currentDate(){return clean(state?.date||$('raceDate')?.value);}
function currentRaces(){return Array.isArray(state?.races)?state.races:[];}
function keyOf(r){return [r.date,fold(r.city),Number(r.raceNo)||0].join('|');}

function loadPool(){
  try{const p=JSON.parse(localStorage.getItem(CACHE_KEY)||'[]');return Array.isArray(p)?p:[];}catch{return[];}
}
function savePool(records){
  try{
    const map=new Map();
    for(const r of records||[]) if(r?.date&&r?.city&&Number(r?.raceNo)>0) map.set(keyOf(r),r);
    const list=[...map.values()].sort((a,b)=>String(a?.testedAt||'').localeCompare(String(b?.testedAt||''))).slice(-MAX_RECORDS);
    localStorage.setItem(CACHE_KEY,JSON.stringify(list));
    return list;
  }catch(e){console.warn('[AT AI] winner calibration cache yazılamadı',e);return records||[];}
}
function upsertRecords(newRows){return savePool([...loadPool(),...(newRows||[])]);}

function metric(rows,modelId){
  const vals=(rows||[]).map(r=>finite(r?.ranks?.[modelId])).filter(n=>Number.isInteger(n)&&n>=1);
  return {
    total:(rows||[]).length,
    coverage:vals.length,
    top1:vals.filter(x=>x===1).length,
    top2:vals.filter(x=>x<=2).length,
    top3:vals.filter(x=>x<=3).length,
    top4:vals.filter(x=>x<=4).length,
    averageRank:vals.length?Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100:null
  };
}
function summary(rows){const out={};for(const id of MODEL_IDS)out[id]=metric(rows,id);return out;}

function saveCompatibility(rows){
  if(typeof saveCalibrationCacheV116!=='function') return;
  const s=summary(rows);
  const byFinish={1:{}};
  for(const id of ['composite','exact','twin','family','career']){
    const m=s[id];
    byFinish[1][id]={total:m.total,coverage:m.coverage,top1:m.top1,top3:m.top3,averageRank:m.averageRank,mrr:null};
  }
  const result={
    calibrationVersion:VERSION,
    podiumVersion:'WINNER-ONLY',
    dayId:`winner-${Date.now()}`,
    title:'Dinamik Kazanan Kalibrasyonu',
    date:currentDate(),cityName:cityName(),sourceLabel:'Kör model sıralaması + TJK gerçek kazanan',
    calculatedAt:new Date().toISOString(),races:[],summary:{byFinish,overall:byFinish[1]}
  };
  try{saveCalibrationCacheV116(result.dayId,result);}catch(e){console.warn('[AT AI] compatibility calibration yazılamadı',e);}
}

function ensureStyle(){
  if($('winnerCalibrationStyleV1673')) return;
  const s=document.createElement('style');s.id='winnerCalibrationStyleV1673';s.textContent=`
  .wcal-wrap{display:grid;gap:12px;padding:2px 0 24px}.wcal-card{border:1px solid rgba(125,190,255,.20);background:rgba(8,24,39,.74);border-radius:16px;padding:14px}.wcal-card h3{margin:0 0 8px}.wcal-card p{margin:5px 0;color:#b8cadc;line-height:1.45}.wcal-grid{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}.wcal-grid select,.wcal-grid button{min-height:44px}.wcal-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.wcal-chip{font-size:11px;border:1px solid rgba(125,190,255,.22);border-radius:999px;padding:5px 8px;color:#d7ebff}.wcal-progress{height:9px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08);margin:10px 0}.wcal-progress i{display:block;height:100%;background:linear-gradient(90deg,#2bb7ff,#6374ff);transition:width .3s ease}.wcal-table{width:100%;border-collapse:collapse;font-size:12px;min-width:720px}.wcal-table th,.wcal-table td{padding:8px 7px;border-bottom:1px solid rgba(125,190,255,.11);text-align:left;white-space:nowrap}.wcal-scroll{overflow:auto;-webkit-overflow-scrolling:touch}.wcal-good{color:#78e0a5}.wcal-warn{color:#ffca7a}.wcal-bad{color:#ff9292}.wcal-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.wcal-rank1{color:#79e6aa;font-weight:900}.wcal-rank3{color:#ffcf78;font-weight:850}.wcal-rankout{color:#f1a3a3}.wcal-muted{opacity:.65}@media(max-width:560px){.wcal-grid{grid-template-columns:1fr}.wcal-btns{grid-template-columns:1fr}.wcal-card{padding:12px}}
  `;document.head.appendChild(s);
}

async function fetchJson(url,timeout=150000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const res=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal:ctrl.signal});
    const text=await res.text();let data;try{data=JSON.parse(text);}catch{throw new Error('Sunucu JSON döndürmedi.');}
    if(!res.ok||data?.ok===false) throw new Error(data?.error||`HTTP ${res.status}`);
    return data;
  }finally{clearTimeout(timer);}
}
function historyWinner(data){
  const list=Array.isArray(data?.top3)?data.top3:Array.isArray(data?.rows)?data.rows:[];
  if(!list.length)return null;
  const row=list.find(x=>Number(x?.finish??x?.rank??x?.sira??x?.Bitiriş??x?.bitiris)===1)||list[0];
  return {no:finite(row?.programNo??row?.Program_No??row?.no),id:clean(row?.horseId??row?.At_ID??row?.id),name:clean(row?.horseName??row?.At_Adı??row?.At_Adi??row?.name??row?.atAdi)};
}
function sameHorse(h,w){
  if(!h||!w)return false;
  const hid=clean(h?.id??h?.horseId??h?.At_ID),wid=clean(w?.id);
  if(hid&&wid&&hid===wid)return true;
  const hno=finite(h?.no??h?.Program_No),wno=finite(w?.no);
  if(hno!==null&&wno!==null&&hno===wno)return true;
  return fold(h?.name??h?.horseName??h?.At_Adı??h?.At_Adi)===fold(w?.name);
}
function rankInModel(modelData,modelId,winner){
  if(typeof modelRankingPodiumV115!=='function') return null;
  const ranking=modelRankingPodiumV115(modelData,1,modelId);
  const idx=ranking.findIndex(r=>sameHorse(r?.item?.horse,winner));
  return idx>=0?idx+1:null;
}
function rankInWinnerBlind(blind,winner){
  const rows=Array.isArray(blind?.rows)?blind.rows:[];
  const idx=rows.findIndex(r=>sameHorse({id:r?.At_ID,no:r?.Program_No??r?.programNo,name:r?.At_Adı??r?.At_Adi??r?.horseName??r?.name},winner));
  return idx>=0?idx+1:null;
}

function progressHtml(pct,text,step){return `<div class="wcal-card"><h3>Kalibrasyon çalışıyor</h3><p>${esc(text)}</p><div class="wcal-progress"><i style="width:${clamp(pct)}%"></i></div><div class="wcal-chips"><span class="wcal-chip">%${Math.round(clamp(pct))}</span><span class="wcal-chip">${esc(step||'')}</span></div></div>`;}
function rankCell(v){const n=finite(v);if(n===null)return '<span class="wcal-muted">—</span>';const cls=n===1?'wcal-rank1':n<=3?'wcal-rank3':'wcal-rankout';return `<span class="${cls}">#${n}</span>`;}
function summaryHtml(rows){
  const s=summary(rows);return `<div class="wcal-card"><h3>Toplu kazanan başarısı</h3><p>Yalnız gerçek 1. olan atın model sırasını ölçer. Bu oranlar kuponda BANKO / dar / geniş kararına güven katsayısı sağlar.</p><div class="wcal-scroll"><table class="wcal-table"><thead><tr><th>Model</th><th>Top-1</th><th>İlk 2</th><th>İlk 3</th><th>İlk 4</th><th>Ort. sıra</th><th>Kapsama</th></tr></thead><tbody>${MODEL_IDS.map(id=>{const m=s[id];return `<tr><td><b>${esc(MODEL_LABELS[id])}</b></td><td>${m.top1}/${m.total}</td><td>${m.top2}/${m.total}</td><td>${m.top3}/${m.total}</td><td>${m.top4}/${m.total}</td><td>${m.averageRank??'—'}</td><td>${m.coverage}/${m.total}</td></tr>`;}).join('')}</tbody></table></div></div>`;
}
function rowsHtml(rows){
  const list=(rows||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||fold(a.city).localeCompare(fold(b.city))||Number(a.raceNo)-Number(b.raceNo));
  return `<div class="wcal-card"><h3>Kalibre edilen yarışlar</h3>${!list.length?'<p>Henüz kayıt yok.</p>':`<div class="wcal-scroll"><table class="wcal-table"><thead><tr><th>Tarih</th><th>Şehir</th><th>Koşu</th><th>Gerçek kazanan</th><th>Bileşik</th><th>Tam</th><th>İkiz</th><th>Aile</th><th>Kariyer</th><th>Kazanan Yolu</th><th>Ref.</th></tr></thead><tbody>${list.slice(0,80).map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.city)}</td><td>${r.raceNo}.K</td><td><b>${r.winner?.no??''}${r.winner?.no!=null?'. ':''}${esc(r.winner?.name||'—')}</b></td><td>${rankCell(r.ranks?.composite)}</td><td>${rankCell(r.ranks?.exact)}</td><td>${rankCell(r.ranks?.twin)}</td><td>${rankCell(r.ranks?.family)}</td><td>${rankCell(r.ranks?.career)}</td><td>${rankCell(r.ranks?.winner)}</td><td>${r.referenceCount??0}</td></tr>`).join('')}</tbody></table></div>`}</div>`;
}

function selectorOptions(){return `<option value="all">Tüm Koşular</option>${currentRaces().map(r=>`<option value="${Number(r?.no)||0}">${Number(r?.no)||'?'} . Koşu · ${esc(clean(r?.class||''))} ${esc(clean(r?.distance||''))} ${esc(clean(r?.track||''))}</option>`).join('')}`;}
function homeHtml(){
  ensureStyle();const date=currentDate(),city=cityName(),races=currentRaces(),pool=loadPool();
  const contextRows=pool.filter(r=>r.date===date&&fold(r.city)===fold(city));
  return `<div class="wcal-wrap"><div class="wcal-card"><h3>🏆 Kazanan Kalibrasyonu</h3><p>Artık sabit Kocaeli testi değil. Ana ekranda hangi geçmiş <b>tarih + şehir</b> programını yüklersen, bu ekran o yarışları kör olarak test eder.</p><div class="wcal-chips"><span class="wcal-chip">${esc(date||'Tarih yok')}</span><span class="wcal-chip">${esc(city||'Şehir yok')}</span><span class="wcal-chip">${races.length} koşu</span><span class="wcal-chip">Toplam kayıt ${pool.length}/${MAX_RECORDS}</span></div></div>
  <div class="wcal-card"><h3>Nasıl çalışır?</h3><p>Önce 5 Model ve Kazanan Yolu sıralamaları hedef yarışın sonucunu görmeden dondurulur. <b>Sonra</b> gerçek kazanan açılır ve her modelde kaçıncı olduğu kaydedilir. Yalnız 1. olan ölçülür.</p>${races.length?`<div class="wcal-grid"><label>Test kapsamı<select id="winnerCalRaceV1673">${selectorOptions()}</select></label><button class="primary" id="winnerCalRunV1673">Kör Kazanan Testini Çalıştır</button></div>`:`<p class="wcal-warn"><b>Program yüklü değil.</b> Bu ekranı kapatıp tarih/şehri seçerek TJK Programını Yükle'ye bas.</p>`}<div id="winnerCalStatusV1673"></div></div>
  ${summaryHtml(contextRows.length?contextRows:pool)}${rowsHtml(contextRows.length?contextRows:pool)}
  <div class="wcal-btns"><button class="secondary" id="winnerCalRefreshV1673">Kayıtları Yenile</button><button class="danger-ghost" id="winnerCalClearV1673">Kalibrasyon Kayıtlarını Temizle</button></div></div>`;
}
function renderHome(){const c=$('analysisContent');if(!c)return;c.classList.remove('empty');c.innerHTML=homeHtml();bindHome();}
function bindHome(){
  $('winnerCalRunV1673')?.addEventListener('click',runSelected);
  $('winnerCalRefreshV1673')?.addEventListener('click',renderHome);
  $('winnerCalClearV1673')?.addEventListener('click',()=>{if(busy)return;if(confirm('Kazanan kalibrasyonu kayıtları silinsin mi?')){localStorage.removeItem(CACHE_KEY);renderHome();}});
}
function setStatus(html){const s=$('winnerCalStatusV1673');if(s)s.innerHTML=html;}

async function testRace(race,index,total){
  const date=currentDate(),city=cityName(),raceNo=Number(race?.no);
  const base=(index/total)*100;
  setStatus(progressHtml(base,`${raceNo}. Koşu: kör sıralamalar hazırlanıyor…`,`${index+1}/${total}`));
  const blindUrl=`/api/tjk-conditional-v4-blind?${new URLSearchParams({date,city,raceNo:String(raceNo)})}`;
  const blindPromise=fetchJson(blindUrl,235000);
  const modelPromise=prepareRaceModelsV11(race,progress=>{
    const txt=clean(progress?.message||progress||'5 Model hazırlanıyor…');
    setStatus(progressHtml(base+(55/total),`${raceNo}. Koşu · ${txt}`,`${index+1}/${total}`));
  });
  const [blind,modelData]=await Promise.all([blindPromise,modelPromise]);
  if(blind?.resultApiCalled||blind?.resultDataLoaded) throw new Error(`${raceNo}.K körlük kilidi geçmedi: sonuç tahminden önce çağrılmış.`);
  if(blind?.leakAudit?.passed!==true) throw new Error(`${raceNo}.K tarih sızıntısı denetimi geçmedi.`);
  const frozenRanks={};
  for(const id of ['composite','exact','twin','family','career']) frozenRanks[id]=null;
  // Gerçek sonuç henüz açılmadan model sıralamaları burada dondurulmuştur.
  const frozenModelRankings={};
  for(const id of ['composite','exact','twin','family','career']) frozenModelRankings[id]=modelRankingPodiumV115(modelData,1,id);
  setStatus(progressHtml(base+(75/total),`${raceNo}. Koşu: tahmin donduruldu · gerçek kazanan açılıyor…`,`${index+1}/${total}`));
  const history=await fetchJson(`/api/tjk-history?${new URLSearchParams({date,city,raceNo:String(raceNo)})}`,90000);
  const winner=historyWinner(history);if(!winner?.name)throw new Error(`${raceNo}.K gerçek kazanan sonuç verisinde bulunamadı.`);
  for(const id of ['composite','exact','twin','family','career']){
    const arr=frozenModelRankings[id]||[];const ix=arr.findIndex(x=>sameHorse(x?.item?.horse,winner));frozenRanks[id]=ix>=0?ix+1:null;
  }
  frozenRanks.winner=rankInWinnerBlind(blind,winner);
  return {version:VERSION,date,city,raceNo,winner,ranks:frozenRanks,referenceCount:Array.isArray(blind?.referenceWinners)?blind.referenceWinners.length:0,referenceQuality:finite(blind?.referenceSetQuality)??0,leakPassed:true,testedAt:new Date().toISOString()};
}

async function runSelected(){
  if(busy)return;
  if(typeof prepareRaceModelsV11!=='function'||typeof modelRankingPodiumV115!=='function'){setStatus('<div class="wcal-card wcal-bad"><b>5 Model motoru yüklenmedi. Sayfayı yenile.</b></div>');return;}
  const races=currentRaces(),sel=clean($('winnerCalRaceV1673')?.value||'all');
  const targets=sel==='all'?races:races.filter(r=>String(r?.no)===sel);
  if(!currentDate()||!cityName()||!targets.length){setStatus('<div class="wcal-card wcal-warn"><b>Önce geçmiş tarih + şehir programını yükle.</b></div>');return;}
  busy=true;const btn=$('winnerCalRunV1673');if(btn){btn.disabled=true;btn.textContent='Kalibrasyon çalışıyor…';}
  const done=[],errors=[];
  try{
    for(let i=0;i<targets.length;i++){
      try{done.push(await testRace(targets[i],i,targets.length));}
      catch(e){errors.push(`${targets[i]?.no}.K: ${e?.name==='AbortError'?'zaman aşımı':e?.message||e}`);}
    }
    const pool=upsertRecords(done);saveCompatibility(pool);
    const contextRows=pool.filter(r=>r.date===currentDate()&&fold(r.city)===fold(cityName()));
    setStatus(`<div class="wcal-card"><h3 class="${errors.length?'wcal-warn':'wcal-good'}">${done.length}/${targets.length} koşu tamamlandı</h3><p>${errors.length?esc(errors.join(' · ')):'Bütün kör sıralamalar gerçek sonuçtan önce donduruldu.'}</p><div class="wcal-progress"><i style="width:100%"></i></div></div>${summaryHtml(contextRows)}${rowsHtml(contextRows)}`);
  }finally{busy=false;if(btn){btn.disabled=false;btn.textContent='Kör Kazanan Testini Çalıştır';}}
}

function openWinnerCalibrationV1673(){
  const dialog=$('analysisDialog');if(!dialog)return;
  $('closeMenu')?.click();dialog.classList.add('calibration-dialog-v116');
  if($('dialogEyebrow'))$('dialogEyebrow').textContent='KÖR GERÇEK SONUÇ TESTİ';
  if($('dialogTitle'))$('dialogTitle').textContent='Kazanan Kalibrasyonu';
  renderHome();if(!dialog.open)dialog.showModal();
}

try{openCalibrationV116=openWinnerCalibrationV1673;}catch(e){console.warn('[AT AI] kalibrasyon override kurulamadı',e);}
const menuBtn=document.querySelector('[data-view="calibration"]');if(menuBtn)menuBtn.textContent='5. Kazanan Kalibrasyonu';
console.info('[AT AI]',VERSION,'aktif');
})();
