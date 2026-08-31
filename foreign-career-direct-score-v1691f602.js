/* AT AI Mobil — V16.9.1F60.2 TJK YABANCI DIREKT KARIYER PUANI
   - TJK yabanci sehirleri model-roadmap sehir filtresinde yoksa analizi bos birakmaz.
   - Yalniz TJK AtKosuBilgileri_Y tarafindan saglanan gercek kariyer satirlarini kullanir.
   - Tarihsel referans varsa mevcut skor korunur; bu katman sadece bos skora fallback olur.
*/
(() => {
'use strict';
if (window.__AT_FOREIGN_DIRECT_CAREER_SCORE_V1691F602__) return;
window.__AT_FOREIGN_DIRECT_CAREER_SCORE_V1691F602__ = true;

const VERSION = 'FOREIGN-DIRECT-CAREER-SCORE-V16.9.1F60.2';
const RULE = 'TJK_FOREIGN_DIRECT_FULL_CAREER_TARGET_FIT_V60_2';

const clean = v => String(v ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
const fold = v => upper(v).replace(/[^A-Z0-9]+/g,'');
const finite = v => {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/);
  const n = Number((m ? m[0] : v).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const clamp = (v,lo=0,hi=100) => Math.max(lo,Math.min(hi,Number(v)||0));
const finish = r => finite(r?.finish ?? r?.rank ?? r?.sira ?? r?.der);

function stateRef(){
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}
function cityName(){
  try { if (typeof getCityName === 'function') return clean(getCityName()); } catch {}
  const s=stateRef();
  return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>String(c?.id)===String(s?.city))?.name)
    || clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent);
}
function isForeignCity(){
  const n=upper(cityName());
  if (!n) return false;
  return !/(ISTANBUL|IZMIR|ANKARA|BURSA|KOCAELI|ADANA|ANTALYA|ELAZIG|SANLIURFA|DIYARBAKIR)/.test(n);
}
function currentRace(){
  const s=stateRef();
  const selected=String(document.getElementById('analysisRace')?.value || s?.selectedRace || '');
  return (Array.isArray(s?.races)?s.races:[]).find(r=>String(r?.no)===selected) || null;
}
function targetMeta(meta={}){
  const race=currentRace() || {};
  return {
    class:clean(meta?.class || meta?.raceClass || race?.class || race?.yaradi1 || ''),
    ageGroup:clean(meta?.ageGroup || meta?.age || race?.ageGroup || race?.yaradi2 || ''),
    distance:finite(meta?.distance ?? meta?.mesafe ?? race?.distance ?? race?.mesafe),
    track:clean(meta?.track || meta?.pist || race?.track || race?.pist || ''),
    city:clean(meta?.city || cityName()),
    date:clean(meta?.date || stateRef()?.date || ''),
    partial:false
  };
}
function targetComplete(t){ return Boolean(clean(t?.class) && clean(t?.ageGroup) && clean(t?.track) && finite(t?.distance)!==null); }

function iso(row={}){
  const x=clean(row?.isoDate); if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const raw=clean(row?.date); let m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(m) return raw;
  m=raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : raw;
}
function desc(rows){ return (Array.isArray(rows)?[...rows]:[]).filter(Boolean).sort((a,b)=>iso(b).localeCompare(iso(a))); }
function classKind(v){
  const u=upper(v);
  if (u.includes('MAIDEN')) return 'MAIDEN';
  if (u.includes('HANDIKAP')) return 'HANDIKAP';
  if (u.includes('SARTLI')) return 'SARTLI';
  if (/\bKV\b|KV\s*-?\s*\d/.test(u)) return 'KV';
  if (/\bG\s*-?\s*\d/.test(u) || u.includes('STAKES') || u.includes('ACIK')) return 'GROUP';
  if (u.includes('SATIS')) return 'SATIS';
  return fold(v);
}
function classPct(a,b){
  const ka=classKind(a), kb=classKind(b);
  if (!ka || !kb) return 66;
  if (ka===kb) return 100;
  if ((ka==='SARTLI'&&kb==='HANDIKAP')||(ka==='HANDIKAP'&&kb==='SARTLI')) return 62;
  if (ka==='MAIDEN'||kb==='MAIDEN') return 42;
  return 50;
}
function trackKey(v){
  const u=upper(v);
  if (u.includes('CIM')||u.includes('TURF')) return 'CIM';
  if (u.includes('SENTETIK')||u.includes('SYNTHETIC')||u.includes('TAPETA')||u.includes('POLYTRACK')||u==='T:'||u==='S:') return 'SENTETIK';
  if (u.includes('KUM')||u.includes('DIRT')||u==='K:') return 'KUM';
  return fold(v);
}
function trackPct(a,b){
  const ka=trackKey(a),kb=trackKey(b);
  if (!ka||!kb) return 68;
  if (ka===kb) return 100;
  if ((ka==='KUM'&&kb==='SENTETIK')||(ka==='SENTETIK'&&kb==='KUM')) return 62;
  return 35;
}
function distancePct(a,b){
  const x=finite(a),y=finite(b);
  if (x===null||y===null||!y) return 70;
  const d=Math.abs(x-y);
  if (d<=100) return 100;
  if (d<=200) return 92;
  if (d<=400) return 78;
  if (d<=600) return 65;
  if (d<=800) return 55;
  return 45;
}
function agePct(a,b){
  const A=upper(a),B=upper(b);
  if (!A||!B) return 76;
  if (fold(A)===fold(B)) return 100;
  const na=finite(A),nb=finite(B);
  if (B.includes('YUKARI') && na!==null && nb!==null && na>=nb) return 92;
  if (A.includes('YUKARI') && na!==null && nb!==null && nb>=na) return 86;
  return 66;
}
function finishPct(v){
  const f=finite(v);
  if (f===null) return 52;
  if (f===1) return 100; if(f===2) return 90; if(f===3) return 82; if(f===4) return 74; if(f===5) return 66;
  if (f===6) return 54; if(f===7) return 46; if(f===8) return 39; if(f===9) return 34; return 30;
}
function rowScore(row,target,index){
  const fp=finishPct(finish(row));
  const hp=finite(row?.hp);
  const hpPct=hp===null?null:clamp(hp,0,100);
  const hasTarget=targetComplete(target);
  let base;
  if (hasTarget) {
    const cls=classPct(row?.class ?? row?.raceClass ?? row?.classRaw ?? row?.yaradi1,target.class);
    const trk=trackPct(row?.track ?? row?.pist ?? row?.trackRaw,target.track);
    const dst=distancePct(row?.distance ?? row?.mesafe ?? row?.msf,target.distance);
    const age=agePct(row?.ageGroup ?? row?.groupRaw ?? row?.yaradi2,target.ageGroup);
    base=cls*.22+trk*.18+dst*.18+age*.08+fp*.26+(hpPct===null?fp:hpPct)*.08;
  } else {
    base=fp*.72+(hpPct===null?fp:hpPct)*.28;
  }
  const recency=Math.max(.82,1-index*.025);
  return clamp(Math.round(base*recency));
}
function currentHorseHpPct(path){
  const name=clean(path?.[0]?.horseName || path?.[0]?.atadi || path?.[0]?.name);
  if (!name) return null;
  const race=currentRace();
  const horses=Array.isArray(race?.horses)?race.horses:[];
  const horse=horses.find(h=>fold(h?.name)===fold(name));
  const hp=finite(horse?.hp);
  if (hp===null) return null;
  const vals=horses.map(h=>finite(h?.hp)).filter(v=>v!==null&&v>0).sort((a,b)=>a-b);
  if (!vals.length) return clamp(hp);
  const below=vals.filter(v=>v<=hp).length;
  return clamp(35+65*(below/vals.length));
}
function directScore(path0,roadmapData={}){
  const rows=desc(path0);
  if (!rows.length) return {score:null,reason:'DEBUT',version:VERSION,rule:RULE};
  const target=targetMeta(roadmapData?.currentRaceMetaF21 || roadmapData?.targetMeta || roadmapData || {});
  const evidence=rows.map((row,i)=>({row,score:rowScore(row,target,i)}));
  const recent=evidence.slice(0,Math.min(6,evidence.length));
  let weightSum=0,weighted=0;
  recent.forEach((x,i)=>{const w=Math.pow(.82,i);weighted+=x.score*w;weightSum+=w;});
  const recentAvg=weightSum?weighted/weightSum:0;
  const best3=[...evidence].sort((a,b)=>b.score-a.score).slice(0,3);
  const bestAvg=best3.length?best3.reduce((s,x)=>s+x.score,0)/best3.length:recentAvg;
  const top5Rate=rows.filter(r=>{const f=finish(r);return f!==null&&f>=1&&f<=5;}).length/rows.length;
  const top3Rate=rows.filter(r=>{const f=finish(r);return f!==null&&f>=1&&f<=3;}).length/rows.length;
  const consistency=clamp(top5Rate*72+top3Rate*28);
  const hpPct=currentHorseHpPct(rows);
  let score=recentAvg*.55+bestAvg*.20+consistency*.15;
  let denom=.90;
  if (hpPct!==null){score+=hpPct*.10;denom=1;}
  score=score/denom;
  const first3=evidence.slice(0,3).map(x=>x.score);
  const next3=evidence.slice(3,6).map(x=>x.score);
  if(first3.length>=2&&next3.length>=2){
    const a=first3.reduce((s,x)=>s+x,0)/first3.length;
    const b=next3.reduce((s,x)=>s+x,0)/next3.length;
    score+=Math.max(-4,Math.min(4,(a-b)*.10));
  }
  score=Math.round(clamp(score,15,94));
  const best=best3[0]?.row || rows[0];
  return {
    score,
    target,
    targetComplete:targetComplete(target),
    careerRows:rows.length,
    recentAvg:Math.round(recentAvg),
    bestAvg:Math.round(bestAvg),
    top5RatePct:Math.round(top5Rate*100),
    top3RatePct:Math.round(top3Rate*100),
    currentHpPercentile:hpPct===null?null:Math.round(hpPct),
    bestEvidence:{date:best?.date||best?.isoDate||'',city:best?.city||best?.sehir||'',finish:finish(best),distance:finite(best?.distance??best?.mesafe??best?.msf),track:best?.track||best?.pist||'',class:best?.class||best?.raceClass||best?.classRaw||''},
    version:VERSION,
    rule:RULE
  };
}

/* Yabanci kariyerde ana hesaplayiciya tum TJK kariyerini ver; hazırlık/top5 listeleri ayrıca korunur. */
if (typeof fetchCareer === 'function') {
  const baseFetchCareerF602=fetchCareer;
  fetchCareer=async function(horseId,before){
    const out=await baseFetchCareerF602(horseId,before);
    const id=Number(horseId);
    if (Number.isFinite(id)&&id<0&&out&&out.ok!==false&&Array.isArray(out.history)&&out.history.length) {
      out.directCareerPath=[...out.history];
      out.roadmap=[...out.history];
      out.foreignDirectCareerVersion=VERSION;
    }
    return out;
  };
}

/* Yabancı programlarda TJK bazı koşu meta alanlarını boş bırakabiliyor. Analizi tamamen kesmek yerine kısmi meta ile devam et. */
if (typeof programRaceMeta === 'function') {
  const baseProgramRaceMetaF602=programRaceMeta;
  programRaceMeta=function(race){
    const out=baseProgramRaceMetaF602(race);
    if (out?.ok || !isForeignCity()) return out;
    const t=targetMeta(race||{});
    return {
      ...out,
      ...t,
      ok:true,
      foreignMetaPartial:true,
      foreignDirectCareerVersion:VERSION,
      warning:clean(out?.error || 'TJK yabancı program koşu şartları kısmi; doğrudan kariyer form yolu kullanılacak.')
    };
  };
}

/* TJK model-roadmap şehir filtresi yabancı merkezi tanımıyorsa yavaş/hatalı sunucu çağrısını atla. */
if (typeof fetchHistoricalRoadmap === 'function') {
  const baseFetchHistoricalRoadmapF602=fetchHistoricalRoadmap;
  fetchHistoricalRoadmap=async function(meta){
    if (isForeignCity()) {
      const t=targetMeta(meta||{});
      return {
        ok:true,
        version:VERSION,
        historicalRaces:[],
        byYear:[],
        yearResults:[],
        currentRaceMetaF21:t,
        targetMeta:t,
        foreignDirectCareerFallback:true,
        foreignDirectCareerVersion:VERSION,
        source:'TJK AtKosuBilgileri_Y — doğrudan kariyer yolu',
        warning:targetComplete(t)?null:'Koşu şartları TJK programında kısmi; skor kariyer formu + HP kanıtı ile üretildi.'
      };
    }
    return baseFetchHistoricalRoadmapF602(meta);
  };
}

if (typeof calculateGalibiyetBenzerligi === 'function') {
  const baseCalcF602=calculateGalibiyetBenzerligi;
  calculateGalibiyetBenzerligi=function(currentPath,roadmapData){
    const out=baseCalcF602(currentPath,roadmapData)||{};
    const existing=finite(out?.score);
    const foreign=roadmapData?.foreignDirectCareerFallback || (Array.isArray(currentPath)&&currentPath.some(r=>r?.foreignSource||r?.foreignCareer));
    if (!foreign || existing!==null) return out;
    const d=directScore(currentPath,roadmapData||{});
    if (finite(d.score)===null) return {...out,foreignDirectCareer:d,foreignDirectCareerVersion:VERSION};
    return {
      ...out,
      score:d.score,
      scoreSource:'TJK_FOREIGN_DIRECT_CAREER',
      method:RULE,
      foreignDirectCareer:d,
      foreignDirectCareerVersion:VERSION,
      matchedHistoricalHorse:null,
      matchedHistoricalFinish:d?.bestEvidence?.finish ?? null,
      matchedHistoricalRace:d?.bestEvidence?.date ? `${d.bestEvidence.date} ${d.bestEvidence.city}`.trim() : null,
      referenceCount:d.careerRows,
      currentPathCount:d.careerRows
    };
  };
}

/* F60/F60.1'de kaydedilmiş boş yabancı sıralamayı bir kez geçersiz kıl. */
try {
  const s=stateRef();
  const hasForeign=(Array.isArray(s?.races)?s.races:[]).some(r=>(r?.horses||[]).some(h=>Number(h?.id)<0));
  const cached=s?.analyses?.career;
  const hasBlank=Array.isArray(cached?.races)&&cached.races.some(r=>(r?.horses||[]).some(h=>finite(h?.galibiyetBenzerligi?.score)===null));
  const tagged=Array.isArray(cached?.races)&&cached.races.some(r=>(r?.horses||[]).some(h=>h?.galibiyetBenzerligi?.foreignDirectCareerVersion===VERSION));
  if (hasForeign&&hasBlank&&!tagged) {
    s.analyses.career={};
    try { if (typeof save==='function') save(); } catch {}
  }
} catch {}

window.ATForeignDirectCareerScoreV1691F602={version:VERSION,rule:RULE,score:directScore};
console.info('[AT AI]',VERSION,'aktif — yabancı TJK kariyerinde boş skor yok; gerçek geçmişten direkt yol puanı.');
})();
