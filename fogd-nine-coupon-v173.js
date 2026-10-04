/* AT AI Mobil - V17.4 nine column templates + isolated condition-aware tenth method */
(()=>{
'use strict';
if(window.__AT_FOGD_ALL_RACES_COUPON_V173__)return;
window.__AT_FOGD_ALL_RACES_COUPON_V173__=true;

const VERSION='FOGD-COUPON-V17.4';
const MODE='FOGD_ALL_RACES_V173';
const DB='at_ai_fogd_scores_v1',STORE='races';
const core=window.ATFogdNineCouponCoreV1;
if(!core)throw new Error('[AT AI] FOGD nine-coupon core missing');
const condition=window.ATFogdConditionCoreV1;
const MODELS=[...core.MODELS,condition?.MODEL||{id:'dna-condition',key:'C',short:'10',label:'10 · Koşul Uyumlu Yakınlık'}];
const FALLBACK_BETS=['7li Ganyan','7li Plase','1. 3lü Ganyan','2. 3lü Ganyan','1. 6lı Ganyan','2. 6lı Ganyan','1. 5li Ganyan','2. 5li Ganyan','4lü Ganyan'];
const MODEL_NOTES={
  F:'Yalnız Form puanı sıralanır.',
  O:'Yalnız doğrulanmış Orijin puanı sıralanır.',
  G:'Yalnız Galop puanı sıralanır.',
  D:'Yalnız Derece puanı sıralanır.',
  J:'TJK Jokey bağlantısı doğrulanan atlar puanlanır.',
  S:'TJK Sahip bağlantısı doğrulanan atlar puanlanır.',
  E:'Ekip puanı için J/S/A bağlantılarından en az ikisi doğrulanmış olmalıdır.',
  A:'TJK Antrenör bağlantısı doğrulanan atlar puanlanır; doğrulanmayan kayıt “—” kalır.',
  T:'Yarış DNA Toplam puanı sıralanır.',
  C:'F/O/G/D/J/S/A yakınlığı ile yarış öncesi pist/mesafe geçmişi birlikte değerlendirilir. E ve T yalnız teyittir. Ana, izleme ve koşul uyumu grupları gösterilir; ilk dört sınırı uygulanmaz.'
};

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let busy=false,dbPromise=null,activeModel='dna-f',templates=[],selectionMap=new Map(),templateContext='';

function appState(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function programRaces(){return(Array.isArray(appState()?.races)?appState().races:[]).slice().sort((a,b)=>(Number(a?.no)||0)-(Number(b?.no)||0))}
function cityName(){
  try{if(typeof getCityName==='function'){const name=clean(getCityName());if(name)return name}}catch{}
  const s=appState(),city=(s?.cities||[]).find(x=>String(x?.id)===String(s?.city));
  return clean(city?.name||$('citySelect')?.selectedOptions?.[0]?.textContent||s?.cityName||'');
}
function currentDate(){return clean(appState()?.date||$('raceDate')?.value||'')}
function contextKey(){return`${currentDate()}|${fold(cityName())}|${programRaces().map(r=>`${r.no}:${r.distance}:${r.track}:${(r.horses||[]).map(h=>`${h.no}-${h.id||''}`).join('.')}`).join(',')}`}
function snapshotKey(date,city,no){return`${date}|${fold(city)}|${Number(no)}`}
function validSnapshot(x,date,city,no){return!!(x&&clean(x.date)===clean(date)&&fold(x.city)===fold(city)&&Number(x.raceNo)===Number(no)&&Array.isArray(x.rows)&&x.rows.length)}
function eligibleMap(races){
  const out=new Map();
  for(const race of races){
    const horses=Array.isArray(race?.horses)?race.horses:[];
    out.set(String(Number(race?.no)||0),new Set(horses.map(h=>String(h?.no)).filter(Boolean)));
  }
  return out;
}
function betTypes(){try{if(typeof BET_TYPES!=='undefined'&&Array.isArray(BET_TYPES))return BET_TYPES}catch{}return FALLBACK_BETS}

function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    let request;try{request=indexedDB.open(DB,1)}catch{return resolve(null)}
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'key'});s.createIndex('date','date',{unique:false});s.createIndex('year','year',{unique:false})}};
    request.onsuccess=()=>resolve(request.result);request.onerror=request.onblocked=()=>resolve(null);
  });
  return dbPromise;
}
async function idbGet(key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function idbAll(){const db=await openDb();if(!db)return[];return new Promise(resolve=>{try{const store=db.transaction(STORE,'readonly').objectStore(STORE);if(store.getAll){const q=store.getAll();q.onsuccess=()=>resolve(Array.isArray(q.result)?q.result:[]);q.onerror=()=>resolve([]);return}const rows=[],q=store.openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return resolve(rows);rows.push(c.value);c.continue()};q.onerror=()=>resolve(rows)}catch{resolve([])}})}
async function localSnapshot(date,city,no){try{return await window.AT_AI_LOCAL_ARCHIVE?.getFogdAnalysis?.(date,city,no)||null}catch{return null}}

function setStatus(text,kind='info'){
  const box=$('fogdCouponStatusV173');if(!box)return;
  box.textContent=text;box.dataset.kind=kind;
}
function setBusy(on,text=''){
  busy=!!on;const b=$('fogdAllRacesBuildV173');if(!b)return;
  b.disabled=busy;b.textContent=busy?(text||'Yarış DNA şablonları hazırlanıyor…'):(templates.length?'10 Yöntemi Yenile':'10 Yöntemle Kupon Oluştur');
}

