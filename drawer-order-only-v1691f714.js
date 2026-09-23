/* AT AI Mobil - V16.9.1F60.94.24 order-only drawer guard */
(()=>{
'use strict';
if(window.__AT_DRAWER_ORDER_ONLY_F609424__)return;
window.__AT_DRAWER_ORDER_ONLY_F609424__=true;
const VERSION='DRAWER-ORDER-ONLY-V16.9.1F60.94.24';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let applying=false;
let attempts=0;

function findButton(drawer,re){return [...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null}
function refs(){
 const drawer=$('drawer');
 if(!drawer)return null;
 return {
  drawer,
  head:drawer.querySelector('.drawer-head'),
  guide:$('programGuideBtnV661')||findButton(drawer,/Kullanım Talimatı/i),
  current:drawer.querySelector('[data-view="current"]')||findButton(drawer,/Güncel Analiz/i),
  career:drawer.querySelector('[data-view="career"]')||findButton(drawer,/Kariyer Yol Haritası/i),
  calibration:drawer.querySelector('[data-view="calibration"]')||findButton(drawer,/Model Kalibrasyonu/i),
  scenario:drawer.querySelector('[data-view="scenario"]')||findButton(drawer,/Günün Koşu Kalibrasyonu|Koşu Senaryosu/i),
  coupon:$('couponMenuBtn')||findButton(drawer,/Kupon Oluştur/i),
  annual:$('annualArchiveBtn')||findButton(drawer,/Tarihsel Sonuç Arşivi|Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i),
  maintenance:$('trackMaintenanceMenuBtnF60944')||findButton(drawer,/Gerçek Yarış Arşivi\s*\+\s*Pist\s*\/\s*Bakım\s*\/\s*Hava|Pist\s*\/\s*Bakım\s*\/\s*Hava\s*Arşivi/i),
  note:drawer.querySelector('.drawer-note')
 };
}
function ready(r){return !!(r&&r.head&&r.guide&&r.current&&r.career&&r.calibration&&r.scenario&&r.coupon&&r.annual&&r.maintenance)}
function installStyle(){
 if($('atDrawerOrderOnlyCssF609424'))return;
 const s=document.createElement('style');
 s.id='atDrawerOrderOnlyCssF609424';
 s.textContent=`
  #drawer{display:flex!important;flex-direction:column!important;overflow-y:auto!important;}
  #drawer>.drawer-head{order:0!important;flex:0 0 auto!important;}
  #drawer>button:not(.icon-btn){flex:0 0 auto!important;}
  #programGuideBtnV661{order:1!important;}
  #drawer>button[data-view="current"]{order:2!important;}
  #drawer>button[data-view="career"]{order:3!important;}
  #drawer>button[data-view="calibration"]{order:4!important;}
  #drawer>button[data-view="scenario"]{order:5!important;}
  #couponMenuBtn{order:6!important;}
  #annualArchiveBtn{order:7!important;}
  #trackMaintenanceMenuBtnF60944{order:8!important;}
  #drawer>.drawer-note{order:9!important;flex:0 0 auto!important;}
 `;
 document.head.appendChild(s);
}
function label(node,text){if(node&&clean(node.textContent)!==text)node.textContent=text}
function apply(reason='manual'){
 if(applying)return false;
 installStyle();
 const r=refs();
 if(!ready(r))return false;
 applying=true;
 try{
  label(r.guide,'1. Kullanım Talimatı');
  label(r.current,'2. Güncel Analiz');
  label(r.career,'3. Kariyer Yol Haritası');
  label(r.calibration,'4. Model Kalibrasyonu');
  label(r.scenario,'5. Günün Koşu Kalibrasyonu');
  label(r.coupon,'6. Kupon Oluştur');
  label(r.annual,'7. Tarihsel Sonuç Arşivi');
  label(r.maintenance,'8. Gerçek Yarış Arşivi + Pist / Bakım / Hava');
  const ordered=[r.guide,r.current,r.career,r.calibration,r.scenario,r.coupon,r.annual,r.maintenance];
  ordered.forEach((node,i)=>node.style.setProperty('order',String(i+1),'important'));
  const anchor=r.note||null;
  for(const node of ordered){if(anchor)r.drawer.insertBefore(node,anchor);else r.drawer.appendChild(node)}
  if(r.note)r.note.style.setProperty('order','9','important');
  r.drawer.dataset.orderOnlyVersion=VERSION;
  r.drawer.dataset.orderOnlyReason=reason;
  return true;
 }finally{applying=false}
}
function bindMenu(){const menu=$('menuBtn');if(!menu||menu.dataset.orderOnlyBound==='1')return;menu.dataset.orderOnlyBound='1';menu.addEventListener('click',()=>{apply('menu-click-0');setTimeout(()=>apply('menu-click-40'),40);setTimeout(()=>apply('menu-click-140'),140)},false)}
function boot(){installStyle();bindMenu();if(apply('boot-'+attempts))return;attempts+=1;if(attempts<80)setTimeout(boot,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ATDrawerOrderOnlyF609424={version:VERSION,apply};
console.info('[AT AI]',VERSION,'active - fixed 1-8 order; menu 7 is the historical real-result archive.');
})();
