/* AT AI Mobil - V16.9.1F60.94.13 hard drawer rebuild + preview chrome guard */
(()=>{
'use strict';
if(window.__AT_FINAL_DRAWER_ORDER_F609413__)return;
window.__AT_FINAL_DRAWER_ORDER_F609413__=true;
const VERSION='FINAL-DRAWER-ORDER-V16.9.1F60.94.13';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let bootAttempts=0;
let applying=false;
let lastAppliedAt=0;

function isPreviewHost(){return /\.vercel\.app$/i.test(location.hostname)||location.hostname.includes('.vercel.app')}
function findButton(drawer,re){return [...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null}
function closeDrawer(){try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}
function openGuide(){closeDrawer();try{const fn=window.ATProgramWorkflowGuideV661?.open;if(typeof fn==='function')return fn()}catch{}return false}
function openMaintenance(){closeDrawer();try{const fn=window.ATTrackMaintenanceQuickF60947?.open;if(typeof fn==='function')return fn()}catch{}return false}

function installStyle(){
 if($('atFinalDrawerOrderCssF609413'))return;
 const s=document.createElement('style');
 s.id='atFinalDrawerOrderCssF609413';
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
  #drawer>button[data-view="historical"],#careerExportMenuBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
 `;
 document.head.appendChild(s);
}

function hidePreviewChrome(){
 if(!isPreviewHost())return;
 const selectors=[
  'body>iframe[src*="vercel"]',
  'body>iframe[title*="Vercel"]',
  'body>iframe[name*="vercel"]',
  '[data-vercel-toolbar]',
  '[data-vercel-live-feedback]',
  'vercel-live-feedback'
 ];
 for(const el of document.querySelectorAll(selectors.join(','))){
  try{el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important');el.style.setProperty('opacity','0','important');el.style.setProperty('pointer-events','none','important')}catch{}
 }
 for(const el of [...document.body.children]){
  try{
   const text=clean(el.textContent);
   const st=getComputedStyle(el);
   const z=Number.parseInt(st.zIndex||'0',10)||0;
   const looksLikeVercel=(/vercel/i.test(el.id)||/vercel/i.test(el.className)||text==='Kilidi Aç'||text.includes('Kilidi Aç'));
   if(looksLikeVercel&&st.position==='fixed'&&z>=1000){
    el.style.setProperty('display','none','important');
    el.style.setProperty('visibility','hidden','important');
    el.style.setProperty('opacity','0','important');
    el.style.setProperty('pointer-events','none','important');
   }
  }catch{}
 }
}

function installPreviewChromeGuard(){
 if(!isPreviewHost())return;
 if(!$('atPreviewChromeGuardCssF609413')){
  const s=document.createElement('style');
  s.id='atPreviewChromeGuardCssF609413';
  s.textContent=`
   body>iframe[src*="vercel"],body>iframe[title*="Vercel"],body>iframe[name*="vercel"],
   [data-vercel-toolbar],[data-vercel-live-feedback],vercel-live-feedback{
    display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;
   }
  `;
  document.head.appendChild(s);
 }
 hidePreviewChrome();
 if(document.body&&!window.__AT_PREVIEW_CHROME_OBSERVER_F609413__){
  window.__AT_PREVIEW_CHROME_OBSERVER_F609413__=new MutationObserver(()=>hidePreviewChrome());
  window.__AT_PREVIEW_CHROME_OBSERVER_F609413__.observe(document.body,{childList:true,subtree:true});
 }
}

function ensureGuide(drawer){
 let guide=$('programGuideBtnV661')||findButton(drawer,/Kullanım Talimatı/i);
 if(!guide){
  guide=document.createElement('button');
  guide.id='programGuideBtnV661';
  guide.type='button';
 }
 guide.id='programGuideBtnV661';
 guide.type='button';
 guide.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openGuide()};
 return guide;
}

function ensureMaintenance(drawer){
 const matches=[...drawer.querySelectorAll('button')].filter(b=>b.id==='trackMaintenanceMenuBtnF60944'||/Pist\s*\/\s*Bakım\s*\/\s*Hava\s*Arşivi/i.test(clean(b.textContent)));
 let keep=$('trackMaintenanceMenuBtnF60944')||matches[0];
 if(!keep){keep=document.createElement('button');keep.type='button'}
 keep.id='trackMaintenanceMenuBtnF60944';
 keep.type='button';
 keep.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();openMaintenance()};
 return keep;
}

function setLabel(btn,label,order){
 btn.textContent=label;
 btn.style.display='';
 btn.style.visibility='';
 btn.style.pointerEvents='';
 btn.style.order=String(order);
 btn.removeAttribute('aria-hidden');
}

function collectRequired(drawer){
 return {
  current:drawer.querySelector('[data-view="current"]')||findButton(drawer,/Güncel Analiz/i),
  career:drawer.querySelector('[data-view="career"]')||findButton(drawer,/Kariyer Yol Haritası/i),
  calibration:drawer.querySelector('[data-view="calibration"]')||findButton(drawer,/Model Kalibrasyonu/i),
  scenario:drawer.querySelector('[data-view="scenario"]')||findButton(drawer,/Koşu Senaryosu/i),
  coupon:$('couponMenuBtn')||findButton(drawer,/Kupon Oluştur/i),
  annual:$('annualArchiveBtn')||findButton(drawer,/Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i)
 };
}

function applyFinalOrder(reason='manual'){
 installStyle();
 installPreviewChromeGuard();
 const drawer=$('drawer');
 if(!drawer)return false;
 const required=collectRequired(drawer);
 if(Object.values(required).some(v=>!v))return false;

 let head=drawer.querySelector('.drawer-head');
 if(!head){
  head=document.createElement('div');
  head.className='drawer-head';
  const title=document.createElement('h2');
  title.textContent='Analiz Bölümleri';
  head.appendChild(title);
 }
 let note=drawer.querySelector('.drawer-note');
 if(!note){
  note=document.createElement('p');
  note.className='drawer-note';
 }
 note.textContent='Sabit sıra: Kullanım Talimatı → Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon → Arşiv → Pist/Bakım/Hava.';
 note.style.order='9';

 const guide=ensureGuide(drawer);
 const maintenance=ensureMaintenance(drawer);
 const ordered=[guide,required.current,required.career,required.calibration,required.scenario,required.coupon,required.annual,maintenance];
 const seen=new Set();
 const uniqueOrdered=ordered.filter(node=>node&&!seen.has(node)&&seen.add(node));
 if(uniqueOrdered.length!==8)return false;

 setLabel(guide,'1. Kullanım Talimatı',1);
 setLabel(required.current,'2. Güncel Analiz',2);
 setLabel(required.career,'3. Kariyer Yol Haritası',3);
 setLabel(required.calibration,'4. Model Kalibrasyonu',4);
 setLabel(required.scenario,'5. Koşu Senaryosu',5);
 setLabel(required.coupon,'6. Kupon Oluştur',6);
 setLabel(required.annual,'7. Yıllık Yarış Arşivi',7);
 setLabel(maintenance,'8. Pist / Bakım / Hava Arşivi',8);

 const desired=[head,...uniqueOrdered,note];
 const already=drawer.children.length===desired.length&&desired.every((node,i)=>drawer.children[i]===node);
 if(!already){
  applying=true;
  try{drawer.replaceChildren(...desired)}finally{applying=false;lastAppliedAt=performance.now()}
 }
 drawer.dataset.finalDrawerOrderVersion=VERSION;
 drawer.dataset.finalDrawerOrderReason=reason;
 return true;
}

function schedule(reason,delays=[0,60,140,320,800,1600,3000]){
 for(const ms of delays)setTimeout(()=>applyFinalOrder(reason+'-'+ms),ms);
}

function installDrawerObserver(){
 const drawer=$('drawer');
 if(!drawer||drawer.__AT_FINAL_DRAWER_OBSERVER_F609413__)return;
 drawer.__AT_FINAL_DRAWER_OBSERVER_F609413__=new MutationObserver(()=>{
  if(applying)return;
  if(performance.now()-lastAppliedAt<120)return;
  schedule('drawer-mutation',[40,180,600]);
 });
 drawer.__AT_FINAL_DRAWER_OBSERVER_F609413__.observe(drawer,{childList:true,attributes:true,attributeFilter:['class','aria-hidden','style']});
}

function bootPoll(){
 bootAttempts+=1;
 installDrawerObserver();
 if(applyFinalOrder('boot-'+bootAttempts))return;
 if(bootAttempts<140)setTimeout(bootPoll,100);
}

function start(){
 installStyle();
 installPreviewChromeGuard();
 bootPoll();
 const onOpen=e=>{if(e.target?.closest?.('#menuBtn'))schedule('menu-open')};
 document.addEventListener('pointerdown',onOpen,true);
 document.addEventListener('touchstart',onOpen,true);
 document.addEventListener('click',onOpen,true);
 window.addEventListener('pageshow',()=>schedule('pageshow',[0,120,700]),{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule('visible',[60,500])},{passive:true});
 setInterval(()=>{installPreviewChromeGuard();if($('drawer')?.classList.contains('open'))applyFinalOrder('open-interval')},2000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ATFinalDrawerOrderF609413={version:VERSION,apply:applyFinalOrder};
console.info('[AT AI]',VERSION,'active - drawer is rebuilt as header, 1..8, then note.');
})();
