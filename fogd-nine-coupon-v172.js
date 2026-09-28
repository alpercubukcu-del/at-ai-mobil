/* AT AI Mobil - V17.2 F/O/G/D/J/S/E/A/T nine independent coupon templates */
(()=>{
'use strict';
if(window.__AT_FOGD_NINE_COUPON_V172__)return;
window.__AT_FOGD_NINE_COUPON_V172__=true;

const VERSION='FOGD-NINE-COUPON-V17.2';
const MODE='FOGD_NINE_V172';
const DB='at_ai_fogd_scores_v1',STORE='races';
const core=window.ATFogdNineCouponCoreV1;
if(!core)throw new Error('[AT AI] FOGD nine-coupon core missing');
const MODELS=core.MODELS;
const legacyRender=typeof renderTicketsV11==='function'?renderTicketsV11:null;
let busy=false,dbPromise=null;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function cityName(){try{return typeof getCityName==='function'?clean(getCityName()):clean($('citySelect')?.selectedOptions?.[0]?.textContent)}catch{return clean($('citySelect')?.selectedOptions?.[0]?.textContent)}}
function selectedTypes(){return[...document.querySelectorAll('.bet-check:checked')].map(x=>clean(x.value)).filter(Boolean)}
function selectedPlans(){return selectedTypes().map(type=>{try{return typeof resolveBetStartV11==='function'?resolveBetStartV11(type):{ok:false,desc:{type},error:'Bahis başlangıç çözümleyicisi bulunamadı.'}}catch(e){return{ok:false,desc:{type},error:e?.message||String(e)}}})}
function requiredRaceNos(plans){const out=new Set();for(const p of plans)if(p?.ok)for(const race of p.legs||[]){const no=Number(race?.no);if(no>0)out.add(no)}return[...out].sort((a,b)=>a-b)}
function raceByNo(no){return(Array.isArray(st()?.races)?st().races:[]).find(r=>Number(r?.no)===Number(no))||null}
function eligibleByRace(nos){const out=new Map();for(const no of nos){const race=raceByNo(no),horses=Array.isArray(race?.horses)?race.horses:[];out.set(String(no),new Set(horses.map(h=>String(h?.no)).filter(Boolean)))}return out}
function snapshotKey(date,city,no){return`${date}|${fold(city)}|${Number(no)}`}

function openDb(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise(resolve=>{let q;try{q=indexedDB.open(DB,1)}catch{return resolve(null)}q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'key'});s.createIndex('date','date',{unique:false});s.createIndex('year','year',{unique:false})}};q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null)});
 return dbPromise;
}
async function idbGet(key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function idbAll(){const db=await openDb();if(!db)return[];return new Promise(resolve=>{try{const store=db.transaction(STORE,'readonly').objectStore(STORE);if(store.getAll){const q=store.getAll();q.onsuccess=()=>resolve(Array.isArray(q.result)?q.result:[]);q.onerror=()=>resolve([]);return}const rows=[],q=store.openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return resolve(rows);rows.push(c.value);c.continue()};q.onerror=()=>resolve(rows)}catch{resolve([])}})}
async function localSnapshot(date,city,no){try{return await window.AT_AI_LOCAL_ARCHIVE?.getFogdAnalysis?.(date,city,no)||null}catch{return null}}
function validSnapshot(x,date,city,no){return!!(x&&clean(x.date)===clean(date)&&fold(x.city)===fold(city)&&Number(x.raceNo)===Number(no)&&Array.isArray(x.rows)&&x.rows.length)}

function ensureStatus(){
 let box=$('fogdCouponStatusV172');if(box)return box;
 box=document.createElement('div');box.id='fogdCouponStatusV172';box.className='ticket-rule-v11';box.style.display='none';
 const button=$('buildAllBtn');button?.insertAdjacentElement('beforebegin',box);return box;
}
function setStatus(text,kind=''){
 const box=ensureStatus();if(box){box.textContent=text;box.style.display='';box.style.color=kind==='error'?'#ff9cab':kind==='ok'?'#7ee2a8':kind==='warn'?'#ffbd82':'#dcefff'}
 const button=$('buildAllBtn');if(button){button.disabled=kind==='busy';button.textContent=kind==='busy'?text:kind==='error'?'Tekrar Dene':kind==='ok'?'9 Model Kuponları Hazır':'9 Puan Modelinden Kupon Oluştur'}
}

