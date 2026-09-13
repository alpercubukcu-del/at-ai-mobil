;(() => {
'use strict';
if (window.__AT_EXACT_RANK_COUPON_GUARD_V1691F661__) return;
window.__AT_EXACT_RANK_COUPON_GUARD_V1691F661__ = true;

const VERSION='EXACT-RANK-COUPON-GUARD-V16.9.1F60.61';
const DB_NAME='at_ai_5model_calibration_v1';
const STORE_ENTRIES='entries';
const STORE_BACKTESTS='backtests';
const MODEL_IDS=['composite','exact','twin','family','career'];
const LABEL={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};
const MIN_SAMPLE=3;
const TARGET_COVERAGE=.80;
const WIDTHS=[1,2,3,5];
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null};
let busy=false;
let queued=false;
let observer=null;
let summary={added:[],recommended:[],checked:0};

function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function cityName(){try{if(typeof getCityName==='function')return clean(getCityName())}catch{}const s=st(),id=clean(s?.city);return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id}
function raceNo(r){return Number(r?.no??r?.raceNo??0)||0}
function programRace(no){return(Array.isArray(st()?.races)?st().races:[]).find(r=>raceNo(r)===Number(no))||null}
function classKey(v){try{const k=window.canonicalClassKeyV125?.(v);if(clean(k))return fold(k)}catch{}return fold(v)}
function trackKey(v){const t=fold(v);if(t.includes('CIM'))return'CIM';if(t.includes('KUM'))return'KUM';if(t.includes('SENTETIK'))return'SENTETIK';return t}
function raceMeta(race){let m={};try{if(typeof programRaceMeta==='function')m=programRaceMeta(race)||{}}catch{}return{classRaw:clean(m.class||race?.class||race?.yaradi1),ageGroup:clean(m.ageGroup||race?.ageGroup||race?.yaradi2),distance:Number(m.distance||race?.distance||race?.mesafe||0)||0,track:clean(m.track||race?.track||race?.pist)}}
function targetContext(race){const m=raceMeta(race);return{date:clean(st()?.date),city:cityName(),raceNo:raceNo(race),...m}}
function exactTarget(entry,ctx){const t=entry?.target||{};return clean(t.date)===clean(ctx.date)&&fold(t.city)===fold(ctx.city)&&Number(t.raceNo||0)===Number(ctx.raceNo||0)}
function profileEntry(entry,ctx){const t=entry?.target||{};return fold(t.city)===fold(ctx.city)&&classKey(t.classRaw)===classKey(ctx.classRaw)&&fold(t.ageGroup)===fold(ctx.ageGroup)&&Number(t.distance||0)===Number(ctx.distance||0)&&trackKey(t.track)===trackKey(ctx.track)}
function chooseEntry(entries,race){const ctx=targetContext(race),exact=(entries||[]).find(e=>exactTarget(e,ctx));if(exact)return exact;const a=(entries||[]).filter(e=>profileEntry(e,ctx));a.sort((x,y)=>{const xm=x?.mode==='MANUAL_SELECTED'?1:0,ym=y?.mode==='MANUAL_SELECTED'?1:0;if(xm!==ym)return ym-xm;return String(y?.updatedAt||'').localeCompare(String(x?.updatedAt||''))});return a[0]||null}

async function openDb(){if(!('indexedDB'in window))return null;return new Promise(resolve=>{let q;try{q=indexedDB.open(DB_NAME)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null)})}
async function dbAll(store){const db=await openDb();if(!db||!db.objectStoreNames.contains(store))return[];return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).getAll();q.onsuccess=()=>{const out=q.result||[];try{db.close()}catch{}resolve(out)};q.onerror=()=>{try{db.close()}catch{}resolve([])}}catch{try{db.close()}catch{}resolve([])}})}
function backtestId(t){return clean(t?.annualArchiveId)||`${clean(t?.date)}|${fold(t?.city)}|${Number(t?.raceNo)||0}`}
function testMatchesTarget(t,target){if(!target)return true;return fold(t?.city)===fold(target?.city)&&classKey(t?.classRaw)===classKey(target?.classRaw)&&fold(t?.groupRaw)===fold(target?.ageGroup)&&Number(t?.distance||0)===Number(target?.distance||0)&&trackKey(t?.track)===trackKey(target?.track)&&(!target?.date||clean(t?.date)<clean(target.date))}
function rankRows(entry,tests){
  if(Array.isArray(entry?.rankRows)&&entry.rankRows.length)return entry.rankRows;
  const wanted=new Set((entry?.selectedHistoricalIds||[]).map(clean).filter(Boolean));
  let rows=(tests||[]).filter(t=>t?.ok!==false&&t?.ranks);
  if(wanted.size)rows=rows.filter(t=>wanted.has(clean(t?.annualArchiveId))||wanted.has(backtestId(t)));
  else rows=rows.filter(t=>testMatchesTarget(t,entry?.target||null));
  rows.sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))||Number(a?.raceNo||99)-Number(b?.raceNo||99));
  return rows.map(t=>({id:backtestId(t),date:clean(t?.date),city:clean(t?.city),raceNo:Number(t?.raceNo)||null,winner:t?.winner||null,ranks:Object.fromEntries(MODEL_IDS.map(id=>[id,Number.isInteger(Number(t?.ranks?.[id]))&&Number(t.ranks[id])>0?Number(t.ranks[id]):null]))}));
}
function coverageRule(rows,modelId){
  const vals=(rows||[]).map(r=>Number(r?.ranks?.[modelId])).filter(v=>Number.isInteger(v)&&v>0);
  if(vals.length<MIN_SAMPLE)return{available:false,sample:vals.length,width:null,coverage:null,reason:'sample'};
  for(const width of WIDTHS){const covered=vals.filter(v=>v<=width).length,rate=covered/vals.length;if(rate>=TARGET_COVERAGE)return{available:true,sample:vals.length,width,coverage:rate,covered,modelId}}
  const covered=vals.filter(v=>v<=5).length,rate=covered/vals.length;
  return{available:false,sample:vals.length,width:5,coverage:rate,covered,modelId,reason:'coverage'};
}
function modelIdForTicket(ticket){const id=clean(ticket?.modelId).toLowerCase();if(MODEL_IDS.includes(id))return id;const t=fold(ticket?.modelLabel||ticket?.type);if(t.includes('BILESIK'))return'composite';if(t.includes('IKIZ'))return'twin';if(t.includes('AILE'))return'family';if(t.includes('TAM'))return'exact';return'career'}
function sameSelection(a={},b={}){const ai=clean(a?.id??a?.horseId),bi=clean(b?.id??b?.horseId);if(ai&&bi&&ai===bi)return true;const an=clean(a?.no??a?.programNo),bn=clean(b?.no??b?.programNo);if(an&&bn&&an===bn)return true;return Boolean(fold(a?.name??a?.horseName)&&fold(a?.name??a?.horseName)===fold(b?.name??b?.horseName))}
function rowToSelection(row,modelId,rank,cal){return{no:row?.no??row?.horse?.no,name:row?.name??row?.horse?.name,id:row?.id??row?.horse?.id??null,score:finite(row?.score),modelRank:Number(row?.rank||rank)||rank,exactRankGuard:true,exactRankGuardVersion:VERSION,exactRankGuardModel:modelId,exactRankGuardSample:cal.sample,exactRankGuardCoverage:Number((cal.coverage*100).toFixed(1))}}
function counts(ticket){return(Array.isArray(ticket?.legs)?ticket.legs:[]).map(l=>Math.max(0,(Array.isArray(l?.selections)?l.selections:[]).length))}
function calcMoney(ticket,newCounts=null){const c=newCounts||counts(ticket),comb=c.reduce((a,b)=>a*Math.max(1,Number(b)||0),1),unit=Math.max(.01,finite(ticket?.unitPrice)??finite($('unitPrice')?.value)??1);return{combinations:comb,cost:Number((comb*unit).toFixed(2)),unit}}
function budgetOf(ticket){return Math.max(1,finite(ticket?.budget)??finite($('budget')?.value)??500)}

