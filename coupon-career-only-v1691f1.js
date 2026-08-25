/* AT AI Mobil — V16.9.1F1 Kupon: yalnız Kariyer / Hazırlık sıralaması
   - V16.9.1F sıralama ve tarihsel tarama mantığına dokunmaz.
   - Kupon kaynağı yalnız galibiyetBenzerligi.score sıralamasıdır.
   - 5 Model, Güncel Analiz, Kazanan Yolu, Senaryo ve Kalibrasyon kupon puanına girmez.
   - Tek sayısı artık zorunlu tek adedi değil, en fazla güvenli tek adedidir.
   - Tek yalnız açık üstünlükte; diğer ayaklar skor yakınlığına göre 2-5+ ata açılır.
*/
(() => {
'use strict';
if (window.__AT_COUPON_CAREER_ONLY_V1691F1__) return;
window.__AT_COUPON_CAREER_ONLY_V1691F1__ = true;

const VERSION='COUPON-CAREER-ONLY-V16.9.1F1';
const SOURCE_ID='CAREER_PREPARATION_RANKING';
const SCREEN_ID='couponDecisionGateV1671';
const BODY_ID='cdgBodyV1671';
let busy=false;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
const product=xs=>xs.reduce((a,b)=>a*Math.max(0,Number(b)||0),1);
const money=(counts,unit)=>{const combinations=product(counts);return{combinations,cost:Number((combinations*unit).toFixed(2))}};

function canonicalDate(value){
  const s=clean(value);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/^(\d{2})[.\/-](\d{2})[.\/-](\d{4})$/);if(m)return`${m[3]}-${m[2]}-${m[1]}`;return s;
}
const sameDate=(a,b)=>canonicalDate(a)===canonicalDate(b);
function cityName(){try{return typeof getCityName==='function'?clean(getCityName()):clean($('citySelect')?.selectedOptions?.[0]?.textContent)}catch{return clean($('citySelect')?.selectedOptions?.[0]?.textContent)}}
function selectedTypes(){return[...document.querySelectorAll('.bet-check:checked')].map(x=>clean(x.value)).filter(Boolean)}
function plans(){return selectedTypes().map(type=>{try{return typeof resolveBetStartV11==='function'?resolveBetStartV11(type):{ok:false,desc:{type},error:'Bahis başlangıç çözümleyicisi bulunamadı.'}}catch(e){return{ok:false,desc:{type},error:e?.message||String(e)}}})}
function requiredRaceNos(){const out=new Set();for(const plan of plans())if(plan?.ok)for(const race of(plan.legs||[])){const no=Number(race?.no);if(Number.isFinite(no)&&no>0)out.add(no)}return[...out].sort((a,b)=>a-b)}
function careerResult(){return state?.analyses?.career||null}
function careerRace(no){const c=careerResult();return(Array.isArray(c?.races)?c.races:[]).find(r=>String(r?.no)===String(no))||null}
function careerScore(item){return finite(item?.galibiyetBenzerligi?.score)}
function scoreRows(no){const r=careerRace(no);return(Array.isArray(r?.horses)?r.horses:[]).map(item=>({item,horse:item?.horse||{},score:careerScore(item)})).filter(x=>x.score!==null).sort((a,b)=>b.score-a.score||Number(a?.horse?.no||999)-Number(b?.horse?.no||999))}

function audit(){
  const raceNos=requiredRaceNos(),issues=[],types=selectedTypes();
  if(!types.length)issues.push({id:'bet',label:'Bahis türü',detail:'En az bir bahis türü seçilmeli.'});
  if(!Array.isArray(state?.races)||!state.races.length)issues.push({id:'program',label:'TJK Programı',detail:'Program yüklenmemiş.'});
  const invalid=plans().filter(p=>!p?.ok);if(types.length&&invalid.length)issues.push({id:'plan',label:'Bahis başlangıcı',detail:invalid.map(p=>p?.error||'Başlangıç bulunamadı.').join(' · ')});
  const c=careerResult();
  if(!c||!sameDate(c?.date,state?.date)){if(raceNos.length)issues.push({id:'career',label:'Kariyer / Hazırlık Sıralaması',detail:`Eksik ayak: ${raceNos.map(x=>`${x}.K`).join(', ')}`})}
  else{
    const missing=raceNos.filter(no=>!careerRace(no));if(missing.length)issues.push({id:'career',label:'Kariyer / Hazırlık Sıralaması',detail:`Eksik ayak: ${missing.map(x=>`${x}.K`).join(', ')}`});
    const scoreless=raceNos.filter(no=>careerRace(no)&&!scoreRows(no).length);if(scoreless.length)issues.push({id:'career-score',label:'Kariyer / Hazırlık puanı',detail:`Sıralaması oluşmayan ayak: ${scoreless.map(x=>`${x}.K`).join(', ')}`});
  }
  return{raceNos,issues,ready:issues.length===0,types,checkedAt:new Date().toISOString()};
}

function ensureScreen(){
  let s=$(SCREEN_ID);if(!s){s=document.createElement('section');s.id=SCREEN_ID;s.setAttribute('aria-hidden','true');s.innerHTML=`<div class="cdg-head"><div><div class="cdg-ey">KARİYER / HAZIRLIK · TEK KAYNAK</div><h2>Kupon Veri Denetimi</h2></div><button id="cdgCloseV1671" class="cdg-close">×</button></div><div class="cdg-body" id="${BODY_ID}"></div>`;document.body.appendChild(s)}
  const ey=s.querySelector('.cdg-ey');if(ey)ey.textContent='KARİYER / HAZIRLIK · TEK KAYNAK';
  const h=s.querySelector('.cdg-head h2');if(h)h.textContent='Kupon · Kariyer/Hazırlık';
  return s;
}
function row(ok,label,detail){return`<div class="cdg-row"><span class="cdg-icon">${ok?'✅':'⚠️'}</span><div><b>${esc(label)}</b><small>${esc(detail)}</small></div></div>`}
function legPreview(no){
  const ranked=scoreRows(no);if(!ranked.length)return`${no}.K · sıralama eksik`;
  const top=ranked[0]?.score??0,second=ranked[1]?.score??null,gap=second===null?null:Number((top-second).toFixed(1));
  return`${no}.K · lider ${ranked[0]?.horse?.no||''}. ${ranked[0]?.horse?.name||''} · %${top}${gap===null?'':` · fark ${gap}`}`;
}
function renderGate(message=''){
  const a=audit(),s=ensureScreen();s.classList.add('open');s.setAttribute('aria-hidden','false');const b=$(BODY_ID);if(!b)return a;
  const rows=a.raceNos.map(no=>row(!!scoreRows(no).length,`${no}. Koşu`,legPreview(no))).join('');
  b.innerHTML=`${message?`<div class="cdg-card"><h3>${esc(message)}</h3></div>`:''}
  <div class="cdg-card"><h3>Kupon kaynağı</h3><p>Kupon yalnız <b>Kariyer/Hazırlık Sıralaması</b> ile kurulur. 5 Model ve diğer analiz kanalları kupon puanına girmez.</p><div class="cdg-chipbox"><span class="cdg-chip">${esc(state?.date||'')}</span><span class="cdg-chip">${esc(cityName())}</span><span class="cdg-chip">${a.raceNos.length} ayak</span></div></div>
  <div class="cdg-card"><h3>${a.ready?'✅ Kariyer/Hazırlık verisi hazır':'Eksik veri'}</h3>${rows||row(false,'Bahis ayağı','Önce bahis türünü seçin.')}${a.issues.filter(x=>!['career','career-score'].includes(x.id)).map(x=>row(false,x.label,x.detail)).join('')}</div>
  <div class="cdg-card"><h3>At sayısı kuralı</h3><p><b>Tek sayısı = en fazla güvenli tek.</b> Lider en az 90 puan ve ikinci ata en az 10 puan fark yapmıyorsa ayağı zorla tek bırakmayız. Diğer ayaklar skor yakınlığına göre 2–5 atla başlar; bütçe uygunsa değerli sonraki atlar eklenir. Bütçeyi tutturmak için hiçbir normal ayak 2 atın altına indirilmez.</p></div>
  <div class="cdg-actions">${a.issues.some(x=>x.id==='career'||x.id==='career-score')?'<button class="cdg-btn primary wide" id="careerOnlyCompleteV1691F1">Eksik Kariyer Sıralamasını Tamamla</button>':''}<button class="cdg-btn" id="careerOnlyCheckV1691F1">Tekrar Kontrol Et</button><button class="cdg-btn good" id="careerOnlyBuildV1691F1" ${a.ready?'':'disabled'}>Kuponu Oluştur</button></div>`;
  $('careerOnlyCheckV1691F1')?.addEventListener('click',()=>renderGate());
  $('careerOnlyCompleteV1691F1')?.addEventListener('click',()=>void completeCareer());
  $('careerOnlyBuildV1691F1')?.addEventListener('click',()=>void buildCareerTickets());
  return a;
}

const waitPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
async function completeCareerRace(no){
  if(typeof runAnalysis!=='function')throw new Error('Kariyer hesaplama fonksiyonu bulunamadı.');
  const dialog=$('analysisDialog'),selector=$('analysisRace'),oldView=dialog?.dataset?.view,oldVal=selector?.value;
  try{
    if(dialog)dialog.dataset.view='career';
    if(selector){selector.value=String(no);if(selector.value!==String(no))throw new Error(`${no}.K analiz seçicisinde bulunamadı.`)}
    await waitPaint();await runAnalysis();await waitPaint();
    if(!careerRace(no)||!scoreRows(no).length)throw new Error(`${no}.K Kariyer/Hazırlık sıralaması oluşmadı.`);
  }finally{
    if(dialog){if(oldView)dialog.dataset.view=oldView;else delete dialog.dataset.view}
    if(selector&&oldVal!==undefined)selector.value=oldVal;
  }
}
async function completeCareer(){
  if(busy)return;busy=true;
  try{
    const a=audit(),list=a.raceNos.filter(no=>!careerRace(no)||!sameDate(careerResult()?.date,state?.date)||!scoreRows(no).length);
    for(let i=0;i<list.length;i++){renderGate(`Kariyer/Hazırlık tamamlanıyor · ${i+1}/${list.length} · ${list[i]}.K`);await completeCareerRace(list[i]);await waitPaint()}
    renderGate('Kariyer/Hazırlık sıralamaları tamamlandı.');
  }catch(e){renderGate(`Tamamlama hatası: ${e?.message||e}`)}finally{busy=false}
}

function strongSingleInfo(ranking){
  if(ranking.length===1)return{qualified:true,strength:999,gap:999};
  const top=ranking[0]?.score??0,second=ranking[1]?.score??0,gap=top-second;
  return{qualified:top>=90&&gap>=10,strength:top+gap*1.5,gap};
}
function naturalWidth(ranking){
  const n=ranking.length;if(n<=2)return n;
  const top=ranking[0]?.score??0;
  let count=ranking.filter(x=>x.score>=top-10).length;
  count=Math.max(2,Math.min(5,count));
  const g12=top-(ranking[1]?.score??0);
  if(g12>=8)count=Math.min(count,2);
  else if(g12>=5)count=Math.min(count,3);
  else if(g12>=3)count=Math.max(count,3);
  else count=Math.max(count,4);
  return Math.min(n,count);
}
function nextAllowed(ranking,index){
  const row=ranking[index];if(!row)return false;
  const top=ranking[0]?.score??0;
  return row.score>=Math.max(45,top-22);
}
function buildAdaptiveTicket(plan,type,budget,unitPrice,maxSingles){
  if(!plan?.ok)return{version:'CAREER-COUPON-V16.9.1F1',type,modelId:'career',modelLabel:'Kariyer / Hazırlık',available:false,city:cityName(),date:state?.date,error:plan?.error||'Bahis başlangıcı bulunamadı.',source:SOURCE_ID};
  const legsData=plan.legs.map(race=>({race,ranking:scoreRows(race.no)}));
  const noData=legsData.filter(x=>!x.ranking.length);if(noData.length)return{version:'CAREER-COUPON-V16.9.1F1',type,modelId:'career',modelLabel:'Kariyer / Hazırlık',available:false,city:cityName(),date:state?.date,startRace:plan.startRace,error:`${noData.map(x=>`${x.race.no}. koşu`).join(', ')} için Kariyer/Hazırlık puanı yok.`,source:SOURCE_ID};

  const candidates=legsData.map((x,i)=>({i,...strongSingleInfo(x.ranking)})).filter(x=>x.qualified).sort((a,b)=>b.strength-a.strength).slice(0,Math.max(0,maxSingles));
  const singles=new Set(candidates.map(x=>x.i));
  const counts=legsData.map((x,i)=>singles.has(i)?1:naturalWidth(x.ranking));
  let m=money(counts,unitPrice);

  // Bütçe aşılıyorsa normal ayakları asla 2'nin altına indirmeden en zayıf ek seçimlerden başla.
  while(m.cost>budget){
    let drop=null;
    for(let i=0;i<legsData.length;i++){
      const min=singles.has(i)?1:Math.min(2,legsData[i].ranking.length);if(counts[i]<=min)continue;
      const last=legsData[i].ranking[counts[i]-1],top=legsData[i].ranking[0];
      const value=(last?.score??0)-(top?.score??0);
      if(!drop||value<drop.value)drop={i,value};
    }
    if(!drop)break;counts[drop.i]-=1;m=money(counts,unitPrice);
  }

  // Bütçe uygunsa yalnız anlamlı puan bandındaki sonraki atları ekle.
  if(m.cost<=budget){
    while(true){
      let best=null;
      for(let i=0;i<legsData.length;i++){
        if(singles.has(i))continue;
        const ranking=legsData[i].ranking;if(counts[i]>=ranking.length||!nextAllowed(ranking,counts[i]))continue;
        const trial=[...counts];trial[i]++;const nm=money(trial,unitPrice);if(nm.cost>budget)continue;
        const next=ranking[counts[i]],extra=Math.max(.0001,nm.cost-m.cost),value=(next?.score??0)/extra;
        if(!best||value>best.value)best={i,value,nm};
      }
      if(!best)break;counts[best.i]++;m=best.nm;
    }
  }

  const legs=legsData.map((x,i)=>({
    raceNo:x.race.no,raceClass:x.race.class||'',distance:x.race.distance||'',track:x.race.track||'',single:counts[i]===1,
    selections:x.ranking.slice(0,counts[i]).map((r,j)=>({no:r.horse?.no,name:r.horse?.name,id:r.horse?.id||null,score:r.score,modelRank:j+1,analysisMode:r.item?.galibiyetBenzerligi?.fallback?'CURRENT_CAREER_PREPARATION_FALLBACK_V1':'HISTORICAL_CAREER_SIMILARITY'})),
    ranking:x.ranking.map((r,j)=>({no:r.horse?.no,name:r.horse?.name,score:r.score,rank:j+1}))
  }));
  const warnings=[];
  if(maxSingles>0&&candidates.length<maxSingles)warnings.push(`İstenen en fazla ${maxSingles} tekten yalnız ${candidates.length} ayak güvenli tek eşiğini geçti; diğer ayaklar zorla teke indirilmedi.`);
  if(m.cost>budget)warnings.push(`En az 2 at kuralı korununca minimum kupon maliyeti bütçeyi aşıyor; ayaklar 1 ata zorlanmadı.`);
  if(plan.inferred)warnings.push('Bahis başlangıcı TJK etiketinden doğrulanamadı; sıra tahmini kullanıldı.');
  return{version:'CAREER-COUPON-V16.9.1F1',scoreVersion:VERSION,type,modelId:'career',modelLabel:'Kariyer / Hazırlık',available:true,city:cityName(),date:state?.date,startRace:plan.startRace,startLabel:plan.startLabel,startInferred:plan.inferred,budget,unitPrice,requestedSingles:maxSingles,actualSingles:legs.filter(x=>x.single).length,combinations:m.combinations,cost:m.cost,overBudget:m.cost>budget,minimumCostExceeded:m.cost>budget,warnings,legs,source:SOURCE_ID,generatedAt:new Date().toISOString()};
}

function markText(el,text,key){if(!el||el.dataset?.[key]==='1')return;el.dataset[key]='1';if(el.textContent!==text)el.textContent=text}
function patchCouponUi(){
  try{
    const note=document.querySelector('#couponCenterDialog .five-model-note-v11');
    if(note&&note.dataset.v1691f1!=='1'){note.dataset.v1691f1='1';note.innerHTML='<b>Kupon kaynağı: Kariyer / Hazırlık Sıralaması</b><span>5 Model kupon üretiminden çıkarıldı. Kupon yalnız Kariyer Yol Haritası puan/sırasını kullanır.</span>'}
    document.querySelectorAll('#couponCenterDialog .manual-models-v117').forEach(el=>{if(el.dataset.v1691f1==='1')return;el.dataset.v1691f1='1';el.style.setProperty('display','none','important')});
    markText($('buildAllBtn'),'Kariyer/Hazırlıktan Kupon Oluştur','v1691f1');
  }catch{}
}
function patchTicketUi(){
  try{
    document.querySelectorAll('#tickets .ticket-group-v11 summary small').forEach(el=>markText(el,'Kariyer/Hazırlık sıralaması','v1691f1'));
    document.querySelectorAll('#tickets .ticket-group-v11 summary > span').forEach(el=>markText(el,'Kariyer kaynağı ▾','v1691f1'));
    document.querySelectorAll('#tickets .ticket-model-tab-v11').forEach(el=>{if(clean(el.textContent)==='Kariyer')markText(el,'Kariyer/Hazırlık','v1691f1')});
  }catch{}
}

async function buildCareerTickets(){
  if(busy)return;const a=audit();if(!a.ready){renderGate();return}busy=true;
  try{
    const types=selectedTypes(),ps=types.map(resolveBetStartV11),budget=Math.max(1,num($('budget')?.value,500)),unitPrice=Math.max(.01,num($('unitPrice')?.value,1)),maxSingles=Math.max(0,Math.min(7,Math.floor(num($('singleCount')?.value,1))));
    const tickets=ps.map((plan,i)=>buildAdaptiveTicket(plan,plan?.desc?.type||types[i]||'Bahis',budget,unitPrice,maxSingles));
    state.tickets=tickets;state.analyses=state.analyses||{};state.analyses.ticketV11={version:'CAREER-COUPON-V16.9.1F1',scoreVersion:VERSION,source:SOURCE_ID,date:state?.date,city:state?.city,generatedAt:new Date().toISOString(),raceNos:a.raceNos};
    try{if(typeof save==='function')save()}catch{}
    if(typeof renderTicketsV11==='function')renderTicketsV11();else if(typeof renderTickets==='function')renderTickets();
    patchTicketUi();renderGate('Kupon hazır · yalnız Kariyer/Hazırlık sıralaması kullanıldı.');
    setTimeout(()=>{try{$('cdgCloseV1671')?.click()}catch{}try{$('tickets')?.scrollIntoView?.({behavior:'smooth',block:'start'})}catch{}patchTicketUi()},220);
  }catch(e){renderGate(`Kupon oluşturulamadı: ${e?.message||e}`)}finally{busy=false}
}
async function openCareerOnly(){try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.()}catch{}renderGate()}

const oldApi=window.ATCouponDecisionV1671||{};
window.ATCouponDecisionV1671={...oldApi,VERSION,audit,open:openCareerOnly,computeDecisions:()=>({source:SOURCE_ID,raceNos:requiredRaceNos(),plans:plans()})};
try{buildTicketsV11=buildCareerTickets}catch{}
try{buildTickets=buildCareerTickets}catch{}

const mo=new MutationObserver(()=>{patchCouponUi();patchTicketUi()});
try{mo.observe(document.documentElement,{subtree:true,childList:true})}catch{}
patchCouponUi();patchTicketUi();
window.ATCouponCareerOnlyV1691F1={VERSION,SOURCE_ID,audit,buildCareerTickets,scoreRows};
console.info('[AT AI]',VERSION,'aktif — kupon yalnız Kariyer/Hazırlık sıralamasından; tek yalnız açık üstünlükte.');
})();
