/* AT AI Mobil — V16.9.1F59.5 TAM EŞLEŞME KALİBRASYONU → KUPON
   - F59.4 Model Kalibrasyonu ekranını doğrudan 4. menü olarak açar.
   - Kupon oluştururken ağır kalibrasyon hesabı YAPMAZ; yalnız F59.4 arşivindeki hazır Top1/Top2/Top3/Top5 istatistiğini okur.
   - Eski F37 İstanbul-genel kalibrasyonunun kupon puan/g genişlik etkisini devreden çıkarır.
   - At sırası Kariyer/Hazırlık temel sırasıdır; Tam Eşleşme 5 Model kalibrasyonu yalnız tek/dar/geniş kararını etkiler.
   - Aynı koşu için manuel kalibrasyon varsa otomatiğe göre önceliklidir; aynı profil daha sonraki tarihlerde tekrar kullanılabilir.
   - Yeni timeout/watchdog yok; günlük/yıllık arşiv kayıtları değiştirilmez.
*/
(() => {
'use strict';
if (window.__AT_EXACT_MATCH_CALIBRATION_COUPON_V1691F595__) return;
window.__AT_EXACT_MATCH_CALIBRATION_COUPON_V1691F595__ = true;

const VERSION='EXACT-MATCH-CALIBRATION-COUPON-V16.9.1F59.5';
const SOURCE='CAREER_PREPARATION+EXACT_5MODEL_CALIBRATION';
const MODEL_IDS=['composite','exact','twin','family','career'];
const MODEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};
const MIN_SAMPLE=3;
const FULL_SAMPLE=8;
const TARGET_RATE=.80;
const F37_SCORE_ROWS=typeof window.ATIstanbulOutcomeCalibrationV1691F37?.scoreRows==='function'?window.ATIstanbulOutcomeCalibrationV1691F37.scoreRows:null;
const PRE_COUPON_SCORE_ROWS=typeof window.ATCouponCareerOnlyV1691F1?.scoreRows==='function'?window.ATCouponCareerOnlyV1691F1.scoreRows:null;
let buildBusy=false;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'').trim();
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const product=xs=>xs.reduce((a,b)=>a*Math.max(0,Number(b)||0),1);
const money=(counts,unit)=>{const combinations=product(counts);return{combinations,cost:Number((combinations*unit).toFixed(2))}};

function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function cityName(){try{if(typeof getCityName==='function')return clean(getCityName())}catch{}const s=st(),id=clean(s?.city);return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id}
function currentRaces(){return Array.isArray(st()?.races)?st().races:[]}
function raceNo(r){return Number(r?.no??r?.raceNo??r?.kosuNo??0)||0}
function trackKey(v){const f=fold(v);if(f.includes('CIM'))return'CIM';if(f.includes('KUM'))return'KUM';if(f.includes('SENTETIK'))return'SENTETIK';return f}
function classKey(v){try{const k=window.canonicalClassKeyV125?.(v);if(clean(k))return fold(k)}catch{}return fold(v)}
function raceMeta(race){let meta=null;try{if(typeof programRaceMeta==='function')meta=programRaceMeta(race)}catch{}meta=meta||{};return{classRaw:clean(meta.class||race?.class||race?.raceClass||race?.yaradi1),ageGroup:clean(meta.ageGroup||race?.ageGroup||race?.group||race?.yaradi2),distance:Number(meta.distance||race?.distance||race?.mesafe||0)||0,track:clean(meta.track||race?.track||race?.pist)}}
function profileMatches(entry,race){const t=entry?.target||{},m=raceMeta(race);return fold(t.city)===fold(cityName())&&classKey(t.classRaw)===classKey(m.classRaw)&&fold(t.ageGroup)===fold(m.ageGroup)&&Number(t.distance||0)===Number(m.distance||0)&&trackKey(t.track)===trackKey(m.track)}
function currentRace(no){return currentRaces().find(r=>raceNo(r)===Number(no))||null}