function ensureSummaryHost(){
  let box=$('exactRankGuardSummaryV661');if(box)return box;
  const tickets=$('tickets');if(!tickets)return null;
  box=document.createElement('div');box.id='exactRankGuardSummaryV661';box.style.cssText='display:none;margin:10px 0;padding:10px 11px;border:1px solid rgba(126,226,168,.25);border-radius:12px;background:rgba(126,226,168,.06);font-size:11px;line-height:1.45;color:#dff7e9';
  tickets.parentNode?.insertBefore(box,tickets);return box;
}
function renderSummary(){
  const box=ensureSummaryHost();if(!box)return;
  const a=summary.added||[],r=summary.recommended||[];
  if(!a.length&&!r.length){box.style.display='';box.innerHTML=`<b>Tam Eşleşme kazanan-sıra koruması</b><br>${summary.checked||0} kupon kontrol edildi. Ek güvenlik atı gerekmedi veya yeterli geçmiş örnek bulunmadı.`;return}
  box.style.display='';
  const added=a.length?`<div style="margin-top:5px"><b>Otomatik eklendi (${a.length}):</b> ${a.map(x=>`${x.raceNo}.K ${x.no}. ${clean(x.name)} · ${x.model} ilk ${x.width}`).join(' · ')}</div>`:'';
  const rec=r.length?`<div style="margin-top:5px;color:#ffd4a5"><b>Bütçe nedeniyle öneri (${r.length}):</b> ${r.map(x=>`${x.raceNo}.K ${x.no}. ${clean(x.name)} · ${x.model} ilk ${x.width}`).join(' · ')}. Bütçeyi artırın veya manuel ekleyin.</div>`:'';
  box.innerHTML=`<b>Tam Eşleşme kazanan-sıra koruması</b><br>Geçmiş gerçek kazananların kesin model sıralarıyla kupon genişliği denetlendi.${added}${rec}`;
}

