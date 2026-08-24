/* AT AI Mobil — V16.7.7 Kupon Veri Denetimi mobil açılış/scroll düzeltmesi
   - Kupon Veri Denetimi her açılışta gerçek viewport'a sabitlenir.
   - Önceki iç scroll konumu sıfırlanır; ekran daima başlıktan başlar.
   - Arka sayfa overlay açıkken kaymaz; kapanınca eski sayfa konumu korunur.
   - V16.7.1 karar/puan formüllerine dokunmaz.
   - V16.7.9 HOTFIX: style mutasyonunu gözlemek sonsuz MutationObserver döngüsü oluşturduğu için kaldırıldı.
   - V16.8.0 MOBILE NATIVE FIX: body position:fixed kaldırıldı; 100dvw/100dvh zorlaması kaldırıldı.
*/
(() => {
'use strict';
if (window.__AT_COUPON_GATE_MOBILE_RESET_V1677__) return;
window.__AT_COUPON_GATE_MOBILE_RESET_V1677__ = true;

const VERSION='COUPON-GATE-MOBILE-RESET-V16.7.7';
const SCREEN_ID='couponDecisionGateV1671';
const STYLE_ID='couponGateMobileResetStyleV1677';
let wasOpen=false;
let savedPageY=0;
let locked=false;

function injectStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
#${SCREEN_ID}{
  position:fixed!important;
  inset:0!important;
  top:0!important;right:0!important;bottom:0!important;left:0!important;
  width:auto!important;height:auto!important;
  min-width:0!important;min-height:0!important;
  max-width:none!important;max-height:none!important;
  margin:0!important;padding:0!important;
  transform:none!important;translate:none!important;
  overflow:hidden!important;
  box-sizing:border-box!important;
  z-index:2147483000!important;
  background:#07131f!important;
}
#${SCREEN_ID}.open{display:flex!important;flex-direction:column!important;align-items:stretch!important;}
#${SCREEN_ID} .cdg-head{
  position:relative!important;
  top:auto!important;left:auto!important;right:auto!important;
  flex:0 0 auto!important;
  width:100%!important;min-width:0!important;max-width:100%!important;
  box-sizing:border-box!important;
  z-index:3!important;
}
#${SCREEN_ID} .cdg-body{
  position:relative!important;
  flex:1 1 auto!important;
  min-width:0!important;min-height:0!important;
  width:100%!important;max-width:100%!important;
  height:auto!important;max-height:none!important;
  overflow-y:auto!important;overflow-x:hidden!important;
  box-sizing:border-box!important;
  overscroll-behavior:contain!important;
  -webkit-overflow-scrolling:touch!important;
  scroll-behavior:auto!important;
}
@media(max-width:760px){
  #${SCREEN_ID} .cdg-head{
    padding-top:max(12px,env(safe-area-inset-top))!important;
    padding-left:max(12px,env(safe-area-inset-left))!important;
    padding-right:max(12px,env(safe-area-inset-right))!important;
  }
  #${SCREEN_ID} .cdg-body{
    padding-left:max(12px,env(safe-area-inset-left))!important;
    padding-right:max(12px,env(safe-area-inset-right))!important;
    padding-bottom:max(24px,env(safe-area-inset-bottom))!important;
  }
}
`;
  document.head.appendChild(s);
}

function screen(){return document.getElementById(SCREEN_ID);}
function isOpen(){return !!screen()?.classList.contains('open');}

function lockPage(){
  if(locked) return;
  locked=true;
  savedPageY=window.scrollY||document.documentElement.scrollTop||0;
  try{
    // Android'de body'yi fixed yapmak viewport koordinatını bozuyordu.
    document.documentElement.style.setProperty('overflow','hidden','important');
    document.documentElement.style.setProperty('overscroll-behavior','none','important');
    document.body.style.setProperty('overflow','hidden','important');
    document.body.style.setProperty('overscroll-behavior','none','important');
  }catch{}
}

function unlockPage(){
  if(!locked) return;
  locked=false;
  try{
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overscroll-behavior');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overscroll-behavior');
    window.scrollTo(0,savedPageY);
  }catch{}
}

function hardViewport(){
  injectStyle();
  const el=screen();
  if(!el) return false;
  if(document.body && el.parentElement!==document.body){
    try{document.body.appendChild(el);}catch{}
  }
  const set=(k,v)=>{
    try{
      if(el.style.getPropertyValue(k)===v && el.style.getPropertyPriority(k)==='important') return;
      el.style.setProperty(k,v,'important');
    }catch{}
  };
  set('position','fixed');
  set('inset','0');set('top','0');set('right','0');set('bottom','0');set('left','0');
  set('width','auto');set('height','auto');
  set('min-width','0');set('min-height','0');set('max-width','none');set('max-height','none');
  set('margin','0');set('padding','0');set('transform','none');set('overflow','hidden');set('box-sizing','border-box');
  if(el.classList.contains('open')){set('display','flex');set('flex-direction','column');set('align-items','stretch');}
  return true;
}

function resetGateToTop(){
  const el=screen();
  if(!el||!el.classList.contains('open')) return;
  hardViewport();
  lockPage();
  try{el.scrollTop=0;el.scrollLeft=0;}catch{}
  const body=el.querySelector('.cdg-body');
  if(body){
    try{body.scrollTop=0;body.scrollLeft=0;body.scrollTo({top:0,left:0,behavior:'auto'});}catch{}
  }
  requestAnimationFrame(()=>{
    hardViewport();
    try{el.scrollTop=0;el.scrollLeft=0;}catch{}
    const b=el.querySelector('.cdg-body');
    if(b){try{b.scrollTop=0;b.scrollLeft=0;b.scrollTo({top:0,left:0,behavior:'auto'});}catch{}}
  });
}

function syncOpenState(){
  const open=isOpen();
  if(open&&!wasOpen){
    wasOpen=true;
    resetGateToTop();
    requestAnimationFrame(()=>requestAnimationFrame(resetGateToTop));
    setTimeout(resetGateToTop,80);
    setTimeout(resetGateToTop,220);
  }else if(!open&&wasOpen){
    wasOpen=false;
    unlockPage();
  }else if(open){
    hardViewport();
  }
}

const observer=new MutationObserver(()=>syncOpenState());
// V16.7.9 HOTFIX: syncOpenState()->hardViewport() style yazdığı için 'style' gözlenirse observer kendini tekrar tetikler.
try{observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});}catch{}

document.addEventListener('click',event=>{
  if(event.target?.closest?.('#buildAllBtn')){
    savedPageY=window.scrollY||document.documentElement.scrollTop||0;
    requestAnimationFrame(()=>requestAnimationFrame(syncOpenState));
  }
  if(event.target?.closest?.(`#${SCREEN_ID} .cdg-close`)){
    setTimeout(syncOpenState,0);
  }
},true);

window.addEventListener('pageshow',syncOpenState,{passive:true});
window.addEventListener('resize',()=>{if(isOpen())hardViewport();},{passive:true});
window.visualViewport?.addEventListener?.('resize',()=>{if(isOpen())hardViewport();},{passive:true});
window.visualViewport?.addEventListener?.('scroll',()=>{if(isOpen())hardViewport();},{passive:true});

injectStyle();
syncOpenState();
window.__AT_COUPON_GATE_MOBILE_RESET_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif — V16.8.0 mobile native viewport fix.');
})();
