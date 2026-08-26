/* AT AI Mobil — V16.9.1F8 Kupon: Kariyer/Hazırlık + yalnız gerçek debut için Güncel Analiz
   - 5 Model kupon üretiminde kullanılmaz ve beklenmez.
   - Kariyeri olan at: Kariyer/Hazırlık galibiyetBenzerligi.score.
   - Gerçek debut: Güncel Analiz programAnalizSkoru.
   - Kalibrasyon yalnız tek/dar/geniş kararını etkiler; puan kaynağını değiştirmez.
   - Kazanan Kalibrasyonu mobil tam ekran görünür.
*/
(() => {
'use strict';
if (window.__AT_COUPON_CAREER_DEBUT_CURRENT_V1691F8__) return;
window.__AT_COUPON_CAREER_DEBUT_CURRENT_V1691F8__=true;
const VERSION='COUPON-CAREER-DEBUT-CURRENT-V16.9.1F8';
const SOURCE='CAREER_PREPARATION_WITH_CURRENT_ANALYSIS_DEBUT';
const CAL_KEY='at_ai_winner_calibration_v1673';
const MIN_EFFECT_SAMPLE=8,FULL_EFFECT_SAMPLE=40;
let busy=false;
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const product=xs=>xs.reduce((a,b)=>a*Math.max(0,Number(b)||0),1);
const money=(counts,unit)=>{const combinations=product(counts);return{combinations,cost:Number((combinations*unit).toFixed(2))}};
const waitPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
function sameDate(a,b){return clean(a)===clean(b)}
function sameHorse(a,b){
  const ai=clean(a?.id??a?.horseId),bi=clean(b?.id??b?.horseId);if(ai&&bi)return ai===bi;
  const an=finite(a?.no),bn=finite(b?.no);if(an!==null&&bn!==null)return an===bn;
  return clean(a?.name).toLocaleUpperCase('tr-TR')===clean(b?.name).toLocaleUpperCase('tr-TR');
}
function careerRace(no){
  const c=state?.analyses?.career;if(!c||!sameDate(c?.date,state?.date))return null;
  return(Array.isArray(c?.races)?c.races:[]).find(r=>String(r?.no)===String(no))||null;
}
function currentRace(no){
  const c=state?.analyses?.current;if(!c||!sameDate(c?.date,state?.date)||String(c?.city)!==String(state?.city))return null;
  return(Array.isArray(c?.races)?c.races:[]).find(r=>String(r?.no)===String(no))||null;
}
function currentRow(no,item){
  const r=currentRace(no),rows=Array.isArray(r?.horses)?r.horses:[];
  return rows.find(x=>sameHorse(x?.horse||x,item?.horse||item))||null;
}
function careerCount(item){
  const c=item?.career||{};
  const arrays=[c.fullPathBefore,c.history,c.fullHistory,c.roadmap,c.races,c.preparationPath,c.top5,c.recentForm];
  let n=0;for(const a of arrays)if(Array.isArray(a))n=Math.max(n,a.length);
  n=Math.max(n,Number(c.fullPathBeforeCount)||0,Number(item?.galibiyetBenzerligi?.fallbackMetrics?.careerCount)||0);
  return n;
}
function isRealDebut(item,row){
  if(careerCount(item)>0)return false;
  if(row?.careerOk===true&&Number(row?.history?.rowCount||0)===0)return true;
  return item?.career?.ok===true&&careerCount(item)===0;
}
function hybridScoreRows(no){
  const r=careerRace(no);if(!r)return[];
  const out=[];
  for(const item of(Array.isArray(r?.horses)?r.horses:[])){
    const horse=item?.horse||{};
    const careerScore=finite(item?.galibiyetBenzerligi?.score);
    const cur=currentRow(no,item);
    if(careerScore!==null){out.push({item,horse,score:careerScore,scoreSource:'CAREER_PREPARATION',debut:false,currentRow:cur});continue;}
    if(isRealDebut(item,cur)){
      const currentScore=finite(cur?.programAnalizSkoru);
      if(currentScore!==null)out.push({item,horse,score:currentScore,scoreSource:'CURRENT_ANALYSIS_DEBUT',debut:true,currentRow:cur});
    }
  }
  return out.sort((a,b)=>b.score-a.score||Number(a?.horse?.no||999)-Number(b?.horse?.no||999));
}
function debutNeedsCurrent(no){
  const r=careerRace(no);if(!r)return[];
  return(Array.isArray(r?.horses)?r.horses:[]).filter(item=>{
    if(finite(item?.galibiyetBenzerligi?.score)!==null)return false;
    const cur=currentRow(no,item);
    const careerKnown=careerCount(item)>0;
    if(careerKnown)return false;
    if(cur?.careerOk===true&&Number(cur?.history?.rowCount||0)===0)return finite(cur?.programAnalizSkoru)===null;
    return item?.career?.ok===true&&finite(cur?.programAnalizSkoru)===null;
  });
}
async function runCurrentRace(no){
  if(typeof runAnalysis!=='function')throw new Error('Güncel Analiz hesaplama fonksiyonu bulunamadı.');
  const d=$('analysisDialog'),s=$('analysisRace'),oldView=d?.dataset?.view,oldVal=s?.value;
  try{
    if(d)d.dataset.view='current';
    if(s){s.value=String(no);if(s.value!==String(no))throw new Error(`${no}.K Güncel Analiz seçicisinde bulunamadı.`)}
    await waitPaint();await runAnalysis();await waitPaint();
  }finally{
    if(d){if(oldView)d.dataset.view=oldView;else delete d.dataset.view}
    if(s&&oldVal!==undefined)s.value=oldVal;
  }
}
async function ensureDebutCurrent(raceNos){
  const list=[];
  for(const no of raceNos||[])if(debutNeedsCurrent(no).length)list.push(no);
  for(let i=0;i<list.length;i++){
    const body=$('cdgBodyV1671');if(body){const c=document.createElement('div');c.className='cdg-card';c.id='debutCurrentProgressF8';c.innerHTML=`<h3>Debut Güncel puanı hazırlanıyor</h3><p>${i+1}/${list.length} · ${list[i]}. Koşu</p>`;const old=$('debutCurrentProgressF8');if(old)old.replaceWith(c);else body.prepend(c)}
    await runCurrentRace(list[i]);
  }
  $('debutCurrentProgressF8')?.remove();
  return list;
}
function selectedTypes(){return[...document.querySelectorAll('.bet-check:checked')].map(x=>clean(x.value)).filter(Boolean)}
function safePlan(type){try{return typeof resolveBetStartV11==='function'?resolveBetStartV11(type):{ok:false,error:'Bahis başlangıcı bulunamadı.',desc:{type}}}catch(e){return{ok:false,error:e?.message||String(e),desc:{type}}}}
function requiredRaceNos(){const set=new Set();for(const type of selectedTypes()){const p=safePlan(type);if(p?.ok)for(const r of p.legs||[])if(Number(r?.no)>0)set.add(Number(r.no))}return[...set].sort((a,b)=>a-b)}
function loadCal(){try{const x=JSON.parse(localStorage.getItem(CAL_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function metric(rows,id){
  const rs=rows.map(r=>finite(r?.ranks?.[id])).filter(n=>Number.isInteger(n)&&n>=1);if(!rs.length)return{coverage:0,q:50};
  const top1=rs.filter(x=>x===1).length/rs.length,top3=rs.filter(x=>x<=3).length/rs.length,avg=rs.reduce((a,b)=>a+b,0)/rs.length;
  const raw=100*(top1*.55+top3*.35+clamp(1-(avg-1)/5,0,1)*.10),rel=clamp(rs.length/FULL_EFFECT_SAMPLE,0,1);
  return{coverage:rs.length,q:50+(raw-50)*rel};
}
function calibrationProfile(){
  const rows=loadCal(),weights={composite:.35,exact:.20,twin:.15,family:.10,career:.20};let sum=0,used=0;
  for(const[id,w]of Object.entries(weights)){const m=metric(rows,id);if(m.coverage){sum+=m.q*w;used+=w}}
  const sample=rows.length,measured=used?sum/used:50,rel=sample<MIN_EFFECT_SAMPLE?0:clamp((sample-MIN_EFFECT_SAMPLE)/(FULL_EFFECT_SAMPLE-MIN_EFFECT_SAMPLE),.15,1);
  const confidence=Math.round(50+(measured-50)*rel),effect=sample<MIN_EFFECT_SAMPLE?0:clamp((confidence-50)/25,-1,1)*rel;
  return{sample,confidence,level:sample<MIN_EFFECT_SAMPLE?'ÖĞRENİYOR':confidence>=65?'GÜÇLÜ':confidence<45?'TEMKİNLİ':'NÖTR',singleTop:Math.round(90-2*effect),singleGap:Math.round(10-2*effect),widthDelta:effect>=.55?-1:effect<=-.35?1:0,extraBand:effect>=.55?19:effect<=-.35?26:22};
}
function singleInfo(ranking,p){if(ranking.length===1)return{qualified:true,strength:999,gap:999};const top=ranking[0]?.score??0,second=ranking[1]?.score??0,gap=top-second;return{qualified:top>=p.singleTop&&gap>=p.singleGap,strength:top+gap*1.5+p.confidence*.03,gap}}
function naturalWidth(ranking,p){const n=ranking.length;if(n<=2)return n;const top=ranking[0]?.score??0;let c=ranking.filter(x=>x.score>=top-10).length;c=Math.max(2,Math.min(5,c));const g=top-(ranking[1]?.score??0);if(g>=8)c=Math.min(c,2);else if(g>=5)c=Math.min(c,3);else if(g>=3)c=Math.max(c,3);else c=Math.max(c,4);return Math.min(n,clamp(c+p.widthDelta,2,5))}
function nextAllowed(ranking,index,p){const row=ranking[index];if(!row)return false;const top=ranking[0]?.score??0;return row.score>=Math.max(35,top-p.extraBand)}
function buildTicket(plan,type,budget,unit,maxSingles,p){
  const cv='CAREER-COUPON-V16.9.1F8-DEBUT-CURRENT';
  if(!plan?.ok)return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:cv,type,available:false,error:plan?.error||'Bahis başlangıcı bulunamadı.',source:SOURCE};
  const data=plan.legs.map(race=>({race,ranking:hybridScoreRows(race.no)})),noData=data.filter(x=>!x.ranking.length);
  if(noData.length)return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:cv,type,available:false,error:`${noData.map(x=>`${x.race.no}.K`).join(', ')} için kupon sıralaması oluşmadı.`,source:SOURCE};
  const candidates=data.map((x,i)=>({i,...singleInfo(x.ranking,p)})).filter(x=>x.qualified).sort((a,b)=>b.strength-a.strength).slice(0,Math.max(0,maxSingles));
  const singles=new Set(candidates.map(x=>x.i)),counts=data.map((x,i)=>singles.has(i)?1:naturalWidth(x.ranking,p));let m=money(counts,unit);
  while(m.cost>budget){let drop=null;for(let i=0;i<data.length;i++){const min=singles.has(i)?1:Math.min(2,data[i].ranking.length);if(counts[i]<=min)continue;const last=data[i].ranking[counts[i]-1],top=data[i].ranking[0],value=(last?.score??0)-(top?.score??0);if(!drop||value<drop.value)drop={i,value}}if(!drop)break;counts[drop.i]--;m=money(counts,unit)}
  if(m.cost<=budget)while(true){let best=null;for(let i=0;i<data.length;i++){if(singles.has(i))continue;const r=data[i].ranking;if(counts[i]>=r.length||!nextAllowed(r,counts[i],p))continue;const trial=[...counts];trial[i]++;const nm=money(trial,unit);if(nm.cost>budget)continue;const next=r[counts[i]],value=(next?.score??0)/Math.max(.0001,nm.cost-m.cost);if(!best||value>best.value)best={i,value,nm}}if(!best)break;counts[best.i]++;m=best.nm}
  const legs=data.map((x,i)=>({raceNo:x.race.no,raceClass:x.race.class||'',distance:x.race.distance||'',track:x.race.track||'',single:counts[i]===1,selections:x.ranking.slice(0,counts[i]).map((r,j)=>({no:r.horse?.no,name:r.horse?.name,id:r.horse?.id||null,score:r.score,modelRank:j+1,scoreSource:r.scoreSource,analysisMode:r.debut?'CURRENT_ANALYSIS_DEBUT_V16.5.7':r.item?.galibiyetBenzerligi?.fallback?'CURRENT_CAREER_PREPARATION_FALLBACK_V1':'HISTORICAL_CAREER_SIMILARITY'})),ranking:x.ranking.map((r,j)=>({no:r.horse?.no,name:r.horse?.name,score:r.score,rank:j+1,scoreSource:r.scoreSource}))}));
  const warnings=[p.sample<MIN_EFFECT_SAMPLE?`Kalibrasyon ${p.sample}/${MIN_EFFECT_SAMPLE}: öğreniyor; eşikler nötr.`:`Kalibrasyon güveni %${p.confidence} (${p.level}); yalnız kupon genişliği etkilenir.`];
  const debutCount=legs.reduce((s,l)=>s+l.ranking.filter(r=>r.scoreSource==='CURRENT_ANALYSIS_DEBUT').length,0);if(debutCount)warnings.push(`${debutCount} debut at Güncel Analiz puanıyla sıralamaya dahil edildi.`);
  if(maxSingles>0&&candidates.length<maxSingles)warnings.push(`En fazla ${maxSingles} tekten ${candidates.length} ayak güvenli tek eşiğini geçti.`);if(m.cost>budget)warnings.push('En az 2 at kuralı korununca minimum maliyet bütçeyi aşıyor.');
  return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:cv,scoreVersion:VERSION,type,modelId:'career',modelLabel:'Kariyer/Hazırlık · Debut=Güncel',available:true,city:typeof getCityName==='function'?getCityName():'',date:state?.date,startRace:plan.startRace,startLabel:plan.startLabel,startInferred:plan.inferred,budget,unitPrice:unit,requestedSingles:maxSingles,actualSingles:legs.filter(x=>x.single).length,combinations:m.combinations,cost:m.cost,overBudget:m.cost>budget,minimumCostExceeded:m.cost>budget,warnings,legs,source:SOURCE,calibrationProfile:p,generatedAt:new Date().toISOString()};
}
function hardIssues(base){return(base?.issues||[]).filter(x=>x?.id!=='career-score')}
async function buildHybridTickets(){
  if(busy)return;busy=true;
  try{
    const api=window.ATCouponCareerOnlyV1691F1,base=api?.audit?.()||{raceNos:requiredRaceNos(),issues:[]};
    const hard=hardIssues(base);if(hard.length){await window.ATCouponDecisionV1671?.open?.();decorateGate();return}
    const raceNos=base.raceNos?.length?base.raceNos:requiredRaceNos();await ensureDebutCurrent(raceNos);
    const empty=raceNos.filter(no=>!hybridScoreRows(no).length);if(empty.length)throw new Error(`${empty.map(x=>`${x}.K`).join(', ')} için Kariyer/Hazırlık veya debut Güncel puanı yok.`);
    const types=selectedTypes(),plans=types.map(safePlan),p=calibrationProfile(),budget=Math.max(1,Number($('budget')?.value)||500),unit=Math.max(.01,Number($('unitPrice')?.value)||1),maxSingles=Math.max(0,Math.min(7,Math.floor(Number($('singleCount')?.value)||0)));
    const tickets=plans.map((plan,i)=>buildTicket(plan,plan?.desc?.type||types[i]||'Bahis',budget,unit,maxSingles,p));
    state.tickets=tickets;state.analyses=state.analyses||{};state.analyses.ticketV11={version:'CAREER-COUPON-V16.9.1F8-DEBUT-CURRENT',scoreVersion:VERSION,source:SOURCE,fiveModelUsed:false,debutRule:'CURRENT_ANALYSIS_ONLY_WHEN_NO_PRE_RACE_CAREER',calibrationConfidence:p.confidence,calibrationSample:p.sample,date:state?.date,city:state?.city,generatedAt:new Date().toISOString(),raceNos};
    try{if(typeof save==='function')save()}catch{}
    if(typeof renderTicketsV11==='function')renderTicketsV11();else if(typeof renderTickets==='function')renderTickets();
    const body=$('cdgBodyV1671');if(body){const card=document.createElement('div');card.className='cdg-card';card.innerHTML='<h3>Kupon hazır</h3><p>Kariyeri olanlar Kariyer/Hazırlık; gerçek debutlar Güncel Analiz puanıyla sıralandı. 5 Model kullanılmadı.</p>';body.prepend(card)}
    setTimeout(()=>{try{$('cdgCloseV1671')?.click()}catch{}try{$('tickets')?.scrollIntoView?.({behavior:'smooth',block:'start'})}catch{}},250);
  }catch(e){console.error('[AT AI] F8 hybrid coupon',e);alert(`Kupon oluşturulamadı: ${e?.message||e}`)}finally{busy=false}
}
function decorateGate(){
  const body=$('cdgBodyV1671');if(!body)return;let card=$('couponHybridSourceF8');
  const raceNos=requiredRaceNos(),debut=raceNos.reduce((s,no)=>s+(careerRace(no)?.horses||[]).filter(x=>finite(x?.galibiyetBenzerligi?.score)===null&&careerCount(x)===0).length,0),p=calibrationProfile();
  const html=`<h3>Kupon puan kaynağı</h3><p><b>5 Model kullanılmaz.</b><br>Kariyeri olan at = Kariyer/Hazırlık puanı.<br>İlk kez koşacak at = Güncel Analiz puanı.</p><div class="cdg-chipbox"><span class="cdg-chip">Debut ${debut}</span><span class="cdg-chip">Kalibrasyon %${p.confidence}</span><span class="cdg-chip">5 Model: KAPALI</span></div>`;
  if(card){card.innerHTML=html;return}card=document.createElement('div');card.id='couponHybridSourceF8';card.className='cdg-card';card.innerHTML=html;body.insertBefore(card,body.firstChild||null);
}
function patchCouponText(){
  const note=document.querySelector('#couponCenterDialog .five-model-note-v11');if(note){note.innerHTML='<b>Kupon kaynağı: Kariyer/Hazırlık</b><span>Gerçek debut atlar Güncel Analiz puanıyla eklenir.</span><small>5 Model kupon oluşturmak için hazırlanmaz.</small>'}
  const b=$('buildAllBtn');if(b)b.textContent='Kariyer/Hazırlıktan Kupon Oluştur';
}
function injectMobileCalibration(){
  if($('calibrationMobileF8Style'))return;const s=document.createElement('style');s.id='calibrationMobileF8Style';s.textContent=`
#analysisDialog.calibration-dialog-v116{position:fixed!important;inset:0!important;width:100dvw!important;max-width:100dvw!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;box-sizing:border-box!important}
#analysisDialog.calibration-dialog-v116 .toolbar{display:none!important}
#analysisDialog.calibration-dialog-v116 .dialog-head{flex:0 0 auto!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}
#analysisDialog.calibration-dialog-v116 #analysisContent{flex:1 1 auto!important;min-width:0!important;min-height:0!important;width:100%!important;max-width:100%!important;overflow-y:auto!important;overflow-x:hidden!important;box-sizing:border-box!important;padding:10px!important}
#analysisDialog.calibration-dialog-v116 .wcal-wrap,#analysisDialog.calibration-dialog-v116 .wcal-card,#analysisDialog.calibration-dialog-v116 .wcal-grid,#analysisDialog.calibration-dialog-v116 .wcal-btns{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}
#analysisDialog.calibration-dialog-v116 .wcal-card{overflow:hidden!important}#analysisDialog.calibration-dialog-v116 .wcal-grid{grid-template-columns:minmax(0,1fr)!important}#analysisDialog.calibration-dialog-v116 .wcal-grid select,#analysisDialog.calibration-dialog-v116 .wcal-grid button{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}#analysisDialog.calibration-dialog-v116 .wcal-scroll{width:100%!important;max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}#analysisDialog.calibration-dialog-v116 .wcal-table{width:max-content!important;min-width:680px!important;max-width:none!important}`;document.head.appendChild(s);
}
const api=window.ATCouponCareerOnlyV1691F1;if(api){api.scoreRows=hybridScoreRows;api.buildCareerTickets=buildHybridTickets}
try{buildTicketsV11=buildHybridTickets}catch{}try{buildTickets=buildHybridTickets}catch{}
const oldOpen=window.ATCouponDecisionV1671?.open;if(typeof oldOpen==='function')window.ATCouponDecisionV1671.open=async function(...args){try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.()}catch{}const r=await oldOpen.apply(this,args);decorateGate();patchCouponText();return r};
document.addEventListener('click',e=>{if(e.target?.closest?.('#buildAllBtn,#careerOnlyCheckV1691F1'))setTimeout(()=>{decorateGate();patchCouponText()},80)},true);
injectMobileCalibration();patchCouponText();
window.ATCouponHybridV1691F8={version:VERSION,source:SOURCE,scoreRows:hybridScoreRows,ensureDebutCurrent,build:buildHybridTickets};
console.info('[AT AI]',VERSION,'aktif — 5 Model yok; kariyerli=K/H, gerçek debut=Güncel Analiz.');
})();