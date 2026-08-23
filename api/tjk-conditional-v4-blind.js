import fs from 'fs';
import path from 'path';
import vm from 'vm';

const VERSION='UNIVERSAL-V5-BLIND-RUNNER-V3';
const APP_BASE='https://at-ai-mobil.vercel.app';
const MODEL_FILE='universal-v5-prototype-v165.js';

function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
function iso(v=''){const s=clean(v);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return s;m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:'';}
function finish(x){const v=x?.finish??x?.rank??x?.sira??x?.Bitiriş??x?.bitiris;const n=Number(v);return Number.isFinite(n)?n:null;}
function dateOf(x){return iso(x?.isoDate??x?.date??x?.Tarih_ISO??x?.Tarih);}
function rowsFrom(root){
  const preferred=['comparisonPath','fullPath','fullPathBefore','history','historyBefore','roadmapBefore','roadmap','races','top5Before','preparationPathBefore','top5','frozenRows','careerRows'];
  const seen=new Set(),candidates=[];
  function visit(v,depth=0){
    if(!v||depth>5||typeof v!=='object'||seen.has(v))return;seen.add(v);
    if(Array.isArray(v)){
      if(v.length&&v.some(x=>x&&typeof x==='object'&&dateOf(x)))candidates.push(v);
      for(const x of v.slice(0,5))visit(x,depth+1);return;
    }
    for(const k of preferred)if(Array.isArray(v[k])&&v[k].length)candidates.unshift(v[k]);
    for(const [k,x] of Object.entries(v))if(!/html|rawHtml|sourceHtml/i.test(k))visit(x,depth+1);
  }
  visit(root);
  const scored=candidates.map(a=>({a,score:a.reduce((s,x)=>s+(dateOf(x)?2:0)+(finish(x)!==null?1:0),0)})).sort((x,y)=>y.score-x.score||y.a.length-x.a.length);
  const a=scored[0]?.a||[],z=new Map();
  for(const x of a){const d=dateOf(x);if(!d)continue;const k=clean(x?.uniqueKey)||[d,clean(x?.city??x?.sehir??x?.Şehir),clean(x?.distance??x?.mesafe??x?.Mesafe),finish(x),clean(x?.class??x?.raceClass??x?.classRaw??x?.Koşu_Sınıfı)].join('|');z.set(k,x);}
  return [...z.values()].sort((a,b)=>dateOf(a).localeCompare(dateOf(b)));
}
function loadModel(){
  const file=path.join(process.cwd(),MODEL_FILE),src=fs.readFileSync(file,'utf8');
  const sandbox={module:{exports:{}},exports:{},console};vm.runInNewContext(src,sandbox,{filename:MODEL_FILE,timeout:3000});
  const api=sandbox.module.exports;if(!api?.scoreRace)throw new Error('Universal V5 modeli yüklenemedi.');return api;
}
async function getJSON(url,timeout=180000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:c.signal});const text=await r.text();let d;try{d=JSON.parse(text)}catch{throw new Error(`JSON değil: ${url}`)}if(!r.ok||d?.ok===false)throw new Error(d?.error||`HTTP ${r.status}: ${url}`);return d;}finally{clearTimeout(t);}
}
async function pool(items,n,fn){const out=new Array(items.length);let i=0;async function run(){for(;;){const k=i++;if(k>=items.length)return;out[k]=await fn(items[k],k);}}await Promise.all(Array.from({length:Math.min(n,items.length||1)},run));return out;}
function findCity(program,city){const q=clean(city).toLocaleUpperCase('tr-TR');return (program?.cities||[]).find(c=>clean(c?.name).toLocaleUpperCase('tr-TR')===q)||null;}
function referenceTypeWeight(type){return type==='EXACT'?1:(type==='CONDITION_TWIN'?0.65:0.35);}
function buildRefs(roadmap,targetDate){
  const map=new Map();for(const type of ['EXACT','CONDITION_TWIN','RACE_FAMILY'])for(const r of (roadmap?.models?.[type]||[])){
    const rd=iso(r?.date);if(!rd||rd>=targetDate||r?.ok===false)continue;
    for(const q of (r?.top3||[])){
      if(finish(q)!==1)continue;const id=clean(q?.horseId),name=clean(q?.horseName),key=[rd,clean(r?.city),r?.raceNo,id||name].join('|'),w=referenceTypeWeight(type);
      if(!map.has(key))map.set(key,{referenceDate:rd,date:rd,city:clean(r?.city),raceNo:r?.raceNo,horseId:id,horseName:name,career:rowsFrom(q?.career||{}),types:new Set(),referenceWeight:w});
      const ref=map.get(key);ref.types.add(type);ref.referenceWeight=Math.max(ref.referenceWeight||0,w);
    }
  }return [...map.values()];
}
function maxDate(rows){return rows.length?rows.map(dateOf).filter(Boolean).sort().at(-1)||null:null;}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  try{
    const date=iso(req.query?.date),city=clean(req.query?.city),raceNo=Number(req.query?.raceNo);
    if(!date||!city||!Number.isFinite(raceNo))return res.status(400).json({ok:false,version:VERSION,error:'date, city, raceNo zorunlu.'});
    const program=await getJSON(`${APP_BASE}/api/tjk-program?date=${encodeURIComponent(date)}`);
    const c=findCity(program,city);if(!c)throw new Error(`Şehir bulunamadı: ${city}`);
    const race=(program?.racesByCity?.[String(c.id)]||program?.programs?.[String(c.id)]||[]).find(r=>Number(r?.no)===raceNo);if(!race)throw new Error(`${city} ${raceNo}. koşu bulunamadı.`);
    const target={date,city:clean(c.name),raceNo,class:clean(race?.class||race?.yaradi1),ageGroup:clean(race?.ageGroup||race?.yaradi2),distance:Number(race?.distance||race?.mesafe),track:clean(race?.track||race?.pist)};
    const horses=race?.horses||[];
    const careerResults=await pool(horses,3,async h=>{const d=await getJSON(`${APP_BASE}/api/tjk-career-v10?horseId=${encodeURIComponent(h.id)}&before=${encodeURIComponent(date)}`,120000);return {h,d,rows:rowsFrom(d)};});
    const careers={},coverage=[];
    for(const x of careerResults){careers[String(x.h.id)]=x.rows;const future=x.rows.filter(r=>dateOf(r)&&dateOf(r)>=date).length;coverage.push({At_ID:String(x.h.id),At_Adı:x.h.name,Kariyer_Satırı:x.rows.length,Son_Tarih:maxDate(x.rows),FutureLeak:future,Coverage:x.d?.coverageStatus??x.d?.audit?.coverageStatus??x.d?.coverage?.status??null,Valid:x.d?.valid??x.d?.audit?.valid??null});}
    let roadmap=null,refs=[];
    try{
      const p=new URLSearchParams({date,city:target.city,class:target.class,ageGroup:target.ageGroup,track:target.track,distance:String(target.distance),minYear:'2023'});
      roadmap=await getJSON(`${APP_BASE}/api/tjk-model-roadmap-v11?${p.toString()}`,210000);refs=buildRefs(roadmap,date);
      await pool(refs.filter(r=>!r.career.length&&r.horseId),3,async r=>{try{const d=await getJSON(`${APP_BASE}/api/tjk-career-v10?horseId=${encodeURIComponent(r.horseId)}&before=${encodeURIComponent(r.referenceDate)}`,120000);r.career=rowsFrom(d);}catch(e){r.error=e?.message||String(e);}});
    }catch(e){roadmap={ok:false,error:e?.message||String(e)};refs=[];}
    const refAudit=refs.map(r=>({Referans_Tarih:r.referenceDate,Referans_Şehir:r.city,Referans_Koşu_No:r.raceNo,Kazanan_ID:r.horseId,Kazanan:r.horseName,Tipler:[...r.types].join('+'),Referans_Ağırlık:r.referenceWeight,Kariyer_Satırı:r.career.length,Son_Kariyer_Tarihi:maxDate(r.career),Leak:r.career.filter(x=>dateOf(x)&&dateOf(x)>=r.referenceDate).length,Hata:r.error||null}));
    const api=loadModel(),scored=api.scoreRace({target,horses,careers,references:refs});
    const currentLeaks=coverage.reduce((s,x)=>s+x.FutureLeak,0),refLeaks=refAudit.reduce((s,x)=>s+x.Leak,0);
    return res.status(200).json({ok:true,runnerVersion:VERSION,modelVersion:api.VERSION,target,resultApiCalled:false,resultDataLoaded:false,leakAudit:{currentFutureLeakCount:currentLeaks,referenceFutureLeakCount:refLeaks,passed:currentLeaks===0&&refLeaks===0},coverage,referenceWinners:refAudit,roadmapOk:roadmap?.ok!==false,roadmapError:roadmap?.ok===false?roadmap?.error:null,policy:scored.policy,confidence:scored.confidence,rows:scored.rows});
  }catch(e){return res.status(500).json({ok:false,version:VERSION,resultApiCalled:false,error:e?.message||String(e)});}
}
