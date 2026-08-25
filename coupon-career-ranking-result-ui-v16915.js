/* AT AI Mobil — V16.9.15 Kariyer-only kupon sonuc UI */
(() => {
'use strict';
if (window.__AT_COUPON_CAREER_RESULT_UI_V16915__) return;
window.__AT_COUPON_CAREER_RESULT_UI_V16915__ = true;
const SOURCE='CAREER_PREPARATION_RANKING';
function active(){return Array.isArray(state?.tickets)&&state.tickets.some(t=>t?.source===SOURCE);}
function sync(){
  if(!active())return;
  const root=document.getElementById('tickets');if(!root)return;
  root.querySelectorAll('.cdg-ticket-summary:not(#careerOnlyTicketSummaryV16915)').forEach(el=>el.remove());
  root.querySelectorAll('.ticket-group-v11 summary small').forEach(el=>el.textContent='Kariyer/Hazırlık sıralaması');
  root.querySelectorAll('.ticket-group-v11 summary > span').forEach(el=>el.textContent='Kariyer kaynağı ▾');
  root.querySelectorAll('.ticket-model-tab-v11').forEach(el=>el.textContent='Kariyer/Hazırlık');
  let info=root.querySelector('#careerOnlyTicketSummaryV16915');
  if(!info){
    info=document.createElement('div');info.id='careerOnlyTicketSummaryV16915';info.className='cdg-ticket-summary';
    info.innerHTML='<h3>🎯 Kupon Kaynağı: Kariyer/Hazırlık Sıralaması</h3><p>Bu kuponda 5 Model kullanılmadı. At sırası Kariyer Yol Haritasındaki hazırlık/kariyer puan sırasından alındı.</p>';
    root.prepend(info);
  }
}
const root=document.getElementById('tickets');if(root){try{new MutationObserver(sync).observe(root,{subtree:true,childList:true});}catch{}}
sync();
window.ATCouponCareerResultUiV16915={sync};
console.info('[AT AI] COUPON-CAREER-RESULT-UI-V16.9.15 aktif');
})();