async function loadSnapshots(races,date,city){
  const map=new Map(),failures=[];let all=await idbAll();
  for(let i=0;i<races.length;i++){
    const no=Number(races[i]?.no)||0,key=snapshotKey(date,city,no);
    setBusy(true,`${i+1}/${races.length} · ${no}. Koşu hazırlanıyor…`);
    setStatus(`${no}. Koşu · kayıtlı Yarış DNA puanları kontrol ediliyor…`,'busy');
    let snapshot=all.find(x=>x?.key===key)||await localSnapshot(date,city,no)||await idbGet(key);
    if(!validSnapshot(snapshot,date,city,no)){
      try{
        const engine=window.ATFogdScoreCenterF609431;
        if(typeof engine?.compute!=='function')throw new Error('Yarış DNA motoru hazır değil.');
        setStatus(`${no}. Koşu · dokuz puan sütunu hesaplanıyor…`,'busy');
        await engine.compute(no);
        snapshot=await localSnapshot(date,city,no)||await idbGet(key);
      }catch(error){failures.push({raceNo:no,error:clean(error?.message||error)||'Hesaplanamadı.'})}
    }
    if(validSnapshot(snapshot,date,city,no)){
      map.set(String(no),snapshot);
      if(!all.some(x=>x?.key===snapshot.key))all.push(snapshot);
    }else if(!failures.some(x=>x.raceNo===no))failures.push({raceNo:no,error:'Yarış DNA kaydı oluşmadı.'});
  }
  return{map,all,failures};
}

function historicalProfiles(all,date){
  const historical=(Array.isArray(all)?all:[]).filter(x=>clean(x?.date)&&clean(x.date)<clean(date)&&Array.isArray(x?.rows)&&x.rows.some(r=>Number(r?.actualFinish)===1));
  return Object.fromEntries(core.MODELS.map(model=>[model.id,core.profileFromSnapshots(historical,model)]));
}
function profileText(profile){
  if(!profile||profile.sample<20)return`${profile?.sample||0} geçmiş koşu · öğrenme dönemi`;
  return`${profile.sample} koşu · İlk1 %${Math.round(profile.rates[1]*100)} · İlk2 %${Math.round(profile.rates[2]*100)} · İlk3 %${Math.round(profile.rates[3]*100)} · İlk4 %${Math.round(profile.rates[4]*100)} · İlk5 %${Math.round(profile.rates[5]*100)}`;
}