function metricProfile(entry){
  if(!entry?.stats)return{available:false,sample:0,level:'YOK',bestModel:null,recommendedWidth:null,confidence:50};
  const candidates=[];
  for(const id of MODEL_IDS){
    const m=entry.stats?.[id]||{};
    const coverage=Number(m.coverage)||0;
    if(!coverage)continue;
    const q=(Number(m.top1Rate)||0)*.40+(Number(m.top2Rate)||0)*.20+(Number(m.top3Rate)||0)*.25+(Number(m.top5Rate)||0)*.15;
    const rates={1:Number(m.top1Rate)||0,2:Number(m.top2Rate)||0,3:Number(m.top3Rate)||0,5:Number(m.top5Rate)||0};
    let recommendedWidth=5;
    for(const n of [1,2,3,5]){if(rates[n]>=TARGET_RATE){recommendedWidth=n;break}}
    candidates.push({id,label:MODEL_LABELS[id],coverage,quality:q,recommendedWidth,rates,averageRank:finite(m.averageRank)});
  }
  if(!candidates.length)return{available:false,sample:0,level:'YOK',bestModel:null,recommendedWidth:null,confidence:50};
  candidates.sort((a,b)=>b.quality-a.quality||b.rates[1]-a.rates[1]||b.rates[3]-a.rates[3]||b.coverage-a.coverage);
  const best=candidates[0],sample=best.coverage;
  const reliability=clamp(sample/FULL_SAMPLE,0,1);
  const confidence=Math.round(50+((best.quality*100)-50)*reliability);
  const level=sample<MIN_SAMPLE?'ÖĞRENİYOR':sample<FULL_SAMPLE?'TEMKİNLİ':confidence>=67?'GÜÇLÜ':confidence<48?'ZAYIF':'NÖTR';
  return{available:true,sample,level,bestModel:best,recommendedWidth:best.recommendedWidth,confidence,entryMode:entry.mode||'',entryUpdatedAt:entry.updatedAt||'',all:candidates};
}

async function entriesForBuild(){
  try{return await window.ATExactMatchCalibrationV1691F594?.list?.()||[]}catch{return[]}
}
function chooseEntry(entries,race){
  const date=clean(st()?.date),no=raceNo(race),city=cityName();
  const exact=(entries||[]).find(e=>clean(e?.target?.date)===date&&fold(e?.target?.city)===fold(city)&&Number(e?.target?.raceNo)===no);
  if(exact)return exact;
  const matches=(entries||[]).filter(e=>profileMatches(e,race));
  matches.sort((a,b)=>{
    const am=a?.mode==='MANUAL_SELECTED'?1:0,bm=b?.mode==='MANUAL_SELECTED'?1:0;
    if(am!==bm)return bm-am;
    return String(b?.updatedAt||'').localeCompare(String(a?.updatedAt||''));
  });
  return matches[0]||null;
}

function baseCareerRows(no){
  let rows=[];
  try{rows=F37_SCORE_ROWS?F37_SCORE_ROWS(no)||[]:[]}catch{}
  if(!rows.length){try{rows=PRE_COUPON_SCORE_ROWS?PRE_COUPON_SCORE_ROWS(no)||[]:[]}catch{}}
  const out=(Array.isArray(rows)?rows:[]).map((row,index)=>{
    const baseScore=finite(row?.baseScoreF37);
    const baseRank=finite(row?.baseRankF37);
    return{...row,score:baseScore!==null?baseScore:(finite(row?.score)??0),exactCalBaseRankF595:baseRank!==null?baseRank:index+1,scoreSource:'CAREER_PREPARATION_BASE'};
  });
  out.sort((a,b)=>(a.exactCalBaseRankF595||999)-(b.exactCalBaseRankF595||999)||(b.score||0)-(a.score||0));
  return out;
}

