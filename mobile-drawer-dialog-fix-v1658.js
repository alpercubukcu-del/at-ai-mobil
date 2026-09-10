/* AT AI Mobil — V16.5.8
   Mobilde drawer açıkken dialog açılması sonucu oluşan çift katman/split görünümü düzeltir.
   Analiz veya Excel modellerine dokunmaz. */
(()=>{
'use strict';
if(window.__AT_MOBILE_DRAWER_DIALOG_FIX_V1658__)return;
window.__AT_MOBILE_DRAWER_DIALOG_FIX_V1658__=true;
const VERSION='MOBILE-DRAWER-DIALOG-FIX-V16.5.8';
const $=id=>document.getElementById(id);

function closeDrawerSafe(){
  try{
    if(typeof closeDrawer==='function'){
      closeDrawer();
      return;
    }
  }catch{}
  $('drawer')?.classList.remove('open');
  $('overlay')?.classList.remove('show');
  $('drawer')?.setAttribute('aria-hidden','true');
}

function syncLayers(){
  const anyDialog=[...document.querySelectorAll('dialog')].some(d=>d.open || d.hasAttribute('open'));
  if(anyDialog && $('drawer')?.classList.contains('open')) closeDrawerSafe();
}

/* Menüdeki data-view dışı butonlar (Kariyer Excel, Yıllık Arşiv vb.)
   kendi dialoglarını açarken eski drawer'ı arkada bırakıyordu.
   Capture fazında önce drawer'ı kapat, butonun kendi işlemi normal devam etsin. */
document.addEventListener('click',event=>{
  const button=event.target?.closest?.('#drawer button');
  if(!button)return;
  if(button.id==='closeMenu')return;
  closeDrawerSafe();
},true);

/* Herhangi bir dialog sonradan açılırsa ikinci güvenlik katmanı. */
const observer=new MutationObserver(mutations=>{
  for(const m of mutations){
    if(m.type==='attributes' && m.attributeName==='open'){
      syncLayers();
      return;
    }
  }
});

function start(){
  document.querySelectorAll('dialog').forEach(d=>observer.observe(d,{attributes:true,attributeFilter:['open']}));
  syncLayers();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
else start();

window.addEventListener('pageshow',syncLayers);
window.addEventListener('resize',syncLayers,{passive:true});
console.info('[AT AI]',VERSION,'aktif');
})();
