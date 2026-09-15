/* AT AI Mobil — F60.76 Sonuç Arşivi UI Enforcer */
(() => {
'use strict';
if(window.__AT_RESULTS_FIRST_UI_F6076__)return;
window.__AT_RESULTS_FIRST_UI_F6076__=true;
const VERSION='RESULTS-FIRST-UI-V16.9.1F60.76';
const $=id=>document.getElementById(id);
function enforce(){
  const dlg=$('tjkAnnualArchiveDialog');
  const sec=$('annualResultsSectionV661');
  const panel=$('f62ResultsPanel');
  if(dlg){
    const title=dlg.querySelector('.aa-head h2');if(title)title.textContent='Yıllık Yarış Sonuç Arşivi';
    const eyebrow=dlg.querySelector('.aa-head .aa-eyebrow');if(eyebrow)eyebrow.textContent='AT AI SYSTEM · SONUÇ-ÖNCELİKLİ TARİHSEL ARŞİV · F60.76';
  }
  if(sec){
    const oldProgram=sec.previousElementSibling;
    if(oldProgram?.classList?.contains('aa-section')&&(oldProgram.querySelector('#aaUpdateYear')||oldProgram.querySelector('#aaUpdateYearSelect')||oldProgram.textContent?.includes('Yıllık katalog yönetimi')))oldProgram.style.display='none';
    for(const child of [...sec.children])child.style.display=child.id==='f62ResultsPanel'?'':'none';
  }
  if(panel){
    panel.style.display='';
    const h=panel.querySelector('h3');if(h)h.textContent='📅 Yıllık Yarış Sonuçları · Gerçekleşmiş Koşular';
    const repair=$('f62rRepair');if(repair)repair.remove();
    const actions=panel.querySelector('.f62-actions');if(actions)actions.style.gridTemplateColumns='1fr';
    const btn=$('f62rUpdate');if(btn)btn.textContent='Eksik Gerçek Sonuçları Güncelle';
    const st=$('f62rStatus');
    if(st&&/Tamamlanmış günler yeniden indirilmez|Program arşiv/i.test(st.textContent||''))st.textContent='Kaynak: TJK gerçekleşmiş yarış sonuçları. Erteleme, pist ve mesafe değişiklikleri sonuçtaki son haliyle kaydedilir.';
  }
  if(window.ATF6062&&window.ATResultsFirstF6075?.readHistoricalRange)window.ATF6062.readProgramRange=window.ATResultsFirstF6075.readHistoricalRange;
}
function schedule(){for(const ms of[0,60,180,450,900])setTimeout(enforce,ms)}
document.addEventListener('click',e=>{if(e.target.closest?.('#annualArchiveBtn,#tjkAnnualArchiveButton,#annualArchiveButton,[data-view="annual-archive"]'))schedule()},true);
window.addEventListener('at-ai:annual-archive-open',schedule);
window.addEventListener('pageshow',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
setTimeout(schedule,1200);
window.ATResultsFirstUiF6076={version:VERSION,enforce};
console.info('[AT AI]',VERSION,'aktif — eski yıllık program yönetimi ve onarım UI gizlendi; sonuç arşivi tek görünür tarihsel kaynak.');
})();