function baseNaturalWidth(ranking){
  const n=ranking.length;if(n<=2)return n;
  const top=ranking[0]?.score??0;let count=ranking.filter(x=>(x?.score??0)>=top-10).length;
  count=Math.max(2,Math.min(5,count));
  const gap=top-(ranking[1]?.score??0);
  if(gap>=8)count=Math.min(count,2);else if(gap>=5)count=Math.min(count,3);else if(gap>=3)count=Math.max(count,3);else count=Math.max(count,4);
  return Math.min(n,count);
}
function calibratedWidth(ranking,cal){
  const base=baseNaturalWidth(ranking),n=ranking.length;
  if(!cal?.available||cal.sample<MIN_SAMPLE)return base;
  const rec=Math.min(n,Math.max(1,Number(cal.recommendedWidth)||base));
  if(cal.sample<FULL_SAMPLE){return rec>base?Math.min(n,rec):base;}
  if(rec<=1)return Math.min(n,Math.max(2,base-1));
  if(rec===2)return Math.min(n,2);
  if(rec===3)return Math.min(n,3);
  return Math.min(n,Math.max(base,5));
}
function minWidth(ranking,cal){
  if(ranking.length<=1)return ranking.length;
  if(!cal?.available||cal.sample<MIN_SAMPLE)return Math.min(2,ranking.length);
  const rec=Math.min(ranking.length,Math.max(1,Number(cal.recommendedWidth)||2));
  if(cal.sample<FULL_SAMPLE)return rec>2?rec:2;
  return rec<=1?2:rec;
}
function singleInfo(ranking,cal){
  if(ranking.length===1)return{qualified:true,strength:999,gap:999};
  const top=ranking[0]?.score??0,second=ranking[1]?.score??0,gap=top-second;
  let topNeed=92,gapNeed=10;
  if(cal?.available&&cal.sample>=FULL_SAMPLE){
    const r1=cal.bestModel?.rates?.[1]||0;
    if(r1>=.50){topNeed=90;gapNeed=9}
    if(r1<.25)return{qualified:false,strength:top+gap, gap, topNeed, gapNeed, blockedByCalibration:true};
  }
  return{qualified:top>=topNeed&&gap>=gapNeed,strength:top+gap*1.5+(cal?.confidence||50)*.02,gap,topNeed,gapNeed};
}
function nextAllowed(ranking,index){const row=ranking[index];if(!row)return false;const top=ranking[0]?.score??0;return(row?.score??0)>=Math.max(45,top-22)}
function calText(cal){
  if(!cal?.available)return'Tam Eşleşme kalibrasyonu yok';
  const b=cal.bestModel||{};
  return`${cal.sample} yarış · ${b.label||'-'} · Top1 %${Math.round((b.rates?.[1]||0)*100)} · Top3 %${Math.round((b.rates?.[3]||0)*100)} · Top5 %${Math.round((b.rates?.[5]||0)*100)} · öneri ${cal.recommendedWidth===1?'tek adayı':`ilk ${cal.recommendedWidth}`}`;
}

function selectedTypes(){return[...document.querySelectorAll('.bet-check:checked')].map(x=>clean(x.value)).filter(Boolean)}
function safePlan(type){try{return typeof resolveBetStartV11==='function'?resolveBetStartV11(type):{ok:false,error:'Bahis başlangıcı bulunamadı.',desc:{type}}}catch(e){return{ok:false,error:e?.message||String(e),desc:{type}}}}

