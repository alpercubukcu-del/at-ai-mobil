/* AT AI Mobil — V16.9.1F60.39 Annual reference request timeout guard
   Keeps stable Annual Five Model source untouched.
   While TJK Annual Archive dialog is open, selected archive analysis network requests
   cannot wait forever. A single stalled historical race/career request rejects after
   30 seconds so existing V14.1 catch/finally logic marks it skipped and continues.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_REFERENCE_TIMEOUT_GUARD_V1691F639__) return;
window.__AT_ANNUAL_REFERENCE_TIMEOUT_GUARD_V1691F639__ = true;

const VERSION='ANNUAL-REFERENCE-TIMEOUT-GUARD-V16.9.1F60.39';
const TIMEOUT_MS=30000;
const baseFetch=window.fetch.bind(window);

function isAnnualOpen(){
  return !!document.getElementById('tjkAnnualArchiveDialog')?.open;
}
function targetLabel(url){
  if(url.pathname==='/api/tjk-history') return 'Tarihsel sonuç';
  if(url.pathname==='/api/tjk-career-v10') return 'Kariyer API';
  if(url.pathname==='/api/tjk-race-meta') return 'Koşu meta';
  return '';
}
function timeoutError(label,url){
  const detail=url.pathname==='/api/tjk-history'
    ? [url.searchParams.get('date'),url.searchParams.get('city'),url.searchParams.get('raceNo')&&url.searchParams.get('raceNo')+'.K'].filter(Boolean).join(' · ')
    : '';
  return new Error(`${label}${detail?' '+detail:''} 30 saniyede tamamlanmadı.`);
}
window.fetch=function annualReferenceTimeoutFetch(input,init){
  let url=null;
  try{url=new URL(input instanceof Request?input.url:String(input||''),location.origin)}catch{}
  const label=url&&url.origin===location.origin&&isAnnualOpen()?targetLabel(url):'';
  if(!label)return baseFetch(input,init);

  let timer=null;
  const request=baseFetch(input,init);
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(timeoutError(label,url)),TIMEOUT_MS);
  });
  return Promise.race([request,timeout]).finally(()=>{if(timer)clearTimeout(timer)});
};

function decorateProgress(){
  const out=document.getElementById('aaAnalysis');
  if(!out||out.dataset.f639Guard==='1')return;
  out.dataset.f639Guard='1';
  const obs=new MutationObserver(()=>{
    const text=String(out.textContent||'');
    if(/İlk 3 referans yarışları:/i.test(text)&&!/tek takılan istek/i.test(text)){
      const note=out.querySelector('.aa-note');
      if(note&&!note.querySelector('[data-f639-note]')){
        const small=document.createElement('div');
        small.dataset.f639Note='1';
        small.style.cssText='margin-top:5px;font-size:10px;opacity:.72';
        small.textContent='Tek takılan istek en fazla 30 sn bekler; sonra atlanıp analiz devam eder.';
        note.appendChild(small);
      }
    }
  });
  obs.observe(out,{childList:true,subtree:true,characterData:true});
}
window.addEventListener('at-ai:annual-archive-open',()=>setTimeout(decorateProgress,0));
window.addEventListener('at-ai:annual-archive-created',()=>setTimeout(decorateProgress,0));
setTimeout(decorateProgress,100);

window.ATAnnualReferenceTimeoutGuardV639={version:VERSION,timeoutMs:TIMEOUT_MS};
console.info('[AT AI]',VERSION,'active — annual history/career/meta requests timeout after 30s; one stuck reference cannot block the run.');
})();