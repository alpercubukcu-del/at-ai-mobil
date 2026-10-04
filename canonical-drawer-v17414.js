/* AT AI Mobil - canonical drawer V17.4.16: static DOM, event binding only */
(()=>{
'use strict';
const VERSION='CANONICAL-DRAWER-V17.4.16',$=id=>document.getElementById(id);
function closeDrawer(){try{window.closeDrawer?.()}catch{}$('drawer')?.classList.remove('open');$('overlay')?.classList.remove('show');$('drawer')?.setAttribute('aria-hidden','true')}
function openFogd(){closeDrawer();const open=()=>{const fn=window.ATFogdHistoryCalibrationF60943111?.open;if(typeof fn==='function')return fn();console.warn('[AT AI]',VERSION,'FOGD history center not ready');return false};if(open()===false)setTimeout(open,120)}
function bind(){
 const ids=['programGuideBtnV661','fogdCalibrationMenuBtn','annualArchiveBtn','archiveHubBtnF60943123','fogdMenuBtnF609431'];
 const d=$('drawer');if(!d||ids.some(id=>!$(id)))return false;
 // Keep the live DNA button: it owns the dialog listener. The static copy has none.
 const duplicate=d.querySelector('#fogdScoreMenuBtnV17');if(duplicate)duplicate.remove();
 const selectors=['#programGuideBtnV661','[data-view="current"]','[data-view="career"]','#fogdCalibrationMenuBtn','[data-view="scenario"]','#couponMenuBtn','#annualArchiveBtn','#archiveHubBtnF60943123','#fogdMenuBtnF609431'];
 const labels=['1. Kullanım Talimatı','2. Güncel Analiz','3. Kariyer Yol Haritası','4. FOGD Kalibrasyon Merkezi','5. Günün Koşu Kalibrasyonu','6. Kupon Oluştur','7. Tarihsel Sonuç Arşivi','8. Gerçek Yarış Arşivi + Pist / Bakım / Hava','9. F / O / G / D Toplam Puan'];
 selectors.forEach((selector,i)=>{const b=d.querySelector(selector);if(b&&b.textContent!==labels[i])b.textContent=labels[i]});
 d.style.setProperty('display','flex');d.style.setProperty('flex-direction','column');
 selectors.forEach((selector,i)=>{const b=d.querySelector(selector);if(b&&b.style.getPropertyValue('order')!==String(i+1))b.style.setProperty('order',String(i+1),'important')});
 const head=d.querySelector('.drawer-head'),note=d.querySelector('.drawer-note');
 if(head)head.style.setProperty('order','0','important');if(note)note.style.setProperty('order','10','important');
 // Match keyboard and DOM order to the displayed order, without recurring moves.
 let anchor=note;for(const selector of [...selectors].reverse()){const b=d.querySelector(selector);if(!b)continue;if(b.nextElementSibling!==anchor)d.insertBefore(b,anchor);anchor=b}
 for(const b of d.querySelectorAll(':scope > button'))if(!selectors.some(selector=>b.matches(selector)))b.style.setProperty('order','11','important');
 const fogd=$('fogdCalibrationMenuBtn');if(fogd.dataset.canonicalBound!==VERSION){fogd.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openFogd()},true);fogd.dataset.canonicalBound=VERSION}
 d.dataset.canonicalDrawer=VERSION;return true
}
function boot(){bind();const d=$('drawer');if(!d)return;let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;bind()})});observer.observe(d,{childList:true,subtree:true});let n=0;const t=setInterval(()=>{bind();if(++n>25)clearInterval(t)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ATCanonicalDrawerV17416={version:VERSION,bind,openFogd};
})();