function buildTicket(plan,type,budget,unitPrice,maxSingles,entryMap){
  const couponVersion='CAREER-COUPON-V16.9.1F59.5-EXACT-CALIBRATED';
  if(!plan?.ok)return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:couponVersion,type,available:false,error:plan?.error||'Bahis başlangıcı bulunamadı.',source:SOURCE};
  const legsData=(plan.legs||[]).map(race=>{
    const ranking=baseCareerRows(race.no);
    const entry=entryMap.get(Number(race.no))||null;
    const cal=metricProfile(entry);
    return{race,ranking,entry,cal};
  });
  const noData=legsData.filter(x=>!x.ranking.length);
  if(noData.length)return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:couponVersion,type,available:false,error:`${noData.map(x=>`${x.race.no}. koşu`).join(', ')} için Kariyer/Hazırlık puanı yok.`,source:SOURCE};

  const candidates=legsData.map((x,i)=>({i,...singleInfo(x.ranking,x.cal)})).filter(x=>x.qualified).sort((a,b)=>b.strength-a.strength).slice(0,Math.max(0,maxSingles));
  const singles=new Set(candidates.map(x=>x.i));
  const counts=legsData.map((x,i)=>singles.has(i)?1:calibratedWidth(x.ranking,x.cal));
  let m=money(counts,unitPrice);

  while(m.cost>budget){
    let drop=null;
    for(let i=0;i<legsData.length;i++){
      const min=singles.has(i)?1:minWidth(legsData[i].ranking,legsData[i].cal);
      if(counts[i]<=min)continue;
      const last=legsData[i].ranking[counts[i]-1],top=legsData[i].ranking[0];
      const value=(last?.score??0)-(top?.score??0);
      if(!drop||value<drop.value)drop={i,value};
    }
    if(!drop)break;
    counts[drop.i]--;m=money(counts,unitPrice);
  }
  if(m.cost<=budget){
    while(true){
      let best=null;
      for(let i=0;i<legsData.length;i++){
        if(singles.has(i))continue;
        const ranking=legsData[i].ranking;
        if(counts[i]>=ranking.length||!nextAllowed(ranking,counts[i]))continue;
        const trial=[...counts];trial[i]++;
        const nm=money(trial,unitPrice);if(nm.cost>budget)continue;
        const next=ranking[counts[i]],extra=Math.max(.0001,nm.cost-m.cost),value=(next?.score??0)/extra;
        if(!best||value>best.value)best={i,value,nm};
      }
      if(!best)break;counts[best.i]++;m=best.nm;
    }
  }

  const legs=legsData.map((x,i)=>({
    raceNo:x.race.no,raceClass:x.race.class||'',distance:x.race.distance||'',track:x.race.track||'',single:counts[i]===1,
    calibration:{available:x.cal.available,sample:x.cal.sample,level:x.cal.level,confidence:x.cal.confidence,bestModel:x.cal.bestModel?.id||null,bestModelLabel:x.cal.bestModel?.label||null,recommendedWidth:x.cal.recommendedWidth,mode:x.entry?.mode||null,sourceDate:x.entry?.target?.date||null,summary:calText(x.cal)},
    warnings:[x.cal.available?`Tam Eşleşme 5 Model: ${calText(x.cal)}`:'Tam Eşleşme 5 Model kalibrasyonu yok; K/H doğal genişliği kullanıldı.'],
    selections:x.ranking.slice(0,counts[i]).map((r,j)=>({no:r.horse?.no,name:r.horse?.name,id:r.horse?.id||null,score:r.score,modelRank:j+1,analysisMode:r.item?.galibiyetBenzerligi?.fallback?'CURRENT_CAREER_PREPARATION_FALLBACK_V1':'HISTORICAL_CAREER_SIMILARITY'})),
    ranking:x.ranking.map((r,j)=>({no:r.horse?.no,name:r.horse?.name,score:r.score,rank:j+1,scoreSource:'CAREER_PREPARATION_BASE'}))
  }));
  const calibratedLegs=legs.filter(x=>x.calibration.available).length;
  const warnings=[`Tam Eşleşme 5 Model kalibrasyonu: ${calibratedLegs}/${legs.length} ayakta hazır arşiv kullanıldı.`,`At sırası Kariyer/Hazırlık olarak korunur; kalibrasyon yalnız tek/dar/geniş kararına etki eder.`];
  if(maxSingles>0&&candidates.length<maxSingles)warnings.push(`En fazla ${maxSingles} tekten ${candidates.length} ayak güvenli tek eşiğini geçti.`);
  if(m.cost>budget)warnings.push('Kalibrasyon minimum genişlikleri korununca minimum kupon maliyeti bütçeyi aşıyor.');
  return{version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'V11',careerCouponVersion:couponVersion,scoreVersion:VERSION,type,modelId:'career',modelLabel:'Kariyer/Hazırlık · Tam Eşleşme 5 Model kalibrasyonu',available:true,city:cityName(),date:st()?.date,startRace:plan.startRace,startLabel:plan.startLabel,startInferred:plan.inferred,budget,unitPrice,requestedSingles:maxSingles,actualSingles:legs.filter(x=>x.single).length,combinations:m.combinations,cost:m.cost,overBudget:m.cost>budget,minimumCostExceeded:m.cost>budget,warnings,legs,source:SOURCE,calibratedLegs,generatedAt:new Date().toISOString()};
}

