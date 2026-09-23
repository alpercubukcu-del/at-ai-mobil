/* AT AI Mobil — V16.9.1F60.94.12 final drawer order + preview chrome guard */
(()=>{
'use strict';
if(window.__AT_FINAL_DRAWER_ORDER_F609412__)return;
window.__AT_FINAL_DRAWER_ORDER_F609412__=true;
const VERSION='FINAL-DRAWER-ORDER-V16.9.1F60.94.12';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let bootAttempts=0;

function findButton(drawer,re){return [...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null}
function closeDrawer(){try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}
function openGuide(){closeDrawer();try{const fn=window.ATProgramWorkflowGuideV661?.open;if(typeof fn==='function')return fn()}catch{}return false}
function openMaintenance(){closeDrawer();try{const fn=window.ATTrackMaintenanceQuickF60947?.open;if(typeof fn==='function')return fn()}catch{}return false}

function installStyle(){
 if($('atFinalDrawerOrderCssF609412'))return;
 const s=document.createElement('style');
 s.id='atFinalDrawerOrderCssF609412';
 s.textContent=`
  #drawer{display:flex!important;flex-direction:column!important;overflow-y:auto!important;}
  #drawer>.drawer-head{order:0!important;flex:0 0 auto!important;}
  #drawer>button:not(.icon-btn){order:40!important;flex:0 0 auto!important;}
  #programGuideBtnV661{order:1!important;}
  #drawer>button[data-view="current"]{order:2!important;}
  #drawer>button[data-view="career"]{order:3!important;}
  #drawer>button[data-view="calibration"]{order:4!important;}
  #drawer>button[data-view="scenario"]{order:5!important;}
  #couponMenuBtn{order:6!important;}
  #annualArchiveBtn{order:7!important;}
  #trackMaintenanceMenuBtnF60944{order:8!important;}
  #drawer>.drawer-note{order:9!important;flex:0 0 auto!important;}
  #drawer>button[data-view="historical"],#careerExportMenuBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
 `;
 document.head.appendChild(s);
}

function installPreviewChromeGuard(){
 if(!/vercel\.app$/i.test(location.hostname)&&!location.hostname.includes('.vercel.app'))return;
 if($('atPreviewChromeGuardCssF609412'))return;
 const s=document.createElement('style');
 s.id='atPreviewChromeGuardCssF609412';
 s.textContent=`
  body>iframe[src*="vercel"],body>iframe[title*="Vercel"],body>iframe[name*="vercel"],
  body>div[id*="vercel"][style*="position: fixed"],body>div[class*="vercel"][style*="position: fixed"],
  [data-vercel-toolbar],[data-vercel-live-feedback],vercel-live-feedback{
    display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;
  }
 `;
 document.head.appendChild(s);
}

function ensureGuide(drawer){
 let guide=$('programGuideBtnV661')||findButton(drawer,/Kullanım Talimatı/i);
 if(!guide){
  guide=document.createElement('button');
  guide.id='programGuideBtnV661';
  guide.type='button';
  guide.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openGuide()};
 }
 return guide;
}

function ensureMaintenance(drawer){
 const matches=[...drawer.querySelectorAll('button')].filter(b=>b.id==='trackMaintenanceMenuBtnF60944'||/Pist\s*\/\s*Bakım\s*\/\s*Hava\s*Arşivi/i.test(clean(b.textContent)));
 let keep=$('trackMaintenanceMenuBtnF60944')||matches[0];
 if(!keep){keep=document.createElement('button');keep.type='button'}
 keep.id='trackMaintenanceMenuBtnF60944';
 keep.type='button';
 keep.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openMaintenance()};
 for(const extra of matches){if(extra!==keep)try{extra.remove()}catch{}}
 return keep;
}

function setLabel(btn,label,order){
 if(!btn)return;
 if(clean(btn.textContent)!==label)btn.textContent=label;
 btn.style.display='';
 btn.style.visibility='';
 btn.style.pointerEvents='';
 btn.style.order=String(order);
 btn.removeAttribute('aria-hidden');
}

function hide(btn){
 if(!btn)return;
 btn.style.display='none';
 btn.style.visibility='hidden';
 btn.style.pointerEvents='none';
 btn.setAttribute('aria-hidden','true');
}

function collect(drawer){
 const guide=ensureGuide(drawer);
 const current=drawer.querySelector('[data-view="current"]')||findButton(drawer,/Güncel Analiz/i);
 const career=drawer.querySelector('[data-view="career"]')||findButton(drawer,/Kariyer Yol Haritası/i);
 const calibration=drawer.querySelector('[data-view="calibration"]')||findButton(drawer,/Model Kalibrasyonu/i);
 const scenario=drawer.querySelector('[data-view="scenario"]')||findButton(drawer,/Koşu Senaryosu/i);
 const coupon=$('couponMenuBtn')||findButton(drawer,/Kupon Oluştur/i);
 const annual=$('annualArchiveBtn')||findButton(drawer,/Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i);
 const maintenance=ensureMaintenance(drawer);
 return {guide,current,career,calibration,scenario,coupon,annual,maintenance};
}

function visibleMenuButtons(drawer){
 return [...drawer.children].filter(n=>n?.tagName==='BUTTON'&&!n.classList.contains('icon-btn')&&n.id!=='closeMenu'&&n.style.display!=='none'&&n.getAttribute('aria-hidden')!=='true');
}

function applyFinalOrder(reason='manual'){
 installStyle();
 installPreviewChromeGuard();
 const drawer=$('drawer');
 if(!drawer)return false;
 const r=collect(drawer);
 const ordered=[r.guide,r.current,r.career,r.calibration,r.scenario,r.coupon,r.annual,r.maintenance];
 if(ordered.slice(0,7).some(Boolean) && ordered.slice(0,7).some(v=>!v))return false;
 hide(drawer.querySelector('[data-view="historical"]'));
 hide(findButton(drawer,/Tarihsel Benzerlik|Kazanan Yolu/i));
 hide($('careerExportMenuBtn')||findButton(drawer,/Kariyer Excel/i));
 setLabel(r.guide,'1. Kullanım Talimatı',1);
 setLabel(r.current,'2. Güncel Analiz',2);
 setLabel(r.career,'3. Kariyer Yol Haritası',3);
 setLabel(r.calibration,'4. Model Kalibrasyonu',4);
 setLabel(r.scenario,'5. Günlük Koşu Kalibrasyonu',5);
 setLabel(r.coupon,'6. Kupon Oluştur',6);
 setLabel(r.annual,'7. Tarihsel Sonuç Arşivi',7);
 setLabel(r.maintenance,'8. Pist / Bakım / Hava Arşivi',8);
 const note=drawer.querySelector('.drawer-note');
 if(note){
  note.style.order='9';
  const noteText='Sabit sıra: Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon. Arşiv ve Pist/Bakım/Hava verileri ayrı menülerden yönetilir.';
  if(clean(note.textContent)!==noteText)note.textContent=noteText;
 }
 const currentOrder=visibleMenuButtons(drawer);
 const orderOk=ordered.every((node,i)=>currentOrder[i]===node);
 if(!orderOk){
  const frag=document.createDocumentFragment();
  const seen=new Set();
  for(const node of ordered){if(node&&!seen.has(node)){seen.add(node);frag.appendChild(node)}}
  if(note)drawer.insertBefore(frag,note);else drawer.appendChild(frag);
 }
 drawer.dataset.finalDrawerOrderVersion=VERSION;
 return true;
}

function schedule(reason,delays=[0,80,250,700,1500,2600]){for(const ms of delays)setTimeout(()=>applyFinalOrder(reason+'-'+ms),ms)}
function bootPoll(){
 bootAttempts+=1;
 if(applyFinalOrder('boot-'+bootAttempts))return;
 if(bootAttempts<90)setTimeout(bootPoll,100);
}
function start(){
 installStyle();
 installPreviewChromeGuard();
 bootPoll();
 document.addEventListener('click',e=>{if(e.target?.closest?.('#menuBtn'))schedule('menu-open')},true);
 window.addEventListener('pageshow',()=>schedule('pageshow',[0,120,700]),{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule('visible',[60,500])},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ATFinalDrawerOrderF609412={version:VERSION,apply:applyFinalOrder};
console.info('[AT AI]',VERSION,'active — drawer order is forced visually and physically; preview toolbar hidden on vercel.app.');
})();
