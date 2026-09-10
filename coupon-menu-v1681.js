/* AT AI Mobil — V16.8.1 Hamburger Kupon Merkezi
   - Ana sayfadaki kupon alanları kaldırıldı.
   - Hamburger > 6. Kupon Oluştur ayrı native dialog açar.
   - Eski full-screen overlay yerine Kupon Veri Denetimi dialog içine gömülür.
   - Karar motoru V16.7.1 korunur; puan/karar formüllerine dokunulmaz.
*/
(() => {
'use strict';
if (window.__AT_COUPON_MENU_V1681__) return;
window.__AT_COUPON_MENU_V1681__ = true;

const VERSION='COUPON-MENU-V16.8.1';
const STYLE_ID='couponMenuStyleV1681';
const DIALOG_ID='couponCenterDialog';
const MENU_ID='couponMenuBtn';
const BUILD_ID='buildAllBtn';
const GATE_ID='couponDecisionGateV1671';

const $=id=>document.getElementById(id);

function injectStyle(){
  if($(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
#${DIALOG_ID}{
  position:fixed!important;inset:0!important;
  width:100%!important;max-width:100%!important;
  height:100%!important;max-height:100%!important;
  margin:0!important;padding:0!important;border:0!important;border-radius:0!important;
  background:#07131f!important;color:#eef7ff!important;
  overflow:hidden!important;box-sizing:border-box!important;
}
@supports(height:100dvh){#${DIALOG_ID}{height:100dvh!important;max-height:100dvh!important}}
#${DIALOG_ID}[open]{display:flex!important;flex-direction:column!important;}
#${DIALOG_ID}::backdrop{background:#07131f!important;opacity:1!important;}
.coupon-menu-head-v1681{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  flex:0 0 auto;padding:max(12px,env(safe-area-inset-top)) 14px 12px;
  border-bottom:1px solid rgba(125,190,255,.18);background:#091827;
}
.coupon-menu-head-v1681 h2{margin:3px 0 0;font-size:21px;}
.coupon-menu-scroll-v1681{
  flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;
  -webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding:12px 12px max(28px,env(safe-area-inset-bottom));box-sizing:border-box;
}
#${DIALOG_ID} .coupon-menu-panel-v1681{margin:0 0 12px!important;max-width:none!important;}
#${DIALOG_ID} .coupon-audit-section-v1681[hidden],
#${DIALOG_ID} #couponSetupV1681[hidden],
#${DIALOG_ID} #couponResultV1681[hidden]{display:none!important;}
#${DIALOG_ID} .coupon-back-v1681{width:100%;margin:0 0 10px;min-height:44px;}
#${DIALOG_ID} #couponAuditHostV1681{width:100%;min-width:0;overflow:visible;}
#${DIALOG_ID} #${GATE_ID}.coupon-menu-embedded{
  position:relative!important;inset:auto!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;
  width:100%!important;height:auto!important;min-width:0!important;min-height:0!important;max-width:100%!important;max-height:none!important;
  margin:0!important;padding:0!important;border:0!important;transform:none!important;translate:none!important;
  display:flex!important;flex-direction:column!important;align-items:stretch!important;
  overflow:visible!important;background:transparent!important;z-index:auto!important;isolation:auto!important;
}
#${DIALOG_ID} #${GATE_ID}.coupon-menu-embedded .cdg-head{
  position:relative!important;inset:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;
  flex:0 0 auto!important;box-sizing:border-box!important;border:1px solid rgba(125,190,255,.18)!important;border-radius:15px 15px 0 0!important;
}
#${DIALOG_ID} #${GATE_ID}.coupon-menu-embedded .cdg-body{
  position:relative!important;inset:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;
  height:auto!important;min-height:0!important;max-height:none!important;flex:0 0 auto!important;
  overflow:visible!important;box-sizing:border-box!important;padding:12px 0 24px!important;
}
#${DIALOG_ID} #${GATE_ID}.coupon-menu-embedded .cdg-card,
#${DIALOG_ID} #${GATE_ID}.coupon-menu-embedded .cdg-plan{margin-left:0!important;margin-right:0!important;}
@media(max-width:560px){
  .coupon-menu-scroll-v1681{padding-left:10px;padding-right:10px;}
  .coupon-menu-head-v1681{padding-left:12px;padding-right:12px;}
  #${DIALOG_ID} .section-title-row{align-items:flex-start;gap:8px;}
}
`;
  document.head.appendChild(s);
}

function restoreDocumentScroll(){
  try{
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow-x');
    document.documentElement.style.removeProperty('overscroll-behavior');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-x');
    document.body.style.removeProperty('overscroll-behavior');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('left');
    document.body.style.removeProperty('right');
    document.body.style.removeProperty('width');
  }catch{}
}

function closeDrawer(){
  try{$('closeMenu')?.click();}catch{}
}

function gate(){return $(GATE_ID);}

function hideGate(){
  const g=gate();
  if(!g) return;
  g.classList.remove('open');
  g.setAttribute('aria-hidden','true');
  restoreDocumentScroll();
}

function showSetup(){
  const d=$(DIALOG_ID);if(!d) return;
  hideGate();
  const setup=$('couponSetupV1681'), audit=$('couponAuditSectionV1681'), result=$('couponResultV1681');
  if(setup)setup.hidden=false;
  if(audit)audit.hidden=true;
  if(result)result.hidden=false;
  const title=$('couponMenuTitleV1681');if(title)title.textContent='Kupon Oluştur';
  const sc=$('couponMenuScrollV1681');if(sc)sc.scrollTop=0;
}

function embedGate(){
  const d=$(DIALOG_ID), g=gate(), host=$('couponAuditHostV1681');
  if(!d||!g||!host) return false;
  host.replaceChildren(g);
  g.classList.add('coupon-menu-embedded','open');
  g.setAttribute('aria-hidden','false');
  const setup=$('couponSetupV1681'), audit=$('couponAuditSectionV1681'), result=$('couponResultV1681');
  if(setup)setup.hidden=true;
  if(audit)audit.hidden=false;
  if(result)result.hidden=true;
  const title=$('couponMenuTitleV1681');if(title)title.textContent='Kupon Veri Denetimi';
  restoreDocumentScroll();
  const sc=$('couponMenuScrollV1681');if(sc)sc.scrollTop=0;
  try{g.scrollTop=0;g.querySelector('.cdg-body')?.scrollTo({top:0,left:0,behavior:'auto'});}catch{}
  return true;
}

function openAudit(){
  const api=window.ATCouponDecisionV1671;
  if(!api||typeof api.open!=='function'){
    const statusEl=$('status');if(statusEl)statusEl.textContent='Kupon karar motoru yüklenemedi. Sayfayı yenileyin.';
    return;
  }
  try{api.open();}catch(e){console.error('[AT AI]',VERSION,'audit open',e);return;}
  embedGate();
  requestAnimationFrame(()=>embedGate());
  setTimeout(()=>embedGate(),60);
}

function bindBuildButton(){
  const old=$(BUILD_ID);if(!old) return;
  if(old.dataset.couponMenuV1681==='1') return;
  const btn=old.cloneNode(true);
  btn.dataset.couponMenuV1681='1';
  // V16.7.1 takeover() bu butona eski full-screen capture listener eklemesin.
  btn.dataset.cdgV1671='1';
  btn.removeAttribute('onclick');
  old.replaceWith(btn);
  btn.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    openAudit();
  },true);
}

function openCoupon(){
  injectStyle();bindBuildButton();closeDrawer();showSetup();
  const d=$(DIALOG_ID);if(!d)return;
  try{if(!d.open)d.showModal();}catch{d.setAttribute('open','');}
  restoreDocumentScroll();
  requestAnimationFrame(()=>{bindBuildButton();const sc=$('couponMenuScrollV1681');if(sc)sc.scrollTop=0;});
}

function closeCoupon(){
  hideGate();
  const d=$(DIALOG_ID);if(!d)return;
  try{if(d.open)d.close();else d.removeAttribute('open');}catch{d.removeAttribute('open');}
  restoreDocumentScroll();
}

function bind(){
  injectStyle();
  const menu=$(MENU_ID);if(menu&&menu.dataset.v1681!=='1'){
    menu.dataset.v1681='1';menu.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openCoupon();});
  }
  const close=$('closeCouponMenuV1681');if(close&&close.dataset.v1681!=='1'){
    close.dataset.v1681='1';close.addEventListener('click',closeCoupon);
  }
  const back=$('couponBackV1681');if(back&&back.dataset.v1681!=='1'){
    back.dataset.v1681='1';back.addEventListener('click',showSetup);
  }
  const d=$(DIALOG_ID);if(d&&d.dataset.v1681!=='1'){
    d.dataset.v1681='1';
    d.addEventListener('cancel',e=>{e.preventDefault();closeCoupon();});
    d.addEventListener('close',()=>{hideGate();restoreDocumentScroll();});
  }
  bindBuildButton();
}

// V16.7.1'in kendi X butonu overlay'i kapatmak yerine kupon ayarlarına geri döner.
document.addEventListener('click',e=>{
  if(!$(DIALOG_ID)?.open) return;
  if(!e.target?.closest?.('#cdgCloseV1671')) return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();showSetup();
},true);

const mo=new MutationObserver(()=>bind());
try{mo.observe(document.documentElement,{subtree:true,childList:true});}catch{}

bind();
window.addEventListener('load',()=>setTimeout(bind,0));
window.addEventListener('pageshow',bind,{passive:true});
window.__AT_COUPON_MENU_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif — kupon ana sayfadan kaldırıldı, hamburger menü native dialog aktif.');
})();