function installStyle(){
  if($('fogdCouponStyleV173'))return;
  const s=document.createElement('style');s.id='fogdCouponStyleV173';s.textContent=`
html.fogd-coupon-full-open{height:100%!important;overflow:hidden!important}
body.fogd-coupon-full-open{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;overflow:hidden!important}
#couponCenterDialog.fogd-coupon-dialog-v173{position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#090b0d!important;color:#fff!important;overflow:hidden!important;font-family:inherit!important;color-scheme:dark!important}
@supports(height:100dvh){#couponCenterDialog.fogd-coupon-dialog-v173{height:100dvh!important;max-height:100dvh!important}}
#couponCenterDialog.fogd-coupon-dialog-v173[open]{display:block!important}
#couponCenterDialog.fogd-coupon-dialog-v173::backdrop{background:#000!important;opacity:1!important}
.fogd-coupon-head-v173{position:absolute;inset:0 0 auto;height:74px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #555;background:#111315;z-index:20}
.fogd-coupon-head-v173 h2{margin:2px 0 0;font-size:22px;line-height:1.15;letter-spacing:.2px}.fogd-coupon-brand-v173{font-size:11px;color:#bbb;letter-spacing:.8px}.fogd-coupon-close-v173{width:48px;min-width:48px;height:48px;border:1px solid #555;border-radius:10px;background:#292c2f;color:#fff;font-size:25px}
.fogd-coupon-body-v173{position:absolute;inset:74px 0 0;height:calc(100vh - 74px);box-sizing:border-box;padding:16px 16px max(72px,env(safe-area-inset-bottom));overflow-x:hidden;overflow-y:scroll;touch-action:pan-y;overscroll-behavior-y:auto;-webkit-overflow-scrolling:touch;background:#090b0d}
@supports(height:100dvh){.fogd-coupon-body-v173{height:calc(100dvh - 74px)}}
.fogd-coupon-note-v173,.fogd-coupon-controls-v173,.fogd-coupon-status-v173,.fogd-coupon-model-head-v173,.fogd-coupon-race-v173,.fogd-coupon-empty-v173{box-sizing:border-box;background:#17191b;border:1px solid #555;border-radius:14px;padding:12px;margin:0 0 12px}
.fogd-coupon-note-v173{font-size:12px;line-height:1.55}.fogd-coupon-note-v173 b{display:block;font-size:13px;margin-bottom:3px}.fogd-coupon-muted-v173{color:#bbb}
.fogd-coupon-program-v173{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:11px}.fogd-coupon-program-v173 span{padding:6px 9px;border:1px solid #555;border-radius:999px;background:#202326;font-size:11px;color:#ddd}
.fogd-coupon-controls-v173 label{display:block;font-size:11px;color:#bbb}.fogd-coupon-controls-v173 select{box-sizing:border-box;width:100%;min-height:48px;margin-top:6px;padding:0 12px;border:1px solid #555;border-radius:10px;background:#292c2f;color:#fff;font:inherit}
.fogd-coupon-controls-v173 details{margin-top:10px}.fogd-coupon-controls-v173 summary{cursor:pointer;color:#ddd;font-size:12px;font-weight:750}.fogd-coupon-controls-v173 small{display:block;margin-top:7px;color:#999;line-height:1.45}
.fogd-coupon-build-v173{width:100%;min-height:50px;margin:0 0 12px;padding:11px 14px;border:0;border-radius:10px;background:#a70e15;color:#fff;font:inherit;font-weight:850}.fogd-coupon-build-v173:disabled{opacity:.65}
.fogd-coupon-status-v173{min-height:46px;font-size:12px;line-height:1.5}.fogd-coupon-status-v173[data-kind="error"]{border-color:#8b3037;color:#ffb5bc}.fogd-coupon-status-v173[data-kind="ok"]{border-color:#356c4c;color:#a8e5bd}.fogd-coupon-status-v173[data-kind="warn"]{border-color:#84662b;color:#ffd792}
.fogd-coupon-tabs-v173{position:sticky;top:-1px;z-index:8;display:flex;gap:7px;overflow-x:auto;padding:9px 0 10px;margin:0 0 8px;background:#090b0d;scrollbar-width:thin}.fogd-coupon-tab-v173{flex:0 0 auto;min-width:46px;height:43px;border:1px solid #555;border-radius:10px;background:#292c2f;color:#bbb;font:inherit;font-weight:850}.fogd-coupon-tab-v173.active{background:#a70e15;border-color:#c82c34;color:#fff}
.fogd-coupon-model-head-v173{display:grid;grid-template-columns:auto 1fr;gap:11px;align-items:center}.fogd-coupon-model-key-v173{display:grid;place-items:center;width:50px;height:50px;border-radius:12px;background:#a70e15;font-size:23px;font-weight:900}.fogd-coupon-model-head-v173 h3{margin:0 0 3px;font-size:17px}.fogd-coupon-model-head-v173 p{margin:0;color:#bbb;font-size:11px;line-height:1.45}.fogd-coupon-stats-v173{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:7px}.fogd-coupon-stats-v173 span{padding:6px 9px;border:1px solid #444;border-radius:999px;background:#202326;font-size:10px;color:#ddd}
.fogd-coupon-filter-note-v173{padding:9px 10px;margin:0 0 12px;border-left:3px solid #a70e15;background:#17191b;color:#ccc;font-size:11px;line-height:1.45}
.fogd-coupon-race-head-v173{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.fogd-coupon-race-head-v173 b{font-size:15px}.fogd-coupon-race-head-v173 small{display:block;margin-top:4px;color:#aaa;font-size:10px;line-height:1.35}.fogd-coupon-badge-v173{flex:0 0 auto;padding:5px 8px;border:1px solid #555;border-radius:999px;background:#292c2f;color:#ddd;font-size:9px;font-weight:850}.fogd-coupon-badge-v173.single{border-color:#a70e15;background:#401014;color:#fff}
.fogd-coupon-cut-v173{margin:10px 0 8px;padding:8px 9px;border-radius:9px;background:#202326;font-size:11px;line-height:1.45}.fogd-coupon-cut-v173 b{color:#fff}.fogd-coupon-cut-v173 span{color:#bbb}.fogd-coupon-picks-v173{display:flex;flex-wrap:wrap;gap:7px}.fogd-coupon-pick-v173,.fogd-coupon-rank-v173{border:1px solid #555;border-radius:9px;background:#292c2f;color:#fff;padding:7px 9px;font:inherit;text-align:left}.fogd-coupon-pick-v173{border-color:#8d252c;background:#351115}.fogd-coupon-pick-v173 b,.fogd-coupon-rank-v173 b{font-size:12px}.fogd-coupon-pick-v173 small,.fogd-coupon-rank-v173 small{display:block;margin-top:2px;color:#bbb;font-size:9px}.fogd-coupon-rank-v173.selected{border-color:#b92a32;background:#451318}
.fogd-coupon-ranking-v173{margin-top:10px;border-top:1px solid #333;padding-top:9px}.fogd-coupon-ranking-v173 summary{cursor:pointer;color:#bbb;font-size:11px;font-weight:750}.fogd-coupon-ranking-grid-v173{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.fogd-coupon-reset-v173{margin-top:9px;border:1px solid #555;border-radius:8px;background:transparent;color:#ddd;padding:7px 9px;font:inherit;font-size:10px}
.fogd-coupon-missing-v173{margin-top:10px;padding:9px 10px;border:1px solid #764047;border-radius:9px;background:#271416;color:#ffc3c8;font-size:11px;line-height:1.5}.fogd-coupon-empty-v173{text-align:center;color:#bbb;font-size:12px;line-height:1.55}.fogd-coupon-footer-v173{padding:4px 0 40px;color:#777;font-size:10px;text-align:center}
.fogd-condition-info-v174{margin:10px 0;padding:9px;border:1px solid #66502a;border-radius:9px;background:#252015;color:#f3d39a;font-size:11px;line-height:1.6}.fogd-condition-evidence-v174{margin:8px 0;border-bottom:1px solid #444;padding-bottom:8px;font-size:11px;line-height:1.6}.fogd-condition-evidence-v174 summary{cursor:pointer;color:#ddd}.fogd-condition-evidence-v174 p{margin:5px 0;color:#bbb}.fogd-condition-info-v174 ul{padding-left:18px;margin:6px 0}
@media(max-width:650px){.fogd-coupon-head-v173{padding:12px}.fogd-coupon-head-v173 h2{font-size:18px}.fogd-coupon-body-v173{padding:11px 11px max(72px,env(safe-area-inset-bottom))}.fogd-coupon-close-v173{width:44px;min-width:44px;height:44px}.fogd-coupon-model-head-v173{gap:9px}.fogd-coupon-model-key-v173{width:44px;height:44px;font-size:20px}}
`;
  document.head.appendChild(s);
}

