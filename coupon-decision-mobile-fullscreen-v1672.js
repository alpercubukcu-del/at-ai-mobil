/* AT AI Mobil — V16.7.2 Kupon Veri Denetimi Android tam ekran sabitleme
   V16.7.1 karar motoruna dokunmaz; yalnız mobil katman yerleşimini düzeltir.
   Ekranı body dışına, documentElement altına taşır ve viewport'a dört kenardan kilitler.
*/
(() => {
'use strict';
if (window.__AT_COUPON_DECISION_FULLSCREEN_V1672__) return;
window.__AT_COUPON_DECISION_FULLSCREEN_V1672__ = true;

const VERSION='COUPON-DECISION-FULLSCREEN-V16.7.2';
const SCREEN_ID='couponDecisionGateV1671';
const STYLE_ID='couponDecisionFullscreenStyleV1672';

function injectStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
html,body{max-width:100%;overflow-x:hidden}
#${SCREEN_ID}{
  position:fixed!important;
  top:0!important;right:0!important;bottom:0!important;left:0!important;
  inset:0!important;
  width:auto!important;height:auto!important;
  min-width:0!important;min-height:0!important;
  max-width:none!important;max-height:none!important;
  margin:0!important;padding:0!important;
  border:0!important;border-radius:0!important;
  transform:none!important;translate:none!important;
  box-sizing:border-box!important;
  overflow:hidden!important;
  z-index:2147483000!important;
  background:#07131f!important;
  overscroll-behavior:none!important;
  isolation:isolate!important;
}
#${SCREEN_ID}.open{display:flex!important;flex-direction:column!important}
#${SCREEN_ID} .cdg-head{position:relative!important;inset:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;flex:0 0 auto!important}
#${SCREEN_ID} .cdg-body{position:relative!important;inset:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;box-sizing:border-box!important;flex:1 1 auto!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important}
@media(max-width:720px){
  #${SCREEN_ID}{width:auto!important;height:auto!important;}
  #${SCREEN_ID} .cdg-head{padding-top:max(14px,env(safe-area-inset-top))!important;padding-left:max(14px,env(safe-area-inset-left))!important;padding-right:max(14px,env(safe-area-inset-right))!important;}
  #${SCREEN_ID} .cdg-body{padding-bottom:max(28px,env(safe-area-inset-bottom))!important;}
}
`;
  document.head.appendChild(s);
}

function harden(){
  injectStyle();
  const el=document.getElementById(SCREEN_ID);
  if(!el) return false;

  // body/app katmanlarının scroll/transform bağlamından çıkar.
  if(el.parentElement!==document.documentElement){
    try{document.documentElement.appendChild(el);}catch{}
  }

  const set=(k,v)=>{try{el.style.setProperty(k,v,'important');}catch{}};
  set('position','fixed');
  set('top','0');set('right','0');set('bottom','0');set('left','0');set('inset','0');
  set('width','auto');set('height','auto');
  set('min-width','0');set('min-height','0');set('max-width','none');set('max-height','none');
  set('margin','0');set('padding','0');set('border','0');set('border-radius','0');
  set('transform','none');set('box-sizing','border-box');set('overflow','hidden');
  set('z-index','2147483000');set('background','#07131f');

  if(el.classList.contains('open')){
    set('display','flex');set('flex-direction','column');
    try{el.scrollLeft=0;}catch{}
    const body=el.querySelector('.cdg-body');
    if(body){
      body.style.setProperty('min-height','0','important');
      body.style.setProperty('flex','1 1 auto','important');
      body.style.setProperty('overflow-y','auto','important');
      body.style.setProperty('overflow-x','hidden','important');
    }
  }
  return true;
}

const observer=new MutationObserver(muts=>{
  let relevant=false;
  for(const m of muts){
    if(m.type==='childList') relevant=true;
    if(m.type==='attributes' && m.target?.id===SCREEN_ID) relevant=true;
  }
  if(relevant) requestAnimationFrame(()=>harden());
});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-hidden']});

document.addEventListener('click',event=>{
  if(event.target?.closest?.('#buildAllBtn')){
    requestAnimationFrame(()=>requestAnimationFrame(()=>harden()));
  }
},true);

window.addEventListener('resize',()=>{if(document.getElementById(SCREEN_ID)?.classList.contains('open'))harden();},{passive:true});
window.visualViewport?.addEventListener?.('resize',()=>{if(document.getElementById(SCREEN_ID)?.classList.contains('open'))harden();},{passive:true});

injectStyle();
harden();
window.__AT_COUPON_DECISION_FULLSCREEN_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif');
})();
