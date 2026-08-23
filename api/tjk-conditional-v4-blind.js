import fs from 'fs';
import path from 'path';
import vm from 'vm';

const VERSION='UNIVERSAL-V5-BLIND-RUNNER-V6';
const PATCH_VERSION='BLIND-V16.5.3-GENTLE-SAMPLE-SURFACE-BRIDGE';
const APP_BASE='https://at-ai-mobil.vercel.app';
const MODEL_FILE='universal-v5-prototype-v165.js';

function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
function iso(v=''){const s=clean(v);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return s;m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:'';}
function finish(x){const v=x?.finish??x?.rank??x?.sira??x?.Bitiriş??x?.bitiris;const n=Number(v);return Number.isFinite(n)?n:null;}
function dateOf(x){return iso(x?.isoDate??x?.date??x?.Tarih_ISO??x?.Tarih);}
function norm(v=''){return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');}
function trackOf(x){return norm(x?.track??x?.pist??x?.Pist);}
function rowsFrom(root){
  const preferred=['comparisonPath','fullPath','fullPathBefore','history','historyBefore','roadmapBefore','roadmap','races','top5Before','preparationPathBefore','top5','frozenRows','careerRows'];
  const seen=new Set(),candidates=[];
  function visit(v,depth=0){
    if(!v||depth>5||typeof v!=='object'||seen.has(v))return;seen.add(v);
    if(Array.isArray(v)){if(v.length&&v.some(x=>x&&typeof x==='object'&&dateOf(x)))candidates.push(v);for(const x of v.slice(0,5))visit(x,depth+1);return;}
    for(const k of preferred)if(Array.isArray(v[k])&&v[k].length)candidates.unshift(v[k]);
    for(const [k,x] of Object.entries(v))if(!/html|rawHtml|sourceHtml/i.test(k))visit(x,depth+1);
  }
  visit(root);
  const scored=candidates.map(a=>({a,score:a.reduce((s,x)=>s+(dateOf(x)?2:0)+(finish(x)!==null?1:0),0)})).sort((x,y)=>y.score-x.score||y.a.length-x.a.length);
  const a=scored[0]?.a||[],z=new Map();
  for(const x of a){const d=dateOf(x);if(!d)continue;const k=clean(x?.uniqueKey)||[d,clean(x?.city??x?.sehir??x?.Şehir),clean(x?.distance??x?.mesafe??x?.Mesafe),finish(x),clean(x?.class??x?.raceClass??x?.classRaw??x?.Koşu_Sınıfı)].join('|');z.set(k,x);}
  return [...z.values()].sort((a,b)=>dateOf(a).localeCompare(dateOf(b)));
}
function loadModel(){const file=path.join(process.cwd(),MODEL_FILE),src=fs.readFileSync(file,'utf8'),sandbox={module:{exports:{}},exports:{},console};vm.runInNewContext(src,sandbox,{filename:MODEL_FILE,timeout:3000});const api=sandbox.module.exports;if(!api?.scoreRace)throw new Error('Universal V5 modeli yüklenemedi.');return api;}
async function getJSON(url,timeout=180000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:c.signal});const text=await r.text();let d;try{d=JSON.parse(text)}catch{throw new Error(`JSON değil: ${url}`)}if(!r.ok||d?.ok===false)throw new Error(d?.error||`HTTP ${r.status}: ${url}`);return d;}finally{clearTimeout(t);}}
async function pool(items,n,fn){const out=new Array(items.length);let i=0;async function run(){for(;;){const k=i++;if(k>=items.length)return;out[k]=await fn(items[k],k);}}await Promise.all(Array.from({length:Math.min(n,items.length||1)},run));return out;}
function findCity(program,city){const q=clean(city).toLocaleUpperCase('tr-TR');return (program?.cities||[]).find(c=>clean(c?.name).toLocaleUpperCase('tr-TR')===q)||null;}
function referenceTypeWeight(type){return type==='EXACT'?1:(type==='CONDITION_TWIN'?0.65:0.35);}
function buildRefs(roadmap,targetDate){
  const map=new Map();
  for(const type of ['EXACT','CONDITION_TWIN','RACE_FAMILY'])for(const r of (roadmap?.models?.[type]||[])){
    const rd=iso(r?.date);if(!rd||rd>=targetDate||r?.ok===false)continue;
    for(const q of (r?.top3||[])){
      if(finish(q)!==1)continue;
      const id=clean(q?.horseId),name=clean(q?.horseName),key=[rd,clean(r?.city),r?.raceNo,id||name].join('|'),w=referenceTypeWeight(type);
      if(!map.has(key))map.set(key,{referenceDate:rd,date:rd,city:clean(r?.city),raceNo:r?.raceNo,horseId:id,horseName:name,career:rowsFrom(q?.career||{}),types:new Set(),referenceWeight:w});
      const ref=map.get(key);ref.types.add(type);ref.referenceWeight=Math.max(ref.referenceWeight||0,w);
    }
  }
  return [...map.values()];
}
function maxDate(rows){return rows.length?rows.map(dateOf).filter(Boolean).sort().at(-1)||null:null;}
function referenceSetQuality(refs){return refs.length?refs.reduce((s,r)=>s+(Number(r?.referenceWeight)||0),0)/refs.length*100:0;}
function patchWeights(type){
  if(type==='MAIDEN')return {form:.23,exact:.23,upper:.04};
  if(type==='HANDICAP')return {form:.19,exact:.19,upper:.07};
  if(type==='CLASSIC')return {form:.15,exact:.18,upper:.20};
  if(type==='CONDITIONAL')return {form:.20,exact:.22,upper:.10};
  return {form:.20,exact:.20,upper:.08};
}
function sampleFormReliability(n){
  if(n<=0)return 0;
  if(n===1)return .85;
  if(n===2)return .92;
  return 1;
}
function applyBlindPatch(rows,target,careers){
  const tt=norm(target?.track),out=[];
  for(const base of (rows||[])){
    const r={...base},type=clean(r?.Koşu_Tipi),w=patchWeights(type),career=(careers?.[String(r?.At_ID)]||[]).filter(x=>dateOf(x)&&dateOf(x)<target.date);
    const n=Number(r?.KARIYER)||career.length||0,rawForm=Number(r?.FORM)||0,formRel=sampleFormReliability(n),safeForm=50+(rawForm-50)*formRel;
    r.FORM_GUVENLI=+safeForm.toFixed(1);r.FORM_ORNEK_GUVENI=+formRel.toFixed(2);
    let score=(Number(r?.V5_SKOR)||0)+(safeForm-rawForm)*w.form;
    let routeA=(Number(r?.YOL_A)||0)+(safeForm-rawForm)*.30;
    const targetSurfaceCount=career.filter(x=>trackOf(x)===tt).length;
    r.HEDEF_PIST_SAYISI=targetSurfaceCount;
    let bridge=0;
    if(targetSurfaceCount===0&&n>0){
      const careerRel=Math.min(1,n/4),hp=Number(r?.HP_PUAN)||0,broad=Number(r?.BENZER_KANIT)||0;
      bridge=Math.min(50,(safeForm*.50+hp*.30+broad*.20)*careerRel*.55);
      score+=bridge*(w.exact*.45+w.upper*.35);
      routeA+=bridge*.30*.35;
    }
    r.PIST_GECIS_KANITI=+bridge.toFixed(1);
    r.V1653_DUZELTME=+(score-(Number(r?.V5_SKOR)||0)).toFixed(1);
    r.V1652_DUZELTME=r.V1653_DUZELTME;
    r.V5_SKOR=+Math.max(0,Math.min(100,score)).toFixed(1);
    r.YOL_A=+Math.max(0,Math.min(100,routeA)).toFixed(1);
    out.push(r);
  }
  return out;
}
function finalRank(rows,mainN,refQuality){
  const source=[...(rows||[])].map(r=>({...r,REFERANS_KALITE:+refQuality.toFixed(1)}));
  const byA=[...source].sort((a,b)=>(Number(b?.YOL_A)||0)-(Number(a?.YOL_A)||0)||(Number(a?.Program_No)||99)-(Number(b?.Program_No)||99));
  const byB=[...source].sort((a,b)=>(Number(b?.YOL_B)||0)-(Number(a?.YOL_B)||0)||(Number(a?.Program_No)||99)-(Number(b?.Program_No)||99));
  const aMap=new Map(byA.map((r,i)=>[r.At_ID||r.At_Adı,i+1])),bMap=new Map(byB.map((r,i)=>[r.At_ID||r.At_Adı,i+1]));
  const ranked=source.sort((a,b)=>{
    let d=(Number(b?.V5_SKOR)||0)-(Number(a?.V5_SKOR)||0);if(d)return d;
    d=((Number(b?.YOL_A)||0)+(Number(b?.YOL_B)||0))-((Number(a?.YOL_A)||0)+(Number(a?.YOL_B)||0));if(d)return d;
    d=(Number(b?.GUNCEL_HEDEF_KANITI)||0)-(Number(a?.GUNCEL_HEDEF_KANITI)||0);if(d)return d;
    d=(Number(b?.VERI_GUVEN)||0)-(Number(a?.VERI_GUVEN)||0);if(d)return d;
    return (Number(a?.Program_No)||99)-(Number(b?.Program_No)||99);
  });
  const main=new Set(ranked.slice(0,mainN).map(r=>r.At_ID||r.At_Adı));
  for(const r of ranked){const k=r.At_ID||r.At_Adı;r.A_SIRA=aMap.get(k);r.B_SIRA=bMap.get(k);r.ANA_ADAY=main.has(k);r.ADAY_TIPI=r.A_SIRA<=2&&r.B_SIRA<=3?'ÇİFT':r.A_SIRA<=2?'FORM':r.B_SIRA<=3?'KAPASİTE':r.ANA_ADAY?'SKOR':'TAKİP';}
  return ranked;
}

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
    const api=loadModel(),scored=api.scoreRace({target,horses,careers,references:refs}),refQuality=referenceSetQuality(refs),mainN=Number(scored?.policy?.mainCandidates)||Math.min(4,horses.length);
    const patchedRows=applyBlindPatch(scored.rows,target,careers),rankedRows=finalRank(patchedRows,mainN,refQuality);
    const currentLeaks=coverage.reduce((s,x)=>s+x.FutureLeak,0),refLeaks=refAudit.reduce((s,x)=>s+x.Leak,0);
    return res.status(200).json({ok:true,runnerVersion:VERSION,patchVersion:PATCH_VERSION,modelVersion:api.VERSION,target,resultApiCalled:false,resultDataLoaded:false,leakAudit:{currentFutureLeakCount:currentLeaks,referenceFutureLeakCount:refLeaks,passed:currentLeaks===0&&refLeaks===0},coverage,referenceWinners:refAudit,referenceSetQuality:+refQuality.toFixed(1),roadmapOk:roadmap?.ok!==false,roadmapError:roadmap?.ok===false?roadmap?.error:null,policy:{...scored.policy,tieBreak:'V5_SKOR > YOL_A+YOL_B > GUNCEL_HEDEF_KANITI > VERI_GUVEN > Program_No',formReliability:'FORM örnek güveni: 1 yarış %85, 2 yarış %92, 3+ yarış %100; nötr 50ye yalnız sınırlı shrink uygulanır',surfaceBridge:'hedef pist örneği yoksa form+HP+benzer kanıttan en fazla 50 puanlık, düşük katsayılı geçiş kanıtı; gerçek pist kanıtının yerine geçmez'},confidence:scored.confidence,rows:rankedRows});
  }catch(e){return res.status(500).json({ok:false,version:VERSION,resultApiCalled:false,error:e?.message||String(e)});}
}
