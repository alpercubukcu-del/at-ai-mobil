/* AT AI Mobil — V12.4 responsive/batched finish-margin analysis */
(() => {
'use strict';
if (window.__AT_CAREER_MARGIN_V124__) return;
window.__AT_CAREER_MARGIN_V124__ = true;
/* V12.3 ağır wrapper'ını çalıştırma; V12.4 aynı işlevi toplu isteklerle üstlenir. */
window.__AT_CAREER_MARGIN_V123__ = true;

const VERSION = 'CAREER-MARGIN-V12.4';
const MODEL_ROWS = 2;
const BATCH_SIZE = 24;
const BATCH_CONCURRENCY = 2;
const TIMEOUT_MS = 50000;
const $ = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const num = v => v === null || v === undefined || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null);
const clamp = v => Math.max(0, Math.min(1, Number(v) || 0));
const safe = (v, f='AT') => (clean(v).replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_').replace(/^_+|_+$/g,'') || f).slice(0,70);
const city = () => typeof getCityName === 'function' ? getCityName() : '';
const dist = v => { const m = clean(v).match(/\d{3,4}/); return m ? Number(m[0]) : num(v); };
const finish = r => { const n = num(r?.finish ?? r?.rank ?? r?.sira); return n === null ? null : Math.trunc(n); };
const raceNo = r => { const m = clean(r?.raceNo ?? r?.raceNoName ?? r?.kosu_no_adi ?? r?.kosuNo).match(/\d+/); return m ? Number(m[0]) : 0; };
const date = r => {
  const x = clean(r?.isoDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const y = clean(r?.date), m = y.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : (/^\d{4}-\d{2}-\d{2}$/.test(y) ? y : '');
};
const pathOf = c => [c?.comparisonPath,c?.fullPath,c?.history,c?.fullPathBefore,c?.historyBefore,c?.roadmapBefore,c?.roadmap,c?.races].find(x => Array.isArray(x) && x.length) || [];
const eligible = r => { const f = finish(r); return f >= 1 && f <= 5 && clean(r?.uniqueKey) && date(r) && clean(r?.city ?? r?.sehir) && raceNo(r) > 0; };
const closeLabel = g => g === null ? '' : g <= .10 ? 'ÇOK YAKIN' : g <= .50 ? 'YAKIN' : g <= 1 ? 'YAKIN MÜCADELE' : g <= 2 ? 'TEMASLI' : 'AÇIK FARK';

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length); let cursor = 0;
  async function run(){ for(;;){ const i = cursor++; if(i >= items.length) return; out[i] = await worker(items[i], i); } }
  await Promise.all(Array.from({length: Math.min(limit, items.length || 1)}, run));
  return out;
}
function chunks(rows, size=BATCH_SIZE){ const out=[]; for(let i=0;i<rows.length;i+=size) out.push(rows.slice(i,i+size)); return out; }

const requestCache = new Map();
async function fetchMarginBatch(rows){
  if(!rows.length) return {ok:true,margins:[],errors:[]};
  const key = rows.map(r => clean(r?.uniqueKey)).sort().join('|');
  if(requestCache.has(key)) return requestCache.get(key);
  const promise = (async() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try{
      const res = await fetch('/api/tjk-history', {
        method:'POST', cache:'no-store',
        headers:{'content-type':'application/json',accept:'application/json'},
        body:JSON.stringify({history:rows,maxRows:30}), signal:controller.signal
      });
      const data = await res.json();
      if(!res.ok || !data?.ok) throw new Error(data?.error || `API ${res.status}`);
      return data;
    } finally { clearTimeout(timer); }
  })();
  requestCache.set(key, promise);
  try { return await promise; } catch(e){ requestCache.delete(key); throw e; }
}