function dialogMarkup(){
  const options=betTypes().map(type=>`<option value="${esc(type)}">${esc(type)}</option>`).join('');
  return`<div class="fogd-coupon-head-v173"><div><div class="fogd-coupon-brand-v173">AT AI · PERFORMANS MERKEZİ</div><h2>YARIŞ DNA · KUPON ŞABLONLARI</h2></div><button id="fogdCouponCloseV173" class="fogd-coupon-close-v173" type="button" aria-label="Kupon şablonlarını kapat">✕</button></div><div class="fogd-coupon-body-v173"><section class="fogd-coupon-note-v173"><b>9 BAĞIMSIZ TÜM-KOŞU ŞABLONU + 10. KOŞUL UYUMU</b>F · O · G · D · J · S · E · A · T başlıklarının her biri yalnız kendi puan sütununu kullanır. <strong>10. yöntem</strong>, yakınlık ve yarış öncesi pist/mesafe geçmişine göre ayrı kupon oluşturur. Eksik veri puanla doldurulmaz; seçimler elle düzenlenebilir.</section><section class="fogd-coupon-controls-v173"><div id="fogdCouponProgramV173" class="fogd-coupon-program-v173"></div><details><summary>Resmî bahis ayaklarını süz · isteğe bağlı</summary><label>Görünüm<select id="fogdCouponBetFilterV173"><option value="">Tüm Koşular · Ana Şablon</option>${options}</select></label><small>Bu seçim hesaplamayı değiştirmez; yalnız ilgili resmî ayakları ekranda süzer. At kartlarına dokunarak otomatik seçimi elle düzenleyebilirsiniz.</small></details></section><button id="fogdAllRacesBuildV173" class="fogd-coupon-build-v173" type="button">10 Yöntemle Kupon Oluştur</button><div id="fogdCouponStatusV173" class="fogd-coupon-status-v173" data-kind="info">Dokuz sütun ve 10. Koşul Uyumu için tüm koşu şablonlarını oluşturun.</div><div id="fogdCouponTabsV173" class="fogd-coupon-tabs-v173" role="tablist" aria-label="Kupon hesaplama yöntemleri"></div><div id="fogdCouponTemplatesV173" class="fogd-coupon-empty-v173">Henüz şablon oluşturulmadı.</div><div class="fogd-coupon-footer-v173">V17.4 · Yarış DNA · manuel düzenleme</div></div>`;
}

function updateProgramLabel(){
  const host=$('fogdCouponProgramV173');if(!host)return;
  const races=programRaces(),date=currentDate(),city=cityName();
  host.innerHTML=`<span>${esc(date||'Tarih seçilmedi')}</span><span>${esc(city||'Şehir seçilmedi')}</span><span>${races.length} koşu</span>`;
}
function closeDialog(){
  const d=$('couponCenterDialog');document.documentElement.classList.remove('fogd-coupon-full-open');document.body.classList.remove('fogd-coupon-full-open');
  try{if(d?.open)d.close();else d?.removeAttribute('open')}catch{d?.removeAttribute('open')}
}
function openDialog(){
  ensureDialog();updateProgramLabel();
  try{$('closeMenu')?.click()}catch{}
  const d=$('couponCenterDialog');document.documentElement.classList.add('fogd-coupon-full-open');document.body.classList.add('fogd-coupon-full-open');
  try{if(d&&!d.open)d.showModal()}catch{d?.setAttribute('open','')}
  try{d?.querySelector('.fogd-coupon-body-v173')?.scrollTo({top:0,left:0,behavior:'auto'})}catch{}
}
function ensureDialog(){
  installStyle();let d=$('couponCenterDialog');
  if(!d||d.dataset.fogdAllRacesV173!=='1'){
    const fresh=document.createElement('dialog');fresh.id='couponCenterDialog';fresh.className='fogd-coupon-dialog-v173';fresh.setAttribute('aria-label','Yarış DNA kupon şablonları');fresh.dataset.fogdAllRacesV173='1';fresh.dataset.v1681='1';fresh.innerHTML=dialogMarkup();
    if(d)d.replaceWith(fresh);else document.body.appendChild(fresh);d=fresh;
    d.addEventListener('cancel',event=>{event.preventDefault();closeDialog()});
    d.addEventListener('close',()=>{document.documentElement.classList.remove('fogd-coupon-full-open');document.body.classList.remove('fogd-coupon-full-open')});
    $('fogdCouponCloseV173')?.addEventListener('click',closeDialog);
    $('fogdAllRacesBuildV173')?.addEventListener('click',()=>void buildAll());
    $('fogdCouponBetFilterV173')?.addEventListener('change',()=>{renderTemplates();const f=filterState();if(f?.error)setStatus(f.error,'warn');else if(f)setStatus(`${f.type} görünümü · ${f.nos.size} resmî ayak gösteriliyor. Ana şablonun tüm koşuları korunuyor.`,'info')});
  }
  return d;
}
function bindMenu(){
  const old=$('couponMenuBtn');if(!old)return;
  if(old.dataset.fogdAllRacesV173==='1')return;
  const button=old.cloneNode(true);button.removeAttribute('onclick');button.onclick=null;button.dataset.v1681='1';button.dataset.fogdAllRacesV173='1';old.replaceWith(button);
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openDialog()});
}

