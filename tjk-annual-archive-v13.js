/* AT AI Mobil — TJK Annual Race Archive V13
   Separate module. Does not modify Career source files.
   Annual rows are stored in IndexedDB and selected races are resolved lazily.
*/
(() => {
'use strict';
if (window.__AT_TJK_ANNUAL_ARCHIVE_V13__) return;
window.__AT_TJK_ANNUAL_ARCHIVE_V13__ = true;

const VERSION='TJK-ANNUAL-ARCHIVE-V13.0';
const DB_NAME='at_ai_tjk_annual_archive_v13';
const DB_VERSION=1;
const STORE_RACES='races';
const STORE_META='meta';
const STORE_PAGES='pages';
const STORE_DAY='daycache';
const PAGE_SIZE=50;
const FETCH_CONCURRENCY=5;
const API_ANNUAL='/tjk-annual-source';
const CURRENT_YEAR=new Date().getFullYear();
let dbPromise=null;
let selectedIds=new Set();
let currentRows=[];
let tokenUniverse=[];
let activeUpdate=false;
let activeAnalysis=false;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
const norm=v=>upper(v).replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,' ').trim();
const normKey=v=>norm(v).replace(/\s+/g,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function isoDate(v=''){const m=clean(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:clean(v)}
function displayDate(v=''){const m=clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:clean(v)}
function tjkDate(v=''){const m=clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:clean(v)}
function parseMoney(v=''){const t=clean(v).replace(/\./g,'').replace(',','.');const n=Number(t.replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null}
function canonicalToken(v=''){
  const t=upper(v).replace(/\s+/g,'').replace(/^\/+|\/+$/g,'');
  if(!t)return'';
  if(t==='D'||t==='DISI'||t==='DİŞİ')return'DISI';
  if(t==='E'||t==='ERKEK')return'ERKEK';
  const ym=t.match(/^Y-?(\d+)$/);if(ym)return`Y${ym[1]}`;
  const hm=t.match(/^H-?(\d+)$/);if(hm)return`H${hm[1]}`;
  return t.replace(/İ/g,'I');
}
function tokenLabel(t=''){if(t==='DISI')return'Dişi';if(t==='ERKEK')return'Erkek';return t}
function parseClass(raw=''){
  const text=clean(raw).replace(/\s*\/\s*/g,'/');
  const parts=text.split('/').map(clean).filter(Boolean);
  const base=parts.shift()||'';
  const tokens=parts.map(canonicalToken).filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr'));
  const fallback=`${normKey(base)}${tokens.length?'/'+tokens.join('/'):''}`;
  let key=fallback;
  try{if(typeof window.canonicalClassKeyV125==='function')key=window.canonicalClassKeyV125(raw)||fallback}catch{}
  return{raw:clean(raw),base:clean(base),baseKey:normKey(base),tokens,key};
}
function trackKey(v=''){const t=upper(v);if(t.includes('CIM'))return'CIM';if(t.includes('KUM'))return'KUM';if(t.includes('SENTETIK'))return'SENTETIK';return normKey(v)}
function ageKey(v=''){return normKey(v)}
function baseIdentity(r){return [r.date,r.cityId,ageKey(r.groupRaw),normKey(r.classRaw),r.distance,trackKey(r.track),clean(r.prizeRaw),normKey(r.raceName)].join('|')}
function raceId(r,occ){return `${baseIdentity(r)}|${occ}`}
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
    if(!('indexedDB'in window))return resolve(null);
    let req;try{req=indexedDB.open(DB_NAME,DB_VERSION)}catch{return resolve(null)}
    req.onupgradeneeded=()=>{const db=req.result;for(const s of [STORE_RACES,STORE_META,STORE_PAGES,STORE_DAY])if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'key'})};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);
  });
  return dbPromise;
}
async function dbGet(store,key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).get(key);q.onsuccess=()=>resolve(q.result?.value??null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function dbGetAll(store){const db=await openDb();if(!db)return[];return new Promise(resolve=>{try{const q=db.transaction(store,'readonly').objectStore(store).getAll();q.onsuccess=()=>resolve((q.result||[]).map(x=>x.value));q.onerror=()=>resolve([])}catch{resolve([])}})}
async function dbPut(store,key,value){const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put({key,value,updatedAt:Date.now()});tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function dbDeleteKeys(store,keys){const db=await openDb();if(!db)return;return new Promise(resolve=>{try{const tx=db.transaction(store,'readwrite'),os=tx.objectStore(store);for(const k of keys)os.delete(k);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();tx.onabort=()=>resolve()}catch{resolve()}})}
async function replaceYear(year,rows){const all=await dbGetAll(STORE_RACES),keys=all.filter(x=>Number(x.year)===Number(year)).map(x=>x.id);await dbDeleteKeys(STORE_RACES,keys);const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction(STORE_RACES,'readwrite'),os=tx.objectStore(STORE_RACES);for(const row of rows)os.put({key:row.id,value:row,updatedAt:Date.now()});tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function mapLimit(items,limit,worker){const list=Array.isArray(items)?items:[],out=new Array(list.length);let cursor=0;async function run(){while(true){const i=cursor++;if(i>=list.length)return;out[i]=await worker(list[i],i)}}await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length||1)},run));return out}
async function fetchText(url,retries=2){let last;for(let i=0;i<=retries;i++){const c=new AbortController(),t=setTimeout(()=>c.abort(),30000);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text()}catch(e){last=e;if(!navigator.onLine)throw new Error('İnternet bağlantısı kesildi.');if(i<retries)await new Promise(x=>setTimeout(x,800*(i+1)))}finally{clearTimeout(t)}}throw last||new Error('Veri alınamadı')}
async function fetchJson(url,retries=1){let last;for(let i=0;i<=retries;i++){const c=new AbortController(),t=setTimeout(()=>c.abort(),35000);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});const d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||`HTTP ${r.status}`);return d}catch(e){last=e;if(!navigator.onLine)throw new Error('İnternet bağlantısı kesildi.');if(i<retries)await new Promise(x=>setTimeout(x,700*(i+1)))}finally{clearTimeout(t)}}throw last||new Error('API yanıtı alınamadı')}
function annualUrl(year,page,bust){const u=new URL(API_ANNUAL,location.origin);u.searchParams.set('QueryParameter_Tarih_Start',`01/01/${year}`);u.searchParams.set('QueryParameter_Tarih_End',`31/12/${year}`);if(page>0)u.searchParams.set('PageNumber',String(page));u.searchParams.set('_at',bust);return u.pathname+u.search}
function parseAnnualHtml(html,page=0){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const rows=[];
  [...doc.querySelectorAll('tr')].forEach((tr,rowIndex)=>{
    if(tr.classList.contains('hidable'))return;
    const cells=[...tr.querySelectorAll('td')];if(cells.length<8)return;
    const date=isoDate(cells[0].textContent),city=clean(cells[1].textContent),groupRaw=clean(cells[2].textContent),classRaw=clean(cells[3].textContent),distance=Number(clean(cells[4].textContent).match(/\d+/)?.[0]||0),track=clean(cells[5].textContent),prizeRaw=clean(cells[6].textContent),raceName=clean(cells[7].textContent);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!city||!classRaw||!distance)return;
    const href=cells[0].querySelector('a')?.getAttribute('href')||cells[1].querySelector('a')?.getAttribute('href')||'';
    let cityId='';try{cityId=new URL(href,'https://www.tjk.org').searchParams.get('SehirId')||''}catch{}
    const ci=parseClass(classRaw);
    rows.push({date,year:Number(date.slice(0,4)),city,cityId,groupRaw,classRaw,classBase:ci.base,classBaseKey:ci.baseKey,classKey:ci.key,extraTokens:ci.tokens,distance,track,trackKey:trackKey(track),prizeRaw,prize:parseMoney(prizeRaw),raceName,annualProgramUrl:href?new URL(href,'https://www.tjk.org').toString():'',page,rowIndex,raceNo:null,permanentKey:null,resolutionMethod:null,candidateRaceNos:[]});
  });
  const text=clean(doc.body?.textContent||'');
  const tm=text.match(/Toplam\s+([\d.]+)\s+sonuçtan/i);const total=tm?Number(tm[1].replace(/\./g,'')):rows.length;
  return{rows,total};
}
function finalizeRows(rows,year){const count=new Map(),out=[];for(const r of rows){if(Number(r.year)!==Number(year))continue;const base=baseIdentity(r),occ=(count.get(base)||0)+1;count.set(base,occ);out.push({...r,occurrenceIndex:occ,id:raceId(r,occ)})}return out}
async function fetchAnnualPage(year,page,bust){const key=`${year}|${page}|${bust}`;const cached=await dbGet(STORE_PAGES,key);if(cached)return cached;const parsed=parseAnnualHtml(await fetchText(annualUrl(year,page,bust)),page);await dbPut(STORE_PAGES,key,parsed);return parsed}
async function clearYearPages(year){const all=await dbGetAll(STORE_PAGES);await dbDeleteKeys(STORE_PAGES,all.filter(x=>Number(x.year)===Number(year)).map(x=>x.key).filter(Boolean))}
function setUpdateStatus(msg,pct=null){const el=$('aaUpdateStatus');if(el)el.textContent=msg;const bar=$('aaProgressBar');if(bar&&pct!==null)bar.style.width=`${Math.max(0,Math.min(100,pct))}%`}
async function updateYear(year){
  if(activeUpdate)return;activeUpdate=true;const btn=$('aaUpdateYear');if(btn)btn.disabled=true;
  const bust=String(Date.now());
  try{
    await dbPut(STORE_META,`year:${year}`,{year,status:'updating',startedAt:new Date().toISOString(),recordCount:(await yearRows(year)).length});
    setUpdateStatus(`${year} ilk sayfa TJK'dan alınıyor…`,1);
    const first=await fetchAnnualPage(year,0,bust);if(!first.rows.length)throw new Error('TJK yıllık programı boş döndü.');
    const pages=Math.max(1,Math.ceil(Number(first.total||first.rows.length)/PAGE_SIZE));
    const pageNos=Array.from({length:Math.max(0,pages-1)},(_,i)=>i+1);let done=1;
    const rest=await mapLimit(pageNos,FETCH_CONCURRENCY,async p=>{const v=await fetchAnnualPage(year,p,bust);done++;setUpdateStatus(`${year}: ${done}/${pages} sayfa alındı…`,Math.round(done/pages*88));return v});
    let combined=[...first.rows,...rest.flatMap(x=>x.rows)];
    const final=finalizeRows(combined,year);
    const expected=Number(first.total||0);
    if(expected>0&&final.length<Math.min(expected,Math.floor(expected*.90)))throw new Error(`TJK sayfalama doğrulaması başarısız (${final.length}/${expected}).`);
    setUpdateStatus(`${year}: ${final.length} yarış yerel arşive yazılıyor…`,92);
    const ok=await replaceYear(year,final);if(!ok)throw new Error('IndexedDB arşiv yazımı başarısız.');
    await dbPut(STORE_META,`year:${year}`,{year,status:'complete',recordCount:final.length,totalReported:expected,updatedAt:new Date().toISOString(),version:VERSION});
    setUpdateStatus(`${year} tamamlandı: ${final.length} yarış.`,100);
    await refreshArchiveUi(true);
  }catch(e){await dbPut(STORE_META,`year:${year}`,{year,status:'error',error:e?.message||String(e),updatedAt:new Date().toISOString()});setUpdateStatus(`${year} güncellenemedi: ${e?.message||e}`,0)}finally{activeUpdate=false;if(btn)btn.disabled=false}
}
async function yearRows(year){return (await dbGetAll(STORE_RACES)).filter(x=>Number(x.year)===Number(year))}
async function allCompleteMeta(){return (await dbGetAll(STORE_META)).filter(x=>x?.status==='complete'&&Number(x.year)).sort((a,b)=>a.year-b.year)}
function unique(rows,field){return [...new Set(rows.map(x=>clean(x[field])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr',{numeric:true}))}
function fillSelect(id,values,allLabel='Tümü'){const el=$(id);if(!el)return;const cur=el.value;el.innerHTML=`<option value="">${esc(allLabel)}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(values.includes(cur))el.value=cur}
async function refreshArchiveUi(preserve=false){
  const rows=await dbGetAll(STORE_RACES),metas=await allCompleteMeta();
  const yp=$('aaYearPills');if(yp)yp.innerHTML=metas.length?metas.map(m=>`<span class="aa-pill"><b>${m.year}</b> · ${m.recordCount} yarış</span>`).join(''):'<span class="aa-pill">Henüz yıllık arşiv yok</span>';
  const years=metas.map(m=>String(m.year));fillSelect('aaYearFrom',years,'İlk yıl');fillSelect('aaYearTo',years,'Son yıl');
  if(!preserve&&years.length){$('aaYearFrom').value=years[0];$('aaYearTo').value=years[years.length-1]}
  fillSelect('aaCity',unique(rows,'city'));fillSelect('aaGroup',unique(rows,'groupRaw'));fillSelect('aaClassBase',unique(rows,'classBase'));fillSelect('aaDistance',unique(rows,'distance').map(String));fillSelect('aaTrack',unique(rows,'track'));
  tokenUniverse=[...new Set(rows.flatMap(x=>x.extraTokens||[]))].sort((a,b)=>a.localeCompare(b,'tr',{numeric:true}));renderTokenPills();if(!preserve)prefillCurrentRace();searchArchive();
}
function renderTokenPills(selected=[]){const box=$('aaTokens');if(!box)return;const sel=new Set(selected);box.innerHTML=tokenUniverse.map(t=>`<label class="aa-token"><input type="checkbox" value="${esc(t)}" ${sel.has(t)?'checked':''}>${esc(tokenLabel(t))}</label>`).join('')||'<span class="aa-pill">Ek şart yok</span>';box.querySelectorAll('input').forEach(x=>x.addEventListener('change',searchArchive))}
function currentRaceContext(){
  try{
    const races=Array.isArray(window.state?.races)?window.state.races:[];const selected=String(window.state?.selectedRace??'');let race=races.find(r=>String(r?.no??r?.raceNo??r?.kosuNo)===selected)||null;if(!race&&races.length===1)race=races[0];if(!race)return null;
    const meta=typeof window.programRaceMeta==='function'?window.programRaceMeta(race):{ok:true,class:race.class||race.yaradi1||'',ageGroup:race.ageGroup||race.yaradi2||'',distance:race.distance||race.mesafe||'',track:race.track||race.pist||''};
    const horses=Array.isArray(race.horses)?race.horses:[];return{race,meta,raceNo:race.no??race.raceNo,city:typeof window.getCityName==='function'?window.getCityName():clean(window.state?.city),date:clean(window.state?.date),horses};
  }catch{return null}
}
function prefillCurrentRace(){const c=currentRaceContext();if(!c?.meta?.ok)return;const ci=parseClass(c.meta.class||'');const setters=[['aaCity',c.city],['aaGroup',clean(c.meta.ageGroup)],['aaClassBase',ci.base],['aaDistance',String(c.meta.distance||'')],['aaTrack',clean(c.meta.track)]];for(const[id,v]of setters){const el=$(id);if(el&&[...el.options].some(o=>o.value===v))el.value=v}renderTokenPills(ci.tokens);const yf=$('aaYearFrom'),yt=$('aaYearTo');if(yt&&[...yt.options].length>1){const vals=[...yt.options].map(o=>Number(o.value)).filter(Boolean).filter(y=>y<Number(c.date.slice(0,4)||CURRENT_YEAR));if(vals.length)yt.value=String(Math.max(...vals))}searchArchive()}
function selectedTokens(){return [...document.querySelectorAll('#aaTokens input:checked')].map(x=>x.value)}
async function searchArchive(){
  const all=await dbGetAll(STORE_RACES);const yf=Number($('aaYearFrom')?.value||0),yt=Number($('aaYearTo')?.value||9999),city=clean($('aaCity')?.value),group=clean($('aaGroup')?.value),base=clean($('aaClassBase')?.value),dist=Number($('aaDistance')?.value||0),track=clean($('aaTrack')?.value),name=norm($('aaRaceName')?.value),tokens=selectedTokens();
  currentRows=all.filter(r=>Number(r.year)>=yf&&Number(r.year)<=yt&&(!city||r.city===city)&&(!group||r.groupRaw===group)&&(!base||r.classBase===base)&&(!dist||Number(r.distance)===dist)&&(!track||r.track===track)&&(!name||norm(r.raceName).includes(name))&&tokens.every(t=>(r.extraTokens||[]).includes(t))).sort((a,b)=>b.date.localeCompare(a.date)||a.city.localeCompare(b.city,'tr')||a.rowIndex-b.rowIndex);
  renderResults();
}
function renderResults(){const box=$('aaResults'),count=$('aaResultCount');if(count)count.textContent=`${currentRows.length} yarış bulundu · ${selectedIds.size} seçili`;if(!box)return;const rows=currentRows.slice(0,250);box.innerHTML=rows.length?rows.map(r=>{
  const checked=selectedIds.has(r.id)?'checked':'';let status=r.raceNo?`<span class="aa-resolved">${esc(r.raceNo)}.K ✓</span>`:`<span class="aa-unresolved">Koşu No çözülmedi</span>`;if(!r.raceNo&&Array.isArray(r.candidateRaceNos)&&r.candidateRaceNos.length>1)status=`<select class="aa-candidate" data-candidate="${esc(r.id)}"><option value="">Koşu seç…</option>${r.candidateRaceNos.map(n=>`<option value="${n}">${n}. Koşu</option>`).join('')}</select>`;
  return`<div class="aa-row"><input type="checkbox" data-select="${esc(r.id)}" ${checked}><div class="aa-row-main"><div class="aa-row-title">${esc(displayDate(r.date))} · ${esc(r.city)} · ${esc(r.classRaw)} · ${esc(r.distance)} ${esc(r.track)}</div><div class="aa-row-sub">${esc(r.groupRaw)}${r.raceName?` · ${esc(r.raceName)}`:''} · ${esc(r.prizeRaw)}<br>Kanonik: ${esc(r.classBase)}${r.extraTokens?.length?' · '+r.extraTokens.map(tokenLabel).map(esc).join(' · '):''}</div></div><div>${status}</div></div>`
}).join(''):'<div class="aa-note">Bu filtrelerle yerel arşivde yarış bulunamadı.</div>';
  box.querySelectorAll('[data-select]').forEach(x=>x.addEventListener('change',()=>{x.checked?selectedIds.add(x.dataset.select):selectedIds.delete(x.dataset.select);renderResults()}));
  box.querySelectorAll('[data-candidate]').forEach(x=>x.addEventListener('change',async()=>{const id=x.dataset.candidate,n=Number(x.value||0);if(!id||!n)return;const row=(await dbGetAll(STORE_RACES)).find(r=>r.id===id);if(!row)return;row.raceNo=n;row.permanentKey=`${row.date}|${row.cityId}|${n}`;row.resolutionMethod='MANUAL_CANDIDATE';row.candidateRaceNos=[];await dbPut(STORE_RACES,row.id,row);await searchArchive()}));
}
async function dayProgram(row){const key=`${row.date}|${row.cityId}|${row.city}`;const cached=await dbGet(STORE_DAY,key);if(cached)return cached;const q=`/api/tjk-race-meta?date=${encodeURIComponent(row.date)}&cityId=${encodeURIComponent(row.cityId)}&cityName=${encodeURIComponent(row.city)}`;const d=await fetchJson(q);await dbPut(STORE_DAY,key,d);return d}
function matchRaceCandidates(row,day){return (Array.isArray(day?.races)?day.races:[]).filter(r=>{const ci=parseClass(r.class||r.yaradi1||'');return ci.key===row.classKey&&ageKey(r.ageGroup||r.yaradi2||'')===ageKey(row.groupRaw)&&Number(r.distance||r.mesafe||0)===Number(row.distance)&&trackKey(r.track||r.pist||'')===row.trackKey}).map(r=>Number(r.no)).filter(Boolean).sort((a,b)=>a-b)}
async function resolveRows(rows){
  const unresolved=rows.filter(r=>!r.raceNo);if(!unresolved.length)return rows;let done=0;setUpdateStatus(`${unresolved.length} yarışın Koşu No'su çözülüyor…`,null);
  await mapLimit(unresolved,3,async row=>{try{const day=await dayProgram(row),cands=matchRaceCandidates(row,day);row.candidateRaceNos=cands;if(cands.length===1){row.raceNo=cands[0];row.permanentKey=`${row.date}|${row.cityId}|${row.raceNo}`;row.resolutionMethod='EXACT_DAILY_PROGRAM'}else if(cands.length>1){const same=currentRows.filter(x=>x.date===row.date&&x.cityId===row.cityId&&x.classKey===row.classKey&&ageKey(x.groupRaw)===ageKey(row.groupRaw)&&Number(x.distance)===Number(row.distance)&&x.trackKey===row.trackKey).sort((a,b)=>a.occurrenceIndex-b.occurrenceIndex);const idx=Math.max(0,same.findIndex(x=>x.id===row.id));if(cands[idx]){row.raceNo=cands[idx];row.permanentKey=`${row.date}|${row.cityId}|${row.raceNo}`;row.resolutionMethod='EXACT_OCCURRENCE_INDEX';row.candidateRaceNos=cands}}
      await dbPut(STORE_RACES,row.id,row)}catch(e){row.resolveError=e?.message||String(e);await dbPut(STORE_RACES,row.id,row)}finally{done++;setUpdateStatus(`Koşu No çözümleme: ${done}/${unresolved.length}`,null)}});
  await searchArchive();return (await dbGetAll(STORE_RACES)).filter(r=>rows.some(x=>x.id===r.id));
}
function conditionScore(current,row){try{const cm=current?.meta||{},classS=typeof window.classSimilarity==='function'?window.classSimilarity(cm.class||'',row.classRaw):parseClass(cm.class||'').key===row.classKey?1:.5,ageS=typeof window.ageGroupSimilarity==='function'?window.ageGroupSimilarity(cm.ageGroup||'',row.groupRaw):ageKey(cm.ageGroup||'')===ageKey(row.groupRaw)?1:.4,distS=typeof window.distanceSimilarity==='function'?window.distanceSimilarity(cm.distance,row.distance):Math.max(0,1-Math.abs(Number(cm.distance||0)-Number(row.distance))/800),trackS=typeof window.trackSimilarity==='function'?window.trackSimilarity(cm.track||'',row.track):trackKey(cm.track||'')===row.trackKey?1:.15,cityS=typeof window.citySimilarity==='function'?window.citySimilarity(current.city,row.city):normKey(current.city)===normKey(row.city)?1:.5;return Math.round(Math.max(0,Math.min(1,classS*.30+ageS*.25+distS*.18+trackS*.17+cityS*.10))*100)}catch{return 50}}
function fullEnvelope(data,before){const full=Array.isArray(data?.history)?data.history:[],wins=Array.isArray(data?.wins)?data.wins:full.filter(x=>Number(x.finish)===1),top5=Array.isArray(data?.top5)?data.top5:full.filter(x=>Number(x.finish)>=1&&Number(x.finish)<=5);return{ok:data?.ok!==false,cutoffExclusive:before,fullPathBefore:full,historyBefore:full,roadmapBefore:full,comparisonPathBefore:full,fullPathBeforeCount:full.length,winsBefore:wins,top5Before:top5,preparationPathBefore:top5,analysisMode:full.length?'FULL_PATH':'DEBUT'}}
async function historicalReference(current,row){const h=await fetchJson(`/api/tjk-history?date=${encodeURIComponent(row.date)}&city=${encodeURIComponent(row.city)}&raceNo=${encodeURIComponent(row.raceNo)}`);const top3=await mapLimit(h.top3||[],3,async ref=>{if(!ref.horseId)return{...ref,career:{ok:false,fullPathBefore:[]}};try{const c=await fetchJson(`/api/tjk-career-v10?horseId=${encodeURIComponent(ref.horseId)}&before=${encodeURIComponent(row.date)}`);return{...ref,finish:ref.finish,horseId:ref.horseId,horseName:ref.horseName,career:fullEnvelope(c,row.date)}}catch(e){return{...ref,career:{ok:false,fullPathBefore:[],error:e?.message||String(e)}}}});const cs=conditionScore(current,row);return{ok:true,date:row.date,city:row.city,raceNo:row.raceNo,sourceYear:row.year,referenceType:'ANNUAL_ARCHIVE_SELECTED',referenceLabel:'YILLIK ARŞİV SEÇİMİ',raceConditionSimilarity:cs,transferabilityScore:cs,transferabilityTier:cs>=85?'HIGH':cs>=70?'MEDIUM':cs>=50?'SUPPORT':'LOW',top3,top3Count:top3.length,annualArchiveId:row.id}}
function fallbackSimilarity(currentPath,historicalRaces){let best=null;for(const race of historicalRaces){for(const ref of race.top3||[]){const p=ref?.career?.fullPathBefore||[];if(!currentPath.length||!p.length)continue;const raw=typeof window.orderedPathSimilarity==='function'?window.orderedPathSimilarity(currentPath,p):0;const score=Math.round(raw*Number(race.transferabilityScore||100));if(!best||score>best.score)best={score,pathScore:Math.round(raw*100),conditionScore:race.transferabilityScore,historicalHorse:ref.horseName,historicalFinish:ref.finish,raceDate:race.date,raceCity:race.city,raceNo:race.raceNo}}}return{score:best?.score??null,strongest:best,byYear:[],referenceCount:historicalRaces.length,analysisMode:'FULL_PATH'}}
async function runSelectedAnalysis(){
  if(activeAnalysis)return;activeAnalysis=true;const out=$('aaAnalysis');out.innerHTML='<div class="aa-note">Seçilen yarışlar hazırlanıyor…</div>';
  try{
    let rows=(await dbGetAll(STORE_RACES)).filter(r=>selectedIds.has(r.id));if(!rows.length)throw new Error('Önce en az bir tarihsel yarış seçin.');rows=await resolveRows(rows);const unresolved=rows.filter(r=>!r.raceNo);if(unresolved.length)throw new Error(`${unresolved.length} seçili yarışın Koşu No'su kesinleştirilemedi. Aday varsa listeden seçin.`);
    const current=currentRaceContext();if(!current?.meta?.ok)throw new Error('Bugünkü programdan bir koşu seçili olmalı.');const horses=current.horses.filter(h=>h?.id);if(!horses.length)throw new Error('Seçili güncel koşuda TJK At ID bulunamadı.');
    out.innerHTML=`<div class="aa-note">${rows.length} tarihsel yarışın ilk 3'ü ve yarış öncesi tam kariyer yolları hazırlanıyor…</div>`;
    let hrDone=0;const historicalRaces=await mapLimit(rows,2,async r=>{const v=await historicalReference(current,r);hrDone++;out.innerHTML=`<div class="aa-note">Tarihsel referans: ${hrDone}/${rows.length} · sonra ${horses.length} güncel at karşılaştırılacak.</div>`;return v});
    let horseDone=0;const scored=await mapLimit(horses,3,async horse=>{let career;try{career=await fetchJson(`/api/tjk-career-v10?horseId=${encodeURIComponent(horse.id)}&before=${encodeURIComponent(current.date)}`)}catch(e){return{horse,score:null,error:e?.message||String(e)}}const path=Array.isArray(career.history)?career.history:[];let sim;try{sim=typeof window.calculateGalibiyetBenzerligi==='function'?window.calculateGalibiyetBenzerligi(path,{ok:true,historicalRaces}):fallbackSimilarity(path,historicalRaces)}catch{sim=fallbackSimilarity(path,historicalRaces)}horseDone++;out.innerHTML=`<div class="aa-note">Güncel atlar: ${horseDone}/${horses.length} karşılaştırıldı.</div>`;return{horse,career,sim,score:Number.isFinite(Number(sim?.score))?Number(sim.score):null}});
    scored.sort((a,b)=>(b.score??-1)-(a.score??-1)||Number(a.horse.no||999)-Number(b.horse.no||999));
    out.innerHTML=`<div class="aa-section"><h3>Seçilen Yarışlarla Kariyer Analizi</h3><div class="aa-note"><b>${esc(current.raceNo)}. Koşu · ${esc(current.city)} · ${esc(current.date)}</b><br>${esc(current.meta.class||'')} · ${esc(current.meta.ageGroup||'')} · ${esc(current.meta.distance||'')} ${esc(current.meta.track||'')}<br>${rows.length} tarihsel yarış yalnız yıllık arşiv seçiminizden kullanıldı. Mevcut otomatik Kariyer analizi değiştirilmedi.</div><div class="aa-list" style="margin-top:8px">${scored.map((x,i)=>`<div class="aa-rank"><div class="aa-rank-no">${i+1}</div><div><div class="aa-rank-name">${esc(x.horse.no)}. ${esc(x.horse.name)}</div><div class="aa-rank-sub">${x.sim?.strongest?`En güçlü referans: ${esc(x.sim.strongest.historicalHorse||'-')} · ${esc(x.sim.strongest.raceDate||'')} ${esc(x.sim.strongest.raceCity||'')} ${esc(x.sim.strongest.raceNo||'')}.K`:esc(x.error||'Karşılaştırılabilir tam kariyer yolu yok')}</div></div><div class="aa-score">${x.score===null?'—':'%'+esc(x.score)}</div></div>`).join('')}</div></div><div class="aa-section"><h3>Kullanılan tarihsel yarışlar</h3>${rows.map(r=>`<div class="aa-row-title" style="padding:5px 0">☑ ${esc(displayDate(r.date))} ${esc(r.city)} ${esc(r.raceNo)}.K · ${esc(r.classRaw)} · ${esc(r.distance)} ${esc(r.track)}</div>`).join('')}</div>`;
  }catch(e){out.innerHTML=`<div class="aa-note" style="color:#ffbd82">${esc(e?.message||e)}</div>`}finally{activeAnalysis=false}
}
function createDialog(){if($('tjkAnnualArchiveDialog'))return;const d=document.createElement('dialog');d.id='tjkAnnualArchiveDialog';d.innerHTML=`<div class="aa-shell"><div class="aa-head"><div><div class="aa-eyebrow">AT AI SYSTEM · ${esc(VERSION)}</div><h2>TJK Yıllık Yarış Arşivi</h2></div><button class="aa-close" id="aaClose">✕</button></div><div class="aa-body">
  <div class="aa-section"><h3>Yıllık katalog yönetimi</h3><div class="aa-grid two"><label>Yıl<select id="aaUpdateYearSelect">${Array.from({length:CURRENT_YEAR-1999},(_,i)=>CURRENT_YEAR-i).map(y=>`<option ${y===CURRENT_YEAR?'selected':''}>${y}</option>`).join('')}</select></label><label>Yerel arşiv<div id="aaYearPills" class="aa-year-pills"></div></label></div><div class="aa-actions"><button class="aa-btn" id="aaUpdateYear">Seçili Yılı Güncelle</button></div><div id="aaUpdateStatus" class="aa-status">Yıllık program yalnız güncelleme sırasında TJK'dan alınır.</div><div class="aa-progress"><i id="aaProgressBar"></i></div></div>
  <div class="aa-section"><h3>Tarihsel yarış seçimi</h3><div class="aa-actions" style="margin-top:0"><button class="aa-btn secondary" id="aaFillCurrent">Bugünkü Koşudan Doldur</button><button class="aa-btn secondary" id="aaClearFilters">Filtreleri Temizle</button></div><div class="aa-grid" style="margin-top:10px"><label>Yıl başlangıç<select id="aaYearFrom"></select></label><label>Yıl bitiş<select id="aaYearTo"></select></label><label>Şehir<select id="aaCity"></select></label><label>Grup<select id="aaGroup"></select></label><label>Koşu Cinsi<select id="aaClassBase"></select></label><label>Mesafe<select id="aaDistance"></select></label><label>Pist<select id="aaTrack"></select></label><label>Koşu İsmi<input id="aaRaceName" placeholder="Tümü"></label></div><div class="aa-status">Ek Şartlar</div><div id="aaTokens" class="aa-token-pills"></div><div class="aa-actions"><button class="aa-btn" id="aaSearch">Arşivde Bul</button><button class="aa-btn secondary" id="aaResolve">Seçilenlerin Koşu No'sunu Çöz</button></div></div>
  <div class="aa-section"><div class="aa-results-head"><b>Bulunan tarihsel yarışlar</b><span id="aaResultCount">0 yarış</span></div><div id="aaResults" class="aa-list"></div><div class="aa-status">Performans için aynı anda ilk 250 eşleşme gösterilir; filtre daraltıldığında tam liste içinden yeniden seçilir.</div><div class="aa-actions"><button class="aa-btn warn" id="aaRunSelected">Seçilen Yarışlarla Kariyer Analizi</button></div></div>
  <div id="aaAnalysis" class="aa-analysis"></div>
</div></div>`;document.body.appendChild(d);
  $('aaClose').onclick=()=>d.close();$('aaUpdateYear').onclick=()=>updateYear(Number($('aaUpdateYearSelect').value));$('aaFillCurrent').onclick=prefillCurrentRace;$('aaSearch').onclick=searchArchive;$('aaResolve').onclick=async()=>{let rows=(await dbGetAll(STORE_RACES)).filter(r=>selectedIds.has(r.id));await resolveRows(rows)};$('aaRunSelected').onclick=runSelectedAnalysis;$('aaClearFilters').onclick=()=>{for(const id of ['aaCity','aaGroup','aaClassBase','aaDistance','aaTrack'])if($(id))$(id).value='';$('aaRaceName').value='';document.querySelectorAll('#aaTokens input').forEach(x=>x.checked=false);searchArchive()};
  for(const id of ['aaYearFrom','aaYearTo','aaCity','aaGroup','aaClassBase','aaDistance','aaTrack'])$(id)?.addEventListener('change',searchArchive);$('aaRaceName')?.addEventListener('input',()=>{clearTimeout(window.__aaNameTimer);window.__aaNameTimer=setTimeout(searchArchive,250)});
}
async function openArchive(){createDialog();const d=$('tjkAnnualArchiveDialog');if(!d.open)d.showModal();await refreshArchiveUi(false)}
function installMenu(){const drawer=$('drawer');if(!drawer||$('annualArchiveBtn'))return;const note=drawer.querySelector('.drawer-note');const b=document.createElement('button');b.id='annualArchiveBtn';b.type='button';b.textContent='6. TJK Yıllık Yarış Arşivi';b.addEventListener('click',()=>{try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}openArchive()});note?drawer.insertBefore(b,note):drawer.appendChild(b)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installMenu,{once:true});else installMenu();
window.ATAnnualArchiveV13={open:openArchive,search:searchArchive,version:VERSION};
console.info('[AT AI]',VERSION,'aktif — ayrı yıllık yarış kataloğu');
})();
