/* AT AI Mobil — V16.7.8 Kupon Oluştur -> Kupon Veri Denetimi kesin yönlendirme
   - Eski buildTickets onclick yolunu devre dışı bırakır.
   - Kupon Oluştur her durumda V16.7.1 veri denetimini açar.
   - Android'de önceki V16.7.7 body position:fixed kilidini nötrler; overlay gerçek viewport'ta kalır.
   - Açılışta denetim gövdesi daima en üstten başlar.
*/
(() => {
'use strict';
if (window.__AT_COUPON_GATE_ROUTING_V1678__) return;
window.__AT_COUPON_GATE_ROUTING_V1678__ = true;

const VERSION='COUPON-GATE-ROUTING-V16.7.8';
const SCREEN_ID='couponDecisionGateV1671';
const BTN_ID='buildAllBtn';
const STYLE_ID='couponGateRoutingStyleV1678';
let lastOpenRequest=0;

function injectStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
#${SCREEN_ID}.open{
  position:fixed!important;inset:0!important;
  top:0!important;right:0!important;bottom:0!important;left:0!important;
  width:100%!important;max-width:none!important;min-width:0!important;
  height:100dvh!important;max-height:none!important;min-height:0!important;
  margin:0!important;padding:0!important;border:0!important;border-radius:0!important;
  transform:none!important;translate:none!important;
  display:flex!important;flex-direction:column!important;align-items:stretch!important;
  overflow:hidden!important;background:#07131f!important;
  z-index:2147483640!important;isolation:isolate!important;
}
#${SCREEN_ID}.open .cdg-head{
  display:flex!important;visibility:visible!important;opacity:1!important;
  position:relative!important;flex:0 0 auto!important;
  width:100%!important;max-width:100%!important;min-width:0!important;
  box-sizing:border-box!important;
}
#${SCREEN_ID}.open .cdg-body{
  display:block!important;visibility:visible!important;opacity:1!important;
  position:relative!important;flex:1 1 auto!important;
  width:100%!important;max-width:100%!important;min-width:0!important;
  height:auto!important;min-height:0!important;max-height:none!important;
  overflow-y:auto!important;overflow-x:hidden!important;
  -webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;
  box-sizing:border-box!important;scroll-behavior:auto!important;
}
`;
  document.head.appendChild(s);
}

function gate(){return document.getElementById(SCREEN_ID);}
function isOpen(){return !!gate()?.classList.contains('open');}

function neutralizeBodyFixedLock(){
  // V16.7.7'deki body position:fixed Android'de alttaki yarış listesini görünür bırakabiliyordu.
  // Arka sayfayı yalnız overflow ile kilitle; viewport koordinatını değiştirme.
  try{
    for(const p of ['position','top','left','right','width']) document.body.style.removeProperty(p);
    document.documentElement.style.setProperty('overflow','hidden','important');
    document.documentElement.style.setProperty('overflow-x','hidden','important');
    document.body.style.setProperty('overflow','hidden','important');
    document.body.style.setProperty('overflow-x','hidden','important');
  }catch{}
}

function hardenOpenGate(){
  injectStyle();
  const el=gate();
  if(!el || !el.classList.contains('open')) return false;

  // body/app-shell transform/scroll bağlamından tamamen çıkar.
  if(el.parentElement!==document.documentElement){
    try{document.documentElement.appendChild(el);}catch{}
  }

  neutralizeBodyFixedLock();
  const set=(k,v)=>{try{el.style.setProperty(k,v,'important');}catch{}};
  set('position','fixed');set('inset','0');
  set('top','0');set('right','0');set('bottom','0');set('left','0');
  set('width','100%');set('height','100dvh');
  set('max-width','none');set('max-height','none');set('min-width','0');set('min-height','0');
  set('margin','0');set('padding','0');set('transform','none');set('translate','none');
  set('display','flex');set('flex-direction','column');set('overflow','hidden');
  set('z-index','2147483640');set('background','#07131f');

  try{el.scrollTop=0;el.scrollLeft=0;}catch{}
  const body=el.querySelector('.cdg-body');
  if(body){
    try{
      body.style.setProperty('flex','1 1 auto','important');
      body.style.setProperty('min-height','0','important');
      body.style.setProperty('overflow-y','auto','important');
      body.style.setProperty('overflow-x','hidden','important');
      body.scrollTop=0;body.scrollLeft=0;
      body.scrollTo({top:0,left:0,behavior:'auto'});
    }catch{}
  }
  return true;
}

function callGateOpen(){
  const now=Date.now();
  if(now-lastOpenRequest<120 && isOpen()) return;
  lastOpenRequest=now;
  try{
    if(window.ATCouponDecisionV1671 && typeof window.ATCouponDecisionV1671.open==='function'){
      window.ATCouponDecisionV1671.open();
    }
  }catch(e){console.warn('[AT AI]',VERSION,'gate open error',e);}

  requestAnimationFrame(()=>{
    hardenOpenGate();
    requestAnimationFrame(hardenOpenGate);
  });
  setTimeout(()=>{
    if(!isOpen()){
      try{window.ATCouponDecisionV1671?.open?.();}catch{}
    }
    hardenOpenGate();
  },80);
  setTimeout(hardenOpenGate,220);
}

function bindButton(){
  const btn=document.getElementById(BTN_ID);
  if(!btn) return;
  // Legacy app.js: buildAllBtn.onclick = buildTickets. Bunu kesin olarak değiştir.
  btn.onclick=function(e){
    try{e?.preventDefault?.();e?.stopPropagation?.();}catch{}
    callGateOpen();
    return false;
  };
  btn.dataset.cdgRouteV1678='1';
}

// click capture eski V16.7.1 tarafından stopImmediatePropagation ile kesilse bile
// pointerup watchdog çalışır ve gate'in gerçekten açıldığını doğrular.
document.addEventListener('pointerup',event=>{
  if(!event.target?.closest?.(`#${BTN_ID}`)) return;
  setTimeout(()=>{if(!isOpen())callGateOpen();else hardenOpenGate();},0);
},true);

// Eğer click bize ulaşırsa legacy yolun çalışmasına izin verme.
document.addEventListener('click',event=>{
  if(!event.target?.closest?.(`#${BTN_ID}`)) return;
  if(!event.isTrusted) return;
  if(!isOpen()) callGateOpen();
},false);

const mo=new MutationObserver(()=>{
  bindButton();
  if(isOpen()) hardenOpenGate();
});
try{mo.observe(document.documentElement,{subtree:true,childList:true});}catch{}

injectStyle();
bindButton();
setTimeout(bindButton,60);
setTimeout(bindButton,300);
window.addEventListener('pageshow',()=>{bindButton();if(isOpen())hardenOpenGate();},{passive:true});
window.addEventListener('resize',()=>{if(isOpen())hardenOpenGate();},{passive:true});
window.visualViewport?.addEventListener?.('resize',()=>{if(isOpen())hardenOpenGate();},{passive:true});

window.__AT_COUPON_GATE_ROUTING_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif — Kupon Oluştur yalnız Kupon Veri Denetimini açar.');
})();