async function ensureCurrentSnapshots(nos,date,city){
 const map=new Map();let all=await idbAll();
 for(const no of nos){
  const key=snapshotKey(date,city,no);let snapshot=all.find(x=>x?.key===key)||await localSnapshot(date,city,no)||await idbGet(key);
  if(!validSnapshot(snapshot,date,city,no)){
   const engine=window.ATFogdScoreCenterF609431;
   if(typeof engine?.compute!=='function')throw new Error('Yarış DNA motoru hazır değil.');
   setStatus(`${no}. Koşu · Yarış DNA puanları hazırlanıyor…`,'busy');
   await engine.compute(no);
   snapshot=await localSnapshot(date,city,no)||await idbGet(key);
  }
  if(!validSnapshot(snapshot,date,city,no))throw new Error(`${no}. Koşu Yarış DNA analizi oluşmadı. Önce 9. menüde bu koşuyu çalıştırın.`);
  map.set(String(no),snapshot);
  if(!all.some(x=>x?.key===snapshot.key))all.push(snapshot);
 }
 return{map,all};
}

function historicalProfiles(all,date){
 const historical=(Array.isArray(all)?all:[]).filter(x=>clean(x?.date)&&clean(x.date)<clean(date)&&Array.isArray(x?.rows)&&x.rows.some(r=>Number(r?.actualFinish)===1));
 return Object.fromEntries(MODELS.map(model=>[model.id,core.profileFromSnapshots(historical,model)]));
}
function profileText(profile){
 if(!profile||profile.sample<20)return`${profile?.sample||0} geçmiş koşu · öğreniyor`;
 return`${profile.sample} koşu · İlk1 %${Math.round(profile.rates[1]*100)} · İlk2 %${Math.round(profile.rates[2]*100)} · İlk3 %${Math.round(profile.rates[3]*100)} · İlk4 %${Math.round(profile.rates[4]*100)} · İlk5 %${Math.round(profile.rates[5]*100)}`;
}

function installStyle(){
 if($('fogdNineCouponStyleV172'))return;const s=document.createElement('style');s.id='fogdNineCouponStyleV172';s.textContent=`
#couponCenterDialog .fogd9-intro{margin:0 0 8px;padding:8px 9px;border:1px solid rgba(114,213,255,.25);border-radius:10px;background:rgba(28,75,105,.18);font-size:10px;line-height:1.4}
#couponCenterDialog .fogd9-profile{padding:7px 9px;margin:7px 0;border-radius:9px;background:rgba(114,213,255,.09);font-size:10px;line-height:1.35;color:#cfeeff}
#couponCenterDialog .fogd9-cut{display:block;margin-top:3px;font-size:9px;color:#9fc2d8;font-weight:500}
#couponCenterDialog .ticket-model-tabs-v11{display:flex!important;gap:5px!important;overflow-x:auto!important;padding-bottom:4px!important;scrollbar-width:thin}
#couponCenterDialog .ticket-model-tab-v11{min-width:38px!important;flex:0 0 auto!important}
`;
 document.head.appendChild(s)
}
function patchUi(){
 installStyle();const note=document.querySelector('#couponCenterDialog .five-model-note-v11');
 if(note)note.innerHTML='<b>9 BAĞIMSIZ PUAN KUPONU</b><span>F · O · G · D · J · S · E · A · T</span><small>Her başlık yalnız kendi puan sırasını kullanır; eksik veriye gizli yedekleme yapılmaz.</small>';
 const rule=document.querySelector('#couponCenterDialog .ticket-rule-v11:not(#fogdCouponStatusV172)');
 if(rule)rule.textContent='Kesim: geçmiş gerçek sonuçlarda %85 kazanan yakalama hedefi + mevcut puan kırılması. Normal ayak 2–5 at; yalnız doğrulanmış açık farkta tek. Bütçe her model kuponu içindir.';
 const button=$('buildAllBtn');if(button&&!busy){button.disabled=false;button.textContent='9 Puan Modelinden Kupon Oluştur'}
}