function filterState(){
  const type=clean($('fogdCouponBetFilterV173')?.value);if(!type)return null;
  try{
    if(typeof resolveBetStartV11!=='function')return{type,error:'Resmî bahis başlangıç çözümleyicisi hazır değil; tüm koşular gösteriliyor.'};
    const plan=resolveBetStartV11(type);if(!plan?.ok)return{type,error:`${type}: ${plan?.error||'resmî ayaklar bulunamadı'} Tüm koşular gösteriliyor.`};
    return{type,plan,nos:new Set((plan.legs||[]).map(x=>String(x?.no)))};
  }catch(error){return{type,error:`${type}: ${clean(error?.message||error)} Tüm koşular gösteriliyor.`}}
}
function selectionKey(modelId,raceNo){return`${modelId}|${Number(raceNo)}`}
function selectedSet(template,leg){
  const key=selectionKey(template.modelId,leg.raceNo);
  if(!selectionMap.has(key))selectionMap.set(key,new Set((leg.selections||[]).map(x=>String(x.no))));
  return selectionMap.get(key);
}
function sameSelection(a,b){const aa=[...a].sort(),bb=[...b].map(String).sort();return aa.length===bb.length&&aa.every((x,i)=>x===bb[i])}
function raceMeta(leg){return[leg.time,leg.raceClass,leg.distance&&`${leg.distance} m`,leg.track].map(clean).filter(Boolean).join(' · ')}

