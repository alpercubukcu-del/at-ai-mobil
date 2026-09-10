/* AT AI Mobil — V16.7.1 Kupon Karar Motoru
   Amaç:
   - Kupon Oluştur tıklamasında doğrudan at yazmak yerine veri ön kontrolü yapmak.
   - Güncel Analiz + Kariyer Yol Haritası + 5 Model + Kazanan Yolu + Koşu Senaryosu + Model Kalibrasyonu kaynaklarını birlikte denetlemek.
   - Eksik veri varsa hangi kaynağın eksik olduğunu ve tamamla butonunu göstermek.
   - Ayakları kendi aralarında kıyaslayarak BANKO / 2 / 3 / 4 / 5+ at kararını vermek.
   - Bankoyu zorla üretmemek; veri/ref güveni yetersizse banko kilidini kapatmak.
   - 5 Model kartlarını korumak, fakat Bileşik kartı "Karar Motoru · Tüm Veriler" ana kupona dönüştürmek.
   Not: Bu katman sonuç API'si çağırmaz. Kazanan Yolu kör endpoint'i resultApiCalled/resultDataLoaded denetimiyle kullanılır.
*/
(() => {
'use strict';
if (window.__AT_COUPON_DECISION_GATE_V1671__) return;
window.__AT_COUPON_DECISION_GATE_V1671__ = true;

const VERSION='COUPON-DECISION-GATE-V16.7.1';
const SCREEN_ID='couponDecisionGateV1671';
const STYLE_ID='couponDecisionGateStyleV1671';
const WIN_SESSION_KEY='at_ai_coupon_winnerpath_v1671';
const CHANNEL_BASE_WEIGHTS={composite:.22,exact:.12,twin:.08,family:.07,career5:.10,current:.16,careerRoad:.12,winner:.13};
const CHANNEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career5:'5M Kariyer',current:'Güncel',careerRoad:'Kariyer Yolu',winner:'Kazanan Yolu'};
const modelMem=new Map();
let busy=false;
let lastAudit=null;
let lastDecisions=null;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const raf2=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

function ensureStyle(){
  if($(STYLE_ID)) return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
#${SCREEN_ID}{position:fixed!important;inset:0!important;z-index:6500!important;display:none;flex-direction:column;background:#07131f;color:#eef7ff;width:100vw;height:100dvh;overflow:hidden}
#${SCREEN_ID}.open{display:flex!important}.cdg-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(125,190,255,.18);background:#091827;flex:0 0 auto}.cdg-ey{font-size:11px;letter-spacing:.15em;font-weight:900;color:#78d7ff}.cdg-head h2{margin:4px 0 0;font-size:22px}.cdg-close{width:48px;height:48px;border:0;border-radius:14px;background:#132b43;color:#fff;font-size:28px}.cdg-body{flex:1 1 auto;overflow:auto;-webkit-overflow-scrolling:touch;padding:14px 16px 34px}.cdg-card{border:1px solid rgba(125,190,255,.20);background:rgba(8,24,39,.78);border-radius:16px;padding:13px;margin-bottom:11px}.cdg-card h3{margin:0 0 8px;font-size:16px}.cdg-card p{margin:5px 0;color:#b9cbe0;line-height:1.45}.cdg-row{display:grid;grid-template-columns:28px 1fr auto;gap:9px;align-items:center;border-top:1px solid rgba(125,190,255,.10);padding:10px 0}.cdg-row:first-of-type{border-top:0}.cdg-icon{font-size:18px}.cdg-row b{display:block}.cdg-row small{display:block;color:#91a9c0;margin-top:2px;line-height:1.35}.cdg-btn{min-height:39px;border-radius:11px;border:1px solid rgba(111,191,255,.30);background:#173a59;color:#fff;font-weight:800;padding:7px 10px}.cdg-btn.primary{background:linear-gradient(135deg,#29b6ff,#4c68ff);border:0}.cdg-btn.good{background:#0d4b37}.cdg-btn.warn{background:#5d3d12}.cdg-btn:disabled{opacity:.45}.cdg-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:11px}.cdg-actions .wide{grid-column:1/-1}.cdg-progress{height:9px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin:10px 0}.cdg-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2bb7ff,#6172ff);transition:width .4s ease}.cdg-green{color:#78e0a5}.cdg-yellow{color:#ffca7a}.cdg-red{color:#ff8e8e}.cdg-chipbox{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.cdg-chip{font-size:11px;padding:5px 8px;border:1px solid rgba(125,190,255,.22);border-radius:999px;color:#cfe7fa;background:rgba(61,127,181,.10)}
.cdg-plan{border:1px solid rgba(98,212,161,.30);background:rgba(8,34,31,.72);border-radius:16px;padding:13px;margin:10px 0}.cdg-leg{border-top:1px solid rgba(125,190,255,.11);padding:10px 0}.cdg-leg:first-child{border-top:0}.cdg-leghead{display:flex;justify-content:space-between;gap:10px;align-items:center}.cdg-leghead b{font-size:15px}.cdg-badge{font-size:11px;font-weight:900;border-radius:999px;padding:5px 8px;background:#193b59}.cdg-badge.banko{background:#0b5a3d;color:#9ff1c5}.cdg-picks{margin-top:5px;color:#e9f5ff;font-weight:750;line-height:1.4}.cdg-why{margin-top:4px;color:#91a9c0;font-size:11px;line-height:1.35}.cdg-meter{height:6px;background:rgba(255,255,255,.07);border-radius:999px;margin-top:6px;overflow:hidden}.cdg-meter i{height:100%;display:block;background:linear-gradient(90deg,#2bb7ff,#70e3ad)}
#tickets .cdg-ticket-summary{border:1px solid rgba(96,220,166,.38);background:linear-gradient(180deg,rgba(11,56,45,.72),rgba(7,25,36,.84));border-radius:17px;padding:14px;margin:0 0 14px}#tickets .cdg-ticket-summary h3{margin:0 0 7px}#tickets .cdg-ticket-summary p{margin:4px 0;color:#b9cbe0}.cdg-ticket-leg{padding:9px 0;border-top:1px solid rgba(125,190,255,.10)}.cdg-ticket-leg:first-of-type{border-top:0}.cdg-ticket-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.cdg-ticket-picks{font-weight:850;margin-top:4px}.cdg-ticket-note{font-size:11px;color:#91a9c0;margin-top:3px}
@media(max-width:560px){.cdg-row{grid-template-columns:26px 1fr}.cdg-row .cdg-btn{grid-column:2;width:100%;margin-top:2px}.cdg-actions{grid-template-columns:1fr}.cdg-actions .wide{grid-column:auto}.cdg-body{padding:12px 14px 28px}}
`;document.head.appendChild(s);
}

function cityName(){try{return typeof getCityName==='function'?clean(getCityName()):clean($('citySelect')?.selectedOptions?.[0]?.textContent);}catch{return clean($('citySelect')?.selectedOptions?.[0]?.textContent);}}
function contextKey(raceNo){return [clean(state?.date),fold(cityName()),Number(raceNo)||0].join('|');}
function horseKey(h={}){const id=clean(h?.id??h?.horseId??h?.At_ID??h?.atId);if(id)return `ID:${id}`;const no=num(h?.no??h?.Program_No??h?.programNo);const name=fold(h?.name??h?.horseName??h?.At_Adı??h?.At_Adi);return `${no??''}|${name}`;}
function raceByNo(no){return (Array.isArray(state?.races)?state.races:[]).find(r=>String(r?.no)===String(no))||null;}
function raceItem(result,no){return (Array.isArray(result?.races)?result.races:[]).find(r=>String(r?.no)===String(no))||null;}
function sameDate(result){return clean(result?.date)===clean(state?.date);}
function hasRaceHorses(result,no){const r=raceItem(result,no);return !!(r&&Array.isArray(r.horses)&&r.horses.length);}

function selectedBetTypes(){return [...document.querySelectorAll('.bet-check:checked')].map(x=>clean(x.value)).filter(Boolean);}
function plansNow(){
  const types=selectedBetTypes();
  return types.map(type=>{try{return typeof resolveBetStartV11==='function'?resolveBetStartV11(type):{ok:false,desc:{type},error:'Bahis başlangıç çözümleyicisi yok.'};}catch(e){return{ok:false,desc:{type},error:e?.message||String(e)};}});
}
function requiredRaceNos(){
  const set=new Set();
  for(const p of plansNow()) if(p?.ok) for(const r of (p.legs||[])) set.add(Number(r?.no));
  if(!set.size) for(const r of (state?.races||[])) if(Number(r?.no)>0)set.add(Number(r.no));
  return [...set].filter(n=>Number.isFinite(n)&&n>0).sort((a,b)=>a-b);
}

function winSessionLoad(){try{const x=JSON.parse(sessionStorage.getItem(WIN_SESSION_KEY)||'{}');return x&&typeof x==='object'?x:{};}catch{return{};}}
function winSessionSave(all){try{sessionStorage.setItem(WIN_SESSION_KEY,JSON.stringify(all));}catch{}}
function winnerCompact(data,raceNo){
  const rows=(Array.isArray(data?.rows)?data.rows:[]).map((r,i)=>({
    id:clean(r?.At_ID??r?.horseId),no:num(r?.Program_No??r?.programNo??r?.no),name:clean(r?.At_Adı??r?.At_Adi??r?.horseName??r?.name),
    score:num(r?.V5_SKOR),a:num(r?.A_SIRA),b:num(r?.B_SIRA),type:clean(r?.ADAY_TIPI),rank:i+1
  }));
  return {date:clean(state?.date),city:cityName(),raceNo:Number(raceNo),rows,referenceCount:Array.isArray(data?.referenceWinners)?data.referenceWinners.length:0,referenceQuality:num(data?.referenceSetQuality)??0,leakPassed:data?.leakAudit?.passed===true,roadmapOk:data?.roadmapOk!==false,createdAt:new Date().toISOString()};
}
function winnerData(no){const all=winSessionLoad();return all[contextKey(no)]||null;}
function setWinnerData(no,d){const all=winSessionLoad();all[contextKey(no)]=d;const keys=Object.keys(all);if(keys.length>30){keys.sort((a,b)=>String(all[a]?.createdAt||'').localeCompare(String(all[b]?.createdAt||'')));for(const k of keys.slice(0,keys.length-30))delete all[k];}winSessionSave(all);}

function calibrationResult(){
  try{
    if(typeof loadCalibrationCacheV116==='function'){
      const all=loadCalibrationCacheV116();
      const vals=Object.values(all||{}).filter(x=>x?.summary?.byFinish?.[1]);
      return vals.sort((a,b)=>String(b?.calculatedAt||'').localeCompare(String(a?.calculatedAt||'')))[0]||null;
    }
  }catch{}
  return null;
}
function calibrationFactor(modelId){
  const c=calibrationResult();const s=c?.summary?.byFinish?.[1]?.[modelId];
  const total=Number(s?.total)||0;if(!total)return 1;
  const top1=(Number(s?.top1)||0)/total,top3=(Number(s?.top3)||0)/total;
  const rel=.65*top1+.35*top3;
  return .75+rel*.75;
}

function modelReady(no){return modelMem.has(contextKey(no));}
function programIssue(race){
  if(!race)return 'Koşu programda yok.';
  const missing=[];if(!clean(race.class))missing.push('sınıf');if(!clean(race.ageGroup))missing.push('yaş grubu');if(!num(race.distance))missing.push('mesafe');if(!clean(race.track))missing.push('pist');
  if(!Array.isArray(race.horses)||!race.horses.length)missing.push('at listesi');else if(race.horses.some(h=>!clean(h?.id)))missing.push('At ID');
  return missing.length?`Eksik: ${missing.join(', ')}`:'';
}

function audit(){
  const raceNos=requiredRaceNos();const issues=[];const warnings=[];
  const types=selectedBetTypes();
  if(!types.length)issues.push({id:'bet',label:'Bahis türü',detail:'En az bir bahis türü seçilmeli.',action:null});
  if(!Array.isArray(state?.races)||!state.races.length)issues.push({id:'program',label:'TJK Programı',detail:'Program yüklenmemiş.',action:'program'});
  else{
    const bad=raceNos.map(no=>({no,msg:programIssue(raceByNo(no))})).filter(x=>x.msg);
    if(bad.length)issues.push({id:'program',label:'TJK Programı',detail:bad.map(x=>`${x.no}.K ${x.msg}`).join(' · '),action:'program'});
  }
  const current=state?.analyses?.current;
  const currentMissing=raceNos.filter(no=>!sameDate(current)||!hasRaceHorses(current,no));
  if(currentMissing.length)issues.push({id:'current',label:'1. Güncel Analiz',detail:`Eksik ayak: ${currentMissing.map(x=>`${x}.K`).join(', ')}`,action:'current'});
  const career=state?.analyses?.career;
  const careerMissing=raceNos.filter(no=>!sameDate(career)||!hasRaceHorses(career,no));
  if(careerMissing.length)issues.push({id:'career',label:'4. Kariyer Yol Haritası',detail:`Eksik ayak: ${careerMissing.map(x=>`${x}.K`).join(', ')}`,action:'career'});
  const scenario=state?.analyses?.scenario;
  const scenarioMissing=raceNos.filter(no=>!sameDate(scenario)||!raceItem(scenario,no));
  if(scenarioMissing.length)issues.push({id:'scenario',label:'3. Koşu Senaryosu',detail:`Eksik ayak: ${scenarioMissing.map(x=>`${x}.K`).join(', ')}`,action:'scenario'});
  const modelMissing=raceNos.filter(no=>!modelReady(no));
  if(modelMissing.length)issues.push({id:'models',label:'5 Model Verisi',detail:`Eksik ayak: ${modelMissing.map(x=>`${x}.K`).join(', ')}`,action:'models'});
  const winnerMissing=raceNos.filter(no=>!winnerData(no));
  if(winnerMissing.length)issues.push({id:'winner',label:'2. Kazanan Yolu Kör Verisi',detail:`Eksik ayak: ${winnerMissing.map(x=>`${x}.K`).join(', ')}`,action:'winner'});
  const cal=calibrationResult();
  if(!cal)issues.push({id:'calibration',label:'5. Model Kalibrasyonu',detail:'Model güven ağırlıkları henüz hesaplanmamış.',action:'calibration'});
  for(const no of raceNos){const w=winnerData(no);if(!w)continue;if(w.leakPassed!==true)issues.push({id:`leak-${no}`,label:`${no}.K tarih sızıntısı`,detail:'Kazanan Yolu körlük denetimi geçmedi.',action:'winner'});else if((w.referenceCount||0)<5)warnings.push({id:`refs-${no}`,label:`${no}.K Kazanan Yolu referansı düşük`,detail:`Yalnız ${w.referenceCount||0} geçmiş kazanan · kalite %${Math.round(w.referenceQuality||0)}. Bu ayakta BANKO kilitlenir.`,action:'winner'});}
  if(scenario&&!scenarioMissing.length)warnings.push({id:'scenario-role',label:'Koşu Senaryosu kullanım biçimi',detail:'Mevcut senaryo ekranı ayrı bir at puanı üretmiyorsa karar motoru onu yarış/katılımcı tutarlılık kontrolü olarak kullanır; gizli puan uydurmaz.',action:null});
  const result={raceNos,issues,warnings,ready:issues.length===0,calibration:cal,types,checkedAt:new Date().toISOString()};lastAudit=result;return result;
}

function screen(){
  ensureStyle();let s=$(SCREEN_ID);if(s)return s;
  s=document.createElement('section');s.id=SCREEN_ID;s.setAttribute('aria-hidden','true');s.innerHTML=`<div class="cdg-head"><div><div class="cdg-ey">TÜM VERİ · AYAKLAR ARASI KARAR</div><h2>Kupon Veri Denetimi</h2></div><button id="cdgCloseV1671" class="cdg-close">×</button></div><div class="cdg-body" id="cdgBodyV1671"></div>`;document.body.appendChild(s);$('cdgCloseV1671').onclick=()=>{if(!busy)closeScreen();};return s;
}
function openScreen(){const s=screen();s.classList.add('open');s.setAttribute('aria-hidden','false');document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';renderAudit();}
function closeScreen(){const s=screen();s.classList.remove('open');s.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';document.body.style.overflow='';}
function statusRow(x,kind){const icon=kind==='ok'?'✅':kind==='warn'?'⚠️':'❌';const cls=kind==='ok'?'cdg-green':kind==='warn'?'cdg-yellow':'cdg-red';return `<div class="cdg-row"><div class="cdg-icon">${icon}</div><div><b class="${cls}">${esc(x.label)}</b><small>${esc(x.detail||'Hazır')}</small></div>${x.action?`<button class="cdg-btn ${kind==='warn'?'warn':''}" data-cdg-action="${esc(x.action)}">Tamamla</button>`:''}</div>`;}
function readyRows(a){
  const ids=new Set(a.issues.map(x=>x.id));const out=[];
  if(!ids.has('program'))out.push({label:'TJK Programı',detail:`${a.raceNos.length} kupon ayağı programdan doğrulandı.`});
  if(!ids.has('current'))out.push({label:'1. Güncel Analiz',detail:'Program + yarış öncesi kariyer + zorluk/TEK sinyali hazır.'});
  if(!ids.has('winner'))out.push({label:'2. Kazanan Yolu',detail:'Kör sıralamalar hazır; sonuç verisi kullanılmadı.'});
  if(!ids.has('scenario'))out.push({label:'3. Koşu Senaryosu',detail:'Seçili ayakların senaryo/tutarlılık kaydı hazır.'});
  if(!ids.has('career'))out.push({label:'4. Kariyer Yol Haritası',detail:'Koşacak atların hedef tarih öncesi kariyer yolları hazır.'});
  if(!ids.has('models'))out.push({label:'5 Model',detail:'Bileşik + Tam + İkiz + Aile + Kariyer kanalları hazır.'});
  if(!ids.has('calibration'))out.push({label:'5. Model Kalibrasyonu',detail:'Geçmiş gerçek sonuçlardan model güven katsayıları hazır.'});
  return out;
}
function renderAudit(progress=null){
  const a=audit();const b=$('cdgBodyV1671');if(!b)return;
  const progressHtml=progress?`<div class="cdg-card"><h3>${esc(progress.title||'Veri tamamlanıyor…')}</h3><p>${esc(progress.text||'')}</p><div class="cdg-progress"><i style="width:${clamp(progress.pct)}%"></i></div><div class="cdg-chipbox"><span class="cdg-chip">${Math.round(clamp(progress.pct))}%</span><span class="cdg-chip">${esc(progress.step||'')}</span></div></div>`:'';
  b.innerHTML=`${progressHtml}<div class="cdg-card"><h3>Kupon öncesi zorunlu veri kontrolü</h3><p>Kupon, ayakları birbirinden bağımsız değil <b>birbirleriyle karşılaştırarak</b> kurulur. Eksik kaynak varsa ana karar oluşturulmaz.</p><div class="cdg-chipbox"><span class="cdg-chip">${esc(state?.date||'')}</span><span class="cdg-chip">${esc(cityName())}</span><span class="cdg-chip">${a.raceNos.length} ayak</span></div></div>
  <div class="cdg-card"><h3>${a.ready?'✅ Zorunlu veriler hazır':'Eksik / hazır veri kaynakları'}</h3>${readyRows(a).map(x=>statusRow(x,'ok')).join('')}${a.issues.map(x=>statusRow(x,'bad')).join('')}${a.warnings.map(x=>statusRow(x,'warn')).join('')}</div>
  <div class="cdg-card"><h3>Karar kuralları</h3><p><b>BANKO zorunlu değildir.</b> Bir ayak ancak model fikir birliği, lider farkı, yarış zorluğu, Kazanan Yolu referansı ve kalibrasyon birlikte yeterliyse tek yapılır. Riskli ayak bütçe yetiyor diye daraltılmaz.</p></div>
  <div class="cdg-actions">${a.issues.length?'<button class="cdg-btn primary wide" id="cdgAutoV1671">Tüm Eksikleri Otomatik Tamamla</button>':''}<button class="cdg-btn" id="cdgCheckV1671">Tekrar Kontrol Et</button><button class="cdg-btn good" id="cdgBuildV1671" ${a.ready?'':'disabled'}>Kupon Kararını Hesapla</button></div>${lastDecisions?decisionHtml(lastDecisions):''}`;
  b.querySelectorAll('[data-cdg-action]').forEach(btn=>btn.onclick=()=>runAction(btn.dataset.cdgAction));
  const auto=$('cdgAutoV1671');if(auto)auto.onclick=runAllMissing;const check=$('cdgCheckV1671');if(check)check.onclick=()=>renderAudit();const build=$('cdgBuildV1671');if(build)build.onclick=finalBuild;
}
function progress(title,text,pct,step=''){renderAudit({title,text,pct,step});}

async function runMenuView(view,label){
  if(typeof runAnalysis!=='function')throw new Error(`${label} hesaplama fonksiyonu yok.`);
  const d=$('analysisDialog'),sel=$('analysisRace');const oldView=d?.dataset?.view,oldVal=sel?.value;
  if(d)d.dataset.view=view;if(sel)sel.value='all';await raf2();await runAnalysis();await raf2();if(d&&oldView)d.dataset.view=oldView;if(sel&&oldVal)sel.value=oldVal;
}
async function fetchJson(url,timeout=240000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal:c.signal});const text=await r.text();let d;try{d=JSON.parse(text);}catch{throw new Error('Sunucu JSON döndürmedi.');}if(!r.ok||d?.ok===false)throw new Error(d?.error||`HTTP ${r.status}`);return d;}finally{clearTimeout(t);}}
async function completeWinner(raceNos){
  const list=raceNos||requiredRaceNos();for(let i=0;i<list.length;i++){const no=list[i];progress('Kazanan Yolu hazırlanıyor',`${no}. Koşu · geçmiş 1. olanların kör yolları alınıyor…`,Math.round(i/list.length*100),`${i+1}/${list.length}`);const q=new URLSearchParams({date:state.date,city:cityName(),raceNo:String(no)});const d=await fetchJson(`/api/tjk-conditional-v4-blind?${q.toString()}`,250000);if(d?.resultApiCalled||d?.resultDataLoaded)throw new Error(`${no}.K körlük ihlali: sonuç verisi açılmış.`);setWinnerData(no,winnerCompact(d,no));}
}
async function completeModels(raceNos){
  if(typeof prepareRaceModelsV11!=='function')throw new Error('5 Model hazırlama fonksiyonu yok.');const list=raceNos||requiredRaceNos();for(let i=0;i<list.length;i++){const no=list[i],race=raceByNo(no);if(!race)continue;progress('5 Model hazırlanıyor',`${no}. Koşu · Bileşik/Tam/İkiz/Aile/Kariyer…`,Math.round(i/list.length*100),`${i+1}/${list.length}`);const d=await prepareRaceModelsV11(race);modelMem.set(contextKey(no),d);}
}
async function completeCalibration(){
  if(typeof calculateCalibrationV116!=='function'||typeof CALIBRATION_DAYS_V116==='undefined'||!CALIBRATION_DAYS_V116?.length)throw new Error('Model Kalibrasyonu hesaplayıcısı bulunamadı.');
  const day=CALIBRATION_DAYS_V116[0];progress('Model Kalibrasyonu',`${day.title} geçmiş gerçek sonuçlarıyla model güveni ölçülüyor…`,5,'Kalibrasyon');
  await calculateCalibrationV116(day,p=>{const pct=((Number(p?.index)||0)+.35)/Math.max(1,Number(p?.total)||1)*100;progress('Model Kalibrasyonu',p?.text||'Hesaplanıyor…',pct,`${(Number(p?.index)||0)+1}/${Number(p?.total)||1}`);});
}
async function runAction(action){
  if(busy)return;busy=true;try{
    if(action==='program'){progress('Program yenileniyor','TJK günlük programı ve at kimlikleri kontrol ediliyor…',15,'Program');if(typeof loadProgram!=='function')throw new Error('Program yükleyici yok.');await loadProgram();}
    else if(action==='current'){progress('Güncel Analiz','Tüm kupon ayakları hesaplanıyor…',15,'Menü 1');await runMenuView('current','Güncel Analiz');}
    else if(action==='career'){progress('Kariyer Yol Haritası','Tüm kupon ayaklarının yarış öncesi kariyerleri hazırlanıyor…',15,'Menü 4');await runMenuView('career','Kariyer Yol Haritası');}
    else if(action==='scenario'){progress('Koşu Senaryosu','Tüm kupon ayakları için senaryo/tutarlılık kaydı hazırlanıyor…',20,'Menü 3');await runMenuView('scenario','Koşu Senaryosu');}
    else if(action==='winner')await completeWinner();
    else if(action==='models')await completeModels();
    else if(action==='calibration')await completeCalibration();
    progress('Tamamlandı','Veri yeniden denetleniyor…',100,'Kontrol');await delay(250);
  }catch(e){alert(`Veri tamamlanamadı: ${e?.name==='AbortError'?'İstek süre sınırını aştı.':e?.message||e}`);}finally{busy=false;renderAudit();}
}
async function runAllMissing(){
  if(busy)return;busy=true;try{
    let a=audit();const order=['program','current','career','scenario','winner','models','calibration'];
    for(let i=0;i<order.length;i++){
      const action=order[i];a=audit();if(!a.issues.some(x=>x.action===action))continue;
      progress('Eksikler otomatik tamamlanıyor',`${action} kaynağı hazırlanıyor…`,Math.round(i/order.length*100),`${i+1}/${order.length}`);
      if(action==='program'){if(typeof loadProgram!=='function')throw new Error('Program yükleyici yok.');await loadProgram();}
      else if(action==='current')await runMenuView('current','Güncel Analiz');
      else if(action==='career')await runMenuView('career','Kariyer Yol Haritası');
      else if(action==='scenario')await runMenuView('scenario','Koşu Senaryosu');
      else if(action==='winner')await completeWinner(a.raceNos);
      else if(action==='models')await completeModels(a.raceNos);
      else if(action==='calibration')await completeCalibration();
      await raf2();
    }
    progress('Eksik tamamlama bitti','Son veri denetimi yapılıyor…',100,'Bitti');await delay(300);
  }catch(e){alert(`Otomatik tamamlama durdu: ${e?.name==='AbortError'?'İstek süre sınırını aştı.':e?.message||e}`);}finally{busy=false;renderAudit();}
}

function channelFromRows(rows,keyFn,scoreFn){
  const list=(Array.isArray(rows)?rows:[]).map((r,i)=>({row:r,key:keyFn(r),raw:num(scoreFn(r)),rank:i+1})).filter(x=>x.key);
  if(!list.length)return null;const vals=list.map(x=>x.raw).filter(v=>v!==null);const min=vals.length?Math.min(...vals):null,max=vals.length?Math.max(...vals):null;
  const map=new Map();for(const x of list){let s;if(x.raw!==null&&max!==null&&min!==null&&max>min)s=35+(x.raw-min)/(max-min)*65;else s=list.length<=1?100:100-(x.rank-1)/(list.length-1)*65;map.set(x.key,{score:clamp(s),rank:x.rank,raw:x.raw,row:x.row});}
  return {map,topKey:list[0]?.key||null,count:list.length};
}
function modelChannel(modelData,id){
  if(!modelData||typeof rankRaceForModelV11!=='function')return null;let rows=[];try{rows=rankRaceForModelV11(modelData,id)||[];}catch{return null;}
  return channelFromRows(rows,r=>horseKey(r?.horse||r?.item?.horse||{}),r=>r?.score??r?.channel?.score);
}
function currentChannel(no){const r=raceItem(state?.analyses?.current,no);const rows=(r?.horses||[]).slice().sort((a,b)=>(num(a?.programAnalizSirasi)||999)-(num(b?.programAnalizSirasi)||999));return channelFromRows(rows,x=>horseKey(x?.horse||x),x=>x?.programAnalizSkoru);}
function careerChannel(no){const r=raceItem(state?.analyses?.career,no);const rows=(r?.horses||[]).slice().sort((a,b)=>(num(b?.galibiyetBenzerligi?.score)??-1)-(num(a?.galibiyetBenzerligi?.score)??-1));return channelFromRows(rows,x=>horseKey(x?.horse||x),x=>x?.galibiyetBenzerligi?.score);}
function winnerChannel(no){const w=winnerData(no);const rows=(w?.rows||[]).slice().sort((a,b)=>(num(b?.score)??-1)-(num(a?.score)??-1)||(num(a?.rank)||999)-(num(b?.rank)||999));return channelFromRows(rows,x=>horseKey({id:x?.id,no:x?.no,name:x?.name}),x=>x?.score);}

function channelWeights(){
  const w={...CHANNEL_BASE_WEIGHTS};for(const id of ['composite','exact','twin','family'])w[id]*=calibrationFactor(id);w.career5*=calibrationFactor('career');const sum=Object.values(w).reduce((a,b)=>a+b,0)||1;for(const k of Object.keys(w))w[k]/=sum;return w;
}
function legDecision(no){
  const race=raceByNo(no),model=modelMem.get(contextKey(no));if(!race||!model)return null;
  const channels={composite:modelChannel(model,'composite'),exact:modelChannel(model,'exact'),twin:modelChannel(model,'twin'),family:modelChannel(model,'family'),career5:modelChannel(model,'career'),current:currentChannel(no),careerRoad:careerChannel(no),winner:winnerChannel(no)};
  const weights=channelWeights();const horses=(race.horses||[]).map(h=>({horse:h,key:horseKey(h),sum:0,used:0,topVotes:0,top3Votes:0,parts:{}}));
  const available=Object.entries(channels).filter(([,c])=>c&&c.count);const availableTop=available.length;
  for(const item of horses){for(const [id,c] of available){const hit=c.map.get(item.key);if(!hit)continue;const w=weights[id]||0;item.sum+=hit.score*w;item.used+=w;item.parts[id]=hit;if(c.topKey===item.key)item.topVotes++;if(hit.rank<=3)item.top3Votes++;}item.consensus=item.used>0?item.sum/item.used:null;item.coverage=item.used;}
  const ranked=horses.filter(x=>x.consensus!==null).sort((a,b)=>b.consensus-a.consensus||b.topVotes-a.topVotes||(num(a.horse?.no)||999)-(num(b.horse?.no)||999));if(!ranked.length)return null;
  const top=ranked[0],second=ranked[1];const margin=top.consensus-(second?.consensus??0),agreement=availableTop?top.topVotes/availableTop*100:0;
  const cr=raceItem(state?.analyses?.current,no);const difficulty=clamp(cr?.difficulty?.skor??50);const wdata=winnerData(no)||{};const refCount=Number(wdata.referenceCount)||0,refQuality=clamp(wdata.referenceQuality||0);const refStrength=refQuality*Math.min(1,refCount/8);
  const cal=calibrationResult();let calQuality=0;if(cal){const arr=['composite','exact','twin','family','career'].map(id=>cal?.summary?.byFinish?.[1]?.[id]).filter(Boolean);const totals=arr.reduce((s,x)=>s+(Number(x.total)||0),0);const top3=arr.reduce((s,x)=>s+(Number(x.top3)||0),0);calQuality=totals?top3/totals*100:50;}
  const coverage=Object.keys(top.parts).reduce((s,id)=>s+(weights[id]||0),0);const marginStrength=clamp(margin*7);const leaderStrength=clamp(top.consensus);const ease=100-difficulty;
  let confidence=.22*leaderStrength+.26*marginStrength+.25*agreement+.15*ease+.07*refStrength+.05*calQuality;confidence*=.65+.35*clamp(coverage*100)/100;if(refCount<5)confidence-=5;if(refCount<3)confidence-=8;confidence=clamp(confidence);
  const bankoEligible=confidence>=72&&agreement>=55&&margin>=6&&coverage>=.72&&refCount>=5&&wdata.leakPassed===true&&!!cal;
  let width=confidence>=72?2:confidence>=60?3:confidence>=48?4:confidence>=38?5:6;if(difficulty>=70)width++;if(difficulty>=85)width++;if(margin<4)width++;if(agreement<40)width++;width=Math.min(Math.max(2,width),ranked.length);
  const reason=[];reason.push(`güven %${Math.round(confidence)}`);reason.push(`lider farkı ${margin.toFixed(1)}`);reason.push(`fikir birliği %${Math.round(agreement)}`);reason.push(`zorluk ${cr?.difficulty?.sinif||Math.round(difficulty)}`);reason.push(`kazanan ref ${refCount}`);if(!bankoEligible&&refCount<5)reason.push('ref<5: banko kapalı');
  return {raceNo:no,race,ranked,channels,availableChannels:available.map(([id])=>id),confidence,margin,agreement,difficulty,refCount,refQuality,coverage,bankoEligible,baseWidth:width,reason};
}
function costOf(counts,unit){let combos=1;for(const c of counts)combos*=Math.max(1,Number(c)||1);return{combinations:combos,cost:Math.round(combos*unit*100)/100};}
function decisionPlan(plan,budget,unit,requestedSingles){
  const legs=(plan.legs||[]).map(r=>legDecision(Number(r.no))).filter(Boolean);if(!legs.length)return null;
  const eligible=[...legs].filter(x=>x.bankoEligible).sort((a,b)=>b.confidence-a.confidence||b.margin-a.margin);const bankos=new Set(eligible.slice(0,Math.max(0,requestedSingles)).map(x=>x.raceNo));
  const counts=legs.map(x=>bankos.has(x.raceNo)?1:x.baseWidth);const minCounts=legs.map(x=>bankos.has(x.raceNo)?1:2);
  let money=costOf(counts,unit),guard=0;
  while(money.cost>budget&&guard++<100){const cand=legs.map((x,i)=>({i,conf:x.confidence,count:counts[i],min:minCounts[i]})).filter(x=>x.count>x.min).sort((a,b)=>b.conf-a.conf||b.count-a.count)[0];if(!cand)break;counts[cand.i]--;money=costOf(counts,unit);}
  // Bütçe çok rahatsa en riskli ayakları birer at genişlet; maksimum taban genişliğin +1'i.
  guard=0;while(money.cost<budget*.72&&guard++<30){const cand=legs.map((x,i)=>({i,conf:x.confidence,count:counts[i],max:Math.min(x.ranked.length,x.baseWidth+1)})).filter(x=>x.count<x.max).sort((a,b)=>a.conf-b.conf)[0];if(!cand)break;const test=[...counts];test[cand.i]++;const next=costOf(test,unit);if(next.cost>budget)break;counts[cand.i]++;money=next;}
  const outLegs=legs.map((x,i)=>({...x,count:counts[i],single:counts[i]===1,selections:x.ranked.slice(0,counts[i])}));
  const warnings=[];if(requestedSingles>bankos.size)warnings.push(`İstenen ${requestedSingles} bankodan yalnız ${bankos.size} tanesi güven koşullarını geçti; zorla banko yapılmadı.`);if(money.cost>budget)warnings.push(`Minimum güvenli genişlik ${money.cost} ₺; ${budget} ₺ bütçeye sığmıyor. Riskli ayağı zorla daraltmadım.`);
  for(const x of outLegs)if(x.refCount<5)warnings.push(`${x.raceNo}.K Kazanan Yolu yalnız ${x.refCount} referans: banko kapalı.`);
  return {type:plan?.desc?.type||'Bahis',startRace:plan?.startRace||outLegs[0]?.raceNo,budget,unitPrice:unit,requestedSingles,actualSingles:outLegs.filter(x=>x.single).length,combinations:money.combinations,cost:money.cost,overBudget:money.cost>budget,legs:outLegs,warnings};
}
function computeDecisions(){
  const budget=Math.max(1,num($('budget')?.value)??500),unit=Math.max(.01,num($('unitPrice')?.value)??1),singles=Math.max(0,Math.min(7,Math.floor(num($('singleCount')?.value)??1)));
  const plans=plansNow().filter(x=>x?.ok);const out=plans.map(p=>decisionPlan(p,budget,unit,singles)).filter(Boolean);return{version:VERSION,date:state.date,city:cityName(),createdAt:new Date().toISOString(),budget,unitPrice:unit,requestedSingles:singles,plans:out,calibrationUsed:calibrationResult()?.title||null};
}
function legHtml(x){const picks=x.selections.map(s=>`${esc(s.horse?.no??'')}. ${esc(s.horse?.name||'')}`).join(' · ');return `<div class="cdg-leg"><div class="cdg-leghead"><b>${x.raceNo}. Koşu · Güven %${Math.round(x.confidence)}</b><span class="cdg-badge ${x.single?'banko':''}">${x.single?'BANKO':`${x.count} AT`}</span></div><div class="cdg-meter"><i style="width:${Math.round(x.confidence)}%"></i></div><div class="cdg-picks">${picks}</div><div class="cdg-why">${esc(x.reason.join(' · '))}</div></div>`;}
function decisionHtml(d){return `<div class="cdg-card"><h3>🧠 Ayaklar arası Kupon Kararı</h3><p>Banko önce tek koşu içinde değil, kupondaki bütün ayakların güveni karşılaştırılarak seçildi.</p>${(d.plans||[]).map(p=>`<div class="cdg-plan"><b>${esc(p.type)} · ${p.combinations} kolon · ${p.cost} ₺</b>${p.legs.map(legHtml).join('')}${p.warnings.length?`<p class="cdg-yellow">${esc(p.warnings.join(' | '))}</p>`:''}</div>`).join('')}</div>`;}

function compactDecision(d){return{...d,plans:(d.plans||[]).map(p=>({...p,legs:p.legs.map(x=>({raceNo:x.raceNo,confidence:+x.confidence.toFixed(1),margin:+x.margin.toFixed(1),agreement:+x.agreement.toFixed(1),difficulty:+x.difficulty.toFixed(1),refCount:x.refCount,refQuality:x.refQuality,coverage:+x.coverage.toFixed(3),single:x.single,count:x.count,reason:x.reason,selections:x.selections.map(s=>({id:clean(s.horse?.id),no:s.horse?.no,name:s.horse?.name,score:+s.consensus.toFixed(1)}))}))}))};}
function applyDecisionToComposite(decisions){
  if(!Array.isArray(state?.tickets))return;for(const p of decisions.plans||[]){const t=state.tickets.find(x=>x?.modelId==='composite'&&clean(x?.type)===clean(p.type));if(!t)continue;t.modelLabel='Karar Motoru · Tüm Veriler';t.decisionVersion=VERSION;t.requestedSingles=p.requestedSingles;t.actualSingles=p.actualSingles;t.combinations=p.combinations;t.cost=p.cost;t.overBudget=p.overBudget;t.minimumCostExceeded=p.overBudget;t.warnings=[...(t.warnings||[]),...(p.warnings||[])];t.legs=(t.legs||[]).map(leg=>{const d=p.legs.find(x=>String(x.raceNo)===String(leg.raceNo));if(!d)return leg;return{...leg,single:d.single,selections:d.selections.map((s,i)=>({no:s.horse?.no,name:s.horse?.name,id:s.horse?.id||null,score:+s.consensus.toFixed(1),modelRank:i+1,decisionConfidence:+d.confidence.toFixed(1)}))};});}
}
function summaryHtml(d){
  const first=d?.plans?.[0];if(!first)return'';return `<div class="cdg-ticket-summary"><h3>🧠 ANA KUPON · Karar Motoru</h3><p>${esc(d.city)} · ${esc(d.date)} · bütün veri kaynakları denetlendi.</p><div class="cdg-chipbox"><span class="cdg-chip">${esc(first.type)}</span><span class="cdg-chip">${first.combinations} kolon</span><span class="cdg-chip">${first.cost} ₺</span><span class="cdg-chip">Banko ${first.actualSingles}</span></div>${first.legs.map(x=>`<div class="cdg-ticket-leg"><div class="cdg-ticket-head"><b>${x.raceNo}. Koşu · Güven %${Math.round(x.confidence)}</b><span class="cdg-badge ${x.single?'banko':''}">${x.single?'BANKO':`${x.count} AT`}</span></div><div class="cdg-ticket-picks">${x.selections.map(s=>`${esc(s.horse?.no)}. ${esc(s.horse?.name)}`).join(' · ')}</div><div class="cdg-ticket-note">${esc(x.reason.join(' · '))}</div></div>`).join('')}${first.warnings.length?`<p class="cdg-yellow">${esc(first.warnings.join(' | '))}</p>`:''}</div>`;}
function prependSummary(){const box=$('tickets'),d=state?.analyses?.couponDecisionV171;if(!box||!d?.plans?.length)return;box.querySelector('.cdg-ticket-summary')?.remove();box.insertAdjacentHTML('afterbegin',summaryHtml(d));box.classList.remove('empty');}

const basePrepare=typeof prepareRaceModelsV11==='function'?prepareRaceModelsV11:null;
if(basePrepare){prepareRaceModelsV11=async function(race,progressCb){const k=contextKey(race?.no);if(modelMem.has(k))return modelMem.get(k);const d=await basePrepare(race,progressCb);modelMem.set(k,d);return d;};}
const baseBuild=typeof buildTicketsV11==='function'?buildTicketsV11:(typeof buildTickets==='function'?buildTickets:null);
const baseRenderV11=typeof renderTicketsV11==='function'?renderTicketsV11:null;
if(baseRenderV11){renderTicketsV11=function(){baseRenderV11();prependSummary();};try{renderTickets=renderTicketsV11;}catch{}}

async function finalBuild(){
  if(busy)return;const a=audit();if(!a.ready){renderAudit();return;}busy=true;try{
    progress('Kupon Kararı hesaplanıyor','Ayaklar kendi aralarında karşılaştırılıyor; banko ve geniş ayaklar belirleniyor…',30,'Karar motoru');
    const d=computeDecisions();if(!d.plans.length)throw new Error('Geçerli bahis planı oluşturulamadı.');lastDecisions=d;state.analyses=state.analyses||{};state.analyses.couponDecisionV171=compactDecision(d);if(typeof save==='function')save();
    progress('Ana kupon oluşturuluyor','Karar Motoru seçimleri 5 Model kupon altyapısına uygulanıyor…',65,'Kupon');
    if(baseBuild)await baseBuild();applyDecisionToComposite(d);if(typeof save==='function')save();if(typeof renderTicketsV11==='function')renderTicketsV11();else prependSummary();
    progress('Kupon hazır','Tüm veri kaynakları kontrol edildi; ana kupon ve destek modelleri oluşturuldu.',100,'Bitti');await delay(450);closeScreen();setTimeout(()=>{$('tickets')?.scrollIntoView?.({behavior:'smooth',block:'start'});},80);
  }catch(e){alert(`Kupon Kararı oluşturulamadı: ${e?.message||e}`);}finally{busy=false;}
}

function takeover(){
  for(const id of ['buildAllBtn','ticketFromAnalysis']){const btn=$(id);if(!btn||btn.dataset.cdgV1671==='1')continue;btn.dataset.cdgV1671='1';btn.addEventListener('click',e=>{if(!e.isTrusted)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openScreen();},true);}
}
const obs=new MutationObserver(()=>takeover());try{obs.observe(document.documentElement,{subtree:true,childList:true});}catch{}
window.addEventListener('load',()=>setTimeout(takeover,60));ensureStyle();takeover();setTimeout(()=>{try{prependSummary();}catch{}},0);
window.ATCouponDecisionV1671={VERSION,audit,open:openScreen,completeWinner,completeModels,computeDecisions};
console.info('[AT AI]',VERSION,'aktif — eksik veri kapısı + ayaklar arası banko/genişlik kararı.');
})();