function legHtml(leg){const picks=Array.isArray(leg?.selections)?leg.selections:[],cut=leg?.cut||{};return`<div class="ticket-leg-v11"><div class="ticket-leg-head-v11"><div><b>${esc(leg?.raceNo)}. Koşu</b><small class="fogd9-cut">${esc(cut.reason||'')} · kapsam %${Math.round(Number(leg?.coverage||0)*100)}${cut.budgetReduced?' · bütçe için daraltıldı':''}</small></div>${leg?.single?'<span class="ticket-single-v11">TEK</span>':`<span>${picks.length} at</span>`}</div><div class="ticket-picks-v11">${picks.map(p=>`<span class="ticket-pick-v11"><b>${esc(p.no)}</b> ${esc(p.name||'')}<small>${Number.isFinite(Number(p.score))?Number(p.score).toFixed(1):'—'}</small></span>`).join('')||'<span class="ticket-warning-v11">Seçim yok</span>'}</div></div>`}
function panelHtml(ticket,active){
 const cls=`ticket-model-panel-v11 ${active?'active':''}`;
 if(!ticket?.available)return`<div class="${cls}" data-ticket-model-panel="${esc(ticket?.modelId)}"><div class="ticket-model-title-v11"><b>${esc(ticket?.modelLabel)}</b></div><div class="fogd9-profile">${esc(profileText(ticket?.profile))}</div><div class="ticket-warning-v11">⚠ ${esc(ticket?.error||'Bu model için kupon üretilemedi.')}</div></div>`;
 return`<div class="${cls}" data-ticket-model-panel="${esc(ticket.modelId)}"><div class="ticket-model-title-v11"><div><b>${esc(ticket.modelLabel)}</b><small>${esc(ticket.startRace)}. koşudan başlar</small></div><div class="ticket-money-v11"><b>${Number(ticket.cost||0).toFixed(2)} ₺</b><small>${esc(ticket.combinations)} kolon</small></div></div><div class="fogd9-profile"><b>${esc(ticket.modelLabel)} kalibrasyonu:</b> ${esc(profileText(ticket.profile))}</div>${ticket.overBudget?`<div class="ticket-warning-v11">⚠ Minimum güvenli genişlik ${Number(ticket.cost||0).toFixed(2)} ₺; ${esc(ticket.budget)} ₺ bütçeyi aşıyor.</div>`:''}${(ticket.warnings||[]).map(w=>`<div class="ticket-warning-v11">⚠ ${esc(w)}</div>`).join('')}<div class="ticket-meta-v11">Birim ${esc(ticket.unitPrice)} ₺ · Tek ${esc(ticket.actualSingles)}/${esc(ticket.requestedSingles)} · Model bütçesi ${esc(ticket.budget)} ₺</div>${(ticket.legs||[]).map(legHtml).join('')}</div>`
}
function renderNine(){
 const state=st(),box=$('tickets');if(!box)return;const tickets=(Array.isArray(state?.tickets)?state.tickets:[]).filter(t=>t?.couponMode===MODE);
 if(!tickets.length){if(legacyRender)return legacyRender();box.classList.add('empty');box.textContent='Henüz 9 puan model kuponu oluşturulmadı.';return}
 box.classList.remove('empty');const groups=new Map();for(const ticket of tickets){if(!groups.has(ticket.type))groups.set(ticket.type,[]);groups.get(ticket.type).push(ticket)}
 box.innerHTML='<div class="fogd9-intro"><b>Kesim bütçeyi doldurmak için genişlemez.</b> Her model geçmiş yakalama oranı ve o koşudaki puan kırılmasıyla kendi sınırında durur. Dokuz kupon birbirinden ayrı maliyetlidir.</div>'+[...groups.entries()].map(([type,rows],groupIndex)=>{const ordered=MODELS.map(m=>rows.find(r=>r.modelId===m.id)).filter(Boolean);return`<details class="ticket-group-v11" ${groupIndex===0?'open':''}><summary class="ticket-group-summary-v11"><div><b>${esc(type)}</b><small>F/O/G/D/J/S/E/A/T karşılaştırması</small></div><span>${ordered.filter(x=>x.available).length}/9 hazır ▾</span></summary><div class="ticket-group-body-v11" data-ticket-group="${esc(type)}"><div class="ticket-model-tabs-v11">${ordered.map((t,i)=>`<button class="ticket-model-tab-v11 ${i===0?'active':''}" data-ticket-model="${esc(t.modelId)}">${esc(MODELS.find(m=>m.id===t.modelId)?.short||t.modelLabel)}</button>`).join('')}</div>${ordered.map((t,i)=>panelHtml(t,i===0)).join('')}</div></details>`}).join('');
 box.querySelectorAll('.ticket-group-body-v11').forEach(group=>group.querySelectorAll('[data-ticket-model]').forEach(btn=>btn.addEventListener('click',()=>{const model=btn.getAttribute('data-ticket-model');group.querySelectorAll('[data-ticket-model]').forEach(x=>x.classList.toggle('active',x===btn));group.querySelectorAll('[data-ticket-model-panel]').forEach(x=>x.classList.toggle('active',x.getAttribute('data-ticket-model-panel')===model))})))
}

