/* AT AI Mobil — V16.6.0
   V16.5.8/V16.5.9 global hard-lock yaklaşımı kaldırıldı.
   Mobil menüde tıklanan hedefin kendi onclick'i ÖNCE çalışır;
   drawer yalnız event tamamlandıktan sonra kapanır.
   Analiz/puanlama/export hesaplarına dokunmaz. */
(()=>{
'use strict';
if(window.__AT_MOBILE_MENU_TRANSITION_V1660__) return;
window.__AT_MOBILE_MENU_TRANSITION_V1660__ = true;
const VERSION='MOBILE-MENU-TRANSITION-V16.6.0';
const $=id=>document.getElementById(id);

function closeDrawerSafe(){
  try{
    if(typeof closeDrawer==='function'){
      closeDrawer();
      return;
    }
  }catch{}
  const d=$('drawer'), o=$('overlay');
  d?.classList.remove('open');
  d?.setAttribute('aria-hidden','true');
  o?.classList.remove('show');
}

/*
  KRİTİK: capture aşamasında drawer'ı HEMEN kapatma.
  Android/Chrome hedef buton DOM'da görünmez hale gelirse click/onclick'i iptal edebiliyor.
  Burada sadece kapanmayı sıraya alıyoruz; butonun gerçek handler'ı normal çalışıyor.
*/
document.addEventListener('click',event=>{
  const button=event.target?.closest?.('#drawer button');
  if(!button || button.id==='closeMenu') return;
  setTimeout(closeDrawerSafe,0);
},true);

/* Dinamik dialog açılırsa ikinci güvenlik: sadece drawer kapanır; CSS/pointer kilidi yok. */
const observer=new MutationObserver(mutations=>{
  for(const m of mutations){
    if(m.type==='attributes' && m.attributeName==='open' && m.target?.tagName==='DIALOG' && m.target.open){
      closeDrawerSafe();
      break;
    }
  }
});

function bindDialogs(){
  document.querySelectorAll('dialog').forEach(d=>{
    if(d.dataset.atMenuTransitionV1660) return;
    d.dataset.atMenuTransitionV1660='1';
    observer.observe(d,{attributes:true,attributeFilter:['open']});
  });
}

const domObserver=new MutationObserver(()=>bindDialogs());
function start(){
  bindDialogs();
  domObserver.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('pageshow',()=>{
    /* Arka plandan dönüşte sadece gerçek açık dialog varsa menüyü kapat. */
    if([...document.querySelectorAll('dialog')].some(d=>d.open)) closeDrawerSafe();
  });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
else start();

console.info('[AT AI]',VERSION,'aktif');
})();
