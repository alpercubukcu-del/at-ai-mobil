/* AT AI Mobil — V16.8.2 Hamburger menü numaralandırma düzeltmesi */
(()=>{
'use strict';
if(window.__AT_DRAWER_MENU_NUMBERING_V1682__) return;
window.__AT_DRAWER_MENU_NUMBERING_V1682__=true;
const VERSION='DRAWER-MENU-NUMBERING-V16.8.2';

function normalizeLabel(btn,label){
  if(!btn) return;
  if((btn.textContent||'').trim()!==label) btn.textContent=label;
}

function fixDrawerNumbers(){
  const drawer=document.getElementById('drawer');
  if(!drawer) return;
  const buttons=[...drawer.querySelectorAll('button')];
  for(const btn of buttons){
    const t=(btn.textContent||'').replace(/\s+/g,' ').trim();
    if(/Kupon Oluştur/i.test(t)) normalizeLabel(btn,'6. Kupon Oluştur');
    else if(/Kariyer Excel Dışa Aktarım/i.test(t)) normalizeLabel(btn,'7. Kariyer Excel Dışa Aktarım');
    else if(/TJK Yıllık Yarış Arşivi/i.test(t)) normalizeLabel(btn,'8. TJK Yıllık Yarış Arşivi');
  }
}

fixDrawerNumbers();
setTimeout(fixDrawerNumbers,0);
setTimeout(fixDrawerNumbers,120);
setTimeout(fixDrawerNumbers,500);
window.addEventListener('load',fixDrawerNumbers,{once:false});
window.addEventListener('pageshow',fixDrawerNumbers,{passive:true});

const drawer=document.getElementById('drawer');
if(drawer){
  const mo=new MutationObserver(()=>fixDrawerNumbers());
  try{mo.observe(drawer,{childList:true,subtree:true});}catch{}
}

window.ATDrawerMenuNumberingV1682={version:VERSION,fix:fixDrawerNumbers};
console.info('[AT AI]',VERSION,'aktif — menü 1-8 sıralaması düzeltildi.');
})();
