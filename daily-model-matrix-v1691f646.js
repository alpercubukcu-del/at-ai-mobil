/* AT AI Mobil — V16.9.1F60.46 selected-package 20 model matrix */
(() => {
'use strict';
if (window.__AT_DAILY_MODEL_MATRIX_V1691F646__) return;
window.__AT_DAILY_MODEL_MATRIX_V1691F646__ = true;

const VERSION='SELECTED-PACKAGE-20-MODEL-MATRIX-V16.9.1F60.46';
const BASE=[
  ['composite','Bileşik'],['exact','Tam'],['twin','İkiz'],['family','Aile'],['career','Kariyer']
];
const SLOTS=[['overall','Genel'],['1','1.'],['2','2.'],['3','3.']];
const ids=BASE.flatMap(([base])=>SLOTS.map(([slot])=>`${base}:${slot}`));
const labels=Object.fromEntries(BASE.flatMap(([base,label])=>SLOTS.map(([slot,slotLabel])=>[`${base}:${slot}`,`${label} · ${slotLabel}`])));
const clean=v=>String(v??'').trim();

function parse(id){
  const [base='composite',slot='overall']=clean(id).split(':');
  return {base,slot:SLOTS.some(([key])=>key===slot)?slot:'overall'};
}
function rankOverall(baseRank,data,base){
  const aggregate=new Map();
  for(const finish of [1,2,3]){
    const rows=baseRank(data,finish,base)||[];
    for(let i=0;i<rows.length;i++){
      const row=rows[i], horse=row?.item?.horse;
      const key=clean(horse?.id)||`${clean(horse?.no)}|${clean(horse?.name)}`;
      if(!key) continue;
      const prior=aggregate.get(key)||{item:row.item,points:0,coverage:0};
      // Genel is the combined 1st/2nd/3rd evidence; higher reciprocal-rank total wins.
      prior.points+=1/(i+1); prior.coverage++; aggregate.set(key,prior);
    }
  }
  return [...aggregate.values()].map(x=>({
    item:x.item,
    channel:{score:Math.round(x.points*10000)/100,rawScore:x.points,coverage:x.coverage,modelMatrix:VERSION}
  })).sort((a,b)=>b.channel.score-a.channel.score||Number(a.item?.horse?.no||999)-Number(b.item?.horse?.no||999));
}
function install(){
  if(typeof window.modelRankingPodiumV115!=='function') return false;
  if(window.modelRankingPodiumV115.__atMatrixV646) return true;
  const baseRank=window.modelRankingPodiumV115;
  const wrapped=(data,finish,id)=>{
    const spec=parse(id);
    if(!clean(id).includes(':')) return baseRank(data,finish,id);
    if(spec.slot==='overall') return rankOverall(baseRank,data,spec.base);
    return baseRank(data,Number(spec.slot),spec.base);
  };
  wrapped.__atMatrixV646=true;
  wrapped.base=baseRank;
  window.modelRankingPodiumV115=wrapped;
  return true;
}
function selectedPackageOnly(pkg){
  const refs=Array.isArray(pkg?.referenceKeys)?pkg.referenceKeys:[];
  const plan=pkg?.referencePlan||{};
  return {ok:refs.length>0,referenceKeys:refs,selectedUnique:Number(plan?.selectedUnique||refs.length),selectedCounts:plan?.selectedCounts||{},strategy:plan?.strategy||''};
}
window.ATModelMatrixV646={version:VERSION,ids,labels,parse,install,selectedPackageOnly};
// This module is prepended to the bundle; retry after legacy ranking code is initialized.
install();
setTimeout(install,0);
window.addEventListener('load',install,{once:true});
console.info('[AT AI]',VERSION,'aktif — 5 kanal × Genel/1./2./3. = 20 model; genel sıra aynı seçili paketin 1/2/3 kanıt birleşiminden üretilir.');
})();