function normalizeMargin(row, m={}){
  const f = finish(row);
  const win = f === 1 ? num(m?.marginToNextApprox) : null;
  const perfGap = f === 1 ? win : num(m?.winnerGapApprox);
  return {
    ...m,
    winMarginRaw: f === 1 ? clean(m?.marginRawToNext || m?.marginRaw) : null,
    winMarginApprox: win,
    performanceGapApprox: perfGap,
    closeFinish: perfGap === null ? null : perfGap <= 1,
    closeFinishLabel: closeLabel(perfGap),
    marginRuleVersion: VERSION
  };
}
function patchCareer(career, marginMap, audit={}){
  const patch = row => {
    const m = marginMap.get(String(row?.uniqueKey || ''));
    return m ? {...row, ...normalizeMargin(row,m), marginResultUrl:m.resultUrl || null} : row;
  };
  const out = {...career, marginVersion:VERSION, marginAudit:{...audit,version:VERSION}};
  for(const key of ['history','comparisonPath','fullPath','roadmap','races','wins','top5','preparationPath','recentForm','fullPathBefore','historyBefore','roadmapBefore','comparisonPathBefore','winsBefore','top5Before','preparationPathBefore']){
    if(Array.isArray(career?.[key])) out[key] = career[key].map(patch);
  }
  return out;
}
function selectedRows(career, all=false, modelRows=MODEL_ROWS){
  const rows = [...pathOf(career)].filter(eligible).sort((a,b)=>date(b).localeCompare(date(a)));
  return {allRows:rows, selected:all ? rows : rows.slice(0,modelRows)};
}

async function enrichCareer(career,{all=false,modelRows=MODEL_ROWS}={}){
  if(!career?.ok) return career;
  const {allRows,selected} = selectedRows(career,all,modelRows);
  if(!selected.length) return {...career,marginVersion:VERSION,marginAudit:{ok:true,eligibleRows:allRows.length,selectedRows:0,enrichedRows:0,errorRows:0,version:VERSION}};
  const results = await mapLimit(chunks(selected), BATCH_CONCURRENCY, async part => {
    try{return await fetchMarginBatch(part)}catch(e){return {ok:false,margins:[],errors:part.map(r=>({uniqueKey:r.uniqueKey,error:e?.message||String(e)}))}}
  });
  const margins = results.flatMap(x=>x?.margins||[]), errors=results.flatMap(x=>x?.errors||[]);
  const marginMap = new Map(margins.filter(x=>x?.uniqueKey).map(x=>[String(x.uniqueKey),x]));
  return patchCareer(career, marginMap, {ok:errors.length===0,all,eligibleRows:allRows.length,selectedRows:selected.length,enrichedRows:margins.length,errorRows:errors.length,errors});
}
window.enrichCareerMarginsV124 = enrichCareer;
/* Eski V12.2 fetchCareer wrapper'ı bu fonksiyona dinamik bakıyor. Normal analizde yalnız 2 satır; Excel'de tümü. */
window.enrichCareerMarginsV122 = (career, options={}) => enrichCareer(career, {
  all: window.__AT_MARGIN_EXPORT_ALL__ === true || options?.all === true,
  modelRows: MODEL_ROWS
});

function perfBase(f){ return f===1 ? .90 : ({2:.82,3:.66,4:.52,5:.40}[f] ?? Math.max(.08,.40-(f-5)*.055)); }
function gapOf(r){ const f=finish(r); return f===1 ? num(r?.winMarginApprox ?? r?.marginToNextApprox) : num(r?.performanceGapApprox ?? r?.winnerGapApprox); }
function perfQuality(r,useGap){
  const f=finish(r); if(!f) return null; let q=perfBase(f); if(!useGap) return clamp(q);
  const g=gapOf(r); if(g===null) return clamp(q);
  if(f===1) q += g>=5?.10:g>=3?.08:g>=2?.065:g>=1?.05:g>=.5?.035:g>=.25?.025:.015;
  else q += g<=.10?.13:g<=.25?.11:g<=.5?.09:g<=1?.07:g<=2?.04:g<=3?.02:0;
  return clamp(Math.min(1,q));
}
function perfSimilarity(a,b){
  const both = gapOf(a)!==null && gapOf(b)!==null;
  const x=perfQuality(a,both), y=perfQuality(b,both);
  return x===null || y===null ? null : clamp(1-Math.abs(x-y));
}
function strict(v){ return v===null||v===undefined||v==='' ? null : (Number.isFinite(Number(v)) ? Number(v) : null); }
if(typeof careerRowSimilarity === 'function') careerRowSimilarity = function(a,b){
  if(!a||!b) return 0;
  const parts = [
    [typeof classSimilarity==='function'?classSimilarity(a.class||a.raceClass,b.class||b.raceClass):null,.22],
    [typeof ageGroupSimilarity==='function'?ageGroupSimilarity(a.ageGroup||a.group,b.ageGroup||b.group):null,.13],
    [typeof distanceSimilarity==='function'?distanceSimilarity(a.distance||a.mesafe||a.msf,b.distance||b.mesafe||b.msf):null,.15],
    [typeof trackSimilarity==='function'?trackSimilarity(a.track||a.pist,b.track||b.pist):null,.11],
    [typeof citySimilarity==='function'?citySimilarity(a.city,b.city):null,.07],
    [typeof hpSimilarityV11==='function'?hpSimilarityV11(a.hp,b.hp):null,.17],
    [perfSimilarity(a,b),.15]
  ];
  let sum=0,w=0;
  for(const [value,weight] of parts){ const x=strict(value); if(x===null) continue; sum += clamp(x)*weight; w += weight; }
  return w ? clamp(sum/w) : 0;
};