async function build(){
 if(busy)return[];busy=true;patchUi();setStatus('Kupon başlangıçları kontrol ediliyor…','busy');
 try{
  const state=st();if(!state)throw new Error('Kupon durumu okunamadı.');if(!Array.isArray(state.races)||!state.races.length)throw new Error('Önce günün TJK programını yükleyin.');
  const types=selectedTypes();if(!types.length)throw new Error('En az bir bahis türü seçin.');
  const plans=selectedPlans(),valid=plans.filter(x=>x?.ok);if(!valid.length)throw new Error(plans.map(x=>x?.error).filter(Boolean).join(' · ')||'Bahis başlangıcı bulunamadı.');
  const raceNos=requiredRaceNos(plans),date=clean(state.date||$('raceDate')?.value),city=cityName();if(!date||!city)throw new Error('Program tarihi veya şehir bulunamadı.');
  const loaded=await ensureCurrentSnapshots(raceNos,date,city),profiles=historicalProfiles(loaded.all,date),eligible=eligibleByRace(raceNos);
  const budget=Math.max(1,num($('budget')?.value,500)),unitPrice=Math.max(.01,num($('unitPrice')?.value,1)),maxSingles=Math.max(0,Math.min(7,Math.floor(num($('singleCount')?.value,1))));
  const tickets=[];
  for(let p=0;p<plans.length;p++)for(const model of MODELS){setStatus(`${p+1}/${plans.length} bahis · ${model.short} kuponu hazırlanıyor…`,'busy');tickets.push(core.buildModelTicket({plan:plans[p],type:plans[p]?.desc?.type||types[p]||'Bahis',modelId:model.id,snapshotsByRace:loaded.map,profiles,budget,unitPrice,maxSingles,eligibleByRace:eligible}))}
  state.tickets=tickets;state.analyses=state.analyses||{};state.analyses.ticketV11={version:VERSION,couponMode:MODE,source:'YARIS_DNA_SNAPSHOTS',models:MODELS.map(x=>x.key),targetCapture:core.TARGET_CAPTURE,profiles,date,city:state.city,raceNos,generatedAt:new Date().toISOString()};
  try{if(typeof save==='function')save()}catch{}
  renderNine();const ready=tickets.filter(x=>x.available).length;setStatus(`Kuponlar hazır · ${ready}/${tickets.length} model şablonu üretildi.`,'ok');
  try{$('couponResultV1681')?.classList.remove('coupon-no-result-v1683');$('tickets')?.scrollIntoView?.({behavior:'smooth',block:'start'})}catch{}
  return tickets;
 }catch(e){const message=clean(e?.message||e)||'Bilinmeyen kupon hatası.';console.error('[AT AI]',VERSION,'build failed',e);setStatus('Kupon oluşturulamadı: '+message,'error');try{alert('Kupon oluşturulamadı: '+message)}catch{}return[]}
 finally{busy=false;setTimeout(patchUi,0)}
}

try{buildTicketsV11=build}catch{}
try{buildTickets=build}catch{}
try{renderTicketsV11=renderNine}catch{}
try{renderTickets=renderNine}catch{}
const oldFive=window.ATCouponFiveModelCalibratedV631||{};
window.ATCouponFiveModelCalibratedV631={...oldFive,version:VERSION,buildAll:build,mode:MODE};
if(window.ATCouponCareerOnlyFinalV628){window.ATCouponCareerOnlyFinalV628.build=build;window.ATCouponCareerOnlyFinalV628.open=build}
window.ATFogdNineCouponV172={version:VERSION,mode:MODE,models:MODELS,build,render:renderNine,profiles:historicalProfiles};

patchUi();renderNine();
window.addEventListener('pageshow',()=>{patchUi();renderNine()},{passive:true});
$('couponMenuBtn')?.addEventListener('click',()=>setTimeout(()=>{patchUi();renderNine()},0),false);
console.info('[AT AI]',VERSION,'active - F/O/G/D/J/S/E/A/T independent coupon templates with historical capture and score-gap cuts.');
})();
