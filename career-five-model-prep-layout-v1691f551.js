/* AT AI Mobil - V16.9.1F55.1 Career 5 Model mobile layout
   - Visual-only follow-up: keep the four staged 5 Model controls full-width and stacked,
     matching the established mobile Career Excel control layout.
   - Calculation, archive and scoring behavior are unchanged.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_PREP_LAYOUT_V1691F551__) return;
window.__AT_CAREER_FIVE_MODEL_PREP_LAYOUT_V1691F551__ = true;
const STYLE_ID='careerFiveModelPrepLayoutV1691F551';
function install(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
    #ceDaily5ArchiveV1691F3 .career-five-model-actions-v1691f55{
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      gap:9px!important;
    }
    #ceDaily5ArchiveV1691F3 .career-five-model-actions-v1691f55 button{
      grid-column:1/-1!important;
      width:100%!important;
      min-height:52px!important;
    }
  `;
  document.head.appendChild(s);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
window.ATCareerFiveModelPrepLayoutV1691F551={version:'CAREER-FIVE-MODEL-PREP-LAYOUT-V16.9.1F55.1'};
})();