/* Tarihsel 1/2/3 referansların farklarını tek tek istek yerine global paketlerle çek. */
async function enrichRoadmapBulk(data){
  if(!data?.ok || !data?.models) return data;
  const refs=[], seen=new Set();
  for(const type of ['EXACT','CONDITION_TWIN','RACE_FAMILY']){
    for(const rr of data.models[type]||[]){
      for(const h of rr?.top3||[]){
        if(!h?.career?.ok) continue;
        const key=[clean(h.horseId||h.horseName),clean(h.career.cutoffExclusive)].join('|');
        if(seen.has(key)) continue; seen.add(key);
        const pick=selectedRows(h.career,false,MODEL_ROWS).selected;
        refs.push({key,career:h.career,rows:pick});
      }
    }
  }
  const allRows=[], rowSeen=new Set();
  for(const ref of refs) for(const r of ref.rows){ const k=clean(r.uniqueKey); if(k&&!rowSeen.has(k)){rowSeen.add(k);allRows.push(r);} }
  const results = await mapLimit(chunks(allRows), BATCH_CONCURRENCY, async part => {
    try{return await fetchMarginBatch(part)}catch(e){return {ok:false,margins:[],errors:part.map(r=>({uniqueKey:r.uniqueKey,error:e?.message||String(e)}))}}
  });
  const margins=results.flatMap(x=>x?.margins||[]), errors=results.flatMap(x=>x?.errors||[]);
  const marginMap=new Map(margins.filter(x=>x?.uniqueKey).map(x=>[String(x.uniqueKey),x]));
  const careerMap=new Map(refs.map(ref=>[ref.key,patchCareer(ref.career,marginMap,{ok:errors.length===0,all:false,eligibleRows:selectedRows(ref.career,false,MODEL_ROWS).allRows.length,selectedRows:ref.rows.length,enrichedRows:ref.rows.filter(r=>marginMap.has(String(r.uniqueKey))).length,errorRows:0})]));
  const out={...data,models:{...data.models},marginVersion:VERSION,marginBatchStats:{referenceCareers:refs.length,requestedRows:allRows.length,requests:chunks(allRows).length,enrichedRows:margins.length,errorRows:errors.length}};
  for(const type of ['EXACT','CONDITION_TWIN','RACE_FAMILY']){
    out.models[type]=(data.models[type]||[]).map(rr=>({
      ...rr,
      distance:dist(rr?.condition?.distance??rr?.verification?.authoritativeDistance??rr?.distance) ?? rr.distance,
      condition:{...(rr.condition||{}),distance:dist(rr?.condition?.distance??rr?.verification?.authoritativeDistance??rr?.distance) ?? rr?.condition?.distance},
      top3:(rr?.top3||[]).map(h=>{
        const key=[clean(h.horseId||h.horseName),clean(h?.career?.cutoffExclusive)].join('|');
        return careerMap.has(key)?{...h,career:careerMap.get(key)}:h;
      })
    }));
  }
  return out;
}
if(typeof fetchModelRoadmapV11 === 'function'){
  const beforeRoadmapV124 = fetchModelRoadmapV11;
  fetchModelRoadmapV11 = async function(...args){
    const data = await beforeRoadmapV124(...args);
    return data?.ok ? await enrichRoadmapBulk(data) : data;
  };
}

