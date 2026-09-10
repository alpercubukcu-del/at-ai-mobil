/* AT AI Mobil — V16.8.9 Menü 2 kaldırma ve yeniden numaralandırma */
(()=>{
'use strict';
if(window.__AT_MENU_CLEANUP_V1689__) return;
window.__AT_MENU_CLEANUP_V1689__=true;
const VERSION='MENU-2-REMOVED-V16.8.9';

function text(btn,label){
  if(btn && (btn.textContent||'').trim()!==label) btn.textContent=label;
}
function apply(){
  const drawer=document.getElementById('drawer');
  if(!drawer) return;
  const buttons=[...drawer.querySelectorAll('button')];
  for(const btn of buttons){
    const t=(btn.textContent||'').replace(/\s+/g,' ').trim();
    const view=(btn.dataset?.view||'').toLowerCase();
    if(view==='historical'||/Kazanan Yolu|Tarihsel Benzerlik/i.test(t)){
      btn.remove();
      continue;
    }
    if(/Güncel Analiz/i.test(t)) text(btn,'1. Güncel Analiz');
    else if(/Koşu Senaryosu/i.test(t)) text(btn,'2. Koşu Senaryosu');
    else if(/Kariyer Yol Haritası/i.test(t)) text(btn,'3. Kariyer Yol Haritası');
    else if(/Model Kalibrasyonu/i.test(t)) text(btn,'4. Model Kalibrasyonu');
    else if(/Kupon Oluştur/i.test(t)) text(btn,'5. Kupon Oluştur');
    else if(/Kariyer Excel Dışa Aktarım/i.test(t)) text(btn,'6. Kariyer Excel Dışa Aktarım');
    else if(/TJK Yıllık Yarış Arşivi/i.test(t)) text(btn,'7. TJK Yıllık Yarış Arşivi');
  }
}
const obs=new MutationObserver(()=>apply());
try{obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});}catch{}
window.addEventListener('load',()=>setTimeout(apply,20));
apply();
setTimeout(apply,120);
setTimeout(apply,600);
console.info('[AT AI]',VERSION,'aktif — eski 2. menü kaldırıldı, kalan menüler 1–7 sıralandı.');
})();