async function buildExactCalibratedTickets(){
  if(buildBusy)return;
  buildBusy=true;
  try{
    const api=window.ATCouponCareerOnlyV1691F1;
    const audit=api?.audit?.();
    if(audit&&!audit.ready){await window.ATCouponDecisionV1671?.open?.();return;}
    const entries=await entriesForBuild();
    const needed=new Set();
    const types=selectedTypes(),plans=types.map(safePlan);
    plans.forEach(p=>(p?.legs||[]).forEach(r=>needed.add(Number(r.no))));
    const entryMap=new Map();
    for(const no of needed){const race=currentRace(no);entryMap.set(no,race?chooseEntry(entries,race):null)}
    const budget=Math.max(1,finite($('budget')?.value)||500),unitPrice=Math.max(.01,finite($('unitPrice')?.value)||1),maxSingles=Math.max(0,Math.min(7,Math.floor(finite($('singleCount')?.value)??0)));
    const tickets=plans.map((plan,i)=>buildTicket(plan,plan?.desc?.type||types[i]||'Bahis',budget,unitPrice,maxSingles,entryMap));
    const s=st();
    if(s){s.tickets=tickets;s.analyses=s.analyses||{};s.analyses.ticketV11={version:'CAREER-COUPON-V16.9.1F59.5-EXACT-CALIBRATED',scoreVersion:VERSION,source:SOURCE,f37Applied:false,fiveModelCalibration:'EXACT_ARCHIVE_TOP1_TOP2_TOP3_TOP5',rankingChanged:false,date:s.date,city:s.city,generatedAt:new Date().toISOString(),raceNos:[...needed]};}
    try{if(typeof save==='function')save()}catch{}
    if(typeof renderTicketsV11==='function')renderTicketsV11();else if(typeof renderTickets==='function')renderTickets();
    await decorateGate('Kupon hazır · Tam Eşleşme 5 Model kalibrasyonu uygulandı.');
    requestAnimationFrame(()=>{try{$('cdgCloseV1671')?.click()}catch{}try{$('tickets')?.scrollIntoView?.({behavior:'smooth',block:'start'})}catch{}});
  }catch(e){console.error('[AT AI]',VERSION,'kupon',e);try{alert(`Kupon oluşturulamadı: ${e?.message||e}`)}catch{}}
  finally{buildBusy=false}
}

async function calibrationGateSummary(){
  const entries=await entriesForBuild();
  const audit=window.ATCouponCareerOnlyV1691F1?.audit?.();
  const raceNos=Array.isArray(audit?.raceNos)&&audit.raceNos.length?audit.raceNos:currentRaces().map(raceNo);
  let ready=0;const detail=[];
  for(const no of raceNos){const race=currentRace(no),entry=race?chooseEntry(entries,race):null,cal=metricProfile(entry);if(cal.available)ready++;detail.push({no,cal});}
  return{ready,total:raceNos.length,detail};
}
async function decorateGate(message=''){
  const body=$('cdgBodyV1671');if(!body)return;
  $('couponIstanbulCalibrationF37')?.remove();$('couponCalibrationProfileF6')?.remove();
  const sum=await calibrationGateSummary();
  let card=$('couponExactCalibrationF595');
  const html=`<h3>${esc(message||'Tam Eşleşme 5 Model kalibrasyonu')}</h3><p><b>${sum.ready}/${sum.total} ayakta hazır kalibrasyon</b><br>Kupon sırasında yeniden hesap yapılmaz. Top1/Top2/Top3/Top5 arşivi yalnız tek/dar/geniş kararını ayarlar; at sırası K/H olarak kalır.</p><div class="cdg-chipbox"><span class="cdg-chip">F37: kupon dışı</span><span class="cdg-chip">Hazır: ${sum.ready}/${sum.total}</span><span class="cdg-chip">Hedef kapsama: %80</span></div>`;
  if(card){card.innerHTML=html}else{card=document.createElement('div');card.id='couponExactCalibrationF595';card.className='cdg-card';card.innerHTML=html;body.insertBefore(card,body.firstChild||null)}
  const note=document.querySelector('#couponCenterDialog .five-model-note-v11');if(note)note.innerHTML='<b>Kupon kaynağı: Kariyer/Hazırlık + Tam Eşleşme 5 Model Kalibrasyonu</b><span>5 Model burada yeniden hesaplanmaz; 4. menüde arşivlenmiş Top1/Top2/Top3/Top5 başarıları kupon genişliğine uygulanır.</span>';
  const button=$('buildAllBtn');if(button)button.textContent='Kalibre Kariyer Kuponu Oluştur';
}