/* Excel denetimi: kullanıcı açıkça indirdiğinde tüm uygun farkları al. */
let xlsxPromise=null;
async function xlsx(){
  if(window.XLSX?.utils?.json_to_sheet) return window.XLSX;
  if(!xlsxPromise) xlsxPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=()=>resolve(window.XLSX);s.onerror=()=>reject(new Error('Excel kitaplığı yüklenemedi.'));document.head.appendChild(s)});
  return xlsxPromise;
}
async function book(file,sheets){const X=await xlsx(),wb=X.utils.book_new();for(const s of sheets){const rows=s.rows?.length?s.rows:[{Bilgi:'Kayıt yok'}],ws=X.utils.json_to_sheet(rows);X.utils.book_append_sheet(wb,ws,s.name.slice(0,31));}X.writeFile(wb,file,{compression:true});}
function row(x,i,ctx={}){const f=finish(x);return{'Kariyer_Sıra_No':i+1,'Tarih_ISO':date(x),'Tarih':clean(x.date),'Şehir':clean(x.city||x.sehir),'Koşu_Sınıfı':clean(x.class||x.raceClass),'Yaş_Grubu':clean(x.ageGroup),'Mesafe':dist(x.distance??x.mesafe??x.msf),'Pist':clean(x.track||x.pist),'Bitiriş':f,'Fark_Ham_TJK':clean(x.marginRawToNext||x.marginRaw||x.fark),'Öndeki_Alta_Fark_Boy_Yaklaşık':num(x.marginToNextApprox),'Kazanana_Fark_Boy_Yaklaşık':num(x.winnerGapApprox),'Galibiyet_Farkı_Ham_TJK':f===1?clean(x.winMarginRaw||x.marginRawToNext||x.marginRaw):'','Galibiyet_Farkı_Boy_Yaklaşık':f===1?num(x.winMarginApprox??x.marginToNextApprox):null,'Performans_Farkı_Boy_Yaklaşık':num(x.performanceGapApprox),'Yakın_Mücadele':x.closeFinish===true?'EVET':x.closeFinish===false?'HAYIR':'','Yakınlık_Sınıfı':clean(x.closeFinishLabel),'Derece':clean(x.degree||x.derece),'HP':num(x.hp),'At_ID':clean(x.horseId||ctx.id),'At_Adı':clean(x.horseName||ctx.name),'Unique_Key':clean(x.uniqueKey)}};
async function getJson(url){const r=await fetch(url,{cache:'no-store'}),d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.error||`API ${r.status}`);return d;}
function selectedRace(){const n=$('ceRace')?.value;return(state?.races||[]).find(r=>String(r.no)===String(n))||null;}
async function allWinners124(){
  const r=selectedRace(); if(!r) throw new Error('Koşu seçilmedi.');
  const meta={date:clean(state.date),city:clean(city()),raceNo:num(r.no),class:clean(r.class||r.yaradi1),age:clean(r.ageGroup||r.yaradi2),distance:dist(r.distance||r.mesafe),track:clean(r.track||r.pist)};
  const q=new URLSearchParams({date:meta.date,city:meta.city,class:meta.class,ageGroup:meta.age,track:meta.track,distance:String(meta.distance),minYear:'2000',t:String(Date.now())});
  const d=await getJson(`/api/tjk-model-roadmap-v11?${q}`), wins=[];
  for(const type of ['EXACT','CONDITION_TWIN','RACE_FAMILY']) for(const rr of d.models?.[type]||[]){const w=(rr.top3||[]).find(x=>Number(x.finish)===1);if(!w?.career?.ok)continue;wins.push({type,year:Number(rr.sourceYear||String(rr.date).slice(0,4)),date:rr.date,city:rr.city,raceNo:rr.raceNo,class:rr?.condition?.class||rr.authoritativeClass||rr.class,age:rr?.condition?.ageGroup||rr.ageGroup,distance:dist(rr?.condition?.distance??rr?.verification?.authoritativeDistance??rr.distance),track:rr?.condition?.track||rr.track,id:w.horseId,name:w.horseName,no:w.programNo,career:w.career});}
  const summary=[],flat=[];
  for(let i=0;i<wins.length;i++){
    const w=wins[i], ce=$('ceStatus'); if(ce) ce.textContent=`Geçmiş kazanan farkları alınıyor… ${i+1}/${wins.length}`;
    const c=await enrichCareer(w.career,{all:true}), p=[...pathOf(c)].sort((a,b)=>date(a).localeCompare(date(b)));
    summary.push({No:i+1,'Referans_Tipi':w.type,'Yıl':w.year,'Referans_Tarih':w.date,'Referans_Şehir':w.city,'Referans_Koşu_No':w.raceNo,'Referans_Sınıf':w.class,'Referans_Yaş_Grubu':w.age,'Referans_Mesafe':w.distance,'Referans_Pist':w.track,'Kazanan_At':w.name,'Kazanan_At_ID':w.id,'Galibiyet_Öncesi_Tüm_Koşu_Sayısı':p.length,'Fark_Uygun_Satır':c.marginAudit?.eligibleRows||0,'Fark_Dolu_Satır':c.marginAudit?.enrichedRows||0});
    p.forEach((x,j)=>flat.push({'Referans_Tipi':w.type,'Referans_Yıl':w.year,'Referans_Tarih':w.date,'Referans_Şehir':w.city,'Referans_Koşu_No':w.raceNo,'Referans_Mesafe':w.distance,'Kazanan_At':w.name,...row(x,j,{id:w.id,name:w.name})}));
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  await book(`${safe(meta.date)}_${safe(meta.city)}_${meta.raceNo}K_GECMIS_KAZANANLAR_GALIBIYET_ONCESI.xlsx`,[
    {name:'Denetim',rows:[{Alan:'Sürüm',Değer:VERSION},{Alan:'Fark kuralı',Değer:'Tüm uygun ilk-5 kariyer satırları; kazananın Fark değeri galibiyet farkıdır.'},{Alan:'Model istek kuralı',Değer:`Normal analizde son ${MODEL_ROWS} uygun satır toplu paketlenir; Excel denetiminde tüm uygun satırlar alınır.`}]},
    {name:'Kazananlar',rows:summary},{name:'Tum_Galibiyet_Oncesi',rows:flat}
  ]);
  if($('ceStatus')) $('ceStatus').textContent=`${wins.length} geçmiş kazananın tüm uygun farkları Excel'e aktarıldı.`;
}
function wrapExportButtons(){
  for(const btn of document.querySelectorAll('#ceCurrent .ce-one,#ceWinners .ce-winner')) if(!btn.dataset.v124){
    btn.dataset.v124='1'; const old=btn.onclick;
    if(typeof old==='function') btn.onclick=async function(e){window.__AT_MARGIN_EXPORT_ALL__=true;try{return await old.call(this,e)}finally{window.__AT_MARGIN_EXPORT_ALL__=false}};
  }
}
function bind(){
  const prep=$('cePrepare');
  if(prep&&!prep.dataset.v124){prep.dataset.v124='1';const old=prep.onclick;if(typeof old==='function')prep.onclick=async function(e){const v=await old.call(this,e);wrapExportButtons();return v}};
  const all=$('ceAllWinners');
  if(all){all.onclick=async()=>{try{all.disabled=true;await allWinners124()}catch(e){if($('ceStatus'))$('ceStatus').textContent=e?.message||'Excel hazırlanamadı.'}finally{all.disabled=false}};}
  const current=$('ceAllCurrent');
  if(current&&!current.dataset.v124){current.dataset.v124='1';const old=current.onclick;if(typeof old==='function')current.onclick=async function(e){window.__AT_MARGIN_EXPORT_ALL__=true;try{return await old.call(this,e)}finally{window.__AT_MARGIN_EXPORT_ALL__=false}};}
  const menu=$('careerExportMenuBtn');
  if(menu&&!menu.dataset.v124){menu.dataset.v124='1';const old=menu.onclick;if(typeof old==='function')menu.onclick=function(e){const v=old.call(this,e);setTimeout(wrapExportButtons,0);return v}};
  wrapExportButtons();
}
setTimeout(bind,0);
try{
  if(typeof state==='object'&&state&&state.careerMarginVersion!==VERSION){
    state.careerMarginVersion=VERSION;
    if(state.analyses){state.analyses.career={};state.analyses.calibration={};state.analyses.historical={};}
    if(typeof careerModelCacheV112!=='undefined'&&careerModelCacheV112?.clear) careerModelCacheV112.clear();
    if(typeof save==='function') save();
  }
}catch{}
window.AT_AI_CAREER_MARGIN={version:VERSION,performanceQuality:perfQuality,modelRows:MODEL_ROWS,batchSize:BATCH_SIZE};
console.info('[AT AI]',VERSION,'aktif — toplu fark istekleri + mobil donma koruması');
})();
