/* AT AI Mobil — V16.9.1F60.94.5 Degree-Speed top-5 display only
   Existing F60.90 calculations and ranking stay untouched; the card displays rank 1–5 instead of 1–4.
*/
(()=>{
'use strict';
if(window.__AT_DEGREE_SPEED_TOP5_F60945__) return;
window.__AT_DEGREE_SPEED_TOP5_F60945__=true;
const VERSION='DEGREE-SPEED-TOP5-V16.9.1F60.94.5';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function fifthRowHtml(h){
  const m=h?.degreeModel||{};
  return `<tr data-degree-top5-f60945="1"><td style="padding:5px;text-align:center"><b>${esc(m.rank||5)}</b></td><td style="padding:5px"><b>${esc(h?.no)}. ${esc(h?.name)}</b></td><td style="padding:5px;text-align:center"><b>${esc(m.predictedText||'—')}</b></td><td style="padding:5px;text-align:center">${esc(m.rangeText||'—')}</td><td style="padding:5px;text-align:center">%${esc(m.confidence??'—')}</td><td style="padding:5px;text-align:center">${esc(m.horseSamples??0)}/${esc(m.baselineSamples??0)}</td><td style="padding:5px;text-align:center">${esc(m.pedigree?.level||'—')} (${esc(m.pedigree?.examples||0)})</td></tr>`;
}

function applyTop5(){
  const result=(typeof state!=='undefined'&&state?.analyses?.current)||null;
  const box=document.getElementById('degreeSpeedShadowF6090');
  if(!box||!result?.degreeSpeed||!Array.isArray(result?.races)) return false;
  for(const detail of box.querySelectorAll('details')){
    const summary=detail.querySelector('summary');
    const raceNo=clean(summary?.textContent).match(/^(\d+)\s*\.\s*Koşu/i)?.[1];
    const race=result.races.find(r=>String(r?.no)===String(raceNo));
    const tbody=detail.querySelector('tbody');
    if(!race||!tbody||tbody.querySelector('[data-degree-top5-f60945="1"]')) continue;
    const ranked=(race.horses||[]).filter(h=>Number.isFinite(h?.degreeModel?.predictedSec)).sort((a,b)=>a.degreeModel.predictedSec-b.degreeModel.predictedSec);
    const fifth=ranked[4];
    if(!fifth||tbody.querySelectorAll('tr').length>=5) continue;
    tbody.insertAdjacentHTML('beforeend',fifthRowHtml(fifth));
  }
  box.dataset.top5Version=VERSION;
  return true;
}

try{
  if(typeof gRenderCurrentV1657==='function'){
    const before=gRenderCurrentV1657;
    gRenderCurrentV1657=function(...args){const out=before.apply(this,args);applyTop5();setTimeout(applyTop5,0);return out};
  }
}catch(e){console.warn('[AT AI]',VERSION,'render hook:',e)}

applyTop5();
setTimeout(applyTop5,100);setTimeout(applyTop5,700);
window.ATDegreeSpeedTop5F60945={version:VERSION,apply:applyTop5};
console.info('[AT AI]',VERSION,'active — Degree-Speed card displays top 5; calculations unchanged.');
})();
