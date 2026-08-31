/* AT AI Mobil — V16.9.1F60.3 YABANCI MODEL ROADMAP FALLBACK
   - TJK KosuSorgulama sehir filtresinde olmayan yabanci hipodromlari servis hatasi / %0 saymaz.
   - Yabanci merkezlerde V11 roadmap istegini atlar; gercek TJK AtKosuBilgileri_Y kariyer satirlarindan Kariyer kanali uretir.
   - Tam / Ikiz / Aile kanallari icin gercek tarihsel referans yoksa veri uydurulmaz; null kalir.
   - Bilesik puan, mevcut kanal(lar) uzerinden mevcut V11 normalize kuralina gore hesaplanir.
*/
(() => {
'use strict';
if (window.__AT_FOREIGN_MODEL_ROADMAP_FALLBACK_V1691F603__) return;
window.__AT_FOREIGN_MODEL_ROADMAP_FALLBACK_V1691F603__ = true;

const VERSION = 'FOREIGN-MODEL-ROADMAP-FALLBACK-V16.9.1F60.3';
const RULE = 'FOREIGN_NO_CITY_FILTER_IS_NOT_ZERO_V60_3';

const clean = v => String(v ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
const finite = v => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(String(v).replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0] ?? v);
  return Number.isFinite(n) ? n : null;
};
const clamp = (v,lo=0,hi=100) => Math.max(lo,Math.min(hi,Number(v)||0));

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
function targetMeta(race={}){
  let meta={};
  try { if (typeof programRaceMeta === 'function') meta=programRaceMeta(race)||{}; } catch {}
  return {
    class:clean(meta?.class || race?.class || race?.yaradi1 || ''),
    ageGroup:clean(meta?.ageGroup || race?.ageGroup || race?.yaradi2 || ''),
    track:clean(meta?.track || race?.track || race?.pist || ''),
    distance:finite(meta?.distance ?? race?.distance ?? race?.mesafe),
    city:cityName(),
    date:clean(stateRef()?.date || '')
  };
}

/* Ana hata burada olusuyordu: V11 dogrudan /api/tjk-model-roadmap-v11 cagirip yabanci sehir filtresi ariyordu. */
if (typeof fetchModelRoadmapV11 === 'function') {
  const baseFetchModelRoadmapV11F603 = fetchModelRoadmapV11;
  fetchModelRoadmapV11 = async function(race){
    if (!isForeignCity()) return baseFetchModelRoadmapV11F603(race);
    const t=targetMeta(race||{});
    return {
      ok:true,
      version:VERSION,
      models:{ EXACT:[], CONDITION_TWIN:[], RACE_FAMILY:[] },
      counts:{ EXACT:0, CONDITION_TWIN:0, RACE_FAMILY:0 },
      currentRaceMetaF21:t,
      targetMeta:t,
      foreignDirectCareerFallback:true,
      foreignDirectCareerVersion:VERSION,
      source:'TJK program + AtKosuBilgileri_Y gercek kariyer satirlari',
      warning:'TJK KosuSorgulama sehir filtresi bu yabanci hipodromu icermiyor. Bu durum %0 degildir; Kariyer kanali dogrudan gercek kariyerden hesaplandi.'
    };
  };
}

function finishValue(row={}){ return finite(row?.finish ?? row?.rank ?? row?.sira ?? row?.der); }
function finishScore(v){
  const f=finite(v);
  if (f===null) return 50;
  if (f===1) return 100; if (f===2) return 90; if (f===3) return 82; if (f===4) return 74; if (f===5) return 66;
  if (f===6) return 55; if (f===7) return 47; if (f===8) return 40; if (f===9) return 35;
  return 30;
}
function trackKey(v=''){
  const n=upper(v);
  if (n.includes('CIM') || n.includes('TURF')) return 'CIM';
  if (n.includes('SENTETIK') || n.includes('SYNTHETIC') || n.includes('TAPETA') || n.includes('POLYTRACK')) return 'SENTETIK';
  if (n.includes('KUM') || n.includes('DIRT')) return 'KUM';
  return n.replace(/[^A-Z0-9]/g,'');
}
function classKey(v=''){
  const n=upper(v);
  if (n.includes('MAIDEN')) return 'MAIDEN';
  if (n.includes('HANDIKAP') || n.includes('HANDICAP')) return 'HANDIKAP';
  if (n.includes('SARTLI') || n.includes('ALLOWANCE')) return 'SARTLI';
  if (n.includes('SATIS') || n.includes('CLAIMING')) return 'SATIS';
  if (/\bG\s*-?\s*[123]\b/.test(n) || n.includes('STAKES') || n.includes('LISTED')) return 'GROUP';
  return n.replace(/[^A-Z0-9]/g,'');
}
function rowFit(row,target){
  const parts=[];
  const rd=finite(row?.distance ?? row?.mesafe ?? row?.msf);
  const td=finite(target?.distance);
  if (rd!==null && td!==null && td>0) {
    const d=Math.abs(rd-td);
    parts.push(d<=100?100:d<=200?92:d<=400?78:d<=600?65:d<=800?55:45);
  }
  const rt=trackKey(row?.track ?? row?.pist ?? '');
  const tt=trackKey(target?.track ?? '');
  if (rt && tt) parts.push(rt===tt?100:((rt==='KUM'&&tt==='SENTETIK')||(rt==='SENTETIK'&&tt==='KUM')?62:35));
  const rc=classKey(row?.class ?? row?.raceClass ?? row?.classRaw ?? row?.yaradi1 ?? '');
  const tc=classKey(target?.class ?? '');
  if (rc && tc) parts.push(rc===tc?100:((rc==='MAIDEN'||tc==='MAIDEN')?45:60));
  if (!parts.length) return 65;
  return parts.reduce((s,x)=>s+x,0)/parts.length;
}
function careerRows(career={}){
  const rows = Array.isArray(career?.directCareerPath) ? career.directCareerPath
    : Array.isArray(career?.history) ? career.history
    : Array.isArray(career?.roadmap) ? career.roadmap : [];
  return rows.filter(Boolean);
}
function directCareerScore(career,roadmap){
  const rows=careerRows(career);
  if (!rows.length) return null;
  const target=roadmap?.targetMeta || roadmap?.currentRaceMetaF21 || {};
  const scored=rows.slice(0,12).map((row,i)=>{
    const perf=finishScore(finishValue(row));
    const fit=rowFit(row,target);
    const raw=perf*.62 + fit*.38;
    const recency=Math.max(.82,1-i*.022);
    return clamp(raw*recency);
  });
  const recent=scored.slice(0,6);
  let sw=0,ww=0;
  recent.forEach((v,i)=>{const w=Math.pow(.82,i);ww+=v*w;sw+=w;});
  const recentAvg=sw?ww/sw:scored[0];
  const top5=rows.filter(r=>{const f=finishValue(r);return f!==null&&f>=1&&f<=5;}).length/rows.length*100;
  const top3=rows.filter(r=>{const f=finishValue(r);return f!==null&&f>=1&&f<=3;}).length/rows.length*100;
  const consistency=top5*.72+top3*.28;
  return Math.round(clamp(recentAvg*.78+consistency*.22,15,94));
}

/* Roadmap bos olsa bile yabanci atta gercek kariyer kanali kaybolmasin. */
if (typeof horseModelScoresV11 === 'function') {
  const baseHorseModelScoresV11F603 = horseModelScoresV11;
  horseModelScoresV11 = function(career,roadmap){
    const out=baseHorseModelScoresV11F603(career,roadmap);
    if (!isForeignCity()) return out;
    const existing=finite(out?.composite?.score);
    if (existing!==null) return out;
    const score=directCareerScore(career,roadmap||{});
    if (score===null) return out; // gercek debut ise puan yok
    const mode = (typeof analysisModeV11 === 'function') ? analysisModeV11(career) : (career?.analysisMode || 'PREPARATION_PATH');
    const careerChannel={
      ...(out?.career||{}),
      score,
      mode,
      directForeignCareer:true,
      careerRows:careerRows(career).length,
      rule:RULE,
      version:VERSION
    };
    const exact=out?.exact || {score:null};
    const twin=out?.twin || {score:null};
    const family=out?.family || {score:null};
    const composite = (typeof compositeScoreV11 === 'function')
      ? compositeScoreV11({exact,twin,family,career:careerChannel})
      : {score,present:['career'],missing:['exact','twin','family'],usedWeight:.15};
    return {
      ...out,
      exact,twin,family,
      career:careerChannel,
      composite:{...composite,foreignDirectCareer:true,rule:RULE,version:VERSION},
      foreignDirectCareer:true,
      foreignDirectCareerVersion:VERSION
    };
  };
}

console.info('[AT AI]', VERSION, 'aktif — yabanci sehir filtresi yoksa hata/%0 degil, gercek kariyer fallback');
})();
