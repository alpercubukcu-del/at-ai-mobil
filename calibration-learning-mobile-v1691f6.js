/* AT AI Mobil — V16.9.1F6 Calibration Learning + Mobile Fullscreen
   - Kazanan Kalibrasyonu kayıtlarından örneklem güveni düzeltilmiş profil üretir.
   - Kariyer/Hazırlık at sırasını ASLA değiştirmez.
   - Kalibrasyon yalnız kuponun tek/dar/geniş kararına sınırlı güven katsayısı verir.
   - Kalibrasyon ekranı telefonda viewport dışına taşmaz; geniş tablolar kendi içinde kayar.
*/
(() => {
'use strict';
if (window.__AT_CALIBRATION_LEARNING_MOBILE_V1691F6__) return;
window.__AT_CALIBRATION_LEARNING_MOBILE_V1691F6__ = true;

const VERSION='CALIBRATION-LEARNING-MOBILE-V16.9.1F6';
const CAL_KEY='at_ai_winner_calibration_v1673';
const MIN_EFFECT_SAMPLE=8;
const FULL_EFFECT_SAMPLE=40;
let buildBusy=false;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const product=xs=>xs.reduce((a,b)=>a*Math.max(0,Number(b)||0),1);
const money=(counts,unit)=>{const combinations=product(counts);return{combinations,cost:Number((combinations*unit).toFixed(2))}};

function loadRows(){
  try{const x=JSON.parse(localStorage.getItem(CAL_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}
}
function modelMetric(rows,id){
  const ranks=(rows||[]).map(r=>finite(r?.ranks?.[id])).filter(n=>Number.isInteger(n)&&n>=1);
  const coverage=ranks.length;
  if(!coverage)return{coverage:0,top1Rate:0,top3Rate:0,avgRank:null,rawQuality:50,adjustedQuality:50};
  const top1=ranks.filter(x=>x===1).length/coverage;
  const top3=ranks.filter(x=>x<=3).length/coverage;
  const avg=ranks.reduce((a,b)=>a+b,0)/coverage;
  const rankQuality=clamp(1-(avg-1)/5,0,1);
  const raw=100*(top1*.55+top3*.35+rankQuality*.10);
  const reliability=clamp(coverage/FULL_EFFECT_SAMPLE,0,1);
  return{coverage,top1Rate:top1,top3Rate:top3,avgRank:Math.round(avg*100)/100,rawQuality:Math.round(raw),adjustedQuality:Math.round(50+(raw-50)*reliability)};
}
function calibrationProfile(){
  const rows=loadRows();
  const ids=['composite','exact','twin','family','career'];
  const weights={composite:.35,exact:.20,twin:.15,family:.10,career:.20};
  const metrics={};let sum=0,used=0;
  for(const id of ids){
    const m=modelMetric(rows,id);metrics[id]=m;
    if(m.coverage){sum+=m.adjustedQuality*weights[id];used+=weights[id]}
  }
  const sample=rows.length;
  const measured=used?sum/used:50;
  const sampleReliability=sample<MIN_EFFECT_SAMPLE?0:clamp((sample-MIN_EFFECT_SAMPLE)/(FULL_EFFECT_SAMPLE-MIN_EFFECT_SAMPLE),.15,1);
  const confidence=Math.round(50+(measured-50)*sampleReliability);
  const effect=sample<MIN_EFFECT_SAMPLE?0:clamp((confidence-50)/25,-1,1)*sampleReliability;
  const singleTop=Math.round(90-2*effect);
  const singleGap=Math.round(10-2*effect);
  const widthDelta=effect>=.55?-1:effect<=-.35?1:0;
  const extraBand=effect>=.55?19:effect<=-.35?26:22;
  const level=sample<MIN_EFFECT_SAMPLE?'ÖĞRENİYOR':confidence>=65?'GÜÇLÜ':confidence<45?'TEMKİNLİ':'NÖTR';
  return{version:VERSION,sample,confidence,level,effect:Number(effect.toFixed(3)),singleTop,singleGap,widthDelta,extraBand,metrics,rankingRule:'CAREER_ORDER_UNCHANGED',decisionRule:'CALIBRATION_ONLY_TICKET_BREADTH'};
}
window.ATWinnerCalibrationLearningV1691F6={version:VERSION,profile:calibrationProfile};

function injectStyle(){
  if($('calibrationLearningMobileStyleF6'))return;
  const s=document.createElement('style');s.id='calibrationLearningMobileStyleF6';s.textContent=`
#analysisDialog[data-winner-calibration-f6="1"]{
  position:fixed!important;inset:0!important;
  width:100vw!important;width:100dvw!important;max-width:100vw!important;max-width:100dvw!important;min-width:0!important;
  height:100vh!important;height:100dvh!important;max-height:100vh!important;max-height:100dvh!important;
  margin:0!important;padding:0!important;border:0!important;border-radius:0!important;
  overflow:hidden!important;box-sizing:border-box!important;
  display:flex!important;flex-direction:column!important;
}
#analysisDialog[data-winner-calibration-f6="1"] .toolbar{display:none!important}
#analysisDialog[data-winner-calibration-f6="1"] .dialog-head{
  flex:0 0 auto!important;width:100%!important;max-width:100%!important;min-width:0!important;
  box-sizing:border-box!important;margin:0!important;
  padding:12px 14px!important;padding-top:max(12px,env(safe-area-inset-top))!important;
}
#analysisDialog[data-winner-calibration-f6="1"] #analysisContent{
  flex:1 1 auto!important;min-height:0!important;min-width:0!important;
  width:100%!important;max-width:100%!important;margin:0!important;
  padding:12px 12px calc(18px + env(safe-area-inset-bottom))!important;
  overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;
  box-sizing:border-box!important;overscroll-behavior:contain!important;
}
#analysisDialog[data-winner-calibration-f6="1"] .wcal-wrap,
#analysisDialog[data-winner-calibration-f6="1"] .wcal-card,
#analysisDialog[data-winner-calibration-f6="1"] .wcal-grid,
#analysisDialog[data-winner-calibration-f6="1"] .wcal-btns{
  width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;
}
#analysisDialog[data-winner-calibration-f6="1"] .wcal-card{overflow:hidden!important}
#analysisDialog[data-winner-calibration-f6="1"] .wcal-card p,
#analysisDialog[data-winner-calibration-f6="1"] .wcal-card h3,
#analysisDialog[data-winner-calibration-f6="1"] .wcal-chip{overflow-wrap:anywhere!important;word-break:break-word!important}
#analysisDialog[data-winner-calibration-f6="1"] .wcal-grid{grid-template-columns:minmax(0,1fr)!important}
#analysisDialog[data-winner-calibration-f6="1"] .wcal-grid label,
#analysisDialog[data-winner-calibration-f6="1"] .wcal-grid select,
#analysisDialog[data-winner-calibration-f6="1"] .wcal-grid button,
#analysisDialog[data-winner-calibration-f6="1"] .wcal-btns button{
  min-width:0!important;max-width:100%!important;width:100%!important;box-sizing:border-box!important;white-space:normal!important;
}
#analysisDialog[data-winner-calibration-f6="1"] .wcal-scroll{
  display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;
  overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important;
}
#analysisDialog[data-winner-calibration-f6="1"] .wcal-table{width:max-content!important;min-width:680px!important;max-width:none!important}
.cal-learning-card-f6{border:1px solid rgba(126,226,168,.24)!important;background:rgba(126,226,168,.055)!important}
.cal-learning-meter-f6{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:9px 0}
.cal-learning-meter-f6 i{display:block;height:100%;background:linear-gradient(90deg,#2bb7ff,#7ee2a8)}
@media(max-width:560px){
 #analysisDialog[data-winner-calibration-f6="1"] #analysisContent{padding-left:10px!important;padding-right:10px!important}
 #analysisDialog[data-winner-calibration-f6="1"] .wcal-card{padding:11px!important}
}
`;
  document.head.appendChild(s);
}
function markCalibration(){
  injectStyle();const d=$('analysisDialog');if(!d)return;
  d.dataset.winnerCalibrationF6='1';d.classList.add('calibration-dialog-v116');
  try{d.scrollLeft=0;document.documentElement.scrollLeft=0;document.body.scrollLeft=0}catch{}
  setTimeout(decorateCalibration,0);
}
function unmarkCalibration(){const d=$('analysisDialog');if(d)delete d.dataset.winnerCalibrationF6;}
function profileHtml(p){
  const width=clamp(p.confidence,0,100);
  const effect=p.sample<MIN_EFFECT_SAMPLE?'Henüz kupona etki etmiyor.':p.widthDelta<0?'Kuponu gerektiğinde 1 kademe daraltır.':p.widthDelta>0?'Kuponu gerektiğinde 1 kademe genişletir.':'Kupon genişliği nötr kalır.';
  return `<div class="wcal-card cal-learning-card-f6" id="winnerCalibrationLearningCardF6"><h3>🧠 Kalibrasyon Güven Profili</h3><p><b>${p.sample} yarış · Güven %${p.confidence} · ${p.level}</b></p><div class="cal-learning-meter-f6"><i style="width:${width}%"></i></div><p>At sırası değişmez. Kalibrasyon yalnız kuponun tek/dar/geniş kararını etkiler. ${effect}</p><div class="wcal-chips"><span class="wcal-chip">Tek eşiği ${p.singleTop}</span><span class="wcal-chip">Fark eşiği ${p.singleGap}</span><span class="wcal-chip">Sıra: Kariyer/Hazırlık</span></div></div>`;
}
function decorateCalibration(){
  const d=$('analysisDialog');if(!d||d.dataset.winnerCalibrationF6!=='1')return;
  const wrap=d.querySelector('.wcal-wrap');if(!wrap)return;
  const p=calibrationProfile();
  const old=$('winnerCalibrationLearningCardF6');
  if(old){const tmp=document.createElement('div');tmp.innerHTML=profileHtml(p);old.replaceWith(tmp.firstElementChild);return;}
  const first=wrap.querySelector('.wcal-card');if(first)first.insertAdjacentHTML('afterend',profileHtml(p));else wrap.insertAdjacentHTML('afterbegin',profileHtml(p));
}

try{
  const baseOpen=typeof openCalibrationV116==='function'?openCalibrationV116:null;
  if(baseOpen){
    openCalibrationV116=function(...args){const r=baseOpen.apply(this,args);markCalibration();requestAnimationFrame(markCalibration);return r;};
  }
}catch(e){console.warn('[AT AI] F6 calibration open wrap kurulamadı',e)}
document.addEventListener('click',event=>{
  const target=event.target?.closest?.('[data-view="calibration"],#winnerCalRefreshV1673,#winnerCalRunV1673');
  if(target){setTimeout(markCalibration,0);setTimeout(decorateCalibration,180);setTimeout(decorateCalibration,900)}
  if(event.target?.closest?.('#closeDialog'))setTimeout(unmarkCalibration,0);
},true);
window.addEventListener('pageshow',()=>{const d=$('analysisDialog');if(d?.open&&clean($('dialogTitle')?.textContent)==='Kazanan Kalibrasyonu')markCalibration()},{passive:true});

function selectedTypes(){return[...document.querySelectorAll('.bet-check:checked')].map(x=>clean(x.value)).filter(Boolean)}
function scoreRows(no){try{return window.ATCouponCareerOnlyV1691F1?.scoreRows?.(no)||[]}catch{return[]}}
function safePlan(type){try{return typeof resolveBetStartV11==='function'?resolveBetStartV11(type):{ok:false,error:'Bahis başlangıcı bulunamadı.',desc:{type}}}catch(e){return{ok:false,error:e?.message||String(e),desc:{type}}}}
function singleInfo(ranking,p){
  if(ranking.length===1)return{qualified:true,strength:999,gap:999};
  const top=ranking[0]?.score??0,second=ranking[1]?.score??0,gap=top-second;
  return{qualified:top>=p.singleTop&&gap>=p.singleGap,strength:top+gap*1.5+p.confidence*.03,gap};
}
function naturalWidth(ranking,p){
  const n=ranking.length;if(n<=2)return n;
  const top=ranking[0]?.score??0;let count=ranking.filter(x=>x.score>=top-10).length;
  count=Math.max(2,Math.min(5,count));const g12=top-(ranking[1]?.score??0);
  if(g12>=8)count=Math.min(count,2);else if(g12>=5)count=Math.min(count,3);else if(g12>=3)count=Math.max(count,3);else count=Math.max(count,4);
  count=clamp(count+p.widthDelta,2,5);return Math.min(n,count);
}
function nextAllowed(ranking,index,p){const row=ranking[index];if(!row)return false;const top=ranking[0]?.score??0;return row.score>=Math.max(45,top-p.extraBand)}
function buildTicket(plan,type,budget,unitPrice,maxSingles,p){
  const version='CAREER-COUPON-V16.9.1F6-CALIBRATED-WIDTH';
  if(!plan?.ok)return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:version,type,available:false,error:plan?.error||'Bahis başlangıcı bulunamadı.',source:'CAREER_PREPARATION_RANKING'};
  const legsData=plan.legs.map(race=>({race,ranking:scoreRows(race.no)}));
  const noData=legsData.filter(x=>!x.ranking.length);if(noData.length)return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:version,type,available:false,error:`${noData.map(x=>`${x.race.no}. koşu`).join(', ')} için Kariyer/Hazırlık puanı yok.`,source:'CAREER_PREPARATION_RANKING'};
  const candidates=legsData.map((x,i)=>({i,...singleInfo(x.ranking,p)})).filter(x=>x.qualified).sort((a,b)=>b.strength-a.strength).slice(0,Math.max(0,maxSingles));
  const singles=new Set(candidates.map(x=>x.i));const counts=legsData.map((x,i)=>singles.has(i)?1:naturalWidth(x.ranking,p));let m=money(counts,unitPrice);
  while(m.cost>budget){let drop=null;for(let i=0;i<legsData.length;i++){const min=singles.has(i)?1:Math.min(2,legsData[i].ranking.length);if(counts[i]<=min)continue;const last=legsData[i].ranking[counts[i]-1],top=legsData[i].ranking[0];const value=(last?.score??0)-(top?.score??0);if(!drop||value<drop.value)drop={i,value};}if(!drop)break;counts[drop.i]--;m=money(counts,unitPrice)}
  if(m.cost<=budget){while(true){let best=null;for(let i=0;i<legsData.length;i++){if(singles.has(i))continue;const ranking=legsData[i].ranking;if(counts[i]>=ranking.length||!nextAllowed(ranking,counts[i],p))continue;const trial=[...counts];trial[i]++;const nm=money(trial,unitPrice);if(nm.cost>budget)continue;const next=ranking[counts[i]],extra=Math.max(.0001,nm.cost-m.cost),value=(next?.score??0)/extra;if(!best||value>best.value)best={i,value,nm};}if(!best)break;counts[best.i]++;m=best.nm}}
  const legs=legsData.map((x,i)=>({raceNo:x.race.no,raceClass:x.race.class||'',distance:x.race.distance||'',track:x.race.track||'',single:counts[i]===1,selections:x.ranking.slice(0,counts[i]).map((r,j)=>({no:r.horse?.no,name:r.horse?.name,id:r.horse?.id||null,score:r.score,modelRank:j+1,analysisMode:r.item?.galibiyetBenzerligi?.fallback?'CURRENT_CAREER_PREPARATION_FALLBACK_V1':'HISTORICAL_CAREER_SIMILARITY'})),ranking:x.ranking.map((r,j)=>({no:r.horse?.no,name:r.horse?.name,score:r.score,rank:j+1}))}));
  const warnings=[];
  if(p.sample<MIN_EFFECT_SAMPLE)warnings.push(`Kalibrasyon ${p.sample}/${MIN_EFFECT_SAMPLE}: öğrenme aşamasında; kupon eşikleri nötr tutuldu.`);else warnings.push(`Kalibrasyon güveni %${p.confidence} (${p.level}); yalnız tek/dar/geniş kararı ayarlandı, at sırası değişmedi.`);
  if(maxSingles>0&&candidates.length<maxSingles)warnings.push(`En fazla ${maxSingles} tekten ${candidates.length} ayak kalibre güvenli tek eşiğini geçti.`);
  if(m.cost>budget)warnings.push('En az 2 at kuralı korununca minimum kupon maliyeti bütçeyi aşıyor.');
  return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:version,scoreVersion:VERSION,type,modelId:'career',modelLabel:'Kariyer / Hazırlık',available:true,city:(typeof getCityName==='function'?getCityName():''),date:state?.date,startRace:plan.startRace,startLabel:plan.startLabel,startInferred:plan.inferred,budget,unitPrice,requestedSingles:maxSingles,actualSingles:legs.filter(x=>x.single).length,combinations:m.combinations,cost:m.cost,overBudget:m.cost>budget,minimumCostExceeded:m.cost>budget,warnings,legs,source:'CAREER_PREPARATION_RANKING',calibrationProfile:{sample:p.sample,confidence:p.confidence,level:p.level,singleTop:p.singleTop,singleGap:p.singleGap,widthDelta:p.widthDelta,rankingRule:p.rankingRule},generatedAt:new Date().toISOString()};
}
async function buildCalibratedTickets(){
  if(buildBusy)return;const api=window.ATCouponCareerOnlyV1691F1;const audit=api?.audit?.();if(!audit?.ready){window.ATCouponDecisionV1671?.open?.();return}buildBusy=true;
  try{
    const p=calibrationProfile(),types=selectedTypes(),plans=types.map(safePlan),budget=Math.max(1,Number($('budget')?.value)||500),unitPrice=Math.max(.01,Number($('unitPrice')?.value)||1),maxSingles=Math.max(0,Math.min(7,Math.floor(Number($('singleCount')?.value)||0)));
    const tickets=plans.map((plan,i)=>buildTicket(plan,plan?.desc?.type||types[i]||'Bahis',budget,unitPrice,maxSingles,p));
    state.tickets=tickets;state.analyses=state.analyses||{};state.analyses.ticketV11={version:'CAREER-COUPON-V16.9.1F6-CALIBRATED-WIDTH',scoreVersion:VERSION,source:'CAREER_PREPARATION_RANKING',calibrationConfidence:p.confidence,calibrationSample:p.sample,rankingChanged:false,date:state?.date,city:state?.city,generatedAt:new Date().toISOString(),raceNos:audit.raceNos};
    try{if(typeof save==='function')save()}catch{}
    if(typeof renderTicketsV11==='function')renderTicketsV11();else if(typeof renderTickets==='function')renderTickets();
    const msg=$('cdgBodyV1671');if(msg){const card=document.createElement('div');card.className='cdg-card';card.innerHTML=`<h3>Kupon hazır · Kalibrasyon güveni %${p.confidence}</h3><p>At sırası Kariyer/Hazırlık olarak korundu; kalibrasyon yalnız tek/dar/geniş kararına uygulandı.</p>`;msg.prepend(card)}
    setTimeout(()=>{try{$('cdgCloseV1671')?.click()}catch{}try{$('tickets')?.scrollIntoView?.({behavior:'smooth',block:'start'})}catch{}},280);
  }catch(e){console.error('[AT AI] F6 kalibre kupon',e);alert(`Kupon oluşturulamadı: ${e?.message||e}`)}finally{buildBusy=false}
}
function decorateGate(){
  const body=$('cdgBodyV1671');if(!body)return;const p=calibrationProfile();let card=$('couponCalibrationProfileF6');
  const html=`<h3>🧠 Kalibrasyon etkisi</h3><p><b>${p.sample} yarış · güven %${p.confidence} · ${p.level}</b><br>Atların Kariyer/Hazırlık sırası değişmez. Kalibrasyon yalnız tek/dar/geniş kararına uygulanır.</p><div class="cdg-chipbox"><span class="cdg-chip">Tek ≥ ${p.singleTop}</span><span class="cdg-chip">Fark ≥ ${p.singleGap}</span><span class="cdg-chip">Genişlik ${p.widthDelta>0?'+1':p.widthDelta<0?'-1':'nötr'}</span></div>`;
  if(card){card.innerHTML=html;return}card=document.createElement('div');card.id='couponCalibrationProfileF6';card.className='cdg-card';card.innerHTML=html;body.insertBefore(card,body.children[1]||null);
}

const oldDecisionOpen=window.ATCouponDecisionV1671?.open;
if(typeof oldDecisionOpen==='function')window.ATCouponDecisionV1671.open=async function(...args){const r=await oldDecisionOpen.apply(this,args);setTimeout(decorateGate,0);return r};
if(window.ATCouponCareerOnlyV1691F1)window.ATCouponCareerOnlyV1691F1.buildCareerTickets=buildCalibratedTickets;
try{buildTicketsV11=buildCalibratedTickets}catch{}
try{buildTickets=buildCalibratedTickets}catch{}
document.addEventListener('click',event=>{
  const b=event.target?.closest?.('#careerOnlyBuildV1691F1');
  if(b&&event.isTrusted){event.preventDefault();event.stopImmediatePropagation();void buildCalibratedTickets();return}
  if(event.target?.closest?.('#buildAllBtn,#careerOnlyCheckV1691F1')){setTimeout(decorateGate,80);setTimeout(decorateGate,300)}
},true);

injectStyle();
console.info('[AT AI]',VERSION,'aktif — kalibrasyon kupon genişliğine bağlı; Kariyer/Hazırlık sırası değişmez; mobil kalibrasyon tam ekran.');
})();