function decorateCalibrationHome(){
  const host=$('xcalStatus');if(host&&!host.dataset.f595){host.dataset.f595='1';host.textContent='Hazır. Kalibrasyon burada hesaplanıp arşivlenir; kupon oluştururken ağır hesap yapılmaz, yalnız hazır Top1/Top2/Top3/Top5 sonucu okunur.'}
  const wrap=document.querySelector('#analysisContent .xcal-wrap');
  if(wrap&&!$('xcalCouponBridgeF595')){
    const card=document.createElement('section');card.id='xcalCouponBridgeF595';card.className='xcal-card';
    card.innerHTML='<h3>Kupon Bağlantısı</h3><p><b>Aktif.</b> Manuel seçilmiş kalibrasyon otomatik kayda göre önceliklidir. Aynı Tam Eşleşme profili ileride tekrar gelirse son uygun arşiv kaydı yeniden kullanılabilir.</p><div class="xcal-chips"><i>Top1</i><i>Top2</i><i>Top3</i><i>Top5</i><i>Kupon sırasında yeniden hesap yok</i></div>';
    const archive=wrap.querySelector('#xcalArchiveList')?.closest('.xcal-card');archive?wrap.insertBefore(card,archive):wrap.appendChild(card);
  }
}
function openExactCalibration(){
  const dialog=$('analysisDialog');if(!dialog)return;
  try{$('closeMenu')?.click()}catch{}
  dialog.classList.add('calibration-dialog-v116');dialog.dataset.exactCalibrationF595='1';
  if($('dialogEyebrow'))$('dialogEyebrow').textContent='TAM EŞLEŞME BACKTEST';
  if($('dialogTitle'))$('dialogTitle').textContent='Model Kalibrasyonu';
  window.ATExactMatchCalibrationV1691F594?.render?.();
  decorateCalibrationHome();
  if(!dialog.open)dialog.showModal();
}
try{openCalibrationV116=openExactCalibration}catch(e){console.warn('[AT AI]',VERSION,'menu open hook kurulamadı',e)}
function patchMenuLabel(){const b=document.querySelector('[data-view="calibration"]');if(b)b.textContent='4. Model Kalibrasyonu'}
patchMenuLabel();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchMenuLabel,{once:true});

const previousGateOpen=window.ATCouponDecisionV1671?.open;
if(typeof previousGateOpen==='function')window.ATCouponDecisionV1671.open=async function(...args){const r=await previousGateOpen.apply(this,args);await decorateGate();return r};

if(window.ATCouponCareerOnlyV1691F1){window.ATCouponCareerOnlyV1691F1.scoreRows=baseCareerRows;window.ATCouponCareerOnlyV1691F1.buildCareerTickets=buildExactCalibratedTickets}
if(window.ATCouponHybridV1691F8){window.ATCouponHybridV1691F8.scoreRows=baseCareerRows;window.ATCouponHybridV1691F8.build=buildExactCalibratedTickets}
try{buildTicketsV11=buildExactCalibratedTickets}catch{}
try{buildTickets=buildExactCalibratedTickets}catch{}

// Window capture, eski F37 document-capture tıklama yakalayıcısından önce çalışır.
window.addEventListener('click',event=>{
  const build=event.target?.closest?.('#careerOnlyBuildV1691F1');
  const dualActive=typeof window.ATIstanbulOutcomeCalibrationV1691F37?.build==='function';
  if(dualActive&&(build||event.target?.closest?.('#buildAllBtn'))) return;
  if(build){event.preventDefault();event.stopImmediatePropagation();void buildExactCalibratedTickets();return}
  if(event.target?.closest?.('[data-view="calibration"]')){requestAnimationFrame(()=>{patchMenuLabel();decorateCalibrationHome()})}
  if(event.target?.closest?.('#buildAllBtn')){event.preventDefault();event.stopImmediatePropagation();void window.ATCouponDecisionV1671?.open?.();return}
  if(event.target?.closest?.('#careerOnlyCheckV1691F1')){requestAnimationFrame(()=>void decorateGate())}
},true);

window.ATExactMatchCalibrationCouponV1691F595={version:VERSION,source:SOURCE,profile:metricProfile,baseScoreRows:baseCareerRows,build:buildExactCalibratedTickets,chooseEntry};
console.info('[AT AI]',VERSION,'aktif — F37 kupon etkisi kapalı; 4. menü Tam Eşleşme Top1/2/3/5 arşivi kupon tek/dar/geniş kararına bağlı; kupon sırasında yeniden hesap yok.');
})();