const groupLabel=group=>({main:'Ana grup',watch:'İzleme',condition:'Koşul uyumu',outside:'Eşik dışında'}[group]||'');
const proximityText=value=>Number(value).toFixed(3).replace(/\.?0+$/,'').replace('.',',');
function conditionEvidence(leg){
  if(!leg.conditionSummary)return'';
  const summary=leg.conditionSummary,saturated=Object.entries(summary.columns).filter(([,x])=>x.saturated).map(([key])=>key);
  return`${(leg.degreeReviews||leg.ranking.filter(row=>row.degreeReview)).map(row=>`<div class="fogd-condition-info-v174"><b>${esc(row.no)} · ${esc(row.name)} — Derece lideri — sınırlı kanıt, inceleme adayı</b><br>${row.degree.predictedSec.toFixed(2)} sn · ${row.degree.samples} karşılaştırılabilir kayıt. D puanı eklenmedi; inceleme etiketi tek başına otomatik kupon seçimi yapmaz. Tüm atlar listesinden elle değerlendirebilirsiniz.</div>`).join('')}<div class="fogd-condition-info-v174"><b>Belirsizlik: ${esc(summary.uncertainty)}</b><br>Doygun sütunlar: ${esc(saturated.join(' / ')||'yok')} · güçlü katkı 0,25; yakın takip 0,125.${summary.warnings.length?`<ul>${summary.warnings.map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:''}</div><details class="fogd-condition-evidence-v174"><summary>Atların seçim gerekçeleri ve veri kapsamı</summary>${leg.ranking.map(row=>`<details class="fogd-condition-evidence-v174"><summary>${esc(row.no)} · ${esc(row.name)} — ${esc(groupLabel(row.group))}${row.degreeReview?' · Derece lideri — sınırlı kanıt, inceleme adayı':''} · ${esc(proximityText(row.score))} puan</summary><p>Katkılar: ${Object.entries(row.contributions).map(([key,value])=>`${key} ${proximityText(value)}`).join(' · ')}<br>E teyidi: ${row.confirmations.E?'var':'yok'} · T teyidi: ${row.confirmations.T?'var':'yok'}</p><p>${esc(row.history.reason)}<br>${row.history.compatible.map(r=>`${esc(r.date)} ${esc(r.city)} ${r.distance} m: ${r.finish}.`).join(' · ')||'Karşılaştırılabilir geçmiş bulunamadı.'}<br>F kaynağı: ${esc(row.formSource)}${row.historyError?` · ${esc(row.historyError)}`:''}</p><p>D: ${esc(row.degree.reason)}${row.degree.predictedSec!==null?` · geçmiş medyanı ${row.degree.predictedSec.toFixed(2)} sn`:''}<br>${esc(row.degree.source)}</p></details>`).join('')}</details>`;
}

function raceHtml(template,leg){
  const model=MODELS.find(x=>x.id===template.modelId),set=selectedSet(template,leg),auto=(leg.selections||[]).map(x=>String(x.no)),manual=!sameSelection(set,auto);
  const meta=raceMeta(leg)||'Koşu bilgisi';
  if(!leg.available)return`<article class="fogd-coupon-race-v173"><div class="fogd-coupon-race-head-v173"><div><b>${esc(leg.raceNo)}. Koşu</b><small>${esc(meta)}</small></div><span class="fogd-coupon-badge-v173">VERİ YOK</span></div><div class="fogd-coupon-missing-v173"><b>${esc(model?.short||'')} şablonu bu koşuda oluşturulamadı.</b><br>${esc(leg.error||'Puan kapsamı yetersiz.')}<br><span class="fogd-coupon-muted-v173">${esc(MODEL_NOTES[model?.key]||'Eksik puan başka sütunla tamamlanmaz.')}</span></div></article>`;
  const selectedRows=(leg.ranking||[]).filter(row=>set.has(String(row.no)));
  const isCondition=template.modelId==='dna-condition';
  const badge=isCondition?(manual?'MANUEL':leg.single?'TEK ADAY':!set.size?'İNCELE':leg.conditionSummary?.uncertainty==='yüksek'?'BELİRSİZ':'ADAY GRUBU'):(set.size===1?'TEK':manual?'MANUEL':'OTOMATİK');
  if(isCondition)return`<article class="fogd-coupon-race-v173"><div class="fogd-coupon-race-head-v173"><div><b>${esc(leg.raceNo)}. Koşu</b><small>${esc(meta)}</small></div><span class="fogd-coupon-badge-v173 ${leg.single&&!manual?'single':''}">${badge}</span></div><div class="fogd-coupon-cut-v173"><b>${set.size} at seçildi</b><br><span>${esc(leg.cut?.reason)} · geçmiş kapsamı %${Math.round(leg.coverage*100)}</span></div>${conditionEvidence(leg)}<div class="fogd-coupon-picks-v173">${selectedRows.map(row=>`<button type="button" class="fogd-coupon-pick-v173" data-fogd-pick-v173="${esc(row.no)}" data-fogd-race-v173="${esc(leg.raceNo)}" data-fogd-model-v173="dna-condition"><b>${esc(row.no)} · ${esc(row.name)}</b><small>${esc(groupLabel(row.group))} · yakınlık ${esc(proximityText(row.score))}</small></button>`).join('')||'<span class="fogd-coupon-muted-v173">Otomatik aday yok; tüm sıralamadan elle seçim yapabilirsiniz.</span>'}</div><details class="fogd-coupon-ranking-v173"><summary>Tüm atlar · elle düzenle</summary><div class="fogd-coupon-ranking-grid-v173">${leg.ranking.map(row=>`<button type="button" class="fogd-coupon-rank-v173 ${set.has(String(row.no))?'selected':''}" data-fogd-pick-v173="${esc(row.no)}" data-fogd-race-v173="${esc(leg.raceNo)}" data-fogd-model-v173="dna-condition"><b>${esc(row.no)} · ${esc(row.name)}</b><small>${esc(groupLabel(row.group))} · yakınlık ${esc(proximityText(row.score))}</small></button>`).join('')}</div>${manual?`<button type="button" class="fogd-coupon-reset-v173" data-fogd-reset-v173="${esc(leg.raceNo)}" data-fogd-model-v173="dna-condition">Otomatik seçime dön</button>`:''}</details></article>`;
  return`<article class="fogd-coupon-race-v173"><div class="fogd-coupon-race-head-v173"><div><b>${esc(leg.raceNo)}. Koşu</b><small>${esc(meta)}</small></div><span class="fogd-coupon-badge-v173 ${set.size===1?'single':''}">${badge}</span></div><div class="fogd-coupon-cut-v173"><b>${set.size} at seçildi</b><br><span>${esc(leg.cut?.reason||'kritik kesim')} · kapsam %${Math.round(Number(leg.coverage||0)*100)}</span></div><div class="fogd-coupon-picks-v173">${selectedRows.map(row=>`<button type="button" class="fogd-coupon-pick-v173" data-fogd-pick-v173="${esc(row.no)}" data-fogd-race-v173="${esc(leg.raceNo)}" data-fogd-model-v173="${esc(template.modelId)}"><b>${esc(row.no)} · ${esc(row.name||'')}</b><small>${esc(model?.short)} ${Number(row.score).toFixed(1)} · seçimden çıkar</small></button>`).join('')}</div><details class="fogd-coupon-ranking-v173"><summary>Tüm ${esc(model?.short)} sıralaması · elle düzenle</summary><div class="fogd-coupon-ranking-grid-v173">${(leg.ranking||[]).map(row=>`<button type="button" class="fogd-coupon-rank-v173 ${set.has(String(row.no))?'selected':''}" data-fogd-pick-v173="${esc(row.no)}" data-fogd-race-v173="${esc(leg.raceNo)}" data-fogd-model-v173="${esc(template.modelId)}"><b>${esc(row.rank)}. ${esc(row.no)} · ${esc(row.name||'')}</b><small>${esc(model?.short)} ${Number(row.score).toFixed(1)}</small></button>`).join('')}</div>${manual?`<button type="button" class="fogd-coupon-reset-v173" data-fogd-reset-v173="${esc(leg.raceNo)}" data-fogd-model-v173="${esc(template.modelId)}">Otomatik kesime dön</button>`:''}</details></article>`;
}
function modelHtml(template){
  const model=MODELS.find(x=>x.id===template.modelId)||{},filter=filterState();
  const visible=filter?.nos&&!filter.error?template.legs.filter(x=>filter.nos.has(String(x.raceNo))):template.legs;
  const ready=visible.filter(x=>x.available).length,selected=visible.reduce((sum,leg)=>sum+(leg.available?selectedSet(template,leg).size:0),0);
  const filterText=filter?.nos&&!filter.error?`${esc(filter.type)} için ${visible.length} resmî ayak gösteriliyor. Hesaplanan ana şablon ${template.legs.length} koşunun tamamını içerir.`:filter?.error?esc(filter.error):`${template.legs.length} koşunun tamamı gösteriliyor.`;
  const tenthNote=model.key==='C'?`<details class="fogd-condition-info-v174"><summary>10. yöntemin seçim kuralları</summary>0–5 fark: 1; 5’ten büyük–10 fark: 0,5. Bir bant geçerli atların %40’ından fazlasını içerirse sütun katkısı dörtte bire iner. Ana grup ≥2,5; izleme ≥1,75 ve E veya T teyidi. Koşul uyumu: aynı pistte ±200 m, en az 2 ilk dört, en az %50 ilk dört ve son 365 günde benzer koşulda ilk dört. E/T puana eklenmez. F geçmiş koşullarına göre yeniden hesaplanır; D yalnız karşılaştırılabilir kayıtlardan gelir. Kurallar deneme aşamasındadır.</details>`:'';
  return`<section class="fogd-coupon-model-v173" data-fogd-panel-v173="${esc(template.modelId)}"><div class="fogd-coupon-model-head-v173"><div class="fogd-coupon-model-key-v173">${esc(model.short)}</div><div><h3>${esc(model.label)}</h3><p>${esc(MODEL_NOTES[model.key]||'Yalnız kendi puan sütunu kullanılır.')}</p></div><div class="fogd-coupon-stats-v173"><span>${ready}/${visible.length} koşu değerlendirildi</span><span>${selected} at seçili</span><span>${esc(model.key==='C'?'Yarış öncesi veri · deneme yöntemi':profileText(template.profile))}</span></div></div>${tenthNote}<div class="fogd-coupon-filter-note-v173">${filterText}</div>${visible.map(leg=>raceHtml(template,leg)).join('')||'<div class="fogd-coupon-empty-v173">Bu görünümde koşu bulunamadı.</div>'}</section>`;
}
function renderTemplates(){
  const tabs=$('fogdCouponTabsV173'),host=$('fogdCouponTemplatesV173');if(!tabs||!host)return;
  if(!templates.length){tabs.innerHTML='';host.className='fogd-coupon-empty-v173';host.textContent='Henüz şablon oluşturulmadı.';return}
  if(!templates.some(x=>x.modelId===activeModel))activeModel=templates[0].modelId;
  tabs.innerHTML=templates.map(t=>`<button type="button" role="tab" aria-label="${esc(t.modelLabel)}" aria-selected="${t.modelId===activeModel?'true':'false'}" class="fogd-coupon-tab-v173 ${t.modelId===activeModel?'active':''}" data-fogd-tab-v173="${esc(t.modelId)}">${t.modelId==='dna-condition'?'10 · KOŞUL':esc(MODELS.find(x=>x.id===t.modelId)?.short||t.modelKey)}</button>`).join('');
  const template=templates.find(x=>x.modelId===activeModel);host.className='';host.innerHTML=modelHtml(template);
  tabs.querySelectorAll('[data-fogd-tab-v173]').forEach(button=>button.addEventListener('click',()=>{activeModel=button.dataset.fogdTabV173;renderTemplates()}));
  tabs.querySelector('[aria-selected="true"]')?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});
  host.querySelectorAll('[data-fogd-pick-v173]').forEach(button=>button.addEventListener('click',()=>togglePick(button.dataset.fogdModelV173,button.dataset.fogdRaceV173,button.dataset.fogdPickV173)));
  host.querySelectorAll('[data-fogd-reset-v173]').forEach(button=>button.addEventListener('click',()=>resetRace(button.dataset.fogdModelV173,button.dataset.fogdResetV173)));
}
function findLeg(modelId,raceNo){const template=templates.find(x=>x.modelId===modelId),leg=template?.legs?.find(x=>String(x.raceNo)===String(raceNo));return{template,leg}}
function togglePick(modelId,raceNo,horseNo){
  const{template,leg}=findLeg(modelId,raceNo);if(!template||!leg?.available)return;
  const set=selectedSet(template,leg),key=String(horseNo);
  if(!(leg.ranking||[]).some(row=>String(row.no)===key))return;
  if(set.has(key)){if(set.size===1&&modelId!=='dna-condition'){setStatus(`${raceNo}. Koşu · en az bir at seçili kalmalıdır.`,'warn');return}set.delete(key)}else set.add(key);
  persistSelections();renderTemplates();setStatus(`${template.modelKey} · ${raceNo}. Koşu manuel seçim güncellendi.`,'info');
}
function resetRace(modelId,raceNo){
  const{template,leg}=findLeg(modelId,raceNo);if(!template||!leg)return;
  selectionMap.set(selectionKey(modelId,raceNo),new Set((leg.selections||[]).map(x=>String(x.no))));persistSelections();renderTemplates();setStatus(`${template.modelKey} · ${raceNo}. Koşu otomatik kritik kesime döndü.`,'info');
}
function persistSelections(){
  const s=appState();if(!s)return;s.analyses=s.analyses||{};
  const manualKeys=[];for(const template of templates)for(const leg of template.legs||[]){if(!sameSelection(selectedSet(template,leg),(leg.selections||[]).map(x=>x.no)))manualKeys.push(selectionKey(template.modelId,leg.raceNo))}
  s.analyses.fogdCouponV173={version:VERSION,mode:MODE,date:currentDate(),city:cityName(),context:contextKey(),manualKeys,models:templates.map(t=>({modelId:t.modelId,complete:t.complete,readyRaces:t.readyRaces,totalRaces:t.totalRaces})),selections:Object.fromEntries([...selectionMap].map(([key,set])=>[key,[...set]])),generatedAt:new Date().toISOString()};
  try{if(typeof save==='function')save()}catch{}
}

async function buildAll(){
  if(busy)return templates;
  const s=appState(),races=programRaces(),date=currentDate(),city=cityName();
  if(!s){setStatus('Program durumu okunamadı. Sayfayı yenileyin.','error');return[]}
  if(!races.length){setStatus('Önce günün TJK programını yükleyin.','error');return[]}
  if(!date||!city){setStatus('Program tarihi veya şehir bulunamadı.','error');return[]}
  const buildContext=contextKey(),saved=s.analyses?.fogdCouponV173;
  setBusy(true);selectionMap=new Map();
  function initializePicks(template){
    for(const leg of template.legs||[]){
      const key=selectionKey(template.modelId,leg.raceNo),allowed=new Set((leg.ranking||[]).map(row=>String(row.no)));
      const restore=saved?.context===buildContext&&saved?.manualKeys?.includes(key);
      const choices=restore?(saved.selections?.[key]||[]).map(String).filter(no=>allowed.has(no)):(leg.selections||[]).map(row=>String(row.no));
      selectionMap.set(key,new Set(choices));
    }
  }
  try{
    const loaded=await loadSnapshots(races,date,city),profiles=historicalProfiles(loaded.all,date),eligible=eligibleMap(races);
    if(contextKey()!==buildContext)return[];
    templates=core.MODELS.map(model=>core.buildAllRacesTemplate({modelId:model.id,races,snapshotsByRace:loaded.map,profiles,eligibleByRace:eligible,maxWidth:5}));
    templateContext=buildContext;activeModel='dna-f';templates.forEach(initializePicks);
    // The existing nine results are usable while the separate history method loads.
    renderTemplates();
    let tenth;
    try{
      const transport=window.ATFogdConditionCouponV174;
      if(!transport||!condition)throw new Error('Koşul Uyumu motoru yüklenemedi.');
      const enriched=await transport.enrichSnapshots(loaded.map,races,{date,city,onProgress:(done,total)=>{
        if(contextKey()===buildContext){setBusy(true,`10. yöntem · geçmiş ${done}/${total}`);setStatus('Dokuz bağımsız şablon hazır. 10. yöntem için yarış öncesi geçmişler kontrol ediliyor…','busy')}
      }});
      tenth=transport.build({races,snapshotsByRace:enriched.map,eligibleByRace:eligible,date,city,standards:enriched.standards});
    }catch(error){
      tenth={modelId:'dna-condition',modelKey:'C',modelLabel:MODELS[9].label,complete:false,readyRaces:0,totalRaces:races.length,profile:null,
        legs:races.map(race=>({raceNo:race.no,available:false,selections:[],ranking:[],error:clean(error?.message||error)}))};
    }
    if(contextKey()!==buildContext)return[];
    templates.push(tenth);initializePicks(tenth);
    persistSelections();renderTemplates();
    const complete=templates.slice(0,9).filter(x=>x.complete).length;
    const uncertain=tenth.legs.filter(leg=>!leg.available||leg.conditionSummary?.uncertainty==='yüksek').length;
    setStatus(`${complete}/9 bağımsız sütun şablonu eksiksiz · 10. Koşul Uyumu: ${tenth.readyRaces}/${races.length} koşuda otomatik aday.${uncertain?` ${uncertain} koşuda yüksek belirsizlik; gerekçeleri inceleyin.`:''}`,complete===9&&tenth.complete&&!uncertain?'ok':'warn');
    return templates;
  }catch(error){console.error('[AT AI]',VERSION,'all-races build failed',error);setStatus(`Şablonlar hazırlanamadı: ${clean(error?.message||error)||'Bilinmeyen hata.'}`,'error');return[]}
  finally{setBusy(false)}
}

function install(){ensureDialog();bindMenu();updateProgramLabel();renderTemplates()}
install();
window.addEventListener('pageshow',()=>{bindMenu();ensureDialog();updateProgramLabel()},{passive:true});
window.addEventListener('at-ai:program-selection-changed',()=>{updateProgramLabel();if(!templateContext||templateContext===contextKey())return;templates=[];selectionMap=new Map();templateContext='';renderTemplates();setStatus('Program değişti. Yeni tüm-koşu şablonlarını oluşturun.','info')},{passive:true});
const oldFive=window.ATCouponFiveModelCalibratedV631||{};
window.ATCouponFiveModelCalibratedV631={...oldFive,version:VERSION,buildAll,mode:MODE};
window.ATFogdNineCouponV173={version:VERSION,mode:MODE,models:MODELS,open:openDialog,close:closeDialog,build:buildAll,render:renderTemplates,get templates(){return templates}};
window.ATFogdCouponV174=window.ATFogdNineCouponV173;
console.info('[AT AI]',VERSION,'active - nine independent templates plus condition-aware tenth method.');
})();