async function applyGuard(){
  if(busy){queued=true;return}
  const s=st(),tickets=Array.isArray(s?.tickets)?s.tickets:[];
  if(!tickets.length)return;
  const pending=tickets.filter(t=>t?.exactRankGuardVersion!==VERSION);
  if(!pending.length){renderSummary();return}
  busy=true;
  try{
    const [entries,tests]=await Promise.all([dbAll(STORE_ENTRIES),dbAll(STORE_BACKTESTS)]);
    const nextSummary={added:[],recommended:[],checked:0};
    let changed=false;
    for(const ticket of pending){
      nextSummary.checked++;
      if(ticket?.available===false||!Array.isArray(ticket?.legs)){ticket.exactRankGuardVersion=VERSION;continue}
      const modelId=modelIdForTicket(ticket),budget=budgetOf(ticket);
      for(const leg of ticket.legs){
        const race=programRace(leg?.raceNo);if(!race)continue;
        const entry=chooseEntry(entries,race);if(!entry)continue;
        const rows=rankRows(entry,tests),cal=coverageRule(rows,modelId);
        leg.exactRankCalibration={version:VERSION,modelId,modelLabel:LABEL[modelId],sample:cal.sample,width:cal.width,coverage:cal.coverage,available:cal.available};
        if(!cal.available)continue;
        const ranking=Array.isArray(leg?.ranking)?leg.ranking:[];if(!ranking.length)continue;
        const target=ranking.slice(0,Math.min(cal.width,ranking.length));
        leg.selections=Array.isArray(leg.selections)?leg.selections:[];
        for(let i=0;i<target.length;i++){
          const row=target[i],candidate=rowToSelection(row,modelId,i+1,cal);if(leg.selections.some(x=>sameSelection(x,candidate)))continue;
          const cc=counts(ticket),legIndex=ticket.legs.indexOf(leg);cc[legIndex]=leg.selections.length+1;
          const money=calcMoney(ticket,cc);
          const info={raceNo:leg.raceNo,no:candidate.no,name:candidate.name,model:LABEL[modelId],modelId,width:cal.width,sample:cal.sample,coverage:cal.coverage,projectedCost:money.cost};
          if(money.cost<=budget+.001){
            leg.selections.push(candidate);nextSummary.added.push(info);changed=true;
          }else{
            nextSummary.recommended.push(info);
          }
        }
      }
      const money=calcMoney(ticket);ticket.combinations=money.combinations;ticket.cost=money.cost;ticket.exactRankGuardVersion=VERSION;ticket.exactRankGuard={version:VERSION,appliedAt:new Date().toISOString(),modelId:modelIdForTicket(ticket),added:nextSummary.added.filter(x=>(ticket.legs||[]).some(l=>Number(l.raceNo)===Number(x.raceNo))).length};
    }
    summary=nextSummary;
    s.analyses=s.analyses||{};s.analyses.ticketV11={...(s.analyses.ticketV11||{}),exactRankGuard:{version:VERSION,added:summary.added.length,recommended:summary.recommended.length,checked:summary.checked,updatedAt:new Date().toISOString()}};
    try{if(typeof save==='function')save()}catch{}
    if(changed){try{if(typeof renderTicketsV11==='function')renderTicketsV11();else if(typeof renderTickets==='function')renderTickets()}catch{}}
    renderSummary();
  }catch(e){console.warn('[AT AI]',VERSION,'coupon guard warning',e)}finally{busy=false;if(queued){queued=false;setTimeout(()=>void applyGuard(),80)}}
}

function installObserver(){
  const host=$('tickets');if(!host||observer)return;
  observer=new MutationObserver(()=>{if(busy)return;const s=st();if(Array.isArray(s?.tickets)&&s.tickets.some(t=>t?.exactRankGuardVersion!==VERSION))setTimeout(()=>void applyGuard(),70)});
  observer.observe(host,{childList:true,subtree:true});
}
document.addEventListener('click',event=>{
  if(!event.target?.closest?.('#buildAllBtn,#careerOnlyBuildV1691F1'))return;
  for(const ms of[350,1000,2500,5000,9000])setTimeout(()=>{installObserver();void applyGuard()},ms);
},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installObserver();setTimeout(()=>void applyGuard(),700)},{once:true});else{installObserver();setTimeout(()=>void applyGuard(),700)}
window.ATExactRankCouponGuardV661={version:VERSION,apply:applyGuard,coverageRule,rankRows,getSummary:()=>summary};
console.info('[AT AI]',VERSION,'aktif — TAM eşleşmelerde gerçek kazananın kesin model sırası kuponu yalnız genişletebilir; puan/sıralama değişmez ve bütçe aşılmaz.');
})();
