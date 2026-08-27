/* AT AI Mobil — Annual Archive Finish Split Models V14.2
   TJK Yıllık Arşiv 5 Model ekranında her ana model için 1./2./3. referans
   sıralamalarını ayrı gösterir. Ana TOP3->yılın en iyi referansı sonucu korunur.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_FINISH_SPLITS_V142__) return;
window.__AT_ANNUAL_FINISH_SPLITS_V142__ = true;

const VERSION = 'ANNUAL-FIVE-MODEL-FINISH-SPLITS-V14.2';
const ARCHIVE_DB = 'at_ai_tjk_annual_archive_v13';
const ARCHIVE_STORE = 'races';
const CAREER_DB = 'at_ai_tjk_annual_career_v138';
const CAREER_STORE = 'careers';
const STORAGE_KEY = 'at_ai_mobil_state_v2';
let archiveDbPromise = null, careerDbPromise = null, busy = false;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
const keyText = v => upper(v).replace(/[^A-Z0-9]+/g, '').trim();
const finite = v => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const finishNo = (ref, index = 0) => { const n = Number(ref?.finish ?? ref?.rank ?? ref?.sira); return Number.isFinite(n) && n > 0 ? n : index + 1; };

function readState() {
  try { if (typeof state !== 'undefined' && state && typeof state === 'object') return state; } catch {}
  try { const x = localStorage.getItem(STORAGE_KEY); return x ? JSON.parse(x) : null; } catch { return null; }
}
function selectionSet() {
  const s = window.__AT_AA_SELECTED_IDS_V134__;
  return s && typeof s.values === 'function' ? s : null;
}
function openArchiveDb() {
  if (archiveDbPromise) return archiveDbPromise;
  archiveDbPromise = new Promise(resolve => {
    try { const q = indexedDB.open(ARCHIVE_DB); q.onsuccess = () => resolve(q.result); q.onerror = () => resolve(null); }
    catch { resolve(null); }
  });
  return archiveDbPromise;
}
function openCareerDb() {
  if (careerDbPromise) return careerDbPromise;
  careerDbPromise = new Promise(resolve => {
    try {
      const q = indexedDB.open(CAREER_DB, 1);
      q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(CAREER_STORE)) q.result.createObjectStore(CAREER_STORE, { keyPath:'key' }); };
      q.onsuccess = () => resolve(q.result); q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return careerDbPromise;
}
async function dbGet(dbFn, store, key) {
  const db = await dbFn(); if (!db) return null;
  return new Promise(resolve => {
    try { const q = db.transaction(store,'readonly').objectStore(store).get(key); q.onsuccess=()=>resolve(q.result?.value??null); q.onerror=()=>resolve(null); }
    catch { resolve(null); }
  });
}
async function dbPut(dbFn, store, key, value) {
  const db = await dbFn(); if (!db) return false;
  return new Promise(resolve => {
    try { const tx=db.transaction(store,'readwrite'); tx.objectStore(store).put({key,value,updatedAt:Date.now()}); tx.oncomplete=()=>resolve(true); tx.onerror=tx.onabort=()=>resolve(false); }
    catch { resolve(false); }
  });
}
async function selectedRows() {
  const s = selectionSet(); if (!s?.size) return [];
  const rows = await Promise.all([...s].map(id => dbGet(openArchiveDb, ARCHIVE_STORE, id)));
  return rows.filter(Boolean).sort((a,b)=>clean(a.date).localeCompare(clean(b.date)) || Number(a.raceNo||0)-Number(b.raceNo||0));
}
function currentContext() {
  const s=readState(), races=Array.isArray(s?.races)?s.races:[], selected=String(s?.selectedRace??'');
  const race=races.find(r=>String(r?.no??r?.raceNo)===selected)||(races.length===1?races[0]:null);
  if (!race) return null;
  const cityId=clean(s?.city);
  const city=clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===cityId)?.name)||clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent)||cityId;
  let meta=null; try { if (typeof programRaceMeta==='function') meta=programRaceMeta(race); } catch {}
  meta=meta||{ok:true,class:race.class||race.yaradi1||'',ageGroup:race.ageGroup||race.yaradi2||'',distance:race.distance||race.mesafe||'',track:race.track||race.pist||''};
  return {raceNo:Number(race.no||race.raceNo||0),city,date:clean(s?.date||document.getElementById('raceDate')?.value),meta,horses:(Array.isArray(race.horses)?race.horses:[]).filter(h=>h?.id)};
}
function chronological(rows) { return (Array.isArray(rows)?[...rows]:[]).filter(Boolean).sort((a,b)=>clean(a.isoDate||a.date).localeCompare(clean(b.isoDate||b.date))); }
function envelope(data,before) {
  const full=chronological(data?.history||data?.fullPathBefore||data?.roadmap||[]);
  const wins=chronological(data?.wins||full.filter(x=>Number(x?.finish??x?.rank??x?.sira)===1));
  const top5=chronological(data?.top5||full.filter(x=>{const f=Number(x?.finish??x?.rank??x?.sira);return f>=1&&f<=5;}));
  return {...data,ok:data?.ok!==false,cutoffExclusive:before,analysisMode:full.length?'FULL_PATH':'DEBUT',roadmap:full,fullPathBefore:full,historyBefore:full,comparisonPathBefore:full,roadmapBefore:full,fullPathBeforeCount:full.length,winsBefore:wins,top5Before:top5,preparationPathBefore:top5};
}
async function career(horseId,before) {
  const key=`${clean(horseId)}|${clean(before)}`;
  const cached=await dbGet(openCareerDb,CAREER_STORE,key);
  if (cached?.ok&&Array.isArray(cached.fullPathBefore)) return cached;
  const r=await fetch(`/api/tjk-career-v10?horseId=${encodeURIComponent(horseId)}&before=${encodeURIComponent(before)}`,{cache:'no-store'});
  const d=await r.json(); if(!r.ok||d?.ok===false) throw new Error(d?.error||`Kariyer API ${r.status}`);
  const value=envelope(d,before); await dbPut(openCareerDb,CAREER_STORE,key,value); return value;
}
async function mapLimit(items,limit,worker) {
  const list=Array.isArray(items)?items:[],out=new Array(list.length); let cursor=0;
  async function run(){while(true){const i=cursor++;if(i>=list.length)return;out[i]=await worker(list[i],i);}}
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length||1)},run)); return out;
}
function sameClass(a,b){try{if(typeof window.canonicalClassKeyV125==='function')return window.canonicalClassKeyV125(a)===window.canonicalClassKeyV125(b);}catch{}return keyText(a)===keyText(b);}
function sameAge(a,b){return keyText(a)===keyText(b);}
function sameTrack(a,b){const A=upper(a),B=upper(b);for(const t of ['CIM','KUM','SENTETIK'])if(A.includes(t)&&B.includes(t))return true;return keyText(a)===keyText(b);}
function conditionScore(ctx,row){
  try{
    const m=ctx.meta||{};
    const c=typeof classSimilarity==='function'?classSimilarity(m.class,row.classRaw):(sameClass(m.class,row.classRaw)?1:.4);
    const a=typeof ageGroupSimilarity==='function'?ageGroupSimilarity(m.ageGroup,row.groupRaw):(sameAge(m.ageGroup,row.groupRaw)?1:.4);
    const d=typeof distanceSimilarity==='function'?distanceSimilarity(m.distance,row.distance):Math.max(0,1-Math.abs(Number(m.distance)-Number(row.distance))/800);
    const t=typeof trackSimilarity==='function'?trackSimilarity(m.track,row.track):(sameTrack(m.track,row.track)?1:.12);
    const ci=typeof citySimilarity==='function'?citySimilarity(ctx.city,row.city):(keyText(ctx.city)===keyText(row.city)?1:.5);
    return Math.round(Math.max(0,Math.min(1,c*.30+a*.25+d*.18+t*.17+ci*.10))*100);
  }catch{return 50;}
}
function channel(ctx,row){
  const m=ctx.meta||{};
  if(sameClass(m.class,row.classRaw)&&sameAge(m.ageGroup,row.groupRaw)&&Number(m.distance)===Number(row.distance)&&sameTrack(m.track,row.track)&&keyText(ctx.city)===keyText(row.city))return'EXACT';
  if(sameClass(m.class,row.classRaw)&&sameAge(m.ageGroup,row.groupRaw))return'CONDITION_TWIN';
  return'RACE_FAMILY';
}
async function historicalRace(ctx,row){
  const r=await fetch(`/api/tjk-history?date=${encodeURIComponent(row.date)}&city=${encodeURIComponent(row.city)}&raceNo=${encodeURIComponent(row.raceNo)}`,{cache:'no-store'});
  const h=await r.json(); if(!r.ok||h?.ok===false)throw new Error(h?.error||`Tarihsel sonuç ${r.status}`);
  const sourceTop3=(Array.isArray(h?.top3)?h.top3:[]).map((ref,index)=>({...ref,finish:finishNo(ref,index)})).filter(ref=>Number(ref.finish)>=1&&Number(ref.finish)<=3).sort((a,b)=>Number(a.finish)-Number(b.finish)).slice(0,3);
  const top3=await mapLimit(sourceTop3,3,async ref=>{
    if(!ref?.horseId)return{...ref,career:{ok:false,fullPathBefore:[]}};
    try{return{...ref,career:await career(ref.horseId,row.date)};}catch(e){return{...ref,career:{ok:false,fullPathBefore:[],error:e?.message||String(e)}};}
  });
  const score=conditionScore(ctx,row),type=channel(ctx,row);
  return {...h,ok:true,date:row.date,city:row.city,raceNo:row.raceNo,sourceYear:Number(row.year||row.date.slice(0,4)),referenceType:type,raceConditionSimilarity:score,transferabilityScore:score,top3,top3Count:top3.length,annualArchiveId:row.id,annualReferenceRule:'TOP3_ONLY'};
}

const ANNUAL_PARTIAL_SUPPORT_VERSION = 'ANNUAL-PARTIAL-SUPPORT-V16.9.1F19';
const ANNUAL_LEGACY_YEARBEST_TOKEN_V1691F19 = 'ANNUAL_TOP3_YEAR_BEST_V14_1';
function annualPartialScoreV1691F19(pathScore, condition, path, referencePath) {
  const cleanPathScore = Math.max(0, Math.min(100, Number(pathScore) || 0));
  const cleanCondition = Math.max(0, Math.min(100, Number(condition) || 0));
  const baseScore = Math.round(cleanPathScore * cleanCondition / 100);
  let support = null;
  try {
    if (typeof window.careerPartialSupportV1691F18 === 'function') {
      support = window.careerPartialSupportV1691F18(path, referencePath, cleanCondition);
    }
  } catch {}
  const partialSupportScore = Math.max(0, Math.min(100, Number(support?.score) || 0));
  return {
    score: Math.max(baseScore, partialSupportScore),
    baseScore,
    partialSupportScore,
    partialSupportUsed: partialSupportScore > baseScore,
    partialSupport: support || { score: 0, pairCount: 0, topPairAvg: 0, coveragePct: 0, gaps: 0 }
  };
}
function annualBetterReferenceV1691F19(item, prev) {
  if (!prev) return true;
  if (item.score !== prev.score) return item.score > prev.score;
  if (Number(item.baseScore || 0) !== Number(prev.baseScore || 0)) return Number(item.baseScore || 0) > Number(prev.baseScore || 0);
  if (Number(item.partialSupportScore || 0) !== Number(prev.partialSupportScore || 0)) return Number(item.partialSupportScore || 0) > Number(prev.partialSupportScore || 0);
  if (Number(item.pathScore || 0) !== Number(prev.pathScore || 0)) return Number(item.pathScore || 0) > Number(prev.pathScore || 0);
  return Number(item.historicalFinish || 99) < Number(prev.historicalFinish || 99);
}
function annualSortReferencesV1691F19(a, b) {
  return Number(b.score || 0) - Number(a.score || 0) ||
    Number(b.baseScore || 0) - Number(a.baseScore || 0) ||
    Number(b.partialSupportScore || 0) - Number(a.partialSupportScore || 0) ||
    Number(b.pathScore || 0) - Number(a.pathScore || 0) ||
    Number(a.historicalFinish || 99) - Number(b.historicalFinish || 99) ||
    Number(b.year || 0) - Number(a.year || 0);
}

function annualYearBestScore(currentCareer,races,useCondition,finishFilter=null){
  const path=currentCareer?.fullPathBefore||currentCareer?.roadmap||[];
  const byYear=new Map(); let referencesEvaluated=0;
  for(const race of Array.isArray(races)?races:[]){
    if(race?.ok===false)continue;
    const year=Number(race?.sourceYear||String(race?.date||'').slice(0,4))||null;if(!year)continue;
    const refs=(Array.isArray(race?.top3)?race.top3:[]).filter((ref,index)=>{
      const f=finishNo(ref,index);
      if(f<1||f>3)return false;
      return finishFilter===null||Number(f)===Number(finishFilter);
    }).slice(0,3);
    for(const ref of refs){
      const rp=ref?.career?.fullPathBefore||ref?.career?.roadmap||[];
      if(!path.length||!rp.length)continue;
      referencesEvaluated++;
      const raw=typeof orderedPathSimilarity==='function'?orderedPathSimilarity(path,rp):0;
      const pathScore=Math.round(Math.max(0,Math.min(1,Number(raw)||0))*100);
      const condition=useCondition?Math.max(0,Math.min(100,Number(race?.transferabilityScore??race?.raceConditionSimilarity??100)||0)):100;
      const scored=annualPartialScoreV1691F19(pathScore,condition,path,rp);
      const item={year,score:scored.score,baseScore:scored.baseScore,pathScore,conditionScore:condition,partialSupportScore:scored.partialSupportScore,partialSupportUsed:scored.partialSupportUsed,partialSupport:scored.partialSupport,partialSupportVersion:ANNUAL_PARTIAL_SUPPORT_VERSION,historicalHorse:ref?.horseName||'',historicalHorseId:ref?.horseId||'',historicalFinish:finishNo(ref),raceDate:race?.date||'',raceCity:race?.city||'',raceNo:race?.raceNo||'',referenceType:race?.referenceType||'',currentPathCount:path.length,referencePathCount:rp.length,sourceRule:finishFilter===null?'ANNUAL_TOP3_YEAR_BEST_WITH_PARTIAL_V19':`ANNUAL_FINISH_${finishFilter}_YEAR_BEST_WITH_PARTIAL_V19`};
      const prev=byYear.get(year);
      if(annualBetterReferenceV1691F19(item,prev))byYear.set(year,item);
    }
  }
  const rows=[...byYear.values()].sort((a,b)=>b.year-a.year);
  const strongest=rows.length?[...rows].sort(annualSortReferencesV1691F19)[0]:null;
  return{score:strongest?.score??null,strongest,rows,baseScore:strongest?.baseScore??null,partialSupportScore:strongest?.partialSupportScore??0,partialSupportUsed:!!strongest?.partialSupportUsed,partialSupport:strongest?.partialSupport??null,partialSupportVersion:ANNUAL_PARTIAL_SUPPORT_VERSION,coverageYears:rows.length,strongYears:rows.filter(x=>x.score>=85).length,supportYears:rows.filter(x=>x.score>=70).length,latestScore:rows[0]?.score??null,referencesEvaluated,finishFilter,yearAggregation:'BEST_REFERENCE_PER_YEAR',referenceRule:finishFilter===null?'EACH_HISTORICAL_RACE_TOP3_PRE_RACE_CAREER':`ONLY_HISTORICAL_FINISH_${finishFilter}_PRE_RACE_CAREER`};
}
function composite(ch){
  try{if(typeof compositeScoreV11==='function')return compositeScoreV11(ch);}catch{}
  const w={exact:.4,twin:.25,family:.2,career:.15};let sum=0,used=0;
  for(const[k,weight]of Object.entries(w)){const v=finite(ch[k]?.score);if(v===null)continue;sum+=v*weight;used+=weight;}
  return{score:used?Math.round(sum/used):null};
}
function channelSet(c,models,finishFilter=null){
  const exact=annualYearBestScore(c,models.EXACT,true,finishFilter);
  const twin=annualYearBestScore(c,models.CONDITION_TWIN,true,finishFilter);
  const family=annualYearBestScore(c,models.RACE_FAMILY,true,finishFilter);
  const all=[...models.EXACT,...models.CONDITION_TWIN,...models.RACE_FAMILY].filter((r,i,a)=>a.findIndex(x=>x.date===r.date&&x.city===r.city&&Number(x.raceNo)===Number(r.raceNo))===i);
  const careerScore=annualYearBestScore(c,all,false,finishFilter);
  return{exact,twin,family,career:careerScore,composite:composite({exact,twin,family,career:careerScore})};
}
function modelScores(c,models){return{...channelSet(c,models,null),byFinish:{1:channelSet(c,models,1),2:channelSet(c,models,2),3:channelSet(c,models,3)}};}
function scoreObj(x,id,finish=null){return finish===null?x?.scores?.[id]:x?.scores?.byFinish?.[finish]?.[id];}
function ranking(data,id,finish=null){
  return data.horses.map(x=>{
    const detail=scoreObj(x,id,finish)||{};
    return {...x,displayScore:finite(detail.score),displayBaseScore:finite(detail.baseScore),displayPartialSupportScore:finite(detail.partialSupportScore),displayStrongYears:Number(detail.strongYears||0),displaySupportYears:Number(detail.supportYears||0)};
  }).filter(x=>x.displayScore!==null).sort((a,b)=>b.displayScore-a.displayScore||b.displayStrongYears-a.displayStrongYears||b.displaySupportYears-a.displaySupportYears||Number(b.displayBaseScore||0)-Number(a.displayBaseScore||0)||Number(b.displayPartialSupportScore||0)-Number(a.displayPartialSupportScore||0)||Number(a.horse.no||999)-Number(b.horse.no||999));
}
function modelLabel(id){return({composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'})[id]||id;}
function rankHtml(data,id,finish=null){
  const rank=ranking(data,id,finish);
  return rank.length?rank.map((x,n)=>{
    const detail=scoreObj(x,id,finish)||{};const best=detail?.strongest;const partial=detail?.partialSupportUsed?` · parça %${esc(detail.partialSupportScore)}; tam yol %${esc(detail.baseScore)}`:'' ;
    return `<div class="career-model-rank-v112" style="display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px"><span class="career-model-rank-no-v112">${n+1}</span><div class="career-model-rank-horse-v112"><b>${esc(x.horse.no)}. ${esc(x.horse.name)}</b><small>${x.career?.fullPathBeforeCount||0} kariyer yarışı${best?` · en iyi: ${esc(best.year)} ${esc(best.historicalHorse)} (${esc(best.historicalFinish)}.)`:''}${partial}${finish!==null?` · yalnız ${finish}. referanslar`:''}</small></div><div class="career-model-rank-score-v112"><strong>%${esc(x.displayScore)}</strong></div></div>`;
  }).join(''):'<div class="career-model-empty-v112">Bu alt model için karşılaştırılabilir veri yok.</div>';
}
function render(data,ctx,rows){
  const out=document.getElementById('aaAnalysis');if(!out)return;
  const ids=['composite','exact','twin','family','career'];
  out.innerHTML=`<div class="aa-section"><h3>5 Model Kariyer Yol Haritası</h3><div class="aa-note"><b>${esc(ctx.raceNo)}. Koşu · ${esc(ctx.city)} · ${esc(ctx.date)}</b><br>${rows.length} seçilmiş tarihsel yarış kullanıldı.<br><b>Referans kuralı:</b> Her geçmiş yarışın 1.-2.-3. atı ayrı karşılaştırılır; her yıl için en yüksek kariyer yolu benzerliği tutulur.<br><b>Alt modeller:</b> 1 = yalnız geçmiş 1.’ler, 2 = yalnız geçmiş 2.’ler, 3 = yalnız geçmiş 3.’ler.</div><div class="career-model-tabs-v112">${ids.map((id,i)=>`<button class="career-model-tab-v112 ${i===0?'active':''}" data-v142-main-tab="${id}">${modelLabel(id)}</button>`).join('')}</div>${ids.map((id,i)=>`<div class="career-model-panel-v112 ${i===0?'active':''}" data-v142-main-panel="${id}"><div class="career-model-panel-head-v112"><b>${modelLabel(id)}</b></div><div class="career-model-tabs-v112" style="margin:8px 0 10px;overflow-x:auto;flex-wrap:nowrap"><button class="career-model-tab-v112 active" data-v142-sub-tab="${id}|all">Genel</button>${[1,2,3].map(f=>`<button class="career-model-tab-v112" data-v142-sub-tab="${id}|${f}">${modelLabel(id)} ${f}</button>`).join('')}</div><div data-v142-sub-panel="${id}|all">${rankHtml(data,id,null)}</div>${[1,2,3].map(f=>`<div data-v142-sub-panel="${id}|${f}" style="display:none">${rankHtml(data,id,f)}</div>`).join('')}</div>`).join('')}</div>`;
  out.querySelectorAll('[data-v142-main-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.v142MainTab;
    out.querySelectorAll('[data-v142-main-tab]').forEach(x=>x.classList.toggle('active',x===btn));
    out.querySelectorAll('[data-v142-main-panel]').forEach(x=>x.classList.toggle('active',x.dataset.v142MainPanel===id));
  }));
  out.querySelectorAll('[data-v142-sub-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.v142SubTab,id=key.split('|')[0];
    const panel=out.querySelector(`[data-v142-main-panel="${id}"]`);if(!panel)return;
    panel.querySelectorAll('[data-v142-sub-tab]').forEach(x=>x.classList.toggle('active',x===btn));
    panel.querySelectorAll('[data-v142-sub-panel]').forEach(x=>x.style.display=x.dataset.v142SubPanel===key?'block':'none');
  }));
}
async function run(){
  if(busy)return;busy=true;
  const out=document.getElementById('aaAnalysis');if(out)out.innerHTML='<div class="aa-note">Seçilen yarışların 1.-2.-3. atları ayrı alt modeller için hazırlanıyor…</div>';
  try{
    const ctx=currentContext();if(!ctx?.meta?.ok)throw new Error('Bugünkü programdan tek bir koşu seçin.');
    const rows=(await selectedRows()).filter(r=>r.raceNo&&r.date<ctx.date);if(!rows.length)throw new Error('Koşu No’su kesinleşmiş en az bir geçmiş yarış seçin.');
    let done=0;
    const refs=await mapLimit(rows,2,async row=>{const r=await historicalRace(ctx,row);done++;if(out)out.innerHTML=`<div class="aa-note">İlk 3 referans yarışları: ${done}/${rows.length}</div>`;return r;});
    const models={EXACT:[],CONDITION_TWIN:[],RACE_FAMILY:[]};for(const r of refs)models[r.referenceType]?.push(r);
    let hd=0;
    const horses=await mapLimit(ctx.horses,2,async horse=>{
      try{const c=await career(horse.id,ctx.date);hd++;if(out)out.innerHTML=`<div class="aa-note">Bugünkü atlar ve 1/2/3 alt modelleri: ${hd}/${ctx.horses.length}</div>`;return{horse,career:c,scores:modelScores(c,models)};}
      catch(e){return{horse,career:{ok:false,fullPathBefore:[]},scores:{exact:{score:null},twin:{score:null},family:{score:null},career:{score:null},composite:{score:null},byFinish:{1:{},2:{},3:{}}},error:e?.message||String(e)};}
    });
    render({horses},ctx,rows);
  }catch(e){if(out)out.innerHTML=`<div class="aa-note" style="color:#ffbd82">${esc(e?.message||e)}</div>`;}
  finally{busy=false;}
}

/* annual-top3-cache-v137 trusted tıklamayı hazırlayıp sentetik .click() üretir.
   Window capture, eski V14.1 document-capture handlerından önce bu sentetik olayı alır. */
window.addEventListener('click',event=>{
  const btn=event.target?.closest?.('#aaRunSelected');
  if(!btn||event.isTrusted)return;
  event.preventDefault();event.stopImmediatePropagation();run();
},true);

function installExport(){
  const old=window.ATAnnualCareerFiveModelV138||{};
  window.ATAnnualCareerFiveModelV138={...old,version:VERSION,run,scoringRule:'TOP3_YEARBEST_PLUS_FINISH_1_2_3_SPLITS_WITH_PARTIAL_SUPPORT_F19'};
}
window.addEventListener('at-ai:annual-archive-created',installExport);
window.addEventListener('at-ai:annual-archive-open',installExport);
installExport();
console.info('[AT AI]',VERSION,'aktif — Bileşik/Tam/İkiz/Aile/Kariyer için 1-2-3 alt sıralamaları');
})();
